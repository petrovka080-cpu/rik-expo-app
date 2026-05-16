import type { AssistantContext, AssistantRole } from "../assistant.types";
import type { AccountantPaymentAssistantEvidence } from "../finance/aiAccountantTodayPaymentAssistant";
import type { DirectorDecisionEvidence } from "../director/aiDirectorTodayDecisionAssistant";
import type { DocumentReadySummaryEvidence } from "../documents/aiDocumentReadySummaryAssistant";
import type { ForemanCloseoutEvidence } from "../foreman/aiForemanTodayCloseoutAssistant";
import type { ProcurementReadyBuyOptionBundle } from "../procurement/aiProcurementReadyBuyOptionTypes";
import type { WarehouseTodayOpsEvidence } from "../warehouse/aiWarehouseTodayOpsAssistant";
import { resolveDefaultRoleAssistantScreenId } from "./aiRoleScreenAssistantRegistry";
import type { AiRoleScreenAssistantHydrationRequest } from "./aiRoleScreenAssistantTypes";

export type AiRoleScreenAssistantHydratedContext = {
  role: AssistantRole;
  context: AssistantContext;
  screenId: string;
  scopedFactsSummary: string | null;
  readyBuyBundle: ProcurementReadyBuyOptionBundle | null;
  finance: {
    payments: AccountantPaymentAssistantEvidence[];
    totalAmountLabel?: string;
    waitingApprovalCount?: number;
  };
  warehouse: {
    items: WarehouseTodayOpsEvidence[];
    stockRiskCount?: number;
    incomingCount?: number;
    blockedIssueCount?: number;
    disputedCount?: number;
  };
  foreman: {
    items: ForemanCloseoutEvidence[];
    closeoutReadyCount?: number;
    missingEvidenceCount?: number;
  };
  director: {
    decisions: DirectorDecisionEvidence[];
    approvalCount?: number;
    blocksWorkCount?: number;
  };
  documents: {
    document: DocumentReadySummaryEvidence | null;
  };
};

