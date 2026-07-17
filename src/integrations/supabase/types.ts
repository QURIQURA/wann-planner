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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      finance_business_inputs: {
        Row: {
          airbnbs: Json
          id: number
          models: Json
          planters: Json
          updated_at: string
        }
        Insert: {
          airbnbs?: Json
          id?: number
          models?: Json
          planters?: Json
          updated_at?: string
        }
        Update: {
          airbnbs?: Json
          id?: number
          models?: Json
          planters?: Json
          updated_at?: string
        }
        Relationships: []
      }
      finance_categories: {
        Row: {
          created_at: string
          is_custom: boolean
          is_income: boolean
          name: string
        }
        Insert: {
          created_at?: string
          is_custom?: boolean
          is_income?: boolean
          name: string
        }
        Update: {
          created_at?: string
          is_custom?: boolean
          is_income?: boolean
          name?: string
        }
        Relationships: []
      }
      finance_category_rules: {
        Row: {
          category: string
          created_at: string
          id: string
          keyword: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          keyword: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          keyword?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_category_rules_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["name"]
          },
        ]
      }
      finance_discussion: {
        Row: {
          created_at: string
          goals: Json
          highlights: string | null
          month: string
          problems: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          goals?: Json
          highlights?: string | null
          month: string
          problems?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          goals?: Json
          highlights?: string | null
          month?: string
          problems?: Json
          updated_at?: string
        }
        Relationships: []
      }
      finance_expense_type_overrides: {
        Row: {
          category: string
          created_at: string
          type: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          type: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_expense_type_overrides_category_fkey"
            columns: ["category"]
            isOneToOne: true
            referencedRelation: "finance_categories"
            referencedColumns: ["name"]
          },
        ]
      }
      finance_import_history: {
        Row: {
          added_count: number
          duplicate_count: number
          filename: string
          id: string
          imported_at: string
          source: string
          total_count: number
        }
        Insert: {
          added_count?: number
          duplicate_count?: number
          filename: string
          id?: string
          imported_at?: string
          source?: string
          total_count?: number
        }
        Update: {
          added_count?: number
          duplicate_count?: number
          filename?: string
          id?: string
          imported_at?: string
          source?: string
          total_count?: number
        }
        Relationships: []
      }
      finance_loans: {
        Row: {
          annual_rate: number
          created_at: string
          extra_repayment: number
          id: string
          loan_balance: number
          name: string
          offset_balance: number
          start_date: string
          term_months: number
          updated_at: string
        }
        Insert: {
          annual_rate?: number
          created_at?: string
          extra_repayment?: number
          id?: string
          loan_balance?: number
          name: string
          offset_balance?: number
          start_date?: string
          term_months?: number
          updated_at?: string
        }
        Update: {
          annual_rate?: number
          created_at?: string
          extra_repayment?: number
          id?: string
          loan_balance?: number
          name?: string
          offset_balance?: number
          start_date?: string
          term_months?: number
          updated_at?: string
        }
        Relationships: []
      }
      finance_monthly_balance: {
        Row: {
          closing_balance: number
          created_at: string
          month: string
          updated_at: string
        }
        Insert: {
          closing_balance?: number
          created_at?: string
          month: string
          updated_at?: string
        }
        Update: {
          closing_balance?: number
          created_at?: string
          month?: string
          updated_at?: string
        }
        Relationships: []
      }
      finance_net_worth: {
        Row: {
          created_at: string
          id: string
          month: string
          notes: string | null
          other_assets: number
          property_value: number
          super_balance: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          month: string
          notes?: string | null
          other_assets?: number
          property_value?: number
          super_balance?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          month?: string
          notes?: string | null
          other_assets?: number
          property_value?: number
          super_balance?: number
          updated_at?: string
        }
        Relationships: []
      }
      finance_planning_inputs: {
        Row: {
          assets: Json
          business_annual: Json
          car_enabled: boolean
          car_insurance_rate_pct: number
          car_scenarios: Json
          company_tax_rate: number
          id: number
          income_sources: Json
          lifestyle_items: Json
          living_monthly: Json
          passive_streams: Json
          personal_gross_up_rate: number
          renovation_stages: Json
          savings_lines: Json
          selected_car_id: string | null
          updated_at: string
        }
        Insert: {
          assets?: Json
          business_annual?: Json
          car_enabled?: boolean
          car_insurance_rate_pct?: number
          car_scenarios?: Json
          company_tax_rate?: number
          id?: number
          income_sources?: Json
          lifestyle_items?: Json
          living_monthly?: Json
          passive_streams?: Json
          personal_gross_up_rate?: number
          renovation_stages?: Json
          savings_lines?: Json
          selected_car_id?: string | null
          updated_at?: string
        }
        Update: {
          assets?: Json
          business_annual?: Json
          car_enabled?: boolean
          car_insurance_rate_pct?: number
          car_scenarios?: Json
          company_tax_rate?: number
          id?: number
          income_sources?: Json
          lifestyle_items?: Json
          living_monthly?: Json
          passive_streams?: Json
          personal_gross_up_rate?: number
          renovation_stages?: Json
          savings_lines?: Json
          selected_car_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      finance_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string
          id: string
          memo: string | null
          reconciled: boolean
          split_from_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          date: string
          description: string
          id?: string
          memo?: string | null
          reconciled?: boolean
          split_from_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          memo?: string | null
          reconciled?: boolean
          split_from_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_transactions_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "finance_transactions_split_from_id_fkey"
            columns: ["split_from_id"]
            isOneToOne: false
            referencedRelation: "finance_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      planner_events: {
        Row: {
          birth_year: number | null
          created_at: string
          date: string
          id: string
          is_recurring: boolean
          name: string
          notes: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_year?: number | null
          created_at?: string
          date: string
          id?: string
          is_recurring?: boolean
          name: string
          notes?: string | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_year?: number | null
          created_at?: string
          date?: string
          id?: string
          is_recurring?: boolean
          name?: string
          notes?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planner_multiple_task_items: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          parent_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          parent_id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          parent_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planner_multiple_task_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "planner_multiple_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      planner_multiple_tasks: {
        Row: {
          category_id: string | null
          created_at: string
          date: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          date?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          date?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planner_multiple_tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "planner_task_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      planner_task_categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          sort_order: number
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      planner_task_completions: {
        Row: {
          completed_at: string
          id: string
          occurrence_date: string
          task_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          occurrence_date: string
          task_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          occurrence_date?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planner_task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "planner_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      planner_task_subtags: {
        Row: {
          category_id: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planner_task_subtags_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "planner_task_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      planner_tasks: {
        Row: {
          category_id: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          due_date: string | null
          due_time: string | null
          id: string
          notes: string | null
          recurrence: string
          subtag_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          due_time?: string | null
          id?: string
          notes?: string | null
          recurrence?: string
          subtag_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          due_time?: string | null
          id?: string
          notes?: string | null
          recurrence?: string
          subtag_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planner_tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "planner_task_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planner_tasks_subtag_id_fkey"
            columns: ["subtag_id"]
            isOneToOne: false
            referencedRelation: "planner_task_subtags"
            referencedColumns: ["id"]
          },
        ]
      }
      planner_user_settings: {
        Row: {
          bg_color: string
          border_color: string
          created_at: string
          font: string
          text_color: string
          updated_at: string
          user_id: string
          widget_visibility: Json
        }
        Insert: {
          bg_color?: string
          border_color?: string
          created_at?: string
          font?: string
          text_color?: string
          updated_at?: string
          user_id: string
          widget_visibility?: Json
        }
        Update: {
          bg_color?: string
          border_color?: string
          created_at?: string
          font?: string
          text_color?: string
          updated_at?: string
          user_id?: string
          widget_visibility?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

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
