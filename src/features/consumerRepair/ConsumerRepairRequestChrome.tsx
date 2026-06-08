import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, type TextInput } from "react-native";
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
              labelRu: sent || approved ? "Открыть PDF" : "PDF",
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
  onRemove: (itemId: string) => void;
  onAddManual: () => void;
  onAddCustom: () => void;
  onRestoreLastRemoved: () => void;
  onOpenCatalog: (itemId: string) => void;
  onOpenPdf: (requestDraftId?: string) => void;
  onOpenDraft: (requestDraftId: string) => void;
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
  history,
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
  onRemove,
  onAddManual,
  onAddCustom,
  onRestoreLastRemoved,
  onOpenCatalog,
  onOpenPdf,
  onOpenDraft,
  onCloseCatalogPicker,
  onSelectCatalogItem,
}: ContentProps) {
  return (
    <>
      <Text style={styles.lead}>
        Опишите работу, добавьте фото — AI подготовит смету, заявку и список того, что нужно уточнить.
      </Text>
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
        onRemove={onRemove}
        onAddManual={onAddManual}
        onAddCustom={onAddCustom}
        onRestoreLastRemoved={onRestoreLastRemoved}
        canRestoreLastRemoved={canRestoreLastRemoved}
        onOpenCatalog={onOpenCatalog}
      />
      <ConsumerRepairMarketplaceSend bundle={bundle} errors={marketplaceSendErrors} />
      <ConsumerRepairHistory history={history} onOpenPdf={onOpenPdf} onOpenDraft={onOpenDraft} />
      <CatalogItemPicker
        visible={catalogPickerVisible}
        onClose={onCloseCatalogPicker}
        onSelect={onSelectCatalogItem}
        initialQuery={catalogPickerInitialQuery}
      />
    </>
  );
}
