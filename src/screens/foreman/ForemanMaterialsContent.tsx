import React from "react";
import type { ListRenderItem, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import CalcModal from "../../components/foreman/CalcModal";
import WorkTypePicker from "../../components/foreman/WorkTypePicker";
import CatalogModal from "../../components/foreman/CatalogModal";
import WarehouseFioModal from "../warehouse/components/WarehouseFioModal";
import type { ReqItemRow, ForemanRequestSummary } from "../../lib/catalog_api";
import type { ContextResolutionResult } from "./foreman.context";
import type { FormContextUiModel } from "./foreman.locator.adapter";
import type { RefOption } from "./foreman.types";
import type { ForemanHeaderAttentionState } from "./foreman.headerRequirements";
import ForemanEditorSection from "./ForemanEditorSection";
import ForemanHistoryBar from "./ForemanHistoryBar";
import ForemanHistoryModal from "./ForemanHistoryModal";
import ForemanSubcontractHistoryModal from "./ForemanSubcontractHistoryModal";
import ForemanAiQuickModal from "./ForemanAiQuickModal";
import ForemanDraftModal from "./ForemanDraftModal";

type StatusInfo = { label: string; bg: string; fg: string };

type Props = {
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
  draftSendBusy: boolean;
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

export default function ForemanMaterialsContent(props: Props) {
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
