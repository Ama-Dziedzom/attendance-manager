export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "13.0.5"
    }
    public: {
        Tables: {
            agencies: {
                Row: {
                    address: string | null
                    contact_info: Json | null
                    created_at: string | null
                    id: string
                    is_active: boolean | null
                    name: string
                    updated_at: string | null
                }
                Insert: {
                    address?: string | null
                    contact_info?: Json | null
                    created_at?: string | null
                    id?: string
                    is_active?: boolean | null
                    name: string
                    updated_at?: string | null
                }
                Update: {
                    address?: string | null
                    contact_info?: Json | null
                    created_at?: string | null
                    id?: string
                    is_active?: boolean | null
                    name?: string
                    updated_at?: string | null
                }
                Relationships: []
            }
            attendance_records: {
                Row: {
                    clock_in_time: string
                    clock_out_time: string | null
                    created_at: string | null
                    date: string
                    employee_id: string
                    id: string
                    status: string
                    total_hours: number | null
                    updated_at: string | null
                    verification_method: string
                }
                Insert: {
                    clock_in_time: string
                    clock_out_time?: string | null
                    created_at?: string | null
                    date: string
                    employee_id: string
                    id?: string
                    status?: string
                    total_hours?: number | null
                    updated_at?: string | null
                    verification_method?: string
                }
                Update: {
                    clock_in_time?: string
                    clock_out_time?: string | null
                    created_at?: string | null
                    date?: string
                    employee_id?: string
                    id?: string
                    status?: string
                    total_hours?: number | null
                    updated_at?: string | null
                    verification_method?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "attendance_records_employee_id_fkey"
                        columns: ["employee_id"]
                        isOneToOne: false
                        referencedRelation: "employees"
                        referencedColumns: ["id"]
                    },
                ]
            }
            biometric_templates: {
                Row: {
                    created_at: string | null
                    employee_id: string
                    id: string
                    is_active: boolean | null
                    last_used_at: string | null
                    template_data: string
                    template_type: string
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string | null
                    employee_id: string
                    id?: string
                    is_active?: boolean | null
                    last_used_at?: string | null
                    template_data: string
                    template_type?: string
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string | null
                    employee_id?: string
                    id?: string
                    is_active?: boolean | null
                    last_used_at?: string | null
                    template_data?: string
                    template_type?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "biometric_templates_employee_id_fkey"
                        columns: ["employee_id"]
                        isOneToOne: false
                        referencedRelation: "employees"
                        referencedColumns: ["id"]
                    },
                ]
            }
            departments: {
                Row: {
                    code: string | null
                    created_at: string | null
                    description: string | null
                    head_id: string | null
                    id: string
                    is_active: boolean | null
                    name: string
                    parent_department_id: string | null
                    updated_at: string | null
                }
                Insert: {
                    code?: string | null
                    created_at?: string | null
                    description?: string | null
                    head_id?: string | null
                    id?: string
                    is_active?: boolean | null
                    name: string
                    parent_department_id?: string | null
                    updated_at?: string | null
                }
                Update: {
                    code?: string | null
                    created_at?: string | null
                    description?: string | null
                    head_id?: string | null
                    id?: string
                    is_active?: boolean | null
                    name?: string
                    parent_department_id?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "departments_head_id_fkey"
                        columns: ["head_id"]
                        isOneToOne: false
                        referencedRelation: "employees"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "departments_parent_department_id_fkey"
                        columns: ["parent_department_id"]
                        isOneToOne: false
                        referencedRelation: "departments"
                        referencedColumns: ["id"]
                    },
                ]
            }
            employee_leave_balances: {
                Row: {
                    available_days: number | null
                    created_at: string | null
                    employee_id: string
                    id: string
                    leave_type_id: string
                    pending_days: number | null
                    total_allocated: number | null
                    updated_at: string | null
                    used_days: number | null
                    year: number
                }
                Insert: {
                    available_days?: number | null
                    created_at?: string | null
                    employee_id: string
                    id?: string
                    leave_type_id: string
                    pending_days?: number | null
                    total_allocated?: number | null
                    updated_at?: string | null
                    used_days?: number | null
                    year: number
                }
                Update: {
                    available_days?: number | null
                    created_at?: string | null
                    employee_id?: string
                    id?: string
                    leave_type_id?: string
                    pending_days?: number | null
                    total_allocated?: number | null
                    updated_at?: string | null
                    used_days?: number | null
                    year?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "employee_leave_balances_employee_id_fkey"
                        columns: ["employee_id"]
                        isOneToOne: false
                        referencedRelation: "employees"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "employee_leave_balances_leave_type_id_fkey"
                        columns: ["leave_type_id"]
                        isOneToOne: false
                        referencedRelation: "leave_types"
                        referencedColumns: ["id"]
                    },
                ]
            }
            employee_shift_assignments: {
                Row: {
                    assigned_at: string | null
                    assigned_by: string | null
                    effective_from: string
                    effective_to: string | null
                    employee_id: string
                    id: string
                    notes: string | null
                    shift_id: string
                }
                Insert: {
                    assigned_at?: string | null
                    assigned_by?: string | null
                    effective_from?: string
                    effective_to?: string | null
                    employee_id: string
                    id?: string
                    notes?: string | null
                    shift_id: string
                }
                Update: {
                    assigned_at?: string | null
                    assigned_by?: string | null
                    effective_from?: string
                    effective_to?: string | null
                    employee_id?: string
                    id?: string
                    notes?: string | null
                    shift_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "employee_shift_assignments_assigned_by_fkey"
                        columns: ["assigned_by"]
                        isOneToOne: false
                        referencedRelation: "employees"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "employee_shift_assignments_employee_id_fkey"
                        columns: ["employee_id"]
                        isOneToOne: false
                        referencedRelation: "employees"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "employee_shift_assignments_shift_id_fkey"
                        columns: ["shift_id"]
                        isOneToOne: false
                        referencedRelation: "shifts"
                        referencedColumns: ["id"]
                    },
                ]
            }
            employees: {
                Row: {
                    agency_id: string | null
                    created_at: string | null
                    department_id: string | null
                    email: string | null
                    emp_id: string
                    employee_type: string | null
                    hire_date: string | null
                    id: string
                    is_active: boolean | null
                    job_title_id: string | null
                    manager_id: string | null
                    name: string
                    primary_location_id: string | null
                    updated_at: string | null
                }
                Insert: {
                    agency_id?: string | null
                    created_at?: string | null
                    department_id?: string | null
                    email?: string | null
                    emp_id: string
                    employee_type?: string | null
                    hire_date?: string | null
                    id?: string
                    is_active?: boolean | null
                    job_title_id?: string | null
                    manager_id?: string | null
                    name: string
                    primary_location_id?: string | null
                    updated_at?: string | null
                }
                Update: {
                    agency_id?: string | null
                    created_at?: string | null
                    department_id?: string | null
                    email?: string | null
                    emp_id?: string
                    employee_type?: string | null
                    hire_date?: string | null
                    id?: string
                    is_active?: boolean | null
                    job_title_id?: string | null
                    manager_id?: string | null
                    name?: string
                    primary_location_id?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "employees_agency_id_fkey"
                        columns: ["agency_id"]
                        isOneToOne: false
                        referencedRelation: "agencies"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "employees_department_id_fkey"
                        columns: ["department_id"]
                        isOneToOne: false
                        referencedRelation: "departments"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "employees_job_title_id_fkey"
                        columns: ["job_title_id"]
                        isOneToOne: false
                        referencedRelation: "job_titles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "employees_manager_id_fkey"
                        columns: ["manager_id"]
                        isOneToOne: false
                        referencedRelation: "employees"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "employees_primary_location_id_fkey"
                        columns: ["primary_location_id"]
                        isOneToOne: false
                        referencedRelation: "locations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            holidays: {
                Row: {
                    created_at: string | null
                    date: string
                    description: string | null
                    holiday_type: string | null
                    id: string
                    is_active: boolean | null
                    is_mandatory: boolean | null
                    location_id: string | null
                    name: string
                    updated_at: string | null
                    year: number | null
                }
                Insert: {
                    created_at?: string | null
                    date: string
                    description?: string | null
                    holiday_type?: string | null
                    id?: string
                    is_active?: boolean | null
                    is_mandatory?: boolean | null
                    location_id?: string | null
                    name: string
                    updated_at?: string | null
                    year?: number | null
                }
                Update: {
                    created_at?: string | null
                    date?: string
                    description?: string | null
                    holiday_type?: string | null
                    id?: string
                    is_active?: boolean | null
                    is_mandatory?: boolean | null
                    location_id?: string | null
                    name?: string
                    updated_at?: string | null
                    year?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "holidays_location_id_fkey"
                        columns: ["location_id"]
                        isOneToOne: false
                        referencedRelation: "locations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            job_titles: {
                Row: {
                    created_at: string | null
                    department_id: string | null
                    description: string | null
                    id: string
                    is_active: boolean | null
                    level: number | null
                    reports_to_title_id: string | null
                    title: string
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string | null
                    department_id?: string | null
                    description?: string | null
                    id?: string
                    is_active?: boolean | null
                    level?: number | null
                    reports_to_title_id?: string | null
                    title: string
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string | null
                    department_id?: string | null
                    description?: string | null
                    id?: string
                    is_active?: boolean | null
                    level?: number | null
                    reports_to_title_id?: string | null
                    title?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "job_titles_department_id_fkey"
                        columns: ["department_id"]
                        isOneToOne: false
                        referencedRelation: "departments"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "job_titles_reports_to_title_id_fkey"
                        columns: ["reports_to_title_id"]
                        isOneToOne: false
                        referencedRelation: "job_titles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            leave_requests: {
                Row: {
                    cancelled_at: string | null
                    cancellation_reason: string | null
                    created_at: string | null
                    employee_id: string
                    end_date: string
                    half_day_period: string | null
                    id: string
                    is_half_day: boolean | null
                    leave_type_id: string
                    reason: string
                    review_notes: string | null
                    reviewed_at: string | null
                    reviewed_by: string | null
                    start_date: string
                    status: string
                    total_days: number
                    updated_at: string | null
                }
                Insert: {
                    cancelled_at?: string | null
                    cancellation_reason?: string | null
                    created_at?: string | null
                    employee_id: string
                    end_date: string
                    half_day_period?: string | null
                    id?: string
                    is_half_day?: boolean | null
                    leave_type_id: string
                    reason: string
                    review_notes?: string | null
                    reviewed_at?: string | null
                    reviewed_by?: string | null
                    start_date: string
                    status?: string
                    total_days: number
                    updated_at?: string | null
                }
                Update: {
                    cancelled_at?: string | null
                    cancellation_reason?: string | null
                    created_at?: string | null
                    employee_id?: string
                    end_date?: string
                    half_day_period?: string | null
                    id?: string
                    is_half_day?: boolean | null
                    leave_type_id?: string
                    reason?: string
                    review_notes?: string | null
                    reviewed_at?: string | null
                    reviewed_by?: string | null
                    start_date?: string
                    status?: string
                    total_days?: number
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "leave_requests_employee_id_fkey"
                        columns: ["employee_id"]
                        isOneToOne: false
                        referencedRelation: "employees"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "leave_requests_leave_type_id_fkey"
                        columns: ["leave_type_id"]
                        isOneToOne: false
                        referencedRelation: "leave_types"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "leave_requests_reviewed_by_fkey"
                        columns: ["reviewed_by"]
                        isOneToOne: false
                        referencedRelation: "employees"
                        referencedColumns: ["id"]
                    },
                ]
            }
            leave_types: {
                Row: {
                    can_carry_forward: boolean | null
                    code: string
                    color_code: string | null
                    created_at: string | null
                    description: string | null
                    id: string
                    is_active: boolean | null
                    is_paid: boolean | null
                    max_carry_forward_days: number | null
                    max_days_per_year: number | null
                    min_advance_days: number | null
                    name: string
                    requires_approval: boolean | null
                    updated_at: string | null
                }
                Insert: {
                    can_carry_forward?: boolean | null
                    code: string
                    color_code?: string | null
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    is_active?: boolean | null
                    is_paid?: boolean | null
                    max_carry_forward_days?: number | null
                    max_days_per_year?: number | null
                    min_advance_days?: number | null
                    name: string
                    requires_approval?: boolean | null
                    updated_at?: string | null
                }
                Update: {
                    can_carry_forward?: boolean | null
                    code?: string
                    color_code?: string | null
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    is_active?: boolean | null
                    is_paid?: boolean | null
                    max_carry_forward_days?: number | null
                    max_days_per_year?: number | null
                    min_advance_days?: number | null
                    name?: string
                    requires_approval?: boolean | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            locations: {
                Row: {
                    address: string | null
                    city: string | null
                    code: string | null
                    contact_email: string | null
                    contact_person: string | null
                    contact_phone: string | null
                    country: string | null
                    created_at: string | null
                    id: string
                    is_active: boolean | null
                    latitude: number | null
                    longitude: number | null
                    name: string
                    postal_code: string | null
                    state: string | null
                    timezone: string | null
                    updated_at: string | null
                }
                Insert: {
                    address?: string | null
                    city?: string | null
                    code?: string | null
                    contact_email?: string | null
                    contact_person?: string | null
                    contact_phone?: string | null
                    country?: string | null
                    created_at?: string | null
                    id?: string
                    is_active?: boolean | null
                    latitude?: number | null
                    longitude?: number | null
                    name: string
                    postal_code?: string | null
                    state?: string | null
                    timezone?: string | null
                    updated_at?: string | null
                }
                Update: {
                    address?: string | null
                    city?: string | null
                    code?: string | null
                    contact_email?: string | null
                    contact_person?: string | null
                    contact_phone?: string | null
                    country?: string | null
                    created_at?: string | null
                    id?: string
                    is_active?: boolean | null
                    latitude?: number | null
                    longitude?: number | null
                    name?: string
                    postal_code?: string | null
                    state?: string | null
                    timezone?: string | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            overtime_records: {
                Row: {
                    approved_at: string | null
                    approved_by: string | null
                    attendance_record_id: string | null
                    created_at: string | null
                    date: string
                    employee_id: string
                    id: string
                    is_approved: boolean | null
                    is_paid: boolean | null
                    notes: string | null
                    overtime_hours: number
                    overtime_type: string
                    paid_at: string | null
                    rate_multiplier: number | null
                    reason: string | null
                    updated_at: string | null
                }
                Insert: {
                    approved_at?: string | null
                    approved_by?: string | null
                    attendance_record_id?: string | null
                    created_at?: string | null
                    date: string
                    employee_id: string
                    id?: string
                    is_approved?: boolean | null
                    is_paid?: boolean | null
                    notes?: string | null
                    overtime_hours: number
                    overtime_type?: string
                    paid_at?: string | null
                    rate_multiplier?: number | null
                    reason?: string | null
                    updated_at?: string | null
                }
                Update: {
                    approved_at?: string | null
                    approved_by?: string | null
                    attendance_record_id?: string | null
                    created_at?: string | null
                    date?: string
                    employee_id?: string
                    id?: string
                    is_approved?: boolean | null
                    is_paid?: boolean | null
                    notes?: string | null
                    overtime_hours?: number
                    overtime_type?: string
                    paid_at?: string | null
                    rate_multiplier?: number | null
                    reason?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "overtime_records_approved_by_fkey"
                        columns: ["approved_by"]
                        isOneToOne: false
                        referencedRelation: "employees"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "overtime_records_attendance_record_id_fkey"
                        columns: ["attendance_record_id"]
                        isOneToOne: false
                        referencedRelation: "attendance_records"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "overtime_records_employee_id_fkey"
                        columns: ["employee_id"]
                        isOneToOne: false
                        referencedRelation: "employees"
                        referencedColumns: ["id"]
                    },
                ]
            }
            shifts: {
                Row: {
                    break_duration_minutes: number | null
                    color_code: string | null
                    created_at: string | null
                    description: string | null
                    end_time: string
                    grace_period_minutes: number | null
                    id: string
                    is_active: boolean | null
                    name: string
                    start_time: string
                    updated_at: string | null
                    working_days: number[] | null
                }
                Insert: {
                    break_duration_minutes?: number | null
                    color_code?: string | null
                    created_at?: string | null
                    description?: string | null
                    end_time: string
                    grace_period_minutes?: number | null
                    id?: string
                    is_active?: boolean | null
                    name: string
                    start_time: string
                    updated_at?: string | null
                    working_days?: number[] | null
                }
                Update: {
                    break_duration_minutes?: number | null
                    color_code?: string | null
                    created_at?: string | null
                    description?: string | null
                    end_time?: string
                    grace_period_minutes?: number | null
                    id?: string
                    is_active?: boolean | null
                    name?: string
                    start_time?: string
                    updated_at?: string | null
                    working_days?: number[] | null
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            calculate_total_hours: {
                Args: Record<PropertyKey, never>
                Returns: undefined
            }
            calculate_working_days: {
                Args: {
                    p_start_date: string
                    p_end_date: string
                    p_location_id?: string
                }
                Returns: number
            }
            clock_in_employee: {
                Args: {
                    p_emp_id: string
                    p_verification_method?: string
                }
                Returns: Json
            }
            clock_out_employee: {
                Args: {
                    p_emp_id: string
                }
                Returns: Json
            }
            get_current_employee_id: {
                Args: Record<PropertyKey, never>
                Returns: string
            }
            get_employee_current_shift: {
                Args: {
                    p_employee_id: string
                    p_date?: string
                }
                Returns: {
                    shift_id: string
                    shift_name: string
                    start_time: string
                    end_time: string
                    grace_period_minutes: number
                }[]
            }
            get_employee_status_today: {
                Args: {
                    p_emp_id: string
                }
                Returns: Json
            }
            is_admin: {
                Args: Record<PropertyKey, never>
                Returns: boolean
            }
            is_department_manager: {
                Args: {
                    dept_id: string
                }
                Returns: boolean
            }
            refresh_attendance_summaries: {
                Args: Record<PropertyKey, never>
                Returns: undefined
            }
            request_leave: {
                Args: {
                    p_employee_id: string
                    p_leave_type_id: string
                    p_start_date: string
                    p_end_date: string
                    p_reason: string
                    p_is_half_day?: boolean
                    p_half_day_period?: string
                }
                Returns: Json
            }
            review_leave_request: {
                Args: {
                    p_request_id: string
                    p_reviewer_id: string
                    p_action: string
                    p_notes?: string
                }
                Returns: Json
            }
            update_biometric_last_used: {
                Args: Record<PropertyKey, never>
                Returns: undefined
            }
            update_updated_at_column: {
                Args: Record<PropertyKey, never>
                Returns: undefined
            }
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<
    keyof DatabaseWithoutInternals,
    "public"
>]

export type Tables<
    DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
    }
    ? U
    : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never

export type Enums<
    DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
    EnumName extends DefaultSchemaEnumNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
    public: {
        Enums: {},
    },
} as const
