import type { AiToolJsonObjectSchema } from "../tools/aiToolTypes";

const evidenceRefSchema = {
  type: "string",
  description: "Redacted evidence reference, never raw row data.",
  minLength: 1,
} satisfies AiToolJsonObjectSchema["properties"][string];

const draftRequestItemSchema = {
  type: "object",
  required: [],
  additionalProperties: false,
  properties: {
    material_id: {
      type: "string",
      minLength: 1,
    },
    material_code: {
      type: "string",
      minLength: 1,
    },
    name: {
      type: "string",
      minLength: 1,
    },
    quantity: {
      type: "number",
      minimum: 0,
    },
    unit: {
      type: "string",
      minLength: 1,
    },
    notes: {
      type: "string",
      minLength: 1,
    },
  },
} satisfies AiToolJsonObjectSchema["properties"][string];

const draftActWorkItemSchema = {
  type: "object",
  required: [],
  additionalProperties: false,
  properties: {
    name: {
      type: "string",
      minLength: 1,
    },
    quantity: {
      type: "number",
      minimum: 0,
    },
    unit: {
      type: "string",
      minLength: 1,
    },
    notes: {
      type: "string",
      minLength: 1,
    },
  },
} satisfies AiToolJsonObjectSchema["properties"][string];

export const searchCatalogInputSchema: AiToolJsonObjectSchema = {
  type: "object",
  required: ["query"],
  additionalProperties: false,
  properties: {
    query: {
      type: "string",
      minLength: 1,
      description: "Catalog search text.",
    },
    limit: {
      type: "number",
      minimum: 1,
      maximum: 20,
    },
    category: {
      type: "string",
      enum: ["all", "material", "work", "service"],
    },
    location: {
      type: "string",
      minLength: 1,
    },
    cursor: {
      type: "string",
      minLength: 1,
    },
  },
};

export const searchCatalogOutputSchema: AiToolJsonObjectSchema = {
  type: "object",
  required: ["items", "summary", "next_cursor", "evidence_refs"],
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        required: ["catalog_item_id", "name", "unit", "evidence_ref"],
        additionalProperties: false,
        properties: {
          catalog_item_id: { type: "string", minLength: 1 },
          name: { type: "string", minLength: 1 },
          unit: { type: "string", minLength: 1 },
          category: { type: "string", minLength: 1 },
          evidence_ref: { type: "string", minLength: 1 },
        },
      },
    },
    summary: {
      type: "string",
      minLength: 1,
    },
    next_cursor: {
      type: "string",
      minLength: 1,
    },
    evidence_refs: {
      type: "array",
      items: evidenceRefSchema,
    },
    cacheStatus: {
      type: "object",
      required: ["scope", "retained", "route_count"],
      additionalProperties: false,
      properties: {
        scope: { type: "string", enum: ["marketplace.catalog.search"] },
        retained: { type: "boolean" },
        route_count: { type: "number", minimum: 1, maximum: 1 },
      },
    },
    rateLimitStatus: {
      type: "object",
      required: ["scope", "retained", "route_count"],
      additionalProperties: false,
      properties: {
        scope: { type: "string", enum: ["marketplace.catalog.search"] },
        retained: { type: "boolean" },
        route_count: { type: "number", minimum: 1, maximum: 1 },
      },
    },
  },
};

export const compareSuppliersInputSchema: AiToolJsonObjectSchema = {
  type: "object",
  required: ["material_ids"],
  additionalProperties: false,
  properties: {
    material_ids: {
      type: "array",
      minItems: 1,
      maxItems: 20,
      items: {
        type: "string",
        minLength: 1,
      },
    },
    project_id: {
      type: "string",
      minLength: 1,
    },
    location: {
      type: "string",
      minLength: 1,
    },
    limit: {
      type: "number",
      minimum: 1,
      maximum: 10,
    },
  },
};

