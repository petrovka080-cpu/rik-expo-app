import type { ProcurementRequestContext } from "../procurement/procurementContextTypes";
import type {
  ProcurementCopilotPlan,
  ProcurementCopilotSupplierCard,
} from "./procurementCopilotTypes";
import {
  hashProcurementCopilotOpaqueId,
  normalizeProcurementCopilotLabel,
  uniqueProcurementCopilotRefs,
} from "./procurementCopilotRedaction";

export function procurementCopilotInternalEvidenceIds(
  context: ProcurementRequestContext,
): string[] {
  return uniqueProcurementCopilotRefs(context.internalEvidenceRefs.map((ref) => ref.id));
}

export function buildProcurementCopilotItemEvidenceRefs(params: {
  requestIdHash?: string;
  itemLabels: readonly string[];
}): string[] {
  const requestRef = params.requestIdHash ? [`internal_app:request:${params.requestIdHash}`] : [];
  const itemRefs = params.itemLabels.map((label, index) =>
    `internal_app:item:${hashProcurementCopilotOpaqueId("copilot_item", `${index}:${label}`)}`,
  );
  return uniqueProcurementCopilotRefs([...requestRef, ...itemRefs]);
}

export function mergeProcurementCopilotEvidenceRefs(
  ...groups: readonly (readonly string[] | undefined)[]
): string[] {
  return uniqueProcurementCopilotRefs(groups.flatMap((group) => [...(group ?? [])]));
}

export function mapMarketplaceSupplierCards(
  cards: readonly {
    supplierLabel: string;
    priceBucket?: "low" | "medium" | "high" | "unknown";
    deliveryBucket?: "fast" | "normal" | "slow" | "unknown";
    availabilityBucket?: "available" | "limited" | "unknown";
    riskFlags: string[];
    evidenceRefs: string[];
  }[],
): ProcurementCopilotSupplierCard[] {
  return cards
    .filter((card) => card.evidenceRefs.some((ref) => ref.trim().length > 0))
    .map((card) => ({
      supplierLabel: normalizeProcurementCopilotLabel(card.supplierLabel, "supplier_candidate"),
      source: "marketplace",
      priceBucket: card.priceBucket,
      deliveryBucket: card.deliveryBucket,
      availabilityBucket: card.availabilityBucket,
      riskFlags: uniqueProcurementCopilotRefs(card.riskFlags),
      evidenceRefs: uniqueProcurementCopilotRefs(card.evidenceRefs),
    }));
}

export function assertProcurementCopilotSupplierEvidence(
  plan: ProcurementCopilotPlan,
): string[] {
  return plan.supplierCards.flatMap((card, index) =>
    card.evidenceRefs.length > 0 ? [] : [`supplier_card_${index}_missing_evidence`],
  );
}
