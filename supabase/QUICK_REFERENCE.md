# Attendance Manager - Quick Reference Guide

## 🚀 Quick Start

### 1. Apply Migrations (Choose One Method)

#### Method A: Supabase CLI
```bash
supabase link --project-ref your-project-ref
supabase db push
```

#### Method B: Supabase Dashboard
1. Go to SQL Editor
2. Past each migration file in order (001 → 005)
3. Execute sequentially

#### Method C: Using MCP Tool
```typescript
// Apply each migration using the MCP Supabase server
await mcp_supabase_apply_migration({
  project_id: "your-project-id",
  name: "initial_schema",
  query: fs.readFileSync("supabase/migrations/20250101000001_initial_schema.sql", "utf8")
});
```

### 2. Set Up Admin User
```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'your-admin@email.com';
```

### 3. Test with Seed Data (Dev Only)
```bash
# Already included in migration 005
# Or run separately:
psql -f supabase/migrations/20250101000005_seed_data.sql
```

---

## 📊 Common Queries

### Employee Management

#### Get All Active Employees
```sql
SELECT * FROM v_employees_full 
WHERE is_active = true
ORDER BY name;
```

#### Register New Employee
```sql
INSERT INTO employees (emp_id, name, email, department_id, agency_id)
VALUES (
  'EMP-009',
  'Jane Doe',
  'jane.doe@company.com',
  (SELECT id FROM departments WHERE name = 'IT' LIMIT 1),
  (SELECT id FROM agencies WHERE name = 'Tech Solutions Inc' LIMIT 1)
);
```

#### Find Employee by Emp ID
```sql
SELECT * FROM v_employees_full 
WHERE emp_id = 'EMP-001';
```

---

### Biometric Operations

#### Check if Employee Has Biometric
```sql
SELECT 
  e.emp_id,
  e.name,
  CASE WHEN bc.id IS NOT NULL THEN 'Registered' ELSE 'Not Registered' END as status
FROM employees e
LEFT JOIN biometric_credentials bc ON e.id = bc.employee_id AND bc.is_active = true
WHERE e.emp_id = 'EMP-001';
```

#### Register Biometric Credential
```sql
INSERT INTO biometric_credentials (
  employee_id,
  credential_id,
  fingerprint_id,
  public_key,
  device_type
VALUES (
  (SELECT id FROM employees WHERE emp_id = 'EMP-001'),
  'cred_abc123...',
  'FP-001-XYZ',
  'MIIBIjAN...',
  'windows_hello'
);
```

---

### Attendance Operations

#### Clock In Employee
```sql
-- Using helper function (RECOMMENDED)
SELECT clock_in_employee('EMP-001', 'fingerprint');

-- Manual method
INSERT INTO attendance_records (employee_id, date, clock_in_time, verification_method)
VALUES (
  (SELECT id FROM employees WHERE emp_id = 'EMP-001'),
  CURRENT_DATE,
  NOW(),
  'fingerprint'
);
```

#### Clock Out Employee
```sql
-- Using helper function (RECOMMENDED)
SELECT clock_out_employee('EMP-001');

-- Manual method
UPDATE attendance_records
SET clock_out_time = NOW()
WHERE employee_id = (SELECT id FROM employees WHERE emp_id = 'EMP-001')
  AND date = CURRENT_DATE
  AND clock_out_time IS NULL;
```

#### Check Today's Status
```sql
SELECT get_employee_status_today('EMP-001');
```

#### Get Today's Attendance
```sql
SELECT * FROM v_attendance_daily_summary
WHERE date = CURRENT_DATE
ORDER BY clock_in_time;
```

---

### Reporting Queries

#### Daily Summary - All Employees
```sql
SELECT 
  department_name,
  COUNT(DISTINCT emp_id) as present_count,
  AVG(total_hours) as avg_hours,
  COUNT(CASE WHEN status = 'late' THEN 1 END) as late_count
FROM v_attendance_daily_summary
WHERE date = CURRENT_DATE
GROUP BY department_name;
```

#### Weekly Summary - Individual Employee
```sql
SELECT 
  date,
  clock_in_time,
  clock_out_time,
  total_hours,
  status
FROM v_attendance_daily_summary
WHERE emp_id = 'EMP-001'
  AND date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;
```

#### Monthly Summary - All Employees
```sql
SELECT * FROM mv_monthly_attendance_summary
WHERE month = DATE_TRUNC('month', CURRENT_DATE)
ORDER BY total_hours DESC;
```

#### Late Arrivals This Week
```sql
SELECT 
  emp_id,
  employee_name,
  department_name,
  date,
  clock_in_time
FROM v_attendance_daily_summary
WHERE status = 'late'
  AND date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC, clock_in_time;
```

#### Employee Attendance Statistics
```sql
SELECT * FROM v_employee_attendance_stats
WHERE emp_id = 'EMP-001';
```

#### Department Performance
```sql
SELECT 
  department_name,
  COUNT(DISTINCT employee_id) as employee_count,
  AVG(on_time_count::DECIMAL / NULLIF(total_days, 0) * 100) as on_time_percentage,
  AVG(avg_hours_per_day) as avg_daily_hours
FROM v_employee_attendance_stats
GROUP BY department_name
ORDER BY on_time_percentage DESC;
```

