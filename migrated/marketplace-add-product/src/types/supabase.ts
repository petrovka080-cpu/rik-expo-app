export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
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
            catalog_items: {
                Row: {
                    category: string | null
                    code: string
                    created_at: string
                    id: string
                    name_kg: string | null
                    name_ru: string | null
                    parent_code: string | null
                    section: string | null
                    uom: string | null
                    updated_at: string
                }
                Insert: {
                    category?: string | null
                    code: string
                    created_at?: string
                    id?: string
                    name_kg?: string | null
                    name_ru?: string | null
                    parent_code?: string | null
                    section?: string | null
                    uom?: string | null
                    updated_at?: string
                }
                Update: {
                    category?: string | null
                    code?: string
                    created_at?: string
                    id?: string
                    name_kg?: string | null
                    name_ru?: string | null
                    parent_code?: string | null
                    section?: string | null
                    uom?: string | null
                    updated_at?: string
                }
                Relationships: []
            }
            chat_messages: {
                Row: {
                    content: string
                    created_at: string
                    id: string
                    is_read: boolean | null
                    object_id: string | null
                    recipient_id: string | null
                    sender_id: string
                    supplier_id: string | null
                }
                Insert: {
                    content: string
                    created_at?: string
                    id?: string
                    is_read?: boolean | null
                    object_id?: string | null
                    recipient_id?: string | null
                    sender_id: string
                    supplier_id?: string | null
                }
                Update: {
                    content?: string
                    created_at?: string
                    id?: string
                    is_read?: boolean | null
                    object_id?: string | null
                    recipient_id?: string | null
                    sender_id?: string
                    supplier_id?: string | null
                }
                Relationships: []
            }
            companies: {
                Row: {
                    address: string | null
                    city: string | null
                    created_at: string
                    director_id: string | null
                    id: string
                    inn: string | null
                    invite_code: string | null
                    name: string
                    phone: string | null
                    updated_at: string
                }
                Insert: {
                    address?: string | null
                    city?: string | null
                    created_at?: string
                    director_id?: string | null
                    id?: string
                    inn?: string | null
                    invite_code?: string | null
                    name: string
                    phone?: string | null
                    updated_at?: string
                }
                Update: {
                    address?: string | null
                    city?: string | null
                    created_at?: string
                    director_id?: string | null
                    id?: string
                    inn?: string | null
                    invite_code?: string | null
                    name?: string
                    phone?: string | null
                    updated_at?: string
                }
                Relationships: []
            }
            company_members: {
                Row: {
                    company_id: string
                    created_at: string
                    role: string
                    user_id: string
                }
                Insert: {
                    company_id: string
                    created_at?: string
                    role: string
                    user_id: string
                }
                Update: {
                    company_id?: string
                    created_at?: string
                    role?: string
                    user_id?: string
                }
                Relationships: []
            }
            construction_objects: {
                Row: {
                    address: string | null
                    business_id: string
                    created_at: string
                    id: string
                    lat: number | null
                    lng: number | null
                    name: string
                    status: string | null
                }
                Insert: {
                    address?: string | null
                    business_id: string
                    created_at?: string
                    id?: string
                    lat?: number | null
                    lng?: number | null
                    name: string
                    status?: string | null
                }
                Update: {
                    address?: string | null
                    business_id?: string
                    created_at?: string
                    id?: string
                    lat?: number | null
                    lng?: number | null
                    name?: string
                    status?: string | null
                }
                Relationships: []
            }
            market_listings: {
                Row: {
                    city: string | null
                    contacts_phone: string | null
                    created_at: string
                    currency: string | null
                    description: string | null
                    id: string
                    image_url: string | null
                    kind: string
                    lat: number | null
                    lng: number | null
                    price: number | null
                    side: string | null
                    status: string | null
                    title: string
                    uom: string | null
                    updated_at: string
                    user_id: string
                }
                Insert: {
                    city?: string | null
                    contacts_phone?: string | null
                    created_at?: string
                    currency?: string | null
                    description?: string | null
                    id?: string
                    image_url?: string | null
                    kind: string
                    lat?: number | null
                    lng?: number | null
                    price?: number | null
                    side?: string | null
                    status?: string | null
                    title: string
                    uom?: string | null
                    updated_at?: string
                    user_id: string
                }
                Update: {
                    city?: string | null
                    contacts_phone?: string | null
                    created_at?: string
                    currency?: string | null
                    description?: string | null
                    id?: string
                    image_url?: string | null
                    kind?: string
                    lat?: number | null
                    lng?: number | null
                    price?: number | null
                    side?: string | null
                    status?: string | null
                    title?: string
                    uom?: string | null
                    updated_at?: string
                    user_id?: string
                }
                Relationships: []
            }
            notifications: {
                Row: {
                    body: string
                    created_at: string
                    id: number
                    is_read: boolean | null
                    read_at: string | null
                    title: string
                    user_id: string
                }
                Insert: {
                    body: string
                    created_at?: string
                    id?: number
                    is_read?: boolean | null
                    read_at?: string | null
                    title: string
                    user_id: string
                }
                Update: {
                    body?: string
                    created_at?: string
                    id?: number
                    is_read?: boolean | null
                    read_at?: string | null
                    title?: string
                    user_id?: string
                }
                Relationships: []
            }
            profiles: {
                Row: {
                    avatar_url: string | null
                    company_id: string | null
                    created_at: string
                    email: string | null
                    fio: string | null
                    full_name: string | null
                    id: string
                    is_contractor: boolean | null
                    phone: string | null
                    role: string | null
                    updated_at: string
                    user_id: string
                }
                Insert: {
                    avatar_url?: string | null
                    company_id?: string | null
                    created_at?: string
                    email?: string | null
                    fio?: string | null
                    full_name?: string | null
                    id?: string
                    is_contractor?: boolean | null
                    phone?: string | null
                    role?: string | null
                    updated_at?: string
                    user_id: string
                }
                Update: {
                    avatar_url?: string | null
                    company_id?: string | null
                    created_at?: string
                    email?: string | null
                    fio?: string | null
                    full_name?: string | null
                    id?: string
                    is_contractor?: boolean | null
                    phone?: string | null
                    role?: string | null
                    updated_at?: string
                    user_id?: string
                }
                Relationships: []
            }
            proposals: {
                Row: {
                    buyer_fio: string | null
                    company_id: string | null
                    created_at: string
                    id: string
                    invoice_amount: number | null
                    status: string | null
                    submitted_at: string | null
                    supplier_name: string | null
                    total_amount: number | null
                    updated_at: string
                }
                Insert: {
                    buyer_fio?: string | null
                    company_id?: string | null
                    created_at?: string
                    id?: string
                    invoice_amount?: number | null
                    status?: string | null
                    submitted_at?: string | null
                    supplier_name?: string | null
                    total_amount?: number | null
                    updated_at?: string
                }
                Update: {
                    buyer_fio?: string | null
                    company_id?: string | null
                    created_at?: string
                    id?: string
                    invoice_amount?: number | null
                    status?: string | null
                    submitted_at?: string | null
                    supplier_name?: string | null
                    total_amount?: number | null
                    updated_at?: string
                }
                Relationships: []
            }
            proposal_items: {
                Row: {
                    created_at: string
                    id: string
                    note: string | null
                    price: number | null
                    proposal_id: string
                    qty: number | null
                    request_item_id: string | null
                    supplier_name: string | null
                    uom: string | null
                }
                Insert: {
                    created_at?: string
                    id?: string
                    note?: string | null
                    price?: number | null
                    proposal_id: string
                    qty?: number | null
                    request_item_id?: string | null
                    supplier_name?: string | null
                    uom?: string | null
                }
                Update: {
                    created_at?: string
                    id?: string
                    note?: string | null
                    price?: number | null
                    proposal_id?: string
                    qty?: number | null
                    request_item_id?: string | null
                    supplier_name?: string | null
                    uom?: string | null
                }
                Relationships: []
            }
            push_tokens: {
                Row: {
                    created_at: string
                    id: string
                    token: string
                    user_id: string
                }
                Insert: {
                    created_at?: string
                    id?: string
                    token: string
                    user_id: string
                }
                Update: {
                    created_at?: string
                    id?: string
                    token?: string
                    user_id?: string
                }
                Relationships: []
            }
            requests: {
                Row: {
                    comment: string | null
                    company_id: string | null
                    created_at: string
                    display_no: string | null
                    foreman_name: string | null
                    id: string
                    level_code: string | null
                    need_by: string | null
                    object_id: string | null
                    object_type_code: string | null
                    seq: number | null
                    status: string | null
                    submitted_at: string | null
                    submitted_by: string | null
                    system_code: string | null
                    updated_at: string
                    year: number | null
                    zone_code: string | null
                }
                Insert: {
                    comment?: string | null
                    company_id?: string | null
                    created_at?: string
                    display_no?: string | null
                    foreman_name?: string | null
                    id?: string
                    level_code?: string | null
                    need_by?: string | null
                    object_id?: string | null
                    object_type_code?: string | null
                    seq?: number | null
                    status?: string | null
                    submitted_at?: string | null
                    submitted_by?: string | null
                    system_code?: string | null
                    updated_at?: string
                    year?: number | null
                    zone_code?: string | null
                }
                Update: {
                    comment?: string | null
                    company_id?: string | null
                    created_at?: string
                    display_no?: string | null
                    foreman_name?: string | null
                    id?: string
                    level_code?: string | null
                    need_by?: string | null
                    object_id?: string | null
                    object_type_code?: string | null
                    seq?: number | null
                    status?: string | null
                    submitted_at?: string | null
                    submitted_by?: string | null
                    system_code?: string | null
                    updated_at?: string
                    year?: number | null
                    zone_code?: string | null
                }
                Relationships: []
            }
            request_items: {
                Row: {
                    app_code: string | null
                    created_at: string
                    id: string
                    kind: string | null
                    name_human: string | null
                    note: string | null
                    qty: number
                    request_id: string
                    rik_code: string | null
                    status: string | null
                    supplier_hint: string | null
                    uom: string | null
                }
                Insert: {
                    app_code?: string | null
                    created_at?: string
                    id?: string
                    kind?: string | null
                    name_human?: string | null
                    note?: string | null
                    qty: number
                    request_id: string
                    rik_code?: string | null
                    status?: string | null
                    supplier_hint?: string | null
                    uom?: string | null
                }
                Update: {
                    app_code?: string | null
                    created_at?: string
                    id?: string
                    kind?: string | null
                    name_human?: string | null
                    note?: string | null
                    qty?: number
                    request_id?: string
                    rik_code?: string | null
                    status?: string | null
                    supplier_hint?: string | null
                    uom?: string | null
                }
                Relationships: []
            }
            suppliers: {
                Row: {
                    categories: string[] | null
                    city: string | null
                    company_name: string | null
                    created_at: string
                    id: string
                    lat: number | null
                    lng: number | null
                    phone: string | null
                    user_id: string | null
                }
                Insert: {
                    categories?: string[] | null
                    city?: string | null
                    company_name?: string | null
                    created_at?: string
                    id?: string
                    lat?: number | null
                    lng?: number | null
                    phone?: string | null
                    user_id?: string | null
                }
                Update: {
                    categories?: string[] | null
                    city?: string | null
                    company_name?: string | null
                    created_at?: string
                    id?: string
                    lat?: number | null
                    lng?: number | null
                    phone?: string | null
                    user_id?: string | null
                }
                Relationships: []
            }
            warehouse_stock: {
                Row: {
                    company_id: string | null
                    created_at: string
                    id: string
                    item_name: string
                    qty: number
                    rik_code: string | null
                    uom: string | null
                    updated_at: string
                }
                Insert: {
                    company_id?: string | null
                    created_at?: string
                    id?: string
                    item_name: string
                    qty?: number
                    rik_code?: string | null
                    uom?: string | null
                    updated_at?: string
                }
                Update: {
                    company_id?: string | null
                    created_at?: string
                    id?: string
                    item_name?: string
                    qty?: number
                    rik_code?: string | null
                    uom?: string | null
                    updated_at?: string
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

// ============= Helper Types =============
type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type InsertDto<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert']
export type UpdateDto<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update']

// ============= Convenient Aliases =============
export type Profile = Tables<'profiles'>
export type Company = Tables<'companies'>
export type Request = Tables<'requests'>
export type RequestItem = Tables<'request_items'>
export type Proposal = Tables<'proposals'>
export type ProposalItem = Tables<'proposal_items'>
export type MarketListing = Tables<'market_listings'>
export type Notification = Tables<'notifications'>
export type ChatMessage = Tables<'chat_messages'>
export type Supplier = Tables<'suppliers'>
export type ConstructionObject = Tables<'construction_objects'>
export type CatalogItem = Tables<'catalog_items'>
export type WarehouseStock = Tables<'warehouse_stock'>
