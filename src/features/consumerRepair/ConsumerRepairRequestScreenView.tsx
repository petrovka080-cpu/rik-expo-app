import {useCanonicalOperationCompositionDiagnostic} from './useCanonicalOperationCompositionDiagnostic';
import React from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { canonicalLanternIntent, CANONICAL_LANTERN_KIND_CHOICES, selectCanonicalLanternKindText } from '../../lib/estimate/backendPlatform/canonicalLanternIntent';
import type { TextInput } from "react-native";

import { AppScreen } from "../../components/layout/AppScreen";
import { AppScreenHeader } from "../../components/layout/AppScreenHeader";
import { AppScreenScroll } from "../../components/layout/AppScreenScroll";
import type {
  ConsumerRepairDraftBundle,
  ConsumerRepairDraftRevisionParamBatchPatch,
} from "../../lib/consumerRequests";
import type { CatalogItemPickerItem } from "../../lib/catalog/catalog.facade";
import type { GlobalWorkSmartSearchSuggestion } from "../../lib/ai/globalEstimate";
import type { InlineWorkTemplateCandidate } from "../../lib/ai/matchWorkTemplateFromPrompt";
import type { UserParamPatchOperation } from "../../lib/estimate/validateUserParamPatch";
import { getConsumerRepairCalculationStateForReadOnlyDisplay } from "../../lib/consumerRequests/consumerRequestExactRoadworksCalculationStateMigration";
import type { ConsumerRepairQuantityChangeMeta } from "./consumerRepairQuantityEditTrace";
import {
  ConsumerRepairRequestContent,
  ConsumerRepairRequestHeaderMarketButton,
  ConsumerRepairRequestStickyActions,
  consumerRepairNeedsFreshApproval,
} from "./ConsumerRepairRequestChrome";
import type { buildConsumerRepairRequestRenderModel } from "./ConsumerRepairRequestScreenRenderModel";
import { consumerRepairRequestScreenStyles as styles } from "./ConsumerRepairRequestScreen.styles";
import type { ConsumerRepairRequestScreenState } from "./requestEstimateScreenActions";
import { consumerRepairEstimateApprovalParameterErrors, consumerRepairExactAsphaltApprovalErrors } from "../../lib/consumerRequests/consumerRequestValidationService";
import { consumerRepairCanonicalBackendBinding } from "./consumerRepairBackendOwnership";
import { canonicalEstimateRevisionIdFromRoute } from "../../lib/navigation/canonicalEstimateRevisionDeepLink";
import {consumerEstimateOpenScopeGroups,consumerEstimateManualPreliminaryItems} from '../../lib/consumerRequests/consumerEstimateReadiness';
import {buildRequestEstimateSourceGates} from './requestEstimateViewModel';
import { consumerEstimateManualQuantityApprovalCandidate,consumerEstimateSavedPreliminaryApprovalCandidate } from '../../lib/consumerRequests/consumerEstimateManualQuantityApproval';
import {consumerEstimateSavedReportBinding} from '../../lib/consumerRequests/consumerEstimateProfessionalPdfReview';
import {
  consumerRepairCanonicalEstimateBlocksApproval,
  consumerRepairCanonicalMissingObjectParameterCount,
  consumerRepairCanonicalUnpricedPayableRowCount,
  consumerRepairCanonicalUnresolvedRowCount,
  consumerRepairPendingCanonicalParameterCollection,
} from "./consumerRepairCanonicalEstimateReadiness";

type ConsumerRepairRequestRenderModel = ReturnType<typeof buildConsumerRepairRequestRenderModel>;

export function consumerRepairLegacyEstimateRequiresRebuild(
  bundle: ConsumerRepairDraftBundle | null,
): boolean {
  const hasCompiledEstimate = Boolean(
    bundle?.structuredEstimatePayload ||
    bundle?.items.length ||
    bundle?.editableEstimateSnapshot?.rows.length,
  );
  return Boolean(
    bundle &&
    bundle.canonicalParameterSession == null &&
    !hasCompiledEstimate &&
    bundle.estimateDraftSession?.status === "PARAMETERS_REQUIRED",
  );
}

