import React from "react";
import { router } from "expo-router";
import type { TextInput } from "react-native";
import {
  approveConsumerRepairRequestDraft,
  ConsumerRepairValidationError, createConsumerRepairDraftFromHistorySnapshot,
  deleteConsumerRepairRequestDraft, generateConsumerRepairRequestPdfForDraft, getConsumerRepairRequestPdf,
  listConsumerRepairApprovedHistory, listConsumerRepairRequestHistory, removeConsumerRepairRequestItem,
  sendConsumerRepairRequestToMarketplace,
  updateConsumerRepairRequestItemQuantity, updateConsumerRepairRequestItemUnitPrice, type ConsumerRepairDraftBundle,
} from "../../lib/consumerRequests";
import type { GlobalWorkSmartSearchSuggestion } from "../../lib/ai/globalEstimate";
import type { CatalogItemPickerItem } from "../../lib/catalog/catalog.facade";
import { recognizeConsumerRepairPhotoMaterial } from "../../lib/ai/photoMaterialDraftRecognition";
import type { ConsumerRepairPhotoMaterialCaptureResult, OpenConsumerRepairPhotoForMaterialRecognitionInput } from "./useConsumerRepairPhotoCaptureController";
import { MARKET_TAB_ROUTE } from "../market/market.routes";
import { composeConsumerRepairDraftAnswerRu } from "./consumerRepairAiAdapter";
import { buildConsumerRepairRequestRenderModel } from "./ConsumerRepairRequestScreenRenderModel";
import { ConsumerRepairRequestScreenView } from "./ConsumerRepairRequestScreenView";
import {
  appendNextApprovedHistoryPage,
  addConsumerRepairCustomNoteItem, applyConsumerRepairCatalogItemSelection, buildConsumerRepairSelectedWorkDraftBundle, buildDeletedConsumerRepairDraftState,
  buildConsumerRepairRequestPdfViewerNavigation, buildInitialConsumerRepairRequestState,
  buildNewConsumerRepairRequestState, buildSelectedWorkFromSuggestion, catalogInitialQueryForRequestItem,
  composeSelectedWorkActiveInputText, focusConsumerRepairProblemInputAtEnd,
  openConsumerRepairRequestPdfFromScreen,
  parseEditableEstimateNumberInput, restoreConsumerRepairRequestItem,
  sendConsumerRepairHistoryToMarketplaceFromScreen,
  selectedWorkFromBundle, shouldPreserveSelectedWorkForProblemText, syncConsumerRepairDraftFromScreenState,
  type ConsumerRepairRequestScreenState,
} from "./requestEstimateScreenActions";

const CONSUMER_USER_ID = "consumer-demo-user";
type State = ConsumerRepairRequestScreenState;
export type ConsumerRepairRequestScreenProps = { initialProblemText?: string; autoPrepare?: boolean; autoPdf?: boolean; };
export type ConsumerRepairRequestScreenControllerProps = ConsumerRepairRequestScreenProps & { onOpenPhotoForMaterialRecognition: (input: OpenConsumerRepairPhotoForMaterialRecognitionInput) => void; MobilePhotoCaptureFlowNode?: React.ReactElement | null; };

export function shouldAutoPrepareInitialConsumerRepairRequest(props: ConsumerRepairRequestScreenProps): boolean {
  return Boolean(props.autoPrepare || props.autoPdf || props.initialProblemText?.trim());
}

