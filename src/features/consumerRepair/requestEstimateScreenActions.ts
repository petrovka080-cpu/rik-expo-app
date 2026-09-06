import type React from "react";
import type { TextInput } from "react-native";

import {
  addConsumerRepairRequestCatalogItem,
  addConsumerRepairRequestItem,
  createConsumerRepairRequestDraft,
  listConsumerRepairApprovedHistory,
  listConsumerRepairRequestHistory,
  selectConsumerRepairRequestItemCatalogItem,
  updateConsumerRepairRequestDraft,
  type ConsumerRepairApprovedHistoryPage,
} from "../../lib/consumerRequests/consumerRequestService";
import {
  ConsumerRepairValidationError,
  sendConsumerRepairRequestToMarketplace,
} from "../../lib/consumerRequests/consumerRequestMarketplaceService";
import type {
  ConsumerRepairDraftBundle,
  ConsumerRepairRequestItem,
  ConsumerRepairSelectedWork,
  ConsumerRequestValidationErrorItem,
} from "../../lib/consumerRequests/consumerRequestTypes";
import type {
  GlobalSelectedWorkBinding,
  GlobalWorkSmartSearchSuggestion,
} from "../../lib/ai/globalEstimate/globalWorkSmartSearch";
import type { GlobalWorkCategory } from "../../lib/ai/globalEstimate/globalEstimateTypes";
import type { InlineWorkTemplateCandidate } from "../../lib/ai/matchWorkTemplateFromPrompt";
import { mapPickerItemToCatalogItemForEstimate } from "../../lib/catalog/catalogItemsService";
import type { CatalogItemPickerItem } from "../../lib/catalog/catalogItemPickerTypes";
import type { UserParamPatchOperation } from "../../lib/estimate/validateUserParamPatch";
import type { CanonicalParameterSession } from "../../lib/estimate/canonicalParameters";
import type {
  CanonicalEstimateSearchItem,
  CanonicalEstimateSearchPage,
} from "../../lib/estimate/backendPlatform/contracts";
import { canonicalWorkSearchQueryFromPrompt } from "../../lib/estimate/backendPlatform/canonicalEstimateSearchInput";
import { toVisibleEstimateLabel } from "../../lib/estimatePresentation/visibleEstimateLabelPolicy";
export type ConsumerRepairParamEditState = {
  key: string;
  operation: UserParamPatchOperation;
} | null;

export type ConsumerRepairCanonicalWorkSearchState = {
  query: string;
  suggestions: GlobalWorkSmartSearchSuggestion[];
  literalTotalCount: number;
  globalLiteralTotalCount: number;
  externalLiteralTotalCount: number;
  suggestionTotalCount: number;
  shownCount: number;
  nextCursor: string | null;
  searchIndexReleaseId: string | null;
  searchIndexSnapshotSha256: string | null;
  resultSetSha256: string | null;
  loading: boolean;
  errorRu: string | null;
};

export function emptyConsumerRepairCanonicalWorkSearchState(): ConsumerRepairCanonicalWorkSearchState {
  return {
    query: "",
    suggestions: [],
    literalTotalCount: 0,
    globalLiteralTotalCount: 0,
    externalLiteralTotalCount: 0,
    suggestionTotalCount: 0,
    shownCount: 0,
    nextCursor: null,
    searchIndexReleaseId: null,
    searchIndexSnapshotSha256: null,
    resultSetSha256: null,
    loading: false,
    errorRu: null,
  };
}

export type ConsumerRepairRequestScreenState = {
  problemText: string;
  repairType: string;
  city: string;
  addressText: string;
  preferredTimeText: string;
  contactPhone: string;
  roadScopeSelectionBusy?: boolean;
  pdfOpenBusy?: boolean;
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
  canonicalWorkSearch: ConsumerRepairCanonicalWorkSearchState;
  canonicalBackendParameterSession?: CanonicalParameterSession | null;
};

export function buildEmptyConsumerRepairApprovedHistoryPage(
  limit = 20,
): ConsumerRepairApprovedHistoryPage {
  const pageSize = Math.min(Math.max(limit, 1), 20);
  return {
    items: [],
    records: [],
    unresolvedRecords: [],
    totalApprovedCount: 0,
    archivedApprovedCount: 0,
    nextCursorCreatedAt: null,
    pageSize,
    totalCountSource: "durable_store",
  };
}

