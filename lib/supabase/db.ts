/**
 * Supabase Data Layer
 * Replaces localStorage with Supabase database operations
 */

import { supabase } from './client'
import { Database } from '../database.types'

// Type aliases for easier usage
type Employee = Database['public']['Tables']['employees']['Row']
type NewEmployee = Database['public']['Tables']['employees']['Insert']
type BiometricCredential = Database['public']['Tables']['biometric_credentials']['Row']
type NewBiometricCredential = Database['public']['Tables']['biometric_credentials']['Insert']
type AttendanceRecord = Database['public']['Tables']['attendance_records']['Row']
type Department = Database['public']['Tables']['departments']['Row']
type Agency = Database['public']['Tables']['agencies']['Row']

// =====================================================================================
// EMPLOYEES
// =====================================================================================

export const employeeService = {
    /**
     * Get all active employees
     */
    async getAll() {
        const { data, error } = await supabase
            .from('employees')
            .select(`
        *,
        department:departments(id, name),
        agency:agencies(id, name),
        biometric_credential:biometric_credentials(*)
      `)
            .eq('is_active', true)
            .order('name')

        if (error) throw error
        return data || []
    },

    /**
     * Get employee by emp_id
     */
    async getByEmpId(empId: string) {
        const { data, error } = await supabase
            .from('employees')
            .select(`
        *,
        department:departments(id, name),
        agency:agencies(id, name),
        biometric_credential:biometric_credentials(*)
      `)
            .eq('emp_id', empId)
            .eq('is_active', true)
            .single()

        if (error) {
            console.error(`Error in getByEmpId for ${empId}:`, error)
            throw error
        }
        return data
    },

    /**
     * Get employee by ID
     */
    async getById(id: string) {
        const { data, error } = await supabase
            .from('employees')
            .select(`
        *,
        department:departments(id, name),
        agency:agencies(id, name),
        biometric_credential:biometric_credentials(*)
      `)
            .eq('id', id)
            .single()

        if (error) throw error
        return data
    },

    /**
     * Create new employee
     */
    async create(employee: NewEmployee) {
        const { data, error } = await supabase
            .from('employees')
            .insert(employee)
            .select(`
                *,
                department:departments(id, name),
                agency:agencies(id, name),
                biometric_credential:biometric_credentials(*)
            `)
            .single()

        if (error) throw error
        return data
    },

    /**
     * Update employee
     */
    async update(id: string, updates: Partial<Database['public']['Tables']['employees']['Update']>) {
        const { error } = await supabase
            .from('employees')
            .update(updates)
            .eq('id', id)

        if (error) throw error

        // Fetch the updated record with joins
        const { data, error: fetchError } = await supabase
            .from('employees')
            .select(`
                *,
                department:departments(id, name),
                agency:agencies(id, name),
                biometric_credential:biometric_credentials(*)
            `)
            .eq('id', id)
            .single()

        if (fetchError) throw fetchError
        return data
    },

    /**
     * Soft delete employee (set is_active to false)
     */
    async delete(id: string) {
        const { error } = await supabase
            .from('employees')
            .update({ is_active: false })
            .eq('id', id)

        if (error) throw error
    },

    /**
     * Search employees by name or emp_id
     */
    async search(query: string) {
        const { data, error } = await supabase
            .from('employees')
            .select(`
        *,
        department:departments(name),
        agency:agencies(name),
        biometric_credential:biometric_credentials(*)
      `)
            .eq('is_active', true)
            .or(`name.ilike.%${query}%,emp_id.ilike.%${query}%`)
            .order('name')

        if (error) throw error
        return data || []
    },
}

// =====================================================================================
// BIOMETRIC CREDENTIALS
// =====================================================================================

export const biometricService = {
    /**
     * Register new biometric credential
     */
    async register(credential: NewBiometricCredential) {
        const { data, error } = await supabase
            .from('biometric_credentials')
            .insert(credential)
            .select()
            .single()

        if (error) throw error
        return data
    },

    /**
     * Get credential by employee ID
     */
    async getByEmployeeId(employeeId: string) {
        const { data, error } = await supabase
            .from('biometric_credentials')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('is_active', true)
            .single()

        if (error) {
            if (error.code === 'PGRST116') return null // Not found
            throw error
        }
        return data
    },

    /**
     * Get credential by credential_id
     */
    async getByCredentialId(credentialId: string) {
        const { data, error } = await supabase
            .from('biometric_credentials')
            .select('*')
            .eq('credential_id', credentialId)
            .eq('is_active', true)
            .single()

        if (error) {
            if (error.code === 'PGRST116') return null
            throw error
        }
        return data
    },

    /**
     * Update last used timestamp
     */
    async updateLastUsed(credentialId: string) {
        const { error } = await supabase
            .from('biometric_credentials')
            .update({ last_used_at: new Date().toISOString() })
            .eq('credential_id', credentialId)

        if (error) throw error
    },

    /**
     * Deactivate credential
     */
    async deactivate(credentialId: string) {
        const { error } = await supabase
            .from('biometric_credentials')
            .update({ is_active: false })
            .eq('credential_id', credentialId)

        if (error) throw error
    },
}

