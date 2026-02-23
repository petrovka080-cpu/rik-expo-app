// src/types.ts

export type ReqItemRow = {
    // common
    qty?: number;
    uom?: string | null;
    status?: string | null;
    app_code?: string | null;
    note?: string | null;

    // catalog_api & rik_api specific
    id?: string;
    request_id?: string | number;
    name_human?: string;
    supplier_hint?: string | null;
    rik_code?: string | null;
    line_no?: number | null;

    // warehouse specific
    request_item_id?: string;
    material_code?: string;
    material_name?: string;
    qty_expected?: number;
    qty_received?: number;
    qty_over?: number;
    category?: string;
    zone_name?: string;
    system_name?: string;
    level_name?: string;
};

export type Supplier = {
    id: string;
    name: string;

    // naming variations for tax IDs
    inn?: string | null;
    bin_iin?: string | null;

    phone?: string | null;
    email?: string | null;
    website?: string | null;
    address?: string | null;

    // extra metadata
    type?: string;
    specialization?: string | null;
    bank_account?: string | null;
    contact_name?: string | null;
    notes?: string | null;
    requisites?: string | null;
    comment?: string | null;
    files_meta?: any;
};
