import React from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
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
import { consumerRepairExactAsphaltApprovalErrors } from "../../lib/consumerRequests/consumerRequestValidationService";
import { consumerRepairCanonicalBackendBinding } from "./consumerRepairBackendOwnership";

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
  onCreateNew: () => void;
  onDeleteDraft: () => void;
  onApproveDraft: () => void;
  onPrepareDraft: () => void;
  onSelectRoadScope: (scopePresetId: string) => void;
  onScrollPositionChange: (position: number) => void;
};

export function ConsumerRepairRequestScreenView({
  state,
  renderModel,
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
  onCreateNew,
  onDeleteDraft,
  onApproveDraft,
  onPrepareDraft,
  onSelectRoadScope,
  onScrollPositionChange,
}: ConsumerRepairRequestScreenViewProps) {
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
  const approvalBlockedByEstimate = Boolean(
    renderModel.bundle?.canonicalParameterSession?.status ===
      "BLOCKING_REQUIRED" ||
    currentDraftRevision?.status === "blocking_required" ||
    legacyEstimateRequiresRebuild ||
    canonicalRevisionMissing ||
    consumerRepairExactAsphaltApprovalErrors(renderModel.bundle).length > 0
  );
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
      <AppScreenScroll
        contentStyle={styles.content}
        onScroll={(event) => onScrollPositionChange(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
        testID="consumer-repair-screen"
      >
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
          selectedHistoryId={state.selectedHistoryId}
          showPdfAction={Boolean(renderModel.bundle)}
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
          onOpenCatalog={onOpenCatalog}
          onOpenParamEditor={onOpenParamEditor}
          onSaveParamEdit={onSaveParamEdit}
          onCancelParamEdit={onCancelParamEdit}
          onApplyParamPatch={onApplyParamPatch}
          onApplyParamBatch={onApplyParamBatch}
          onOpenPdf={onOpenPdf}
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
          approved={renderModel.approved}
          sent={renderModel.sent}
          hasBundle={Boolean(renderModel.bundle)}
          hasPendingPrompt={state.problemText.trim().length > 0}
          estimateRequiresRebuild={legacyEstimateRequiresRebuild || canonicalRevisionMissing}
          hasSnapshot={consumerRepairBundleHasPdfEligibleSnapshot(renderModel.bundle)}
          approvalBlockedByEstimate={approvalBlockedByEstimate}
          needsFreshApproval={consumerRepairNeedsFreshApproval(renderModel.bundle)}
          onOpenPdf={() => onOpenPdf()}
          onMakePdf={onMakePdf}
          onCreateNew={onCreateNew}
          onDeleteDraft={onDeleteDraft}
          onApproveDraft={onApproveDraft}
          onPrepareDraft={onPrepareDraft}
        />
      </AppScreenScroll>
    </AppScreen>
    </KeyboardAvoidingView>
  );
}