export class ConsumerRepairRequestScreenController extends React.Component<ConsumerRepairRequestScreenControllerProps, State> {
  private initialDeepLinkApplied = false;
  private problemInputRef = React.createRef<TextInput>();
  state: State = buildInitialConsumerRepairRequestState({
    initialProblemText: this.props.initialProblemText,
    history: listConsumerRepairRequestHistory(CONSUMER_USER_ID),
    approvedHistoryPage: listConsumerRepairApprovedHistory(CONSUMER_USER_ID),
  });
  componentDidMount(): void { this.applyInitialDeepLinkFlow(); }
  componentDidUpdate(prevProps: ConsumerRepairRequestScreenControllerProps): void {
    if (prevProps.initialProblemText !== this.props.initialProblemText || prevProps.autoPrepare !== this.props.autoPrepare || prevProps.autoPdf !== this.props.autoPdf) {
      this.initialDeepLinkApplied = false;
      const nextProblemText = this.props.initialProblemText?.trim();
      if (nextProblemText && nextProblemText !== this.state.problemText) {
        this.setState({ problemText: nextProblemText, validationErrors: [] }, () => this.applyInitialDeepLinkFlow());
        return;
      }
      this.applyInitialDeepLinkFlow();
    }
  }
  private applyInitialDeepLinkFlow() {
    if (this.initialDeepLinkApplied) return;
    if (!shouldAutoPrepareInitialConsumerRepairRequest(this.props)) return;
    if (!this.state.problemText.trim()) return;
    this.initialDeepLinkApplied = true;
    const bundle = this.buildDraftBundle();
    if (!this.props.autoPdf) return;
    try {
      const pdfBundle = generateConsumerRepairRequestPdfForDraft({
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
    this.setState({
      history,
      approvedHistoryPage,
      bundle: nextBundle === undefined ? this.state.bundle : nextBundle,
    });
  }
  private findKnownHistoryBundle(requestDraftId: string): ConsumerRepairDraftBundle | null {
    return this.state.history.find((candidate) => candidate.draft.id === requestDraftId)
      ?? this.state.approvedHistoryPage.items.find((candidate) => candidate.draft.id === requestDraftId)
      ?? null;
  }
  private buildDraftBundle(): ConsumerRepairDraftBundle {
    const { bundle, selectedWork, aiDraft } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: CONSUMER_USER_ID,
      problemText: this.state.problemText,
      repairType: this.state.repairType,
      city: this.state.city,
      addressText: this.state.addressText,
      preferredTimeText: this.state.preferredTimeText,
      contactPhone: this.state.contactPhone,
      selectedWork: this.state.selectedWork,
    });
    this.setState({
      problemText: "",
      selectedWork: selectedWork ?? selectedWorkFromBundle(bundle),
      bundle,
      aiAnswerRu: composeConsumerRepairDraftAnswerRu(aiDraft),
      validationErrors: [],
      selectedHistoryId: null,
      statusMessage: aiDraft.dangerousDiyBlocked
        ? "Опасный ремонт не описан как DIY. Подготовлена заявка специалисту."
        : "Черновик подготовлен. Можно набрать следующую смету.",
    });
    this.refreshHistory(bundle);
    return bundle;
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
    });
    this.refreshHistory(bundle);
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
      const nextHistory = history.some((candidate) => candidate.draft.id === bundle.draft.id)
        ? history
        : [bundle, ...history];
      this.setState({
        bundle,
        history: nextHistory,
        approvedHistoryPage,
        selectedWork: selectedWorkFromBundle(bundle),
        selectedHistoryId: null,
        aiAnswerRu: null,
        validationErrors: [],
        catalogPickerVisible: false,
        catalogPickerTargetItemId: null,
        catalogPickerInitialQuery: undefined,
        lastRemovedItem: null,
        statusMessage: "Заявка утверждена. PDF сохранён в истории.",
      });
    } catch (error) {
      this.handleValidationError(error);
    }
  };
  private makePdf = async () => {
    try {
      const current = this.ensureDraftBundle();
      const synced = this.syncCurrentDraftFields(current);
      const bundle = generateConsumerRepairRequestPdfForDraft({
        requestDraftId: synced.draft.id,
        userId: CONSUMER_USER_ID,
      });
      this.updateCurrentBundle(bundle, "PDF создан. PDF можно открыть без отправки в маркет.");
      await this.openPdf(bundle.draft.id);
    } catch (error) {
      this.handleValidationError(error);
    }
  };
  private sendToMarketplace = () => {
    try {
      const current = this.ensureDraftBundle();
      const synced = this.syncCurrentDraftFields(current);
      if (synced.draft.status === "consumer_approved") {
        approveConsumerRepairRequestDraft({ requestDraftId: synced.draft.id, userId: CONSUMER_USER_ID });
      }
      const bundle = sendConsumerRepairRequestToMarketplace({
        requestDraftId: synced.draft.id,
        userId: CONSUMER_USER_ID,
        idempotencyKey: `consumer-marketplace:${synced.draft.id}`,
      });
      this.updateCurrentBundle(bundle, "Заявка отправлена в маркет. Офисные процессы не затронуты.");
    } catch (error) {
      this.handleValidationError(error);
    }
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
      selectedWork: selectedWorkFromBundle(bundle),
      selectedHistoryId: null,
      statusMessage: bundle ? "Заявка открыта из истории." : null,
    });
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
        selectedWork: selectedWorkFromBundle(bundle),
        selectedHistoryId: null,
        aiAnswerRu: null,
        validationErrors: [],
        statusMessage: "Создан новый черновик из истории. Можно редактировать смету.",
      });
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
    const bundle = updateConsumerRepairRequestItemQuantity({
      requestDraftId: current.draft.id,
      itemId,
      quantity: Math.max(0, (item.quantity ?? 0) - 1),
    });
    this.updateCurrentBundle(bundle);
  };
  private increaseItem = (itemId: string) => {
    const current = this.state.bundle;
    if (!current) return;
    const item = current.items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const bundle = updateConsumerRepairRequestItemQuantity({
      requestDraftId: current.draft.id,
      itemId,
      quantity: (item.quantity ?? 0) + 1,
    });
    this.updateCurrentBundle(bundle);
  };
  private changeItemQuantity = (itemId: string, value: string) => {
    const current = this.state.bundle;
    if (!current) return;
    const quantity = parseEditableEstimateNumberInput(value);
    const bundle = updateConsumerRepairRequestItemQuantity({
      requestDraftId: current.draft.id,
      itemId,
      quantity: quantity ?? 0,
    });
    this.updateCurrentBundle(bundle);
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
    const bundle = this.ensureDraftBundle();
    const targetItem = targetItemId
      ? bundle.items.find((candidate) => candidate.id === targetItemId) ?? null
      : bundle.items.find((candidate) => candidate.itemType === "material") ?? null;
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
    const nextProblemText = composeSelectedWorkActiveInputText(suggestion);
    const selectedWork = buildSelectedWorkFromSuggestion(suggestion, nextProblemText.trim());
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
    const approvedHistoryPage = appendNextApprovedHistoryPage(
      this.state.approvedHistoryPage,
      (cursorCreatedAt, limit) => listConsumerRepairApprovedHistory(CONSUMER_USER_ID, { limit, cursorCreatedAt }),
    );
    if (approvedHistoryPage !== this.state.approvedHistoryPage) {
      this.setState({ approvedHistoryPage });
    }
  };
  render(): React.ReactNode {
    return (
      <>
        <ConsumerRepairRequestScreenView
          state={this.state} renderModel={buildConsumerRepairRequestRenderModel(this.state)}
          problemInputRef={this.problemInputRef} onGoToMarket={this.goToMarket}
          onProblemTextChange={this.changeProblemText}
          onCityChange={(city) => this.setState({ city, validationErrors: [] })}
          onAddressTextChange={(addressText) => this.setState({ addressText, validationErrors: [] })}
          onPreferredTimeTextChange={(preferredTimeText) => this.setState({ preferredTimeText, validationErrors: [] })}
          onContactPhoneChange={(contactPhone) => this.setState({ contactPhone, validationErrors: [] })}
          onSelectWorkSuggestion={this.selectWorkSuggestion} onMakePdf={this.makePdf}
          onDecrease={this.decreaseItem} onIncrease={this.increaseItem}
          onQuantityChange={this.changeItemQuantity} onUnitPriceChange={this.changeItemUnitPrice}
          onRemove={this.removeItem} onAddManual={this.addManualItem} onAddCustom={this.addCustomItem}
          onAddPhotoMaterialRecognition={this.addPhotoMaterialRecognition}
          onOpenPhotoForEstimateItem={this.openPhotoForEstimateItem}
          onRestoreLastRemoved={this.restoreLastRemovedItem} onOpenCatalog={this.openCatalogForEstimateItem}
          onOpenPdf={this.openPdf}
          onOpenDraft={this.openDraftFromHistory} onToggleHistorySnapshot={this.toggleHistorySnapshot}
          onEditHistoryDraft={this.editHistoryDraft}
          onSendHistoryToMarket={this.sendHistoryToMarket} onCloseCatalogPicker={this.closeCatalogPicker}
          onSelectCatalogItem={this.addCatalogItem} onCreateNew={this.createNew}
          onSendToMarketplace={this.sendToMarketplace} onDeleteDraft={this.deleteDraft}
          onApproveDraft={this.approveDraft} onPrepareDraft={this.prepareDraft}
          onLoadMoreHistory={this.loadMoreApprovedHistory}
        />
        {this.props.MobilePhotoCaptureFlowNode ?? null}
      </>
    );
  }
}
