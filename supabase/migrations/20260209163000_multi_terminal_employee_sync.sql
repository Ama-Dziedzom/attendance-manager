-- ============================================================================
-- Multi-Terminal Employee Sync Migration
-- ============================================================================
-- This migration ensures employees can log in to multiple terminals
-- by creating a proper employee-terminal sync tracking table.
-- 
-- Key feature: Each employee can be synced (with user data + fingerprints)
-- to ANY number of terminals, tracked independently.
-- ============================================================================

-- ============================================================================
-- 1. EMPLOYEE-TERMINAL SYNC TABLE
-- ============================================================================
-- Tracks sync status between employees and terminals (many-to-many)

CREATE TABLE IF NOT EXISTS employee_terminal_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emp_id VARCHAR(50) NOT NULL,                       -- Human-readable employee ID
    terminal_sn VARCHAR(50) NOT NULL,                  -- Terminal serial number
    status VARCHAR(20) DEFAULT 'pending',              -- pending, synced, failed, deleted
    last_sync_at TIMESTAMPTZ DEFAULT NOW(),            -- When last synced
    sync_attempts INTEGER DEFAULT 0,                   -- Number of sync attempts
    last_error TEXT,                                   -- Last error message if failed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: each employee-terminal pair is unique
    CONSTRAINT employee_terminal_sync_unique UNIQUE (emp_id, terminal_sn)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_ets_emp_id ON employee_terminal_sync(emp_id);
CREATE INDEX IF NOT EXISTS idx_ets_terminal_sn ON employee_terminal_sync(terminal_sn);
CREATE INDEX IF NOT EXISTS idx_ets_status ON employee_terminal_sync(status);
CREATE INDEX IF NOT EXISTS idx_ets_pending ON employee_terminal_sync(terminal_sn, status) 
    WHERE status = 'pending';

-- Comments
COMMENT ON TABLE employee_terminal_sync IS 'Tracks which employees are synced to which terminals (many-to-many)';
COMMENT ON COLUMN employee_terminal_sync.emp_id IS 'Employee ID (e.g., ID-00004)';
COMMENT ON COLUMN employee_terminal_sync.terminal_sn IS 'Terminal serial number';
COMMENT ON COLUMN employee_terminal_sync.status IS 'Sync status: pending=needs sync, synced=on device, failed=sync error, deleted=removed from device';

-- ============================================================================
-- 2. TERMINAL-AGENCY ASSOCIATION TABLE (if not exists)
-- ============================================================================
-- Allows a terminal to serve multiple agencies

CREATE TABLE IF NOT EXISTS terminal_agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    terminal_sn VARCHAR(50) NOT NULL,
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT terminal_agency_unique UNIQUE (terminal_sn, agency_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ta_terminal_sn ON terminal_agencies(terminal_sn);
CREATE INDEX IF NOT EXISTS idx_ta_agency_id ON terminal_agencies(agency_id);

-- Comments
COMMENT ON TABLE terminal_agencies IS 'Links terminals to multiple agencies (many-to-many)';

-- ============================================================================
-- 3. HELPER FUNCTION: Sync Employee to All Linked Terminals
-- ============================================================================
-- Call this when a new employee is added or their data changes

CREATE OR REPLACE FUNCTION queue_employee_sync_to_terminals(p_emp_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_employee_record RECORD;
    v_agency_id UUID;
    v_terminal_sn TEXT;
    v_count INTEGER := 0;
BEGIN
    -- Get employee's agency
    SELECT id, agency_id INTO v_employee_record
    FROM employees
    WHERE emp_id = p_emp_id AND is_active = true;
    
    IF v_employee_record IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Employee not found or inactive',
            'emp_id', p_emp_id
        );
    END IF;
    
    v_agency_id := v_employee_record.agency_id;
    
    -- Find all terminals linked to this agency
    FOR v_terminal_sn IN
        SELECT DISTINCT ta.terminal_sn
        FROM terminal_agencies ta
        WHERE ta.agency_id = v_agency_id
        UNION
        SELECT t.serial_number
        FROM terminals t
        WHERE t.agency_id = v_agency_id
    LOOP
        -- Insert or update sync record as pending
        INSERT INTO employee_terminal_sync (emp_id, terminal_sn, status, sync_attempts)
        VALUES (p_emp_id, v_terminal_sn, 'pending', 0)
        ON CONFLICT (emp_id, terminal_sn)
        DO UPDATE SET 
            status = 'pending',
            updated_at = NOW();
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'emp_id', p_emp_id,
        'terminals_queued', v_count
    );
