import type { AiUserRole } from "../policy/aiRolePolicy";
import { planAiToolUse } from "./aiToolPlanPolicy";
import { readFinanceSummaryTransport } from "./transport/financeSummary.transport";
import {
  decideAiToolRateLimit,
  explainAiToolRateLimitBlock,
  measureAiToolPayloadBytes,
} from "../rateLimit/aiToolRateLimitDecision";

export const GET_FINANCE_SUMMARY_TOOL_NAME = "get_finance_summary" as const;
export const GET_FINANCE_SUMMARY_ROUTE_OPERATION = "director.finance.rpc.scope" as const;

export type GetFinanceSummaryToolInput = {
  scope: "company" | "project" | "supplier";
  entityId?: string;
  periodStart?: string;
  periodEnd?: string;
};

export type FinanceSummaryTotals = {
  payable: number;
  paid: number;
  debt: number;
  overdue: number;
  currency: "KGS";
};

export type FinanceSummaryDebtBuckets = {
  current: number;
  overdue: number;
  critical: number;
};

export type FinanceSummaryRedactedBreakdown = {
  scope: GetFinanceSummaryToolInput["scope"];
  supplier_count: number;
  document_count: number;
  supplier_names_redacted: true;
  bank_details_redacted: true;
  tokens_redacted: true;
  raw_rows_exposed: false;
};

export type GetFinanceSummaryToolOutput = {
  totals: FinanceSummaryTotals;
  debt_buckets: FinanceSummaryDebtBuckets;
  overdue_count: number;
  document_gaps: string[];
  risk_flags: string[];
  redacted_breakdown: FinanceSummaryRedactedBreakdown;
  evidence_refs: string[];
  route_operation: typeof GET_FINANCE_SUMMARY_ROUTE_OPERATION;
  bounded: true;
  mutation_count: 0;
  payment_mutation: 0;
  status_mutation: 0;
  raw_finance_rows_exposed: false;
};

export type GetFinanceSummaryToolAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type FinanceSummaryReadResult = {
  payload: Record<string, unknown>;
};

export type FinanceSummaryReader = (params: {
  input: NormalizedGetFinanceSummaryInput;
}) => Promise<FinanceSummaryReadResult>;

export type GetFinanceSummaryToolRequest = {
  auth: GetFinanceSummaryToolAuthContext | null;
  input: unknown;
  readFinanceSummary?: FinanceSummaryReader;
};

export type GetFinanceSummaryToolErrorCode =
  | "GET_FINANCE_SUMMARY_AUTH_REQUIRED"
  | "GET_FINANCE_SUMMARY_ROLE_NOT_ALLOWED"
  | "GET_FINANCE_SUMMARY_INVALID_INPUT"
  | "GET_FINANCE_SUMMARY_READ_FAILED";

export type GetFinanceSummaryToolEnvelope =
  | {
      ok: true;
      data: GetFinanceSummaryToolOutput;
    }
  | {
      ok: false;
      error: {
        code: GetFinanceSummaryToolErrorCode;
        message: string;
      };
    };

export type NormalizedGetFinanceSummaryInput = {
  scope: "company" | "project" | "supplier";
  entityId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
};

type InputValidationResult =
  | { ok: true; value: NormalizedGetFinanceSummaryInput }
  | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeScope(value: unknown): GetFinanceSummaryToolInput["scope"] | null {
  return value === "company" || value === "project" || value === "supplier" ? value : null;
}

function normalizeDate(value: unknown): string | null {
  const text = normalizeOptionalText(value);
  if (!text) return null;
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : null;
}

function normalizeInput(input: unknown): InputValidationResult {
  if (!isRecord(input)) {
    return { ok: false, message: "get_finance_summary input must be an object" };
  }

  const scope = normalizeScope(input.scope);
  if (!scope) {
    return { ok: false, message: "get_finance_summary scope must be company, project, or supplier" };
  }

  const entityId = normalizeOptionalText(input.entityId);
  if ((scope === "project" || scope === "supplier") && !entityId) {
    return { ok: false, message: `${scope} finance summary requires entityId` };
  }

  return {
    ok: true,
    value: {
      scope,
      entityId,
      periodStart: normalizeDate(input.periodStart),
      periodEnd: normalizeDate(input.periodEnd),
    },
  };
}

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function readNumber(record: Record<string, unknown>, keys: readonly string[]): number {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return toNumber(record[key]);
    }
  }
  return 0;
}

function readStringArray(record: Record<string, unknown>, keys: readonly string[]): string[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value
        .map((item) => normalizeOptionalText(item))
        .filter((item): item is string => item !== null);
    }
  }
  return [];
}

function readRecord(record: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  for (const key of keys) {
    const value = record[key];
    if (isRecord(value)) return value;
  }
  return record;
}

function readArrayCount(record: Record<string, unknown>, keys: readonly string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value.length;
  }
  return 0;
}

async function defaultReadFinanceSummary(params: {
  input: NormalizedGetFinanceSummaryInput;
}): Promise<FinanceSummaryReadResult> {
  return readFinanceSummaryTransport(params);
}

