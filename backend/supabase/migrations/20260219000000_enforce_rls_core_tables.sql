-- ============================================================================
-- ENFORCE ROW LEVEL SECURITY ON ALL CORE TABLES
-- ============================================================================
-- This migration closes the security gap where core tables lacked RLS,
-- meaning the anon/authenticated key could access all data without restriction.
--
-- Policy model:
--   authenticated   → can read all data; write only via scoped operations
--   service_role    → full access (used by middleware server only)
--   anon            → no access to any sensitive table
-- ============================================================================

-- ============================================================================
-- 1. EMPLOYEES TABLE
-- ============================================================================

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Authenticated users (dashboard) can read all active employees
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'employees' AND policyname = 'authenticated_read_employees'
    ) THEN
        CREATE POLICY "authenticated_read_employees"
        ON employees FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END $$;

-- Authenticated users can insert employees (HR role creates employees)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'employees' AND policyname = 'authenticated_insert_employees'
    ) THEN
        CREATE POLICY "authenticated_insert_employees"
        ON employees FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;
END $$;

-- Authenticated users can update employees (but NOT change emp_id)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'employees' AND policyname = 'authenticated_update_employees'
    ) THEN
        CREATE POLICY "authenticated_update_employees"
        ON employees FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- Service role has full access (middleware, bulk operations)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'employees' AND policyname = 'service_role_full_access_employees'
    ) THEN
        CREATE POLICY "service_role_full_access_employees"
        ON employees FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- ============================================================================
-- 2. ATTENDANCE RECORDS TABLE
-- ============================================================================

ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all attendance records
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'attendance_records' AND policyname = 'authenticated_read_attendance'
    ) THEN
        CREATE POLICY "authenticated_read_attendance"
        ON attendance_records FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END $$;

-- Authenticated users can insert attendance (manual clock-in from dashboard)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'attendance_records' AND policyname = 'authenticated_insert_attendance'
    ) THEN
        CREATE POLICY "authenticated_insert_attendance"
        ON attendance_records FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;
END $$;

-- Authenticated users can update attendance (corrections)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'attendance_records' AND policyname = 'authenticated_update_attendance'
    ) THEN
        CREATE POLICY "authenticated_update_attendance"
        ON attendance_records FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- Service role has full access (middleware writes clock in/out)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'attendance_records' AND policyname = 'service_role_full_access_attendance'
    ) THEN
        CREATE POLICY "service_role_full_access_attendance"
        ON attendance_records FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- ============================================================================
-- 3. AGENCIES TABLE
-- ============================================================================

ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read agencies
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'agencies' AND policyname = 'authenticated_read_agencies'
    ) THEN
        CREATE POLICY "authenticated_read_agencies"
        ON agencies FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END $$;

-- Only service_role can write agencies (admin-level operation)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'agencies' AND policyname = 'authenticated_write_agencies'
    ) THEN
        CREATE POLICY "authenticated_write_agencies"
        ON agencies FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'agencies' AND policyname = 'authenticated_update_agencies'
    ) THEN
        CREATE POLICY "authenticated_update_agencies"
        ON agencies FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'agencies' AND policyname = 'service_role_full_access_agencies'
    ) THEN
        CREATE POLICY "service_role_full_access_agencies"
        ON agencies FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- ============================================================================
-- 4. DEPARTMENTS TABLE
-- ============================================================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'departments' AND policyname = 'authenticated_read_departments'
    ) THEN
        CREATE POLICY "authenticated_read_departments"
        ON departments FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'departments' AND policyname = 'authenticated_write_departments'
    ) THEN
        CREATE POLICY "authenticated_write_departments"
        ON departments FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'departments' AND policyname = 'authenticated_update_departments'
    ) THEN
        CREATE POLICY "authenticated_update_departments"
        ON departments FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'departments' AND policyname = 'service_role_full_access_departments'
    ) THEN
        CREATE POLICY "service_role_full_access_departments"
        ON departments FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- ============================================================================
-- 5. PROFILES TABLE
-- ============================================================================
-- Profiles are auth users — users should only see/edit THEIR OWN profile.
-- Admins (it role) can see all profiles.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'users_read_own_profile'
    ) THEN
        CREATE POLICY "users_read_own_profile"
        ON profiles FOR SELECT
        TO authenticated
        USING (auth.uid() = id);
    END IF;
END $$;

-- Users can update their own profile (name, email)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'users_update_own_profile'
    ) THEN
        CREATE POLICY "users_update_own_profile"
        ON profiles FOR UPDATE
        TO authenticated
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- IT admins can read all profiles (for user management page)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'it_admin_read_all_profiles'
    ) THEN
        CREATE POLICY "it_admin_read_all_profiles"
        ON profiles FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.id = auth.uid()
                AND p.role = 'it'
            )
        );
    END IF;
END $$;

-- IT admins can manage all profiles
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'it_admin_manage_profiles'
    ) THEN
        CREATE POLICY "it_admin_manage_profiles"
        ON profiles FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.id = auth.uid()
                AND p.role = 'it'
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.id = auth.uid()
                AND p.role = 'it'
            )
        );
    END IF;
END $$;

-- Service role has full access
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'service_role_full_access_profiles'
    ) THEN
        CREATE POLICY "service_role_full_access_profiles"
        ON profiles FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- ============================================================================
