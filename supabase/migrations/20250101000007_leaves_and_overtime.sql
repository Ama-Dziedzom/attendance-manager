-- =====================================================================================
-- LEAVES AND TIME OFF MANAGEMENT
-- =====================================================================================
-- Description: Leave requests, approvals, and balance tracking
-- Includes vacation, sick leave, personal days, etc.
-- =====================================================================================

-- =====================================================================================
-- LEAVE TYPES TABLE
-- =====================================================================================

CREATE TABLE leave_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE, -- e.g., 'VAC', 'SICK', 'PTO'
    description TEXT,
    -- Configuration
    is_paid BOOLEAN DEFAULT true,
    requires_approval BOOLEAN DEFAULT true,
    max_days_per_year DECIMAL(5,2), -- NULL = unlimited
    can_carry_forward BOOLEAN DEFAULT false,
    max_carry_forward_days DECIMAL(5,2),
    -- Notification
    min_advance_days INTEGER DEFAULT 0, -- Minimum days notice required
    -- Status
    is_active BOOLEAN DEFAULT true,
    color_code TEXT DEFAULT '#10B981',
    -- Meta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE leave_types IS 'Types of leave (vacation, sick, personal, etc.)';
COMMENT ON COLUMN leave_types.code IS 'Short code for leave type';
COMMENT ON COLUMN leave_types.max_days_per_year IS 'Maximum days allowed per year, NULL for unlimited';
COMMENT ON COLUMN leave_types.min_advance_days IS 'Minimum days notice required before taking leave';

CREATE INDEX idx_leave_types_active ON leave_types(is_active);

-- =====================================================================================
-- EMPLOYEE LEAVE BALANCES
-- =====================================================================================

CREATE TABLE employee_leave_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    -- Balances
    total_allocated DECIMAL(5,2) DEFAULT 0,
    used_days DECIMAL(5,2) DEFAULT 0,
    pending_days DECIMAL(5,2) DEFAULT 0,
    available_days DECIMAL(5,2) GENERATED ALWAYS AS (total_allocated - used_days - pending_days) STORED,
    -- Carry forward from previous year
    carried_forward DECIMAL(5,2) DEFAULT 0,
    -- Meta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Constraints
    CONSTRAINT unique_employee_leave_year UNIQUE(employee_id, leave_type_id, year),
    CONSTRAINT valid_balances CHECK (
        total_allocated >= 0 AND
        used_days >= 0 AND
        pending_days >= 0 AND
        carried_forward >= 0
    )
);

COMMENT ON TABLE employee_leave_balances IS 'Annual leave balance tracking per employee';
COMMENT ON COLUMN employee_leave_balances.total_allocated IS 'Total days allocated for the year (including carry forward)';
COMMENT ON COLUMN employee_leave_balances.used_days IS 'Days already used/approved';
COMMENT ON COLUMN employee_leave_balances.pending_days IS 'Days in pending requests';
COMMENT ON COLUMN employee_leave_balances.available_days IS 'Remaining available days (computed)';

CREATE INDEX idx_leave_balance_employee ON employee_leave_balances(employee_id);
CREATE INDEX idx_leave_balance_year ON employee_leave_balances(year);
CREATE INDEX idx_leave_balance_employee_year ON employee_leave_balances(employee_id, year);

-- =====================================================================================
-- LEAVE REQUESTS TABLE
-- =====================================================================================

CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    -- Date range
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    -- Leave details
    total_days DECIMAL(5,2) NOT NULL,
    is_half_day BOOLEAN DEFAULT false,
    half_day_period TEXT CHECK (half_day_period IN ('morning', 'afternoon', NULL)),
    -- Request details
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    -- Approval workflow
    reviewed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    -- Cancellation
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    -- Meta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Constraints
    CONSTRAINT end_after_start CHECK (end_date >= start_date),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    CONSTRAINT half_day_logic CHECK (
        (is_half_day = true AND total_days = 0.5) OR
        (is_half_day = false AND half_day_period IS NULL)
    )
);

