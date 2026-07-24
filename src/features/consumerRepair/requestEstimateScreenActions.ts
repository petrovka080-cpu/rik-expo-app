import type React from "react";
import type { TextInput } from "react-native";

import {
  addConsumerRepairRequestCatalogItem,
  addConsumerRepairRequestItem,
  createConsumerRepairRequestDraft,
  ensureConsumerRepairRequestPdfAvailable,
  getConsumerRepairRequestPdf,
  listConsumerRepairApprovedHistory,
  listConsumerRepairRequestHistory,
  saveConsumerRepairProjectExecutionDraft,
  selectConsumerRepairRequestItemCatalogItem,
  updateConsumerRepairRequestDraft,
  type ConsumerRepairApprovedHistoryPage,
} from "../../lib/consumerRequests/consumerRequestService";
import {
  ConsumerRepairValidationError,
  sendConsumerRepairRequestToMarketplace,
} from "../../lib/consumerRequests/consumerRequestMarketplaceService";
import type {
  ConsumerRepairAiDraft,
  ConsumerRepairDraftBundle,
  ConsumerRepairPdfOpenResult,
  ConsumerRepairRequestItem,
  ConsumerRepairSelectedWork,
  ConsumerRequestValidationErrorItem,
} from "../../lib/consumerRequests/consumerRequestTypes";
import {
  buildGlobalSelectedWorkBinding,
  searchGlobalWorkSmartSuggestions,
  type GlobalSelectedWorkBinding,
  type GlobalWorkSmartSearchSuggestion,
} from "../../lib/ai/globalEstimate/globalWorkSmartSearch";
import type { GlobalWorkCategory } from "../../lib/ai/globalEstimate/globalEstimateTypes";
import type { InlineWorkTemplateCandidate } from "../../lib/ai/matchWorkTemplateFromPrompt";
import { mapPickerItemToCatalogItemForEstimate, type CatalogItemPickerItem } from "../../lib/catalog/catalog.facade";
import { buildGeneratedPdfViewerRouteParams } from "../../lib/estimatePdf/generatedPdfViewerFile";
import type { UserParamPatchOperation } from "../../lib/estimate/validateUserParamPatch";
import { toVisibleEstimateLabel } from "../../lib/estimatePresentation/visibleEstimateLabelPolicy";
import { buildProfessionalWorkPassport } from "../../lib/estimate/buildProfessionalWorkPassport";
import type { buildConsumerRepairDraftFromAiEstimateRuntime as BuildConsumerRepairDraftFromAiEstimateRuntime } from "../../lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime";
import {
  ASPHALT_WORK_ID_V4,
  ROAD_SCOPE_RESOLVER_VERSION_V4,
  ROAD_SCOPE_SELECTION_QUESTION_RU,
  resolveRoadEstimateScopeV4,
} from "../../lib/estimate/v4/asphalt";
import { routeMultiDomainReferencePromptV4 } from "../../lib/estimate/v4/multiDomainReferenceNlpV4";
import { MULTI_DOMAIN_REFERENCE_PASSPORTS_V4 } from "../../lib/estimate/v4/multiDomainReferencePassportsV4";
import {
  buildProjectExecutionDraftFromEstimate,
  buildProjectExecutionDraftFromRevision,
} from "../../lib/projectExecution";
import type { buildConsumerRepairAiDraft as BuildConsumerRepairAiDraft } from "./consumerRepairAiAdapter";

type ConsumerRepairAiDraftBuilder = typeof BuildConsumerRepairAiDraft;
type ConsumerRepairRuntimeDraftBuilder = typeof BuildConsumerRepairDraftFromAiEstimateRuntime;

function loadConsumerRepairDraftBuilders(): {
  buildConsumerRepairAiDraft: ConsumerRepairAiDraftBuilder;
  buildConsumerRepairDraftFromAiEstimateRuntime: ConsumerRepairRuntimeDraftBuilder;
} {
  const adapter = require("./consumerRepairAiAdapter") as {
    buildConsumerRepairAiDraft: ConsumerRepairAiDraftBuilder;
  };
  const runtime = require(
    "../../lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime"
  ) as {
    buildConsumerRepairDraftFromAiEstimateRuntime: ConsumerRepairRuntimeDraftBuilder;
  };
  return {
    buildConsumerRepairAiDraft: adapter.buildConsumerRepairAiDraft,
    buildConsumerRepairDraftFromAiEstimateRuntime:
      runtime.buildConsumerRepairDraftFromAiEstimateRuntime,
  };
}

