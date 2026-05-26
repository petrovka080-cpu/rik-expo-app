import type { GlobalEstimateResult } from "../ai/globalEstimate/globalEstimateTypes";
import type { EstimateCatalogBindingResult } from "../ai/globalEstimate/catalogBinding/globalEstimateCatalogBindingTypes";
import { buildEstimatePresentationViewModel } from "../ai/estimatePresentation";
import { createGlobalEstimateProductionTraceEvent } from "../ai/globalEstimate/globalEstimateProductionSafety";
import { formatEstimateUnitLabel } from "../ai/globalEstimate/formatEstimateUnitLabel";
import { formatRequestEstimateSummary } from "../ai/globalEstimate/formatRequestEstimateSummary";
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

function sourceLabelRu(label?: string | null): string | undefined {
  if (!label) return undefined;
  if (/configured backend regional reference rate/i.test(label)) return "Встроенный справочник цен";
  if (/backend|pricebook|reference rate/i.test(label)) return "Справочник цен";
  return label;
}

export function buildConsumerRepairAiDraftFromGlobalEstimate(
  result: GlobalEstimateResult,
  catalogBinding?: EstimateCatalogBindingResult,
): ConsumerRepairAiDraft {
  const dangerous = isDangerousEstimate(result);
  const bindingByRowId = new Map((catalogBinding?.rows ?? []).map((row) => [row.rowId, row]));
  const presentation = buildEstimatePresentationViewModel(result);
  return {
    titleRu: result.work.title,
    summaryRu: formatRequestEstimateSummary(result),
    repairType: result.work.category,
    estimatePresentation: presentation,
    dangerousDiyBlocked: dangerous,
    safetyMessageRu: dangerous
      ? "Работа повышенной опасности: DIY-инструкции не выдаются. Используйте смету как основу заявки для профильного специалиста."
      : undefined,
    missingData: result.clarifyingQuestions,
    items: presentation.sections.flatMap((section) =>
      section.rows.map((row) => {
        const binding = bindingByRowId.get(row.code || row.rowNumber);
        return {
          itemType: itemTypeFor(section.type),
          titleRu: `${row.rowNumber} ${row.name}`,
          quantity: row.quantity,
          unit: row.unit,
          unitLabel: formatEstimateUnitLabel(row.unit),
          unitPrice: row.unitPrice,
          currency: row.currency,
          source: "reference_price_book" as const,
          sourceId: row.sourceId,
          sourceLabel: sourceLabelRu(row.sourceEvidence[0]?.label),
          confidence: row.confidence,
          addedBy: "ai" as const,
          materialKey: row.materialKey ?? null,
          rateKey: row.rateKey ?? null,
          catalogBindingStatus: binding?.bindingStatus ?? (section.type === "materials" ? "no_catalog_match" : "not_material_row"),
          catalogCandidates: binding?.catalogCandidates ?? [],
          selectedCatalogItemId: binding?.selectedCatalogItemId ?? null,
        };
      }),
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
