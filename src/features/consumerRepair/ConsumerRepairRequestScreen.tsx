import React from "react";
import { router } from "expo-router";
import type { TextInput } from "react-native";
import {
  approveConsumerRepairRequestDraft, attachConsumerRepairMedia,
  ConsumerRepairValidationError, createConsumerRepairDraftFromHistorySnapshot,
  deleteConsumerRepairRequestDraft, ensureConsumerRepairRequestPdfAvailable, generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairRequestPdf, listConsumerRepairRequestHistory, removeConsumerRepairRequestItem,
  sendConsumerRepairRequestToMarketplace,
  updateConsumerRepairRequestItemQuantity, updateConsumerRepairRequestItemUnitPrice, type ConsumerRepairDraftBundle,
} from "../../lib/consumerRequests";
import type { GlobalWorkSmartSearchSuggestion } from "../../lib/ai/globalEstimate";
import type { CatalogItemPickerItem } from "../../lib/catalog/catalog.facade";
import { buildGeneratedPdfViewerRouteParams } from "../../lib/estimatePdf/generatedPdfViewerFile";
import type { OpenConsumerRepairPhotoForEstimateItemInput } from "./useConsumerRepairPhotoCaptureController";
import { MARKET_TAB_ROUTE } from "../market/market.routes";
import { composeConsumerRepairDraftAnswerRu } from "./consumerRepairAiAdapter";
import { buildConsumerRepairRequestRenderModel } from "./ConsumerRepairRequestScreenRenderModel";
import { ConsumerRepairRequestScreenView } from "./ConsumerRepairRequestScreenView";
import {
  addConsumerRepairCustomNoteItem, applyConsumerRepairCatalogItemSelection, buildConsumerRepairSelectedWorkDraftBundle, buildDeletedConsumerRepairDraftState,
  buildApprovedConsumerRepairWorkspaceClearedState, buildInitialConsumerRepairRequestState,
  buildNewConsumerRepairRequestState, buildSelectedWorkFromSuggestion,
  catalogInitialQueryForRequestItem, composeSelectedWorkActiveInputText, focusConsumerRepairProblemInputAtEnd,
  parseEditableEstimateNumberInput, restoreConsumerRepairRequestItem, saveProjectExecutionDraftForRequest,
  selectedWorkFromBundle, shouldPreserveSelectedWorkForProblemText, syncConsumerRepairDraftFromScreenState,
  type ConsumerRepairProjectExecutionAction, type ConsumerRepairRequestScreenState,
} from "./requestEstimateScreenActions";
const CONSUMER_USER_ID = "consumer-demo-user";
type State = ConsumerRepairRequestScreenState;
export type ConsumerRepairRequestScreenProps = { initialProblemText?: string; autoPrepare?: boolean; autoPdf?: boolean; };
export type ConsumerRepairRequestScreenControllerProps = ConsumerRepairRequestScreenProps & {
  onOpenPhotoForEstimateItem: (input: OpenConsumerRepairPhotoForEstimateItemInput) => void; MobilePhotoCaptureFlowNode?: React.ReactElement | null;
};

