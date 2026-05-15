import type {
  AiDirectorCrossDomainEvidenceResult,
  AiDirectorDomainEvidenceSummary,
  AiDirectorExecutiveDomain,
} from "./aiDirectorCrossDomainEvidence";

export type AiDirectorRiskLevel = "low" | "medium" | "high" | "critical";

export type AiDirectorRiskSignalKind =
  | "cross_domain_approval_boundary"
  | "procurement_supplier_boundary"
  | "warehouse_stock_boundary"
  | "finance_posting_boundary"
  | "field_closeout_boundary"
  | "evidence_gap";

export type AiDirectorRiskPrioritySignal = {
  kind: AiDirectorRiskSignalKind;
  domain: AiDirectorExecutiveDomain;
  level: AiDirectorRiskLevel;
  summary: string;
  evidenceRefs: readonly string[];
  approvalRequired: true;
  directExecuteAllowed: false;
};

export type AiDirectorDomainRiskPriorityScore = {
  domain: AiDirectorExecutiveDomain;
  riskLevel: AiDirectorRiskLevel;
  priorityScore: number;
  rank: number;
  summary: string;
  evidenceRefs: readonly string[];
  signals: readonly AiDirectorRiskPrioritySignal[];
  approvalRequired: true;
  evidenceBacked: boolean;
  safeReadOnly: true;
  directExecuteAllowed: false;
  directMutationAllowed: false;
  mutationCount: 0;
};

export type AiDirectorRiskPriorityScoringResult = {
  status: "scored" | "empty" | "blocked";
  domainScores: readonly AiDirectorDomainRiskPriorityScore[];
  highRiskDomains: readonly AiDirectorExecutiveDomain[];
  topDomain: AiDirectorExecutiveDomain | null;
  evidenceBacked: boolean;
  riskPriorityScored: boolean;
  approvalRequiredOnly: true;
  noDirectExecute: true;
  noDirectFinanceProcurementWarehouseMutation: true;
  providerCalled: false;
  rawRowsReturned: false;
  rawPromptReturned: false;
  rawProviderPayloadReturned: false;
  dbWrites: 0;
  mutationCount: 0;
  fakeRiskSignals: false;
  exactReason: string | null;
};

export const AI_DIRECTOR_RISK_PRIORITY_SCORING_CONTRACT = Object.freeze({
  contractId: "ai_director_risk_priority_scoring_v1",
  riskKinds: [
    "cross_domain_approval_boundary",
    "procurement_supplier_boundary",
    "warehouse_stock_boundary",
    "finance_posting_boundary",
    "field_closeout_boundary",
    "evidence_gap",
  ],
  approvalRequiredOnly: true,
  noDirectExecute: true,
  noDirectFinanceProcurementWarehouseMutation: true,
  mutationCount: 0,
  dbWrites: 0,
  providerCalled: false,
  rawRowsReturned: false,
  rawPromptReturned: false,
  rawProviderPayloadReturned: false,
  fakeRiskSignals: false,
} as const);

const BASE_PRIORITY: Readonly<Record<AiDirectorExecutiveDomain, number>> = Object.freeze({
  finance: 88,
  warehouse: 84,
  procurement: 82,
  foreman: 78,
});

const DOMAIN_SIGNAL: Readonly<Record<AiDirectorExecutiveDomain, AiDirectorRiskSignalKind>> = Object.freeze({
  procurement: "procurement_supplier_boundary",
  warehouse: "warehouse_stock_boundary",
  finance: "finance_posting_boundary",
  foreman: "field_closeout_boundary",
});

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function riskLevel(score: number): AiDirectorRiskLevel {
  if (score >= 95) return "critical";
  if (score >= 82) return "high";
  if (score >= 65) return "medium";
  return "low";
}

function evidenceRefs(summary: AiDirectorDomainEvidenceSummary): string[] {
  return unique(summary.evidenceRefs.map((ref) => `${ref.type}:${ref.ref}`));
}

function priorityScore(summary: AiDirectorDomainEvidenceSummary): number {
  const riskText = summary.crossScreenRisks.join(" ").toLowerCase();
  const approvalBoost = summary.approvalActionIds.length > 0 ? 6 : 0;
  const forbiddenBoost = summary.forbiddenActionIds.length > 0 ? 4 : 0;
  const exposureBoost = /payment|posting|supplier|stock|warehouse|publication|execution|boundary|leakage/.test(
    riskText,
  )
    ? 5
    : 0;
  const evidencePenalty = summary.evidenceBacked ? 0 : 20;

  return Math.max(
    0,
    Math.min(
      100,
      BASE_PRIORITY[summary.domain] + approvalBoost + forbiddenBoost + exposureBoost - evidencePenalty,
    ),
  );
}

