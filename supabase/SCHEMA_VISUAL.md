# 📊 Database Schema Visual Overview

## Entity Relationship Diagram

```
┌─────────────────────┐
│    departments      │
│─────────────────────│
│ id (PK)            │
│ name (UNIQUE)      │
│ description        │
│ is_active          │
└─────────┬───────────┘
          │ 1
          │
          │ N
          │
┌─────────▼──────────────────────┐         ┌────────────────────────┐
│        employees               │         │      agencies          │
│────────────────────────────────│         │────────────────────────│
│ id (PK)                       │ N     1 │ id (PK)               │
│ emp_id (UNIQUE)               ├─────────┤ name (UNIQUE)         │
│ name                          │         │ address               │
│ email (UNIQUE)                │         │ contact_info (JSONB)  │
│ department_id (FK) ───────────┘         │ is_active             │
│ agency_id (FK) ─────────────────────────┘ created_at            │
│ is_active                     │         └────────────────────────┘
│ created_at                    │
│ updated_at                    │
└─────┬──────────────────────┬──┘
      │ 1                    │ 1
      │                      │
      │ 1                    │ N
      │                      │
┌─────▼──────────────────────────────┐  ┌──▼─────────────────────────────┐
│   biometric_credentials            │  │    attendance_records          │
│────────────────────────────────────│  │────────────────────────────────│
│ id (PK)                           │  │ id (PK)                       │
│ employee_id (FK, UNIQUE)          │  │ employee_id (FK)              │
│ credential_id (UNIQUE)            │  │ date                          │
│ fingerprint_id (UNIQUE)           │  │ clock_in_time                 │
│ public_key                        │  │ clock_out_time                │
│ counter                           │  │ total_hours                   │
│ device_type                       │  │ status                        │
│ is_active                         │  │ verification_method           │
│ registered_at                     │  │ created_at                    │
│ last_used_at                      │  │ updated_at                    │
└────────────────────────────────────┘  └────────────────────────────────┘
      │ 1                                         │ N
      │                                           │
      │                                           │
      │                                           │
      └───────────────┬───────────────────────────┘
                      │
                      │ N
                      │
            ┌─────────▼──────────────────┐
            │     audit_logs             │
            │────────────────────────────│
            │ id (PK)                   │
            │ employee_id (FK)          │
            │ action                    │
            │ entity_type               │
            │ entity_id                 │
            │ credential_id             │
            │ ip_address (INET)         │
            │ user_agent                │
            │ success                   │
            │ error_message             │
            │ metadata (JSONB)          │
            │ timestamp                 │
            └────────────────────────────┘
```

---

## Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                        EMPLOYEE LIFECYCLE                           │
└────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │  STEP 1:     │
    │  Employee    │
    │  Setup       │
    └──────┬───────┘
           │
           ▼
    ┌──────────────────────────────────────────┐
    │  INSERT INTO employees                   │
    │  - emp_id, name, email                  │
    │  - department_id, agency_id             │
    └──────┬───────────────────────────────────┘
           │
           ▼
    ┌──────────────┐
    │  STEP 2:     │
    │  Biometric   │
    │  Registration│
    └──────┬───────┘
           │
           ▼
    ┌──────────────────────────────────────────┐
    │  WebAuthn Authentication                 │
    │  - Browser requests fingerprint          │
    │  - Device (Windows Hello) captures bio  │
    │  - Returns credential_id + public_key   │
    └──────┬───────────────────────────────────┘
           │
           ▼
    ┌──────────────────────────────────────────┐
    │  INSERT INTO biometric_credentials       │
    │  - credential_id (unique)               │
    │  - fingerprint_id (human-readable)      │
    │  - public_key, device_type              │
    └──────┬───────────────────────────────────┘
           │
           ▼
    ┌──────────────┐
    │  STEP 3:     │
    │  Daily       │
    │  Attendance  │
    └──────┬───────┘
           │
           ▼
    ┌──────────────────────────────────────────┐
    │  CLOCK IN (Attendance Terminal)          │
    │  - Scan fingerprint                      │
    │  - Verify credential                     │
    │  - Call: clock_in_employee('EMP-001')   │
    └──────┬───────────────────────────────────┘
           │
           ▼
    ┌──────────────────────────────────────────┐
    │  INSERT INTO attendance_records          │
    │  - employee_id, date                    │
    │  - clock_in_time = NOW()                │
    │  - status (auto: on_time/late)          │
    │  - verification_method = 'fingerprint'  │
    └──────┬───────────────────────────────────┘
           │
           │ (8+ hours later)
           │
           ▼
    ┌──────────────────────────────────────────┐
    │  CLOCK OUT (Attendance Terminal)         │
    │  - Scan fingerprint again                │
    │  - Call: clock_out_employee('EMP-001')  │
    └──────┬───────────────────────────────────┘
           │
           ▼
    ┌──────────────────────────────────────────┐
    │  UPDATE attendance_records               │
    │  - clock_out_time = NOW()               │
    │  - total_hours (auto-calculated)        │
    │  - status (update if early_departure)   │
    └──────┬───────────────────────────────────┘
           │
           ▼
    ┌──────────────┐
    │  STEP 4:     │
    │  Reporting   │
    │  Dashboard   │
    └──────┬───────┘
           │
           ▼
    ┌──────────────────────────────────────────┐
    │  Query Views & Materialized Views        │
    │  - v_attendance_daily_summary            │
    │  - mv_monthly_attendance_summary         │
    │  - v_employee_attendance_stats           │
    └──────────────────────────────────────────┘