export type ConsumerRepairProjectExecutionAction =
  | "create_project"
  | "send_to_procurement"
  | "open_material_list";

export type ConsumerRepairParamEditState = {
  key: string;
  operation: UserParamPatchOperation;
} | null;

export type ConsumerRepairRequestScreenState = {
  problemText: string;
  repairType: string;
  city: string;
  addressText: string;
  preferredTimeText: string;
  contactPhone: string;
  roadScopeSelectionBusy?: boolean;
  bundle: ConsumerRepairDraftBundle | null;
  history: ConsumerRepairDraftBundle[];
  approvedHistoryPage: ConsumerRepairApprovedHistoryPage;
  aiAnswerRu: string | null;
  statusMessage: string | null;
  validationErrors: ConsumerRequestValidationErrorItem[];
  catalogPickerVisible: boolean;
  catalogPickerTargetItemId: string | null;
  catalogPickerInitialQuery: string | undefined;
  lastRemovedItem: ConsumerRepairRequestItem | null;
  selectedWork: GlobalSelectedWorkBinding | null;
  selectedHistoryId: string | null;
  editingParam: ConsumerRepairParamEditState;
};

export type ConsumerRepairRequestPdfLoader = (input: {
  requestDraftId: string;
  pdfId?: string;
}) => ConsumerRepairPdfOpenResult;

export function buildEmptyConsumerRepairApprovedHistoryPage(
  limit = 20,
): ConsumerRepairApprovedHistoryPage {
  const pageSize = Math.min(Math.max(limit, 1), 20);
  return {
    items: [],
    records: [],
    totalApprovedCount: 0,
    archivedApprovedCount: 0,
    nextCursorCreatedAt: null,
    pageSize,
    totalCountSource: "durable_store",
  };
}

export type ConsumerRepairPdfViewerNavigation = {
  params: Awaited<ReturnType<typeof buildGeneratedPdfViewerRouteParams>>;
  statusMessage: string;
};

export type ConsumerRepairRequestPdfNavigationBuilder = (
  requestDraftId: string,
) => Promise<ConsumerRepairPdfViewerNavigation>;

export async function buildConsumerRepairRequestPdfViewerNavigation(
  requestDraftId: string,
  loadPdf?: ConsumerRepairRequestPdfLoader,
): Promise<ConsumerRepairPdfViewerNavigation> {
  const pdf = loadPdf ? loadPdf({ requestDraftId }) : getConsumerRepairRequestPdf({ requestDraftId });
  const params = await buildGeneratedPdfViewerRouteParams({
    uri: pdf.signedUrl,
    title: pdf.titleRu,
    fileName: `${pdf.pdfId}.pdf`,
    accessKind: "signed-url",
    documentType: "request",
    originModule: "reports",
    source: "generated",
    entityId: pdf.requestId,
  });

  return {
    params,
    statusMessage: `PDF открыт: ${pdf.titleRu}.`,
  };
}

export function getConsumerRepairPdfUnavailableStatusMessage(error: unknown): string | null {
  if (error instanceof ConsumerRepairValidationError) return null;
  return error instanceof Error ? error.message : "PDF недоступен.";
}

export async function openConsumerRepairRequestPdfFromScreen(params: {
  requestDraftId?: string;
  buildNavigation: ConsumerRepairRequestPdfNavigationBuilder;
  pushPdfViewer: (params: ConsumerRepairPdfViewerNavigation["params"]) => void;
  setStatusMessage: (statusMessage: string | null) => void;
  handleValidationError: (error: unknown) => void;
}): Promise<void> {
  const draftId = params.requestDraftId;
  if (!draftId) return;

  try {
    const navigation = await params.buildNavigation(draftId);
    params.pushPdfViewer(navigation.params);
    params.setStatusMessage(navigation.statusMessage);
  } catch (error) {
    if (error instanceof ConsumerRepairValidationError) {
      params.handleValidationError(error);
      return;
    }
    params.setStatusMessage(getConsumerRepairPdfUnavailableStatusMessage(error));
  }
}

