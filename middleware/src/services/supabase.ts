/**
 * Supabase Client Configuration
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

let supabaseClient: SupabaseClient | null = null;

export function initSupabase(): SupabaseClient {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    return supabaseClient;
}

export function getSupabase(): SupabaseClient {
    if (!supabaseClient) {
        throw new Error('Supabase client not initialized. Call initSupabase() first.');
    }
    return supabaseClient;
}

/**
 * Clock in employee from terminal
 */
export async function clockInFromTerminal(
    empId: string,
    terminalSerial: string,
    verificationMethod: string = 'fingerprint',
    timestamp: Date = new Date()
): Promise<{ success: boolean; data?: any; error?: string }> {
    const supabase = getSupabase();

    try {
        const { data, error } = await supabase.rpc('clock_in_from_terminal', {
            p_emp_id: empId,
            p_terminal_serial: terminalSerial,
            p_verification_method: verificationMethod,
            p_timestamp: timestamp.toISOString()
        });

        if (error) {
            logger.error('Clock in RPC error:', error);
            return { success: false, error: error.message };
        }

        return { success: data?.success ?? false, data, error: data?.error };
    } catch (err) {
        logger.error('Clock in exception:', err);
        return { success: false, error: String(err) };
    }
}

/**
 * Clock out employee from terminal
 */
export async function clockOutFromTerminal(
    empId: string,
    terminalSerial: string,
    verificationMethod: string = 'fingerprint',
    timestamp: Date = new Date()
): Promise<{ success: boolean; data?: any; error?: string }> {
    const supabase = getSupabase();

    try {
        const { data, error } = await supabase.rpc('clock_out_from_terminal', {
            p_emp_id: empId,
            p_terminal_serial: terminalSerial,
            p_verification_method: verificationMethod,
            p_timestamp: timestamp.toISOString()
        });

        if (error) {
            logger.error('Clock out RPC error:', error);
            return { success: false, error: error.message };
        }

        return { success: data?.success ?? false, data, error: data?.error };
    } catch (err) {
        logger.error('Clock out exception:', err);
        return { success: false, error: String(err) };
    }
}

/**
 * Update terminal status
 */
export async function updateTerminalStatus(
    serialNumber: string,
    status: 'online' | 'offline',
    ipAddress?: string
): Promise<void> {
    const supabase = getSupabase();

    try {
        await supabase.rpc('update_terminal_status', {
            p_serial_number: serialNumber,
            p_status: status,
            p_ip_address: ipAddress || null
        });
    } catch (err) {
        logger.error('Update terminal status error:', err);
    }
}

/**
 * Get all terminals
 */
export async function getTerminals(): Promise<any[]> {
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('terminals')
        .select('*, agency:agencies(name)')
        .order('created_at', { ascending: true });

    if (error) {
        logger.error('Get terminals error:', error);
        return [];
    }

    return data || [];
}

/**
 * Get employee by emp_id
 */
export async function getEmployeeByEmpId(empId: string): Promise<any | null> {
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('employees')
        .select('*, department:departments(name), agency:agencies(name)')
        .eq('emp_id', empId)
        .eq('is_active', true)
        .single();

    if (error) {
        logger.error('Get employee error:', error);
        return null;
    }

    return data;
}