```

---

## Table Relationships Summary

### Primary Relationships

| Parent Table | Child Table | Relationship | Constraint |
|-------------|-------------|--------------|------------|
| **departments** | employees | 1:N | ON DELETE SET NULL |
| **agencies** | employees | 1:N | ON DELETE SET NULL |
| **employees** | biometric_credentials | 1:1 | ON DELETE CASCADE |
| **employees** | attendance_records | 1:N | ON DELETE CASCADE |
| **employees** | audit_logs | 1:N | ON DELETE SET NULL |

### Key Constraints

1. **employees**
   - One employee → One biometric credential (UNIQUE on employee_id)
   - One employee → Many attendance records
   - Employee can belong to one department
   - Employee can belong to one agency

2. **attendance_records**
   - One record per employee per day (UNIQUE on employee_id + date)
   - Clock out time must be after clock in time
   - Total hours auto-calculated on clock out

3. **biometric_credentials**
   - credential_id must be globally unique
   - fingerprint_id must be globally unique
   - One credential per employee

---

## Status Values Reference

### Attendance Status (`attendance_records.status`)

| Status | Trigger Condition | Description |
|--------|------------------|-------------|
| `on_time` | Clock in ≤ 9:00 AM | Employee arrived on time |
| `late` | Clock in > 9:00 AM | Employee arrived late |
| `early_departure` | Clock out < 5:00 PM | Employee left early |
| `half_day` | Total hours < 4 | Worked less than half day |
| `absent` | No record for date | Employee did not attend |

### Verification Methods

| Method | Use Case |
|--------|----------|
| `fingerprint` | Biometric authentication (primary) |
| `manual` | Admin manual entry |
| `card` | RFID card scan |
| `qr_code` | QR code scan |

---

## Index Coverage Map

### High-Performance Indexes

```
employees
├─ idx_employees_emp_id (emp_id)           → Lookup by employee ID
├─ idx_employees_email (email)             → Lookup by email
├─ idx_employees_department (department_id) → Filter by department
├─ idx_employees_agency (agency_id)        → Filter by agency
└─ idx_employees_active (is_active)        → Active employee queries

biometric_credentials
├─ idx_biometric_employee (employee_id)     → Find employee's credential
├─ idx_biometric_credential_id (credential_id) → Verify fingerprint
├─ idx_biometric_fingerprint_id (fingerprint_id) → Lookup by FP ID
└─ idx_biometric_active (is_active)        → Active credentials only

attendance_records
├─ idx_attendance_employee (employee_id)    → Employee's attendance history
├─ idx_attendance_date (date DESC)          → Daily reports
├─ idx_attendance_employee_date (employee_id, date DESC) → Personal history
├─ idx_attendance_status (status)           → Filter by status
└─ idx_attendance_clock_in (clock_in_time DESC) → Recent clock-ins

