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
                    agency_code: string | null
                    contact_info: Json | null
                    created_at: string | null
                    id: string
                    is_active: boolean | null
                    name: string
                    updated_at: string | null
                }
                Insert: {
                    address?: string | null
                    agency_code?: string | null
                    contact_info?: Json | null
                    created_at?: string | null
                    id?: string
                    is_active?: boolean | null
                    name: string
                    updated_at?: string | null
                }
                Update: {
                    address?: string | null
                    agency_code?: string | null
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
                    action: string
                    created_at: string | null
                    details: Json | null
                    id: string
                    table_name: string
                    user_id: string | null
                }
                Insert: {
                    action: string
                    created_at?: string | null
                    details?: Json | null
                    id?: string
                    table_name: string
                    user_id?: string | null
                }
                Update: {
                    action?: string
                    created_at?: string | null
                    details?: Json | null
                    id?: string
                    table_name?: string
                    user_id?: string | null
                }
                Relationships: []
            }
            biometric_credentials: {
                Row: {
                    counter: number | null
                    credential_id: string
                    device_type: string | null
                    employee_id: string
                    fingerprint_id: string | null
                    id: string
                    is_active: boolean | null
                    last_used_at: string | null
                    public_key: string
                    registered_at: string | null
                }
                Insert: {
                    counter?: number | null
                    credential_id: string
                    device_type?: string | null
                    employee_id: string
                    fingerprint_id?: string | null
                    id?: string
                    is_active?: boolean | null
                    last_used_at?: string | null
                    public_key: string
                    registered_at?: string | null
                }
                Update: {
                    counter?: number | null
                    credential_id?: string
                    device_type?: string | null
                    employee_id?: string
                    fingerprint_id?: string | null
                    id?: string
                    is_active?: boolean | null
                    last_used_at?: string | null
                    public_key?: string
                    registered_at?: string | null
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
                    description: string | null
                    id: string
                    is_active: boolean | null
                    name: string
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    is_active?: boolean | null
                    name: string
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    is_active?: boolean | null
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
                    emp_id: string
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
            profiles: {
                Row: {
                    created_at: string | null
                    email: string
                    full_name: string | null
                    id: string
                    role: Database["public"]["Enums"]["app_role"]
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string | null
                    email: string
                    full_name?: string | null
                    id: string
                    role?: Database["public"]["Enums"]["app_role"]
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string | null
                    email?: string
                    full_name?: string | null
                    id?: string
                    role?: Database["public"]["Enums"]["app_role"]
                    updated_at?: string | null
                }
                Relationships: []
            }
        }
        Views: {
            mv_daily_attendance_summary: {
                Row: {
                    absent_count: number | null
                    attendance_date: string | null
                    late_count: number | null
                    on_time_count: number | null
                    present_count: number | null
                    total_employees: number | null
                }
                Relationships: []
            }
            mv_monthly_attendance_summary: {
                Row: {
                    absent_count: number | null
                    avg_hours: number | null
                    month_date: string | null
                    present_count: number | null
                    total_employees: number | null
                }
                Relationships: []
            }
        }
        Functions: {
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
            generate_employee_id: {
                Args: {
                    agency_id_param: string
                }
                Returns: string
            }
            get_employee_status_today: {
                Args: {
                    p_emp_id: string
                }
                Returns: Json
            }
            refresh_attendance_summaries: {
                Args: Record<string, never>
                Returns: undefined
            }
        }
        Enums: {
            app_role: "it" | "hr" | "front_desk"
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

type PublicSchemaName = Extract<keyof Database, "public">

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[PublicSchemaName]

export type Tables<
    PublicTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends PublicTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof (DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? (DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : PublicTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[PublicTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

export type TablesInsert<
    PublicTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends PublicTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : PublicTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    PublicTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends PublicTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
    public: {
        Enums: {
            app_role: ["it", "hr", "front_desk"],
        },
    },
} as const
