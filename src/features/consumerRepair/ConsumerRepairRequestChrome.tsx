import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View, type TextInput } from "react-native";
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
import {
  ConsumerRepairDeliveryFieldsCard,
  ConsumerRepairRequestFormCard,
} from "./ConsumerRepairMediaButtons";
import { consumerRepairRequestScreenStyles as styles } from "./ConsumerRepairRequestScreen.styles";
import type { ConsumerRepairQuantityChangeMeta } from "./consumerRepairQuantityEditTrace";
import {
  shouldShowConsumerRepairWorkSelection,
  type ConsumerRepairParamEditState,
} from "./requestEstimateScreenActions";
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
  hasPendingPrompt?: boolean;
  estimateRequiresRebuild?: boolean;
  parameterCollectionRequired?: boolean;
  approvalBlockedByEstimate?: boolean;
  approvalBlockedByParameters?: boolean;
  approvalUnresolvedRowCount?: number;
  approvalMissingPriceCount?: number;
  approvalCommitBusy?: boolean;
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
  hasPendingPrompt = false,
  estimateRequiresRebuild = false,
  parameterCollectionRequired = false,
  approvalBlockedByEstimate = false,
  approvalBlockedByParameters = false,
  approvalUnresolvedRowCount = 0,
  approvalMissingPriceCount = 0,
  approvalCommitBusy = false,
  needsFreshApproval = false,
  onOpenPdf,
  onMakePdf,
  onCreateNew,
  onDeleteDraft,
  onApproveDraft,
  onPrepareDraft,
}: StickyActionsProps) {
  const [deleteConfirmationVisible, setDeleteConfirmationVisible] = React.useState(false);
  const finalized = (sent || approved) && !needsFreshApproval;
  const shouldPrepareEstimate =
    !parameterCollectionRequired && (hasPendingPrompt || (!finalized && estimateRequiresRebuild));
  const canDeleteDraft = hasBundle && !approved && !sent;
  const approvalBlockedLabel = approvalCommitBusy
    ? "Подтверждаем смету…"
    : approvalUnresolvedRowCount > 0
      ? `Нельзя подтвердить: без количества ${approvalUnresolvedRowCount}`
      : approvalMissingPriceCount > 0
        ? `Нельзя подтвердить: без цены ${approvalMissingPriceCount}`
      : approvalBlockedByParameters
        ? "Заполните параметры сметы"
        : "Сначала рассчитайте смету";
  React.useEffect(() => {
    if (!canDeleteDraft) setDeleteConfirmationVisible(false);
  }, [canDeleteDraft]);
  return (
    <View
      accessibilityLabel="Действия со сметой"
      style={styles.bottomActions}
      testID="consumer-repair-bottom-actions"
    >
      <Text style={styles.bottomActionsTitle}>Действия со сметой</Text>
      {hasBundle && (hasSnapshot || finalized) ? (
        <Pressable
          accessibilityLabel="PDF"
          accessibilityRole="button"
          onPress={finalized ? onOpenPdf : onMakePdf}
          style={[styles.bottomActionButton, styles.bottomActionSecondary]}
          testID={finalized ? "consumer-repair-open-pdf" : "consumer-estimate-make-pdf"}
        >
          <Ionicons name="download-outline" size={18} color="#0F172A" />
          <Text style={styles.bottomActionSecondaryText}>PDF</Text>
        </Pressable>
      ) : null}
      {shouldPrepareEstimate ? (
        <Pressable
          accessibilityLabel={hasPendingPrompt ? "Сформировать смету" : "Повторить расчёт"}
          accessibilityRole="button"
          onPress={onPrepareDraft}
          style={[styles.bottomActionButton, styles.bottomActionPrimary]}
          testID="consumer-repair-prepare-draft"
        >
          <Ionicons name="calculator-outline" size={18} color="#FFFFFF" />
          <Text style={styles.bottomActionPrimaryText}>
            {hasPendingPrompt ? "Сформировать смету" : "Повторить расчёт"}
          </Text>
        </Pressable>
      ) : finalized ? (
        <Pressable
          accessibilityLabel="Новая смета"
          accessibilityRole="button"
          onPress={onCreateNew}
          style={[styles.bottomActionButton, styles.bottomActionPrimary]}
          testID="consumer-repair-new"
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.bottomActionPrimaryText}>Новая смета</Text>
        </Pressable>
      ) : hasBundle ? (
        <Pressable
          accessibilityLabel={approvalBlockedByEstimate ? approvalBlockedLabel : "Подтвердить смету"}
          accessibilityRole="button"
          accessibilityState={{ disabled: approvalBlockedByEstimate }}
          disabled={approvalBlockedByEstimate}
          onPress={onApproveDraft}
          style={[
            styles.bottomActionButton,
            styles.bottomActionPrimary,
            approvalBlockedByEstimate ? styles.bottomActionDisabled : null,
          ]}
          testID="consumer-repair-approve"
        >
          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
          <Text style={styles.bottomActionPrimaryText}>
            {approvalBlockedByEstimate ? approvalBlockedLabel : "Подтвердить смету"}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityLabel="Сформировать смету"
          accessibilityRole="button"
          onPress={onPrepareDraft}
          style={[styles.bottomActionButton, styles.bottomActionPrimary]}
          testID="consumer-repair-prepare-draft"
        >
          <Ionicons name="calculator-outline" size={18} color="#FFFFFF" />
          <Text style={styles.bottomActionPrimaryText}>Сформировать смету</Text>
        </Pressable>
      )}
      {canDeleteDraft ? (
        <Pressable
          accessibilityLabel="Удалить черновик"
          accessibilityRole="button"
          onPress={() => setDeleteConfirmationVisible(true)}
          style={[styles.bottomActionButton, styles.bottomActionDanger]}
          testID="consumer-repair-delete-draft"
        >
          <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
          <Text style={styles.bottomActionPrimaryText}>Удалить черновик</Text>
        </Pressable>
      ) : null}
      {canDeleteDraft && deleteConfirmationVisible ? (
        <View
          accessibilityLabel="Подтверждение удаления черновика"
          style={styles.deleteDraftConfirmation}
          testID="consumer-repair-delete-confirmation"
        >
          <Text style={styles.deleteDraftConfirmationTitle}>Удалить этот черновик?</Text>
          <Text style={styles.deleteDraftConfirmationText}>
            Черновик сметы будет удалён. Это действие нельзя отменить.
          </Text>
          <View style={styles.deleteDraftConfirmationActions}>
            <Pressable
              accessibilityLabel="Отмена удаления"
              accessibilityRole="button"
              onPress={() => setDeleteConfirmationVisible(false)}
              style={[styles.bottomActionButton, styles.bottomActionSecondary, styles.deleteDraftConfirmationButton]}
              testID="consumer-repair-delete-cancel"
            >
              <Text style={styles.bottomActionSecondaryText}>Отмена</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Подтвердить удаление черновика"
              accessibilityRole="button"
              onPress={() => {
                setDeleteConfirmationVisible(false);
                onDeleteDraft();
              }}
              style={[styles.bottomActionButton, styles.bottomActionDanger, styles.deleteDraftConfirmationButton]}
              testID="consumer-repair-delete-confirm"
            >
              <Text style={styles.bottomActionPrimaryText}>Удалить</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
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
  workSearchLiteralTotalCount: number;
  workSearchGlobalLiteralTotalCount: number;
  workSearchExternalLiteralTotalCount: number;
  workSearchSuggestionTotalCount: number;
  workSearchShownCount: number;
  workSearchLoading: boolean;
  workSearchErrorRu: string | null;
  workSearchHasMore: boolean;
  bundle: ConsumerRepairDraftBundle | null;
  aiAnswerRu: string | null;
  statusMessage: string | null;
  revisionHistory: ConsumerRepairDraftBundle[];
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
  onLoadMoreWorkSuggestions: () => void;
  onPrepareDraft: () => void;
  onMakePdf: () => void;
  onOpenProcurement: () => void;
  onRefineCanonicalParameters?: () => void;
  onDecrease: (itemId: string) => void;
  onIncrease: (itemId: string) => void;
  onQuantityChange: (itemId: string, value: string, meta?: ConsumerRepairQuantityChangeMeta) => void;
  onUnitPriceChange: (itemId: string, value: string) => void;
  onSpecificationChange?: (itemId: string, value: string) => void;
  onOptionalChange?: (itemId: string, optional: boolean) => void;
  onRemove: (itemId: string) => void;
  onAddManual: (initialQuery?: string) => void;
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
  workSearchLiteralTotalCount,
  workSearchGlobalLiteralTotalCount,
  workSearchExternalLiteralTotalCount,
  workSearchSuggestionTotalCount,
  workSearchShownCount,
  workSearchLoading,
  workSearchErrorRu,
  workSearchHasMore,
  bundle,
  aiAnswerRu,
  statusMessage,
  revisionHistory,
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
  onLoadMoreWorkSuggestions,
  onPrepareDraft,
  onMakePdf,
  onOpenProcurement,
  onRefineCanonicalParameters,
  onDecrease,
  onIncrease,
  onQuantityChange,
  onUnitPriceChange,
  onSpecificationChange,
  onOptionalChange,
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
  const publicProblemText = sanitizeRequestEstimatePublicText(bundle?.draft.problemText?.trim());
  const showWorkSelection = shouldShowConsumerRepairWorkSelection({
    bundle,
    selectedWork,
  });
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
    ? <Text style={styles.status} testID="consumer-repair-status">{sanitizeRequestEstimatePublicText(statusMessage)}</Text>
    : null;
  const draftPanel = (
    <ConsumerRepairDraftPanel
      bundle={bundle}
      aiAnswerRu={aiAnswerRu}
      hasSelectedApprovedHistory={hasSelectedApprovedHistory}
      showPdfAction={showPdfAction}
      onMakePdf={onMakePdf}
      onOpenProcurement={onOpenProcurement}
      onRefineCanonicalParameters={onRefineCanonicalParameters}
      onDecrease={onDecrease}
      onIncrease={onIncrease}
      onQuantityChange={onQuantityChange}
      onUnitPriceChange={onUnitPriceChange}
      onSpecificationChange={onSpecificationChange}
      onOptionalChange={onOptionalChange}
      onRemove={onRemove}
      onAddManual={onAddManual}
      onAddPhotoMaterialRecognition={onAddPhotoMaterialRecognition}
      onOpenPhotoForEstimateItem={onOpenPhotoForEstimateItem}
      onAddCustom={onAddCustom}
      onRestoreLastRemoved={onRestoreLastRemoved}
      canRestoreLastRemoved={canRestoreLastRemoved}
      onOpenCatalog={onOpenCatalog}
      onSelectCatalogItem={onSelectCatalogItem}
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
      {publicProblemText ? (
        <View
          accessibilityLabel={`Текущий запрос: ${publicProblemText}`}
          style={styles.launchPrompt}
          testID="request-estimate-current-launch-prompt"
        >
          <Text style={styles.launchPromptLabel}>Текущий запрос</Text>
          <Text
            style={styles.launchPromptText}
            testID="request-estimate-current-launch-prompt-text"
          >
            {publicProblemText}
          </Text>
        </View>
      ) : null}
      {prioritizeDraftDecision ? statusNode : null}
      {prioritizeDraftDecision ? draftPanel : null}
      {showWorkSelection ? (
        <ConsumerRepairRequestFormCard
          problemText={problemText}
          city={city}
          addressText={addressText}
          preferredTimeText={preferredTimeText}
          contactPhone={contactPhone}
          selectedWork={selectedWork}
          workSuggestions={workSuggestions}
          workSearchLiteralTotalCount={workSearchLiteralTotalCount}
          workSearchGlobalLiteralTotalCount={workSearchGlobalLiteralTotalCount}
          workSearchExternalLiteralTotalCount={workSearchExternalLiteralTotalCount}
          workSearchSuggestionTotalCount={workSearchSuggestionTotalCount}
          workSearchShownCount={workSearchShownCount}
          workSearchLoading={workSearchLoading}
          workSearchErrorRu={workSearchErrorRu}
          workSearchHasMore={workSearchHasMore}
          problemInputRef={problemInputRef}
          onProblemTextChange={onProblemTextChange}
          onCityChange={onCityChange}
          onAddressTextChange={onAddressTextChange}
          onPreferredTimeTextChange={onPreferredTimeTextChange}
          onContactPhoneChange={onContactPhoneChange}
          onSelectWorkSuggestion={onSelectWorkSuggestion}
          onSelectTemplateCandidate={onSelectTemplateCandidate}
          onLoadMoreWorkSuggestions={onLoadMoreWorkSuggestions}
          onPrepareDraft={onPrepareDraft}
        />
      ) : null}
      {bundle && !showWorkSelection ? (
        <ConsumerRepairDeliveryFieldsCard
          city={city}
          addressText={addressText}
          preferredTimeText={preferredTimeText}
          contactPhone={contactPhone}
          onCityChange={onCityChange}
          onAddressTextChange={onAddressTextChange}
          onPreferredTimeTextChange={onPreferredTimeTextChange}
          onContactPhoneChange={onContactPhoneChange}
        />
      ) : null}
      {!prioritizeDraftDecision ? statusNode : null}
      {!prioritizeDraftDecision ? draftPanel : null}
      <ConsumerRepairMarketplaceSend bundle={bundle} errors={marketplaceSendErrors} />
      <ConsumerRepairHistory
        revisionHistory={revisionHistory}
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
