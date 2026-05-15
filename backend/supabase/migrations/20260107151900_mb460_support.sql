-- ============================================================================
-- MB460 Terminal Support Migration
-- ============================================================================
-- This migration adds support for ZKTeco MB460 terminals with face recognition
-- 
-- Changes:
-- 1. Create terminals table to track MB460 devices per agency
-- 2. Add face recognition fields to biometric_credentials
-- 3. Add terminal reference to attendance_records
-- 4. Update clock_in function to support terminal-based clock in
-- ============================================================================

-- ============================================================================
-- 1. TERMINALS TABLE
-- ============================================================================
-- Tracks MB460 devices across all agencies

CREATE TABLE IF NOT EXISTS terminals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number VARCHAR(50) UNIQUE NOT NULL,
    agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
    name VARCHAR(100),
    model VARCHAR(50) DEFAULT 'MB460',
    ip_address INET,
    port INTEGER DEFAULT 4370,
    status VARCHAR(20) DEFAULT 'offline',
    last_seen TIMESTAMPTZ,
    firmware_version VARCHAR(50),
    face_enabled BOOLEAN DEFAULT false,  -- Track if face recognition is enabled
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for quick lookup
CREATE INDEX IF NOT EXISTS idx_terminals_serial ON terminals(serial_number);
CREATE INDEX IF NOT EXISTS idx_terminals_agency ON terminals(agency_id);
CREATE INDEX IF NOT EXISTS idx_terminals_status ON terminals(status);

-- Comment on table
COMMENT ON TABLE terminals IS 'ZKTeco MB460 terminals deployed across agencies';
COMMENT ON COLUMN terminals.serial_number IS 'Unique serial number of the MB460 device';
COMMENT ON COLUMN terminals.status IS 'Connection status: online, offline, unknown';
COMMENT ON COLUMN terminals.face_enabled IS 'Whether face recognition is enabled on this device (rollout phase control)';

-- ============================================================================
-- 2. BIOMETRIC CREDENTIALS - Add face recognition support
-- ============================================================================

-- Add face template ID for face recognition
ALTER TABLE biometric_credentials 
ADD COLUMN IF NOT EXISTS face_template_id VARCHAR(255) NULL;

-- Add biometric type to distinguish fingerprint vs face vs both
ALTER TABLE biometric_credentials 
ADD COLUMN IF NOT EXISTS biometric_type VARCHAR(20) DEFAULT 'fingerprint';

-- Add reference to terminal where biometric was enrolled
ALTER TABLE biometric_credentials 
ADD COLUMN IF NOT EXISTS terminal_id UUID REFERENCES terminals(id) ON DELETE SET NULL;

-- Add MB460 internal user ID (the device's internal ID for this user)
ALTER TABLE biometric_credentials 
ADD COLUMN IF NOT EXISTS device_user_id VARCHAR(50) NULL;

-- Comments
COMMENT ON COLUMN biometric_credentials.face_template_id IS 'Face template ID for MB460 face recognition';
COMMENT ON COLUMN biometric_credentials.biometric_type IS 'Type of biometric: fingerprint, face, or both';
COMMENT ON COLUMN biometric_credentials.terminal_id IS 'MB460 terminal where biometric was enrolled';
COMMENT ON COLUMN biometric_credentials.device_user_id IS 'Internal user ID on the MB460 device';

-- ============================================================================
-- 3. ATTENDANCE RECORDS - Add terminal reference
-- ============================================================================

-- Add reference to terminal that recorded this attendance
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS terminal_id UUID REFERENCES terminals(id) ON DELETE SET NULL;

-- Comment
COMMENT ON COLUMN attendance_records.terminal_id IS 'MB460 terminal that recorded this attendance event';

-- ============================================================================
-- 4. CLOCK IN FUNCTION - Support terminal-based clock in
-- ============================================================================
-- This function will be called by the middleware when MB460 sends an attendance event

CREATE OR REPLACE FUNCTION clock_in_from_terminal(
    p_emp_id TEXT,
    p_terminal_serial TEXT,
    p_verification_method TEXT DEFAULT 'fingerprint',
    p_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_employee_id UUID;
    v_terminal_id UUID;
    v_attendance_id UUID;
    v_today DATE;
    v_existing_record UUID;
    v_status TEXT;
    v_clock_in_time TIME;
    v_work_start TIME := '08:00:00'::TIME;  -- Default work start time
    v_late_threshold INTERVAL := '15 minutes';
BEGIN
    -- Get today's date
    v_today := DATE(p_timestamp AT TIME ZONE 'UTC');
    v_clock_in_time := (p_timestamp AT TIME ZONE 'UTC')::TIME;
    
    -- Find employee by emp_id
    SELECT id INTO v_employee_id 
    FROM employees 
    WHERE emp_id = p_emp_id AND is_active = true;
    
    IF v_employee_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Employee not found or inactive',
            'emp_id', p_emp_id
        );
    END IF;
    
    -- Find terminal by serial number
    SELECT id INTO v_terminal_id 
    FROM terminals 
    WHERE serial_number = p_terminal_serial;
    
    -- Check for existing attendance today
    SELECT id INTO v_existing_record
    FROM attendance_records
    WHERE employee_id = v_employee_id AND date = v_today;
    
    IF v_existing_record IS NOT NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Already clocked in today',
            'emp_id', p_emp_id,
            'record_id', v_existing_record
        );
    END IF;
    
    -- Determine status based on clock-in time
    IF v_clock_in_time <= v_work_start + v_late_threshold THEN
        v_status := 'on_time';
    ELSE
        v_status := 'late';
    END IF;
    
    -- Insert attendance record
    INSERT INTO attendance_records (
        employee_id,
        date,
        clock_in_time,
        status,
        verification_method,
        terminal_id
    ) VALUES (
        v_employee_id,
        v_today,
        p_timestamp,
        v_status,
        p_verification_method,
        v_terminal_id
    )
    RETURNING id INTO v_attendance_id;
    
    -- Log the function call
    INSERT INTO function_call_audit (function_name, target_employee_id, outcome, note)
    VALUES (
        'clock_in_from_terminal',
        v_employee_id,
        'success',
        'Terminal: ' || COALESCE(p_terminal_serial, 'unknown') || ', Method: ' || p_verification_method
    );
    
    -- Update terminal last_seen
    IF v_terminal_id IS NOT NULL THEN
        UPDATE terminals 
        SET last_seen = NOW(), status = 'online'
        WHERE id = v_terminal_id;
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'record_id', v_attendance_id,
        'emp_id', p_emp_id,
        'status', v_status,
        'clock_in_time', p_timestamp,
        'terminal', p_terminal_serial
    );
