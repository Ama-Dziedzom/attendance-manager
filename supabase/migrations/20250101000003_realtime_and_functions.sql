-- =====================================================================================
-- REALTIME SUBSCRIPTIONS & OPTIMIZATIONS
-- =====================================================================================
-- Description: Enable realtime features and performance optimizations
-- Enables live updates for attendance dashboard
-- =====================================================================================

-- =====================================================================================
-- ENABLE REALTIME FOR TABLES
-- =====================================================================================

-- Enable realtime on attendance records (for live dashboard updates)
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_records;

-- Enable realtime on employees (for employee status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE employees;

-- Enable realtime on biometric credentials (for registration updates)
ALTER PUBLICATION supabase_realtime ADD TABLE biometric_credentials;

-- =====================================================================================
-- MATERIALIZED VIEW FOR DASHBOARD PERFORMANCE
-- =====================================================================================

-- Materialized view for daily attendance summary (refresh periodically)
CREATE MATERIALIZED VIEW mv_daily_attendance_summary AS
SELECT 
    ar.date,
    d.name AS department_name,
    a.name AS agency_name,
    COUNT(DISTINCT ar.employee_id) AS total_employees_present,
    COUNT(CASE WHEN ar.status = 'on_time' THEN 1 END) AS on_time_count,
    COUNT(CASE WHEN ar.status = 'late' THEN 1 END) AS late_count,
    COUNT(CASE WHEN ar.status = 'early_departure' THEN 1 END) AS early_departure_count,
    COUNT(CASE WHEN ar.status = 'half_day' THEN 1 END) AS half_day_count,
    ROUND(AVG(ar.total_hours), 2) AS avg_hours_worked,
    ROUND(SUM(ar.total_hours), 2) AS total_hours_worked
FROM attendance_records ar
JOIN employees e ON ar.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN agencies a ON e.agency_id = a.id
GROUP BY ar.date, d.name, a.name
ORDER BY ar.date DESC;

-- Create index on materialized view
CREATE INDEX idx_mv_daily_summary_date ON mv_daily_attendance_summary(date DESC);

COMMENT ON MATERIALIZED VIEW mv_daily_attendance_summary IS 
    'Pre-aggregated daily attendance statistics for dashboard performance';

-- =====================================================================================
-- MONTHLY ATTENDANCE SUMMARY MATERIALIZED VIEW
-- =====================================================================================

CREATE MATERIALIZED VIEW mv_monthly_attendance_summary AS
SELECT 
    DATE_TRUNC('month', ar.date) AS month,
    e.id AS employee_id,
    e.emp_id,
    e.name AS employee_name,
    d.name AS department_name,
    a.name AS agency_name,
    COUNT(ar.id) AS total_days_present,
    COUNT(CASE WHEN ar.status = 'on_time' THEN 1 END) AS on_time_days,
    COUNT(CASE WHEN ar.status = 'late' THEN 1 END) AS late_days,
    COUNT(CASE WHEN ar.status = 'early_departure' THEN 1 END) AS early_departure_days,
    COUNT(CASE WHEN ar.status = 'half_day' THEN 1 END) AS half_days,
    ROUND(AVG(ar.total_hours), 2) AS avg_daily_hours,
    ROUND(SUM(ar.total_hours), 2) AS total_hours
FROM attendance_records ar
JOIN employees e ON ar.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN agencies a ON e.agency_id = a.id
GROUP BY DATE_TRUNC('month', ar.date), e.id, e.emp_id, e.name, d.name, a.name
ORDER BY month DESC, e.name;

-- Create indexes on monthly summary
CREATE INDEX idx_mv_monthly_summary_month ON mv_monthly_attendance_summary(month DESC);
CREATE INDEX idx_mv_monthly_summary_employee ON mv_monthly_attendance_summary(employee_id);

COMMENT ON MATERIALIZED VIEW mv_monthly_attendance_summary IS 
    'Pre-aggregated monthly attendance statistics per employee';

-- =====================================================================================
-- FUNCTION TO REFRESH MATERIALIZED VIEWS
-- =====================================================================================

CREATE OR REPLACE FUNCTION refresh_attendance_summaries()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_attendance_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_attendance_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION refresh_attendance_summaries IS 
    'Refreshes all attendance summary materialized views. Can be called via cron job.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION refresh_attendance_summaries() TO authenticated;

-- =====================================================================================
-- HELPFUL FUNCTIONS FOR ATTENDANCE OPERATIONS
-- =====================================================================================

-- Function: Clock in employee
CREATE OR REPLACE FUNCTION clock_in_employee(
    p_emp_id TEXT,
    p_verification_method TEXT DEFAULT 'fingerprint'
)
RETURNS JSONB AS $$
DECLARE
    v_employee_id UUID;
    v_employee_name TEXT;
    v_department_name TEXT;
    v_today DATE := CURRENT_DATE;
    v_existing_record attendance_records;
    v_new_record attendance_records;
BEGIN
    -- Get employee ID
    SELECT id, name INTO v_employee_id, v_employee_name
    FROM employees
    WHERE emp_id = p_emp_id AND is_active = true;
    
    IF v_employee_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Employee not found or inactive',
            'code', 'EMPLOYEE_NOT_FOUND'
        );
    END IF;
    
    -- Check if already clocked in today
    SELECT * INTO v_existing_record
    FROM attendance_records
    WHERE employee_id = v_employee_id 
    AND date = v_today;
    
    IF v_existing_record.id IS NOT NULL AND v_existing_record.clock_out_time IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Already clocked in today',
            'code', 'ALREADY_CLOCKED_IN',
            'record', row_to_json(v_existing_record)
        );
    END IF;
    
    -- Create new attendance record
    INSERT INTO attendance_records (
        employee_id,
        date,
        clock_in_time,
        verification_method
    ) VALUES (
        v_employee_id,
        v_today,
        NOW(),
        p_verification_method
    )
    RETURNING * INTO v_new_record;
    
    -- Log the action
    INSERT INTO audit_logs (employee_id, action, entity_type, entity_id, success)
    VALUES (v_employee_id, 'clock_in', 'attendance_record', v_new_record.id, true);
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Clocked in successfully',
        'record', row_to_json(v_new_record)
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Log error
    INSERT INTO audit_logs (employee_id, action, success, error_message)
    VALUES (v_employee_id, 'clock_in', false, SQLERRM);
    
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'code', 'DATABASE_ERROR'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION clock_in_employee IS 
    'Clock in an employee by emp_id. Returns success status and attendance record.';

