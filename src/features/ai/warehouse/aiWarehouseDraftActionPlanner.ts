import type {
  AiWarehouseCopilotAuthContext,
  AiWarehouseDraftAction,
} from "./aiWarehouseCopilotTypes";
import { draftAiWarehouseAction } from "./aiWarehouseDraftActions";
import type {
  AiWarehouseEvidenceResolverResult,
} from "./aiWarehouseEvidenceResolver";
import type {
  AiWarehouseRiskClassifierResult,
} from "./aiWarehouseRiskClassifier";

export type AiWarehouseDraftActionKind =
  | "explain_stock"
  | "draft_restock_request"
  | "draft_incoming_receipt_note"
  | "draft_issue_request_rationale";

export type AiWarehouseDraftActionPlanItem = {
  kind: AiWarehouseDraftActionKind;
  title: string;
  summary: string;
  evidenceRefs: readonly string[];
  approvalCandidateExpected: boolean;
  draftOnly: true;
  directExecutionAllowed: false;
  finalIssueAllowed: false;
  finalReceiveAllowed: false;
  stockMutationAllowed: false;
};

export type AiWarehouseDraftActionPlannerResult = {
  status: "planned" | "empty" | "blocked";
  draftAction: AiWarehouseDraftAction | null;
  planItems: readonly AiWarehouseDraftActionPlanItem[];
  evidenceBacked: boolean;
  draftOnly: true;
  approvalCandidateExpected: boolean;
  directExecutionAllowed: false;
  finalIssueAllowed: false;
  finalReceiveAllowed: false;
  stockMutationAllowed: false;
  stockMutated: false;
  reservationCreated: false;
  movementCreated: false;
  mutationCount: 0;
  dbWrites: 0;
  providerCalled: false;
  rawRowsReturned: false;
  rawPromptReturned: false;
  rawProviderPayloadReturned: false;
  fakeDraftCreated: false;
  exactReason: string | null;
};

export const AI_WAREHOUSE_DRAFT_ACTION_PLANNER_CONTRACT = Object.freeze({
  contractId: "ai_warehouse_draft_action_planner_v1",
  draftOnly: true,
  approvalCandidateExpected: true,
  directExecutionAllowed: false,
  finalIssueAllowed: false,
  finalReceiveAllowed: false,
  stockMutationAllowed: false,
  stockMutated: false,
  reservationCreated: false,
  movementCreated: false,
  mutationCount: 0,
  dbWrites: 0,
  providerCalled: false,
  rawRowsReturned: false,
  rawPromptReturned: false,
  rawProviderPayloadReturned: false,
  fakeDraftCreated: false,
} as const);

function evidenceIds(result: AiWarehouseEvidenceResolverResult): string[] {
  return result.evidenceRefs.map((ref) => `${ref.type}:${ref.ref}`);
}

function planItem(params: {
  kind: AiWarehouseDraftActionKind;
  title: string;
  summary: string;
  evidenceRefs: readonly string[];
  approvalCandidateExpected?: boolean;
}): AiWarehouseDraftActionPlanItem {
  return {
    kind: params.kind,
    title: params.title,
    summary: params.summary,
    evidenceRefs: [...params.evidenceRefs],
    approvalCandidateExpected: params.approvalCandidateExpected ?? true,
    draftOnly: true,
    directExecutionAllowed: false,
    finalIssueAllowed: false,
    finalReceiveAllowed: false,
    stockMutationAllowed: false,
  };
}

function planItemsForScreen(params: {
  evidence: AiWarehouseEvidenceResolverResult;
  risk: AiWarehouseRiskClassifierResult;
}): AiWarehouseDraftActionPlanItem[] {
  const refs = evidenceIds(params.evidence);
  if (refs.length === 0) return [];

  const explainStock = planItem({
    kind: "explain_stock",
    title: "Explain warehouse stock status",
    summary: params.evidence.evidenceSummary.stockStatus,
    evidenceRefs: refs,
    approvalCandidateExpected: false,
  });
  if (params.evidence.screenId === "warehouse.incoming") {
    return [
      explainStock,
      planItem({
        kind: "draft_incoming_receipt_note",
        title: "Draft incoming receipt note",
        summary: params.evidence.evidenceSummary.incomingStatus,
        evidenceRefs: refs,
      }),
    ];
  }
  if (params.evidence.screenId === "warehouse.issue") {
    return [
      explainStock,
      planItem({
        kind: "draft_issue_request_rationale",
        title: "Draft issue request rationale",
        summary: params.evidence.evidenceSummary.issueStatus,
        evidenceRefs: refs,
      }),
    ];
  }
  return [
    explainStock,
    planItem({
      kind: "draft_restock_request",
      title: "Draft restock request",
      summary:
        params.risk.riskLevel === "low"
          ? "Draft a watch note from warehouse stock evidence."
          : "Draft a restock or stock review request from warehouse risk evidence.",
      evidenceRefs: refs,
    }),
  ];
}

function blockedResult(reason: string): AiWarehouseDraftActionPlannerResult {
  return {
    status: "blocked",
    draftAction: null,
    planItems: [],
    evidenceBacked: false,
    draftOnly: true,
    approvalCandidateExpected: true,
    directExecutionAllowed: false,
    finalIssueAllowed: false,
    finalReceiveAllowed: false,
    stockMutationAllowed: false,
    stockMutated: false,
    reservationCreated: false,
    movementCreated: false,
    mutationCount: 0,
    dbWrites: 0,
    providerCalled: false,
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
    fakeDraftCreated: false,
    exactReason: reason,
  };
}

export async function planAiWarehouseDraftActions(params: {
  auth: AiWarehouseCopilotAuthContext | null;
  evidence: AiWarehouseEvidenceResolverResult;
  risk: AiWarehouseRiskClassifierResult;
}): Promise<AiWarehouseDraftActionPlannerResult> {
  if (!params.auth || params.auth.userId.trim().length === 0 || params.auth.role !== params.evidence.role) {
    return blockedResult("Warehouse draft planner requires the original authenticated role context.");
  }
  if (params.evidence.status === "blocked" || params.risk.status === "blocked") {
    return blockedResult(params.evidence.exactReason ?? params.risk.exactReason ?? "Warehouse draft planning is blocked.");
  }

  const planItems = planItemsForScreen(params);
  if (planItems.length === 0 || !params.evidence.warehouseStatus) {
    return {
      ...blockedResult("No redacted warehouse evidence is available for draft planning."),
      status: "empty",
      planItems,
    };
  }

  const draftAction = await draftAiWarehouseAction({
    auth: params.auth,
    input: { warehouseStatus: params.evidence.warehouseStatus },
  });
  const evidenceBacked =
    planItems.every((entry) => entry.evidenceRefs.length > 0) &&
    draftAction.evidenceBacked === true;
  const status = evidenceBacked && draftAction.status !== "blocked" ? "planned" : "empty";

  return {
    status,
    draftAction,
    planItems,
    evidenceBacked,
    draftOnly: true,
    approvalCandidateExpected: planItems.some((entry) => entry.approvalCandidateExpected),
    directExecutionAllowed: false,
    finalIssueAllowed: false,
    finalReceiveAllowed: false,
    stockMutationAllowed: false,
    stockMutated: false,
    reservationCreated: false,
    movementCreated: false,
    mutationCount: 0,
    dbWrites: 0,
    providerCalled: false,
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
    fakeDraftCreated: false,
    exactReason: status === "planned" ? null : "Warehouse draft planner requires evidence-backed draft action output.",
  };
}
