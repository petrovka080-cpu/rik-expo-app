import type { AiUserRole } from "../policy/aiRolePolicy";
import { planAiToolUse } from "./aiToolPlanPolicy";
import { markDraftRequestTransportBoundary } from "./transport/draftRequest.transport";

export const DRAFT_REQUEST_TOOL_NAME = "draft_request" as const;
export const DRAFT_REQUEST_MAX_ITEMS = 50;
export const DRAFT_REQUEST_NEXT_ACTION = "submit_for_approval" as const;
export const DRAFT_REQUEST_RISK_LEVEL = "DRAFT_ONLY" as const;

export type DraftRequestItemInput = {
  material_id?: string;
  material_code?: string;
  name?: string;
  quantity?: number;
  unit?: string;
  notes?: string;
};

export type DraftRequestToolInput = {
  project_id?: string;
  items?: DraftRequestItemInput[];
  preferred_supplier_id?: string;
  delivery_window?: string;
  notes?: string;
};

export type DraftRequestNormalizedItem = {
  line: number;
  material_id: string;
  material_code: string;
  name: string;
  quantity: number;
  unit: string;
  notes: string;
  evidence_ref: string;
};

export type DraftRequestToolOutput = {
  draft_preview: string;
  items_normalized: DraftRequestNormalizedItem[];
  missing_fields: string[];
  risk_flags: string[];
  requires_approval: true;
  next_action: typeof DRAFT_REQUEST_NEXT_ACTION;
  evidence_refs: string[];
  risk_level: typeof DRAFT_REQUEST_RISK_LEVEL;
  bounded: true;
  persisted: false;
  idempotency_required_if_persisted: true;
  mutation_count: 0;
  final_submit: 0;
  supplier_confirmation: 0;
  order_created: 0;
  warehouse_mutation: 0;
};

export type DraftRequestToolAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type DraftRequestToolRequest = {
  auth: DraftRequestToolAuthContext | null;
  input: unknown;
};

export type DraftRequestToolErrorCode =
  | "DRAFT_REQUEST_AUTH_REQUIRED"
  | "DRAFT_REQUEST_ROLE_NOT_ALLOWED"
  | "DRAFT_REQUEST_INVALID_INPUT";

export type DraftRequestToolEnvelope =
  | {
      ok: true;
      data: DraftRequestToolOutput;
    }
  | {
      ok: false;
      error: {
        code: DraftRequestToolErrorCode;
        message: string;
      };
    };

type NormalizedDraftRequestInput = {
  project_id: string;
  items: DraftRequestNormalizedItem[];
  preferred_supplier_id: string;
  delivery_window: string;
  notes: string;
  missing_fields: string[];
  truncated: boolean;
};

type InputValidationResult =
  | { ok: true; value: NormalizedDraftRequestInput }
  | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeOptionalText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

