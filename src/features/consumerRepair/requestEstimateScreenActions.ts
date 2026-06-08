import type React from "react";
import type { TextInput } from "react-native";

import {
  addConsumerRepairRequestItem,
  createConsumerRepairRequestDraft,
  updateConsumerRepairRequestDraft,
  type ConsumerRequestValidationErrorItem,
  type ConsumerRepairDraftBundle,
  type ConsumerRepairRequestItem,
  type ConsumerRepairSelectedWork,
} from "../../lib/consumerRequests";
import {
  buildGlobalSelectedWorkBinding,
  searchGlobalWorkSmartSuggestions,
  type GlobalSelectedWorkBinding,
  type GlobalWorkSmartSearchSuggestion,
} from "../../lib/ai/globalEstimate";
import { toVisibleEstimateLabel } from "../../lib/estimatePresentation/visibleEstimateLabelPolicy";
import { buildConsumerRepairAiDraft } from "./consumerRepairAiAdapter";

export type ConsumerRepairRequestScreenState = {
  problemText: string;
  repairType: string;
  city: string;
  addressText: string;
  preferredTimeText: string;
  contactPhone: string;
  bundle: ConsumerRepairDraftBundle | null;
  history: ConsumerRepairDraftBundle[];
  aiAnswerRu: string | null;
  statusMessage: string | null;
  validationErrors: ConsumerRequestValidationErrorItem[];
  catalogPickerVisible: boolean;
  catalogPickerTargetItemId: string | null;
  catalogPickerInitialQuery: string | undefined;
  lastRemovedItem: ConsumerRepairRequestItem | null;
  selectedWork: GlobalSelectedWorkBinding | null;
};

export function buildInitialConsumerRepairRequestState(params: {
  initialProblemText?: string;
  history: ConsumerRepairDraftBundle[];
}): ConsumerRepairRequestScreenState {
  return {
    problemText: params.initialProblemText?.trim() || "",
    repairType: "Ремонт",
    city: "",
    addressText: "",
    preferredTimeText: "",
    contactPhone: "",
    bundle: null,
    history: params.history,
    aiAnswerRu: null,
    statusMessage: null,
    validationErrors: [],
    catalogPickerVisible: false,
    catalogPickerTargetItemId: null,
    catalogPickerInitialQuery: undefined,
    lastRemovedItem: null,
    selectedWork: null,
  };
}

export function buildDeletedConsumerRepairDraftState(
  statusMessage: string,
): Pick<
  ConsumerRepairRequestScreenState,
  | "bundle"
  | "aiAnswerRu"
  | "validationErrors"
  | "catalogPickerVisible"
  | "catalogPickerTargetItemId"
  | "catalogPickerInitialQuery"
  | "lastRemovedItem"
  | "selectedWork"
  | "statusMessage"
> {
  return {
    bundle: null,
    aiAnswerRu: null,
    validationErrors: [],
    catalogPickerVisible: false,
    catalogPickerTargetItemId: null,
    catalogPickerInitialQuery: undefined,
    lastRemovedItem: null,
    selectedWork: null,
    statusMessage,
  };
}

export function buildNewConsumerRepairRequestState(statusMessage: string): ConsumerRepairRequestScreenState {
  return {
    ...buildInitialConsumerRepairRequestState({ history: [] }),
    statusMessage,
  };
}

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

export function focusConsumerRepairProblemInputAtEnd(
  inputRef: React.RefObject<TextInput | null>,
  value: string,
): void {
  const caret = value.length;
  const focus = () => {
    inputRef.current?.focus?.();
    inputRef.current?.setNativeProps?.({ selection: { start: caret, end: caret } });
    if (typeof document !== "undefined") {
      const input = document.querySelector("[data-testid='consumer-repair-problem-input']") as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null;
      input?.focus();
      input?.setSelectionRange?.(caret, caret);
    }
  };
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(focus);
    return;
  }
  focus();
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

function normalizeEditableWorkText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase("ru-RU");
}

export function composeSelectedWorkActiveInputText(suggestion: GlobalWorkSmartSearchSuggestion): string {
  const title = suggestion.titleRu.trim() || suggestion.visibleText.trim();
  return title ? `${title} ` : "";
}