COMMENT ON TABLE leave_requests IS 'Employee leave requests with approval workflow';
COMMENT ON COLUMN leave_requests.status IS 'pending, approved, rejected, cancelled';
COMMENT ON COLUMN leave_requests.total_days IS 'Total leave days including weekends if applicable';

CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX idx_leave_requests_created ON leave_requests(created_at DESC);

-- =====================================================================================
-- HOLIDAYS TABLE (Public/Company Holidays)
-- =====================================================================================

CREATE TABLE holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    date DATE NOT NULL,
    year INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM date)::INTEGER) STORED,
    -- Location specific
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    -- Type
    is_mandatory BOOLEAN DEFAULT true,
    holiday_type TEXT DEFAULT 'public',
    description TEXT,
    -- Status
    is_active BOOLEAN DEFAULT true,
    -- Meta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Constraints
    CONSTRAINT holiday_type_values CHECK (holiday_type IN ('public', 'federal', 'company', 'optional'))
);

COMMENT ON TABLE holidays IS 'Public and company holidays';
COMMENT ON COLUMN holidays.location_id IS 'NULL means applies to all locations';
COMMENT ON COLUMN holidays.is_mandatory IS 'If true, all employees get this day off';
COMMENT ON COLUMN holidays.holiday_type IS 'public, federal, company, optional';

CREATE INDEX idx_holidays_date ON holidays(date);
CREATE INDEX idx_holidays_year ON holidays(year);
CREATE INDEX idx_holidays_location ON holidays(location_id);

-- =====================================================================================
-- OVERTIME RECORDS TABLE
-- =====================================================================================

CREATE TABLE overtime_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_record_id UUID REFERENCES attendance_records(id) ON DELETE SET NULL,
    -- Overtime details
    date DATE NOT NULL,
    overtime_hours DECIMAL(5,2) NOT NULL,
    overtime_type TEXT NOT NULL DEFAULT 'regular',
    -- Approval
    is_approved BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    -- Compensation
    is_paid BOOLEAN DEFAULT false,
    paid_at TIMESTAMP WITH TIME ZONE,
    rate_multiplier DECIMAL(3,2) DEFAULT 1.5, -- 1.5x = time and a half
    -- Notes
    reason TEXT,
    notes TEXT,
    -- Meta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Constraints
    CONSTRAINT valid_overtime_hours CHECK (overtime_hours > 0),
    CONSTRAINT valid_overtime_type CHECK (overtime_type IN ('regular', 'weekend', 'holiday', 'emergency')),
    CONSTRAINT valid_rate_multiplier CHECK (rate_multiplier >= 1.0 AND rate_multiplier <= 3.0)
);

COMMENT ON TABLE overtime_records IS 'Tracks overtime hours worked beyond regular shift';
COMMENT ON COLUMN overtime_records.overtime_type IS 'regular, weekend, holiday, emergency';
COMMENT ON COLUMN overtime_records.rate_multiplier IS 'Pay rate multiplier (e.g., 1.5 for time and a half)';

CREATE INDEX idx_overtime_employee ON overtime_records(employee_id);
CREATE INDEX idx_overtime_date ON overtime_records(date DESC);
CREATE INDEX idx_overtime_approval ON overtime_records(is_approved);
CREATE INDEX idx_overtime_paid ON overtime_records(is_paid);

-- =====================================================================================
-- BREAK RECORDS TABLE (Track lunch/coffee breaks)
-- =====================================================================================

CREATE TABLE break_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendance_record_id UUID NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    -- Break timing
    break_start TIMESTAMP WITH TIME ZONE NOT NULL,
    break_end TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN break_end IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (break_end - break_start))/60 
            ELSE NULL 
        END
    ) STORED,
    -- Break type
    break_type TEXT NOT NULL DEFAULT 'lunch',
    -- Meta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Constraints
    CONSTRAINT break_end_after_start CHECK (break_end IS NULL OR break_end > break_start),
    CONSTRAINT valid_break_type CHECK (break_type IN ('lunch', 'tea', 'personal', 'prayer'))
);

