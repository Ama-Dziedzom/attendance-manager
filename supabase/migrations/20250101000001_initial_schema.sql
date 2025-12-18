-- =====================================================================================
-- ATTENDANCE MANAGER PLATFORM - INITIAL SCHEMA
-- =====================================================================================
-- Description: Core database schema for biometric attendance management system
-- Flow: Employee Setup → Biometric Registration → Clock In/Out → Attendance Reporting
-- =====================================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================================
-- LOOKUP/REFERENCE TABLES
-- =====================================================================================

-- Departments Table
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE departments IS 'Lookup table for employee departments';
COMMENT ON COLUMN departments.name IS 'Department name (e.g., HR, IT, Finance)';

-- Agencies Table  
CREATE TABLE agencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    address TEXT,
    contact_info JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE agencies IS 'Lookup table for agencies/companies';
COMMENT ON COLUMN agencies.contact_info IS 'JSON object for phone, email, website, etc.';

-- =====================================================================================
-- CORE TABLES
-- =====================================================================================

-- Employees Table (Central entity)
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    emp_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Constraints
    CONSTRAINT emp_id_format CHECK (emp_id ~ '^[A-Z0-9-]+$'),
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR email IS NULL)
);

COMMENT ON TABLE employees IS 'Core employee information for attendance tracking';
COMMENT ON COLUMN employees.emp_id IS 'Unique employee identifier (alphanumeric + hyphens)';
COMMENT ON COLUMN employees.is_active IS 'Soft delete flag - false means employee is no longer active';

-- Create indexes for employees
CREATE INDEX idx_employees_emp_id ON employees(emp_id);
CREATE INDEX idx_employees_email ON employees(email) WHERE email IS NOT NULL;
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_agency ON employees(agency_id);
CREATE INDEX idx_employees_active ON employees(is_active);

-- =====================================================================================
-- BIOMETRIC AUTHENTICATION TABLES
-- =====================================================================================

-- Biometric Credentials Table (WebAuthn/Windows Hello)
CREATE TABLE biometric_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    -- WebAuthn credential data
    credential_id TEXT NOT NULL UNIQUE,
    fingerprint_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter BIGINT DEFAULT 0,
    device_type TEXT NOT NULL,
    -- Status
    is_active BOOLEAN DEFAULT true,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    -- Constraints
    CONSTRAINT one_credential_per_employee UNIQUE(employee_id)
);

COMMENT ON TABLE biometric_credentials IS 'Stores WebAuthn biometric credentials for employee authentication';
COMMENT ON COLUMN biometric_credentials.credential_id IS 'Base64-encoded credential ID from WebAuthn';
COMMENT ON COLUMN biometric_credentials.fingerprint_id IS 'Human-readable fingerprint identifier';
COMMENT ON COLUMN biometric_credentials.public_key IS 'Public key for signature verification';
COMMENT ON COLUMN biometric_credentials.counter IS 'Signature counter for replay attack prevention';
COMMENT ON COLUMN biometric_credentials.device_type IS 'Device type (e.g., windows_hello, touch_id, android_biometric)';

-- Create indexes for biometric credentials
CREATE INDEX idx_biometric_employee ON biometric_credentials(employee_id);
CREATE INDEX idx_biometric_credential_id ON biometric_credentials(credential_id);
CREATE INDEX idx_biometric_fingerprint_id ON biometric_credentials(fingerprint_id);
CREATE INDEX idx_biometric_active ON biometric_credentials(is_active);

-- =====================================================================================
-- ATTENDANCE TRACKING TABLES
-- =====================================================================================

-- Attendance Records Table (Main functionality)
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    -- Time tracking
    date DATE NOT NULL,
    clock_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
    clock_out_time TIMESTAMP WITH TIME ZONE,
    total_hours DECIMAL(5,2) DEFAULT 0.0,
    -- Status
    status TEXT NOT NULL DEFAULT 'present',
    verification_method TEXT NOT NULL DEFAULT 'fingerprint',
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Constraints
    CONSTRAINT status_values CHECK (status IN ('on_time', 'late', 'early_departure', 'absent', 'half_day')),
    CONSTRAINT verification_method_values CHECK (verification_method IN ('fingerprint', 'manual', 'card', 'qr_code')),
    CONSTRAINT clock_out_after_clock_in CHECK (clock_out_time IS NULL OR clock_out_time > clock_in_time),
    CONSTRAINT one_attendance_per_day UNIQUE(employee_id, date)
);

