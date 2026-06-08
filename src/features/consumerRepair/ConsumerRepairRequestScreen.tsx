import React from "react";
import { router } from "expo-router";
import type { TextInput } from "react-native";
import { AppScreen } from "../../components/layout/AppScreen";
import { AppScreenHeader } from "../../components/layout/AppScreenHeader";
import { AppScreenScroll } from "../../components/layout/AppScreenScroll";
import {
  addConsumerRepairRequestCatalogItem,
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  ConsumerRepairValidationError,
  deleteConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairRequestPdf,
  listConsumerRepairRequestHistory,
  removeConsumerRepairRequestItem,
  selectConsumerRepairRequestItemCatalogItem,
  sendConsumerRepairRequestToMarketplace,
  updateConsumerRepairRequestItemQuantity,
  type ConsumerRepairDraftBundle,
} from "../../lib/consumerRequests";
import {
  type GlobalWorkSmartSearchSuggestion,
} from "../../lib/ai/globalEstimate";
import { mapPickerItemToCatalogItemForEstimate, type CatalogItemPickerItem } from "../../lib/catalog/catalog.facade";
import { toVisibleEstimateLabel } from "../../lib/estimatePresentation/visibleEstimateLabelPolicy";
import { buildGeneratedPdfViewerRouteParams } from "../../lib/estimatePdf/generatedPdfViewerFile";
import { MARKET_TAB_ROUTE } from "../market/market.routes";
import { composeConsumerRepairDraftAnswerRu } from "./consumerRepairAiAdapter";
import { buildConsumerRepairMarketplaceSendErrors } from "./ConsumerRepairMarketplaceSend";
import {
  ConsumerRepairRequestContent,
  ConsumerRepairRequestHeaderMarketButton,
  ConsumerRepairRequestStickyActions,
} from "./ConsumerRepairRequestChrome";
import { consumerRepairRequestScreenStyles as styles } from "./ConsumerRepairRequestScreen.styles";
import {
  addConsumerRepairCustomNoteItem,
  buildConsumerRepairSelectedWorkDraftBundle,
  buildConsumerRepairSelectedWorkEditableField,
  buildDeletedConsumerRepairDraftState,
  buildInitialConsumerRepairRequestState,
  buildNewConsumerRepairRequestState,
  buildSelectedWorkFromSuggestion,
  composeSelectedWorkActiveInputText,
  restoreConsumerRepairRequestItem,
  searchConsumerRepairWorkSuggestions,
  selectedWorkFromBundle,
  shouldPreserveSelectedWorkForProblemText,
  syncConsumerRepairDraftFields,
  type ConsumerRepairDraftEditableFields,
  type ConsumerRepairRequestScreenState,
  focusConsumerRepairProblemInputAtEnd,
} from "./requestEstimateScreenActions";
const CONSUMER_USER_ID = "consumer-demo-user";
type State = ConsumerRepairRequestScreenState;

export type ConsumerRepairRequestScreenProps = {
  initialProblemText?: string;
  autoPrepare?: boolean;
  autoPdf?: boolean;
};

export class ConsumerRepairRequestScreen extends React.Component<ConsumerRepairRequestScreenProps, State> {
  private initialDeepLinkApplied = false;
  private problemInputRef = React.createRef<TextInput>();

  state: State = buildInitialConsumerRepairRequestState({
    initialProblemText: this.props.initialProblemText,
    history: listConsumerRepairRequestHistory(CONSUMER_USER_ID),
  });

  componentDidMount(): void {
    this.applyInitialDeepLinkFlow();
  }

