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
      absences: {
        Row: {
          created_at: string
          end_date: string
          id: string
          start_date: string
          status: Database["public"]["Enums"]["request_status"]
          type: Database["public"]["Enums"]["absence_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string
          id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["request_status"]
          type: Database["public"]["Enums"]["absence_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["request_status"]
          type?: Database["public"]["Enums"]["absence_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "absences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          km_rate: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          km_rate?: number
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          km_rate?: number
          name?: string
        }
        Relationships: []
      }
      project_hours: {
        Row: {
          created_at: string
          date: string
          description: string | null
          hours: number
          id: string
          project_id: string
          status: Database["public"]["Enums"]["request_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          description?: string | null
          hours: number
          id?: string
          project_id: string
          status?: Database["public"]["Enums"]["request_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          hours?: number
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["request_status"]
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
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          customer?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          customer?: string | null
          id?: string
          name?: string
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
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
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
      time_entries: {
        Row: {
          break_minutes: number | null
          created_at: string
          end_lat: number | null
          end_lng: number | null
          end_time: string | null
          gps_accuracy: number | null
          id: string
          project_id: string | null
          start_lat: number | null
          start_lng: number | null
          start_time: string
          user_id: string
        }
        Insert: {
          break_minutes?: number | null
          created_at?: string
          end_lat?: number | null
          end_lng?: number | null
          end_time?: string | null
          gps_accuracy?: number | null
          id?: string
          project_id?: string | null
          start_lat?: number | null
          start_lng?: number | null
          start_time?: string
          user_id: string
        }
        Update: {
          break_minutes?: number | null
          created_at?: string
          end_lat?: number | null
          end_lng?: number | null
          end_time?: string | null
          gps_accuracy?: number | null
          id?: string
          project_id?: string | null
          start_lat?: number | null
          start_lng?: number | null
          start_time?: string
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
          date: string
          description: string | null
          id: string
          kilometers: number | null
          parking_cost: number | null
          project_id: string | null
          receipt_image: string | null
          status: Database["public"]["Enums"]["request_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          kilometers?: number | null
          parking_cost?: number | null
          project_id?: string | null
          receipt_image?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          kilometers?: number | null
          parking_cost?: number | null
          project_id?: string | null
          receipt_image?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          user_id?: string
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
      users: {
        Row: {
          annual_vacation_days: number
          company_id: string
          contract_start_date: string | null
          created_at: string
          email: string
          id: string
          manager_id: string | null
          name: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          annual_vacation_days?: number
          company_id: string
          contract_start_date?: string | null
          created_at?: string
          email: string
          id?: string
          manager_id?: string | null
          name: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          annual_vacation_days?: number
          company_id?: string
          contract_start_date?: string | null
          created_at?: string
          email?: string
          id?: string
          manager_id?: string | null
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
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
          id: string
          start_date: string
          status: Database["public"]["Enums"]["request_status"]
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          end_date: string
          id?: string
          start_date: string
          status?: Database["public"]["Enums"]["request_status"]
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          end_date?: string
          id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["request_status"]
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
      [_ in never]: never
    }
    Enums: {
      absence_type: "sick" | "absence"
      bank_transaction_type:
        | "work"
        | "overtime"
        | "vacation"
        | "sick"
        | "adjustment"
      request_status: "pending" | "approved" | "rejected"
      user_role: "employee" | "manager" | "admin"
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
      request_status: ["pending", "approved", "rejected"],
      user_role: ["employee", "manager", "admin"],
    },
  },
} as const