export class ConsumerRepairRequestScreenController extends React.Component<ConsumerRepairRequestScreenControllerProps, State> {
  private initialDeepLinkApplied = false;
  private problemInputRef = React.createRef<TextInput>();
  state: State = buildInitialConsumerRepairRequestState({
    initialProblemText: this.props.initialProblemText,
    history: listConsumerRepairRequestHistory(CONSUMER_USER_ID),
  });
  componentDidMount(): void {
    this.applyInitialDeepLinkFlow();
  }
  componentDidUpdate(prevProps: ConsumerRepairRequestScreenControllerProps): void {
    if (
      prevProps.initialProblemText !== this.props.initialProblemText ||
      prevProps.autoPrepare !== this.props.autoPrepare ||
      prevProps.autoPdf !== this.props.autoPdf
    ) {
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
    if (!this.props.autoPrepare && !this.props.autoPdf) return;
    if (!this.state.problemText.trim()) return;
    this.initialDeepLinkApplied = true;
    const bundle = this.buildDraftBundle();
    if (!this.props.autoPdf) return;
    try {
      const pdfBundle = generateConsumerRepairRequestPdfForDraft({
        requestDraftId: bundle.draft.id,
        userId: CONSUMER_USER_ID,
      });
      this.updateCurrentBundle(pdfBundle, "PDF СЃРѕР·РґР°РЅ. PDF РјРѕР¶РЅРѕ РѕС‚РєСЂС‹С‚СЊ Р±РµР· РѕС‚РїСЂР°РІРєРё РІ РјР°СЂРєРµС‚.");
      void this.openPdf(pdfBundle.draft.id).catch((error) => {
        this.handleValidationError(error);
      });
    } catch (error) {
      this.handleValidationError(error);
    }
  }
  private refreshHistory(nextBundle?: ConsumerRepairDraftBundle | null) {
    const history = listConsumerRepairRequestHistory(CONSUMER_USER_ID);
    this.setState({
      history,
      bundle: nextBundle === undefined ? this.state.bundle : nextBundle,
    });
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
      selectedWork,
      bundle,
      aiAnswerRu: composeConsumerRepairDraftAnswerRu(aiDraft),
      validationErrors: [],
      selectedHistoryId: null,
      statusMessage: aiDraft.dangerousDiyBlocked
        ? "РћРїР°СЃРЅС‹Р№ СЂРµРјРѕРЅС‚ РЅРµ РѕРїРёСЃР°РЅ РєР°Рє DIY. РџРѕРґРіРѕС‚РѕРІР»РµРЅР° Р·Р°СЏРІРєР° СЃРїРµС†РёР°Р»РёСЃС‚Сѓ."
        : "Р§РµСЂРЅРѕРІРёРє РїРѕРґРіРѕС‚РѕРІР»РµРЅ. РњРѕР¶РЅРѕ РЅР°Р±СЂР°С‚СЊ СЃР»РµРґСѓСЋС‰СѓСЋ СЃРјРµС‚Сѓ.",
    });
    this.refreshHistory(bundle);
    return bundle;
  }
  private ensureDraftBundle(): ConsumerRepairDraftBundle {
    return this.state.bundle ?? this.buildDraftBundle();
  }
  setPhotoCaptureStatusMessage(statusMessage: string | null): void { this.setState({ statusMessage }); }
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
      this.setState({ statusMessage: "РќР°РїРёС€РёС‚Рµ, С‡С‚Рѕ РЅСѓР¶РЅРѕ РїРѕСЃС‡РёС‚Р°С‚СЊ РїРѕ СЃРјРµС‚Рµ." });
      return;
    }
    this.buildDraftBundle();
  };
  private deleteDraft = () => {
    const current = this.state.bundle;
    if (!current || current.draft.status !== "draft") return;
    deleteConsumerRepairRequestDraft({ requestDraftId: current.draft.id, userId: CONSUMER_USER_ID });
    this.setState(buildDeletedConsumerRepairDraftState("Р—Р°СЏРІРєР° СѓРґР°Р»РµРЅР°."));
    this.refreshHistory(null);
  };
  private approveDraft = () => {
    try {
      const current = this.ensureDraftBundle();
      const synced = this.syncCurrentDraftFields(current);
      const bundle = approveConsumerRepairRequestDraft({ requestDraftId: synced.draft.id, userId: CONSUMER_USER_ID });
      const history = listConsumerRepairRequestHistory(CONSUMER_USER_ID);
      const nextHistory = history.some((candidate) => candidate.draft.id === bundle.draft.id)
        ? history
        : [bundle, ...history];
      this.setState(buildApprovedConsumerRepairWorkspaceClearedState({
        history: nextHistory,
        statusMessage: "Р—Р°СЏРІРєР° СѓС‚РІРµСЂР¶РґРµРЅР°. PDF СЃРѕС…СЂР°РЅС‘РЅ РІ РёСЃС‚РѕСЂРёРё.",
      }));
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
      this.updateCurrentBundle(bundle, "PDF СЃРѕР·РґР°РЅ. PDF РјРѕР¶РЅРѕ РѕС‚РєСЂС‹С‚СЊ Р±РµР· РѕС‚РїСЂР°РІРєРё РІ РјР°СЂРєРµС‚.");
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
      this.updateCurrentBundle(bundle, "Р—Р°СЏРІРєР° РѕС‚РїСЂР°РІР»РµРЅР° РІ РјР°СЂРєРµС‚. РћС„РёСЃРЅС‹Рµ РїСЂРѕС†РµСЃСЃС‹ РЅРµ Р·Р°С‚СЂРѕРЅСѓС‚С‹.");
    } catch (error) {
      this.handleValidationError(error);
    }
  };
  private openPdf = async (requestDraftId?: string) => {
    try {
      const draftId = requestDraftId ?? this.state.bundle?.draft.id;
      if (!draftId) return;
      const pdf = getConsumerRepairRequestPdf({ requestDraftId: draftId });
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
      router.push({
        pathname: "/pdf-viewer",
        params,
      });
      this.setState({ statusMessage: `PDF РѕС‚РєСЂС‹С‚: ${pdf.titleRu}.` });
    } catch (error) {
      if (error instanceof ConsumerRepairValidationError) {
        this.handleValidationError(error);
        return;
      }
      this.setState({
        statusMessage: error instanceof Error ? error.message : "PDF РЅРµРґРѕСЃС‚СѓРїРµРЅ.",
      });
    }
  };
  private openDraftFromHistory = (requestDraftId: string) => {
    const bundle = this.state.history.find((candidate) => candidate.draft.id === requestDraftId) ?? null;
    if (bundle && bundle.draft.status !== "draft") {
      this.toggleHistorySnapshot(requestDraftId);
      return;
    }
    this.setState({
      bundle,
      selectedWork: selectedWorkFromBundle(bundle),
      selectedHistoryId: null,
      statusMessage: bundle ? "Р—Р°СЏРІРєР° РѕС‚РєСЂС‹С‚Р° РёР· РёСЃС‚РѕСЂРёРё." : null,
    });
  };
  private toggleHistorySnapshot = (requestDraftId: string) => {
    const bundle = this.state.history.find((candidate) => candidate.draft.id === requestDraftId) ?? null;
    if (bundle?.draft.status === "draft") {
      this.openDraftFromHistory(requestDraftId);
      return;
    }
    this.setState((prevState) => ({
      selectedHistoryId: prevState.selectedHistoryId === requestDraftId ? null : requestDraftId,
      statusMessage: bundle ? "РСЃС‚РѕСЂРёСЏ РѕС‚РєСЂС‹С‚Р° РґР»СЏ РїСЂРѕСЃРјРѕС‚СЂР°." : prevState.statusMessage,
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
        statusMessage: "РЎРѕР·РґР°РЅ РЅРѕРІС‹Р№ С‡РµСЂРЅРѕРІРёРє РёР· РёСЃС‚РѕСЂРёРё. РњРѕР¶РЅРѕ СЂРµРґР°РєС‚РёСЂРѕРІР°С‚СЊ СЃРјРµС‚Сѓ.",
      });
      this.refreshHistory(bundle);
    } catch (error) {
      this.handleValidationError(error);
    }
  };
  private duplicateHistoryDraft = (requestDraftId: string) => {
    try {
      const bundle = createConsumerRepairDraftFromHistorySnapshot({
        sourceRequestDraftId: requestDraftId,
        userId: CONSUMER_USER_ID,
        reason: "duplicate_as_new_estimate",
      });
      this.setState({
        bundle,
        selectedWork: selectedWorkFromBundle(bundle),
        selectedHistoryId: null,
        aiAnswerRu: null,
        validationErrors: [],
        statusMessage: "РЎРјРµС‚Р° РїСЂРѕРґСѓР±Р»РёСЂРѕРІР°РЅР° РєР°Рє РЅРѕРІС‹Р№ С‡РµСЂРЅРѕРІРёРє.",
      });
      this.refreshHistory(bundle);
    } catch (error) {
      this.handleValidationError(error);
    }
  };
  private sendHistoryToMarket = (requestDraftId: string) => {
    try {
      ensureConsumerRepairRequestPdfAvailable({
        requestDraftId,
        userId: CONSUMER_USER_ID,
      });
      sendConsumerRepairRequestToMarketplace({
        requestDraftId,
        userId: CONSUMER_USER_ID,
        idempotencyKey: `consumer-marketplace:${requestDraftId}`,
      });
      const history = listConsumerRepairRequestHistory(CONSUMER_USER_ID);
      this.setState({
        history,
        selectedHistoryId: requestDraftId,
        validationErrors: [],
        statusMessage: "Р—Р°СЏРІРєР° РёР· РёСЃС‚РѕСЂРёРё РѕС‚РїСЂР°РІР»РµРЅР° РІ РјР°СЂРєРµС‚.",
      });
    } catch (error) {
      this.handleValidationError(error);
    }
  };
  private addMedia = (mediaKind: "photo" | "video" | "document") => {
    const current = this.ensureDraftBundle();
    const bundle = attachConsumerRepairMedia({ requestDraftId: current.draft.id, mediaKind });
    const label = mediaKind === "photo" ? "Р¤РѕС‚Рѕ" : mediaKind === "video" ? "Р’РёРґРµРѕ" : "Р”РѕРєСѓРјРµРЅС‚";
    this.updateCurrentBundle(bundle, `${label} РґРѕР±Р°РІР»РµРЅ Рє Р·Р°СЏРІРєРµ.`);
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
    this.updateCurrentBundle(bundle, "РџРѕР·РёС†РёСЏ СѓРґР°Р»РµРЅР°.");
  };
  private restoreLastRemovedItem = () => {
    const current = this.state.bundle;
    const item = this.state.lastRemovedItem;
    if (!current || !item) return;
    const bundle = restoreConsumerRepairRequestItem({ current, item });
    this.setState({ lastRemovedItem: null });
    this.updateCurrentBundle(bundle, "РџРѕР·РёС†РёСЏ РІРѕР·РІСЂР°С‰РµРЅР°.");
  };
  private addManualItem = () => {
    this.ensureDraftBundle();
    this.setState({ catalogPickerVisible: true, catalogPickerTargetItemId: null, catalogPickerInitialQuery: undefined });
  };
  private addCustomItem = () => {
    const current = this.ensureDraftBundle();
    const bundle = addConsumerRepairCustomNoteItem(current);
    this.updateCurrentBundle(bundle, "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊСЃРєРѕРµ РїСЂРёРјРµС‡Р°РЅРёРµ РґРѕР±Р°РІР»РµРЅРѕ Рє СЃРјРµС‚Рµ.");
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
  private openPhotoForEstimateItem = (itemId: string) => {
    const current = this.ensureDraftBundle();
    this.props.onOpenPhotoForEstimateItem({
      draftId: current.draft.id,
      item: current.items.find((candidate) => candidate.id === itemId) ?? null,
    });
  };
  private handleProjectExecutionAction = (action: ConsumerRepairProjectExecutionAction) => {
    try {
      const result = saveProjectExecutionDraftForRequest({
        action,
        bundle: this.syncCurrentDraftFields(this.ensureDraftBundle()),
        userId: CONSUMER_USER_ID,
      });
      this.updateCurrentBundle(result.bundle, result.statusMessage);
    } catch (error) {
      this.handleValidationError(error);
    }
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
      "РќРѕРІР°СЏ Р·Р°СЏРІРєР° РіРѕС‚РѕРІР° Рє Р·Р°РїРѕР»РЅРµРЅРёСЋ.",
      this.state.history,
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
  render(): React.ReactNode {
    return (
      <>
        <ConsumerRepairRequestScreenView
          state={this.state} renderModel={buildConsumerRepairRequestRenderModel(this.state)}
          problemInputRef={this.problemInputRef} onGoToMarket={this.goToMarket}
          onAddMedia={this.addMedia} onProblemTextChange={this.changeProblemText}
          onCityChange={(city) => this.setState({ city, validationErrors: [] })}
          onAddressTextChange={(addressText) => this.setState({ addressText, validationErrors: [] })}
          onPreferredTimeTextChange={(preferredTimeText) => this.setState({ preferredTimeText, validationErrors: [] })}
          onContactPhoneChange={(contactPhone) => this.setState({ contactPhone, validationErrors: [] })}
          onSelectWorkSuggestion={this.selectWorkSuggestion} onMakePdf={this.makePdf}
          onDecrease={this.decreaseItem} onIncrease={this.increaseItem}
          onQuantityChange={this.changeItemQuantity} onUnitPriceChange={this.changeItemUnitPrice}
          onRemove={this.removeItem} onAddManual={this.addManualItem} onAddCustom={this.addCustomItem}
          onRestoreLastRemoved={this.restoreLastRemovedItem} onOpenCatalog={this.openCatalogForEstimateItem}
          onOpenPhoto={this.openPhotoForEstimateItem}
          onProjectExecutionAction={this.handleProjectExecutionAction} onOpenPdf={this.openPdf}
          onOpenDraft={this.openDraftFromHistory} onToggleHistorySnapshot={this.toggleHistorySnapshot}
          onEditHistoryDraft={this.editHistoryDraft} onDuplicateHistoryDraft={this.duplicateHistoryDraft}
          onSendHistoryToMarket={this.sendHistoryToMarket} onCloseCatalogPicker={this.closeCatalogPicker}
          onSelectCatalogItem={this.addCatalogItem} onCreateNew={this.createNew}
          onSendToMarketplace={this.sendToMarketplace} onDeleteDraft={this.deleteDraft}
          onApproveDraft={this.approveDraft} onPrepareDraft={this.prepareDraft}
        />
        {this.props.MobilePhotoCaptureFlowNode ?? null}
      </>
    );
  }
}
