import type { AiToolJsonObjectSchema } from "../tools/aiToolTypes";

const evidenceRefSchema = {
  type: "string",
  description: "Redacted evidence reference, never raw row data.",
  minLength: 1,
} satisfies AiToolJsonObjectSchema["properties"][string];

const moneySummarySchema = {
  type: "object",
  required: ["amount", "currency"],
  additionalProperties: false,
  properties: {
    amount: {
      type: "number",
      description: "Aggregated amount only.",
      minimum: 0,
    },
    currency: {
      type: "string",
      minLength: 3,
    },
  },
} satisfies AiToolJsonObjectSchema["properties"][string];

const draftMaterialSchema = {
  type: "object",
  required: ["name", "quantity", "unit"],
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
    materialId: { type: "string", minLength: 1 },
    warehouseId: { type: "string", minLength: 1 },
    objectId: { type: "string", minLength: 1 },
  },
};

export const getWarehouseStatusOutputSchema: AiToolJsonObjectSchema = {
  type: "object",
  required: ["summary", "evidenceRefs"],
  additionalProperties: false,
  properties: {
    summary: {
      type: "string",
      minLength: 1,
    },
    availableQuantity: {
      type: "number",
      minimum: 0,
    },
    evidenceRefs: {
      type: "array",
      items: evidenceRefSchema,
    },
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

export const getFinanceSummaryOutputSchema: AiToolJsonObjectSchema = {
  type: "object",
  required: ["summary", "debt", "payments", "documents", "evidenceRefs"],
  additionalProperties: false,
  properties: {
    summary: { type: "string", minLength: 1 },
    debt: moneySummarySchema,
    payments: moneySummarySchema,
    documents: { type: "number", minimum: 0 },
    evidenceRefs: { type: "array", items: evidenceRefSchema },
  },
};

export const draftRequestInputSchema: AiToolJsonObjectSchema = {
  type: "object",
  required: ["objectId", "materials"],
  additionalProperties: false,
  properties: {
    objectId: { type: "string", minLength: 1 },
    materials: {
      type: "array",
      minItems: 1,
      items: draftMaterialSchema,
    },
    reason: { type: "string", minLength: 1 },
  },
};

export const draftRequestOutputSchema: AiToolJsonObjectSchema = {
  type: "object",
  required: ["draftPreview", "approvalRequired", "evidenceRefs"],
  additionalProperties: false,
  properties: {
    draftPreview: { type: "string", minLength: 1 },
    approvalRequired: { type: "boolean" },
    evidenceRefs: { type: "array", items: evidenceRefSchema },
  },
};

export const draftReportInputSchema: AiToolJsonObjectSchema = {
  type: "object",
  required: ["objectId", "reportKind"],
  additionalProperties: false,
  properties: {
    objectId: { type: "string", minLength: 1 },
    reportKind: { type: "string", enum: ["daily", "materials", "progress", "finance_readonly"] },
    notes: { type: "string", minLength: 1 },
  },
};

export const draftReportOutputSchema: AiToolJsonObjectSchema = {
  type: "object",
  required: ["draftPreview", "approvalRequired", "evidenceRefs"],
  additionalProperties: false,
  properties: {
    draftPreview: { type: "string", minLength: 1 },
    approvalRequired: { type: "boolean" },
    evidenceRefs: { type: "array", items: evidenceRefSchema },
  },
};

export const draftActInputSchema: AiToolJsonObjectSchema = {
  type: "object",
  required: ["subcontractId", "workSummary"],
  additionalProperties: false,
  properties: {
    subcontractId: { type: "string", minLength: 1 },
    workSummary: { type: "string", minLength: 1 },
    documentId: { type: "string", minLength: 1 },
  },
};

export const draftActOutputSchema: AiToolJsonObjectSchema = {
  type: "object",
  required: ["draftPreview", "approvalRequired", "evidenceRefs"],
  additionalProperties: false,
  properties: {
    draftPreview: { type: "string", minLength: 1 },
    approvalRequired: { type: "boolean" },
    evidenceRefs: { type: "array", items: evidenceRefSchema },
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
