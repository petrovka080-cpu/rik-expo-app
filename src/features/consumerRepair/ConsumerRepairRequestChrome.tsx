import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View, type TextInput } from "react-native";
import { AppStickyActionBar } from "../../components/layout/AppStickyActionBar";
import { CatalogItemPicker } from "../catalog/CatalogItemPicker";
import type {
  ConsumerRequestValidationErrorItem,
  ConsumerRepairDraftBundle,
} from "../../lib/consumerRequests";
import type { GlobalSelectedWorkBinding, GlobalWorkSmartSearchSuggestion } from "../../lib/ai/globalEstimate";
import type { CatalogItemPickerItem } from "../../lib/catalog/catalog.facade";
import { ConsumerRepairDraftPanel } from "./ConsumerRepairDraftPanel";
import { ConsumerRepairHistory } from "./ConsumerRepairHistory";
import { ConsumerRepairMarketplaceSend } from "./ConsumerRepairMarketplaceSend";
import { ConsumerRepairMediaButtons, ConsumerRepairRequestFormCard } from "./ConsumerRepairMediaButtons";
import { consumerRepairRequestScreenStyles as styles } from "./ConsumerRepairRequestScreen.styles";
import { buildRequestEstimateViewModel } from "./requestEstimateViewModel";
import type { ConsumerRepairProjectExecutionAction } from "./requestEstimateScreenActions";

type HeaderMarketButtonProps = {
  onPress: () => void;
};

export function ConsumerRepairRequestHeaderMarketButton({ onPress }: HeaderMarketButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Вернуться в маркет"
      onPress={onPress}
      style={styles.marketBackButton}
      testID="consumer-repair-back-to-market"
    >
      <Ionicons name="chevron-back" size={18} color="#0F172A" />
      <Text style={styles.marketBackButtonText}>Маркет</Text>
    </Pressable>
  );
}

type StickyActionsProps = {
  approved: boolean;
  sent: boolean;
  hasBundle: boolean;
  canSendToMarketplace: boolean;
  onOpenPdf: () => void;
  onMakePdf: () => void;
  onCreateNew: () => void;
  onSendToMarketplace: () => void;
  onDeleteDraft: () => void;
  onApproveDraft: () => void;
  onPrepareDraft: () => void;
};

export function ConsumerRepairRequestStickyActions({
  approved,
  sent,
  hasBundle,
  canSendToMarketplace,
  onOpenPdf,
  onMakePdf,
  onCreateNew,
  onSendToMarketplace,
  onDeleteDraft,
  onApproveDraft,
  onPrepareDraft,
}: StickyActionsProps) {
  return (
    <AppStickyActionBar
      visible
      placement="above_bottom_nav"
      safeAreaAware
      secondary={
        hasBundle
          ? [{
              labelRu: sent || approved ? "Открыть PDF" : "Сделать PDF",
              onPress: sent || approved ? onOpenPdf : onMakePdf,
              testID: sent || approved ? "consumer-repair-open-pdf" : "consumer-estimate-make-pdf",
            }]
          : []
      }
      danger={
        hasBundle && !approved && !sent
          ? { labelRu: "Удалить черновик", onPress: onDeleteDraft, testID: "consumer-repair-delete-draft" }
          : undefined
      }
      primary={
        sent
          ? { labelRu: "Создать новую", onPress: onCreateNew, testID: "consumer-repair-new" }
          : approved
            ? {
                labelRu: "Отправить в маркет",
                onPress: onSendToMarketplace,
                disabled: !canSendToMarketplace,
                testID: "consumer-repair-send-market",
              }
            : hasBundle
              ? { labelRu: "Утвердить заявку", onPress: onApproveDraft, testID: "consumer-repair-approve" }
              : { labelRu: "Подготовить черновик", onPress: onPrepareDraft, testID: "consumer-repair-prepare-draft" }
      }
    />
  );
}

type ContentProps = {
  problemText: string;
  city: string;
  addressText: string;
  preferredTimeText: string;
  contactPhone: string;
  selectedWork: GlobalSelectedWorkBinding | null;
  workSuggestions: GlobalWorkSmartSearchSuggestion[];
  bundle: ConsumerRepairDraftBundle | null;
  aiAnswerRu: string | null;
  statusMessage: string | null;
  history: ConsumerRepairDraftBundle[];
  selectedHistoryId: string | null;
  photoCount: number;
  videoCount: number;
  documentCount: number;
  showPdfAction: boolean;
  marketplaceSendErrors: ConsumerRequestValidationErrorItem[];
  catalogPickerVisible: boolean;
  catalogPickerInitialQuery: string | undefined;
  problemInputRef?: React.RefObject<TextInput | null>;
  canRestoreLastRemoved: boolean;
  onAddPhoto: () => void;
  onAddVideo: () => void;
  onAddDocument: () => void;
  onProblemTextChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onAddressTextChange: (value: string) => void;
  onPreferredTimeTextChange: (value: string) => void;
  onContactPhoneChange: (value: string) => void;
  onSelectWorkSuggestion: (suggestion: GlobalWorkSmartSearchSuggestion) => void;
  onMakePdf: () => void;
  onDecrease: (itemId: string) => void;
  onIncrease: (itemId: string) => void;
  onQuantityChange: (itemId: string, value: string) => void;
  onUnitPriceChange: (itemId: string, value: string) => void;
  onRemove: (itemId: string) => void;
  onAddManual: () => void;
  onAddCustom: () => void;
  onRestoreLastRemoved: () => void;
  onOpenCatalog: (itemId: string) => void;
  onOpenPhoto: (itemId: string) => void;
  onProjectExecutionAction: (action: ConsumerRepairProjectExecutionAction) => void;
  onOpenPdf: (requestDraftId?: string) => void;
  onOpenDraft: (requestDraftId: string) => void;
  onToggleHistorySnapshot: (requestDraftId: string) => void;
  onEditHistoryDraft: (requestDraftId: string) => void;
  onDuplicateHistoryDraft: (requestDraftId: string) => void;
  onSendHistoryToMarket: (requestDraftId: string) => void;
  onCloseCatalogPicker: () => void;
  onSelectCatalogItem: (item: CatalogItemPickerItem) => void;
};