export function shouldPreserveSelectedWorkForProblemText(
  selectedWork: GlobalSelectedWorkBinding | null,
  problemText: string,
): boolean {
  if (!selectedWork) return false;
  const nextText = normalizeEditableWorkText(problemText);
  if (!nextText) return false;
  const selectedTitle = normalizeEditableWorkText(selectedWork.selectedTitleRu);
  return Boolean(selectedTitle && nextText.includes(selectedTitle));
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

export type ConsumerRepairDraftEditableFields = {
  problemText: string;
  repairType: string;
  city: string;
  addressText: string;
  preferredTimeText: string;
  contactPhone: string;
  selectedWork?: ConsumerRepairSelectedWork | null;
};

export const buildConsumerRepairDraftPatch = (fields: ConsumerRepairDraftEditableFields) => ({
  problemText: fields.problemText,
  repairType: fields.repairType,
  city: fields.city || null,
  addressText: fields.addressText || null,
  preferredTimeText: fields.preferredTimeText || null,
  contactPhone: fields.contactPhone || null,
  selectedWorkKey: fields.selectedWork?.selectedWorkKey ?? null,
  selectedWorkTitleRu: fields.selectedWork?.selectedWorkTitleRu ?? null,
  selectedWorkCategoryKey: fields.selectedWork?.selectedWorkCategoryKey ?? null,
  selectedWorkCategoryTitleRu: fields.selectedWork?.selectedWorkCategoryTitleRu ?? null,
  selectedWorkRawInput: fields.selectedWork?.selectedWorkRawInput ?? null,
  selectedWorkSource: fields.selectedWork?.selectedWorkSource ?? null,
  selectedWorkResolverReGuessed: fields.selectedWork?.selectedWorkResolverReGuessed ?? null,
});

export function syncConsumerRepairDraftFields(
  current: ConsumerRepairDraftBundle,
  fields: ConsumerRepairDraftEditableFields,
): ConsumerRepairDraftBundle {
  if (current.draft.status === "sent_to_marketplace") return current;
  return updateConsumerRepairRequestDraft({
    requestDraftId: current.draft.id,
    patch: buildConsumerRepairDraftPatch(fields),
  });
}

export function restoreConsumerRepairRequestItem(params: {
  current: ConsumerRepairDraftBundle;
  item: ConsumerRepairRequestItem;
}): ConsumerRepairDraftBundle {
  const { current, item } = params;
  return addConsumerRepairRequestItem({
    requestDraftId: current.draft.id,
    titleRu: item.titleRu,
    itemType: item.itemType,
    quantity: item.quantity ?? 1,
    unit: item.unit ?? undefined,
    unitLabel: item.unitLabel,
    unitPrice: item.unitPrice,
    currency: item.currency,
    source: item.source,
    catalogItemId: item.catalogItemId,
    selectedCatalogItemId: item.selectedCatalogItemId,
    materialKey: item.materialKey,
    rateKey: item.rateKey,
    catalogBindingStatus: item.catalogBindingStatus ?? undefined,
    catalogCandidates: item.catalogCandidates,
    category: item.category,
    sourceId: item.sourceId,
    sourceLabel: item.sourceLabel,
    confidence: item.confidence,
    addedBy: item.addedBy,
  });
}

export function catalogInitialQueryForRequestItem(item: ConsumerRepairRequestItem): string {
  const visibleTitle = item.titleRu.replace(/^\s*\d+(?:\.\d+)*\s+/, "").trim();
  return toVisibleEstimateLabel({
    label: visibleTitle,
    materialKey: item.materialKey ?? undefined,
    sectionType: item.itemType === "material" ? "materials" : undefined,
  });
}

export function addConsumerRepairCustomNoteItem(current: ConsumerRepairDraftBundle): ConsumerRepairDraftBundle {
  return addConsumerRepairRequestItem({
    requestDraftId: current.draft.id,
    titleRu: "Пользовательское примечание",
    itemType: "other",
    quantity: 1,
    unit: "set",
    unitLabel: "компл.",
    unitPrice: null,
    currency: "KGS",
    source: "custom",
    confidence: "low",
    addedBy: "user",
  });
}
