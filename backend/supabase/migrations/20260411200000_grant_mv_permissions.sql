-- Grant SELECT permissions on materialized views used by the dashboard and reports pages.
-- These views were missing grants, causing "permission denied" errors for both
-- authenticated and anon roles.

GRANT SELECT ON mv_daily_attendance_summary TO authenticated;
GRANT SELECT ON mv_daily_attendance_summary TO anon;

GRANT SELECT ON mv_monthly_attendance_summary TO authenticated;
GRANT SELECT ON mv_monthly_attendance_summary TO anon;
