import React from "react";
import type { ListRenderItem, NativeScrollEvent, NativeSyntheticEvent } from "react-native";

import type { ReqItemRow, ForemanRequestSummary } from "../../lib/catalog_api";
import type { ContextResolutionResult } from "./foreman.context";
import type { FormContextUiModel } from "./foreman.locator.adapter";
import type { RefOption } from "./foreman.types";
import type { ForemanHeaderAttentionState } from "./foreman.headerRequirements";
import {
  ForemanMaterialsMainSections,
  ForemanMaterialsModalStack,
} from "./ForemanMaterialsContent.sections";

type StatusInfo = { label: string; bg: string; fg: string };

export type ForemanMaterialsContentProps = {
  contentTopPad: number;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  foreman: string;
  onOpenFioModal: () => void;
  objectType: string;
  objectDisplayName: string;
  level: string;
  system: string;
  zone: string;
  contextResult: ContextResolutionResult;
  formUi: FormContextUiModel;
  objOptions: RefOption[];
  sysOptions: RefOption[];
  onObjectChange: (value: string) => void;
  onLevelChange: (value: string) => void;
  onSystemChange: (value: string) => void;
  onZoneChange: (value: string) => void;
  ensureHeaderReady: () => boolean;
  isDraftActive: boolean;
  canStartDraftFlow: boolean;
  showHint: (title: string, message: string) => void;
  busy: boolean;
  onOpenCatalog: () => void;
  onCalcPress: () => void;
  onAiQuickPress: () => void;
  onOpenDraft: () => void;
  currentDisplayLabel: string;
  itemsCount: number;
  draftSyncStatusLabel: string;
  draftSyncStatusDetail: string | null;
  draftSyncStatusTone: "neutral" | "info" | "success" | "warning" | "danger";
  draftSendBusy: boolean;
  headerAttention: ForemanHeaderAttentionState | null;
  onOpenRequestHistory: () => void;
  onOpenSubcontractHistory: () => void;
  historyVisible: boolean;
  historyMode: "list" | "details";
  historySelectedRequestId: string | null;
  onHistoryShowDetails: (request: ForemanRequestSummary) => void;
  onHistoryBackToList: () => void;
  onHistoryResetView: () => void;
  historyLoading: boolean;
  historyRequests: ForemanRequestSummary[];
  resolveStatusInfo: (status: string | null | undefined) => StatusInfo;
  onHistorySelect: (request: ForemanRequestSummary) => void;
  onHistoryReopen: (request: ForemanRequestSummary) => void | Promise<void>;
  historyReopenBusyId: string | null;
  onOpenHistoryPdf: (reqId: string) => void;
  isHistoryPdfBusy: (key: string) => boolean;
  shortId: (id: string) => string;
  closeHistory: () => void;
  subcontractHistoryVisible: boolean;
  closeSubcontractHistory: () => void;
  subcontractHistoryLoading: boolean;
  subcontractHistory: any[];
  catalogVisible: boolean;
  closeCatalog: () => void;
  rikQuickSearch: typeof import("../../lib/catalog_api").rikQuickSearch;
  onCommitToDraft: (rows: import("./foreman.types").PickedRow[]) => Promise<void>;
  workTypePickerVisible: boolean;
  closeWorkTypePicker: () => void;
  onSelectWorkType: (wt: { code: string; name: string } | null) => void;
  calcVisible: boolean;
  closeCalc: () => void;
  backToWorkTypePicker: () => void;
  selectedWorkType: { code: string; name: string } | null;
  onAddCalcToRequest: (rows: import("./foreman.types").CalcRow[]) => Promise<void>;
  aiQuickVisible: boolean;
  aiQuickMode: import("./foreman.aiQuickReview").ForemanAiQuickMode;
  closeAiQuick: () => void;
  aiQuickText: string;
  onAiQuickTextChange: (value: string) => void;
  onAiQuickParse: () => Promise<void>;
  onAiQuickApply: () => Promise<void>;
  onAiQuickBackToCompose: () => void;
  onAiQuickSelectCandidate: (groupId: string, rikCode: string) => void;
  aiQuickLoading: boolean;
  aiQuickApplying: boolean;
  aiQuickError: string;
  aiQuickNotice: string;
  aiQuickPreview: import("./foreman.ai").ForemanAiQuickItem[];
  aiQuickOutcomeType: import("./foremanUi.store").ForemanAiOutcomeType;
  aiQuickReviewGroups: import("./foreman.aiQuickReview").ForemanAiQuickReviewGroup[];
  aiQuickQuestions: import("./foreman.ai").ClarifyQuestion[];
  aiQuickSessionHint: string;
  aiUnavailableReason: string;
  aiQuickDegradedMode: boolean;
  aiQuickCanApply: boolean;
  onlineConfigured: boolean;
  draftOpen: boolean;
  closeDraft: () => void;
  objectName: string;
  levelName: string;
  systemName: string;
  zoneName: string;
  items: ReqItemRow[];
  renderReqItem: ListRenderItem<ReqItemRow>;
  screenLock: boolean;
  draftDeleteBusy: boolean;
  onDeleteDraft: () => Promise<void>;
  onPdf: () => Promise<void>;
  pdfBusy: boolean;
  onSendDraft: () => Promise<void>;
  availableDraftRecoveryActions: import("../../lib/offline/foremanSyncRuntime").ForemanDraftRecoveryAction[];
  onRetryDraftSync: () => Promise<void>;
  onRehydrateDraftFromServer: () => Promise<void>;
  onRestoreLocalDraft: () => Promise<void>;
  onDiscardLocalDraft: () => Promise<void>;
  onClearFailedQueueTail: () => Promise<void>;
  isFioConfirmVisible: boolean;
  handleFioConfirm: (fio: string) => Promise<void>;
  isFioLoading: boolean;
  foremanHistory: string[];
  ui: typeof import("./foreman.ui").UI;
  styles: typeof import("./foreman.styles").s;
};

