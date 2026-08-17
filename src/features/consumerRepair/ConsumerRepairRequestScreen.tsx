import React from "react";
import { router } from "expo-router";
import { Linking, Text, TextInput, View } from "react-native";
import {
  applyConsumerRepairDraftRevisionParamBatchPatch, applyConsumerRepairDraftRevisionParamPatch, approveConsumerRepairRequestDraft,
  buildApprovedEstimateHistoryRecord,
  commitPreparedConsumerRepairRequestBundle,
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
  awaitConsumerRepairBundleDurableCommit,
  findConsumerRepairBundle,
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
  buildCanonicalEstimateArtifact,
  getCanonicalEstimateRevision,
  searchCanonicalEstimateCatalog,
} from "../../lib/estimate/backendPlatform/canonicalEstimateClient";
import { CanonicalEstimateApiError } from "../../lib/estimate/backendPlatform/contracts";
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
  buildEstimateDraftSessionTransitionStatusMessage,
  buildEmptyConsumerRepairApprovedHistoryPage, buildInitialConsumerRepairRequestState,
  buildMultiDomainReferenceSelectedWorkBinding, buildNewConsumerRepairRequestState, buildSelectedWorkFromSuggestion, buildSelectedWorkFromTemplateCandidate, catalogInitialQueryForRequestItem,
  composeSelectedTemplateCandidateActiveInputText, composeSelectedWorkActiveInputText, focusConsumerRepairProblemInputAtEnd,
  emptyConsumerRepairCanonicalWorkSearchState, mergeConsumerRepairCanonicalWorkSearchPage,
  preserveSelectedWorkResolverInput,
  parseEditableEstimateNumberInput, restoreConsumerRepairRequestItem,
  sendConsumerRepairHistoryToMarketplaceFromScreen,
  shouldPreserveSelectedWorkForProblemText, shouldShowConsumerRepairWorkSuggestions, syncConsumerRepairDraftFromScreenState,
  type ConsumerRepairRequestScreenState,
} from "./requestEstimateScreenActions";

const QUANTITY_EDIT_SAVING_MESSAGE = "\u0421\u043c\u0435\u0442\u0430 \u0441\u043e\u0445\u0440\u0430\u043d\u044f\u0435\u0442\u0441\u044f.";
const QUANTITY_EDIT_SAVED_MESSAGE = "\u0421\u043c\u0435\u0442\u0430 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0430.";
const QUANTITY_EDIT_SAVE_FAILED_MESSAGE =
  "\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u044f. \u041f\u0440\u0430\u0432\u043a\u0430 \u0432\u0438\u0434\u043d\u0430, \u043d\u043e \u0435\u0449\u0435 \u043d\u0435 \u0437\u0430\u0444\u0438\u043a\u0441\u0438\u0440\u043e\u0432\u0430\u043d\u0430.";

