import { buildProcurementDraftPreview } from "../procurement/procurementDraftPlanBuilder";
import type { ProcurementDraftPreviewInput } from "../procurement/procurementContextTypes";
import type {
  ProcurementCopilotDraftBridgeRequest,
  ProcurementCopilotDraftPreview,
} from "./procurementCopilotTypes";
import {
  normalizeProcurementCopilotOptionalText,
  uniqueProcurementCopilotRefs,
} from "./procurementCopilotRedaction";

function firstSupplierByEvidence(
  plan: ProcurementCopilotDraftBridgeRequest["input"]["plan"],
  itemEvidenceRefs: readonly string[],
): string | undefined {
  return plan.supplierCards.find((card) =>
    card.evidenceRefs.some((ref) => itemEvidenceRefs.includes(ref)),
  )?.supplierLabel;
}

export async function buildProcurementCopilotDraftPreview(
  request: ProcurementCopilotDraftBridgeRequest,
): Promise<ProcurementCopilotDraftPreview> {
  const context = request.input.context;
  const plan = request.input.plan;
  const evidenceRefs = uniqueProcurementCopilotRefs([
    ...plan.evidenceRefs,
    ...context.internalEvidenceRefs.map((ref) => ref.id),
  ]);
  const title =
    normalizeProcurementCopilotOptionalText(request.input.title) ??
    normalizeProcurementCopilotOptionalText(context.projectLabel) ??
    `Procurement draft ${context.requestIdHash ?? "preview"}`;
  const input: ProcurementDraftPreviewInput = {
    requestIdHash: context.requestIdHash,
    title,
    items: context.requestedItems.map((item) => ({
      materialLabel: item.materialLabel,
      quantity: item.quantity,
      unit: item.unit,
      supplierLabel: firstSupplierByEvidence(plan, evidenceRefs),
    })),
    deliveryWindow: request.input.deliveryWindow,
    notes: request.input.notes,
    evidenceRefs,
  };
  const result = await buildProcurementDraftPreview({
    auth: request.auth,
    input,
  });

  return result.output;
}