---

## 🔧 Maintenance Commands

### Refresh Materialized Views
```sql
SELECT refresh_attendance_summaries();
```

### Analyze Tables (Weekly)
```sql
ANALYZE employees;
ANALYZE attendance_records;
ANALYZE biometric_credentials;
```

### Vacuum Database (Monthly)
```sql
VACUUM ANALYZE;
```

### Check Database Size
```sql
SELECT 
  pg_size_pretty(pg_database_size(current_database())) as db_size;
```

### Check Table Sizes
```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 🔐 Security Commands

### Check RLS Status
```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### List All Policies
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Check User Roles
```sql
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role
FROM auth.users
ORDER BY email;
```

### Make User Admin
```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'user@email.com';
```

### Remove Admin Role
```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'role'
WHERE email = 'user@email.com';
```

---

## 📈 Monitoring Queries

### Today's Attendance Count
```sql
SELECT COUNT(*) as total_present
FROM attendance_records
WHERE date = CURRENT_DATE;
```

### Attendance Rate This Month
```sql
SELECT 
  COUNT(DISTINCT date) as working_days,
  COUNT(*) as total_attendance_records,
  COUNT(*) / NULLIF(COUNT(DISTINCT date), 0) as avg_daily_attendance
FROM attendance_records
WHERE date >= DATE_TRUNC('month', CURRENT_DATE);
```

### Missing Clock-Outs Today
```sql
SELECT 
  e.emp_id,
  e.name,
  ar.clock_in_time
FROM attendance_records ar
JOIN employees e ON ar.employee_id = e.id
WHERE ar.date = CURRENT_DATE
  AND ar.clock_out_time IS NULL
ORDER BY ar.clock_in_time;
```

### Biometric Registration Status
```sql
SELECT 
  COUNT(*) as total_employees,
  COUNT(bc.id) as registered_count,
  COUNT(*) - COUNT(bc.id) as pending_count,
  ROUND(COUNT(bc.id)::DECIMAL / COUNT(*) * 100, 2) as registration_percentage
FROM employees e
LEFT JOIN biometric_credentials bc ON e.id = bc.employee_id AND bc.is_active = true
WHERE e.is_active = true;
```

### Recent Audit Events
```sql
SELECT 
  timestamp,
  action,
  success,
  COALESCE(e.name, 'Unknown') as employee_name
FROM audit_logs al
LEFT JOIN employees e ON al.employee_id = e.id
ORDER BY timestamp DESC
LIMIT 50;
```

---

## 🎨 Frontend Integration Examples

### TypeScript Types (Auto-Generated)

```bash
# Generate TypeScript types from database
supabase gen types typescript --local > lib/database.types.ts
```

### Using Supabase Client

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Get all active employees
const { data: employees } = await supabase
  .from('v_employees_full')
  .select('*')
  .eq('is_active', true)

// Clock in employee using function
const { data } = await supabase.rpc('clock_in_employee', {
  p_emp_id: 'EMP-001',
  p_verification_method: 'fingerprint'
})

// Subscribe to attendance updates (realtime)
const channel = supabase
  .channel('attendance_changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'attendance_records'
    },
    (payload) => {
      console.log('Attendance updated:', payload)
    }
  )
  .subscribe()
```

---

## 🐛 Troubleshooting

### Employee Can't Clock In

**Check 1: Employee exists and is active**
```sql
SELECT emp_id, name, is_active 
FROM employees 
WHERE emp_id = 'EMP-001';
```

**Check 2: Already clocked in today**
```sql
SELECT * FROM attendance_records
WHERE employee_id = (SELECT id FROM employees WHERE emp_id = 'EMP-001')
  AND date = CURRENT_DATE;
```

**Check 3: Biometric credential is active**
```sql
SELECT * FROM biometric_credentials
WHERE employee_id = (SELECT id FROM employees WHERE emp_id = 'EMP-001')
  AND is_active = true;
```

### RLS Policy Blocking Access

**Test as specific user:**
```sql
SET ROLE authenticated;
SET request.jwt.claims.sub TO 'user-uuid-here';

-- Run your query
SELECT * FROM employees;

-- Reset
RESET ROLE;
```

**Disable RLS temporarily (DEV ONLY):**
```sql
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
-- Test
-- Re-enable
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### Materialized Views Not Updating

```sql
-- Check last refresh time
SELECT 
  schemaname,
  matviewname,
  definition
FROM pg_matviews
WHERE schemaname = 'public';

-- Force refresh
SELECT refresh_attendance_summaries();
```

---

## 📚 Additional Resources

- **Full Schema Documentation:** `supabase/DATABASE_SCHEMA.md`
- **Migration Guide:** `supabase/migrations/README.md`
- **Supabase Docs:** https://supabase.com/docs
- **PostgreSQL Docs:** https://www.postgresql.org/docs/

---

**Version:** 1.0.0  
**Last Updated:** 2025-01-01