function firstParam(params: Record<string, string | string[] | undefined> | undefined, key: string): string | undefined {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function numberParam(
  params: Record<string, string | string[] | undefined> | undefined,
  key: string,
): number | undefined {
  const value = clean(firstParam(params, key)).replace(/\s+/g, "");
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function splitParam(
  params: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string[] {
  return clean(firstParam(params, key))
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildFinancePayments(
  params: Record<string, string | string[] | undefined> | undefined,
): AccountantPaymentAssistantEvidence[] {
  const supplier = clean(firstParam(params, "paymentSupplierName") || firstParam(params, "criticalSupplierName"));
  const amountLabel = clean(firstParam(params, "paymentAmountLabel") || firstParam(params, "criticalAmountLabel"));
  const riskReason = clean(firstParam(params, "paymentRisk") || firstParam(params, "criticalRisk"));
  const missingDocument = clean(firstParam(params, "paymentMissingDocument") || firstParam(params, "missingDocument"));
  const evidence = splitParam(params, "paymentEvidence");
  if (!supplier && !amountLabel && !riskReason && !missingDocument && evidence.length === 0) return [];
  return [{
    id: clean(firstParam(params, "paymentId")) || "screen-payment",
    supplierName: supplier || "Платёж из read-only среза",
    amountLabel: amountLabel || undefined,
    requestId: clean(firstParam(params, "paymentRequestId")) || undefined,
    riskReason: riskReason || undefined,
    missingDocument: missingDocument || undefined,
    approvalStatus: clean(firstParam(params, "paymentApprovalStatus")) === "ready_for_approval"
      ? "ready_for_approval"
      : riskReason
        ? "needs_check"
        : undefined,
    evidence: evidence.length ? evidence : ["screen:param:payment"],
  }];
}

function buildWarehouseItems(
  params: Record<string, string | string[] | undefined> | undefined,
): WarehouseTodayOpsEvidence[] {
  const title = clean(firstParam(params, "warehouseItemTitle"));
  const riskReason = clean(firstParam(params, "warehouseRisk"));
  const missingDocument = clean(firstParam(params, "warehouseMissingDocument"));
  const evidence = splitParam(params, "warehouseEvidence");
  if (!title && !riskReason && !missingDocument && evidence.length === 0) return [];
  return [{
    id: clean(firstParam(params, "warehouseItemId")) || "screen-warehouse-item",
    title: title || "Складская позиция из read-only среза",
    linkedRequestId: clean(firstParam(params, "warehouseRequestId")) || undefined,
    riskReason: riskReason || undefined,
    missingDocument: missingDocument || undefined,
    evidence: evidence.length ? evidence : ["screen:param:warehouse"],
  }];
}

function buildForemanItems(
  params: Record<string, string | string[] | undefined> | undefined,
): ForemanCloseoutEvidence[] {
  const title = clean(firstParam(params, "foremanItemTitle"));
  const missingEvidence = clean(firstParam(params, "foremanMissingEvidence"));
  const riskReason = clean(firstParam(params, "foremanRisk"));
  const evidence = splitParam(params, "foremanEvidence");
  if (!title && !missingEvidence && !riskReason && evidence.length === 0) return [];
  return [{
    id: clean(firstParam(params, "foremanItemId")) || "screen-foreman-item",
    title: title || "Работа из read-only среза",
    missingEvidence: missingEvidence || undefined,
    riskReason: riskReason || undefined,
    evidence: evidence.length ? evidence : ["screen:param:foreman"],
  }];
}

function buildDirectorDecisions(
  params: Record<string, string | string[] | undefined> | undefined,
): DirectorDecisionEvidence[] {
  const title = clean(firstParam(params, "directorDecisionTitle"));
  const reason = clean(firstParam(params, "directorDecisionReason"));
  const evidence = splitParam(params, "directorEvidence");
  if (!title && !reason && evidence.length === 0) return [];
  return [{
    id: clean(firstParam(params, "directorDecisionId")) || "screen-director-decision",
    title: title || "Решение из read-only среза",
    reason: reason || "Нужна проверка evidence перед решением.",
    severity: clean(firstParam(params, "directorDecisionSeverity")) === "critical" ? "critical" : "high",
    evidence: evidence.length ? evidence : ["screen:param:director"],
  }];
}

function buildDocumentEvidence(
  params: Record<string, string | string[] | undefined> | undefined,
): DocumentReadySummaryEvidence | null {
  const title = clean(firstParam(params, "documentTitle"));
  const evidence = splitParam(params, "documentEvidence");
  if (!title && evidence.length === 0) return null;
  return {
    id: clean(firstParam(params, "documentId")) || "screen-document",
    title: title || "Документ из read-only среза",
    linkedRequestId: clean(firstParam(params, "documentRequestId")) || undefined,
    linkedPaymentLabel: clean(firstParam(params, "documentPaymentLabel")) || undefined,
    importantFields: splitParam(params, "documentImportantFields"),
    missingEvidence: splitParam(params, "documentMissingEvidence"),
    risks: splitParam(params, "documentRisks"),
    evidence: evidence.length ? evidence : ["screen:param:document"],
  };
}

export function hydrateAiRoleScreenAssistantContext(
  request: AiRoleScreenAssistantHydrationRequest,
): AiRoleScreenAssistantHydratedContext {
  const params = request.searchParams;
  const explicitScreenId = clean(request.screenId || firstParam(params, "screenId"));
  const screenId = explicitScreenId || resolveDefaultRoleAssistantScreenId(request.context);

  return {
    role: request.role,
    context: request.context,
    screenId,
    scopedFactsSummary: request.scopedFactsSummary ?? null,
    readyBuyBundle: request.readyBuyBundle ?? null,
    finance: {
      payments: buildFinancePayments(params),
      totalAmountLabel: clean(firstParam(params, "paymentTotalAmountLabel") || firstParam(params, "todayAmountLabel")) || undefined,
      waitingApprovalCount: numberParam(params, "paymentApprovalCount"),
    },
    warehouse: {
      items: buildWarehouseItems(params),
      stockRiskCount: numberParam(params, "stockRiskCount"),
      incomingCount: numberParam(params, "incomingCount"),
      blockedIssueCount: numberParam(params, "blockedIssueCount"),
      disputedCount: numberParam(params, "disputedCount"),
    },
    foreman: {
      items: buildForemanItems(params),
      closeoutReadyCount: numberParam(params, "closeoutReadyCount"),
      missingEvidenceCount: numberParam(params, "missingEvidenceCount"),
    },
    director: {
      decisions: buildDirectorDecisions(params),
      approvalCount: numberParam(params, "approvalCount"),
      blocksWorkCount: numberParam(params, "blocksWorkCount"),
    },
    documents: {
      document: buildDocumentEvidence(params),
    },
  };
}
