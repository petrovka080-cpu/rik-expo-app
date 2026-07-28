import React from "react";
import { router } from "expo-router";
import { Text, View, type TextInput } from "react-native";
import {
  applyConsumerRepairDraftRevisionParamBatchPatch, applyConsumerRepairDraftRevisionParamPatch, approveConsumerRepairRequestDraft,
  commitPreparedConsumerRepairRequestBundle, createConsumerRepairDraftFromHistorySnapshot,
  deleteConsumerRepairRequestDraft, ensureConsumerRepairRequestPdfAvailable, getConsumerRepairRequestPdf,
  listConsumerRepairApprovedHistory, listConsumerRepairRequestHistory, removeConsumerRepairRequestItem,
  prepareConsumerRepairRequestItemQuantityUpdate, updateConsumerRepairRequestItemUnitPrice,
  selectConsumerRepairRoadScopeV4,
  type ConsumerRepairDraftRevisionParamBatchPatch,
} from "../../lib/consumerRequests/consumerRequestService";
import { ConsumerRepairValidationError } from "../../lib/consumerRequests/consumerRequestMarketplaceService";
import type {
  ConsumerRepairDraftBundle,
} from "../../lib/consumerRequests/consumerRequestTypes";
import type { GlobalWorkSmartSearchSuggestion } from "../../lib/ai/globalEstimate/globalWorkSmartSearch";
import type { InlineWorkTemplateCandidate } from "../../lib/ai/matchWorkTemplateFromPrompt";
import type { UserParamPatchOperation } from "../../lib/estimate/validateUserParamPatch";
import type { CatalogItemPickerItem } from "../../lib/catalog/catalogItemPickerTypes";
import { recordRequestEstimateLaunchStage } from "../../lib/navigation/requestEstimateLaunchObservability";
import { markRequestEstimateIntentStage } from "../../lib/navigation/requestEstimateLaunchLifecycle";
import type { ConsumerRepairPhotoMaterialCaptureResult, OpenConsumerRepairPhotoForMaterialRecognitionInput } from "./useConsumerRepairPhotoCaptureController";
import { MARKET_TAB_ROUTE } from "../market/market.routes";
import { composeConsumerRepairDraftAnswerRu } from "./consumerRepairDraftAnswer";
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
  addConsumerRepairCustomNoteItem, addConsumerRepairPhotoMaterialPlaceholder, applyConsumerRepairCatalogItemSelection, buildConsumerRepairSelectedWorkDraftBundle, buildDeletedConsumerRepairDraftState,
  buildApprovedConsumerRepairWorkspaceClearedState,
  buildEstimateDraftSessionTransitionStatusMessage,
  buildConsumerRepairRequestPdfViewerNavigation, buildEmptyConsumerRepairApprovedHistoryPage, buildInitialConsumerRepairRequestState,
  buildMultiDomainReferenceSelectedWorkBinding, buildNewConsumerRepairRequestState, buildSelectedWorkFromSuggestion, buildSelectedWorkFromTemplateCandidate, catalogInitialQueryForRequestItem,
  composeSelectedTemplateCandidateActiveInputText, composeSelectedWorkActiveInputText, focusConsumerRepairProblemInputAtEnd,
  preserveSelectedWorkResolverInput,
  openConsumerRepairRequestPdfFromScreen,
  saveProjectExecutionDraftForRequest,
  parseEditableEstimateNumberInput, restoreConsumerRepairRequestItem,
  sendConsumerRepairHistoryToMarketplaceFromScreen,
  shouldPreserveSelectedWorkForProblemText, syncConsumerRepairDraftFromScreenState,
  type ConsumerRepairRequestScreenState,
} from "./requestEstimateScreenActions";

const CONSUMER_USER_ID = "consumer-demo-user";
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
export type ConsumerRepairRequestScreenProps = {
  initialProblemText?: string;
  initialDraftId?: string;
  launchFingerprint?: string;
  launchId?: string;
  autoPrepare?: boolean;
  autoPdf?: boolean;
};
export type ConsumerRepairRequestScreenControllerProps = ConsumerRepairRequestScreenProps & { onOpenPhotoForMaterialRecognition: (input: OpenConsumerRepairPhotoForMaterialRecognitionInput) => void; MobilePhotoCaptureFlowNode?: React.ReactElement | null; };

