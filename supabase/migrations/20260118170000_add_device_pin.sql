-- ============================================================================
-- Add device_pin to employees
-- ============================================================================

-- 1. Add device_pin column
ALTER TABLE employees ADD COLUMN IF NOT EXISTS device_pin INTEGER UNIQUE;

-- 2. Create a sequence for device_pin starting from 1
CREATE SEQUENCE IF NOT EXISTS device_pin_seq START WITH 1;

-- 3. Populate device_pin for existing employees if they don't have one
-- Strategy: Try to extract numeric part from emp_id if it follows AGENT-XXXXX format
-- Otherwise just use the sequence.
DO $$
DECLARE
    emp_record RECORD;
    extracted_pin INTEGER;
BEGIN
    FOR emp_record IN SELECT id, emp_id FROM employees WHERE device_pin IS NULL LOOP
        -- Attempt to extract numeric part (e.g., from 'ID-00004' extract 4)
        BEGIN
            IF emp_record.emp_id ~ '\d+' THEN
                extracted_pin := (regexp_matches(emp_record.emp_id, '(\d+)'))[1]::INTEGER;
                -- Check if this pin is already used
                IF EXISTS (SELECT 1 FROM employees WHERE device_pin = extracted_pin) THEN
                    extracted_pin := nextval('device_pin_seq');
                END IF;
            ELSE
                extracted_pin := nextval('device_pin_seq');
            END IF;
        EXCEPTION WHEN OTHERS THEN
            extracted_pin := nextval('device_pin_seq');
        END;

        UPDATE employees SET device_pin = extracted_pin WHERE id = emp_record.id;
    END LOOP;
END $$;

-- 4. Update the RPC functions to support device_pin lookup
-- We'll redo clock_in_from_terminal and clock_out_from_terminal to be more robust

CREATE OR REPLACE FUNCTION clock_in_from_terminal(
    p_emp_id TEXT, -- This could be alphanumeric emp_id OR numeric device_pin
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
    v_work_start TIME := '08:00:00'::TIME;
    v_late_threshold INTERVAL := '15 minutes';
    v_device_pin INTEGER;
BEGIN
    -- Get today's date
    v_today := DATE(p_timestamp AT TIME ZONE 'UTC');
    v_clock_in_time := (p_timestamp AT TIME ZONE 'UTC')::TIME;
    
    -- Find employee by emp_id OR device_pin
    IF p_emp_id ~ '^\d+$' THEN
        v_device_pin := p_emp_id::INTEGER;
        SELECT id INTO v_employee_id FROM employees 
        WHERE (device_pin = v_device_pin OR emp_id = p_emp_id) AND is_active = true
        LIMIT 1;
    ELSE
        SELECT id INTO v_employee_id FROM employees 
        WHERE emp_id = p_emp_id AND is_active = true
        LIMIT 1;
    END IF;
    
    IF v_employee_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Employee not found or inactive',
            'emp_id', p_emp_id
        );
    END IF;
    
    -- Find terminal
    SELECT id INTO v_terminal_id FROM terminals WHERE serial_number = p_terminal_serial;
    
    -- Check for existing attendance today
    SELECT id INTO v_existing_record FROM attendance_records
    WHERE employee_id = v_employee_id AND date = v_today;
    
    IF v_existing_record IS NOT NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Already clocked in today',
            'emp_id', p_emp_id,
            'record_id', v_existing_record
        );
    END IF;
    
    -- Status
    IF v_clock_in_time <= v_work_start + v_late_threshold THEN
        v_status := 'on_time';
    ELSE
        v_status := 'late';
    END IF;
    
    -- Insert
    INSERT INTO attendance_records (
        employee_id, date, clock_in_time, status, verification_method, terminal_id
    ) VALUES (
        v_employee_id, v_today, p_timestamp, v_status, p_verification_method, v_terminal_id
    )
    RETURNING id INTO v_attendance_id;
    
    -- Update terminal
    IF v_terminal_id IS NOT NULL THEN
        UPDATE terminals SET last_seen = NOW(), status = 'online' WHERE id = v_terminal_id;
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
    v_device_pin INTEGER;
BEGIN
    v_today := DATE(p_timestamp AT TIME ZONE 'UTC');
    
    -- Find employee
    IF p_emp_id ~ '^\d+$' THEN
        v_device_pin := p_emp_id::INTEGER;
        SELECT id INTO v_employee_id FROM employees 
        WHERE (device_pin = v_device_pin OR emp_id = p_emp_id) AND is_active = true
        LIMIT 1;
    ELSE
        SELECT id INTO v_employee_id FROM employees 
        WHERE emp_id = p_emp_id AND is_active = true
        LIMIT 1;
    END IF;
    
    IF v_employee_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Employee not found or inactive',
            'emp_id', p_emp_id
        );
    END IF;
    
    -- Find terminal
    SELECT id INTO v_terminal_id FROM terminals WHERE serial_number = p_terminal_serial;
    
    -- Find today's open record
    SELECT id, clock_in_time INTO v_attendance_id, v_clock_in_time
    FROM attendance_records
    WHERE employee_id = v_employee_id AND date = v_today AND clock_out_time IS NULL
    ORDER BY clock_in_time DESC LIMIT 1;
    
    IF v_attendance_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No clock-in record found for today',
            'emp_id', p_emp_id
        );
    END IF;
    
    -- Calculate hours
    v_total_hours := EXTRACT(EPOCH FROM (p_timestamp - v_clock_in_time)) / 3600.0;
    
    -- Update
    UPDATE attendance_records
    SET clock_out_time = p_timestamp, total_hours = ROUND(v_total_hours::NUMERIC, 2), updated_at = NOW()
    WHERE id = v_attendance_id;
    
    -- Update terminal
    IF v_terminal_id IS NOT NULL THEN
        UPDATE terminals SET last_seen = NOW(), status = 'online' WHERE id = v_terminal_id;
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