export function consumerRepairBundleHasPdfEligibleSnapshot(
  bundle: ConsumerRepairDraftBundle | null,
): boolean {
  if (!bundle?.editableEstimateSnapshot) return false;
  if (
    bundle.structuredEstimatePayload != null ||
    bundle.estimateDraftSession == null ||
    bundle.estimateDraftSession.status === "REVIEW"
  ) return true;
  const state = getConsumerRepairCalculationStateForReadOnlyDisplay(bundle);
  const current = state?.revisions.find((revision) =>
    revision.revisionId === state.currentRevisionId
  ) ?? null;
  return Boolean(
    current &&
    current.status !== "blocking_required" &&
    current.missingInputs.length === 0 &&
    current.boq.rows.length > 0,
  );
}

type ConsumerRepairRequestScreenViewProps = {
  state: ConsumerRepairRequestScreenState;
  renderModel: ConsumerRepairRequestRenderModel;
  expectedCanonicalRevisionId?: string | null;
  openedCanonicalRouteRevisionId?: string | null;
  problemInputRef: React.RefObject<TextInput | null>;
  onGoToMarket: () => void;
  onProblemTextChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onAddressTextChange: (value: string) => void;
  onPreferredTimeTextChange: (value: string) => void;
  onContactPhoneChange: (value: string) => void;
  onSelectWorkSuggestion: (suggestion: GlobalWorkSmartSearchSuggestion) => void;
  onSelectTemplateCandidate: (candidate: InlineWorkTemplateCandidate) => void;
  onLoadMoreWorkSuggestions: () => void;
  onMakePdf: () => void;
  onOpenProcurement: () => void;
  onRefineCanonicalParameters: () => void;
  onDecrease: (itemId: string) => void;
  onIncrease: (itemId: string) => void;
  onQuantityChange: (itemId: string, value: string, meta?: ConsumerRepairQuantityChangeMeta) => void;
  onUnitPriceChange: (itemId: string, value: string) => void;
  onConfirmMachineHourPrice?: (itemId:string)=>void;
  onApplyCanonicalRowEdits: () => boolean | void | Promise<boolean | void>;
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
  onCompositionRowsChange?: (rowIds: readonly string[], excluded: boolean, operationKeys?: string | readonly string[]) => void;
  onOpenPdf: (requestDraftId?: string) => void;
  onOpenDraft: (requestDraftId: string) => void;
  onToggleHistorySnapshot: (requestDraftId: string) => void;
  onEditHistoryDraft: (requestDraftId: string) => void;
  onSendHistoryToMarket: (requestDraftId: string) => void;
  onOpenHistory: () => void;
  onLoadMoreHistory: () => void;
  onCloseCatalogPicker: () => void;
  onSelectCatalogItem: (item: CatalogItemPickerItem) => void;
  onCreateNew: () => void;
  onDeleteDraft: () => void;
  onApproveDraft: () => void;
  onApproveManualQuantities?: () => void;
  onOpenPreliminaryReviewPdf?: (expected:{revisionId:string;releaseId:string;definitionVersionId:string;checksumSha256:string}) => void;
  historyReviewConfirmation?:{requestDraftId:string;revision:import('../../lib/estimate/backendPlatform/contracts').CanonicalEstimateRevisionView}|null;
  onConfirmHistoryReview?:()=>void;onCancelHistoryReview?:()=>void;
  onApplyAndApproveDraft: () => void;
  onPrepareDraft: () => void;
  onSelectRoadScope: (scopePresetId: string) => void;
  onScrollPositionChange: (position: number) => void;
};

