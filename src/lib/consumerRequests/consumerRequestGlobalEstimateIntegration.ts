import type { EstimateCatalogBindingResult } from "../ai/globalEstimate/catalogBinding/globalEstimateCatalogBindingTypes";
import {
  buildExactMaterialPriceEstimate,
} from "../ai/exactMaterialPriceEstimate";
import { createGlobalEstimateProductionTraceEvent } from "../ai/globalEstimate/globalEstimateProductionSafety";
import { formatEstimateUnitLabel } from "../ai/globalEstimate/formatEstimateUnitLabel";
import type { GlobalEstimateResult } from "../ai/globalEstimate/globalEstimateTypes";
import {
  buildEstimatePresentationViewModel,
  buildStructuredEstimatePayload,
  buildStructuredEstimateRequestDraft,
} from "../estimateStructuredPipeline";
import { createConsumerRepairRequestDraft } from "./consumerRequestService";
import type { ConsumerRepairAiDraft, ConsumerRepairDraftBundle, ConsumerRepairSelectedWork } from "./consumerRequestTypes";

type ConsumerRepairAiDraftItem = ConsumerRepairAiDraft["items"][number];

function roundQuantity(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function rowCodeFor(item: ConsumerRepairAiDraftItem): string {
  return String(item.sourceParameters?.rowCode ?? "").toLowerCase();
}

function normalizedProductionBoqUnit(input: {
  item: ConsumerRepairAiDraftItem;
  workKey: string;
}): { unit: string; quantity: number | null; reason: string } | null {
  const unit = String(input.item.unit ?? "");
  const quantity = Number(input.item.quantity ?? 0);
  const rowCode = rowCodeFor(input.item);
  if (input.workKey === "asphalt_paving" && input.item.itemType === "material") {
    if (rowCode.endsWith("asphalt_material_6")) {
      return { unit: "m3", quantity: roundQuantity(quantity * 0.06), reason: "asphalt_lower_layer_area_to_volume_60mm" };
    }
    if (rowCode.endsWith("asphalt_material_7")) {
      return { unit: "m3", quantity: roundQuantity(quantity * 0.04), reason: "asphalt_upper_layer_area_to_volume_40mm" };
    }
    if (rowCode.endsWith("asphalt_material_10")) {
      return { unit: "l", quantity: roundQuantity(quantity * 0.25), reason: "road_marking_paint_area_to_liters" };
    }
  }
  if (unit === "sq_ft") return { unit: "sq_m", quantity: roundQuantity(quantity * 0.09290304), reason: "imperial_area_to_metric_area" };
  if (unit === "linear_ft") return { unit: "linear_m", quantity: roundQuantity(quantity * 0.3048), reason: "imperial_length_to_metric_length" };
  if (unit === "lbs") return { unit: "kg", quantity: roundQuantity(quantity * 0.45359237), reason: "imperial_mass_to_metric_mass" };
  return null;
}

function normalizeProductionBoqDraftUnits(
  draft: ConsumerRepairAiDraft,
  result: GlobalEstimateResult,
): ConsumerRepairAiDraft {
  const workKey = result.work.workKey;
  let normalizedCount = 0;
  const items = draft.items.map((item) => {
    const normalized = normalizedProductionBoqUnit({ item, workKey });
    if (!normalized) return item;
    normalizedCount += 1;
    return {
      ...item,
      quantity: normalized.quantity ?? item.quantity,
      unit: normalized.unit,
      unitLabel: formatEstimateUnitLabel(normalized.unit),
      sourceParameters: {
        ...(item.sourceParameters ?? {}),
        productionGradeUnitNormalized: true,
        productionGradeUnitNormalizationReason: normalized.reason,
        productionGradeOriginalUnit: item.unit,
        productionGradeOriginalQuantity: item.quantity,
      },
    };
  });
  if (normalizedCount === 0) return draft;
  return {
    ...draft,
    items,
  };
}

function selectedWorkFromGlobalEstimate(result: GlobalEstimateResult): ConsumerRepairSelectedWork {
  return {
    selectedWorkKey: result.work.workKey,
    selectedWorkTitleRu: result.work.title,
    selectedWorkCategoryKey: result.work.category,
    selectedWorkCategoryTitleRu: result.work.category.replace(/[_-]+/g, " "),
    selectedWorkRawInput: result.input.originalText ?? result.work.title,
    selectedWorkSource: "user_selected",
    selectedWorkResolverReGuessed: false,
  };
}

export function buildConsumerRepairAiDraftFromGlobalEstimate(
  result: GlobalEstimateResult,
  catalogBinding?: EstimateCatalogBindingResult,
  selectedWork?: ConsumerRepairSelectedWork,
): ConsumerRepairAiDraft {
  const presentation = buildEstimatePresentationViewModel(result);
  const presentationRows = presentation.sections.flatMap((section) => section.rows);
  if (presentationRows.length === 0) {
    throw new Error("GLOBAL_ESTIMATE_B2C_DRAFT_REQUIRES_PRESENTATION_ROWS");
  }
  const payload = buildStructuredEstimatePayload(result, {
    source: "request",
    presentation,
    selectedWork: selectedWork
      ? {
          selectedWorkKey: selectedWork.selectedWorkKey,
          selectedTitleRu: selectedWork.selectedWorkTitleRu,
          selectedCategoryKey: selectedWork.selectedWorkCategoryKey,
          selectedCategoryTitleRu: selectedWork.selectedWorkCategoryTitleRu,
          rawInput: selectedWork.selectedWorkRawInput,
          source: "user_selected",
          resolverReGuessed: false,
        }
      : undefined,
  });
  const draft = normalizeProductionBoqDraftUnits(
    buildStructuredEstimateRequestDraft(payload, catalogBinding),
    result,
  );
  const selectedWorkForDraft = draft.selectedWork ?? selectedWork ?? selectedWorkFromGlobalEstimate(result);
  const exact = buildExactMaterialPriceEstimate({
    text: result.input.originalText ?? result.work.title,
    selectedWorkKey: selectedWork?.selectedWorkKey,
    volume: result.input.volume,
    unit: result.input.unit,
    countryCode: result.locale.countryCode,
    city: result.locale.city,
    currency: result.locale.currency === "USD" || result.locale.currency === "RUB" || result.locale.currency === "EUR" ? result.locale.currency : "KGS",
  });
  const missingPriceRows = exact.totals.missing_price_rows_count;
  const exactPublicLine = missingPriceRows > 0
    ? `Материалы без подтвержденной цены: ${missingPriceRows}. Финальный итог уточняется после выбора источника цены.`
    : "Материалы сопоставлены со справочником цен; перед отправкой проверьте регион и поставщика.";
  const exactSummary = [
    draft.summaryRu,
    exactPublicLine,
  ].join("\n");
  const expectedCatalogCandidateRows = (catalogBinding?.rows ?? []).filter((row) => row.catalogCandidates.length > 0).length;
  const actualCatalogCandidateRows = draft.items.filter((item) => (item.catalogCandidates ?? []).length > 0).length;
  if (actualCatalogCandidateRows < expectedCatalogCandidateRows) {
    throw new Error("GLOBAL_ESTIMATE_B2C_DRAFT_REQUIRES_CATALOG_CANDIDATES");
  }
  return {
    ...draft,
    selectedWork: selectedWorkForDraft,
    summaryRu: exactSummary,
    structuredEstimatePayload: payload,
  };
}

export function createConsumerRepairDraftFromGlobalEstimate(input: {
  consumerUserId: string;
  estimate: GlobalEstimateResult;
  originalText: string;
  city?: string | null;
  addressText?: string | null;
  contactPhone?: string | null;
  selectedWork?: ConsumerRepairSelectedWork | null;
}): ConsumerRepairDraftBundle {
  const aiDraft = buildConsumerRepairAiDraftFromGlobalEstimate(input.estimate, undefined, input.selectedWork ?? undefined);
  return createConsumerRepairRequestDraft({
    consumerUserId: input.consumerUserId,
    problemText: input.originalText,
    repairType: input.estimate.work.category,
    city: input.city ?? input.estimate.locale.city ?? null,
    addressText: input.addressText ?? null,
    contactPhone: input.contactPhone ?? null,
    selectedWork: input.selectedWork ?? null,
    aiDraft,
  });
}

export function assertConsumerRepairGlobalEstimateDraftSafe(bundle: ConsumerRepairDraftBundle): void {
  if (bundle.draft.orgId != null) {
    throw new Error("GLOBAL_ESTIMATE_B2C_DRAFT_MUST_NOT_LINK_OFFICE_OR_COMPANY");
  }
  const sourceSafe = bundle.items.every((item) =>
    item.source === "reference_price_book" ||
    item.source === "catalog_item" ||
    item.source === "custom"
  );
  if (bundle.items.length < 1 || !sourceSafe) {
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