COMMENT ON TABLE break_records IS 'Tracks employee break times during work hours';
COMMENT ON COLUMN break_records.duration_minutes IS 'Auto-calculated break duration in minutes';

CREATE INDEX idx_break_attendance ON break_records(attendance_record_id);
CREATE INDEX idx_break_employee ON break_records(employee_id);
CREATE INDEX idx_break_start ON break_records(break_start DESC);

-- =====================================================================================
-- FUNCTIONS FOR LEAVE MANAGEMENT
-- =====================================================================================

-- Function: Calculate working days between two dates (excluding weekends and holidays)
CREATE OR REPLACE FUNCTION calculate_working_days(
    p_start_date DATE,
    p_end_date DATE,
    p_location_id UUID DEFAULT NULL
)
RETURNS DECIMAL AS $$
DECLARE
    v_working_days DECIMAL := 0;
    v_current_date DATE;
    v_day_of_week INTEGER;
BEGIN
    FOR v_current_date IN 
        SELECT generate_series(p_start_date, p_end_date, '1 day'::INTERVAL)::DATE
    LOOP
        -- Get day of week (0=Sunday, 6=Saturday)
        v_day_of_week := EXTRACT(DOW FROM v_current_date);
        
        -- Skip weekends (0=Sunday, 6=Saturday)
        IF v_day_of_week NOT IN (0, 6) THEN
            -- Check if it's a holiday
            IF NOT EXISTS (
                SELECT 1 FROM holidays 
                WHERE date = v_current_date 
                  AND is_active = true
                  AND (location_id IS NULL OR location_id = p_location_id)
            ) THEN
                v_working_days := v_working_days + 1;
            END IF;
        END IF;
    END LOOP;
    
    RETURN v_working_days;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_working_days IS 
    'Calculates working days excluding weekends and holidays';

