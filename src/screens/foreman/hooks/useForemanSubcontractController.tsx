import React from "react";
import { Alert } from "react-native";

import { rikQuickSearch } from "../../../lib/catalog_api";
import { s } from "../foreman.styles";
import { REQUEST_STATUS_STYLES, UI } from "../foreman.ui";
import { resolveStatusInfo as resolveStatusHelper, shortId } from "../foreman.helpers";
import { buildForemanSubcontractDebugPayload } from "./foreman.subcontractController.telemetry";
import { ForemanSubcontractControllerView } from "./ForemanSubcontractControllerView";
import type { DictOption } from "./foreman.subcontractController.model";
import { useForemanSubcontractControllerUiState } from "./useForemanSubcontractControllerUiState";
import { useForemanSubcontractDraftActions } from "./useForemanSubcontractDraftActions";
import { useForemanSubcontractDraftLineActions } from "./useForemanSubcontractDraftLineActions";
import { useForemanSubcontractFormController } from "./useForemanSubcontractFormController";
import { useForemanSubcontractHistoryController } from "./useForemanSubcontractHistoryController";
import { useForemanSubcontractHydration } from "./useForemanSubcontractHydration";
import { useForemanSubcontractModalVisibility } from "./useForemanSubcontractModalVisibility";
import { useForemanSubcontractPdfActions } from "./useForemanSubcontractPdfActions";
import { useForemanSubcontractRequestDraftState } from "./useForemanSubcontractRequestDraftState";
import { useForemanSubcontractSaveDraftAtomic } from "./useForemanSubcontractSaveDraftAtomic";

export type ForemanSubcontractTabProps = {
  contentTopPad: number;
  onScroll: (event: unknown) => void;
  dicts: {
    objOptions: DictOption[];
    lvlOptions: DictOption[];
    sysOptions: DictOption[];
  };
};

const logForemanSubcontractDebug = (scope: string, error: unknown) => {
  if (!__DEV__) return;
  const payload = buildForemanSubcontractDebugPayload(scope, error);
  console.warn(payload.message, payload.error);
};
const resolveRequestStatusInfo = (raw?: string | null) =>
  resolveStatusHelper(raw, REQUEST_STATUS_STYLES);