  componentDidUpdate(prevProps: ConsumerRepairRequestScreenProps): void {
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

  private updateCurrentBundle(bundle: ConsumerRepairDraftBundle, statusMessage?: string) {
    this.setState({
      bundle,
      statusMessage: statusMessage ?? this.state.statusMessage,
      validationErrors: [],
    });
    this.refreshHistory(bundle);
  }

  private syncCurrentDraftFields(current: ConsumerRepairDraftBundle): ConsumerRepairDraftBundle {
    const fields: ConsumerRepairDraftEditableFields = {
      problemText: this.state.problemText.trim() || current.draft.problemText || "",
      repairType: this.state.repairType || current.draft.repairType || "Ремонт",
      city: this.state.city.trim() || current.draft.city || "",
      addressText: this.state.addressText.trim() || current.draft.addressText || "",
      preferredTimeText: this.state.preferredTimeText.trim() || current.draft.preferredTimeText || "",
      contactPhone: this.state.contactPhone.trim() || current.draft.contactPhone || "",
      selectedWork: buildConsumerRepairSelectedWorkEditableField({
        currentBundle: current,
        problemText: this.state.problemText,
        selectedWork: this.state.selectedWork,
      }),
    };
    return syncConsumerRepairDraftFields(current, fields);
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
      this.updateCurrentBundle(bundle, "Заявка утверждена. PDF сохранён в истории.");
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
    this.setState({ statusMessage: `PDF открыт: ${pdf.titleRu}.` });
  };

  private openDraftFromHistory = (requestDraftId: string) => {
    const bundle = this.state.history.find((candidate) => candidate.draft.id === requestDraftId) ?? null;
    this.setState({
      bundle,
      selectedWork: selectedWorkFromBundle(bundle),
      statusMessage: bundle ? "Заявка открыта из истории." : null,
    });
  };

  private addMedia = (mediaKind: "photo" | "video" | "document") => {
    const current = this.ensureDraftBundle();
    const bundle = attachConsumerRepairMedia({ requestDraftId: current.draft.id, mediaKind });
    const label = mediaKind === "photo" ? "Фото" : mediaKind === "video" ? "Видео" : "Документ";
    this.updateCurrentBundle(bundle, `${label} добавлен к заявке.`);
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
      catalogPickerInitialQuery: item ? toVisibleEstimateLabel({ label: item.titleRu, materialKey: item.materialKey ?? undefined, sectionType: item.itemType === "material" ? "materials" : undefined }) : undefined,
    });
  };
  private addCatalogItem = (catalogItem: CatalogItemPickerItem) => {
    const current = this.ensureDraftBundle();
    const catalogForEstimate = mapPickerItemToCatalogItemForEstimate(catalogItem);
    if (this.state.catalogPickerTargetItemId) {
      const bundle = selectConsumerRepairRequestItemCatalogItem({
        requestDraftId: current.draft.id,
        itemId: this.state.catalogPickerTargetItemId,
        catalogItem: catalogForEstimate,
      });
      this.setState({ catalogPickerVisible: false, catalogPickerTargetItemId: null, catalogPickerInitialQuery: undefined });
      this.updateCurrentBundle(bundle, `Материал из catalog_items выбран: ${catalogItem.name}.`);
      return;
    }
    const bundle = addConsumerRepairRequestCatalogItem({
      requestDraftId: current.draft.id,
      catalogItem: catalogForEstimate,
    });
    this.setState({ catalogPickerVisible: false, catalogPickerTargetItemId: null, catalogPickerInitialQuery: undefined });
    this.updateCurrentBundle(bundle, `Материал из каталога добавлен: ${catalogItem.name}.`);
  };
  private createNew = () => {
    this.setState(buildNewConsumerRepairRequestState("Новая заявка готова к заполнению."));
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
    const { bundle } = this.state;
    const photoCount = bundle?.media.filter((item) => item.mediaKind === "photo").length ?? 0;
    const videoCount = bundle?.media.filter((item) => item.mediaKind === "video").length ?? 0;
    const documentCount = bundle?.media.filter((item) => item.mediaKind === "document").length ?? 0;
    const approved = bundle?.draft.status === "consumer_approved";
    const sent = bundle?.draft.status === "sent_to_marketplace";
    const marketplaceSendErrors = this.state.validationErrors.length > 0
      ? this.state.validationErrors
      : buildConsumerRepairMarketplaceSendErrors({
          bundle,
          contactPhone: this.state.contactPhone.trim() || bundle?.draft.contactPhone || "",
          problemText: this.state.problemText.trim() || bundle?.draft.problemText || "",
        });
    const canSendToMarketplace = approved && marketplaceSendErrors.length === 0;
    const workSuggestions = searchConsumerRepairWorkSuggestions(this.state.problemText, this.state.selectedWork);

    return (
      <AppScreen hasStickyAction style={styles.screen}>
        <AppScreenHeader
          title="Смета"
          subtitle="Ремонт дома"
          centerTitle
          right={<ConsumerRepairRequestHeaderMarketButton onPress={this.goToMarket} />}
        />
        <AppScreenScroll contentStyle={styles.content} testID="consumer-repair-screen">
          <ConsumerRepairRequestContent
            problemText={this.state.problemText}
            city={this.state.city}
            addressText={this.state.addressText}
            preferredTimeText={this.state.preferredTimeText}
            contactPhone={this.state.contactPhone}
            selectedWork={this.state.selectedWork}
            workSuggestions={workSuggestions}
            bundle={bundle}
            aiAnswerRu={this.state.aiAnswerRu}
            statusMessage={this.state.statusMessage}
            history={this.state.history}
            photoCount={photoCount}
            videoCount={videoCount}
            documentCount={documentCount}
            showPdfAction={false}
            marketplaceSendErrors={marketplaceSendErrors}
            catalogPickerVisible={this.state.catalogPickerVisible}
            catalogPickerInitialQuery={this.state.catalogPickerInitialQuery}
            problemInputRef={this.problemInputRef}
            canRestoreLastRemoved={Boolean(this.state.lastRemovedItem)}
            onAddPhoto={() => this.addMedia("photo")}
            onAddVideo={() => this.addMedia("video")}
            onAddDocument={() => this.addMedia("document")}
            onProblemTextChange={this.changeProblemText}
            onCityChange={(city) => this.setState({ city, validationErrors: [] })}
            onAddressTextChange={(addressText) => this.setState({ addressText, validationErrors: [] })}
            onPreferredTimeTextChange={(preferredTimeText) => this.setState({ preferredTimeText, validationErrors: [] })}
            onContactPhoneChange={(contactPhone) => this.setState({ contactPhone, validationErrors: [] })}
            onSelectWorkSuggestion={this.selectWorkSuggestion}
            onMakePdf={this.makePdf}
            onDecrease={this.decreaseItem}
            onIncrease={this.increaseItem}
            onRemove={this.removeItem}
            onAddManual={this.addManualItem}
            onAddCustom={this.addCustomItem}
            onRestoreLastRemoved={this.restoreLastRemovedItem}
            onOpenCatalog={this.openCatalogForEstimateItem}
            onOpenPdf={this.openPdf}
            onOpenDraft={this.openDraftFromHistory}
            onCloseCatalogPicker={this.closeCatalogPicker}
            onSelectCatalogItem={this.addCatalogItem}
          />
        </AppScreenScroll>

        <ConsumerRepairRequestStickyActions
          approved={approved}
          sent={sent}
          hasBundle={Boolean(bundle)}
          canSendToMarketplace={canSendToMarketplace}
          onOpenPdf={() => this.openPdf()}
          onMakePdf={this.makePdf}
          onCreateNew={this.createNew}
          onSendToMarketplace={this.sendToMarketplace}
          onDeleteDraft={this.deleteDraft}
          onApproveDraft={this.approveDraft}
          onPrepareDraft={this.prepareDraft}
        />
      </AppScreen>
    );
  }
}
