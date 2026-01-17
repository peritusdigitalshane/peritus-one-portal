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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          created_at: string
          encrypted: boolean | null
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          encrypted?: boolean | null
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          encrypted?: boolean | null
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      admin_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          sort_order: number | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          sort_order?: number | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          sort_order?: number | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          invoice_number: string
          paid_at: string | null
          pdf_url: string | null
          purchase_id: string | null
          status: string
          stripe_invoice_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          paid_at?: string | null
          pdf_url?: string | null
          purchase_id?: string | null
          status?: string
          stripe_invoice_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          paid_at?: string | null
          pdf_url?: string | null
          purchase_id?: string | null
          status?: string
          stripe_invoice_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "user_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_order_items: {
        Row: {
          created_at: string
          customer_details: Json | null
          id: string
          pending_order_id: string
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          customer_details?: Json | null
          id?: string
          pending_order_id: string
          product_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          customer_details?: Json | null
          id?: string
          pending_order_id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "pending_order_items_pending_order_id_fkey"
            columns: ["pending_order_id"]
            isOneToOne: false
            referencedRelation: "pending_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_orders: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          created_by: string
          customer_details: Json | null
          email: string
          id: string
          notes: string | null
          product_id: string
          quantity: number
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          created_by: string
          customer_details?: Json | null
          email: string
          id?: string
          notes?: string | null
          product_id: string
          quantity?: number
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          created_by?: string
          customer_details?: Json | null
          email?: string
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "pending_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_assignments: {
        Row: {
          assigned_by: string
          created_at: string
          expires_at: string | null
          id: string
          notes: string | null
          product_id: string
          user_id: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          product_id: string
          user_id: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_assignments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          billing_type: string
          category: string | null
          created_at: string
          description: string | null
          features: string[] | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          sort_order: number | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          billing_type: string
          category?: string | null
          created_at?: string
          description?: string | null
          features?: string[] | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          sort_order?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          billing_type?: string
          category?: string | null
          created_at?: string
          description?: string | null
          features?: string[] | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          sort_order?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          mobile_number: string | null
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          mobile_number?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          mobile_number?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          closed_at: string | null
          created_at: string
          description: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolution_notes: string | null
          resolved_at: string | null
          sla_due_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          closed_at?: string | null
          created_at?: string
          description: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolution_notes?: string | null
          resolved_at?: string | null
          sla_due_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          closed_at?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolution_notes?: string | null
          resolved_at?: string | null
          sla_due_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          ticket_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_time_entries: {
        Row: {
          created_at: string
          description: string | null
          hours: number
          id: string
          logged_at: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          hours: number
          id?: string
          logged_at?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          hours?: number
          id?: string
          logged_at?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "admin_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_purchases: {
        Row: {
          cancelled_at: string | null
          created_at: string
          customer_address: string | null
          customer_city: string | null
          customer_email: string | null
          customer_first_name: string | null
          customer_last_name: string | null
          customer_phone: string | null
          customer_postcode: string | null
          customer_state: string | null
          fulfilled: boolean
          fulfilled_at: string | null
          id: string
          next_billing_date: string | null
          notes: string | null
          price_paid: number
          product_id: string
          purchased_at: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          customer_address?: string | null
          customer_city?: string | null
          customer_email?: string | null
          customer_first_name?: string | null
          customer_last_name?: string | null
          customer_phone?: string | null
          customer_postcode?: string | null
          customer_state?: string | null
          fulfilled?: boolean
          fulfilled_at?: string | null
          id?: string
          next_billing_date?: string | null
          notes?: string | null
          price_paid: number
          product_id: string
          purchased_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          customer_address?: string | null
          customer_city?: string | null
          customer_email?: string | null
          customer_first_name?: string | null
          customer_last_name?: string | null
          customer_phone?: string | null
          customer_postcode?: string | null
          customer_state?: string | null
          fulfilled?: boolean
          fulfilled_at?: string | null
          id?: string
          next_billing_date?: string | null
          notes?: string | null
          price_paid?: number
          product_id?: string
          purchased_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "user" | "support_user"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "backlog" | "todo" | "in_progress" | "review" | "done"
      ticket_category:
        | "incident"
        | "service_request"
        | "problem"
        | "change_request"
      ticket_priority: "critical" | "high" | "medium" | "low"
      ticket_status:
        | "new"
        | "open"
        | "in_progress"
        | "pending"
        | "resolved"
        | "closed"
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
      app_role: ["super_admin", "admin", "user", "support_user"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["backlog", "todo", "in_progress", "review", "done"],
      ticket_category: [
        "incident",
        "service_request",
        "problem",
        "change_request",
      ],
      ticket_priority: ["critical", "high", "medium", "low"],
      ticket_status: [
        "new",
        "open",
        "in_progress",
        "pending",
        "resolved",
        "closed",
      ],
    },
  },
} as const