// =====================================================================================
// ATTENDANCE
// =====================================================================================

export const attendanceService = {
    /**
     * Clock in employee using database function
     */
    async clockIn(empId: string, verificationMethod: string = 'fingerprint') {
        const { data, error } = await supabase.rpc('clock_in_employee', {
            p_emp_id: empId,
            p_verification_method: verificationMethod,
        })

        if (error) throw error
        return data
    },

    /**
     * Clock out employee using database function
     */
    async clockOut(empId: string) {
        const { data, error } = await supabase.rpc('clock_out_employee', {
            p_emp_id: empId,
        })

        if (error) throw error
        return data
    },

    /**
     * Get employee status for today
     */
    async getStatusToday(empId: string) {
        const { data, error } = await supabase.rpc('get_employee_status_today', {
            p_emp_id: empId,
        })

        if (error) throw error
        return data
    },

    /**
     * Get attendance records for a date range
     */
    async getRecords(startDate: string, endDate?: string) {
        let query = supabase
            .from('attendance_records')
            .select(`
        *,
        employee:employees(id, emp_id, name, department:departments(name), agency:agencies(name))
      `)
            .gte('date', startDate)

        if (endDate) {
            query = query.lte('date', endDate)
        }

        const { data, error } = await query.order('date', { ascending: false })

        if (error) throw error
        return data || []
    },

    /**
     * Get attendance for specific employee
     */
    async getEmployeeRecords(employeeId: string, limit: number = 30) {
        const { data, error } = await supabase
            .from('attendance_records')
            .select(`
                *,
                employee:employees(id, emp_id, name, department:departments(name), agency:agencies(name))
            `)
            .eq('employee_id', employeeId)
            .order('date', { ascending: false })
            .limit(limit)

        if (error) throw error
        return data || []
    },

    /**
     * Get today's attendance
     */
    async getToday() {
        const today = new Date().toISOString().split('T')[0]
        return this.getRecords(today, today)
    },

    /**
     * Subscribe to real-time attendance updates
     */
    subscribeToUpdates(callback: (payload: any) => void) {
        return supabase
            .channel('attendance_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'attendance_records',
                },
                callback
            )
            .subscribe()
    },
}

// =====================================================================================
// DEPARTMENTS & AGENCIES
// =====================================================================================

export const departmentService = {
    async getAll() {
        const { data, error } = await supabase
            .from('departments')
            .select('*')
            .eq('is_active', true)
            .order('name')

        if (error) throw error
        return data || []
    },
}

export const agencyService = {
    async getAll() {
        const { data, error } = await supabase
            .from('agencies')
            .select('*')
            .eq('is_active', true)
            .order('name')

        if (error) throw error
        return data || []
    },
}

// =====================================================================================
// DASHBOARD STATS
// =====================================================================================

export const dashboardService = {
    /**
     * Get daily attendance summary from materialized view
     */
    async getDailySummary(date?: string) {
        const { data, error } = await supabase
            .from('mv_daily_attendance_summary')
            .select('*')
            .eq('date', date || new Date().toISOString().split('T')[0])

        if (error) throw error
        return data || []
    },

    /**
     * Get monthly summary for an employee
     */
    async getEmployeeMonthlySummary(employeeId: string, month?: string) {
        const monthDate = month || new Date().toISOString().slice(0, 7) + '-01'

        const { data, error } = await supabase
            .from('mv_monthly_attendance_summary')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('month', monthDate)
            .single()

        if (error) {
            if (error.code === 'PGRST116') return null
            throw error
        }
        return data
    },

    /**
     * Refresh materialized views
     */
    async refreshSummaries() {
        const { error } = await supabase.rpc('refresh_attendance_summaries')
        if (error) throw error
    },
}

// =====================================================================================
// LOOKUP TABLES
// =====================================================================================

export const lookupService = {
    async getGenders() {
        const { data, error } = await supabase
            .from('genders')
            .select('*')
            .order('name')
        if (error) throw error
        return data || []
    },
    async getMaritalStatuses() {
        const { data, error } = await supabase
            .from('marital_statuses')
            .select('*')
            .order('name')
        if (error) throw error
        return data || []
    },
    async getEmploymentTypes() {
        const { data, error } = await supabase
            .from('employment_types')
            .select('*')
            .order('name')
        if (error) throw error
        return data || []
    }
}

// =====================================================================================
// EXPORT ALL SERVICES
// =====================================================================================

export const db = {
    employees: employeeService,
    biometric: biometricService,
    attendance: attendanceService,
    departments: departmentService,
    agencies: agencyService,
    dashboard: dashboardService,
    lookups: lookupService,
}

// Default export
export default db
