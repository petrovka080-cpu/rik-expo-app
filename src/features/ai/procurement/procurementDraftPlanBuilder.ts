import { runDraftRequestToolDraftOnly } from "../tools/draftRequestTool";
import type {
  ProcurementAuthContext,
  ProcurementDraftPreviewInput,
  ProcurementDraftPreviewResult,
  ProcurementNoMutationProof,
  ProcurementSafeToolName,
} from "./procurementContextTypes";
import { canUseProcurementRequestContext } from "./procurementRequestContextResolver";
import {
  normalizeProcurementLabel,
  normalizeProcurementOptionalText,
  normalizeProcurementPositiveNumber,
  uniqueProcurementRefs,
} from "./procurementRedaction";

export type ProcurementDraftPlanBuilderRequest = {
  auth: ProcurementAuthContext | null;
  input: ProcurementDraftPreviewInput;
};

function proof(toolsCalled: readonly ProcurementSafeToolName[]): ProcurementNoMutationProof {
  return {
    toolsCalled,
    mutationCount: 0,
    finalMutationAllowed: false,
    supplierSelectionAllowed: false,
    orderCreationAllowed: false,
    warehouseMutationAllowed: false,
    externalResultCanFinalize: false,
  };
}

function blockedDraft(reason: string, evidenceRefs: readonly string[] = []): ProcurementDraftPreviewResult {
  return {
    output: {
      status: "blocked",
      draftPreview: {
        title: "Procurement draft preview",
        items: [],
        notes: [],
      },
      missingFields: [reason],
      riskFlags: ["draft_blocked"],
      evidenceRefs: uniqueProcurementRefs([...evidenceRefs]),
      requiresApproval: true,
      nextAction: "submit_for_approval",
    },
    proof: proof([]),
  };
}

export async function buildProcurementDraftPreview(
  request: ProcurementDraftPlanBuilderRequest,
): Promise<ProcurementDraftPreviewResult> {
  if (!request.auth || !canUseProcurementRequestContext(request.auth.role)) {
    return blockedDraft("role_scope_denied", request.input.evidenceRefs);
  }

  const items = request.input.items
    .map((item, index) => ({
      materialLabel: normalizeProcurementLabel(item.materialLabel, `item_${index + 1}`),
      quantity: normalizeProcurementPositiveNumber(item.quantity),
      unit: normalizeProcurementOptionalText(item.unit),
      supplierLabel: normalizeProcurementOptionalText(item.supplierLabel ?? request.input.supplierLabel),
    }))
    .filter((item) => item.materialLabel.length > 0)
    .slice(0, 50);

  if (items.length === 0) {
    return blockedDraft("items", request.input.evidenceRefs);
  }

  const toolsCalled: ProcurementSafeToolName[] = ["draft_request"];
  const draftResult = await runDraftRequestToolDraftOnly({
    auth: request.auth,
    input: {
      project_id: request.input.projectIdHash ?? request.input.requestIdHash ?? "",
      delivery_window: request.input.deliveryWindow,
      notes: request.input.notes,
      preferred_supplier_id: request.input.supplierLabel,
      items: items.map((item) => ({
        name: item.materialLabel,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.supplierLabel ? `supplier_label:${item.supplierLabel}` : undefined,
      })),
    },
  });

  if (!draftResult.ok) {
    return {
      ...blockedDraft("draft_request_policy_blocked", request.input.evidenceRefs),
      proof: proof(toolsCalled),
    };
  }

  const evidenceRefs = uniqueProcurementRefs([
    ...(request.input.evidenceRefs ?? []),
    ...draftResult.data.evidence_refs,
  ]);
  const title =
    normalizeProcurementOptionalText(request.input.title) ??
    `Procurement draft ${request.input.requestIdHash ?? request.input.projectIdHash ?? "preview"}`;

  return {
    output: {
      status: "draft_ready",
      draftPreview: {
        title,
        items,
        notes: [
          draftResult.data.draft_preview,
          "Approval is required before any final procurement action.",
        ],
      },
      missingFields: draftResult.data.missing_fields,
      riskFlags: draftResult.data.risk_flags,
      evidenceRefs,
      requiresApproval: true,
      nextAction: "submit_for_approval",
    },
    proof: proof(toolsCalled),
  };
}
