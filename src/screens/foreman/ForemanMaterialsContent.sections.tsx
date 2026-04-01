import React from "react";

import CatalogModal from "../../components/foreman/CatalogModal";
import CalcModal from "../../components/foreman/CalcModal";
import WorkTypePicker from "../../components/foreman/WorkTypePicker";
import WarehouseFioModal from "../warehouse/components/WarehouseFioModal";
import ForemanAiQuickModal from "./ForemanAiQuickModal";
import ForemanDraftModal from "./ForemanDraftModal";
import ForemanEditorSection from "./ForemanEditorSection";
import ForemanHistoryBar from "./ForemanHistoryBar";
import ForemanHistoryModal from "./ForemanHistoryModal";
import ForemanSubcontractHistoryModal from "./ForemanSubcontractHistoryModal";
import type { ForemanMaterialsContentProps } from "./ForemanMaterialsContent";

type MainSectionsProps = Pick<
  ForemanMaterialsContentProps,
  | "contentTopPad"
  | "onScroll"
  | "foreman"
  | "onOpenFioModal"
  | "objectType"
  | "objectDisplayName"
  | "level"
  | "system"
  | "zone"
  | "contextResult"
  | "formUi"
  | "objOptions"
  | "sysOptions"
  | "onObjectChange"
  | "onLevelChange"
  | "onSystemChange"
  | "onZoneChange"
  | "ensureHeaderReady"
  | "isDraftActive"
  | "canStartDraftFlow"
  | "showHint"
  | "busy"
  | "onOpenCatalog"
  | "closeCatalog"
  | "onCalcPress"
  | "onAiQuickPress"
  | "onOpenDraft"
  | "closeDraft"
  | "currentDisplayLabel"
  | "itemsCount"
  | "draftSyncStatusLabel"
  | "draftSyncStatusDetail"
  | "draftSyncStatusTone"
  | "draftSendBusy"
  | "headerAttention"
  | "onOpenRequestHistory"
  | "onOpenSubcontractHistory"
  | "historyVisible"
  | "historyMode"
  | "historySelectedRequestId"
  | "onHistoryShowDetails"
  | "onHistoryBackToList"
  | "onHistoryResetView"
  | "historyLoading"
  | "historyRequests"
  | "resolveStatusInfo"
  | "onHistorySelect"
  | "onHistoryReopen"
  | "historyReopenBusyId"
  | "onOpenHistoryPdf"
  | "isHistoryPdfBusy"
  | "shortId"
  | "closeHistory"
  | "ui"
  | "styles"
>;

type ModalStackProps = Pick<
  ForemanMaterialsContentProps,
  | "subcontractHistoryVisible"
  | "closeSubcontractHistory"
  | "subcontractHistoryLoading"
  | "subcontractHistory"
  | "catalogVisible"
  | "closeCatalog"
  | "rikQuickSearch"
  | "onCommitToDraft"
  | "onOpenDraft"
  | "itemsCount"
  | "workTypePickerVisible"
  | "closeWorkTypePicker"
  | "onSelectWorkType"
  | "calcVisible"
  | "closeCalc"
  | "backToWorkTypePicker"
  | "selectedWorkType"
  | "onAddCalcToRequest"
  | "aiQuickVisible"
  | "closeAiQuick"
  | "aiQuickMode"
  | "aiQuickText"
  | "onAiQuickTextChange"
  | "onAiQuickParse"
  | "onAiQuickApply"
  | "onAiQuickBackToCompose"
  | "onAiQuickSelectCandidate"
  | "aiQuickLoading"
  | "aiQuickApplying"
  | "aiQuickCanApply"
  | "onlineConfigured"
  | "aiQuickError"
  | "aiQuickNotice"
  | "aiQuickPreview"
  | "aiQuickOutcomeType"
  | "aiQuickReviewGroups"
  | "aiQuickQuestions"
  | "aiQuickSessionHint"
  | "aiUnavailableReason"
  | "aiQuickDegradedMode"
  | "currentDisplayLabel"
  | "draftOpen"
  | "closeDraft"
  | "draftSyncStatusLabel"
  | "draftSyncStatusDetail"
  | "draftSyncStatusTone"
  | "objectName"
  | "levelName"
  | "systemName"
  | "zoneName"
  | "items"
  | "renderReqItem"
  | "screenLock"
  | "draftDeleteBusy"
  | "draftSendBusy"
  | "onDeleteDraft"
  | "onPdf"
  | "pdfBusy"
  | "onSendDraft"
  | "availableDraftRecoveryActions"
  | "onRetryDraftSync"
  | "onRehydrateDraftFromServer"
  | "onRestoreLocalDraft"
  | "onDiscardLocalDraft"
  | "onClearFailedQueueTail"
  | "isFioConfirmVisible"
  | "foreman"
  | "handleFioConfirm"
  | "isFioLoading"
  | "foremanHistory"
  | "ui"
  | "styles"