export const compareSuppliersOutputSchema: AiToolJsonObjectSchema = {
  type: "object",
  required: [
    "supplier_cards",
    "price_range",
    "delivery_range",
    "risk_flags",
    "recommendation_summary",
    "evidence_refs",
    "next_action",
    "bounded",
    "mutation_count",
    "no_supplier_confirmation",
    "no_order_created",
    "no_rfq_sent",
    "warehouse_unchanged",
  ],
  additionalProperties: false,
  properties: {
    supplier_cards: {
      type: "array",
      items: {
        type: "object",
        required: ["supplier_id", "supplier_name", "summary", "risk_flags", "evidence_ref"],
        additionalProperties: false,
        properties: {
          supplier_id: { type: "string", minLength: 1 },
          supplier_name: { type: "string", minLength: 1 },
          summary: { type: "string", minLength: 1 },
          risk_flags: {
            type: "array",
            items: { type: "string", minLength: 1 },
          },
          evidence_ref: { type: "string", minLength: 1 },
        },
      },
    },
    price_range: {
      type: "object",
      required: ["status", "summary"],
      additionalProperties: false,
      properties: {
        status: { type: "string", enum: ["not_available_in_safe_read"] },
        summary: { type: "string", minLength: 1 },
      },
    },
    delivery_range: {
      type: "object",
      required: ["status", "summary"],
      additionalProperties: false,
      properties: {
        status: { type: "string", enum: ["not_available_in_safe_read"] },
        summary: { type: "string", minLength: 1 },
      },
    },
    risk_flags: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
    recommendation_summary: {
      type: "string",
      minLength: 1,
    },
    evidence_refs: {
      type: "array",
      items: evidenceRefSchema,
    },
    next_action: { type: "string", enum: ["draft_request"] },
    bounded: { type: "boolean" },
    mutation_count: { type: "number", minimum: 0, maximum: 0 },
    no_supplier_confirmation: { type: "boolean" },
    no_order_created: { type: "boolean" },
    no_rfq_sent: { type: "boolean" },
    warehouse_unchanged: { type: "boolean" },
  },
};

export const getWarehouseStatusInputSchema: AiToolJsonObjectSchema = {
  type: "object",
  required: [],
  additionalProperties: false,
  properties: {
    material_id: { type: "string", minLength: 1 },
    material_code: { type: "string", minLength: 1 },
    project_id: { type: "string", minLength: 1 },
    warehouse_name: { type: "string", minLength: 1 },
    object_name: { type: "string", minLength: 1 },
    limit: { type: "number", minimum: 1, maximum: 20 },
    cursor: { type: "string", minLength: 1 },
  },
};

const warehouseStatusQuantityBucketSchema = {
  type: "object",
  required: ["total_quantity", "item_count", "status", "evidence_refs"],
  additionalProperties: false,
  properties: {
    total_quantity: { type: "number", minimum: 0 },
    item_count: { type: "number", minimum: 0 },
    status: {
      type: "string",
      enum: ["reported", "not_available_in_stock_scope", "role_redacted"],
    },
    evidence_refs: {
      type: "array",
      items: evidenceRefSchema,
    },
  },
} satisfies AiToolJsonObjectSchema["properties"][string];

export const getWarehouseStatusOutputSchema: AiToolJsonObjectSchema = {
  type: "object",
  required: [
    "available",
    "reserved",
    "incoming",
    "low_stock_flags",
    "movement_summary",
    "source_timestamp",
    "evidence_refs",
    "next_cursor",
    "role_scope",
    "role_scoped",
    "bounded",
    "route_operation",
    "mutation_count",
    "stock_mutation",
    "no_stock_mutation",
  ],
  additionalProperties: false,
  properties: {
    available: warehouseStatusQuantityBucketSchema,
    reserved: warehouseStatusQuantityBucketSchema,
    incoming: warehouseStatusQuantityBucketSchema,
    low_stock_flags: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
    movement_summary: {
      type: "object",
      required: [
        "summary",
        "item_count",
        "scope",
        "available_total",
        "reserved_total",
        "incoming_total",
      ],
      additionalProperties: false,
      properties: {
        summary: { type: "string", minLength: 1 },
        item_count: { type: "number", minimum: 0 },
        scope: {
          type: "string",
          enum: [
            "full_access",
            "warehouse_access",
            "foreman_project_material_scope",
            "buyer_procurement_availability_scope",
          ],
        },
        available_total: { type: "number", minimum: 0 },
        reserved_total: { type: "number", minimum: 0 },
        incoming_total: { type: "number", minimum: 0 },
      },
    },
    source_timestamp: { type: "string", minLength: 1 },
    evidence_refs: {
      type: "array",
      items: evidenceRefSchema,
    },
    next_cursor: {
      type: "string",
      minLength: 1,
    },
    role_scope: {
      type: "string",
      enum: [
        "full_access",
        "warehouse_access",
        "foreman_project_material_scope",
        "buyer_procurement_availability_scope",
      ],
    },
    role_scoped: { type: "boolean" },
    bounded: { type: "boolean" },
    route_operation: { type: "string", enum: ["warehouse.api.stock.scope"] },
    mutation_count: {
      type: "number",
      minimum: 0,
      maximum: 0,
    },
    stock_mutation: {
      type: "number",
      minimum: 0,
      maximum: 0,
    },
    no_stock_mutation: { type: "boolean" },
  },
};

