-- =====================================================================================
-- STORAGE BUCKETS FOR EMPLOYEE ASSETS
-- =====================================================================================
-- Description: Storage configuration for employee photos, documents, and exports
-- =====================================================================================

-- =====================================================================================
-- CREATE STORAGE BUCKETS
-- =====================================================================================

-- Bucket for employee profile photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'employee-photos',
    'employee-photos',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket for attendance reports/exports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'attendance-reports',
    'attendance-reports',
    false,
    52428800, -- 50MB limit
    ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket for employee documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'employee-documents',
    'employee-documents',
    false,
    10485760, -- 10MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================================================
-- STORAGE POLICIES - Employee Photos
-- =====================================================================================

-- Allow authenticated users to view all employee photos
CREATE POLICY "Authenticated users can view employee photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'employee-photos');

-- Allow public access to employee photos
CREATE POLICY "Public can view employee photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'employee-photos');

-- Admins can upload employee photos
CREATE POLICY "Admins can upload employee photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'employee-photos'
    AND is_admin()
);

-- Employees can upload their own photo
CREATE POLICY "Employees can upload own photo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'employee-photos'
    AND (storage.foldername(name))[1] = get_current_employee_id()::TEXT
);

-- Admins can update employee photos
CREATE POLICY "Admins can update employee photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'employee-photos'
    AND is_admin()
);

-- Admins can delete employee photos
CREATE POLICY "Admins can delete employee photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'employee-photos'
    AND is_admin()
);

-- =====================================================================================
-- STORAGE POLICIES - Attendance Reports
-- =====================================================================================

-- Admins can view attendance reports
CREATE POLICY "Admins can view attendance reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'attendance-reports'
    AND is_admin()
);

-- Admins can upload attendance reports
CREATE POLICY "Admins can upload attendance reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'attendance-reports'
    AND is_admin()
);

-- Admins can delete attendance reports
CREATE POLICY "Admins can delete attendance reports"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'attendance-reports'
    AND is_admin()
);

-- =====================================================================================
-- STORAGE POLICIES - Employee Documents
-- =====================================================================================

-- Admins can view all employee documents
CREATE POLICY "Admins can view employee documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'employee-documents'
    AND is_admin()
);

-- Employees can view their own documents
CREATE POLICY "Employees can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'employee-documents'
    AND (storage.foldername(name))[1] = get_current_employee_id()::TEXT
);

-- Admins can upload employee documents
CREATE POLICY "Admins can upload employee documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'employee-documents'
    AND is_admin()
);

-- Admins can delete employee documents
CREATE POLICY "Admins can delete employee documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'employee-documents'
    AND is_admin()
);
