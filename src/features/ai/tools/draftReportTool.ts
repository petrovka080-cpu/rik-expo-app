import type { AiUserRole } from "../policy/aiRolePolicy";
import { planAiToolUse } from "./aiToolPlanPolicy";

export const DRAFT_REPORT_TOOL_NAME = "draft_report" as const;
export const DRAFT_REPORT_MAX_EVIDENCE_REFS = 20;
export const DRAFT_REPORT_NEXT_ACTION = "submit_for_approval" as const;
export const DRAFT_REPORT_RISK_LEVEL = "DRAFT_ONLY" as const;

export type DraftReportKind = "daily" | "materials" | "progress" | "finance_readonly";

export type DraftReportToolInput = {
  object_id?: string;
  report_kind?: DraftReportKind;
  period_start?: string;
  period_end?: string;
  notes?: string;
  source_evidence_refs?: string[];
};

export type DraftReportSection = {
  section: string;
  title: string;
  status: "draft_placeholder" | "source_evidence_required";
  evidence_ref: string;
};

export type DraftReportToolOutput = {
  draft_preview: string;
  report_kind: DraftReportKind;
  sections_normalized: DraftReportSection[];
  missing_fields: string[];
  risk_flags: string[];
  requires_approval: true;
  next_action: typeof DRAFT_REPORT_NEXT_ACTION;
  evidence_refs: string[];
  risk_level: typeof DRAFT_REPORT_RISK_LEVEL;
  bounded: true;
  persisted: false;
  idempotency_required_if_persisted: true;
  mutation_count: 0;
  final_submit: 0;
  report_published: 0;
  finance_mutation: 0;
  raw_finance_rows_exposed: false;
};

export type DraftReportToolAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type DraftReportToolRequest = {
  auth: DraftReportToolAuthContext | null;
  input: unknown;
};

export type DraftReportToolErrorCode =
  | "DRAFT_REPORT_AUTH_REQUIRED"
  | "DRAFT_REPORT_ROLE_NOT_ALLOWED"
  | "DRAFT_REPORT_KIND_NOT_ALLOWED"
  | "DRAFT_REPORT_INVALID_INPUT";

export type DraftReportToolEnvelope =
  | {
      ok: true;
      data: DraftReportToolOutput;
    }
  | {
      ok: false;
      error: {
        code: DraftReportToolErrorCode;
        message: string;
      };
    };

type NormalizedDraftReportInput = {
  object_id: string;
  report_kind: DraftReportKind;
  period_start: string;
  period_end: string;
  notes: string;
  source_evidence_refs: string[];
  source_evidence_truncated: boolean;
  missing_fields: string[];
};

type InputValidationResult =
  | { ok: true; value: NormalizedDraftReportInput }
  | { ok: false; message: string };

const REPORT_SECTIONS: Record<DraftReportKind, readonly string[]> = {
  daily: ["work_summary", "blockers", "next_steps"],
  materials: ["materials_used", "material_gaps", "warehouse_follow_up"],
  progress: ["completed_work", "in_progress", "risks"],
  finance_readonly: ["totals_summary", "document_gaps", "risk_notes"],
};

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

function normalizeReportKind(value: unknown): DraftReportKind | null {
  if (
    value === "daily" ||
    value === "materials" ||
    value === "progress" ||
    value === "finance_readonly"
  ) {
    return value;
  }
  return null;
}

function normalizeEvidenceRefs(value: unknown): {
  refs: string[];
  truncated: boolean;
} {
  const rawRefs = Array.isArray(value)
    ? value.map(normalizeOptionalText).filter((ref) => ref.length > 0)
    : [];
  return {
    refs: rawRefs.slice(0, DRAFT_REPORT_MAX_EVIDENCE_REFS),
    truncated: rawRefs.length > DRAFT_REPORT_MAX_EVIDENCE_REFS,
  };
}

function normalizeInput(input: unknown): InputValidationResult {
  if (!isRecord(input)) {
    return { ok: false, message: "draft_report input must be an object" };
  }

  const reportKind = normalizeReportKind(input.report_kind);
  const objectId = normalizeOptionalText(input.object_id);
  const evidence = normalizeEvidenceRefs(input.source_evidence_refs);
  const periodStart = normalizeDate(input.period_start);
  const periodEnd = normalizeDate(input.period_end);
  const missingFields = [
    objectId.length > 0 ? null : "object_id",
    reportKind ? null : "report_kind",
    evidence.refs.length > 0 ? null : "source_evidence_refs",
  ].filter((field): field is string => field !== null);

  return {
    ok: true,
    value: {
      object_id: objectId,
      report_kind: reportKind ?? "daily",
      period_start: periodStart,
      period_end: periodEnd,
      notes: normalizeOptionalText(input.notes),
      source_evidence_refs: evidence.refs,
      source_evidence_truncated: evidence.truncated,
      missing_fields: missingFields,
    },
  };
}

