import React from "react";
import { router } from "expo-router";
import { Linking, Text, TextInput, View } from "react-native";
import {
  approveConsumerRepairRequestDraft,
  attachConsumerRepairEstimateRowPhoto,
  buildApprovedEstimateHistoryRecord,
  commitPreparedConsumerRepairRequestBundle,
  createConsumerRepairRequestDraft,
  deleteConsumerRepairRequestDraft,
  listConsumerRepairApprovedHistory, listConsumerRepairRequestHistory, removeConsumerRepairRequestItem,
  prepareConsumerRepairRequestItemQuantityUpdate, updateConsumerRepairRequestItemUnitPrice,
  selectConsumerRepairRoadScopeV4,
  type ConsumerRepairDraftRevisionParamBatchPatch,
} from "../../lib/consumerRequests/consumerRequestService";
import { ConsumerRepairValidationError } from "../../lib/consumerRequests/consumerRequestMarketplaceService";
import { logger } from "../../lib/logger";
import type {
  ConsumerRepairDraftBundle,
} from "../../lib/consumerRequests/consumerRequestTypes";
import {
  hydrateNextTransactionalConsumerRepairHistoryPage,
} from "../../lib/consumerRequests/consumerRequestRepository";
import type { GlobalWorkSmartSearchSuggestion } from "../../lib/ai/globalEstimate/globalWorkSmartSearch";
import type { InlineWorkTemplateCandidate } from "../../lib/ai/matchWorkTemplateFromPrompt";
import type { UserParamPatchOperation } from "../../lib/estimate/validateUserParamPatch";
import type { CatalogItemPickerItem } from "../../lib/catalog/catalogItemPickerTypes";
import { awaitTransactionalConsumerRepairBundleCommit } from "../../lib/platform/consumerRepairTransactionalDurableBridge";
import { recordRequestEstimateLaunchStage } from "../../lib/navigation/requestEstimateLaunchObservability";
import {
  markRequestEstimateIntentStage,
  requestEstimateIntentLifecycle,
} from "../../lib/navigation/requestEstimateLaunchLifecycle";
import type { ConsumerRepairPhotoMaterialCaptureResult, OpenConsumerRepairPhotoForMaterialRecognitionInput } from "./useConsumerRepairPhotoCaptureController";
import { MARKET_TAB_ROUTE } from "../market/market.routes";
import {
  assertCanonicalEstimateArtifactIdentity,
  buildCanonicalEstimateArtifact,
  getCanonicalEstimateArtifact,
  getCanonicalEstimateCatalogItem,
  getCanonicalEstimateRevision,
  searchCanonicalEstimateCatalog,
} from "../../lib/estimate/backendPlatform/canonicalEstimateClient";
import { CanonicalEstimateApiError, type CanonicalEstimateRowOverride } from "../../lib/estimate/backendPlatform/contracts";
import { createPdfDocumentDescriptor } from "../../lib/documents/pdfDocument";
import { previewPdfDocument } from "../../lib/documents/pdfDocumentActions";
import { canonicalWorkSearchQueryFromPrompt } from "../../lib/estimate/backendPlatform/canonicalEstimateSearchInput";
import {
  createConsumerRepairQuantityEditOperationId,
  recordConsumerRepairQuantityEditStage,
  type ConsumerRepairQuantityChangeMeta,
} from "./consumerRepairQuantityEditTrace";
import { buildConsumerRepairRequestRenderModel } from "./ConsumerRepairRequestScreenRenderModel";
import { consumerRepairRequestScreenStyles as styles } from "./ConsumerRepairRequestScreen.styles";
import { ConsumerRepairRequestScreenView } from "./ConsumerRepairRequestScreenView";
import {
  appendNextApprovedHistoryPage,
  addConsumerRepairCustomNoteItem, addConsumerRepairPhotoMaterialPlaceholder, applyConsumerRepairCatalogItemSelection, buildDeletedConsumerRepairDraftState,
  buildApprovedConsumerRepairWorkspaceClearedState,
  canonicalBaselineContractMissingStatusMessage,
  buildEstimateDraftSessionTransitionStatusMessage, canonicalSearchItemToConsumerRepairSuggestion,
  buildEmptyConsumerRepairApprovedHistoryPage, buildInitialConsumerRepairRequestState,
  buildConsumerRepairExactCatalogLaunchSelectedWork, buildMultiDomainReferenceSelectedWorkBinding, buildNewConsumerRepairRequestState, buildSelectedWorkFromSuggestion, buildSelectedWorkFromTemplateCandidate, catalogInitialQueryForRequestItem,
  composeSelectedTemplateCandidateActiveInputText, composeSelectedWorkProblemText, focusConsumerRepairProblemInputAtEnd,
  emptyConsumerRepairCanonicalWorkSearchState, mergeConsumerRepairCanonicalWorkSearchPage,
  preserveSelectedWorkResolverInput,
  parseEditableEstimateNumberInput, restoreConsumerRepairRequestItem, selectedWorkFromBundle, toConsumerRepairSelectedWork,
  sendConsumerRepairHistoryToMarketplaceFromScreen,
  shouldPreserveSelectedWorkForProblemText, shouldShowConsumerRepairWorkSuggestions, syncConsumerRepairDraftFromScreenState,
  type ConsumerRepairRequestScreenState,
} from "./requestEstimateScreenActions";
import { consumerRepairCanonicalBackendBinding } from "./consumerRepairBackendOwnership";
import type { CanonicalParameterSession } from "../../lib/estimate/canonicalParameters";
import {
  buildConsumerEstimateActionContext,
  ConsumerEstimateActionContextError,
  resolveConsumerEstimateLineActionContext,
  type ConsumerEstimateActionContext,
  type ConsumerEstimateActionName,
} from "./consumerEstimateActionRouter";

const QUANTITY_EDIT_SAVING_MESSAGE = "\u0421\u043c\u0435\u0442\u0430 \u0441\u043e\u0445\u0440\u0430\u043d\u044f\u0435\u0442\u0441\u044f.";
const QUANTITY_EDIT_SAVED_MESSAGE = "\u0421\u043c\u0435\u0442\u0430 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0430.";
const QUANTITY_EDIT_SAVE_FAILED_MESSAGE =
  "\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u044f. \u041f\u0440\u0430\u0432\u043a\u0430 \u0432\u0438\u0434\u043d\u0430, \u043d\u043e \u0435\u0449\u0435 \u043d\u0435 \u0437\u0430\u0444\u0438\u043a\u0441\u0438\u0440\u043e\u0432\u0430\u043d\u0430.";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function applyVisibleQuantityDraft(
  bundle: ConsumerRepairDraftBundle,
  itemId: string,
  quantity: number,
): ConsumerRepairDraftBundle {
  const nextQuantity = Math.max(0, Number.isFinite(quantity) ? quantity : 0);
  return {
    ...bundle,
    items: bundle.items.map((item) =>
      item.id === itemId
        ? {
          ...item,
          quantity: nextQuantity,
          totalPrice: item.unitPrice != null ? roundMoney(nextQuantity * item.unitPrice) : item.totalPrice ?? null,
          quantityEditedByConsumer: true,
        }
        : item
    ),
  };
}

function runAfterNextPaint(task: () => void): void {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(task);
    return;
  }
  void Promise.resolve().then(task);
}

function hasMemoryOnlyDurableSaveFailure(bundle: ConsumerRepairDraftBundle): boolean {
  return bundle.events.some((event) => {
    if (event.eventType !== "consumer_repair_durable_save_emergency_compacted") return false;
    const reason = event.payload?.reason;
    return typeof reason === "string" && reason.includes("persist_failed_memory_only");
  });
}

type State = ConsumerRepairRequestScreenState;
export type EnsureConsumerRepairDraftBundleResult =
  | { status: "READY"; bundle: ConsumerRepairDraftBundle }
  | { status: "REVISION_RECOVERED"; bundle: ConsumerRepairDraftBundle }
  | { status: "PENDING_DRAFT_ACTION"; bundle: ConsumerRepairDraftBundle }
  | { status: "RETRYABLE_ERROR"; bundle: ConsumerRepairDraftBundle | null; message: string }
  | { status: "BLOCKED_WITH_REASON"; bundle: ConsumerRepairDraftBundle | null; message: string };

export type ConsumerRepairRequestScreenProps = {
  consumerUserId?: string;
  initialProblemText?: string;
  initialDraftId?: string;
  initialSelectedCatalogWorkId?: string;
  initialCanonicalRevisionId?: string;
  launchFingerprint?: string;
  launchId?: string;
  autoPrepare?: boolean;
  autoPdf?: boolean;
};
export type ConsumerRepairRequestScreenControllerProps = ConsumerRepairRequestScreenProps & {
  consumerUserId: string;
  onInitialLaunchBuildSettled?: () => void;
  onPrepareCanonicalEstimate: (
    problemText: string,
    catalogId: string,
    requestDraftId?: string | null,
  ) => Promise<ConsumerRepairDraftBundle | null>;
  onLoadCanonicalRevisionDraft: (input: {
    revisionId: string;
    requestDraftId?: string | null;
    problemText?: string | null;
  }) => Promise<ConsumerRepairDraftBundle | null>;
  onLoadCanonicalParameterSession: (
    revisionId: string,
    requestDraftId: string,
  ) => Promise<CanonicalParameterSession>;
  onRecalculateCanonicalEstimate: (input: {
    revisionId: string;
    requestDraftId: string;
    problemText: string;
    patches: ConsumerRepairDraftRevisionParamBatchPatch[];
    rowOverrides?: Record<string, CanonicalEstimateRowOverride>;
  }) => Promise<{ session: CanonicalParameterSession; bundle: ConsumerRepairDraftBundle }>;
  onSelectCanonicalCatalogItem: (input: {
    context: ConsumerEstimateActionContext;
    problemText: string;
    catalogItem: CatalogItemPickerItem;
  }) => Promise<void>;
  onAddCanonicalCatalogItem: (input: {
    context: ConsumerEstimateActionContext;
    problemText: string;
    catalogItem: CatalogItemPickerItem;
  }) => Promise<void>;
  onOpenPhotoForMaterialRecognition: (input: OpenConsumerRepairPhotoForMaterialRecognitionInput) => void;
  MobilePhotoCaptureFlowNode?: React.ReactElement | null;
};

export function isFreshRequestEstimateLaunchWorkspace(
  props: ConsumerRepairRequestScreenProps,
): boolean {
  return Boolean(
    props.launchId?.trim() &&
    props.initialProblemText?.trim() &&
    !props.initialDraftId?.trim()
  );
}

export function shouldDeferInitialHistoryLoad(props: ConsumerRepairRequestScreenProps): boolean {
  return Boolean(
    shouldAutoPrepareInitialConsumerRepairRequest(props) ||
    isFreshRequestEstimateLaunchWorkspace(props)
  );
}

function buildInitialControllerState(props: ConsumerRepairRequestScreenControllerProps): State {
  if (shouldDeferInitialHistoryLoad(props)) {
    return buildInitialConsumerRepairRequestState({
      initialProblemText: props.initialProblemText,
      initialDraftId: props.initialDraftId,
      history: [],
      approvedHistoryPage: buildEmptyConsumerRepairApprovedHistoryPage(),
    });
  }
  return buildInitialConsumerRepairRequestState({
    initialProblemText: props.initialProblemText,
    initialDraftId: props.initialDraftId,
    history: listConsumerRepairRequestHistory(props.consumerUserId),
    approvedHistoryPage: listConsumerRepairApprovedHistory(props.consumerUserId),
  });
}

export function shouldAutoPrepareInitialConsumerRepairRequest(props: ConsumerRepairRequestScreenProps): boolean {
  // Once a route is bound to an exact draft, that identity is authoritative.
  // The prompt may remain in the URL as provenance, but it must never create a
  // second draft during the route remount caused by binding `draftId`.
  if (props.initialDraftId?.trim()) return false;
  if (
    props.launchId?.trim() &&
    props.initialProblemText?.trim() &&
    !props.autoPrepare &&
    !props.autoPdf
  ) {
    return false;
  }
  return Boolean(props.autoPrepare || props.autoPdf || props.initialProblemText?.trim());
}

export function shouldSkipAcknowledgedRequestEstimateLaunch(input: {
  launchId: string | null | undefined;
  isAcknowledged: (launchId: string) => boolean;
  launchFingerprint?: string | null;
  isFingerprintAcknowledged?: (fingerprint: string) => boolean;
}): boolean {
  const launchId = input.launchId?.trim();
  if (launchId) return input.isAcknowledged(launchId);
  const fingerprint = input.launchFingerprint?.trim();
  return Boolean(
    fingerprint && input.isFingerprintAcknowledged?.(fingerprint),
  );
}

export function isRequestEstimateLaunchBundleRendered(input: {
  bundle: ConsumerRepairDraftBundle;
  expectedPrompt: string | null | undefined;
  renderedBundleId: string | null | undefined;
}): boolean {
  const expectedPrompt = input.expectedPrompt?.trim() ?? "";
  return Boolean(
    expectedPrompt &&
    input.renderedBundleId === input.bundle.draft.id &&
    input.bundle.draft.problemText?.trim() === expectedPrompt,
  );
}

