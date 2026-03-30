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
      _bak_reno_norm_rules: {
        Row: {
          apply_multiplier: boolean | null
          basis: Database["public"]["Enums"]["reno_basis"] | null
          coeff: number | null
          id: number | null
          is_active: boolean | null
          note: string | null
          rik_code: string | null
          round_to: number | null
          section: string | null
          uom_code: string | null
          updated_at: string | null
          work_type_code: string | null
        }
        Insert: {
          apply_multiplier?: boolean | null
          basis?: Database["public"]["Enums"]["reno_basis"] | null
          coeff?: number | null
          id?: number | null
          is_active?: boolean | null
          note?: string | null
          rik_code?: string | null
          round_to?: number | null
          section?: string | null
          uom_code?: string | null
          updated_at?: string | null
          work_type_code?: string | null
        }
        Update: {
          apply_multiplier?: boolean | null
          basis?: Database["public"]["Enums"]["reno_basis"] | null
          coeff?: number | null
          id?: number | null
          is_active?: boolean | null
          note?: string | null
          rik_code?: string | null
          round_to?: number | null
          section?: string | null
          uom_code?: string | null
          updated_at?: string | null
          work_type_code?: string | null
        }
        Relationships: []
      }
      accounting_events: {
        Row: {
          actor_id: string | null
          created_at: string
          id: number
          kind: string
          payload: Json
          proposal_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: number
          kind: string
          payload?: Json
          proposal_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: number
          kind?: string
          payload?: Json
          proposal_id?: string
        }
        Relationships: []
      }
      accounting_invoices: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          invoice_amount: number
          invoice_currency: string
          invoice_date: string
          invoice_number: string
          proposal_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_amount: number
          invoice_currency: string
          invoice_date: string
          invoice_number: string
          proposal_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_amount?: number
          invoice_currency?: string
          invoice_date?: string
          invoice_number?: string
          proposal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_invoices_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_files_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "accounting_invoices_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_files_view"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "accounting_invoices_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_invoices_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_invoices_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_accountant_inbox"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "accounting_invoices_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_accountant_inbox_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "accounting_invoices_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_buyer_buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_invoices_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_rows"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "accounting_invoices_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "accounting_invoices_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "accounting_invoices_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds_v3"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "accounting_invoices_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_proposals_pending"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "accounting_invoices_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_payments_sum"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "accounting_invoices_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_invoices_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_invoices_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_invoices_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "accounting_invoices_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_request_latest_proposal_ui"
            referencedColumns: ["proposal_id"]
          },
        ]
      }
      accounting_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          method: string | null
          note: string | null
          proposal_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string | null
          note?: string | null
          proposal_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string | null
          note?: string | null
          proposal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_files_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "accounting_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_files_view"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "accounting_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_accountant_inbox"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "accounting_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_accountant_inbox_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "accounting_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_buyer_buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_rows"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "accounting_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "accounting_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "accounting_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds_v3"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "accounting_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_proposals_pending"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "accounting_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_payments_sum"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "accounting_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "accounting_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_request_latest_proposal_ui"
            referencedColumns: ["proposal_id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      approval_queue: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: number
          reason: string | null
          request_id: number
          request_item_id: string
          role: string
          status: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: number
          reason?: string | null
          request_id: number
          request_item_id: string
          role?: string
          status?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: number
          reason?: string | null
          request_id?: number
          request_item_id?: string
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_queue_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "debug_director_items"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "approval_queue_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_queue_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items_pending"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "approval_queue_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items_pending_view"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "approval_queue_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_items_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_queue_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_items_with_stock"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "approval_queue_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_full"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "approval_queue_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "approval_queue_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_base"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "approval_queue_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_fixed"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "approval_queue_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_old"
            referencedColumns: ["request_item_id"]
          },
        ]
      }
      auction_bids: {
        Row: {
          auction_id: string | null
          created_at: string
          delivery_days: number | null
          id: string
          price: number | null
          status: string | null
          submitted_at: string | null
          supplier_id: string | null
          supplier_name: string | null
        }
        Insert: {
          auction_id?: string | null
          created_at?: string
          delivery_days?: number | null
          id?: string
          price?: number | null
          status?: string | null
          submitted_at?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
        }
        Update: {
          auction_id?: string | null
          created_at?: string
          delivery_days?: number | null
          id?: string
          price?: number | null
          status?: string | null
          submitted_at?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auction_bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      auctions: {
        Row: {
          buyer_id: string | null
          created_at: string
          display_no: string | null
          foreman_name: string | null
          id: string
          items: Json | null
          need_by: string | null
          object_name: string | null
          request_id: string | null
          status: string | null
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string
          display_no?: string | null
          foreman_name?: string | null
          id?: string
          items?: Json | null
          need_by?: string | null
          object_name?: string | null
          request_id?: string | null
          status?: string | null
        }
        Update: {
          buyer_id?: string | null
          created_at?: string
          display_no?: string | null
          foreman_name?: string | null
          id?: string
          items?: Json | null
          need_by?: string | null
          object_name?: string | null
          request_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      buyer_queue: {
        Row: {
          app_code: string | null
          created_at: string | null
          foreman_name: string | null
          id: number
          name_human: string | null
          need_by: string | null
          note: string | null
          qty: number | null
          request_id: number
          request_item_id: string
          rik_code: string
          status: string | null
          uom: string | null
        }
        Insert: {
          app_code?: string | null
          created_at?: string | null
          foreman_name?: string | null
          id?: number
          name_human?: string | null
          need_by?: string | null
          note?: string | null
          qty?: number | null
          request_id: number
          request_item_id: string
          rik_code: string
          status?: string | null
          uom?: string | null
        }
        Update: {
          app_code?: string | null
          created_at?: string | null
          foreman_name?: string | null
          id?: number
          name_human?: string | null
          need_by?: string | null
          note?: string | null
          qty?: number | null
          request_id?: number
          request_item_id?: string
          rik_code?: string
          status?: string | null
          uom?: string | null
        }
        Relationships: []
      }
      calc_inputs: {
        Row: {
          created_at: string
          id: string
          payload_json: Json
          project_id: string
          step: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload_json: Json
          project_id: string
          step: string
        }
        Update: {
          created_at?: string
          id?: string
          payload_json?: Json
          project_id?: string
          step?: string
        }
        Relationships: [
          {
            foreignKeyName: "calc_inputs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "calc_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      calc_projects: {
        Row: {
          created_at: string
          id: string
          mode: string
          norm_version: string
          owner_user: string
          region_code: string | null
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode: string
          norm_version?: string
          owner_user?: string
          region_code?: string | null
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          norm_version?: string
          owner_user?: string
          region_code?: string | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      calc_result_items: {
        Row: {
          created_at: string
          id: string
          material_code: string
          name: string
          price: number | null
          price_source: string | null
          project_id: string
          qty: number
          room: string | null
          section: string | null
          uom: string
          waste_coef: number
        }
        Insert: {
          created_at?: string
          id?: string
          material_code: string
          name: string
          price?: number | null
          price_source?: string | null
          project_id: string
          qty: number
          room?: string | null
          section?: string | null
          uom: string
          waste_coef?: number
        }
        Update: {
          created_at?: string
          id?: string
          material_code?: string
          name?: string
          price?: number | null
          price_source?: string | null
          project_id?: string
          qty?: number
          room?: string | null
          section?: string | null
          uom?: string
          waste_coef?: number
        }
        Relationships: [
          {
            foreignKeyName: "calc_result_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "calc_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      calc_results: {
        Row: {
          created_at: string
          id: string
          project_id: string
          summary_json: Json
          totals_json: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          summary_json: Json
          totals_json?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          summary_json?: Json
          totals_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "calc_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "calc_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_aliases: {
        Row: {
          alias: string
          alias_norm: string | null
          id: string
          rik_code: string
          rik_norm: string | null
        }
        Insert: {
          alias: string
          alias_norm?: string | null
          id?: string
          rik_code: string
          rik_norm?: string | null
        }
        Update: {
          alias?: string
          alias_norm?: string | null
          id?: string
          rik_code?: string
          rik_norm?: string | null
        }
        Relationships: []
      }
      catalog_aliases_canon: {
        Row: {
          canon_code: string
          source_code: string
          source_name: string | null
          source_uom: string | null
          updated_at: string
        }
        Insert: {
          canon_code: string
          source_code: string
          source_name?: string | null
          source_uom?: string | null
          updated_at?: string
        }
        Update: {
          canon_code?: string
          source_code?: string
          source_name?: string | null
          source_uom?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_aliases_canon_canon_code_fkey"
            columns: ["canon_code"]
            isOneToOne: false
            referencedRelation: "catalog_items_canon"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "catalog_aliases_canon_canon_code_fkey"
            columns: ["canon_code"]
            isOneToOne: false
            referencedRelation: "v_catalog_items_for_app"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "catalog_aliases_canon_canon_code_fkey"
            columns: ["canon_code"]
            isOneToOne: false
            referencedRelation: "v_catalog_items_search"
            referencedColumns: ["code"]
          },
        ]
      }
      catalog_aliases_import: {
        Row: {
          alias: string | null
          rik_code: string | null
        }
        Insert: {
          alias?: string | null
          rik_code?: string | null
        }
        Update: {
          alias?: string | null
          rik_code?: string | null
        }
        Relationships: []
      }
      catalog_applications: {
        Row: {
          code: string
          name: string
          name_human: string | null
          note: string | null
          section: number
        }
        Insert: {
          code: string
          name: string
          name_human?: string | null
          note?: string | null
          section: number
        }
        Update: {
          code?: string
          name?: string
          name_human?: string | null
          note?: string | null
          section?: number
        }
        Relationships: []
      }
      catalog_apps: {
        Row: {
          app_code: string
          name_human: string
        }
        Insert: {
          app_code: string
          name_human: string
        }
        Update: {
          app_code?: string
          name_human?: string
        }
        Relationships: []
      }
      catalog_apps_dict: {
        Row: {
          code: string
          name: string
        }
        Insert: {
          code: string
          name: string
        }
        Update: {
          code?: string
          name?: string
        }
        Relationships: []
      }
      catalog_group_keys_tbl: {
        Row: {
          gkey: string | null
          mark_m: string | null
          name_norm: string | null
          sector_code: string | null
          src: string | null
          src_code: string | null
          uom_id: string | null
        }
        Insert: {
          gkey?: string | null
          mark_m?: string | null
          name_norm?: string | null
          sector_code?: string | null
          src?: string | null
          src_code?: string | null
          uom_id?: string | null
        }
        Update: {
          gkey?: string | null
          mark_m?: string | null
          name_norm?: string | null
          sector_code?: string | null
          src?: string | null
          src_code?: string | null
          uom_id?: string | null
        }
        Relationships: []
      }
      catalog_group_rules: {
        Row: {
          group_code: string
          kind: string | null
          rule_source: string | null
          uom_code: string | null
          updated_at: string | null
        }
        Insert: {
          group_code: string
          kind?: string | null
          rule_source?: string | null
          uom_code?: string | null
          updated_at?: string | null
        }
        Update: {
          group_code?: string
          kind?: string | null
          rule_source?: string | null
          uom_code?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      catalog_groups: {
        Row: {
          code: string
          kind: string | null
          level: number
          name: string
          name_human_ru: string | null
          notes: string | null
          parent_code: string | null
          sort: number
        }
        Insert: {
          code: string
          kind?: string | null
          level?: number
          name: string
          name_human_ru?: string | null
          notes?: string | null
          parent_code?: string | null
          sort?: number
        }
        Update: {
          code?: string
          kind?: string | null
          level?: number
          name?: string
          name_human_ru?: string | null
          notes?: string | null
          parent_code?: string | null
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "rik_groups_parent_code_fkey"
            columns: ["parent_code"]
            isOneToOne: false
            referencedRelation: "catalog_groups"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "rik_groups_parent_code_fkey"
            columns: ["parent_code"]
            isOneToOne: false
            referencedRelation: "rik_groups"
            referencedColumns: ["code"]
          },
        ]
      }
      catalog_groups_agg_tbl: {
        Row: {
          canon_kind: string | null
          canon_mark: string | null
          canon_name: string | null
          canon_sector: string | null
          canon_uom: string | null
          gkey: string
          preferred_src_code: string | null
        }
        Insert: {
          canon_kind?: string | null
          canon_mark?: string | null
          canon_name?: string | null
          canon_sector?: string | null
          canon_uom?: string | null
          gkey: string
          preferred_src_code?: string | null
        }
        Update: {
          canon_kind?: string | null
          canon_mark?: string | null
          canon_name?: string | null
          canon_sector?: string | null
          canon_uom?: string | null
          gkey?: string
          preferred_src_code?: string | null
        }
        Relationships: []
      }
      catalog_item_apps: {
        Row: {
          app_code: string
          rik_code: string
        }
        Insert: {
          app_code: string
          rik_code: string
        }
        Update: {
          app_code?: string
          rik_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "rik_item_apps_app_code_fkey"
            columns: ["app_code"]
            isOneToOne: false
            referencedRelation: "catalog_applications"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "rik_item_apps_app_code_fkey"
            columns: ["app_code"]
            isOneToOne: false
            referencedRelation: "rik_applications"
            referencedColumns: ["code"]
          },
        ]
      }
      catalog_items: {
        Row: {
          attrs: Json | null
          domain: string | null
          foreman_priority: number
          group_code: string | null
          id: string
          is_foreman: boolean
          item_role: string
          item_type: string | null
          kind: string
          name_human: string
          name_human_ru: string | null
          name_search: string | null
          rik_code: string
          search_blob: string | null
          search_norm: string | null
          sector_code: string | null
          semantic_key: string | null
          semantic_text: string | null
          spec: string | null
          synonyms: string[] | null
          tags: string | null
          tags_arr: string[] | null
          tech_spec: Json | null
          tsv_ru: unknown
          uom_code: string | null
        }
        Insert: {
          attrs?: Json | null
          domain?: string | null
          foreman_priority?: number
          group_code?: string | null
          id?: string
          is_foreman?: boolean
          item_role?: string
          item_type?: string | null
          kind: string
          name_human: string
          name_human_ru?: string | null
          name_search?: string | null
          rik_code: string
          search_blob?: string | null
          search_norm?: string | null
          sector_code?: string | null
          semantic_key?: string | null
          semantic_text?: string | null
          spec?: string | null
          synonyms?: string[] | null
          tags?: string | null
          tags_arr?: string[] | null
          tech_spec?: Json | null
          tsv_ru?: unknown
          uom_code?: string | null
        }
        Update: {
          attrs?: Json | null
          domain?: string | null
          foreman_priority?: number
          group_code?: string | null
          id?: string
          is_foreman?: boolean
          item_role?: string
          item_type?: string | null
          kind?: string
          name_human?: string
          name_human_ru?: string | null
          name_search?: string | null
          rik_code?: string
          search_blob?: string | null
          search_norm?: string | null
          sector_code?: string | null
          semantic_key?: string | null
          semantic_text?: string | null
          spec?: string | null
          synonyms?: string[] | null
          tags?: string | null
          tags_arr?: string[] | null
          tech_spec?: Json | null
          tsv_ru?: unknown
          uom_code?: string | null
        }
        Relationships: []
      }
      catalog_items_canon: {
        Row: {
          code: string
          kind: string | null
          mark_m: string | null
          name: string
          sector_code: string | null
          uom_id: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          kind?: string | null
          mark_m?: string | null
          name: string
          sector_code?: string | null
          uom_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          kind?: string | null
          mark_m?: string | null
          name?: string
          sector_code?: string | null
          uom_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      catalog_items_import: {
        Row: {
          kind: string
          name_human: string
          rik_code: string
          sector_code: string | null
          spec: string | null
          tags: string | null
          uom_code: string | null
        }
        Insert: {
          kind: string
          name_human: string
          rik_code: string
          sector_code?: string | null
          spec?: string | null
          tags?: string | null
          uom_code?: string | null
        }
        Update: {
          kind?: string
          name_human?: string
          rik_code?: string
          sector_code?: string | null
          spec?: string | null
          tags?: string | null
          uom_code?: string | null
        }
        Relationships: []
      }
      catalog_materials: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          mat_code: string | null
          name: string
          sector: string | null
          specs: string | null
          tags: string[] | null
          unit_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          mat_code?: string | null
          name: string
          sector?: string | null
          specs?: string | null
          tags?: string[] | null
          unit_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          mat_code?: string | null
          name?: string
          sector?: string | null
          specs?: string | null
          tags?: string[] | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rik_materials_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "uoms"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_name_overrides: {
        Row: {
          code: string
          name_ru: string
        }
        Insert: {
          code: string
          name_ru: string
        }
        Update: {
          code?: string
          name_ru?: string
        }
        Relationships: []
      }
      catalog_ref_links: {
        Row: {
          created_at: string | null
          created_by: string | null
          item_id: string
          ref_id: string
          ref_table: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          item_id: string
          ref_id: string
          ref_table: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          item_id?: string
          ref_id?: string
          ref_table?: string
        }
        Relationships: []
      }
      catalog_sectors: {
        Row: {
          name_ru: string
          sector_code: string
        }
        Insert: {
          name_ru: string
          sector_code: string
        }
        Update: {
          name_ru?: string
          sector_code?: string
        }
        Relationships: []
      }
      catalog_semantic_guard: {
        Row: {
          enabled: boolean
        }
        Insert: {
          enabled?: boolean
        }
        Update: {
          enabled?: boolean
        }
        Relationships: []
      }
      catalog_stage_all_tbl: {
        Row: {
          name_hard: string | null
          name_norm: string | null
          sector_code: string | null
          src: string | null
          src_code: string | null
          uom_id: string | null
        }
        Insert: {
          name_hard?: string | null
          name_norm?: string | null
          sector_code?: string | null
          src?: string | null
          src_code?: string | null
          uom_id?: string | null
        }
        Update: {
          name_hard?: string | null
          name_norm?: string | null
          sector_code?: string | null
          src?: string | null
          src_code?: string | null
          uom_id?: string | null
        }
        Relationships: []
      }
      catalog_stage_clean_tbl: {
        Row: {
          id: number
          mark_m: string | null
          name_hard: string | null
          name_key: string | null
          name_norm: string | null
          sector_code: string | null
          src: string | null
          src_code: string | null
          uom_id: string | null
        }
        Insert: {
          id?: number
          mark_m?: string | null
          name_hard?: string | null
          name_key?: string | null
          name_norm?: string | null
          sector_code?: string | null
          src?: string | null
          src_code?: string | null
          uom_id?: string | null
        }
        Update: {
          id?: number
          mark_m?: string | null
          name_hard?: string | null
          name_key?: string | null
          name_norm?: string | null
          sector_code?: string | null
          src?: string | null
          src_code?: string | null
          uom_id?: string | null
        }
        Relationships: []
      }
      catalog_translate_rules: {
        Row: {
          flags: string
          id: number
          pattern: string
          priority: number
          replacement: string
        }
        Insert: {
          flags?: string
          id?: number
          pattern: string
          priority?: number
          replacement: string
        }
        Update: {
          flags?: string
          id?: number
          pattern?: string
          priority?: number
          replacement?: string
        }
        Relationships: []
      }
      catalog_uom_overrides: {
        Row: {
          note: string | null
          rik_code: string
          uom_code: string
          updated_at: string | null
        }
        Insert: {
          note?: string | null
          rik_code: string
          uom_code: string
          updated_at?: string | null
        }
        Update: {
          note?: string | null
          rik_code?: string
          uom_code?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      catalog_works: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_human_ru: string | null
          notes: string | null
          parent_code: string | null
          rik_code: string | null
          sector: string | null
          tags: string[] | null
          unit_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_human_ru?: string | null
          notes?: string | null
          parent_code?: string | null
          rik_code?: string | null
          sector?: string | null
          tags?: string[] | null
          unit_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_human_ru?: string | null
          notes?: string | null
          parent_code?: string | null
          rik_code?: string | null
          sector?: string | null
          tags?: string[] | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rik_works_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "uoms"
            referencedColumns: ["id"]
          },
        ]
      }
      climate_ref: {
        Row: {
          degree_days: number | null
          region_code: string
          snow_zone: string | null
          updated_at: string
          wind_zone: string | null
        }
        Insert: {
          degree_days?: number | null
          region_code: string
          snow_zone?: string | null
          updated_at?: string
          wind_zone?: string | null
        }
        Update: {
          degree_days?: number | null
          region_code?: string
          snow_zone?: string | null
          updated_at?: string
          wind_zone?: string | null
        }
        Relationships: []
      }
      co_select_stats: {
        Row: {
          a_ref_id: string
          a_ref_table: string
          b_ref_id: string
          b_ref_table: string
          id: number
          weight: number
        }
        Insert: {
          a_ref_id: string
          a_ref_table: string
          b_ref_id: string
          b_ref_table: string
          id?: number
          weight?: number
        }
        Update: {
          a_ref_id?: string
          a_ref_table?: string
          b_ref_id?: string
          b_ref_table?: string
          id?: number
          weight?: number
        }
        Relationships: []
      }
      companies: {
        Row: {
          about_full: string | null
          about_short: string | null
          address: string | null
          bank_details: string | null
          bin: string | null
          city: string | null
          clients_types: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          employees_count: number | null
          id: string
          industry: string | null
          inn: string | null
          legal_form: string | null
          licenses_info: string | null
          name: string
          owner_user_id: string
          phone_main: string | null
          phone_whatsapp: string | null
          reg_number: string | null
          regions: string | null
          services: string | null
          site: string | null
          telegram: string | null
          work_time: string | null
        }
        Insert: {
          about_full?: string | null
          about_short?: string | null
          address?: string | null
          bank_details?: string | null
          bin?: string | null
          city?: string | null
          clients_types?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          employees_count?: number | null
          id?: string
          industry?: string | null
          inn?: string | null
          legal_form?: string | null
          licenses_info?: string | null
          name: string
          owner_user_id: string
          phone_main?: string | null
          phone_whatsapp?: string | null
          reg_number?: string | null
          regions?: string | null
          services?: string | null
          site?: string | null
          telegram?: string | null
          work_time?: string | null
        }
        Update: {
          about_full?: string | null
          about_short?: string | null
          address?: string | null
          bank_details?: string | null
          bin?: string | null
          city?: string | null
          clients_types?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          employees_count?: number | null
          id?: string
          industry?: string | null
          inn?: string | null
          legal_form?: string | null
          licenses_info?: string | null
          name?: string
          owner_user_id?: string
          phone_main?: string | null
          phone_whatsapp?: string | null
          reg_number?: string | null
          regions?: string | null
          services?: string | null
          site?: string | null
          telegram?: string | null
          work_time?: string | null
        }
        Relationships: []
      }
      company_invites: {
        Row: {
          accepted_at: string | null
          comment: string | null
          company_id: string
          created_at: string
          email: string | null
          expires_at: string | null
          id: string
          invite_code: string
          name: string
          phone: string
          role: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          comment?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          expires_at?: string | null
          id?: string
          invite_code: string
          name: string
          phone: string
          role: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          comment?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          expires_at?: string | null
          id?: string
          invite_code?: string
          name?: string
          phone?: string
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          role: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_profiles: {
        Row: {
          bank: string | null
          created_at: string | null
          email: string | null
          id: string
          inn: string | null
          legal_address: string | null
          name: string
          owner_user_id: string | null
          phone: string | null
          site_address: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          bank?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          inn?: string | null
          legal_address?: string | null
          name: string
          owner_user_id?: string | null
          phone?: string | null
          site_address?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          bank?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          inn?: string | null
          legal_address?: string | null
          name?: string
          owner_user_id?: string | null
          phone?: string | null
          site_address?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      company_requisites: {
        Row: {
          account: string | null
          address: string | null
          bank_name: string | null
          bik: string | null
          company_name: string | null
          corr_account: string | null
          created_at: string | null
          email: string | null
          id: string
          inn: string | null
          kpp: string | null
          owner_user_id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          account?: string | null
          address?: string | null
          bank_name?: string | null
          bik?: string | null
          company_name?: string | null
          corr_account?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          inn?: string | null
          kpp?: string | null
          owner_user_id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          account?: string | null
          address?: string | null
          bank_name?: string | null
          bik?: string | null
          company_name?: string | null
          corr_account?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          inn?: string | null
          kpp?: string | null
          owner_user_id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contractors: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_bik: string | null
          bank_name: string | null
          company_name: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          inn: string | null
          phone: string | null
          signature_url: string | null
          stamp_url: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_bik?: string | null
          bank_name?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          inn?: string | null
          phone?: string | null
          signature_url?: string | null
          stamp_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_bik?: string | null
          bank_name?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          inn?: string | null
          phone?: string | null
          signature_url?: string | null
          stamp_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      demand_offers: {
        Row: {
          comment: string | null
          created_at: string | null
          delivery_days: number | null
          demand_id: string
          id: string
          price: number
          supplier_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          delivery_days?: number | null
          demand_id: string
          id?: string
          price: number
          supplier_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          delivery_days?: number | null
          demand_id?: string
          id?: string
          price?: number
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_offers_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "market_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_offers_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "market_listings_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_offers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_offers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_counters: {
        Row: {
          doc_type: string
          last_no: number
          year: number
        }
        Insert: {
          doc_type: string
          last_no?: number
          year: number
        }
        Update: {
          doc_type?: string
          last_no?: number
          year?: number
        }
        Relationships: []
      }
      grn: {
        Row: {
          attachments: Json | null
          created_at: string | null
          grn_no: string | null
          id: string
          purchase_id: string | null
          status: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          grn_no?: string | null
          id?: string
          purchase_id?: string | null
          status?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          grn_no?: string | null
          id?: string
          purchase_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      grn_items: {
        Row: {
          grn_id: string | null
          id: string
          name_human: string | null
          note: string | null
          purchase_item_id: string | null
          qty_fact: number | null
          qty_po: number | null
          ref_id: string | null
          uom: string | null
        }
        Insert: {
          grn_id?: string | null
          id?: string
          name_human?: string | null
          note?: string | null
          purchase_item_id?: string | null
          qty_fact?: number | null
          qty_po?: number | null
          ref_id?: string | null
          uom?: string | null
        }
        Update: {
          grn_id?: string | null
          id?: string
          name_human?: string | null
          note?: string | null
          purchase_item_id?: string | null
          qty_fact?: number | null
          qty_po?: number | null
          ref_id?: string | null
          uom?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grn_items_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "grn"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_lines: {
        Row: {
          id: string
          qty_book: number
          qty_fact: number
          rik_code: string
          session_id: string
          uom_id: string
        }
        Insert: {
          id?: string
          qty_book?: number
          qty_fact?: number
          rik_code: string
          session_id: string
          uom_id: string
        }
        Update: {
          id?: string
          qty_book?: number
          qty_fact?: number
          rik_code?: string
          session_id?: string
          uom_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_lines_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "inventory_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_sessions: {
        Row: {
          comment: string | null
          finished_at: string | null
          id: string
          object_id: string | null
          started_at: string
          status: string
        }
        Insert: {
          comment?: string | null
          finished_at?: string | null
          id?: string
          object_id?: string | null
          started_at?: string
          status?: string
        }
        Update: {
          comment?: string | null
          finished_at?: string | null
          id?: string
          object_id?: string | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      issue_items: {
        Row: {
          id: string
          issue_id: string | null
          name_human: string | null
          qty: number | null
          ref_id: string | null
          uom: string | null
        }
        Insert: {
          id?: string
          issue_id?: string | null
          name_human?: string | null
          qty?: number | null
          ref_id?: string | null
          uom?: string | null
        }
        Update: {
          id?: string
          issue_id?: string | null
          name_human?: string | null
          qty?: number | null
          ref_id?: string | null
          uom?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issue_items_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          brigade: string | null
          created_at: string
          date_issued: string
          id: string
          issued_to: string | null
          note: string | null
          object_name: string | null
          purchase_id: string
          purchase_item_id: string | null
          qty: number
          sector: string | null
        }
        Insert: {
          brigade?: string | null
          created_at?: string
          date_issued?: string
          id?: string
          issued_to?: string | null
          note?: string | null
          object_name?: string | null
          purchase_id: string
          purchase_item_id?: string | null
          qty: number
          sector?: string | null
        }
        Update: {
          brigade?: string | null
          created_at?: string
          date_issued?: string
          id?: string
          issued_to?: string | null
          note?: string | null
          object_name?: string | null
          purchase_id?: string
          purchase_item_id?: string | null
          qty?: number
          sector?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issues_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_acc_incoming"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "issues_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_po_receipt_status"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "issues_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_po_totals"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "issues_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_purchases_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_stock_balance"
            referencedColumns: ["po_id"]
          },
          {
            foreignKeyName: "issues_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_warehouse_incoming"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_warehouse_incoming"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "issues_purchase_item_id_fkey"
            columns: ["purchase_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_items"
            referencedColumns: ["id"]
          },
        ]
      }
      level_types: {
        Row: {
          code: string
          display_name: string | null
          name: string
          object_type_code: string
        }
        Insert: {
          code: string
          display_name?: string | null
          name: string
          object_type_code: string
        }
        Update: {
          code?: string
          display_name?: string | null
          name?: string
          object_type_code?: string
        }
        Relationships: []
      }
      machines: {
        Row: {
          code: string | null
          id: number
          name: string | null
          note: string | null
          unit: string | null
        }
        Insert: {
          code?: string | null
          id?: number
          name?: string | null
          note?: string | null
          unit?: string | null
        }
        Update: {
          code?: string | null
          id?: number
          name?: string | null
          note?: string | null
          unit?: string | null
        }
        Relationships: []
      }
      market_listing_items: {
        Row: {
          catalog_item_id: string
          created_at: string
          id: string
          kind: string | null
          listing_id: string
          name: string | null
          price: number | null
          qty: number | null
          rik_code: string | null
          sort_order: number | null
          uom_code: string | null
        }
        Insert: {
          catalog_item_id: string
          created_at?: string
          id?: string
          kind?: string | null
          listing_id: string
          name?: string | null
          price?: number | null
          qty?: number | null
          rik_code?: string | null
          sort_order?: number | null
          uom_code?: string | null
        }
        Update: {
          catalog_item_id?: string
          created_at?: string
          id?: string
          kind?: string | null
          listing_id?: string
          name?: string | null
          price?: number | null
          qty?: number | null
          rik_code?: string | null
          sort_order?: number | null
          uom_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_listing_items_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_listing_items_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "rik_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_listing_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "market_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_listing_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "market_listings_map"
            referencedColumns: ["id"]
          },
        ]
      }
      market_listings: {
        Row: {
          catalog_item_id: string | null
          catalog_kind: string | null
          city: string | null
          company_id: string | null
          contacts_email: string | null
          contacts_phone: string | null
          contacts_whatsapp: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          items_json: Json | null
          kind: string
          lat: number | null
          lng: number | null
          price: number | null
          rik_code: string | null
          side: string
          status: string
          tender_id: string | null
          title: string
          uom: string | null
          uom_code: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          catalog_item_id?: string | null
          catalog_kind?: string | null
          city?: string | null
          company_id?: string | null
          contacts_email?: string | null
          contacts_phone?: string | null
          contacts_whatsapp?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          items_json?: Json | null
          kind?: string
          lat?: number | null
          lng?: number | null
          price?: number | null
          rik_code?: string | null
          side?: string
          status?: string
          tender_id?: string | null
          title: string
          uom?: string | null
          uom_code?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          catalog_item_id?: string | null
          catalog_kind?: string | null
          city?: string | null
          company_id?: string | null
          contacts_email?: string | null
          contacts_phone?: string | null
          contacts_whatsapp?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          items_json?: Json | null
          kind?: string
          lat?: number | null
          lng?: number | null
          price?: number | null
          rik_code?: string | null
          side?: string
          status?: string
          tender_id?: string | null
          title?: string
          uom?: string | null
          uom_code?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_listings_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_listings_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "rik_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_listings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_listings_rik_fk"
            columns: ["rik_code"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["rik_code"]
          },
          {
            foreignKeyName: "market_listings_rik_fk"
            columns: ["rik_code"]
            isOneToOne: false
            referencedRelation: "rik_items"
            referencedColumns: ["rik_code"]
          },
          {
            foreignKeyName: "market_listings_rik_fk"
            columns: ["rik_code"]
            isOneToOne: false
            referencedRelation: "v_catalog_items_integration"
            referencedColumns: ["source_code"]
          },
          {
            foreignKeyName: "market_listings_rik_fk"
            columns: ["rik_code"]
            isOneToOne: false
            referencedRelation: "v_catalog_items_integration_dedup"
            referencedColumns: ["source_code"]
          },
          {
            foreignKeyName: "market_listings_rik_fk"
            columns: ["rik_code"]
            isOneToOne: false
            referencedRelation: "v_catalog_marketplace"
            referencedColumns: ["source_code"]
          },
          {
            foreignKeyName: "market_listings_rik_fk"
            columns: ["rik_code"]
            isOneToOne: false
            referencedRelation: "v_catalog_tiles_showcase"
            referencedColumns: ["rik_code"]
          },
          {
            foreignKeyName: "market_listings_rik_fk"
            columns: ["rik_code"]
            isOneToOne: false
            referencedRelation: "v_catalog_tiles_showcase_ui"
            referencedColumns: ["rik_code"]
          },
          {
            foreignKeyName: "market_listings_rik_fk"
            columns: ["rik_code"]
            isOneToOne: false
            referencedRelation: "v_marketplace_catalog_stock"
            referencedColumns: ["source_code"]
          },
        ]
      }
      material_code_aliases: {
        Row: {
          alias_code: string
          created_at: string
          master_code: string
        }
        Insert: {
          alias_code: string
          created_at?: string
          master_code: string
        }
        Update: {
          alias_code?: string
          created_at?: string
          master_code?: string
        }
        Relationships: []
      }
      material_code_aliases_stock: {
        Row: {
          alias_code: string
          stock_code: string
        }
        Insert: {
          alias_code: string
          stock_code: string
        }
        Update: {
          alias_code?: string
          stock_code?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          category: string | null
          group_code: string | null
          id: number
          name: string | null
          note: string | null
          sku: string | null
          unit: string | null
        }
        Insert: {
          category?: string | null
          group_code?: string | null
          id?: number
          name?: string | null
          note?: string | null
          sku?: string | null
          unit?: string | null
        }
        Update: {
          category?: string | null
          group_code?: string | null
          id?: number
          name?: string | null
          note?: string | null
          sku?: string | null
          unit?: string | null
        }
        Relationships: []
      }
      materials_ref: {
        Row: {
          base_price: number | null
          class_energy: string | null
          code: string
          created_at: string
          density: number | null
          epd_link: string | null
          id: string
          is_active: boolean
          lambda: number | null
          name: string
          pack_qty: number | null
          uom: string
        }
        Insert: {
          base_price?: number | null
          class_energy?: string | null
          code: string
          created_at?: string
          density?: number | null
          epd_link?: string | null
          id?: string
          is_active?: boolean
          lambda?: number | null
          name: string
          pack_qty?: number | null
          uom?: string
        }
        Update: {
          base_price?: number | null
          class_energy?: string | null
          code?: string
          created_at?: string
          density?: number | null
          epd_link?: string | null
          id?: string
          is_active?: boolean
          lambda?: number | null
          name?: string
          pack_qty?: number | null
          uom?: string
        }
        Relationships: []
      }
      norm_snip: {
        Row: {
          basis: string | null
          created_at: string
          id: number
          note: string | null
          qty_per_unit: number
          rik_code: string
          snip_code: string
          source: string | null
          unit: string
          uom_code: string | null
          updated_at: string
          work_type_code: string
        }
        Insert: {
          basis?: string | null
          created_at?: string
          id?: number
          note?: string | null
          qty_per_unit: number
          rik_code: string
          snip_code: string
          source?: string | null
          unit: string
          uom_code?: string | null
          updated_at?: string
          work_type_code: string
        }
        Update: {
          basis?: string | null
          created_at?: string
          id?: number
          note?: string | null
          qty_per_unit?: number
          rik_code?: string
          snip_code?: string
          source?: string | null
          unit?: string
          uom_code?: string | null
          updated_at?: string
          work_type_code?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: number
          is_read: boolean
          meta: Json
          payload: Json | null
          proposal_id: string | null
          read_at: string | null
          role: string
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: number
          is_read?: boolean
          meta?: Json
          payload?: Json | null
          proposal_id?: string | null
          read_at?: string | null
          role: string
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: number
          is_read?: boolean
          meta?: Json
          payload?: Json | null
          proposal_id?: string | null
          read_at?: string | null
          role?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      object_types: {
        Row: {
          code: string
          name: string
        }
        Insert: {
          code: string
          name: string
        }
        Update: {
          code?: string
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      pack_rules: {
        Row: {
          hint: string | null
          loss_pct: number | null
          min_packs: number | null
          pack_size: number
          pack_uom: string
          rik_code: string
        }
        Insert: {
          hint?: string | null
          loss_pct?: number | null
          min_packs?: number | null
          pack_size: number
          pack_uom: string
          rik_code: string
        }
        Update: {
          hint?: string | null
          loss_pct?: number | null
          min_packs?: number | null
          pack_size?: number
          pack_uom?: string
          rik_code?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          id: string
          method: string | null
          note: string | null
          paid_at: string | null
          proposal_id: string
          purchase_id: string | null
          request_item_id: string | null
        }
        Insert: {
          amount: number
          id?: string
          method?: string | null
          note?: string | null
          paid_at?: string | null
          proposal_id: string
          purchase_id?: string | null
          request_item_id?: string | null
        }
        Update: {
          amount?: number
          id?: string
          method?: string | null
          note?: string | null
          paid_at?: string | null
          proposal_id?: string
          purchase_id?: string | null
          request_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_acc_incoming"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "payments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_po_receipt_status"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "payments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_po_totals"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "payments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_purchases_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_stock_balance"
            referencedColumns: ["po_id"]
          },
          {
            foreignKeyName: "payments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_warehouse_incoming"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_warehouse_incoming"
            referencedColumns: ["purchase_id"]
          },
        ]
      }
      po_counters: {
        Row: {
          last_no: number
          seq: number
          updated_at: string
          year: number
        }
        Insert: {
          last_no?: number
          seq?: number
          updated_at?: string
          year: number
        }
        Update: {
          last_no?: number
          seq?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      po_history: {
        Row: {
          changed_at: string
          comment: string | null
          id: number
          new_status: string
          old_status: string | null
          po_id: string
        }
        Insert: {
          changed_at?: string
          comment?: string | null
          id?: number
          new_status: string
          old_status?: string | null
          po_id: string
        }
        Update: {
          changed_at?: string
          comment?: string | null
          id?: number
          new_status?: string
          old_status?: string | null
          po_id?: string
        }
        Relationships: []
      }
      popular_bundles: {
        Row: {
          created_at: string
          id: string
          items: Json
          name: string
          scope: string
        }
        Insert: {
          created_at?: string
          id?: string
          items: Json
          name: string
          scope: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          name?: string
          scope?: string
        }
        Relationships: []
      }
      price_indices: {
        Row: {
          id: string
          material_code: string
          month: string
          price_per_uom: number
          region_code: string
          source: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          material_code: string
          month: string
          price_per_uom: number
          region_code: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          material_code?: string
          month?: string
          price_per_uom?: number
          region_code?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      proposal_attachments: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          file_name: string
          group_key: string
          id: number
          proposal_id: string | null
          storage_path: string | null
          url: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          file_name: string
          group_key: string
          id?: number
          proposal_id?: string | null
          storage_path?: string | null
          url?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          file_name?: string
          group_key?: string
          id?: number
          proposal_id?: string | null
          storage_path?: string | null
          url?: string | null
        }
        Relationships: []
      }
      proposal_item_meta: {
        Row: {
          created_at: string | null
          note: string | null
          price: number | null
          proposal_id: number
          request_item_id: string
          supplier: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          note?: string | null
          price?: number | null
          proposal_id: number
          request_item_id: string
          supplier?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          note?: string | null
          price?: number | null
          proposal_id?: number
          request_item_id?: string
          supplier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      proposal_items: {
        Row: {
          app: string | null
          app_code: string | null
          buyer_fio: string | null
          created_at: string
          director_comment: string | null
          director_decided_at: string | null
          director_decision: string | null
          id: number
          name_human: string | null
          note: string | null
          price: number | null
          proposal_id: string | null
          proposal_id_bigint: number | null
          proposal_id_text: string
          qty: number | null
          request_id: number | null
          request_item_id: string
          rik_code: string | null
          status: string | null
          supplier: string | null
          total_qty: number | null
          uom: string | null
          updated_at: string
        }
        Insert: {
          app?: string | null
          app_code?: string | null
          buyer_fio?: string | null
          created_at?: string
          director_comment?: string | null
          director_decided_at?: string | null
          director_decision?: string | null
          id?: number
          name_human?: string | null
          note?: string | null
          price?: number | null
          proposal_id?: string | null
          proposal_id_bigint?: number | null
          proposal_id_text: string
          qty?: number | null
          request_id?: number | null
          request_item_id: string
          rik_code?: string | null
          status?: string | null
          supplier?: string | null
          total_qty?: number | null
          uom?: string | null
          updated_at?: string
        }
        Update: {
          app?: string | null
          app_code?: string | null
          buyer_fio?: string | null
          created_at?: string
          director_comment?: string | null
          director_decided_at?: string | null
          director_decision?: string | null
          id?: number
          name_human?: string | null
          note?: string | null
          price?: number | null
          proposal_id?: string | null
          proposal_id_bigint?: number | null
          proposal_id_text?: string
          qty?: number | null
          request_id?: number | null
          request_item_id?: string
          rik_code?: string | null
          status?: string | null
          supplier?: string | null
          total_qty?: number | null
          uom?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_files_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_files_view"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_accountant_inbox"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_accountant_inbox_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_buyer_buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_rows"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds_v3"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_proposals_pending"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_payments_sum"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_request_latest_proposal_ui"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "debug_director_items"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items_pending"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items_pending_view"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_items_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_items_with_stock"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_full"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_base"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_fixed"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_old"
            referencedColumns: ["request_item_id"]
          },
        ]
      }
      proposal_payment_allocations: {
        Row: {
          amount: number
          created_at: string
          id: number
          payment_id: number
          proposal_item_id: number
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: number
          payment_id: number
          proposal_item_id: number
        }
        Update: {
          amount?: number
          created_at?: string
          id?: number
          payment_id?: number
          proposal_item_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "proposal_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_payment_allocations_proposal_item_id_fkey"
            columns: ["proposal_item_id"]
            isOneToOne: false
            referencedRelation: "proposal_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_payment_allocations_proposal_item_id_fkey"
            columns: ["proposal_item_id"]
            isOneToOne: false
            referencedRelation: "proposal_items_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_payment_allocations_proposal_item_id_fkey"
            columns: ["proposal_item_id"]
            isOneToOne: false
            referencedRelation: "proposal_items_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_payment_allocations_proposal_item_id_fkey"
            columns: ["proposal_item_id"]
            isOneToOne: false
            referencedRelation: "proposal_snapshot_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_payment_allocations_proposal_item_id_fkey"
            columns: ["proposal_item_id"]
            isOneToOne: false
            referencedRelation: "v_buyer_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_payment_allocations_proposal_item_id_fkey"
            columns: ["proposal_item_id"]
            isOneToOne: false
            referencedRelation: "v_buyer_items_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_payment_allocations_proposal_item_id_fkey"
            columns: ["proposal_item_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_items_orphan_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_payment_allocations_proposal_item_id_fkey"
            columns: ["proposal_item_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_items_orphan_request_items"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_payments: {
        Row: {
          accountant_fio: string | null
          amount: number
          created_at: string
          created_by: string | null
          currency: string | null
          id: number
          idempotency_key: string | null
          method: string | null
          note: string | null
          paid_at: string
          proposal_id: string
          purpose: string | null
        }
        Insert: {
          accountant_fio?: string | null
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string | null
          id?: number
          idempotency_key?: string | null
          method?: string | null
          note?: string | null
          paid_at?: string
          proposal_id: string
          purpose?: string | null
        }
        Update: {
          accountant_fio?: string | null
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string | null
          id?: number
          idempotency_key?: string | null
          method?: string | null
          note?: string | null
          paid_at?: string
          proposal_id?: string
          purpose?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_files_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_files_view"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_accountant_inbox"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_accountant_inbox_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_buyer_buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_rows"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds_v3"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_proposals_pending"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_payments_sum"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_request_latest_proposal_ui"
            referencedColumns: ["proposal_id"]
          },
        ]
      }
      proposals: {
        Row: {
          accountant_comment: string | null
          approved_at: string | null
          buyer_email: string | null
          buyer_fio: string | null
          created_at: string
          created_by: string | null
          decided_at: string | null
          display_no: string | null
          doc_no: string | null
          id: string
          id_old: number
          id_short: number
          invoice_amount: number | null
          invoice_currency: string | null
          invoice_date: string | null
          invoice_number: string | null
          payment_status: string | null
          proposal_no: string | null
          redo_comment: string | null
          redo_source: string | null
          request_id: string | null
          return_comment: string | null
          sent_to_accountant_at: string | null
          status: string
          submitted_at: string | null
          supplier: string | null
          total_paid: number | null
          updated_at: string
        }
        Insert: {
          accountant_comment?: string | null
          approved_at?: string | null
          buyer_email?: string | null
          buyer_fio?: string | null
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          display_no?: string | null
          doc_no?: string | null
          id?: string
          id_old?: number
          id_short?: number
          invoice_amount?: number | null
          invoice_currency?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          payment_status?: string | null
          proposal_no?: string | null
          redo_comment?: string | null
          redo_source?: string | null
          request_id?: string | null
          return_comment?: string | null
          sent_to_accountant_at?: string | null
          status?: string
          submitted_at?: string | null
          supplier?: string | null
          total_paid?: number | null
          updated_at?: string
        }
        Update: {
          accountant_comment?: string | null
          approved_at?: string | null
          buyer_email?: string | null
          buyer_fio?: string | null
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          display_no?: string | null
          doc_no?: string | null
          id?: string
          id_old?: number
          id_short?: number
          invoice_amount?: number | null
          invoice_currency?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          payment_status?: string | null
          proposal_no?: string | null
          redo_comment?: string | null
          redo_source?: string | null
          request_id?: string | null
          return_comment?: string | null
          sent_to_accountant_at?: string | null
          status?: string
          submitted_at?: string | null
          supplier?: string | null
          total_paid?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "buyer_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "director_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "request_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_director_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_foreman_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_foreman_requests2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_full"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_header"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_heads_ui"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_heads_ui_base"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_base"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_fixed"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_old"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "warehouse_inbox"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_events: {
        Row: {
          created_at: string
          details: Json | null
          event: string
          id: string
          po_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event: string
          id?: string
          po_id: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          event?: string
          id?: string
          po_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_events_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_events_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchases_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_events_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "v_acc_incoming"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "purchase_events_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "v_po_receipt_status"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "purchase_events_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "v_po_totals"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "purchase_events_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "v_purchases_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_events_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "v_stock_balance"
            referencedColumns: ["po_id"]
          },
          {
            foreignKeyName: "purchase_events_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "v_warehouse_incoming"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_events_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "v_warehouse_incoming"
            referencedColumns: ["purchase_id"]
          },
        ]
      }
      purchase_items: {
        Row: {
          amount: number | null
          created_at: string | null
          id: string
          name_human: string
          price: number | null
          price_per_unit: number | null
          purchase_id: string
          qty: number
          ref_id: string | null
          request_item_id: string | null
          status: string | null
          unit_id: string | null
          uom: string | null
          vat_percent: number | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          id?: string
          name_human: string
          price?: number | null
          price_per_unit?: number | null
          purchase_id: string
          qty: number
          ref_id?: string | null
          request_item_id?: string | null
          status?: string | null
          unit_id?: string | null
          uom?: string | null
          vat_percent?: number | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          id?: string
          name_human?: string
          price?: number | null
          price_per_unit?: number | null
          purchase_id?: string
          qty?: number
          ref_id?: string | null
          request_item_id?: string | null
          status?: string | null
          unit_id?: string | null
          uom?: string | null
          vat_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_acc_incoming"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_po_receipt_status"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_po_totals"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_purchases_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_stock_balance"
            referencedColumns: ["po_id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_warehouse_incoming"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_warehouse_incoming"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "purchase_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "debug_director_items"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "purchase_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items_pending"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "purchase_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items_pending_view"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "purchase_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_items_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_items_with_stock"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "purchase_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_full"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "purchase_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "purchase_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_base"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "purchase_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_fixed"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "purchase_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_old"
            referencedColumns: ["request_item_id"]
          },
        ]
      }
      purchase_proposal_items: {
        Row: {
          app_code: string | null
          id: number
          name_human: string
          proposal_id: number
          rik_code: string | null
          source_items: string[]
          total_qty: number
          uom: string | null
        }
        Insert: {
          app_code?: string | null
          id?: number
          name_human: string
          proposal_id: number
          rik_code?: string | null
          source_items?: string[]
          total_qty: number
          uom?: string | null
        }
        Update: {
          app_code?: string | null
          id?: number
          name_human?: string
          proposal_id?: number
          rik_code?: string | null
          source_items?: string[]
          total_qty?: number
          uom?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_proposal_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "purchase_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_proposals: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: number
          reason: string | null
          status: string
          submitted_at: string | null
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: number
          reason?: string | null
          status?: string
          submitted_at?: string | null
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: number
          reason?: string | null
          status?: string
          submitted_at?: string | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount: number | null
          approved_at: string | null
          attachments: Json
          created_at: string
          created_by: string | null
          currency: string
          delivery_expected: string | null
          eta_date: string | null
          id: string
          id_short: number
          invoice_date: string | null
          invoice_no: string | null
          issued_qty: number | null
          object_id: string | null
          object_name: string | null
          payment_date: string | null
          payment_status: string
          po_no: string | null
          price_per_unit: number | null
          proposal_id: string | null
          received_qty: number | null
          request_id: string | null
          request_id_old: number | null
          status: string | null
          supplier: string | null
          supplier_id: string | null
          vat_percent: number | null
        }
        Insert: {
          amount?: number | null
          approved_at?: string | null
          attachments?: Json
          created_at?: string
          created_by?: string | null
          currency?: string
          delivery_expected?: string | null
          eta_date?: string | null
          id?: string
          id_short?: number
          invoice_date?: string | null
          invoice_no?: string | null
          issued_qty?: number | null
          object_id?: string | null
          object_name?: string | null
          payment_date?: string | null
          payment_status?: string
          po_no?: string | null
          price_per_unit?: number | null
          proposal_id?: string | null
          received_qty?: number | null
          request_id?: string | null
          request_id_old?: number | null
          status?: string | null
          supplier?: string | null
          supplier_id?: string | null
          vat_percent?: number | null
        }
        Update: {
          amount?: number | null
          approved_at?: string | null
          attachments?: Json
          created_at?: string
          created_by?: string | null
          currency?: string
          delivery_expected?: string | null
          eta_date?: string | null
          id?: string
          id_short?: number
          invoice_date?: string | null
          invoice_no?: string | null
          issued_qty?: number | null
          object_id?: string | null
          object_name?: string | null
          payment_date?: string | null
          payment_status?: string
          po_no?: string | null
          price_per_unit?: number | null
          proposal_id?: string | null
          received_qty?: number | null
          request_id?: string | null
          request_id_old?: number | null
          status?: string | null
          supplier?: string | null
          supplier_id?: string | null
          vat_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_purchases_request"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "buyer_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_purchases_request"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "director_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_purchases_request"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "request_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_purchases_request"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_purchases_request"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_director_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_purchases_request"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_foreman_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_purchases_request"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_foreman_requests2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_purchases_request"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_full"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "fk_purchases_request"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_header"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_purchases_request"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_purchases_request"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_heads_ui"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "fk_purchases_request"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_heads_ui_base"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "fk_purchases_request"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "fk_purchases_request"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_base"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "fk_purchases_request"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_fixed"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "fk_purchases_request"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_old"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "fk_purchases_request"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "warehouse_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_object_fk"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "buyer_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "director_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "request_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_director_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_foreman_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_foreman_requests2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_full"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "purchases_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_header"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_heads_ui"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "purchases_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_heads_ui_base"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "purchases_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "purchases_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_base"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "purchases_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_fixed"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "purchases_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_old"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "purchases_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "warehouse_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases_dupe_archive: {
        Row: {
          amount: number | null
          arrival_date: string | null
          comment: string | null
          created_at: string | null
          date: string | null
          id: number | null
          name: string | null
          object: string | null
          po: string | null
          price: number | null
          qty: number | null
          receipt_no: string | null
          request_id: number | null
          rik_code: string | null
          status: string | null
          supplier: string | null
          uom: string | null
        }
        Insert: {
          amount?: number | null
          arrival_date?: string | null
          comment?: string | null
          created_at?: string | null
          date?: string | null
          id?: number | null
          name?: string | null
          object?: string | null
          po?: string | null
          price?: number | null
          qty?: number | null
          receipt_no?: string | null
          request_id?: number | null
          rik_code?: string | null
          status?: string | null
          supplier?: string | null
          uom?: string | null
        }
        Update: {
          amount?: number | null
          arrival_date?: string | null
          comment?: string | null
          created_at?: string | null
          date?: string | null
          id?: number | null
          name?: string | null
          object?: string | null
          po?: string | null
          price?: number | null
          qty?: number | null
          receipt_no?: string | null
          request_id?: number | null
          rik_code?: string | null
          status?: string | null
          supplier?: string | null
          uom?: string | null
        }
        Relationships: []
      }
      purchases_items_pending: {
        Row: {
          created_at: string | null
          id: string
          request_id: string | null
          request_id_old: number
          request_item_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          request_id?: string | null
          request_id_old: number
          request_item_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          request_id?: string | null
          request_id_old?: number
          request_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_items_pending_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "buyer_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_items_pending_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "director_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_items_pending_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "request_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_items_pending_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_items_pending_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_director_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_items_pending_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_foreman_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_items_pending_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_foreman_requests2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_items_pending_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_full"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "purchases_items_pending_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_header"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_items_pending_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_items_pending_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_heads_ui"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "purchases_items_pending_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_heads_ui_base"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "purchases_items_pending_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "purchases_items_pending_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_base"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "purchases_items_pending_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_fixed"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "purchases_items_pending_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_old"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "purchases_items_pending_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "warehouse_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_items_pending_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "debug_director_items"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "purchases_items_pending_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_items_pending_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items_pending"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "purchases_items_pending_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items_pending_view"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "purchases_items_pending_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_items_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_items_pending_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_items_with_stock"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "purchases_items_pending_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_full"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "purchases_items_pending_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "purchases_items_pending_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_base"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "purchases_items_pending_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_fixed"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "purchases_items_pending_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_old"
            referencedColumns: ["request_item_id"]
          },
        ]
      }
      purchases_pending: {
        Row: {
          created_at: string | null
          id: string
          purchase_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          purchase_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          purchase_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_pending_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: true
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_pending_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: true
            referencedRelation: "purchases_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_pending_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: true
            referencedRelation: "v_acc_incoming"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "purchases_pending_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: true
            referencedRelation: "v_po_receipt_status"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "purchases_pending_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: true
            referencedRelation: "v_po_totals"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "purchases_pending_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: true
            referencedRelation: "v_purchases_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_pending_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: true
            referencedRelation: "v_stock_balance"
            referencedColumns: ["po_id"]
          },
          {
            foreignKeyName: "purchases_pending_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: true
            referencedRelation: "v_warehouse_incoming"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_pending_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: true
            referencedRelation: "v_warehouse_incoming"
            referencedColumns: ["purchase_id"]
          },
        ]
      }
      purchases_proposals: {
        Row: {
          created_at: string
          proposal_id: string
          purchase_id: string
        }
        Insert: {
          created_at?: string
          proposal_id: string
          purchase_id: string
        }
        Update: {
          created_at?: string
          proposal_id?: string
          purchase_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "proposal_files_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "proposal_files_view"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_accountant_inbox"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_accountant_inbox_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_buyer_buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_director_finance_rows"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_director_finance_spend_kinds"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_director_finance_spend_kinds_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_director_finance_spend_kinds_v3"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_director_proposals_pending"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_proposal_payments_sum"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_proposals_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_proposals_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_request_latest_proposal_ui"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: true
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_proposals_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: true
            referencedRelation: "purchases_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_proposals_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: true
            referencedRelation: "v_acc_incoming"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "purchases_proposals_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: true
            referencedRelation: "v_po_receipt_status"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "purchases_proposals_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: true
            referencedRelation: "v_po_totals"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "purchases_proposals_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: true
            referencedRelation: "v_purchases_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_proposals_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: true
            referencedRelation: "v_stock_balance"
            referencedColumns: ["po_id"]
          },
          {
            foreignKeyName: "purchases_proposals_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: true
            referencedRelation: "v_warehouse_incoming"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_proposals_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: true
            referencedRelation: "v_warehouse_incoming"
            referencedColumns: ["purchase_id"]
          },
        ]
      }
      purchases_request_fix: {
        Row: {
          purchase_id: string
          request_no: number
        }
        Insert: {
          purchase_id: string
          request_no: number
        }
        Update: {
          purchase_id?: string
          request_no?: number
        }
        Relationships: []
      }
      receipts: {
        Row: {
          created_at: string
          date_received: string
          id: string
          note: string | null
          purchase_id: string
          purchase_item_id: string | null
          qty: number
          received_by: string | null
        }
        Insert: {
          created_at?: string
          date_received?: string
          id?: string
          note?: string | null
          purchase_id: string
          purchase_item_id?: string | null
          qty: number
          received_by?: string | null
        }
        Update: {
          created_at?: string
          date_received?: string
          id?: string
          note?: string | null
          purchase_id?: string
          purchase_item_id?: string | null
          qty?: number
          received_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_acc_incoming"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "receipts_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_po_receipt_status"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "receipts_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_po_totals"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "receipts_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_purchases_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_stock_balance"
            referencedColumns: ["po_id"]
          },
          {
            foreignKeyName: "receipts_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_warehouse_incoming"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_warehouse_incoming"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "receipts_purchase_item_id_fkey"
            columns: ["purchase_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_items"
            referencedColumns: ["id"]
          },
        ]
      }
      ref_levels: {
        Row: {
          alias_ru: string | null
          code: string
          display_name: string | null
          name: string
          name_human_ru: string | null
          name_ru: string | null
          sort: number | null
        }
        Insert: {
          alias_ru?: string | null
          code: string
          display_name?: string | null
          name: string
          name_human_ru?: string | null
          name_ru?: string | null
          sort?: number | null
        }
        Update: {
          alias_ru?: string | null
          code?: string
          display_name?: string | null
          name?: string
          name_human_ru?: string | null
          name_ru?: string | null
          sort?: number | null
        }
        Relationships: []
      }
      ref_object_types: {
        Row: {
          alias_ru: string | null
          code: string
          display_name: string | null
          name: string
          name_human_ru: string | null
          name_ru: string | null
        }
        Insert: {
          alias_ru?: string | null
          code: string
          display_name?: string | null
          name: string
          name_human_ru?: string | null
          name_ru?: string | null
        }
        Update: {
          alias_ru?: string | null
          code?: string
          display_name?: string | null
          name?: string
          name_human_ru?: string | null
          name_ru?: string | null
        }
        Relationships: []
      }
      ref_systems: {
        Row: {
          alias_ru: string | null
          code: string
          display_name: string | null
          name: string
          name_human_ru: string | null
          name_ru: string | null
        }
        Insert: {
          alias_ru?: string | null
          code: string
          display_name?: string | null
          name: string
          name_human_ru?: string | null
          name_ru?: string | null
        }
        Update: {
          alias_ru?: string | null
          code?: string
          display_name?: string | null
          name?: string
          name_human_ru?: string | null
          name_ru?: string | null
        }
        Relationships: []
      }
      ref_uoms: {
        Row: {
          kind: string | null
          name_ru: string
          uom_code: string
        }
        Insert: {
          kind?: string | null
          name_ru: string
          uom_code: string
        }
        Update: {
          kind?: string | null
          name_ru?: string
          uom_code?: string
        }
        Relationships: []
      }
      ref_zones: {
        Row: {
          alias_ru: string | null
          code: string
          display_name: string | null
          name: string
          name_human_ru: string | null
          name_ru: string | null
        }
        Insert: {
          alias_ru?: string | null
          code: string
          display_name?: string | null
          name: string
          name_human_ru?: string | null
          name_ru?: string | null
        }
        Update: {
          alias_ru?: string | null
          code?: string
          display_name?: string | null
          name?: string
          name_human_ru?: string | null
          name_ru?: string | null
        }
        Relationships: []
      }
      reno_basis_key_hints: {
        Row: {
          basis_key: string
          example_ru: string | null
          hint_ru: string | null
        }
        Insert: {
          basis_key: string
          example_ru?: string | null
          hint_ru?: string | null
        }
        Update: {
          basis_key?: string
          example_ru?: string | null
          hint_ru?: string | null
        }
        Relationships: []
      }
      reno_calc_fields: {
        Row: {
          default_value: Json | null
          field_key: string | null
          field_type: string | null
          hint: string | null
          hint_ru: string | null
          is_active: boolean | null
          is_required: boolean
          key: string
          label: string
          label_ru: string | null
          order_index: number | null
          profile_code: string | null
          required: boolean | null
          uom: string | null
          uom_code: string | null
          work_type_code: string
        }
        Insert: {
          default_value?: Json | null
          field_key?: string | null
          field_type?: string | null
          hint?: string | null
          hint_ru?: string | null
          is_active?: boolean | null
          is_required?: boolean
          key: string
          label?: string
          label_ru?: string | null
          order_index?: number | null
          profile_code?: string | null
          required?: boolean | null
          uom?: string | null
          uom_code?: string | null
          work_type_code: string
        }
        Update: {
          default_value?: Json | null
          field_key?: string | null
          field_type?: string | null
          hint?: string | null
          hint_ru?: string | null
          is_active?: boolean | null
          is_required?: boolean
          key?: string
          label?: string
          label_ru?: string | null
          order_index?: number | null
          profile_code?: string | null
          required?: boolean | null
          uom?: string | null
          uom_code?: string | null
          work_type_code?: string
        }
        Relationships: []
      }
      reno_calc_profile_fields: {
        Row: {
          default_value: Json | null
          field_key: string
          field_type: string
          hint_ru: string | null
          id: number
          is_required: boolean
          label_ru: string
          order_index: number
          profile_code: string
          uom: string | null
        }
        Insert: {
          default_value?: Json | null
          field_key: string
          field_type: string
          hint_ru?: string | null
          id?: number
          is_required?: boolean
          label_ru: string
          order_index?: number
          profile_code: string
          uom?: string | null
        }
        Update: {
          default_value?: Json | null
          field_key?: string
          field_type?: string
          hint_ru?: string | null
          id?: number
          is_required?: boolean
          label_ru?: string
          order_index?: number
          profile_code?: string
          uom?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reno_calc_profile_fields_profile_code_fkey"
            columns: ["profile_code"]
            isOneToOne: false
            referencedRelation: "reno_calc_profiles"
            referencedColumns: ["code"]
          },
        ]
      }
      reno_calc_profiles: {
        Row: {
          code: string
          description_ru: string | null
          name_ru: string
          sort_order: number
        }
        Insert: {
          code: string
          description_ru?: string | null
          name_ru: string
          sort_order?: number
        }
        Update: {
          code?: string
          description_ru?: string | null
          name_ru?: string
          sort_order?: number
        }
        Relationships: []
      }
      reno_concrete_coeffs: {
        Row: {
          loss_default_pct: number
          pump_threshold_m3: number
          rebar_kg_per_m3: number
          work_type_code: string
        }
        Insert: {
          loss_default_pct?: number
          pump_threshold_m3?: number
          rebar_kg_per_m3?: number
          work_type_code: string
        }
        Update: {
          loss_default_pct?: number
          pump_threshold_m3?: number
          rebar_kg_per_m3?: number
          work_type_code?: string
        }
        Relationships: []
      }
      reno_kit_items: {
        Row: {
          kit_code: string
          ord: number
          qty_suggest: number
          rik_code: string
          section: string
        }
        Insert: {
          kit_code: string
          ord?: number
          qty_suggest?: number
          rik_code: string
          section: string
        }
        Update: {
          kit_code?: string
          ord?: number
          qty_suggest?: number
          rik_code?: string
          section?: string
        }
        Relationships: []
      }
      reno_kit_templates: {
        Row: {
          id: number
          object_profile_code: string | null
          ord: number
          qty_suggest: number
          rik_code: string
          section: Database["public"]["Enums"]["reno_section"]
          work_type_code: string
        }
        Insert: {
          id?: number
          object_profile_code?: string | null
          ord?: number
          qty_suggest?: number
          rik_code: string
          section?: Database["public"]["Enums"]["reno_section"]
          work_type_code: string
        }
        Update: {
          id?: number
          object_profile_code?: string | null
          ord?: number
          qty_suggest?: number
          rik_code?: string
          section?: Database["public"]["Enums"]["reno_section"]
          work_type_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "reno_kit_templates_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "reno_work_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "reno_kit_templates_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "v_reno_work_types_ui"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "reno_kit_templates_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "v_steel_work_types_clean"
            referencedColumns: ["work_type_code"]
          },
          {
            foreignKeyName: "reno_kit_templates_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "v_work_types_grouped"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "reno_kit_templates_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "v_work_types_picker"
            referencedColumns: ["code"]
          },
        ]
      }
      reno_label_ru: {
        Row: {
          kind: string | null
          name_ru: string
          rik_code: string
          uom_code: string | null
        }
        Insert: {
          kind?: string | null
          name_ru: string
          rik_code: string
          uom_code?: string | null
        }
        Update: {
          kind?: string | null
          name_ru?: string
          rik_code?: string
          uom_code?: string | null
        }
        Relationships: []
      }
      reno_norm_coeffs: {
        Row: {
          coef_per_m2: number
          is_active: boolean
          name_ru: string
          rik_code: string
          round_mode: string
          section: string
          uom_code: string
          work_type: string
        }
        Insert: {
          coef_per_m2: number
          is_active?: boolean
          name_ru: string
          rik_code: string
          round_mode?: string
          section?: string
          uom_code: string
          work_type: string
        }
        Update: {
          coef_per_m2?: number
          is_active?: boolean
          name_ru?: string
          rik_code?: string
          round_mode?: string
          section?: string
          uom_code?: string
          work_type?: string
        }
        Relationships: []
      }
      reno_norm_overrides: {
        Row: {
          customer_id: string | null
          expr: string
          id: number
          max_qty: number | null
          min_qty: number | null
          notes: string | null
          object_id: string | null
          ord: number
          priority: number
          rik_code: string
          round_rule: Database["public"]["Enums"]["reno_round_rule"]
          uom_code: string | null
          work_type_code: string
        }
        Insert: {
          customer_id?: string | null
          expr: string
          id?: number
          max_qty?: number | null
          min_qty?: number | null
          notes?: string | null
          object_id?: string | null
          ord?: number
          priority?: number
          rik_code: string
          round_rule?: Database["public"]["Enums"]["reno_round_rule"]
          uom_code?: string | null
          work_type_code: string
        }
        Update: {
          customer_id?: string | null
          expr?: string
          id?: number
          max_qty?: number | null
          min_qty?: number | null
          notes?: string | null
          object_id?: string | null
          ord?: number
          priority?: number
          rik_code?: string
          round_rule?: Database["public"]["Enums"]["reno_round_rule"]
          uom_code?: string | null
          work_type_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "reno_norm_overrides_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "reno_work_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "reno_norm_overrides_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "v_reno_work_types_ui"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "reno_norm_overrides_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "v_steel_work_types_clean"
            referencedColumns: ["work_type_code"]
          },
          {
            foreignKeyName: "reno_norm_overrides_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "v_work_types_grouped"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "reno_norm_overrides_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "v_work_types_picker"
            referencedColumns: ["code"]
          },
        ]
      }
      reno_norm_rules: {
        Row: {
          apply_multiplier: boolean | null
          basis: Database["public"]["Enums"]["reno_basis"]
          coeff: number
          id: number
          is_active: boolean
          note: string | null
          rik_code: string
          round_to: number | null
          section: string
          uom_code: string
          updated_at: string | null
          work_type_code: string
        }
        Insert: {
          apply_multiplier?: boolean | null
          basis: Database["public"]["Enums"]["reno_basis"]
          coeff: number
          id?: number
          is_active?: boolean
          note?: string | null
          rik_code: string
          round_to?: number | null
          section: string
          uom_code: string
          updated_at?: string | null
          work_type_code: string
        }
        Update: {
          apply_multiplier?: boolean | null
          basis?: Database["public"]["Enums"]["reno_basis"]
          coeff?: number
          id?: number
          is_active?: boolean
          note?: string | null
          rik_code?: string
          round_to?: number | null
          section?: string
          uom_code?: string
          updated_at?: string | null
          work_type_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "reno_norm_rules_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "reno_work_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "reno_norm_rules_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "v_reno_work_types_ui"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "reno_norm_rules_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "v_steel_work_types_clean"
            referencedColumns: ["work_type_code"]
          },
          {
            foreignKeyName: "reno_norm_rules_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "v_work_types_grouped"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "reno_norm_rules_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "v_work_types_picker"
            referencedColumns: ["code"]
          },
        ]
      }
      reno_norms: {
        Row: {
          expr: string
          id: number
          max_qty: number | null
          min_qty: number | null
          notes: string | null
          object_profile_code: string | null
          ord: number
          rik_code: string
          round_rule: Database["public"]["Enums"]["reno_round_rule"]
          uom_code: string | null
          work_type_code: string
        }
        Insert: {
          expr: string
          id?: number
          max_qty?: number | null
          min_qty?: number | null
          notes?: string | null
          object_profile_code?: string | null
          ord?: number
          rik_code: string
          round_rule?: Database["public"]["Enums"]["reno_round_rule"]
          uom_code?: string | null
          work_type_code: string
        }
        Update: {
          expr?: string
          id?: number
          max_qty?: number | null
          min_qty?: number | null
          notes?: string | null
          object_profile_code?: string | null
          ord?: number
          rik_code?: string
          round_rule?: Database["public"]["Enums"]["reno_round_rule"]
          uom_code?: string | null
          work_type_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "reno_norms_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "reno_work_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "reno_norms_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "v_reno_work_types_ui"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "reno_norms_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "v_steel_work_types_clean"
            referencedColumns: ["work_type_code"]
          },
          {
            foreignKeyName: "reno_norms_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "v_work_types_grouped"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "reno_norms_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "v_work_types_picker"
            referencedColumns: ["code"]
          },
        ]
      }
      reno_object_profile_bind: {
        Row: {
          object_id: string
          object_profile_code: string
        }
        Insert: {
          object_id: string
          object_profile_code: string
        }
        Update: {
          object_id?: string
          object_profile_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "reno_object_profile_bind_object_profile_code_fkey"
            columns: ["object_profile_code"]
            isOneToOne: false
            referencedRelation: "reno_object_profiles"
            referencedColumns: ["code"]
          },
        ]
      }
      reno_object_profiles: {
        Row: {
          code: string
          defaults: Json
          name_ru: string
        }
        Insert: {
          code: string
          defaults?: Json
          name_ru: string
        }
        Update: {
          code?: string
          defaults?: Json
          name_ru?: string
        }
        Relationships: []
      }
      reno_pack_groups: {
        Row: {
          group_code: string
          loss_pct: number
          min_packs: number
          note: string | null
          pack_size: number
          pack_uom: string
        }
        Insert: {
          group_code: string
          loss_pct?: number
          min_packs?: number
          note?: string | null
          pack_size: number
          pack_uom: string
        }
        Update: {
          group_code?: string
          loss_pct?: number
          min_packs?: number
          note?: string | null
          pack_size?: number
          pack_uom?: string
        }
        Relationships: []
      }
      reno_pack_rules: {
        Row: {
          is_active: boolean | null
          loss_pct: number
          min_packs: number
          note: string | null
          pack_size: number
          pack_uom: string
          rik_code: string
        }
        Insert: {
          is_active?: boolean | null
          loss_pct?: number
          min_packs?: number
          note?: string | null
          pack_size: number
          pack_uom: string
          rik_code: string
        }
        Update: {
          is_active?: boolean | null
          loss_pct?: number
          min_packs?: number
          note?: string | null
          pack_size?: number
          pack_uom?: string
          rik_code?: string
        }
        Relationships: []
      }
      reno_tile_format_masks: {
        Row: {
          format_code: string
          grout_kg_per_m2: number
          joint_mm: number
          note: string | null
          spacers_per_m2: number
          svp_per_m2: number
          tile_a_mm: number
          tile_b_mm: number
        }
        Insert: {
          format_code: string
          grout_kg_per_m2: number
          joint_mm: number
          note?: string | null
          spacers_per_m2: number
          svp_per_m2: number
          tile_a_mm: number
          tile_b_mm: number
        }
        Update: {
          format_code?: string
          grout_kg_per_m2?: number
          joint_mm?: number
          note?: string | null
          spacers_per_m2?: number
          svp_per_m2?: number
          tile_a_mm?: number
          tile_b_mm?: number
        }
        Relationships: []
      }
      reno_work_families: {
        Row: {
          code: string
          name_ru: string
          short_name_ru: string | null
          sort_order: number
        }
        Insert: {
          code: string
          name_ru: string
          short_name_ru?: string | null
          sort_order?: number
        }
        Update: {
          code?: string
          name_ru?: string
          short_name_ru?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      reno_work_type_alias: {
        Row: {
          alias_code: string
          canonical_code: string
        }
        Insert: {
          alias_code: string
          canonical_code: string
        }
        Update: {
          alias_code?: string
          canonical_code?: string
        }
        Relationships: []
      }
      reno_work_type_catalog: {
        Row: {
          is_active: boolean
          item_kind: string
          rik_code: string
          role: string
          work_type_code: string
        }
        Insert: {
          is_active?: boolean
          item_kind: string
          rik_code: string
          role?: string
          work_type_code: string
        }
        Update: {
          is_active?: boolean
          item_kind?: string
          rik_code?: string
          role?: string
          work_type_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "reno_work_type_catalog_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "reno_work_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "reno_work_type_catalog_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "v_reno_work_types_ui"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "reno_work_type_catalog_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "v_steel_work_types_clean"
            referencedColumns: ["work_type_code"]
          },
          {
            foreignKeyName: "reno_work_type_catalog_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "v_work_types_grouped"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "reno_work_type_catalog_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "v_work_types_picker"
            referencedColumns: ["code"]
          },
        ]
      }
      reno_work_type_field_hints: {
        Row: {
          basis_key: string
          example_ru: string | null
          hint_ru: string | null
          work_type_code: string
        }
        Insert: {
          basis_key: string
          example_ru?: string | null
          hint_ru?: string | null
          work_type_code: string
        }
        Update: {
          basis_key?: string
          example_ru?: string | null
          hint_ru?: string | null
          work_type_code?: string
        }
        Relationships: []
      }
      reno_work_type_field_ui_override: {
        Row: {
          basis_key: string
          hint_ru: string | null
          label_ru: string | null
          work_type_code: string
        }
        Insert: {
          basis_key: string
          hint_ru?: string | null
          label_ru?: string | null
          work_type_code: string
        }
        Update: {
          basis_key?: string
          hint_ru?: string | null
          label_ru?: string | null
          work_type_code?: string
        }
        Relationships: []
      }
      reno_work_type_input_policy: {
        Row: {
          advanced_inputs: string[]
          default_loss: number | null
          hidden_inputs: string[]
          primary_inputs: string[]
          work_type_code: string
        }
        Insert: {
          advanced_inputs?: string[]
          default_loss?: number | null
          hidden_inputs?: string[]
          primary_inputs: string[]
          work_type_code: string
        }
        Update: {
          advanced_inputs?: string[]
          default_loss?: number | null
          hidden_inputs?: string[]
          primary_inputs?: string[]
          work_type_code?: string
        }
        Relationships: []
      }
      reno_work_type_options: {
        Row: {
          basis_key: string
          coeff: number
          desc_ru: string | null
          is_default: boolean
          opt_code: string
          rik_code: string
          section: string
          sort_order: number
          title_ru: string
          work_type_code: string
        }
        Insert: {
          basis_key?: string
          coeff?: number
          desc_ru?: string | null
          is_default?: boolean
          opt_code: string
          rik_code: string
          section: string
          sort_order?: number
          title_ru: string
          work_type_code: string
        }
        Update: {
          basis_key?: string
          coeff?: number
          desc_ru?: string | null
          is_default?: boolean
          opt_code?: string
          rik_code?: string
          section?: string
          sort_order?: number
          title_ru?: string
          work_type_code?: string
        }
        Relationships: []
      }
      reno_work_type_scope: {
        Row: {
          safety_ru: string | null
          scope_ru: string
          tools_ru: string | null
          work_type_code: string
        }
        Insert: {
          safety_ru?: string | null
          scope_ru: string
          tools_ru?: string | null
          work_type_code: string
        }
        Update: {
          safety_ru?: string | null
          scope_ru?: string
          tools_ru?: string | null
          work_type_code?: string
        }
        Relationships: []
      }
      reno_work_types: {
        Row: {
          calc_profile_code: string | null
          category_code: string | null
          code: string
          created_at: string
          family_code: string | null
          family_name: string | null
          family_sort_order: number | null
          is_active: boolean
          measure_uom: string | null
          name_human_ru: string | null
          name_ru: string
          params_schema: Json
          segment: Database["public"]["Enums"]["reno_segment"]
          updated_at: string
        }
        Insert: {
          calc_profile_code?: string | null
          category_code?: string | null
          code: string
          created_at?: string
          family_code?: string | null
          family_name?: string | null
          family_sort_order?: number | null
          is_active?: boolean
          measure_uom?: string | null
          name_human_ru?: string | null
          name_ru: string
          params_schema?: Json
          segment?: Database["public"]["Enums"]["reno_segment"]
          updated_at?: string
        }
        Update: {
          calc_profile_code?: string | null
          category_code?: string | null
          code?: string
          created_at?: string
          family_code?: string | null
          family_name?: string | null
          family_sort_order?: number | null
          is_active?: boolean
          measure_uom?: string | null
          name_human_ru?: string | null
          name_ru?: string
          params_schema?: Json
          segment?: Database["public"]["Enums"]["reno_segment"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reno_work_types_family_code_fkey"
            columns: ["family_code"]
            isOneToOne: false
            referencedRelation: "reno_work_families"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "reno_work_types_family_code_fkey"
            columns: ["family_code"]
            isOneToOne: false
            referencedRelation: "v_work_types_grouped"
            referencedColumns: ["group_code"]
          },
        ]
      }
      request_items: {
        Row: {
          app_code: string | null
          cancelled_at: string | null
          code: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decided_by_role: string | null
          director_reject_at: string | null
          director_reject_note: string | null
          id: string
          item_kind: string | null
          kind: string | null
          name_human: string
          name_human_nn: string | null
          need_by: string | null
          note: string | null
          position_order: number
          price: number | null
          purchase_id: string | null
          qty: number
          ref_id: string | null
          ref_table: string
          request_id: string
          rik_code: string
          row_no: number
          status: string | null
          supplier: string | null
          supplier_hint: string | null
          unit_id: string | null
          uom: string
          uom_nn: string | null
          updated_at: string
          usage_category: string | null
          vat: number | null
        }
        Insert: {
          app_code?: string | null
          cancelled_at?: string | null
          code?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decided_by_role?: string | null
          director_reject_at?: string | null
          director_reject_note?: string | null
          id?: string
          item_kind?: string | null
          kind?: string | null
          name_human: string
          name_human_nn?: string | null
          need_by?: string | null
          note?: string | null
          position_order?: number
          price?: number | null
          purchase_id?: string | null
          qty: number
          ref_id?: string | null
          ref_table?: string
          request_id: string
          rik_code: string
          row_no?: number
          status?: string | null
          supplier?: string | null
          supplier_hint?: string | null
          unit_id?: string | null
          uom: string
          uom_nn?: string | null
          updated_at?: string
          usage_category?: string | null
          vat?: number | null
        }
        Update: {
          app_code?: string | null
          cancelled_at?: string | null
          code?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decided_by_role?: string | null
          director_reject_at?: string | null
          director_reject_note?: string | null
          id?: string
          item_kind?: string | null
          kind?: string | null
          name_human?: string
          name_human_nn?: string | null
          need_by?: string | null
          note?: string | null
          position_order?: number
          price?: number | null
          purchase_id?: string | null
          qty?: number
          ref_id?: string | null
          ref_table?: string
          request_id?: string
          rik_code?: string
          row_no?: number
          status?: string | null
          supplier?: string | null
          supplier_hint?: string | null
          unit_id?: string | null
          uom?: string
          uom_nn?: string | null
          updated_at?: string
          usage_category?: string | null
          vat?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "request_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_acc_incoming"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "request_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_po_receipt_status"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "request_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_po_totals"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "request_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_purchases_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_stock_balance"
            referencedColumns: ["po_id"]
          },
          {
            foreignKeyName: "request_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_warehouse_incoming"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_warehouse_incoming"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "request_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "uoms"
            referencedColumns: ["id"]
          },
        ]
      }
      request_items_approvals: {
        Row: {
          created_at: string | null
          id: string
          request_id: number
          request_item_id: string
          status: Database["public"]["Enums"]["approval_status"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          request_id: number
          request_item_id: string
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Update: {
          created_at?: string | null
          id?: string
          request_id?: number
          request_item_id?: string
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Relationships: [
          {
            foreignKeyName: "request_items_approvals_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "debug_director_items"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "request_items_approvals_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_items_approvals_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items_pending"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "request_items_approvals_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items_pending_view"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "request_items_approvals_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_items_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_items_approvals_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_items_with_stock"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "request_items_approvals_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_full"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "request_items_approvals_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "request_items_approvals_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_base"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "request_items_approvals_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_fixed"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "request_items_approvals_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_old"
            referencedColumns: ["request_item_id"]
          },
        ]
      }
      request_items_archive: {
        Row: {
          app_code: string | null
          code: string | null
          created_at: string | null
          decided_at: string | null
          decided_by: string | null
          decided_by_role: string | null
          id: string | null
          kind: string | null
          name_human: string | null
          need_by: string | null
          note: string | null
          position_order: number | null
          price: number | null
          purchase_id: string | null
          qty: number | null
          ref_id: string | null
          ref_table: string | null
          request_id: string | null
          rik_code: string | null
          status: string | null
          supplier: string | null
          supplier_hint: string | null
          unit_id: string | null
          uom: string | null
          updated_at: string | null
          usage_category: string | null
          vat: number | null
        }
        Insert: {
          app_code?: string | null
          code?: string | null
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decided_by_role?: string | null
          id?: string | null
          kind?: string | null
          name_human?: string | null
          need_by?: string | null
          note?: string | null
          position_order?: number | null
          price?: number | null
          purchase_id?: string | null
          qty?: number | null
          ref_id?: string | null
          ref_table?: string | null
          request_id?: string | null
          rik_code?: string | null
          status?: string | null
          supplier?: string | null
          supplier_hint?: string | null
          unit_id?: string | null
          uom?: string | null
          updated_at?: string | null
          usage_category?: string | null
          vat?: number | null
        }
        Update: {
          app_code?: string | null
          code?: string | null
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decided_by_role?: string | null
          id?: string | null
          kind?: string | null
          name_human?: string | null
          need_by?: string | null
          note?: string | null
          position_order?: number | null
          price?: number | null
          purchase_id?: string | null
          qty?: number | null
          ref_id?: string | null
          ref_table?: string | null
          request_id?: string | null
          rik_code?: string | null
          status?: string | null
          supplier?: string | null
          supplier_hint?: string | null
          unit_id?: string | null
          uom?: string | null
          updated_at?: string | null
          usage_category?: string | null
          vat?: number | null
        }
        Relationships: []
      }
      request_lines: {
        Row: {
          created_at: string | null
          id: string
          name_display: string | null
          name_human_ru: string | null
          note: string | null
          qty: number | null
          request_id: string | null
          rik_code: string | null
          section: string | null
          uom_code: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name_display?: string | null
          name_human_ru?: string | null
          note?: string | null
          qty?: number | null
          request_id?: string | null
          rik_code?: string | null
          section?: string | null
          uom_code?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name_display?: string | null
          name_human_ru?: string | null
          note?: string | null
          qty?: number | null
          request_id?: string | null
          rik_code?: string | null
          section?: string | null
          uom_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_lines_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "buyer_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_lines_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "director_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_lines_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "request_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_lines_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_lines_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_director_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_lines_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_foreman_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_lines_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_foreman_requests2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_lines_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_full"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_lines_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_header"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_lines_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_lines_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_heads_ui"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_lines_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_heads_ui_base"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_lines_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_lines_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_base"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_lines_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_fixed"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_lines_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_old"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_lines_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "warehouse_inbox"
            referencedColumns: ["id"]
          },
        ]
      }
      request_year_counters: {
        Row: {
          counter: number
          seq: number | null
          yyyy: number
        }
        Insert: {
          counter?: number
          seq?: number | null
          yyyy: number
        }
        Update: {
          counter?: number
          seq?: number | null
          yyyy?: number
        }
        Relationships: []
      }
      requests: {
        Row: {
          approved: boolean | null
          comment: string | null
          company_bank_snapshot: string | null
          company_email_snapshot: string | null
          company_inn_snapshot: string | null
          company_legal_address_snapshot: string | null
          company_name_snapshot: string | null
          company_phone_snapshot: string | null
          contractor_job_id: string | null
          created_at: string | null
          created_by: string | null
          created_email: string | null
          date: string | null
          desired_date: string | null
          display_no: string | null
          doc_no: string | null
          doc_no_base: string | null
          foreman: string | null
          foreman_fio: string | null
          foreman_name: string | null
          id: string
          id_old: number
          id_short: number
          level_code: string | null
          moved: boolean | null
          name: string | null
          need_by: string | null
          note: string | null
          object: string | null
          object_id: string | null
          object_name: string | null
          object_type_code: string | null
          pretty_no: string | null
          qty: number | null
          request_no: string | null
          requested_by: string | null
          responsible: string | null
          rik_code: string | null
          role: string | null
          sector: string | null
          seq: number | null
          site_address_snapshot: string | null
          status: Database["public"]["Enums"]["request_status_enum"] | null
          subcontract_id: string | null
          submitted_at: string | null
          submitted_by: string | null
          system_code: string | null
          uom: string | null
          uom_id: string | null
          updated_at: string
          year: number | null
          zone_code: string | null
        }
        Insert: {
          approved?: boolean | null
          comment?: string | null
          company_bank_snapshot?: string | null
          company_email_snapshot?: string | null
          company_inn_snapshot?: string | null
          company_legal_address_snapshot?: string | null
          company_name_snapshot?: string | null
          company_phone_snapshot?: string | null
          contractor_job_id?: string | null
          created_at?: string | null
          created_by?: string | null
          created_email?: string | null
          date?: string | null
          desired_date?: string | null
          display_no?: string | null
          doc_no?: string | null
          doc_no_base?: string | null
          foreman?: string | null
          foreman_fio?: string | null
          foreman_name?: string | null
          id?: string
          id_old?: number
          id_short?: number
          level_code?: string | null
          moved?: boolean | null
          name?: string | null
          need_by?: string | null
          note?: string | null
          object?: string | null
          object_id?: string | null
          object_name?: string | null
          object_type_code?: string | null
          pretty_no?: string | null
          qty?: number | null
          request_no?: string | null
          requested_by?: string | null
          responsible?: string | null
          rik_code?: string | null
          role?: string | null
          sector?: string | null
          seq?: number | null
          site_address_snapshot?: string | null
          status?: Database["public"]["Enums"]["request_status_enum"] | null
          subcontract_id?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          system_code?: string | null
          uom?: string | null
          uom_id?: string | null
          updated_at?: string
          year?: number | null
          zone_code?: string | null
        }
        Update: {
          approved?: boolean | null
          comment?: string | null
          company_bank_snapshot?: string | null
          company_email_snapshot?: string | null
          company_inn_snapshot?: string | null
          company_legal_address_snapshot?: string | null
          company_name_snapshot?: string | null
          company_phone_snapshot?: string | null
          contractor_job_id?: string | null
          created_at?: string | null
          created_by?: string | null
          created_email?: string | null
          date?: string | null
          desired_date?: string | null
          display_no?: string | null
          doc_no?: string | null
          doc_no_base?: string | null
          foreman?: string | null
          foreman_fio?: string | null
          foreman_name?: string | null
          id?: string
          id_old?: number
          id_short?: number
          level_code?: string | null
          moved?: boolean | null
          name?: string | null
          need_by?: string | null
          note?: string | null
          object?: string | null
          object_id?: string | null
          object_name?: string | null
          object_type_code?: string | null
          pretty_no?: string | null
          qty?: number | null
          request_no?: string | null
          requested_by?: string | null
          responsible?: string | null
          rik_code?: string | null
          role?: string | null
          sector?: string | null
          seq?: number | null
          site_address_snapshot?: string | null
          status?: Database["public"]["Enums"]["request_status_enum"] | null
          subcontract_id?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          system_code?: string | null
          uom?: string | null
          uom_id?: string | null
          updated_at?: string
          year?: number | null
          zone_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_contractor_job_id_fkey"
            columns: ["contractor_job_id"]
            isOneToOne: false
            referencedRelation: "subcontracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_level_code_fkey"
            columns: ["level_code"]
            isOneToOne: false
            referencedRelation: "ref_levels"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "requests_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_object_type_code_fkey"
            columns: ["object_type_code"]
            isOneToOne: false
            referencedRelation: "ref_object_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "requests_subcontract_id_fkey"
            columns: ["subcontract_id"]
            isOneToOne: false
            referencedRelation: "subcontracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_system_code_fkey"
            columns: ["system_code"]
            isOneToOne: false
            referencedRelation: "ref_systems"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "requests_uom_id_fkey"
            columns: ["uom_id"]
            isOneToOne: false
            referencedRelation: "uoms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_zone_code_fkey"
            columns: ["zone_code"]
            isOneToOne: false
            referencedRelation: "ref_zones"
            referencedColumns: ["code"]
          },
        ]
      }
      requests_archive: {
        Row: {
          approved: boolean | null
          comment: string | null
          created_at: string | null
          created_by: string | null
          created_email: string | null
          date: string | null
          desired_date: string | null
          display_no: string | null
          doc_no: string | null
          doc_no_base: string | null
          foreman: string | null
          foreman_fio: string | null
          foreman_name: string | null
          id: string | null
          id_old: number | null
          id_short: number | null
          level_code: string | null
          moved: boolean | null
          name: string | null
          need_by: string | null
          note: string | null
          object: string | null
          object_id: string | null
          object_name: string | null
          object_type_code: string | null
          pretty_no: string | null
          qty: number | null
          request_no: string | null
          request_no_new: string | null
          requested_by: string | null
          responsible: string | null
          rik_code: string | null
          role: string | null
          sector: string | null
          seq: number | null
          status: string | null
          submitted_at: string | null
          submitted_by: string | null
          system_code: string | null
          uom: string | null
          uom_id: string | null
          updated_at: string | null
          year: number | null
          zone_code: string | null
        }
        Insert: {
          approved?: boolean | null
          comment?: string | null
          created_at?: string | null
          created_by?: string | null
          created_email?: string | null
          date?: string | null
          desired_date?: string | null
          display_no?: string | null
          doc_no?: string | null
          doc_no_base?: string | null
          foreman?: string | null
          foreman_fio?: string | null
          foreman_name?: string | null
          id?: string | null
          id_old?: number | null
          id_short?: number | null
          level_code?: string | null
          moved?: boolean | null
          name?: string | null
          need_by?: string | null
          note?: string | null
          object?: string | null
          object_id?: string | null
          object_name?: string | null
          object_type_code?: string | null
          pretty_no?: string | null
          qty?: number | null
          request_no?: string | null
          request_no_new?: string | null
          requested_by?: string | null
          responsible?: string | null
          rik_code?: string | null
          role?: string | null
          sector?: string | null
          seq?: number | null
          status?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          system_code?: string | null
          uom?: string | null
          uom_id?: string | null
          updated_at?: string | null
          year?: number | null
          zone_code?: string | null
        }
        Update: {
          approved?: boolean | null
          comment?: string | null
          created_at?: string | null
          created_by?: string | null
          created_email?: string | null
          date?: string | null
          desired_date?: string | null
          display_no?: string | null
          doc_no?: string | null
          doc_no_base?: string | null
          foreman?: string | null
          foreman_fio?: string | null
          foreman_name?: string | null
          id?: string | null
          id_old?: number | null
          id_short?: number | null
          level_code?: string | null
          moved?: boolean | null
          name?: string | null
          need_by?: string | null
          note?: string | null
          object?: string | null
          object_id?: string | null
          object_name?: string | null
          object_type_code?: string | null
          pretty_no?: string | null
          qty?: number | null
          request_no?: string | null
          request_no_new?: string | null
          requested_by?: string | null
          responsible?: string | null
          rik_code?: string | null
          role?: string | null
          sector?: string | null
          seq?: number | null
          status?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          system_code?: string | null
          uom?: string | null
          uom_id?: string | null
          updated_at?: string | null
          year?: number | null
          zone_code?: string | null
        }
        Relationships: []
      }
      requests_cleanup_backup_20260308: {
        Row: {
          approved: boolean | null
          comment: string | null
          company_bank_snapshot: string | null
          company_email_snapshot: string | null
          company_inn_snapshot: string | null
          company_legal_address_snapshot: string | null
          company_name_snapshot: string | null
          company_phone_snapshot: string | null
          contractor_job_id: string | null
          created_at: string | null
          created_by: string | null
          created_email: string | null
          date: string | null
          desired_date: string | null
          display_no: string | null
          doc_no: string | null
          doc_no_base: string | null
          foreman: string | null
          foreman_fio: string | null
          foreman_name: string | null
          id: string | null
          id_old: number | null
          id_short: number | null
          level_code: string | null
          moved: boolean | null
          name: string | null
          need_by: string | null
          note: string | null
          object: string | null
          object_id: string | null
          object_name: string | null
          object_type_code: string | null
          pretty_no: string | null
          qty: number | null
          request_no: string | null
          requested_by: string | null
          responsible: string | null
          rik_code: string | null
          role: string | null
          sector: string | null
          seq: number | null
          site_address_snapshot: string | null
          status: Database["public"]["Enums"]["request_status_enum"] | null
          subcontract_id: string | null
          submitted_at: string | null
          submitted_by: string | null
          system_code: string | null
          uom: string | null
          uom_id: string | null
          updated_at: string | null
          year: number | null
          zone_code: string | null
        }
        Insert: {
          approved?: boolean | null
          comment?: string | null
          company_bank_snapshot?: string | null
          company_email_snapshot?: string | null
          company_inn_snapshot?: string | null
          company_legal_address_snapshot?: string | null
          company_name_snapshot?: string | null
          company_phone_snapshot?: string | null
          contractor_job_id?: string | null
          created_at?: string | null
          created_by?: string | null
          created_email?: string | null
          date?: string | null
          desired_date?: string | null
          display_no?: string | null
          doc_no?: string | null
          doc_no_base?: string | null
          foreman?: string | null
          foreman_fio?: string | null
          foreman_name?: string | null
          id?: string | null
          id_old?: number | null
          id_short?: number | null
          level_code?: string | null
          moved?: boolean | null
          name?: string | null
          need_by?: string | null
          note?: string | null
          object?: string | null
          object_id?: string | null
          object_name?: string | null
          object_type_code?: string | null
          pretty_no?: string | null
          qty?: number | null
          request_no?: string | null
          requested_by?: string | null
          responsible?: string | null
          rik_code?: string | null
          role?: string | null
          sector?: string | null
          seq?: number | null
          site_address_snapshot?: string | null
          status?: Database["public"]["Enums"]["request_status_enum"] | null
          subcontract_id?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          system_code?: string | null
          uom?: string | null
          uom_id?: string | null
          updated_at?: string | null
          year?: number | null
          zone_code?: string | null
        }
        Update: {
          approved?: boolean | null
          comment?: string | null
          company_bank_snapshot?: string | null
          company_email_snapshot?: string | null
          company_inn_snapshot?: string | null
          company_legal_address_snapshot?: string | null
          company_name_snapshot?: string | null
          company_phone_snapshot?: string | null
          contractor_job_id?: string | null
          created_at?: string | null
          created_by?: string | null
          created_email?: string | null
          date?: string | null
          desired_date?: string | null
          display_no?: string | null
          doc_no?: string | null
          doc_no_base?: string | null
          foreman?: string | null
          foreman_fio?: string | null
          foreman_name?: string | null
          id?: string | null
          id_old?: number | null
          id_short?: number | null
          level_code?: string | null
          moved?: boolean | null
          name?: string | null
          need_by?: string | null
          note?: string | null
          object?: string | null
          object_id?: string | null
          object_name?: string | null
          object_type_code?: string | null
          pretty_no?: string | null
          qty?: number | null
          request_no?: string | null
          requested_by?: string | null
          responsible?: string | null
          rik_code?: string | null
          role?: string | null
          sector?: string | null
          seq?: number | null
          site_address_snapshot?: string | null
          status?: Database["public"]["Enums"]["request_status_enum"] | null
          subcontract_id?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          system_code?: string | null
          uom?: string | null
          uom_id?: string | null
          updated_at?: string | null
          year?: number | null
          zone_code?: string | null
        }
        Relationships: []
      }
      rik_code_alias: {
        Row: {
          alias_code: string
          alias_norm: string | null
          canon_code: string
          canon_norm: string | null
          confidence: number | null
          created_at: string
          created_by: string | null
          reason: string | null
        }
        Insert: {
          alias_code: string
          alias_norm?: string | null
          canon_code: string
          canon_norm?: string | null
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          reason?: string | null
        }
        Update: {
          alias_code?: string
          alias_norm?: string | null
          canon_code?: string
          canon_norm?: string | null
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          reason?: string | null
        }
        Relationships: []
      }
      rik_uom_overrides: {
        Row: {
          rik_code: string
          uom_code: string
          updated_at: string
        }
        Insert: {
          rik_code: string
          uom_code: string
          updated_at?: string
        }
        Update: {
          rik_code?: string
          uom_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      rpc_debug_log: {
        Row: {
          at: string
          fn: string
          id: number
          note: string | null
          payload: Json | null
        }
        Insert: {
          at?: string
          fn: string
          id?: number
          note?: string | null
          payload?: Json | null
        }
        Update: {
          at?: string
          fn?: string
          id?: number
          note?: string | null
          payload?: Json | null
        }
        Relationships: []
      }
      search_logs: {
        Row: {
          canceled: boolean | null
          created_at: string
          id: number
          object_id: string | null
          picked_ref_id: string | null
          picked_ref_table: string | null
          query_norm: string | null
          query_raw: string | null
          user_id: string | null
        }
        Insert: {
          canceled?: boolean | null
          created_at?: string
          id?: number
          object_id?: string | null
          picked_ref_id?: string | null
          picked_ref_table?: string | null
          query_norm?: string | null
          query_raw?: string | null
          user_id?: string | null
        }
        Update: {
          canceled?: boolean | null
          created_at?: string
          id?: number
          object_id?: string | null
          picked_ref_id?: string | null
          picked_ref_table?: string | null
          query_norm?: string | null
          query_raw?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sectors: {
        Row: {
          id: string
          name: string | null
          object_id: string | null
        }
        Insert: {
          id?: string
          name?: string | null
          object_id?: string | null
        }
        Update: {
          id?: string
          name?: string | null
          object_id?: string | null
        }
        Relationships: []
      }
      seq_yearly: {
        Row: {
          kind: string
          last_no: number
          yr: number
        }
        Insert: {
          kind: string
          last_no?: number
          yr: number
        }
        Update: {
          kind?: string
          last_no?: number
          yr?: number
        }
        Relationships: []
      }
      stock_balances: {
        Row: {
          id: string
          object_id: string | null
          qty_on_hand: number | null
          qty_reserved: number | null
          ref_id: string | null
          rik_code: string
          sector: string | null
          uom: string | null
          uom_id: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          object_id?: string | null
          qty_on_hand?: number | null
          qty_reserved?: number | null
          ref_id?: string | null
          rik_code: string
          sector?: string | null
          uom?: string | null
          uom_id: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          object_id?: string | null
          qty_on_hand?: number | null
          qty_reserved?: number | null
          ref_id?: string | null
          rik_code?: string
          sector?: string | null
          uom?: string | null
          uom_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      subcontracts: {
        Row: {
          approved_at: string | null
          contract_date: string | null
          contract_number: string | null
          contractor_inn: string | null
          contractor_org: string | null
          contractor_phone: string | null
          contractor_rep: string | null
          created_at: string | null
          created_by: string | null
          date_end: string | null
          date_start: string | null
          director_comment: string | null
          display_no: string | null
          foreman_comment: string | null
          foreman_name: string | null
          id: string
          object_name: string | null
          price_per_unit: number | null
          price_type: string | null
          qty_planned: number | null
          rejected_at: string | null
          seq: number | null
          status: string
          submitted_at: string | null
          total_price: number | null
          uom: string | null
          work_mode: string | null
          work_type: string | null
          work_zone: string | null
          year: number | null
        }
        Insert: {
          approved_at?: string | null
          contract_date?: string | null
          contract_number?: string | null
          contractor_inn?: string | null
          contractor_org?: string | null
          contractor_phone?: string | null
          contractor_rep?: string | null
          created_at?: string | null
          created_by?: string | null
          date_end?: string | null
          date_start?: string | null
          director_comment?: string | null
          display_no?: string | null
          foreman_comment?: string | null
          foreman_name?: string | null
          id?: string
          object_name?: string | null
          price_per_unit?: number | null
          price_type?: string | null
          qty_planned?: number | null
          rejected_at?: string | null
          seq?: number | null
          status?: string
          submitted_at?: string | null
          total_price?: number | null
          uom?: string | null
          work_mode?: string | null
          work_type?: string | null
          work_zone?: string | null
          year?: number | null
        }
        Update: {
          approved_at?: string | null
          contract_date?: string | null
          contract_number?: string | null
          contractor_inn?: string | null
          contractor_org?: string | null
          contractor_phone?: string | null
          contractor_rep?: string | null
          created_at?: string | null
          created_by?: string | null
          date_end?: string | null
          date_start?: string | null
          director_comment?: string | null
          display_no?: string | null
          foreman_comment?: string | null
          foreman_name?: string | null
          id?: string
          object_name?: string | null
          price_per_unit?: number | null
          price_type?: string | null
          qty_planned?: number | null
          rejected_at?: string | null
          seq?: number | null
          status?: string
          submitted_at?: string | null
          total_price?: number | null
          uom?: string | null
          work_mode?: string | null
          work_type?: string | null
          work_zone?: string | null
          year?: number | null
        }
        Relationships: []
      }
      submit_jobs: {
        Row: {
          client_request_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_key: string | null
          entity_type: string | null
          error: string | null
          id: string
          job_type: string
          locked_until: string | null
          next_retry_at: string | null
          payload: Json
          processed_at: string | null
          retry_count: number
          started_at: string | null
          status: string
          worker_id: string | null
        }
        Insert: {
          client_request_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_key?: string | null
          entity_type?: string | null
          error?: string | null
          id?: string
          job_type: string
          locked_until?: string | null
          next_retry_at?: string | null
          payload: Json
          processed_at?: string | null
          retry_count?: number
          started_at?: string | null
          status?: string
          worker_id?: string | null
        }
        Update: {
          client_request_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_key?: string | null
          entity_type?: string | null
          error?: string | null
          id?: string
          job_type?: string
          locked_until?: string | null
          next_retry_at?: string | null
          payload?: Json
          processed_at?: string | null
          retry_count?: number
          started_at?: string | null
          status?: string
          worker_id?: string | null
        }
        Relationships: []
      }
      supplier_files: {
        Row: {
          created_at: string
          file_name: string
          file_url: string
          group_key: string | null
          id: string
          supplier_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_url: string
          group_key?: string | null
          id?: string
          supplier_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_url?: string
          group_key?: string | null
          id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_files_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_files_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          bank_account: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          inn: string | null
          name: string
          notes: string | null
          phone: string | null
          specialization: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          inn?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          specialization?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          inn?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          specialization?: string | null
          website?: string | null
        }
        Relationships: []
      }
      synonyms: {
        Row: {
          created_at: string
          id: string
          normalized: string
          ref_id: string
          ref_table: string
          token: string
        }
        Insert: {
          created_at?: string
          id?: string
          normalized: string
          ref_id: string
          ref_table: string
          token: string
        }
        Update: {
          created_at?: string
          id?: string
          normalized?: string
          ref_id?: string
          ref_table?: string
          token?: string
        }
        Relationships: []
      }
      system_types: {
        Row: {
          code: string
          display_name: string | null
          name: string
          object_type_code: string | null
        }
        Insert: {
          code: string
          display_name?: string | null
          name: string
          object_type_code?: string | null
        }
        Update: {
          code?: string
          display_name?: string | null
          name?: string
          object_type_code?: string | null
        }
        Relationships: []
      }
      tender_items: {
        Row: {
          created_at: string
          id: string
          name_human: string | null
          qty: number | null
          request_item_id: string
          rik_code: string | null
          tender_id: string
          uom: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name_human?: string | null
          qty?: number | null
          request_item_id: string
          rik_code?: string | null
          tender_id: string
          uom?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name_human?: string | null
          qty?: number | null
          request_item_id?: string
          rik_code?: string | null
          tender_id?: string
          uom?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tender_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "debug_director_items"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "tender_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items_pending"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "tender_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items_pending_view"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "tender_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_items_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_items_with_stock"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "tender_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_full"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "tender_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "tender_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_base"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "tender_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_fixed"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "tender_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_old"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "tender_items_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_offer_items: {
        Row: {
          available_qty: number | null
          created_at: string
          id: string
          offer_id: string
          price: number
          tender_item_id: string
        }
        Insert: {
          available_qty?: number | null
          created_at?: string
          id?: string
          offer_id: string
          price: number
          tender_item_id: string
        }
        Update: {
          available_qty?: number | null
          created_at?: string
          id?: string
          offer_id?: string
          price?: number
          tender_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_offer_items_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "tender_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_offer_items_tender_item_id_fkey"
            columns: ["tender_item_id"]
            isOneToOne: false
            referencedRelation: "tender_items"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_offers: {
        Row: {
          comment: string | null
          created_at: string
          delivery_days: number | null
          id: string
          status: string
          supplier_id: string
          tender_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          delivery_days?: number | null
          id?: string
          status?: string
          supplier_id: string
          tender_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          delivery_days?: number | null
          id?: string
          status?: string
          supplier_id?: string
          tender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_offers_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tenders: {
        Row: {
          address_place_id: string | null
          address_text: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          contact_whatsapp: string | null
          created_at: string
          created_by: string
          deadline_at: string | null
          delivery_days: number | null
          id: string
          lat: number | null
          lng: number | null
          mode: string
          note: string | null
          radius_km: number | null
          status: string
          updated_at: string
          visibility: string
        }
        Insert: {
          address_place_id?: string | null
          address_text?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          created_by: string
          deadline_at?: string | null
          delivery_days?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          mode: string
          note?: string | null
          radius_km?: number | null
          status?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          address_place_id?: string | null
          address_text?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          created_by?: string
          deadline_at?: string | null
          delivery_days?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          mode?: string
          note?: string | null
          radius_km?: number | null
          status?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      token_ru_dict: {
        Row: {
          en: string
          ru: string
        }
        Insert: {
          en: string
          ru: string
        }
        Update: {
          en?: string
          ru?: string
        }
        Relationships: []
      }
      token_ru_dict_mat: {
        Row: {
          en: string
          ru: string
        }
        Insert: {
          en: string
          ru: string
        }
        Update: {
          en?: string
          ru?: string
        }
        Relationships: []
      }
      token_ru_dict_wrk: {
        Row: {
          en: string
          ru: string
        }
        Insert: {
          en: string
          ru: string
        }
        Update: {
          en?: string
          ru?: string
        }
        Relationships: []
      }
      token_ru_map: {
        Row: {
          ru: string
          token: string
        }
        Insert: {
          ru: string
          token: string
        }
        Update: {
          ru?: string
          token?: string
        }
        Relationships: []
      }
      uom_dict: {
        Row: {
          alias: string
          canon: string
        }
        Insert: {
          alias: string
          canon: string
        }
        Update: {
          alias?: string
          canon?: string
        }
        Relationships: []
      }
      uom_overrides: {
        Row: {
          rik_code: string
          uom_code: string
        }
        Insert: {
          rik_code: string
          uom_code: string
        }
        Update: {
          rik_code?: string
          uom_code?: string
        }
        Relationships: []
      }
      uom_types: {
        Row: {
          code: string
          kind: string | null
          name_ru: string
        }
        Insert: {
          code: string
          kind?: string | null
          name_ru: string
        }
        Update: {
          code?: string
          kind?: string | null
          name_ru?: string
        }
        Relationships: []
      }
      uoms: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          bio: string | null
          city: string | null
          created_at: string | null
          full_name: string | null
          id: string
          is_contractor: boolean | null
          phone: string | null
          position: string | null
          telegram: string | null
          updated_at: string | null
          usage_build: boolean | null
          usage_market: boolean | null
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          bio?: string | null
          city?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_contractor?: boolean | null
          phone?: string | null
          position?: string | null
          telegram?: string | null
          updated_at?: string | null
          usage_build?: boolean | null
          usage_market?: boolean | null
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          bio?: string | null
          city?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_contractor?: boolean | null
          phone?: string | null
          position?: string | null
          telegram?: string | null
          updated_at?: string | null
          usage_build?: boolean | null
          usage_market?: boolean | null
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      warehouse_issue_items: {
        Row: {
          created_at: string
          id: number
          issue_id: number
          qty: number
          request_item_id: string | null
          rik_code: string
          uom_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          issue_id: number
          qty: number
          request_item_id?: string | null
          rik_code: string
          uom_id: string
        }
        Update: {
          created_at?: string
          id?: number
          issue_id?: number
          qty?: number
          request_item_id?: string | null
          rik_code?: string
          uom_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_issue_items_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issued_truth_ui"
            referencedColumns: ["issue_id"]
          },
          {
            foreignKeyName: "warehouse_issue_items_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "warehouse_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_issues: {
        Row: {
          base_no: string | null
          created_at: string | null
          id: number
          iss_date: string | null
          no: string | null
          note: string | null
          object_name: string | null
          qty: number
          request_id: string | null
          request_id_old: number | null
          status: string
          target_object_id: string | null
          team: string | null
          uom: string | null
          who: string | null
          work_name: string | null
        }
        Insert: {
          base_no?: string | null
          created_at?: string | null
          id?: number
          iss_date?: string | null
          no?: string | null
          note?: string | null
          object_name?: string | null
          qty: number
          request_id?: string | null
          request_id_old?: number | null
          status?: string
          target_object_id?: string | null
          team?: string | null
          uom?: string | null
          who?: string | null
          work_name?: string | null
        }
        Update: {
          base_no?: string | null
          created_at?: string | null
          id?: number
          iss_date?: string | null
          no?: string | null
          note?: string | null
          object_name?: string | null
          qty?: number
          request_id?: string | null
          request_id_old?: number | null
          status?: string
          target_object_id?: string | null
          team?: string | null
          uom?: string | null
          who?: string | null
          work_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_issues_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "buyer_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_issues_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "director_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_issues_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "request_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_issues_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_issues_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_director_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_issues_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_foreman_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_issues_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_foreman_requests2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_issues_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_full"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "warehouse_issues_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_header"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_issues_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_issues_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_heads_ui"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "warehouse_issues_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_heads_ui_base"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "warehouse_issues_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "warehouse_issues_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_base"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "warehouse_issues_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_fixed"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "warehouse_issues_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_old"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "warehouse_issues_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "warehouse_inbox"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_receipts: {
        Row: {
          confirmed_at: string | null
          created_at: string | null
          id: number
          no: string | null
          note: string | null
          po: string | null
          purchase_id: string | null
          qty: number
          rec_date: string | null
          received_at: string | null
          request_id: string | null
          request_id_old: number | null
          status: string | null
          uom: string | null
          who: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string | null
          id?: number
          no?: string | null
          note?: string | null
          po?: string | null
          purchase_id?: string | null
          qty: number
          rec_date?: string | null
          received_at?: string | null
          request_id?: string | null
          request_id_old?: number | null
          status?: string | null
          uom?: string | null
          who?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string | null
          id?: number
          no?: string | null
          note?: string | null
          po?: string | null
          purchase_id?: string | null
          qty?: number
          rec_date?: string | null
          received_at?: string | null
          request_id?: string | null
          request_id_old?: number | null
          status?: string | null
          uom?: string | null
          who?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_receipts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "buyer_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_receipts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "director_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_receipts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "request_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_receipts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_receipts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_director_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_receipts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_foreman_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_receipts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_foreman_requests2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_receipts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_full"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "warehouse_receipts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_header"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_receipts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_receipts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_heads_ui"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "warehouse_receipts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_heads_ui_base"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "warehouse_receipts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "warehouse_receipts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_base"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "warehouse_receipts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_fixed"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "warehouse_receipts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_old"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "warehouse_receipts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "warehouse_inbox"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      wh_incoming: {
        Row: {
          confirmed_at: string | null
          created_at: string
          id: string
          id_short: number
          note: string | null
          purchase_id: string
          qty: number
          status: string
          warehouseman_fio: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          id_short?: number
          note?: string | null
          purchase_id: string
          qty?: number
          status?: string
          warehouseman_fio?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          id_short?: number
          note?: string | null
          purchase_id?: string
          qty?: number
          status?: string
          warehouseman_fio?: string | null
        }
        Relationships: []
      }
      wh_incoming_items: {
        Row: {
          created_at: string
          id: string
          incoming_id: string
          name_human: string | null
          note: string | null
          purchase_item_id: string | null
          qty_expected: number
          qty_received: number
          rik_code: string | null
          uom: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          incoming_id: string
          name_human?: string | null
          note?: string | null
          purchase_item_id?: string | null
          qty_expected?: number
          qty_received?: number
          rik_code?: string | null
          uom?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          incoming_id?: string
          name_human?: string | null
          note?: string | null
          purchase_item_id?: string | null
          qty_expected?: number
          qty_received?: number
          rik_code?: string | null
          uom?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wh_incoming_items_incoming_id_fkey"
            columns: ["incoming_id"]
            isOneToOne: false
            referencedRelation: "v_wh_incoming_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wh_incoming_items_incoming_id_fkey"
            columns: ["incoming_id"]
            isOneToOne: false
            referencedRelation: "wh_incoming"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wh_incoming_items_incoming_id_fkey"
            columns: ["incoming_id"]
            isOneToOne: false
            referencedRelation: "wh_incoming_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wh_incoming_items_incoming_id_fkey"
            columns: ["incoming_id"]
            isOneToOne: false
            referencedRelation: "wh_moves"
            referencedColumns: ["incoming_id"]
          },
          {
            foreignKeyName: "wh_incoming_items_purchase_item_id_fkey"
            columns: ["purchase_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_items"
            referencedColumns: ["id"]
          },
        ]
      }
      wh_ledger: {
        Row: {
          code: string
          direction: string
          id: string
          incoming_id: string | null
          incoming_item_id: string | null
          issue_doc_id: string | null
          move_id: string | null
          moved_at: string
          note: string | null
          object_id: string | null
          purchase_id: string | null
          qty: number
          uom_id: string
          warehouse_id: string
          warehouseman_fio: string | null
        }
        Insert: {
          code: string
          direction: string
          id?: string
          incoming_id?: string | null
          incoming_item_id?: string | null
          issue_doc_id?: string | null
          move_id?: string | null
          moved_at?: string
          note?: string | null
          object_id?: string | null
          purchase_id?: string | null
          qty: number
          uom_id: string
          warehouse_id: string
          warehouseman_fio?: string | null
        }
        Update: {
          code?: string
          direction?: string
          id?: string
          incoming_id?: string | null
          incoming_item_id?: string | null
          issue_doc_id?: string | null
          move_id?: string | null
          moved_at?: string
          note?: string | null
          object_id?: string | null
          purchase_id?: string | null
          qty?: number
          uom_id?: string
          warehouse_id?: string
          warehouseman_fio?: string | null
        }
        Relationships: []
      }
      wh_moves_log: {
        Row: {
          direction: string
          id: string
          incoming_id: string | null
          incoming_item_id: string | null
          issue_id: string | null
          moved_at: string
          note: string | null
          object_id: string | null
          purchase_id: string | null
          qty: number
          rik_code: string | null
          source_doc: string | null
          source_id: string | null
          stage_id: string | null
          uom: string | null
        }
        Insert: {
          direction: string
          id?: string
          incoming_id?: string | null
          incoming_item_id?: string | null
          issue_id?: string | null
          moved_at?: string
          note?: string | null
          object_id?: string | null
          purchase_id?: string | null
          qty: number
          rik_code?: string | null
          source_doc?: string | null
          source_id?: string | null
          stage_id?: string | null
          uom?: string | null
        }
        Update: {
          direction?: string
          id?: string
          incoming_id?: string | null
          incoming_item_id?: string | null
          issue_id?: string | null
          moved_at?: string
          note?: string | null
          object_id?: string | null
          purchase_id?: string | null
          qty?: number
          rik_code?: string | null
          source_doc?: string | null
          source_id?: string | null
          stage_id?: string | null
          uom?: string | null
        }
        Relationships: []
      }
      wh_stock_balances: {
        Row: {
          qty_on_hand: number
          rik_code: string
        }
        Insert: {
          qty_on_hand?: number
          rik_code: string
        }
        Update: {
          qty_on_hand?: number
          rik_code?: string
        }
        Relationships: []
      }
      work_default_materials: {
        Row: {
          id: string
          mat_code: string
          norm_per_unit: number | null
          uom: string
          work_code: string
        }
        Insert: {
          id?: string
          mat_code: string
          norm_per_unit?: number | null
          uom: string
          work_code: string
        }
        Update: {
          id?: string
          mat_code?: string
          norm_per_unit?: number | null
          uom?: string
          work_code?: string
        }
        Relationships: []
      }
      work_norms: {
        Row: {
          base_consumption: Json
          code: string
          created_at: string
          id: string
          labor_hour: number | null
          name: string
          norm_version: string
          region_code: string | null
          system: string | null
          unit: string
          waste_max: number | null
          waste_min: number | null
        }
        Insert: {
          base_consumption: Json
          code: string
          created_at?: string
          id?: string
          labor_hour?: number | null
          name: string
          norm_version?: string
          region_code?: string | null
          system?: string | null
          unit: string
          waste_max?: number | null
          waste_min?: number | null
        }
        Update: {
          base_consumption?: Json
          code?: string
          created_at?: string
          id?: string
          labor_hour?: number | null
          name?: string
          norm_version?: string
          region_code?: string | null
          system?: string | null
          unit?: string
          waste_max?: number | null
          waste_min?: number | null
        }
        Relationships: []
      }
      work_progress: {
        Row: {
          contractor_id: string | null
          contractor_name: string | null
          created_at: string
          executor_id: string | null
          finished_at: string | null
          id: string
          location: string | null
          object_id: string | null
          purchase_item_id: string
          qty_done: number
          qty_left: number | null
          qty_planned: number
          stage_code: string | null
          started_at: string | null
          status: string
          team_id: string | null
          uom: string | null
          updated_at: string
          work_dt: string
        }
        Insert: {
          contractor_id?: string | null
          contractor_name?: string | null
          created_at?: string
          executor_id?: string | null
          finished_at?: string | null
          id?: string
          location?: string | null
          object_id?: string | null
          purchase_item_id: string
          qty_done?: number
          qty_left?: number | null
          qty_planned?: number
          stage_code?: string | null
          started_at?: string | null
          status?: string
          team_id?: string | null
          uom?: string | null
          updated_at?: string
          work_dt?: string
        }
        Update: {
          contractor_id?: string | null
          contractor_name?: string | null
          created_at?: string
          executor_id?: string | null
          finished_at?: string | null
          id?: string
          location?: string | null
          object_id?: string | null
          purchase_item_id?: string
          qty_done?: number
          qty_left?: number | null
          qty_planned?: number
          stage_code?: string | null
          started_at?: string | null
          status?: string
          team_id?: string | null
          uom?: string | null
          updated_at?: string
          work_dt?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_progress_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_progress_purchase_item_id_fkey"
            columns: ["purchase_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_items"
            referencedColumns: ["id"]
          },
        ]
      }
      work_progress_log: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          materials: Json | null
          note: string | null
          progress_id: string
          qty: number
          stage_note: string | null
          work_uom: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          materials?: Json | null
          note?: string | null
          progress_id: string
          qty: number
          stage_note?: string | null
          work_uom?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          materials?: Json | null
          note?: string | null
          progress_id?: string
          qty?: number
          stage_note?: string | null
          work_uom?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_progress_log_progress_id_fkey"
            columns: ["progress_id"]
            isOneToOne: false
            referencedRelation: "v_works_fact"
            referencedColumns: ["progress_id"]
          },
          {
            foreignKeyName: "work_progress_log_progress_id_fkey"
            columns: ["progress_id"]
            isOneToOne: false
            referencedRelation: "work_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      work_progress_log_materials: {
        Row: {
          created_at: string
          id: string
          log_id: string
          mat_code: string
          qty_fact: number
          stock_issue_id: string | null
          uom: string | null
          uom_mat: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          log_id: string
          mat_code: string
          qty_fact: number
          stock_issue_id?: string | null
          uom?: string | null
          uom_mat?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          log_id?: string
          mat_code?: string
          qty_fact?: number
          stock_issue_id?: string | null
          uom?: string | null
          uom_mat?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_progress_log_materials_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "work_progress_log"
            referencedColumns: ["id"]
          },
        ]
      }
      work_progress_materials: {
        Row: {
          created_at: string
          id: string
          mat_code: string
          norm_per_unit: number | null
          progress_id: string
          qty_diff: number | null
          qty_fact: number | null
          qty_norm: number | null
          uom_code: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mat_code: string
          norm_per_unit?: number | null
          progress_id: string
          qty_diff?: number | null
          qty_fact?: number | null
          qty_norm?: number | null
          uom_code?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mat_code?: string
          norm_per_unit?: number | null
          progress_id?: string
          qty_diff?: number | null
          qty_fact?: number | null
          qty_norm?: number | null
          uom_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_progress_materials_progress_id_fkey"
            columns: ["progress_id"]
            isOneToOne: false
            referencedRelation: "v_works_fact"
            referencedColumns: ["progress_id"]
          },
          {
            foreignKeyName: "work_progress_materials_progress_id_fkey"
            columns: ["progress_id"]
            isOneToOne: false
            referencedRelation: "work_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      work_stages: {
        Row: {
          code: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          work_code: string | null
        }
        Insert: {
          code: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          work_code?: string | null
        }
        Update: {
          code?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          work_code?: string | null
        }
        Relationships: []
      }
      works: {
        Row: {
          code: string | null
          description: string | null
          id: number
          name: string | null
          section: string | null
          type: string | null
          unit: string | null
        }
        Insert: {
          code?: string | null
          description?: string | null
          id?: number
          name?: string | null
          section?: string | null
          type?: string | null
          unit?: string | null
        }
        Update: {
          code?: string | null
          description?: string | null
          id?: number
          name?: string | null
          section?: string | null
          type?: string | null
          unit?: string | null
        }
        Relationships: []
      }
      zone_types: {
        Row: {
          code: string
          display_name: string | null
          name: string
          object_type_code: string
        }
        Insert: {
          code: string
          display_name?: string | null
          name: string
          object_type_code: string
        }
        Update: {
          code?: string
          display_name?: string | null
          name?: string
          object_type_code?: string
        }
        Relationships: []
      }
    }
    Views: {
      app_catalog_aliases_mv: {
        Row: {
          code: string | null
          name: string | null
          uom: string | null
        }
        Relationships: []
      }
      buyer_inbox: {
        Row: {
          created_at: string | null
          display_no: string | null
          foreman_name: string | null
          id: string | null
          need_by: string | null
          status: Database["public"]["Enums"]["request_status_enum"] | null
        }
        Insert: {
          created_at?: string | null
          display_no?: string | null
          foreman_name?: string | null
          id?: string | null
          need_by?: string | null
          status?: Database["public"]["Enums"]["request_status_enum"] | null
        }
        Update: {
          created_at?: string | null
          display_no?: string | null
          foreman_name?: string | null
          id?: string | null
          need_by?: string | null
          status?: Database["public"]["Enums"]["request_status_enum"] | null
        }
        Relationships: []
      }
      catalog_groups_clean: {
        Row: {
          code: string | null
          name: string | null
          parent_code: string | null
        }
        Relationships: []
      }
      debug_director_items: {
        Row: {
          app_code: string | null
          created_at: string | null
          in_any_proposal: boolean | null
          name_human: string | null
          note: string | null
          proposal_statuses: string | null
          qty: number | null
          request_id: string | null
          request_item_id: string | null
          request_item_status: string | null
          rik_code: string | null
          uom: string | null
        }
        Insert: {
          app_code?: string | null
          created_at?: string | null
          in_any_proposal?: never
          name_human?: string | null
          note?: string | null
          proposal_statuses?: never
          qty?: number | null
          request_id?: string | null
          request_item_id?: string | null
          request_item_status?: string | null
          rik_code?: string | null
          uom?: string | null
        }
        Update: {
          app_code?: string | null
          created_at?: string | null
          in_any_proposal?: never
          name_human?: string | null
          note?: string | null
          proposal_statuses?: never
          qty?: number | null
          request_id?: string | null
          request_item_id?: string | null
          request_item_status?: string | null
          rik_code?: string | null
          uom?: string | null
        }
        Relationships: []
      }
      director_inbox: {
        Row: {
          created_at: string | null
          display_no: string | null
          foreman_name: string | null
          id: string | null
          need_by: string | null
          status: Database["public"]["Enums"]["request_status_enum"] | null
        }
        Insert: {
          created_at?: string | null
          display_no?: string | null
          foreman_name?: string | null
          id?: string | null
          need_by?: string | null
          status?: Database["public"]["Enums"]["request_status_enum"] | null
        }
        Update: {
          created_at?: string | null
          display_no?: string | null
          foreman_name?: string | null
          id?: string | null
          need_by?: string | null
          status?: Database["public"]["Enums"]["request_status_enum"] | null
        }
        Relationships: []
      }
      market_listings_map: {
        Row: {
          catalog_item_ids: string[] | null
          city: string | null
          id: string | null
          items_json: Json | null
          kind: string | null
          lat: number | null
          lng: number | null
          price: number | null
          side: string | null
          status: string | null
          title: string | null
        }
        Relationships: []
      }
      norm_snip_latest: {
        Row: {
          basis: string | null
          created_at: string | null
          id: number | null
          note: string | null
          qty_per_unit: number | null
          rik_code: string | null
          snip_code: string | null
          source: string | null
          unit: string | null
          uom_code: string | null
          updated_at: string | null
          work_type_code: string | null
        }
        Relationships: []
      }
      object_levels: {
        Row: {
          id: string | null
          name: string | null
          object_id: string | null
        }
        Relationships: []
      }
      object_zones: {
        Row: {
          id: string | null
          name: string | null
          object_id: string | null
        }
        Relationships: []
      }
      proposal_attachments_v: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          file_name: string | null
          group_key: string | null
          id: number | null
          proposal_id_text: string | null
          storage_path: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          file_name?: string | null
          group_key?: string | null
          id?: number | null
          proposal_id_text?: never
          storage_path?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          file_name?: string | null
          group_key?: string | null
          id?: number | null
          proposal_id_text?: never
          storage_path?: string | null
        }
        Relationships: []
      }
      proposal_files_summary: {
        Row: {
          invoice_file: string | null
          payment_files: string[] | null
          payment_files_count: number | null
          proposal_id: string | null
        }
        Relationships: []
      }
      proposal_files_view: {
        Row: {
          invoice_file: string | null
          payment_files: string[] | null
          payment_files_count: number | null
          proposal_id: string | null
        }
        Relationships: []
      }
      proposal_items_data: {
        Row: {
          app_code: string | null
          created_at: string | null
          id: number | null
          name_human: string | null
          note: string | null
          price: number | null
          proposal_id: string | null
          qty: number | null
          request_id: string | null
          request_item_id: string | null
          rik_code: string | null
          supplier: string | null
          uom: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_files_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_files_view"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_accountant_inbox"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_accountant_inbox_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_buyer_buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_rows"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds_v3"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_proposals_pending"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_payments_sum"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_request_latest_proposal_ui"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "debug_director_items"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items_pending"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items_pending_view"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_items_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_items_with_stock"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_full"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_base"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_fixed"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_old"
            referencedColumns: ["request_item_id"]
          },
        ]
      }
      proposal_items_view: {
        Row: {
          app_code: string | null
          id: number | null
          name_human: string | null
          note: string | null
          price: number | null
          proposal_id: string | null
          request_item_id: string | null
          rik_code: string | null
          supplier: string | null
          total_qty: number | null
          uom: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_files_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_files_view"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_accountant_inbox"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_accountant_inbox_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_buyer_buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_rows"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds_v3"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_proposals_pending"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_payments_sum"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_request_latest_proposal_ui"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "debug_director_items"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items_pending"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items_pending_view"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_items_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_items_with_stock"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_full"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_base"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_fixed"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_old"
            referencedColumns: ["request_item_id"]
          },
        ]
      }
      proposal_snapshot_items: {
        Row: {
          app_code: string | null
          id: number | null
          name_human: string | null
          note: string | null
          price: number | null
          proposal_id: string | null
          request_item_id: string | null
          rik_code: string | null
          supplier: string | null
          total_qty: number | null
          uom: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_files_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_files_view"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_accountant_inbox"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_accountant_inbox_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_buyer_buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_rows"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds_v3"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_proposals_pending"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_payments_sum"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_request_latest_proposal_ui"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "debug_director_items"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items_pending"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items_pending_view"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_items_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_items_with_stock"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_full"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_base"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_fixed"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_old"
            referencedColumns: ["request_item_id"]
          },
        ]
      }
      proposals_pending: {
        Row: {
          accountant_comment: string | null
          buyer_email: string | null
          buyer_fio: string | null
          display_no: string | null
          doc_no: string | null
          id: string | null
          invoice_amount: number | null
          invoice_currency: string | null
          invoice_date: string | null
          invoice_number: string | null
          payment_status: string | null
          proposal_no: string | null
          redo_comment: string | null
          redo_source: string | null
          request_id: string | null
          return_comment: string | null
          sent_to_accountant_at: string | null
          status: string | null
          submitted_at: string | null
        }
        Insert: {
          accountant_comment?: string | null
          buyer_email?: string | null
          buyer_fio?: string | null
          display_no?: string | null
          doc_no?: string | null
          id?: string | null
          invoice_amount?: number | null
          invoice_currency?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          payment_status?: string | null
          proposal_no?: string | null
          redo_comment?: string | null
          redo_source?: string | null
          request_id?: string | null
          return_comment?: string | null
          sent_to_accountant_at?: string | null
          status?: string | null
          submitted_at?: string | null
        }
        Update: {
          accountant_comment?: string | null
          buyer_email?: string | null
          buyer_fio?: string | null
          display_no?: string | null
          doc_no?: string | null
          id?: string | null
          invoice_amount?: number | null
          invoice_currency?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          payment_status?: string | null
          proposal_no?: string | null
          redo_comment?: string | null
          redo_source?: string | null
          request_id?: string | null
          return_comment?: string | null
          sent_to_accountant_at?: string | null
          status?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "buyer_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "director_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "request_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_director_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_foreman_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_foreman_requests2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_full"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_header"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_heads_ui"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_heads_ui_base"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_base"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_fixed"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_old"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "warehouse_inbox"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases_compat: {
        Row: {
          created_at: string | null
          id: string | null
          object_name: string | null
          po_no: string | null
          proposal_id: string | null
          status: string | null
          supplier: string | null
          total_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "proposal_files_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "proposal_files_view"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_accountant_inbox"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_accountant_inbox_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_buyer_buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_director_finance_rows"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_director_finance_spend_kinds"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_director_finance_spend_kinds_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_director_finance_spend_kinds_v3"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_director_proposals_pending"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_proposal_payments_sum"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_proposals_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_proposals_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_request_latest_proposal_ui"
            referencedColumns: ["proposal_id"]
          },
        ]
      }
      ref_uoms_clean: {
        Row: {
          code: string | null
          id: string | null
          name: string | null
        }
        Relationships: []
      }
      request_display: {
        Row: {
          comment: string | null
          created_at: string | null
          display_no: string | null
          foreman_name: string | null
          id: string | null
          level_code: string | null
          need_by: string | null
          object_type_code: string | null
          status: Database["public"]["Enums"]["request_status_enum"] | null
          system_code: string | null
          updated_at: string | null
          zone_code: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          display_no?: string | null
          foreman_name?: string | null
          id?: string | null
          level_code?: string | null
          need_by?: string | null
          object_type_code?: string | null
          status?: Database["public"]["Enums"]["request_status_enum"] | null
          system_code?: string | null
          updated_at?: string | null
          zone_code?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          display_no?: string | null
          foreman_name?: string | null
          id?: string | null
          level_code?: string | null
          need_by?: string | null
          object_type_code?: string | null
          status?: Database["public"]["Enums"]["request_status_enum"] | null
          system_code?: string | null
          updated_at?: string | null
          zone_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_level_code_fkey"
            columns: ["level_code"]
            isOneToOne: false
            referencedRelation: "ref_levels"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "requests_object_type_code_fkey"
            columns: ["object_type_code"]
            isOneToOne: false
            referencedRelation: "ref_object_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "requests_system_code_fkey"
            columns: ["system_code"]
            isOneToOne: false
            referencedRelation: "ref_systems"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "requests_zone_code_fkey"
            columns: ["zone_code"]
            isOneToOne: false
            referencedRelation: "ref_zones"
            referencedColumns: ["code"]
          },
        ]
      }
      request_items_pending: {
        Row: {
          id: string | null
          name_human: string | null
          qty: number | null
          request_id: number | null
          request_item_id: string | null
          uom: string | null
        }
        Relationships: []
      }
      request_items_pending_view: {
        Row: {
          id: string | null
          name_human: string | null
          qty: number | null
          request_id: number | null
          request_item_id: string | null
          uom: string | null
        }
        Relationships: []
      }
      rik_aliases: {
        Row: {
          alias: string | null
          id: string | null
          rik_code: string | null
        }
        Insert: {
          alias?: string | null
          id?: string | null
          rik_code?: string | null
        }
        Update: {
          alias?: string | null
          id?: string | null
          rik_code?: string | null
        }
        Relationships: []
      }
      rik_aliases_import: {
        Row: {
          alias: string | null
          rik_code: string | null
        }
        Insert: {
          alias?: string | null
          rik_code?: string | null
        }
        Update: {
          alias?: string | null
          rik_code?: string | null
        }
        Relationships: []
      }
      rik_applications: {
        Row: {
          code: string | null
          name: string | null
          name_human: string | null
          note: string | null
          section: number | null
        }
        Insert: {
          code?: string | null
          name?: string | null
          name_human?: string | null
          note?: string | null
          section?: number | null
        }
        Update: {
          code?: string | null
          name?: string | null
          name_human?: string | null
          note?: string | null
          section?: number | null
        }
        Relationships: []
      }
      rik_apps: {
        Row: {
          app_code: string | null
          name_human: string | null
        }
        Insert: {
          app_code?: string | null
          name_human?: string | null
        }
        Update: {
          app_code?: string | null
          name_human?: string | null
        }
        Relationships: []
      }
      rik_apps_dict: {
        Row: {
          code: string | null
          name: string | null
        }
        Insert: {
          code?: string | null
          name?: string | null
        }
        Update: {
          code?: string | null
          name?: string | null
        }
        Relationships: []
      }
      rik_catalog: {
        Row: {
          code: string | null
          kind: string | null
          name: string | null
          unit: string | null
        }
        Relationships: []
      }
      rik_groups: {
        Row: {
          code: string | null
          level: number | null
          name: string | null
          notes: string | null
          parent_code: string | null
          sort: number | null
        }
        Insert: {
          code?: string | null
          level?: number | null
          name?: string | null
          notes?: string | null
          parent_code?: string | null
          sort?: number | null
        }
        Update: {
          code?: string | null
          level?: number | null
          name?: string | null
          notes?: string | null
          parent_code?: string | null
          sort?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rik_groups_parent_code_fkey"
            columns: ["parent_code"]
            isOneToOne: false
            referencedRelation: "catalog_groups"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "rik_groups_parent_code_fkey"
            columns: ["parent_code"]
            isOneToOne: false
            referencedRelation: "rik_groups"
            referencedColumns: ["code"]
          },
        ]
      }
      rik_item_apps: {
        Row: {
          app_code: string | null
          rik_code: string | null
        }
        Insert: {
          app_code?: string | null
          rik_code?: string | null
        }
        Update: {
          app_code?: string | null
          rik_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rik_item_apps_app_code_fkey"
            columns: ["app_code"]
            isOneToOne: false
            referencedRelation: "catalog_applications"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "rik_item_apps_app_code_fkey"
            columns: ["app_code"]
            isOneToOne: false
            referencedRelation: "rik_applications"
            referencedColumns: ["code"]
          },
        ]
      }
      rik_items: {
        Row: {
          group_code: string | null
          id: string | null
          kind: string | null
          name_human: string | null
          name_human_ru: string | null
          rik_code: string | null
          sector_code: string | null
          spec: string | null
          tags: string | null
          uom_code: string | null
        }
        Insert: {
          group_code?: string | null
          id?: string | null
          kind?: string | null
          name_human?: string | null
          name_human_ru?: string | null
          rik_code?: string | null
          sector_code?: string | null
          spec?: string | null
          tags?: string | null
          uom_code?: string | null
        }
        Update: {
          group_code?: string | null
          id?: string | null
          kind?: string | null
          name_human?: string | null
          name_human_ru?: string | null
          rik_code?: string | null
          sector_code?: string | null
          spec?: string | null
          tags?: string | null
          uom_code?: string | null
        }
        Relationships: []
      }
      rik_items_import: {
        Row: {
          kind: string | null
          name_human: string | null
          rik_code: string | null
          sector_code: string | null
          spec: string | null
          tags: string | null
          uom_code: string | null
        }
        Insert: {
          kind?: string | null
          name_human?: string | null
          rik_code?: string | null
          sector_code?: string | null
          spec?: string | null
          tags?: string | null
          uom_code?: string | null
        }
        Update: {
          kind?: string | null
          name_human?: string | null
          rik_code?: string | null
          sector_code?: string | null
          spec?: string | null
          tags?: string | null
          uom_code?: string | null
        }
        Relationships: []
      }
      rik_materials: {
        Row: {
          created_at: string | null
          id: string | null
          is_active: boolean | null
          mat_code: string | null
          name: string | null
          sector: string | null
          specs: string | null
          tags: string[] | null
          unit_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          mat_code?: string | null
          name?: string | null
          sector?: string | null
          specs?: string | null
          tags?: string[] | null
          unit_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          mat_code?: string | null
          name?: string | null
          sector?: string | null
          specs?: string | null
          tags?: string[] | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rik_materials_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "uoms"
            referencedColumns: ["id"]
          },
        ]
      }
      rik_sectors: {
        Row: {
          name_ru: string | null
          sector_code: string | null
        }
        Insert: {
          name_ru?: string | null
          sector_code?: string | null
        }
        Update: {
          name_ru?: string | null
          sector_code?: string | null
        }
        Relationships: []
      }
      rik_uoms: {
        Row: {
          kind: string | null
          name_ru: string | null
          uom_code: string | null
        }
        Insert: {
          kind?: string | null
          name_ru?: string | null
          uom_code?: string | null
        }
        Update: {
          kind?: string | null
          name_ru?: string | null
          uom_code?: string | null
        }
        Relationships: []
      }
      rik_works: {
        Row: {
          created_at: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          notes: string | null
          parent_code: string | null
          rik_code: string | null
          sector: string | null
          tags: string[] | null
          unit_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          notes?: string | null
          parent_code?: string | null
          rik_code?: string | null
          sector?: string | null
          tags?: string[] | null
          unit_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          notes?: string | null
          parent_code?: string | null
          rik_code?: string | null
          sector?: string | null
          tags?: string[] | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rik_works_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "uoms"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_balances_api: {
        Row: {
          code: string | null
          qty_available: number | null
          qty_on_hand: number | null
          qty_reserved: number | null
          uom_id: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      stock_balances_api_canon: {
        Row: {
          code: string | null
          qty_available: number | null
          qty_on_hand: number | null
          qty_reserved: number | null
          uom_id: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      systems: {
        Row: {
          id: string | null
          name: string | null
        }
        Relationships: []
      }
      v_acc_history: {
        Row: {
          event_dt: string | null
          event_type: string | null
          meta: Json | null
          purchase_id: string | null
          qty: number | null
          rik_code: string | null
          uom_id: string | null
        }
        Relationships: []
      }
      v_acc_incoming: {
        Row: {
          created_at: string | null
          object_name: string | null
          po_no: string | null
          purchase_id: string | null
          qty_declared: number | null
          status: string | null
          supplier: string | null
        }
        Relationships: []
      }
      v_acc_stock: {
        Row: {
          qty_available: number | null
          qty_on_hand: number | null
          qty_reserved: number | null
          rik_code: string | null
          uom_id: string | null
          updated_at: string | null
        }
        Insert: {
          qty_available?: never
          qty_on_hand?: number | null
          qty_reserved?: number | null
          rik_code?: string | null
          uom_id?: string | null
          updated_at?: string | null
        }
        Update: {
          qty_available?: never
          qty_on_hand?: number | null
          qty_reserved?: number | null
          rik_code?: string | null
          uom_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      v_accountant_inbox: {
        Row: {
          has_invoice: boolean | null
          invoice_amount: number | null
          invoice_currency: string | null
          invoice_date: string | null
          invoice_number: string | null
          payment_status: string | null
          payments_count: number | null
          proposal_id: string | null
          sent_to_accountant_at: string | null
          supplier: string | null
          total_paid: number | null
        }
        Relationships: []
      }
      v_accountant_inbox_v2: {
        Row: {
          balance: number | null
          has_invoice: boolean | null
          invoice_amount: number | null
          invoice_currency: string | null
          invoice_date: string | null
          invoice_number: string | null
          payment_status: string | null
          payments_count: number | null
          proposal_id: string | null
          sent_to_accountant_at: string | null
          supplier: string | null
          total_paid: number | null
        }
        Relationships: []
      }
      v_buyer_buckets: {
        Row: {
          bucket: string | null
          created_at: string | null
          has_invoice: boolean | null
          has_payments: boolean | null
          id: string | null
          payment_status: string | null
          ps_trim: string | null
          sent_to_accountant_at: string | null
          status: string | null
          submitted_at: string | null
        }
        Relationships: []
      }
      v_buyer_items: {
        Row: {
          app_code: string | null
          created_at: string | null
          id: number | null
          name_human: string | null
          note: string | null
          price: number | null
          proposal_created_at: string | null
          proposal_id: string | null
          proposal_status: string | null
          proposal_submitted_at: string | null
          proposal_supplier_head: string | null
          qty: number | null
          request_item_id: string | null
          rik_code: string | null
          supplier: string | null
          uom: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_files_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_files_view"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_accountant_inbox"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_accountant_inbox_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_buyer_buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_rows"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds_v3"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_proposals_pending"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_payments_sum"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_request_latest_proposal_ui"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "debug_director_items"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items_pending"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items_pending_view"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_items_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_items_with_stock"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_full"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_base"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_fixed"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_old"
            referencedColumns: ["request_item_id"]
          },
        ]
      }
      v_buyer_items_inbox: {
        Row: {
          app_code: string | null
          created_at: string | null
          id: number | null
          name_human: string | null
          note: string | null
          price: number | null
          proposal_created_at: string | null
          proposal_id: string | null
          proposal_status: string | null
          proposal_submitted_at: string | null
          proposal_supplier_head: string | null
          qty: number | null
          request_item_id: string | null
          rik_code: string | null
          supplier: string | null
          uom: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_files_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_files_view"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_accountant_inbox"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_accountant_inbox_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_buyer_buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_rows"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds_v3"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_proposals_pending"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_payments_sum"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_request_latest_proposal_ui"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "debug_director_items"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items_pending"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items_pending_view"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_items_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_items_with_stock"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_full"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_base"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_fixed"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_old"
            referencedColumns: ["request_item_id"]
          },
        ]
      }
      v_catalog_alias_agg: {
        Row: {
          best_alias: string | null
          rik_code: string | null
        }
        Relationships: []
      }
      v_catalog_any: {
        Row: {
          code_u: string | null
          name_human: string | null
          src: string | null
          unit_id: string | null
        }
        Relationships: []
      }
      v_catalog_foreman: {
        Row: {
          basis: string | null
          coeff: number | null
          is_active: boolean | null
          name_display: string | null
          rik_code: string | null
          section: string | null
          uom_code: string | null
          work_type_code: string | null
        }
        Insert: {
          basis?: never
          coeff?: number | null
          is_active?: boolean | null
          name_display?: never
          rik_code?: string | null
          section?: string | null
          uom_code?: string | null
          work_type_code?: string | null
        }
        Update: {
          basis?: never
          coeff?: number | null
          is_active?: boolean | null
          name_display?: never
          rik_code?: string | null
          section?: string | null
          uom_code?: string | null
          work_type_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reno_norm_rules_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "reno_work_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "reno_norm_rules_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "v_reno_work_types_ui"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "reno_norm_rules_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "v_steel_work_types_clean"
            referencedColumns: ["work_type_code"]
          },
          {
            foreignKeyName: "reno_norm_rules_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "v_work_types_grouped"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "reno_norm_rules_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "v_work_types_picker"
            referencedColumns: ["code"]
          },
        ]
      }
      v_catalog_items_for_app: {
        Row: {
          code: string | null
          name: string | null
          uom: string | null
        }
        Relationships: []
      }
      v_catalog_items_integration: {
        Row: {
          attrs: Json | null
          code: string | null
          domain: string | null
          item_role: string | null
          kind: string | null
          name_any: string | null
          name_ru: string | null
          source_code: string | null
          spec: string | null
          uom_code: string | null
        }
        Insert: {
          attrs?: Json | null
          code?: never
          domain?: string | null
          item_role?: string | null
          kind?: string | null
          name_any?: string | null
          name_ru?: never
          source_code?: string | null
          spec?: string | null
          uom_code?: string | null
        }
        Update: {
          attrs?: Json | null
          code?: never
          domain?: string | null
          item_role?: string | null
          kind?: string | null
          name_any?: string | null
          name_ru?: never
          source_code?: string | null
          spec?: string | null
          uom_code?: string | null
        }
        Relationships: []
      }
      v_catalog_items_integration_dedup: {
        Row: {
          attrs: Json | null
          code: string | null
          domain: string | null
          item_role: string | null
          kind: string | null
          name_any: string | null
          name_ru: string | null
          source_code: string | null
          spec: string | null
          uom_code: string | null
        }
        Relationships: []
      }
      v_catalog_items_search: {
        Row: {
          code: string | null
          name: string | null
          source_name: string | null
          uom: string | null
        }
        Insert: {
          code?: string | null
          name?: string | null
          source_name?: never
          uom?: never
        }
        Update: {
          code?: string | null
          name?: string | null
          source_name?: never
          uom?: never
        }
        Relationships: []
      }
      v_catalog_marketplace: {
        Row: {
          attrs: Json | null
          canon_code: string | null
          domain: string | null
          item_role: string | null
          kind: string | null
          name_human: string | null
          name_human_ru: string | null
          source_code: string | null
          spec: string | null
          uom_code: string | null
        }
        Insert: {
          attrs?: Json | null
          canon_code?: never
          domain?: string | null
          item_role?: string | null
          kind?: string | null
          name_human?: string | null
          name_human_ru?: string | null
          source_code?: string | null
          spec?: string | null
          uom_code?: string | null
        }
        Update: {
          attrs?: Json | null
          canon_code?: never
          domain?: string | null
          item_role?: string | null
          kind?: string | null
          name_human?: string | null
          name_human_ru?: string | null
          source_code?: string | null
          spec?: string | null
          uom_code?: string | null
        }
        Relationships: []
      }
      v_catalog_problem_aliases: {
        Row: {
          code: string | null
          item_id: string | null
          problem: string | null
        }
        Relationships: []
      }
      v_catalog_tiles_showcase: {
        Row: {
          group_code: string | null
          kind: string | null
          name_human: string | null
          name_human_ru: string | null
          rik_code: string | null
          uom_code: string | null
        }
        Insert: {
          group_code?: string | null
          kind?: string | null
          name_human?: string | null
          name_human_ru?: string | null
          rik_code?: string | null
          uom_code?: string | null
        }
        Update: {
          group_code?: string | null
          kind?: string | null
          name_human?: string | null
          name_human_ru?: string | null
          rik_code?: string | null
          uom_code?: string | null
        }
        Relationships: []
      }
      v_catalog_tiles_showcase_ui: {
        Row: {
          color_code: string | null
          name_human_ru: string | null
          rik_code: string | null
          size_code: string | null
          uom_code: string | null
        }
        Insert: {
          color_code?: never
          name_human_ru?: string | null
          rik_code?: string | null
          size_code?: never
          uom_code?: string | null
        }
        Update: {
          color_code?: never
          name_human_ru?: string | null
          rik_code?: string | null
          size_code?: never
          uom_code?: string | null
        }
        Relationships: []
      }
      v_catalog_works_api: {
        Row: {
          is_active: boolean | null
          name_display: string | null
          parent_code: string | null
          rik_code: string | null
          sector: string | null
          unit_id: string | null
        }
        Insert: {
          is_active?: never
          name_display?: never
          parent_code?: string | null
          rik_code?: string | null
          sector?: string | null
          unit_id?: string | null
        }
        Update: {
          is_active?: never
          name_display?: never
          parent_code?: string | null
          rik_code?: string | null
          sector?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rik_works_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "uoms"
            referencedColumns: ["id"]
          },
        ]
      }
      v_ci_name: {
        Row: {
          ci_name: string | null
          id: string | null
        }
        Relationships: []
      }
      v_director_finance_rows: {
        Row: {
          director_approved_at: string | null
          has_invoice: boolean | null
          invoice_amount: number | null
          invoice_currency: string | null
          invoice_date: string | null
          invoice_number: string | null
          payment_status: string | null
          payments_count: number | null
          proposal_id: string | null
          proposal_sent_to_accountant_at: string | null
          sent_to_accountant_at: string | null
          supplier: string | null
          total_paid: number | null
        }
        Relationships: []
      }
      v_director_finance_spend_kinds: {
        Row: {
          director_approved_at: string | null
          invoice_amount_alloc: number | null
          invoice_currency: string | null
          invoice_date: string | null
          invoice_number: string | null
          kind_code: string | null
          kind_name: string | null
          paid_amount_alloc: number | null
          payment_status: string | null
          proposal_id: string | null
          supplier: string | null
        }
        Relationships: []
      }
      v_director_finance_spend_kinds_v2: {
        Row: {
          approved_alloc: number | null
          director_approved_at: string | null
          invoice_currency: string | null
          invoice_date: string | null
          invoice_number: string | null
          kind_code: string | null
          kind_name: string | null
          overpay_alloc: number | null
          paid_alloc: number | null
          paid_alloc_cap: number | null
          payment_status: string | null
          proposal_id: string | null
          supplier: string | null
        }
        Relationships: []
      }
      v_director_finance_spend_kinds_v3: {
        Row: {
          approved_alloc: number | null
          director_approved_at: string | null
          invoice_currency: string | null
          invoice_date: string | null
          invoice_number: string | null
          kind_code: string | null
          kind_name: string | null
          overpay_alloc: number | null
          paid_alloc: number | null
          paid_alloc_cap: number | null
          payment_status: string | null
          proposal_id: string | null
          proposal_no: string | null
          supplier: string | null
        }
        Relationships: []
      }
      v_director_inbox: {
        Row: {
          created_at: string | null
          display_no: string | null
          foreman_name: string | null
          id: string | null
          need_by: string | null
          status: Database["public"]["Enums"]["request_status_enum"] | null
        }
        Insert: {
          created_at?: string | null
          display_no?: string | null
          foreman_name?: string | null
          id?: string | null
          need_by?: string | null
          status?: Database["public"]["Enums"]["request_status_enum"] | null
        }
        Update: {
          created_at?: string | null
          display_no?: string | null
          foreman_name?: string | null
          id?: string | null
          need_by?: string | null
          status?: Database["public"]["Enums"]["request_status_enum"] | null
        }
        Relationships: []
      }
      v_director_pending: {
        Row: {
          id: number | null
          submitted_at: string | null
        }
        Insert: {
          id?: number | null
          submitted_at?: string | null
        }
        Update: {
          id?: number | null
          submitted_at?: string | null
        }
        Relationships: []
      }
      v_director_proposals_pending: {
        Row: {
          items_count: number | null
          proposal_id: string | null
          status: string | null
          submitted_at: string | null
          supplier: string | null
        }
        Relationships: []
      }
      v_director_report_fact_daily_v1: {
        Row: {
          day_date: string | null
          docs_total: number | null
          group_key: string | null
          group_name: string | null
          level_key: string | null
          level_name: string | null
          mode: string | null
          object_name: string | null
          positions_free: number | null
          positions_req: number | null
          positions_total: number | null
          qty_total: number | null
          uom: string | null
        }
        Relationships: []
      }
      v_director_report_issue_item_facts_v1: {
        Row: {
          is_without_request: boolean | null
          iss_date: string | null
          issue_id: string | null
          object_name: string | null
          qty: number | null
          request_item_id: string | null
          rik_code: string | null
          uom: string | null
          work_name: string | null
        }
        Relationships: []
      }
      v_foreman_requests: {
        Row: {
          comment: string | null
          created_at: string | null
          display_no: string | null
          foreman_name: string | null
          has_rejected: boolean | null
          id: string | null
          level_code: string | null
          level_name_ru: string | null
          need_by: string | null
          object_name_ru: string | null
          object_type_code: string | null
          status: Database["public"]["Enums"]["request_status_enum"] | null
          system_code: string | null
          system_name_ru: string | null
          zone_code: string | null
          zone_name_ru: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_level_code_fkey"
            columns: ["level_code"]
            isOneToOne: false
            referencedRelation: "ref_levels"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "requests_object_type_code_fkey"
            columns: ["object_type_code"]
            isOneToOne: false
            referencedRelation: "ref_object_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "requests_system_code_fkey"
            columns: ["system_code"]
            isOneToOne: false
            referencedRelation: "ref_systems"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "requests_zone_code_fkey"
            columns: ["zone_code"]
            isOneToOne: false
            referencedRelation: "ref_zones"
            referencedColumns: ["code"]
          },
        ]
      }
      v_foreman_requests2: {
        Row: {
          comment: string | null
          created_at: string | null
          display_no: string | null
          foreman_name: string | null
          has_rejected: boolean | null
          id: string | null
          level_code: string | null
          level_name_ru: string | null
          need_by: string | null
          object_name_ru: string | null
          object_type_code: string | null
          status: Database["public"]["Enums"]["request_status_enum"] | null
          system_code: string | null
          system_name_ru: string | null
          zone_code: string | null
          zone_name_ru: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_level_code_fkey"
            columns: ["level_code"]
            isOneToOne: false
            referencedRelation: "ref_levels"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "requests_object_type_code_fkey"
            columns: ["object_type_code"]
            isOneToOne: false
            referencedRelation: "ref_object_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "requests_system_code_fkey"
            columns: ["system_code"]
            isOneToOne: false
            referencedRelation: "ref_systems"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "requests_zone_code_fkey"
            columns: ["zone_code"]
            isOneToOne: false
            referencedRelation: "ref_zones"
            referencedColumns: ["code"]
          },
        ]
      }
      v_level_types: {
        Row: {
          code: string | null
          name: string | null
          object_type_code: string | null
        }
        Insert: {
          code?: string | null
          name?: string | null
          object_type_code?: string | null
        }
        Update: {
          code?: string | null
          name?: string | null
          object_type_code?: string | null
        }
        Relationships: []
      }
      v_level_types_clean: {
        Row: {
          code: string | null
          name: string | null
          object_type_code: string | null
        }
        Relationships: []
      }
      v_level_types_clean_ordered: {
        Row: {
          code: string | null
          name: string | null
          object_type_code: string | null
          sort_key: number | null
        }
        Relationships: []
      }
      v_levels_all: {
        Row: {
          code: string | null
          name: string | null
          sort_key: number | null
        }
        Relationships: []
      }
      v_levels_all_ordered: {
        Row: {
          code: string | null
          id: string | null
          name: string | null
          object_type_code: string | null
        }
        Insert: {
          code?: string | null
          id?: never
          name?: string | null
          object_type_code?: never
        }
        Update: {
          code?: string | null
          id?: never
          name?: string | null
          object_type_code?: never
        }
        Relationships: []
      }
      v_marketplace_catalog_stock: {
        Row: {
          attrs: Json | null
          code: string | null
          kind: string | null
          name_ru: string | null
          qty_available: number | null
          qty_on_hand: number | null
          qty_reserved: number | null
          source_code: string | null
          spec: string | null
          stock_updated_at: string | null
          uom_code: string | null
        }
        Relationships: []
      }
      v_po_receipt_status: {
        Row: {
          is_received: boolean | null
          object_name: string | null
          po_no: string | null
          purchase_id: string | null
          purchase_status: string | null
          received_at: string | null
          supplier: string | null
          supplier_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      v_po_totals: {
        Row: {
          grand_total: number | null
          purchase_id: string | null
          subtotal: number | null
          vat_amount: number | null
        }
        Relationships: []
      }
      v_proposal_items_orphan_proposals: {
        Row: {
          app: string | null
          app_code: string | null
          buyer_fio: string | null
          created_at: string | null
          id: number | null
          name_human: string | null
          note: string | null
          price: number | null
          proposal_id: string | null
          proposal_id_bigint: number | null
          proposal_id_text: string | null
          qty: number | null
          request_id: number | null
          request_item_id: string | null
          rik_code: string | null
          status: string | null
          supplier: string | null
          total_qty: number | null
          uom: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_files_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_files_view"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_accountant_inbox"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_accountant_inbox_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_buyer_buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_rows"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds_v3"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_proposals_pending"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_payments_sum"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_request_latest_proposal_ui"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "debug_director_items"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items_pending"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items_pending_view"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_items_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_items_with_stock"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_full"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_base"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_fixed"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_old"
            referencedColumns: ["request_item_id"]
          },
        ]
      }
      v_proposal_items_orphan_request_items: {
        Row: {
          app: string | null
          app_code: string | null
          buyer_fio: string | null
          created_at: string | null
          id: number | null
          name_human: string | null
          note: string | null
          price: number | null
          proposal_id: string | null
          proposal_id_bigint: number | null
          proposal_id_text: string | null
          qty: number | null
          request_id: number | null
          request_item_id: string | null
          rik_code: string | null
          status: string | null
          supplier: string | null
          total_qty: number | null
          uom: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_files_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_files_view"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_accountant_inbox"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_accountant_inbox_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_buyer_buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_rows"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds_v3"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_proposals_pending"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_payments_sum"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_request_latest_proposal_ui"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "debug_director_items"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items_pending"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items_pending_view"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_items_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_items_with_stock"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_full"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_base"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_fixed"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "proposal_items_request_item_fk"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_old"
            referencedColumns: ["request_item_id"]
          },
        ]
      }
      v_proposal_payments_agg: {
        Row: {
          payments_count: number | null
          proposal_id: string | null
          total_paid: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_files_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_files_view"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_accountant_inbox"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_accountant_inbox_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_buyer_buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_rows"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds_v3"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_proposals_pending"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_payments_sum"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_request_latest_proposal_ui"
            referencedColumns: ["proposal_id"]
          },
        ]
      }
      v_proposal_payments_fact: {
        Row: {
          paid_first_at: string | null
          paid_last_at: string | null
          proposal_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_files_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_files_view"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_accountant_inbox"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_accountant_inbox_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_buyer_buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_rows"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds_v3"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_proposals_pending"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_payments_sum"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_request_latest_proposal_ui"
            referencedColumns: ["proposal_id"]
          },
        ]
      }
      v_proposal_payments_sum: {
        Row: {
          payments_count: number | null
          proposal_id: string | null
          total_paid: number | null
        }
        Relationships: []
      }
      v_proposals: {
        Row: {
          accountant_comment: string | null
          approved_at: string | null
          buyer_email: string | null
          buyer_fio: string | null
          created_at: string | null
          created_by: string | null
          decided_at: string | null
          doc_no: string | null
          id: string | null
          id_old: number | null
          id_short: number | null
          invoice_amount: number | null
          invoice_currency: string | null
          invoice_date: string | null
          invoice_number: string | null
          payment_status: string | null
          proposal_no: string | null
          redo_comment: string | null
          redo_source: string | null
          request_id: string | null
          return_comment: string | null
          sent_to_accountant_at: string | null
          status: string | null
          submitted_at: string | null
          supplier: string | null
          total_paid: number | null
          updated_at: string | null
        }
        Insert: {
          accountant_comment?: string | null
          approved_at?: string | null
          buyer_email?: string | null
          buyer_fio?: string | null
          created_at?: string | null
          created_by?: string | null
          decided_at?: string | null
          doc_no?: string | null
          id?: string | null
          id_old?: number | null
          id_short?: number | null
          invoice_amount?: number | null
          invoice_currency?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          payment_status?: string | null
          proposal_no?: string | null
          redo_comment?: string | null
          redo_source?: string | null
          request_id?: string | null
          return_comment?: string | null
          sent_to_accountant_at?: string | null
          status?: string | null
          submitted_at?: string | null
          supplier?: string | null
          total_paid?: number | null
          updated_at?: string | null
        }
        Update: {
          accountant_comment?: string | null
          approved_at?: string | null
          buyer_email?: string | null
          buyer_fio?: string | null
          created_at?: string | null
          created_by?: string | null
          decided_at?: string | null
          doc_no?: string | null
          id?: string | null
          id_old?: number | null
          id_short?: number | null
          invoice_amount?: number | null
          invoice_currency?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          payment_status?: string | null
          proposal_no?: string | null
          redo_comment?: string | null
          redo_source?: string | null
          request_id?: string | null
          return_comment?: string | null
          sent_to_accountant_at?: string | null
          status?: string | null
          submitted_at?: string | null
          supplier?: string | null
          total_paid?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "buyer_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "director_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "request_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_director_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_foreman_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_foreman_requests2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_full"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_header"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_heads_ui"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_heads_ui_base"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_base"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_fixed"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_old"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "warehouse_inbox"
            referencedColumns: ["id"]
          },
        ]
      }
      v_proposals_display: {
        Row: {
          created_at: string | null
          display_no: string | null
          id: string | null
          id_short: number | null
        }
        Insert: {
          created_at?: string | null
          display_no?: never
          id?: string | null
          id_short?: number | null
        }
        Update: {
          created_at?: string | null
          display_no?: never
          id?: string | null
          id_short?: number | null
        }
        Relationships: []
      }
      v_proposals_pending: {
        Row: {
          accountant_comment: string | null
          buyer_email: string | null
          buyer_fio: string | null
          display_no: string | null
          doc_no: string | null
          id: string | null
          invoice_amount: number | null
          invoice_currency: string | null
          invoice_date: string | null
          invoice_number: string | null
          payment_status: string | null
          proposal_no: string | null
          redo_comment: string | null
          redo_source: string | null
          request_id: string | null
          return_comment: string | null
          sent_to_accountant_at: string | null
          status: string | null
          submitted_at: string | null
        }
        Insert: {
          accountant_comment?: string | null
          buyer_email?: string | null
          buyer_fio?: string | null
          display_no?: string | null
          doc_no?: string | null
          id?: string | null
          invoice_amount?: number | null
          invoice_currency?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          payment_status?: string | null
          proposal_no?: string | null
          redo_comment?: string | null
          redo_source?: string | null
          request_id?: string | null
          return_comment?: string | null
          sent_to_accountant_at?: string | null
          status?: string | null
          submitted_at?: string | null
        }
        Update: {
          accountant_comment?: string | null
          buyer_email?: string | null
          buyer_fio?: string | null
          display_no?: string | null
          doc_no?: string | null
          id?: string | null
          invoice_amount?: number | null
          invoice_currency?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          payment_status?: string | null
          proposal_no?: string | null
          redo_comment?: string | null
          redo_source?: string | null
          request_id?: string | null
          return_comment?: string | null
          sent_to_accountant_at?: string | null
          status?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "buyer_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "director_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "request_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_director_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_foreman_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_foreman_requests2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_full"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_header"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_heads_ui"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_heads_ui_base"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_base"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_fixed"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_old"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "warehouse_inbox"
            referencedColumns: ["id"]
          },
        ]
      }
      v_proposals_summary: {
        Row: {
          buyer_fio: string | null
          items_cnt: number | null
          proposal_id: string | null
          sent_to_accountant_at: string | null
          status: string | null
          submitted_at: string | null
          total_sum: number | null
        }
        Relationships: []
      }
      v_purchase_items_payment: {
        Row: {
          fully_paid: boolean | null
          item_id: string | null
          name: string | null
          paid_amount: number | null
          po_id: string | null
          price: number | null
          qty: number | null
          uom: string | null
          vat: number | null
        }
        Relationships: []
      }
      v_purchases: {
        Row: {
          id: string | null
          proposal_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "proposal_files_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "proposal_files_view"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_accountant_inbox"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_accountant_inbox_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_buyer_buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_director_finance_rows"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_director_finance_spend_kinds"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_director_finance_spend_kinds_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_director_finance_spend_kinds_v3"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_director_proposals_pending"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_proposal_payments_sum"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_proposals_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_proposals_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_request_latest_proposal_ui"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "purchases_proposals_purchase_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_proposals_purchase_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "purchases_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_proposals_purchase_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "v_acc_incoming"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "purchases_proposals_purchase_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "v_po_receipt_status"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "purchases_proposals_purchase_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "v_po_totals"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "purchases_proposals_purchase_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "v_purchases_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_proposals_purchase_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "v_stock_balance"
            referencedColumns: ["po_id"]
          },
          {
            foreignKeyName: "purchases_proposals_purchase_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "v_warehouse_incoming"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_proposals_purchase_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "v_warehouse_incoming"
            referencedColumns: ["purchase_id"]
          },
        ]
      }
      v_purchases_display: {
        Row: {
          created_at: string | null
          display_no: string | null
          id: string | null
          id_short: number | null
        }
        Insert: {
          created_at?: string | null
          display_no?: never
          id?: string | null
          id_short?: number | null
        }
        Update: {
          created_at?: string | null
          display_no?: never
          id?: string | null
          id_short?: number | null
        }
        Relationships: []
      }
      v_purchases_summary: {
        Row: {
          created_at: string | null
          currency: string | null
          delivery_expected: string | null
          id: string | null
          paid_amount: number | null
          po_no: string | null
          po_status: string | null
          total_amount: number | null
        }
        Relationships: []
      }
      v_reno_calc_fields_ui: {
        Row: {
          basis_key: string | null
          default_value: Json | null
          field_type: string | null
          hint: string | null
          hint_ru: string | null
          is_active: boolean | null
          is_required: boolean | null
          key: string | null
          label: string | null
          label_ru: string | null
          order_index: number | null
          required: boolean | null
          sort_order: number | null
          uom: string | null
          uom_code: string | null
          used_in_norms: boolean | null
          work_type_code: string | null
        }
        Relationships: []
      }
      v_reno_calc_fields_ui__full: {
        Row: {
          basis_key: string | null
          default_value: Json | null
          field_type: string | null
          hint: string | null
          hint_ru: string | null
          is_active: boolean | null
          is_required: boolean | null
          key: string | null
          label: string | null
          label_ru: string | null
          order_index: number | null
          required: boolean | null
          sort_order: number | null
          uom: string | null
          uom_code: string | null
          used_in_norms: boolean | null
          work_type_code: string | null
        }
        Relationships: []
      }
      v_reno_calc_fields_ui_base: {
        Row: {
          basis_key: string | null
          default_value: Json | null
          field_type: string | null
          hint_ru: string | null
          is_required: boolean | null
          label_ru: string | null
          order_index: number | null
          uom_code: string | null
          work_type_code: string | null
        }
        Relationships: []
      }
      v_reno_calc_fields_ui_clean: {
        Row: {
          basis_key: string | null
          default_value: Json | null
          field_type: string | null
          hint: string | null
          hint_ru: string | null
          is_active: boolean | null
          is_required: boolean | null
          key: string | null
          label: string | null
          label_ru: string | null
          order_index: number | null
          required: boolean | null
          sort_order: number | null
          uom: string | null
          uom_code: string | null
          used_in_norms: boolean | null
          work_type_code: string | null
        }
        Relationships: []
      }
      v_reno_calc_fields_ui_policy: {
        Row: {
          basis_key: string | null
          default_value: Json | null
          field_type: string | null
          hint: string | null
          hint_ru: string | null
          is_active: boolean | null
          is_required: boolean | null
          key: string | null
          label: string | null
          label_ru: string | null
          order_index: number | null
          required: boolean | null
          sort_order: number | null
          uom: string | null
          uom_code: string | null
          used_in_norms: boolean | null
          work_type_code: string | null
        }
        Relationships: []
      }
      v_reno_calc_fields_ui2: {
        Row: {
          basis_key: string | null
          default_value: Json | null
          field_type: string | null
          hint: string | null
          hint_ru: string | null
          is_active: boolean | null
          is_required: boolean | null
          key: string | null
          label: string | null
          label_ru: string | null
          order_index: number | null
          required: boolean | null
          sort_order: number | null
          uom: string | null
          uom_code: string | null
          used_in_norms: boolean | null
          work_type_code: string | null
        }
        Relationships: []
      }
      v_reno_group_map: {
        Row: {
          category: string | null
          pattern: string | null
        }
        Relationships: []
      }
      v_reno_norm_rules_effective: {
        Row: {
          base_coeff: number | null
          basis: Database["public"]["Enums"]["reno_basis"] | null
          effective_coeff: number | null
          is_active: boolean | null
          rik_code: string | null
          section: string | null
          uom_code: string | null
          work_type_code: string | null
        }
        Insert: {
          base_coeff?: number | null
          basis?: Database["public"]["Enums"]["reno_basis"] | null
          effective_coeff?: never
          is_active?: boolean | null
          rik_code?: string | null
          section?: string | null
          uom_code?: string | null
          work_type_code?: string | null
        }
        Update: {
          base_coeff?: number | null
          basis?: Database["public"]["Enums"]["reno_basis"] | null
          effective_coeff?: never
          is_active?: boolean | null
          rik_code?: string | null
          section?: string | null
          uom_code?: string | null
          work_type_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reno_norm_rules_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "reno_work_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "reno_norm_rules_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "v_reno_work_types_ui"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "reno_norm_rules_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "v_steel_work_types_clean"
            referencedColumns: ["work_type_code"]
          },
          {
            foreignKeyName: "reno_norm_rules_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "v_work_types_grouped"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "reno_norm_rules_work_type_code_fkey"
            columns: ["work_type_code"]
            isOneToOne: false
            referencedRelation: "v_work_types_picker"
            referencedColumns: ["code"]
          },
        ]
      }
      v_reno_work_types_ui: {
        Row: {
          code: string | null
          family_code: string | null
          family_name: string | null
          family_sort_order: number | null
          name_human_ru: string | null
          name_ru: string | null
          segment: Database["public"]["Enums"]["reno_segment"] | null
        }
        Relationships: []
      }
      v_request_items_display: {
        Row: {
          id: string | null
          name_human: string | null
          note: string | null
          qty: number | null
          request_id: string | null
          rik_code: string | null
          uom: string | null
        }
        Insert: {
          id?: string | null
          name_human?: string | null
          note?: string | null
          qty?: number | null
          request_id?: string | null
          rik_code?: string | null
          uom?: string | null
        }
        Update: {
          id?: string | null
          name_human?: string | null
          note?: string | null
          qty?: number | null
          request_id?: string | null
          rik_code?: string | null
          uom?: string | null
        }
        Relationships: []
      }
      v_request_items_with_stock: {
        Row: {
          available: number | null
          name_human: string | null
          on_hand: number | null
          qty_requested: number | null
          request_id: string | null
          request_item_id: string | null
          reserved: number | null
          rik_code: string | null
          uom: string | null
        }
        Relationships: []
      }
      v_request_latest_pr_ui: {
        Row: {
          proposal_id: string | null
          proposal_no: string | null
          request_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_files_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_files_view"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_accountant_inbox"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_accountant_inbox_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_buyer_buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_rows"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds_v2"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_finance_spend_kinds_v3"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_director_proposals_pending"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_payments_sum"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposals_summary"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_request_latest_proposal_ui"
            referencedColumns: ["proposal_id"]
          },
        ]
      }
      v_request_latest_proposal_ui: {
        Row: {
          proposal_id: string | null
          proposal_no: string | null
          request_id: string | null
        }
        Relationships: []
      }
      v_request_pdf_full: {
        Row: {
          comment: string | null
          created_at: string | null
          display_no: string | null
          foreman_name: string | null
          item_id: string | null
          level_code: string | null
          name_human: string | null
          need_by: string | null
          note: string | null
          object_type_code: string | null
          qty: number | null
          request_id: string | null
          rik_code: string | null
          status: Database["public"]["Enums"]["request_status_enum"] | null
          system_code: string | null
          uom: string | null
          zone_code: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_level_code_fkey"
            columns: ["level_code"]
            isOneToOne: false
            referencedRelation: "ref_levels"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "requests_object_type_code_fkey"
            columns: ["object_type_code"]
            isOneToOne: false
            referencedRelation: "ref_object_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "requests_system_code_fkey"
            columns: ["system_code"]
            isOneToOne: false
            referencedRelation: "ref_systems"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "requests_zone_code_fkey"
            columns: ["zone_code"]
            isOneToOne: false
            referencedRelation: "ref_zones"
            referencedColumns: ["code"]
          },
        ]
      }
      v_request_pdf_header: {
        Row: {
          display_no: string | null
          foreman_name: string | null
          id: string | null
          need_by: string | null
          status: Database["public"]["Enums"]["request_status_enum"] | null
        }
        Insert: {
          display_no?: string | null
          foreman_name?: string | null
          id?: string | null
          need_by?: string | null
          status?: Database["public"]["Enums"]["request_status_enum"] | null
        }
        Update: {
          display_no?: string | null
          foreman_name?: string | null
          id?: string | null
          need_by?: string | null
          status?: Database["public"]["Enums"]["request_status_enum"] | null
        }
        Relationships: []
      }
      v_requests_display: {
        Row: {
          comment: string | null
          created_at: string | null
          display_no: string | null
          foreman_name: string | null
          id: string | null
          level_code: string | null
          need_by: string | null
          nice_no: string | null
          object_type_code: string | null
          status: Database["public"]["Enums"]["request_status_enum"] | null
          system_code: string | null
          updated_at: string | null
          zone_code: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          display_no?: string | null
          foreman_name?: string | null
          id?: string | null
          level_code?: string | null
          need_by?: string | null
          nice_no?: never
          object_type_code?: string | null
          status?: Database["public"]["Enums"]["request_status_enum"] | null
          system_code?: string | null
          updated_at?: string | null
          zone_code?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          display_no?: string | null
          foreman_name?: string | null
          id?: string | null
          level_code?: string | null
          need_by?: string | null
          nice_no?: never
          object_type_code?: string | null
          status?: Database["public"]["Enums"]["request_status_enum"] | null
          system_code?: string | null
          updated_at?: string | null
          zone_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_level_code_fkey"
            columns: ["level_code"]
            isOneToOne: false
            referencedRelation: "ref_levels"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "requests_object_type_code_fkey"
            columns: ["object_type_code"]
            isOneToOne: false
            referencedRelation: "ref_object_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "requests_system_code_fkey"
            columns: ["system_code"]
            isOneToOne: false
            referencedRelation: "ref_systems"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "requests_zone_code_fkey"
            columns: ["zone_code"]
            isOneToOne: false
            referencedRelation: "ref_zones"
            referencedColumns: ["code"]
          },
        ]
      }
      v_rik_code_map: {
        Row: {
          alias_code: string | null
          canon_code: string | null
        }
        Relationships: []
      }
      v_rik_names_ru: {
        Row: {
          code: string | null
          name_ru: string | null
          uom_code: string | null
        }
        Relationships: []
      }
      v_steel_work_types_clean: {
        Row: {
          title: string | null
          work_type_code: string | null
        }
        Insert: {
          title?: never
          work_type_code?: string | null
        }
        Update: {
          title?: never
          work_type_code?: string | null
        }
        Relationships: []
      }
      v_stock: {
        Row: {
          balance: number | null
          request_id: number | null
          uom: string | null
        }
        Relationships: []
      }
      v_stock_balance: {
        Row: {
          created_at: string | null
          delivery_expected: string | null
          issued_qty: number | null
          po_id: string | null
          price_per_unit: number | null
          received_qty: number | null
          request_id: number | null
          request_name: string | null
          request_qty_plan: number | null
          status: string | null
          stock_balance: number | null
          supplier_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      v_suppliers: {
        Row: {
          email: string | null
          id: string | null
          inn: string | null
          name: string | null
          phone: string | null
        }
        Insert: {
          email?: string | null
          id?: string | null
          inn?: string | null
          name?: string | null
          phone?: string | null
        }
        Update: {
          email?: string | null
          id?: string | null
          inn?: string | null
          name?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      v_system_types: {
        Row: {
          code: string | null
          name: string | null
        }
        Insert: {
          code?: string | null
          name?: string | null
        }
        Update: {
          code?: string | null
          name?: string | null
        }
        Relationships: []
      }
      v_systems_all: {
        Row: {
          code: string | null
          id: string | null
          name: string | null
          object_type_code: string | null
        }
        Insert: {
          code?: string | null
          id?: never
          name?: string | null
          object_type_code?: never
        }
        Update: {
          code?: string | null
          id?: never
          name?: string | null
          object_type_code?: never
        }
        Relationships: []
      }
      v_warehouse_fact: {
        Row: {
          code: string | null
          material_id: string | null
          name: string | null
          qty_available: number | null
          qty_on_hand: number | null
          qty_reserved: number | null
          uom_id: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_warehouse_fact_norm: {
        Row: {
          code: string | null
          material_id: string | null
          name: string | null
          qty_available: number | null
          qty_on_hand: number | null
          qty_reserved: number | null
          uom_id: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_warehouse_fact_ui: {
        Row: {
          code: string | null
          name: string | null
          qty_available: number | null
          qty_on_hand: number | null
          qty_reserved: number | null
          uom_id: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_warehouse_fact_ui_canon: {
        Row: {
          code: string | null
          name: string | null
          qty_available: number | null
          qty_on_hand: number | null
          qty_reserved: number | null
          uom_id: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_warehouse_fact_ui_live: {
        Row: {
          code: string | null
          name: string | null
          qty_available: number | null
          qty_on_hand: number | null
          qty_reserved: number | null
          uom_id: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_warehouse_history: {
        Row: {
          event_dt: string | null
          event_type: string | null
          purchase_id: string | null
          qty: number | null
          rik_code: string | null
          uom_id: string | null
        }
        Relationships: []
      }
      v_warehouse_incoming: {
        Row: {
          created_at: string | null
          id: string | null
          purchase_id: string | null
          qty_total: number | null
          status: string | null
          supplier_name: string | null
        }
        Relationships: []
      }
      v_warehouse_moves_ui_canon: {
        Row: {
          code: string | null
          qty_available: number | null
          qty_on_hand: number | null
          qty_reserved: number | null
          uom_id: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_warehouse_stock: {
        Row: {
          object_id: string | null
          qty_available: number | null
          qty_on_hand: number | null
          qty_reserved: number | null
          rik_code: string | null
          uom_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_object_fk"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "objects"
            referencedColumns: ["id"]
          },
        ]
      }
      v_warehouse_stock_api: {
        Row: {
          code: string | null
          qty_available: number | null
          qty_on_hand: number | null
          qty_reserved: number | null
          uom_id: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_warehouse_stock_api_canon: {
        Row: {
          code: string | null
          qty_available: number | null
          qty_on_hand: number | null
          qty_reserved: number | null
          uom_id: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_warehouse_stock_api_canon_by_object: {
        Row: {
          code: string | null
          object_id: string | null
          qty_available: number | null
          qty_on_hand: number | null
          qty_reserved: number | null
          uom_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_object_fk"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "objects"
            referencedColumns: ["id"]
          },
        ]
      }
      v_wh_balance_by_object: {
        Row: {
          code: string | null
          object_id: string | null
          qty_available: number | null
          qty_on_hand: number | null
          qty_reserved: number | null
          uom_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_object_fk"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "objects"
            referencedColumns: ["id"]
          },
        ]
      }
      v_wh_balance_ledger: {
        Row: {
          code: string | null
          object_id: string | null
          qty_available: number | null
          qty_on_hand: number | null
          qty_reserved: number | null
          uom_id: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_wh_balance_ledger_truth_ui: {
        Row: {
          code: string | null
          qty_available: number | null
          uom_id: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_wh_balance_ledger_truth_ui_canon: {
        Row: {
          code: string | null
          qty_available: number | null
          uom_id: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_wh_balance_ledger_truth_ui_named: {
        Row: {
          code: string | null
          name: string | null
          qty_available: number | null
          uom_id: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_wh_balance_ledger_ui: {
        Row: {
          code: string | null
          name: string | null
          qty_available: number | null
          qty_on_hand: number | null
          qty_reserved: number | null
          uom_id: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_wh_balance_ledger_ui_all: {
        Row: {
          code: string | null
          name: string | null
          qty_available: number | null
          qty_on_hand: number | null
          qty_reserved: number | null
          uom_id: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_wh_incoming_display: {
        Row: {
          created_at: string | null
          display_no: string | null
          id: string | null
          id_short: number | null
        }
        Insert: {
          created_at?: string | null
          display_no?: never
          id?: string | null
          id_short?: number | null
        }
        Update: {
          created_at?: string | null
          display_no?: never
          id?: string | null
          id_short?: number | null
        }
        Relationships: []
      }
      v_wh_incoming_heads_ui: {
        Row: {
          confirmed_at: string | null
          incoming_id: string | null
          incoming_status: string | null
          items_cnt: number | null
          partial_cnt: number | null
          pending_cnt: number | null
          po_no: string | null
          purchase_created_at: string | null
          purchase_id: string | null
          purchase_status: string | null
          qty_expected_sum: number | null
          qty_left_sum: number | null
          qty_received_sum: number | null
        }
        Relationships: []
      }
      v_wh_incoming_items_ui: {
        Row: {
          code: string | null
          incoming_id: string | null
          incoming_item_id: string | null
          name: string | null
          purchase_item_id: string | null
          qty_expected: number | null
          qty_left: number | null
          qty_received: number | null
          sort_key: number | null
          uom: string | null
        }
        Relationships: []
      }
      v_wh_issue_req_heads_ui: {
        Row: {
          display_no: string | null
          done_cnt: number | null
          issue_status: string | null
          items_cnt: number | null
          level_code: string | null
          level_name: string | null
          object_name: string | null
          qty_issued_sum: number | null
          qty_left_sum: number | null
          qty_limit_sum: number | null
          ready_cnt: number | null
          request_id: string | null
          submitted_at: string | null
          system_code: string | null
          system_name: string | null
          zone_code: string | null
          zone_name: string | null
        }
        Relationships: []
      }
      v_wh_issue_req_heads_ui_base: {
        Row: {
          display_no: string | null
          done_cnt: number | null
          issue_status: string | null
          items_cnt: number | null
          level_code: string | null
          object_name: string | null
          qty_issued_sum: number | null
          qty_left_sum: number | null
          qty_limit_sum: number | null
          ready_cnt: number | null
          request_id: string | null
          submitted_at: string | null
          system_code: string | null
          zone_code: string | null
        }
        Relationships: []
      }
      v_wh_issue_req_items_ui: {
        Row: {
          display_no: string | null
          level_code: string | null
          level_name: string | null
          name_human: string | null
          object_name: string | null
          qty_available: number | null
          qty_can_issue_now: number | null
          qty_issued: number | null
          qty_left: number | null
          qty_limit: number | null
          request_id: string | null
          request_item_id: string | null
          rik_code: string | null
          submitted_at: string | null
          system_code: string | null
          system_name: string | null
          uom: string | null
          zone_code: string | null
          zone_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_level_code_fkey"
            columns: ["level_code"]
            isOneToOne: false
            referencedRelation: "ref_levels"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "requests_system_code_fkey"
            columns: ["system_code"]
            isOneToOne: false
            referencedRelation: "ref_systems"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "requests_zone_code_fkey"
            columns: ["zone_code"]
            isOneToOne: false
            referencedRelation: "ref_zones"
            referencedColumns: ["code"]
          },
        ]
      }
      v_wh_issue_req_items_ui_base: {
        Row: {
          display_no: string | null
          level_code: string | null
          name_human: string | null
          object_name: string | null
          qty_available: number | null
          qty_can_issue_now: number | null
          qty_issued: number | null
          qty_left: number | null
          qty_limit: number | null
          request_id: string | null
          request_item_id: string | null
          rik_code: string | null
          submitted_at: string | null
          system_code: string | null
          uom: string | null
          zone_code: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_level_code_fkey"
            columns: ["level_code"]
            isOneToOne: false
            referencedRelation: "ref_levels"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "requests_system_code_fkey"
            columns: ["system_code"]
            isOneToOne: false
            referencedRelation: "ref_systems"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "requests_zone_code_fkey"
            columns: ["zone_code"]
            isOneToOne: false
            referencedRelation: "ref_zones"
            referencedColumns: ["code"]
          },
        ]
      }
      v_wh_issue_req_items_ui_fixed: {
        Row: {
          display_no: string | null
          level_code: string | null
          level_name: string | null
          name_human: string | null
          object_name: string | null
          qty_available: number | null
          qty_can_issue_now: number | null
          qty_issued: number | null
          qty_left: number | null
          qty_limit: number | null
          request_id: string | null
          request_item_id: string | null
          rik_code: string | null
          submitted_at: string | null
          system_code: string | null
          system_name: string | null
          uom: string | null
          zone_code: string | null
          zone_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_level_code_fkey"
            columns: ["level_code"]
            isOneToOne: false
            referencedRelation: "ref_levels"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "requests_system_code_fkey"
            columns: ["system_code"]
            isOneToOne: false
            referencedRelation: "ref_systems"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "requests_zone_code_fkey"
            columns: ["zone_code"]
            isOneToOne: false
            referencedRelation: "ref_zones"
            referencedColumns: ["code"]
          },
        ]
      }
      v_wh_issue_req_items_ui_old: {
        Row: {
          display_no: string | null
          level_code: string | null
          level_name: string | null
          name_human: string | null
          object_name: string | null
          qty_available: number | null
          qty_can_issue_now: number | null
          qty_issued: number | null
          qty_left: number | null
          qty_limit: number | null
          request_id: string | null
          request_item_id: string | null
          rik_code: string | null
          submitted_at: string | null
          system_code: string | null
          system_name: string | null
          uom: string | null
          zone_code: string | null
          zone_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_level_code_fkey"
            columns: ["level_code"]
            isOneToOne: false
            referencedRelation: "ref_levels"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "requests_system_code_fkey"
            columns: ["system_code"]
            isOneToOne: false
            referencedRelation: "ref_systems"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "requests_zone_code_fkey"
            columns: ["zone_code"]
            isOneToOne: false
            referencedRelation: "ref_zones"
            referencedColumns: ["code"]
          },
        ]
      }
      v_wh_issued_truth_ui: {
        Row: {
          d: string | null
          issue_id: number | null
          issue_item_id: number | null
          level_h: string | null
          name_human: string | null
          object_name: string | null
          qty: number | null
          rik_code: string | null
          system_h: string | null
          uom_id: string | null
          work_name: string | null
          zone_h: string | null
        }
        Relationships: []
      }
      v_work_types_grouped: {
        Row: {
          code: string | null
          group_code: string | null
          group_name_ru: string | null
          group_sort: number | null
          name_ru: string | null
        }
        Relationships: []
      }
      v_work_types_picker: {
        Row: {
          code: string | null
          family_code: string | null
          family_short_name_ru: string | null
          family_sort: number | null
          work_name_ru: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reno_work_types_family_code_fkey"
            columns: ["family_code"]
            isOneToOne: false
            referencedRelation: "reno_work_families"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "reno_work_types_family_code_fkey"
            columns: ["family_code"]
            isOneToOne: false
            referencedRelation: "v_work_types_grouped"
            referencedColumns: ["group_code"]
          },
        ]
      }
      v_works_fact: {
        Row: {
          contractor_id: string | null
          contractor_name: string | null
          created_at: string | null
          finished_at: string | null
          object_id: string | null
          object_name: string | null
          progress_id: string | null
          proposal_id: string | null
          purchase_id: string | null
          purchase_item_id: string | null
          qty_done: number | null
          qty_left: number | null
          qty_planned: number | null
          started_at: string | null
          uom_id: string | null
          updated_at: string | null
          work_code: string | null
          work_name: string | null
          work_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_acc_incoming"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_po_receipt_status"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_po_totals"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_purchases_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_stock_balance"
            referencedColumns: ["po_id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_warehouse_incoming"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "v_warehouse_incoming"
            referencedColumns: ["purchase_id"]
          },
          {
            foreignKeyName: "work_progress_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_progress_purchase_item_id_fkey"
            columns: ["purchase_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_items"
            referencedColumns: ["id"]
          },
        ]
      }
      v_zone_types: {
        Row: {
          code: string | null
          name: string | null
          object_type_code: string | null
        }
        Insert: {
          code?: string | null
          name?: string | null
          object_type_code?: string | null
        }
        Update: {
          code?: string | null
          name?: string | null
          object_type_code?: string | null
        }
        Relationships: []
      }
      v_zones_all: {
        Row: {
          code: string | null
          id: string | null
          name: string | null
          object_type_code: string | null
        }
        Insert: {
          code?: string | null
          id?: never
          name?: string | null
          object_type_code?: never
        }
        Update: {
          code?: string | null
          id?: never
          name?: string | null
          object_type_code?: never
        }
        Relationships: []
      }
      warehouse_inbox: {
        Row: {
          created_at: string | null
          display_no: string | null
          foreman_name: string | null
          id: string | null
          need_by: string | null
          status: Database["public"]["Enums"]["request_status_enum"] | null
        }
        Insert: {
          created_at?: string | null
          display_no?: string | null
          foreman_name?: string | null
          id?: string | null
          need_by?: string | null
          status?: Database["public"]["Enums"]["request_status_enum"] | null
        }
        Update: {
          created_at?: string | null
          display_no?: string | null
          foreman_name?: string | null
          id?: string | null
          need_by?: string | null
          status?: Database["public"]["Enums"]["request_status_enum"] | null
        }
        Relationships: []
      }
      warehouse_stock: {
        Row: {
          material_id: string | null
          name_human: string | null
          object_name: string | null
          qty_available: number | null
          qty_on_hand: number | null
          qty_reserved: number | null
          rik_code: string | null
          uom_id: string | null
          updated_at: string | null
          warehouse_name: string | null
        }
        Relationships: []
      }
      wh_incoming_compat: {
        Row: {
          confirmed_at: string | null
          created_at: string | null
          id: string | null
          note: string | null
          po_no: string | null
          purchase_id: string | null
          purchase_status: string | null
          purchase_status_raw: string | null
          qty: number | null
          status: string | null
        }
        Relationships: []
      }
      wh_incoming_items_clean: {
        Row: {
          code: string | null
          incoming_id: string | null
          incoming_item_id: string | null
          name: string | null
          purchase_item_id: string | null
          qty_expected: number | null
          qty_received: number | null
          uom: string | null
        }
        Relationships: []
      }
      wh_moves: {
        Row: {
          direction: string | null
          incoming_id: string | null
          issue_id: string | null
          move_id: string | null
          moved_at: string | null
          note: string | null
          object_id: string | null
          purchase_id: string | null
          qty: number | null
          request_item_id: string | null
          rik_code: string | null
          stage_id: string | null
          uom: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "debug_director_items"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "purchase_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items_pending"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "purchase_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items_pending_view"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "purchase_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_items_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_items_with_stock"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "purchase_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_pdf_full"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "purchase_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "purchase_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_base"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "purchase_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_fixed"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "purchase_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "v_wh_issue_req_items_ui_old"
            referencedColumns: ["request_item_id"]
          },
          {
            foreignKeyName: "purchases_object_fk"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "objects"
            referencedColumns: ["id"]
          },
        ]
      }
      works_api: {
        Row: {
          created_at: string | null
          is_active: boolean | null
          name_display: string | null
          parent_code: string | null
          rik_code: string | null
          sector: string | null
          unit_id: string | null
        }
        Insert: {
          created_at?: string | null
          is_active?: never
          name_display?: never
          parent_code?: string | null
          rik_code?: string | null
          sector?: string | null
          unit_id?: string | null
        }
        Update: {
          created_at?: string | null
          is_active?: never
          name_display?: never
          parent_code?: string | null
          rik_code?: string | null
          sector?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rik_works_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "uoms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _apply_norm_to_items: {
        Args: {
          p_month: string
          p_norm_code: string
          p_norm_ver: string
          p_project_id: string
          p_qty_base: number
          p_region: string
          p_section: string
        }
        Returns: number
      }
      _calc_last_input: {
        Args: { p_project_id: string; p_step: string }
        Returns: Json
      }
      _clone_proposal_head: {
        Args: { p_src: string; p_supplier: string }
        Returns: string
      }
      _e2e_log: { Args: { p_id: string; p_step: string }; Returns: undefined }
      _emit_proposal_event: {
        Args: { _kind: string; _payload?: Json; _proposal_id: string }
        Returns: undefined
      }
      _has_col: {
        Args: { p_col: string; p_schema: string; p_table: string }
        Returns: boolean
      }
      _has_column: { Args: { colname: string; tbl: unknown }; Returns: boolean }
      _is_test_text: { Args: { t: string }; Returns: boolean }
      _norm_materials: {
        Args: { p_norm_code: string; p_norm_version?: string }
        Returns: {
          labor_hour: number
          material_code: string
          norm_name: string
          qty_per_unit: number
          system: string
          unit: string
          waste_default: number
        }[]
      }
      _norm_spaces: { Args: { s: string }; Returns: string }
      _price_for: {
        Args: {
          material_code: string
          price_month: string
          region_code: string
        }
        Returns: number
      }
      _proposal_attachment_id_udt: { Args: never; Returns: string }
      _proposal_has_invoice: { Args: { p_id: string }; Returns: boolean }
      _proposal_has_invoice_uuid: { Args: { p_id: string }; Returns: boolean }
      _proposal_total_paid: { Args: { p_id: string }; Returns: number }
      _proposal_total_paid_uuid: { Args: { p_id: string }; Returns: number }
      _proposals_has_id_old: { Args: never; Returns: boolean }
      _request_assign: { Args: { p_request_id: string }; Returns: string }
      _request_assign_display_no_core: {
        Args: { p_request_id: string }
        Returns: string
      }
      _resolve_proposal_id: { Args: { p_any: string }; Returns: string }
      _resolve_user_email: { Args: { p_uid: string }; Returns: string }
      _resolve_user_name: { Args: { p_uid: string }; Returns: string }
      acc_add_payment_min: {
        Args: {
          p_amount: number
          p_method?: string
          p_note?: string
          p_proposal_id: string
        }
        Returns: undefined
      }
      acc_add_payment_min_compat: {
        Args: {
          amount: number
          method?: string
          note?: string
          proposal_id: string
        }
        Returns: undefined
      }
      acc_add_payment_min_uuid: {
        Args: {
          p_amount: number
          p_method?: string
          p_note?: string
          p_proposal_id: string
        }
        Returns: undefined
      }
      acc_add_payment_v2_uuid: {
        Args: {
          p_accountant_fio: string
          p_amount: number
          p_method?: string
          p_note?: string
          p_proposal_id: string
          p_purpose: string
        }
        Returns: undefined
      }
      acc_add_payment_v3_uuid: {
        Args: {
          p_accountant_fio: string
          p_allocations?: Json
          p_amount: number
          p_method: string
          p_note?: string
          p_proposal_id: string
          p_purpose: string
        }
        Returns: number
      }
      accountant_proposal_financial_state_v1: {
        Args: { p_proposal_id: string }
        Returns: Json
      }
      acc_inv_add: {
        Args: {
          p_qty_fact: number
          p_rik: string
          p_session_id: string
          p_uom: string
        }
        Returns: undefined
      }
      acc_inv_finish: { Args: { p_session_id: string }; Returns: undefined }
      acc_inv_list: {
        Args: never
        Returns: {
          comment: string
          finished_at: string
          id: string
          object_id: string
          started_at: string
          status: string
        }[]
      }
      acc_inv_open: {
        Args: { p_comment?: string; p_object_id: string }
        Returns: string
      }
      acc_issue_add_item: {
        Args: {
          p_issue_id: number
          p_qty: number
          p_rik_code: string
          p_uom_id: string
        }
        Returns: undefined
      }
      acc_issue_commit: { Args: { p_issue_id: number }; Returns: undefined }
      acc_issue_commit_ledger:
        | { Args: { p_issue_id: number }; Returns: undefined }
        | {
            Args: { p_issue_id: number; p_object_id: string }
            Returns: undefined
          }
      acc_issue_commit_v2: {
        Args: { p_issue_id: number; p_object_id: string }
        Returns: undefined
      }
      acc_issue_create: {
        Args: { p_comment: string; p_object_id: string; p_work_type_id: string }
        Returns: number
      }
      acc_list_history: {
        Args: {
          p_event_type?: string
          p_from?: string
          p_object_name?: string
          p_rik_code?: string
          p_to?: string
        }
        Returns: {
          event_dt: string | null
          event_type: string | null
          meta: Json | null
          purchase_id: string | null
          qty: number | null
          rik_code: string | null
          uom_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "v_acc_history"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      acc_list_incoming: {
        Args: never
        Returns: {
          created_at: string | null
          object_name: string | null
          po_no: string | null
          purchase_id: string | null
          qty_declared: number | null
          status: string | null
          supplier: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "v_acc_incoming"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      acc_list_incoming_items: {
        Args: { p_purchase_id: string }
        Returns: {
          name_human: string
          qty_declared: number
          request_item_id: string
          rik_code: string
          uom: string
        }[]
      }
      acc_list_stock: {
        Args: never
        Returns: {
          qty_available: number | null
          qty_on_hand: number | null
          qty_reserved: number | null
          rik_code: string | null
          uom_id: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "v_acc_stock"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      acc_receive_all: { Args: { p_purchase_id: string }; Returns: undefined }
      acc_receive_all_lenient: {
        Args: { p_purchase_id: string }
        Returns: undefined
      }
      acc_receive_lines: {
        Args: { p_lines: Json; p_purchase_id: string }
        Returns: undefined
      }
      acc_report_incoming_lines: {
        Args: { p_incoming_id: string }
        Returns: {
          code: string
          name: string
          qty: number
          uom_id: string
        }[]
      }
      acc_report_incoming_v2: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          display_no: string
          event_dt: string
          incoming_id: string
          note: string
          purchase_id: string
          qty_total: number
          who: string
        }[]
      }
      acc_report_issue_lines: {
        Args: { p_issue_id: number }
        Returns: {
          issue_id: number
          name_human: string
          qty_in_req: number
          qty_over: number
          qty_total: number
          rik_code: string
          uom: string
        }[]
      }
      acc_report_issues_v2: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          display_no: string
          event_dt: string
          issue_id: number
          issue_no: string
          kind: string
          note: string
          qty_in_req: number
          qty_over: number
          qty_total: number
          request_id: string
          who: string
        }[]
      }
      acc_report_movement: {
        Args: { p_from: string; p_to: string }
        Returns: {
          event_dt: string | null
          event_type: string | null
          meta: Json | null
          purchase_id: string | null
          qty: number | null
          rik_code: string | null
          uom_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "v_acc_history"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      acc_report_stock: {
        Args: never
        Returns: {
          qty_available: number | null
          qty_on_hand: number | null
          qty_reserved: number | null
          rik_code: string | null
          uom_id: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "v_acc_stock"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      acc_report_unissued: {
        Args: never
        Returns: {
          name_human: string
          qty_requested: number
          request_id: string
          request_item_id: string
          rik_code: string
          status: string
          uom_id: string
        }[]
      }
      acc_return: {
        Args: { p_comment?: string; p_proposal_id: string }
        Returns: undefined
      }
      acc_return_min:
        | {
            Args: { p_comment?: string; p_proposal_id: string }
            Returns: undefined
          }
        | {
            Args: { p_comment?: string; p_proposal_id: string }
            Returns: undefined
          }
      acc_return_min_auto: {
        Args: { p_comment?: string; p_proposal_id: string }
        Returns: undefined
      }
      acc_return_min_by_text: {
        Args: { p_comment: string; p_proposal_id: string }
        Returns: undefined
      }
      acc_return_min_by_uuid: {
        Args: { p_comment: string; p_proposal_id: string }
        Returns: undefined
      }
      acc_return_min_compat: {
        Args: { p_comment?: string; p_proposal_id: string }
        Returns: boolean
      }
      acc_return_min_uuid: {
        Args: { p_comment?: string; p_proposal_id: string }
        Returns: undefined
      }
      accountant_add_payment: {
        Args: {
          p_amount: number
          p_currency?: string
          p_method?: string
          p_note?: string
          p_paid_at?: string
          p_proposal_id: string
        }
        Returns: undefined
      }
      accountant_mass_add_payment: {
        Args: {
          p_ids: string[]
          p_mtd?: string
          p_note?: string
          p_sum: number
        }
        Returns: number
      }
      accountant_mass_return: {
        Args: { p_comment?: string; p_ids: string[] }
        Returns: number
      }
      accountant_return_to_buyer: {
        Args: { p_comment?: string; p_proposal_id: string }
        Returns: undefined
      }
      accounting_pay_invoice_v1: {
        Args: {
          p_accountant_fio: string
          p_allocations?: Json
          p_amount: number
          p_expected_outstanding?: number
          p_expected_total_paid?: number
          p_invoice_amount?: number
          p_invoice_currency?: string
          p_invoice_date?: string
          p_invoice_number?: string
          p_method: string
          p_note?: string
          p_proposal_id: string
          p_purpose: string
        }
        Returns: Json
      }
      add_alias: {
        Args: { p_alias: string; p_rik_code: string }
        Returns: undefined
      }
      add_alias_like: {
        Args: { p_alias: string; p_pattern: string }
        Returns: number
      }
      add_item_app: {
        Args: { p_app_code: string; p_rik_code: string }
        Returns: undefined
      }
      add_proposal_attachment: {
        Args: {
          p_file_name: string
          p_group_key: string
          p_proposal_id: string
          p_url: string
        }
        Returns: boolean
      }
      add_request_item: {
        Args: {
          p_name: string
          p_qty: number
          p_request_id: number
          p_uom: string
        }
        Returns: {
          id: string
          name_human: string
          qty: number
          uom: string
        }[]
      }
      add_request_item_min: {
        Args: {
          p_apply?: string
          p_item_code: string
          p_note?: string
          p_qty: number
          p_request_id: string
        }
        Returns: undefined
      }
      app_catalog_search: {
        Args: { lim?: number; q: string }
        Returns: {
          code: string
          group_code: string
          kind: string
          name: string
          uom_code: string
        }[]
      }
      app_catalog_search_knn: {
        Args: { lim?: number; q: string }
        Returns: {
          code: string
          name: string
          score: number
          uom: string
        }[]
      }
      app_import_reno: {
        Args: { payload: Json }
        Returns: {
          bad_rows: Json
          inserted: number
          skipped: number
          updated: number
        }[]
      }
      app_reno_kit: {
        Args: { include_aux?: boolean; mode?: string; per_section?: number }
        Returns: {
          category: string
          code: string
          group_code: string
          name: string
          qty_suggest: number
          section: string
          uom: string
        }[]
      }
      app_reno_search: {
        Args: { lim?: number; mode?: string }
        Returns: {
          category: string
          code: string
          group_code: string
          kind: string
          name: string
          uom: string
        }[]
      }
      app_request_update_meta: {
        Args: {
          p_comment: string
          p_foreman_name: string
          p_level_code: string
          p_need_by: string
          p_object_type_code: string
          p_request_id: string
          p_system_code: string
          p_zone_code: string
        }
        Returns: undefined
      }
      app_role: { Args: never; Returns: string }
      approve_one: { Args: { p_proposal_id: string }; Returns: boolean }
      approve_or_decline_pending: {
        Args: { p_pending_id: string; p_verdict: string }
        Returns: {
          new_status: string
          pending_id: string
          request_id: number
          request_item_id: string
        }[]
      }
      approve_or_decline_request_pending: {
        Args: { p_pending_id: string; p_verdict: string }
        Returns: {
          new_status: string
          pending_id: string
          request_id: number
          request_item_id: string
        }[]
      }
      approve_request: {
        Args: { id_in: number; ok_in: boolean }
        Returns: {
          purchase_id: number
          purchase_po: string
          request_id: number
          request_status: string
        }[]
      }
      approve_request_all: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      approve_request_all_unified: {
        Args: { p_request_id: string }
        Returns: number
      }
      approve_request_item:
        | {
            Args: { p_actor?: string; p_approval_id: number }
            Returns: {
              acted_at: string
              acted_by: string
              id: number
              request_id: number
              request_item_id: string
              status: Database["public"]["Enums"]["approval_status"]
            }[]
          }
        | { Args: { p_request_item_id: string }; Returns: undefined }
      approve_request_items: {
        Args: {
          p_comment?: string
          p_decision: string
          p_item_ids: string[]
          p_request_id: number
        }
        Returns: undefined
      }
      approve_via_ui: {
        Args: { p_approve: boolean; p_pin: string; p_request_id: number }
        Returns: Json
      }
      archive_old_requests: { Args: never; Returns: undefined }
      auth_email: { Args: never; Returns: string }
      base_name_from_human: { Args: { input: string }; Returns: string }
      best_name_display: { Args: { p_rik: string }; Returns: string }
      build_po: {
        Args: { p_po_no: string; p_request_id: number }
        Returns: undefined
      }
      build_proposal_pdf_html: {
        Args: { p_proposal_id: string }
        Returns: string
      }
      build_proposal_pdf_html_json: {
        Args: { p_proposal_id: string }
        Returns: Json
      }
      build_request_pdf_html: {
        Args: { p_request_id: string }
        Returns: string
      }
      buyer_create_po:
        | {
            Args: { p_items: Json }
            Returns: {
              po_id: string
              po_no: string
            }[]
          }
        | {
            Args: {
              p_currency: string
              p_delivery_date: string
              p_items: Json
              p_note?: string
              p_supplier_id: string
            }
            Returns: {
              po_id: string
              po_no: string
            }[]
          }
        | {
            Args: {
              p_currency?: string
              p_eta_date?: string
              p_items: Json
              p_supplier_id: string
            }
            Returns: {
              po_id: string
              po_no: string
            }[]
          }
      buyer_inbox: {
        Args: never
        Returns: {
          app_code: string
          name_human: string
          qty: number
          request_id: string
          request_item_id: string
          uom: string
        }[]
      }
      buyer_mark_done: { Args: { p_id: number }; Returns: undefined }
      buyer_mass_send_to_accountant: {
        Args: {
          p_currency?: string
          p_ids: string[]
          p_invoice_date: string
          p_invoice_num: string
          p_invoice_sum: number
        }
        Returns: number
      }
      buyer_resubmit_to_director: {
        Args: { p_proposal_id: string }
        Returns: undefined
      }
      buyer_send_to_accountant_min:
        | {
            Args: {
              p_invoice_amount: number
              p_invoice_currency: string
              p_invoice_date: string
              p_invoice_number: string
              p_proposal_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_invoice_amount: number
              p_invoice_currency?: string
              p_invoice_date: string
              p_invoice_number: string
              p_proposal_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_invoice_amount: number
              p_invoice_currency?: string
              p_invoice_date: string
              p_invoice_number: string
              p_proposal_id: string
            }
            Returns: undefined
          }
      buyer_send_to_accountant_min_uuid: {
        Args: {
          p_invoice_amount: number
          p_invoice_currency?: string
          p_invoice_date: string
          p_invoice_number: string
          p_proposal_id: string
        }
        Returns: undefined
      }
      buyer_take_to_work: { Args: { p_id: number }; Returns: undefined }
      buyer_to_accountant_counters: {
        Args: never
        Returns: {
          paid: number
          partial: number
          redo_from_buyer: number
          to_pay: number
          waiting_to_send: number
        }[]
      }
      calc_build_estimate: { Args: { p_project_id: string }; Returns: Json }
      calc_build_estimate_v2: { Args: { p_project_id: string }; Returns: Json }
      calc_ceiling_kit_with_packs: {
        Args: { p_area_m2: number; p_level_kind?: number }
        Returns: {
          base_coeff: number
          basis: string
          effective_coeff: number
          hint: string
          pack_size: number
          pack_uom: string
          packs: number
          qty: number
          rik_code: string
          section: string
          suggested_qty: number
          uom_code: string
          work_type_code: string
        }[]
      }
      calc_export_pdf: { Args: { p_project_id: string }; Returns: string }
      calc_gkl_kit_with_packs: {
        Args: { p_area_m2: number; p_layers?: number }
        Returns: {
          base_coeff: number
          basis: string
          effective_coeff: number
          hint: string
          pack_size: number
          pack_uom: string
          packs: number
          qty: number
          rik_code: string
          section: string
          suggested_qty: number
          uom_code: string
          work_type_code: string
        }[]
      }
      calc_paint_kit_with_packs: {
        Args: {
          p_area_m2: number
          p_layers_base?: number
          p_layers_finish?: number
          p_layers_primer?: number
        }
        Returns: {
          base_coeff: number
          basis: Database["public"]["Enums"]["reno_basis"]
          effective_coeff: number
          hint: string
          pack_size: number
          pack_uom: string
          packs: number
          qty: number
          rik_code: string
          section: string
          suggested_qty: number
          uom_code: string
          work_type_code: string
        }[]
      }
      calc_plaster_kit_with_packs: {
        Args: { p_area_m2: number; p_perimeter_m?: number }
        Returns: {
          base_coeff: number
          basis: Database["public"]["Enums"]["reno_basis"]
          effective_coeff: number
          hint: string
          pack_size: number
          pack_uom: string
          packs: number
          qty: number
          rik_code: string
          section: string
          suggested_qty: number
          uom_code: string
          work_type_code: string
        }[]
      }
      calc_renovation_estimate: {
        Args: { p_project_id: string }
        Returns: Json
      }
      calc_renovation_estimate_v2: {
        Args: { p_project_id: string }
        Returns: Json
      }
      calc_rules_by_worktype: {
        Args: { p_format_code?: string; p_work_type_code: string }
        Returns: {
          base_coeff: number
          basis: Database["public"]["Enums"]["reno_basis"]
          effective_coeff: number
          rik_code: string
          section: string
          uom_code: string
          work_type_code: string
        }[]
      }
      calc_tile_kit_with_packs: {
        Args: { p_area_m2: number; p_format_code: string }
        Returns: {
          base_coeff: number
          basis: Database["public"]["Enums"]["reno_basis"]
          effective_coeff: number
          hint: string
          pack_size: number
          pack_uom: string
          packs: number
          qty: number
          rik_code: string
          section: string
          suggested_qty: number
          uom_code: string
          work_type_code: string
        }[]
      }
      calc_tile_rules: {
        Args: { p_format_code?: string }
        Returns: {
          base_coeff: number
          basis: Database["public"]["Enums"]["reno_basis"]
          effective_coeff: number
          rik_code: string
          section: string
          uom_code: string
          work_type_code: string
        }[]
      }
      calc_to_requests: { Args: { p_project_id: string }; Returns: Json }
      canon_build_all: {
        Args: { p_max_id: number; p_min_id: number; p_step?: number }
        Returns: undefined
      }
      canon_build_batch: {
        Args: { p_max_id: number; p_min_id: number }
        Returns: undefined
      }
      catalog_alias_cyrillic_batch: {
        Args: { batch_size?: number }
        Returns: number
      }
      catalog_resolve_item_id: {
        Args: {
          p_code: string
          p_min_similarity?: number
          p_name: string
          p_ref_id: string
          p_ref_table: string
          p_rik_code: string
        }
        Returns: string
      }
      catalog_search: {
        Args: { p_kind?: string; p_query: string }
        Returns: {
          kind: string
          name_human: string
          name_human_ru: string
          qty_available: number
          rik_code: string
          uom_code: string
        }[]
      }
      catalog_search_prod: {
        Args: {
          p_kind?: string
          p_limit?: number
          p_uom_code?: string
          q: string
        }
        Returns: {
          domain: string
          group_code: string
          id: string
          kind: string
          name_human: string
          rik_code: string
          score: number
          uom_code: string
        }[]
      }
      catalog_search_prod_v2: {
        Args: {
          p_kind?: string
          p_limit?: number
          p_uom_code?: string
          q: string
        }
        Returns: {
          id: string
          kind: string
          name_human: string
          name_human_ru: string
          rik_code: string
          score: number
          uom_code: string
        }[]
      }
      catalog_search_v2: {
        Args: {
          p_domain?: string
          p_group_code?: string
          p_item_type?: string
          p_kind?: string
          p_limit?: number
          p_sector_code?: string
          q: string
        }
        Returns: {
          domain: string
          group_code: string
          id: string
          item_type: string
          kind: string
          name_human: string
          rank: number
          rik_code: string
          sector_code: string
          uom_code: string
        }[]
      }
      catalog_semantic_backfill: {
        Args: { batch_size?: number }
        Returns: number
      }
      catalog_semantic_conflicts: {
        Args: { limit_groups?: number }
        Returns: {
          base_name: string
          diameter: string
          finish: string
          item_count: number
          kind: string
          mark: string
          name_humans: string[]
          rik_codes: string[]
          semantic_key: string
          shape: string
          size: string
          strength: string
          to_diameter: string
          uom_code: string
        }[]
      }
      catalog_semantic_key: {
        Args: {
          kind: string
          name_human: string
          rik_code: string
          uom_code: string
        }
        Returns: string
      }
      catalog_semantic_nullify: {
        Args: { batch_size?: number }
        Returns: number
      }
      catalog_semantic_rebuild: {
        Args: { batch_size?: number }
        Returns: number
      }
      catalog_semantic_suggestions: {
        Args: { limit_groups?: number }
        Returns: {
          alias_code: string
          canon_code: string
          confidence: number
          reason: string
        }[]
      }
      catalog_translate_en_ru: { Args: { s: string }; Returns: string }
      classify_bad_rik_code: { Args: { raw: string }; Returns: string }
      cleanup_old_storage_files: { Args: never; Returns: undefined }
      code_to_en_ext: { Args: { p_code: string }; Returns: string }
      code_to_en_steel: { Args: { p_code: string }; Returns: string }
      code_to_ru: { Args: { p_code: string }; Returns: string }
      code_to_ru_ext: { Args: { p_code: string }; Returns: string }
      code_to_ru_steel: { Args: { p_code: string }; Returns: string }
      company_get_active: {
        Args: never
        Returns: {
          bank: string
          email: string
          id: string
          inn: string
          legal_address: string
          name: string
          phone: string
          site_address: string
        }[]
      }
      company_save:
        | {
            Args: {
              p_bank: string
              p_email: string
              p_inn: string
              p_legal_address: string
              p_name: string
              p_phone: string
            }
            Returns: string
          }
        | {
            Args: {
              p_bank: string
              p_email: string
              p_inn: string
              p_legal_address: string
              p_name: string
              p_phone: string
              p_site_address: string
            }
            Returns: string
          }
      create_or_get_draft:
        | { Args: never; Returns: string }
        | { Args: { p_always_new?: boolean }; Returns: string }
      create_po_from_items_supplier: {
        Args: {
          _created_by?: string
          _currency?: string
          _item_ids: string[]
          _supplier_id: string
        }
        Returns: string
      }
      create_request:
        | {
            Args: never
            Returns: {
              id: number
            }[]
          }
        | {
            Args: {
              p_created_by: string
              p_items: Json
              p_need_by: string
              p_note: string
              p_object: string
            }
            Returns: number
          }
      create_request_min: {
        Args: {
          p_items: Json
          p_need_by?: string
          p_note?: string
          p_object?: string
        }
        Returns: string
      }
      debug_auth_uid: { Args: never; Returns: string }
      dir_return_min: {
        Args: { p_comment: string; p_proposal_id: string }
        Returns: boolean
      }
      director_approve_min_auto: {
        Args: { p_comment?: string; p_proposal_id: string }
        Returns: undefined
      }
      director_approve_min_auto_v1: {
        Args: { p_comment?: string | null; p_proposal_id: string }
        Returns: undefined
      }
      director_decide_proposal_items: {
        Args: { p_decisions: Json; p_finalize?: boolean; p_proposal_id: string }
        Returns: Json
      }
      director_decide_request: {
        Args: { p_decision: string; p_request_id: string }
        Returns: undefined
      }
      director_pending_proposals_scope_v1: {
        Args: { p_limit_heads?: number; p_offset_heads?: number }
        Returns: Json
      }
      director_finance_fetch_summary_v1: {
        Args: {
          p_critical_days?: number
          p_due_days?: number
          p_from?: string
          p_to?: string
        }
        Returns: Json
      }
      director_finance_panel_scope_v1: {
        Args: {
          p_critical_days?: number
          p_due_days?: number
          p_from?: string
          p_to?: string
        }
        Returns: Json
      }
      director_finance_panel_scope_v2: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_limit?: number
          p_object_id?: string
          p_offset?: number
        }
        Returns: Json
      }
      director_finance_panel_scope_v3: {
        Args: {
          p_critical_days?: number
          p_date_from?: string
          p_date_to?: string
          p_due_days?: number
          p_limit?: number
          p_object_id?: string
          p_offset?: number
        }
        Returns: Json
      }
      director_finance_summary_v2: {
        Args: { p_date_from?: string; p_date_to?: string; p_object_id?: string }
        Returns: Json
      }
      director_finance_supplier_scope_v1: {
        Args: {
          p_critical_days?: number
          p_due_days?: number
          p_from?: string
          p_kind_name?: string
          p_supplier: string
          p_to?: string
        }
        Returns: Json
      }
      director_finance_supplier_scope_v2: {
        Args: {
          p_critical_days?: number
          p_due_days?: number
          p_from?: string | null
          p_kind_name?: string | null
          p_object_id?: string
          p_supplier: string
          p_to?: string | null
        }
        Returns: Json
      }
      pdf_director_finance_source_v1: {
        Args: {
          p_critical_days?: number
          p_due_days?: number
          p_from?: string
          p_to?: string
        }
        Returns: Json
      }
      pdf_director_production_source_v1: {
        Args: {
          p_from?: string
          p_include_costs?: boolean
          p_object_name?: string
          p_to?: string
        }
        Returns: Json
      }
      pdf_director_subcontract_source_v1: {
        Args: { p_from?: string; p_object_name?: string; p_to?: string }
        Returns: Json
      }
      director_item_set_status: {
        Args: { p_item_id: string; p_status: string }
        Returns: undefined
      }
      director_items_set_status_for_request: {
        Args: { p_request_id: string; p_status: string }
        Returns: undefined
      }
      director_po_list: {
        Args: { p_status?: string }
        Returns: {
          created_at: string
          currency: string
          eta_date: string
          id: string
          items_count: number
          po_no: string
          status: string
          supplier_id: string
          supplier_name: string
        }[]
      }
      director_po_set_status: {
        Args: { p_comment?: string; p_po_id: string; p_status: string }
        Returns: undefined
      }
      director_proposal_item_return: {
        Args: { p_proposal_item_id: number }
        Returns: undefined
      }
      director_report_fetch_materials_v1: {
        Args: { p_from?: string; p_object_name?: string; p_to?: string }
        Returns: Json
      }
      director_report_fetch_options_v1: {
        Args: { p_from?: string; p_to?: string }
        Returns: Json
      }
      director_report_transport_scope_v1: {
        Args: {
          p_from?: string
          p_include_costs?: boolean
          p_include_discipline?: boolean
          p_object_name?: string
          p_to?: string
        }
        Returns: Json
      }
      director_report_fetch_summary_v1: {
        Args: {
          p_from?: string
          p_mode?: string
          p_object_name?: string
          p_to?: string
        }
        Returns: Json
      }
      director_report_fetch_works_v1: {
        Args: {
          p_from?: string
          p_include_costs?: boolean
          p_object_name?: string
          p_to?: string
        }
        Returns: Json
      }
      director_request_set_status: {
        Args: { p_request_id: string; p_status: string }
        Returns: undefined
      }
      director_return_min_auto: {
        Args: { p_comment?: string; p_proposal_id: string }
        Returns: undefined
      }
      director_return_proposal_to_buyer: {
        Args: { p_proposal_id: string; p_reason?: string }
        Returns: undefined
      }
      director_return_to_buyer: {
        Args: { p_comment?: string; p_proposal_id: string }
        Returns: undefined
      }
      director_send_to_accountant: {
        Args: { p_proposal_id: string }
        Returns: undefined
      }
      ensure_draft_request:
        | {
            Args: never
            Returns: {
              id: string
              num_text: string
            }[]
          }
        | { Args: { p_foreman_id: string }; Returns: Json }
        | {
            Args: {
              p_comment?: string
              p_foreman_name?: string
              p_level_code?: string
              p_need_by?: string
              p_object_type_code?: string
              p_request_id?: string
              p_system_code?: string
              p_zone_code?: string
            }
            Returns: string
          }
      ensure_draft_request_internal: {
        Args: { p_foreman_id: string; p_need_by: string }
        Returns: Json
      }
      ensure_incoming_items: {
        Args: { p_incoming_id: string }
        Returns: undefined
      }
      ensure_my_profile: { Args: never; Returns: undefined }
      ensure_purchase_and_incoming_from_proposal: {
        Args: { p_proposal_id: string }
        Returns: string
      }
      ensure_purchase_and_incoming_strict: {
        Args: { p_proposal_id: string }
        Returns: Json
      }
      ensure_purchase_for_proposal: {
        Args: { p_proposal_id: string }
        Returns: string
      }
      ensure_purchase_items: {
        Args: { p_purchase_id: string }
        Returns: number
      }
      ensure_request: {
        Args: { p_created_by?: string; p_request_id: number }
        Returns: number
      }
      ensure_work_progress_for_purchase: {
        Args: { p_purchase_id: string }
        Returns: undefined
      }
      extract_diameter: { Args: { input: string }; Returns: string }
      extract_mark: { Args: { input: string }; Returns: string }
      extract_mark_m: { Args: { p: string }; Returns: string }
      extract_material_finish: { Args: { input: string }; Returns: string }
      extract_shape: { Args: { input: string }; Returns: string }
      extract_size: { Args: { input: string }; Returns: string }
      extract_strength_class: { Args: { input: string }; Returns: string }
      extract_to_diameter: { Args: { input: string }; Returns: string }
      f_norm: { Args: { "": string }; Returns: string }
      f_unaccent: { Args: { txt: string }; Returns: string }
      fetch_reno_kit: {
        Args: { p_include_aux?: boolean; p_kit: string; p_limit?: number }
        Returns: {
          code: string
          group_code: string
          name: string
          qty_suggest: number
          section: string
          uom: string
        }[]
      }
      fix_request_numbers_batch: { Args: { p_limit?: number }; Returns: number }
      fix_request_numbers_one: { Args: never; Returns: string }
      fn_apply_packaging: {
        Args: { p_need_qty: number; p_rik_code: string; p_uom: string }
        Returns: {
          hint: string
          pack_size: number
          pack_uom: string
          packs: number
          suggested_qty: number
        }[]
      }
      fn_bestname_ru: { Args: { p_code: string }; Returns: string }
      fn_calc_kit: {
        Args: { p_measures: Json; p_options: Json; p_work_type_code: string }
        Returns: {
          hint: string
          name_ru: string
          pack_size: number
          pack_uom: string
          packs: number
          qty: number
          rik_code: string
          section: string
          suggested_qty: number
          uom_code: string
          work_type_code: string
        }[]
      }
      fn_calc_kit_basic: {
        Args: {
          p_area_m2: number
          p_count: number
          p_length_m: number
          p_multiplier: number
          p_perimeter_m: number
          p_points: number
          p_volume_m3: number
          p_work_type_code: string
        }
        Returns: {
          base_coeff: number
          basis: string
          effective_coeff: number
          hint: string
          pack_size: number
          pack_uom: string
          packs: number
          qty: number
          rik_code: string
          section: string
          suggested_qty: number
          uom_code: string
          work_type_code: string
        }[]
      }
      fn_calc_kit_basic_json: {
        Args: { p_measures: Json; p_options?: Json; p_work_type_code: string }
        Returns: {
          base_coeff: number
          basis: string
          effective_coeff: number
          hint: string
          pack_size: number
          pack_uom: string
          packs: number
          qty: number
          rik_code: string
          section: string
          suggested_qty: number
          uom_code: string
          work_type_code: string
        }[]
      }
      fn_calc_kit_basic_num:
        | {
            Args: {
              p_area_m2: number
              p_count: number
              p_length_m: number
              p_multiplier: number
              p_perimeter_m: number
              p_points: number
              p_volume_m3: number
              p_work_type_code: string
            }
            Returns: {
              base_coeff: number
              basis: string
              effective_coeff: number
              hint: string
              pack_size: number
              pack_uom: string
              packs: number
              qty: number
              rik_code: string
              section: string
              suggested_qty: number
              uom_code: string
              work_type_code: string
            }[]
          }
        | {
            Args: {
              p_measures: Json
              p_options: Json
              p_work_type_code: string
            }
            Returns: {
              qty: number
              rik_code: string
              section: string
              uom_code: string
              work_type_code: string
            }[]
          }
      fn_calc_kit_basic_ru: {
        Args: {
          p_area_m2: number
          p_count: number
          p_height_m?: number
          p_length_m: number
          p_multiplier?: number
          p_perimeter_m: number
          p_points: number
          p_volume_m3: number
          p_work_type_code: string
        }
        Returns: {
          base_coeff: number
          basis: string
          effective_coeff: number
          hint: string
          name: string
          name_ru: string
          pack_size: number
          pack_uom: string
          packs: number
          qty: number
          rik_code: string
          section: string
          suggested_qty: number
          uom_code: string
          work_type_code: string
        }[]
      }
      fn_calc_kit_basic_ru_json: {
        Args: { p_measures: Json; p_options?: Json; p_work_type_code: string }
        Returns: {
          base_coeff: number
          basis: string
          effective_coeff: number
          hint: string
          hint_ru: string
          pack_size: number
          pack_uom: string
          pack_uom_ru: string
          packs: number
          qty: number
          rik_code: string
          section: string
          section_ru: string
          suggested_qty: number
          uom_code: string
          uom_ru: string
          work_type_code: string
        }[]
      }
      fn_calc_kit_basic_ru_num: {
        Args: {
          p_area_m2: number
          p_count: number
          p_length_m: number
          p_multiplier: number
          p_perimeter_m: number
          p_points: number
          p_volume_m3: number
          p_work_type_code: string
        }
        Returns: {
          base_coeff: number
          basis: string
          effective_coeff: number
          hint: string
          hint_ru: string
          pack_size: number
          pack_uom: string
          pack_uom_ru: string
          packs: number
          qty: number
          rik_code: string
          section: string
          section_ru: string
          suggested_qty: number
          uom_code: string
          uom_ru: string
          work_type_code: string
        }[]
      }
      fn_calc_kit_json: {
        Args: { p_measures: Json; p_work_type_code: string }
        Returns: {
          base_coeff: number
          basis: string
          effective_coeff: number
          hint: string
          pack_size: number
          pack_uom: string
          packs: number
          qty: number
          rik_code: string
          section: string
          suggested_qty: number
          uom_code: string
          work_type_code: string
        }[]
      }
      fn_catalog_fix_uom_kind: {
        Args: { p_fix_kind?: boolean }
        Returns: number
      }
      fn_catalog_learn_group_rules: {
        Args: { p_min_share?: number }
        Returns: number
      }
      fn_get_pack_rule: {
        Args: { p_rik_code: string }
        Returns: {
          loss_pct: number
          min_packs: number
          pack_size: number
          pack_uom: string
        }[]
      }
      fn_next_request_number: {
        Args: { p_year: number }
        Returns: {
          display_no: string
          seq: number
        }[]
      }
      fn_pick_pack_rule: {
        Args: { p_rik_code: string }
        Returns: {
          loss_pct: number
          min_packs: number
          pack_size: number
          pack_uom: string
          source: string
        }[]
      }
      fn_requests_set_no: { Args: { p_request_id: string }; Returns: string }
      fn_rik_name: { Args: { p_code: string }; Returns: string }
      fn_rik_unit: { Args: { p_code: string }; Returns: string }
      fn_roof_gable_area_by_rise: {
        Args: { l_m: number; rise_m: number; w_m: number }
        Returns: {
          area_plan_m2: number
          area_roof_m2: number
          eaves_m: number
          ridge_m: number
          slope_factor: number
          verge_m: number
        }[]
      }
      fn_roof_gable_from_area_perim_rise: {
        Args: { area_m2: number; perimeter_m: number; rise_m: number }
        Returns: {
          area_plan_m2: number
          area_roof_m2: number
          eaves_m: number
          l_m: number
          ridge_m: number
          slope_factor: number
          verge_m: number
          w_m: number
        }[]
      }
      fn_roof_linear_quantities: {
        Args: {
          area_m2: number
          loss_pct?: number
          perimeter_m: number
          rik_eaves?: string
          rik_ridge?: string
          rik_verge?: string
        }
        Returns: {
          note: string
          qty: number
          rik_code: string
          uom_code: string
        }[]
      }
      fn_roof_rect_dims: {
        Args: { area_m2: number; perimeter_m: number }
        Returns: {
          eaves_m: number
          l_m: number
          ridge_m: number
          verge_m: number
          w_m: number
        }[]
      }
      fn_ru_from_code: { Args: { p_code: string }; Returns: string }
      fn_ruify_roof_name: {
        Args: { p_code: string; p_current?: string }
        Returns: string
      }
      fn_tile_effective_coeff: {
        Args: {
          p_base_coeff: number
          p_format_code: string
          p_rik_code: string
        }
        Returns: number
      }
      fn_upsert_norm_rule:
        | {
            Args: {
              p_basis: Database["public"]["Enums"]["reno_basis"]
              p_coeff: number
              p_is_active?: boolean
              p_rik_code: string
              p_section: string
              p_uom_code: string
              p_work_type_code: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_basis: string
              p_coeff: number
              p_is_active?: boolean
              p_rik_code: string
              p_section: string
              p_uom_code: string
              p_work_type_code: string
            }
            Returns: undefined
          }
      full_operational_wipe: { Args: never; Returns: undefined }
      get_my_role: { Args: never; Returns: string }
      get_my_role_base: { Args: never; Returns: string }
      get_payment_order_data: { Args: { p_payment_id: number }; Returns: Json }
      pdf_contractor_work_source_v1: {
        Args: { p_log_id?: string | null; p_progress_id: string }
        Returns: Json
      }
      pdf_payment_source_v1: { Args: { p_payment_id: number }; Returns: Json }
      pdf_warehouse_incoming_source_v1: { Args: { p_incoming_id: string }; Returns: Json }
      pdf_warehouse_incoming_materials_source_v1: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      pdf_warehouse_day_materials_source_v1: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      pdf_warehouse_object_work_source_v1: {
        Args: { p_from: string; p_object_id?: string; p_to: string }
        Returns: Json
      }
      grn_create: {
        Args: { p_items_fact: Json; p_photos?: Json; p_po_id: string }
        Returns: string
      }
      grn_list: {
        Args: never
        Returns: {
          created_at: string
          grn_no: string
          id: string
          items: number
          purchase_id: string
          qty_total: number
        }[]
      }
      infer_uom_from_code: {
        Args: { code: string; group_code?: string }
        Returns: string
      }
      is_accountant: { Args: never; Returns: boolean }
      issue_add_item_via_ui: {
        Args: {
          p_issue_id: number
          p_qty: number
          p_request_item_id?: string
          p_rik_code: string
          p_uom_id: string
        }
        Returns: undefined
      }
      issue_fifo_by_item: {
        Args: {
          p_brigade: string
          p_issued_to: string
          p_name: string
          p_note: string
          p_object: string
          p_qty: number
          p_rik_code: string
          p_sector: string
          p_uom_id: string
        }
        Returns: Json
      }
      issue_via_ui: {
        Args: {
          p_note: string
          p_object_name?: string
          p_request_id?: string
          p_who: string
          p_work_name?: string
        }
        Returns: number
      }
      kb_swap: { Args: { s: string }; Returns: string }
      accountant_history_scope_v1: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_search?: string
          p_offset?: number
          p_limit?: number
        }
        Returns: Json
      }
      accountant_inbox_scope_v1: {
        Args: { p_tab?: string; p_offset?: number; p_limit?: number }
        Returns: Json
      }
      list_accountant_inbox: {
        Args: { p_tab: string }
        Returns: {
          has_invoice: boolean
          invoice_amount: number
          invoice_currency: string
          invoice_date: string
          invoice_number: string
          payment_status: string
          payments_count: number
          proposal_id: string
          proposal_no: string
          sent_to_accountant_at: string
          supplier: string
          total_paid: number
        }[]
      }
      list_accountant_inbox_fact: { Args: { p_tab?: string }; Returns: Json[] }
      list_accountant_inbox_v2: {
        Args: { p_tab: string }
        Returns: {
          has_invoice: boolean
          invoice_amount: number
          invoice_currency: string
          invoice_date: string
          invoice_number: string
          payment_status: string
          payments_count: number
          proposal_id: string
          sent_to_accountant_at: string
          supplier: string
          total_paid: number
        }[]
      }
      list_accountant_payments_history: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_limit?: number
          p_search?: string
        }
        Returns: {
          amount: number
          has_invoice: boolean
          invoice_amount: number
          invoice_currency: string
          invoice_date: string
          invoice_number: string
          method: string
          note: string
          paid_at: string
          payment_id: number
          proposal_id: string
          supplier: string
        }[]
      }
      list_accountant_payments_history_v2: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_limit?: number
          p_search?: string
        }
        Returns: {
          accountant_fio: string
          amount: number
          has_invoice: boolean
          invoice_amount: number
          invoice_currency: string
          invoice_date: string
          invoice_number: string
          method: string
          note: string
          paid_at: string
          payment_id: number
          proposal_id: string
          purpose: string
          supplier: string
        }[]
      }
      list_attachments:
        | {
            Args: { p_group_key: string; p_proposal_id: string }
            Returns: {
              bucket_id: string
              created_at: string
              file_name: string
              group_key: string
              id: number
              storage_path: string
            }[]
          }
        | {
            Args: { p_group_key?: string; p_proposal_id: string }
            Returns: {
              bucket_id: string
              created_at: string
              file_name: string
              group_key: string
              id: number
              storage_path: string
            }[]
          }
      list_buyer_bucket: {
        Args: { p_bucket: string }
        Returns: {
          id: string
          status: string
          submitted_at: string
        }[]
      }
      list_buyer_inbox: {
        Args: { p_company_id?: string }
        Returns: {
          app_code: string
          created_at: string
          director_reject_at: string
          director_reject_note: string
          kind: string
          name_human: string
          note: string
          object_name: string
          qty: number
          request_id: string
          request_id_old: number
          request_item_id: string
          rik_code: string
          status: string
          uom: string
        }[]
      }
      list_buyer_rework: {
        Args: never
        Returns: {
          id: string
          status: string
          submitted_at: string
        }[]
      }
      list_director_inbox: {
        Args: { p_status?: string }
        Returns: {
          items_count: number
          kind: string
          request_id: string
          submitted_at: string
        }[]
      }
      list_director_items_stable: {
        Args: never
        Returns: {
          app_code: string
          created_at: string
          item_kind: string
          name_human: string
          note: string
          qty: number
          request_id: string
          request_item_id: string
          rik_code: string
          uom: string
        }[]
      }
      list_director_pending: {
        Args: never
        Returns: {
          app_code: string
          id: number
          name_human: string
          note: string
          qty: number
          request_id: number
          request_item_id: string
          rik_code: string
          uom: string
        }[]
      }
      list_director_proposals_pending: {
        Args: never
        Returns: {
          id: number
          status: string
          submitted_at: string
        }[]
      }
      list_pending: {
        Args: never
        Returns: {
          app_code: string
          id: number
          name_human: string
          note: string
          qty: number
          request_id: number
          request_item_id: string
          rik_code: string
          uom: string
        }[]
      }
      list_pending_director: {
        Args: never
        Returns: {
          id: string
          submitted_at: string
        }[]
      }
      list_pending_foreman_items: {
        Args: never
        Returns: {
          id: number
          name_human: string
          qty: number
          request_id: string
          request_item_id: string
          uom: string
        }[]
      }
      list_report_stock_turnover: {
        Args: never
        Returns: {
          dummy: string
        }[]
      }
      list_stock: {
        Args: never
        Returns: {
          available: number
          material_id: string
          name_human: string
          object_name: string
          on_hand: number
          reserved: number
          rik_code: string
          uom: string
          updated_at: string
          warehouse_name: string
        }[]
      }
      list_warehouse_incoming: {
        Args: never
        Returns: {
          created_at: string | null
          id: string | null
          purchase_id: string | null
          qty_total: number | null
          status: string | null
          supplier_name: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "v_warehouse_incoming"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_wh_incoming: {
        Args: never
        Returns: {
          created_at: string
          incoming_id: string
          po_no: string
          purchase_id: string
          status: string
          total_expected: number
          total_received: number
        }[]
      }
      list_wh_items: {
        Args: { p_incoming_id: string }
        Returns: {
          incoming_item_id: string
          name_human: string
          purchase_item_id: string
          qty_expected: number
          qty_received: number
          rik_code: string
          uom: string
        }[]
      }
      listpending: {
        Args: never
        Returns: {
          app_code: string
          id: number
          name_human: string
          note: string
          qty: number
          request_id: number
          request_item_id: string
          rik_code: string
          uom: string
        }[]
      }
      listPending: {
        Args: never
        Returns: {
          app_code: string
          id: number
          name_human: string
          note: string
          qty: number
          request_id: number
          request_item_id: string
          rik_code: string
          uom: string
        }[]
      }
      make_slug: { Args: { p: string }; Returns: string }
      material_search: {
        Args: { p_query: string }
        Returns: {
          available: number
          mat_code: string
          mat_id: string
          name: string
          uom: string
        }[]
      }
      material_search_simple: {
        Args: { p_query: string }
        Returns: {
          available: number
          mat_code: string
          mat_id: string
          name: string
          uom: string
        }[]
      }
      next_doc: {
        Args: { p_doc: string; p_prefix: string; p_year: number }
        Returns: string
      }
      next_doc_no: {
        Args: { p_doc_type: string; p_prefix: string }
        Returns: string
      }
      next_global_short_no: { Args: never; Returns: number }
      next_po_no: { Args: never; Returns: string }
      next_po_safe: { Args: { p_year: number }; Returns: string }
      next_proposal_no: { Args: never; Returns: string }
      next_request_no:
        | { Args: { p_date?: string }; Returns: string }
        | { Args: { p_request_id: string }; Returns: string }
      next_request_no_v2:
        | { Args: never; Returns: string }
        | { Args: { p_request_id: string }; Returns: string }
      next_request_no_v3:
        | { Args: never; Returns: string }
        | { Args: { p_date?: string; p_prefix?: string }; Returns: string }
        | { Args: { p_request_id: string }; Returns: string }
      next_request_seq: { Args: { p_year: number }; Returns: number }
      next_yearly_no: { Args: { p_kind: string }; Returns: string }
      norm_code: { Args: { p: string }; Returns: string }
      norm_gkey: { Args: { s: string }; Returns: string }
      norm_group_code: { Args: { p: string }; Returns: string }
      norm_kind: { Args: { p: string }; Returns: string }
      norm_mat_code: { Args: { p: string }; Returns: string }
      norm_ru_catalog: { Args: { txt: string }; Returns: string }
      norm_text: { Args: { p: string }; Returns: string }
      norm_text_hard: { Args: { p: string }; Returns: string }
      norm_uom: { Args: { p: string }; Returns: string }
      norm_uom_id: { Args: { p: string }; Returns: string }
      normalize_level_code: { Args: { p_in: string }; Returns: string }
      normalize_name_human: { Args: { input: string }; Returns: string }
      normalize_proposal_status: { Args: { s: string }; Returns: string }
      normalize_rik_code: { Args: { raw: string }; Returns: string }
      normalize_text: { Args: { t: string }; Returns: string }
      notifications_list: {
        Args: { p_limit?: number; p_role: string }
        Returns: {
          body: string | null
          created_at: string
          id: number
          is_read: boolean
          meta: Json
          payload: Json | null
          proposal_id: string | null
          read_at: string | null
          role: string
          title: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "notifications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      notifications_mark_read: {
        Args: { p_ids?: number[]; p_role?: string }
        Returns: number
      }
      now_utc: { Args: never; Returns: string }
      payment_post: {
        Args: {
          p_docs?: Json
          p_full?: boolean
          p_items_partial?: Json
          p_po_id: string
        }
        Returns: undefined
      }
      pick_name_best: {
        Args: { p_name_human: string; p_name_human_ru: string }
        Returns: string
      }
      pick_name_ru: {
        Args: { p_code: string; p_name_human: string; p_name_human_ru: string }
        Returns: string
      }
      po_create_from_items: {
        Args: {
          p_currency?: string
          p_item_ids: string[]
          p_supplier_id: string
        }
        Returns: string
      }
      po_submit_from_request: {
        Args: {
          p_created_by: string
          p_delivery: string
          p_price: number
          p_request_id: number
          p_supplier: string
          p_vat: number
        }
        Returns: {
          amount: number | null
          approved_at: string | null
          attachments: Json
          created_at: string
          created_by: string | null
          currency: string
          delivery_expected: string | null
          eta_date: string | null
          id: string
          id_short: number
          invoice_date: string | null
          invoice_no: string | null
          issued_qty: number | null
          object_id: string | null
          object_name: string | null
          payment_date: string | null
          payment_status: string
          po_no: string | null
          price_per_unit: number | null
          proposal_id: string | null
          received_qty: number | null
          request_id: string | null
          request_id_old: number | null
          status: string | null
          supplier: string | null
          supplier_id: string | null
          vat_percent: number | null
        }
        SetofOptions: {
          from: "*"
          to: "purchases"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      po_submit_from_request_by_name: {
        Args: {
          p_created_by: string
          p_delivery: string
          p_price: number
          p_request_id: number
          p_supplier_name: string
          p_vat: number
        }
        Returns: {
          amount: number | null
          approved_at: string | null
          attachments: Json
          created_at: string
          created_by: string | null
          currency: string
          delivery_expected: string | null
          eta_date: string | null
          id: string
          id_short: number
          invoice_date: string | null
          invoice_no: string | null
          issued_qty: number | null
          object_id: string | null
          object_name: string | null
          payment_date: string | null
          payment_status: string
          po_no: string | null
          price_per_unit: number | null
          proposal_id: string | null
          received_qty: number | null
          request_id: string | null
          request_id_old: number | null
          status: string | null
          supplier: string | null
          supplier_id: string | null
          vat_percent: number | null
        }
        SetofOptions: {
          from: "*"
          to: "purchases"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      proposal_add_item:
        | {
            Args: {
              p_app_code?: string
              p_name_human: string
              p_note?: string
              p_proposal_id: string
              p_qty: number
              p_status?: string
              p_uom: string
            }
            Returns: string
          }
        | {
            Args: {
              p_app?: string
              p_name_human: string
              p_note?: string
              p_proposal_id: string
              p_qty: number
              p_status?: string
              p_uom: string
            }
            Returns: string
          }
      proposal_add_items:
        | {
            Args: { p_proposal_id: number; p_request_item_ids: string[] }
            Returns: number
          }
        | {
            Args: { p_proposal_id: string; p_request_item_ids: string[] }
            Returns: number
          }
        | {
            Args: { p_proposal_id: string; p_request_item_ids: string[] }
            Returns: number
          }
        | {
            Args: { p_proposal_id_text: string; p_request_item_ids: string[] }
            Returns: number
          }
      proposal_attach_all_null:
        | {
            Args: { p_proposal_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.proposal_attach_all_null(p_proposal_id => text), public.proposal_attach_all_null(p_proposal_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { p_proposal_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.proposal_attach_all_null(p_proposal_id => text), public.proposal_attach_all_null(p_proposal_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      proposal_attach_item:
        | {
            Args: { p_item_id: string; p_proposal_id: string }
            Returns: undefined
          }
        | {
            Args: { p_item_id: string; p_proposal_id: string }
            Returns: undefined
          }
      proposal_attachments_list: {
        Args: { p_proposal_id: string }
        Returns: {
          bucket_id: string
          created_at: string
          file_name: string
          group_key: string
          id: number
          storage_path: string
          url: string
        }[]
      }
      proposal_create: { Args: never; Returns: string }
      proposal_decide: {
        Args: { p_decision: string; p_proposal_id: number; p_reason?: string }
        Returns: undefined
      }
      proposal_fill_from_request: {
        Args: { p_proposal_id: number }
        Returns: number
      }
      proposal_items: {
        Args: { p_proposal_id: number }
        Returns: {
          app_code: string
          id: number
          name_human: string
          rik_code: string
          total_qty: number
          uom: string
        }[]
      }
      proposal_items_by_id: {
        Args: { p_id: string }
        Returns: {
          app_code: string
          id: number
          name_human: string
          rik_code: string
          total_qty: number
          uom: string
        }[]
      }
      proposal_items_for_web: {
        Args: { p_id: string }
        Returns: {
          app_code: string
          id: number
          name_human: string
          rik_code: string
          total_qty: number
          uom: string
        }[]
      }
      proposal_request_item_integrity_guard_v1: {
        Args: { p_proposal_id: string }
        Returns: Json
      }
      proposal_request_item_integrity_v1: {
        Args: { p_proposal_id: string }
        Returns: {
          integrity_reason: string | null
          integrity_state: string
          proposal_id: string
          proposal_item_id: number
          request_item_cancelled_at: string | null
          request_item_exists: boolean
          request_item_id: string
          request_item_status: string | null
        }[]
      }
      proposal_items_snapshot: {
        Args: { p_meta?: Json; p_proposal_id: string }
        Returns: undefined
      }
      proposal_pdf: {
        Args: { p_proposal_id: number }
        Returns: {
          app_code: string
          line_no: number
          name_human: string
          qty: number
          title: string
          uom: string
        }[]
      }
      proposal_return_to_buyer_min: {
        Args: { p_comment?: string; p_proposal_id: string }
        Returns: undefined
      }
      proposal_send_to_accountant:
        | { Args: { p_proposal_id: string }; Returns: undefined }
        | {
            Args: {
              p_invoice_amount: number
              p_invoice_currency?: string
              p_invoice_date: string
              p_invoice_number: string
              p_proposal_id: string
            }
            Returns: undefined
          }
      proposal_send_to_accountant_min: {
        Args: {
          p_invoice_amount: number
          p_invoice_currency: string
          p_invoice_date: string
          p_invoice_number: string
          p_proposal_id: string
        }
        Returns: undefined
      }
      proposal_submit:
        | {
            Args: { p_proposal_id: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.proposal_submit(p_proposal_id => int8), public.proposal_submit(p_proposal_id => text). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { p_proposal_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.proposal_submit(p_proposal_id => int8), public.proposal_submit(p_proposal_id => text). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      proposals_pending: {
        Args: never
        Returns: {
          items_count: number | null
          proposal_id: string | null
          status: string | null
          submitted_at: string | null
          supplier: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "v_director_proposals_pending"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      purchase_approve: { Args: { p_purchase_id: string }; Returns: boolean }
      purchase_item_approve: {
        Args: { p_request_item_id: string }
        Returns: undefined
      }
      purchase_item_mark_paid:
        | { Args: { p_item_id: string }; Returns: undefined }
        | { Args: { p_date?: string; p_item_id: string }; Returns: undefined }
      purchase_item_reject: {
        Args: { p_request_item_id: string }
        Returns: undefined
      }
      purchase_item_set_status: {
        Args: { p_item_id: string; p_status: string }
        Returns: undefined
      }
      purchase_items_fix_ref_id: {
        Args: { p_purchase_id: string }
        Returns: number
      }
      purchase_reject: {
        Args: { po_id: string }
        Returns: {
          amount: number | null
          approved_at: string | null
          attachments: Json
          created_at: string
          created_by: string | null
          currency: string
          delivery_expected: string | null
          eta_date: string | null
          id: string
          id_short: number
          invoice_date: string | null
          invoice_no: string | null
          issued_qty: number | null
          object_id: string | null
          object_name: string | null
          payment_date: string | null
          payment_status: string
          po_no: string | null
          price_per_unit: number | null
          proposal_id: string | null
          received_qty: number | null
          request_id: string | null
          request_id_old: number | null
          status: string | null
          supplier: string | null
          supplier_id: string | null
          vat_percent: number | null
        }
        SetofOptions: {
          from: "*"
          to: "purchases"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      purchase_rollup_status: { Args: { p_po_id: string }; Returns: undefined }
      purchase_send_for_approval: {
        Args: { p_po_id: string }
        Returns: undefined
      }
      purchase_submit: {
        Args: { po_id: string }
        Returns: {
          amount: number | null
          approved_at: string | null
          attachments: Json
          created_at: string
          created_by: string | null
          currency: string
          delivery_expected: string | null
          eta_date: string | null
          id: string
          id_short: number
          invoice_date: string | null
          invoice_no: string | null
          issued_qty: number | null
          object_id: string | null
          object_name: string | null
          payment_date: string | null
          payment_status: string
          po_no: string | null
          price_per_unit: number | null
          proposal_id: string | null
          received_qty: number | null
          request_id: string | null
          request_id_old: number | null
          status: string | null
          supplier: string | null
          supplier_id: string | null
          vat_percent: number | null
        }
        SetofOptions: {
          from: "*"
          to: "purchases"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      purchase_try_fill_object_id: {
        Args: { p_purchase_id: string }
        Returns: undefined
      }
      purchase_update_status_from_items: {
        Args: { p_po: string }
        Returns: undefined
      }
      purchase_upsert_from_proposal: {
        Args: { p_proposal_id: string }
        Returns: string
      }
      qty_hint: { Args: { p_uom: string }; Returns: number }
      qty_issue: { Args: { x: number }; Returns: number }
      reanimate_pending_proposals: {
        Args: { p_meta?: Json }
        Returns: undefined
      }
      rebind_alias: {
        Args: {
          p_canon_code: string
          p_canon_name: string
          p_source_code: string
        }
        Returns: undefined
      }
      recalc_payment_status: {
        Args: { p_proposal_id: string }
        Returns: undefined
      }
      recalc_proposal_payment_status: {
        Args: { p_id: string }
        Returns: undefined
      }
      recalc_proposals_payment_status: { Args: never; Returns: number }
      receive_via_ui:
        | {
            Args: { p_purchase_id: string; p_when?: string }
            Returns: undefined
          }
        | {
            Args: { p_purchase_id: string; p_qty: number; p_when: string }
            Returns: undefined
          }
        | {
            Args: {
              p_note: string
              p_pin?: string
              p_qty: number
              p_request_id: number
              p_uom: string
              p_who: string
            }
            Returns: Json
          }
      refresh_mv_catalog_search: { Args: never; Returns: undefined }
      refresh_vcat_bestname: { Args: never; Returns: undefined }
      reject_one: { Args: { p_proposal_id: string }; Returns: boolean }
      reject_request_all: {
        Args: { p_reason?: string; p_request_id: string }
        Returns: undefined
      }
      reject_request_item: {
        Args: { reason: string; request_item_id: string }
        Returns: undefined
      }
      reno_calc_bases: {
        Args: { p: Json }
        Returns: {
          area_m2: number
          perimeter_m: number
          room_area_m2: number
          waste_pct: number
        }[]
      }
      reno_calc_bases_v2: {
        Args: { p_params: Json }
        Returns: {
          area_m2: number
          room_area_m2: number
          surface_kind: number
          waste_pct: number
        }[]
      }
      reno_calc_kit: {
        Args: { p_object_profile: string; p_params: Json; p_work_type: string }
        Returns: {
          name_ru: string
          qty: number
          rik_code: string
          section: string
          uom_code: string
        }[]
      }
      reno_param_num: {
        Args: { def: number; key: string; p: Json }
        Returns: number
      }
      req_next_doc_no: { Args: never; Returns: string }
      req_send_to_director: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      request_add_item_min: {
        Args: {
          p_app_code?: string
          p_code: string
          p_kind?: string
          p_name_human?: string
          p_note: string
          p_qty: number
          p_request_id: string
          p_uom?: string
        }
        Returns: boolean
      }
      request_add_items: {
        Args: { p_items: Json; p_request_id: string }
        Returns: number
      }
      request_approve:
        | { Args: { p_id: string }; Returns: undefined }
        | { Args: { p_approve: boolean; p_request_id: number }; Returns: Json }
      request_approve_remaining: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      request_assign_display_no: {
        Args: { p_request_id: string }
        Returns: string
      }
      request_close: { Args: { p_id: string }; Returns: undefined }
      request_create_draft:
        | {
            Args: never
            Returns: {
              approved: boolean | null
              comment: string | null
              company_bank_snapshot: string | null
              company_email_snapshot: string | null
              company_inn_snapshot: string | null
              company_legal_address_snapshot: string | null
              company_name_snapshot: string | null
              company_phone_snapshot: string | null
              contractor_job_id: string | null
              created_at: string | null
              created_by: string | null
              created_email: string | null
              date: string | null
              desired_date: string | null
              display_no: string | null
              doc_no: string | null
              doc_no_base: string | null
              foreman: string | null
              foreman_fio: string | null
              foreman_name: string | null
              id: string
              id_old: number
              id_short: number
              level_code: string | null
              moved: boolean | null
              name: string | null
              need_by: string | null
              note: string | null
              object: string | null
              object_id: string | null
              object_name: string | null
              object_type_code: string | null
              pretty_no: string | null
              qty: number | null
              request_no: string | null
              requested_by: string | null
              responsible: string | null
              rik_code: string | null
              role: string | null
              sector: string | null
              seq: number | null
              site_address_snapshot: string | null
              status: Database["public"]["Enums"]["request_status_enum"] | null
              subcontract_id: string | null
              submitted_at: string | null
              submitted_by: string | null
              system_code: string | null
              uom: string | null
              uom_id: string | null
              updated_at: string
              year: number | null
              zone_code: string | null
            }
            SetofOptions: {
              from: "*"
              to: "requests"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_comment?: string
              p_foreman_name?: string
              p_level_code?: string
              p_need_by?: string
              p_object_type_code?: string
              p_system_code?: string
              p_zone_code?: string
            }
            Returns: {
              approved: boolean | null
              comment: string | null
              company_bank_snapshot: string | null
              company_email_snapshot: string | null
              company_inn_snapshot: string | null
              company_legal_address_snapshot: string | null
              company_name_snapshot: string | null
              company_phone_snapshot: string | null
              contractor_job_id: string | null
              created_at: string | null
              created_by: string | null
              created_email: string | null
              date: string | null
              desired_date: string | null
              display_no: string | null
              doc_no: string | null
              doc_no_base: string | null
              foreman: string | null
              foreman_fio: string | null
              foreman_name: string | null
              id: string
              id_old: number
              id_short: number
              level_code: string | null
              moved: boolean | null
              name: string | null
              need_by: string | null
              note: string | null
              object: string | null
              object_id: string | null
              object_name: string | null
              object_type_code: string | null
              pretty_no: string | null
              qty: number | null
              request_no: string | null
              requested_by: string | null
              responsible: string | null
              rik_code: string | null
              role: string | null
              sector: string | null
              seq: number | null
              site_address_snapshot: string | null
              status: Database["public"]["Enums"]["request_status_enum"] | null
              subcontract_id: string | null
              submitted_at: string | null
              submitted_by: string | null
              system_code: string | null
              uom: string | null
              uom_id: string | null
              updated_at: string
              year: number | null
              zone_code: string | null
            }
            SetofOptions: {
              from: "*"
              to: "requests"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      request_create_draft_numbered: {
        Args: {
          p_comment: string
          p_foreman_name: string
          p_level_code: string
          p_need_by: string
          p_object_type_code: string
          p_system_code: string
          p_zone_code: string
        }
        Returns: {
          approved: boolean | null
          comment: string | null
          company_bank_snapshot: string | null
          company_email_snapshot: string | null
          company_inn_snapshot: string | null
          company_legal_address_snapshot: string | null
          company_name_snapshot: string | null
          company_phone_snapshot: string | null
          contractor_job_id: string | null
          created_at: string | null
          created_by: string | null
          created_email: string | null
          date: string | null
          desired_date: string | null
          display_no: string | null
          doc_no: string | null
          doc_no_base: string | null
          foreman: string | null
          foreman_fio: string | null
          foreman_name: string | null
          id: string
          id_old: number
          id_short: number
          level_code: string | null
          moved: boolean | null
          name: string | null
          need_by: string | null
          note: string | null
          object: string | null
          object_id: string | null
          object_name: string | null
          object_type_code: string | null
          pretty_no: string | null
          qty: number | null
          request_no: string | null
          requested_by: string | null
          responsible: string | null
          rik_code: string | null
          role: string | null
          sector: string | null
          seq: number | null
          site_address_snapshot: string | null
          status: Database["public"]["Enums"]["request_status_enum"] | null
          subcontract_id: string | null
          submitted_at: string | null
          submitted_by: string | null
          system_code: string | null
          uom: string | null
          uom_id: string | null
          updated_at: string
          year: number | null
          zone_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_create_header: {
        Args: { p_comment: string; p_desired: string; p_object_id: string }
        Returns: {
          approved: boolean | null
          comment: string | null
          company_bank_snapshot: string | null
          company_email_snapshot: string | null
          company_inn_snapshot: string | null
          company_legal_address_snapshot: string | null
          company_name_snapshot: string | null
          company_phone_snapshot: string | null
          contractor_job_id: string | null
          created_at: string | null
          created_by: string | null
          created_email: string | null
          date: string | null
          desired_date: string | null
          display_no: string | null
          doc_no: string | null
          doc_no_base: string | null
          foreman: string | null
          foreman_fio: string | null
          foreman_name: string | null
          id: string
          id_old: number
          id_short: number
          level_code: string | null
          moved: boolean | null
          name: string | null
          need_by: string | null
          note: string | null
          object: string | null
          object_id: string | null
          object_name: string | null
          object_type_code: string | null
          pretty_no: string | null
          qty: number | null
          request_no: string | null
          requested_by: string | null
          responsible: string | null
          rik_code: string | null
          role: string | null
          sector: string | null
          seq: number | null
          site_address_snapshot: string | null
          status: Database["public"]["Enums"]["request_status_enum"] | null
          subcontract_id: string | null
          submitted_at: string | null
          submitted_by: string | null
          system_code: string | null
          uom: string | null
          uom_id: string | null
          updated_at: string
          year: number | null
          zone_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_create_min: { Args: never; Returns: string }
      request_display: { Args: { p_request_id: string }; Returns: string }
      request_display_label: { Args: { p_request_id: string }; Returns: string }
      request_display_no: { Args: { p_request_id: string }; Returns: string }
      request_ensure: {
        Args: { p_need_by?: string; p_note?: string; p_object?: string }
        Returns: string
      }
      request_ensure_draft: { Args: { p_role?: string }; Returns: string }
      request_export_meta: { Args: { p_request_id: string }; Returns: Json }
      request_fill_company_snapshot: {
        Args: {
          p_bank: string
          p_company_name: string
          p_email: string
          p_inn: string
          p_legal_address: string
          p_phone: string
          p_request_id: string
          p_site_address: string
        }
        Returns: undefined
      }
      request_get_no: { Args: { p_request_id: string }; Returns: string }
      request_item_add_or_inc: {
        Args: { p_qty_add?: number; p_request_id: string; p_rik_code: string }
        Returns: string
      }
      request_item_set_status: {
        Args: { p_item_id: string; p_status: string }
        Returns: undefined
      }
      request_item_update_qty: {
        Args: { p_qty: number; p_request_item_id: string }
        Returns: {
          app_code: string | null
          cancelled_at: string | null
          code: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decided_by_role: string | null
          director_reject_at: string | null
          director_reject_note: string | null
          id: string
          item_kind: string | null
          kind: string | null
          name_human: string
          name_human_nn: string | null
          need_by: string | null
          note: string | null
          position_order: number
          price: number | null
          purchase_id: string | null
          qty: number
          ref_id: string | null
          ref_table: string
          request_id: string
          rik_code: string
          row_no: number
          status: string | null
          supplier: string | null
          supplier_hint: string | null
          unit_id: string | null
          uom: string
          uom_nn: string | null
          updated_at: string
          usage_category: string | null
          vat: number | null
        }
        SetofOptions: {
          from: "*"
          to: "request_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_items_backfill: { Args: { p_limit?: number }; Returns: Json }
      request_items_by_request: {
        Args: { p_request_id: string }
        Returns: {
          app_code: string
          id: string
          name_human: string
          note: string
          qty: number
          request_id: string
          status: string
          supplier_hint: string
          uom: string
        }[]
      }
      request_items_set_status: {
        Args: { p_request_item_ids: string[]; p_status: string }
        Returns: undefined
      }
      request_items_with_stock: {
        Args: { p_request_id: string }
        Returns: {
          available: number
          name_human: string
          on_hand: number
          qty_requested: number
          request_id: string
          request_item_id: string
          reserved: number
          rik_code: string
          uom: string
        }[]
      }
      request_label: { Args: { p_request_id: string }; Returns: string }
      request_patch_meta: {
        Args: {
          p_comment: string
          p_foreman_name: string
          p_level_code: string
          p_need_by: string
          p_object_type_code: string
          p_request_id: string
          p_system_code: string
          p_zone_code: string
        }
        Returns: undefined
      }
      request_pdf_html: { Args: { p_request_id: string }; Returns: string }
      request_find_reusable_empty_draft_v1: {
        Args: { p_user_id?: string | null }
        Returns: string | null
      }
      request_gc_empty_drafts_v1: {
        Args: { p_limit?: number | null; p_older_than_days?: number | null }
        Returns: Json
      }
      request_recalc_status:
        | {
            Args: { p_request_id: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.request_recalc_status(p_request_id => int8), public.request_recalc_status(p_request_id => int4), public.request_recalc_status(p_request_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { p_request_id: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.request_recalc_status(p_request_id => int8), public.request_recalc_status(p_request_id => int4), public.request_recalc_status(p_request_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { p_request_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.request_recalc_status(p_request_id => int8), public.request_recalc_status(p_request_id => int4), public.request_recalc_status(p_request_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      request_reject: { Args: { p_id: string }; Returns: undefined }
      request_restore: { Args: { p_id: string }; Returns: undefined }
      request_submit: {
        Args: { p_request_id: string }
        Returns: {
          approved: boolean | null
          comment: string | null
          company_bank_snapshot: string | null
          company_email_snapshot: string | null
          company_inn_snapshot: string | null
          company_legal_address_snapshot: string | null
          company_name_snapshot: string | null
          company_phone_snapshot: string | null
          contractor_job_id: string | null
          created_at: string | null
          created_by: string | null
          created_email: string | null
          date: string | null
          desired_date: string | null
          display_no: string | null
          doc_no: string | null
          doc_no_base: string | null
          foreman: string | null
          foreman_fio: string | null
          foreman_name: string | null
          id: string
          id_old: number
          id_short: number
          level_code: string | null
          moved: boolean | null
          name: string | null
          need_by: string | null
          note: string | null
          object: string | null
          object_id: string | null
          object_name: string | null
          object_type_code: string | null
          pretty_no: string | null
          qty: number | null
          request_no: string | null
          requested_by: string | null
          responsible: string | null
          rik_code: string | null
          role: string | null
          sector: string | null
          seq: number | null
          site_address_snapshot: string | null
          status: Database["public"]["Enums"]["request_status_enum"] | null
          subcontract_id: string | null
          submitted_at: string | null
          submitted_by: string | null
          system_code: string | null
          uom: string | null
          uom_id: string | null
          updated_at: string
          year: number | null
          zone_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_sync_draft_v1: {
        Args: {
          p_comment?: string | null
          p_foreman_name?: string | null
          p_items?: Json
          p_level_code?: string | null
          p_need_by?: string | null
          p_object_type_code?: string | null
          p_pending_delete_ids?: string[]
          p_request_id?: string | null
          p_submit?: boolean
          p_system_code?: string | null
          p_zone_code?: string | null
        }
        Returns: Json
      }
      request_sync_draft_v2: {
        Args: {
          p_comment?: string | null
          p_contractor_job_id?: string | null
          p_foreman_name?: string | null
          p_items?: Json
          p_level_code?: string | null
          p_level_name?: string | null
          p_need_by?: string | null
          p_object_name?: string | null
          p_object_type_code?: string | null
          p_pending_delete_ids?: string[]
          p_request_id?: string | null
          p_submit?: boolean
          p_subcontract_id?: string | null
          p_system_code?: string | null
          p_system_name?: string | null
          p_zone_code?: string | null
          p_zone_name?: string | null
        }
        Returns: Json
      }
      request_submit_to_director: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      request_to_buyer: { Args: { p_request_id: string }; Returns: number }
      request_update_meta: {
        Args: {
          p_comment: string
          p_foreman_name: string
          p_level_code: string
          p_need_by: string
          p_object_type_code: string
          p_request_id: string
          p_system_code: string
          p_zone_code: string
        }
        Returns: undefined
      }
      request_update_status_from_items:
        | {
            Args: { p_request_id: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.request_update_status_from_items(p_request_id => int8), public.request_update_status_from_items(p_request_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { p_request_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.request_update_status_from_items(p_request_id => int8), public.request_update_status_from_items(p_request_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      request_year_next: { Args: { p_year: number }; Returns: number }
      requests_set_display_no: {
        Args: { p_request_id: string }
        Returns: string
      }
      resolve_catalog_code: { Args: { p_code: string }; Returns: string }
      resolve_catalog_item: {
        Args: { p_code: string }
        Returns: {
          code: string
          name: string
          uom: string
        }[]
      }
      resolve_master_code: { Args: { p_code: string }; Returns: string }
      resolve_req_pr_map: {
        Args: { p_request_ids: string[] }
        Returns: {
          proposal_id: string
          proposal_no: string
          request_id: string
        }[]
      }
      resolve_request_pr_map: {
        Args: { p_request_ids: string[] }
        Returns: {
          proposal_id: string
          proposal_no: string
          request_id: string
        }[]
      }
      resolve_rik_code: { Args: { code: string }; Returns: string }
      resolve_rik_code_deep: { Args: { code: string }; Returns: string }
      resolve_stock_code: { Args: { p_code: string }; Returns: string }
      return_request_item_to_foreman: {
        Args: { p_reason?: string; p_request_item_id: string }
        Returns: undefined
      }
      return_request_to_foreman: {
        Args: { p_reason?: string; p_request_id: string }
        Returns: undefined
      }
      rfq_create_and_publish: {
        Args: {
          p_address_place_id: string
          p_address_text: string
          p_city: string
          p_contact_email: string
          p_contact_phone: string
          p_contact_whatsapp: string
          p_deadline_at: string
          p_delivery_days: number
          p_lat: number
          p_lng: number
          p_note: string
          p_radius_km: number
          p_request_item_ids: string[]
          p_visibility: string
        }
        Returns: string
      }
      rik_canon_code: { Args: { p_code: string }; Returns: string }
      rik_quick_ru:
        | {
            Args: { p_limit?: number; p_q: string }
            Returns: {
              name_human: string
              rik_code: string
              uom: string
            }[]
          }
        | {
            Args: { p_apps?: string[]; p_limit?: number; p_q: string }
            Returns: {
              kind: string
              name_human: string
              rik_code: string
              sector_code: string
              spec: string
              uom_code: string
            }[]
          }
      rik_quick_search: {
        Args: { p_apps?: string[]; p_limit?: number; p_q: string }
        Returns: {
          kind: string
          name_human: string
          rik_code: string
          sector_code: string
          spec: string
          uom_code: string
        }[]
      }
      rik_quick_search_ext: {
        Args: {
          p_group_prefix?: string
          p_kind?: string
          p_limit?: number
          p_query: string
        }
        Returns: {
          group_code: string
          kind: string
          name_human: string
          rik_code: string
          sector_code: string
          spec: string
          uom_code: string
        }[]
      }
      rik_quick_search_materials: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          kind: string
          name_human: string
          rik_code: string
          sector_code: string
          spec: string
          uom_code: string
        }[]
      }
      rik_quick_search_typed:
        | {
            Args: { p_limit?: number; p_q: string }
            Returns: {
              app_code: string
              kind: string
              name_human: string
              rik_code: string
              uom_code: string
            }[]
          }
        | {
            Args: { p_apps?: string[]; p_limit?: number; p_q: string }
            Returns: Record<string, unknown>[]
          }
      rik_quick_search_works: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          kind: string
          name_human: string
          rik_code: string
          sector_code: string
          spec: string
          uom_code: string
        }[]
      }
      rik_request_update_meta: {
        Args: {
          p_comment: string
          p_foreman_name: string
          p_level_code: string
          p_need_by: string
          p_object_type_code: string
          p_request_id: string
          p_system_code: string
          p_zone_code: string
        }
        Returns: undefined
      }
      rik_search: {
        Args: { lim?: number; p_q: string }
        Returns: {
          name: string
          ref_id: string
          ref_table: string
          rik_code: string
          sector: string
          unit_id: string
        }[]
      }
      rik_search_auto: {
        Args: { lim?: number; q: string }
        Returns: {
          name: string
          ref_id: string
          ref_table: string
          rik_code: string
          sector: string
          unit: string
        }[]
      }
      rik_search_catalog: {
        Args: { lim?: number; q: string }
        Returns: {
          name: string
          ref_id: string
          ref_table: string
          rik_code: string
          sector: string
          unit: string
        }[]
      }
      rk_request_update_meta: {
        Args: {
          p_comment: string
          p_foreman_name: string
          p_level_code: string
          p_need_by: string
          p_object_type_code: string
          p_request_id: string
          p_system_code: string
          p_zone_code: string
        }
        Returns: undefined
      }
      rpc_autofill_inputs: {
        Args: { p_inputs: Json; p_work_type_code: string }
        Returns: Json
      }
      rpc_autofill_inputs_concrete: {
        Args: { p_inputs: Json; p_work_type_code: string }
        Returns: Json
      }
      rpc_calc_kit_basic: {
        Args: {
          p_area_m2: number
          p_count: number
          p_length_m: number
          p_multiplier: number
          p_perimeter_m: number
          p_points: number
          p_volume_m3: number
          p_work_type_code: string
        }
        Returns: {
          base_coeff: number
          basis: string
          effective_coeff: number
          hint: string
          item_name_ru: string
          pack_size: number
          pack_uom: string
          packs: number
          qty: number
          rik_code: string
          section: string
          suggested_qty: number
          uom_code: string
          work_type_code: string
        }[]
      }
      rpc_calc_kit_basic_ext: {
        Args: {
          p_area_m2: number
          p_count: number
          p_length_m: number
          p_multiplier: number
          p_perimeter_m: number
          p_points: number
          p_points_light: number
          p_points_outlet: number
          p_points_switch: number
          p_volume_m3: number
          p_work_type_code: string
        }
        Returns: {
          base_coeff: number
          basis: string
          effective_coeff: number
          hint: string
          item_name_ru: string
          pack_size: number
          pack_uom: string
          packs: number
          qty: number
          rik_code: string
          section: string
          suggested_qty: number
          uom_code: string
          work_type_code: string
        }[]
      }
      rpc_calc_kit_basic_ext_v2: {
        Args: {
          p_area_m2: number
          p_count: number
          p_length_m: number
          p_multiplier: number
          p_perimeter_m: number
          p_points: number
          p_points_light: number
          p_points_outlet: number
          p_points_shower: number
          p_points_sink: number
          p_points_switch: number
          p_points_wc: number
          p_points_wm: number
          p_volume_m3: number
          p_work_type_code: string
        }
        Returns: {
          base_coeff: number
          basis: string
          effective_coeff: number
          hint: string
          item_name_ru: string
          pack_size: number
          pack_uom: string
          packs: number
          qty: number
          rik_code: string
          section: string
          suggested_qty: number
          uom_code: string
          work_type_code: string
        }[]
      }
      rpc_calc_kit_basic_ext_v3: {
        Args: {
          p_area_m2: number
          p_backfill_m3: number
          p_count: number
          p_excavation_m3: number
          p_film_m2: number
          p_formwork_m2: number
          p_length_m: number
          p_mesh_m2: number
          p_multiplier: number
          p_perimeter_m: number
          p_points: number
          p_points_light: number
          p_points_outlet: number
          p_points_shower: number
          p_points_sink: number
          p_points_switch: number
          p_points_wc: number
          p_points_wm: number
          p_pump_m3: number
          p_rebar_kg: number
          p_subbase_m3: number
          p_subconcrete_m3: number
          p_volume_m3: number
          p_waterproof_m2: number
          p_work_type_code: string
        }
        Returns: {
          base_coeff: number
          basis: string
          effective_coeff: number
          hint: string
          item_name_ru: string
          pack_size: number
          pack_uom: string
          packs: number
          qty: number
          rik_code: string
          section: string
          suggested_qty: number
          uom_code: string
          work_type_code: string
        }[]
      }
      rpc_calc_work_kit:
        | {
            Args: { p_payload: Json; p_work_type_code: string }
            Returns: {
              basis: string
              hint: string
              item_name_ru: string
              qty: number
              rik_code: string
              section: string
              suggested_qty: number
              uom_code: string
            }[]
          }
        | {
            Args: { p_inputs: Json; p_work_type_code: string }
            Returns: {
              basis: string
              hint: string
              item_name_ru: string
              qty: number
              rik_code: string
              section: string
              suggested_qty: number
              uom_code: string
            }[]
          }
      rpc_calc_work_kit_ui: {
        Args: { p_payload: Json; p_work_type_code: string }
        Returns: {
          basis: string
          hint: string
          item_name_ru: string
          qty: number
          rik_code: string
          section: string
          suggested_qty: number
          uom_code: string
        }[]
      }
      rpc_get_calc_profile: {
        Args: { work_type_code: string }
        Returns: {
          default_value: Json | null
          field_key: string | null
          field_type: string | null
          hint: string | null
          hint_ru: string | null
          is_active: boolean | null
          is_required: boolean
          key: string
          label: string
          label_ru: string | null
          order_index: number | null
          profile_code: string | null
          required: boolean | null
          uom: string | null
          uom_code: string | null
          work_type_code: string
        }[]
        SetofOptions: {
          from: "*"
          to: "reno_calc_fields"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      rpc_list_work_type_options: {
        Args: { p_work_type_code: string }
        Returns: {
          basis_key: string
          coeff: number
          desc_ru: string
          is_default: boolean
          kind: string
          name_human: string
          opt_code: string
          rik_code: string
          section: string
          sort_order: number
          title_ru: string
          uom_code: string
        }[]
      }
      rpc_reset_data: { Args: never; Returns: undefined }
      rpc_wh_report_all_context_options_v1: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      rpc_wh_report_issue_ids_for_context_v1: {
        Args: {
          p_from: string
          p_level_h?: string
          p_object_name?: string
          p_system_h?: string
          p_to: string
          p_zone_h?: string
        }
        Returns: {
          issue_id: number
        }[]
      }
      rpc_wh_report_issued_30d: {
        Args: { p_from: string; p_object_name?: string; p_to: string }
        Returns: Json
      }
      rpc_wh_report_issued_all_context_v1: {
        Args: {
          p_from: string
          p_level_code?: string
          p_object_name?: string
          p_system_code?: string
          p_to: string
          p_zone_code?: string
        }
        Returns: Json
      }
      rpc_wh_report_issued_all_context_v2:
        | {
            Args: { p_from: string; p_object_name?: string; p_to: string }
            Returns: Json
          }
        | {
            Args: {
              p_from: string
              p_level_code?: string
              p_object_name?: string
              p_system_code?: string
              p_to: string
              p_zone_code?: string
            }
            Returns: Json
          }
      rpc_wh_report_issued_all_context_v3: {
        Args: {
          p_from: string
          p_level_code?: string
          p_object_name?: string
          p_system_code?: string
          p_to: string
          p_zone_code?: string
        }
        Returns: Json
      }
      rpc_wh_report_issued_by_req_context:
        | {
            Args: {
              p_from: string
              p_level_code?: string
              p_object_id?: string
              p_system_code?: string
              p_to: string
              p_zone_code?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_from: string
              p_level_code?: string
              p_object_name?: string
              p_system_code?: string
              p_to: string
              p_zone_code?: string
            }
            Returns: Json
          }
      rpc_wh_report_issued_by_req_context_v2: {
        Args: {
          p_from: string
          p_level_code: string
          p_object_name: string
          p_system_code: string
          p_to: string
          p_zone_code: string
        }
        Returns: Json
      }
      rpc_wh_report_issued_materials_by_issues_v1: {
        Args: { p_issue_ids: number[] }
        Returns: {
          issues_cnt: number
          items_cnt: number
          name_human: string
          qty_sum: number
          rik_code: string
          uom: string
        }[]
      }
      rpc_wh_report_issued_materials_context_v1:
        | {
            Args: { p_from: string; p_object_name?: string; p_to: string }
            Returns: {
              issues_cnt: number
              items_cnt: number
              name_human: string
              qty_sum: number
              rik_code: string
              uom: string
            }[]
          }
        | {
            Args: { params: Json }
            Returns: {
              issues_cnt: number
              items_cnt: number
              name_human: string
              qty_sum: number
              rik_code: string
              uom: string
            }[]
          }
      rpc_wh_report_issued_materials_context_v2: {
        Args: {
          p_from: string
          p_level_code?: string
          p_object_name?: string
          p_system_code?: string
          p_to: string
          p_zone_code?: string
        }
        Returns: {
          issues_cnt: number
          items_cnt: number
          name_human: string
          qty_sum: number
          rik_code: string
          uom: string
        }[]
      }
      rpc_wh_report_issued_materials_context_v3: {
        Args: {
          p_from: string
          p_level_h?: string
          p_object_name?: string
          p_system_h?: string
          p_to: string
          p_zone_h?: string
        }
        Returns: {
          issues_cnt: number
          items_cnt: number
          name_human: string
          qty_sum: number
          rik_code: string
          uom: string
        }[]
      }
      rpc_wh_report_req_context_options: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      rpc_work_type_wow: { Args: { p_work_type_code: string }; Returns: Json }
      ru_display_generic: {
        Args: { p_code: string; p_name_human: string; p_name_human_ru: string }
        Returns: string
      }
      ru_display_name: {
        Args: { p_code: string; p_name_human: string; p_name_human_ru: string }
        Returns: string
      }
      ru_pack_note: { Args: { p: string }; Returns: string }
      ru_section: { Args: { p: string }; Returns: string }
      ru_uom: { Args: { p: string }; Returns: string }
      search_catalog: {
        Args: { lim?: number; q: string }
        Returns: {
          group_code: string
          kind: string
          name_ru: string
          rik_code: string
          uom_code: string
        }[]
      }
      send_request_to_director: {
        Args: { p_request_id: number }
        Returns: {
          inserted_count: number
        }[]
      }
      set_my_role_accountant: { Args: never; Returns: undefined }
      set_role_for:
        | { Args: { p_email: string; p_role: string }; Returns: undefined }
        | { Args: { p_role: string; p_uid: string }; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      similarity_opt: { Args: { a: string; b: string }; Returns: number }
      split_proposal_by_supplier: {
        Args: { p_proposal_id: string }
        Returns: Json
      }
      subcontract_create_draft: {
        Args: {
          p_contract_date?: string
          p_contract_number?: string
          p_contractor_org?: string
          p_contractor_phone?: string
          p_contractor_rep?: string
          p_created_by: string
          p_date_end?: string
          p_date_start?: string
          p_foreman_comment?: string
          p_foreman_name?: string
          p_object_name?: string
          p_price_per_unit?: number
          p_price_type?: string
          p_qty_planned?: number
          p_total_price?: number
          p_uom?: string
          p_work_mode?: string
          p_work_type?: string
          p_work_zone?: string
        }
        Returns: Json
      }
      submit_jobs_claim: {
        Args: { p_limit: number; p_worker: string }
        Returns: {
          client_request_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_key: string | null
          entity_type: string | null
          error: string | null
          id: string
          job_type: string
          locked_until: string | null
          next_retry_at: string | null
          payload: Json
          processed_at: string | null
          retry_count: number
          started_at: string | null
          status: string
          worker_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "submit_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      submit_jobs_mark_completed: { Args: { p_id: string }; Returns: undefined }
      submit_jobs_mark_failed: {
        Args: { p_error: string; p_id: string }
        Returns: undefined
      }
      submit_jobs_metrics: {
        Args: never
        Returns: {
          failed: number
          oldest_pending: string
          pending: number
          processing: number
        }[]
      }
      submit_jobs_recover_stuck: { Args: never; Returns: number }
      suppliers_list:
        | {
            Args: { p_limit?: number; p_offset?: number; p_q?: string }
            Returns: {
              address: string
              contact_name: string
              created_at: string
              email: string
              id: string
              inn: string
              name: string
              notes: string
              phone: string
              specialization: string
              website: string
            }[]
          }
        | {
            Args: { p_search?: string }
            Returns: {
              comment: string
              id: string
              name: string
              phone: string
            }[]
          }
      sync_request_status: {
        Args: { p_request_id: number }
        Returns: undefined
      }
      synonyms_expand: { Args: { q: string }; Returns: string[] }
      synonyms_lite: { Args: { q: string }; Returns: string[] }
      tender_award_prepare: {
        Args: { p_offer_id: string; p_tender_id: string }
        Returns: Json
      }
      tender_create_from_request_items: {
        Args: {
          p_city?: string
          p_deadline_at: string
          p_lat?: number
          p_lng?: number
          p_mode: string
          p_radius_km?: number
          p_request_item_ids: string[]
          p_visibility?: string
        }
        Returns: string
      }
      tender_publish: { Args: { p_tender_id: string }; Returns: undefined }
      tender_set_location: {
        Args: {
          p_activate?: boolean
          p_city: string
          p_lat: number
          p_lng: number
          p_tender_id: string
        }
        Returns: undefined
      }
      tender_submit_offer: {
        Args: {
          p_comment?: string
          p_delivery_days?: number
          p_items?: Json
          p_tender_id: string
        }
        Returns: string
      }
      token_ru_lookup: { Args: { p: string }; Returns: string }
      unaccent: { Args: { input: string }; Returns: string }
      unaccent_imm: { Args: { s: string }; Returns: string }
      upsert_catalog_alias_canon: {
        Args: { p_canon_code: string; p_source_code: string }
        Returns: undefined
      }
      upsert_catalog_item_canon: {
        Args: { p_code: string; p_name: string }
        Returns: undefined
      }
      upsert_my_requisites: {
        Args: {
          p_account: string
          p_address: string
          p_bank_name: string
          p_bik: string
          p_company_name: string
          p_corr_account: string
          p_email: string
          p_inn: string
          p_kpp: string
          p_phone: string
        }
        Returns: string
      }
      upsert_rik_item: {
        Args: {
          p_group: string
          p_kind: string
          p_name: string
          p_rik_code: string
          p_sector: string
          p_spec: string
          p_uom: string
        }
        Returns: undefined
      }
      user_display_name: { Args: { p_uid: string }; Returns: string }
      warehouse_balances_source: {
        Args: never
        Returns: {
          code: string
          qty_on_hand: number
          qty_reserved: number
          uom_id: string
          updated_at: string
        }[]
      }
      warehouse_expected: {
        Args: never
        Returns: {
          name_human: string
          purchase_id: string
          purchase_item_id: string
          qty_left: number
          qty_po: number
          qty_received: number
          uom: string
        }[]
      }
      warehouse_finish: { Args: { p_id: string }; Returns: undefined }
      warehouse_issue_post: {
        Args: {
          p_issue_id: number
          p_qty: number
          p_rik_code: string
          p_uom_id: string
        }
        Returns: undefined
      }
      warehouse_list_stock: {
        Args: never
        Returns: {
          available: number
          material_id: string
          name_human: string
          object_name: string
          on_hand: number
          reserved: number
          rik_code: string
          uom: string
          updated_at: string
          warehouse_name: string
        }[]
      }
      warehouse_receipt_confirm: {
        Args: { p_purchase_id: string }
        Returns: number
      }
      warehouse_receipt_confirm_all: {
        Args: { p_purchase_id: string }
        Returns: number
      }
      warehouse_receipt_confirm_by_items: {
        Args: { p_purchase_id: string }
        Returns: undefined
      }
      warehouse_receive_all: {
        Args: { p_purchase_id: string }
        Returns: number
      }
      warehouse_receive_confirm:
        | {
            Args: { p_purchase_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.warehouse_receive_confirm(p_purchase_id => text), public.warehouse_receive_confirm(p_purchase_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { p_purchase_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.warehouse_receive_confirm(p_purchase_id => text), public.warehouse_receive_confirm(p_purchase_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      warehouse_start: { Args: { p_id: string }; Returns: undefined }
      west_add_item_min:
        | {
            Args: {
              p_apply: string
              p_code: string
              p_note: string
              p_qty: number
              p_request_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_apply: string
              p_code: string
              p_name_override: string
              p_note: string
              p_qty: number
              p_request_id: string
              p_uom: string
            }
            Returns: undefined
          }
      wh_get_ledger_balance_definer: {
        Args: { p_code: string }
        Returns: {
          code: string
          qty_available: number
          uom_id: string
        }[]
      }
      wh_get_ledger_balance_definer_v2: {
        Args: { p_code: string }
        Returns: {
          out_code: string
          out_qty_available: number
          out_uom_id: string
        }[]
      }
      wh_incoming_commit: {
        Args: { p_incoming_id: string; p_object_id: string }
        Returns: undefined
      }
      wh_incoming_commit_ledger: {
        Args: { p_incoming_id: string; p_object_id: string }
        Returns: undefined
      }
      wh_incoming_ensure_from_purchase: {
        Args: { p_purchase_id: string }
        Returns: string
      }
      wh_incoming_ensure_items: {
        Args: { p_incoming_id: string }
        Returns: number
      }
      wh_incoming_fill_items_from_purchase: {
        Args: { p_incoming_id: string; p_proposal_id: string }
        Returns: number
      }
      wh_incoming_seed_from_purchase: {
        Args: { p_purchase_id: string }
        Returns: string
      }
      wh_issue_free_atomic_v1: {
        Args: {
          p_lines: Json
          p_note: string
          p_object_name: string
          p_who: string
          p_work_name: string
        }
        Returns: number
      }
      wh_issue_free_atomic_v2: {
        Args: {
          p_lines: Json
          p_note: string
          p_object_name: string
          p_who: string
          p_work_name: string
        }
        Returns: number
      }
      wh_issue_free_atomic_v3: {
        Args: {
          p_lines: Json
          p_note: string
          p_object_name: string
          p_who: string
          p_work_name: string
        }
        Returns: number
      }
      wh_issue_free_atomic_v4: {
        Args: {
          p_lines: Json
          p_note: string
          p_object_name: string
          p_who: string
          p_work_name: string
        }
        Returns: number
      }
      warehouse_issue_queue_scope_v1: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: Json
      }
      warehouse_issue_queue_scope_v2: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: Json
      }
      warehouse_issue_queue_scope_v3: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: Json
      }
      warehouse_issue_queue_scope_v4: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: Json
      }
      wh_move_from_incoming_item: {
        Args: { p_delta: number; p_incoming_item_id: string }
        Returns: undefined
      }
      wh_recalc_incoming: {
        Args: { p_incoming_id: string }
        Returns: undefined
      }
      wh_receive_apply_ui: {
        Args: {
          p_incoming_id: string
          p_items: Json
          p_note?: string
          p_warehouseman_fio?: string
        }
        Returns: Json
      }
      wh_receive_apply_ui_test: {
        Args: { p_incoming_id: string; p_items: Json; p_note?: string }
        Returns: Json
      }
      wh_receive_confirm: { Args: { p_wh_id: string }; Returns: undefined }
      wh_receive_item: {
        Args: { p_incoming_item_id: string; p_note?: string; p_qty: number }
        Returns: {
          incoming_id: string
          incoming_item_id: string
          purchase_id: string
          qty_expected: number
          qty_left: number
          qty_received: number
          rik_code: string
          uom: string
        }[]
      }
      wh_receive_item_core: {
        Args: { p_incoming_item_id: string; p_qty: number }
        Returns: {
          created_at: string
          id: string
          incoming_id: string
          name_human: string | null
          note: string | null
          purchase_item_id: string | null
          qty_expected: number
          qty_received: number
          rik_code: string | null
          uom: string | null
        }
        SetofOptions: {
          from: "*"
          to: "wh_incoming_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      wh_receive_item_v2: {
        Args: { p_incoming_item_id: string; p_note?: string; p_qty: number }
        Returns: {
          incoming_status: string
          ok: boolean
          qty_left: number
          qty_taken: number
        }[]
      }
      wh_receive_test: { Args: { p_purchase_id: string }; Returns: undefined }
      wh_report_issued_by_object_fast: {
        Args: { p_from: string; p_object_id?: string; p_to: string }
        Returns: {
          active_days: number
          docs_cnt: number
          object_id: string
          object_name: string
          recipients_text: string
          req_cnt: number
          top3_materials: string
          uniq_materials: number
          work_name: string
        }[]
      }
      wh_report_issued_by_object_work: {
        Args: { p_from: string; p_object_id?: string; p_to: string }
        Returns: {
          docs_cnt: number
          docs_with_over_cnt: number
          lines_cnt: number
          object_id: string
          object_name: string
          work_name: string
        }[]
      }
      wh_report_issued_materials: {
        Args: { p_from: string; p_object_id?: string; p_to: string }
        Returns: {
          docs_cnt: number
          lines_cnt: number
          material_code: string
          material_name: string
          sum_free: number
          sum_in_req: number
          sum_over: number
          sum_total: number
          uom: string
        }[]
      }
      wh_report_issued_materials_fast: {
        Args: { p_from: string; p_object_id: string; p_to: string }
        Returns: {
          docs_cnt: number
          lines_cnt: number
          material_code: string
          material_name: string
          sum_free: number
          sum_in_req: number
          sum_over: number
          sum_total: number
          uom: string
        }[]
      }
      wh_report_issued_summary_fast: {
        Args: { p_from: string; p_object_id: string; p_to: string }
        Returns: {
          docs_free: number
          docs_in_req: number
          docs_total: number
          lines_free: number
          lines_in_req: number
          lines_total: number
        }[]
      }
      wipe_operational_data: { Args: never; Returns: undefined }
      wipe_operational_data_for: {
        Args: { uid_in?: string }
        Returns: undefined
      }
      wipe_purchase_orders_auto: { Args: never; Returns: undefined }
      wipe_requests: {
        Args: {
          p_created_after?: string
          p_only_tmp?: boolean
          p_with_downstream?: boolean
        }
        Returns: {
          removed_items: number
          removed_requests: number
        }[]
      }
      work_add_progress:
        | { Args: { p_progress_id: string; p_qty: number }; Returns: undefined }
        | {
            Args: {
              p_location?: string
              p_materials?: Json
              p_note?: string
              p_progress_id: string
              p_qty: number
              p_stage_note?: string
              p_with_stock?: boolean
              p_work_uom?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_location?: string
              p_materials?: Json
              p_note?: string
              p_progress_id: string
              p_qty: number
              p_stage_note?: string
              p_with_stock?: boolean
              p_work_dt?: string
              p_work_uom?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_materials?: Json
              p_note?: string
              p_progress_id: string
              p_stage_note?: string
              p_with_stock?: boolean
              p_work_qty: number
              p_work_uom?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_executor_id?: string
              p_materials?: Json
              p_note?: string
              p_progress_id: string
              p_stage_code?: string
              p_stage_note?: string
              p_team_id?: string
              p_with_stock?: boolean
              p_work_dt?: string
              p_work_qty: number
              p_work_uom: string
            }
            Returns: undefined
          }
      work_finish: { Args: { p_progress_id: string }; Returns: undefined }
      work_log_materials: {
        Args: { p_log_id: string }
        Returns: {
          mat_code: string
          qty_fact: number
          uom_mat: string
        }[]
      }
      work_progress_apply_ui: {
        Args: {
          p_location: string
          p_materials: Json
          p_note: string
          p_progress_id: string
          p_qty: number
          p_stage_note: string
          p_with_stock: boolean
          p_work_uom: string
        }
        Returns: undefined
      }
      work_seed_defaults_auto: {
        Args: { p_work_code: string; p_work_name?: string }
        Returns: undefined
      }
      work_seed_from_purchase: {
        Args: { p_purchase_id: string }
        Returns: undefined
      }
      work_start: { Args: { p_progress_id: string }; Returns: undefined }
      work_type_bases: {
        Args: { p_work_type_code: string }
        Returns: {
          basis: string
          rows: number
        }[]
      }
    }
    Enums: {
      app_role: "director" | "foreman" | "buyer" | "accountant" | "warehouse"
      approval_status: "pending" | "approved" | "rejected" | "canceled"
      po_status:
        | "╨з╨╡╤А╨╜╨╛╨▓╨╕╨║"
        | "╨Э╨░ ╤Г╤В╨▓╨╡╤А╨╢╨┤╨╡╨╜╨╕╨╕"
        | "╨г╤В╨▓╨╡╤А╨╢╨┤╨╡╨╜╨╛"
        | "╨Ю╤В╨║╨╗╨╛╨╜╨╡╨╜╨╛"
        | "╨Ю╨┐╨╗╨░╤З╨╡╨╜╨╛"
      reno_basis:
        | "area_m2"
        | "perimeter_m"
        | "room_area_m2"
        | "count"
        | "volume_m3"
        | "length_m"
        | "weight_ton"
        | "surface_m2"
        | "point"
        | "set"
        | "time_hour"
        | "time_day"
        | "area_floor_m2"
        | "area_wall_m2"
        | "area_ceiling_m2"
        | "doors_count"
        | "points"
        | "height_m"
        | "points_socket"
        | "points_light"
        | "points_panel"
        | "points_low"
        | "points_cw"
        | "points_hw"
        | "points_sw"
        | "extra_points"
        | "pipe_length_m"
        | "base_mix_mass_t"
        | "finish_mix_mass_t"
        | "points_outlet"
        | "points_switch"
        | "points_wc"
        | "points_sink"
        | "points_shower"
        | "points_wm"
        | "formwork_m2"
        | "rebar_kg"
        | "mesh_m2"
        | "film_m2"
        | "pump_m3"
        | "excavation_m3"
        | "backfill_m3"
        | "waterproof_m2"
        | "subconcrete_m3"
        | "subbase_m3"
        | "openings_pm"
      reno_round_rule:
        | "no_round"
        | "round_0"
        | "round_0_1"
        | "round_0_5"
        | "round_1"
        | "ceil_0"
        | "floor_0"
      reno_section: "materials" | "works" | "tools" | "services"
      reno_segment: "residential" | "commercial" | "industrial"
      req_status:
        | "Черновик"
        | "На утверждении"
        | "Утверждено"
        | "Отклонено"
        | "На закупке"
      request_status_enum:
        | "Черновик"
        | "На утверждении"
        | "Утверждено"
        | "Отклонено"
        | "В работе склада"
        | "Готово"
        | "Закрыт"
        | "Удалён"
        | "pending"
        | "На доработке"
        | "Утверждена"
        | "К закупке"
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
      app_role: ["director", "foreman", "buyer", "accountant", "warehouse"],
      approval_status: ["pending", "approved", "rejected", "canceled"],
      po_status: [
        "╨з╨╡╤А╨╜╨╛╨▓╨╕╨║",
        "╨Э╨░ ╤Г╤В╨▓╨╡╤А╨╢╨┤╨╡╨╜╨╕╨╕",
        "╨г╤В╨▓╨╡╤А╨╢╨┤╨╡╨╜╨╛",
        "╨Ю╤В╨║╨╗╨╛╨╜╨╡╨╜╨╛",
        "╨Ю╨┐╨╗╨░╤З╨╡╨╜╨╛",
      ],
      reno_basis: [
        "area_m2",
        "perimeter_m",
        "room_area_m2",
        "count",
        "volume_m3",
        "length_m",
        "weight_ton",
        "surface_m2",
        "point",
        "set",
        "time_hour",
        "time_day",
        "area_floor_m2",
        "area_wall_m2",
        "area_ceiling_m2",
        "doors_count",
        "points",
        "height_m",
        "points_socket",
        "points_light",
        "points_panel",
        "points_low",
        "points_cw",
        "points_hw",
        "points_sw",
        "extra_points",
        "pipe_length_m",
        "base_mix_mass_t",
        "finish_mix_mass_t",
        "points_outlet",
        "points_switch",
        "points_wc",
        "points_sink",
        "points_shower",
        "points_wm",
        "formwork_m2",
        "rebar_kg",
        "mesh_m2",
        "film_m2",
        "pump_m3",
        "excavation_m3",
        "backfill_m3",
        "waterproof_m2",
        "subconcrete_m3",
        "subbase_m3",
        "openings_pm",
      ],
      reno_round_rule: [
        "no_round",
        "round_0",
        "round_0_1",
        "round_0_5",
        "round_1",
        "ceil_0",
        "floor_0",
      ],
      reno_section: ["materials", "works", "tools", "services"],
      reno_segment: ["residential", "commercial", "industrial"],
      req_status: [
        "Черновик",
        "На утверждении",
        "Утверждено",
        "Отклонено",
        "На закупке",
      ],
      request_status_enum: [
        "Черновик",
        "На утверждении",
        "Утверждено",
        "Отклонено",
        "В работе склада",
        "Готово",
        "Закрыт",
        "Удалён",
        "pending",
        "На доработке",
        "Утверждена",
        "К закупке",
      ],
    },
  },
} as const