-- Function: Request leave
CREATE OR REPLACE FUNCTION request_leave(
    p_employee_id UUID,
    p_leave_type_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_reason TEXT,
    p_is_half_day BOOLEAN DEFAULT false,
    p_half_day_period TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_total_days DECIMAL;
    v_available_days DECIMAL;
    v_year INTEGER;
    v_request_id UUID;
    v_requires_approval BOOLEAN;
    v_min_advance_days INTEGER;
BEGIN
    -- Validate dates
    IF p_end_date < p_start_date THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'End date must be after start date',
            'code', 'INVALID_DATE_RANGE'
        );
    END IF;
    
    -- Get leave type settings
    SELECT requires_approval, min_advance_days
    INTO v_requires_approval, v_min_advance_days
    FROM leave_types
    WHERE id = p_leave_type_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Leave type not found or inactive',
            'code', 'INVALID_LEAVE_TYPE'
        );
    END IF;
    
    -- Check minimum advance notice
    IF p_start_date - CURRENT_DATE < v_min_advance_days THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Minimum %s days advance notice required', v_min_advance_days),
            'code', 'INSUFFICIENT_NOTICE'
        );
    END IF;
    
    -- Calculate days
    v_year := EXTRACT(YEAR FROM p_start_date);
    
    IF p_is_half_day THEN
        v_total_days := 0.5;
    ELSE
        v_total_days := calculate_working_days(p_start_date, p_end_date);
    END IF;
    
    -- Check balance
    SELECT available_days INTO v_available_days
    FROM employee_leave_balances
    WHERE employee_id = p_employee_id
      AND leave_type_id = p_leave_type_id
      AND year = v_year;
    
    IF v_available_days IS NULL OR v_available_days < v_total_days THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient leave balance',
            'code', 'INSUFFICIENT_BALANCE',
            'available_days', COALESCE(v_available_days, 0),
            'requested_days', v_total_days
        );
    END IF;
    
    -- Create leave request
    INSERT INTO leave_requests (
        employee_id,
        leave_type_id,
        start_date,
        end_date,
        total_days,
        is_half_day,
        half_day_period,
        reason,
        status
    ) VALUES (
        p_employee_id,
        p_leave_type_id,
        p_start_date,
        p_end_date,
        v_total_days,
        p_is_half_day,
        p_half_day_period,
        p_reason,
        CASE WHEN v_requires_approval THEN 'pending' ELSE 'approved' END
    )
    RETURNING id INTO v_request_id;
    
    -- Update pending balance
    UPDATE employee_leave_balances
    SET pending_days = pending_days + v_total_days
    WHERE employee_id = p_employee_id
      AND leave_type_id = p_leave_type_id
      AND year = v_year;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Leave request submitted successfully',
        'request_id', v_request_id,
        'total_days', v_total_days,
        'status', CASE WHEN v_requires_approval THEN 'pending' ELSE 'approved' END
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'code', 'DATABASE_ERROR'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Approve/Reject leave
CREATE OR REPLACE FUNCTION review_leave_request(
    p_request_id UUID,
    p_reviewer_id UUID,
    p_action TEXT, -- 'approve' or 'reject'
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_request leave_requests;
    v_year INTEGER;
BEGIN
    -- Get request
    SELECT * INTO v_request
    FROM leave_requests
    WHERE id = p_request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Request not found or not pending',
            'code', 'INVALID_REQUEST'
        );
    END IF;
    
    v_year := EXTRACT(YEAR FROM v_request.start_date);
    
    -- Update request
    UPDATE leave_requests
    SET 
        status = CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'rejected' END,
        reviewed_by = p_reviewer_id,
        reviewed_at = NOW(),
        review_notes = p_notes
    WHERE id = p_request_id;
    
    -- Update balances
    IF p_action = 'approve' THEN
        -- Move from pending to used
        UPDATE employee_leave_balances
        SET 
            pending_days = pending_days - v_request.total_days,
            used_days = used_days + v_request.total_days
        WHERE employee_id = v_request.employee_id
          AND leave_type_id = v_request.leave_type_id
          AND year = v_year;
    ELSE
        -- Remove from pending
        UPDATE employee_leave_balances
        SET pending_days = pending_days - v_request.total_days
        WHERE employee_id = v_request.employee_id
          AND leave_type_id = v_request.leave_type_id
          AND year = v_year;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', format('Leave request %s', p_action || 'd'),
        'status', CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'rejected' END
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'code', 'DATABASE_ERROR'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================================
-- SEED DEFAULT LEAVE TYPES
-- =====================================================================================

INSERT INTO leave_types (id, name, code, description, is_paid, max_days_per_year, can_carry_forward, max_carry_forward_days, min_advance_days, color_code) VALUES
    (
        '40000000-0000-0000-0000-000000000001',
        'Annual Leave',
        'AL',
        'Paid annual vacation leave',
        true,
        20,
        true,
        5,
        7,
        '#10B981'
    ),
    (
        '40000000-0000-0000-0000-000000000002',
        'Sick Leave',
        'SL',
        'Paid sick leave',
        true,
        10,
        false,
        0,
        0, -- No advance notice for sick leave
        '#EF4444'
    ),
    (
        '40000000-0000-0000-0000-000000000003',
        'Personal Leave',
        'PL',
        'Personal/family emergency leave',
        true,
        5,
        false,
        0,
        1,
        '#F59E0B'
    ),
    (
        '40000000-0000-0000-0000-000000000004',
        'Unpaid Leave',
        'UL',
        'Unpaid leave',
        false,
        NULL, -- Unlimited
        false,
        0,
        14,
        '#6B7280'
    ),
    (
        '40000000-0000-0000-0000-000000000005',
        'Maternity Leave',
        'ML',
        'Maternity leave',
        true,
        90,
        false,
        0,
        30,
        '#EC4899'
    ),
    (
        '40000000-0000-0000-0000-000000000006',
        'Paternity Leave',
        'PL',
        'Paternity leave',
        true,
        14,
        false,
        0,
        14,
        '#3B82F6'
    )
