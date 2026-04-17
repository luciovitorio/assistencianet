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
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_name: string | null
          actor_user_id: string | null
          company_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          summary: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_name?: string | null
          actor_user_id?: string | null
          company_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          summary: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_name?: string | null
          actor_user_id?: string | null
          company_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          amount: number
          branch_id: string
          category: string
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string
          due_date: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_notes: string | null
          recurrence: string | null
          recurrence_group_id: string | null
          status: string
          supplier_id: string | null
        }
        Insert: {
          amount: number
          branch_id: string
          category: string
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description: string
          due_date: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          recurrence?: string | null
          recurrence_group_id?: string | null
          status?: string
          supplier_id?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string
          category?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          recurrence?: string | null
          recurrence_group_id?: string | null
          status?: string
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bills_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          active: boolean | null
          address: string | null
          city: string | null
          company_id: string
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_main: boolean | null
          name: string
          phone: string | null
          state: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          city?: string | null
          company_id: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_main?: boolean | null
          name: string
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          city?: string | null
          company_id?: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_main?: boolean | null
          name?: string
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          branch_id: string
          close_time: string | null
          day_of_week: number
          id: string
          is_closed: boolean | null
          open_time: string | null
        }
        Insert: {
          branch_id: string
          close_time?: string | null
          day_of_week: number
          id?: string
          is_closed?: boolean | null
          open_time?: string | null
        }
        Update: {
          branch_id?: string
          close_time?: string | null
          day_of_week?: number
          id?: string
          is_closed?: boolean | null
          open_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_entries: {
        Row: {
          amount_due: number
          amount_received: number
          branch_id: string | null
          change_amount: number
          company_id: string
          created_at: string
          created_by: string | null
          entry_type: string
          estimate_id: string | null
          id: string
          net_amount: number
          notes: string | null
          payment_method: string
          service_order_id: string
        }
        Insert: {
          amount_due: number
          amount_received: number
          branch_id?: string | null
          change_amount?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          entry_type?: string
          estimate_id?: string | null
          id?: string
          net_amount: number
          notes?: string | null
          payment_method: string
          service_order_id: string
        }
        Update: {
          amount_due?: number
          amount_received?: number
          branch_id?: string | null
          change_amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          entry_type?: string
          estimate_id?: string | null
          id?: string
          net_amount?: number
          notes?: string | null
          payment_method?: string
          service_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_entries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_entries_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "service_order_estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_entries_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          active: boolean
          address: string | null
          city: string | null
          classification: string
          classification_manual: boolean
          company_id: string
          complement: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          document: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          number: string | null
          origin_branch_id: string | null
          phone: string | null
          state: string | null
          street: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          city?: string | null
          classification?: string
          classification_manual?: boolean
          company_id: string
          complement?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          number?: string | null
          origin_branch_id?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          city?: string | null
          classification?: string
          classification_manual?: boolean
          company_id?: string
          complement?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          number?: string | null
          origin_branch_id?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_origin_branch_id_fkey"
            columns: ["origin_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          cnpj: string | null
          created_at: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          onboarding_completed: boolean | null
          onboarding_step: number | null
          owner_id: string
          phone: string | null
          segment: string | null
          updated_at: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          owner_id: string
          phone?: string | null
          segment?: string | null
          updated_at?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          owner_id?: string
          phone?: string | null
          segment?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          company_id: string
          created_at: string | null
          default_estimate_validity_days: number
          default_warranty_days: number
          device_types: string[]
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          default_estimate_validity_days?: number
          default_warranty_days?: number
          device_types?: string[]
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          default_estimate_validity_days?: number
          default_warranty_days?: number
          device_types?: string[]
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean
          branch_id: string | null
          company_id: string
          cpf: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          id: string
          labor_rate: number | null
          name: string
          phone: string | null
          role: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean
          branch_id?: string | null
          company_id: string
          cpf?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          labor_rate?: number | null
          name: string
          phone?: string | null
          role: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean
          branch_id?: string | null
          company_id?: string
          cpf?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          labor_rate?: number | null
          name?: string
          phone?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          branch_id: string | null
          client_id: string | null
          company_id: string
          created_at: string
          id: string
          part_id: string | null
          read_at: string | null
          service_order_id: string | null
          title: string
          type: string
        }
        Insert: {
          body: string
          branch_id?: string | null
          client_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          part_id?: string | null
          read_at?: string | null
          service_order_id?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string
          branch_id?: string | null
          client_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          part_id?: string | null
          read_at?: string | null
          service_order_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          active: boolean
          category: string
          company_id: string
          cost_price: number | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          min_stock: number
          name: string
          notes: string | null
          sale_price: number | null
          sku: string | null
          supplier_id: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          company_id: string
          cost_price?: number | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          min_stock?: number
          name: string
          notes?: string | null
          sale_price?: number | null
          sku?: string | null
          supplier_id?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          company_id?: string
          cost_price?: number | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          min_stock?: number
          name?: string
          notes?: string | null
          sale_price?: number | null
          sku?: string | null
          supplier_id?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          name: string
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      service_order_estimate_items: {
        Row: {
          company_id: string
          created_at: string
          description: string
          estimate_id: string
          id: string
          item_type: string
          line_total: number
          notes: string | null
          part_id: string | null
          quantity: number
          service_id: string | null
          service_order_id: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description: string
          estimate_id: string
          id?: string
          item_type: string
          line_total: number
          notes?: string | null
          part_id?: string | null
          quantity: number
          service_id?: string | null
          service_order_id: string
          unit_price: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string
          estimate_id?: string
          id?: string
          item_type?: string
          line_total?: number
          notes?: string | null
          part_id?: string | null
          quantity?: number
          service_id?: string | null
          service_order_id?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_order_estimate_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_estimate_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "service_order_estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_estimate_items_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_estimate_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_estimate_items_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_estimates: {
        Row: {
          approval_channel: string | null
          approved_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          discount_amount: number
          id: string
          notes: string | null
          rejected_at: string | null
          sent_at: string | null
          service_order_id: string
          status: string
          subtotal_amount: number
          total_amount: number
          updated_at: string
          valid_until: string | null
          version: number
          warranty_days: number | null
        }
        Insert: {
          approval_channel?: string | null
          approved_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          discount_amount?: number
          id?: string
          notes?: string | null
          rejected_at?: string | null
          sent_at?: string | null
          service_order_id: string
          status?: string
          subtotal_amount?: number
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
          version: number
          warranty_days?: number | null
        }
        Update: {
          approval_channel?: string | null
          approved_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          discount_amount?: number
          id?: string
          notes?: string | null
          rejected_at?: string | null
          sent_at?: string | null
          service_order_id?: string
          status?: string
          subtotal_amount?: number
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
          version?: number
          warranty_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_order_estimates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_estimates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_estimates_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_estimates_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          amount_paid: number | null
          branch_id: string | null
          change_amount: number | null
          client_id: string
          client_notified_at: string | null
          client_notified_via: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          delivered_at: string | null
          delivered_by: string | null
          device_brand: string | null
          device_condition: string | null
          device_model: string | null
          device_serial: string | null
          device_type: string
          estimated_delivery: string | null
          id: string
          notes: string | null
          number: number
          payment_method: string | null
          payment_status: string
          pickup_notes: string | null
          reported_issue: string
          status: string
          technician_id: string | null
          third_party_dispatched_at: string | null
          third_party_expected_return_at: string | null
          third_party_id: string | null
          third_party_notes: string | null
          third_party_returned_at: string | null
          updated_at: string
          warranty_expires_at: string | null
        }
        Insert: {
          amount_paid?: number | null
          branch_id?: string | null
          change_amount?: number | null
          client_id: string
          client_notified_at?: string | null
          client_notified_via?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          delivered_at?: string | null
          delivered_by?: string | null
          device_brand?: string | null
          device_condition?: string | null
          device_model?: string | null
          device_serial?: string | null
          device_type: string
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          number: number
          payment_method?: string | null
          payment_status?: string
          pickup_notes?: string | null
          reported_issue: string
          status?: string
          technician_id?: string | null
          third_party_dispatched_at?: string | null
          third_party_expected_return_at?: string | null
          third_party_id?: string | null
          third_party_notes?: string | null
          third_party_returned_at?: string | null
          updated_at?: string
          warranty_expires_at?: string | null
        }
        Update: {
          amount_paid?: number | null
          branch_id?: string | null
          change_amount?: number | null
          client_id?: string
          client_notified_at?: string | null
          client_notified_via?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          delivered_at?: string | null
          delivered_by?: string | null
          device_brand?: string | null
          device_condition?: string | null
          device_model?: string | null
          device_serial?: string | null
          device_type?: string
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          number?: number
          payment_method?: string | null
          payment_status?: string
          pickup_notes?: string | null
          reported_issue?: string
          status?: string
          technician_id?: string | null
          third_party_dispatched_at?: string | null
          third_party_expected_return_at?: string | null
          third_party_id?: string | null
          third_party_notes?: string | null
          third_party_returned_at?: string | null
          updated_at?: string
          warranty_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_delivered_by_fkey"
            columns: ["delivered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_third_party_id_fkey"
            columns: ["third_party_id"]
            isOneToOne: false
            referencedRelation: "third_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          category: string
          code: string | null
          company_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          estimated_duration_minutes: number | null
          id: string
          name: string
          notes: string | null
          price: number | null
          updated_at: string
          warranty_days: number
        }
        Insert: {
          active?: boolean
          category?: string
          code?: string | null
          company_id: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          name: string
          notes?: string | null
          price?: number | null
          updated_at?: string
          warranty_days?: number
        }
        Update: {
          active?: boolean
          category?: string
          code?: string | null
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          name?: string
          notes?: string | null
          price?: number | null
          updated_at?: string
          warranty_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          branch_id: string
          company_id: string
          created_at: string
          created_by: string | null
          entry_date: string
          id: string
          invoice_date: string | null
          movement_type: string
          notes: string | null
          part_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          supplier_id: string | null
          unit_cost: number | null
        }
        Insert: {
          branch_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          entry_date: string
          id?: string
          invoice_date?: string | null
          movement_type: string
          notes?: string | null
          part_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          supplier_id?: string | null
          unit_cost?: number | null
        }
        Update: {
          branch_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          invoice_date?: string | null
          movement_type?: string
          notes?: string | null
          part_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          supplier_id?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_reservations: {
        Row: {
          branch_id: string
          company_id: string
          created_at: string
          estimate_id: string
          id: string
          part_id: string
          quantity: number
          resolved_at: string | null
          service_order_id: string
          status: string
        }
        Insert: {
          branch_id: string
          company_id: string
          created_at?: string
          estimate_id: string
          id?: string
          part_id: string
          quantity: number
          resolved_at?: string | null
          service_order_id: string
          status?: string
        }
        Update: {
          branch_id?: string
          company_id?: string
          created_at?: string
          estimate_id?: string
          id?: string
          part_id?: string
          quantity?: number
          resolved_at?: string | null
          service_order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_reservations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "service_order_estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean
          address: string | null
          city: string | null
          company_id: string
          complement: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          document: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          number: string | null
          origin_branch_id: string | null
          phone: string | null
          state: string | null
          street: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          city?: string | null
          company_id: string
          complement?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          number?: string | null
          origin_branch_id?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          city?: string | null
          company_id?: string
          complement?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          number?: string | null
          origin_branch_id?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_origin_branch_id_fkey"
            columns: ["origin_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      third_parties: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          default_return_days: number | null
          deleted_at: string | null
          deleted_by: string | null
          document: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          default_return_days?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          default_return_days?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "third_parties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "third_parties_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_automation_settings: {
        Row: {
          access_token: string | null
          app_id: string | null
          app_secret: string | null
          authorized_brands: string | null
          base_url: string
          business_account_id: string | null
          company_id: string
          created_at: string
          default_country_code: string
          enabled: boolean
          evolution_api_key: string | null
          evolution_base_url: string
          evolution_instance_name: string | null
          evolution_webhook_url: string | null
          graph_api_version: string
          id: string
          message_estimate_ready: string | null
          message_inbound_auto_reply: string | null
          message_os_created: string | null
          message_retention_days: number
          message_satisfaction_survey: string | null
          message_service_completed: string | null
          notify_estimate_ready: boolean
          notify_inbound_message: boolean
          notify_os_created: boolean
          notify_satisfaction_survey: boolean
          notify_service_completed: boolean
          phone_number_id: string | null
          provider: string
          session_timeout_minutes: number
          template_estimate_ready: string | null
          template_os_created: string | null
          template_satisfaction_survey: string | null
          template_service_completed: string | null
          templates_language: string
          updated_at: string
          webhook_verify_token: string | null
        }
        Insert: {
          access_token?: string | null
          app_id?: string | null
          app_secret?: string | null
          authorized_brands?: string | null
          base_url?: string
          business_account_id?: string | null
          company_id: string
          created_at?: string
          default_country_code?: string
          enabled?: boolean
          evolution_api_key?: string | null
          evolution_base_url?: string
          evolution_instance_name?: string | null
          evolution_webhook_url?: string | null
          graph_api_version?: string
          id?: string
          message_estimate_ready?: string | null
          message_inbound_auto_reply?: string | null
          message_os_created?: string | null
          message_retention_days?: number
          message_satisfaction_survey?: string | null
          message_service_completed?: string | null
          notify_estimate_ready?: boolean
          notify_inbound_message?: boolean
          notify_os_created?: boolean
          notify_satisfaction_survey?: boolean
          notify_service_completed?: boolean
          phone_number_id?: string | null
          provider?: string
          session_timeout_minutes?: number
          template_estimate_ready?: string | null
          template_os_created?: string | null
          template_satisfaction_survey?: string | null
          template_service_completed?: string | null
          templates_language?: string
          updated_at?: string
          webhook_verify_token?: string | null
        }
        Update: {
          access_token?: string | null
          app_id?: string | null
          app_secret?: string | null
          authorized_brands?: string | null
          base_url?: string
          business_account_id?: string | null
          company_id?: string
          created_at?: string
          default_country_code?: string
          enabled?: boolean
          evolution_api_key?: string | null
          evolution_base_url?: string
          evolution_instance_name?: string | null
          evolution_webhook_url?: string | null
          graph_api_version?: string
          id?: string
          message_estimate_ready?: string | null
          message_inbound_auto_reply?: string | null
          message_os_created?: string | null
          message_retention_days?: number
          message_satisfaction_survey?: string | null
          message_service_completed?: string | null
          notify_estimate_ready?: boolean
          notify_inbound_message?: boolean
          notify_os_created?: boolean
          notify_satisfaction_survey?: boolean
          notify_service_completed?: boolean
          phone_number_id?: string | null
          provider?: string
          session_timeout_minutes?: number
          template_estimate_ready?: string | null
          template_os_created?: string | null
          template_satisfaction_survey?: string | null
          template_service_completed?: string | null
          templates_language?: string
          updated_at?: string
          webhook_verify_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_automation_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          assigned_to: string | null
          attempts: number
          bot_enabled: boolean
          bot_state: string | null
          branch_id: string | null
          client_id: string | null
          company_id: string
          contact_name: string | null
          context: Json
          created_at: string
          expires_at: string | null
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          phone_number: string
          status: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          attempts?: number
          bot_enabled?: boolean
          bot_state?: string | null
          branch_id?: string | null
          client_id?: string | null
          company_id: string
          contact_name?: string | null
          context?: Json
          created_at?: string
          expires_at?: string | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          phone_number: string
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          attempts?: number
          bot_enabled?: boolean
          bot_state?: string | null
          branch_id?: string | null
          client_id?: string | null
          company_id?: string
          contact_name?: string | null
          context?: Json
          created_at?: string
          expires_at?: string | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          phone_number?: string
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_menu_items: {
        Row: {
          company_id: string
          created_at: string
          emoji: string | null
          enabled: boolean
          handler_config: Json
          handler_type: string
          id: string
          label: string
          position: number
        }
        Insert: {
          company_id: string
          created_at?: string
          emoji?: string | null
          enabled?: boolean
          handler_config?: Json
          handler_type: string
          id?: string
          label: string
          position: number
        }
        Update: {
          company_id?: string
          created_at?: string
          emoji?: string | null
          enabled?: boolean
          handler_config?: Json
          handler_type?: string
          id?: string
          label?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_menu_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          company_id: string
          content: string
          conversation_id: string
          created_at: string
          direction: string
          external_id: string | null
          id: string
          sender_name: string | null
          sent_by_bot: boolean
          status: string
        }
        Insert: {
          company_id: string
          content: string
          conversation_id: string
          created_at?: string
          direction: string
          external_id?: string | null
          id?: string
          sender_name?: string | null
          sent_by_bot?: boolean
          status?: string
        }
        Update: {
          company_id?: string
          content?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          external_id?: string | null
          id?: string
          sender_name?: string | null
          sent_by_bot?: boolean
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_stock_available: {
        Row: {
          branch_id: string | null
          company_id: string | null
          estoque_disponivel: number | null
          estoque_fisico: number | null
          estoque_reservado: number | null
          part_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      v_stock_positions: {
        Row: {
          branch_id: string | null
          company_id: string | null
          current_stock: number | null
          part_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_stock_transfer: {
        Args: {
          p_company_id: string
          p_created_by: string
          p_entry_date: string
          p_from_branch_id: string
          p_notes: string
          p_part_id: string
          p_quantity: number
          p_to_branch_id: string
        }
        Returns: {
          entrada_id: string
          saida_id: string
        }[]
      }
      fn_is_company_admin: { Args: { p_company_id: string }; Returns: boolean }
      fn_is_company_member: { Args: { p_company_id: string }; Returns: boolean }
      fn_notify_inactive_clients: {
        Args: { p_months?: number }
        Returns: undefined
      }
      fn_notify_third_party_overdue: { Args: never; Returns: undefined }
      is_active_company_admin: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      recalculate_client_classification: {
        Args: { p_client_id: string }
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
