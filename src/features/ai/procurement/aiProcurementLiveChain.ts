import type {
  ProcurementAuthContext,
  ProcurementCatalogReader,
  ProcurementSafeRequestSnapshot,
  ProcurementSupplierReader,
} from "./procurementContextTypes";
import type { ExternalIntelGateway } from "../externalIntel/ExternalIntelGateway";
import { runProcurementCopilotRuntimeChain } from "../procurementCopilot/procurementCopilotPlanEngine";
import type {
  ProcurementCopilotContextSourceOrder,
  ProcurementCopilotResolvedPlan,
} from "../procurementCopilot/procurementCopilotTypes";
import { PROCUREMENT_COPILOT_SOURCE_ORDER } from "../procurementCopilot/procurementCopilotTypes";
import {
  AI_PROCUREMENT_SUPPLIER_DECISION_POLICY,
  validateAiProcurementSupplierDecision,
  type AiProcurementSupplierDecisionValidation,
} from "./aiSupplierDecisionPolicy";
import {
  AI_PROCUREMENT_LIVE_CHAIN_EVIDENCE_CONTRACT,
  buildAiProcurementLiveChainEvidence,
  type AiProcurementLiveChainEvidence,
} from "./aiProcurementEvidenceBuilder";

export type AiProcurementLiveSupplierChainStatus = "ready" | "blocked";

export type AiProcurementLiveSupplierChainBlocker =
  | "BLOCKED_REAL_PROCUREMENT_REQUEST_NOT_AVAILABLE"
  | "BLOCKED_PROCUREMENT_LIVE_CHAIN_AUTH_OR_ROLE"
  | "BLOCKED_PROCUREMENT_LIVE_CHAIN_POLICY";

export type AiProcurementLiveSupplierChainInput = {
  auth: ProcurementAuthContext | null;
  requestId: string;
  screenId?: string;
  organizationId?: string;
  cursor?: string | null;
  requestSnapshot?: ProcurementSafeRequestSnapshot | null;
  externalRequested?: boolean;
  externalSourcePolicyIds?: readonly string[];
  searchCatalogItems?: ProcurementCatalogReader;
  listSuppliers?: ProcurementSupplierReader;
  externalGateway?: ExternalIntelGateway;
};

export type AiProcurementLiveSupplierChainResult = {
  status: AiProcurementLiveSupplierChainStatus;
  blocker: AiProcurementLiveSupplierChainBlocker | null;
  exactReason: string | null;
  resolvedPlan: ProcurementCopilotResolvedPlan | null;
  decision: AiProcurementSupplierDecisionValidation | null;
  evidence: AiProcurementLiveChainEvidence | null;
  sourceOrder: readonly ProcurementCopilotContextSourceOrder[number][];
  sourceOrderVerified: boolean;
  internalFirst: boolean;
  marketplaceSecond: boolean;
  externalLiveFetch: false;
  requestContextLoaded: boolean;
  supplierComparePerformed: boolean;
  supplierCardsCount: number;
  supplierCardsHaveEvidence: boolean;
  draftRequestCreated: boolean;
  submitForApprovalBoundaryReached: boolean;
  submitForApprovalPersisted: boolean;
  approvalBoundaryExactBlocker: string | null;
  approvalRequired: true;
  auditRequired: true;
  idempotencyRequired: true;
  mutationCount: 0;
  unsafeDomainMutationsCreated: 0;
  supplierConfirmed: false;
  orderCreated: false;
  warehouseMutated: false;
  paymentCreated: false;
  fakeSuppliersCreated: false;
  fakeMarketplaceDataCreated: false;
  fakeExternalResultsCreated: false;
  rawRowsReturned: false;
  rawPromptReturned: false;
  rawProviderPayloadReturned: false;
};

export const AI_PROCUREMENT_LIVE_SUPPLIER_CHAIN_CONTRACT = Object.freeze({
  contractId: "ai_procurement_live_supplier_chain_v1",
  sourceOrder: PROCUREMENT_COPILOT_SOURCE_ORDER,
  internalFirstRequired: true,
  marketplaceSecondRequired: true,
  draftRequestRequired: true,
  submitForApprovalBoundaryRequired: true,
  evidenceContract: AI_PROCUREMENT_LIVE_CHAIN_EVIDENCE_CONTRACT.contractId,
  supplierDecisionPolicy: AI_PROCUREMENT_SUPPLIER_DECISION_POLICY.policyId,
  externalLiveFetch: false,
  supplierConfirmationAllowed: false,
  orderCreationAllowed: false,
  warehouseMutationAllowed: false,
  paymentCreationAllowed: false,
  mutationCount: 0,
  fakeSuppliersAllowed: false,
} as const);

function sourceOrderMatches(observed: readonly ProcurementCopilotContextSourceOrder[number][]): boolean {
  return (
    observed.length === PROCUREMENT_COPILOT_SOURCE_ORDER.length &&
    PROCUREMENT_COPILOT_SOURCE_ORDER.every((step, index) => observed[index] === step)
  );
}

