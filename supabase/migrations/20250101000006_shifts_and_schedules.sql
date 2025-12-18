-- =====================================================================================
-- SHIFTS AND WORK SCHEDULES
-- =====================================================================================
-- Description: Flexible work schedules and shift management
-- Allows different employees to work different hours
-- =====================================================================================

-- =====================================================================================
-- SHIFTS TABLE
-- =====================================================================================

CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    -- Shift timing
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    -- Grace period for late arrivals (in minutes)
    grace_period_minutes INTEGER DEFAULT 15,
    -- Break duration (in minutes)
    break_duration_minutes INTEGER DEFAULT 60,
    -- Working days (0=Sunday, 6=Saturday)
    working_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- Mon-Fri
    -- Status
    is_active BOOLEAN DEFAULT true,
    color_code TEXT DEFAULT '#3B82F6', -- For UI display
    -- Meta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Constraints
    CONSTRAINT end_after_start CHECK (end_time > start_time),
    CONSTRAINT valid_grace_period CHECK (grace_period_minutes >= 0 AND grace_period_minutes <= 120),
    CONSTRAINT valid_break_duration CHECK (break_duration_minutes >= 0 AND break_duration_minutes <= 240),
    CONSTRAINT valid_working_days CHECK (
        working_days <@ ARRAY[0,1,2,3,4,5,6]
    )
);

COMMENT ON TABLE shifts IS 'Defines different work shifts (e.g., Morning, Evening, Night)';
COMMENT ON COLUMN shifts.working_days IS 'Array of working day numbers (0=Sunday, 6=Saturday)';
COMMENT ON COLUMN shifts.grace_period_minutes IS 'Minutes after start_time before marked as late';

CREATE INDEX idx_shifts_active ON shifts(is_active);

-- =====================================================================================
-- EMPLOYEE SHIFT ASSIGNMENTS
-- =====================================================================================

CREATE TABLE employee_shift_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    -- Effective dates
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    -- Meta
    assigned_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    -- Constraints
    CONSTRAINT valid_date_range CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

COMMENT ON TABLE employee_shift_assignments IS 'Assigns employees to specific shifts with date ranges';
COMMENT ON COLUMN employee_shift_assignments.effective_to IS 'NULL means assignment is ongoing';

CREATE INDEX idx_employee_shift_employee ON employee_shift_assignments(employee_id);
CREATE INDEX idx_employee_shift_shift ON employee_shift_assignments(shift_id);
CREATE INDEX idx_employee_shift_dates ON employee_shift_assignments(effective_from, effective_to);

-- =====================================================================================
-- LOCATIONS/SITES TABLE
-- =====================================================================================

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE, -- Short code like "HQ", "NYC", "LA"
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'USA',
    postal_code TEXT,
    -- Geolocation (for future geo-fencing)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    -- Contact
    contact_person TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    -- Status
    is_active BOOLEAN DEFAULT true,
    timezone TEXT DEFAULT 'UTC',
    -- Meta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE locations IS 'Physical office locations/sites';
COMMENT ON COLUMN locations.timezone IS 'IANA timezone identifier (e.g., America/New_York)';

CREATE INDEX idx_locations_active ON locations(is_active);
CREATE INDEX idx_locations_code ON locations(code) WHERE code IS NOT NULL;

-- =====================================================================================
-- JOB TITLES/POSITIONS TABLE
-- =====================================================================================

CREATE TABLE job_titles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL UNIQUE,
    description TEXT,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    -- Hierarchy
    level INTEGER DEFAULT 1, -- 1=Entry, 5=Senior, 10=Executive
    reports_to_title_id UUID REFERENCES job_titles(id) ON DELETE SET NULL,
    -- Status
    is_active BOOLEAN DEFAULT true,
    -- Meta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE job_titles IS 'Job titles/positions within the organization';
COMMENT ON COLUMN job_titles.level IS 'Organizational hierarchy level (1-10)';

CREATE INDEX idx_job_titles_department ON job_titles(department_id);
CREATE INDEX idx_job_titles_active ON job_titles(is_active);

-- =====================================================================================
-- ADD NEW COLUMNS TO EMPLOYEES TABLE
-- =====================================================================================

ALTER TABLE employees 
    ADD COLUMN IF NOT EXISTS job_title_id UUID REFERENCES job_titles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS primary_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS hire_date DATE,
    ADD COLUMN IF NOT EXISTS employee_type TEXT DEFAULT 'full_time' CHECK (employee_type IN ('full_time', 'part_time', 'contract', 'intern'));

COMMENT ON COLUMN employees.job_title_id IS 'Current job title/position';
COMMENT ON COLUMN employees.primary_location_id IS 'Primary work location';
COMMENT ON COLUMN employees.manager_id IS 'Direct manager/supervisor';
COMMENT ON COLUMN employees.employee_type IS 'Employment type: full_time, part_time, contract, intern';