export function sendConsumerRepairHistoryToMarketplaceFromScreen(input: {
  requestDraftId: string;
  userId: string;
  canonicalArtifact: {
    artifactId: string;
    kind: "procurement";
    revisionId: string;
    releaseId: string;
    status: "ready";
    sha256: string | null;
  };
}): Pick<
  ConsumerRepairRequestScreenState,
  "history" | "approvedHistoryPage" | "selectedHistoryId" | "validationErrors" | "statusMessage"
> {
  sendConsumerRepairRequestToMarketplace({
    requestDraftId: input.requestDraftId,
    userId: input.userId,
    idempotencyKey: `consumer-marketplace:${input.requestDraftId}`,
    canonicalArtifact: input.canonicalArtifact,
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
  const existingUnresolvedIds = new Set((page.unresolvedRecords ?? []).map((record) => record.approvedEstimateId));
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
    unresolvedRecords: [
      ...(page.unresolvedRecords ?? []),
      ...(nextPage.unresolvedRecords ?? []).filter((record) => !existingUnresolvedIds.has(record.approvedEstimateId)),
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

export function buildEstimateDraftSessionTransitionStatusMessage(
  bundle: ConsumerRepairDraftBundle,
): string {
  switch (bundle.estimateDraftSession?.status) {
    case "PARAMETERS_REQUIRED":
      return "Состав работ выбран. Укажите обязательные параметры для расчёта.";
    case "REVIEW":
      return "Состав работ выбран. Смета рассчитана.";
    case "STALE_RESULT_REJECTED":
      return "Результат устарел и не был применён. Проверьте текущие параметры.";
    case "COMPILE_FAILED":
      return "Не удалось выполнить расчёт из текущих параметров.";
    default:
      return "Состояние сметы обновлено.";
  }
}

export function buildInitialConsumerRepairRequestState(params: {
  initialProblemText?: string;
  initialDraftId?: string;
  history: ConsumerRepairDraftBundle[];
  approvedHistoryPage?: ConsumerRepairApprovedHistoryPage;
}): ConsumerRepairRequestScreenState {
  const initialProblemText = normalizeInitialProblemText(params.initialProblemText);
  const initialDraftId = String(params.initialDraftId ?? "").trim();
  const recoveredBundle = initialDraftId
    ? params.history.find((bundle) =>
      isConsumerRepairActiveWorkspaceBundle(bundle) && bundle.draft.id === initialDraftId
    ) ?? null
    : null;
  const exactDraftMissing = Boolean(initialDraftId && !recoveredBundle);
  return {
    problemText: recoveredBundle ? "" : initialProblemText,
    repairType: "Ремонт",
    city: recoveredBundle?.draft.city ?? "",
    addressText: recoveredBundle?.draft.addressText ?? "",
    preferredTimeText: recoveredBundle?.draft.preferredTimeText ?? "",
    contactPhone: recoveredBundle?.draft.contactPhone ?? "",
    bundle: recoveredBundle,
    history: params.history,
    approvedHistoryPage: params.approvedHistoryPage ?? buildConsumerRepairApprovedHistoryPageFromLoadedHistory(params.history),
    aiAnswerRu: null,
    statusMessage: exactDraftMissing
      ? "Указанный черновик не найден или недоступен. Создана чистая сессия без переноса данных."
      : null,
    validationErrors: [],
    catalogPickerVisible: false,
    catalogPickerTargetItemId: null,
    catalogPickerInitialQuery: undefined,
    lastRemovedItem: null,
    // The input composer is a new draft session even while an exact historical
    // workspace is displayed. WorkIntent remains owned by that bundle until an
    // explicit clone or a new catalog selection.
    selectedWork: null,
    selectedHistoryId: null,
    editingParam: null,
    canonicalWorkSearch: emptyConsumerRepairCanonicalWorkSearchState(),
  };
}

export function isConsumerRepairActiveWorkspaceBundle(bundle: ConsumerRepairDraftBundle): boolean {
  return bundle.draft.status === "draft" && !bundle.draft.deletedAt;
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
    selectedCatalogWorkId: binding.selectedWorkKey,
    selectedWorkKey: binding.selectedWorkKey,
    selectedWorkTitleRu: binding.selectedTitleRu,
    selectedWorkCategoryKey: binding.selectedCategoryKey,
    selectedWorkCategoryTitleRu: binding.selectedCategoryTitleRu,
    selectedWorkRawInput: binding.rawInput,
    selectedWorkSource: binding.source,
    selectedWorkResolverReGuessed: binding.resolverReGuessed,
  };
}

export function buildConsumerRepairExactCatalogLaunchSelectedWork(input: {
  catalogWorkId: string;
  rawInput: string;
}): GlobalSelectedWorkBinding {
  const catalogWorkId = input.catalogWorkId.trim();
  const rawInput = input.rawInput.trim();
  if (!catalogWorkId) throw new Error("CANONICAL_CATALOG_ID_REQUIRED");
  const visibleQuery = canonicalWorkSearchQueryFromPrompt(rawInput).trim();
  return {
    selectedWorkKey: catalogWorkId,
    // Backend search/admission is the identity authority. Until that exact
    // catalog row is loaded, preserve a human query as the visible title and
    // never expose the internal catalog identifier as customer copy.
    selectedTitleRu: visibleQuery || "Выбранный вид работ",
    selectedCategoryKey: "other",
    selectedCategoryTitleRu: "Вид работ",
    rawInput,
    source: "user_selected",
    resolverReGuessed: false,
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
    selectedWorkKey:
      bundle.draft.selectedCatalogWorkId ?? bundle.draft.selectedWorkKey,
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
  return { ...selectedWork, rawInput: rawInput || selectedWork.rawInput };
}

export function buildSelectedWorkFromSuggestion(
  suggestion: GlobalWorkSmartSearchSuggestion,
  rawInput: string,
): GlobalSelectedWorkBinding {
  return {
    selectedWorkKey: suggestion.workKey,
    selectedTitleRu: suggestion.titleRu,
    selectedCategoryKey: suggestion.categoryKey,
    selectedCategoryTitleRu: suggestion.categoryTitleRu,
    rawInput,
    source: "user_selected",
    resolverReGuessed: false,
  };
}

export function composeSelectedTemplateCandidateActiveInputText(candidate: InlineWorkTemplateCandidate): string {
  const title = candidate.templateName.trim();
  return title ? `${title} ` : "";
}

export function buildSelectedWorkFromTemplateCandidate(
  candidate: InlineWorkTemplateCandidate,
  rawInput: string,
): GlobalSelectedWorkBinding {
  return {
    selectedWorkKey: candidate.workKey?.trim() || candidate.family,
    selectedTitleRu: candidate.templateName,
    selectedCategoryKey: "other",
    selectedCategoryTitleRu: candidate.family,
    rawInput,
    source: "user_selected",
    resolverReGuessed: false,
  };
}

function normalizeEditableWorkText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase("ru-RU");
}

export function shouldShowConsumerRepairWorkSuggestions(query: string): boolean {
  const normalized = normalizeEditableWorkText(query);
  return normalized.length >= 2;
}

export function composeSelectedWorkActiveInputText(suggestion: GlobalWorkSmartSearchSuggestion): string {
  const title = suggestion.titleRu.trim() || suggestion.visibleText.trim();
  return title ? `${title} ` : "";
}

export function composeSelectedWorkProblemText(
  suggestion: GlobalWorkSmartSearchSuggestion,
  originalRawInput: string,
): string {
  const original = originalRawInput.trim();
  if (original && canonicalWorkSearchQueryFromPrompt(original) !== original) return original;
  return composeSelectedWorkActiveInputText(suggestion);
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
  const normalized = normalizeEditableWorkText(rawInput);
  const asphaltDrainageIntent =
    /^(?:(?:нужн\p{L}*|смет\p{L}*)\s+)?(?:с\s+)?(?:(?:устройств|монтаж|прокладк)\p{L}*\s+)?(?:(?:систем\p{L}*|линейн\p{L}*)\s+)?(?:водоотвод\p{L}*|дренаж\p{L}*|ливнев\p{L}*)/iu.test(normalized)
    && /асфальт\p{L}*(?:\s+покрыт\p{L}*|\s+площад\p{L}*|\s+территор\p{L}*)?/iu.test(normalized);
  if (asphaltDrainageIntent) {
    return {
      selectedWorkKey: "canonical-work:base:paving_roads_landscape_interior_asphalt_drain_large_area",
      selectedTitleRu: "Устройство системы водоотвода асфальтированного покрытия",
      selectedCategoryKey: "roadworks",
      selectedCategoryTitleRu: "Дорожные работы и водоотвод",
      rawInput: rawInput.trim(),
      source: "user_selected",
      resolverReGuessed: false,
    };
  }
  const stripFoundationIntent =
    /(?:устройств|возвед|бетонирован|заливк|монтаж)[^.;]{0,80}ленточн\p{L}*\s+фундамент\p{L}*/iu.test(normalized) ||
    /ленточн\p{L}*\s+фундамент\p{L}*[^.;]{0,80}(?:устройств|возвед|бетонирован|заливк|монтаж)/iu.test(normalized);
  if (stripFoundationIntent) {
    return {
      selectedWorkKey: "canonical-work:expanded:strip_foundation",
      selectedTitleRu: "Устройство монолитного железобетонного ленточного фундамента",
      selectedCategoryKey: "concrete",
      selectedCategoryTitleRu: "Бетонные и железобетонные работы",
      rawInput: rawInput.trim(),
      source: "user_selected",
      resolverReGuessed: false,
    };
  }
  return null;
}

const CANONICAL_BASELINE_MISSING_LABEL_RU: Readonly<Record<string, string>> = {
  total_axis_length_m: "общая длина ленты по оси",
  strip_width_m: "ширина ленты",
  strip_height_m: "высота бетонной ленты",
  preparation_thickness_m: "толщина бетонной подготовки",
  reinforcement_mass_t: "масса арматуры по проектной ведомости",
  binding_wire_mass_kg: "масса вязальной проволоки",
  formwork_transport_mass_t: "транспортная масса опалубки",
  groundworks_included: "входит ли разработка грунта",
  foundation_bedding_included: "входит ли подушка основания",
  waterproofing_included: "входит ли гидроизоляция",
  backfill_included: "входит ли обратная засыпка",
  soil_disposal_included: "входит ли вывоз лишнего грунта",
  system_type: "тип системы: линейные лотки, подземный дренаж или дождевая сеть",
  route_length_m: "проектная длина трассы водоотвода",
  design_slope_percent: "проектный продольный уклон",
  trench_width_m: "ширина траншеи",
  trench_depth_m: "средняя глубина траншеи",
  bedding_material: "материал подготовки",
  bedding_thickness_m: "толщина подготовки",
  backfill_cross_section_m2: "сечение обратной засыпки",
  outlet_connection_count: "количество подключений к выпуску",
  outfall_status: "подтверждённый выпуск",
  surface_restoration_scope: "граница восстановления асфальта",
};

export function canonicalBaselineContractMissingStatusMessage(code: string): string {
  const prefix = "CANONICAL_BASELINE_CONTRACT_MISSING:";
  if (!code.startsWith(prefix)) {
    return "Для этой работы не заполнены обязательные исходные данные. Черновик сохранён — уточните параметры или повторите расчёт.";
  }
  const labels = [...new Set(code.slice(prefix.length).split(",").map((parameterId) => parameterId.trim()).filter(Boolean))]
    .map((parameterId) => CANONICAL_BASELINE_MISSING_LABEL_RU[parameterId] ?? parameterId.replace(/_/gu, " "));
  const foundationMissing = code.includes("total_axis_length_m") || code.includes("strip_width_m") || code.includes("strip_height_m");
  const drainageMissing = code.includes("system_type") || code.includes("route_length_m") || code.includes("design_slope_percent");
  const scopeGuard = foundationMissing
    ? " Размеры здания не используются как размеры фундаментной ленты."
    : drainageMissing
      ? " Площадь покрытия не используется как длина, сечение или количество узлов водоотвода."
      : "";
  return labels.length > 0
    ? `Нужно уточнить обязательные параметры: ${labels.join("; ")}.${scopeGuard}`
    : "Для этой работы не заполнены обязательные исходные данные. Черновик сохранён — уточните параметры или повторите расчёт.";
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
  void query;
  void selectedWork;
  return [];
}

const CANONICAL_DOMAIN_CATEGORY: Readonly<Record<string, GlobalWorkCategory>> = {
  asphalt: "roadworks",
  roadworks: "roadworks",
  concrete: "concrete",
  drywall: "drywall",
  electrical: "electrical",
  water_supply_sewerage: "plumbing",
  plumbing: "plumbing",
  hvac_heat_supply: "heating_hvac",
  heating_hvac: "heating_hvac",
  fire: "other",
  fire_life_safety: "other",
};

function canonicalPrimaryUomToGlobalUnit(
  value: string,
): GlobalWorkSmartSearchSuggestion["defaultMeasureUnit"] {
  const unit = value.trim().toLocaleLowerCase("en").replace(/²/gu, "2").replace(/³/gu, "3");
  if (["m2", "sq_m", "sqm"].includes(unit)) return "sq_m";
  if (["m3", "cu_m"].includes(unit)) return "m3";
  if (["m", "linear_m", "lm"].includes(unit)) return "linear_m";
  if (["kg", "kilogram"].includes(unit)) return "kg";
  if (["t", "ton", "tonne"].includes(unit)) return "ton";
  if (["set", "компл"].includes(unit)) return "set";
  if (["shift", "смена"].includes(unit)) return "shift";
  return "pcs";
}

export function canonicalSearchItemToConsumerRepairSuggestion(
  item: CanonicalEstimateSearchItem,
): GlobalWorkSmartSearchSuggestion {
  const categoryKey = CANONICAL_DOMAIN_CATEGORY[item.domainId] ?? "other";
  return {
    workKey: item.catalogId,
    titleRu: item.canonicalNameRu,
    categoryKey,
    categoryTitleRu: item.groupNameRu,
    defaultMeasureUnit: canonicalPrimaryUomToGlobalUnit(item.primaryUom),
    score: Math.max(0, 1 - ((item.matchTier - 1) * 0.1)),
    matchKind: item.matchTier === 1
      ? "exact_title"
      : item.matchTier === 2
        ? "exact_alias"
        : item.matchTier <= 5
          ? "phrase"
          : "token_overlap",
    matchedTokens: item.matchedTerm ? [item.matchedTerm] : [],
    estimateReady: item.estimateReady === true
      && item.contentAdmission?.allowed === true
      && item.contentAdmission.contractVersion === "estimate-admission-r3",
    nonselectableReasonRu: item.nonselectableReasonRu,
    visibleText: `${item.canonicalNameRu} · ${item.groupNameRu}`,
  };
}

export function mergeConsumerRepairCanonicalWorkSearchPage(input: {
  query: string;
  page: CanonicalEstimateSearchPage;
  previous?: ConsumerRepairCanonicalWorkSearchState | null;
  append: boolean;
}): ConsumerRepairCanonicalWorkSearchState {
  const previous = input.append ? input.previous : null;
  if (previous?.searchIndexReleaseId && previous.searchIndexReleaseId !== input.page.searchIndexReleaseId) {
    throw new Error("CANONICAL_SEARCH_RELEASE_CHANGED_DURING_PAGINATION");
  }
  if (previous?.searchIndexSnapshotSha256 && previous.searchIndexSnapshotSha256 !== input.page.searchIndexSnapshotSha256) {
    throw new Error("CANONICAL_SEARCH_SNAPSHOT_CHANGED_DURING_PAGINATION");
  }
  if (previous?.resultSetSha256 && previous.resultSetSha256 !== input.page.resultSetSha256) {
    throw new Error("CANONICAL_SEARCH_RESULT_SET_CHANGED_DURING_PAGINATION");
  }
  const byCatalogId = new Map<string, GlobalWorkSmartSearchSuggestion>();
  for (const suggestion of previous?.suggestions ?? []) byCatalogId.set(suggestion.workKey, suggestion);
  for (const item of input.page.items) byCatalogId.set(item.catalogId, canonicalSearchItemToConsumerRepairSuggestion(item));
  const suggestions = [...byCatalogId.values()];
  if (suggestions.length !== (previous?.suggestions.length ?? 0) + input.page.items.length) {
    throw new Error("CANONICAL_SEARCH_CURSOR_DUPLICATE");
  }
  return {
    query: input.query,
    suggestions,
    literalTotalCount: input.page.literalTotalCount,
    globalLiteralTotalCount: input.page.globalLiteralTotalCount,
    externalLiteralTotalCount: input.page.externalLiteralTotalCount,
    suggestionTotalCount: input.page.suggestionTotalCount,
    shownCount: suggestions.length,
    nextCursor: input.page.nextCursor,
    searchIndexReleaseId: input.page.searchIndexReleaseId,
    searchIndexSnapshotSha256: input.page.searchIndexSnapshotSha256,
    resultSetSha256: input.page.resultSetSha256,
    loading: false,
    errorRu: null,
  };
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
    const draft = params.currentBundle.draft;
    if (
      draft.selectedWorkKey &&
      draft.selectedWorkTitleRu &&
      draft.selectedWorkCategoryKey &&
      draft.selectedWorkCategoryTitleRu
    ) {
      return {
        selectedCatalogWorkId: draft.selectedCatalogWorkId ?? null,
        selectedWorkKey: draft.selectedWorkKey,
        selectedWorkTitleRu: draft.selectedWorkTitleRu,
        selectedWorkCategoryKey: draft.selectedWorkCategoryKey,
        selectedWorkCategoryTitleRu: draft.selectedWorkCategoryTitleRu,
        selectedWorkRawInput: draft.selectedWorkRawInput ?? draft.problemText ?? "",
        selectedWorkSource: "user_selected",
        selectedWorkResolverReGuessed: false,
      };
    }
  }
  const refreshed = params.selectedWork
    ? refreshSelectedWorkBinding(
        params.selectedWork,
        nextProblemText || params.selectedWork.rawInput,
      )
    : fallback;
  return refreshed ? toConsumerRepairSelectedWork(refreshed) : null;
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