export function sendConsumerRepairHistoryToMarketplaceFromScreen(input: {
  requestDraftId: string;
  userId: string;
}): Pick<
  ConsumerRepairRequestScreenState,
  "history" | "approvedHistoryPage" | "selectedHistoryId" | "validationErrors" | "statusMessage"
> {
  ensureConsumerRepairRequestPdfAvailable({
    requestDraftId: input.requestDraftId,
    userId: input.userId,
  });
  sendConsumerRepairRequestToMarketplace({
    requestDraftId: input.requestDraftId,
    userId: input.userId,
    idempotencyKey: `consumer-marketplace:${input.requestDraftId}`,
  });
  return {
    history: listConsumerRepairRequestHistory(input.userId),
    approvedHistoryPage: listConsumerRepairApprovedHistory(input.userId),
    selectedHistoryId: input.requestDraftId,
    validationErrors: [],
    statusMessage: "Заявка из истории отправлена в маркет.",
  };
}

export function appendNextApprovedHistoryPage(
  page: ConsumerRepairApprovedHistoryPage,
  loadPage: (cursorCreatedAt: string, limit: number) => ConsumerRepairApprovedHistoryPage,
): ConsumerRepairApprovedHistoryPage {
  const cursorCreatedAt = page.nextCursorCreatedAt;
  if (!cursorCreatedAt) return page;

  const nextPage = loadPage(cursorCreatedAt, page.pageSize);
  const existingIds = new Set(page.items.map((bundle) => bundle.draft.id));
  const existingRecordIds = new Set(page.records.map((record) => record.approvedEstimateId));
  return {
    ...nextPage,
    items: [
      ...page.items,
      ...nextPage.items.filter((bundle) => !existingIds.has(bundle.draft.id)),
    ],
    records: [
      ...page.records,
      ...nextPage.records.filter((record) => !existingRecordIds.has(record.approvedEstimateId)),
    ],
  };
}

export function buildConsumerRepairApprovedHistoryPageFromLoadedHistory(
  history: ConsumerRepairDraftBundle[],
  limit = 20,
): ConsumerRepairApprovedHistoryPage {
  const consumerUserId = history.find((bundle) => bundle.draft.consumerUserId)?.draft.consumerUserId;
  if (consumerUserId) return listConsumerRepairApprovedHistory(consumerUserId, { limit });
  return buildEmptyConsumerRepairApprovedHistoryPage(limit);
}