-- Function: Clock out employee
CREATE OR REPLACE FUNCTION clock_out_employee(
    p_emp_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_employee_id UUID;
    v_today DATE := CURRENT_DATE;
    v_record attendance_records;
BEGIN
    -- Get employee ID
    SELECT id INTO v_employee_id
    FROM employees
    WHERE emp_id = p_emp_id AND is_active = true;
    
    IF v_employee_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Employee not found or inactive',
            'code', 'EMPLOYEE_NOT_FOUND'
        );
    END IF;
    
    -- Get today's record
    SELECT * INTO v_record
    FROM attendance_records
    WHERE employee_id = v_employee_id 
    AND date = v_today;
    
    IF v_record.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not clocked in today',
            'code', 'NOT_CLOCKED_IN'
        );
    END IF;
    
    IF v_record.clock_out_time IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Already clocked out today',
            'code', 'ALREADY_CLOCKED_OUT',
            'record', row_to_json(v_record)
        );
    END IF;
    
    -- Update record with clock out time
    UPDATE attendance_records
    SET clock_out_time = NOW()
    WHERE id = v_record.id
    RETURNING * INTO v_record;
    
    -- Log the action
    INSERT INTO audit_logs (employee_id, action, entity_type, entity_id, success)
    VALUES (v_employee_id, 'clock_out', 'attendance_record', v_record.id, true);
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Clocked out successfully',
        'record', row_to_json(v_record)
    );
    
EXCEPTION WHEN OTHERS THEN
    INSERT INTO audit_logs (employee_id, action, success, error_message)
    VALUES (v_employee_id, 'clock_out', false, SQLERRM);
    
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'code', 'DATABASE_ERROR'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION clock_out_employee IS 
    'Clock out an employee by emp_id. Returns success status and updated attendance record.';

-- Function: Get employee attendance status for today
CREATE OR REPLACE FUNCTION get_employee_status_today(p_emp_id TEXT)
RETURNS JSONB AS $$
DECLARE
    v_employee employees;
    v_record attendance_records;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Get employee
    SELECT * INTO v_employee
    FROM employees
    WHERE emp_id = p_emp_id AND is_active = true;
    
    IF v_employee.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Employee not found',
            'code', 'EMPLOYEE_NOT_FOUND'
        );
    END IF;
    
    -- Get today's record
    SELECT * INTO v_record
    FROM attendance_records
    WHERE employee_id = v_employee.id 
    AND date = v_today;
    
    RETURN jsonb_build_object(
        'success', true,
        'employee', row_to_json(v_employee),
        'attendance', row_to_json(v_record),
        'is_clocked_in', (v_record.id IS NOT NULL AND v_record.clock_out_time IS NULL),
        'is_clocked_out', (v_record.clock_out_time IS NOT NULL)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_employee_status_today IS 
    'Get employee information and their attendance status for today.';

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION clock_in_employee(TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION clock_out_employee(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_employee_status_today(TEXT) TO authenticated, anon;

-- =====================================================================================
-- ADDITIONAL INDEXES FOR PERFORMANCE
-- =====================================================================================

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_attendance_employee_status 
    ON attendance_records(employee_id, status) 
    WHERE clock_out_time IS NULL;

CREATE INDEX IF NOT EXISTS idx_biometric_employee_active 
    ON biometric_credentials(employee_id) 
    WHERE is_active = true;

-- Partial index for active employees
CREATE INDEX IF NOT EXISTS idx_employees_active 
    ON employees(emp_id) 
    WHERE is_active = true;

-- =====================================================================================
-- GRANT PERMISSIONS ON MATERIALIZED VIEWS
-- =====================================================================================

GRANT SELECT ON mv_daily_attendance_summary TO authenticated;
GRANT SELECT ON mv_monthly_attendance_summary TO authenticated;
