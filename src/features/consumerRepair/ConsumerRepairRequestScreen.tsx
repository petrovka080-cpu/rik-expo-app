import React from "react";
import { router } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";
import { AppScreen } from "../../components/layout/AppScreen";
import { AppScreenHeader } from "../../components/layout/AppScreenHeader";
import { AppScreenScroll } from "../../components/layout/AppScreenScroll";
import { AppStickyActionBar } from "../../components/layout/AppStickyActionBar";
import {
  addConsumerRepairRequestItem,
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  ConsumerRepairValidationError,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairRequestPdf,
  listConsumerRepairRequestHistory,
  removeConsumerRepairRequestItem,
  sendConsumerRepairRequestToMarketplace,
  updateConsumerRepairRequestDraft,
  updateConsumerRepairRequestItemQuantity,
  type ConsumerRequestValidationErrorItem,
  type ConsumerRepairDraftBundle,
} from "../../lib/consumerRequests";
import { buildConsumerRepairAiDraft, composeConsumerRepairDraftAnswerRu } from "./consumerRepairAiAdapter";
import { ConsumerRepairDraftPanel } from "./ConsumerRepairDraftPanel";
import { ConsumerRepairHistory } from "./ConsumerRepairHistory";
import { ConsumerRepairMarketplaceSend } from "./ConsumerRepairMarketplaceSend";
import { ConsumerRepairMediaButtons } from "./ConsumerRepairMediaButtons";
import { consumerRepairRequestScreenStyles as styles } from "./ConsumerRepairRequestScreen.styles";
const CONSUMER_USER_ID = "consumer-demo-user";

const REPAIR_TYPES = [
  "Ремонт",
  "Сантехника",
  "Электрика",
  "Отделка",
  "Пол",
  "Двери/окна",
  "Другое",
] as const;
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
};

export class ConsumerRepairRequestScreen extends React.Component<object, State> {
  state: State = {
    problemText: "Хочу уложить ламинат на 100 кв м",
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
  };

  private refreshHistory(nextBundle?: ConsumerRepairDraftBundle | null) {
    const history = listConsumerRepairRequestHistory(CONSUMER_USER_ID);
    this.setState({
      history,
      bundle: nextBundle === undefined ? this.state.bundle : nextBundle,
    });
  }

