import { resolveProcurementRequestContext } from "../procurement/procurementRequestContextResolver";
import { previewProcurementSupplierMatch } from "../procurement/procurementSupplierMatchEngine";
import type {
  ProcurementRequestContext,
  SupplierMatchPreviewInput,
} from "../procurement/procurementContextTypes";
import {
  buildProcurementCopilotNoMutationProof,
  previewProcurementCopilotSubmitForApproval,
  resolveProcurementCopilotRoleDecision,
} from "./procurementCopilotActionPolicy";
import { buildProcurementCopilotDraftPreview } from "./procurementCopilotDraftBridge";
import {
  assertProcurementCopilotSupplierEvidence,
  mapMarketplaceSupplierCards,
  mergeProcurementCopilotEvidenceRefs,
  procurementCopilotInternalEvidenceIds,
} from "./procurementCopilotEvidence";
import { previewProcurementCopilotExternalIntel } from "./procurementCopilotExternalBridge";
import type {
  ProcurementCopilotContext,
  ProcurementCopilotPlan,
  ProcurementCopilotPlanRequest,
  ProcurementCopilotResolvedPlan,
} from "./procurementCopilotTypes";
import {
  normalizeProcurementCopilotOptionalText,
  uniqueProcurementCopilotRefs,
} from "./procurementCopilotRedaction";
import { toCopilotRequestedItems } from "./procurementCopilotTypes";

const DEFAULT_SCREEN_ID = "ai.procurement.copilot";

function toCopilotContext(context: ProcurementRequestContext): ProcurementCopilotContext {
  return {
    status: context.status,
    role: context.role,
    screenId: context.screenId,
    requestIdHash: context.requestIdHash,
    projectLabel: normalizeProcurementCopilotOptionalText(context.projectSummary.title),
    requestedItems: toCopilotRequestedItems(context.requestedItems),
    internalEvidenceRefs: context.internalEvidenceRefs,
    missingFields: context.missingFields,
    approvalRequired: true,
  };
}

function emptySupplierInput(context: ProcurementRequestContext): SupplierMatchPreviewInput {
  return {
    requestIdHash: context.requestIdHash,
    items: context.requestedItems.map((item) => ({
      materialLabel: item.materialLabel,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
    })),
    location: context.projectSummary.locationBucket,
    limit: 10,
  };
}

function blockedPlan(_reason: string, evidenceRefs: readonly string[] = []): ProcurementCopilotPlan {
  return {
    status: "blocked",
    internalDataChecked: true,
    marketplaceChecked: false,
    externalIntelStatus: "blocked",
    summary: "Procurement copilot preview is blocked by policy.",
    supplierCards: [],
    recommendedNextAction: "blocked",
    requiresApproval: true,
    evidenceRefs: uniqueProcurementCopilotRefs([...evidenceRefs]),
  };
}

function emptyPlan(_reason: string, evidenceRefs: readonly string[]): ProcurementCopilotPlan {
  return {
    status: "empty",
    internalDataChecked: true,
    marketplaceChecked: false,
    externalIntelStatus: "not_needed",
    summary: "No active procurement request items are available for analysis.",
    supplierCards: [],
    recommendedNextAction: "explain",
    requiresApproval: true,
    evidenceRefs: uniqueProcurementCopilotRefs([...evidenceRefs]),
  };
}

function statusFromSupplierStatus(status: "loaded" | "empty" | "blocked"): ProcurementCopilotPlan["status"] {
  if (status === "loaded") return "ready";
  if (status === "empty") return "empty";
  return "blocked";
}

export function resolveProcurementCopilotContext(
  request: ProcurementCopilotPlanRequest,
): {
  procurementContext: ProcurementRequestContext;
  context: ProcurementCopilotContext;
} {
  request.input.recordStep?.("internal_request_context");
  const procurementContext = resolveProcurementRequestContext({
    auth: request.auth,
    requestId: request.input.requestId,
    screenId: request.input.screenId || DEFAULT_SCREEN_ID,
    cursor: request.input.cursor,
    organizationId: request.input.organizationId,
    requestSnapshot: request.input.requestSnapshot,
  });
  return {
    procurementContext,
    context: toCopilotContext(procurementContext),
  };
}