function normalizeQuantity(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function buildEvidenceRef(line: number): string {
  return `draft_request:input:item:${line}`;
}

function normalizeItem(value: unknown, index: number): {
  item: DraftRequestNormalizedItem;
  missing_fields: string[];
} {
  const record = isRecord(value) ? value : {};
  const line = index + 1;
  const name = normalizeOptionalText(record.name);
  const quantity = normalizeQuantity(record.quantity);
  const unit = normalizeOptionalText(record.unit);
  const missingFields = [
    name.length > 0 ? null : `items[${index}].name`,
    quantity > 0 ? null : `items[${index}].quantity`,
    unit.length > 0 ? null : `items[${index}].unit`,
  ].filter((field): field is string => field !== null);

  return {
    item: {
      line,
      material_id: normalizeOptionalText(record.material_id),
      material_code: normalizeOptionalText(record.material_code),
      name,
      quantity,
      unit,
      notes: normalizeOptionalText(record.notes),
      evidence_ref: buildEvidenceRef(line),
    },
    missing_fields: missingFields,
  };
}

function normalizeInput(input: unknown): InputValidationResult {
  if (!isRecord(input)) {
    return { ok: false, message: "draft_request input must be an object" };
  }

  const rawItems = Array.isArray(input.items) ? input.items : [];
  const boundedItems = rawItems.slice(0, DRAFT_REQUEST_MAX_ITEMS);
  const normalizedItems = boundedItems.map(normalizeItem);
  const projectId = normalizeOptionalText(input.project_id);
  const missingFields = [
    projectId.length > 0 ? null : "project_id",
    rawItems.length > 0 ? null : "items",
    ...normalizedItems.flatMap((entry) => entry.missing_fields),
  ].filter((field): field is string => field !== null);

  return {
    ok: true,
    value: {
      project_id: projectId,
      items: normalizedItems.map((entry) => entry.item),
      preferred_supplier_id: normalizeOptionalText(input.preferred_supplier_id),
      delivery_window: normalizeOptionalText(input.delivery_window),
      notes: normalizeOptionalText(input.notes),
      missing_fields: missingFields,
      truncated: rawItems.length > DRAFT_REQUEST_MAX_ITEMS,
    },
  };
}

function buildRiskFlags(input: NormalizedDraftRequestInput): string[] {
  const flags = [
    input.missing_fields.length > 0 ? "missing_required_fields" : null,
    input.preferred_supplier_id.length > 0 ? "preferred_supplier_requires_approval" : null,
    input.delivery_window.length === 0 ? "delivery_window_missing" : null,
    input.truncated ? "items_truncated_to_safe_limit" : null,
  ].filter((flag): flag is string => flag !== null);

  return flags.length > 0 ? flags : ["draft_ready_for_approval_review"];
}

function buildDraftPreview(input: NormalizedDraftRequestInput): string {
  const itemCount = input.items.length;
  const projectLabel = input.project_id || "missing project";
  const supplierText = input.preferred_supplier_id
    ? ` Preferred supplier is captured for approval review only.`
    : "";
  const deliveryText = input.delivery_window
    ? ` Delivery window: ${input.delivery_window}.`
    : " Delivery window is missing.";

  return `Draft request preview for ${projectLabel}: ${itemCount} item(s) normalized.${deliveryText}${supplierText} Next action is submit_for_approval.`;
}

function isAuthenticated(
  auth: DraftRequestToolAuthContext | null,
): auth is DraftRequestToolAuthContext {
  return auth !== null && auth.userId.trim().length > 0 && auth.role !== "unknown";
}

export async function runDraftRequestToolDraftOnly(
  request: DraftRequestToolRequest,
): Promise<DraftRequestToolEnvelope> {
  if (!isAuthenticated(request.auth)) {
    return {
      ok: false,
      error: {
        code: "DRAFT_REQUEST_AUTH_REQUIRED",
        message: "draft_request requires authenticated role context",
      },
    };
  }

  const plan = planAiToolUse({
    toolName: DRAFT_REQUEST_TOOL_NAME,
    role: request.auth.role,
  });
  if (!plan.allowed || plan.mode !== "draft_only_plan") {
    return {
      ok: false,
      error: {
        code: "DRAFT_REQUEST_ROLE_NOT_ALLOWED",
        message: "draft_request is not visible for this role",
      },
    };
  }

  const input = normalizeInput(request.input);
  if (!input.ok) {
    return {
      ok: false,
      error: {
        code: "DRAFT_REQUEST_INVALID_INPUT",
        message: input.message,
      },
    };
  }

  const evidenceRefs = [
    "draft_request:input:project",
    ...input.value.items.map((item) => item.evidence_ref),
  ];

  return {
    ok: true,
    data: markDraftRequestTransportBoundary({
      draft_preview: buildDraftPreview(input.value),
      items_normalized: input.value.items,
      missing_fields: input.value.missing_fields,
      risk_flags: buildRiskFlags(input.value),
      requires_approval: true,
      next_action: DRAFT_REQUEST_NEXT_ACTION,
      evidence_refs: evidenceRefs,
      risk_level: DRAFT_REQUEST_RISK_LEVEL,
      bounded: true,
      persisted: false,
      idempotency_required_if_persisted: true,
      mutation_count: 0,
      final_submit: 0,
      supplier_confirmation: 0,
      order_created: 0,
      warehouse_mutation: 0,
    }),
  };
}
