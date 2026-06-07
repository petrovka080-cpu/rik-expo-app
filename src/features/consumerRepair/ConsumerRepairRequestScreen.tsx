import React from "react";
import { router } from "expo-router";
import { AppScreen } from "../../components/layout/AppScreen";
import { AppScreenHeader } from "../../components/layout/AppScreenHeader";
import { AppScreenScroll } from "../../components/layout/AppScreenScroll";
import {
  addConsumerRepairRequestCatalogItem,
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  ConsumerRepairValidationError,
  createConsumerRepairRequestDraft,
  deleteConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairRequestPdf,
  listConsumerRepairRequestHistory,
  removeConsumerRepairRequestItem,
  selectConsumerRepairRequestItemCatalogItem,
  sendConsumerRepairRequestToMarketplace,
  updateConsumerRepairRequestItemQuantity,
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
import { mapPickerItemToCatalogItemForEstimate, type CatalogItemPickerItem } from "../../lib/catalog/catalog.facade";
import { toVisibleEstimateLabel } from "../../lib/estimatePresentation/visibleEstimateLabelPolicy";
import { buildGeneratedPdfViewerRouteParams } from "../../lib/estimatePdf/generatedPdfViewerFile";
import { MARKET_TAB_ROUTE } from "../market/market.routes";
import { buildConsumerRepairAiDraft, composeConsumerRepairDraftAnswerRu } from "./consumerRepairAiAdapter";
import { buildConsumerRepairMarketplaceSendErrors } from "./ConsumerRepairMarketplaceSend";
import {
  ConsumerRepairRequestContent,
  ConsumerRepairRequestHeaderMarketButton,
  ConsumerRepairRequestStickyActions,
} from "./ConsumerRepairRequestChrome";
import { consumerRepairRequestScreenStyles as styles } from "./ConsumerRepairRequestScreen.styles";
import {
  addConsumerRepairCustomNoteItem,
  restoreConsumerRepairRequestItem,
  syncConsumerRepairDraftFields,
  type ConsumerRepairDraftEditableFields,
} from "./requestEstimateScreenActions";
const CONSUMER_USER_ID = "consumer-demo-user";
type State = {
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

export type ConsumerRepairRequestScreenProps = {
  initialProblemText?: string;
  autoPrepare?: boolean;
  autoPdf?: boolean;
};

function toConsumerRepairSelectedWork(binding: GlobalSelectedWorkBinding): ConsumerRepairSelectedWork {
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

function selectedWorkFromBundle(bundle: ConsumerRepairDraftBundle | null): GlobalSelectedWorkBinding | null {
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

export class ConsumerRepairRequestScreen extends React.Component<ConsumerRepairRequestScreenProps, State> {
  private initialDeepLinkApplied = false;

  state: State = {
    problemText: this.props.initialProblemText?.trim() || "",
    repairType: "Ремонт",
    city: "",
    addressText: "",
    preferredTimeText: "",
    contactPhone: "",
    bundle: null,
    history: listConsumerRepairRequestHistory(CONSUMER_USER_ID),
    aiAnswerRu: null,
    statusMessage: null,
    validationErrors: [],
    catalogPickerVisible: false,
    catalogPickerTargetItemId: null,
    catalogPickerInitialQuery: undefined,
  lastRemovedItem: null,
  selectedWork: null,
};

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
    const nextProblemText = this.state.problemText.trim();
    const selectedWork = this.state.selectedWork
      ? buildGlobalSelectedWorkBinding({
          selectedWorkKey: this.state.selectedWork.selectedWorkKey,
          rawInput: nextProblemText || this.state.selectedWork.rawInput,
        })
      : null;
    const aiDraft = buildConsumerRepairAiDraft(nextProblemText, {
      city: this.state.city || undefined,
      selectedWorkKey: selectedWork?.selectedWorkKey,
    });
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: CONSUMER_USER_ID,
      problemText: nextProblemText,
      repairType: selectedWork?.selectedCategoryKey ?? this.state.repairType,
      city: this.state.city || null,
      addressText: this.state.addressText || null,
      preferredTimeText: this.state.preferredTimeText || null,
      contactPhone: this.state.contactPhone || null,
      selectedWork: selectedWork ? toConsumerRepairSelectedWork(selectedWork) : null,
      aiDraft,
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
    const currentSelectedWork = selectedWorkFromBundle(current);
    const fields: ConsumerRepairDraftEditableFields = {
      problemText: this.state.problemText.trim() || current.draft.problemText || "",
      repairType: this.state.repairType || current.draft.repairType || "Ремонт",
      city: this.state.city.trim() || current.draft.city || "",
      addressText: this.state.addressText.trim() || current.draft.addressText || "",
      preferredTimeText: this.state.preferredTimeText.trim() || current.draft.preferredTimeText || "",
      contactPhone: this.state.contactPhone.trim() || current.draft.contactPhone || "",
      selectedWork: this.state.selectedWork
        ? toConsumerRepairSelectedWork({
            ...this.state.selectedWork,
            rawInput: this.state.problemText.trim() || current.draft.problemText || this.state.selectedWork.rawInput,
          })
        : currentSelectedWork
          ? toConsumerRepairSelectedWork(currentSelectedWork)
          : null,
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
    this.setState({
      bundle: null,
      aiAnswerRu: null,
      validationErrors: [],
      catalogPickerVisible: false,
      catalogPickerTargetItemId: null,
      catalogPickerInitialQuery: undefined,
      lastRemovedItem: null,
      selectedWork: null,
      statusMessage: "Заявка удалена.",
    });
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
    this.setState({
      problemText: "",
      repairType: "Ремонт",
      city: "",
      addressText: "",
      preferredTimeText: "",
      contactPhone: "",
      bundle: null,
      aiAnswerRu: null,
      validationErrors: [],
      catalogPickerVisible: false,
      catalogPickerTargetItemId: null,
      catalogPickerInitialQuery: undefined,
      lastRemovedItem: null,
      selectedWork: null,
      statusMessage: "Новая заявка готова к заполнению.",
    });
  };

  private goToMarket = () => {
    router.push({
      pathname: MARKET_TAB_ROUTE,
      params: { refresh: String(Date.now()) },
    });
  };

  private selectWorkSuggestion = (suggestion: GlobalWorkSmartSearchSuggestion) => {
    const selectedWork = buildGlobalSelectedWorkBinding({
      selectedWorkKey: suggestion.workKey,
      rawInput: this.state.problemText.trim(),
    });
    this.setState({
      selectedWork,
      repairType: selectedWork.selectedCategoryKey,
      validationErrors: [],
      statusMessage: null,
    });
  };

  private clearSelectedWork = () => {
    this.setState({ selectedWork: null, validationErrors: [] });
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
    const workSuggestions = this.state.selectedWork
      ? []
      : searchGlobalWorkSmartSuggestions({ query: this.state.problemText, limit: 8 });

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
            canRestoreLastRemoved={Boolean(this.state.lastRemovedItem)}
            onAddPhoto={() => this.addMedia("photo")}
            onAddVideo={() => this.addMedia("video")}
            onAddDocument={() => this.addMedia("document")}
            onProblemTextChange={(problemText) => this.setState({
              problemText,
              selectedWork: problemText.trim() ? this.state.selectedWork : null,
              validationErrors: [],
            })}
            onCityChange={(city) => this.setState({ city, validationErrors: [] })}
            onAddressTextChange={(addressText) => this.setState({ addressText, validationErrors: [] })}
            onPreferredTimeTextChange={(preferredTimeText) => this.setState({ preferredTimeText, validationErrors: [] })}
            onContactPhoneChange={(contactPhone) => this.setState({ contactPhone, validationErrors: [] })}
            onSelectWorkSuggestion={this.selectWorkSuggestion}
            onClearSelectedWork={this.clearSelectedWork}
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
