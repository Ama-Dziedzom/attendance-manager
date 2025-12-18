# Attendance Manager Database Schema Documentation

## Overview

This database schema is designed for a **biometric-based attendance management platform** using Supabase/PostgreSQL. The system tracks employee attendance through fingerprint authentication with Windows Hello/WebAuthn.

## 🔄 Application Flow

```
1. Employee Setup
   └─> Upload/register employees → Capture biometric data

2. Clock In/Out (Attendance Terminal)
   └─> Verify fingerprint → Record attendance → Update status

3. Dashboard & Reporting
   └─> View attendance reports → Export data → Monitor statistics
```

## 📊 Database Schema

### Core Tables

#### 1. **departments** (Lookup Table)
Stores department information.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Department name (unique) |
| `description` | TEXT | Optional description |
| `is_active` | BOOLEAN | Active status |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

**Sample Data:**
- Human Resources
- Information Technology  
- Finance
- Operations
- Marketing
- Sales

---

#### 2. **agencies** (Lookup Table)
Stores agency/company information.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Agency name (unique) |
| `address` | TEXT | Physical address |
| `contact_info` | JSONB | Contact details (phone, email, etc.) |
| `is_active` | BOOLEAN | Active status |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

---

#### 3. **employees** (Core Entity)
Central table storing employee information.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `emp_id` | TEXT | Employee ID (unique, format: A-Z0-9-) |
| `name` | TEXT | Full name |
| `email` | TEXT | Email address (unique) |
| `department_id` | UUID | FK → departments |
| `agency_id` | UUID | FK → agencies |
| `is_active` | BOOLEAN | Active status (soft delete) |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

**Constraints:**
- `emp_id_format`: Must match pattern `^[A-Z0-9-]+$`
- `email_format`: Valid email format or NULL

**Indexes:**
- `idx_employees_emp_id` on `emp_id`
- `idx_employees_email` on `email` (where not null)
- `idx_employees_department` on `department_id`
- `idx_employees_agency` on `agency_id`
- `idx_employees_active` on `is_active`

---

#### 4. **biometric_credentials** (Authentication)
Stores WebAuthn/Windows Hello biometric credentials.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `employee_id` | UUID | FK → employees (unique) |
| `credential_id` | TEXT | Base64 credential ID (unique) |
| `fingerprint_id` | TEXT | Human-readable ID (unique) |
| `public_key` | TEXT | Public key for verification |
| `counter` | BIGINT | Replay attack prevention counter |
| `device_type` | TEXT | Device type (windows_hello, touch_id, etc.) |
| `is_active` | BOOLEAN | Active status |
| `registered_at` | TIMESTAMP | Registration timestamp |
| `last_used_at` | TIMESTAMP | Last authentication timestamp |

**Constraints:**
- `one_credential_per_employee`: One credential per employee

**Indexes:**
- `idx_biometric_employee` on `employee_id`
- `idx_biometric_credential_id` on `credential_id`
- `idx_biometric_fingerprint_id` on `fingerprint_id`
- `idx_biometric_active` on `is_active`

---

#### 5. **attendance_records** (Main Functionality)
Daily attendance tracking with clock in/out times.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `employee_id` | UUID | FK → employees |
| `date` | DATE | Attendance date |
| `clock_in_time` | TIMESTAMP | Clock in time |
| `clock_out_time` | TIMESTAMP | Clock out time (nullable) |
| `total_hours` | DECIMAL(5,2) | Total hours worked |
| `status` | TEXT | Attendance status |
| `verification_method` | TEXT | How it was verified |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

**Status Values:**
- `on_time`: Clocked in before 9:00 AM
- `late`: Clocked in after 9:00 AM
- `early_departure`: Clocked out before 5:00 PM
- `absent`: No attendance record
- `half_day`: Partial day attendance

**Verification Methods:**
- `fingerprint`: Biometric verification
- `manual`: Manual entry by admin
- `card`: RFID/Card scan
- `qr_code`: QR code scan

**Constraints:**
- `clock_out_after_clock_in`: Clock out must be after clock in
- `one_attendance_per_day`: One record per employee per day

**Indexes:**
- `idx_attendance_employee` on `employee_id`
- `idx_attendance_date` on `date DESC`
- `idx_attendance_employee_date` on `(employee_id, date DESC)`
- `idx_attendance_status` on `status`
- `idx_attendance_clock_in` on `clock_in_time DESC`

---

#### 6. **audit_logs** (Security & Compliance)
Immutable audit trail for all system events.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `employee_id` | UUID | FK → employees (nullable) |
| `action` | TEXT | Action performed |
| `entity_type` | TEXT | Entity affected |
| `entity_id` | UUID | ID of affected entity |
| `credential_id` | TEXT | Credential used (if applicable) |
| `ip_address` | INET | IP address |
| `user_agent` | TEXT | Browser user agent |
| `success` | BOOLEAN | Success status |
| `error_message` | TEXT | Error message if failed |
| `metadata` | JSONB | Additional context |
| `timestamp` | TIMESTAMP | Event timestamp |

