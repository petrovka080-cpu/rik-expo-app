import type {
  AiFinanceSummaryTransportResult,
  AiWarehouseStatusTransportResult,
  AiWarehouseStatusTransportRow,
} from "../tools/transport/aiToolTransportTypes";
import type { AiTaskStreamRuntimeEvidenceInput } from "../taskStream/aiTaskStreamRuntimeTypes";

export const AI_WORKDAY_LIVE_EVIDENCE_BRIDGE_CONTRACT = Object.freeze({
  contractId: "ai_workday_live_evidence_bridge_v1",
  source: "runtime:ai_workday_live_evidence_bridge_v1",
  backendFirst: true,
  safeReadOnly: true,
  evidenceRequired: true,
  roleScopedDownstream: true,
  mutationCount: 0,
  dbWrites: 0,
  externalLiveFetch: false,
  uncontrolledExternalFetch: false,
  rawRowsReturned: false,
  rawPromptReturned: false,
  rawProviderPayloadReturned: false,
  fakeCards: false,
  hardcodedAiAnswer: false,
} as const);

export type AiWorkdayLiveEvidenceBridgeStatus = "loaded" | "empty" | "blocked";

export type AiWorkdayLiveEvidenceSourceStatus =
  | "loaded"
  | "empty"
  | "unavailable"
  | "blocked";

export type AiWorkdayLiveEvidenceSourceProbe = {
  source: "warehouse_status" | "finance_summary";
  status: AiWorkdayLiveEvidenceSourceStatus;
  evidenceRefs: readonly string[];
  redacted: true;
  rawRowsReturned: false;
  exactReason: string | null;
};

export type AiWorkdayLiveEvidenceBridgeInput = {
  warehouse?: AiWarehouseStatusTransportResult | null;
  finance?: AiFinanceSummaryTransportResult | null;
  sourceProbes?: readonly AiWorkdayLiveEvidenceSourceProbe[];
};

export type AiWorkdayLiveEvidenceBridgeResult = {
  status: AiWorkdayLiveEvidenceBridgeStatus;
  runtimeEvidence: AiTaskStreamRuntimeEvidenceInput;
  sourceProbes: readonly AiWorkdayLiveEvidenceSourceProbe[];
  evidenceSourceCount: number;
  allEvidenceRedacted: true;
  safeReadOnly: true;
  mutationCount: 0;
  dbWrites: 0;
  externalLiveFetch: false;
  uncontrolledExternalFetch: false;
  rawRowsReturned: false;
  rawPromptReturned: false;
  rawProviderPayloadReturned: false;
  fakeCards: false;
  hardcodedAiAnswer: false;
  exactReason: string | null;
};

const EMPTY_REASON = "No eligible bounded safe-read evidence was available for workday tasks.";

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rowQuantity(row: AiWarehouseStatusTransportRow, key: keyof AiWarehouseStatusTransportRow): number {
  return toNumber(row[key]);
}

function hasWarehouseRows(value: AiWarehouseStatusTransportResult | null | undefined): value is AiWarehouseStatusTransportResult {
  return Boolean(value && value.rows.length > 0);
}

function buildWarehouseLowStockFlags(rows: readonly AiWarehouseStatusTransportRow[]): string[] {
  return rows
    .map((row, index) => {
      const available = rowQuantity(row, "qty_available");
      const reserved = rowQuantity(row, "qty_reserved");
      const onHand = rowQuantity(row, "qty_on_hand");
      if (available <= 0) return `low_available:${index + 1}`;
      if (reserved > 0 && reserved >= onHand) return `reserved_pressure:${index + 1}`;
      return null;
    })
    .filter((flag): flag is string => flag !== null);
}

function readFinanceSummary(
  result: AiFinanceSummaryTransportResult | null | undefined,
): Record<string, unknown> | null {
  const payload = result?.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const summary = (payload as Record<string, unknown>).summary;
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return null;
  return summary as Record<string, unknown>;
}

function buildFinanceRiskFlags(summary: Record<string, unknown> | null): string[] {
  if (!summary) return [];
  const flags: string[] = [];
  const debtAmount = toNumber(summary.total_debt);
  const overdueAmount = toNumber(summary.overdue_amount);
  const overdueCount = toNumber(summary.overdue_count);
  const criticalAmount = toNumber(summary.critical_amount);
  if (debtAmount > 0) flags.push("debt_present");
  if (overdueAmount > 0 || overdueCount > 0) flags.push("overdue_debt_present");
  if (criticalAmount > 0) flags.push("critical_finance_bucket_present");
  return flags;
}