COMMENT ON TABLE attendance_records IS 'Daily attendance records with clock in/out times';
COMMENT ON COLUMN attendance_records.date IS 'Date of attendance (for easy querying)';
COMMENT ON COLUMN attendance_records.total_hours IS 'Calculated total hours worked';
COMMENT ON COLUMN attendance_records.status IS 'Attendance status: on_time, late, early_departure, absent, half_day';
COMMENT ON COLUMN attendance_records.verification_method IS 'How the attendance was verified';

-- Create indexes for attendance records
CREATE INDEX idx_attendance_employee ON attendance_records(employee_id);
CREATE INDEX idx_attendance_date ON attendance_records(date DESC);
CREATE INDEX idx_attendance_employee_date ON attendance_records(employee_id, date DESC);
CREATE INDEX idx_attendance_status ON attendance_records(status);
CREATE INDEX idx_attendance_clock_in ON attendance_records(clock_in_time DESC);

-- =====================================================================================
-- AUDIT AND LOGGING TABLES
-- =====================================================================================

-- Audit Logs Table (Security and compliance)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    -- Action details
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    credential_id TEXT,
    -- Request metadata
    ip_address INET,
    user_agent TEXT,
    -- Result
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    -- Timestamp
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE audit_logs IS 'Audit trail for all biometric authentication and attendance events';
COMMENT ON COLUMN audit_logs.action IS 'Action performed (e.g., fingerprint_registered, auth_success, clock_in)';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity affected (e.g., employee, attendance_record)';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional contextual data as JSON';

