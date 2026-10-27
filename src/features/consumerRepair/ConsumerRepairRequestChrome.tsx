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
import { consumerRepairCanonicalBackendBinding } from "./consumerRepairBackendOwnership";
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
  requestEstimateResolvedWorkTitle,
  type RequestEstimateViewModel,
} from "./requestEstimateViewModel";
import type {CanonicalScopeRequirementGroupV1} from '../../lib/estimate/backendPlatform/canonicalScopeRequirementV1';

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
  approvalMissingObjectParameterCount?: number | null;
  contentWithdrawalReasonRu?: string | null;
  approvalUnresolvedRowCount?: number;
  approvalManualQuantityCount?: number;
  approvalManualUnresolvedRowCount?: number;
  manualQuantityApprovalAvailable?: boolean;
  onApproveManualQuantities?: () => void;
  approvalIncompleteStages?: readonly CanonicalScopeRequirementGroupV1[];
  approvalMissingPriceCount?: number;
  approvalPendingRowEditCount?: number;
  approvalBlockedBeyondPendingEdits?: boolean;
  approvalCommitBusy?: boolean;
  deleteCommitBusy?: boolean;
  pdfOpenBusy?: boolean;
  needsFreshApproval?: boolean;
  onOpenPdf: () => void;
  onMakePdf: () => void;
  onCreateNew: () => void;
  onDeleteDraft: () => void;
  onApproveDraft: () => void;
  onApplyAndApproveDraft?: () => void;
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
  approvalMissingObjectParameterCount = null,
  contentWithdrawalReasonRu,
  approvalUnresolvedRowCount = 0,
  approvalManualQuantityCount = 0,
  approvalManualUnresolvedRowCount = 0,
  manualQuantityApprovalAvailable = false,
  onApproveManualQuantities,
  approvalIncompleteStages = [],
  approvalMissingPriceCount = 0,
  approvalPendingRowEditCount = 0,
  approvalBlockedBeyondPendingEdits,
  approvalCommitBusy = false,
  deleteCommitBusy = false,
  pdfOpenBusy = false,
  needsFreshApproval = false,
  onOpenPdf,
  onMakePdf,
  onCreateNew,
  onDeleteDraft,
  onApproveDraft,
  onApplyAndApproveDraft,
  onPrepareDraft,
}: StickyActionsProps) {
  const [deleteConfirmationVisible, setDeleteConfirmationVisible] = React.useState(false);
  const [manualConfirmationVisible, setManualConfirmationVisible] = React.useState(false);
  const finalized = (sent || approved) && !needsFreshApproval;
  const shouldPrepareEstimate =
    !parameterCollectionRequired && (hasPendingPrompt || (!finalized && estimateRequiresRebuild));
  const canDeleteDraft = hasBundle && !approved && !sent;
  const manualApproval = manualQuantityApprovalAvailable && Boolean(onApproveManualQuantities);
  const approvalActionLabel = manualApproval ? 'Подтвердить вручную' : "Подтвердить смету";
  const canApplyAndApprove = approvalPendingRowEditCount > 0
    && approvalBlockedBeyondPendingEdits === false
    && approvalUnresolvedRowCount === 0 && !approvalBlockedByParameters;
  const approvalDisabled = Boolean(contentWithdrawalReasonRu) || approvalCommitBusy || deleteCommitBusy
    || (approvalPendingRowEditCount > 0 ? !canApplyAndApprove : approvalBlockedByEstimate);
  const approvalActionHint = approvalMissingPriceCount > 0
    ? `Цена или состав цены ещё не подтверждены в ${approvalMissingPriceCount} поз. Их можно уточнить позже.`
    : undefined;
  const allIncompleteStagesNeedApplication=approvalIncompleteStages.length>0&&approvalIncompleteStages.every(group=>group.statuses.every(status=>['PROJECT_SCOPE_OPEN','PARTLY_INCLUDED','LEGACY_SOURCE_REQUIRED'].includes(status)));
  const approvalBlockedLabel = contentWithdrawalReasonRu
    ? "Расчёт требует исправления"
    : approvalCommitBusy
    ? "Подтверждаем смету…"
    : approvalBlockedByParameters && approvalMissingObjectParameterCount !== 0
      ? "Укажите необходимые данные объекта"
      : approvalBlockedByParameters && approvalMissingObjectParameterCount === 0 && approvalUnresolvedRowCount === 0
        ? 'Приложение ещё не завершило расчёт'
      : approvalUnresolvedRowCount > 0
        ? allIncompleteStagesNeedApplication
          ? `Приложению нужно дополнить этапы: ${approvalIncompleteStages.length}`
          : approvalMissingObjectParameterCount === 0 ? 'Приложение ещё не рассчитало весь состав' : 'Смета пока не готова к подтверждению'
        : approvalPendingRowEditCount > 0
          ? `Сначала примените изменения: ${approvalPendingRowEditCount}`
        : "Сначала рассчитайте смету";
  const firstIncompleteStage=approvalIncompleteStages[0];
  const incompleteReason=firstIncompleteStage?.sourceCheckRestoration
    ? 'Проверка норм была исключена в прежней версии. Нажмите «Восстановить проверку норм» в этом этапе; приложение затем проверит выбранный состав.'
    : firstIncompleteStage?.statuses.includes('LEGACY_SOURCE_REQUIRED')
    ? 'Нормы прежнего состава ещё не подтверждены приложением. Это незавершённый расчёт, а не незаполненный параметр. Профессиональные коэффициенты вводить не нужно.'
    : firstIncompleteStage?.statuses.includes('OBJECT_FACT_REQUIRED')
      ? 'Нужно указать неизвестные данные объекта в исходных данных расчёта.'
      : firstIncompleteStage?.statuses.includes('REQUIRED_RESOURCE_EXCLUDED')
        ? 'Для этого этапа исключён необходимый ресурс. Восстановите его в составе сметы или измените выбранный состав.'
        : 'Приложению нужно дополнить нормы и ресурсы незавершённых этапов. Их количества не нужно вводить вручную.';
  React.useEffect(() => {
    if (!canDeleteDraft) setDeleteConfirmationVisible(false);
  }, [canDeleteDraft]);
  React.useEffect(() => { setManualConfirmationVisible(false); }, [manualApproval, approvalPendingRowEditCount, finalized]);
  return (
    <View
      accessibilityLabel="Действия со сметой"
      style={styles.bottomActions}
      testID="consumer-repair-bottom-actions"
    >
      <Text style={styles.bottomActionsTitle}>Действия со сметой</Text>
      {manualApproval && !finalized ? <Text style={styles.approvalBlockedNoticeText}>
        {approvalManualUnresolvedRowCount > 0
          ? `Сохранена предварительная версия. Не рассчитаны количества в ${approvalManualUnresolvedRowCount} поз.; вы можете подтвердить эту версию вручную.`
          : 'Количества сохранены. Вы можете подтвердить их как введённые вручную. Автоматическая проверка этих позиций ещё не завершена.'}
      </Text> : null}
      {manualConfirmationVisible && manualApproval && !approvalDisabled ? <View style={styles.approvalBlockedNotice}
        testID="consumer-repair-manual-quantity-confirmation">
        <Text style={styles.approvalBlockedNoticeTitle}>{approvalManualUnresolvedRowCount > 0 ? 'Подтвердить предварительную версию вручную?' : 'Подтвердить введённые количества?'}</Text>
        <Text style={styles.approvalBlockedNoticeText}>{approvalManualUnresolvedRowCount > 0
          ? `Не рассчитаны количества в ${approvalManualUnresolvedRowCount} поз. Они останутся видимыми и не войдут в итог, оплату или закупку. Сохранится ручное подтверждение предварительной версии; автоматическая проверка не завершена.`
          : 'Будет сохранена текущая версия с вашими количествами. Неподтверждённые нормы останутся отмечены в сведениях о расчёте; эти позиции не добавятся автоматически в оплату или закупку.'}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Подтвердить вручную"
          testID="consumer-repair-manual-quantity-confirm" onPress={() => { setManualConfirmationVisible(false); onApproveManualQuantities?.(); }}>
          <Text style={styles.bottomActionSecondaryText}>Подтвердить вручную</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Вернуться к смете"
          onPress={() => setManualConfirmationVisible(false)}><Text>Вернуться к смете</Text></Pressable>
      </View> : null}
      {!finalized && !manualApproval && (approvalUnresolvedRowCount>0 || (approvalBlockedByParameters && approvalMissingObjectParameterCount===0)) ? <View style={styles.approvalBlockedNotice}
        accessibilityRole="alert" testID="consumer-repair-approval-block-reason">
        <Text style={styles.approvalBlockedNoticeTitle}>{firstIncompleteStage
          ? approvalIncompleteStages.length===1 ? `Не завершён этап «${firstIncompleteStage.titleRu}»`
            : `Не завершены ${approvalIncompleteStages.length} этапов. Первый: «${firstIncompleteStage.titleRu}»`
          : approvalMissingObjectParameterCount === 0 ? 'Приложение ещё не рассчитало весь состав' : 'В смете есть позиции с неизвестными исходными данными'}</Text>
        <Text style={styles.approvalBlockedNoticeText}>{approvalManualQuantityCount>0
          ? 'Введённые количества сохранены. Приложение ещё не завершило проверку состава. Повторный ввод не требуется.'
          : firstIncompleteStage ? incompleteReason
          : approvalMissingObjectParameterCount === 0 ? 'Нормы и коэффициенты вводить не требуется. Нерассчитанные позиции пока не входят в стоимость.' : 'В составе сметы показано, какие данные ещё нужны для расчёта.'}</Text>
      </View> : null}
      {hasBundle && (hasSnapshot || finalized) ? (
        <Pressable
          accessibilityLabel="PDF"
          accessibilityRole="button"
          accessibilityState={{ busy: pdfOpenBusy, disabled: pdfOpenBusy }}
          disabled={pdfOpenBusy}
          onPress={finalized ? onOpenPdf : onMakePdf}
          style={[styles.bottomActionButton, styles.bottomActionSecondary]}
          testID={finalized ? "consumer-repair-open-pdf" : "consumer-estimate-make-pdf"}
        >
          <Ionicons name="download-outline" size={18} color="#0F172A" />
          <Text style={styles.bottomActionSecondaryText}>
            {pdfOpenBusy ? "Открываем PDF…" : "PDF"}
          </Text>
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
          accessibilityLabel={contentWithdrawalReasonRu ? approvalBlockedLabel : canApplyAndApprove
            ? "Применить изменения и подтвердить смету"
            : approvalDisabled ? approvalBlockedLabel : approvalActionLabel}
          accessibilityHint={contentWithdrawalReasonRu || (canApplyAndApprove
            ? "Все подготовленные количества и цены будут сохранены одним пересчётом; подтверждён будет сохранённый результат."
            : approvalDisabled ? undefined : approvalActionHint)}
          accessibilityRole="button"
          accessibilityState={{ disabled: approvalDisabled }}
          disabled={approvalDisabled}
          onPress={canApplyAndApprove
            ? (onApplyAndApproveDraft ?? onApproveDraft)
            : manualApproval ? () => setManualConfirmationVisible(true) : onApproveDraft}
          style={[
            styles.bottomActionButton,
            styles.bottomActionPrimary,
            approvalDisabled
              ? styles.bottomActionBlocked
              : null,
          ]}
          testID="consumer-repair-approve"
        >
          <Ionicons name={approvalDisabled ? 'alert-circle-outline' : 'checkmark'} size={20} color={approvalDisabled ? '#9A3412' : '#FFFFFF'} />
          <Text style={[styles.bottomActionPrimaryText,approvalDisabled ? styles.bottomActionBlockedText : null]}>
            {contentWithdrawalReasonRu ? approvalBlockedLabel : canApplyAndApprove
              ? approvalCommitBusy ? "Применяем и подтверждаем…" : "Применить и подтвердить"
              : approvalDisabled ? approvalBlockedLabel : approvalActionLabel}
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
            accessibilityState={{ disabled: deleteCommitBusy }}
            disabled={deleteCommitBusy}
            onPress={() => setDeleteConfirmationVisible(true)}
            style={[
              styles.bottomActionButton,
              styles.bottomActionDanger,
              deleteCommitBusy ? styles.bottomActionDisabled : null,
            ]}
            testID="consumer-repair-delete-draft"
          >
            <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
            <Text style={styles.bottomActionPrimaryText}>
              {deleteCommitBusy ? "Удаляем черновик…" : "Удалить черновик"}
            </Text>
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
              accessibilityState={{ disabled: deleteCommitBusy }}
              disabled={deleteCommitBusy}
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
  historyLoading?: boolean;
  selectedHistoryId: string | null;
  showPdfAction: boolean;
  pdfOpenBusy?: boolean;
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
  onConfirmMachineHourPrice?: (itemId:string)=>void;
  pendingCanonicalRowEditCount?: number;
  canonicalRowEditsApplying?: boolean;
  onApplyCanonicalRowEdits?: () => boolean | void | Promise<boolean | void>;
  onCancelCanonicalRowEdits?: () => void;
  canonicalRowEditorResetKeys?: Readonly<Record<string, number>>;
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
  onApplyParamBatch: (patches: ConsumerRepairDraftRevisionParamBatchPatch[],deliveryConfirmation?: import('../../lib/estimate/backendPlatform/canonicalSelectedMaterialDeliveryContractR1').CanonicalSelectedMaterialDeliveryRequestR1) => void;
  onParameterDraftInteraction?: () => void;
  primerPrerequisiteNode?:React.ReactNode;
  onCompositionRowsChange?: (rowIds: readonly string[], excluded: boolean, operationKey?: string) => void;
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
  historyLoading,
  selectedHistoryId,
  showPdfAction,
  pdfOpenBusy = false,
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

  onConfirmMachineHourPrice,
  pendingCanonicalRowEditCount,
  canonicalRowEditsApplying,
  onApplyCanonicalRowEdits,
  onCancelCanonicalRowEdits,
  canonicalRowEditorResetKeys,
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
  onParameterDraftInteraction,
  primerPrerequisiteNode,
  onCompositionRowsChange,
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
  const [originalRequestVisible, setOriginalRequestVisible] = React.useState(false);
  const publicProblemText = sanitizeRequestEstimatePublicText(bundle?.draft.problemText?.trim());
  const resolvedWorkTitle = requestEstimateResolvedWorkTitle(bundle);
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
    Boolean(bundle?.structuredEstimatePayload) ||
    Boolean(consumerRepairCanonicalBackendBinding(bundle));
  const statusNode = statusMessage
    ? <Text style={styles.status} testID="consumer-repair-status">{sanitizeRequestEstimatePublicText(statusMessage)}</Text>
    : null;
  const draftPanel = (
    <ConsumerRepairDraftPanel
      primerPrerequisiteNode={primerPrerequisiteNode}
      onCompositionRowsChange={onCompositionRowsChange}
      key={`draft-panel:${bundle?.draft.id ?? "empty"}`}
      bundle={bundle}
      aiAnswerRu={aiAnswerRu}
      hasSelectedApprovedHistory={hasSelectedApprovedHistory}
      showPdfAction={showPdfAction}
      pdfOpenBusy={pdfOpenBusy}
      onMakePdf={onMakePdf}
      onOpenProcurement={onOpenProcurement}
      onRefineCanonicalParameters={onRefineCanonicalParameters}
      onDecrease={onDecrease}
      onIncrease={onIncrease}
      onQuantityChange={onQuantityChange}
      onUnitPriceChange={onUnitPriceChange} onConfirmMachineHourPrice={onConfirmMachineHourPrice}
      pendingCanonicalRowEditCount={pendingCanonicalRowEditCount}
      canonicalRowEditsApplying={canonicalRowEditsApplying}
      onApplyCanonicalRowEdits={onApplyCanonicalRowEdits}
      onCancelCanonicalRowEdits={onCancelCanonicalRowEdits}
      canonicalRowEditorResetKeys={canonicalRowEditorResetKeys}
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
      onParameterDraftInteraction={onParameterDraftInteraction}
      onSelectRoadScope={onSelectRoadScope}
      roadScopeSelectionBusy={roadScopeSelectionBusy}
    />
  );

  return (
    <>
      {publicProblemText ? (
        <View
          accessibilityLabel={resolvedWorkTitle ? `Выбранная работа: ${resolvedWorkTitle}` : `Текущий запрос: ${publicProblemText}`}
          style={styles.launchPrompt}
          testID="request-estimate-current-launch-prompt"
        >
          <Text style={styles.launchPromptLabel}>{resolvedWorkTitle ? "Выбранная работа" : "Текущий запрос"}</Text>
          <Text
            style={styles.launchPromptText}
            testID="request-estimate-current-launch-prompt-text"
          >
            {resolvedWorkTitle || publicProblemText}
          </Text>
          {resolvedWorkTitle ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: originalRequestVisible }}
                testID="request-estimate-original-request-toggle"
                onPress={() => setOriginalRequestVisible(value => !value)}
              >
                <Text style={styles.launchPromptLabel}>{originalRequestVisible ? "Скрыть исходный запрос" : "Исходный запрос"}</Text>
              </Pressable>
              {originalRequestVisible ? (
                <Text style={styles.launchPromptText} testID="request-estimate-original-request-text">{bundle?.draft.problemText}</Text>
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}
      {prioritizeDraftDecision ? draftPanel : null}
      {prioritizeDraftDecision ? statusNode : null}
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
      {!prioritizeDraftDecision ? draftPanel : null}
      {!prioritizeDraftDecision ? statusNode : null}
      <ConsumerRepairMarketplaceSend bundle={bundle} errors={marketplaceSendErrors} />
      <ConsumerRepairHistory
        revisionHistory={revisionHistory}
        approvedHistoryPage={approvedHistoryPage}
        historyLoading={historyLoading}
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