**Common Actions:**
- `fingerprint_registered`
- `auth_success` / `auth_failed`
- `clock_in` / `clock_out`
- `employee_created` / `employee_updated`

**Indexes:**
- `idx_audit_employee` on `employee_id`
- `idx_audit_action` on `action`
- `idx_audit_timestamp` on `timestamp DESC`
- `idx_audit_success` on `success`

---

## 📈 Views

### 1. **v_employees_full**
Employee details with denormalized department, agency, and biometric status.

**Columns:**
- All employee fields
- `department_name`
- `agency_name`
- `has_biometric` (boolean)
- `fingerprint_id`
- `biometric_device_type`
- `biometric_registered_at`

### 2. **v_attendance_daily_summary**
Daily attendance records with employee details.

**Columns:**
- `date`, `emp_id`, `employee_name`
- `department_name`, `agency_name`
- `clock_in_time`, `clock_out_time`
- `total_hours`, `status`, `verification_method`

### 3. **v_employee_attendance_stats**
Aggregated attendance statistics per employee.

**Columns:**
- `employee_id`, `emp_id`, `employee_name`, `department_name`
- `total_days`, `on_time_count`, `late_count`
- `early_departure_count`, `half_day_count`
- `avg_hours_per_day`, `total_hours_worked`
- `last_attendance_date`

---

## 🚀 Functions

### Clock-In/Out Functions

#### **clock_in_employee(p_emp_id TEXT, p_verification_method TEXT)**
Clocks in an employee by their `emp_id`.

**Parameters:**
- `p_emp_id`: Employee ID
- `p_verification_method`: Default 'fingerprint'

**Returns:** JSONB
```json
{
  "success": true,
  "message": "Clocked in successfully",
  "record": { ...attendance_record }
}
```

**Error Codes:**
- `EMPLOYEE_NOT_FOUND`: Employee doesn't exist or inactive
- `ALREADY_CLOCKED_IN`: Already clocked in today
- `DATABASE_ERROR`: Database error occurred

---

#### **clock_out_employee(p_emp_id TEXT)**
Clocks out an employee by their `emp_id`.

**Parameters:**
- `p_emp_id`: Employee ID

**Returns:** JSONB
```json
{
  "success": true,
  "message": "Clocked out successfully",
  "record": { ...attendance_record }
}
```

**Error Codes:**
- `EMPLOYEE_NOT_FOUND`: Employee doesn't exist or inactive
- `NOT_CLOCKED_IN`: No clock-in record for today
- `ALREADY_CLOCKED_OUT`: Already clocked out
- `DATABASE_ERROR`: Database error occurred

---

#### **get_employee_status_today(p_emp_id TEXT)**
Gets employee info and attendance status for today.

**Returns:** JSONB
```json
{
  "success": true,
  "employee": { ...employee_data },
  "attendance": { ...attendance_record },
  "is_clocked_in": true,
  "is_clocked_out": false
}
```

---

### Utility Functions

#### **refresh_attendance_summaries()**
Refreshes materialized views for dashboard performance.

Should be called:
- After bulk data imports
- Via scheduled cron job (daily)
- Before generating reports

---

## 🔒 Row Level Security (RLS)

### Access Roles

1. **Admin** (`is_admin()`)
   - Full access to all tables
   - Can manage employees, departments, agencies
   - Can view all attendance records and audit logs

2. **Authenticated Users** (Employees)
   - Can view own employee record
   - Can view own biometric credentials
   - Can view own attendance records
   - Can register own biometric credentials

3. **Anonymous** (Attendance Terminals)
   - Can view active employees (for lookup)
   - Can view active biometric credentials (for verification)
   - Can insert/update attendance records
   - Can insert audit logs

### Key Policies

| Table | Role | Select | Insert | Update | Delete |
|-------|------|--------|--------|--------|--------|
| **employees** | Admin | ✓ All | ✓ | ✓ | ✓ |
| | User | ✓ Own | ✗ | ✓ Own* | ✗ |
| | Anon | ✓ Active | ✗ | ✗ | ✗ |
| **biometric_credentials** | Admin | ✓ All | ✓ | ✓ | ✓ |
| | User | ✓ Own | ✓ Own | ✓ Own | ✗ |
| | Anon | ✓ Active | ✗ | ✓† | ✗ |
| **attendance_records** | Admin | ✓ All | ✓ | ✓ | ✓ |
| | User | ✓ Own | ✗ | ✗ | ✗ |
| | Anon | ✗ | ✓ | ✓ | ✗ |
| **audit_logs** | Admin | ✓ | ✗ | ✗ | ✗ |
| | All | ✗ | ✓ | ✗ | ✗ |

\* Users cannot update `emp_id` or `is_active`  
† Anonymous can only update `last_used_at`

---

## 📦 Storage Buckets

### 1. **employee-photos**
- **Access:** Public
- **Size Limit:** 5MB
- **Allowed Types:** image/jpeg, image/png, image/webp
- **Naming:** `{employee_id}/{filename}`

### 2. **attendance-reports**
- **Access:** Private (Admins only)
- **Size Limit:** 50MB
- **Allowed Types:** PDF, Excel, CSV
- **Naming:** `{year}/{month}/{filename}`

