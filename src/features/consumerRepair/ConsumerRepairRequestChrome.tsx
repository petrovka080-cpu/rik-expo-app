import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View, type TextInput } from "react-native";
import { AppStickyActionBar } from "../../components/layout/AppStickyActionBar";
import { CatalogItemPicker } from "../catalog/CatalogItemPicker";
import type {
  ConsumerRepairApprovedHistoryPage,
  ConsumerRequestValidationErrorItem,
  ConsumerRepairDraftBundle,
  ConsumerRepairDraftRevisionParamBatchPatch,
} from "../../lib/consumerRequests";
import type { UserParamPatchOperation } from "../../lib/estimate/validateUserParamPatch";
import type { GlobalSelectedWorkBinding, GlobalWorkSmartSearchSuggestion } from "../../lib/ai/globalEstimate";
import type { InlineWorkTemplateCandidate } from "../../lib/ai/matchWorkTemplateFromPrompt";
import type { CatalogItemPickerItem } from "../../lib/catalog/catalog.facade";
import { ConsumerRepairDraftPanel } from "./ConsumerRepairDraftPanel";
import { ConsumerRepairHistory } from "./ConsumerRepairHistory";
import { ConsumerRepairMarketplaceSend } from "./ConsumerRepairMarketplaceSend";
import { ConsumerRepairRequestFormCard } from "./ConsumerRepairMediaButtons";
import { consumerRepairRequestScreenStyles as styles } from "./ConsumerRepairRequestScreen.styles";
import type { ConsumerRepairQuantityChangeMeta } from "./consumerRepairQuantityEditTrace";
import type { ConsumerRepairParamEditState } from "./requestEstimateScreenActions";
import {
  sanitizeRequestEstimatePublicText,
  type RequestEstimateViewModel,
} from "./requestEstimateViewModel";

type HeaderMarketButtonProps = {
  onPress: () => void;
};

export function buildRequestEstimateTopProofText(viewModel: RequestEstimateViewModel | null): string | null {
  if (!viewModel) return null;
  return [
    viewModel.summary,
    viewModel.pilotBadgeLabel,
    viewModel.pilotDisclosureLabel,
    viewModel.trustLevelLabel,
    viewModel.commercialEstimateLevelLabel,
    `Цены: ${viewModel.priceStatusLabel}`,
    viewModel.taxLabel,
    viewModel.taxWarning,
    `Источник: уверенность ${viewModel.sourceConfidenceLabel}`,
    ...viewModel.visibleLines.slice(0, 5).map((line) => line.text),
  ]
    .map((line) => sanitizeRequestEstimatePublicText(line))
    .filter((line): line is string => Boolean(line.trim()))
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
  approvalMissingRequiredContact?: boolean;
  needsFreshApproval?: boolean;
  onOpenPdf: () => void;
  onMakePdf: () => void;
  onCreateNew: () => void;
  onDeleteDraft: () => void;
  onApproveDraft: () => void;
  onPrepareDraft: () => void;
};

export function ConsumerRepairRequestStickyActions({
  approved,
  sent,
  hasBundle,
  hasSnapshot,
  approvalMissingRequiredContact = false,
  needsFreshApproval = false,
  onOpenPdf,
  onMakePdf,
  onCreateNew,
  onDeleteDraft,
  onApproveDraft,
  onPrepareDraft,
}: StickyActionsProps) {
  const finalized = (sent || approved) && !needsFreshApproval;
  return (
    <AppStickyActionBar
      visible
      placement="above_bottom_nav"
      safeAreaAware
      secondary={
        hasBundle && (hasSnapshot || finalized)
          ? [{
              labelRu: "PDF",
              onPress: finalized ? onOpenPdf : onMakePdf,
              testID: finalized ? "consumer-repair-open-pdf" : "consumer-estimate-make-pdf",
            }]
          : []
      }
      danger={
        hasBundle && !approved && !sent
          ? { labelRu: "Удалить", onPress: onDeleteDraft, testID: "consumer-repair-delete-draft" }
          : undefined
      }
      primary={
        finalized
          ? { labelRu: "Новая", onPress: onCreateNew, testID: "consumer-repair-new" }
          : hasBundle
            ? {
                labelRu: approvalMissingRequiredContact ? "Заполните адрес и телефон" : "Утвердить",
                onPress: onApproveDraft,
                disabled: approvalMissingRequiredContact,
                testID: "consumer-repair-approve",
              }
            : { labelRu: "Черновик", onPress: onPrepareDraft, testID: "consumer-repair-prepare-draft" }
      }
    />
  );
}