export function useForemanSubcontractController({
  contentTopPad,
  onScroll,
  dicts,
}: ForemanSubcontractTabProps) {
  const uiState = useForemanSubcontractControllerUiState({ dicts });
  const {
    router,
    modalHeaderTopPad,
    historyRequests,
    requestHistoryLoading,
    requestHistoryVisible,
    fetchRequestHistory,
    closeRequestHistory,
    userId,
    setUserId,
    foremanName,
    setForemanName,
    form,
    setForm,
    displayNo,
    setDisplayNo,
    saving,
    setSaving,
    sending,
    setSending,
    historyLoading,
    setHistoryLoading,
    history,
    setHistory,
    historyOpen,
    setHistoryOpen,
    setSubcontractFlowOpen,
    setSubcontractFlowScreen,
    selectedWorkType,
    setSelectedWorkType,
    draftItems,
    setDraftItems,
    dateTarget,
    setDateTarget,
    selectedTemplateId,
    setSelectedTemplateId,
    closeSubcontractFlowUi,
    requestId,
    setRequestId,
    draftItemsLoadSeqRef,
    draftScopeKey,
    templateContract,
    objectName,
    levelName,
    systemName,
    zoneName,
    templateObjectName,
    templateLevelName,
    templateSystemName,
    subcontractDetailsVisible,
    draftOpen,
    catalogVisible,
    workTypePickerVisible,
    calcVisible,
    scopeNote,
    requestMetaFromTemplate,
    requestMetaPersistPatch,
    approvedContracts,
    contractorName,
    phoneName,
    volumeText,
  } = uiState;

  const { setField } = useForemanSubcontractFormController({ form, setForm });
  const { openSubcontractFlow, closeSubcontractFlow } = useForemanSubcontractModalVisibility({
    setSubcontractFlowOpen,
    setSubcontractFlowScreen,
    closeSubcontractFlowUi,
  });
  const { loadHistory } = useForemanSubcontractHistoryController({
    userId,
    setUserId,
    setForemanName,
    setHistoryLoading,
    setHistory,
    logDebugError: logForemanSubcontractDebug,
  });
  const { resetSubcontractDraftContext, loadDraftItems } = useForemanSubcontractRequestDraftState({
    requestId,
    requestMetaPersistPatch,
    draftItemsLoadSeqRef,
    setRequestId,
    setDisplayNo,
    setDraftItems,
    setForm,
    logDebugError: logForemanSubcontractDebug,
  });
  const { saveDraftAtomic } = useForemanSubcontractSaveDraftAtomic({
    templateContract,
    userId,
    requestId,
    draftItems,
    requestMetaFromTemplate,
    templateObjectName,
    objectName,
    levelName,
    templateLevelName,
    systemName,
    templateSystemName,
    form,
    draftScopeKey,
    setRequestId,
    setDisplayNo,
    setDraftItems,
    setSaving,
    setSending,
  });
  const { appendCatalogRows, appendCalcRows, removeDraftItem } = useForemanSubcontractDraftLineActions({
    scopeNote,
    draftItems,
    requestId,
    saveDraftAtomic,
    setSubcontractFlowScreen,
  });
  const { onPdf, openRequestHistoryPdf, handleRequestHistorySelect } = useForemanSubcontractPdfActions({
    requestId,
    displayNo,
    foremanName,
    router,
    closeSubcontractFlow,
    closeRequestHistory,
  });
  const { clearDraft, sendToDirector } = useForemanSubcontractDraftActions({
    closeSubcontractFlow,
    draftItems,
    loadHistory,
    requestId,
    resetSubcontractDraftContext,
    saveDraftAtomic,
    templateContract,
    userId,
  });
  const { acceptApprovedFromDirector } = useForemanSubcontractHydration({
    dicts,
    form,
    loadDraftItems,
    openSubcontractFlow,
    resetSubcontractDraftContext,
    setDisplayNo,
    setForm,
    setRequestId,
    setSelectedTemplateId,
  });

  return (
    <ForemanSubcontractControllerView
      mainSectionsProps={{
        approvedContracts,
        approvedContractsLoading: historyLoading,
        contentTopPad,
        onScroll,
        objOptions: dicts.objOptions,
        sysOptions: dicts.sysOptions,
        selectedTemplateId,
        onSelectApprovedContract: acceptApprovedFromDirector,
        busy: saving || sending,
        onOpenRequestHistory: () => fetchRequestHistory(foremanName),
        onOpenSubcontractHistory: () => {
          void loadHistory(userId);
          setHistoryOpen(true);
        },
        ui: UI,
        styles: s,
      }}
      modalStackProps={{
        subcontractDetailsVisible,
        onCloseSubcontractFlow: closeSubcontractFlow,
        modalHeaderTopPad,
        templateContract,
        templateObjectName,
        templateLevelName,
        templateSystemName,
        formLevelCode: form.levelCode,
        formSystemCode: form.systemCode,
        formZoneText: form.zoneText,
        draftItemsCount: draftItems.length,
        lvlOptions: dicts.lvlOptions,
        sysOptions: dicts.sysOptions,
        onChangeLevelCode: (value) => setField("levelCode", value),
        onChangeSystemCode: (value) => setField("systemCode", value),
        onChangeZoneText: (value) => setField("zoneText", value),
        onOpenCatalog: () => setSubcontractFlowScreen("catalog"),
        onOpenCalc: () => setSubcontractFlowScreen("workType"),
        onOpenDraft: () => setSubcontractFlowScreen("draft"),
        displayNo,
        draftOpen,
        onCloseDraft: () => setSubcontractFlowScreen("details"),
        objectName,
        levelName,
        systemName,
        zoneName,
        contractorName,
        phoneName,
        volumeText,
        draftItems,
        saving,
        sending,
        requestId,
        onRemoveDraftItem: removeDraftItem,
        onClearDraft: () => void clearDraft(),
        onPdf: () => void onPdf(),
        onExcel: () => Alert.alert("Excel", "Экспорт Excel для подрядов будет добавлен."),
        onSendToDirector: () => void sendToDirector(),
        periodPickerVisible: !!dateTarget,
        onClosePeriodPicker: () => setDateTarget(null),
        periodInitialFrom: dateTarget ? String(form[dateTarget] || "") : "",
        periodInitialTo: dateTarget ? String(form[dateTarget] || "") : "",
        onClearPeriod: () => {
          if (!dateTarget) return;
          setField(dateTarget, "");
          setDateTarget(null);
        },
        onApplyPeriod: (from) => {
          if (!dateTarget) return;
          setField(dateTarget, String(from || ""));
          setDateTarget(null);
        },
        ui: UI,
        catalogVisible,
        onCloseCatalog: () => setSubcontractFlowScreen("details"),
        rikQuickSearch,
        onCommitCatalogToDraft: (rows) => void appendCatalogRows(rows),
        onOpenDraftFromCatalog: () => {
          setSubcontractFlowScreen("draft");
        },
        workTypePickerVisible,
        onCloseWorkTypePicker: () => setSubcontractFlowScreen("details"),
        onSelectWorkType: (wt) => {
          setSelectedWorkType(wt);
          setSubcontractFlowScreen("calc");
        },
        calcVisible,
        onCloseCalc: () => {
          setSubcontractFlowScreen("details");
          setSelectedWorkType(null);
        },
        onBackFromCalc: () => {
          setSubcontractFlowScreen("workType");
        },
        selectedWorkType,
        onAddCalcToRequest: async (rows) => {
          await appendCalcRows(rows);
          setSubcontractFlowScreen("details");
          setSelectedWorkType(null);
        },
        requestHistoryVisible,
        onCloseRequestHistory: closeRequestHistory,
        requestHistoryLoading,
        requestHistoryRequests: historyRequests,
        resolveRequestStatusInfo,
        onShowRequestDetails: (request) => void handleRequestHistorySelect(request.id),
        onSelectRequest: (request) => void handleRequestHistorySelect(request.id),
        onReopenRequest: (request) => void handleRequestHistorySelect(request.id),
        onOpenRequestPdf: (reqId) => void openRequestHistoryPdf(reqId),
        shortId,
        styles: s,
        subcontractHistoryVisible: historyOpen,
        onCloseSubcontractHistory: () => setHistoryOpen(false),
        subcontractHistoryLoading: historyLoading,
        subcontractHistory: history,
      }}
    />
  );
}