### 3. **employee-documents**
- **Access:** Private (Owner + Admins)
- **Size Limit:** 10MB
- **Allowed Types:** PDF, Images, Word docs
- **Naming:** `{employee_id}/{category}/{filename}`

---

## 🔄 Triggers

### Auto-Update Triggers

1. **update_updated_at_column**
   - Automatically updates `updated_at` on record modification
   - Applied to: departments, agencies, employees, attendance_records

2. **calculate_total_hours**
   - Auto-calculates hours worked on clock out
   - Applied to: attendance_records

3. **auto_determine_status**
   - Auto-sets status based on clock-in/out times
   - Rules:
     - Before 9:00 AM → `on_time`
     - After 9:00 AM → `late`
     - Clock out before 5:00 PM → `early_departure`
   - Applied to: attendance_records

4. **update_biometric_last_used**
   - Updates biometric credential `last_used_at` on clock-in
   - Applied to: attendance_records

---

## 📊 Materialized Views (Performance)

### **mv_daily_attendance_summary**
Pre-aggregated daily statistics by department and agency.

**Refresh Strategy:** 
- Daily via cron (recommended)
- After bulk imports

### **mv_monthly_attendance_summary**
Pre-aggregated monthly statistics per employee.

**Refresh Strategy:**
- Daily via cron
- End of month for reports

**To Refresh:**
```sql
SELECT refresh_attendance_summaries();
```

---

## 🗺️ Entity Relationship Diagram

```
agencies (1) ──< (N) employees (1) ──> (1) biometric_credentials
                        │
departments (1) ──< (N) ┘
                        │
                        └──> (N) attendance_records
                        │
                        └──> (N) audit_logs
```

---

## 🚀 Migration Order

1. **20250101000001_initial_schema.sql**
   - Core tables, indexes, triggers, views
   - Seed departments
   - **Runtime:** ~2-3 seconds

2. **20250101000002_row_level_security.sql**
   - RLS policies for all tables
   - Helper functions for access control
   - **Runtime:** ~1 second

3. **20250101000003_realtime_and_functions.sql**
   - Realtime subscriptions
   - Clock-in/out functions
   - Materialized views
   - **Runtime:** ~2 seconds

4. **20250101000004_storage_buckets.sql**
   - Storage buckets and policies
   - **Runtime:** <1 second

5. **20250101000005_seed_data.sql** (Optional - Dev/Staging only)
   - Sample data for testing
   - **Runtime:** ~3-5 seconds

---

## 📝 Usage Examples

### Example 1: Clock In Employee
```sql
SELECT clock_in_employee('EMP-001', 'fingerprint');
```

### Example 2: Check Employee Status
```sql
SELECT get_employee_status_today('EMP-001');
```

### Example 3: Get Department Attendance Summary
```sql
SELECT * FROM v_attendance_daily_summary
WHERE date = CURRENT_DATE
ORDER BY department_name, clock_in_time;
```

### Example 4: Get Employee Monthly Stats
```sql
SELECT * FROM v_employee_attendance_stats
WHERE employee_id = '...'
ORDER BY total_hours_worked DESC;
```

### Example 5: Get Late Arrivals This Week
```sql
SELECT 
    emp_id,
    name,
    date,
    clock_in_time,
    total_hours
FROM v_attendance_daily_summary
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
  AND status = 'late'
ORDER BY date DESC, clock_in_time;
```

---

## 🔧 Maintenance

### Daily Tasks
```sql
-- Refresh materialized views
SELECT refresh_attendance_summaries();
```

### Weekly Tasks
```sql
-- Analyze tables for query optimization
ANALYZE employees;
ANALYZE attendance_records;
ANALYZE biometric_credentials;
```

### Monthly Tasks
```sql
-- Archive old audit logs (>90 days)
-- This should be done via scheduled job
DELETE FROM audit_logs 
WHERE timestamp < NOW() - INTERVAL '90 days';

-- Vacuum tables
VACUUM ANALYZE;
```

---

## 🎯 Performance Considerations

1. **Indexes:** All foreign keys and common query fields are indexed
2. **Materialized Views:** Use for dashboard/reporting queries
3. **Partitioning:** Consider partitioning `attendance_records` by month if data grows large
4. **Audit Log Retention:** Archive logs older than 90 days
5. **Connection Pooling:** Use Supabase's connection pooling for high traffic

---

## 🔐 Security Best Practices

1. **Never expose service_role key** to client applications
2. **Use anon key** for attendance terminals
3. **Validate employee_id** format on client before API calls
4. **Implement rate limiting** on clock-in/out endpoints
5. **Monitor audit logs** for suspicious activity
6. **Rotate API keys** periodically
7. **Use HTTPS only** for all connections

---

## 📞 Support & Questions

For questions about this schema:
1. Review the function comments in SQL files
2. Check the example queries above
3. Test with seed data in development

---

**Version:** 1.0.0  
**Last Updated:** 2025-01-01  
**Database:** PostgreSQL 15+ (Supabase)