function defaultProbe(source: AiWorkdayLiveEvidenceSourceProbe["source"]): AiWorkdayLiveEvidenceSourceProbe {
  return {
    source,
    status: "empty",
    evidenceRefs: [],
    redacted: true,
    rawRowsReturned: false,
    exactReason: null,
  };
}

function mergeProbe(
  probes: readonly AiWorkdayLiveEvidenceSourceProbe[] | undefined,
  fallback: AiWorkdayLiveEvidenceSourceProbe,
): AiWorkdayLiveEvidenceSourceProbe {
  return probes?.find((probe) => probe.source === fallback.source) ?? fallback;
}

function finalStatus(probes: readonly AiWorkdayLiveEvidenceSourceProbe[], evidenceSourceCount: number): AiWorkdayLiveEvidenceBridgeStatus {
  if (evidenceSourceCount > 0) return "loaded";
  if (probes.length > 0 && probes.every((probe) => probe.status === "unavailable" || probe.status === "blocked")) {
    return "blocked";
  }
  return "empty";
}

function exactReason(params: {
  status: AiWorkdayLiveEvidenceBridgeStatus;
  probes: readonly AiWorkdayLiveEvidenceSourceProbe[];
}): string | null {
  if (params.status === "loaded") return null;
  const reasons = params.probes
    .map((probe) => probe.exactReason)
    .filter((reason): reason is string => typeof reason === "string" && reason.trim().length > 0);
  if (reasons.length > 0) return reasons.join("; ");
  return EMPTY_REASON;
}

export function buildAiWorkdayRuntimeEvidenceFromSafeReads(
  input: AiWorkdayLiveEvidenceBridgeInput,
): AiWorkdayLiveEvidenceBridgeResult {
  const runtimeEvidence: AiTaskStreamRuntimeEvidenceInput = {};
  const sourceProbes: AiWorkdayLiveEvidenceSourceProbe[] = [];

  if (hasWarehouseRows(input.warehouse)) {
    const evidenceRefs = ["warehouse:bounded_snapshot:redacted"];
    const lowStockFlags = buildWarehouseLowStockFlags(input.warehouse.rows);
    runtimeEvidence.warehouse = {
      summary:
        lowStockFlags.length > 0
          ? `Bounded safe-read warehouse snapshot found ${lowStockFlags.length} stock risk flags.`
          : `Bounded safe-read warehouse snapshot covered ${input.warehouse.rows.length} stock rows.`,
      evidenceRefs,
      lowStockFlags,
      sourceScreenId: "warehouse.main",
      sourceEntityIdHash: "warehouse:bounded_snapshot:redacted",
    };
    sourceProbes.push({
      source: "warehouse_status",
      status: "loaded",
      evidenceRefs,
      redacted: true,
      rawRowsReturned: false,
      exactReason: null,
    });
  } else {
    sourceProbes.push(mergeProbe(input.sourceProbes, defaultProbe("warehouse_status")));
  }

  const financeSummary = readFinanceSummary(input.finance);
  const financeRiskFlags = buildFinanceRiskFlags(financeSummary);
  if (financeSummary && financeRiskFlags.length > 0) {
    const evidenceRefs = ["finance:bounded_summary:redacted"];
    runtimeEvidence.finance = {
      summary: "Bounded redacted finance summary has debt or overdue risk.",
      evidenceRefs,
      riskFlags: financeRiskFlags,
      debtAmount: toNumber(financeSummary.total_debt),
      overdueCount: toNumber(financeSummary.overdue_count),
    };
    sourceProbes.push({
      source: "finance_summary",
      status: "loaded",
      evidenceRefs,
      redacted: true,
      rawRowsReturned: false,
      exactReason: null,
    });
  } else {
    sourceProbes.push(mergeProbe(input.sourceProbes, defaultProbe("finance_summary")));
  }

  const evidenceSourceCount = Number(Boolean(runtimeEvidence.warehouse)) + Number(Boolean(runtimeEvidence.finance));
  const status = finalStatus(sourceProbes, evidenceSourceCount);

  return {
    status,
    runtimeEvidence,
    sourceProbes,
    evidenceSourceCount,
    allEvidenceRedacted: true,
    safeReadOnly: true,
    mutationCount: 0,
    dbWrites: 0,
    externalLiveFetch: false,
    uncontrolledExternalFetch: false,
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
    fakeCards: false,
    hardcodedAiAnswer: false,
    exactReason: exactReason({ status, probes: sourceProbes }),
  };
}