export const getFinanceSummaryInputSchema: AiToolJsonObjectSchema = {
  type: "object",
  required: ["scope"],
  additionalProperties: false,
  properties: {
    scope: {
      type: "string",
      enum: ["company", "project", "supplier"],
    },
    entityId: {
      type: "string",
      minLength: 1,
    },
    periodStart: {
      type: "string",
      minLength: 10,
    },
    periodEnd: {
      type: "string",
      minLength: 10,
    },
  },
};

const financeSummaryTotalsSchema = {
  type: "object",
  required: ["payable", "paid", "debt", "overdue", "currency"],
  additionalProperties: false,
  properties: {
    payable: { type: "number", minimum: 0 },
    paid: { type: "number", minimum: 0 },
    debt: { type: "number", minimum: 0 },
    overdue: { type: "number", minimum: 0 },
    currency: { type: "string", enum: ["KGS"] },
  },
} satisfies AiToolJsonObjectSchema["properties"][string];

const financeSummaryDebtBucketsSchema = {
  type: "object",
  required: ["current", "overdue", "critical"],
  additionalProperties: false,
  properties: {
    current: { type: "number", minimum: 0 },
    overdue: { type: "number", minimum: 0 },
    critical: { type: "number", minimum: 0 },
  },
} satisfies AiToolJsonObjectSchema["properties"][string];

export const getFinanceSummaryOutputSchema: AiToolJsonObjectSchema = {
  type: "object",
  required: [
    "totals",
    "debt_buckets",
    "overdue_count",
    "document_gaps",
    "risk_flags",
    "redacted_breakdown",
    "evidence_refs",
    "route_operation",
    "bounded",
    "mutation_count",
    "payment_mutation",
    "status_mutation",
    "raw_finance_rows_exposed",
  ],
  additionalProperties: false,
  properties: {
    totals: financeSummaryTotalsSchema,
    debt_buckets: financeSummaryDebtBucketsSchema,
    overdue_count: { type: "number", minimum: 0 },
    document_gaps: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
    risk_flags: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
    redacted_breakdown: {
      type: "object",
      required: [
        "scope",
        "supplier_count",
        "document_count",
        "supplier_names_redacted",
        "bank_details_redacted",
        "tokens_redacted",
        "raw_rows_exposed",
      ],
      additionalProperties: false,
      properties: {
        scope: { type: "string", enum: ["company", "project", "supplier"] },
        supplier_count: { type: "number", minimum: 0 },
        document_count: { type: "number", minimum: 0 },
        supplier_names_redacted: { type: "boolean" },
        bank_details_redacted: { type: "boolean" },
        tokens_redacted: { type: "boolean" },
        raw_rows_exposed: { type: "boolean" },
      },
    },
    evidence_refs: { type: "array", items: evidenceRefSchema },
    route_operation: { type: "string", enum: ["director.finance.rpc.scope"] },
    bounded: { type: "boolean" },
    mutation_count: { type: "number", minimum: 0, maximum: 0 },
    payment_mutation: { type: "number", minimum: 0, maximum: 0 },
    status_mutation: { type: "number", minimum: 0, maximum: 0 },
    raw_finance_rows_exposed: { type: "boolean" },
  },
};

export const draftRequestInputSchema: AiToolJsonObjectSchema = {
  type: "object",
  required: ["project_id", "items"],
  additionalProperties: false,
  properties: {
    project_id: { type: "string", minLength: 1 },
    items: {
      type: "array",
      minItems: 1,
      maxItems: 50,
      items: draftRequestItemSchema,
    },
    preferred_supplier_id: {
      type: "string",
      minLength: 1,
    },
    delivery_window: {
      type: "string",
      minLength: 1,
    },
    notes: {
      type: "string",
      minLength: 1,
    },
  },
};