function buildEvidenceRefs(params: {
  payload: Record<string, unknown>;
  input: NormalizedGetFinanceSummaryInput;
}): string[] {
  const refs = ["finance:summary:totals"];
  if (params.input.scope !== "company") refs.push(`finance:summary:${params.input.scope}:scope`);
  if (readArrayCount(params.payload, ["by_supplier", "bySupplier", "suppliers"]) > 0) {
    refs.push("finance:summary:supplier_breakdown:redacted");
  }
  return refs;
}

function buildRiskFlags(params: {
  totals: FinanceSummaryTotals;
  overdueCount: number;
  documentGaps: readonly string[];
}): string[] {
  const flags = [
    params.totals.debt > 0 ? "debt_present" : null,
    params.totals.overdue > 0 || params.overdueCount > 0 ? "overdue_debt_present" : null,
    params.documentGaps.length > 0 ? "document_gap_present" : null,
  ].filter((item): item is string => item !== null);

  return flags.length > 0 ? flags : ["no_finance_risk_flags"];
}

function toFinanceSummaryOutput(params: {
  payload: Record<string, unknown>;
  input: NormalizedGetFinanceSummaryInput;
}): GetFinanceSummaryToolOutput {
  const summary = readRecord(params.payload, ["summary", "summaryV2", "totals"]);
  const payable = readNumber(summary, ["total_payable", "totalPayable", "total_amount", "totalAmount", "payable"]);
  const paid = readNumber(summary, ["total_paid", "totalPaid", "paid"]);
  const debt = readNumber(summary, ["total_debt", "totalDebt", "debt"]);
  const overdue = readNumber(summary, ["overdue_amount", "overdueAmount", "overdue"]);
  const critical = readNumber(summary, ["critical_amount", "criticalAmount"]);
  const overdueCount = readNumber(summary, ["overdue_count", "overdueCount"]);
  const documentCount = readNumber(summary, ["document_count", "documentCount", "documents"]);
  const supplierCount =
    readNumber(summary, ["supplier_count", "supplierCount"]) ||
    readArrayCount(params.payload, ["by_supplier", "bySupplier", "suppliers"]);
  const documentGaps = readStringArray(params.payload, ["document_gaps", "documentGaps"]);
  const totals: FinanceSummaryTotals = {
    payable,
    paid,
    debt,
    overdue,
    currency: "KGS",
  };

  return {
    totals,
    debt_buckets: {
      current: Math.max(0, debt - overdue),
      overdue,
      critical,
    },
    overdue_count: overdueCount,
    document_gaps: documentGaps,
    risk_flags: buildRiskFlags({ totals, overdueCount, documentGaps }),
    redacted_breakdown: {
      scope: params.input.scope,
      supplier_count: supplierCount,
      document_count: documentCount,
      supplier_names_redacted: true,
      bank_details_redacted: true,
      tokens_redacted: true,
      raw_rows_exposed: false,
    },
    evidence_refs: buildEvidenceRefs(params),
    route_operation: GET_FINANCE_SUMMARY_ROUTE_OPERATION,
    bounded: true,
    mutation_count: 0,
    payment_mutation: 0,
    status_mutation: 0,
    raw_finance_rows_exposed: false,
  };
}

function isAuthenticated(
  auth: GetFinanceSummaryToolAuthContext | null,
): auth is GetFinanceSummaryToolAuthContext {
  return auth !== null && auth.userId.trim().length > 0;
}

export async function runGetFinanceSummaryToolSafeRead(
  request: GetFinanceSummaryToolRequest,
): Promise<GetFinanceSummaryToolEnvelope> {
  if (!isAuthenticated(request.auth)) {
    return {
      ok: false,
      error: {
        code: "GET_FINANCE_SUMMARY_AUTH_REQUIRED",
        message: "get_finance_summary requires authenticated role context",
      },
    };
  }

  const plan = planAiToolUse({
    toolName: GET_FINANCE_SUMMARY_TOOL_NAME,
    role: request.auth.role,
  });
  if (!plan.allowed || plan.mode !== "read_contract_plan") {
    return {
      ok: false,
      error: {
        code: "GET_FINANCE_SUMMARY_ROLE_NOT_ALLOWED",
        message: "get_finance_summary is not visible for this role",
      },
    };
  }

  const input = normalizeInput(request.input);
  if (!input.ok) {
    return {
      ok: false,
      error: {
        code: "GET_FINANCE_SUMMARY_INVALID_INPUT",
        message: input.message,
      },
    };
  }
  const rateDecision = decideAiToolRateLimit({
    toolName: GET_FINANCE_SUMMARY_TOOL_NAME,
    role: request.auth.role,
    payloadBytes: measureAiToolPayloadBytes(request.input),
    requestedLimit: 1,
  });
  if (!rateDecision.allowed) {
    return {
      ok: false,
      error: {
        code: "GET_FINANCE_SUMMARY_INVALID_INPUT",
        message: explainAiToolRateLimitBlock(rateDecision),
      },
    };
  }

  try {
    const readFinanceSummary = request.readFinanceSummary ?? defaultReadFinanceSummary;
    const readResult = await readFinanceSummary({ input: input.value });
    return {
      ok: true,
      data: toFinanceSummaryOutput({
        payload: readResult.payload,
        input: input.value,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "GET_FINANCE_SUMMARY_READ_FAILED",
        message: error instanceof Error ? error.message : "get_finance_summary read failed",
      },
    };
  }
}
