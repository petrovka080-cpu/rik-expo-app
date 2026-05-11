import type { AiUserRole } from "../policy/aiRolePolicy";
import { planAiToolUse } from "./aiToolPlanPolicy";

export const DRAFT_ACT_TOOL_NAME = "draft_act" as const;
export const DRAFT_ACT_MAX_WORK_ITEMS = 50;
export const DRAFT_ACT_MAX_EVIDENCE_REFS = 20;
export const DRAFT_ACT_NEXT_ACTION = "submit_for_approval" as const;
export const DRAFT_ACT_RISK_LEVEL = "DRAFT_ONLY" as const;

export type DraftActKind =
  | "work_completion"
  | "materials_handover"
  | "subcontract_progress";

export type DraftActRoleScope =
  | "director_control_subcontract_scope"
  | "foreman_subcontract_scope"
  | "contractor_own_subcontract_scope";

export type DraftActWorkItemInput = {
  name?: string;
  quantity?: number;
  unit?: string;
  notes?: string;
};

export type DraftActToolInput = {
  subcontract_id?: string;
  act_kind?: DraftActKind;
  work_summary?: string;
  work_items?: DraftActWorkItemInput[];
  period_start?: string;
  period_end?: string;
  source_evidence_refs?: string[];
  notes?: string;
};

export type DraftActNormalizedWorkItem = {
  line: number;
  name: string;
  quantity: number;
  unit: string;
  notes: string;
  evidence_ref: string;
};

export type DraftActToolOutput = {
  draft_preview: string;
  act_kind: DraftActKind;
  work_items_normalized: DraftActNormalizedWorkItem[];
  missing_fields: string[];
  risk_flags: string[];
  requires_approval: true;
  next_action: typeof DRAFT_ACT_NEXT_ACTION;
  evidence_refs: string[];
  risk_level: typeof DRAFT_ACT_RISK_LEVEL;
  role_scope: DraftActRoleScope;
  role_scoped: true;
  bounded: true;
  persisted: false;
  idempotency_required_if_persisted: true;
  mutation_count: 0;
  final_submit: 0;
  act_signed: 0;
  contractor_confirmation: 0;
  payment_mutation: 0;
  warehouse_mutation: 0;
};

export type DraftActToolAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type DraftActToolRequest = {
  auth: DraftActToolAuthContext | null;
  input: unknown;
};

export type DraftActToolErrorCode =
  | "DRAFT_ACT_AUTH_REQUIRED"
  | "DRAFT_ACT_ROLE_NOT_ALLOWED"
  | "DRAFT_ACT_INVALID_INPUT";

export type DraftActToolEnvelope =
  | {
      ok: true;
      data: DraftActToolOutput;
    }
  | {
      ok: false;
      error: {
        code: DraftActToolErrorCode;
        message: string;
      };
    };

type NormalizedDraftActInput = {
  subcontract_id: string;
  act_kind: DraftActKind;
  work_summary: string;
  work_items: DraftActNormalizedWorkItem[];
  period_start: string;
  period_end: string;
  source_evidence_refs: string[];
  source_evidence_truncated: boolean;
  notes: string;
  missing_fields: string[];
  work_items_truncated: boolean;
};

type InputValidationResult =
  | { ok: true; value: NormalizedDraftActInput }
  | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeOptionalText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

function normalizeDate(value: unknown): string {
  const text = normalizeOptionalText(value);
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : "";
}