export function shouldReuseAcknowledgedRequestEstimateLaunch(input: {
  acknowledged: boolean;
  requestDraftId: string | null | undefined;
  autoPrepare?: boolean;
  autoPdf?: boolean;
}): boolean {
  if (!input.acknowledged) return false;
  if (input.requestDraftId?.trim()) return true;
  return !input.autoPrepare && !input.autoPdf;
}

export function isRequestEstimatePromptComposerRendered(input: {
  bundle: ConsumerRepairDraftBundle | null;
  problemText: string;
  expectedPrompt: string | null | undefined;
}): boolean {
  const expectedPrompt = input.expectedPrompt?.trim() ?? "";
  return Boolean(
    expectedPrompt &&
    input.bundle == null &&
    input.problemText.trim() === expectedPrompt,
  );
}

export class ConsumerRepairRequestScreenController extends React.Component<ConsumerRepairRequestScreenControllerProps, State> {
  private initialDeepLinkApplied = false;
  private launchIntentAcknowledged = false;
  private cachedScreenViewState: State | null = null;
  private cachedScreenView: React.ReactElement | null = null;
  private historyLoaded = !shouldDeferInitialHistoryLoad(this.props);
  private workSuggestionsEnabled =
    !isFreshRequestEstimateLaunchWorkspace(this.props);
  private runtimeIngressProjection: {
    launchId: string;
    prompt: string;
  } | null = null;
  private unsubscribeRuntimeLaunch: (() => void) | null = null;
  private pendingDurableQuantityCommitId = 0;
  private canonicalBaselineCompileInFlight = false;
  private canonicalQuantityRecalculationInFlightKey: string | null = null;
  private canonicalPriceRecalculationInFlightKey: string | null = null;
  private canonicalRowAmendmentInFlightKey: string | null = null;
  private approvalCommitInFlight = false;
  private durableHistoryLoadInFlight = false;
  private canonicalWorkSearchTimer: ReturnType<typeof setTimeout> | null = null;
  private canonicalWorkSearchAbortController: AbortController | null = null;
  private canonicalWorkSearchRequestSerial = 0;
  private currentScrollPosition = 0;
  private pendingCatalogActionContext: ConsumerEstimateActionContext | null = null;
  private problemInputRef = React.createRef<TextInput>();
  state: State = buildInitialControllerState(this.props);
  componentDidMount(): void {
    this.syncRuntimeIngressProjection();
    this.unsubscribeRuntimeLaunch =
      requestEstimateIntentLifecycle.subscribe(
        this.syncRuntimeIngressProjection,
      );
    runAfterNextPaint(() => this.applyInitialLaunchFlow());
  }
  componentWillUnmount(): void {
    this.cancelCanonicalWorkSearch();
    this.unsubscribeRuntimeLaunch?.();
    this.unsubscribeRuntimeLaunch = null;
  }
  componentDidUpdate(prevProps: ConsumerRepairRequestScreenControllerProps): void {
    const launchChanged = prevProps.launchId !== this.props.launchId;
    const draftChanged =
      prevProps.initialDraftId !== this.props.initialDraftId;
    const canonicalRevisionChanged =
      prevProps.initialCanonicalRevisionId?.trim() !==
      this.props.initialCanonicalRevisionId?.trim();
    if (
      launchChanged &&
      isFreshRequestEstimateLaunchWorkspace(this.props)
    ) {
      this.workSuggestionsEnabled = false;
    }
    if (launchChanged) {
      this.launchIntentAcknowledged = false;
    }
    if (canonicalRevisionChanged && this.props.initialCanonicalRevisionId?.trim()) {
      this.initialDeepLinkApplied = false;
      this.launchIntentAcknowledged = false;
      this.cancelCanonicalWorkSearch();
      runAfterNextPaint(() => this.applyInitialLaunchFlow());
      return;
    }
    if (draftChanged) {
      const nextDraftId = this.props.initialDraftId?.trim();
      const currentDraftAlreadyRendered =
        nextDraftId && this.state.bundle?.draft.id === nextDraftId;
      if (!currentDraftAlreadyRendered) {
        this.initialDeepLinkApplied = false;
        this.setState(
          buildInitialControllerState(this.props),
          () => runAfterNextPaint(() => this.applyInitialLaunchFlow()),
        );
        return;
      }
    }
    if (launchChanged || prevProps.initialProblemText !== this.props.initialProblemText || prevProps.initialSelectedCatalogWorkId !== this.props.initialSelectedCatalogWorkId || prevProps.autoPrepare !== this.props.autoPrepare || prevProps.autoPdf !== this.props.autoPdf) {
      this.initialDeepLinkApplied = false;
      const nextProblemText = this.props.initialProblemText?.trim();
      if (
        nextProblemText &&
        (
          (launchChanged && isFreshRequestEstimateLaunchWorkspace(this.props)) ||
          nextProblemText !== this.state.problemText ||
          (launchChanged && this.state.bundle != null)
        )
      ) {
        this.setState(
          {
            problemText: nextProblemText,
            bundle: null,
            aiAnswerRu: null,
            selectedWork: null,
            selectedHistoryId: null,
            validationErrors: [],
            statusMessage: null,
          },
          () => runAfterNextPaint(() => this.applyInitialLaunchFlow()),
        );
        return;
      }
      runAfterNextPaint(() => this.applyInitialLaunchFlow());
    }
  }
  refreshAfterDurableHydration(): void {
    const hydrated = buildInitialConsumerRepairRequestState({
      initialProblemText: this.props.initialProblemText,
      initialDraftId: this.props.initialDraftId,
      history: listConsumerRepairRequestHistory(this.props.consumerUserId),
      approvedHistoryPage: listConsumerRepairApprovedHistory(this.props.consumerUserId),
    });
    const freshLaunchWorkspace =
      isFreshRequestEstimateLaunchWorkspace(this.props);
    const expectedPrompt = this.props.initialProblemText?.trim() ?? "";
    this.historyLoaded = true;
    this.setState((current) => {
      const currentBundleOwnsFreshLaunch = Boolean(
        freshLaunchWorkspace &&
        current.bundle?.draft.problemText?.trim() === expectedPrompt,
      );
      if (freshLaunchWorkspace) {
        return {
          ...current,
          history: hydrated.history,
          approvedHistoryPage: hydrated.approvedHistoryPage,
          bundle: currentBundleOwnsFreshLaunch ? current.bundle : null,
          problemText: currentBundleOwnsFreshLaunch
            ? current.problemText
            : expectedPrompt,
          aiAnswerRu: currentBundleOwnsFreshLaunch ? current.aiAnswerRu : null,
          selectedWork: currentBundleOwnsFreshLaunch
            ? current.selectedWork
            : null,
          selectedHistoryId: null,
          validationErrors: currentBundleOwnsFreshLaunch
            ? current.validationErrors
            : [],
          statusMessage: currentBundleOwnsFreshLaunch
            ? current.statusMessage
            : null,
        };
      }
      return {
        ...current,
        history: hydrated.history,
        approvedHistoryPage: hydrated.approvedHistoryPage,
        bundle: current.bundle ?? hydrated.bundle,
        problemText: current.bundle || !hydrated.bundle
          ? current.problemText
          : "",
        statusMessage: current.bundle || !hydrated.bundle
          ? current.statusMessage
          : hydrated.statusMessage,
      };
    });
  }
  acceptCanonicalBackendDraft(bundle: ConsumerRepairDraftBundle): void {
    this.historyLoaded = true;
    this.setState({
      bundle,
      history: listConsumerRepairRequestHistory(this.props.consumerUserId),
      approvedHistoryPage: listConsumerRepairApprovedHistory(this.props.consumerUserId),
      problemText: "",
      selectedWork: null,
      selectedHistoryId: null,
      aiAnswerRu: "Смета рассчитана и сохранена.",
      statusMessage: "Версия сметы сохранена в черновике заявки.",
      validationErrors: [],
    }, () => {
      this.acknowledgeLaunchIntent(bundle);
      router.setParams({ draftId: bundle.draft.id });
    });
  }
  private applyInitialLaunchFlow(): void {
    const initialCanonicalRevisionId = this.props.initialCanonicalRevisionId?.trim();
    if (initialCanonicalRevisionId) {
      if (this.initialDeepLinkApplied) return;
      this.initialDeepLinkApplied = true;
      void this.openExactCanonicalRevisionInConsumerEditor({
        revisionId: initialCanonicalRevisionId,
        // A deep link names an authoritative backend revision. Rehydrate its
        // catalog and rows even when an older local projection has the same
        // revision id, otherwise a cold reopen can silently reuse stale rows.
        source: null,
        requestDraftId: null,
        problemText: null,
        successMessage: "Выбранная версия сметы открыта.",
      }).finally(() => this.props.onInitialLaunchBuildSettled?.());
      return;
    }
    if (shouldAutoPrepareInitialConsumerRepairRequest(this.props)) {
      this.applyInitialDeepLinkFlow();
      return;
    }
    this.acknowledgePromptComposerLaunch();
  }
  private syncRuntimeIngressProjection = (): void => {
    const pending = requestEstimateIntentLifecycle.getPending();
    const prompt =
      pending?.target.payload.route === "/request"
        ? pending.target.payload.parameters.prompt?.trim() ?? ""
        : "";
    const nextProjection =
      pending &&
      prompt &&
      pending.target.payload.launchId !== this.props.launchId &&
      pending.stage !== "INTENT_RECEIVED" &&
      pending.stage !== "URL_PARSED" &&
      pending.stage !== "AUTH_PENDING"
        ? {
            launchId: pending.target.payload.launchId,
            prompt,
          }
        : null;
    if (
      this.runtimeIngressProjection?.launchId === nextProjection?.launchId &&
      this.runtimeIngressProjection?.prompt === nextProjection?.prompt
    ) {
      return;
    }
    this.runtimeIngressProjection = nextProjection;
    this.forceUpdate();
  };
  private acknowledgePromptComposerLaunch(): void {
    if (this.initialDeepLinkApplied) return;
    const launchId = this.props.launchId?.trim();
    const expectedPrompt = this.props.initialProblemText?.trim();
    if (!launchId || !expectedPrompt || this.props.initialDraftId?.trim()) return;
    if (!isRequestEstimatePromptComposerRendered({
      bundle: this.state.bundle,
      problemText: this.state.problemText,
      expectedPrompt,
    })) {
      return;
    }
    this.initialDeepLinkApplied = true;
    const payload = {
      launchId,
      route: "/request" as const,
      fingerprint: this.props.launchFingerprint,
    };
    if (!markRequestEstimateIntentStage(launchId, "DRAFT_SESSION_READY")) {
      return;
    }
    recordRequestEstimateLaunchStage({
      stage: "DRAFT_SESSION_READY",
      payload,
      detail: {
        draftSessionStatus: "PROMPT_COMPOSER_READY",
      },
    });
    if (!markRequestEstimateIntentStage(launchId, "UI_READY")) return;
    recordRequestEstimateLaunchStage({
      stage: "UI_READY",
      payload,
      detail: {
        projection: "request_prompt_composer",
        promptVisible: true,
      },
    });
    if (!markRequestEstimateIntentStage(launchId, "INTENT_ACKNOWLEDGED")) {
      return;
    }
    recordRequestEstimateLaunchStage({
      stage: "INTENT_ACKNOWLEDGED",
      payload,
    });
    this.launchIntentAcknowledged = true;
  }
  private applyInitialDeepLinkFlow(): void {
    if (this.initialDeepLinkApplied) return;
    const reconciledLaunch =
      requestEstimateIntentLifecycle.reconcileAcknowledgedRouteLaunch({
        launchId: this.props.launchId,
        fingerprint: this.props.launchFingerprint,
      });
    if (shouldReuseAcknowledgedRequestEstimateLaunch({
      ...reconciledLaunch,
      autoPrepare: this.props.autoPrepare,
      autoPdf: this.props.autoPdf,
    })) {
      // A route remount can occur between the UI ACK and the deferred draftId
      // binding. Android also exposes the same raw Intent to +native-intent and
      // the root listener; those owners may independently create one generated
      // launchId. Reconcile that single alias to the canonical immutable draft
      // instead of compiling another initial revision.
      this.initialDeepLinkApplied = true;
      const requestDraftId = reconciledLaunch.requestDraftId;
      if (requestDraftId && this.state.bundle?.draft.id !== requestDraftId) {
        const history = listConsumerRepairRequestHistory(this.props.consumerUserId);
        const approvedHistoryPage =
          listConsumerRepairApprovedHistory(this.props.consumerUserId);
        const restored = buildInitialConsumerRepairRequestState({
          initialProblemText: this.props.initialProblemText,
          initialDraftId: requestDraftId,
          history,
          approvedHistoryPage,
        });
        if (restored.bundle) {
          this.historyLoaded = true;
          this.setState(restored, () => {
            router.setParams({ draftId: requestDraftId });
          });
        }
      }
      this.props.onInitialLaunchBuildSettled?.();
      return;
    }
    if (!shouldAutoPrepareInitialConsumerRepairRequest(this.props)) {
      this.props.onInitialLaunchBuildSettled?.();
      return;
    }
    const launchProblemText =
      this.props.initialProblemText?.trim() || this.state.problemText.trim();
    if (!launchProblemText) {
      this.props.onInitialLaunchBuildSettled?.();
      return;
    }
    this.initialDeepLinkApplied = true;
    void this.prepareDraft().finally(() => {
      this.props.onInitialLaunchBuildSettled?.();
    });
  }
  private refreshHistory(nextBundle?: ConsumerRepairDraftBundle | null) {
    const history = listConsumerRepairRequestHistory(this.props.consumerUserId);
    const approvedHistoryPage = listConsumerRepairApprovedHistory(this.props.consumerUserId);
    this.historyLoaded = true;
    this.setState({
      history,
      approvedHistoryPage,
      bundle: nextBundle === undefined ? this.state.bundle : nextBundle,
    });
  }
  private ensureHistoryLoaded = () => {
    if (this.historyLoaded) return;
    const history = listConsumerRepairRequestHistory(this.props.consumerUserId);
    const approvedHistoryPage = listConsumerRepairApprovedHistory(this.props.consumerUserId);
    this.historyLoaded = true;
    this.setState({ history, approvedHistoryPage });
  };
  private findKnownHistoryBundle(requestDraftId: string): ConsumerRepairDraftBundle | null {
    return this.state.history.find((candidate) => candidate.draft.id === requestDraftId)
      ?? this.state.approvedHistoryPage.items.find((candidate) => candidate.draft.id === requestDraftId)
      ?? null;
  }
  private findKnownHistoryRecord(requestDraftId: string) {
    return this.state.approvedHistoryPage.records.find(
      (record) => record.approvedEstimateId === requestDraftId,
    ) ?? null;
  }
  private acknowledgeLaunchIntent(bundle: ConsumerRepairDraftBundle): void {
    const launchId = this.props.launchId?.trim();
    if (!launchId || this.launchIntentAcknowledged) return;
    const expectedPrompt = this.props.initialProblemText?.trim()
      || (this.props.initialCanonicalRevisionId?.trim()
        ? bundle.draft.problemText?.trim()
        : "");
    const payload = {
      launchId,
      route: "/request" as const,
      fingerprint: this.props.launchFingerprint,
    };
    requestEstimateIntentLifecycle.bindPendingDraft(
      launchId,
      bundle.draft.id,
    );
    if (!markRequestEstimateIntentStage(launchId, "DRAFT_SESSION_READY")) {
      return;
    }
    recordRequestEstimateLaunchStage({
      stage: "DRAFT_SESSION_READY",
      payload,
      detail: {
        draftSessionStatus: bundle.estimateDraftSession?.status ?? "missing",
      },
    });
    if (
      !isRequestEstimateLaunchBundleRendered({
        bundle,
        expectedPrompt,
        renderedBundleId: this.state.bundle?.draft.id,
      })
    ) {
      return;
    }
    if (!markRequestEstimateIntentStage(launchId, "UI_READY")) return;
    recordRequestEstimateLaunchStage({
      stage: "UI_READY",
      payload,
      detail: {
        projection: "request_estimate_bundle",
        promptVisible: true,
      },
    });
    if (!markRequestEstimateIntentStage(launchId, "INTENT_ACKNOWLEDGED")) {
      return;
    }
    recordRequestEstimateLaunchStage({
      stage: "INTENT_ACKNOWLEDGED",
      payload,
    });
    this.launchIntentAcknowledged = true;
  }
  private ensureDraftBundle(options: {
    allowPendingDraftCreation?: boolean;
  } = {}): EnsureConsumerRepairDraftBundleResult {
    if (this.state.bundle) {
      return {
        status: consumerRepairCanonicalBackendBinding(this.state.bundle)
          ? "READY"
          : "PENDING_DRAFT_ACTION",
        bundle: this.state.bundle,
      };
    }
    if (!options.allowPendingDraftCreation) {
      return {
        status: "BLOCKED_WITH_REASON",
        bundle: null,
        message: "Сначала сформируйте смету. Введённый запрос сохранён и расчёт можно повторить.",
      };
    }
    try {
      const problemText = this.state.problemText.trim() || this.props.initialProblemText?.trim() || null;
      const selectedWork = this.state.selectedWork
        ? toConsumerRepairSelectedWork(this.state.selectedWork)
        : null;
      const bundle = createConsumerRepairRequestDraft({
        consumerUserId: this.props.consumerUserId,
        problemText,
        repairType: selectedWork?.selectedWorkCategoryKey ?? this.state.repairType,
        city: this.state.city,
        addressText: this.state.addressText,
        preferredTimeText: this.state.preferredTimeText,
        contactPhone: this.state.contactPhone,
        selectedWork,
      });
      this.historyLoaded = true;
      this.setState({
        bundle,
        history: listConsumerRepairRequestHistory(this.props.consumerUserId),
        approvedHistoryPage: listConsumerRepairApprovedHistory(this.props.consumerUserId),
        selectedHistoryId: null,
        validationErrors: [],
      });
      const launchId = this.props.launchId?.trim();
      if (launchId) requestEstimateIntentLifecycle.bindPendingDraft(launchId, bundle.draft.id);
      return { status: "PENDING_DRAFT_ACTION", bundle };
    } catch (error) {
      return {
        status: "RETRYABLE_ERROR",
        bundle: null,
        message: error instanceof Error
          ? error.message
          : "Не удалось сохранить черновик. Повторите действие.",
      };
    }
  }
  private resolvedDraftBundle(
    result: EnsureConsumerRepairDraftBundleResult,
  ): ConsumerRepairDraftBundle | null {
    if (
      result.status === "READY" ||
      result.status === "REVISION_RECOVERED" ||
      result.status === "PENDING_DRAFT_ACTION"
    ) return result.bundle;
    if (result.bundle) return result.bundle;
    this.setState({ statusMessage: result.message });
    return null;
  }
  setPhotoCaptureStatusMessage(statusMessage: string | null): void { this.setState({ statusMessage }); }
  attachCapturedPhotoToLine(result: ConsumerRepairPhotoMaterialCaptureResult): void {
    try {
      const current = this.resolvedDraftBundle(this.ensureDraftBundle());
      if (!current) return;
      if (current.draft.id !== result.draftId || result.purpose !== "line_attachment") {
        throw new ConsumerEstimateActionContextError(
          "Фото не сохранено: контекст строки изменился.",
        );
      }
      const context = this.actionContext("openLinePhoto", current, result.targetItemId);
      if (context.revisionId !== result.revisionId || context.lineId !== result.lineId) {
        throw new ConsumerEstimateActionContextError(
          "Фото не сохранено: выбрана другая версия или строка сметы.",
        );
      }
      const authoritative = result.authoritativeAttachment;
      if (!authoritative
        || authoritative.status !== "committed"
        || authoritative.ownerUserId !== context.ownerId
        || authoritative.requestId !== context.requestId
        || authoritative.parentRevisionId !== context.revisionId
        || authoritative.rowId !== context.lineId
        || authoritative.contentSha256 !== result.asset.contentSha256
        || authoritative.mimeType !== result.asset.mimeType
        || authoritative.sizeBytes !== result.asset.byteSize) {
        throw new ConsumerEstimateActionContextError(
          "Фото не сохранено: backend не подтвердил вложение выбранной строки и версии.",
        );
      }
      const fileName = authoritative.storageObjectKey.split("/").pop()?.trim() || `${authoritative.attachmentId}.jpg`;
      const bundle = attachConsumerRepairEstimateRowPhoto({
        requestDraftId: context.draftId,
        ownerUserId: context.ownerId,
        revisionId: context.revisionId,
        releaseId: context.releaseId,
        requestItemId: result.targetItemId,
        rowId: context.lineId!,
        fileName,
        mimeType: result.asset.mimeType,
        sizeBytes: result.asset.byteSize,
        contentHash: result.asset.contentSha256,
        storageReference: authoritative.storageObjectKey,
        thumbnailReference: authoritative.signedUrl,
        authoritativeAttachmentId: authoritative.attachmentId,
        authoritativeAttachmentEventId: authoritative.attachmentEventId,
        authoritativeTenantId: authoritative.tenantId,
        authoritativeOwnerUserId: authoritative.ownerUserId,
        authoritativeRequestId: authoritative.requestId,
        authoritativeCatalogId: authoritative.catalogId,
        authoritativeStorageBucket: authoritative.storageBucket,
        signedUrlExpiresAt: authoritative.signedUrlExpiresAt,
      });
      this.updateCurrentBundle(bundle, "Фото подтверждено backend и прикреплено к выбранной строке. Стоимость сметы не изменилась.");
    } catch (error) {
      this.handleActionContextError(error);
    }
  }
  async openMaterialCatalogFromCapturedPhoto(result: ConsumerRepairPhotoMaterialCaptureResult): Promise<void> {
    const bundleForPhoto =
      this.state.bundle?.draft.id === result.draftId
        ? this.state.bundle
        : this.state.history.find((candidate) => candidate.draft.id === result.draftId) ?? null;

    if (!bundleForPhoto) {
      this.setState({ statusMessage: "Черновик для подбора материала не найден. Откройте смету и повторите фото." });
      return;
    }

    this.setState({
      bundle: bundleForPhoto,
      selectedHistoryId: null,
      statusMessage: "Распознаём материал по фото...",
      validationErrors: [],
    });

    const { recognizeConsumerRepairPhotoMaterial } = await import(
      "../../lib/ai/photoMaterialDraftRecognition"
    );
    const recognition = await recognizeConsumerRepairPhotoMaterial({
      scanId: result.scanId,
      asset: result.asset,
      storedImage: result.storedImage,
    });

    this.setState({
      bundle: bundleForPhoto,
      selectedHistoryId: null,
      catalogPickerVisible: true,
      catalogPickerTargetItemId: result.targetItemId,
      catalogPickerInitialQuery: recognition.initialQuery,
      statusMessage: `${recognition.statusMessageRu} Смета изменится только после выбора.`,
      validationErrors: [],
    });
  }
  private updateCurrentBundle(bundle: ConsumerRepairDraftBundle, statusMessage?: string) {
    this.setState({
      bundle,
      selectedHistoryId: null,
      statusMessage: statusMessage ?? this.state.statusMessage,
      validationErrors: [],
      editingParam: null,
    });
    this.refreshHistory(bundle);
  }
  private updateCurrentBundleWithDeferredDurableQuantityCommit(
    bundle: ConsumerRepairDraftBundle,
    itemId: string,
    input: {
      statusMessage?: string;
      operation?: ConsumerRepairQuantityChangeMeta;
    } = {},
  ) {
    const commitId = ++this.pendingDurableQuantityCommitId;
    const draftId = bundle.draft.id;
    const item = bundle.items.find((candidate) => candidate.id === itemId);
    const operation = input.operation ?? {
      operationId: createConsumerRepairQuantityEditOperationId({
        itemId,
        source: "programmatic",
        nextQuantity: item?.quantity ?? null,
      }),
      source: "programmatic" as const,
      previousQuantity: null,
      nextQuantity: item?.quantity ?? null,
    };
    const baseRevisionId = this.state.bundle?.estimateRevisionState?.current_revision_id ?? null;
    recordConsumerRepairQuantityEditStage({
      ...operation,
      stage: "PERSISTENCE_ENQUEUED",
      itemId,
      requestDraftId: draftId,
      baseRevisionId,
      rowCount: bundle.items.length,
    });
    this.setState({
      bundle,
      selectedHistoryId: null,
      statusMessage: QUANTITY_EDIT_SAVING_MESSAGE,
      validationErrors: [],
      editingParam: null,
    }, () => {
      runAfterNextPaint(() => {
        const latestBundle = this.state.bundle;
        if (!latestBundle || latestBundle.draft.id !== draftId) return;
        try {
          const latestItem = latestBundle.items.find((item) => item.id === itemId);
          if (!latestItem) return;
          const stageStarted = Date.now();
          recordConsumerRepairQuantityEditStage({
            ...operation,
            stage: "RECALCULATION_STARTED",
            itemId,
            requestDraftId: draftId,
            baseRevisionId: latestBundle.estimateRevisionState?.current_revision_id ?? baseRevisionId,
            rowCount: latestBundle.items.length,
          });
          const prepared = prepareConsumerRepairRequestItemQuantityUpdate({
            requestDraftId: draftId,
            itemId,
            quantity: latestItem.quantity ?? 0,
            operationId: operation.operationId,
            source: operation.source,
          });
          recordConsumerRepairQuantityEditStage({
            ...operation,
            stage: "RECALCULATION_COMPLETED",
            itemId,
            requestDraftId: draftId,
            baseRevisionId,
            resultingRevisionId: prepared.estimateRevisionState?.current_revision_id ?? null,
            resultingRowsHash: prepared.estimateRevisionState?.revisions.at(-1)?.rows_hash ?? null,
            rowCount: prepared.items.length,
            elapsedMs: Date.now() - stageStarted,
          });
          recordConsumerRepairQuantityEditStage({
            ...operation,
            stage: "PERSISTENCE_STARTED",
            itemId,
            requestDraftId: draftId,
            baseRevisionId,
            resultingRevisionId: prepared.estimateRevisionState?.current_revision_id ?? null,
            resultingRowsHash: prepared.estimateRevisionState?.revisions.at(-1)?.rows_hash ?? null,
            rowCount: prepared.items.length,
          });
          const saved = commitPreparedConsumerRepairRequestBundle(prepared);
          if (hasMemoryOnlyDurableSaveFailure(saved)) {
            recordConsumerRepairQuantityEditStage({
              ...operation,
              stage: "PERSISTENCE_FAILED",
              itemId,
              requestDraftId: draftId,
              baseRevisionId,
              resultingRevisionId: saved.estimateRevisionState?.current_revision_id ?? null,
              resultingRowsHash: saved.estimateRevisionState?.revisions.at(-1)?.rows_hash ?? null,
              rowCount: saved.items.length,
              elapsedMs: Date.now() - stageStarted,
              errorCode: "durable_persist_failed_memory_only_request_kept_alive",
            });
            this.setState({
              bundle: saved,
              selectedHistoryId: null,
              statusMessage: QUANTITY_EDIT_SAVE_FAILED_MESSAGE,
              validationErrors: [],
              editingParam: null,
            });
            return;
          }
          recordConsumerRepairQuantityEditStage({
            ...operation,
            stage: "PERSISTENCE_COMMITTED",
            itemId,
            requestDraftId: draftId,
            baseRevisionId,
            resultingRevisionId: saved.estimateRevisionState?.current_revision_id ?? null,
            resultingRowsHash: saved.estimateRevisionState?.revisions.at(-1)?.rows_hash ?? null,
            rowCount: saved.items.length,
            elapsedMs: Date.now() - stageStarted,
          });
          const currentBundle = this.state.bundle;
          if (!currentBundle || currentBundle.draft.id !== draftId) return;
          if (
            commitId < this.pendingDurableQuantityCommitId &&
            currentBundle.estimateRevisionState?.current_revision_id !== saved.estimateRevisionState?.current_revision_id
          ) {
            return;
          }
          this.setState({
            bundle: saved,
            selectedHistoryId: null,
            statusMessage: input.statusMessage ?? QUANTITY_EDIT_SAVED_MESSAGE,
            validationErrors: [],
            editingParam: null,
          });
          recordConsumerRepairQuantityEditStage({
            ...operation,
            stage: "REVISION_CONFIRMED",
            itemId,
            requestDraftId: draftId,
            baseRevisionId,
            resultingRevisionId: saved.estimateRevisionState?.current_revision_id ?? null,
            resultingRowsHash: saved.estimateRevisionState?.revisions.at(-1)?.rows_hash ?? null,
            rowCount: saved.items.length,
            elapsedMs: Date.now() - stageStarted,
          });
          this.refreshHistory(saved);
        } catch (error) {
          recordConsumerRepairQuantityEditStage({
            ...operation,
            stage: "PERSISTENCE_FAILED",
            itemId,
            requestDraftId: draftId,
            baseRevisionId,
            rowCount: latestBundle?.items.length ?? null,
            errorCode: error instanceof Error ? error.message.slice(0, 160) : "unknown_error",
          });
          if (error instanceof ConsumerRepairValidationError) {
            this.handleValidationError(error);
            return;
          }
          if (this.state.bundle?.draft.id === draftId) {
            this.setState({ statusMessage: QUANTITY_EDIT_SAVE_FAILED_MESSAGE });
          }
        }
      });
    });
  }
  private syncCurrentDraftFields(current: ConsumerRepairDraftBundle): ConsumerRepairDraftBundle {
    return syncConsumerRepairDraftFromScreenState(current, this.state);
  }
  private handleValidationError(error: unknown) {
    if (error instanceof ConsumerRepairValidationError) {
      this.setState({
        validationErrors: error.errors,
        statusMessage: error.errors.map((item) => item.messageRu).join("\n"),
      });
      this.refreshHistory();
      return;
    }
    throw error;
  }
  private handleCanonicalArtifactOpenError = (error: unknown): void => {
    if (error instanceof ConsumerRepairValidationError) {
      this.handleValidationError(error);
      return;
    }
    const identityFailure = error instanceof CanonicalEstimateApiError &&
      error.code === "ARTIFACT_REVISION_IDENTITY_MISMATCH";
    const quarantined = error instanceof CanonicalEstimateApiError &&
      error.code === "REVISION_CONTENT_QUARANTINED";
    this.setState({
      statusMessage: identityFailure
        ? "PDF для выбранной версии сметы не найден. Другой документ не был открыт."
        : quarantined
          ? "Для этой старой версии новый PDF создавать нельзя. Если ранее созданный PDF отсутствует, сформируйте исправленную смету."
        : error instanceof CanonicalEstimateApiError
          ? error.message
          : "PDF выбранной версии не удалось открыть. Другой документ не был открыт.",
    });
  };
  private actionContext(
    action: ConsumerEstimateActionName,
    bundle: ConsumerRepairDraftBundle,
    requestItemId?: string | null,
  ): ConsumerEstimateActionContext {
    return buildConsumerEstimateActionContext({
      action,
      bundle,
      ownerId: this.props.consumerUserId,
      requestItemId,
      returnScrollPosition: this.currentScrollPosition,
    });
  }
  private handleActionContextError(error: unknown): void {
    this.setState({
      statusMessage: error instanceof ConsumerEstimateActionContextError
        ? error.message
        : "Действие не выполнено: выбранная версия сметы не подтверждена.",
    });
  }
  private rememberScrollPosition = (position: number): void => {
    if (Number.isFinite(position)) this.currentScrollPosition = Math.max(0, position);
  };
  private openCanonicalBackendEditor(
    bundle: ConsumerRepairDraftBundle | null = this.state.bundle,
    statusMessage = "Параметры выбранной версии открываются в текущей смете.",
  ): boolean {
    if (!bundle) return false;
    const binding = consumerRepairCanonicalBackendBinding(bundle);
    if (!binding) {
      this.setState({
        statusMessage: "Изменение пока недоступно: сначала повторите расчёт и дождитесь подтверждённой версии сметы.",
      });
      return true;
    }
    this.setState({ statusMessage });
    void this.openExactCanonicalRevisionInConsumerEditor({
      revisionId: binding.revisionId,
      expectedReleaseId: binding.releaseId,
      source: bundle,
      requestDraftId: bundle.draft.id,
      problemText: bundle.draft.problemText,
      successMessage: "Параметры открыты в текущей смете. Сохранение создаст новую дочернюю версию.",
    });
    return true;
  }
  private openExactCanonicalRevisionInConsumerEditor = async (input: {
    revisionId: string;
    expectedReleaseId?: string | null;
    source: ConsumerRepairDraftBundle | null;
    requestDraftId?: string | null;
    problemText?: string | null;
    successMessage: string;
  }): Promise<void> => {
    try {
      const revision = await getCanonicalEstimateRevision(input.revisionId);
      if (
        revision.revisionId !== input.revisionId ||
        revision.status === "failed" ||
        (input.expectedReleaseId && revision.releaseId !== input.expectedReleaseId)
      ) {
        throw new Error("HISTORY_BACKEND_REVISION_IDENTITY_MISMATCH");
      }
      const bundle = input.source ?? await this.props.onLoadCanonicalRevisionDraft({
        revisionId: revision.revisionId,
        requestDraftId: input.requestDraftId,
        problemText: input.problemText,
      });
      const restoredBinding = consumerRepairCanonicalBackendBinding(bundle);
      if (
        !bundle ||
        restoredBinding?.revisionId !== revision.revisionId ||
        restoredBinding.releaseId !== revision.releaseId
      ) {
        throw new Error("HISTORY_CONSUMER_PROJECTION_IDENTITY_MISMATCH");
      }
      const session = await this.props.onLoadCanonicalParameterSession(
        revision.revisionId,
        bundle.draft.id,
      );
      if (session.revisionId !== revision.revisionId) {
        throw new Error("HISTORY_PARAMETER_SESSION_IDENTITY_MISMATCH");
      }
      this.historyLoaded = true;
      this.setState({
        bundle,
        history: listConsumerRepairRequestHistory(this.props.consumerUserId),
        approvedHistoryPage: listConsumerRepairApprovedHistory(this.props.consumerUserId),
        problemText: "",
        selectedWork: selectedWorkFromBundle(bundle),
        selectedHistoryId: null,
        canonicalBackendParameterSession: session,
        statusMessage: input.successMessage,
        validationErrors: [],
      }, () => {
        if (this.props.initialCanonicalRevisionId?.trim() === revision.revisionId) {
          this.acknowledgeLaunchIntent(bundle);
        } else {
          router.setParams({ canonicalRevisionId: "", draftId: bundle.draft.id });
        }
      });
    } catch (error) {
      const forbidden = error instanceof CanonicalEstimateApiError && ["ACCESS_DENIED", "NOT_FOUND"].includes(error.code);
      this.setState({
        statusMessage: forbidden
          ? "Выбранная версия сметы недоступна. Проверьте учётную запись и повторите попытку."
          : "Не удалось открыть выбранную версию сметы. Исходная версия не изменена; повторите попытку позже.",
      });
    }
  };
  private ensureInitialCanonicalRevision = async (): Promise<EnsureConsumerRepairDraftBundleResult> => {
    const initial = this.ensureDraftBundle({ allowPendingDraftCreation: true });
    const pendingBundle = this.resolvedDraftBundle(initial);
    if (!pendingBundle) return initial;
    const existingBinding = consumerRepairCanonicalBackendBinding(pendingBundle);
    let requiresCanonicalSuccessor = false;
    if (existingBinding) {
      try {
        const existingRevision = await getCanonicalEstimateRevision(existingBinding.revisionId);
        if (existingRevision.releaseId !== existingBinding.releaseId) {
          return {
            status: "RETRYABLE_ERROR",
            bundle: pendingBundle,
            message: "Не удалось подтвердить версию сохранённой сметы. Черновик не изменён — повторите попытку.",
          };
        }
        const currentCatalog = await getCanonicalEstimateCatalogItem(existingRevision.catalogId);
        if (currentCatalog.releaseId === existingBinding.releaseId) {
          return { status: "READY", bundle: pendingBundle };
        }
        requiresCanonicalSuccessor = true;
      } catch (error) {
        const unavailable = error instanceof CanonicalEstimateApiError
          && ["ESTIMATE_ADMISSION_DENIED", "NOT_FOUND"].includes(error.code);
        return {
          status: unavailable ? "BLOCKED_WITH_REASON" : "RETRYABLE_ERROR",
          bundle: pendingBundle,
          message: unavailable
            ? "Сохранённая версия доступна только для чтения, а актуальная расчётная модель пока недоступна. Черновик не изменён."
            : "Не удалось проверить актуальность сохранённой сметы. Черновик не изменён — повторите попытку.",
        };
      }
    }

    const problemText =
      this.state.problemText.trim() ||
      pendingBundle.draft.problemText?.trim() ||
      this.props.initialProblemText?.trim() ||
      "";
    if (!problemText) {
      return {
        status: "BLOCKED_WITH_REASON",
        bundle: pendingBundle,
        message: "Напишите, что нужно посчитать по смете.",
      };
    }

    let selectedWork = this.state.selectedWork ?? selectedWorkFromBundle(pendingBundle);
    if (!selectedWork && this.props.initialSelectedCatalogWorkId?.trim()) {
      selectedWork = buildConsumerRepairExactCatalogLaunchSelectedWork({
        catalogWorkId: this.props.initialSelectedCatalogWorkId,
        rawInput: problemText,
      });
    }
    if (!selectedWork) {
      selectedWork = buildMultiDomainReferenceSelectedWorkBinding(problemText);
      if (selectedWork) {
        this.setState({ selectedWork, repairType: selectedWork.selectedCategoryKey });
      }
    }
    if (!selectedWork) {
      try {
        const searchQuery = canonicalWorkSearchQueryFromPrompt(problemText);
        const page = this.state.canonicalWorkSearch.query === searchQuery
          && !this.state.canonicalWorkSearch.loading
          && this.state.canonicalWorkSearch.searchIndexReleaseId
          ? null
          : await searchCanonicalEstimateCatalog({ query: searchQuery, pageSize: 2 });
        const literalTotalCount = page?.literalTotalCount ?? this.state.canonicalWorkSearch.literalTotalCount;
        const suggestions = page?.items.map(canonicalSearchItemToConsumerRepairSuggestion)
          ?? this.state.canonicalWorkSearch.suggestions;
        const exact = suggestions[0];
        if (literalTotalCount !== 1 || !exact || !["exact_title", "exact_alias"].includes(exact.matchKind)) {
          this.scheduleCanonicalWorkSearch(problemText);
          return {
            status: "BLOCKED_WITH_REASON",
            bundle: pendingBundle,
            message: literalTotalCount > 1
              ? `Найдено несколько работ: ${literalTotalCount}. Выберите точную работу из списка.`
              : "Точная работа не определена. Выберите работу из результатов поиска.",
          };
        }
        if (exact.estimateReady !== true) {
          this.scheduleCanonicalWorkSearch(problemText);
          return {
            status: "BLOCKED_WITH_REASON",
            bundle: pendingBundle,
            message: exact.nonselectableReasonRu
              || "Эта смета проходит обновление состава и временно недоступна для нового расчёта.",
          };
        }
        selectedWork = buildSelectedWorkFromSuggestion(exact, problemText);
        this.setState({ selectedWork, repairType: selectedWork.selectedCategoryKey });
      } catch (error) {
        return {
          status: "RETRYABLE_ERROR",
          bundle: pendingBundle,
          message: error instanceof CanonicalEstimateApiError
            ? error.message
            : "Не удалось определить точную работу. Повторите расчёт.",
        };
      }
    }

    this.setState({
      statusMessage: requiresCanonicalSuccessor
        ? "Сохранённая версия доступна только для чтения. Готовим исправленную смету…"
        : "Формируем исходную смету…",
    });
    try {
      const recovered = await this.props.onPrepareCanonicalEstimate(
        problemText,
        selectedWork.selectedWorkKey,
        pendingBundle.draft.id,
      );
      const binding = consumerRepairCanonicalBackendBinding(recovered);
      if (!recovered || !binding) {
        return {
          status: "RETRYABLE_ERROR",
          bundle: pendingBundle,
          message: "Не удалось рассчитать смету. Черновик сохранён — повторите расчёт.",
        };
      }
      return { status: "REVISION_RECOVERED", bundle: recovered };
    } catch (error) {
      const code = error instanceof Error ? error.message : String(error);
      return {
        status: "RETRYABLE_ERROR",
        bundle: pendingBundle,
        message: code.startsWith("CANONICAL_BACKEND_DEFINITION_MISSING:")
          ? "Работа найдена, но её расчётная модель временно недоступна. Черновик сохранён — повторите расчёт."
          : code.startsWith("CANONICAL_BASELINE_CONTRACT_MISSING:")
            ? `${requiresCanonicalSuccessor ? "Для исправленной версии нужны исходные данные. " : ""}${canonicalBaselineContractMissingStatusMessage(code)}`
            : "Не удалось рассчитать смету. Черновик сохранён — повторите расчёт.",
      };
    }
  };
  private prepareDraft = async () => {
    if (this.canonicalBaselineCompileInFlight) {
      this.setState({ statusMessage: "Расчёт уже выполняется…" });
      return;
    }
    this.canonicalBaselineCompileInFlight = true;
    try {
      const result = await this.ensureInitialCanonicalRevision();
      if (result.status === "RETRYABLE_ERROR" || result.status === "BLOCKED_WITH_REASON") {
        this.setState({ statusMessage: result.message });
        return;
      }
      // The backend job can complete and return a durable canonical revision while
      // the screen is still rendering the locally-created pending bundle.  Persisting
      // the mapping is not enough: publish the recovered bundle into screen state so
      // the user sees the created rows and all revision-bound actions become enabled.
      this.updateCurrentBundle(
        result.bundle,
        result.status === "REVISION_RECOVERED"
          ? "Смета рассчитана. Проверьте позиции и параметры."
          : buildEstimateDraftSessionTransitionStatusMessage(result.bundle),
      );
    } finally {
      this.canonicalBaselineCompileInFlight = false;
    }
  };
  private selectRoadScope = (selectedScope: string) => {
    const current = this.state.bundle;
    if (!current || this.state.roadScopeSelectionBusy) return;
    if (this.openCanonicalBackendEditor(current)) return;
    this.setState({ roadScopeSelectionBusy: true, statusMessage: "Выполняется расчёт…" }, () => {
      try {
        const bundle = selectConsumerRepairRoadScopeV4({
          requestDraftId: current.draft.id,
          userId: this.props.consumerUserId,
          selectedScope,
        });
        this.updateCurrentBundle(
          bundle,
          buildEstimateDraftSessionTransitionStatusMessage(bundle),
        );
      } catch (error) {
        logger.error("ConsumerRepairRoadScope", "scope calculation failed", error);
        this.setState({ statusMessage: "Не удалось выполнить расчёт. Выберите состав ещё раз." });
      } finally {
        this.setState({ roadScopeSelectionBusy: false });
      }
    });
  };
  private deleteDraft = () => {
    const current = this.state.bundle;
    if (!current || current.draft.status !== "draft") return;
    deleteConsumerRepairRequestDraft({ requestDraftId: current.draft.id, userId: this.props.consumerUserId });
    this.setState(buildDeletedConsumerRepairDraftState("Заявка удалена."));
    this.refreshHistory(null);
  };
  private approveDraft = async () => {
    if (this.approvalCommitInFlight) return;
    this.approvalCommitInFlight = true;
    try {
      const ensured = await this.ensureInitialCanonicalRevision();
      if (ensured.status === "RETRYABLE_ERROR" || ensured.status === "BLOCKED_WITH_REASON") {
        this.setState({ statusMessage: ensured.message });
        return;
      }
      const current = ensured.bundle;
      const synced = this.syncCurrentDraftFields(current);
      const canonical = consumerRepairCanonicalBackendBinding(synced);
      if (!canonical) {
        this.setState({ statusMessage: "Сначала завершите расчёт сметы. Черновик сохранён." });
        return;
      }
      const canonicalArtifact = await buildCanonicalEstimateArtifact({
          revisionId: canonical.revisionId,
          // Approval keeps the established backend archival artifact contract.
          // The user-facing PDF button independently requests the professional profile;
          // approval must not be blocked by presentation-route rollout order.
          kind: "pdf",
          // v1 of this key was previously reused for a professional_pdf
          // request. Existing backend jobs therefore reject the current
          // archival-pdf payload as a conflict. Keep the payload semantics in
          // a new namespace; retries of this exact approval remain idempotent.
          idempotencyKey: `consumer-approve-archival-pdf-v2-${canonical.revisionId}`,
        });
      if (
        canonicalArtifact.status !== "ready" ||
        canonicalArtifact.kind !== "pdf" ||
        canonicalArtifact.revisionId !== canonical.revisionId ||
        canonicalArtifact.releaseId !== canonical.releaseId
      ) throw new Error("CANONICAL_APPROVAL_PDF_NOT_READY_OR_REVISION_MISMATCH");
      const bundle = approveConsumerRepairRequestDraft({
        requestDraftId: synced.draft.id,
        userId: this.props.consumerUserId,
        canonicalArtifact: {
          artifactId: canonicalArtifact.artifactId,
          revisionId: canonicalArtifact.revisionId,
          releaseId: canonicalArtifact.releaseId,
          status: "ready" as const,
          sha256: canonicalArtifact.sha256,
        },
      });
      await awaitTransactionalConsumerRepairBundleCommit({
        requestDraftId: bundle.draft.id,
        expectedStatus: bundle.draft.status,
        expectedRevisionId: bundle.estimateDraftRevisionState?.currentRevisionId ?? null,
      });
      const history = listConsumerRepairRequestHistory(this.props.consumerUserId);
      const durableApprovedHistoryPage = listConsumerRepairApprovedHistory(this.props.consumerUserId);
      const approvedHistoryPage = durableApprovedHistoryPage.items.some(
        (candidate) => candidate.draft.id === bundle.draft.id,
      )
        ? durableApprovedHistoryPage
        : {
          ...durableApprovedHistoryPage,
          items: [bundle, ...durableApprovedHistoryPage.items].slice(
            0,
            durableApprovedHistoryPage.pageSize,
          ),
          records: [
            buildApprovedEstimateHistoryRecord(bundle),
            ...durableApprovedHistoryPage.records,
          ].slice(0, durableApprovedHistoryPage.pageSize),
          totalApprovedCount: Math.max(
            durableApprovedHistoryPage.totalApprovedCount,
            durableApprovedHistoryPage.items.length + 1,
          ),
        };
      this.historyLoaded = true;
      const nextHistory = history.some((candidate) => candidate.draft.id === bundle.draft.id)
        ? history
        : [bundle, ...history];
      this.setState(buildApprovedConsumerRepairWorkspaceClearedState({
        history: nextHistory,
        approvedHistoryPage,
        statusMessage: "Заявка утверждена. PDF сохранён в истории, смета доступна там же для PDF, редактирования и отправки в маркет.",
      }));
    } catch (error) {
      if (error instanceof ConsumerRepairValidationError) {
        this.handleValidationError(error);
      } else {
        logger.error("ConsumerRepairApprove", "durable approval commit failed", error);
        const quarantined = error instanceof CanonicalEstimateApiError
          && error.code === "REVISION_CONTENT_QUARANTINED";
        this.setState({
          statusMessage: quarantined
            ? "Эта сохранённая версия доступна только для чтения. Сформируйте исправленную смету, уточните обязательные данные и затем подтвердите её."
            : "Не удалось надёжно сохранить утверждённую смету. Повторите подтверждение.",
        });
      }
    } finally {
      this.approvalCommitInFlight = false;
    }
  };
  private completePdfOpen = async () => {
    try {
      const current = this.resolvedDraftBundle(this.ensureDraftBundle());
      if (!current) return;
      const context = this.actionContext("openProfessionalPdf", current);
      {
        const revision = await getCanonicalEstimateRevision(context.revisionId);
        if (
          revision.releaseId !== context.releaseId ||
          (context.definitionId != null && revision.catalogId !== context.definitionId)
        ) {
          throw new ConsumerEstimateActionContextError(
            "PDF не открыт: backend вернул другую версию или другую работу.",
          );
        }
        const currentCatalog = await getCanonicalEstimateCatalogItem(revision.catalogId);
        let artifact;
        if (currentCatalog.releaseId !== revision.releaseId) {
          try {
            artifact = await getCanonicalEstimateArtifact({
              revisionId: context.revisionId,
              kind: "pdf",
              documentProfile: "professional_v1",
            });
          } catch (error) {
            if (!(error instanceof CanonicalEstimateApiError) || error.code !== "NOT_FOUND") throw error;
            throw new CanonicalEstimateApiError(
              "Для этой старой версии ранее созданный PDF не найден.",
              { code: "REVISION_CONTENT_QUARANTINED", httpStatus: 409 },
            );
          }
        } else {
          artifact = await buildCanonicalEstimateArtifact({
            revisionId: context.revisionId,
            kind: "pdf",
            documentProfile: "professional_v1",
            idempotencyKey: `consumer-professional-pdf-${context.revisionId}`,
          });
        }
        assertCanonicalEstimateArtifactIdentity({
          artifact,
          revision,
          expectedKind: "pdf",
          expectedDocumentProfile: "professional_v1",
          expectedCatalogId: context.definitionId ?? revision.catalogId,
          expectedRowCount: revision.rowCount,
        });
        if (!artifact.signedUrl) throw new Error("CANONICAL_PDF_SIGNED_URL_MISSING");
        await previewPdfDocument(createPdfDocumentDescriptor({
          uri: artifact.signedUrl,
          title: current.draft.selectedWorkTitleRu || current.draft.title || "Смета",
          documentType: "request",
          source: "generated",
          originModule: "reports",
          entityId: current.draft.id,
        }), { router });
        this.setState({ statusMessage: "Профессиональный PDF выбранной версии открыт." });
        return;
      }
    } catch (error) {
      this.handleCanonicalArtifactOpenError(error);
    } finally {
      this.setState({ pdfOpenBusy: false });
    }
  };
  private makePdf = () => {
    if (this.state.pdfOpenBusy) return;
    this.setState(
      {
        pdfOpenBusy: true,
        statusMessage: "\u041e\u0442\u043a\u0440\u044b\u0432\u0430\u0435\u043c PDF\u2026",
      },
      () => {
        const run = () => void this.completePdfOpen();
        if (typeof requestAnimationFrame === "function") {
          requestAnimationFrame(run);
          return;
        }
        runAfterNextPaint(run);
      },
    );
  };
  private completeHistoryPdfOpen = async (requestDraftId?: string) => {
    const requestedBundle = requestDraftId
      ? this.findKnownHistoryBundle(requestDraftId) ?? (this.state.bundle?.draft.id === requestDraftId ? this.state.bundle : null)
      : this.state.bundle;
    const historyRecord = requestDraftId ? this.findKnownHistoryRecord(requestDraftId) : null;
    const canonical = consumerRepairCanonicalBackendBinding(requestedBundle ?? null) ?? (
      historyRecord?.sourceRevisionId && historyRecord.sourceReleaseId
        ? { revisionId: historyRecord.sourceRevisionId, releaseId: historyRecord.sourceReleaseId }
        : null
    );
    if (canonical) {
      const context = requestedBundle
        ? this.actionContext("openHistoryRevision", requestedBundle)
        : null;
      const revision = await getCanonicalEstimateRevision(canonical.revisionId);
      if (
        revision.revisionId !== canonical.revisionId ||
        revision.releaseId !== canonical.releaseId ||
        (context != null && (
          revision.revisionId !== context.revisionId ||
          revision.releaseId !== context.releaseId
        ))
      ) {
        throw new ConsumerEstimateActionContextError("PDF не открыт: историческая версия не совпала.");
      }
      const artifact = await buildCanonicalEstimateArtifact({
        revisionId: canonical.revisionId,
        kind: "pdf",
        documentProfile: "professional_v1",
        idempotencyKey: `consumer-history-professional-pdf-${canonical.revisionId}`,
      });
      assertCanonicalEstimateArtifactIdentity({
        artifact,
        revision,
        expectedKind: "pdf",
        expectedDocumentProfile: "professional_v1",
        expectedCatalogId: context?.definitionId ?? revision.catalogId,
        expectedRowCount: revision.rowCount,
      });
      if (!artifact.signedUrl) throw new Error("CANONICAL_PDF_SIGNED_URL_MISSING");
      await previewPdfDocument(createPdfDocumentDescriptor({
        uri: artifact.signedUrl,
        title: requestedBundle?.draft.selectedWorkTitleRu || requestedBundle?.draft.title || historyRecord?.title || "Смета",
        documentType: "request",
        source: "generated",
        originModule: "reports",
        entityId: requestedBundle?.draft.id ?? requestDraftId ?? revision.revisionId,
      }), { router });
      this.setState({ statusMessage: "Профессиональный PDF выбранной версии открыт из истории." });
      return;
    }
    if (requestedBundle) {
      throw new ConsumerEstimateActionContextError(
        "PDF не открыт: у выбранной сметы нет подтверждённой backend-версии.",
      );
    }
    throw new ConsumerEstimateActionContextError(
      "PDF не открыт: выбранная запись истории не найдена.",
    );
  };
  private openPdf = (requestDraftId?: string) => {
    void this.completeHistoryPdfOpen(requestDraftId).catch(this.handleCanonicalArtifactOpenError);
  };
  private openDraftFromHistory = (requestDraftId: string) => {
    const bundle = this.findKnownHistoryBundle(requestDraftId);
    if (bundle && bundle.draft.status !== "draft") {
      this.toggleHistorySnapshot(requestDraftId);
      return;
    }
    this.setState({
      bundle,
      selectedWork: null,
      selectedHistoryId: null,
      statusMessage: bundle ? "Заявка открыта из истории." : null,
    });
    if (bundle) router.setParams({ draftId: bundle.draft.id });
  };
  private toggleHistorySnapshot = (requestDraftId: string) => {
    const bundle = this.findKnownHistoryBundle(requestDraftId);
    if (bundle?.draft.status === "draft") {
      this.openDraftFromHistory(requestDraftId);
      return;
    }
    this.setState((prevState) => ({
      selectedHistoryId: prevState.selectedHistoryId === requestDraftId ? null : requestDraftId,
      statusMessage: bundle
        ? "История открыта для просмотра."
        : this.findKnownHistoryRecord(requestDraftId)
          ? "Локальная копия отсутствует. Сохранённая версия будет восстановлена с проверкой доступа."
          : prevState.statusMessage,
    }));
  };
  private editHistoryDraft = async (requestDraftId: string) => {
    const source = this.findKnownHistoryBundle(requestDraftId);
    const record = this.findKnownHistoryRecord(requestDraftId);
    const binding = consumerRepairCanonicalBackendBinding(source) ?? (
      record?.sourceRevisionId && record.sourceReleaseId
        ? { revisionId: record.sourceRevisionId, releaseId: record.sourceReleaseId }
        : null
    );
    if (!binding) {
      this.setState({
        statusMessage: "Выбранная историческая версия не подтверждена backend и не может быть изменена. Исходная смета сохранена.",
      });
      return;
    }
    this.setState({ statusMessage: "Открываем выбранную историческую версию в текущей смете…" });
    await this.openExactCanonicalRevisionInConsumerEditor({
      revisionId: binding.revisionId,
      expectedReleaseId: binding.releaseId,
      source,
      requestDraftId: source?.draft.id ?? record?.approvedEstimateId ?? requestDraftId,
      problemText: source?.draft.problemText?.trim() || record?.prompt?.trim() || record?.title,
      successMessage: "Историческая версия открыта. Сохранение изменений создаст дочернюю версию; оригинал останется неизменным.",
    });
  };
  private sendHistoryToMarket = async (requestDraftId: string) => {
    try {
      const source = this.findKnownHistoryBundle(requestDraftId);
      const canonical = consumerRepairCanonicalBackendBinding(source);
      if (!source) throw new Error("CONSUMER_REPAIR_HISTORY_NOT_FOUND");
      if (!canonical) {
        this.openCanonicalBackendEditor(source, "Для закупки сначала перенесите эту смету в canonical backend.");
        return;
      }
      const canonicalRevision = await getCanonicalEstimateRevision(canonical.revisionId);
      const canonicalArtifact = await buildCanonicalEstimateArtifact({
          revisionId: canonical.revisionId,
          kind: "procurement",
          idempotencyKey: `consumer-procurement-${canonical.revisionId}`,
        });
      assertCanonicalEstimateArtifactIdentity({
        artifact: canonicalArtifact,
        revision: canonicalRevision,
        expectedKind: "procurement",
        expectedCatalogId: source.draft.selectedCatalogWorkId,
        expectedRowCount: canonicalRevision.rowCount,
      });
      this.setState(sendConsumerRepairHistoryToMarketplaceFromScreen({
        requestDraftId,
        userId: this.props.consumerUserId,
        canonicalArtifact: {
          artifactId: canonicalArtifact.artifactId,
          kind: "procurement" as const,
          revisionId: canonicalArtifact.revisionId,
          releaseId: canonicalArtifact.releaseId,
          status: "ready" as const,
          sha256: canonicalArtifact.sha256,
        },
      }));
    } catch (error) {
      this.handleValidationError(error);
    }
  };
  private decreaseItem = (itemId: string) => {
    const current = this.state.bundle;
    if (!current) return;
    const item = current.items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    if (consumerRepairCanonicalBackendBinding(current)) {
      void this.changeItemQuantity(itemId, String(Math.max(0, (item.quantity ?? 0) - 1)));
      return;
    }
    const bundle = applyVisibleQuantityDraft(current, itemId, Math.max(0, (item.quantity ?? 0) - 1));
    this.updateCurrentBundleWithDeferredDurableQuantityCommit(bundle, itemId);
  };
  private increaseItem = (itemId: string) => {
    const current = this.state.bundle;
    if (!current) return;
    const item = current.items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    if (consumerRepairCanonicalBackendBinding(current)) {
      void this.changeItemQuantity(itemId, String((item.quantity ?? 0) + 1));
      return;
    }
    const bundle = applyVisibleQuantityDraft(current, itemId, (item.quantity ?? 0) + 1);
    this.updateCurrentBundleWithDeferredDurableQuantityCommit(bundle, itemId);
  };
  private changeItemQuantity = async (itemId: string, value: string, meta?: ConsumerRepairQuantityChangeMeta) => {
    const current = this.state.bundle;
    if (!current) return;
    const quantity = parseEditableEstimateNumberInput(value);
    const binding = consumerRepairCanonicalBackendBinding(current);
    if (binding) {
      const item = current.items.find((candidate) => candidate.id === itemId);
      const rowId = String(item?.sourceParameters?.rowCode ?? "").trim();
      if (!item || !rowId || quantity == null || quantity < 0) {
        this.setState({ statusMessage: "Количество не сохранено: укажите неотрицательное число для точной строки сметы." });
        return;
      }
      const inFlightKey = `${binding.revisionId}\u0000${rowId}\u0000${quantity}`;
      if (this.canonicalQuantityRecalculationInFlightKey) return;
      this.canonicalQuantityRecalculationInFlightKey = inFlightKey;
      this.setState({ statusMessage: "Сохраняем количество и создаём дочернюю версию сметы…" });
      try {
        const result = await this.props.onRecalculateCanonicalEstimate({
          revisionId: binding.revisionId,
          requestDraftId: current.draft.id,
          problemText: current.draft.problemText || current.draft.title || "Смета",
          patches: [],
          rowOverrides: {
            [rowId]: {
              quantity,
              provenance: { kind: "manual", reason: "consumer_estimate_quantity_edit" },
            },
          },
        });
        this.setState({
          bundle: result.bundle,
          canonicalBackendParameterSession: result.session,
          selectedHistoryId: null,
          statusMessage: "Количество сохранено. Создана новая дочерняя версия сметы.",
          validationErrors: [],
        });
        this.refreshHistory(result.bundle);
      } catch (error) {
        this.setState({
          statusMessage: error instanceof Error
            ? error.message
            : "Количество не сохранено: backend не подтвердил дочернюю версию сметы.",
        });
      } finally {
        if (this.canonicalQuantityRecalculationInFlightKey === inFlightKey) {
          this.canonicalQuantityRecalculationInFlightKey = null;
        }
      }
      return;
    }
    const bundle = applyVisibleQuantityDraft(current, itemId, quantity ?? 0);
    const operation = meta ?? {
      operationId: createConsumerRepairQuantityEditOperationId({
        itemId,
        source: "direct_input",
        nextQuantity: quantity ?? 0,
      }),
      source: "direct_input" as const,
      previousQuantity: current.items.find((item) => item.id === itemId)?.quantity ?? null,
      nextQuantity: quantity ?? 0,
    };
    recordConsumerRepairQuantityEditStage({
      ...operation,
      stage: "CANONICAL_MUTATION_APPLIED",
      itemId,
      requestDraftId: current.draft.id,
      baseRevisionId: current.estimateRevisionState?.current_revision_id ?? null,
      rowCount: bundle.items.length,
    });
    this.updateCurrentBundleWithDeferredDurableQuantityCommit(bundle, itemId, { operation });
  };
  private changeItemUnitPrice = async (itemId: string, value: string) => {
    const binding = this.state.bundle ? consumerRepairCanonicalBackendBinding(this.state.bundle) : null;
    const inFlightKey = `${binding?.revisionId ?? "local"}\u0000${itemId}\u0000${value.trim()}`;
    if (this.canonicalPriceRecalculationInFlightKey) {
      if (this.canonicalPriceRecalculationInFlightKey !== inFlightKey) {
        this.setState({ statusMessage: "Дождитесь сохранения предыдущей цены и повторите изменение." });
      }
      return;
    }
    this.canonicalPriceRecalculationInFlightKey = inFlightKey;
    try {
      await this.changeItemUnitPriceUnlocked(itemId, value);
    } finally {
      if (this.canonicalPriceRecalculationInFlightKey === inFlightKey) {
        this.canonicalPriceRecalculationInFlightKey = null;
      }
    }
  };
  private changeItemUnitPriceUnlocked = async (itemId: string, value: string) => {
    const current = this.state.bundle;
    if (!current) return;
    const binding = consumerRepairCanonicalBackendBinding(current);
    if (binding) {
      const item = current.items.find((candidate) => candidate.id === itemId);
      const rowId = String(item?.sourceParameters?.rowCode ?? "").trim();
      const unitPrice = parseEditableEstimateNumberInput(value);
      if (!item || !rowId || unitPrice == null || unitPrice < 0) {
        this.setState({ statusMessage: "Цена не сохранена: укажите неотрицательное число для точной строки сметы." });
        return;
      }
      this.setState({ statusMessage: "Сохраняем цену и создаём дочернюю версию сметы…" });
      try {
        const result = await this.props.onRecalculateCanonicalEstimate({
          revisionId: binding.revisionId,
          requestDraftId: current.draft.id,
          problemText: current.draft.problemText || current.draft.title || "Смета",
          patches: [],
          rowOverrides: {
            [rowId]: {
              unitPrice,
              provenance: { kind: "manual", reason: "consumer_estimate_price_edit" },
            },
          },
        });
        this.setState({
          bundle: result.bundle,
          canonicalBackendParameterSession: result.session,
          selectedHistoryId: null,
          statusMessage: "Цена сохранена. Создана новая дочерняя версия сметы.",
          validationErrors: [],
        });
        this.refreshHistory(result.bundle);
      } catch (error) {
        this.setState({
          statusMessage: error instanceof Error
            ? error.message
            : "Цена не сохранена: backend не подтвердил дочернюю версию сметы.",
        });
      }
      return;
    }
    const bundle = updateConsumerRepairRequestItemUnitPrice({
      requestDraftId: current.draft.id,
      itemId,
      unitPrice: parseEditableEstimateNumberInput(value),
    });
    this.updateCurrentBundle(bundle);
  };
  private applyCanonicalRowAmendment = async (
    itemId: string,
    amendment: Omit<CanonicalEstimateRowOverride, "provenance">,
    reason: string,
    pendingMessage: string,
    successMessage: string,
  ): Promise<void> => {
    const current = this.state.bundle;
    if (!current) return;
    const binding = consumerRepairCanonicalBackendBinding(current);
    const item = current.items.find((candidate) => candidate.id === itemId);
    const rowId = String(item?.sourceParameters?.rowCode ?? "").trim();
    if (!binding || !item || !rowId) {
      this.setState({ statusMessage: "Изменение не сохранено: строка не связана с точной версией сметы." });
      return;
    }
    const inFlightKey = `${binding.revisionId}\u0000${rowId}\u0000${JSON.stringify(amendment)}`;
    if (this.canonicalRowAmendmentInFlightKey) return;
    this.canonicalRowAmendmentInFlightKey = inFlightKey;
    this.setState({ statusMessage: pendingMessage });
    try {
      const result = await this.props.onRecalculateCanonicalEstimate({
        revisionId: binding.revisionId,
        requestDraftId: current.draft.id,
        problemText: current.draft.problemText || current.draft.title || "Смета",
        patches: [],
        rowOverrides: {
          [rowId]: {
            ...amendment,
            provenance: { kind: "manual", reason },
          },
        },
      });
      this.setState({
        bundle: result.bundle,
        canonicalBackendParameterSession: result.session,
        selectedHistoryId: null,
        statusMessage: successMessage,
        validationErrors: [],
      });
      this.refreshHistory(result.bundle);
    } catch (error) {
      this.setState({
        statusMessage: error instanceof Error
          ? error.message
          : "Изменение не сохранено: backend не подтвердил дочернюю версию сметы.",
      });
    } finally {
      if (this.canonicalRowAmendmentInFlightKey === inFlightKey) {
        this.canonicalRowAmendmentInFlightKey = null;
      }
    }
  };
  private changeItemSpecification = (itemId: string, value: string) => {
    const titleRu = value.trim();
    if (!titleRu) {
      this.setState({ statusMessage: "Спецификация не сохранена: название строки не может быть пустым." });
      return;
    }
    void this.applyCanonicalRowAmendment(
      itemId,
      { titleRu },
      "consumer_estimate_specification_edit",
      "Сохраняем спецификацию и создаём дочернюю версию сметы…",
      "Спецификация сохранена. Создана новая дочерняя версия сметы.",
    );
  };
  private changeItemOptional = (itemId: string, optional: boolean) => {
    const item = this.state.bundle?.items.find((candidate) => candidate.id === itemId);
    void this.applyCanonicalRowAmendment(
      itemId,
      {
        includedInEstimate: !optional,
        includedInProcurement: optional ? false : item?.sourceParameters?.includedInProcurement === true,
      },
      "consumer_estimate_optional_toggle",
      "Сохраняем применимость позиции и создаём дочернюю версию сметы…",
      "Применимость позиции сохранена. Создана новая дочерняя версия сметы.",
    );
  };
  private applyParamPatch = async (operation: UserParamPatchOperation, paramKey: string, rawValue: string) => {
    const current = this.state.bundle;
    if (!current) return;
    await this.applyParamBatch([{ operation, paramKey, rawValue }]);
  };
  private applyParamBatch = async (patches: ConsumerRepairDraftRevisionParamBatchPatch[]) => {
    const current = this.state.bundle;
    if (!current) return;
    const binding = consumerRepairCanonicalBackendBinding(current);
    if (!binding) {
      this.setState({ statusMessage: "Параметры не сохранены: у сметы нет точной версии." });
      return;
    }
    this.setState({ statusMessage: "Сохраняем параметры и создаём дочернюю версию сметы…" });
    try {
      const result = await this.props.onRecalculateCanonicalEstimate({
        revisionId: binding.revisionId,
        requestDraftId: current.draft.id,
        problemText: current.draft.problemText || current.draft.title || "Смета",
        patches,
      });
      this.setState({
        bundle: result.bundle,
        canonicalBackendParameterSession: result.session,
        selectedHistoryId: null,
        statusMessage: "Параметры сохранены. Создана новая дочерняя версия и пересчитаны зависимые позиции.",
      });
      this.refreshHistory(result.bundle);
    } catch (error) {
      this.setState({
        statusMessage: error instanceof Error
          ? error.message
          : "Параметры не сохранены: backend не подтвердил дочернюю версию.",
      });
    }
  };
  private refineCanonicalParameters = async () => {
    const current = this.state.bundle;
    if (!current) return;
    let binding: ConsumerEstimateActionContext;
    try {
      binding = this.actionContext("openParameters", current);
    } catch (error) {
      this.handleActionContextError(error);
      return;
    }
    this.setState({ statusMessage: "Загружаем параметры выбранной версии сметы…" });
    try {
      const session = await this.props.onLoadCanonicalParameterSession(binding.revisionId, current.draft.id);
      if (consumerRepairCanonicalBackendBinding(this.state.bundle)?.revisionId !== binding.revisionId) return;
      this.setState({
        canonicalBackendParameterSession: session,
        statusMessage: session.parameters.length > 0
          ? "Параметры открыты в текущей смете. Предварительно принятые значения можно уточнить."
          : "Дополнительные параметры для этой работы не требуются.",
      });
    } catch (error) {
      this.setState({
        statusMessage: error instanceof Error
          ? error.message
          : "Параметры выбранной версии не удалось загрузить.",
      });
    }
  };
  private openProcurement = async () => {
    const current = this.state.bundle;
    if (!current) return;
    try {
      const context = this.actionContext("openProcurement", current);
      {
        const revision = await getCanonicalEstimateRevision(context.revisionId);
        if (
          revision.releaseId !== context.releaseId ||
          (context.definitionId != null && revision.catalogId !== context.definitionId)
        ) {
          throw new ConsumerEstimateActionContextError(
            "Закупка не открыта: backend вернул другую версию или другую работу.",
          );
        }
        const artifact = await buildCanonicalEstimateArtifact({
          revisionId: context.revisionId,
          kind: "procurement",
          idempotencyKey: `consumer-procurement-${context.revisionId}`,
        });
        assertCanonicalEstimateArtifactIdentity({
          artifact,
          revision,
          expectedKind: "procurement",
          expectedCatalogId: context.definitionId ?? revision.catalogId,
          expectedRowCount: revision.rowCount,
        });
        if (artifact.signedUrl) await Linking.openURL(artifact.signedUrl);
        this.setState({ statusMessage: "Закупка выбранной версии открыта." });
        return;
      }
    } catch (error) {
      if (error instanceof ConsumerEstimateActionContextError) this.handleActionContextError(error);
      else this.handleValidationError(error);
    }
  };
  private openParamEditor = (operation: UserParamPatchOperation, paramKey: string) => {
    this.setState({ editingParam: { key: paramKey, operation } });
  };
  private cancelParamEdit = () => {
    this.setState({ editingParam: null });
  };
  private saveParamEdit = (rawValue: string) => {
    const editingParam = this.state.editingParam;
    if (!editingParam) return;
    this.setState({ editingParam: null }, () => {
      this.applyParamPatch(editingParam.operation, editingParam.key, rawValue);
    });
  };
  private removeItem = (itemId: string) => {
    const current = this.state.bundle;
    if (!current) return;
    if (this.openCanonicalBackendEditor(current)) return;
    const removedItem = current.items.find((candidate) => candidate.id === itemId) ?? null;
    const bundle = removeConsumerRepairRequestItem({ requestDraftId: current.draft.id, itemId });
    this.setState({ lastRemovedItem: removedItem });
    this.updateCurrentBundle(bundle, "Позиция удалена.");
  };
  private restoreLastRemovedItem = () => {
    const current = this.state.bundle;
    const item = this.state.lastRemovedItem;
    if (!current || !item) return;
    if (this.openCanonicalBackendEditor(current)) return;
    const bundle = restoreConsumerRepairRequestItem({ current, item });
    this.setState({ lastRemovedItem: null });
    this.updateCurrentBundle(bundle, "Позиция возвращена.");
  };
  private addManualItem = (initialQuery?: string) => {
    const current = this.resolvedDraftBundle(this.ensureDraftBundle({ allowPendingDraftCreation: true }));
    if (!current) return;
    const query = typeof initialQuery === "string" ? initialQuery.trim() : "";
    this.pendingCatalogActionContext = null;
    this.setState({
      catalogPickerVisible: true,
      catalogPickerTargetItemId: null,
      catalogPickerInitialQuery: query || undefined,
    });
  };
  private openPhotoRecognition = async (targetItemId?: string) => {
    const current = this.resolvedDraftBundle(this.ensureDraftBundle({ allowPendingDraftCreation: true }));
    if (!current) return;
    let bundle = current;
    let targetItem = targetItemId
      ? bundle.items.find((candidate) => candidate.id === targetItemId) ?? null
      : bundle.items.find((candidate) => candidate.itemType === "material") ?? null;
    if (!targetItem && !targetItemId) {
      const created = addConsumerRepairPhotoMaterialPlaceholder(bundle);
      bundle = created.bundle;
      targetItem = bundle.items.find((candidate) => candidate.id === created.itemId) ?? null;
      this.setState({
        bundle,
        selectedHistoryId: null,
        statusMessage: created.statusMessage,
        validationErrors: [],
      });
      this.refreshHistory(bundle);
    }
    if (!targetItem || targetItem.itemType !== "material") {
      this.setState({
        statusMessage: targetItemId
          ? "Фото распознавания доступно только для строки материала."
          : "Сначала добавьте или выберите строку материала.",
      });
      return;
    }
    if (consumerRepairCanonicalBackendBinding(bundle)) {
      try {
        const context = await resolveConsumerEstimateLineActionContext({
          context: this.actionContext("openLinePhoto", bundle, targetItem.id),
          bundle,
        });
        this.props.onOpenPhotoForMaterialRecognition({
          userId: context.ownerId,
          draftId: context.draftId,
          targetItemId: targetItem.id,
          revisionId: context.revisionId,
          lineId: context.lineId!,
          purpose: "line_attachment",
          bundle,
        });
        return;
      } catch (error) {
        this.handleActionContextError(error);
        return;
      }
    }
    this.props.onOpenPhotoForMaterialRecognition({
      userId: this.props.consumerUserId,
      draftId: bundle.draft.id,
      targetItemId: targetItem.id,
      bundle,
    });
  };
  private addPhotoMaterialRecognition = () => { void this.openPhotoRecognition(); };
  private openPhotoForEstimateItem = (itemId: string) => { void this.openPhotoRecognition(itemId); };
  private addCustomItem = () => {
    const current = this.resolvedDraftBundle(this.ensureDraftBundle({ allowPendingDraftCreation: true }));
    if (!current) return;
    const bundle = addConsumerRepairCustomNoteItem(current);
    this.updateCurrentBundle(bundle, "Пользовательское примечание добавлено к смете.");
  };
  private openCatalogForEstimateItem = async (itemId: string) => {
    const current = this.resolvedDraftBundle(this.ensureDraftBundle());
    if (!current) return;
    const item = current.items.find((candidate) => candidate.id === itemId);
    if (!item) {
      this.handleActionContextError(new ConsumerEstimateActionContextError(
        "Каталог не открыт: выбранная строка отсутствует в смете.",
      ));
      return;
    }
    if (consumerRepairCanonicalBackendBinding(current)) {
      try {
        this.pendingCatalogActionContext = await resolveConsumerEstimateLineActionContext({
          context: this.actionContext("openLineCatalog", current, itemId),
          bundle: current,
        });
      } catch (error) {
        this.handleActionContextError(error);
        return;
      }
    } else {
      this.pendingCatalogActionContext = null;
    }
    this.setState({
      catalogPickerVisible: true,
      catalogPickerTargetItemId: itemId,
      catalogPickerInitialQuery: item ? catalogInitialQueryForRequestItem(item) : undefined,
    });
  };
  private addCatalogItem = async (catalogItem: CatalogItemPickerItem) => {
    const current = this.resolvedDraftBundle(this.ensureDraftBundle());
    if (!current) return;
    if (consumerRepairCanonicalBackendBinding(current) && !this.pendingCatalogActionContext) {
      try {
        const context = this.actionContext("addCatalogItem", current);
        this.setState({ statusMessage: "\u0414\u043e\u0431\u0430\u0432\u043b\u044f\u0435\u043c \u043f\u043e\u0437\u0438\u0446\u0438\u044e \u0438 \u0441\u043e\u0437\u0434\u0430\u0451\u043c \u0434\u043e\u0447\u0435\u0440\u043d\u044e\u044e \u0432\u0435\u0440\u0441\u0438\u044e \u0441\u043c\u0435\u0442\u044b\u2026" });
        await this.props.onAddCanonicalCatalogItem({
          context,
          problemText: current.draft.problemText || current.draft.title || "\u0421\u043c\u0435\u0442\u0430",
          catalogItem,
        });
        this.setState({
          catalogPickerVisible: false,
          catalogPickerTargetItemId: null,
          catalogPickerInitialQuery: undefined,
          statusMessage: `\u041f\u043e\u0437\u0438\u0446\u0438\u044f \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0430 \u0432 \u043d\u043e\u0432\u0443\u044e \u0434\u043e\u0447\u0435\u0440\u043d\u044e\u044e \u0432\u0435\u0440\u0441\u0438\u044e \u0441\u043c\u0435\u0442\u044b: ${catalogItem.name}.`,
        });
      } catch (error) {
        this.setState({
          statusMessage: error instanceof Error
            ? error.message
            : "\u041f\u043e\u0437\u0438\u0446\u0438\u044f \u043d\u0435 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0430: backend \u043d\u0435 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u043b \u0434\u043e\u0447\u0435\u0440\u043d\u044e\u044e \u0432\u0435\u0440\u0441\u0438\u044e.",
        });
      }
      return;
    }
    const canonicalContext = this.pendingCatalogActionContext;
    if (canonicalContext) {
      this.setState({ statusMessage: "Сохраняем товар и создаём дочернюю версию сметы…" });
      try {
        await this.props.onSelectCanonicalCatalogItem({
          context: canonicalContext,
          problemText: current.draft.problemText || current.draft.title || "Смета",
          catalogItem,
        });
        this.pendingCatalogActionContext = null;
        this.setState({
          catalogPickerVisible: false,
          catalogPickerTargetItemId: null,
          catalogPickerInitialQuery: undefined,
          statusMessage: `Товар выбран для строки. Создана дочерняя версия сметы: ${catalogItem.name}.`,
        });
      } catch (error) {
        this.setState({
          statusMessage: error instanceof Error
            ? error.message
            : "Товар не выбран: backend не подтвердил дочернюю версию.",
        });
      }
      return;
    }
    const result = applyConsumerRepairCatalogItemSelection({
      current,
      catalogItem,
      targetItemId: this.state.catalogPickerTargetItemId,
    });
    this.pendingCatalogActionContext = null;
    this.setState({ catalogPickerVisible: false, catalogPickerTargetItemId: null, catalogPickerInitialQuery: undefined });
    this.updateCurrentBundle(result.bundle, result.statusMessage);
  };
  private createNew = () => {
    this.cancelCanonicalWorkSearch();
    this.workSuggestionsEnabled = true;
    router.setParams({ draftId: "" });
    this.setState(buildNewConsumerRepairRequestState(
      "Новая заявка готова к заполнению.",
      this.state.history,
      this.state.approvedHistoryPage,
    ));
  };
  private goToMarket = () => {
    router.push({
      pathname: MARKET_TAB_ROUTE,
      params: { refresh: String(Date.now()) },
    });
  };
  private selectWorkSuggestion = (suggestion: GlobalWorkSmartSearchSuggestion) => {
    if (suggestion.estimateReady !== true) {
      this.setState({
        statusMessage: suggestion.nonselectableReasonRu
          || "Эта смета проходит обновление состава и временно недоступна для нового расчёта.",
        validationErrors: [],
      });
      return;
    }
    this.cancelCanonicalWorkSearch();
    const originalRawInput = this.state.problemText.trim();
    const referenceSelectedWork = buildMultiDomainReferenceSelectedWorkBinding(originalRawInput);
    const nextProblemText = referenceSelectedWork
      ? `${referenceSelectedWork.selectedTitleRu} `
      : composeSelectedWorkProblemText(suggestion, originalRawInput);
    const selectedWork = referenceSelectedWork ?? buildSelectedWorkFromSuggestion(
      suggestion,
      preserveSelectedWorkResolverInput(originalRawInput, nextProblemText),
    );
    this.setState({
      problemText: nextProblemText,
      selectedWork,
      repairType: selectedWork.selectedCategoryKey,
      validationErrors: [],
      statusMessage: null,
      canonicalWorkSearch: emptyConsumerRepairCanonicalWorkSearchState(),
    }, () => {
      focusConsumerRepairProblemInputAtEnd(this.problemInputRef, nextProblemText);
    });
  };
  private selectTemplateCandidate = (candidate: InlineWorkTemplateCandidate) => {
    this.cancelCanonicalWorkSearch();
    const originalRawInput = this.state.problemText.trim();
    const nextProblemText = composeSelectedTemplateCandidateActiveInputText(candidate);
    const selectedWork = buildSelectedWorkFromTemplateCandidate(
      candidate,
      preserveSelectedWorkResolverInput(originalRawInput, nextProblemText),
    );
    this.setState({
      problemText: nextProblemText,
      selectedWork,
      repairType: selectedWork.selectedCategoryKey,
      validationErrors: [],
      statusMessage: null,
      canonicalWorkSearch: emptyConsumerRepairCanonicalWorkSearchState(),
    }, () => {
      focusConsumerRepairProblemInputAtEnd(this.problemInputRef, nextProblemText);
    });
  };
  private changeProblemText = (problemText: string) => {
    this.workSuggestionsEnabled = true;
    const selectedWork = shouldPreserveSelectedWorkForProblemText(this.state.selectedWork, problemText)
      ? this.state.selectedWork
      : null;
    this.setState({
      problemText,
      selectedWork,
      validationErrors: [],
      canonicalWorkSearch: selectedWork
        ? emptyConsumerRepairCanonicalWorkSearchState()
        : this.state.canonicalWorkSearch,
    }, () => {
      if (selectedWork) {
        this.cancelCanonicalWorkSearch();
        return;
      }
      this.scheduleCanonicalWorkSearch(problemText);
    });
  };
  private cancelCanonicalWorkSearch = () => {
    this.canonicalWorkSearchRequestSerial += 1;
    if (this.canonicalWorkSearchTimer) clearTimeout(this.canonicalWorkSearchTimer);
    this.canonicalWorkSearchTimer = null;
    this.canonicalWorkSearchAbortController?.abort();
    this.canonicalWorkSearchAbortController = null;
  };
  private scheduleCanonicalWorkSearch = (query: string) => {
    this.cancelCanonicalWorkSearch();
    const searchQuery = canonicalWorkSearchQueryFromPrompt(query);
    if (!shouldShowConsumerRepairWorkSuggestions(searchQuery)) {
      this.setState({ canonicalWorkSearch: emptyConsumerRepairCanonicalWorkSearchState() });
      return;
    }
    const requestSerial = this.canonicalWorkSearchRequestSerial;
    this.setState({
      canonicalWorkSearch: {
        ...emptyConsumerRepairCanonicalWorkSearchState(),
        query: searchQuery,
        loading: true,
      },
    });
    this.canonicalWorkSearchTimer = setTimeout(() => {
      this.canonicalWorkSearchTimer = null;
      void this.loadCanonicalWorkSearchPage({ query: searchQuery, cursor: null, append: false, requestSerial });
    }, 180);
  };
  private loadCanonicalWorkSearchPage = async (input: {
    query: string;
    cursor: string | null;
    append: boolean;
    requestSerial: number;
  }) => {
    const controller = new AbortController();
    this.canonicalWorkSearchAbortController?.abort();
    this.canonicalWorkSearchAbortController = controller;
    if (input.append) {
      this.setState((state) => ({
        canonicalWorkSearch: { ...state.canonicalWorkSearch, loading: true, errorRu: null },
      }));
    }
    try {
      const page = await searchCanonicalEstimateCatalog({
        query: input.query,
        cursor: input.cursor,
        pageSize: 100,
        signal: controller.signal,
      });
      if (input.requestSerial !== this.canonicalWorkSearchRequestSerial || controller.signal.aborted) return;
      this.setState((state) => ({
        canonicalWorkSearch: mergeConsumerRepairCanonicalWorkSearchPage({
          query: input.query,
          page,
          previous: state.canonicalWorkSearch,
          append: input.append,
        }),
      }));
    } catch (error) {
      if (controller.signal.aborted || input.requestSerial !== this.canonicalWorkSearchRequestSerial) return;
      const message = error instanceof CanonicalEstimateApiError
        ? error.message
        : "Не удалось получить полный список работ из canonical backend.";
      this.setState((state) => ({
        canonicalWorkSearch: {
          ...state.canonicalWorkSearch,
          query: input.query,
          loading: false,
          errorRu: message,
        },
      }));
    } finally {
      if (this.canonicalWorkSearchAbortController === controller) {
        this.canonicalWorkSearchAbortController = null;
      }
    }
  };
  private loadMoreCanonicalWorkSuggestions = () => {
    const search = this.state.canonicalWorkSearch;
    if (search.loading || !search.nextCursor || !search.query) return;
    this.cancelCanonicalWorkSearch();
    const requestSerial = this.canonicalWorkSearchRequestSerial;
    void this.loadCanonicalWorkSearchPage({
      query: search.query,
      cursor: search.nextCursor,
      append: true,
      requestSerial,
    });
  };
  private closeCatalogPicker = () => {
    this.pendingCatalogActionContext = null;
    this.setState({ catalogPickerVisible: false, catalogPickerTargetItemId: null, catalogPickerInitialQuery: undefined });
  };
  private loadMoreApprovedHistory = async () => {
    if (this.durableHistoryLoadInFlight) return;
    if (!this.historyLoaded) {
      this.ensureHistoryLoaded();
      return;
    }
    this.durableHistoryLoadInFlight = true;
    try {
      await hydrateNextTransactionalConsumerRepairHistoryPage(
        this.state.approvedHistoryPage.pageSize,
      );
      const currentPage = this.state.approvedHistoryPage;
      if (currentPage.items.length === 0) {
        this.setState({
          approvedHistoryPage: listConsumerRepairApprovedHistory(this.props.consumerUserId, {
            limit: currentPage.pageSize,
          }),
        });
        return;
      }
      const cursorCreatedAt = currentPage.nextCursorCreatedAt
        ?? currentPage.items.at(-1)?.draft.createdAt
        ?? null;
      if (!cursorCreatedAt) return;
      const approvedHistoryPage = appendNextApprovedHistoryPage(
        { ...currentPage, nextCursorCreatedAt: cursorCreatedAt },
        (cursor, limit) => listConsumerRepairApprovedHistory(this.props.consumerUserId, {
          limit,
          cursorCreatedAt: cursor,
        }),
      );
      if (approvedHistoryPage !== currentPage) {
        this.setState({ approvedHistoryPage });
      }
    } finally {
      this.durableHistoryLoadInFlight = false;
    }
  };
  private renderScreenView(state: State): React.ReactElement {
    if (this.cachedScreenView && this.cachedScreenViewState === state) {
      return this.cachedScreenView;
    }
    this.cachedScreenViewState = state;
    const binding = consumerRepairCanonicalBackendBinding(state.bundle);
    const parameterSession = state.canonicalBackendParameterSession?.revisionId === binding?.revisionId
      ? state.canonicalBackendParameterSession
      : null;
    const viewState = parameterSession && state.bundle
      ? { ...state, bundle: { ...state.bundle, canonicalParameterSession: parameterSession } }
      : state;
    this.cachedScreenView = (
      <ConsumerRepairRequestScreenView
        state={viewState}
        renderModel={buildConsumerRepairRequestRenderModel(viewState, {
          includeWorkSuggestions: this.workSuggestionsEnabled,
        })}
        problemInputRef={this.problemInputRef} onGoToMarket={this.goToMarket}
        onProblemTextChange={this.changeProblemText}
        onCityChange={(city) => this.setState({ city, validationErrors: [] })}
        onAddressTextChange={(addressText) => this.setState({ addressText, validationErrors: [] })}
        onPreferredTimeTextChange={(preferredTimeText) => this.setState({ preferredTimeText, validationErrors: [] })}
        onContactPhoneChange={(contactPhone) => this.setState({ contactPhone, validationErrors: [] })}
        onSelectWorkSuggestion={this.selectWorkSuggestion} onSelectTemplateCandidate={this.selectTemplateCandidate} onMakePdf={this.makePdf}
        onLoadMoreWorkSuggestions={this.loadMoreCanonicalWorkSuggestions}
        onOpenProcurement={this.openProcurement}
        onRefineCanonicalParameters={this.refineCanonicalParameters}
        onDecrease={this.decreaseItem} onIncrease={this.increaseItem}
        onQuantityChange={this.changeItemQuantity} onUnitPriceChange={this.changeItemUnitPrice}
        onSpecificationChange={this.changeItemSpecification} onOptionalChange={this.changeItemOptional}
        onRemove={this.removeItem} onAddManual={this.addManualItem} onAddCustom={this.addCustomItem}
        onAddPhotoMaterialRecognition={this.addPhotoMaterialRecognition}
        onOpenPhotoForEstimateItem={this.openPhotoForEstimateItem}
        onRestoreLastRemoved={this.restoreLastRemovedItem} onOpenCatalog={this.openCatalogForEstimateItem}
        onOpenParamEditor={this.openParamEditor}
        onSaveParamEdit={this.saveParamEdit}
        onCancelParamEdit={this.cancelParamEdit}
        onApplyParamPatch={this.applyParamPatch}
        onApplyParamBatch={this.applyParamBatch}
        onOpenPdf={this.openPdf}
        onOpenDraft={this.openDraftFromHistory} onToggleHistorySnapshot={this.toggleHistorySnapshot}
        onEditHistoryDraft={this.editHistoryDraft}
        onSendHistoryToMarket={this.sendHistoryToMarket} onCloseCatalogPicker={this.closeCatalogPicker}
        onSelectCatalogItem={this.addCatalogItem} onCreateNew={this.createNew}
        onDeleteDraft={this.deleteDraft}
        onApproveDraft={this.approveDraft} onPrepareDraft={this.prepareDraft}
        onSelectRoadScope={this.selectRoadScope}
        onOpenHistory={this.ensureHistoryLoaded}
        onLoadMoreHistory={this.loadMoreApprovedHistory}
        onScrollPositionChange={this.rememberScrollPosition}
      />
    );
    return this.cachedScreenView;
  }
  render(): React.ReactNode {
    const runtimeIngressProjection =
      this.runtimeIngressProjection?.launchId !== this.props.launchId
        ? this.runtimeIngressProjection
        : null;
    return (
      <>
        {this.renderScreenView(this.state)}
        {runtimeIngressProjection ? (
          <View
            accessibilityLiveRegion="polite"
            style={styles.runtimeIngressComposer}
            testID="request-estimate-runtime-ingress-composer"
          >
            <Text style={styles.runtimeIngressTitle}>
              Открываем новый запрос
            </Text>
            <Text style={styles.runtimeIngressStatus}>
              Подготавливаем форму сметы. Текст запроса уже получен.
            </Text>
            <TextInput
              accessibilityLabel="Описание работ для новой сметы"
              editable={false}
              multiline
              style={styles.runtimeIngressInput}
              testID="consumer-repair-problem-input"
              value={runtimeIngressProjection.prompt}
            />
          </View>
        ) : null}
        {this.props.MobilePhotoCaptureFlowNode ?? null}
      </>
    );
  }
}
