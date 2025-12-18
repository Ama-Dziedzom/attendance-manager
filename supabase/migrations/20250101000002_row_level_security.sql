-- =====================================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================================
-- Description: Security policies for attendance manager platform
-- Implements role-based access control (RBAC)
-- =====================================================================================

-- =====================================================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================================================
-- HELPER FUNCTIONS FOR RLS
-- =====================================================================================

-- Function: Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM auth.users 
        WHERE id = auth.uid() 
        AND raw_user_meta_data->>'role' = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get current employee ID from auth user
CREATE OR REPLACE FUNCTION get_current_employee_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT id 
        FROM employees 
        WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user is manager of a department
CREATE OR REPLACE FUNCTION is_department_manager(dept_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- This is a placeholder - you can extend this with a managers table
    RETURN is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================================
-- DEPARTMENTS TABLE POLICIES
-- =====================================================================================

-- Everyone can read departments (lookup table)
CREATE POLICY "Anyone can view departments"
    ON departments
    FOR SELECT
    TO authenticated, anon
    USING (true);

-- Only admins can insert departments
CREATE POLICY "Admins can insert departments"
    ON departments
    FOR INSERT
    TO authenticated
    WITH CHECK (is_admin());

-- Only admins can update departments
CREATE POLICY "Admins can update departments"
    ON departments
    FOR UPDATE
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- Only admins can delete departments
CREATE POLICY "Admins can delete departments"
    ON departments
    FOR DELETE
    TO authenticated
    USING (is_admin());

-- =====================================================================================
-- AGENCIES TABLE POLICIES
-- =====================================================================================

-- Everyone can read agencies (lookup table)
CREATE POLICY "Anyone can view agencies"
    ON agencies
    FOR SELECT
    TO authenticated, anon
    USING (true);

-- Only admins can insert agencies
CREATE POLICY "Admins can insert agencies"
    ON agencies
    FOR INSERT
    TO authenticated
    WITH CHECK (is_admin());

-- Only admins can update agencies
CREATE POLICY "Admins can update agencies"
    ON agencies
    FOR UPDATE
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- Only admins can delete agencies
CREATE POLICY "Admins can delete agencies"
    ON agencies
    FOR DELETE
    TO authenticated
    USING (is_admin());

-- =====================================================================================
-- EMPLOYEES TABLE POLICIES
-- =====================================================================================

-- Employees can view their own record, admins can view all
CREATE POLICY "Users can view own employee record, admins can view all"
    ON employees
    FOR SELECT
    TO authenticated
    USING (
        is_admin() 
        OR id = get_current_employee_id()
    );

-- Anonymous users can view employees (for attendance terminal lookup)
CREATE POLICY "Anonymous can view active employees"
    ON employees
    FOR SELECT
    TO anon
    USING (is_active = true);

-- Only admins can insert employees
CREATE POLICY "Admins can insert employees"
    ON employees
    FOR INSERT
    TO authenticated
    WITH CHECK (is_admin());

-- Employees can update own basic info, admins can update all
CREATE POLICY "Users can update own record, admins can update all"
    ON employees
    FOR UPDATE
    TO authenticated
    USING (
        is_admin() 
        OR id = get_current_employee_id()
    )
    WITH CHECK (
        is_admin() 
        OR (
            id = get_current_employee_id()
            -- Restrict what employees can update (not emp_id or is_active)
            AND emp_id = (SELECT emp_id FROM employees WHERE id = get_current_employee_id())
            AND is_active = (SELECT is_active FROM employees WHERE id = get_current_employee_id())
        )
    );

-- Only admins can delete employees (soft delete via is_active preferred)
CREATE POLICY "Admins can delete employees"
    ON employees
    FOR DELETE
    TO authenticated
    USING (is_admin());

-- =====================================================================================
-- BIOMETRIC CREDENTIALS TABLE POLICIES
-- =====================================================================================

-- Employees can view their own credentials, admins can view all
CREATE POLICY "Users can view own biometric credentials"
    ON biometric_credentials
    FOR SELECT
    TO authenticated
    USING (
        is_admin() 
        OR employee_id = get_current_employee_id()
    );

-- Anonymous users need to read credentials for verification (attendance terminal)
CREATE POLICY "Anonymous can view active biometric credentials"
    ON biometric_credentials
    FOR SELECT
    TO anon
    USING (is_active = true);

-- Employees can insert their own biometric credentials
CREATE POLICY "Users can register own biometric credentials"
    ON biometric_credentials
    FOR INSERT
    TO authenticated
    WITH CHECK (
        employee_id = get_current_employee_id()
        OR is_admin()
    );

-- Employees can update their own credentials, admins can update all
CREATE POLICY "Users can update own biometric credentials"
    ON biometric_credentials
    FOR UPDATE
    TO authenticated
    USING (
        is_admin() 
        OR employee_id = get_current_employee_id()
    )
    WITH CHECK (
        is_admin() 
        OR employee_id = get_current_employee_id()
    );

-- Anonymous users need to update last_used_at for attendance terminal
CREATE POLICY "Anonymous can update last_used_at"
    ON biometric_credentials
    FOR UPDATE
    TO anon
    USING (is_active = true)
    WITH CHECK (is_active = true);

-- Only admins can delete biometric credentials
CREATE POLICY "Admins can delete biometric credentials"
    ON biometric_credentials
    FOR DELETE
    TO authenticated
    USING (is_admin());

-- =====================================================================================
-- ATTENDANCE RECORDS TABLE POLICIES
-- =====================================================================================

-- Employees can view their own attendance, admins and managers can view all
CREATE POLICY "Users can view own attendance, admins view all"
    ON attendance_records
    FOR SELECT
    TO authenticated
    USING (
        is_admin() 
        OR employee_id = get_current_employee_id()
    );

-- Admins can view all attendance records
CREATE POLICY "Admins can view all attendance"
    ON attendance_records
    FOR SELECT
    TO authenticated
    USING (is_admin());

-- Attendance terminals (anon) can insert attendance records
CREATE POLICY "Attendance terminals can insert records"
    ON attendance_records
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

-- Attendance terminals can update records (for clock out)
CREATE POLICY "Attendance terminals can update records"
    ON attendance_records
    FOR UPDATE
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Only admins can delete attendance records
CREATE POLICY "Admins can delete attendance records"
    ON attendance_records
    FOR DELETE
    TO authenticated
    USING (is_admin());

-- =====================================================================================
-- AUDIT LOGS TABLE POLICIES
-- =====================================================================================

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
    ON audit_logs
    FOR SELECT
    TO authenticated
    USING (is_admin());

-- All authenticated and anonymous users can insert audit logs
CREATE POLICY "Anyone can insert audit logs"
    ON audit_logs
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

-- No one can update audit logs (immutable)
-- No one can delete audit logs (permanent record)

-- =====================================================================================
-- FUNCTION PERMISSIONS
-- =====================================================================================

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_current_employee_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_department_manager(UUID) TO authenticated;

-- =====================================================================================
-- COMMENTS
-- =====================================================================================

COMMENT ON POLICY "Anyone can view departments" ON departments IS 
    'Departments are reference data accessible to all users';

 COMMENT ON POLICY "Users can view own employee record, admins can view all" ON employees IS 
    'Employees can only see their own record; admins can see all employees';

COMMENT ON POLICY "Anonymous can view active employees" ON employees IS 
    'Attendance terminals need to look up employees by emp_id or email';

COMMENT ON POLICY "Anonymous can view active biometric credentials" ON biometric_credentials IS 
    'Attendance terminals need to verify fingerprints during clock-in';

COMMENT ON POLICY "Attendance terminals can insert records" ON attendance_records IS 
    'Attendance terminals (potentially unauthenticated kiosks) can create clock-in records';