function signal(params: {
  kind: AiDirectorRiskSignalKind;
  domain: AiDirectorExecutiveDomain;
  level: AiDirectorRiskLevel;
  summary: string;
  evidenceRefs: readonly string[];
}): AiDirectorRiskPrioritySignal {
  return {
    kind: params.kind,
    domain: params.domain,
    level: params.level,
    summary: params.summary,
    evidenceRefs: params.evidenceRefs,
    approvalRequired: true,
    directExecuteAllowed: false,
  };
}

function buildSignals(
  summary: AiDirectorDomainEvidenceSummary,
  level: AiDirectorRiskLevel,
  refs: readonly string[],
): AiDirectorRiskPrioritySignal[] {
  const signals: AiDirectorRiskPrioritySignal[] = [
    signal({
      kind: "cross_domain_approval_boundary",
      domain: summary.domain,
      level,
      summary: "Executive action is visible only as an evidence-backed approval candidate.",
      evidenceRefs: refs,
    }),
    signal({
      kind: DOMAIN_SIGNAL[summary.domain],
      domain: summary.domain,
      level,
      summary: summary.primaryRiskReason,
      evidenceRefs: refs,
    }),
  ];

  if (!summary.evidenceBacked || refs.length === 0) {
    signals.push(
      signal({
        kind: "evidence_gap",
        domain: summary.domain,
        level: "critical",
        summary: "Director next action is blocked until redacted evidence refs are present.",
        evidenceRefs: refs,
      }),
    );
  }

  return signals;
}

function scoreDomain(summary: AiDirectorDomainEvidenceSummary): Omit<AiDirectorDomainRiskPriorityScore, "rank"> {
  const refs = evidenceRefs(summary);
  const score = priorityScore(summary);
  const level = riskLevel(score);
  return {
    domain: summary.domain,
    riskLevel: level,
    priorityScore: score,
    summary:
      `Review ${summary.domain} next action with ${summary.approvalActionIds.length} approval route(s) and ${refs.length} evidence ref(s).`,
    evidenceRefs: refs,
    signals: buildSignals(summary, level, refs),
    approvalRequired: true,
    evidenceBacked: summary.evidenceBacked && refs.length > 0,
    safeReadOnly: true,
    directExecuteAllowed: false,
    directMutationAllowed: false,
    mutationCount: 0,
  };
}

export function scoreAiDirectorRiskPriority(
  evidence: AiDirectorCrossDomainEvidenceResult,
): AiDirectorRiskPriorityScoringResult {
  if (evidence.status === "blocked") {
    return {
      status: "blocked",
      domainScores: [],
      highRiskDomains: [],
      topDomain: null,
      evidenceBacked: false,
      riskPriorityScored: false,
      approvalRequiredOnly: true,
      noDirectExecute: true,
      noDirectFinanceProcurementWarehouseMutation: true,
      providerCalled: false,
      rawRowsReturned: false,
      rawPromptReturned: false,
      rawProviderPayloadReturned: false,
      dbWrites: 0,
      mutationCount: 0,
      fakeRiskSignals: false,
      exactReason: evidence.exactReason,
    };
  }

  const scored = evidence.domainSummaries
    .map(scoreDomain)
    .sort((left, right) => right.priorityScore - left.priorityScore)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
  const evidenceBacked =
    evidence.evidenceBacked &&
    scored.length > 0 &&
    scored.every((entry) => entry.evidenceBacked && entry.signals.every((signal) => signal.evidenceRefs.length > 0));

  return {
    status: scored.length > 0 ? "scored" : "empty",
    domainScores: scored,
    highRiskDomains: scored
      .filter((entry) => entry.riskLevel === "high" || entry.riskLevel === "critical")
      .map((entry) => entry.domain),
    topDomain: scored[0]?.domain ?? null,
    evidenceBacked,
    riskPriorityScored: scored.length > 0,
    approvalRequiredOnly: true,
    noDirectExecute: true,
    noDirectFinanceProcurementWarehouseMutation: true,
    providerCalled: false,
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
    dbWrites: 0,
    mutationCount: 0,
    fakeRiskSignals: false,
    exactReason: evidenceBacked ? null : "Director risk priority scoring requires evidence-backed domain summaries.",
  };
}
