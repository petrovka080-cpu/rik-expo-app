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
  required: ["materialName"],
  additionalProperties: false,
  properties: {
    materialName: {
      type: "string",
      minLength: 1,
    },
    quantity: {
      type: "number",
      minimum: 0,
    },
    supplierIds: {
      type: "array",
      items: {
        type: "string",
        minLength: 1,
      },
    },
  },
};

export const compareSuppliersOutputSchema: AiToolJsonObjectSchema = {
  type: "object",
  required: ["comparisons", "evidenceRefs", "approvalBoundary"],
  additionalProperties: false,
  properties: {
    comparisons: {
      type: "array",
      items: {
        type: "object",
        required: ["supplierId", "supplierName", "summary"],
        additionalProperties: false,
        properties: {
          supplierId: { type: "string", minLength: 1 },
          supplierName: { type: "string", minLength: 1 },
          summary: { type: "string", minLength: 1 },
        },
      },
    },
    evidenceRefs: {
      type: "array",
      items: evidenceRefSchema,
    },
    approvalBoundary: {
      type: "string",
      minLength: 1,
    },
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
