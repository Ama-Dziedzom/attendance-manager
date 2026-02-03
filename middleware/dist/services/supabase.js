"use strict";
/**
 * Supabase Client Configuration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSupabase = initSupabase;
exports.getSupabase = getSupabase;
exports.clockInFromTerminal = clockInFromTerminal;
exports.clockOutFromTerminal = clockOutFromTerminal;
exports.updateTerminalStatus = updateTerminalStatus;
exports.smartToggleAttendance = smartToggleAttendance;
exports.getTerminalAgencies = getTerminalAgencies;
exports.getEmployeesByAgencies = getEmployeesByAgencies;
exports.getEmployeesByAgency = getEmployeesByAgency;
exports.getTerminalSyncStatus = getTerminalSyncStatus;
exports.markEmployeeSynced = markEmployeeSynced;
exports.getTerminals = getTerminals;
exports.getTerminalBySN = getTerminalBySN;
exports.getEmployeeByEmpId = getEmployeeByEmpId;
exports.getEmployeeByNumericId = getEmployeeByNumericId;
exports.getEmployeeFingerprints = getEmployeeFingerprints;
const supabase_js_1 = require("@supabase/supabase-js");
const logger_1 = require("../utils/logger");
let supabaseClient = null;
function initSupabase() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
    }
    supabaseClient = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
    return supabaseClient;
}
function getSupabase() {
    if (!supabaseClient) {
        throw new Error('Supabase client not initialized. Call initSupabase() first.');
    }
    return supabaseClient;
}
/**
 * Clock in employee from terminal
 */
async function clockInFromTerminal(empId, terminalSerial, verificationMethod = 'fingerprint', timestamp = new Date()) {
    const supabase = getSupabase();
    try {
        const { data, error } = await supabase.rpc('clock_in_from_terminal', {
            p_emp_id: empId,
            p_terminal_serial: terminalSerial,
            p_verification_method: verificationMethod,
            p_timestamp: timestamp.toISOString()
        });
        if (error) {
            logger_1.logger.error('Clock in RPC error:', error);
            return { success: false, error: error.message };
        }
        return { success: data?.success ?? false, data, error: data?.error };
    }
    catch (err) {
        logger_1.logger.error('Clock in exception:', err);
        return { success: false, error: String(err) };
    }
}
/**
 * Clock out employee from terminal
 */
async function clockOutFromTerminal(empId, terminalSerial, verificationMethod = 'fingerprint', timestamp = new Date()) {
    const supabase = getSupabase();
    try {
        const { data, error } = await supabase.rpc('clock_out_from_terminal', {
            p_emp_id: empId,
            p_terminal_serial: terminalSerial,
            p_verification_method: verificationMethod,
            p_timestamp: timestamp.toISOString()
        });
        if (error) {
            logger_1.logger.error('Clock out RPC error:', error);
            return { success: false, error: error.message };
        }
        return { success: data?.success ?? false, data, error: data?.error };
    }
    catch (err) {
        logger_1.logger.error('Clock out exception:', err);
        return { success: false, error: String(err) };
    }
}
/**
 * Update terminal status
 */
async function updateTerminalStatus(serialNumber, status, ipAddress) {
    const supabase = getSupabase();
    try {
        await supabase.rpc('update_terminal_status', {
            p_serial_number: serialNumber,
            p_status: status,
            p_ip_address: ipAddress || null
        });
    }
    catch (err) {
        logger_1.logger.error('Update terminal status error:', err);
    }
}
/**
 * Smart toggle attendance status based on current database state
 */