function currentRevisionId(bundle: ConsumerRepairDraftBundle | null): string | null {
  return bundle?.estimateRevisionState?.current_revision_id
    ?? bundle?.estimateDraftRevisionState?.currentRevisionId
    ?? bundle?.durableHistorySummary?.sourceRevisionId
    ?? null;
}

export function currentConsumerRepairRevisionHasGeneratedPdf(
  bundle: ConsumerRepairDraftBundle | null,
): boolean {
  const revisionId = currentRevisionId(bundle);
  if (!bundle || !revisionId) return false;
  return bundle.pdfs.some((pdf) =>
    pdf.pdfStatus === "generated" &&
    pdf.revisionId === revisionId
  );
}

export function consumerRepairNeedsFreshApproval(
  bundle: ConsumerRepairDraftBundle | null,
): boolean {
  if (!bundle) return false;
  if (bundle.draft.status !== "consumer_approved" && bundle.draft.status !== "sent_to_marketplace") return false;
  return !currentConsumerRepairRevisionHasGeneratedPdf(bundle);
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
  editingParam: ConsumerRepairParamEditState;
  problemInputRef?: React.RefObject<TextInput | null>;
  canRestoreLastRemoved: boolean;
  onProblemTextChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onAddressTextChange: (value: string) => void;
  onPreferredTimeTextChange: (value: string) => void;
  onContactPhoneChange: (value: string) => void;
  onSelectWorkSuggestion: (suggestion: GlobalWorkSmartSearchSuggestion) => void;
  onSelectTemplateCandidate: (candidate: InlineWorkTemplateCandidate) => void;
  onPrepareDraft: () => void;
  onMakePdf: () => void;
  onOpenProcurement: () => void;
  onDecrease: (itemId: string) => void;
  onIncrease: (itemId: string) => void;
  onQuantityChange: (itemId: string, value: string, meta?: ConsumerRepairQuantityChangeMeta) => void;
  onUnitPriceChange: (itemId: string, value: string) => void;
  onRemove: (itemId: string) => void;
  onAddManual: () => void;
  onAddPhotoMaterialRecognition: () => void;
  onOpenPhotoForEstimateItem: (itemId: string) => void;
  onAddCustom: () => void;
  onRestoreLastRemoved: () => void;
  onOpenCatalog: (itemId: string) => void;
  onOpenParamEditor: (operation: UserParamPatchOperation, paramKey: string) => void;
  onSaveParamEdit: (rawValue: string) => void;
  onCancelParamEdit: () => void;
  onApplyParamPatch: (operation: UserParamPatchOperation, paramKey: string, rawValue: string) => void;
  onApplyParamBatch: (patches: ConsumerRepairDraftRevisionParamBatchPatch[]) => void;
  onOpenPdf: (requestDraftId?: string) => void;
  onOpenDraft: (requestDraftId: string) => void;
  onToggleHistorySnapshot: (requestDraftId: string) => void;
  onEditHistoryDraft: (requestDraftId: string) => void;
  onSendHistoryToMarket: (requestDraftId: string) => void;
  onOpenHistory: () => void;
  onLoadMoreHistory: () => void;
  onCloseCatalogPicker: () => void;
  onSelectCatalogItem: (item: CatalogItemPickerItem) => void;
  onSelectRoadScope: (scopePresetId: string) => void;
  roadScopeSelectionBusy?: boolean;
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
  editingParam,
  problemInputRef,
  canRestoreLastRemoved,
  onProblemTextChange,
  onCityChange,
  onAddressTextChange,
  onPreferredTimeTextChange,
  onContactPhoneChange,
  onSelectWorkSuggestion,
  onSelectTemplateCandidate,
  onPrepareDraft,
  onMakePdf,
  onOpenProcurement,
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
  onOpenParamEditor,
  onSaveParamEdit,
  onCancelParamEdit,
  onApplyParamPatch,
  onApplyParamBatch,
  onOpenPdf,
  onOpenDraft,
  onToggleHistorySnapshot,
  onEditHistoryDraft,
  onSendHistoryToMarket,
  onOpenHistory,
  onLoadMoreHistory,
  onCloseCatalogPicker,
  onSelectCatalogItem,
  onSelectRoadScope,
  roadScopeSelectionBusy,
}: ContentProps) {
  const hasSelectedApprovedHistory = Boolean(
    selectedHistoryId && approvedHistoryPage.items.some((item) => item.draft.id === selectedHistoryId),
  );
  const draftDecisionStatus = bundle?.estimateDraftSession?.status;
  const prioritizeDraftDecision =
    draftDecisionStatus === "SCOPE_REQUIRED" ||
    draftDecisionStatus === "PARAMETERS_REQUIRED" ||
    draftDecisionStatus === "LEGACY_REVIEW_REQUIRED" ||
    Boolean(bundle?.structuredEstimatePayload);
  const statusNode = statusMessage
    ? <Text style={styles.status} testID="consumer-repair-status">{statusMessage}</Text>
    : null;
  const draftPanel = (
    <ConsumerRepairDraftPanel
      bundle={bundle}
      aiAnswerRu={aiAnswerRu}
      hasSelectedApprovedHistory={hasSelectedApprovedHistory}
      showPdfAction={showPdfAction}
      onMakePdf={onMakePdf}
      onOpenProcurement={onOpenProcurement}
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
      editingParam={editingParam}
      onOpenParamEditor={onOpenParamEditor}
      onSaveParamEdit={onSaveParamEdit}
      onCancelParamEdit={onCancelParamEdit}
      onApplyParamPatch={onApplyParamPatch}
      onApplyParamBatch={onApplyParamBatch}
      onSelectRoadScope={onSelectRoadScope}
      roadScopeSelectionBusy={roadScopeSelectionBusy}
    />
  );

  return (
    <>
      {bundle?.draft.problemText?.trim() ? (
        <View
          accessibilityLabel={`Текущий запрос: ${bundle.draft.problemText.trim()}`}
          style={styles.launchPrompt}
          testID="request-estimate-current-launch-prompt"
        >
          <Text style={styles.launchPromptLabel}>Текущий запрос</Text>
          <Text
            style={styles.launchPromptText}
            testID="request-estimate-current-launch-prompt-text"
          >
            {bundle.draft.problemText.trim()}
          </Text>
        </View>
      ) : null}
      {prioritizeDraftDecision ? statusNode : null}
      {prioritizeDraftDecision ? draftPanel : null}
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
        onSelectTemplateCandidate={onSelectTemplateCandidate}
        onPrepareDraft={onPrepareDraft}
      />
      {!prioritizeDraftDecision ? statusNode : null}
      {!prioritizeDraftDecision ? draftPanel : null}
      <ConsumerRepairMarketplaceSend bundle={bundle} errors={marketplaceSendErrors} />
      <ConsumerRepairHistory
        approvedHistoryPage={approvedHistoryPage}
        selectedHistoryId={selectedHistoryId}
        onOpenPdf={onOpenPdf}
        onOpenDraft={onOpenDraft}
        onToggleHistorySnapshot={onToggleHistorySnapshot}
        onEditHistoryDraft={onEditHistoryDraft}
        onSendHistoryToMarket={onSendHistoryToMarket}
        onOpenHistory={onOpenHistory}
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
