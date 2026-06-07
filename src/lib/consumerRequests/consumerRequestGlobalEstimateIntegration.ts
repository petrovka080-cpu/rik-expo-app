import type { EstimateCatalogBindingResult } from "../ai/globalEstimate/catalogBinding/globalEstimateCatalogBindingTypes";
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
  const expectedCatalogCandidateRows = (catalogBinding?.rows ?? []).filter((row) => row.catalogCandidates.length > 0).length;
  const actualCatalogCandidateRows = draft.items.filter((item) => (item.catalogCandidates ?? []).length > 0).length;
  if (actualCatalogCandidateRows < expectedCatalogCandidateRows) {
    throw new Error("GLOBAL_ESTIMATE_B2C_DRAFT_REQUIRES_CATALOG_CANDIDATES");
  }
  return draft;
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