audit_logs
├─ idx_audit_employee (employee_id)         → Employee's actions
├─ idx_audit_action (action)                → Filter by action type
├─ idx_audit_timestamp (timestamp DESC)     → Recent events
└─ idx_audit_success (success)              → Failed attempts
```

---

## Storage Bucket Structure

```
📦 Supabase Storage
│
├── 📂 employee-photos (PUBLIC)
│   ├── {employee_id}/
│   │   ├── profile.jpg
│   │   └── photo_2024.png
│   └── ...
│
├── 📂 attendance-reports (PRIVATE - Admin Only)
│   ├── 2025/
│   │   ├── 01/
│   │   │   ├── daily_report_2025-01-15.pdf
│   │   │   └── monthly_summary_2025-01.xlsx
│   │   └── 02/
│   └── ...
│
└── 📂 employee-documents (PRIVATE - Owner + Admin)
    ├── {employee_id}/
    │   ├── contracts/
    │   │   └── employment_contract.pdf
    │   ├── certificates/
    │   │   └── training_cert.pdf
    │   └── ids/
    │       └── national_id.jpg
    └── ...
```

---

## Function Call Flow

### Clock In Process

```
User Input: EMP-001
     │
     ▼
┌─────────────────────────────────────────┐
│ SELECT clock_in_employee('EMP-001')     │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ VALIDATION                               │
│ 1. Employee exists? ✓                   │
│ 2. Employee active? ✓                   │
│ 3. Already clocked in today? ✗          │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ INSERT attendance_record                 │
│ - date: 2025-01-18                      │
│ - clock_in_time: 08:45:23               │
│ - verification_method: fingerprint      │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ TRIGGER: auto_determine_status          │
│ - 08:45 < 09:00 → status: 'on_time'    │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ TRIGGER: update_biometric_last_used     │
│ - UPDATE biometric_credentials          │
│ - SET last_used_at = NOW()              │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ INSERT audit_log                         │
│ - action: 'clock_in'                    │
│ - success: true                         │
└────────────┬────────────────────────────┘
             │
             ▼
     Return JSON Response
```

---

## Security Model (RLS)

### Access Matrix

|  | departments | agencies | employees | biometric_credentials | attendance_records | audit_logs |
|---|---|---|---|---|---|---|
| **Anon** (Terminals) | Read | Read | Read (Active) | Read (Active) | Read/Write | Insert |
| **Authenticated** (Employee) | Read | Read | Read Own | Read/Write Own | Read Own | Insert |
| **Admin** | Full | Full | Full | Full | Full | Read |

### RLS Helper Functions

```sql
is_admin()
└─> Checks if user has admin role in metadata

get_current_employee_id()
└─> Gets employee ID from auth.users.email

is_department_manager(dept_id)
└─> Checks if user is manager of department (placeholder)
```

---

## Performance Optimization Strategy

### 1. Use Views for Complex Joins
✅ **Good:** `SELECT * FROM v_employees_full`  
❌ **Avoid:** Manual joins on every query

### 2. Use Materialized Views for Dashboards
✅ **Good:** `SELECT * FROM mv_daily_attendance_summary`  
❌ **Avoid:** Aggregating raw data on every load

### 3. Leverage Indexes
- All foreign keys are indexed
- Date columns have DESC indexes for recent data
- Composite indexes for common query patterns

### 4. Regular Maintenance
```sql
-- Daily: Refresh materialized views
SELECT refresh_attendance_summaries();

-- Weekly: Analyze query performance
ANALYZE employees, attendance_records;

-- Monthly: Vacuum and cleanup
VACUUM ANALYZE;
```

---

## Migration Checklist

- [ ] Run `20250101000001_initial_schema.sql`
- [ ] Run `20250101000002_row_level_security.sql`
- [ ] Run `20250101000003_realtime_and_functions.sql`
- [ ] Run `20250101000004_storage_buckets.sql`
- [ ] Run `20250101000005_seed_data.sql` (Dev only)
- [ ] Set up admin user
- [ ] Verify RLS policies
- [ ] Test clock-in/out functions
- [ ] Configure cron jobs for materialized view refresh
- [ ] Set up backup schedule

---

**Version:** 1.0.0  
**Database:** PostgreSQL 15+ (Supabase)  
**Last Updated:** 2025-01-01
