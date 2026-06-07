import {
  createConsumerRepairRequestDraft,
  type ConsumerRepairDraftBundle,
  type ConsumerRepairSelectedWork,
} from "../../lib/consumerRequests";
import {
  buildGlobalSelectedWorkBinding,
  searchGlobalWorkSmartSuggestions,
  type GlobalSelectedWorkBinding,
  type GlobalWorkSmartSearchSuggestion,
} from "../../lib/ai/globalEstimate";
import { buildConsumerRepairAiDraft } from "./consumerRepairAiAdapter";

export function toConsumerRepairSelectedWork(binding: GlobalSelectedWorkBinding): ConsumerRepairSelectedWork {
  return {
    selectedWorkKey: binding.selectedWorkKey,
    selectedWorkTitleRu: binding.selectedTitleRu,
    selectedWorkCategoryKey: binding.selectedCategoryKey,
    selectedWorkCategoryTitleRu: binding.selectedCategoryTitleRu,
    selectedWorkRawInput: binding.rawInput,
    selectedWorkSource: binding.source,
    selectedWorkResolverReGuessed: binding.resolverReGuessed,
  };
}

export function selectedWorkFromBundle(bundle: ConsumerRepairDraftBundle | null): GlobalSelectedWorkBinding | null {
  if (!bundle?.draft.selectedWorkKey || !bundle.draft.selectedWorkTitleRu) return null;
  return {
    selectedWorkKey: bundle.draft.selectedWorkKey,
    selectedTitleRu: bundle.draft.selectedWorkTitleRu,
    selectedCategoryKey: (bundle.draft.selectedWorkCategoryKey ?? bundle.draft.repairType) as GlobalSelectedWorkBinding["selectedCategoryKey"],
    selectedCategoryTitleRu: bundle.draft.selectedWorkCategoryTitleRu ?? bundle.draft.repairType,
    rawInput: bundle.draft.selectedWorkRawInput ?? bundle.draft.problemText ?? "",
    source: "user_selected",
    resolverReGuessed: false,
  };
}

export function refreshSelectedWorkBinding(
  selectedWork: GlobalSelectedWorkBinding | null,
  rawInput: string,
): GlobalSelectedWorkBinding | null {
  if (!selectedWork) return null;
  return buildGlobalSelectedWorkBinding({
    selectedWorkKey: selectedWork.selectedWorkKey,
    rawInput: rawInput || selectedWork.rawInput,
  });
}

export function buildSelectedWorkFromSuggestion(
  suggestion: GlobalWorkSmartSearchSuggestion,
  rawInput: string,
): GlobalSelectedWorkBinding {
  return buildGlobalSelectedWorkBinding({
    selectedWorkKey: suggestion.workKey,
    rawInput,
  });
}

export function searchConsumerRepairWorkSuggestions(
  query: string,
  selectedWork: GlobalSelectedWorkBinding | null,
): GlobalWorkSmartSearchSuggestion[] {
  return selectedWork ? [] : searchGlobalWorkSmartSuggestions({ query, limit: 8 });
}

export function buildConsumerRepairSelectedWorkEditableField(params: {
  currentBundle: ConsumerRepairDraftBundle;
  problemText: string;
  selectedWork: GlobalSelectedWorkBinding | null;
}): ConsumerRepairSelectedWork | null {
  const fallback = selectedWorkFromBundle(params.currentBundle);
  const refreshed = params.selectedWork
    ? refreshSelectedWorkBinding(
        params.selectedWork,
        params.problemText.trim() || params.currentBundle.draft.problemText || params.selectedWork.rawInput,
      )
    : fallback;
  return refreshed ? toConsumerRepairSelectedWork(refreshed) : null;
}

export function buildConsumerRepairSelectedWorkDraftBundle(params: {
  consumerUserId: string;
  problemText: string;
  repairType: string;
  city: string;
  addressText: string;
  preferredTimeText: string;
  contactPhone: string;
  selectedWork: GlobalSelectedWorkBinding | null;
}): {
  bundle: ConsumerRepairDraftBundle;
  selectedWork: GlobalSelectedWorkBinding | null;
  aiDraft: ReturnType<typeof buildConsumerRepairAiDraft>;
} {
  const nextProblemText = params.problemText.trim();
  const selectedWork = refreshSelectedWorkBinding(params.selectedWork, nextProblemText);
  const aiDraft = buildConsumerRepairAiDraft(nextProblemText, {
    city: params.city || undefined,
    selectedWorkKey: selectedWork?.selectedWorkKey,
  });
  const bundle = createConsumerRepairRequestDraft({
    consumerUserId: params.consumerUserId,
    problemText: nextProblemText,
    repairType: selectedWork?.selectedCategoryKey ?? params.repairType,
    city: params.city || null,
    addressText: params.addressText || null,
    preferredTimeText: params.preferredTimeText || null,
    contactPhone: params.contactPhone || null,
    selectedWork: selectedWork ? toConsumerRepairSelectedWork(selectedWork) : null,
    aiDraft,
  });
  return { bundle, selectedWork, aiDraft };
}
