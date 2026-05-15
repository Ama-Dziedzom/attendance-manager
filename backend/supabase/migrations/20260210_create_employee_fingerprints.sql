-- ============================================================================
-- Employee Fingerprints Table Migration
-- ============================================================================
-- Stores enrolled fingerprint templates from SLK20R and other enrollment devices.
-- Uses TEXT column for template_data to avoid VARCHAR truncation issues.
-- 
-- This table is the source of truth for fingerprint templates that get
-- synced to MB460 attendance terminals via the PUSH protocol.
-- ============================================================================

-- ============================================================================
-- 1. EMPLOYEE FINGERPRINTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_fingerprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    finger_index INTEGER NOT NULL CHECK (finger_index BETWEEN 0 AND 9),
    template TEXT NOT NULL,                  -- Base64-encoded ZKTeco fingerprint template (TEXT, not VARCHAR!)
    template_format VARCHAR(20) DEFAULT 'zkfp_v10',
    template_size INTEGER,                   -- Actual byte size after Base64 decode (e.g. 1232 for SilkID v10)
    capture_quality INTEGER,                 -- Optional quality score from enrollment
    enrolled_via VARCHAR(50) DEFAULT 'slk20r', -- 'slk20r', 'mb460', 'web', etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Each employee can have at most one template per finger
    CONSTRAINT employee_fingerprints_unique UNIQUE (employee_id, finger_index)
);

-- ============================================================================
-- 2. ADD MISSING COLUMNS (safe for existing tables)
-- ============================================================================
-- If the table already existed without these columns, add them now.
-- Must run BEFORE comments that reference these columns.

ALTER TABLE employee_fingerprints ADD COLUMN IF NOT EXISTS template_size INTEGER;
ALTER TABLE employee_fingerprints ADD COLUMN IF NOT EXISTS template_format VARCHAR(20) DEFAULT 'zkfp_v10';
ALTER TABLE employee_fingerprints ADD COLUMN IF NOT EXISTS capture_quality INTEGER;
ALTER TABLE employee_fingerprints ADD COLUMN IF NOT EXISTS enrolled_via VARCHAR(50) DEFAULT 'slk20r';
ALTER TABLE employee_fingerprints ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE employee_fingerprints ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure template column is TEXT (not VARCHAR) to prevent truncation
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employee_fingerprints'
        AND column_name = 'template'
        AND data_type != 'text'
    ) THEN
        ALTER TABLE employee_fingerprints ALTER COLUMN template TYPE TEXT;
        RAISE NOTICE 'Converted template column from VARCHAR to TEXT to prevent truncation';
    END IF;
END $$;

-- Comments (safe now that all columns exist)
COMMENT ON TABLE employee_fingerprints IS 'Stores enrolled fingerprint templates from SLK20R and other enrollment devices';
COMMENT ON COLUMN employee_fingerprints.template IS 'Base64-encoded ZKTeco fingerprint template (SilkID v10.0 format). Uses TEXT to prevent truncation.';
COMMENT ON COLUMN employee_fingerprints.template_size IS 'Actual byte size after Base64 decode. Typically 1232 for SilkID v10, 1260 for SLK20R extended.';
COMMENT ON COLUMN employee_fingerprints.finger_index IS 'Which finger: 0=Right Thumb, 1=Right Index, 2=Right Middle, etc.';
COMMENT ON COLUMN employee_fingerprints.enrolled_via IS 'Device or method used for enrollment: slk20r, mb460, web, etc.';

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_efp_employee_id ON employee_fingerprints(employee_id);
CREATE INDEX IF NOT EXISTS idx_efp_enrolled_at ON employee_fingerprints(created_at);

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE employee_fingerprints ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read fingerprints (needed for sync operations)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'employee_fingerprints' AND policyname = 'Allow authenticated read employee_fingerprints'
    ) THEN
        CREATE POLICY "Allow authenticated read employee_fingerprints"
        ON employee_fingerprints FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- Service role has full access (used by middleware for enrollment and sync)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'employee_fingerprints' AND policyname = 'Allow service_role full access employee_fingerprints'
    ) THEN
        CREATE POLICY "Allow service_role full access employee_fingerprints"
        ON employee_fingerprints FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ============================================================================
-- 4. GRANTS
-- ============================================================================

GRANT SELECT ON employee_fingerprints TO authenticated;
GRANT ALL ON employee_fingerprints TO service_role;

-- ============================================================================
-- 5. UPDATED_AT TRIGGER
-- ============================================================================
-- Uses the existing update_updated_at_column() function if available,
-- otherwise creates a simple one.

CREATE OR REPLACE FUNCTION update_employee_fingerprints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_employee_fingerprints_updated_at ON employee_fingerprints;

CREATE TRIGGER trg_update_employee_fingerprints_updated_at
    BEFORE UPDATE ON employee_fingerprints
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_fingerprints_updated_at();

-- ============================================================================
-- 6. AUTO-CALCULATE TEMPLATE SIZE ON INSERT/UPDATE
-- ============================================================================
-- Automatically computes and stores the decoded template byte size
-- so we can validate without decoding Base64 every time.

CREATE OR REPLACE FUNCTION calculate_template_size()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.template IS NOT NULL AND NEW.template != '' THEN
        NEW.template_size = octet_length(decode(NEW.template, 'base64'));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_template_size ON employee_fingerprints;

CREATE TRIGGER trg_calculate_template_size
    BEFORE INSERT OR UPDATE OF template ON employee_fingerprints
    FOR EACH ROW
    EXECUTE FUNCTION calculate_template_size();

-- ============================================================================
-- Done!
-- ============================================================================
-- After this migration:
-- 1. employee_fingerprints table stores Base64 templates in TEXT (no truncation)
-- 2. template_size is auto-calculated on insert/update
-- 3. RLS is enabled with authenticated read and service_role full access
-- 4. Unique constraint prevents duplicate finger enrollments per employee
-- ============================================================================