CREATE INDEX IF NOT EXISTS idx_employees_job_title ON employees(job_title_id);
CREATE INDEX IF NOT EXISTS idx_employees_location ON employees(primary_location_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(manager_id);

-- =====================================================================================
-- ADD LOCATION AND SHIFT TO ATTENDANCE RECORDS
-- =====================================================================================

ALTER TABLE attendance_records
    ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS expected_clock_in TIME,
    ADD COLUMN IF NOT EXISTS expected_clock_out TIME;

COMMENT ON COLUMN attendance_records.location_id IS 'Location where attendance was recorded';
COMMENT ON COLUMN attendance_records.shift_id IS 'Shift the employee was working';
COMMENT ON COLUMN attendance_records.expected_clock_in IS 'Expected clock-in time based on shift';
COMMENT ON COLUMN attendance_records.expected_clock_out IS 'Expected clock-out time based on shift';

CREATE INDEX IF NOT EXISTS idx_attendance_location ON attendance_records(location_id);
CREATE INDEX IF NOT EXISTS idx_attendance_shift ON attendance_records(shift_id);

-- =====================================================================================
-- FUNCTION: Get Employee's Current Shift
-- =====================================================================================

CREATE OR REPLACE FUNCTION get_employee_current_shift(p_employee_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
    shift_id UUID,
    shift_name TEXT,
    start_time TIME,
    end_time TIME,
    grace_period_minutes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.start_time,
        s.end_time,
        s.grace_period_minutes
    FROM shifts s
    JOIN employee_shift_assignments esa ON s.id = esa.shift_id
    WHERE esa.employee_id = p_employee_id
      AND esa.effective_from <= p_date
      AND (esa.effective_to IS NULL OR esa.effective_to >= p_date)
      AND s.is_active = true
    ORDER BY esa.assigned_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_employee_current_shift IS 
    'Returns the current shift assignment for an employee on a given date';

-- =====================================================================================
-- UPDATE AUTO-DETERMINE STATUS TO USE SHIFTS
-- =====================================================================================

-- Drop old trigger
DROP TRIGGER IF EXISTS auto_set_attendance_status ON attendance_records;
DROP FUNCTION IF EXISTS auto_determine_status();

-- New version with shift support
CREATE OR REPLACE FUNCTION auto_determine_status_with_shift()
RETURNS TRIGGER AS $$
DECLARE
    v_shift_start TIME;
    v_shift_end TIME;
    v_grace_period INTEGER;
    v_clock_in_time TIME;
    v_clock_out_time TIME;
    v_dow INTEGER;
BEGIN
    -- Get shift info if assigned
    IF NEW.shift_id IS NOT NULL THEN
        SELECT start_time, end_time, grace_period_minutes
        INTO v_shift_start, v_shift_end, v_grace_period
        FROM shifts
        WHERE id = NEW.shift_id;
    ELSE
        -- Default shift: 9 AM - 5 PM, 15 min grace
        v_shift_start := '09:00:00'::TIME;
        v_shift_end := '17:00:00'::TIME;
        v_grace_period := 15;
    END IF;
    
    -- Set expected times
    NEW.expected_clock_in := v_shift_start;
    NEW.expected_clock_out := v_shift_end;
    
    -- Extract time from clock-in
    v_clock_in_time := NEW.clock_in_time::TIME;
    
    -- Determine status on clock in
    IF NEW.clock_out_time IS NULL THEN
        IF v_clock_in_time <= v_shift_start + (v_grace_period || ' minutes')::INTERVAL THEN
            NEW.status = 'on_time';
        ELSE
            NEW.status = 'late';
        END IF;
    ELSE
        -- Check for early departure on clock out
        v_clock_out_time := NEW.clock_out_time::TIME;
        IF v_clock_out_time < v_shift_end AND NEW.status = 'on_time' THEN
            NEW.status = 'early_departure';
        END IF;
        
        -- Check for half day (less than 4 hours)
        IF NEW.total_hours < 4 THEN
            NEW.status = 'half_day';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER auto_set_attendance_status_with_shift
    BEFORE INSERT OR UPDATE ON attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION auto_determine_status_with_shift();

-- =====================================================================================
-- SEED DEFAULT SHIFTS
-- =====================================================================================

INSERT INTO shifts (id, name, description, start_time, end_time, grace_period_minutes, working_days, color_code) VALUES
    (
        '30000000-0000-0000-0000-000000000001',
        'Standard Day Shift',
        'Regular 9 AM - 5 PM shift',
        '09:00:00',
        '17:00:00',
        15,
        ARRAY[1,2,3,4,5], -- Mon-Fri
        '#3B82F6'
    ),
    (
        '30000000-0000-0000-0000-000000000002',
        'Early Morning Shift',
        'Early shift 6 AM - 2 PM',
        '06:00:00',
        '14:00:00',
        15,
        ARRAY[1,2,3,4,5],
        '#10B981'
    ),
    (
        '30000000-0000-0000-0000-000000000003',
        'Evening Shift',
        'Evening shift 2 PM - 10 PM',
        '14:00:00',
        '22:00:00',
        15,
        ARRAY[1,2,3,4,5],
        '#F59E0B'
    ),
    (
        '30000000-0000-0000-0000-000000000004',
        'Night Shift',
        'Night shift 10 PM - 6 AM',
        '22:00:00',
        '06:00:00',
        15,
        ARRAY[1,2,3,4,5],
        '#8B5CF6'
    ),
    (
        '30000000-0000-0000-0000-000000000005',
        'Flexible Hours',
        'Flexible working hours',
        '00:00:00',
        '23:59:59',
        60, -- 1 hour grace period
        ARRAY[1,2,3,4,5],
        '#EC4899'
    )
ON CONFLICT (id) DO NOTHING;

-- =====================================================================================
-- RLS POLICIES FOR NEW TABLES
-- =====================================================================================

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_titles ENABLE ROW LEVEL SECURITY;

-- Shifts: Everyone can view, admins can modify
CREATE POLICY "Anyone can view shifts"
    ON shifts FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Admins can manage shifts"
    ON shifts FOR ALL TO authenticated
    USING (is_admin()) WITH CHECK (is_admin());

-- Shift Assignments: View own, admins view all
CREATE POLICY "Employees can view own shift assignments"
    ON employee_shift_assignments FOR SELECT TO authenticated
    USING (employee_id = get_current_employee_id() OR is_admin());

CREATE POLICY "Admins can manage shift assignments"
    ON employee_shift_assignments FOR ALL TO authenticated
    USING (is_admin()) WITH CHECK (is_admin());

-- Locations: Everyone can view, admins can modify
CREATE POLICY "Anyone can view locations"
    ON locations FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Admins can manage locations"
    ON locations FOR ALL TO authenticated
    USING (is_admin()) WITH CHECK (is_admin());

-- Job Titles: Everyone can view, admins can modify
CREATE POLICY "Anyone can view job titles"
    ON job_titles FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Admins can manage job titles"
    ON job_titles FOR ALL TO authenticated
    USING (is_admin()) WITH CHECK (is_admin());

-- =====================================================================================
-- UPDATED VIEW: Employees Full with new fields
-- =====================================================================================

CREATE OR REPLACE VIEW v_employees_full AS
SELECT 
    e.id,
    e.emp_id,
    e.name,
    e.email,
    e.employee_type,
    e.hire_date,
    d.name AS department_name,
    a.name AS agency_name,
    jt.title AS job_title,
    jt.level AS job_level,
    l.name AS location_name,
    l.code AS location_code,
    m.name AS manager_name,
    m.emp_id AS manager_emp_id,
    e.is_active,
    CASE 
        WHEN bc.id IS NOT NULL THEN true 
        ELSE false 
    END AS has_biometric,
    bc.fingerprint_id,
    bc.device_type AS biometric_device_type,
    bc.registered_at AS biometric_registered_at,
    -- Current shift info
    (SELECT s.name FROM shifts s 
     JOIN employee_shift_assignments esa ON s.id = esa.shift_id
     WHERE esa.employee_id = e.id 
       AND esa.effective_from <= CURRENT_DATE
       AND (esa.effective_to IS NULL OR esa.effective_to >= CURRENT_DATE)
       AND s.is_active = true
     ORDER BY esa.assigned_at DESC LIMIT 1
    ) AS current_shift_name,
    e.created_at,
    e.updated_at
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN agencies a ON e.agency_id = a.id
LEFT JOIN job_titles jt ON e.job_title_id = jt.id
LEFT JOIN locations l ON e.primary_location_id = l.id
LEFT JOIN employees m ON e.manager_id = m.id
LEFT JOIN biometric_credentials bc ON e.id = bc.employee_id AND bc.is_active = true;

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

CREATE TRIGGER update_shifts_updated_at
    BEFORE UPDATE ON shifts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_titles_updated_at
    BEFORE UPDATE ON job_titles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- GRANT PERMISSIONS
-- =====================================================================================

GRANT SELECT ON shifts TO authenticated, anon;
GRANT SELECT ON locations TO authenticated, anon;
GRANT SELECT ON job_titles TO authenticated, anon;
GRANT SELECT ON employee_shift_assignments TO authenticated;
GRANT EXECUTE ON FUNCTION get_employee_current_shift(UUID, DATE) TO authenticated, anon;
