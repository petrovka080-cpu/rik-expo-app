import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, type TextInput } from "react-native";
import { AppStickyActionBar } from "../../components/layout/AppStickyActionBar";
import { CatalogItemPicker } from "../catalog/CatalogItemPicker";
import type {
  ConsumerRepairApprovedHistoryPage,
  ConsumerRequestValidationErrorItem,
  ConsumerRepairDraftBundle,
} from "../../lib/consumerRequests";
import type { GlobalSelectedWorkBinding, GlobalWorkSmartSearchSuggestion } from "../../lib/ai/globalEstimate";
import type { CatalogItemPickerItem } from "../../lib/catalog/catalog.facade";
import { ConsumerRepairDraftPanel } from "./ConsumerRepairDraftPanel";
import { ConsumerRepairHistory } from "./ConsumerRepairHistory";
import { ConsumerRepairMarketplaceSend } from "./ConsumerRepairMarketplaceSend";
import { ConsumerRepairRequestFormCard } from "./ConsumerRepairMediaButtons";
import { consumerRepairRequestScreenStyles as styles } from "./ConsumerRepairRequestScreen.styles";
import { buildRequestEstimateViewModel, type RequestEstimateViewModel } from "./requestEstimateViewModel";

type HeaderMarketButtonProps = {
  onPress: () => void;
};

export function buildRequestEstimateTopProofText(viewModel: RequestEstimateViewModel | null): string | null {
  if (!viewModel) return null;
  const visibleLines = viewModel.professionalPreview ? [] : viewModel.visibleLines.slice(0, 5).map((line) => line.text);
  return [
    viewModel.summary,
    ...visibleLines,
    viewModel.trustLevelLabel,
    viewModel.commercialEstimateLevelLabel,
    `Цены: ${viewModel.priceStatusLabel}`,
    viewModel.taxLabel,
    viewModel.taxWarning,
    `Источник: уверенность ${viewModel.sourceConfidenceLabel}`,
  ]
    .filter((line): line is string => Boolean(line?.trim()))
    .join(" · ");
}

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
  hasSnapshot: boolean;
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
  hasSnapshot,
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
        hasBundle && (hasSnapshot || approved || sent)
          ? [{
              labelRu: "PDF",
              onPress: sent || approved ? onOpenPdf : onMakePdf,
              testID: sent || approved ? "consumer-repair-open-pdf" : "consumer-estimate-make-pdf",
            }]
          : []
      }
      danger={
        hasBundle && !approved && !sent
          ? { labelRu: "Удалить", onPress: onDeleteDraft, testID: "consumer-repair-delete-draft" }
          : undefined
      }
      primary={
        sent
          ? { labelRu: "Новая", onPress: onCreateNew, testID: "consumer-repair-new" }
          : approved
            ? {
                labelRu: "В маркет",
                onPress: onSendToMarketplace,
                disabled: !canSendToMarketplace,
                testID: "consumer-repair-send-market",
              }
            : hasBundle
              ? { labelRu: "Утвердить", onPress: onApproveDraft, testID: "consumer-repair-approve" }
              : { labelRu: "Черновик", onPress: onPrepareDraft, testID: "consumer-repair-prepare-draft" }
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
  approvedHistoryPage: ConsumerRepairApprovedHistoryPage;
  selectedHistoryId: string | null;
  showPdfAction: boolean;
  marketplaceSendErrors: ConsumerRequestValidationErrorItem[];
  catalogPickerVisible: boolean;
  catalogPickerInitialQuery: string | undefined;
  problemInputRef?: React.RefObject<TextInput | null>;
  canRestoreLastRemoved: boolean;
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
  onAddPhotoMaterialRecognition: () => void;
  onOpenPhotoForEstimateItem: (itemId: string) => void;
  onAddCustom: () => void;
  onRestoreLastRemoved: () => void;
  onOpenCatalog: (itemId: string) => void;
  onOpenPdf: (requestDraftId?: string) => void;
  onOpenDraft: (requestDraftId: string) => void;
  onToggleHistorySnapshot: (requestDraftId: string) => void;
  onEditHistoryDraft: (requestDraftId: string) => void;
  onSendHistoryToMarket: (requestDraftId: string) => void;
  onLoadMoreHistory: () => void;
  onCloseCatalogPicker: () => void;
  onSelectCatalogItem: (item: CatalogItemPickerItem) => void;
};

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
  approvedHistoryPage,
  selectedHistoryId,
  showPdfAction,
  marketplaceSendErrors,
  catalogPickerVisible,
  catalogPickerInitialQuery,
  problemInputRef,
  canRestoreLastRemoved,
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
  onAddPhotoMaterialRecognition,
  onOpenPhotoForEstimateItem,
  onAddCustom,
  onRestoreLastRemoved,
  onOpenCatalog,
  onOpenPdf,
  onOpenDraft,
  onToggleHistorySnapshot,
  onEditHistoryDraft,
  onSendHistoryToMarket,
  onLoadMoreHistory,
  onCloseCatalogPicker,
  onSelectCatalogItem,
}: ContentProps) {
  const topProofViewModel = buildRequestEstimateViewModel(bundle);
  const topProofText = buildRequestEstimateTopProofText(topProofViewModel);

  return (
    <>
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
      {topProofText ? (
        <Text style={styles.status} testID="request-estimate-top-proof" numberOfLines={3}>
          {topProofText}
        </Text>
      ) : null}
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
        onAddPhotoMaterialRecognition={onAddPhotoMaterialRecognition}
        onOpenPhotoForEstimateItem={onOpenPhotoForEstimateItem}
        onAddCustom={onAddCustom}
        onRestoreLastRemoved={onRestoreLastRemoved}
        canRestoreLastRemoved={canRestoreLastRemoved}
        onOpenCatalog={onOpenCatalog}
      />
      <ConsumerRepairMarketplaceSend bundle={bundle} errors={marketplaceSendErrors} />
      <ConsumerRepairHistory
        approvedHistoryPage={approvedHistoryPage}
        selectedHistoryId={selectedHistoryId}
        onOpenPdf={onOpenPdf}
        onOpenDraft={onOpenDraft}
        onToggleHistorySnapshot={onToggleHistorySnapshot}
        onEditHistoryDraft={onEditHistoryDraft}
        onSendHistoryToMarket={onSendHistoryToMarket}
        onLoadMoreHistory={onLoadMoreHistory}
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
