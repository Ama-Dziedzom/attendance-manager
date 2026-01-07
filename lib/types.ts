/**
 * Application Types
 * Extends and adapts database types for frontend use
 */

import { Database } from './database.types'

// =====================================================================================
// DATABASE TYPE ALIASES
// =====================================================================================

export type DbEmployee = Database['public']['Tables']['employees']['Row']
export type DbBiometricCredential = Database['public']['Tables']['biometric_credentials']['Row']
export type DbAttendanceRecord = Database['public']['Tables']['attendance_records']['Row']
export type DbDepartment = Database['public']['Tables']['departments']['Row']
export type DbAgency = Database['public']['Tables']['agencies']['Row']
export type DbTerminal = Database['public']['Tables']['terminals']['Row']  // NEW: MB460 terminals
// export type DbShift = Database['public']['Tables']['shifts']['Row']
// export type DbLeaveType = Database['public']['Tables']['leave_types']['Row']
// export type DbLeaveRequest = Database['public']['Tables']['leave_requests']['Row']

// =====================================================================================
// FRONTEND-FRIENDLY TYPES (with denormalized data)
// =====================================================================================

/**
 * Employee with denormalized department and agency names
 * Used in UI components for display
 */
export interface Employee {
    id: string
    empId: string
    name: string
    email: string | null
    department: string | null
    departmentId: string | null
    agency: string | null
    agencyId: string | null
    jobTitle: string | null
    location: string | null
    employeeType: string | null
    gender: string | null
    maritalStatus: string | null
    address: string | null
    emergencyContact: string | null
    education: string | null
    dateJoin: string | null
    isActive: boolean
    createdAt: string
    biometricRegistered: boolean
    fingerprintId?: string
    faceTemplateId?: string          // NEW: Face template ID
    biometricType?: 'fingerprint' | 'face' | 'both'  // NEW: Type of biometric enrolled
    biometricDeviceType?: string
    biometricRegisteredAt?: string
}

/**
 * Biometric credential info
 */
export interface BiometricCredential {
    id: string
    employeeId: string
    credentialId: string
    fingerprintId: string | null      // Now nullable (may use face only)
    faceTemplateId: string | null     // NEW: Face template ID
    biometricType: 'fingerprint' | 'face' | 'both'  // NEW: Type of biometric
    publicKey: string
    counter: number
    deviceType: string
    deviceUserId: string | null       // NEW: MB460 internal user ID
    terminalId: string | null         // NEW: Terminal where enrolled
    isActive: boolean
    registeredAt: string
    lastUsedAt: string | null
}

/**
 * Terminal (MB460) info
 */
export interface Terminal {
    id: string
    serialNumber: string
    agencyId: string | null
    agencyName?: string               // Denormalized for display
    name: string | null
    model: string
    ipAddress: string | null
    port: number
    status: 'online' | 'offline' | 'unknown'
    lastSeen: string | null
    firmwareVersion: string | null
    faceEnabled: boolean
    createdAt: string
}

/**
 * Attendance record with employee details
 */
export interface AttendanceRecord {
    id: string
    employeeId: string
    employeeName: string
    empId: string
    department: string | null
    agency: string | null
    date: string
    clockInTime: string
    clockOutTime: string | null
    totalHours: number | null
    status: 'on_time' | 'late' | 'early_departure' | 'absent' | 'half_day'
    verificationMethod: string
    locationName: string | null
    shiftName: string | null
    shiftStartTime: string | null
    shiftEndTime: string | null
}

/**
 * Department type
 */
export interface Department {
    id: string
    name: string
    description: string | null
    isActive: boolean
}

/**
 * Agency type
 */
export interface Agency {
    id: string
    name: string
    address: string | null
    contactInfo: any
    isActive: boolean
}

/**
 * Dashboard stats
 */
export interface DashboardStats {
    totalEmployees: number
    presentToday: number
    onTime: number
    late: number
    absent: number
    averageHours: number
}

/**
 * Attendance status for display
 */
export type AttendanceStatus = 'On Time' | 'Late' | 'Early Departure' | 'Absent' | 'Half Day'

/**
 * Leave request with employee info
 */
export interface LeaveRequest {
    id: string
    employeeId: string
    employeeName: string
    leaveType: string
    startDate: string
    endDate: string
    totalDays: number
    reason: string
    status: 'pending' | 'approved' | 'rejected' | 'cancelled'
    reviewedBy: string | null
    reviewedAt: string | null
}

// =====================================================================================
// UTILITY FUNCTIONS
// =====================================================================================

/**
 * Convert database employee to frontend employee
 */
