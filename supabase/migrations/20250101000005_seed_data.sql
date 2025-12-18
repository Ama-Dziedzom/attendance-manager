-- =====================================================================================
-- SEED DATA FOR TESTING AND DEVELOPMENT
-- =====================================================================================
-- Description: Sample data for testing the attendance manager platform
-- WARNING: Only run this in development/staging environments
-- =====================================================================================

-- =====================================================================================
-- SEED AGENCIES
-- =====================================================================================

INSERT INTO agencies (id, name, address, contact_info) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Tech Solutions Inc', '123 Tech Street, Silicon Valley, CA', '{"phone": "+1-555-0101", "email": "info@techsolutions.com"}'::jsonb),
    ('22222222-2222-2222-2222-222222222222', 'Business Corp', '456 Business Ave, New York, NY', '{"phone": "+1-555-0202", "email": "contact@businesscorp.com"}'::jsonb),
    ('33333333-3333-3333-3333-333333333333', 'Creative Agency', '789 Design Blvd, Los Angeles, CA', '{"phone": "+1-555-0303", "email": "hello@creativeagency.com"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- =====================================================================================
-- SEED EMPLOYEES
-- =====================================================================================

INSERT INTO employees (id, emp_id, name, email, department_id, agency_id, is_active) VALUES
    -- IT Department
    (
        '10000000-0000-0000-0000-000000000001',
        'EMP-001',
        'John Smith',
        'john.smith@techsolutions.com',
        (SELECT id FROM departments WHERE name = 'Information Technology' LIMIT 1),
        '11111111-1111-1111-1111-111111111111',
        true
    ),
    (
        '10000000-0000-0000-0000-000000000002',
        'EMP-002',
        'Sarah Johnson',
        'sarah.johnson@techsolutions.com',
        (SELECT id FROM departments WHERE name = 'Information Technology' LIMIT 1),
        '11111111-1111-1111-1111-111111111111',
        true
    ),
    
    -- HR Department
    (
        '10000000-0000-0000-0000-000000000003',
        'EMP-003',
        'Michael Chen',
        'michael.chen@businesscorp.com',
        (SELECT id FROM departments WHERE name = 'Human Resources' LIMIT 1),
        '22222222-2222-2222-2222-222222222222',
        true
    ),
    (
        '10000000-0000-0000-0000-000000000004',
        'EMP-004',
        'Emily Davis',
        'emily.davis@businesscorp.com',
        (SELECT id FROM departments WHERE name = 'Human Resources' LIMIT 1),
        '22222222-2222-2222-2222-222222222222',
        true
    ),
    
    -- Marketing Department
    (
        '10000000-0000-0000-0000-000000000005',
        'EMP-005',
        'David Wilson',
        'david.wilson@creativeagency.com',
        (SELECT id FROM departments WHERE name = 'Marketing' LIMIT 1),
        '33333333-3333-3333-3333-333333333333',
        true
    ),
    
    -- Finance Department
    (
        '10000000-0000-0000-0000-000000000006',
        'EMP-006',
        'Lisa Anderson',
        'lisa.anderson@businesscorp.com',
        (SELECT id FROM departments WHERE name = 'Finance' LIMIT 1),
        '22222222-2222-2222-2222-222222222222',
        true
    ),
    
    -- Sales Department
    (
        '10000000-0000-0000-0000-000000000007',
        'EMP-007',
        'James Martinez',
        'james.martinez@techsolutions.com',
        (SELECT id FROM departments WHERE name = 'Sales' LIMIT 1),
        '11111111-1111-1111-1111-111111111111',
        true
    ),
    
    -- Operations Department
    (
        '10000000-0000-0000-0000-000000000008',
        'EMP-008',
        'Jennifer Taylor',
        'jennifer.taylor@creativeagency.com',
        (SELECT id FROM departments WHERE name = 'Operations' LIMIT 1),
        '33333333-3333-3333-3333-333333333333',
        true
    )
ON CONFLICT (id) DO NOTHING;

-- =====================================================================================
-- SEED BIOMETRIC CREDENTIALS (For Testing)
-- =====================================================================================
-- Note: These are dummy credentials for testing purposes only
-- In production, these would be generated during actual biometric registration

INSERT INTO biometric_credentials (id, employee_id, credential_id, fingerprint_id, public_key, device_type, is_active) VALUES
    (
        '20000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001',
        'cred_test_john_smith_123456789',
        'FP-001-JS',
        'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...(dummy_key)',
        'windows_hello',
        true
    ),
    (
        '20000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002',
        'cred_test_sarah_johnson_987654321',
        'FP-002-SJ',
        'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...(dummy_key)',
        'windows_hello',
        true
    ),
    (
        '20000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003',
        'cred_test_michael_chen_456789123',
        'FP-003-MC',
        'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...(dummy_key)',
        'touch_id',
        true
    )
ON CONFLICT (id) DO NOTHING;

-- =====================================================================================
-- SEED ATTENDANCE RECORDS (Last 7 days)
-- =====================================================================================

-- Helper function to generate attendance for the past week
DO $$
DECLARE
    v_date DATE;
    v_emp_record RECORD;
    v_clock_in_time TIMESTAMP WITH TIME ZONE;
    v_clock_out_time TIMESTAMP WITH TIME ZONE;
    v_random_late_minutes INTEGER;
BEGIN
    -- Loop through last 7 days
    FOR v_date IN 
        SELECT generate_series(
            CURRENT_DATE - INTERVAL '6 days',
            CURRENT_DATE - INTERVAL '1 day',
            '1 day'::INTERVAL
        )::DATE
    LOOP
        -- Loop through each employee
        FOR v_emp_record IN 
            SELECT id, emp_id, name 
            FROM employees 
            WHERE is_active = true
        LOOP
            -- Random chance of being late (30% probability)
            IF random() < 0.3 THEN
                v_random_late_minutes := floor(random() * 60 + 10)::INTEGER; -- 10-70 minutes late
                v_clock_in_time := v_date + TIME '09:00:00' + (v_random_late_minutes || ' minutes')::INTERVAL;
            ELSE
                -- On time: between 8:30 and 9:00
                v_random_late_minutes := floor(random() * -30)::INTEGER;
                v_clock_in_time := v_date + TIME '09:00:00' + (v_random_late_minutes || ' minutes')::INTERVAL;
            END IF;
            
            -- Clock out time: between 17:00 and 18:30 (90% probability of clocking out)
            IF random() < 0.9 THEN
                v_clock_out_time := v_date + TIME '17:00:00' + (floor(random() * 90)::INTEGER || ' minutes')::INTERVAL;
            ELSE
                v_clock_out_time := NULL; -- Didn't clock out
            END IF;
            
            -- Skip some days randomly (10% absence rate)
            IF random() > 0.1 THEN
                INSERT INTO attendance_records (
                    employee_id,
                    date,
                    clock_in_time,
                    clock_out_time,
                    verification_method
                ) VALUES (
                    v_emp_record.id,
                    v_date,
                    v_clock_in_time,
                    v_clock_out_time,
                    'fingerprint'
                )
                ON CONFLICT (employee_id, date) DO NOTHING;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- =====================================================================================
-- SEED AUDIT LOGS
-- =====================================================================================

INSERT INTO audit_logs (employee_id, action, entity_type, success, metadata) VALUES
    (
        '10000000-0000-0000-0000-000000000001',
        'fingerprint_registered',
        'biometric_credential',
        true,
        '{"device": "Windows Hello", "browser": "Chrome"}'::jsonb
    ),
    (
        '10000000-0000-0000-0000-000000000002',
        'fingerprint_registered',
        'biometric_credential',
        true,
        '{"device": "Windows Hello", "browser": "Edge"}'::jsonb
    ),
    (
        '10000000-0000-0000-0000-000000000003',
        'fingerprint_registered',
        'biometric_credential',
        true,
        '{"device": "Touch ID", "browser": "Safari"}'::jsonb
    )
ON CONFLICT DO NOTHING;

-- =====================================================================================
-- REFRESH MATERIALIZED VIEWS WITH SEED DATA
-- =====================================================================================

REFRESH MATERIALIZED VIEW mv_daily_attendance_summary;
REFRESH MATERIALIZED VIEW mv_monthly_attendance_summary;

-- =====================================================================================
-- VERIFICATION QUERIES
-- =====================================================================================

-- Verify departments
SELECT 'Departments Count:' as info, COUNT(*) as count FROM departments;

-- Verify agencies
SELECT 'Agencies Count:' as info, COUNT(*) as count FROM agencies;

-- Verify employees
SELECT 'Employees Count:' as info, COUNT(*) as count FROM employees;
SELECT 'Active Employees:' as info, COUNT(*) as count FROM employees WHERE is_active = true;

-- Verify biometric credentials
SELECT 'Biometric Credentials:' as info, COUNT(*) as count FROM biometric_credentials;

-- Verify attendance records
SELECT 'Attendance Records:' as info, COUNT(*) as count FROM attendance_records;
SELECT 'Attendance This Week:' as info, COUNT(*) as count FROM attendance_records 
WHERE date >= CURRENT_DATE - INTERVAL '7 days';

-- Show summary by department
SELECT 
    d.name as department,
    COUNT(DISTINCT e.id) as employee_count,
    COUNT(bc.id) as biometric_registered_count
FROM departments d
LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = true
LEFT JOIN biometric_credentials bc ON e.id = bc.employee_id AND bc.is_active = true
GROUP BY d.name
ORDER BY employee_count DESC;