export async function buildProcurementCopilotPlan(
  request: ProcurementCopilotPlanRequest,
): Promise<{
  procurementContext: ProcurementRequestContext;
  context: ProcurementCopilotContext;
  plan: ProcurementCopilotPlan;
  proof: ReturnType<typeof buildProcurementCopilotNoMutationProof>;
}> {
  const roleDecision = resolveProcurementCopilotRoleDecision(request.auth);
  const { procurementContext, context } = resolveProcurementCopilotContext(request);
  const internalEvidenceRefs = procurementCopilotInternalEvidenceIds(procurementContext);

  if (!roleDecision.allowed || procurementContext.status === "blocked") {
    return {
      procurementContext,
      context,
      plan: blockedPlan(roleDecision.reason, internalEvidenceRefs),
      proof: buildProcurementCopilotNoMutationProof(),
    };
  }

  if (procurementContext.requestedItems.length === 0) {
    return {
      procurementContext,
      context,
      plan: emptyPlan("items", internalEvidenceRefs),
      proof: buildProcurementCopilotNoMutationProof(),
    };
  }

  request.input.recordStep?.("internal_marketplace");
  const supplierResult = await previewProcurementSupplierMatch({
    auth: request.auth,
    context: procurementContext,
    input: emptySupplierInput(procurementContext),
    externalRequested: false,
    searchCatalogItems: request.input.searchCatalogItems,
    listSuppliers: request.input.listSuppliers,
  });
  request.input.recordStep?.("compare_suppliers");

  const supplierEvidence = supplierResult.output.evidenceRefs;
  request.input.recordStep?.("external_intel_status");
  const externalPreview = await previewProcurementCopilotExternalIntel({
    auth: request.auth,
    items: procurementContext.requestedItems,
    location: procurementContext.projectSummary.locationBucket,
    internalEvidenceRefs,
    marketplaceChecked: supplierResult.output.marketplaceChecked,
    externalRequested: request.input.externalRequested ?? true,
    sourcePolicyIds: request.input.externalSourcePolicyIds,
    externalGateway: request.input.externalGateway,
  });

  const supplierCards = [
    ...mapMarketplaceSupplierCards(supplierResult.output.supplierCards),
    ...externalPreview.supplierCards,
  ];
  const evidenceRefs = mergeProcurementCopilotEvidenceRefs(
    internalEvidenceRefs,
    supplierEvidence,
    externalPreview.evidenceRefs,
  );
  const evidenceViolations = assertProcurementCopilotSupplierEvidence({
    status: statusFromSupplierStatus(supplierResult.output.status),
    internalDataChecked: true,
    marketplaceChecked: supplierResult.output.marketplaceChecked,
    externalIntelStatus: externalPreview.status,
    summary: supplierResult.output.recommendationSummary,
    supplierCards,
    recommendedNextAction: supplierResult.output.nextAction,
    requiresApproval: true,
    evidenceRefs,
  });
  const status =
    supplierResult.output.status === "blocked" || evidenceViolations.length > 0
      ? "blocked"
      : supplierCards.length > 0
        ? "ready"
        : "empty";
  const recommendedNextAction =
    status === "ready" ? "draft_request" : status === "empty" ? "explain" : "blocked";

  return {
    procurementContext,
    context,
    plan: {
      status,
      internalDataChecked: true,
      marketplaceChecked: supplierResult.output.marketplaceChecked,
      externalIntelStatus: externalPreview.status,
      summary: supplierResult.output.recommendationSummary,
      supplierCards,
      recommendedNextAction,
      requiresApproval: true,
      evidenceRefs: uniqueProcurementCopilotRefs([...evidenceRefs, ...evidenceViolations]),
    },
    proof: buildProcurementCopilotNoMutationProof(supplierResult.proof.toolsCalled),
  };
}

export async function runProcurementCopilotRuntimeChain(
  request: ProcurementCopilotPlanRequest,
): Promise<ProcurementCopilotResolvedPlan> {
  const planned = await buildProcurementCopilotPlan(request);
  request.input.recordStep?.("draft_request_preview");
  const draftPreview = await buildProcurementCopilotDraftPreview({
    auth: request.auth,
    input: {
      context: planned.context,
      plan: planned.plan,
      title: planned.context.projectLabel,
    },
  });
  request.input.recordStep?.("approval_boundary");
  const submitForApprovalPreview = previewProcurementCopilotSubmitForApproval({
    draftId: `draft:${planned.context.requestIdHash ?? "missing"}`,
    requestIdHash: planned.context.requestIdHash,
    screenId: planned.context.screenId,
    summary: planned.plan.summary,
    idempotencyKey: `copilot:${planned.context.requestIdHash ?? "missing"}`,
    evidenceRefs: planned.plan.evidenceRefs,
  });

  return {
    context: planned.context,
    procurementContext: planned.procurementContext,
    plan: planned.plan,
    draftPreview,
    submitForApprovalPreview,
    proof: {
      ...planned.proof,
      toolsCalled:
        draftPreview.status === "draft_ready"
          ? [...planned.proof.toolsCalled, "draft_request"]
          : planned.proof.toolsCalled,
    },
  };
}