export function mapDbEmployeeToEmployee(dbEmployee: any): Employee {
    const department = Array.isArray(dbEmployee.department) ? dbEmployee.department[0] : dbEmployee.department
    const agency = Array.isArray(dbEmployee.agency) ? dbEmployee.agency[0] : dbEmployee.agency
    const biometric = Array.isArray(dbEmployee.biometric_credential)
        ? dbEmployee.biometric_credential[0]
        : dbEmployee.biometric_credential

    return {
        id: dbEmployee.id,
        empId: dbEmployee.emp_id,
        name: dbEmployee.name,
        email: dbEmployee.email,
        department: department?.name || null,
        departmentId: dbEmployee.department_id,
        agency: agency?.name || null,
        agencyId: dbEmployee.agency_id,
        jobTitle: dbEmployee.job_title || null,
        location: dbEmployee.location || null,
        employeeType: dbEmployee.employment_type,
        gender: dbEmployee.gender,
        maritalStatus: dbEmployee.marital_status,
        address: dbEmployee.address,
        emergencyContact: dbEmployee.emergency_contact,
        education: dbEmployee.education,
        dateJoin: dbEmployee.date_join,
        isActive: dbEmployee.is_active ?? true,
        createdAt: dbEmployee.created_at,
        biometricRegistered: !!biometric,
        fingerprintId: biometric?.fingerprint_id,
        faceTemplateId: biometric?.face_template_id,           // NEW: Face template
        biometricType: biometric?.biometric_type || undefined, // NEW: fingerprint/face/both
        biometricDeviceType: biometric?.device_type,
        biometricRegisteredAt: biometric?.registered_at,
    }
}

/**
 * Convert database attendance record to frontend format
 */
export function mapDbAttendanceToAttendance(dbRecord: any): AttendanceRecord {
    const employee = Array.isArray(dbRecord.employee) ? dbRecord.employee[0] : dbRecord.employee
    const department = Array.isArray(employee?.department) ? employee?.department[0] : employee?.department
    const agency = Array.isArray(employee?.agency) ? employee?.agency[0] : employee?.agency
    const location = Array.isArray(dbRecord.location) ? dbRecord.location[0] : dbRecord.location
    const shift = Array.isArray(dbRecord.shift) ? dbRecord.shift[0] : dbRecord.shift

    return {
        id: dbRecord.id,
        employeeId: dbRecord.employee_id,
        employeeName: employee?.name || 'Unknown',
        empId: employee?.emp_id || '',
        department: department?.name || null,
        agency: agency?.name || null,
        date: dbRecord.date,
        clockInTime: dbRecord.clock_in_time,
        clockOutTime: dbRecord.clock_out_time,
        totalHours: dbRecord.total_hours,
        status: dbRecord.status,
        verificationMethod: dbRecord.verification_method,
        locationName: location?.name || null,
        shiftName: shift?.name || null,
        shiftStartTime: shift?.start_time || null,
        shiftEndTime: shift?.end_time || null,
    }
}

/**
 * Format status for display
 */
export function formatStatus(status: string): AttendanceStatus {
    const statusMap: Record<string, AttendanceStatus> = {
        on_time: 'On Time',
        late: 'Late',
        early_departure: 'Early Departure',
        absent: 'Absent',
        half_day: 'Half Day',
    }
    return statusMap[status] || 'Absent'
}

/**
 * Get status color for UI
 */
export function getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
        on_time: 'text-green-600 bg-green-50',
        late: 'text-orange-600 bg-orange-50',
        early_departure: 'text-yellow-600 bg-yellow-50',
        absent: 'text-red-600 bg-red-50',
        half_day: 'text-blue-600 bg-blue-50',
    }
    return colorMap[status] || 'text-gray-600 bg-gray-50'
}

/**
 * Convert database terminal to frontend terminal
 */
export function mapDbTerminalToTerminal(dbTerminal: any): Terminal {
    const agency = Array.isArray(dbTerminal.agency) ? dbTerminal.agency[0] : dbTerminal.agency

    return {
        id: dbTerminal.id,
        serialNumber: dbTerminal.serial_number,
        agencyId: dbTerminal.agency_id,
        agencyName: agency?.name || undefined,
        name: dbTerminal.name,
        model: dbTerminal.model || 'MB460',
        ipAddress: dbTerminal.ip_address,
        port: dbTerminal.port || 4370,
        status: dbTerminal.status || 'unknown',
        lastSeen: dbTerminal.last_seen,
        firmwareVersion: dbTerminal.firmware_version,
        faceEnabled: dbTerminal.face_enabled ?? false,
        createdAt: dbTerminal.created_at,
    }
}

/**
 * Get terminal status color for UI
 */
export function getTerminalStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
        online: 'text-green-600 bg-green-50',
        offline: 'text-red-600 bg-red-50',
        unknown: 'text-gray-600 bg-gray-50',
    }
    return colorMap[status] || 'text-gray-600 bg-gray-50'
}

/**
 * Get verification method display name
 */
export function getVerificationMethodDisplay(method: string): string {
    const methodMap: Record<string, string> = {
        fingerprint: '👆 Fingerprint',
        face: '😊 Face',
        card: '💳 Card',
        manual: '✍️ Manual',
    }
    return methodMap[method] || method
}
