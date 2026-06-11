import type React from "react";
import type { TextInput } from "react-native";

import {
  addConsumerRepairRequestItem,
  createConsumerRepairRequestDraft,
  saveConsumerRepairProjectExecutionDraft,
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
import { buildProjectExecutionDraftFromEstimate } from "../../lib/projectExecution";
import { buildConsumerRepairAiDraft } from "./consumerRepairAiAdapter";

export type ConsumerRepairProjectExecutionAction =
  | "create_project"
  | "send_to_procurement"
  | "open_material_list";

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
  const consumerSelectedWork = selectedWork ? toConsumerRepairSelectedWork(selectedWork) : null;
  const aiDraft = buildConsumerRepairAiDraft(nextProblemText, {
    city: params.city || undefined,
    selectedWorkKey: selectedWork?.selectedWorkKey,
    selectedWork: consumerSelectedWork,
  });
  const bundle = createConsumerRepairRequestDraft({
    consumerUserId: params.consumerUserId,
    problemText: nextProblemText,
    repairType: selectedWork?.selectedCategoryKey ?? params.repairType,
    city: params.city || null,
    addressText: params.addressText || null,
    preferredTimeText: params.preferredTimeText || null,
    contactPhone: params.contactPhone || null,
    selectedWork: consumerSelectedWork,
    aiDraft,
  });
  return { bundle, selectedWork, aiDraft };
}

function projectExecutionStatusMessage(action: ConsumerRepairProjectExecutionAction): string {
  if (action === "create_project") return "\u041f\u0440\u043e\u0435\u043a\u0442 \u0441\u043e\u0437\u0434\u0430\u043d \u0438\u0437 \u0441\u043c\u0435\u0442\u044b.";
  if (action === "send_to_procurement") return "\u0421\u043f\u0438\u0441\u043e\u043a \u0437\u0430\u043a\u0443\u043f\u043a\u0438 \u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043b\u0435\u043d.";
  return "\u0421\u043f\u0438\u0441\u043e\u043a \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u043e\u0432 \u043e\u0442\u043a\u0440\u044b\u0442.";
}

export function saveProjectExecutionDraftForRequest(input: {
  action: ConsumerRepairProjectExecutionAction;
  bundle: ConsumerRepairDraftBundle;
  userId: string;
}): {
  bundle: ConsumerRepairDraftBundle;
  statusMessage: string;
} {
  const payload = input.bundle.structuredEstimatePayload;
  if (!payload) {
    return {
      bundle: input.bundle,
      statusMessage: "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043d\u0443\u0436\u043d\u0430 \u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u043d\u0430\u044f \u0441\u043c\u0435\u0442\u0430.",
    };
  }
  const projectExecutionDraft = buildProjectExecutionDraftFromEstimate(payload, {
    source: "request_estimate",
    countryCode: payload.locale.countryCode,
    cityOrRegion: payload.locale.city ?? payload.locale.stateOrRegion,
    generatedAt: input.bundle.draft.updatedAt ?? input.bundle.draft.createdAt,
    sourceRequestId: input.bundle.draft.id,
  });
  return {
    bundle: saveConsumerRepairProjectExecutionDraft({
      requestDraftId: input.bundle.draft.id,
      userId: input.userId,
      projectExecutionDraft,
    }),
    statusMessage: projectExecutionStatusMessage(input.action),
  };
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

export function syncConsumerRepairDraftFromScreenState(
  current: ConsumerRepairDraftBundle,
  state: Pick<
    ConsumerRepairRequestScreenState,
    | "problemText"
    | "repairType"
    | "city"
    | "addressText"
    | "preferredTimeText"
    | "contactPhone"
    | "selectedWork"
  >,
): ConsumerRepairDraftBundle {
  return syncConsumerRepairDraftFields(current, {
    problemText: state.problemText.trim() || current.draft.problemText || "",
    repairType: state.repairType || current.draft.repairType || "Р РµРјРѕРЅС‚",
    city: state.city.trim() || current.draft.city || "",
    addressText: state.addressText.trim() || current.draft.addressText || "",
    preferredTimeText: state.preferredTimeText.trim() || current.draft.preferredTimeText || "",
    contactPhone: state.contactPhone.trim() || current.draft.contactPhone || "",
    selectedWork: buildConsumerRepairSelectedWorkEditableField({
      currentBundle: current,
      problemText: state.problemText,
      selectedWork: state.selectedWork,
    }),
  });
}

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
