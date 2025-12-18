# Supabase Migrations - Attendance Manager

## 📋 Overview

This directory contains SQL migration scripts for the **Attendance Manager** biometric platform. The migrations establish the complete database schema including tables, views, functions, RLS policies, and storage buckets.

## 🎯 Platform Flow

```
Employee Setup → Biometric Registration → Clock In/Out → Attendance Reports
```

## 📚 Migration Files

### 1️⃣ `20250101000001_initial_schema.sql`
**Purpose:** Foundation schema setup

**Creates:**
- ✅ Extensions (uuid-ossp, pgcrypto)
- ✅ Lookup tables (departments, agencies)
- ✅ Core tables (employees, biometric_credentials, attendance_records)
- ✅ Audit logs table
- ✅ All indexes and constraints
- ✅ Auto-update triggers
- ✅ Reporting views (v_employees_full, v_attendance_daily_summary, etc.)
- ✅ Seed data for departments

**Key Features:**
- Auto-calculate total hours on clock out
- Auto-determine attendance status (on_time/late)
- Automatic timestamp updates
- Email and emp_id format validation

---

### 2️⃣ `20250101000002_row_level_security.sql`
**Purpose:** Security and access control

**Creates:**
- ✅ RLS policies for all tables
- ✅ Helper functions (is_admin, get_current_employee_id)
- ✅ Role-based access rules

** Access Levels:**
- **Admin:** Full access to everything
- **Employee:** View/edit own records only
- **Anonymous (Terminals):** Limited access for clock-in operations

**Security Design:**
- Employees can only see their own data
- Attendance terminals work without authentication
- Audit logs are immutable and admin-only
- Biometric data is protected per employee

---

### 3️⃣ `20250101000003_realtime_and_functions.sql`
**Purpose:** Performance optimization and realtime features

**Creates:**
- ✅ Realtime subscriptions (attendance_records, employees, biometric_credentials)
- ✅ Materialized views for dashboard performance
- ✅ Helper functions (clock_in_employee, clock_out_employee, get_employee_status_today)
- ✅ Performance indexes

**Key Functions:**

#### `clock_in_employee(emp_id, verification_method)`
Handles employee clock-in with validation.

**Usage:**
```sql
SELECT clock_in_employee('EMP-001', 'fingerprint');
```

**Returns:**
```json
{
  "success": true,
  "message": "Clocked in successfully",
  "record": { ... }
}
```

#### `clock_out_employee(emp_id)`
Handles employee clock-out and calculates hours.

**Usage:**
```sql
SELECT clock_out_employee('EMP-001');
```

#### `get_employee_status_today(emp_id)`
Check if employee is clocked in/out today.

**Usage:**
```sql
SELECT get_employee_status_today('EMP-001');
```

#### `refresh_attendance_summaries()`
Refreshes materialized views for reports.

**Usage:**
```sql
SELECT refresh_attendance_summaries();
```

---

### 4️⃣ `20250101000004_storage_buckets.sql`
**Purpose:** File storage configuration

**Creates:**
- ✅ employee-photos bucket (public, 5MB, images only)
- ✅ attendance-reports bucket (private, 50MB, PDF/Excel/CSV)
- ✅ employee-documents bucket (private, 10MB, documents)
- ✅ Storage RLS policies

**Bucket Structure:**
```
employee-photos/{employee_id}/{filename}
attendance-reports/{year}/{month}/{filename}
employee-documents/{employee_id}/{category}/{filename}
```

---

### 5️⃣ `20250101000005_seed_data.sql`
**Purpose:** Development and testing data

⚠️ **WARNING:** Only run in development/staging environments!

**Creates:**
- ✅ 3 sample agencies
- ✅ 8 sample employees across all departments
- ✅ 3 sample biometric credentials
- ✅ 7 days of attendance records
- ✅ Sample audit logs

**Verification queries included** to check data insertion.

---

## 🚀 Running Migrations

### Option 1: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

### Option 2: Using Supabase Dashboard

1. Go to **SQL Editor** in Supabase Dashboard
2. Copy and paste each migration file in order
3. Execute each migration sequentially

### Option 3: Using MCP Supabase Server

```javascript
// Apply migration via MCP tool
await mcp_supabase_apply_migration({
  project_id: "your-project-id",
  name: "initial_schema",
  query: "... sql content ..."
});
```

---

## ⚙️ Configuration

### Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Server-only!
```

### Admin User Setup

After migrations, set a user as admin:

```sql
-- Update user metadata to include admin role
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'admin@example.com';
```

---

## 📊 Post-Migration Verification

Run these queries to verify successful migration:

```sql
-- Check table counts
SELECT 
  (SELECT COUNT(*) FROM departments) as departments,
  (SELECT COUNT(*) FROM agencies) as agencies,
  (SELECT COUNT(*) FROM employees) as employees,
  (SELECT COUNT(*) FROM biometric_credentials) as biometric_creds,
  (SELECT COUNT(*) FROM attendance_records) as attendance_records;

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true;

-- Check functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%employee%';

-- Check storage buckets
SELECT id, name, public
FROM storage.buckets;
```

---

## 🔄 Rollback Strategy

### To rollback migrations:

```sql
-- Drop schema (WARNING: Destructive!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

### Better approach - Create down migrations:

Create reverse migrations for each file:
```sql
-- 20250101000001_initial_schema_down.sql
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS biometric_credentials CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS agencies CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
-- ... etc
```

---

## 📈 Performance Tips

### 1. Regular Maintenance

```sql
-- Daily (via cron)
SELECT refresh_attendance_summaries();

-- Weekly
ANALYZE employees, attendance_records, biometric_credentials;

-- Monthly
VACUUM ANALYZE;
```

### 2. Query Optimization

✅ **Use views** for complex queries:
```sql
-- Good: Uses pre-joined view
SELECT * FROM v_attendance_daily_summary WHERE date = CURRENT_DATE;

-- Avoid: Manual joins every time
SELECT e.name, d.name, ar.* 
FROM attendance_records ar
JOIN employees e ON ...
JOIN departments d ON ...
```

✅ **Use materialized views** for dashboards:
```sql
-- Fast: Pre-aggregated data
SELECT * FROM mv_daily_attendance_summary;

-- Slow: Aggregates on every query
SELECT date, COUNT(*), AVG(total_hours) FROM attendance_records GROUP BY date;
```

### 3. Indexing Strategy

All critical indexes are already created:
- Foreign keys
- Lookup fields (emp_id, email, credential_id)
- Date ranges
- Status fields

**Monitor slow queries:**
```sql
-- Enable pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slowest queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## 🔐 Security Checklist

- [x] RLS enabled on all tables
- [x] Admin role properly configured
- [x] Anonymous access limited to attendance operations
- [x] Audit logs are immutable (no UPDATE/DELETE)
- [x] Storage buckets have proper policies
- [x] Service role key never exposed to client
- [ ] Set up rate limiting on clock-in/out (application level)
- [ ] Configure CAPTCHA for attendance terminal (optional)
- [ ] Enable email verification for new employees
- [ ] Set up backup schedule

---

## 🗓️ Scheduled Jobs (Recommended)

Set up these cron jobs in Supabase:

### Daily - Refresh Materialized Views
```sql
-- Run at 12:01 AM daily
SELECT refresh_attendance_summaries();
```

### Daily - Cleanup Old Audit Logs
```sql
-- Run at 2:00 AM daily (keep 90 days)
DELETE FROM audit_logs 
WHERE timestamp < NOW() - INTERVAL '90 days';
```

### Weekly - Database Maintenance
```sql
-- Run Sunday at 3:00 AM
ANALYZE employees;
ANALYZE attendance_records;
ANALYZE biometric_credentials;
```

---

## 🐛 Troubleshooting

### Migration fails with "relation already exists"

**Solution:** Drop and recreate:
```sql
DROP TABLE IF EXISTS table_name CASCADE;
```

### RLS policies blocking legitimate access

**Solution:** Check user metadata:
```sql
SELECT id, email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'user@example.com';
```

### Functions not executing

**Solution:** Grant permissions:
```sql
GRANT EXECUTE ON FUNCTION function_name TO authenticated, anon;
```

### Materialized views out of date

**Solution:** Refresh them:
```sql
SELECT refresh_attendance_summaries();
```

---

## 📞 Support

For issues or questions:
1. Check `DATABASE_SCHEMA.md` for detailed documentation
2. Review SQL comments in migration files
3. Test with seed data (`20250101000005_seed_data.sql`)
4. Check Supabase logs in dashboard

---

## 📝 Changelog

### Version 1.0.0 (2025-01-01)
- Initial schema creation
- Employee management
- Biometric authentication
- Attendance tracking
- RLS policies
- Realtime subscriptions
- Helper functions
- Storage buckets
- Seed data

---

## 📜 License

This database schema is part of the Attendance Manager platform.

---

**Last Updated:** 2025-01-01  
**Schema Version:** 1.0.0  
**Target Database:** PostgreSQL 15+ (Supabase)
