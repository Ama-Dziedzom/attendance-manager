/**
 * Supabase Client Configuration
 */
import { SupabaseClient } from '@supabase/supabase-js';
export declare function initSupabase(): SupabaseClient;
export declare function getSupabase(): SupabaseClient;
/**
 * Clock in employee from terminal
 */
export declare function clockInFromTerminal(empId: string, terminalSerial: string, verificationMethod?: string, timestamp?: Date): Promise<{
    success: boolean;
    data?: any;
    error?: string;
}>;
/**
 * Clock out employee from terminal
 */
export declare function clockOutFromTerminal(empId: string, terminalSerial: string, verificationMethod?: string, timestamp?: Date): Promise<{
    success: boolean;
    data?: any;
    error?: string;
}>;
/**
 * Update terminal status
 */
export declare function updateTerminalStatus(serialNumber: string, status: 'online' | 'offline', ipAddress?: string): Promise<void>;
/**
 * Get all terminals
 */
export declare function getTerminals(): Promise<any[]>;
/**
 * Get employee by emp_id
 */
export declare function getEmployeeByEmpId(empId: string): Promise<any | null>;
//# sourceMappingURL=supabase.d.ts.map