export function parseEditableEstimateNumberInput(value: string): number | null {
  const normalized = value.replace(",", ".").replace(/[^\d.]/g, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function consumerRepairMediaKindLabel(mediaKind: "photo" | "video" | "document"): string {
  if (mediaKind === "photo") return "Фото";
  if (mediaKind === "video") return "Видео";
  return "Документ";
}

export function applyConsumerRepairCatalogItemSelection(params: {
  current: ConsumerRepairDraftBundle;
  catalogItem: CatalogItemPickerItem;
  targetItemId: string | null;
}): { bundle: ConsumerRepairDraftBundle; statusMessage: string } {
  const catalogForEstimate = mapPickerItemToCatalogItemForEstimate(params.catalogItem);
  if (params.targetItemId) {
    return {
      bundle: selectConsumerRepairRequestItemCatalogItem({
        requestDraftId: params.current.draft.id,
        itemId: params.targetItemId,
        catalogItem: catalogForEstimate,
      }),
      statusMessage: `Материал выбран: ${params.catalogItem.name}.`,
    };
  }
  return {
    bundle: addConsumerRepairRequestCatalogItem({
      requestDraftId: params.current.draft.id,
      catalogItem: catalogForEstimate,
    }),
    statusMessage: `Материал из каталога добавлен: ${params.catalogItem.name}.`,
  };
}

function normalizeInitialProblemText(value: string | null | undefined): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function recoverConsumerRepairActiveWorkspaceForProblemText(
  history: ConsumerRepairDraftBundle[],
  problemText: string | null | undefined,
): ConsumerRepairDraftBundle | null {
  const normalizedProblemText = normalizeInitialProblemText(problemText);
  if (!normalizedProblemText) return null;
  return history.find((bundle) =>
    isConsumerRepairActiveWorkspaceBundle(bundle) &&
    normalizeInitialProblemText(bundle.draft.problemText) === normalizedProblemText
  ) ?? null;
}

export function buildInitialConsumerRepairRequestState(params: {
  initialProblemText?: string;
  history: ConsumerRepairDraftBundle[];
  approvedHistoryPage?: ConsumerRepairApprovedHistoryPage;
}): ConsumerRepairRequestScreenState {
  const initialProblemText = normalizeInitialProblemText(params.initialProblemText);
  const recoveredBundle = initialProblemText
    ? recoverConsumerRepairActiveWorkspaceForProblemText(params.history, initialProblemText)
    : recoverLatestConsumerRepairActiveWorkspace(params.history);
  return {
    problemText: recoveredBundle ? "" : initialProblemText,
    repairType: "Ремонт",
    city: "",
    addressText: "",
    preferredTimeText: "",
    contactPhone: "",
    bundle: recoveredBundle,
    history: params.history,
    approvedHistoryPage: params.approvedHistoryPage ?? buildConsumerRepairApprovedHistoryPageFromLoadedHistory(params.history),
    aiAnswerRu: null,
    statusMessage: null,
    validationErrors: [],
    catalogPickerVisible: false,
    catalogPickerTargetItemId: null,
    catalogPickerInitialQuery: undefined,
    lastRemovedItem: null,
    selectedWork: selectedWorkFromBundle(recoveredBundle),
    selectedHistoryId: null,
    editingParam: null,
  };
}

export function isConsumerRepairActiveWorkspaceBundle(bundle: ConsumerRepairDraftBundle): boolean {
  return bundle.draft.status === "draft" && !bundle.draft.deletedAt;
}

export function recoverLatestConsumerRepairActiveWorkspace(
  history: ConsumerRepairDraftBundle[],
): ConsumerRepairDraftBundle | null {
  return history.find(isConsumerRepairActiveWorkspaceBundle) ?? null;
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
  | "selectedHistoryId"
  | "editingParam"
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
    selectedHistoryId: null,
    editingParam: null,
    statusMessage,
  };
}

export function buildNewConsumerRepairRequestState(
  statusMessage: string,
  history: ConsumerRepairDraftBundle[] = [],
  approvedHistoryPage?: ConsumerRepairApprovedHistoryPage,
): ConsumerRepairRequestScreenState {
  const initial = buildInitialConsumerRepairRequestState({ history, approvedHistoryPage });
  return {
    ...initial,
    bundle: null,
    selectedWork: null,
    selectedHistoryId: null,
    statusMessage,
  };
}

export function buildApprovedConsumerRepairWorkspaceClearedState(params: {
  history: ConsumerRepairDraftBundle[];
  approvedHistoryPage?: ConsumerRepairApprovedHistoryPage;
  selectedHistoryId?: string | null;
  statusMessage: string;
}): Pick<
  ConsumerRepairRequestScreenState,
  | "bundle"
  | "history"
  | "approvedHistoryPage"
  | "aiAnswerRu"
  | "validationErrors"
  | "catalogPickerVisible"
  | "catalogPickerTargetItemId"
  | "catalogPickerInitialQuery"
  | "lastRemovedItem"
  | "selectedWork"
  | "selectedHistoryId"
  | "editingParam"
  | "statusMessage"
> {
  return {
    bundle: null,
    history: params.history,
    approvedHistoryPage: params.approvedHistoryPage ?? buildConsumerRepairApprovedHistoryPageFromLoadedHistory(params.history),
    aiAnswerRu: null,
    validationErrors: [],
    catalogPickerVisible: false,
    catalogPickerTargetItemId: null,
    catalogPickerInitialQuery: undefined,
    lastRemovedItem: null,
    selectedWork: null,
    selectedHistoryId: params.selectedHistoryId ?? null,
    editingParam: null,
    statusMessage: params.statusMessage,
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
  const nextRawInput = rawInput || selectedWork.rawInput;
  try {
    return buildGlobalSelectedWorkBinding({
      selectedWorkKey: selectedWork.selectedWorkKey,
      rawInput: nextRawInput,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === `UNKNOWN_SELECTED_WORK_KEY:${selectedWork.selectedWorkKey}`
    ) {
      return {
        ...selectedWork,
        rawInput: nextRawInput,
      };
    }
    throw error;
  }
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

export function composeSelectedTemplateCandidateActiveInputText(candidate: InlineWorkTemplateCandidate): string {
  const title = candidate.templateName.trim();
  return title ? `${title} ` : "";
}

export function buildSelectedWorkFromTemplateCandidate(
  candidate: InlineWorkTemplateCandidate,
  rawInput: string,
): GlobalSelectedWorkBinding {
  return buildGlobalSelectedWorkBinding({
    selectedWorkKey: candidate.workKey?.trim() || candidate.family,
    rawInput,
  });
}

function normalizeEditableWorkText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase("ru-RU");
}

export function shouldShowConsumerRepairWorkSuggestions(query: string): boolean {
  const normalized = normalizeEditableWorkText(query);
  if (normalized.length < 2) return false;

  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  const looksLikeFullEstimatePrompt =
    /[:;\n]/.test(query) ||
    wordCount >= 6 ||
    /\b\d+(?:[,.]\d+)?\s*(?:м2|м²|м3|м³|м|км|мм|см|шт|этаж(?:ей|а)?|квт|мвт|ква|dn\d+|d\d+)\b/iu.test(normalized);

  return !looksLikeFullEstimatePrompt;
}

export function composeSelectedWorkActiveInputText(suggestion: GlobalWorkSmartSearchSuggestion): string {
  const title = suggestion.titleRu.trim() || suggestion.visibleText.trim();
  return title ? `${title} ` : "";
}

export function preserveSelectedWorkResolverInput(
  originalRawInput: string,
  composedSelectedWorkText: string,
): string {
  return originalRawInput.trim() || composedSelectedWorkText.trim();
}

export function buildMultiDomainReferenceSelectedWorkBinding(
  rawInput: string,
): GlobalSelectedWorkBinding | null {
  const routed = routeMultiDomainReferencePromptV4(rawInput);
  if (routed.kind !== "MATCH" || routed.catalogWorkId === "asphalt_pavement") return null;
  const passport = MULTI_DOMAIN_REFERENCE_PASSPORTS_V4.find(
    (item) => item.catalogWorkId === routed.catalogWorkId,
  );
  if (!passport) return null;
  const categoryByGroup: Record<string, GlobalWorkCategory> = {
    preparation_demolition: "demolition",
    earthworks: "other",
    foundations: "foundation",
    concrete: "concrete",
    masonry: "masonry",
    interior_finishes: "plastering",
    roofing: "roofing",
    water_supply: "plumbing",
    sewerage: "plumbing",
    electrical_low_current: "electrical",
    heating: "heating_hvac",
  };
  const selectedCategoryKey = categoryByGroup[passport.group] ?? "other";
  return {
    selectedWorkKey: passport.professionalEstimatePassportId,
    selectedTitleRu: passport.professionalNameRu,
    selectedCategoryKey,
    selectedCategoryTitleRu: passport.group,
    rawInput: rawInput.trim(),
    source: "user_selected",
    resolverReGuessed: false,
  };
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
  if (selectedWork || !shouldShowConsumerRepairWorkSuggestions(query)) return [];
  return searchGlobalWorkSmartSuggestions({ query, limit: 8 });
}

function draftHasPricedRows(draft: ConsumerRepairAiDraft | null): boolean {
  return Boolean(draft?.items.some((item) =>
    item.unitPrice != null &&
    item.priceSource !== "missing"
  ));
}

function draftHasPassportBackedNaturalLanguageRows(draft: ConsumerRepairAiDraft | null): boolean {
  return Boolean(draft?.items.some((item) =>
    item.sourceParameters?.passportBackedNaturalLanguageIngress === true
  ));
}

function runtimeDraftReadyForRequestAutoPrepare(
  draft: ConsumerRepairAiDraft | null,
): draft is ConsumerRepairAiDraft {
  if (!draft) return false;
  if (
    draft.repairType === ASPHALT_WORK_ID_V4 ||
    draft.selectedWork?.selectedWorkKey === ASPHALT_WORK_ID_V4
  ) return true;
  if (draft.items.length === 0) return false;
  if (draft.structuredEstimatePayload) return true;
  if (draftHasPricedRows(draft)) return true;
  return draftHasPassportBackedNaturalLanguageRows(draft);
}

function runtimeDraftWinsAgainstFallback(
  draft: ConsumerRepairAiDraft | null,
  fallbackDraft: ConsumerRepairAiDraft,
): draft is ConsumerRepairAiDraft {
  if (!runtimeDraftReadyForRequestAutoPrepare(draft)) return false;
  // A shallow priced catalog match must never replace a work-specific
  // structured estimate resolved from the same natural-language request.
  if (fallbackDraft.structuredEstimatePayload && !draft.structuredEstimatePayload) return false;
  if (draft.structuredEstimatePayload) return true;
  if (draftHasPricedRows(draft)) return true;
  if (!draftHasPassportBackedNaturalLanguageRows(draft)) return false;
  return !fallbackDraft.structuredEstimatePayload && !draftHasPricedRows(fallbackDraft);
}

function normalizePassportPromptText(value: string | null | undefined): string {
  return String(value ?? "")
    .toLocaleLowerCase("ru-RU")
    .replace(/\s+/g, " ")
    .trim();
}

function selectedTemplateIdFromDraft(draft: ConsumerRepairAiDraft | null): string | null {
  return draft?.selectedWork?.selectedWorkKey?.trim() ||
    draft?.items.find((item) => item.templateId?.trim())?.templateId?.trim() ||
    null;
}

function isExactPassportBackedNaturalLanguageDraft(
  draft: ConsumerRepairAiDraft | null,
  problemText: string,
): draft is ConsumerRepairAiDraft {
  if (!runtimeDraftReadyForRequestAutoPrepare(draft)) return false;
  if (draft.items.length < 20) return false;
  if (!draftHasPassportBackedNaturalLanguageRows(draft)) return false;
  const passport = buildProfessionalWorkPassport(selectedTemplateIdFromDraft(draft) ?? "");
  if (!passport) return false;
  const prompt = normalizePassportPromptText(problemText);
  const passportName = normalizePassportPromptText(passport.localizedNameRu);
  return passportName.length > 0 && prompt.includes(passportName);
}

function isMultiDomainReferenceV4Draft(
  draft: ConsumerRepairAiDraft | null,
): draft is ConsumerRepairAiDraft {
  return Boolean(
    draft?.selectedWork?.selectedWorkKey &&
    draft.items.length >= 20 &&
    draft.items.every((item) => item.sourceParameters?.multiDomainReferenceV4 === true),
  );
}

export function buildConsumerRepairSelectedWorkEditableField(params: {
  currentBundle: ConsumerRepairDraftBundle;
  problemText: string;
  selectedWork: GlobalSelectedWorkBinding | null;
}): ConsumerRepairSelectedWork | null {
  const fallback = selectedWorkFromBundle(params.currentBundle);
  const nextProblemText = params.problemText.trim() || params.currentBundle.draft.problemText || "";
  if (
    fallback &&
    params.selectedWork?.selectedWorkKey === fallback.selectedWorkKey &&
    nextProblemText === (params.currentBundle.draft.problemText || "")
  ) {
    return toConsumerRepairSelectedWork(fallback);
  }
  const refreshed = params.selectedWork
    ? refreshSelectedWorkBinding(
        params.selectedWork,
        nextProblemText || params.selectedWork.rawInput,
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
  aiDraft: ReturnType<ConsumerRepairAiDraftBuilder>;
} {
  const {
    buildConsumerRepairAiDraft,
    buildConsumerRepairDraftFromAiEstimateRuntime,
  } = loadConsumerRepairDraftBuilders();
  const nextProblemText = params.problemText.trim();
  // A catalog selection replaces the visible input with its professional
  // title. Preserve the original natural query for runtime routing; otherwise
  // the build step silently compiles the legacy catalog model.
  const resolverInput = params.selectedWork?.rawInput.trim() || nextProblemText;
  const selectedWork = refreshSelectedWorkBinding(params.selectedWork, resolverInput);
  const consumerSelectedWork = selectedWork ? toConsumerRepairSelectedWork(selectedWork) : null;
  const roadScopeResolution = resolveRoadEstimateScopeV4({
    originalText: resolverInput,
    requestedCatalogWorkId: selectedWork?.selectedWorkKey ?? "",
  });
  const scopeSelectionDraft: ConsumerRepairAiDraft | null =
    roadScopeResolution.resolverStatus === "NEEDS_SCOPE_SELECTION"
      ? {
        titleRu: ROAD_SCOPE_SELECTION_QUESTION_RU.question,
        summaryRu: "Выберите состав дорожных работ до создания расчёта.",
        repairType: "road_construction",
        selectedWork: consumerSelectedWork ?? undefined,
        dangerousDiyBlocked: false,
        missingData: ROAD_SCOPE_SELECTION_QUESTION_RU.options.map((option) => option.label),
        items: [],
      }
      : null;
  const runtimeDraft = scopeSelectionDraft ? null : buildConsumerRepairDraftFromAiEstimateRuntime({
      rawInput: resolverInput,
      selectedWorkKey: selectedWork?.selectedWorkKey,
      selectedTemplateId: selectedWork?.selectedWorkKey,
      selectedTemplateName: selectedWork?.selectedTitleRu,
      city: params.city || undefined,
      currency: "KGS",
    });
  const aiDraft = scopeSelectionDraft ?? (runtimeDraft?.selectedWork?.selectedWorkKey === ASPHALT_WORK_ID_V4
    ? runtimeDraft
    : isMultiDomainReferenceV4Draft(runtimeDraft)
      ? runtimeDraft
    : isExactPassportBackedNaturalLanguageDraft(runtimeDraft, resolverInput)
      ? runtimeDraft
    : (() => {
      const fallbackAiDraft = buildConsumerRepairAiDraft(resolverInput, {
        city: params.city || undefined,
        selectedWorkKey: selectedWork?.selectedWorkKey,
        selectedWork: consumerSelectedWork,
      });
      return runtimeDraftWinsAgainstFallback(runtimeDraft, fallbackAiDraft)
        ? runtimeDraft
        : fallbackAiDraft;
    })());
  const selectedWorkForDraft = aiDraft.items.length > 0 &&
    aiDraft.items.every((item) => item.sourceParameters?.multiDomainReferenceV4 === true)
    ? consumerSelectedWork ?? aiDraft.selectedWork
    : aiDraft.selectedWork ?? consumerSelectedWork;
  const bundle = createConsumerRepairRequestDraft({
    consumerUserId: params.consumerUserId,
    problemText: nextProblemText,
    repairType: aiDraft.repairType || selectedWork?.selectedCategoryKey || params.repairType,
    city: params.city || null,
    addressText: params.addressText || null,
    preferredTimeText: params.preferredTimeText || null,
    contactPhone: params.contactPhone || null,
    selectedWork: selectedWorkForDraft,
    aiDraft,
    pendingRoadScopeSelection: scopeSelectionDraft
      ? {
        pendingIntentId: `road-scope:${encodeURIComponent(resolverInput)}:${selectedWork?.selectedWorkKey ?? "natural-input"}`,
        originalUserText: resolverInput,
        requestedCatalogWorkId: selectedWork?.selectedWorkKey ?? ASPHALT_WORK_ID_V4,
        offeredScopes: ROAD_SCOPE_SELECTION_QUESTION_RU.options.map((option) => option.scopeId),
        resolverEvidence: [...roadScopeResolution.evidence],
        resolverVersion: ROAD_SCOPE_RESOLVER_VERSION_V4,
        createdAt: new Date().toISOString(),
      }
      : null,
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
  const revisionState = input.bundle.estimateDraftRevisionState;
  const revision = revisionState?.revisions.find((item) => item.revisionId === revisionState.currentRevisionId) ?? null;
  const projectExecutionDraft = payload
    ? buildProjectExecutionDraftFromEstimate(payload, {
        source: "request_estimate",
        countryCode: payload.locale.countryCode,
        cityOrRegion: payload.locale.city ?? payload.locale.stateOrRegion,
        generatedAt: input.bundle.draft.updatedAt ?? input.bundle.draft.createdAt,
        sourceRequestId: input.bundle.draft.id,
      })
    : revision?.matchedFamily === ASPHALT_WORK_ID_V4 && revision.boq.rows.length > 0
      ? buildProjectExecutionDraftFromRevision(revision, {
          source: "request_estimate",
          countryCode: "KG",
          cityOrRegion: input.bundle.draft.city ?? undefined,
          generatedAt: input.bundle.draft.updatedAt ?? input.bundle.draft.createdAt,
          sourceRequestId: input.bundle.draft.id,
        })
      : null;
  if (!projectExecutionDraft) {
    return {
      bundle: input.bundle,
      statusMessage: "Сначала заполните критические параметры и получите измеримые позиции сметы.",
    };
  }
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

function isConsumerRepairDraftPatchNoop(
  current: ConsumerRepairDraftBundle,
  patch: ReturnType<typeof buildConsumerRepairDraftPatch>,
): boolean {
  const draft = current.draft;
  return draft.problemText === patch.problemText
    && draft.repairType === patch.repairType
    && draft.city === patch.city
    && draft.addressText === patch.addressText
    && draft.preferredTimeText === patch.preferredTimeText
    && draft.contactPhone === patch.contactPhone
    && draft.selectedWorkKey === patch.selectedWorkKey
    && draft.selectedWorkTitleRu === patch.selectedWorkTitleRu
    && draft.selectedWorkCategoryKey === patch.selectedWorkCategoryKey
    && draft.selectedWorkCategoryTitleRu === patch.selectedWorkCategoryTitleRu
    && draft.selectedWorkRawInput === patch.selectedWorkRawInput
    && draft.selectedWorkSource === patch.selectedWorkSource
    && draft.selectedWorkResolverReGuessed === patch.selectedWorkResolverReGuessed;
}

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
    repairType: state.repairType || current.draft.repairType || "Ремонт",
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
  const patch = buildConsumerRepairDraftPatch(fields);
  if (isConsumerRepairDraftPatchNoop(current, patch)) return current;
  return updateConsumerRepairRequestDraft({
    requestDraftId: current.draft.id,
    patch,
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
    formulaId: item.formulaId,
    quantityFormula: item.quantityFormula,
    calculationTrace: item.calculationTrace,
    sourceParameters: item.sourceParameters,
    templateId: item.templateId,
    templateVersion: item.templateVersion,
    normId: item.normId,
    normFamilyId: item.normFamilyId,
    normSourceId: item.normSourceId,
    normSourceTitle: item.normSourceTitle,
    normVersion: item.normVersion,
    normReviewStatus: item.normReviewStatus,
    priceStatus: item.priceStatus,
    priceSource: item.priceSource,
    priceSourceId: item.priceSourceId,
    priceSourceLabel: item.priceSourceLabel,
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

export function addConsumerRepairPhotoMaterialPlaceholder(current: ConsumerRepairDraftBundle): {
  bundle: ConsumerRepairDraftBundle;
  itemId: string;
  statusMessage: string;
} {
  const beforeIds = new Set(current.items.map((item) => item.id));
  const bundle = addConsumerRepairRequestItem({
    requestDraftId: current.draft.id,
    titleRu: "Материал по фото",
    itemType: "material",
    quantity: 1,
    unit: "pcs",
    unitLabel: "шт.",
    unitPrice: null,
    currency: "KGS",
    source: "user_added",
    priceStatus: "PRICE_MISSING",
    priceSource: "missing",
    confidence: "low",
    addedBy: "user",
  });
  const item = bundle.items.find((candidate) => !beforeIds.has(candidate.id) && candidate.itemType === "material");
  if (!item) throw new Error("PHOTO_MATERIAL_PLACEHOLDER_NOT_CREATED");
  return {
    bundle,
    itemId: item.id,
    statusMessage: "Добавлена строка материала по фото. После распознавания выберите материал из каталога.",
  };
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
