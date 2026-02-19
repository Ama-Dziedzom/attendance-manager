-- ============================================================================
-- Terminal Command Queue
-- ============================================================================
-- Replaces the in-memory commandQueue and (global as any).cmdTracker
-- with a persistent, database-backed queue.
--
-- Benefits:
--   - Commands survive server restarts
--   - Full audit trail of what was sent and responses
--   - Enables horizontal scaling (multiple middleware instances)
--   - Built-in retry logic
-- ============================================================================

CREATE TABLE IF NOT EXISTS terminal_command_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    terminal_sn VARCHAR(50) NOT NULL,
    command_id INTEGER NOT NULL,
    command_type VARCHAR(50) NOT NULL,       -- USER_SYNC, FINGERPRINT_SYNC, TIME_SYNC, RAW, etc.
    command_payload TEXT NOT NULL,
    description TEXT,                         -- Human-readable description (replaces cmdTracker)
    status VARCHAR(20) DEFAULT 'pending',    -- pending, sent, success, failed
    priority INTEGER DEFAULT 0,              -- Higher = sent first
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    response_code INTEGER,                   -- ZKTeco Return code
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Primary query: get next pending command for a terminal
CREATE INDEX IF NOT EXISTS idx_tcq_terminal_pending
    ON terminal_command_queue(terminal_sn, status, priority DESC, created_at ASC)
    WHERE status = 'pending';

-- Lookup by command_id (for matching device responses)
CREATE INDEX IF NOT EXISTS idx_tcq_command_id
    ON terminal_command_queue(command_id, terminal_sn);

-- Cleanup: find old completed commands
CREATE INDEX IF NOT EXISTS idx_tcq_completed
    ON terminal_command_queue(status, completed_at)
    WHERE status IN ('success', 'failed');

-- Comments
COMMENT ON TABLE terminal_command_queue IS 'Persistent command queue for ZKTeco terminal communication. Replaces in-memory queue.';
COMMENT ON COLUMN terminal_command_queue.command_type IS 'Type: USER_SYNC, FINGERPRINT_SYNC, TIME_SYNC, RAW, FORMAT_TEST';
COMMENT ON COLUMN terminal_command_queue.status IS 'pending=waiting to send, sent=delivered to device, success=device confirmed, failed=gave up after retries';

-- RLS
ALTER TABLE terminal_command_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_command_queue"
    ON terminal_command_queue FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "service_role_full_access_command_queue"
    ON terminal_command_queue FOR ALL
    TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON terminal_command_queue FROM anon;
GRANT SELECT ON terminal_command_queue TO authenticated;
GRANT ALL ON terminal_command_queue TO service_role;

-- ============================================================================
-- Cleanup function: remove completed commands older than 7 days
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_old_commands()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM terminal_command_queue
    WHERE status IN ('success', 'failed')
    AND completed_at < NOW() - INTERVAL '7 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_old_commands TO service_role;
