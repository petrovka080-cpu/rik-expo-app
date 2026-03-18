// src/lib/api/types.ts
// Extracted from rik_api.ts - All shared type definitions

export type CatalogItem = {
    rik_code: string;
    name_human?: string | null;
    name?: string | null;
    uom_code?: string | null;
    sector_code?: string | null;
    spec?: string | null;
    kind?: string | null;
    apps?: string[] | null;
};

export type ReqItemRow = {
    id: string;
    request_id: number | string;
    name_human: string;
    qty: number;
    uom?: string | null;
    status?: string | null;
    supplier_hint?: string | null;
    app_code?: string | null;
    note?: string | null;
};

export type RequestMeta = {
    foreman_name?: string | null;
    need_by?: string | null;
    comment?: string | null;
    object_type_code?: string | null;
    level_code?: string | null;
    system_code?: string | null;
    zone_code?: string | null;
};

export type RequestRecord = {
    id: string;
    status?: string | null;
    display_no?: string | null;
    year?: number | null;
    seq?: number | null;
    foreman_name?: string | null;
    need_by?: string | null;
    comment?: string | null;
    object_id?: string | null;
    object_type_code?: string | null;
    level_code?: string | null;
    system_code?: string | null;
    zone_code?: string | null;
    created_at?: string | null;
};

export type DirectorPendingRow = {
    id: number;
    request_id: number;
    request_item_id: string;
    name_human: string;
    qty: number;
    uom?: string | null;
};

export type BuyerInboxRow = {
    request_id: string;
    request_id_old?: number | null;
    request_item_id: string;
    rik_code: string | null;
    name_human: string;
    qty: string | number;
    uom?: string | null;
    app_code?: string | null;
    note?: string | null;
    object_name?: string | null;
    level_name?: string | null;
    zone_name?: string | null;
    system_code?: string | null;
    foreman_name?: string | null;
    status: string;
    created_at?: string;
    kind?: string | null;
};

export type ProposalSummary = {
    id: number;
    status: 'На утверждении' | 'Утверждено' | 'Отклонено' | string;
    submitted_at?: string | null;
    decided_at?: string | null;
    reason?: string | null;
};

export type ProposalItem = {
    id: number;
    rik_code: string | null;
    name_human: string;
    uom: string | null;
    app_code: string | null;
    total_qty: number;
};

export type AccountantInboxRow = {
    proposal_id: string;
    supplier?: string | null;
    invoice_number?: string | null;
    invoice_date?: string | null;
    invoice_amount?: number | null;
    invoice_currency?: string | null;
    payment_status?: string | null;
    total_paid?: number | null;
    sent_to_accountant_at?: string | null;
    has_invoice?: boolean | null;
    payments_count?: number | null;
    request_nos?: string | null;
    object_names?: string | null;
};

export type Supplier = {
    id: string;
    name: string;
    inn?: string | null;
    bank_account?: string | null;
    specialization?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    address?: string | null;
    contact_name?: string | null;
    notes?: string | null;
};

export type UserProfile = {
    id: string; // The UUID from 'profiles' table (row ID)
    userId: string;
    role: string | null;
    companyId: string | null;
    companyName?: string | null;
    fullName: string | null;
    avatarUrl: string | null;
    phone: string | null;
    isContractor?: boolean;
};

export type DirectorInboxRow = {
    kind: 'request' | 'proposal';
    entity_id: string;
    request_id: string | null;
    supplier: string | null;
    actor_name: string | null;
    status: string;
    submitted_at: string | null;
    items_count: number | null;
};

export type ProposalItemRow = {
    id: number;
    rik_code: string | null;
    name_human: string;
    uom: string | null;
    app_code: string | null;
    total_qty: number;
    price: number | null;
    supplier: string | null;
    request_item_id: string | null;
};