export default function ForemanMaterialsContent(props: ForemanMaterialsContentProps) {
  return (
    <>
      <ForemanMaterialsMainSections
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
        busy={props.busy}
        onOpenCatalog={props.onOpenCatalog}
        closeCatalog={props.closeCatalog}
        onCalcPress={props.onCalcPress}
        onAiQuickPress={props.onAiQuickPress}
        onOpenDraft={props.onOpenDraft}
        closeDraft={props.closeDraft}
        currentDisplayLabel={props.currentDisplayLabel}
        itemsCount={props.itemsCount}
        draftSyncStatusLabel={props.draftSyncStatusLabel}
        draftSyncStatusDetail={props.draftSyncStatusDetail}
        draftSyncStatusTone={props.draftSyncStatusTone}
        draftSendBusy={props.draftSendBusy}
        headerAttention={props.headerAttention}
        onOpenRequestHistory={props.onOpenRequestHistory}
        onOpenSubcontractHistory={props.onOpenSubcontractHistory}
        historyVisible={props.historyVisible}
        historyMode={props.historyMode}
        historySelectedRequestId={props.historySelectedRequestId}
        onHistoryShowDetails={props.onHistoryShowDetails}
        onHistoryBackToList={props.onHistoryBackToList}
        onHistoryResetView={props.onHistoryResetView}
        historyLoading={props.historyLoading}
        historyRequests={props.historyRequests}
        resolveStatusInfo={props.resolveStatusInfo}
        onHistorySelect={props.onHistorySelect}
        onHistoryReopen={props.onHistoryReopen}
        historyReopenBusyId={props.historyReopenBusyId}
        onOpenHistoryPdf={props.onOpenHistoryPdf}
        isHistoryPdfBusy={props.isHistoryPdfBusy}
        shortId={props.shortId}
        closeHistory={props.closeHistory}
        ui={props.ui}
        styles={props.styles}
      />

      <ForemanMaterialsModalStack
        subcontractHistoryVisible={props.subcontractHistoryVisible}
        closeSubcontractHistory={props.closeSubcontractHistory}
        subcontractHistoryLoading={props.subcontractHistoryLoading}
        subcontractHistory={props.subcontractHistory}
        catalogVisible={props.catalogVisible}
        closeCatalog={props.closeCatalog}
        rikQuickSearch={props.rikQuickSearch}
        onCommitToDraft={props.onCommitToDraft}
        onOpenDraft={props.onOpenDraft}
        itemsCount={props.itemsCount}
        workTypePickerVisible={props.workTypePickerVisible}
        closeWorkTypePicker={props.closeWorkTypePicker}
        onSelectWorkType={props.onSelectWorkType}
        calcVisible={props.calcVisible}
        closeCalc={props.closeCalc}
        backToWorkTypePicker={props.backToWorkTypePicker}
        selectedWorkType={props.selectedWorkType}
        onAddCalcToRequest={props.onAddCalcToRequest}
        aiQuickVisible={props.aiQuickVisible}
        closeAiQuick={props.closeAiQuick}
        aiQuickMode={props.aiQuickMode}
        aiQuickText={props.aiQuickText}
        onAiQuickTextChange={props.onAiQuickTextChange}
        onAiQuickParse={props.onAiQuickParse}
        onAiQuickApply={props.onAiQuickApply}
        onAiQuickBackToCompose={props.onAiQuickBackToCompose}
        onAiQuickSelectCandidate={props.onAiQuickSelectCandidate}
        aiQuickLoading={props.aiQuickLoading}
        aiQuickApplying={props.aiQuickApplying}
        aiQuickCanApply={props.aiQuickCanApply}
        onlineConfigured={props.onlineConfigured}
        aiQuickError={props.aiQuickError}
        aiQuickNotice={props.aiQuickNotice}
        aiQuickPreview={props.aiQuickPreview}
        aiQuickOutcomeType={props.aiQuickOutcomeType}
        aiQuickReviewGroups={props.aiQuickReviewGroups}
        aiQuickQuestions={props.aiQuickQuestions}
        aiQuickSessionHint={props.aiQuickSessionHint}
        aiUnavailableReason={props.aiUnavailableReason}
        aiQuickDegradedMode={props.aiQuickDegradedMode}
        currentDisplayLabel={props.currentDisplayLabel}
        draftOpen={props.draftOpen}
        closeDraft={props.closeDraft}
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
        onSendDraft={props.onSendDraft}
        availableDraftRecoveryActions={props.availableDraftRecoveryActions}
        onRetryDraftSync={props.onRetryDraftSync}
        onRehydrateDraftFromServer={props.onRehydrateDraftFromServer}
        onRestoreLocalDraft={props.onRestoreLocalDraft}
        onDiscardLocalDraft={props.onDiscardLocalDraft}
        onClearFailedQueueTail={props.onClearFailedQueueTail}
        isFioConfirmVisible={props.isFioConfirmVisible}
        foreman={props.foreman}
        handleFioConfirm={props.handleFioConfirm}
        isFioLoading={props.isFioLoading}
        foremanHistory={props.foremanHistory}
        ui={props.ui}
        styles={props.styles}
      />
    </>
  );
}
