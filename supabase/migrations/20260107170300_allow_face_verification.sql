-- Update verification_method constraint to allow 'face'
-- Run this in Supabase SQL Editor

-- First, drop the existing constraint
ALTER TABLE attendance_records 
DROP CONSTRAINT IF EXISTS verification_method_values;

-- Add updated constraint with 'face' included
ALTER TABLE attendance_records 
ADD CONSTRAINT verification_method_values 
CHECK (verification_method IN ('fingerprint', 'face', 'card', 'password', 'manual'));

-- Verify the change
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'attendance_records'::regclass 
AND contype = 'c';