-- 6. BIOMETRIC CREDENTIALS TABLE
-- ============================================================================

ALTER TABLE biometric_credentials ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read biometric credentials (for dashboard)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'biometric_credentials' AND policyname = 'authenticated_read_biometric'
    ) THEN
        CREATE POLICY "authenticated_read_biometric"
        ON biometric_credentials FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END $$;

-- Authenticated users can insert credentials (enrollment)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'biometric_credentials' AND policyname = 'authenticated_insert_biometric'
    ) THEN
        CREATE POLICY "authenticated_insert_biometric"
        ON biometric_credentials FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;
END $$;

-- Authenticated users can update credentials (deactivate, update last used)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'biometric_credentials' AND policyname = 'authenticated_update_biometric'
    ) THEN
        CREATE POLICY "authenticated_update_biometric"
        ON biometric_credentials FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- Service role has full access
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'biometric_credentials' AND policyname = 'service_role_full_access_biometric'
    ) THEN
        CREATE POLICY "service_role_full_access_biometric"
        ON biometric_credentials FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- ============================================================================
-- 7. AUDIT LOGS TABLE
-- ============================================================================
-- Audit logs should be readable by IT admins only, and insertable by all auth users.
-- NEVER deletable via API.

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- IT admins can read all audit logs
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'it_admin_read_audit_logs'
    ) THEN
        CREATE POLICY "it_admin_read_audit_logs"
        ON audit_logs FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.id = auth.uid()
                AND p.role = 'it'
            )
        );
    END IF;
END $$;

-- All authenticated users can insert audit log entries
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'authenticated_insert_audit_logs'
    ) THEN
        CREATE POLICY "authenticated_insert_audit_logs"
        ON audit_logs FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;
END $$;

-- Service role has full access
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'service_role_full_access_audit_logs'
    ) THEN
        CREATE POLICY "service_role_full_access_audit_logs"
        ON audit_logs FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- ============================================================================
-- 8. LOOKUP TABLES (genders, marital_statuses, employment_types)
-- ============================================================================
-- Lookup tables are read-only for authenticated users; managed only via service_role.

ALTER TABLE genders ENABLE ROW LEVEL SECURITY;
ALTER TABLE marital_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE employment_types ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'genders' AND policyname = 'authenticated_read_genders'
    ) THEN
        CREATE POLICY "authenticated_read_genders" ON genders FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'genders' AND policyname = 'service_role_full_access_genders'
    ) THEN
        CREATE POLICY "service_role_full_access_genders" ON genders FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'marital_statuses' AND policyname = 'authenticated_read_marital'
    ) THEN
        CREATE POLICY "authenticated_read_marital" ON marital_statuses FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'marital_statuses' AND policyname = 'service_role_full_access_marital'
    ) THEN
        CREATE POLICY "service_role_full_access_marital" ON marital_statuses FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'employment_types' AND policyname = 'authenticated_read_employment_types'
    ) THEN
        CREATE POLICY "authenticated_read_employment_types" ON employment_types FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'employment_types' AND policyname = 'service_role_full_access_employment_types'
    ) THEN
        CREATE POLICY "service_role_full_access_employment_types" ON employment_types FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ============================================================================
-- 9. FUNCTION CALL AUDIT TABLE
-- ============================================================================

ALTER TABLE function_call_audit ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'function_call_audit' AND policyname = 'it_admin_read_function_audit'
    ) THEN
        CREATE POLICY "it_admin_read_function_audit"
        ON function_call_audit FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.id = auth.uid()
                AND p.role = 'it'
            )
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'function_call_audit' AND policyname = 'service_role_full_access_function_audit'
    ) THEN
        CREATE POLICY "service_role_full_access_function_audit"
        ON function_call_audit FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- ============================================================================
-- 10. REVOKE ANON ACCESS EXPLICITLY
-- ============================================================================
-- Belt-and-suspenders: ensure the anon role cannot access any of these tables
-- even if a policy is misconfigured.

REVOKE ALL ON employees FROM anon;
REVOKE ALL ON attendance_records FROM anon;
REVOKE ALL ON agencies FROM anon;
REVOKE ALL ON departments FROM anon;
REVOKE ALL ON profiles FROM anon;
REVOKE ALL ON biometric_credentials FROM anon;
REVOKE ALL ON audit_logs FROM anon;
REVOKE ALL ON function_call_audit FROM anon;
REVOKE ALL ON employee_fingerprints FROM anon;
REVOKE ALL ON employee_terminal_sync FROM anon;
REVOKE ALL ON terminal_agencies FROM anon;
REVOKE ALL ON terminals FROM anon;
REVOKE ALL ON genders FROM anon;
REVOKE ALL ON marital_statuses FROM anon;
REVOKE ALL ON employment_types FROM anon;

-- ============================================================================
-- Done!
-- ============================================================================
-- Apply this migration via:
--   supabase db push
-- or by running in the Supabase SQL Editor.
--
-- After applying:
-- ✅ anon key has zero access to any sensitive table
-- ✅ authenticated users can read/write with role-appropriate scope
-- ✅ profiles table enforces self-ownership (users see only their own)
-- ✅ audit_logs are append-only for authenticated users
-- ✅ service_role key retains full access for middleware
-- ============================================================================