  private buildDraftBundle(): ConsumerRepairDraftBundle {
    const aiDraft = buildConsumerRepairAiDraft(this.state.problemText);
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
    if (current.draft.status === "sent_to_marketplace") return current;
    return updateConsumerRepairRequestDraft({
      requestDraftId: current.draft.id,
      patch: {
        problemText: this.state.problemText,
        repairType: this.state.repairType,
        city: this.state.city || null,
        addressText: this.state.addressText || null,
        preferredTimeText: this.state.preferredTimeText || null,
        contactPhone: this.state.contactPhone || null,
      },
    });
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
    const bundle = updateConsumerRepairRequestDraft({
      requestDraftId: current.draft.id,
      patch: {
        problemText: this.state.problemText,
        repairType: this.state.repairType,
        city: this.state.city || null,
        addressText: this.state.addressText || null,
        preferredTimeText: this.state.preferredTimeText || null,
        contactPhone: this.state.contactPhone || null,
      },
    });
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

  private makePdf = () => {
    try {
      const current = this.ensureDraftBundle();
      const synced = this.syncCurrentDraftFields(current);
      const bundle = generateConsumerRepairRequestPdfForDraft({
        requestDraftId: synced.draft.id,
        userId: CONSUMER_USER_ID,
      });
      this.updateCurrentBundle(bundle, "PDF создан. PDF можно открыть без отправки в маркет.");
      this.openPdf(bundle.draft.id);
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

  private openPdf = (requestDraftId?: string) => {
    const draftId = requestDraftId ?? this.state.bundle?.draft.id;
    if (!draftId) return;
    const pdf = getConsumerRepairRequestPdf({ requestDraftId: draftId });
    router.push({
      pathname: "/pdf-viewer",
      params: {
        uri: pdf.signedUrl,
        title: pdf.titleRu,
        fileName: `${pdf.pdfId}.pdf`,
        sourceKind: "remote-url",
        documentType: "request",
        originModule: "reports",
        source: "generated",
        entityId: pdf.requestId,
      },
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
    const bundle = removeConsumerRepairRequestItem({ requestDraftId: current.draft.id, itemId });
    this.updateCurrentBundle(bundle, "Позиция удалена из черновика.");
  };

  private addManualItem = () => {
    const current = this.ensureDraftBundle();
    const bundle = addConsumerRepairRequestItem({
      requestDraftId: current.draft.id,
      titleRu: "Материал / работа вручную",
      quantity: 1,
      unit: "шт",
    });
    this.updateCurrentBundle(bundle, "Позиция добавлена. Измените количество при необходимости.");
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
      statusMessage: "Новая заявка готова к заполнению.",
    });
  };

  private getMarketplaceSendErrors(bundle: ConsumerRepairDraftBundle | null): ConsumerRequestValidationErrorItem[] {
    if (!bundle || bundle.draft.status !== "consumer_approved") return [];
    const errors: ConsumerRequestValidationErrorItem[] = [];
    if (this.state.contactPhone.trim().replace(/\D/g, "").length < 7) {
      errors.push({
        code: "CONTACT_REQUIRED",
        messageRu: "Укажите телефон, чтобы мастера могли связаться с вами.",
        field: "contactPhone",
      });
    }
    if (this.state.problemText.trim().length < 20) {
      errors.push({
        code: "DESCRIPTION_REQUIRED",
        messageRu: "Добавьте описание проблемы.",
        field: "problemText",
      });
    }
    if (bundle.media.length < 1) {
      errors.push({
        code: "MEDIA_REQUIRED",
        messageRu: "Добавьте хотя бы одно фото, видео или документ.",
        field: "media",
      });
    }
    if (bundle.items.length < 1) {
      errors.push({
        code: "ITEMS_REQUIRED",
        messageRu: "Добавьте хотя бы одну позицию заявки.",
        field: "items",
      });
    }
    if (!bundle.pdfs.some((pdf) => pdf.pdfStatus === "generated")) {
      errors.push({
        code: "PDF_REQUIRED",
        messageRu: "Сначала создайте PDF заявки.",
        field: "pdf",
      });
    }
    return errors;
  }

  render(): React.ReactNode {
    const { bundle } = this.state;
    const photoCount = bundle?.media.filter((item) => item.mediaKind === "photo").length ?? 0;
    const videoCount = bundle?.media.filter((item) => item.mediaKind === "video").length ?? 0;
    const documentCount = bundle?.media.filter((item) => item.mediaKind === "document").length ?? 0;
    const approved = bundle?.draft.status === "consumer_approved";
    const sent = bundle?.draft.status === "sent_to_marketplace";
    const marketplaceSendErrors = this.state.validationErrors.length > 0
      ? this.state.validationErrors
      : this.getMarketplaceSendErrors(bundle);
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

          <View style={styles.card}>
            <Text style={styles.label}>Описание проблемы</Text>
            <TextInput
              multiline
              value={this.state.problemText}
              onChangeText={(problemText) => this.setState({ problemText, validationErrors: [] })}
              placeholder="Напишите, что нужно сделать..."
              placeholderTextColor="#94A3B8"
              style={[styles.input, styles.textArea]}
              testID="consumer-repair-problem-input"
            />

            <Text style={styles.label}>Тип ремонта</Text>
            <View style={styles.chips}>
              {REPAIR_TYPES.map((type) => {
                const selected = type === this.state.repairType;
                return (
                  <Pressable
                    key={type}
                    accessibilityRole="button"
                    accessibilityLabel={`Тип ремонта: ${type}`}
                    onPress={() => this.setState({ repairType: type, validationErrors: [] })}
                    style={[styles.chip, selected ? styles.chipSelected : null]}
                    testID={`consumer-repair-type-${type}`}
                  >
                    <Text style={[styles.chipText, selected ? styles.chipTextSelected : null]}>{type}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Город / адрес</Text>
            <TextInput
              value={this.state.city}
              onChangeText={(city) => this.setState({ city, validationErrors: [] })}
              placeholder="Город"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              testID="consumer-repair-city-input"
            />
            <TextInput
              value={this.state.addressText}
              onChangeText={(addressText) => this.setState({ addressText, validationErrors: [] })}
              placeholder="Адрес"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              testID="consumer-repair-address-input"
            />

            <Text style={styles.label}>Когда удобно</Text>
            <TextInput
              value={this.state.preferredTimeText}
              onChangeText={(preferredTimeText) => this.setState({ preferredTimeText, validationErrors: [] })}
              placeholder="Сегодня, завтра или дата"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              testID="consumer-repair-time-input"
            />

            <Text style={styles.label}>Контакт</Text>
            <TextInput
              value={this.state.contactPhone}
              onChangeText={(contactPhone) => this.setState({ contactPhone, validationErrors: [] })}
              placeholder="Телефон"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              testID="consumer-repair-phone-input"
            />
          </View>

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
