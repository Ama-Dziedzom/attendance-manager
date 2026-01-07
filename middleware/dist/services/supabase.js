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
exports.getTerminals = getTerminals;
exports.getEmployeeByEmpId = getEmployeeByEmpId;
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
 * Get all terminals
 */
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
 * Get employee by emp_id
 */
async function getEmployeeByEmpId(empId) {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('employees')
        .select('*, department:departments(name), agency:agencies(name)')
        .eq('emp_id', empId)
        .eq('is_active', true)
        .single();
    if (error) {
        logger_1.logger.error('Get employee error:', error);
        return null;
    }
    return data;
}
//# sourceMappingURL=supabase.js.map