-- ============================================================================
-- Performance Indexes for Core Tables
-- Migration: 20260219020000_add_performance_indexes.sql
--
-- Adds indexes on frequently queried columns that were missing them.
-- Identified by auditing Supabase query patterns in:
--   - lib/supabase/db.ts        (frontend data access layer)
--   - middleware/src/services/supabase.ts (middleware service)
--   - middleware/src/api/adms-routes.ts   (ADMS terminal routes)
-- ============================================================================

-- ============================================================================
-- EMPLOYEES TABLE
-- ============================================================================

-- emp_id: Used in nearly every employee lookup (getByEmpId, search, sync)
-- This is the most critical missing index — every terminal punch triggers a lookup.
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_emp_id
    ON employees(emp_id);

-- device_pin: Used by terminal to map numeric PINs back to employees
-- The middleware's smartToggleAttendance does: .or(`emp_id.eq.X,device_pin.eq.Y`)
CREATE INDEX IF NOT EXISTS idx_employees_device_pin
    ON employees(device_pin)
    WHERE device_pin IS NOT NULL;

-- agency_id: Used by getEmployeesByAgencies (IN query on agency_id)
CREATE INDEX IF NOT EXISTS idx_employees_agency_id
    ON employees(agency_id);

-- Composite: agency_id + is_active — the most common filter combination
-- Nearly every employee list query filters on is_active = true within an agency
CREATE INDEX IF NOT EXISTS idx_employees_agency_active
    ON employees(agency_id, is_active)
    WHERE is_active = true;

-- name: Used for ORDER BY name and ILIKE search
-- A btree index helps with ORDER BY; trigram would help ILIKE but requires extension
CREATE INDEX IF NOT EXISTS idx_employees_name
    ON employees(name);

-- ============================================================================
-- ATTENDANCE_RECORDS TABLE
-- ============================================================================

-- employee_id: Used by getEmployeeRecords and smartToggleAttendance
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id
    ON attendance_records(employee_id);

-- date: Used for date range queries (getRecords, getToday)
CREATE INDEX IF NOT EXISTS idx_attendance_date
    ON attendance_records(date DESC);

-- Composite: employee_id + clock_in_time (DESC)
-- This is the exact access pattern for smartToggleAttendance:
--   .eq('employee_id', X).gte('clock_in_time', todayStart).order('clock_in_time', desc)
-- A composite index lets Postgres satisfy this with a single index scan.
CREATE INDEX IF NOT EXISTS idx_attendance_emp_clockin
    ON attendance_records(employee_id, clock_in_time DESC);

-- Composite: employee_id + date (DESC) — for getEmployeeRecords
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date
    ON attendance_records(employee_id, date DESC);

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Added 8 indexes:
--   employees:          emp_id (unique), device_pin (partial), agency_id,
--                       agency+active (partial), name
--   attendance_records: employee_id, date, emp+clock_in, emp+date
--
-- These cover the hot paths: terminal punches, employee lookups, attendance
-- queries, and sync operations. Partial indexes (WHERE clauses) keep the
-- index small and fast for the common case.
