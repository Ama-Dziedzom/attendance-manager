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
    hireDate: string | null
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
    fingerprintId: string
    publicKey: string
    counter: number
    deviceType: string
    isActive: boolean
    registeredAt: string
    lastUsedAt: string | null
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
    return {
        id: dbEmployee.id,
        empId: dbEmployee.emp_id,
        name: dbEmployee.name,
        email: dbEmployee.email,
        department: dbEmployee.department?.name || null,
        departmentId: dbEmployee.department_id,
        agency: dbEmployee.agency?.name || null,
        agencyId: dbEmployee.agency_id,
        jobTitle: dbEmployee.job_title?.title || null,
        location: dbEmployee.location?.name || null,
        employeeType: dbEmployee.employee_type,
        hireDate: dbEmployee.hire_date,
        gender: dbEmployee.gender,
        maritalStatus: dbEmployee.marital_status,
        address: dbEmployee.address,
        emergencyContact: dbEmployee.emergency_contact,
        education: dbEmployee.education,
        dateJoin: dbEmployee.date_join,
        isActive: dbEmployee.is_active ?? true,
        createdAt: dbEmployee.created_at,
        biometricRegistered: Array.isArray(dbEmployee.biometric_credential)
            ? dbEmployee.biometric_credential.length > 0
            : !!dbEmployee.biometric_credential,
        fingerprintId: Array.isArray(dbEmployee.biometric_credential)
            ? dbEmployee.biometric_credential[0]?.fingerprint_id
            : dbEmployee.biometric_credential?.fingerprint_id,
        biometricDeviceType: Array.isArray(dbEmployee.biometric_credential)
            ? dbEmployee.biometric_credential[0]?.device_type
            : dbEmployee.biometric_credential?.device_type,
        biometricRegisteredAt: Array.isArray(dbEmployee.biometric_credential)
            ? dbEmployee.biometric_credential[0]?.registered_at
            : dbEmployee.biometric_credential?.registered_at,
    }
}

/**
 * Convert database attendance record to frontend format
 */
export function mapDbAttendanceToAttendance(dbRecord: any): AttendanceRecord {
    return {
        id: dbRecord.id,
        employeeId: dbRecord.employee_id,
        employeeName: dbRecord.employee?.name || 'Unknown',
        empId: dbRecord.employee?.emp_id || '',
        department: dbRecord.employee?.department?.name || null,
        agency: dbRecord.employee?.agency?.name || null,
        date: dbRecord.date,
        clockInTime: dbRecord.clock_in_time,
        clockOutTime: dbRecord.clock_out_time,
        totalHours: dbRecord.total_hours,
        status: dbRecord.status,
        verificationMethod: dbRecord.verification_method,
        locationName: dbRecord.location?.name || null,
        shiftName: dbRecord.shift?.name || null,
        shiftStartTime: dbRecord.shift?.start_time || null,
        shiftEndTime: dbRecord.shift?.end_time || null,
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