function normalizeQuantity(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function normalizeActKind(value: unknown): DraftActKind | null {
  if (
    value === "work_completion" ||
    value === "materials_handover" ||
    value === "subcontract_progress"
  ) {
    return value;
  }
  return null;
}

function buildWorkItemEvidenceRef(line: number): string {
  return `draft_act:input:work_item:${line}`;
}

function normalizeWorkItem(value: unknown, index: number): {
  item: DraftActNormalizedWorkItem;
  missing_fields: string[];
} {
  const record = isRecord(value) ? value : {};
  const line = index + 1;
  const name = normalizeOptionalText(record.name);
  const quantity = normalizeQuantity(record.quantity);
  const unit = normalizeOptionalText(record.unit);
  const missingFields = [
    name.length > 0 ? null : `work_items[${index}].name`,
    quantity > 0 ? null : `work_items[${index}].quantity`,
    unit.length > 0 ? null : `work_items[${index}].unit`,
  ].filter((field): field is string => field !== null);

  return {
    item: {
      line,
      name,
      quantity,
      unit,
      notes: normalizeOptionalText(record.notes),
      evidence_ref: buildWorkItemEvidenceRef(line),
    },
    missing_fields: missingFields,
  };
}

function normalizeEvidenceRefs(value: unknown): {
  refs: string[];
  truncated: boolean;
} {
  const rawRefs = Array.isArray(value)
    ? value.map(normalizeOptionalText).filter((ref) => ref.length > 0)
    : [];
  return {
    refs: rawRefs.slice(0, DRAFT_ACT_MAX_EVIDENCE_REFS),
    truncated: rawRefs.length > DRAFT_ACT_MAX_EVIDENCE_REFS,
  };
}

function normalizeInput(input: unknown): InputValidationResult {
  if (!isRecord(input)) {
    return { ok: false, message: "draft_act input must be an object" };
  }

  const rawWorkItems = Array.isArray(input.work_items) ? input.work_items : [];
  const boundedWorkItems = rawWorkItems.slice(0, DRAFT_ACT_MAX_WORK_ITEMS);
  const normalizedItems = boundedWorkItems.map(normalizeWorkItem);
  const evidence = normalizeEvidenceRefs(input.source_evidence_refs);
  const subcontractId = normalizeOptionalText(input.subcontract_id);
  const actKind = normalizeActKind(input.act_kind);
  const workSummary = normalizeOptionalText(input.work_summary);
  const periodStart = normalizeDate(input.period_start);
  const periodEnd = normalizeDate(input.period_end);
  const missingFields = [
    subcontractId.length > 0 ? null : "subcontract_id",
    actKind ? null : "act_kind",
    workSummary.length > 0 ? null : "work_summary",
    rawWorkItems.length > 0 ? null : "work_items",
    evidence.refs.length > 0 ? null : "source_evidence_refs",
    ...normalizedItems.flatMap((entry) => entry.missing_fields),
  ].filter((field): field is string => field !== null);

  return {
    ok: true,
    value: {
      subcontract_id: subcontractId,
      act_kind: actKind ?? "work_completion",
      work_summary: workSummary,
      work_items: normalizedItems.map((entry) => entry.item),
      period_start: periodStart,
      period_end: periodEnd,
      source_evidence_refs: evidence.refs,
      source_evidence_truncated: evidence.truncated,
      notes: normalizeOptionalText(input.notes),
      missing_fields: missingFields,
      work_items_truncated: rawWorkItems.length > DRAFT_ACT_MAX_WORK_ITEMS,
    },
  };
}

function getRoleScope(role: AiUserRole): DraftActRoleScope {
  if (role === "contractor") return "contractor_own_subcontract_scope";
  if (role === "foreman") return "foreman_subcontract_scope";
  return "director_control_subcontract_scope";
}

function buildRiskFlags(input: NormalizedDraftActInput, role: AiUserRole): string[] {
  const flags = [
    input.missing_fields.length > 0 ? "missing_required_fields" : null,
    input.period_start.length === 0 || input.period_end.length === 0 ? "period_range_missing" : null,
    input.source_evidence_truncated ? "source_evidence_truncated_to_safe_limit" : null,
    input.work_items_truncated ? "work_items_truncated_to_safe_limit" : null,
    role === "contractor" ? "contractor_own_subcontract_scope_only" : null,
  ].filter((flag): flag is string => flag !== null);

  return flags.length > 0 ? flags : ["draft_ready_for_approval_review"];
}

function buildDraftPreview(input: NormalizedDraftActInput): string {
  const subcontractLabel = input.subcontract_id || "missing subcontract";
  const periodLabel =
    input.period_start && input.period_end
      ? ` for ${input.period_start}..${input.period_end}`
      : "";
  return `Draft ${input.act_kind} act preview for ${subcontractLabel}${periodLabel}: ${input.work_items.length} work item(s) normalized. Next action is submit_for_approval.`;
}

function isAuthenticated(
  auth: DraftActToolAuthContext | null,
): auth is DraftActToolAuthContext {
  return auth !== null && auth.userId.trim().length > 0 && auth.role !== "unknown";
}

export async function runDraftActToolDraftOnly(
  request: DraftActToolRequest,
): Promise<DraftActToolEnvelope> {
  if (!isAuthenticated(request.auth)) {
    return {
      ok: false,
      error: {
        code: "DRAFT_ACT_AUTH_REQUIRED",
        message: "draft_act requires authenticated role context",
      },
    };
  }

  const plan = planAiToolUse({
    toolName: DRAFT_ACT_TOOL_NAME,
    role: request.auth.role,
  });
  if (!plan.allowed || plan.mode !== "draft_only_plan") {
    return {
      ok: false,
      error: {
        code: "DRAFT_ACT_ROLE_NOT_ALLOWED",
        message: "draft_act is not visible for this role",
      },
    };
  }

  const input = normalizeInput(request.input);
  if (!input.ok) {
    return {
      ok: false,
      error: {
        code: "DRAFT_ACT_INVALID_INPUT",
        message: input.message,
      },
    };
  }

  const evidenceRefs = [
    "draft_act:input:subcontract",
    ...input.value.source_evidence_refs,
    ...input.value.work_items.map((item) => item.evidence_ref),
  ];

  return {
    ok: true,
    data: {
      draft_preview: buildDraftPreview(input.value),
      act_kind: input.value.act_kind,
      work_items_normalized: input.value.work_items,
      missing_fields: input.value.missing_fields,
      risk_flags: buildRiskFlags(input.value, request.auth.role),
      requires_approval: true,
      next_action: DRAFT_ACT_NEXT_ACTION,
      evidence_refs: evidenceRefs,
      risk_level: DRAFT_ACT_RISK_LEVEL,
      role_scope: getRoleScope(request.auth.role),
      role_scoped: true,
      bounded: true,
      persisted: false,
      idempotency_required_if_persisted: true,
      mutation_count: 0,
      final_submit: 0,
      act_signed: 0,
      contractor_confirmation: 0,
      payment_mutation: 0,
      warehouse_mutation: 0,
    },
  };
}