export function ConsumerRepairRequestScreenView({
  state,
  renderModel,
  expectedCanonicalRevisionId,
  openedCanonicalRouteRevisionId,
  problemInputRef,
  onGoToMarket,
  onProblemTextChange,
  onCityChange,
  onAddressTextChange,
  onPreferredTimeTextChange,
  onContactPhoneChange,
  onSelectWorkSuggestion,
  onSelectTemplateCandidate,
  onLoadMoreWorkSuggestions,
  onMakePdf,
  onOpenProcurement,
  onRefineCanonicalParameters,
  onDecrease,
  onIncrease,
  onQuantityChange,
  onUnitPriceChange,
  onConfirmMachineHourPrice,
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
  onCreateNew,
  onDeleteDraft,
  onApproveDraft,
  onApproveManualQuantities,
  onApplyAndApproveDraft,
  onPrepareDraft,
  onSelectRoadScope,
  onScrollPositionChange,
}: ConsumerRepairRequestScreenViewProps) {
  const operationBinding=consumerRepairCanonicalBackendBinding(renderModel.bundle);
  const operationBackend=renderModel.bundle?.structuredEstimatePayload?.canonicalBackend;
  const operationDiagnostic=useCanonicalOperationCompositionDiagnostic(operationBinding?{...operationBinding,
    ...(operationBackend?.revisionId===operationBinding.revisionId&&operationBackend.releaseId===operationBinding.releaseId
      ? {checksumSha256:operationBackend.checksumSha256}:{})}:null);
  const runDocumentAction=(action:()=>void,targetRequestDraftId?:string,readingPdf=false):boolean=>{
    // Reading a saved report never borrows admission from the local editor.
    if(readingPdf){action();return true;}
    const targetsCurrent=!targetRequestDraftId||targetRequestDraftId===renderModel.bundle?.draft.id;
    if(targetsCurrent&&operationDiagnostic?.acceptance?.pdfAllowed===false){
      const unverified=operationDiagnostic.acceptance.status==='COMPOSITION_UNVERIFIED';
      Alert.alert(unverified?'Состав подработ не проверен':'Состав сметы требует исправления',
        'Список закупки пока недоступен. Сохранённая смета и предварительный PDF остаются доступными для чтения.');
      return false;
    }
    action();return true;
  };
  const canonicalReopenPending = consumerRepairCanonicalReopenPending(renderModel.bundle, expectedCanonicalRevisionId, openedCanonicalRouteRevisionId);
  const currentDraftRevisionState =
    getConsumerRepairCalculationStateForReadOnlyDisplay(renderModel.bundle);
  const currentDraftRevision =
    currentDraftRevisionState?.revisions.find(
      (revision) =>
        revision.revisionId ===
        currentDraftRevisionState.currentRevisionId,
    ) ?? null;
  const legacyEstimateRequiresRebuild =
    consumerRepairLegacyEstimateRequiresRebuild(renderModel.bundle);
  const canonicalRevisionMissing = Boolean(
    renderModel.bundle && !consumerRepairCanonicalBackendBinding(renderModel.bundle),
  );
  const canonicalParameterReadinessMissing = Boolean(
    consumerRepairCanonicalBackendBinding(renderModel.bundle) &&
    !renderModel.bundle?.canonicalParameterSession,
  );
  const manualQuantityApproval = consumerEstimateManualQuantityApprovalCandidate(renderModel.bundle) ?? consumerEstimateSavedPreliminaryApprovalCandidate(renderModel.bundle,operationDiagnostic?.revision);
  const approvalBlockedByParameters = Boolean(
    consumerRepairCanonicalEstimateBlocksApproval(
      renderModel.bundle?.canonicalParameterSession,
    ) || (canonicalParameterReadinessMissing && !manualQuantityApproval)
    || consumerRepairEstimateApprovalParameterErrors(renderModel.bundle, manualQuantityApproval,operationDiagnostic?.revision).length > 0
  );
  const approvalUnresolvedRowCount = consumerRepairCanonicalUnresolvedRowCount(
    renderModel.bundle,
  );
  const approvalMissingObjectParameterCount = renderModel.bundle?.canonicalParameterSession
    ? consumerRepairCanonicalMissingObjectParameterCount(renderModel.bundle.canonicalParameterSession,
      buildRequestEstimateSourceGates(renderModel.bundle.items, renderModel.bundle.canonicalParameterRequirementTables).map(gate => gate.parameterId))
    : null;
  const approvalMissingPriceCount = consumerRepairCanonicalUnpricedPayableRowCount(
    renderModel.bundle,
  );
  const approvalBlockedBeyondPendingEdits = Boolean(
    approvalBlockedByParameters ||
    (approvalUnresolvedRowCount > 0 && !manualQuantityApproval) ||
    state.approvalCommitBusy ||
    state.deleteCommitBusy ||
    state.canonicalEstimateMutationBusy ||
    currentDraftRevision?.status === "blocking_required" ||
    legacyEstimateRequiresRebuild ||
    canonicalRevisionMissing ||
    consumerRepairExactAsphaltApprovalErrors(renderModel.bundle).length > 0
  );
  const approvalBlockedByEstimate = approvalBlockedBeyondPendingEdits || (state.pendingCanonicalRowEditCount ?? 0) > 0;
  const savedPdfSnapshotAvailable=Boolean(consumerEstimateSavedReportBinding(renderModel.bundle));
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.keyboardRoot}
      testID="consumer-repair-keyboard-boundary"
    >
    <AppScreen style={styles.screen}>
      <AppScreenHeader
        title="Смета"
        centerTitle
        right={<ConsumerRepairRequestHeaderMarketButton onPress={onGoToMarket} />}
      />
      {savedPdfSnapshotAvailable?<View testID="consumer-repair-saved-pdf-report-note" style={{padding:12}}>
        <Text>PDF показывает сохранённую версию сметы. Неизвестные количества, цены и предупреждения остаются видимыми. Несохранённые правки в отчёт не входят. Чтение отчёта не подтверждает смету и не разрешает оплату или закупку.</Text>
      </View>:null}
      <AppScreenScroll
        key={renderModel.bundle?.draft.id ?? "new-estimate"}
        contentStyle={styles.content}
        onScroll={(event) => onScrollPositionChange(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
        testID="consumer-repair-screen"
      >
        {canonicalReopenPending ? (
          <View testID="consumer-canonical-revision-opening" style={{ padding: 16 }}>
            <Text accessibilityLiveRegion="polite" style={styles.status}>
              {/^(Не удалось открыть|Выбранная версия сметы недоступна)/u.test(state.statusMessage ?? "")
                ? state.statusMessage : "Открываем сохранённую смету…"}
            </Text>
          </View>
        ) : <>
        {!state.selectedWork && !state.bundle?.items.length && canonicalLanternIntent(state.problemText).ambiguous ? (
          <View style={{ gap: 10, padding: 16 }} testID="request-lantern-kind-choice">
            <Text style={{ fontSize: 17, fontWeight: '700' }}>Что вы называете фонарём?</Text>
            {CANONICAL_LANTERN_KIND_CHOICES.map(choice => (
              <Pressable key={choice.kind} accessibilityRole="button" accessibilityLabel={choice.labelRu}
                onPress={() => onProblemTextChange(selectCanonicalLanternKindText(state.problemText, choice.kind))}
                style={{ padding: 14, borderWidth: 1, borderColor: '#0F766E', borderRadius: 10 }}>
                <Text style={{ fontSize: 16, color: '#0F766E' }}>{choice.labelRu}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <ConsumerRepairRequestContent
          problemText={state.problemText}
          city={state.city}
          addressText={state.addressText}
          preferredTimeText={state.preferredTimeText}
          contactPhone={state.contactPhone}
          selectedWork={state.selectedWork}
          workSuggestions={renderModel.workSuggestions}
          workSearchLiteralTotalCount={renderModel.canonicalWorkSearch.literalTotalCount}
          workSearchGlobalLiteralTotalCount={renderModel.canonicalWorkSearch.globalLiteralTotalCount}
          workSearchExternalLiteralTotalCount={renderModel.canonicalWorkSearch.externalLiteralTotalCount}
          workSearchSuggestionTotalCount={renderModel.canonicalWorkSearch.suggestionTotalCount}
          workSearchShownCount={renderModel.canonicalWorkSearch.shownCount}
          workSearchLoading={renderModel.canonicalWorkSearch.loading}
          workSearchErrorRu={renderModel.canonicalWorkSearch.errorRu}
          workSearchHasMore={Boolean(renderModel.canonicalWorkSearch.nextCursor)}
          bundle={renderModel.bundle}
          aiAnswerRu={state.aiAnswerRu}
          statusMessage={state.statusMessage}
          revisionHistory={state.history}
          approvedHistoryPage={state.approvedHistoryPage}
          historyLoading={state.historyLoading}
          selectedHistoryId={state.selectedHistoryId}
          showPdfAction={Boolean(renderModel.bundle)}
          pdfOpenBusy={state.pdfOpenBusy === true}
          marketplaceSendErrors={renderModel.marketplaceSendErrors}
          catalogPickerVisible={state.catalogPickerVisible}
          catalogPickerInitialQuery={state.catalogPickerInitialQuery}
          editingParam={state.editingParam}
          problemInputRef={problemInputRef}
          canRestoreLastRemoved={Boolean(state.lastRemovedItem)}
          onProblemTextChange={onProblemTextChange}
          onCityChange={onCityChange}
          onAddressTextChange={onAddressTextChange}
          onPreferredTimeTextChange={onPreferredTimeTextChange}
          onContactPhoneChange={onContactPhoneChange}
          onSelectWorkSuggestion={onSelectWorkSuggestion}
          onSelectTemplateCandidate={onSelectTemplateCandidate}
          onLoadMoreWorkSuggestions={onLoadMoreWorkSuggestions}
          onPrepareDraft={onPrepareDraft}
          onMakePdf={()=>runDocumentAction(onMakePdf,undefined,true)}
          onOpenProcurement={()=>runDocumentAction(onOpenProcurement)}
          onRefineCanonicalParameters={onRefineCanonicalParameters}
          onDecrease={onDecrease}
          onIncrease={onIncrease}
          onQuantityChange={onQuantityChange}
          onUnitPriceChange={onUnitPriceChange} onConfirmMachineHourPrice={onConfirmMachineHourPrice}
          pendingCanonicalRowEditCount={state.pendingCanonicalRowEditCount ?? 0}
          canonicalRowEditsApplying={state.canonicalEstimateMutationBusy === true}
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
          onOpenCatalog={onOpenCatalog}
          onOpenParamEditor={onOpenParamEditor}
          onSaveParamEdit={onSaveParamEdit}
          onCancelParamEdit={onCancelParamEdit}
          onApplyParamPatch={onApplyParamPatch}
          onApplyParamBatch={onApplyParamBatch}
          onParameterDraftInteraction={onParameterDraftInteraction}
          primerPrerequisiteNode={primerPrerequisiteNode}
          onCompositionRowsChange={onCompositionRowsChange}
          onOpenPdf={(requestDraftId)=>runDocumentAction(()=>onOpenPdf(requestDraftId),requestDraftId,true)}
          onOpenDraft={onOpenDraft}
          onToggleHistorySnapshot={onToggleHistorySnapshot}
          onEditHistoryDraft={onEditHistoryDraft}
          onSendHistoryToMarket={onSendHistoryToMarket}
          onOpenHistory={onOpenHistory}
          onLoadMoreHistory={onLoadMoreHistory}
          onCloseCatalogPicker={onCloseCatalogPicker}
          onSelectCatalogItem={onSelectCatalogItem}
          onSelectRoadScope={onSelectRoadScope}
          roadScopeSelectionBusy={state.roadScopeSelectionBusy}
        />
        <ConsumerRepairRequestStickyActions
          operationCompositionDiagnostic={operationDiagnostic}
          approved={renderModel.approved}
          sent={renderModel.sent}
          hasBundle={Boolean(renderModel.bundle)}
          hasPendingPrompt={state.problemText.trim().length > 0}
          estimateRequiresRebuild={legacyEstimateRequiresRebuild || canonicalRevisionMissing}
          parameterCollectionRequired={Boolean(consumerRepairPendingCanonicalParameterCollection(renderModel.bundle))}
          hasSnapshot={consumerRepairBundleHasPdfEligibleSnapshot(renderModel.bundle)}
          approvalBlockedByEstimate={approvalBlockedByEstimate}
          approvalBlockedBeyondPendingEdits={approvalBlockedBeyondPendingEdits}
          approvalBlockedByParameters={approvalBlockedByParameters}
          manualQuantityApprovalAvailable={manualQuantityApproval != null}
          manualSavedPreliminaryAvailable={manualQuantityApproval?.basis==='SAVED_VERSION_REVIEW'}
          pdfSavedSnapshotAvailable={savedPdfSnapshotAvailable}
          approvalManualUnresolvedRowCount={manualQuantityApproval?.unresolvedQuantityRowIds?.length ?? 0}
          onApproveManualQuantities={onApproveManualQuantities}
          approvalMissingObjectParameterCount={approvalMissingObjectParameterCount}
          contentWithdrawalReasonRu={renderModel.bundle?.canonicalParameterSession?.contentWithdrawalReasonRu
            || renderModel.bundle?.structuredEstimatePayload?.canonicalBackend?.contentWithdrawalReasonRu || renderModel.bundle?.canonicalBackendApprovalEvidence?.contentWithdrawalReasonRu}
          approvalUnresolvedRowCount={approvalUnresolvedRowCount}
          approvalManualQuantityCount={consumerEstimateManualPreliminaryItems(renderModel.bundle).length}
          approvalIncompleteStages={consumerEstimateOpenScopeGroups(renderModel.bundle)}
          approvalMissingPriceCount={approvalMissingPriceCount}
          approvalPendingRowEditCount={state.pendingCanonicalRowEditCount ?? 0}
          approvalCommitBusy={state.approvalCommitBusy || state.canonicalEstimateMutationBusy}
          deleteCommitBusy={state.deleteCommitBusy}
          pdfOpenBusy={state.pdfOpenBusy === true}
          needsFreshApproval={consumerRepairNeedsFreshApproval(renderModel.bundle)}
          onOpenPdf={() => runDocumentAction(()=>onOpenPdf(),undefined,true)}
          onMakePdf={()=>runDocumentAction(onMakePdf,undefined,true)}
          onCreateNew={onCreateNew}
          onDeleteDraft={onDeleteDraft}
          onApproveDraft={onApproveDraft}
          onApplyAndApproveDraft={onApplyAndApproveDraft}
          onPrepareDraft={onPrepareDraft}
        />
        </>}
      </AppScreenScroll>
    </AppScreen>
    </KeyboardAvoidingView>
  );
}

export function consumerRepairCanonicalReopenPending(
  bundle: ConsumerRepairDraftBundle | null,
  expectedRevisionId?: string | null,
  openedRouteRevisionId?: string | null,
): boolean {
  const requested = canonicalEstimateRevisionIdFromRoute(expectedRevisionId);
  const opened = canonicalEstimateRevisionIdFromRoute(openedRouteRevisionId);
  return Boolean(requested && (opened !== requested || !consumerRepairCanonicalBackendBinding(bundle)));
}