-- Create indexes for audit logs
CREATE INDEX idx_audit_employee ON audit_logs(employee_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_success ON audit_logs(success);

-- =====================================================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agencies_updated_at
    BEFORE UPDATE ON agencies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at
    BEFORE UPDATE ON attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function: Calculate total hours on clock out
CREATE OR REPLACE FUNCTION calculate_total_hours()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.clock_out_time IS NOT NULL AND NEW.clock_in_time IS NOT NULL THEN
        NEW.total_hours = ROUND(
            EXTRACT(EPOCH FROM (NEW.clock_out_time - NEW.clock_in_time)) / 3600.0,
            2
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_attendance_hours
    BEFORE INSERT OR UPDATE ON attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION calculate_total_hours();

-- Function: Auto-determine attendance status based on clock-in time
CREATE OR REPLACE FUNCTION auto_determine_status()
RETURNS TRIGGER AS $$
DECLARE
    expected_start_time TIME := '09:00:00';
    expected_end_time TIME := '17:00:00';
    clock_in_only_time TIME;
    clock_out_only_time TIME;
BEGIN
    -- Extract time component
    clock_in_only_time := NEW.clock_in_time::TIME;
    
    -- Determine status on clock in
    IF NEW.clock_out_time IS NULL THEN
        IF clock_in_only_time > expected_start_time THEN
            NEW.status = 'late';
        ELSE
            NEW.status = 'on_time';
        END IF;
    ELSE
        -- Check for early departure on clock out
        clock_out_only_time := NEW.clock_out_time::TIME;
        IF clock_out_only_time < expected_end_time AND NEW.status = 'on_time' THEN
            NEW.status = 'early_departure';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_set_attendance_status
    BEFORE INSERT OR UPDATE ON attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION auto_determine_status();

-- Function: Update biometric last_used_at on successful authentication
CREATE OR REPLACE FUNCTION update_biometric_last_used()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.verification_method = 'fingerprint' THEN
        UPDATE biometric_credentials
        SET last_used_at = NEW.clock_in_time
        WHERE employee_id = NEW.employee_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_biometric_usage
    AFTER INSERT ON attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION update_biometric_last_used();

-- =====================================================================================
-- SEED DATA (Default departments and initial setup)
-- =====================================================================================

-- Insert default departments
INSERT INTO departments (name, description) VALUES
    ('Human Resources', 'HR department managing employee relations'),
    ('Information Technology', 'IT department managing technology infrastructure'),
    ('Finance', 'Finance department managing budgets and accounting'),
    ('Operations', 'Operations department managing daily activities'),
    ('Marketing', 'Marketing department managing brand and promotions'),
    ('Sales', 'Sales department managing customer relationships')
ON CONFLICT (name) DO NOTHING;

-- =====================================================================================
-- VIEWS FOR REPORTING
-- =====================================================================================

-- View: Employee with Department and Agency names
CREATE OR REPLACE VIEW v_employees_full AS
SELECT 
    e.id,
    e.emp_id,
    e.name,
    e.email,
    d.name AS department_name,
    a.name AS agency_name,
    e.is_active,
    CASE 
        WHEN bc.id IS NOT NULL THEN true 
        ELSE false 
    END AS has_biometric,
    bc.fingerprint_id,
    bc.device_type AS biometric_device_type,
    bc.registered_at AS biometric_registered_at,
    e.created_at,
    e.updated_at
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN agencies a ON e.agency_id = a.id
LEFT JOIN biometric_credentials bc ON e.id = bc.employee_id AND bc.is_active = true;

COMMENT ON VIEW v_employees_full IS 'Employee view with denormalized department, agency, and biometric status';

-- View: Daily attendance summary
CREATE OR REPLACE VIEW v_attendance_daily_summary AS
SELECT 
    ar.date,
    e.emp_id,
    e.name AS employee_name,
    d.name AS department_name,
    a.name AS agency_name,
    ar.clock_in_time,
    ar.clock_out_time,
    ar.total_hours,
    ar.status,
    ar.verification_method
FROM attendance_records ar
JOIN employees e ON ar.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN agencies a ON e.agency_id = a.id
ORDER BY ar.date DESC, ar.clock_in_time DESC;

COMMENT ON VIEW v_attendance_daily_summary IS 'Daily attendance records with employee details';

-- View: Employee attendance statistics
CREATE OR REPLACE VIEW v_employee_attendance_stats AS
SELECT 
    e.id AS employee_id,
    e.emp_id,
    e.name AS employee_name,
    d.name AS department_name,
    COUNT(ar.id) AS total_days,
    COUNT(CASE WHEN ar.status = 'on_time' THEN 1 END) AS on_time_count,
    COUNT(CASE WHEN ar.status = 'late' THEN 1 END) AS late_count,
    COUNT(CASE WHEN ar.status = 'early_departure' THEN 1 END) AS early_departure_count,
    COUNT(CASE WHEN ar.status = 'half_day' THEN 1 END) AS half_day_count,
    ROUND(AVG(ar.total_hours), 2) AS avg_hours_per_day,
    ROUND(SUM(ar.total_hours), 2) AS total_hours_worked,
    MAX(ar.date) AS last_attendance_date
FROM employees e
LEFT JOIN attendance_records ar ON e.id = ar.employee_id
LEFT JOIN departments d ON e.department_id = d.id
WHERE e.is_active = true
GROUP BY e.id, e.emp_id, e.name, d.name;

COMMENT ON VIEW v_employee_attendance_stats IS 'Aggregated attendance statistics per employee';

-- =====================================================================================
-- GRANT PERMISSIONS (These will be refined in RLS migration)
-- =====================================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- Grant select on lookup tables to all authenticated users
GRANT SELECT ON departments, agencies TO authenticated, anon;

-- Grant appropriate permissions on main tables (will be restricted by RLS)
GRANT ALL ON employees TO authenticated;
GRANT ALL ON biometric_credentials TO authenticated;
GRANT ALL ON attendance_records TO authenticated;
GRANT SELECT ON audit_logs TO authenticated;

-- Grant access to views
GRANT SELECT ON v_employees_full TO authenticated;
GRANT SELECT ON v_attendance_daily_summary TO authenticated;
GRANT SELECT ON v_employee_attendance_stats TO authenticated;