function roleCanDraftReportKind(role: AiUserRole, reportKind: DraftReportKind): boolean {
  if (reportKind !== "finance_readonly") return true;
  return role === "director" || role === "control" || role === "accountant";
}

function buildSections(input: NormalizedDraftReportInput): DraftReportSection[] {
  const hasSourceEvidence = input.source_evidence_refs.length > 0;
  return REPORT_SECTIONS[input.report_kind].map((section) => ({
    section,
    title: section.replace(/_/g, " "),
    status: hasSourceEvidence ? "draft_placeholder" : "source_evidence_required",
    evidence_ref: `draft_report:section:${section}`,
  }));
}

function buildRiskFlags(input: NormalizedDraftReportInput): string[] {
  const flags = [
    input.missing_fields.length > 0 ? "missing_required_fields" : null,
    input.period_start.length === 0 || input.period_end.length === 0 ? "period_range_missing" : null,
    input.report_kind === "finance_readonly" ? "finance_readonly_redacted" : null,
    input.source_evidence_truncated ? "source_evidence_truncated_to_safe_limit" : null,
  ].filter((flag): flag is string => flag !== null);

  return flags.length > 0 ? flags : ["draft_ready_for_approval_review"];
}

function buildDraftPreview(input: NormalizedDraftReportInput): string {
  const objectLabel = input.object_id || "missing object";
  const periodLabel =
    input.period_start && input.period_end
      ? ` for ${input.period_start}..${input.period_end}`
      : "";
  const evidenceLabel = `${input.source_evidence_refs.length} source evidence ref(s)`;
  return `Draft ${input.report_kind} report preview for ${objectLabel}${periodLabel}: ${evidenceLabel} attached. Next action is submit_for_approval.`;
}

function isAuthenticated(
  auth: DraftReportToolAuthContext | null,
): auth is DraftReportToolAuthContext {
  return auth !== null && auth.userId.trim().length > 0 && auth.role !== "unknown";
}

export async function runDraftReportToolDraftOnly(
  request: DraftReportToolRequest,
): Promise<DraftReportToolEnvelope> {
  if (!isAuthenticated(request.auth)) {
    return {
      ok: false,
      error: {
        code: "DRAFT_REPORT_AUTH_REQUIRED",
        message: "draft_report requires authenticated role context",
      },
    };
  }

  const plan = planAiToolUse({
    toolName: DRAFT_REPORT_TOOL_NAME,
    role: request.auth.role,
  });
  if (!plan.allowed || plan.mode !== "draft_only_plan") {
    return {
      ok: false,
      error: {
        code: "DRAFT_REPORT_ROLE_NOT_ALLOWED",
        message: "draft_report is not visible for this role",
      },
    };
  }

  const input = normalizeInput(request.input);
  if (!input.ok) {
    return {
      ok: false,
      error: {
        code: "DRAFT_REPORT_INVALID_INPUT",
        message: input.message,
      },
    };
  }

  if (!roleCanDraftReportKind(request.auth.role, input.value.report_kind)) {
    return {
      ok: false,
      error: {
        code: "DRAFT_REPORT_KIND_NOT_ALLOWED",
        message: "finance_readonly report drafts are limited to finance-capable roles",
      },
    };
  }

  const sections = buildSections(input.value);
  const evidenceRefs = [
    "draft_report:input:object",
    ...input.value.source_evidence_refs,
    ...sections.map((section) => section.evidence_ref),
  ];

  return {
    ok: true,
    data: {
      draft_preview: buildDraftPreview(input.value),
      report_kind: input.value.report_kind,
      sections_normalized: sections,
      missing_fields: input.value.missing_fields,
      risk_flags: buildRiskFlags(input.value),
      requires_approval: true,
      next_action: DRAFT_REPORT_NEXT_ACTION,
      evidence_refs: evidenceRefs,
      risk_level: DRAFT_REPORT_RISK_LEVEL,
      bounded: true,
      persisted: false,
      idempotency_required_if_persisted: true,
      mutation_count: 0,
      final_submit: 0,
      report_published: 0,
      finance_mutation: 0,
      raw_finance_rows_exposed: false,
    },
  };
}
