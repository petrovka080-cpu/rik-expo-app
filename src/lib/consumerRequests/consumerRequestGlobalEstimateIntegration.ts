import type { EstimateCatalogBindingResult } from "../ai/globalEstimate/catalogBinding/globalEstimateCatalogBindingTypes";
import {
  buildExactMaterialPriceEstimate,
} from "../ai/exactMaterialPriceEstimate";
import { createGlobalEstimateProductionTraceEvent } from "../ai/globalEstimate/globalEstimateProductionSafety";
import type { GlobalEstimateResult } from "../ai/globalEstimate/globalEstimateTypes";
import {
  buildEstimatePresentationViewModel,
  buildStructuredEstimatePayload,
  buildStructuredEstimateRequestDraft,
} from "../estimateStructuredPipeline";
import { createConsumerRepairRequestDraft } from "./consumerRequestService";
import type { ConsumerRepairAiDraft, ConsumerRepairDraftBundle, ConsumerRepairSelectedWork } from "./consumerRequestTypes";

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
  const draft = buildStructuredEstimateRequestDraft(payload, catalogBinding);
  const exact = buildExactMaterialPriceEstimate({
    text: result.input.originalText ?? result.work.title,
    selectedWorkKey: selectedWork?.selectedWorkKey,
    volume: result.input.volume,
    unit: result.input.unit,
    countryCode: result.locale.countryCode,
    city: result.locale.city,
    currency: result.locale.currency === "USD" || result.locale.currency === "RUB" || result.locale.currency === "EUR" ? result.locale.currency : "KGS",
  });
  const exactLineSummaries = exact.material_lines.map((line) => {
    const source = String(line.source_type ?? "pricebook").replace(/[_-]+/g, " ");
    const date = line.valid_from ?? line.price_captured_at ?? "2026-06-12";
    if (line.price_status === "PRICE_MISSING") {
      return `${line.row_number} ${line.material_visible_name_ru}: ${line.visible_quantity}; PRICE_MISSING; region ${line.region}; price date ${date}; confidence ${line.confidence}`;
    }
    const supplier = line.supplier_visible_name ? `; ${line.supplier_visible_name}` : "";
    const lineTotal = line.line_total == null ? "" : `; total ${line.line_total} ${line.currency}`;
    return `${line.row_number} ${line.material_visible_name_ru}: ${line.visible_quantity}; ${line.visible_unit_price}${lineTotal}; ${source}; region ${line.region}; price date ${date}${supplier}; confidence ${line.confidence}`;
  });
  const exactSummary = [
    draft.summaryRu,
    `Точный справочник материалов: ${exact.totals.total_status}; PRICE_MISSING строк: ${exact.totals.missing_price_rows_count}.`,
    ...exactLineSummaries,
  ].join("\n");
  const expectedCatalogCandidateRows = (catalogBinding?.rows ?? []).filter((row) => row.catalogCandidates.length > 0).length;
  const actualCatalogCandidateRows = draft.items.filter((item) => (item.catalogCandidates ?? []).length > 0).length;
  if (actualCatalogCandidateRows < expectedCatalogCandidateRows) {
    throw new Error("GLOBAL_ESTIMATE_B2C_DRAFT_REQUIRES_CATALOG_CANDIDATES");
  }
  return {
    ...draft,
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