async function smartToggleAttendance(employeeInternalId, // UUID
empId, // human-readable emp_id
terminalSerial, verificationMethod = 'fingerprint', timestamp = new Date()) {
    const supabase = getSupabase();
    try {
        // 1. Get the latest record for this employee today
        // Use UTC start of day to match database comparison
        const todayStart = new Date(timestamp);
        todayStart.setUTCHours(0, 0, 0, 0);
        const { data: latestRecord, error: fetchError } = await supabase
            .from('attendance_records')
            .select('*')
            .eq('employee_id', employeeInternalId)
            .gte('clock_in_time', todayStart.toISOString())
            .order('clock_in_time', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (fetchError) {
            logger_1.logger.error('Error fetching latest attendance:', fetchError);
            return { success: false, error: fetchError.message };
        }
        // 2. Decide action based on state
        if (!latestRecord) {
            // No record today -> Clock In
            logger_1.logger.info(`[SmartToggle] No record for ${empId} (${employeeInternalId}), starting Clock-In`);
            const result = await clockInFromTerminal(empId, terminalSerial, verificationMethod, timestamp);
            return { ...result, action: 'clock_in' };
        }
        else if (latestRecord.clock_in_time && !latestRecord.clock_out_time) {
            // Already clocked in but not out -> Clock Out
            logger_1.logger.info(`[SmartToggle] Open record found for ${empId} (${employeeInternalId}), starting Clock-Out`);
            const result = await clockOutFromTerminal(empId, terminalSerial, verificationMethod, timestamp);
            return { ...result, action: 'clock_out' };
        }
        else {
            // Already clocked out -> Attendance complete
            logger_1.logger.info(`[SmartToggle] Record already complete for ${empId} today`);
            return { success: false, error: 'Employee already clocked out for today', action: 'none' };
        }
    }
    catch (err) {
        logger_1.logger.error('Smart toggle exception:', err);
        return { success: false, error: String(err) };
    }
}
/**
 * Get all agency IDs linked to a terminal (supports multi-agency terminals)
 */
async function getTerminalAgencies(terminalSN) {
    const supabase = getSupabase();
    logger_1.logger.info(`[Supabase] Looking up agencies for terminal: ${terminalSN}`);
    // 1. Check multi-agency association table
    const { data, error } = await supabase
        .from('terminal_agencies')
        .select('agency_id')
        .ilike('terminal_sn', terminalSN); // Use ILIKE for case-insensitive matching
    let agencies = data?.map(row => row.agency_id) || [];
    // 2. Fallback or Additional check: single agency_id on terminals table
    const { data: terminal, error: tError } = await supabase
        .from('terminals')
        .select('agency_id')
        .ilike('serial_number', terminalSN) // Use ILIKE for case-insensitive matching
        .maybeSingle();
    if (terminal?.agency_id && !agencies.includes(terminal.agency_id)) {
        agencies.push(terminal.agency_id);
    }
    if (agencies.length === 0) {
        logger_1.logger.warn(`[Supabase] No agencies found for terminal ${terminalSN} (case-insensitive check).`);
    }
    else {
        logger_1.logger.info(`[Supabase] Found ${agencies.length} agencies for terminal ${terminalSN}`);
    }
    return agencies;
}
/**
 * Get all active employees for one or more agencies
 */
async function getEmployeesByAgencies(agencyIds) {
    if (!agencyIds || agencyIds.length === 0)
        return [];
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .in('agency_id', agencyIds)
        .eq('is_active', true);
    if (error) {
        logger_1.logger.error('Get employees by agencies error:', error);
        return [];
    }
    return data || [];
}
/**
 * Get all active employees for a specific agency (legacy, single agency)
 */
async function getEmployeesByAgency(agencyId) {
    return getEmployeesByAgencies([agencyId]);
}
/**
 * Get synchronization status for a terminal
 */
async function getTerminalSyncStatus(terminalSN) {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('employee_terminal_sync')
        .select('emp_id, status')
        .eq('terminal_sn', terminalSN);
    if (error) {
        // If the table doesn't exist yet, we'll return an empty array
        logger_1.logger.warn('Get terminal sync status error (table might not exist):', error.message);
        return [];
    }
    return data || [];
}
/**
 * Mark an employee as synced to a terminal
 */
async function markEmployeeSynced(empId, terminalSN, status = 'synced') {
    const supabase = getSupabase();
    try {
        const { error } = await supabase
            .from('employee_terminal_sync')
            .upsert({
            emp_id: empId,
            terminal_sn: terminalSN,
            status: status,
            last_sync_at: new Date().toISOString()
        }, {
            onConflict: 'emp_id,terminal_sn'
        });
        if (error)
            throw error;
    }
    catch (err) {
        logger_1.logger.error('Mark employee synced error:', err);
    }
}
async function getTerminals() {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('terminals')
        .select('*, agency:agencies(name)')
        .order('created_at', { ascending: true });
    if (error) {
        logger_1.logger.error('Get terminals error:', error);
        return [];
    }
    return data || [];
}
/**
 * Get terminal by its serial number
 */
async function getTerminalBySN(serialNumber) {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('terminals')
        .select('*, agency:agencies(*)')
        .ilike('serial_number', serialNumber)
        .maybeSingle();
    if (error) {
        logger_1.logger.error('Get terminal by SN error:', error);
        return null;
    }
    return data;
}
/**
 * Get employee by identifier (emp_id or device_pin)
 */
async function getEmployeeByEmpId(identifier) {
    const supabase = getSupabase();
    let query = supabase
        .from('employees')
        .select('*, department:departments(name), agency:agencies(name)')
        .eq('is_active', true);
    if (/^\d+$/.test(identifier)) {
        const pin = parseInt(identifier, 10);
        query = query.or(`emp_id.eq.${identifier},device_pin.eq.${pin}`);
    }
    else {
        query = query.eq('emp_id', identifier);
    }
    const { data, error } = await query.maybeSingle();
    if (error) {
        logger_1.logger.error('Get employee error:', error);
        return null;
    }
    return data;
}
/**
 * Get employee by numeric ID part
 */
async function getEmployeeByNumericId(numericId) {
    return getEmployeeByEmpId(numericId);
}
/**
 * Get enrolled fingerprints for an employee
 */
async function getEmployeeFingerprints(employeeId) {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('employee_fingerprints')
        .select('*')
        .eq('employee_id', employeeId);
    if (error) {
        logger_1.logger.error('Get employee fingerprints error:', error);
        return [];
    }
    return data || [];
}
//# sourceMappingURL=supabase.js.map