>;

export function ForemanMaterialsMainSections(props: MainSectionsProps) {
  return (
    <>
      <ForemanEditorSection
        contentTopPad={props.contentTopPad}
        onScroll={props.onScroll}
        foreman={props.foreman}
        onOpenFioModal={props.onOpenFioModal}
        objectType={props.objectType}
        objectDisplayName={props.objectDisplayName}
        level={props.level}
        system={props.system}
        zone={props.zone}
        contextResult={props.contextResult}
        formUi={props.formUi}
        objOptions={props.objOptions}
        sysOptions={props.sysOptions}
        onObjectChange={props.onObjectChange}
        onLevelChange={props.onLevelChange}
        onSystemChange={props.onSystemChange}
        onZoneChange={props.onZoneChange}
        ensureHeaderReady={props.ensureHeaderReady}
        isDraftActive={props.isDraftActive}
        canStartDraftFlow={props.canStartDraftFlow}
        showHint={props.showHint}
        setCatalogVisible={(value) => {
          if (value) props.onOpenCatalog();
          else props.closeCatalog();
        }}
        busy={props.busy}
        onCalcPress={props.onCalcPress}
        onAiQuickPress={props.onAiQuickPress}
        setDraftOpen={(value) => {
          if (value) props.onOpenDraft();
          else props.closeDraft();
        }}
        currentDisplayLabel={props.currentDisplayLabel}
        itemsCount={props.itemsCount}
        draftSyncStatusLabel={props.draftSyncStatusLabel}
        draftSyncStatusDetail={props.draftSyncStatusDetail}
        draftSyncStatusTone={props.draftSyncStatusTone}
        draftSendBusy={props.draftSendBusy}
        headerAttention={props.headerAttention}
        ui={props.ui}
        styles={props.styles}
      />

      <ForemanHistoryBar
        busy={props.busy}
        onOpenRequestHistory={props.onOpenRequestHistory}
        onOpenSubcontractHistory={props.onOpenSubcontractHistory}
        ui={props.ui}
        styles={props.styles}
      />

      <ForemanHistoryModal
        visible={props.historyVisible}
        onClose={props.closeHistory}
        mode={props.historyMode}
        selectedRequestId={props.historySelectedRequestId}
        onShowDetails={props.onHistoryShowDetails}
        onBackToList={props.onHistoryBackToList}
        onResetView={props.onHistoryResetView}
        loading={props.historyLoading}
        requests={props.historyRequests}
        resolveStatusInfo={props.resolveStatusInfo}
        onSelect={props.onHistorySelect}
        onReopen={props.onHistoryReopen}
        reopenBusyRequestId={props.historyReopenBusyId}
        onOpenPdf={props.onOpenHistoryPdf}
        isPdfBusy={props.isHistoryPdfBusy}
        shortId={props.shortId}
        styles={props.styles}
      />
    </>
  );
}