function canonicalBackendBinding(bundle: ConsumerRepairDraftBundle | null): { revisionId: string; releaseId: string } | null {
  for (const item of bundle?.items ?? []) {
    const revisionId = String(item.sourceParameters?.canonicalBackendRevisionId ?? "").trim();
    const releaseId = String(item.sourceParameters?.canonicalBackendReleaseId ?? "").trim();
    if (revisionId && releaseId) return { revisionId, releaseId };
  }
  const revisionId = String(bundle?.durableHistorySummary?.sourceRevisionId ?? "").trim();
  const releaseId = String(bundle?.durableHistorySummary?.sourceReleaseId ?? "").trim();
  return revisionId && releaseId ? { revisionId, releaseId } : null;
}

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
export type ConsumerRepairRequestScreenProps = {
  consumerUserId?: string;
  initialProblemText?: string;
  initialDraftId?: string;
  initialSelectedCatalogWorkId?: string;
  launchFingerprint?: string;
  launchId?: string;
  autoPrepare?: boolean;
  autoPdf?: boolean;
};
export type ConsumerRepairRequestScreenControllerProps = ConsumerRepairRequestScreenProps & {
  consumerUserId: string;
  onInitialLaunchBuildSettled?: () => void;
  onOpenCanonicalEstimate: (
    problemText: string,
    revisionId?: string | null,
    requestDraftId?: string | null,
  ) => void;
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
  private approvalCommitInFlight = false;
  private parameterApplyInFlight = false;
  private durableHistoryLoadInFlight = false;
  private canonicalWorkSearchTimer: ReturnType<typeof setTimeout> | null = null;
  private canonicalWorkSearchAbortController: AbortController | null = null;
  private canonicalWorkSearchRequestSerial = 0;
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
    if (
      launchChanged &&
      isFreshRequestEstimateLaunchWorkspace(this.props)
    ) {
      this.workSuggestionsEnabled = false;
    }
    if (launchChanged) {
      this.launchIntentAcknowledged = false;
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
      aiAnswerRu: `Backend revision принята: ${String(bundle.structuredEstimatePayload?.estimateId ?? bundle.draft.id)}.`,
      statusMessage: "Canonical backend revision сохранена в черновике заявки.",
      validationErrors: [],
    }, () => {
      this.acknowledgeLaunchIntent(bundle);
      router.setParams({ draftId: bundle.draft.id });
    });
  }
  private applyInitialLaunchFlow(): void {
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
    this.props.onOpenCanonicalEstimate(launchProblemText);
    this.props.onInitialLaunchBuildSettled?.();
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
        expectedPrompt: this.props.initialProblemText,
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
  private ensureDraftBundle(): ConsumerRepairDraftBundle {
    if (!this.state.bundle) throw new Error("CANONICAL_BACKEND_REVISION_REQUIRED");
    return this.state.bundle;
  }
  setPhotoCaptureStatusMessage(statusMessage: string | null): void { this.setState({ statusMessage }); }
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
  private openCanonicalBackendEditor(
    bundle: ConsumerRepairDraftBundle | null = this.state.bundle,
    statusMessage = "Изменение выполняется в каноническом backend-редакторе.",
  ): boolean {
    if (!bundle) return false;
    const binding = canonicalBackendBinding(bundle);
    this.props.onOpenCanonicalEstimate(
      bundle.draft.problemText?.trim() || this.state.problemText.trim() || bundle.draft.title || "Смета",
      binding?.revisionId ?? null,
      bundle.draft.id,
    );
    this.setState({ statusMessage });
    return true;
  }
  private prepareDraft = () => {
    const currentRevision =
      this.state.bundle?.estimateDraftRevisionState?.revisions.find(
        (revision) =>
          revision.revisionId ===
          this.state.bundle?.estimateDraftRevisionState?.currentRevisionId,
      ) ?? null;
    const legacyEstimateRequiresRebuild = Boolean(
      this.state.bundle &&
      this.state.bundle.canonicalParameterSession == null &&
      (
        this.state.bundle.estimateDraftSession?.status ===
          "PARAMETERS_REQUIRED" ||
        currentRevision?.status === "blocking_required"
      ),
    );
    const problemText =
      this.state.problemText.trim() ||
      (
        legacyEstimateRequiresRebuild
          ? this.state.bundle?.draft.problemText?.trim() ?? ""
          : ""
      );
    if (!problemText) {
      this.setState({ statusMessage: "Напишите, что нужно посчитать по смете." });
      return;
    }
    const binding = canonicalBackendBinding(this.state.bundle);
    this.props.onOpenCanonicalEstimate(
      problemText,
      binding?.revisionId ?? null,
      this.state.bundle?.draft.id ?? null,
    );
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
        console.error("[ConsumerRepairRoadScope] scope calculation failed", error);
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
      const current = this.ensureDraftBundle();
      const synced = this.syncCurrentDraftFields(current);
      const canonical = canonicalBackendBinding(synced);
      if (!canonical) {
        this.openCanonicalBackendEditor(synced, "Перед утверждением перенесите смету в canonical backend.");
        return;
      }
      const canonicalArtifact = await buildCanonicalEstimateArtifact({
          revisionId: canonical.revisionId,
          kind: "pdf",
          idempotencyKey: `consumer-approve-pdf-${canonical.revisionId}`,
        });
      if (
        canonicalArtifact.status !== "ready" ||
        canonicalArtifact.releaseId !== canonical.releaseId
      ) throw new Error("CANONICAL_APPROVAL_PDF_NOT_READY_OR_RELEASE_MISMATCH");
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
        console.error("[ConsumerRepairApprove] durable approval commit failed", error);
        this.setState({
          statusMessage: "Не удалось надёжно сохранить утверждённую смету. Повторите подтверждение.",
        });
      }
    } finally {
      this.approvalCommitInFlight = false;
    }
  };
  private completePdfOpen = async () => {
    try {
      const current = this.ensureDraftBundle();
      const canonical = canonicalBackendBinding(current);
      if (canonical) {
        const artifact = await buildCanonicalEstimateArtifact({
          revisionId: canonical.revisionId,
          kind: "pdf",
          idempotencyKey: `consumer-pdf-${canonical.revisionId}`,
        });
        if (artifact.releaseId !== canonical.releaseId) throw new Error("CANONICAL_PDF_RELEASE_MISMATCH");
        if (artifact.signedUrl) await Linking.openURL(artifact.signedUrl);
        this.setState({ statusMessage: `PDF: revision ${canonical.revisionId}, release ${canonical.releaseId}.` });
        return;
      }
      this.openCanonicalBackendEditor(current, "Для PDF сначала перенесите эту смету в canonical backend.");
    } catch (error) {
      this.handleValidationError(error);
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
  private openPdf = async (requestDraftId?: string) => {
    const requestedBundle = requestDraftId
      ? this.findKnownHistoryBundle(requestDraftId) ?? (this.state.bundle?.draft.id === requestDraftId ? this.state.bundle : null)
      : this.state.bundle;
    const historyRecord = requestDraftId ? this.findKnownHistoryRecord(requestDraftId) : null;
    const canonical = canonicalBackendBinding(requestedBundle ?? null) ?? (
      historyRecord?.sourceRevisionId && historyRecord.sourceReleaseId
        ? { revisionId: historyRecord.sourceRevisionId, releaseId: historyRecord.sourceReleaseId }
        : null
    );
    if (canonical) {
      const artifact = await buildCanonicalEstimateArtifact({
        revisionId: canonical.revisionId,
        kind: "pdf",
        idempotencyKey: `consumer-history-pdf-${canonical.revisionId}`,
      });
      if (artifact.releaseId !== canonical.releaseId) throw new Error("CANONICAL_PDF_RELEASE_MISMATCH");
      if (artifact.signedUrl) await Linking.openURL(artifact.signedUrl);
      this.setState({ statusMessage: `PDF: revision ${canonical.revisionId}, release ${canonical.releaseId}.` });
      return;
    }
    if (requestedBundle) {
      this.openCanonicalBackendEditor(requestedBundle, "Для PDF сначала перенесите эту смету в canonical backend.");
    }
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
          ? "Локальный snapshot отсутствует. Историческая revision будет восстановлена через backend с проверкой доступа."
          : prevState.statusMessage,
    }));
  };
  private editHistoryDraft = async (requestDraftId: string) => {
    try {
      const source = this.findKnownHistoryBundle(requestDraftId);
      const record = this.findKnownHistoryRecord(requestDraftId);
      const binding = canonicalBackendBinding(source) ?? (
        record?.sourceRevisionId && record.sourceReleaseId
          ? { revisionId: record.sourceRevisionId, releaseId: record.sourceReleaseId }
          : null
      );
      if (!binding) {
        this.setState({
          statusMessage: "Историческая revision не имеет canonical backend binding. Нужна явная read-only миграция; новая смета из текущего шаблона не создана.",
        });
        return;
      }
      this.setState({ statusMessage: "Восстанавливаем immutable revision через backend и проверяем доступ…" });
      const revision = await getCanonicalEstimateRevision(binding.revisionId);
      if (revision.releaseId !== binding.releaseId || revision.status === "failed") {
        throw new Error("HISTORY_BACKEND_REVISION_IDENTITY_MISMATCH");
      }
      this.props.onOpenCanonicalEstimate(
        source?.draft.problemText?.trim() || record?.prompt?.trim() || record?.title || "Историческая смета",
        revision.revisionId,
        source?.draft.id ?? record?.approvedEstimateId ?? requestDraftId,
      );
      this.setState({
        statusMessage: "Историческая revision восстановлена через backend. Редактирование создаст child revision; оригинал останется неизменным.",
      });
    } catch (error) {
      if (error instanceof ConsumerRepairValidationError) {
        this.handleValidationError(error);
        return;
      }
      const forbidden = error instanceof CanonicalEstimateApiError && ["ACCESS_DENIED", "NOT_FOUND"].includes(error.code);
      this.setState({
        statusMessage: forbidden
          ? "Историческая revision недоступна или не найдена. Проверьте учётную запись и повторите восстановление; приложение не завершило работу аварийно."
          : "Не удалось восстановить историческую revision. Повторите позже; исходная смета не изменена.",
      });
    }
  };
  private sendHistoryToMarket = async (requestDraftId: string) => {
    try {
      const source = this.findKnownHistoryBundle(requestDraftId);
      const canonical = canonicalBackendBinding(source);
      if (!source) throw new Error("CONSUMER_REPAIR_HISTORY_NOT_FOUND");
      if (!canonical) {
        this.openCanonicalBackendEditor(source, "Для закупки сначала перенесите эту смету в canonical backend.");
        return;
      }
      const canonicalArtifact = await buildCanonicalEstimateArtifact({
          revisionId: canonical.revisionId,
          kind: "procurement",
          idempotencyKey: `consumer-procurement-${canonical.revisionId}`,
        });
      if (
        canonicalArtifact.status !== "ready" ||
        canonicalArtifact.releaseId !== canonical.releaseId
      ) throw new Error("CANONICAL_PROCUREMENT_NOT_READY_OR_RELEASE_MISMATCH");
      this.setState(sendConsumerRepairHistoryToMarketplaceFromScreen({
        requestDraftId,
        userId: this.props.consumerUserId,
        canonicalArtifact: {
          artifactId: canonicalArtifact.artifactId,
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
    if (this.openCanonicalBackendEditor(current)) return;
    const item = current.items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const bundle = applyVisibleQuantityDraft(current, itemId, Math.max(0, (item.quantity ?? 0) - 1));
    this.updateCurrentBundleWithDeferredDurableQuantityCommit(bundle, itemId);
  };
  private increaseItem = (itemId: string) => {
    const current = this.state.bundle;
    if (!current) return;
    if (this.openCanonicalBackendEditor(current)) return;
    const item = current.items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const bundle = applyVisibleQuantityDraft(current, itemId, (item.quantity ?? 0) + 1);
    this.updateCurrentBundleWithDeferredDurableQuantityCommit(bundle, itemId);
  };
  private changeItemQuantity = (itemId: string, value: string, meta?: ConsumerRepairQuantityChangeMeta) => {
    const current = this.state.bundle;
    if (!current) return;
    if (this.openCanonicalBackendEditor(current)) return;
    const quantity = parseEditableEstimateNumberInput(value);
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
  private changeItemUnitPrice = (itemId: string, value: string) => {
    const current = this.state.bundle;
    if (!current) return;
    if (this.openCanonicalBackendEditor(current)) return;
    const bundle = updateConsumerRepairRequestItemUnitPrice({
      requestDraftId: current.draft.id,
      itemId,
      unitPrice: parseEditableEstimateNumberInput(value),
    });
    this.updateCurrentBundle(bundle);
  };
  private applyParamPatch = async (operation: UserParamPatchOperation, paramKey: string, rawValue: string) => {
    const current = this.state.bundle;
    if (!current) return;
    if (this.openCanonicalBackendEditor(current)) return;
    const patches: ConsumerRepairDraftRevisionParamBatchPatch[] = [{ operation, paramKey, rawValue }];
    const previousRevisionCount = current.estimateDraftRevisionState?.revisions.length ?? 0;
    const expectedCatalogId = current.draft.selectedCatalogWorkId ?? null;
    const expectedWorkKey =
      current.canonicalParameterSession?.canonicalWorkKey ??
      current.draft.selectedWorkKey ??
      null;
    try {
      const bundle = applyConsumerRepairDraftRevisionParamPatch({
        requestDraftId: current.draft.id,
        operation,
        paramKey,
        rawValue,
        userId: this.props.consumerUserId,
      });
      if (!bundle.estimateDraftRevisionState) {
        const missingCount = bundle.canonicalParameterSession?.blockingMissingParameterIds.length ?? 0;
        this.updateCurrentBundle(
          bundle,
          missingCount > 0
            ? `Параметр сохранён. Для расчёта осталось уточнить: ${missingCount}.`
            : "Параметр сохранён, но ревизия сметы не сформирована. Повторите применение; введённые данные сохранены.",
        );
        return;
      }
      const revisionCount = bundle.estimateDraftRevisionState?.revisions.length ?? 1; // single-parameter apply
      const revisionState = bundle.estimateDraftRevisionState;
      const revision = revisionState.revisions.find(
        (candidate) => candidate.revisionId === revisionState.currentRevisionId,
      );
      const invariantFailures = [
        revisionCount === previousRevisionCount + 1 ? "" : `revision_count:${previousRevisionCount}->${revisionCount}`,
        revision ? "" : "current_revision_missing",
        revision && revision.boq.rows.length > 0 ? "" : "empty_boq",
        expectedCatalogId == null || bundle.draft.selectedCatalogWorkId === expectedCatalogId
          ? ""
          : `catalog_identity:${expectedCatalogId}->${bundle.draft.selectedCatalogWorkId ?? "missing"}`,
        expectedWorkKey == null || revision?.professionalWorkId === expectedWorkKey
          ? ""
          : `work_identity:${expectedWorkKey}->${revision?.professionalWorkId ?? "missing"}`,
      ].filter(Boolean);
      if (invariantFailures.length > 0) {
        throw new Error(`CONSUMER_REPAIR_PARAMETER_APPLY_INVARIANT_FAILED:${invariantFailures.join("|")}`);
      }
      await awaitConsumerRepairBundleDurableCommit({
        requestDraftId: bundle.draft.id,
        expectedStatus: bundle.draft.status,
        expectedRevisionId: revisionState.currentRevisionId,
      });
      const reopened = findConsumerRepairBundle(bundle.draft.id);
      if (
        !reopened ||
        reopened.estimateDraftRevisionState?.currentRevisionId !== revisionState.currentRevisionId
      ) {
        throw new Error("CONSUMER_REPAIR_PARAMETER_APPLY_REOPEN_REVISION_MISMATCH");
      }
      this.updateCurrentBundle(
        reopened,
        `Параметры применены. Смета сформирована и сохранена: R${revisionCount}. Изменено параметров: ${patches.length}. PDF и пакет закупки нужно пересоздать.`,
      );
      return;
    } catch (error) {
      if (error instanceof ConsumerRepairValidationError) {
        this.handleValidationError(error);
      } else {
        logger.error(
          "ConsumerRepairSingleParameterApply",
          error instanceof Error ? error.message : String(error),
        );
        this.setState({
          statusMessage: "Не удалось сформировать или надёжно сохранить смету. Параметр не подтверждён — повторите применение.",
        });
      }
    }
  };
  private applyParamBatch = async (patches: ConsumerRepairDraftRevisionParamBatchPatch[]) => {
    if (this.parameterApplyInFlight) return;
    const current = this.state.bundle;
    if (!current) return;
    if (this.openCanonicalBackendEditor(current)) return;
    this.parameterApplyInFlight = true;
    const previousRevisionCount = current.estimateDraftRevisionState?.revisions.length ?? 0;
    const expectedCatalogId = current.draft.selectedCatalogWorkId ?? null;
    const expectedWorkKey =
      current.canonicalParameterSession?.canonicalWorkKey ??
      current.draft.selectedWorkKey ??
      null;
    logger.info("ConsumerRepairParameterApply", JSON.stringify({
      stage: "started",
      requestDraftId: current.draft.id,
      patchCount: patches.length,
      previousRevisionCount,
    }));
    this.setState({
      statusMessage: "Применяем параметры и надёжно сохраняем новую ревизию сметы…",
    });
    try {
      const bundle = applyConsumerRepairDraftRevisionParamBatchPatch({
        requestDraftId: current.draft.id,
        patches,
        userId: this.props.consumerUserId,
      });
      if (!bundle.estimateDraftRevisionState) {
        const missingCount = bundle.canonicalParameterSession?.blockingMissingParameterIds.length ?? 0;
        this.updateCurrentBundle(
          bundle,
          missingCount > 0
            ? `Параметры сохранены. Для расчёта осталось уточнить: ${missingCount}.`
            : "Параметры сохранены, но ревизия сметы не сформирована. Повторите применение; введённые данные сохранены.",
        );
        return;
      }
      const revisionCount = bundle.estimateDraftRevisionState?.revisions.length ?? 1;
      const revisionState = bundle.estimateDraftRevisionState;
      const revision = revisionState.revisions.find(
        (candidate) => candidate.revisionId === revisionState.currentRevisionId,
      );
      const invariantFailures = [
        revisionCount === previousRevisionCount + 1 ? "" : `revision_count:${previousRevisionCount}->${revisionCount}`,
        revision ? "" : "current_revision_missing",
        revision && revision.boq.rows.length > 0 ? "" : "empty_boq",
        expectedCatalogId == null || bundle.draft.selectedCatalogWorkId === expectedCatalogId
          ? ""
          : `catalog_identity:${expectedCatalogId}->${bundle.draft.selectedCatalogWorkId ?? "missing"}`,
        expectedWorkKey == null || revision?.professionalWorkId === expectedWorkKey
          ? ""
          : `work_identity:${expectedWorkKey}->${revision?.professionalWorkId ?? "missing"}`,
      ].filter(Boolean);
      if (invariantFailures.length > 0) {
        throw new Error(`CONSUMER_REPAIR_PARAMETER_APPLY_INVARIANT_FAILED:${invariantFailures.join("|")}`);
      }
      await awaitConsumerRepairBundleDurableCommit({
        requestDraftId: bundle.draft.id,
        expectedStatus: bundle.draft.status,
        expectedRevisionId: revisionState.currentRevisionId,
      });
      const reopened = findConsumerRepairBundle(bundle.draft.id);
      if (
        !reopened ||
        reopened.estimateDraftRevisionState?.currentRevisionId !== revisionState.currentRevisionId
      ) {
        throw new Error("CONSUMER_REPAIR_PARAMETER_APPLY_REOPEN_REVISION_MISMATCH");
      }
      this.updateCurrentBundle(
        reopened,
        `Параметры применены. Смета сформирована и сохранена: R${revisionCount}. Изменено параметров: ${patches.length}. PDF и пакет закупки нужно пересоздать.`,
      );
      return;
    } catch (error) {
      if (error instanceof ConsumerRepairValidationError) {
        this.handleValidationError(error);
      } else {
        logger.error(
          "ConsumerRepairParameterApply",
          error instanceof Error ? error.message : String(error),
        );
        this.setState({
          statusMessage: "Не удалось сформировать или надёжно сохранить смету. Параметры не подтверждены — повторите применение.",
        });
      }
    } finally {
      this.parameterApplyInFlight = false;
    }
  };
  private openProcurement = async () => {
    const current = this.state.bundle;
    if (!current) return;
    try {
      const canonical = canonicalBackendBinding(current);
      if (canonical) {
        const artifact = await buildCanonicalEstimateArtifact({
          revisionId: canonical.revisionId,
          kind: "procurement",
          idempotencyKey: `consumer-procurement-${canonical.revisionId}`,
        });
        if (artifact.releaseId !== canonical.releaseId) throw new Error("CANONICAL_PROCUREMENT_RELEASE_MISMATCH");
        if (artifact.signedUrl) await Linking.openURL(artifact.signedUrl);
        this.setState({ statusMessage: `Закупка: revision ${canonical.revisionId}, release ${canonical.releaseId}.` });
        return;
      }
      this.openCanonicalBackendEditor(current, "Для закупки сначала перенесите эту смету в canonical backend.");
    } catch (error) {
      this.handleValidationError(error);
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
  private addManualItem = () => {
    const current = this.ensureDraftBundle();
    if (this.openCanonicalBackendEditor(current)) return;
    this.setState({ catalogPickerVisible: true, catalogPickerTargetItemId: null, catalogPickerInitialQuery: undefined });
  };
  private openPhotoRecognition(targetItemId?: string) {
    let bundle = this.ensureDraftBundle();
    if (canonicalBackendBinding(bundle) && this.openCanonicalBackendEditor(bundle)) return;
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
    this.props.onOpenPhotoForMaterialRecognition({
      userId: this.props.consumerUserId,
      draftId: bundle.draft.id,
      targetItemId: targetItem.id,
      bundle,
    });
  }
  private addPhotoMaterialRecognition = () => this.openPhotoRecognition();
  private openPhotoForEstimateItem = (itemId: string) => this.openPhotoRecognition(itemId);
  private addCustomItem = () => {
    const current = this.ensureDraftBundle();
    if (this.openCanonicalBackendEditor(current)) return;
    const bundle = addConsumerRepairCustomNoteItem(current);
    this.updateCurrentBundle(bundle, "Пользовательское примечание добавлено к смете.");
  };
  private openCatalogForEstimateItem = (itemId: string) => {
    const current = this.ensureDraftBundle();
    if (this.openCanonicalBackendEditor(current)) return;
    const item = current.items.find((candidate) => candidate.id === itemId);
    this.setState({
      catalogPickerVisible: true,
      catalogPickerTargetItemId: itemId,
      catalogPickerInitialQuery: item ? catalogInitialQueryForRequestItem(item) : undefined,
    });
  };
  private addCatalogItem = (catalogItem: CatalogItemPickerItem) => {
    const current = this.ensureDraftBundle();
    if (this.openCanonicalBackendEditor(current)) return;
    const result = applyConsumerRepairCatalogItemSelection({
      current,
      catalogItem,
      targetItemId: this.state.catalogPickerTargetItemId,
    });
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
    this.cancelCanonicalWorkSearch();
    const originalRawInput = this.state.problemText.trim();
    const referenceSelectedWork = buildMultiDomainReferenceSelectedWorkBinding(originalRawInput);
    const nextProblemText = referenceSelectedWork
      ? `${referenceSelectedWork.selectedTitleRu} `
      : composeSelectedWorkActiveInputText(suggestion);
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
    if (!shouldShowConsumerRepairWorkSuggestions(query)) {
      this.setState({ canonicalWorkSearch: emptyConsumerRepairCanonicalWorkSearchState() });
      return;
    }
    const requestSerial = this.canonicalWorkSearchRequestSerial;
    this.setState({
      canonicalWorkSearch: {
        ...emptyConsumerRepairCanonicalWorkSearchState(),
        query,
        loading: true,
      },
    });
    this.canonicalWorkSearchTimer = setTimeout(() => {
      this.canonicalWorkSearchTimer = null;
      void this.loadCanonicalWorkSearchPage({ query, cursor: null, append: false, requestSerial });
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
  private closeCatalogPicker = () => this.setState({ catalogPickerVisible: false, catalogPickerTargetItemId: null, catalogPickerInitialQuery: undefined });
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
    this.cachedScreenView = (
      <ConsumerRepairRequestScreenView
        state={state}
        renderModel={buildConsumerRepairRequestRenderModel(state, {
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
        onDecrease={this.decreaseItem} onIncrease={this.increaseItem}
        onQuantityChange={this.changeItemQuantity} onUnitPriceChange={this.changeItemUnitPrice}
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