END;
$$;

-- ============================================================================
-- 4. HELPER FUNCTION: Sync All Active Employees to a Terminal
-- ============================================================================
-- Call this when a new terminal is added

CREATE OR REPLACE FUNCTION queue_all_employees_to_terminal(p_terminal_sn TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_agency_ids UUID[];
    v_emp_id TEXT;
    v_count INTEGER := 0;
BEGIN
    -- Get all agencies linked to this terminal
    SELECT ARRAY_AGG(DISTINCT agency_id) INTO v_agency_ids
    FROM (
        SELECT agency_id FROM terminal_agencies WHERE terminal_sn = p_terminal_sn
        UNION
        SELECT agency_id FROM terminals WHERE serial_number = p_terminal_sn
    ) agencies;
    
    IF v_agency_ids IS NULL OR array_length(v_agency_ids, 1) IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No agencies linked to terminal',
            'terminal_sn', p_terminal_sn
        );
    END IF;
    
    -- Queue all active employees from linked agencies
    FOR v_emp_id IN
        SELECT emp_id
        FROM employees
        WHERE agency_id = ANY(v_agency_ids) AND is_active = true
    LOOP
        INSERT INTO employee_terminal_sync (emp_id, terminal_sn, status, sync_attempts)
        VALUES (v_emp_id, p_terminal_sn, 'pending', 0)
        ON CONFLICT (emp_id, terminal_sn)
        DO UPDATE SET 
            status = 'pending',
            updated_at = NOW();
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'terminal_sn', p_terminal_sn,
        'employees_queued', v_count
    );
END;
$$;

-- ============================================================================
-- 5. TRIGGER: Auto-queue new employees for sync
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_queue_new_employee_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only trigger for active employees
    IF NEW.is_active = true THEN
        PERFORM queue_employee_sync_to_terminals(NEW.emp_id);
    END IF;
    RETURN NEW;
END;
$$;

-- Drop trigger if exists, then recreate
DROP TRIGGER IF EXISTS trg_new_employee_sync ON employees;

CREATE TRIGGER trg_new_employee_sync
    AFTER INSERT ON employees
    FOR EACH ROW
    EXECUTE FUNCTION trigger_queue_new_employee_sync();

-- ============================================================================
-- 6. RLS POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE employee_terminal_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminal_agencies ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated read employee_terminal_sync" ON employee_terminal_sync
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read terminal_agencies" ON terminal_agencies
    FOR SELECT TO authenticated USING (true);

-- Allow service role full access
CREATE POLICY "Allow service_role full access employee_terminal_sync" ON employee_terminal_sync
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role full access terminal_agencies" ON terminal_agencies
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON employee_terminal_sync TO authenticated;
GRANT ALL ON employee_terminal_sync TO service_role;

GRANT SELECT ON terminal_agencies TO authenticated;
GRANT ALL ON terminal_agencies TO service_role;

GRANT EXECUTE ON FUNCTION queue_employee_sync_to_terminals TO authenticated;
GRANT EXECUTE ON FUNCTION queue_employee_sync_to_terminals TO service_role;

GRANT EXECUTE ON FUNCTION queue_all_employees_to_terminal TO authenticated;
GRANT EXECUTE ON FUNCTION queue_all_employees_to_terminal TO service_role;

-- ============================================================================
-- Done!
-- ============================================================================
-- With this migration, employees can now:
-- 1. Be synced to ANY number of terminals (not just one)
-- 2. Each terminal independently tracks sync status
-- 3. New employees automatically queue for sync to all linked terminals
-- 4. Terminals can serve multiple agencies (via terminal_agencies table)
-- ============================================================================
