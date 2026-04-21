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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      absence_reasons: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          id: string
          label: string
          label_fi: string | null
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          id?: string
          label: string
          label_fi?: string | null
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          id?: string
          label?: string
          label_fi?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "absence_reasons_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      absences: {
        Row: {
          created_at: string
          end_date: string
          external_id: string | null
          id: string
          reason_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["request_status"]
          sync_status: string | null
          synced_at: string | null
          type: Database["public"]["Enums"]["absence_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string
          external_id?: string | null
          id?: string
          reason_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["request_status"]
          sync_status?: string | null
          synced_at?: string | null
          type: Database["public"]["Enums"]["absence_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          external_id?: string | null
          id?: string
          reason_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["request_status"]
          sync_status?: string | null
          synced_at?: string | null
          type?: Database["public"]["Enums"]["absence_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "absences_reason_id_fkey"
            columns: ["reason_id"]
            isOneToOne: false
            referencedRelation: "absence_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          id: string
          key_hash: string
          label: string | null
          last_used_at: string | null
          permissions: Json
          rate_limit: number
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          id?: string
          key_hash: string
          label?: string | null
          last_used_at?: string | null
          permissions?: Json
          rate_limit?: number
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          id?: string
          key_hash?: string
          label?: string | null
          last_used_at?: string | null
          permissions?: Json
          rate_limit?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      api_logs: {
        Row: {
          api_key_id: string
          created_at: string
          endpoint: string
          id: string
          response_time_ms: number | null
          status_code: number
        }
        Insert: {
          api_key_id: string
          created_at?: string
          endpoint: string
          id?: string
          response_time_ms?: number | null
          status_code: number
        }
        Update: {
          api_key_id?: string
          created_at?: string
          endpoint?: string
          id?: string
          response_time_ms?: number | null
          status_code?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_rate_limits: {
        Row: {
          api_key_id: string
          id: string
          request_count: number
          window_start: string
        }
        Insert: {
          api_key_id: string
          id?: string
          request_count?: number
          window_start: string
        }
        Update: {
          api_key_id?: string
          id?: string
          request_count?: number
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_rate_limits_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          changed_by: string | null
          company_id: string | null
          company_timezone: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_timezone: string | null
        }
        Insert: {
          action: string
          changed_by?: string | null
          company_id?: string | null
          company_timezone?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_timezone?: string | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          company_id?: string | null
          company_timezone?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_timezone?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          benefit_car_km_rate: number
          car_km_rate: number
          city: string | null
          company_id_code: string | null
          country: string | null
          created_at: string
          id: string
          km_rate: number
          name: string
          per_diem_full: number
          per_diem_partial: number
          postal_code: string | null
          street: string | null
          timezone: string
          trailer_km_rate: number
        }
        Insert: {
          address?: string | null
          benefit_car_km_rate?: number
          car_km_rate?: number
          city?: string | null
          company_id_code?: string | null
          country?: string | null
          created_at?: string
          id?: string
          km_rate?: number
          name: string
          per_diem_full?: number
          per_diem_partial?: number
          postal_code?: string | null
          street?: string | null
          timezone?: string
          trailer_km_rate?: number
        }
        Update: {
          address?: string | null
          benefit_car_km_rate?: number
          car_km_rate?: number
          city?: string | null
          company_id_code?: string | null
          country?: string | null
          created_at?: string
          id?: string
          km_rate?: number
          name?: string
          per_diem_full?: number
          per_diem_partial?: number
          postal_code?: string | null
          street?: string | null
          timezone?: string
          trailer_km_rate?: number
        }
        Relationships: []
      }
      goal_templates: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number | null
          text: string
          updated_at: string
          weekly_goal_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number | null
          text: string
          updated_at?: string
          weekly_goal_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number | null
          text?: string
          updated_at?: string
          weekly_goal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_weekly_goal_id_fkey"
            columns: ["weekly_goal_id"]
            isOneToOne: false
            referencedRelation: "weekly_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_keys: {
        Row: {
          api_key_id: string
          created_at: string
          id: string
          idempotency_key: string
          response_body: Json | null
          response_status: number | null
        }
        Insert: {
          api_key_id: string
          created_at?: string
          id?: string
          idempotency_key: string
          response_body?: Json | null
          response_status?: number | null
        }
        Update: {
          api_key_id?: string
          created_at?: string
          id?: string
          idempotency_key?: string
          response_body?: Json | null
          response_status?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "idempotency_keys_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      login_sessions: {
        Row: {
          created_at: string
          id: string
          login_at: string
          login_lat: number | null
          login_lng: number | null
          logout_at: string | null
          logout_lat: number | null
          logout_lng: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          login_at?: string
          login_lat?: number | null
          login_lng?: number | null
          logout_at?: string | null
          logout_lat?: number | null
          logout_lng?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          login_at?: string
          login_lat?: number | null
          login_lng?: number | null
          logout_at?: string | null
          logout_lat?: number | null
          logout_lng?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "login_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          id: string
          reference_id: string | null
          sent_at: string
          type: string
          user_id: string
        }
        Insert: {
          id?: string
          reference_id?: string | null
          sent_at?: string
          type: string
          user_id: string
        }
        Update: {
          id?: string
          reference_id?: string | null
          sent_at?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_hours: {
        Row: {
          created_at: string
          date: string
          description: string | null
          external_id: string | null
          hours: number
          id: string
          project_id: string
          status: Database["public"]["Enums"]["request_status"]
          sync_status: string | null
          synced_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          description?: string | null
          external_id?: string | null
          hours: number
          id?: string
          project_id: string
          status?: Database["public"]["Enums"]["request_status"]
          sync_status?: string | null
          synced_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          external_id?: string | null
          hours?: number
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["request_status"]
          sync_status?: string | null
          synced_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_hours_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_hours_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          customer: string | null
          id: string
          name: string
          target_hours: number | null
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          customer?: string | null
          id?: string
          name: string
          target_hours?: number | null
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          customer?: string | null
          id?: string
          name?: string
          target_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          failure_count: number
          id: string
          last_failure_at: string | null
          last_success_at: string | null
          p256dh: string
          platform: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          failure_count?: number
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          p256dh: string
          platform?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          failure_count?: number
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          p256dh?: string
          platform?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_rules: {
        Row: {
          company_id: string
          created_at: string
          day_of_month: number | null
          enabled: boolean
          id: string
          message: string
          message_fi: string | null
          resend_after_days: number | null
          time: string
          type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          day_of_month?: number | null
          enabled?: boolean
          id?: string
          message?: string
          message_fi?: string | null
          resend_after_days?: number | null
          time?: string
          type?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          day_of_month?: number | null
          enabled?: boolean
          id?: string
          message?: string
          message_fi?: string | null
          resend_after_days?: number | null
          time?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_goals: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          template_id: string
          user_id: string
          week_number: number
          year: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          template_id: string
          user_id: string
          week_number: number
          year: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          template_id?: string
          user_id?: string
          week_number?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_goals_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "goal_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          break_minutes: number | null
          company_timezone: string | null
          created_at: string
          end_lat: number | null
          end_lng: number | null
          end_time: string | null
          external_id: string | null
          gps_accuracy: number | null
          id: string
          project_id: string | null
          start_lat: number | null
          start_lng: number | null
          start_time: string
          status: Database["public"]["Enums"]["request_status"]
          sync_status: string | null
          synced_at: string | null
          timezone: string | null
          user_id: string
        }
        Insert: {
          break_minutes?: number | null
          company_timezone?: string | null
          created_at?: string
          end_lat?: number | null
          end_lng?: number | null
          end_time?: string | null
          external_id?: string | null
          gps_accuracy?: number | null
          id?: string
          project_id?: string | null
          start_lat?: number | null
          start_lng?: number | null
          start_time?: string
          status?: Database["public"]["Enums"]["request_status"]
          sync_status?: string | null
          synced_at?: string | null
          timezone?: string | null
          user_id: string
        }
        Update: {
          break_minutes?: number | null
          company_timezone?: string | null
          created_at?: string
          end_lat?: number | null
          end_lng?: number | null
          end_time?: string | null
          external_id?: string | null
          gps_accuracy?: number | null
          id?: string
          project_id?: string | null
          start_lat?: number | null
          start_lng?: number | null
          start_time?: string
          status?: Database["public"]["Enums"]["request_status"]
          sync_status?: string | null
          synced_at?: string | null
          timezone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_expenses: {
        Row: {
          created_at: string
          customer_name: string | null
          date: string
          description: string | null
          external_id: string | null
          id: string
          kilometers: number | null
          parking_cost: number | null
          per_diem: Database["public"]["Enums"]["per_diem_type"]
          project_id: string | null
          receipt_image: string | null
          route: string | null
          status: Database["public"]["Enums"]["request_status"]
          sync_status: string | null
          synced_at: string | null
          title: string | null
          user_id: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          date?: string
          description?: string | null
          external_id?: string | null
          id?: string
          kilometers?: number | null
          parking_cost?: number | null
          per_diem?: Database["public"]["Enums"]["per_diem_type"]
          project_id?: string | null
          receipt_image?: string | null
          route?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          sync_status?: string | null
          synced_at?: string | null
          title?: string | null
          user_id: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          date?: string
          description?: string | null
          external_id?: string | null
          id?: string
          kilometers?: number | null
          parking_cost?: number | null
          per_diem?: Database["public"]["Enums"]["per_diem_type"]
          project_id?: string | null
          receipt_image?: string | null
          route?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          sync_status?: string | null
          synced_at?: string | null
          title?: string | null
          user_id?: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Relationships: [
          {
            foreignKeyName: "travel_expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_expenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_managers: {
        Row: {
          created_at: string
          id: string
          manager_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          manager_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          manager_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_managers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reminders: {
        Row: {
          created_at: string
          day_of_week: number | null
          enabled: boolean
          id: string
          time: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          enabled?: boolean
          id?: string
          time?: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          enabled?: boolean
          id?: string
          time?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_teams: {
        Row: {
          created_at: string
          id: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_teams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          annual_vacation_days: number
          auto_subtract_lunch: boolean
          company_id: string
          contract_start_date: string | null
          created_at: string
          daily_work_hours: number
          email: string
          employee_number: string | null
          id: string
          lunch_threshold_hours: number
          manager_id: string | null
          name: string
          role: Database["public"]["Enums"]["user_role"]
          timezone: string | null
        }
        Insert: {
          annual_vacation_days?: number
          auto_subtract_lunch?: boolean
          company_id: string
          contract_start_date?: string | null
          created_at?: string
          daily_work_hours?: number
          email: string
          employee_number?: string | null
          id?: string
          lunch_threshold_hours?: number
          manager_id?: string | null
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          timezone?: string | null
        }
        Update: {
          annual_vacation_days?: number
          auto_subtract_lunch?: boolean
          company_id?: string
          contract_start_date?: string | null
          created_at?: string
          daily_work_hours?: number
          email?: string
          employee_number?: string | null
          id?: string
          lunch_threshold_hours?: number
          manager_id?: string | null
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vacation_requests: {
        Row: {
          comment: string | null
          created_at: string
          end_date: string
          external_id: string | null
          id: string
          start_date: string
          status: Database["public"]["Enums"]["request_status"]
          sync_status: string | null
          synced_at: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          end_date: string
          external_id?: string | null
          id?: string
          start_date: string
          status?: Database["public"]["Enums"]["request_status"]
          sync_status?: string | null
          synced_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          end_date?: string
          external_id?: string | null
          id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["request_status"]
          sync_status?: string | null
          synced_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacation_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_goals: {
        Row: {
          created_at: string
          id: string
          is_admin_assigned: boolean
          rated_at: string | null
          team_id: string | null
          template_id: string | null
          template_name: string | null
          updated_at: string
          user_id: string
          week_number: number
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin_assigned?: boolean
          rated_at?: string | null
          team_id?: string | null
          template_id?: string | null
          template_name?: string | null
          updated_at?: string
          user_id: string
          week_number: number
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          is_admin_assigned?: boolean
          rated_at?: string | null
          team_id?: string | null
          template_id?: string | null
          template_name?: string | null
          updated_at?: string
          user_id?: string
          week_number?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_goals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_goals_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "goal_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      work_bank_transactions: {
        Row: {
          created_at: string
          hours: number
          id: string
          reference_id: string | null
          type: Database["public"]["Enums"]["bank_transaction_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          hours: number
          id?: string
          reference_id?: string | null
          type: Database["public"]["Enums"]["bank_transaction_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          hours?: number
          id?: string
          reference_id?: string | null
          type?: Database["public"]["Enums"]["bank_transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_bank_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      workplaces: {
        Row: {
          company_id: string
          created_at: string
          id: string
          latitude: number
          longitude: number
          name: string
          radius_meters: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          name: string
          radius_meters?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          radius_meters?: number
        }
        Relationships: [
          {
            foreignKeyName: "workplaces_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_user_company_id: { Args: never; Returns: string }
      auth_user_id: { Args: never; Returns: string }
      auth_user_role: { Args: never; Returns: string }
      is_member_of_team: { Args: { _team_id: string }; Returns: boolean }
      is_same_company_user: {
        Args: { _target_user_id: string }
        Returns: boolean
      }
      is_team_in_my_company: { Args: { _team_id: string }; Returns: boolean }
      user_shares_team_with_me: { Args: { _user_id: string }; Returns: boolean }
      weekly_goal_owner: { Args: { _wg_id: string }; Returns: string }
    }
    Enums: {
      absence_type: "sick" | "absence"
      bank_transaction_type:
        | "work"
        | "overtime"
        | "vacation"
        | "sick"
        | "adjustment"
      per_diem_type: "none" | "partial" | "full"
      request_status: "pending" | "approved" | "rejected"
      user_role: "employee" | "manager" | "admin"
      vehicle_type: "car" | "trailer" | "none"
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
    Enums: {
      absence_type: ["sick", "absence"],
      bank_transaction_type: [
        "work",
        "overtime",
        "vacation",
        "sick",
        "adjustment",
      ],
      per_diem_type: ["none", "partial", "full"],
      request_status: ["pending", "approved", "rejected"],
      user_role: ["employee", "manager", "admin"],
      vehicle_type: ["car", "trailer", "none"],
    },
  },
} as const