END;
$$;

-- ============================================================================
-- 5. CLOCK OUT FUNCTION - Support terminal-based clock out
-- ============================================================================

CREATE OR REPLACE FUNCTION clock_out_from_terminal(
    p_emp_id TEXT,
    p_terminal_serial TEXT,
    p_verification_method TEXT DEFAULT 'fingerprint',
    p_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_employee_id UUID;
    v_terminal_id UUID;
    v_attendance_id UUID;
    v_today DATE;
    v_clock_in_time TIMESTAMPTZ;
    v_total_hours NUMERIC;
BEGIN
    v_today := DATE(p_timestamp AT TIME ZONE 'UTC');
    
    -- Find employee
    SELECT id INTO v_employee_id 
    FROM employees 
    WHERE emp_id = p_emp_id AND is_active = true;
    
    IF v_employee_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Employee not found or inactive',
            'emp_id', p_emp_id
        );
    END IF;
    
    -- Find terminal
    SELECT id INTO v_terminal_id 
    FROM terminals 
    WHERE serial_number = p_terminal_serial;
    
    -- Find today's attendance record
    SELECT id, clock_in_time INTO v_attendance_id, v_clock_in_time
    FROM attendance_records
    WHERE employee_id = v_employee_id 
      AND date = v_today 
      AND clock_out_time IS NULL;
    
    IF v_attendance_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No clock-in record found for today or already clocked out',
            'emp_id', p_emp_id
        );
    END IF;
    
    -- Calculate total hours
    v_total_hours := EXTRACT(EPOCH FROM (p_timestamp - v_clock_in_time)) / 3600.0;
    
    -- Update attendance record
    UPDATE attendance_records
    SET 
        clock_out_time = p_timestamp,
        total_hours = ROUND(v_total_hours::NUMERIC, 2),
        updated_at = NOW()
    WHERE id = v_attendance_id;
    
    -- Log the function call
    INSERT INTO function_call_audit (function_name, target_employee_id, outcome, note)
    VALUES (
        'clock_out_from_terminal',
        v_employee_id,
        'success',
        'Terminal: ' || COALESCE(p_terminal_serial, 'unknown') || ', Hours: ' || ROUND(v_total_hours::NUMERIC, 2)
    );
    
    -- Update terminal last_seen
    IF v_terminal_id IS NOT NULL THEN
        UPDATE terminals 
        SET last_seen = NOW(), status = 'online'
        WHERE id = v_terminal_id;
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'record_id', v_attendance_id,
        'emp_id', p_emp_id,
        'clock_out_time', p_timestamp,
        'total_hours', ROUND(v_total_hours::NUMERIC, 2),
        'terminal', p_terminal_serial
    );
END;
$$;

-- ============================================================================
-- 6. HELPER FUNCTION - Update terminal status
-- ============================================================================

CREATE OR REPLACE FUNCTION update_terminal_status(
    p_serial_number TEXT,
    p_status TEXT,
    p_ip_address INET DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_terminal_id UUID;
BEGIN
    UPDATE terminals
    SET 
        status = p_status,
        last_seen = NOW(),
        ip_address = COALESCE(p_ip_address, ip_address),
        updated_at = NOW()
    WHERE serial_number = p_serial_number
    RETURNING id INTO v_terminal_id;
    
    IF v_terminal_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Terminal not found',
            'serial', p_serial_number
        );
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'terminal_id', v_terminal_id,
        'status', p_status
    );
END;
$$;

-- ============================================================================
-- 7. RLS POLICIES FOR TERMINALS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE terminals ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read terminals (for dashboard)
CREATE POLICY "Allow authenticated users to read terminals"
ON terminals FOR SELECT
TO authenticated
USING (true);

-- Allow service role full access (for middleware)
CREATE POLICY "Allow service role full access to terminals"
ON terminals FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute on new functions
GRANT EXECUTE ON FUNCTION clock_in_from_terminal TO authenticated;
GRANT EXECUTE ON FUNCTION clock_in_from_terminal TO service_role;
GRANT EXECUTE ON FUNCTION clock_out_from_terminal TO authenticated;
GRANT EXECUTE ON FUNCTION clock_out_from_terminal TO service_role;
GRANT EXECUTE ON FUNCTION update_terminal_status TO service_role;

-- Grant table access
GRANT SELECT, INSERT, UPDATE ON terminals TO authenticated;
GRANT ALL ON terminals TO service_role;

-- ============================================================================
-- Done! 
-- ============================================================================
-- Next steps:
-- 1. Run this migration: supabase db push (or via Supabase dashboard)
-- 2. Add terminal records for each agency
-- 3. Deploy middleware to Oracle Cloud
-- ============================================================================