export function ForemanMaterialsModalStack(props: ModalStackProps) {
  return (
    <>
      <ForemanSubcontractHistoryModal
        visible={props.subcontractHistoryVisible}
        onClose={props.closeSubcontractHistory}
        loading={props.subcontractHistoryLoading}
        history={props.subcontractHistory}
        styles={props.styles}
        ui={props.ui}
      />

      <CatalogModal
        visible={props.catalogVisible}
        onClose={props.closeCatalog}
        rikQuickSearch={props.rikQuickSearch}
        onCommitToDraft={props.onCommitToDraft}
        onOpenDraft={props.onOpenDraft}
        draftCount={props.itemsCount}
      />

      <WorkTypePicker
        visible={props.workTypePickerVisible}
        onClose={props.closeWorkTypePicker}
        onSelect={props.onSelectWorkType}
      />

      <CalcModal
        visible={props.calcVisible}
        onClose={props.closeCalc}
        onBack={props.backToWorkTypePicker}
        workType={props.selectedWorkType}
        onAddToRequest={props.onAddCalcToRequest}
      />

      <ForemanAiQuickModal
        visible={props.aiQuickVisible}
        onClose={props.closeAiQuick}
        mode={props.aiQuickMode}
        value={props.aiQuickText}
        onChangeText={props.onAiQuickTextChange}
        onParse={props.onAiQuickParse}
        onApply={props.onAiQuickApply}
        onBackToCompose={props.onAiQuickBackToCompose}
        onSelectCandidate={props.onAiQuickSelectCandidate}
        parseLoading={props.aiQuickLoading}
        applying={props.aiQuickApplying}
        canApply={props.aiQuickCanApply}
        onlineConfigured={props.onlineConfigured}
        error={props.aiQuickError}
        notice={props.aiQuickNotice}
        preview={props.aiQuickPreview}
        outcomeType={props.aiQuickOutcomeType}
        reviewGroups={props.aiQuickReviewGroups}
        questions={props.aiQuickQuestions}
        sessionHint={props.aiQuickSessionHint}
        aiUnavailableReason={props.aiUnavailableReason}
        degradedMode={props.aiQuickDegradedMode}
        draftLabel={props.currentDisplayLabel}
        draftItemsCount={props.itemsCount}
        ui={props.ui}
        styles={props.styles}
      />

      <ForemanDraftModal
        visible={props.draftOpen}
        onClose={props.closeDraft}
        currentDisplayLabel={props.currentDisplayLabel}
        draftSyncStatusLabel={props.draftSyncStatusLabel}
        draftSyncStatusDetail={props.draftSyncStatusDetail}
        draftSyncStatusTone={props.draftSyncStatusTone}
        objectName={props.objectName}
        levelName={props.levelName}
        systemName={props.systemName}
        zoneName={props.zoneName}
        items={props.items}
        renderReqItem={props.renderReqItem}
        screenLock={props.screenLock}
        draftDeleteBusy={props.draftDeleteBusy}
        draftSendBusy={props.draftSendBusy}
        onDeleteDraft={props.onDeleteDraft}
        onPdf={props.onPdf}
        pdfBusy={props.pdfBusy}
        onSend={props.onSendDraft}
        availableRecoveryActions={props.availableDraftRecoveryActions}
        onRetryNow={props.onRetryDraftSync}
        onRehydrateFromServer={props.onRehydrateDraftFromServer}
        onRestoreLocal={props.onRestoreLocalDraft}
        onDiscardLocal={props.onDiscardLocalDraft}
        onClearFailedQueue={props.onClearFailedQueueTail}
        ui={props.ui}
        styles={props.styles}
      />

      <WarehouseFioModal
        visible={props.isFioConfirmVisible}
        initialFio={props.foreman}
        onConfirm={props.handleFioConfirm}
        loading={props.isFioLoading}
        history={props.foremanHistory}
      />
    </>
  );
}