ON CONFLICT (id) DO NOTHING;

-- =====================================================================================
-- RLS POLICIES
-- =====================================================================================

ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE overtime_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE break_records ENABLE ROW LEVEL SECURITY;

-- Leave Types: Everyone can view
CREATE POLICY "Anyone can view leave types"
    ON leave_types FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Admins can manage leave types"
    ON leave_types FOR ALL TO authenticated
    USING (is_admin()) WITH CHECK (is_admin());

-- Leave Balances: View own, admins view all
CREATE POLICY "Employees can view own leave balances"
    ON employee_leave_balances FOR SELECT TO authenticated
    USING (employee_id = get_current_employee_id() OR is_admin());

CREATE POLICY "Admins can manage leave balances"
    ON employee_leave_balances FOR ALL TO authenticated
    USING (is_admin()) WITH CHECK (is_admin());

-- Leave Requests: View own, admins and managers view related
CREATE POLICY "Employees can view own leave requests"
    ON leave_requests FOR SELECT TO authenticated
    USING (employee_id = get_current_employee_id() OR is_admin());

CREATE POLICY "Employees can create own leave requests"
    ON leave_requests FOR INSERT TO authenticated
    WITH CHECK (employee_id = get_current_employee_id() OR is_admin());

CREATE POLICY "Admins can manage leave requests"
    ON leave_requests FOR ALL TO authenticated
    USING (is_admin()) WITH CHECK (is_admin());

-- Holidays: Everyone can view
CREATE POLICY "Anyone can view holidays"
    ON holidays FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Admins can manage holidays"
    ON holidays FOR ALL TO authenticated
    USING (is_admin()) WITH CHECK (is_admin());

-- Overtime: View own, admins view all
CREATE POLICY "Employees can view own overtime"
    ON overtime_records FOR SELECT TO authenticated
    USING (employee_id = get_current_employee_id() OR is_admin());

CREATE POLICY "Admins can manage overtime"
    ON overtime_records FOR ALL TO authenticated
    USING (is_admin()) WITH CHECK (is_admin());

-- Breaks: View own, admins view all
CREATE POLICY "Employees can view own breaks"
    ON break_records FOR SELECT TO authenticated
    USING (employee_id = get_current_employee_id() OR is_admin());

CREATE POLICY "Employees can create breaks"
    ON break_records FOR INSERT TO authenticated, anon
    WITH CHECK (true);

CREATE POLICY "Admins can manage breaks"
    ON break_records FOR ALL TO authenticated
    USING (is_admin()) WITH CHECK (is_admin());

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

CREATE TRIGGER update_leave_types_updated_at
    BEFORE UPDATE ON leave_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_balances_updated_at
    BEFORE UPDATE ON employee_leave_balances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at
    BEFORE UPDATE ON leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_holidays_updated_at
    BEFORE UPDATE ON holidays
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_overtime_updated_at
    BEFORE UPDATE ON overtime_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- GRANT PERMISSIONS
-- =====================================================================================

GRANT SELECT ON leave_types TO authenticated, anon;
GRANT SELECT ON holidays TO authenticated, anon;
GRANT SELECT ON employee_leave_balances TO authenticated;
GRANT SELECT ON leave_requests TO authenticated;
GRANT SELECT ON overtime_records TO authenticated;
GRANT SELECT ON break_records TO authenticated;

GRANT EXECUTE ON FUNCTION calculate_working_days(DATE, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION request_leave(UUID, UUID, DATE, DATE, TEXT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION review_leave_request(UUID, UUID, TEXT, TEXT) TO authenticated;
