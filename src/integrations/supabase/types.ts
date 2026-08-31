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
      croijang_consumed_items: {
        Row: {
          category: string | null
          consume_count: number
          created_at: string
          first_consumed_at: string
          id: string
          last_consumed_at: string
          location: string | null
          name: string
          normalized_name: string
          total_quantity: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          consume_count?: number
          created_at?: string
          first_consumed_at?: string
          id?: string
          last_consumed_at?: string
          location?: string | null
          name: string
          normalized_name: string
          total_quantity?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          consume_count?: number
          created_at?: string
          first_consumed_at?: string
          id?: string
          last_consumed_at?: string
          location?: string | null
          name?: string
          normalized_name?: string
          total_quantity?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      croijang_meal_plans: {
        Row: {
          allergens: string[] | null
          created_at: string
          dish_name: string
          id: string
          plan_date: string
          recipe_id: string | null
          section: string
          slot: string
          sort_order: number
          substitutions: string | null
          updated_at: string
        }
        Insert: {
          allergens?: string[] | null
          created_at?: string
          dish_name: string
          id?: string
          plan_date: string
          recipe_id?: string | null
          section: string
          slot: string
          sort_order?: number
          substitutions?: string | null
          updated_at?: string
        }
        Update: {
          allergens?: string[] | null
          created_at?: string
          dish_name?: string
          id?: string
          plan_date?: string
          recipe_id?: string | null
          section?: string
          slot?: string
          sort_order?: number
          substitutions?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "croijang_meal_plans_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "croijang_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      croijang_purchases: {
        Row: {
          created_at: string
          grocery_category: string | null
          id: string
          items: Json
          photo_url: string | null
          purchase_date: string
          purchase_type: string
          store: string | null
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          grocery_category?: string | null
          id?: string
          items?: Json
          photo_url?: string | null
          purchase_date?: string
          purchase_type?: string
          store?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          grocery_category?: string | null
          id?: string
          items?: Json
          photo_url?: string | null
          purchase_date?: string
          purchase_type?: string
          store?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      croijang_recipes: {
        Row: {
          allergens: string[] | null
          calories: number | null
          carbs: number | null
          created_at: string
          cuisine: string | null
          difficulty: string | null
          dish_type: string | null
          fat: number | null
          fiber: number | null
          id: string
          ingredients: Json
          is_baby: boolean
          is_meal_kit: boolean
          meal_kit_brand: string | null
          name: string
          notes: string | null
          prep_time_minutes: number | null
          price: number | null
          protein: number | null
          servings: number
          source_url: string | null
          steps: string[] | null
          updated_at: string
        }
        Insert: {
          allergens?: string[] | null
          calories?: number | null
          carbs?: number | null
          created_at?: string
          cuisine?: string | null
          difficulty?: string | null
          dish_type?: string | null
          fat?: number | null
          fiber?: number | null
          id?: string
          ingredients?: Json
          is_baby?: boolean
          is_meal_kit?: boolean
          meal_kit_brand?: string | null
          name: string
          notes?: string | null
          prep_time_minutes?: number | null
          price?: number | null
          protein?: number | null
          servings?: number
          source_url?: string | null
          steps?: string[] | null
          updated_at?: string
        }
        Update: {
          allergens?: string[] | null
          calories?: number | null
          carbs?: number | null
          created_at?: string
          cuisine?: string | null
          difficulty?: string | null
          dish_type?: string | null
          fat?: number | null
          fiber?: number | null
          id?: string
          ingredients?: Json
          is_baby?: boolean
          is_meal_kit?: boolean
          meal_kit_brand?: string | null
          name?: string
          notes?: string | null
          prep_time_minutes?: number | null
          price?: number | null
          protein?: number | null
          servings?: number
          source_url?: string | null
          steps?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      croijang_settings: {
        Row: {
          custom_categories: Json | null
          id: string
          updated_at: string
        }
        Insert: {
          custom_categories?: Json | null
          id?: string
          updated_at?: string
        }
        Update: {
          custom_categories?: Json | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      croijang_storage_items: {
        Row: {
          category: string
          created_at: string
          id: string
          location: string
          name: string
          notes: string | null
          quantity: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          location: string
          name: string
          notes?: string | null
          quantity?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          notes?: string | null
          quantity?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
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
      household_members: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planner_baby_slot_logs: {
        Row: {
          created_at: string
          date: string
          end_time: string | null
          id: string
          note: string | null
          slot_type_id: string
          start_time: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          date: string
          end_time?: string | null
          id?: string
          note?: string | null
          slot_type_id: string
          start_time: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string | null
          id?: string
          note?: string | null
          slot_type_id?: string
          start_time?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planner_baby_slot_logs_slot_type_id_fkey"
            columns: ["slot_type_id"]
            isOneToOne: false
            referencedRelation: "planner_baby_slot_types"
            referencedColumns: ["id"]
          },
        ]
      }
      planner_baby_slot_types: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          sort_order: number
          tracks_duration: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          tracks_duration?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          tracks_duration?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      planner_diary_entries: {
        Row: {
          content_html: string
          created_at: string
          date: string
          has_sticker: boolean
          id: string
          preview: string
          thumbnail_sticker_path: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content_html?: string
          created_at?: string
          date: string
          has_sticker?: boolean
          id?: string
          preview?: string
          thumbnail_sticker_path?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content_html?: string
          created_at?: string
          date?: string
          has_sticker?: boolean
          id?: string
          preview?: string
          thumbnail_sticker_path?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planner_diary_photos: {
        Row: {
          created_at: string
          date: string
          id: string
          is_cover: boolean
          sort_order: number
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          is_cover?: boolean
          sort_order?: number
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          is_cover?: boolean
          sort_order?: number
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planner_event_notes: {
        Row: {
          created_at: string
          date: string | null
          event_id: string
          id: string
          note: string
          updated_at: string
          year: number | null
        }
        Insert: {
          created_at?: string
          date?: string | null
          event_id: string
          id?: string
          note: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          created_at?: string
          date?: string | null
          event_id?: string
          id?: string
          note?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "planner_event_notes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "planner_events"
            referencedColumns: ["id"]
          },
        ]
      }
      planner_event_types: {
        Row: {
          created_at: string
          default_color: string | null
          id: string
          is_archived: boolean
          is_system: boolean
          key: string
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_color?: string | null
          id?: string
          is_archived?: boolean
          is_system?: boolean
          key: string
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_color?: string | null
          id?: string
          is_archived?: boolean
          is_system?: boolean
          key?: string
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planner_events: {
        Row: {
          birth_year: number | null
          color: string | null
          created_at: string
          date: string
          id: string
          is_pinned: boolean
          is_recurring: boolean
          name: string
          notes: string | null
          show_day_count: boolean
          show_duration: boolean
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_year?: number | null
          color?: string | null
          created_at?: string
          date: string
          id?: string
          is_pinned?: boolean
          is_recurring?: boolean
          name: string
          notes?: string | null
          show_day_count?: boolean
          show_duration?: boolean
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_year?: number | null
          color?: string | null
          created_at?: string
          date?: string
          id?: string
          is_pinned?: boolean
          is_recurring?: boolean
          name?: string
          notes?: string | null
          show_day_count?: boolean
          show_duration?: boolean
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planner_habit_completions: {
        Row: {
          count: number
          created_at: string
          date: string
          habit_id: string
          id: string
          user_id: string
        }
        Insert: {
          count?: number
          created_at?: string
          date: string
          habit_id: string
          id?: string
          user_id: string
        }
        Update: {
          count?: number
          created_at?: string
          date?: string
          habit_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planner_habit_completions_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "planner_habits"
            referencedColumns: ["id"]
          },
        ]
      }
      planner_habits: {
        Row: {
          color: string | null
          created_at: string
          days_of_week: number[]
          habit_time: string | null
          id: string
          is_critical: boolean
          name: string
          routine_group_id: string | null
          sort_order: number
          target_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          days_of_week?: number[]
          habit_time?: string | null
          id?: string
          is_critical?: boolean
          name: string
          routine_group_id?: string | null
          sort_order?: number
          target_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          days_of_week?: number[]
          habit_time?: string | null
          id?: string
          is_critical?: boolean
          name?: string
          routine_group_id?: string | null
          sort_order?: number
          target_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planner_habits_routine_group_id_fkey"
            columns: ["routine_group_id"]
            isOneToOne: false
            referencedRelation: "planner_routine_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      planner_intentions: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          last_reviewed_at: string | null
          linked_project_id: string | null
          next_review_date: string | null
          notes: string | null
          review_interval: string
          review_interval_days: number | null
          sort_order: number
          stage: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          last_reviewed_at?: string | null
          linked_project_id?: string | null
          next_review_date?: string | null
          notes?: string | null
          review_interval?: string
          review_interval_days?: number | null
          sort_order?: number
          stage?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          last_reviewed_at?: string | null
          linked_project_id?: string | null
          next_review_date?: string | null
          notes?: string | null
          review_interval?: string
          review_interval_days?: number | null
          sort_order?: number
          stage?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planner_intentions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "planner_task_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planner_intentions_linked_project_id_fkey"
            columns: ["linked_project_id"]
            isOneToOne: false
            referencedRelation: "planner_multiple_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      planner_kora_orders: {
        Row: {
          created_at: string
          customer_name: string | null
          delivery_date: string | null
          id: string
          items: Json | null
          notes: string | null
          order_date: string | null
          status: string | null
          total_amount: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          delivery_date?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          order_date?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          delivery_date?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          order_date?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      planner_kora_setup_items: {
        Row: {
          category: string
          completed: boolean
          created_at: string
          id: string
          next_action_date: string | null
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          completed?: boolean
          created_at?: string
          id?: string
          next_action_date?: string | null
          sort_order?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          completed?: boolean
          created_at?: string
          id?: string
          next_action_date?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planner_monthly_hyatt_hours: {
        Row: {
          created_at: string
          hours: number
          id: string
          month: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hours?: number
          id?: string
          month: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hours?: number
          id?: string
          month?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planner_multiple_tasks: {
        Row: {
          category_id: string | null
          created_at: string
          date: string | null
          end_date: string | null
          id: string
          name: string
          subtag_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          date?: string | null
          end_date?: string | null
          id?: string
          name: string
          subtag_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          date?: string | null
          end_date?: string | null
          id?: string
          name?: string
          subtag_id?: string | null
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
          {
            foreignKeyName: "planner_multiple_tasks_subtag_id_fkey"
            columns: ["subtag_id"]
            isOneToOne: false
            referencedRelation: "planner_task_subtags"
            referencedColumns: ["id"]
          },
        ]
      }
      planner_recurring_task_exceptions: {
        Row: {
          created_at: string
          id: string
          new_date: string
          new_time: string | null
          original_date: string
          task_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          new_date: string
          new_time?: string | null
          original_date: string
          task_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          new_date?: string
          new_time?: string | null
          original_date?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planner_recurring_task_exceptions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "planner_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      planner_routine_groups: {
        Row: {
          created_at: string
          days_of_week: number[]
          id: string
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_of_week?: number[]
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_of_week?: number[]
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planner_stickers: {
        Row: {
          created_at: string
          id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: []
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
      planner_task_subitems: {
        Row: {
          completed: boolean
          content: string
          created_at: string
          id: string
          sort_order: number
          task_id: string
          time: string | null
          updated_at: string
        }
        Insert: {
          completed?: boolean
          content?: string
          created_at?: string
          id?: string
          sort_order?: number
          task_id: string
          time?: string | null
          updated_at?: string
        }
        Update: {
          completed?: boolean
          content?: string
          created_at?: string
          id?: string
          sort_order?: number
          task_id?: string
          time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planner_task_subitems_task_id_fkey"
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
          end_time: string | null
          id: string
          is_critical: boolean
          multiple_task_id: string | null
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
          end_time?: string | null
          id?: string
          is_critical?: boolean
          multiple_task_id?: string | null
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
          end_time?: string | null
          id?: string
          is_critical?: boolean
          multiple_task_id?: string | null
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
            foreignKeyName: "planner_tasks_multiple_task_id_fkey"
            columns: ["multiple_task_id"]
            isOneToOne: false
            referencedRelation: "planner_multiple_tasks"
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
          widget_order: string[]
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
          widget_order?: string[]
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
          widget_order?: string[]
          widget_visibility?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_household_member: { Args: { _user_id: string }; Returns: boolean }
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
