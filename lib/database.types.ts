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
            audit_logs: {
                Row: {
                    credential_id: string | null
                    employee_id: string | null
                    entity_id: string | null
                    error_message: string | null
                    event_type: string
                    id: string
                    ip_address: string | null
                    metadata: Json | null
                    success: boolean | null
                    timestamp: string | null
                    user_agent: string | null
                }
                Insert: {
                    credential_id?: string | null
                    employee_id?: string | null
                    entity_id?: string | null
                    error_message?: string | null
                    event_type: string
                    id?: string
                    ip_address?: string | null
                    metadata?: Json | null
                    success?: boolean | null
                    timestamp?: string | null
                    user_agent?: string | null
                }
                Update: {
                    credential_id?: string | null
                    employee_id?: string | null
                    entity_id?: string | null
                    error_message?: string | null
                    event_type?: string
                    id?: string
                    ip_address?: string | null
                    metadata?: Json | null
                    success?: boolean | null
                    timestamp?: string | null
                    user_agent?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "audit_logs_employee_id_fkey"
                        columns: ["employee_id"]
                        isOneToOne: false
                        referencedRelation: "employees"
                        referencedColumns: ["id"]
                    },
                ]
            }
            biometric_credentials: {
                Row: {
                    counter: number | null
                    created_at: string | null
                    credential_id: string
                    device_type: string | null
                    employee_id: string | null
                    fingerprint_id: string | null
                    id: string
                    is_active: boolean | null
                    last_used_at: string | null
                    public_key: string
                }
                Insert: {
                    counter?: number | null
                    created_at?: string | null
                    credential_id: string
                    device_type?: string | null
                    employee_id?: string | null
                    fingerprint_id?: string | null
                    id?: string
                    is_active?: boolean | null
                    last_used_at?: string | null
                    public_key: string
                }
                Update: {
                    counter?: number | null
                    created_at?: string | null
                    credential_id?: string
                    device_type?: string | null
                    employee_id?: string | null
                    fingerprint_id?: string | null
                    id?: string
                    is_active?: boolean | null
                    last_used_at?: string | null
                    public_key?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "biometric_credentials_employee_id_fkey"
                        columns: ["employee_id"]
                        isOneToOne: false
                        referencedRelation: "employees"
                        referencedColumns: ["id"]
                    },
                ]
            }
            departments: {
                Row: {
                    created_at: string | null
                    date_join: string | null
                    description: string | null
                    employment_type: string | null
                    id: string
                    is_active: boolean | null
                    job_title: string | null
                    name: string
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string | null
                    date_join?: string | null
                    description?: string | null
                    employment_type?: string | null
                    id?: string
                    is_active?: boolean | null
                    job_title?: string | null
                    name: string
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string | null
                    date_join?: string | null
                    description?: string | null
                    employment_type?: string | null
                    id?: string
                    is_active?: boolean | null
                    job_title?: string | null
                    name?: string
                    updated_at?: string | null
                }
                Relationships: []
            }
            employees: {
                Row: {
                    address: string | null
                    agency_id: string | null
                    created_at: string | null
                    date_join: string | null
                    department_id: string | null
                    education: string | null
                    email: string | null
                    emergency_contact: string | null
                    emp_id: string | null
                    employment_type: string | null
                    gender: string | null
                    id: string
                    is_active: boolean | null
                    job_title: string | null
                    marital_status: string | null
                    name: string
                    updated_at: string | null
                }
                Insert: {
                    address?: string | null
                    agency_id?: string | null
                    created_at?: string | null
                    date_join?: string | null
                    department_id?: string | null
                    education?: string | null
                    email?: string | null
                    emergency_contact?: string | null
                    emp_id?: string | null
                    employment_type?: string | null
                    gender?: string | null
                    id?: string
                    is_active?: boolean | null
                    job_title?: string | null
                    marital_status?: string | null
                    name: string
                    updated_at?: string | null
                }
                Update: {
                    address?: string | null
                    agency_id?: string | null
                    created_at?: string | null
                    date_join?: string | null
                    department_id?: string | null
                    education?: string | null
                    email?: string | null
                    emergency_contact?: string | null
                    emp_id?: string | null
                    employment_type?: string | null
                    gender?: string | null
                    id?: string
                    is_active?: boolean | null
                    job_title?: string | null
                    marital_status?: string | null
                    name?: string
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
                ]
            }
            employment_types: {
                Row: {
                    created_at: string | null
                    id: string
                    name: string
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    name: string
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    name?: string
                }
                Relationships: []
            }
            function_call_audit: {
                Row: {
                    called_at: string
                    caller_user_id: string | null
                    function_name: string
                    id: string
                    note: string | null
                    outcome: string
                    target_employee_id: string | null
                }
                Insert: {
                    called_at?: string
                    caller_user_id?: string | null
                    function_name: string
                    id?: string
                    note?: string | null
                    outcome: string
                    target_employee_id?: string | null
                }
                Update: {
                    called_at?: string
                    caller_user_id?: string | null
                    function_name?: string
                    id?: string
                    note?: string | null
                    outcome?: string
                    target_employee_id?: string | null
                }
                Relationships: []
            }
            genders: {
                Row: {
                    created_at: string | null
                    id: string
                    name: string
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    name: string
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    name?: string
                }
                Relationships: []
            }
            marital_statuses: {
                Row: {
                    created_at: string | null
                    id: string
                    name: string
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    name: string
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    name?: string
                }
                Relationships: []
            }
        }
        Views: {
            mv_daily_attendance_summary: {
                Row: {
                    absent_count: number | null
                    attendance_rate: number | null
                    date: string | null
                    late_count: number | null
                    on_time_count: number | null
                    total_employees: number | null
                }
                Relationships: []
            }
            mv_monthly_attendance_summary: {
                Row: {
                    absent_days: number | null
                    attendance_rate: number | null
                    employee_id: string | null
                    late_days: number | null
                    month: string | null
                    name: string | null
                    on_time_days: number | null
                    total_days: number | null
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
        }
        Functions: {
            clock_in_employee: {
                Args: {
                    p_emp_id: string
                    p_verification_method: string
                }
                Returns: Json
            }
            clock_out_employee: {
                Args: {
                    p_emp_id: string
                }
                Returns: Json
            }
            get_employee_status_today: {
                Args: {
                    p_emp_id: string
                }
                Returns: Json
            }
            refresh_attendance_summaries: {
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

type PublicSchema = Database["public"]

export type Tables<
    PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
> = (PublicSchema["Tables"] & PublicSchema["Views"])[PublicTableNameOrOptions] extends {
    Row: infer R
}
    ? R
    : never

export type TablesInsert<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
> = PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Insert: infer I
}
    ? I
    : never

export type TablesUpdate<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
> = PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Update: infer U
}
    ? U
    : never

export type Enums<
    PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
> = PublicSchema["Enums"][PublicEnumNameOrOptions]

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
> = PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
