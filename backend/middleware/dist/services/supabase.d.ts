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
 * Smart toggle attendance status based on current database state
 */
export declare function smartToggleAttendance(employeeInternalId: string, // UUID
empId: string, // human-readable emp_id
terminalSerial: string, verificationMethod?: string, timestamp?: Date): Promise<{
    success: boolean;
    action?: string;
    data?: any;
    error?: string;
}>;
/**
 * Get all agency IDs linked to a terminal (supports multi-agency terminals)
 */
export declare function getTerminalAgencies(terminalSN: string): Promise<string[]>;
/**
 * Get all active employees for one or more agencies
 */
export declare function getEmployeesByAgencies(agencyIds: string[]): Promise<any[]>;
/**
 * Get all active employees for a specific agency (legacy, single agency)
 */
export declare function getEmployeesByAgency(agencyId: string): Promise<any[]>;
/**
 * Get synchronization status for a terminal
 */
export declare function getTerminalSyncStatus(terminalSN: string): Promise<any[]>;
/**
 * Mark an employee as synced to a terminal
 */
export declare function markEmployeeSynced(empId: string, terminalSN: string, status?: string): Promise<void>;
export declare function getTerminals(): Promise<any[]>;
/**
 * Get terminal by its serial number
 */
export declare function getTerminalBySN(serialNumber: string): Promise<any | null>;
/**
 * Get employee by identifier (emp_id or device_pin)
 */
export declare function getEmployeeByEmpId(identifier: string): Promise<any | null>;
/**
 * Get employee by numeric ID part
 */
export declare function getEmployeeByNumericId(numericId: string): Promise<any | null>;
/**
 * Get enrolled fingerprints for an employee
 */
export declare function getEmployeeFingerprints(employeeId: string): Promise<any[]>;
//# sourceMappingURL=supabase.d.ts.map