export const draftRequestOutputSchema: AiToolJsonObjectSchema = {
  type: "object",
  required: [
    "draft_preview",
    "items_normalized",
    "missing_fields",
    "risk_flags",
    "requires_approval",
    "next_action",
    "evidence_refs",
    "risk_level",
    "bounded",
    "persisted",
    "idempotency_required_if_persisted",
    "mutation_count",
    "final_submit",
    "supplier_confirmation",
    "order_created",
    "warehouse_mutation",
  ],
  additionalProperties: false,
  properties: {
    draft_preview: { type: "string", minLength: 1 },
    items_normalized: {
      type: "array",
      items: {
        type: "object",
        required: [
          "line",
          "material_id",
          "material_code",
          "name",
          "quantity",
          "unit",
          "notes",
          "evidence_ref",
        ],
        additionalProperties: false,
        properties: {
          line: { type: "number", minimum: 1 },
          material_id: { type: "string" },
          material_code: { type: "string" },
          name: { type: "string" },
          quantity: { type: "number", minimum: 0 },
          unit: { type: "string" },
          notes: { type: "string" },
          evidence_ref: { type: "string", minLength: 1 },
        },
      },
    },
    missing_fields: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
    risk_flags: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
    requires_approval: { type: "boolean" },
    next_action: { type: "string", enum: ["submit_for_approval"] },
    evidence_refs: { type: "array", items: evidenceRefSchema },
    risk_level: { type: "string", enum: ["DRAFT_ONLY"] },
    bounded: { type: "boolean" },
    persisted: { type: "boolean" },
    idempotency_required_if_persisted: { type: "boolean" },
    mutation_count: { type: "number", minimum: 0, maximum: 0 },
    final_submit: { type: "number", minimum: 0, maximum: 0 },
    supplier_confirmation: { type: "number", minimum: 0, maximum: 0 },
    order_created: { type: "number", minimum: 0, maximum: 0 },
    warehouse_mutation: { type: "number", minimum: 0, maximum: 0 },
  },
};

export const draftReportInputSchema: AiToolJsonObjectSchema = {
  type: "object",
  required: ["object_id", "report_kind"],
  additionalProperties: false,
  properties: {
    object_id: { type: "string", minLength: 1 },
    report_kind: { type: "string", enum: ["daily", "materials", "progress", "finance_readonly"] },
    period_start: { type: "string", minLength: 10 },
    period_end: { type: "string", minLength: 10 },
    notes: { type: "string", minLength: 1 },
    source_evidence_refs: {
      type: "array",
      minItems: 1,
      maxItems: 20,
      items: evidenceRefSchema,
    },
  },
};

export const draftReportOutputSchema: AiToolJsonObjectSchema = {
  type: "object",
  required: [
    "draft_preview",
    "report_kind",
    "sections_normalized",
    "missing_fields",
    "risk_flags",
    "requires_approval",
    "next_action",
    "evidence_refs",
    "risk_level",
    "bounded",
    "persisted",
    "idempotency_required_if_persisted",
    "mutation_count",
    "final_submit",
    "report_published",
    "finance_mutation",
    "raw_finance_rows_exposed",
  ],
  additionalProperties: false,
  properties: {
    draft_preview: { type: "string", minLength: 1 },
    report_kind: { type: "string", enum: ["daily", "materials", "progress", "finance_readonly"] },
    sections_normalized: {
      type: "array",
      items: {
        type: "object",
        required: ["section", "title", "status", "evidence_ref"],
        additionalProperties: false,
        properties: {
          section: { type: "string", minLength: 1 },
          title: { type: "string", minLength: 1 },
          status: { type: "string", enum: ["draft_placeholder", "source_evidence_required"] },
          evidence_ref: { type: "string", minLength: 1 },
        },
      },
    },
    missing_fields: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
    risk_flags: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
    requires_approval: { type: "boolean" },
    next_action: { type: "string", enum: ["submit_for_approval"] },
    evidence_refs: { type: "array", items: evidenceRefSchema },
    risk_level: { type: "string", enum: ["DRAFT_ONLY"] },
    bounded: { type: "boolean" },
    persisted: { type: "boolean" },
    idempotency_required_if_persisted: { type: "boolean" },
    mutation_count: { type: "number", minimum: 0, maximum: 0 },
    final_submit: { type: "number", minimum: 0, maximum: 0 },
    report_published: { type: "number", minimum: 0, maximum: 0 },
    finance_mutation: { type: "number", minimum: 0, maximum: 0 },
    raw_finance_rows_exposed: { type: "boolean" },
  },
};

