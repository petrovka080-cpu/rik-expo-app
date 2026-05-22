import type { GlobalEstimateResult } from "../ai/globalEstimate";
import { createGlobalEstimateProductionTraceEvent } from "../ai/globalEstimate";
import { createConsumerRepairRequestDraft } from "./consumerRequestService";
import type { ConsumerRepairAiDraft, ConsumerRepairDraftBundle, ConsumerRepairItemType } from "./consumerRequestTypes";

const DANGEROUS_CATEGORIES = new Set(["electrical", "roofing", "demolition", "foundation", "concrete"]);

function itemTypeFor(sectionType: string): ConsumerRepairItemType {
  if (sectionType === "materials") return "material";
  if (sectionType === "labor") return "work";
  if (sectionType === "delivery" || sectionType === "equipment") return "service";
  return "other";
}

function isDangerousEstimate(result: GlobalEstimateResult): boolean {
  return result.requiresReview && DANGEROUS_CATEGORIES.has(result.work.category);
}

export function buildConsumerRepairAiDraftFromGlobalEstimate(result: GlobalEstimateResult): ConsumerRepairAiDraft {
  const dangerous = isDangerousEstimate(result);
  return {
    titleRu: result.work.title,
    summaryRu: [
      `Backend global estimate ${result.estimateId}.`,
      `Grand total: ${result.totals.displayGrandTotal}.`,
      `Tax status: ${result.tax.taxLabel}${result.tax.warning ? `; ${result.tax.warning}` : ""}.`,
      `Confidence: ${result.confidence}.`,
      "Human confirmation is required before marketplace send.",
    ].join(" "),
    repairType: result.work.category,
    dangerousDiyBlocked: dangerous,
    safetyMessageRu: dangerous
      ? "Safety-sensitive work: no DIY instructions are provided. Use this as an estimate/request for a qualified specialist."
      : undefined,
    missingData: result.clarifyingQuestions,
    items: result.sections.flatMap((section) =>
      section.rows.map((row) => ({
        itemType: itemTypeFor(section.type),
        titleRu: `${row.rowNumber} ${row.name}`,
        quantity: row.quantity,
        unit: row.unit,
        unitPrice: row.unitPrice,
        currency: row.currency,
        source: "reference_price_book" as const,
      })),
    ),
  };
}

export function createConsumerRepairDraftFromGlobalEstimate(input: {
  consumerUserId: string;
  estimate: GlobalEstimateResult;
  originalText: string;
  city?: string | null;
  addressText?: string | null;
  contactPhone?: string | null;
}): ConsumerRepairDraftBundle {
  const aiDraft = buildConsumerRepairAiDraftFromGlobalEstimate(input.estimate);
  return createConsumerRepairRequestDraft({
    consumerUserId: input.consumerUserId,
    problemText: input.originalText,
    repairType: input.estimate.work.category,
    city: input.city ?? input.estimate.locale.city ?? null,
    addressText: input.addressText ?? null,
    contactPhone: input.contactPhone ?? null,
    aiDraft,
  });
}

export function assertConsumerRepairGlobalEstimateDraftSafe(bundle: ConsumerRepairDraftBundle): void {
  if (bundle.draft.orgId != null) {
    throw new Error("GLOBAL_ESTIMATE_B2C_DRAFT_MUST_NOT_LINK_OFFICE_OR_COMPANY");
  }
  if (bundle.items.length < 1 || !bundle.items.every((item) => item.source === "reference_price_book")) {
    throw new Error("GLOBAL_ESTIMATE_B2C_DRAFT_REQUIRES_BACKEND_ESTIMATE_ITEMS");
  }
  if (!bundle.items.every((item) => item.editableByConsumer)) {
    throw new Error("GLOBAL_ESTIMATE_B2C_DRAFT_ITEMS_MUST_REMAIN_EDITABLE");
  }
}

export function createGlobalEstimateB2cDraftTrace(bundle: ConsumerRepairDraftBundle) {
  return createGlobalEstimateProductionTraceEvent({
    event: "b2c_draft_created",
    result: "success",
    metadata: {
      status: bundle.draft.status,
      itemCount: bundle.items.length,
      hasOfficeOrg: bundle.draft.orgId != null,
      marketplaceStatus: bundle.marketplaceLink.status,
    },
  });
}
