import React from "react";
import { router } from "expo-router";
import { Pressable, Text } from "react-native";
import { AppScreen } from "../../components/layout/AppScreen";
import { AppScreenHeader } from "../../components/layout/AppScreenHeader";
import { AppScreenScroll } from "../../components/layout/AppScreenScroll";
import { AppStickyActionBar } from "../../components/layout/AppStickyActionBar";
import { CatalogItemPicker } from "../catalog/CatalogItemPicker";
import {
  addConsumerRepairRequestCatalogItem,
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  ConsumerRepairValidationError,
  createConsumerRepairRequestDraft,
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
} from "../../lib/consumerRequests";
import { mapPickerItemToCatalogItemForEstimate, type CatalogItemPickerItem } from "../../lib/catalog/catalog.facade";
import { buildGeneratedPdfViewerRouteParams } from "../../lib/estimatePdf/generatedPdfViewerFile";
import { buildConsumerRepairAiDraft, composeConsumerRepairDraftAnswerRu } from "./consumerRepairAiAdapter";
import { ConsumerRepairDraftPanel } from "./ConsumerRepairDraftPanel";
import { ConsumerRepairHistory } from "./ConsumerRepairHistory";
import { buildConsumerRepairMarketplaceSendErrors, ConsumerRepairMarketplaceSend } from "./ConsumerRepairMarketplaceSend";
import { ConsumerRepairMediaButtons, ConsumerRepairRequestFormCard } from "./ConsumerRepairMediaButtons";
import { consumerRepairRequestScreenStyles as styles } from "./ConsumerRepairRequestScreen.styles";
import { addConsumerRepairCustomNoteItem, restoreConsumerRepairRequestItem, syncConsumerRepairDraftFields } from "./requestEstimateScreenActions";
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
};

export type ConsumerRepairRequestScreenProps = {
  initialProblemText?: string;
  autoPrepare?: boolean;
  autoPdf?: boolean;
};

export class ConsumerRepairRequestScreen extends React.Component<ConsumerRepairRequestScreenProps, State> {
  private initialDeepLinkApplied = false;