export const draftActInputSchema: AiToolJsonObjectSchema = {
  type: "object",
  required: ["subcontract_id", "act_kind", "work_summary"],
  additionalProperties: false,
  properties: {
    subcontract_id: { type: "string", minLength: 1 },
    act_kind: {
      type: "string",
      enum: ["work_completion", "materials_handover", "subcontract_progress"],
    },
    work_summary: { type: "string", minLength: 1 },
    work_items: {
      type: "array",
      minItems: 1,
      maxItems: 50,
      items: draftActWorkItemSchema,
    },
    period_start: { type: "string", minLength: 10 },
    period_end: { type: "string", minLength: 10 },
    source_evidence_refs: {
      type: "array",
      minItems: 1,
      maxItems: 20,
      items: evidenceRefSchema,
    },
    notes: { type: "string", minLength: 1 },
  },
};

export const draftActOutputSchema: AiToolJsonObjectSchema = {
  type: "object",
  required: [
    "draft_preview",
    "act_kind",
    "work_items_normalized",
    "missing_fields",
    "risk_flags",
    "requires_approval",
    "next_action",
    "evidence_refs",
    "risk_level",
    "role_scope",
    "role_scoped",
    "bounded",
    "persisted",
    "idempotency_required_if_persisted",
    "mutation_count",
    "final_submit",
    "act_signed",
    "contractor_confirmation",
    "payment_mutation",
    "warehouse_mutation",
  ],
  additionalProperties: false,
  properties: {
    draft_preview: { type: "string", minLength: 1 },
    act_kind: {
      type: "string",
      enum: ["work_completion", "materials_handover", "subcontract_progress"],
    },
    work_items_normalized: {
      type: "array",
      items: {
        type: "object",
        required: ["line", "name", "quantity", "unit", "notes", "evidence_ref"],
        additionalProperties: false,
        properties: {
          line: { type: "number", minimum: 1 },
          name: { type: "string" },
          quantity: { type: "number", minimum: 0 },
          unit: { type: "string" },
          notes: { type: "string" },
          evidence_ref: { type: "string", minLength: 1 },
        },
      },
    },
    missing_fields: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
    risk_flags: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
    requires_approval: { type: "boolean" },
    next_action: { type: "string", enum: ["submit_for_approval"] },
    evidence_refs: { type: "array", items: evidenceRefSchema },
    risk_level: { type: "string", enum: ["DRAFT_ONLY"] },
    role_scope: {
      type: "string",
      enum: [
        "director_control_subcontract_scope",
        "foreman_subcontract_scope",
        "contractor_own_subcontract_scope",
      ],
    },
    role_scoped: { type: "boolean" },
    bounded: { type: "boolean" },
    persisted: { type: "boolean" },
    idempotency_required_if_persisted: { type: "boolean" },
    mutation_count: { type: "number", minimum: 0, maximum: 0 },
    final_submit: { type: "number", minimum: 0, maximum: 0 },
    act_signed: { type: "number", minimum: 0, maximum: 0 },
    contractor_confirmation: { type: "number", minimum: 0, maximum: 0 },
    payment_mutation: { type: "number", minimum: 0, maximum: 0 },
    warehouse_mutation: { type: "number", minimum: 0, maximum: 0 },
  },
};

export const submitForApprovalInputSchema: AiToolJsonObjectSchema = {
  type: "object",
  required: ["draftId", "approvalTarget", "idempotencyKey"],
  additionalProperties: false,
  properties: {
    draftId: { type: "string", minLength: 1 },
    approvalTarget: {
      type: "string",
      enum: ["request", "report", "act", "supplier_selection", "payment_status_change"],
    },
    idempotencyKey: { type: "string", minLength: 16 },
    approvalReason: { type: "string", minLength: 1 },
  },
};

export const submitForApprovalOutputSchema: AiToolJsonObjectSchema = {
  type: "object",
  required: ["status", "approvalRequired", "auditEvent"],
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: ["approval_required"] },
    approvalRequired: { type: "boolean" },
    auditEvent: { type: "string", enum: ["ai.action.approval_required"] },
  },
};

export const getActionStatusInputSchema: AiToolJsonObjectSchema = {
  type: "object",
  required: ["actionId"],
  additionalProperties: false,
  properties: {
    actionId: { type: "string", minLength: 1 },
  },
};

export const getActionStatusOutputSchema: AiToolJsonObjectSchema = {
  type: "object",
  required: ["status", "evidenceRefs"],
  additionalProperties: false,
  properties: {
    status: {
      type: "string",
      enum: ["draft", "approval_required", "approved", "rejected", "executed", "expired"],
    },
    evidenceRefs: {
      type: "array",
      items: evidenceRefSchema,
    },
  },
};