function buildRequestTopProofText(bundle: ConsumerRepairDraftBundle | null): string | null {
  const viewModel = buildRequestEstimateViewModel(bundle);
  if (!viewModel) return null;
  return [
    `${"\u0421\u043c\u0435\u0442\u0430"}: ${viewModel.totalLabel} · ${"\u0446\u0435\u043d\u044b"}: ${viewModel.priceStatusLabel}`,
    ...viewModel.visibleLines.slice(0, 4).map((line) => line.text),
  ].join("\n");
}

export function ConsumerRepairRequestContent({
  problemText,
  city,
  addressText,
  preferredTimeText,
  contactPhone,
  selectedWork,
  workSuggestions,
  bundle,
  aiAnswerRu,
  statusMessage,
  history,
  selectedHistoryId,
  photoCount,
  videoCount,
  documentCount,
  showPdfAction,
  marketplaceSendErrors,
  catalogPickerVisible,
  catalogPickerInitialQuery,
  problemInputRef,
  canRestoreLastRemoved,
  onAddPhoto,
  onAddVideo,
  onAddDocument,
  onProblemTextChange,
  onCityChange,
  onAddressTextChange,
  onPreferredTimeTextChange,
  onContactPhoneChange,
  onSelectWorkSuggestion,
  onMakePdf,
  onDecrease,
  onIncrease,
  onQuantityChange,
  onUnitPriceChange,
  onRemove,
  onAddManual,
  onAddCustom,
  onRestoreLastRemoved,
  onOpenCatalog,
  onOpenPhoto,
  onProjectExecutionAction,
  onOpenPdf,
  onOpenDraft,
  onToggleHistorySnapshot,
  onEditHistoryDraft,
  onDuplicateHistoryDraft,
  onSendHistoryToMarket,
  onCloseCatalogPicker,
  onSelectCatalogItem,
}: ContentProps) {
  const requestTopProofText = buildRequestTopProofText(bundle);

  return (
    <>
      <Text style={styles.lead}>
        Опишите работу, добавьте фото — AI подготовит смету, заявку и список того, что нужно уточнить.
      </Text>
      {requestTopProofText ? (
        <View
          accessible
          accessibilityLabel={requestTopProofText}
          collapsable={false}
          style={styles.topEstimateProof}
          testID="request-estimate-top-proof"
        >
          <Text style={styles.topEstimateProofText}>{requestTopProofText}</Text>
        </View>
      ) : null}
      <ConsumerRepairMediaButtons
        photoCount={photoCount}
        videoCount={videoCount}
        documentCount={documentCount}
        onAddPhoto={onAddPhoto}
        onAddVideo={onAddVideo}
        onAddDocument={onAddDocument}
      />
      <ConsumerRepairRequestFormCard
        problemText={problemText}
        city={city}
        addressText={addressText}
        preferredTimeText={preferredTimeText}
        contactPhone={contactPhone}
        selectedWork={selectedWork}
        workSuggestions={workSuggestions}
        problemInputRef={problemInputRef}
        onProblemTextChange={onProblemTextChange}
        onCityChange={onCityChange}
        onAddressTextChange={onAddressTextChange}
        onPreferredTimeTextChange={onPreferredTimeTextChange}
        onContactPhoneChange={onContactPhoneChange}
        onSelectWorkSuggestion={onSelectWorkSuggestion}
      />
      {statusMessage ? <Text style={styles.status} testID="consumer-repair-status">{statusMessage}</Text> : null}
      <ConsumerRepairDraftPanel
        bundle={bundle}
        aiAnswerRu={aiAnswerRu}
        showPdfAction={showPdfAction}
        onMakePdf={onMakePdf}
        onDecrease={onDecrease}
        onIncrease={onIncrease}
        onQuantityChange={onQuantityChange}
        onUnitPriceChange={onUnitPriceChange}
        onRemove={onRemove}
        onAddManual={onAddManual}
        onAddCustom={onAddCustom}
          onRestoreLastRemoved={onRestoreLastRemoved}
          canRestoreLastRemoved={canRestoreLastRemoved}
          onOpenCatalog={onOpenCatalog}
          onOpenPhoto={onOpenPhoto}
          onProjectExecutionAction={onProjectExecutionAction}
        />
      <ConsumerRepairMarketplaceSend bundle={bundle} errors={marketplaceSendErrors} />
      <ConsumerRepairHistory
        history={history}
        selectedHistoryId={selectedHistoryId}
        onOpenPdf={onOpenPdf}
        onOpenDraft={onOpenDraft}
        onToggleHistorySnapshot={onToggleHistorySnapshot}
        onEditHistoryDraft={onEditHistoryDraft}
        onDuplicateHistoryDraft={onDuplicateHistoryDraft}
        onSendHistoryToMarket={onSendHistoryToMarket}
      />
      <CatalogItemPicker
        visible={catalogPickerVisible}
        onClose={onCloseCatalogPicker}
        onSelect={onSelectCatalogItem}
        initialQuery={catalogPickerInitialQuery}
      />
    </>
  );
}