function blockedResult(params: {
  blocker: AiProcurementLiveSupplierChainBlocker;
  exactReason: string;
  sourceOrder?: readonly ProcurementCopilotContextSourceOrder[number][];
}): AiProcurementLiveSupplierChainResult {
  return {
    status: "blocked",
    blocker: params.blocker,
    exactReason: params.exactReason,
    resolvedPlan: null,
    decision: null,
    evidence: null,
    sourceOrder: params.sourceOrder ?? [],
    sourceOrderVerified: false,
    internalFirst: false,
    marketplaceSecond: false,
    externalLiveFetch: false,
    requestContextLoaded: false,
    supplierComparePerformed: false,
    supplierCardsCount: 0,
    supplierCardsHaveEvidence: false,
    draftRequestCreated: false,
    submitForApprovalBoundaryReached: false,
    submitForApprovalPersisted: false,
    approvalBoundaryExactBlocker: null,
    approvalRequired: true,
    auditRequired: true,
    idempotencyRequired: true,
    mutationCount: 0,
    unsafeDomainMutationsCreated: 0,
    supplierConfirmed: false,
    orderCreated: false,
    warehouseMutated: false,
    paymentCreated: false,
    fakeSuppliersCreated: false,
    fakeMarketplaceDataCreated: false,
    fakeExternalResultsCreated: false,
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
  };
}

function approvalBoundaryBlocker(resolved: ProcurementCopilotResolvedPlan): string | null {
  return resolved.submitForApprovalPreview.blocker ?? null;
}

export async function runAiProcurementLiveSupplierChain(
  input: AiProcurementLiveSupplierChainInput,
): Promise<AiProcurementLiveSupplierChainResult> {
  const steps: ProcurementCopilotContextSourceOrder[number][] = [];
  if (!input.auth || !input.auth.userId.trim() || input.auth.role === "unknown") {
    return blockedResult({
      blocker: "BLOCKED_PROCUREMENT_LIVE_CHAIN_AUTH_OR_ROLE",
      exactReason: "AI procurement live supplier chain requires authenticated role context.",
      sourceOrder: steps,
    });
  }
  if (!input.requestSnapshot) {
    return blockedResult({
      blocker: "BLOCKED_REAL_PROCUREMENT_REQUEST_NOT_AVAILABLE",
      exactReason:
        "No real procurement request snapshot was available; fake or seeded request data was not created.",
      sourceOrder: steps,
    });
  }

  const resolved = await runProcurementCopilotRuntimeChain({
    auth: input.auth,
    input: {
      requestId: input.requestId,
      screenId: input.screenId ?? "agent.procurement.live_supplier_chain",
      organizationId: input.organizationId,
      cursor: input.cursor,
      requestSnapshot: input.requestSnapshot,
      externalRequested: input.externalRequested ?? false,
      externalSourcePolicyIds: input.externalSourcePolicyIds,
      searchCatalogItems: input.searchCatalogItems,
      listSuppliers: input.listSuppliers,
      externalGateway: input.externalGateway,
      recordStep: (step) => steps.push(step),
    },
  });
  const decision = validateAiProcurementSupplierDecision(resolved);
  const evidence = buildAiProcurementLiveChainEvidence(resolved);
  const sourceOrderVerified = sourceOrderMatches(steps);
  const policyOk =
    decision.ok &&
    sourceOrderVerified &&
    resolved.procurementContext.status === "loaded" &&
    evidence.allEvidenceRefs.length > 0;

  if (!policyOk) {
    return {
      ...blockedResult({
        blocker: "BLOCKED_PROCUREMENT_LIVE_CHAIN_POLICY",
        exactReason: "AI procurement live supplier chain did not satisfy internal-first policy.",
        sourceOrder: steps,
      }),
      resolvedPlan: resolved,
      decision,
      evidence,
      sourceOrderVerified,
      internalFirst: decision.internalFirst,
      marketplaceSecond: decision.marketplaceSecond,
      requestContextLoaded: resolved.procurementContext.status === "loaded",
      supplierComparePerformed: resolved.plan.marketplaceChecked,
      supplierCardsCount: resolved.plan.supplierCards.length,
      supplierCardsHaveEvidence: decision.supplierCardsHaveEvidence,
      draftRequestCreated: decision.draftRequestReady,
      submitForApprovalBoundaryReached: decision.submitForApprovalBoundaryReached,
      approvalBoundaryExactBlocker: approvalBoundaryBlocker(resolved),
    };
  }

  return {
    status: "ready",
    blocker: null,
    exactReason: null,
    resolvedPlan: resolved,
    decision,
    evidence,
    sourceOrder: steps,
    sourceOrderVerified,
    internalFirst: true,
    marketplaceSecond: true,
    externalLiveFetch: false,
    requestContextLoaded: true,
    supplierComparePerformed: true,
    supplierCardsCount: resolved.plan.supplierCards.length,
    supplierCardsHaveEvidence: decision.supplierCardsHaveEvidence,
    draftRequestCreated: true,
    submitForApprovalBoundaryReached: true,
    submitForApprovalPersisted: resolved.submitForApprovalPreview.persisted,
    approvalBoundaryExactBlocker: approvalBoundaryBlocker(resolved),
    approvalRequired: true,
    auditRequired: true,
    idempotencyRequired: true,
    mutationCount: 0,
    unsafeDomainMutationsCreated: 0,
    supplierConfirmed: false,
    orderCreated: false,
    warehouseMutated: false,
    paymentCreated: false,
    fakeSuppliersCreated: false,
    fakeMarketplaceDataCreated: false,
    fakeExternalResultsCreated: false,
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
  };
}