  state: State = {
    problemText: this.props.initialProblemText?.trim() || "Хочу уложить ламинат на 100 кв м",
    repairType: "Пол",
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
    const aiDraft = buildConsumerRepairAiDraft(this.state.problemText, { city: this.state.city || undefined });
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: CONSUMER_USER_ID,
      problemText: this.state.problemText,
      repairType: this.state.repairType,
      city: this.state.city || null,
      addressText: this.state.addressText || null,
      preferredTimeText: this.state.preferredTimeText || null,
      contactPhone: this.state.contactPhone || null,
      aiDraft,
    });
    this.setState({
      bundle,
      aiAnswerRu: composeConsumerRepairDraftAnswerRu(aiDraft),
      validationErrors: [],
      statusMessage: aiDraft.dangerousDiyBlocked
        ? "Опасный ремонт не описан как DIY. Подготовлена заявка специалисту."
        : "Черновик подготовлен. Проверьте количество.",
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
    return syncConsumerRepairDraftFields(current, this.state);
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
    this.buildDraftBundle();
  };

  private saveDraft = () => {
    const current = this.ensureDraftBundle();
    const bundle = syncConsumerRepairDraftFields(current, this.state);
    this.updateCurrentBundle(bundle, "Черновик сохранён. Не отправлен.");
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
    this.setState({ bundle, statusMessage: bundle ? "Черновик открыт из истории." : null });
  };

  private addMedia = (mediaKind: "photo" | "video" | "document") => {
    const current = this.ensureDraftBundle();
    const bundle = attachConsumerRepairMedia({ requestDraftId: current.draft.id, mediaKind });
    const label = mediaKind === "photo" ? "Фото" : mediaKind === "video" ? "Видео" : "Документ";
    this.updateCurrentBundle(bundle, `${label} добавлен в черновик заявки.`);
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
    this.updateCurrentBundle(bundle, "Позиция удалена из черновика.");
  };

  private restoreLastRemovedItem = () => {
    const current = this.state.bundle;
    const item = this.state.lastRemovedItem;
    if (!current || !item) return;
    const bundle = restoreConsumerRepairRequestItem({ current, item });
    this.setState({ lastRemovedItem: null });
    this.updateCurrentBundle(bundle, "Позиция возвращена в черновик.");
  };

  private addManualItem = () => {
    this.ensureDraftBundle();
    this.setState({ catalogPickerVisible: true, catalogPickerTargetItemId: null, catalogPickerInitialQuery: undefined });
  };

  private addCustomItem = () => {
    const current = this.ensureDraftBundle();
    const bundle = addConsumerRepairCustomNoteItem(current);
    this.updateCurrentBundle(bundle, "Пользовательское примечание добавлено в черновик.");
  };

  private openCatalogForEstimateItem = (itemId: string) => {
    const current = this.ensureDraftBundle();
    const item = current.items.find((candidate) => candidate.id === itemId);
    this.setState({
      catalogPickerVisible: true,
      catalogPickerTargetItemId: itemId,
      catalogPickerInitialQuery: item?.materialKey || item?.rateKey?.replace(/_/g, " ") || item?.titleRu,
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
      statusMessage: "Новая заявка готова к заполнению.",
    });
  };

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
          contactPhone: this.state.contactPhone,
          problemText: this.state.problemText,
        });
    const canSendToMarketplace = approved && marketplaceSendErrors.length === 0;

    return (
      <AppScreen hasStickyAction style={styles.screen}>
        <AppScreenHeader title="Смета" subtitle="Ремонт дома" />
        <AppScreenScroll contentStyle={styles.content} testID="consumer-repair-screen">
          <Text style={styles.lead}>
            Опишите проблему, добавьте фото — AI подготовит черновик заявки и список того, что нужно уточнить.
          </Text>

          <ConsumerRepairMediaButtons
            photoCount={photoCount}
            videoCount={videoCount}
            documentCount={documentCount}
            onAddPhoto={() => this.addMedia("photo")}
            onAddVideo={() => this.addMedia("video")}
            onAddDocument={() => this.addMedia("document")}
          />

          <ConsumerRepairRequestFormCard
            problemText={this.state.problemText}
            repairType={this.state.repairType}
            city={this.state.city}
            addressText={this.state.addressText}
            preferredTimeText={this.state.preferredTimeText}
            contactPhone={this.state.contactPhone}
            onProblemTextChange={(problemText) => this.setState({ problemText, validationErrors: [] })}
            onRepairTypeChange={(repairType) => this.setState({ repairType, validationErrors: [] })}
            onCityChange={(city) => this.setState({ city, validationErrors: [] })}
            onAddressTextChange={(addressText) => this.setState({ addressText, validationErrors: [] })}
            onPreferredTimeTextChange={(preferredTimeText) => this.setState({ preferredTimeText, validationErrors: [] })}
            onContactPhoneChange={(contactPhone) => this.setState({ contactPhone, validationErrors: [] })}
          />

          {this.state.statusMessage ? (
            <Text style={styles.status} testID="consumer-repair-status">{this.state.statusMessage}</Text>
          ) : null}

          <ConsumerRepairDraftPanel
            bundle={bundle}
            aiAnswerRu={this.state.aiAnswerRu}
            onDecrease={this.decreaseItem}
            onIncrease={this.increaseItem}
            onRemove={this.removeItem}
            onAddManual={this.addManualItem}
            onAddCustom={this.addCustomItem}
            onRestoreLastRemoved={this.restoreLastRemovedItem}
            canRestoreLastRemoved={Boolean(this.state.lastRemovedItem)}
            onOpenCatalog={this.openCatalogForEstimateItem}
          />

          {bundle && !approved && !sent ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Сделать PDF" onPress={this.makePdf} style={styles.makePdfButton} testID="consumer-estimate-make-pdf">
              <Text style={styles.makePdfButtonText}>Сделать PDF</Text>
            </Pressable>
          ) : null}

          <ConsumerRepairMarketplaceSend bundle={bundle} errors={marketplaceSendErrors} />

          <ConsumerRepairHistory
            history={this.state.history}
            onOpenPdf={this.openPdf}
            onOpenDraft={this.openDraftFromHistory}
          />
          <CatalogItemPicker
            visible={this.state.catalogPickerVisible}
            onClose={() => this.setState({
              catalogPickerVisible: false,
              catalogPickerTargetItemId: null,
              catalogPickerInitialQuery: undefined,
            })}
            onSelect={this.addCatalogItem}
            initialQuery={this.state.catalogPickerInitialQuery}
          />
        </AppScreenScroll>

        <AppStickyActionBar
          visible
          placement="above_bottom_nav"
          safeAreaAware
          secondary={
            sent
              ? [{ labelRu: "Открыть PDF", onPress: () => this.openPdf(), testID: "consumer-repair-open-pdf" }]
              : approved
                ? [{ labelRu: "Открыть PDF", onPress: () => this.openPdf(), testID: "consumer-repair-open-pdf" }]
                : bundle
                  ? [{ labelRu: "Сохранить", onPress: this.saveDraft, testID: "consumer-repair-save-draft" }]
                  : []
          }
          primary={
            sent
              ? { labelRu: "Создать новую", onPress: this.createNew, testID: "consumer-repair-new" }
              : approved
                ? {
                    labelRu: "Отправить в маркет",
                    onPress: this.sendToMarketplace,
                    disabled: !canSendToMarketplace,
                    testID: "consumer-repair-send-market",
                  }
                : bundle
                  ? { labelRu: "Утвердить заявку", onPress: this.approveDraft, testID: "consumer-repair-approve" }
                  : { labelRu: "Подготовить черновик", onPress: this.prepareDraft, testID: "consumer-repair-prepare-draft" }
          }
        />
      </AppScreen>
    );
  }
}