function shouldDeferInitialHistoryLoad(props: ConsumerRepairRequestScreenControllerProps): boolean {
  return Boolean(
    shouldAutoPrepareInitialConsumerRepairRequest(props) ||
    (
      props.launchId?.trim() &&
      props.initialProblemText?.trim() &&
      !props.initialDraftId?.trim()
    )
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
    history: listConsumerRepairRequestHistory(CONSUMER_USER_ID),
    approvedHistoryPage: listConsumerRepairApprovedHistory(CONSUMER_USER_ID),
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

export class ConsumerRepairRequestScreenController extends React.Component<ConsumerRepairRequestScreenControllerProps, State> {
  private initialDeepLinkApplied = false;
  private launchIntentAcknowledged = false;
  private renderedLaunchId = this.props.launchId?.trim() || null;
  private cachedScreenViewState: State | null = null;
  private cachedScreenView: React.ReactElement | null = null;
  private historyLoaded = !shouldDeferInitialHistoryLoad(this.props);
  private pendingDurableQuantityCommitId = 0;
  private problemInputRef = React.createRef<TextInput>();
  state: State = buildInitialControllerState(this.props);
  componentDidMount(): void {
    runAfterNextPaint(() => this.applyInitialLaunchFlow());
  }
  componentDidUpdate(prevProps: ConsumerRepairRequestScreenControllerProps): void {
    const launchChanged = prevProps.launchId !== this.props.launchId;
    if (launchChanged) {
      this.launchIntentAcknowledged = false;
    }
    if (launchChanged || prevProps.initialProblemText !== this.props.initialProblemText || prevProps.autoPrepare !== this.props.autoPrepare || prevProps.autoPdf !== this.props.autoPdf) {
      this.initialDeepLinkApplied = false;
      const nextProblemText = this.props.initialProblemText?.trim();
      const hasExactPendingLaunchProjection = Boolean(
        launchChanged &&
        this.props.launchId?.trim() &&
        nextProblemText,
      );
      if (
        !hasExactPendingLaunchProjection &&
        nextProblemText &&
        (
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
    const hydrated = buildInitialControllerState(this.props);
    this.historyLoaded = true;
    this.setState((current) => ({
      history: hydrated.history,
      approvedHistoryPage: hydrated.approvedHistoryPage,
      bundle: current.bundle ?? hydrated.bundle,
      problemText: current.bundle || !hydrated.bundle ? current.problemText : "",
      statusMessage: current.bundle || !hydrated.bundle
        ? current.statusMessage
        : hydrated.statusMessage,
    }));
  }
  private applyInitialLaunchFlow(): void {
    if (shouldAutoPrepareInitialConsumerRepairRequest(this.props)) {
      this.applyInitialDeepLinkFlow();
      return;
    }
    this.acknowledgePromptComposerLaunch();
  }
  private acknowledgePromptComposerLaunch(): void {
    if (this.initialDeepLinkApplied) return;
    const launchId = this.props.launchId?.trim();
    const expectedPrompt = this.props.initialProblemText?.trim();
    if (!launchId || !expectedPrompt || this.props.initialDraftId?.trim()) return;
    const pendingProjectionVisible =
      launchId !== this.renderedLaunchId &&
      this.props.initialProblemText?.trim() === expectedPrompt;
    if (!pendingProjectionVisible && this.state.problemText.trim() !== expectedPrompt) {
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
    if (!shouldAutoPrepareInitialConsumerRepairRequest(this.props)) return;
    const launchProblemText =
      this.props.initialProblemText?.trim() || this.state.problemText.trim();
    if (!launchProblemText) return;
    this.initialDeepLinkApplied = true;
    const bundle = this.buildDraftBundle(launchProblemText);
    if (!this.props.autoPdf) return;
    try {
      const pdfBundle = ensureConsumerRepairRequestPdfAvailable({
        requestDraftId: bundle.draft.id,
        userId: CONSUMER_USER_ID,
      });
      this.updateCurrentBundle(pdfBundle, "PDF создан. PDF можно открыть без отправки в маркет.");
      void this.openPdf(pdfBundle.draft.id).catch((error) => {
        this.handleValidationError(error);
      });
    } catch (error) {
      this.handleValidationError(error);
    }
  }
  private refreshHistory(nextBundle?: ConsumerRepairDraftBundle | null) {
    const history = listConsumerRepairRequestHistory(CONSUMER_USER_ID);
    const approvedHistoryPage = listConsumerRepairApprovedHistory(CONSUMER_USER_ID);
    this.historyLoaded = true;
    this.setState({
      history,
      approvedHistoryPage,
      bundle: nextBundle === undefined ? this.state.bundle : nextBundle,
    });
  }
  private ensureHistoryLoaded = () => {
    if (this.historyLoaded) return;
    const history = listConsumerRepairRequestHistory(CONSUMER_USER_ID);
    const approvedHistoryPage = listConsumerRepairApprovedHistory(CONSUMER_USER_ID);
    this.historyLoaded = true;
    this.setState({ history, approvedHistoryPage });
  };
  private findKnownHistoryBundle(requestDraftId: string): ConsumerRepairDraftBundle | null {
    return this.state.history.find((candidate) => candidate.draft.id === requestDraftId)
      ?? this.state.approvedHistoryPage.items.find((candidate) => candidate.draft.id === requestDraftId)
      ?? null;
  }
  private buildDraftBundle(problemTextOverride?: string): ConsumerRepairDraftBundle {
    const isLaunchBuild = Boolean(problemTextOverride?.trim());
    const sourceProblemText = problemTextOverride?.trim() || this.state.problemText;
    const { bundle, aiDraft } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: CONSUMER_USER_ID,
      problemText: sourceProblemText,
      repairType: this.state.repairType,
      city: this.state.city,
      addressText: this.state.addressText,
      preferredTimeText: this.state.preferredTimeText,
      contactPhone: this.state.contactPhone,
      // A launch payload is a complete new WorkIntent. It must never inherit a
      // catalog binding left in the already-mounted composer.
      selectedWork: isLaunchBuild ? null : this.state.selectedWork,
    });
    const history = listConsumerRepairRequestHistory(CONSUMER_USER_ID);
    const approvedHistoryPage = listConsumerRepairApprovedHistory(CONSUMER_USER_ID);
    this.historyLoaded = true;
    if (isLaunchBuild) {
      // The next render contains the new bundle itself, so the lightweight
      // launch projection may disappear during that same committed render.
      this.renderedLaunchId = this.props.launchId?.trim() || null;
    }
    this.setState({
      problemText: "",
      // The created bundle owns its explicit work selection. The composer is a
      // separate future draft session and must not inherit that WorkIntent.
      selectedWork: null,
      bundle,
      history,
      approvedHistoryPage,
      aiAnswerRu: composeConsumerRepairDraftAnswerRu(aiDraft),
      validationErrors: [],
      selectedHistoryId: null,
      statusMessage: aiDraft.dangerousDiyBlocked
        ? "Опасный ремонт не описан как DIY. Подготовлена заявка специалисту."
        : bundle.pendingRoadScopeSelection
          ? "Выберите состав дорожных работ, затем смета будет рассчитана."
          : "Черновик подготовлен. Можно набрать следующую смету.",
    }, () => {
      this.acknowledgeLaunchIntent(bundle);
      if (isLaunchBuild) {
        // Binding the durable draft back to the route is intentionally after
        // the UI commit/ACK. A same-route setParams must not sit on the
        // critical path between the visible estimate and its lifecycle proof.
        runAfterNextPaint(() => router.setParams({ draftId: bundle.draft.id }));
      }
    });
    if (!isLaunchBuild) {
      router.setParams({ draftId: bundle.draft.id });
    }
    return bundle;
  }
  private acknowledgeLaunchIntent(bundle: ConsumerRepairDraftBundle): void {
    const launchId = this.props.launchId?.trim();
    if (!launchId || this.launchIntentAcknowledged) return;
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
    return this.state.bundle ?? this.buildDraftBundle();
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
  private prepareDraft = () => {
    if (!this.state.problemText.trim()) {
      this.setState({ statusMessage: "Напишите, что нужно посчитать по смете." });
      return;
    }
    this.buildDraftBundle();
  };
  private selectRoadScope = (selectedScope: string) => {
    const current = this.state.bundle;
    if (!current || this.state.roadScopeSelectionBusy) return;
    this.setState({ roadScopeSelectionBusy: true, statusMessage: "Выполняется расчёт…" }, () => {
      try {
        const bundle = selectConsumerRepairRoadScopeV4({
          requestDraftId: current.draft.id,
          userId: CONSUMER_USER_ID,
          selectedScope,
        });
        this.updateCurrentBundle(
          bundle,
          buildEstimateDraftSessionTransitionStatusMessage(bundle),
        );
      } catch {
        this.setState({ statusMessage: "Не удалось выполнить расчёт. Выберите состав ещё раз." });
      } finally {
        this.setState({ roadScopeSelectionBusy: false });
      }
    });
  };
  private deleteDraft = () => {
    const current = this.state.bundle;
    if (!current || current.draft.status !== "draft") return;
    deleteConsumerRepairRequestDraft({ requestDraftId: current.draft.id, userId: CONSUMER_USER_ID });
    this.setState(buildDeletedConsumerRepairDraftState("Заявка удалена."));
    this.refreshHistory(null);
  };
  private approveDraft = () => {
    try {
      const current = this.ensureDraftBundle();
      const synced = this.syncCurrentDraftFields(current);
      const bundle = approveConsumerRepairRequestDraft({ requestDraftId: synced.draft.id, userId: CONSUMER_USER_ID });
      const history = listConsumerRepairRequestHistory(CONSUMER_USER_ID);
      const approvedHistoryPage = listConsumerRepairApprovedHistory(CONSUMER_USER_ID);
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
      this.handleValidationError(error);
    }
  };
  private completePdfOpen = async () => {
    try {
      const current = this.ensureDraftBundle();
      const synced = this.syncCurrentDraftFields(current);
      const bundle = ensureConsumerRepairRequestPdfAvailable({
        requestDraftId: synced.draft.id,
        userId: CONSUMER_USER_ID,
      });
      this.updateCurrentBundle(bundle, "PDF создан. PDF можно открыть без отправки в маркет.");
      await this.openPdf(bundle.draft.id);
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
        setTimeout(run, 0);
      },
    );
  };
  private openPdf = async (requestDraftId?: string) => {
    await openConsumerRepairRequestPdfFromScreen({
      requestDraftId: requestDraftId ?? this.state.bundle?.draft.id,
      buildNavigation: (draftId) => buildConsumerRepairRequestPdfViewerNavigation(draftId, getConsumerRepairRequestPdf),
      pushPdfViewer: (params) => router.push({ pathname: "/pdf-viewer", params }),
      setStatusMessage: (statusMessage) => this.setState({ statusMessage }),
      handleValidationError: (error) => this.handleValidationError(error),
    });
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
      statusMessage: bundle ? "История открыта для просмотра." : prevState.statusMessage,
    }));
  };
  private editHistoryDraft = (requestDraftId: string) => {
    try {
      const bundle = createConsumerRepairDraftFromHistorySnapshot({
        sourceRequestDraftId: requestDraftId,
        userId: CONSUMER_USER_ID,
        reason: "edit_as_new_revision",
      });
      this.setState({
        bundle,
        selectedWork: null,
        selectedHistoryId: null,
        aiAnswerRu: null,
        validationErrors: [],
        statusMessage: "Создан новый черновик из истории. Можно редактировать смету.",
      });
      router.setParams({ draftId: bundle.draft.id });
      this.refreshHistory(bundle);
    } catch (error) {
      this.handleValidationError(error);
    }
  };
  private sendHistoryToMarket = (requestDraftId: string) => {
    try {
      this.setState(sendConsumerRepairHistoryToMarketplaceFromScreen({
        requestDraftId,
        userId: CONSUMER_USER_ID,
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
    const bundle = applyVisibleQuantityDraft(current, itemId, Math.max(0, (item.quantity ?? 0) - 1));
    this.updateCurrentBundleWithDeferredDurableQuantityCommit(bundle, itemId);
  };
  private increaseItem = (itemId: string) => {
    const current = this.state.bundle;
    if (!current) return;
    const item = current.items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const bundle = applyVisibleQuantityDraft(current, itemId, (item.quantity ?? 0) + 1);
    this.updateCurrentBundleWithDeferredDurableQuantityCommit(bundle, itemId);
  };
  private changeItemQuantity = (itemId: string, value: string, meta?: ConsumerRepairQuantityChangeMeta) => {
    const current = this.state.bundle;
    if (!current) return;
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
    const bundle = updateConsumerRepairRequestItemUnitPrice({
      requestDraftId: current.draft.id,
      itemId,
      unitPrice: parseEditableEstimateNumberInput(value),
    });
    this.updateCurrentBundle(bundle);
  };
  private applyParamPatch = (operation: UserParamPatchOperation, paramKey: string, rawValue: string) => {
    const current = this.state.bundle;
    if (!current) return;
    try {
      const bundle = applyConsumerRepairDraftRevisionParamPatch({
        requestDraftId: current.draft.id,
        operation,
        paramKey,
        rawValue,
        userId: CONSUMER_USER_ID,
      });
      const revisionCount = bundle.estimateDraftRevisionState?.revisions.length ?? 1;
      this.updateCurrentBundle(bundle, `Смета пересчитана: R${revisionCount}. PDF и пакет закупки нужно пересоздать.`);
    } catch (error) {
      this.handleValidationError(error);
    }
  };
  private applyParamBatch = (patches: ConsumerRepairDraftRevisionParamBatchPatch[]) => {
    const current = this.state.bundle;
    if (!current) return;
    try {
      const bundle = applyConsumerRepairDraftRevisionParamBatchPatch({
        requestDraftId: current.draft.id,
        patches,
        userId: CONSUMER_USER_ID,
      });
      const revisionCount = bundle.estimateDraftRevisionState?.revisions.length ?? 1;
      this.updateCurrentBundle(bundle, `Смета пересчитана одной ревизией: R${revisionCount}. Изменено параметров: ${patches.length}. PDF и пакет закупки нужно пересоздать.`);
    } catch (error) {
      this.handleValidationError(error);
    }
  };
  private openProcurement = () => {
    const current = this.state.bundle;
    if (!current) return;
    try {
      const result = saveProjectExecutionDraftForRequest({
        action: "open_material_list",
        bundle: current,
        userId: CONSUMER_USER_ID,
      });
      this.updateCurrentBundle(result.bundle, result.statusMessage);
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
    const removedItem = current.items.find((candidate) => candidate.id === itemId) ?? null;
    const bundle = removeConsumerRepairRequestItem({ requestDraftId: current.draft.id, itemId });
    this.setState({ lastRemovedItem: removedItem });
    this.updateCurrentBundle(bundle, "Позиция удалена.");
  };
  private restoreLastRemovedItem = () => {
    const current = this.state.bundle;
    const item = this.state.lastRemovedItem;
    if (!current || !item) return;
    const bundle = restoreConsumerRepairRequestItem({ current, item });
    this.setState({ lastRemovedItem: null });
    this.updateCurrentBundle(bundle, "Позиция возвращена.");
  };
  private addManualItem = () => {
    this.ensureDraftBundle();
    this.setState({ catalogPickerVisible: true, catalogPickerTargetItemId: null, catalogPickerInitialQuery: undefined });
  };
  private openPhotoRecognition(targetItemId?: string) {
    let bundle = this.ensureDraftBundle();
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
      userId: CONSUMER_USER_ID,
      draftId: bundle.draft.id,
      targetItemId: targetItem.id,
      bundle,
    });
  }
  private addPhotoMaterialRecognition = () => this.openPhotoRecognition();
  private openPhotoForEstimateItem = (itemId: string) => this.openPhotoRecognition(itemId);
  private addCustomItem = () => {
    const current = this.ensureDraftBundle();
    const bundle = addConsumerRepairCustomNoteItem(current);
    this.updateCurrentBundle(bundle, "Пользовательское примечание добавлено к смете.");
  };
  private openCatalogForEstimateItem = (itemId: string) => {
    const current = this.ensureDraftBundle();
    const item = current.items.find((candidate) => candidate.id === itemId);
    this.setState({
      catalogPickerVisible: true,
      catalogPickerTargetItemId: itemId,
      catalogPickerInitialQuery: item ? catalogInitialQueryForRequestItem(item) : undefined,
    });
  };
  private addCatalogItem = (catalogItem: CatalogItemPickerItem) => {
    const result = applyConsumerRepairCatalogItemSelection({
      current: this.ensureDraftBundle(),
      catalogItem,
      targetItemId: this.state.catalogPickerTargetItemId,
    });
    this.setState({ catalogPickerVisible: false, catalogPickerTargetItemId: null, catalogPickerInitialQuery: undefined });
    this.updateCurrentBundle(result.bundle, result.statusMessage);
  };
  private createNew = () => {
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
    }, () => {
      focusConsumerRepairProblemInputAtEnd(this.problemInputRef, nextProblemText);
    });
  };
  private selectTemplateCandidate = (candidate: InlineWorkTemplateCandidate) => {
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
    }, () => {
      focusConsumerRepairProblemInputAtEnd(this.problemInputRef, nextProblemText);
    });
  };
  private changeProblemText = (problemText: string) => {
    this.setState({
      problemText,
      selectedWork: shouldPreserveSelectedWorkForProblemText(this.state.selectedWork, problemText)
        ? this.state.selectedWork
        : null,
      validationErrors: [],
    });
  };
  private closeCatalogPicker = () => this.setState({ catalogPickerVisible: false, catalogPickerTargetItemId: null, catalogPickerInitialQuery: undefined });
  private loadMoreApprovedHistory = () => {
    if (!this.historyLoaded) {
      this.ensureHistoryLoaded();
      return;
    }
    const approvedHistoryPage = appendNextApprovedHistoryPage(
      this.state.approvedHistoryPage,
      (cursorCreatedAt, limit) => listConsumerRepairApprovedHistory(CONSUMER_USER_ID, { limit, cursorCreatedAt }),
    );
    if (approvedHistoryPage !== this.state.approvedHistoryPage) {
      this.setState({ approvedHistoryPage });
    }
  };
  private pendingLaunchPrompt(): string | null {
    const launchId = this.props.launchId?.trim() || null;
    const incomingPrompt = this.props.initialProblemText?.trim() || "";
    return launchId && launchId !== this.renderedLaunchId && incomingPrompt
      ? incomingPrompt
      : null;
  }
  private renderScreenView(state: State): React.ReactElement {
    if (this.cachedScreenView && this.cachedScreenViewState === state) {
      return this.cachedScreenView;
    }
    this.cachedScreenViewState = state;
    this.cachedScreenView = (
      <ConsumerRepairRequestScreenView
        state={state} renderModel={buildConsumerRepairRequestRenderModel(state)}
        problemInputRef={this.problemInputRef} onGoToMarket={this.goToMarket}
        onProblemTextChange={this.changeProblemText}
        onCityChange={(city) => this.setState({ city, validationErrors: [] })}
        onAddressTextChange={(addressText) => this.setState({ addressText, validationErrors: [] })}
        onPreferredTimeTextChange={(preferredTimeText) => this.setState({ preferredTimeText, validationErrors: [] })}
        onContactPhoneChange={(contactPhone) => this.setState({ contactPhone, validationErrors: [] })}
        onSelectWorkSuggestion={this.selectWorkSuggestion} onSelectTemplateCandidate={this.selectTemplateCandidate} onMakePdf={this.makePdf}
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
    const pendingLaunchPrompt = this.pendingLaunchPrompt();
    return (
      <>
        {this.renderScreenView(this.state)}
        {pendingLaunchPrompt ? (
          <View
            accessibilityLabel={`Текущий запрос: ${pendingLaunchPrompt}`}
            pointerEvents="none"
            style={styles.pendingLaunchPrompt}
            testID="request-estimate-current-launch-prompt"
          >
            <Text style={styles.launchPromptLabel}>Текущий запрос</Text>
            <Text
              style={styles.launchPromptText}
              testID="request-estimate-current-launch-prompt-text"
            >
              {pendingLaunchPrompt}
            </Text>
          </View>
        ) : null}
        {this.props.MobilePhotoCaptureFlowNode ?? null}
      </>
    );
  }
}
