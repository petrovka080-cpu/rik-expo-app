// app/(tabs)/contractor.tsx
import { useCallback } from "react";
import { Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { mapCatalogSearchToWorkMaterials } from "./contractor.search";
import {
  isApprovedForOtherStatus,
  isRejectedOrCancelledRequestStatus,
} from "./contractor.status";
import {
  isActiveWork,
  isExcludedWorkCode,
  getContractorErrorMessage,
  looksLikeUuid,
  normText,
  parseActMeta,
  pickFirstNonEmpty,
  pickWorkProgressRow,
  textOrDash,
  toLocalDateKey,
} from "./contractor.utils";
import { useContractorWorkSearchController } from "./contractor.workSearchController";
import { styles } from "./contractor.styles";
import Text from "./components/NormalizedText";
import { useContractorActivation } from "./hooks/useContractorActivation";
import { useContractorActBuilderController } from "./hooks/useContractorActBuilderController";
import { useContractorActBuilderModalProps } from "./hooks/useContractorActBuilderModalProps";
import { useContractorCards } from "./hooks/useContractorCards";
import { useContractorHumanizers } from "./hooks/useContractorHumanizers";
import { useContractorHomeController } from "./hooks/useContractorHomeController";
import { useContractorWorkModalController } from "./hooks/useContractorWorkModalController";
import { useContractorWorkModalProps } from "./hooks/useContractorWorkModalProps";
import { useContractorProgressReliability } from "./hooks/useContractorProgressReliability";
import { useContractorScreenState } from "./hooks/useContractorScreenState";

const showErr = (error: unknown) =>
  Alert.alert(
    "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0432\u044b\u043f\u043e\u043b\u043d\u0438\u0442\u044c \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435",
    getContractorErrorMessage(error)
  );

export type ContractorScreenControllerParams = {
  supabaseClient: Parameters<typeof useContractorWorkSearchController>[0]["supabaseClient"];
};

export function useContractorScreenController({
  supabaseClient,
}: ContractorScreenControllerParams) {
  const insets = useSafeAreaInsets();
  const modalHeaderTopPad = Platform.OS === "web" ? 16 : (insets.top + 10);
  const sheetHeaderTopPad = Platform.OS === "web" ? 12 : 12 + Math.min(insets.top, 20);
  const {
    profile,
    setProfile,
    contractor,
    setContractor,
    loadingProfile,
    setLoadingProfile,
    code,
    setCode,
    rows,
    setRows,
    inboxRows,
    setInboxRows,
    screenContract,
    setScreenContract,
    manualClaimedJobIds,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    subcontractCards,
    setSubcontractCards,
    loadingWorks,
    setLoadingWorks,
    rowsReady,
    setRowsReady,
    subcontractsReady,
    setSubcontractsReady,
    refreshing,
    setRefreshing,
    focusedRef,
    lastKickRef,
    profileRef,
    contractorRef,
    workModalVisible,
    setWorkModalVisible,
    workModalRow,
    setWorkModalRow,
    workModalStage,
    setWorkModalStage,
    workModalComment,
    setWorkModalComment,
    workModalMaterials,
    setWorkModalMaterials,
    workModalSaving,
    setWorkModalSaving,
    workModalLocation,
    setWorkModalLocation,
    workModalReadOnly,
    setWorkModalReadOnly,
    workModalLoading,
    setWorkModalLoading,
    workLog,
    setWorkLog,
    jobHeader,
    setJobHeader,
    workOverlayModal,
    setWorkOverlayModal,
    historyOpen,
    setHistoryOpen,
    issuedOpen,
    setIssuedOpen,
    actBuilderVisible,
    setActBuilderVisible,
    actBuilderState,
    dispatchActBuilder,
    actBuilderSaving,
    setActBuilderSaving,
    actBuilderHint,
    setActBuilderHint,
    actBuilderLoadState,
    setActBuilderLoadState,
    workModalHint,
    setWorkModalHint,
    actBuilderItems,
    actBuilderWorks,
    actBuilderExpandedWork,
    actBuilderExpandedMat,
    warehouseIssuesState,
    setWarehouseIssuesState,
    workStageOptions,
    setWorkStageOptions,
    workSearchVisible,
    setWorkSearchVisible,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    workModalRowRef,
    workModalBootSeqRef,
    issuedLoadSeqRef,
    activeWorkModalProgressRef,
  } = useContractorScreenState();

  const { toHumanWork } = useContractorHumanizers();
  const {
    query: workSearchQuery,
    results: workSearchResults,
    onChange: handleWorkSearchChange,
    clear: clearSearchState,
  } = useContractorWorkSearchController({
    supabaseClient: supabaseClient,
    mapCatalogSearchToWorkMaterials,
    delayMs: 300,
  });
  const clearWorkSearchState = useCallback(() => {
    setWorkSearchVisible(false);
    clearSearchState();
  }, [clearSearchState, setWorkSearchVisible]);
  const closeProgressModal = useCallback(() => {
    workModalBootSeqRef.current += 1;
    issuedLoadSeqRef.current += 1;
    activeWorkModalProgressRef.current = "";
    clearWorkSearchState();
    setWarehouseIssuesState({ status: "idle" });
    setWorkOverlayModal("none");
    setActBuilderLoadState("init");
    setWorkModalLoading(false);
    setWorkModalVisible(false);
  }, [
    activeWorkModalProgressRef,
    clearWorkSearchState,
    issuedLoadSeqRef,
    setActBuilderLoadState,
    setWarehouseIssuesState,
    setWorkModalLoading,
    setWorkModalVisible,
    setWorkOverlayModal,
    workModalBootSeqRef,
  ]);

  const {
    loadWorks,
    reloadContractorScreenData,
    handleRefresh,
  } = useContractorHomeController({
    screenData: {
      supabaseClient: supabaseClient,
      focusedRef,
      profileRef,
      contractorRef,
      setLoadingProfile,
      setProfile,
      setContractor,
      setLoadingWorks,
      setRowsReady,
      setSubcontractsReady,
      setSubcontractCards,
      setRows,
      setInboxRows,
      setScreenContract,
      normText,
      looksLikeUuid,
      pickWorkProgressRow,
      isExcludedWorkCode,
      isApprovedForOtherStatus,
    },
    workRows: {
      rows,
      contractor,
      manualClaimedJobIds,
      isActiveWork,
    },
    refresh: {
      supabaseClient: supabaseClient,
      focusedRef,
      lastKickRef,
      setRefreshing,
    },
  });
  const { activating, activateCode } = useContractorActivation({
    supabaseClient: supabaseClient,
    reloadContractorScreenData,
    code,
    onActivated: () => {
      Alert.alert("\u0423\u0441\u043f\u0435\u0448\u043d\u043e", "\u041a\u043e\u0434 \u0430\u043a\u0442\u0438\u0432\u0430\u0446\u0438\u0438 \u043f\u0440\u0438\u043c\u0435\u043d\u0435\u043d.");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error || "\u041e\u0448\u0438\u0431\u043a\u0430");
      Alert.alert("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0430\u043a\u0442\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043a\u043e\u0434", message);
    },
  });
  const contractorProgress = useContractorProgressReliability({
    supabaseClient: supabaseClient,
    workModalVisible,
    workModalRow,
    jobHeader,
    workModalReadOnly,
    workModalLoading,
    workModalMaterials,
    setWorkModalMaterialsRaw: setWorkModalMaterials,
    workModalStage,
    setWorkModalStageRaw: setWorkModalStage,
    workModalComment,
    setWorkModalCommentRaw: setWorkModalComment,
    workModalLocation,
    setWorkModalLocationRaw: setWorkModalLocation,
    setWorkModalSaving,
    setWorkModalHint,
    closeProgressModal,
    reloadContractorScreenData,
    pickFirstNonEmpty,
  });
  const loadingIssued = warehouseIssuesState.status === "loading";
  const issuedItems =
    warehouseIssuesState.status === "ready"
      ? warehouseIssuesState.rows.map((row) => ({
          issue_item_id: row.issueItemId,
          mat_code: row.matCode,
          request_id: row.requestId,
          title: row.title,
          unit: row.unit,
          qty: row.qty,
          qty_left: row.qtyLeft,
          qty_used: row.qtyUsed,
          price: row.price,
          sum: row.sum,
          qty_fact: row.qty,
        }))
      : [];

  const {
    openWorkAddModal,
    resolveRequestId,
    resolveContractorJobId,
    closeWorkModal,
    openContractDetailsModal,
    openEstimateMaterialsModal,
    closeContractDetailsModal,
    closeEstimateMaterialsModal,
    closeWorkStagePickerModal,
    onAnyModalDismissed,
    queueAfterClosingModals,
    resolvedObjectName,
    handleGenerateSummaryPdf,
    handleGenerateHistoryPdf,
    renderWorkSearchItem,
    renderWorkStageItem,
  } = useContractorWorkModalController({
    dataController: {
      supabaseClient: supabaseClient,
      rows,
      normText,
      isRejectedOrCancelledRequestStatus,
      toLocalDateKey,
    },
    openModal: {
      supabaseClient: supabaseClient,
      clearSearchState,
      workModalBootSeqRef,
      activeWorkModalProgressRef,
      setWorkModalRow,
      setWorkModalStage,
      setWorkModalComment,
      setWorkModalLocation,
      setWorkModalReadOnly,
      setWorkSearchVisible,
      setWorkModalHint,
      setActBuilderHint,
      setActBuilderLoadState,
      setWorkModalVisible,
      setWorkModalLoading,
      setHistoryOpen,
      setIssuedOpen,
      setWorkOverlayModal,
      setJobHeader,
      setWorkLog,
      setWorkStageOptions,
      setWorkModalMaterials,
      setWarehouseIssuesState,
      contractorRef,
      profileRef,
    },
    workModals: {
      workModalBootSeqRef,
      issuedLoadSeqRef,
      activeWorkModalProgressRef,
      clearWorkSearchState,
      setWarehouseIssuesState,
      setWorkOverlayModal,
      setActBuilderLoadState,
      setWorkModalLoading,
      setWorkModalVisible,
      workModalVisible,
      actBuilderVisible,
      setActBuilderVisible,
    },
    pdfActions: {
      supabaseClient: supabaseClient,
      workModalRow,
      jobHeader,
      showErr,
    },
    workMaterialUi: {
      setWorkModalMaterials: contractorProgress.setWorkModalMaterials,
      clearWorkSearchState,
      setWorkModalStage: contractorProgress.setWorkModalStage,
      setWorkOverlayModal,
      styles,
      TextComponent: Text,
    },
  });

  const {
    openActBuilder,
    submitActBuilder,
    handleActWorkToggleInclude,
    handleActWorkQtyChange,
    handleActWorkUnitChange,
    handleActWorkPriceChange,
    handleActMatToggleInclude,
    handleActMatDecrement,
    handleActMatIncrement,
    handleActMatPriceChange,
    handleToggleExpandedWork,
    handleToggleExpandedMat,
    actBuilderSelectedMatCount,
    actBuilderSelectedWorkCount,
    actBuilderHasSelected,
    actBuilderCanSubmit,
    actBuilderDateText,
    actBuilderWorkSum,
    actBuilderMatSum,
  } = useContractorActBuilderController({
    handlers: {
      actBuilderState: { items: actBuilderState.items },
      dispatchActBuilder,
    },
    open: {
      supabaseClient: supabaseClient,
      workModalRow,
      workModalLoading,
      loadingIssued,
      issuedItems,
      workModalMaterials,
      rows,
      jobHeader,
      workModalVisible,
      toHumanWork,
      resolveContractorJobId,
      resolveRequestId,
      looksLikeUuid,
      isRejectedOrCancelledRequestStatus,
      pickFirstNonEmpty,
      queueAfterClosingModals,
      setActBuilderVisible,
      setActBuilderLoadState,
      setActBuilderHint,
      setWorkModalMaterials,
      dispatchActBuilder,
    },
    stats: {
      actBuilderItems,
      actBuilderWorks,
      actBuilderLoadState,
    },
    submit: {
      supabaseClient: supabaseClient,
      workModalRow,
      actBuilderLoadState,
      actBuilderWorks,
      actBuilderItems,
      jobHeader,
      rows,
      resolveContractorJobId,
      resolveRequestId,
      isRejectedOrCancelledRequestStatus,
      looksLikeUuid,
      pickFirstNonEmpty,
      loadWorks,
      showErr,
      setActBuilderHint,
      setActBuilderSaving,
      setWorkModalHint,
      setActBuilderVisible,
    },
  });

  const { contractorWorkCards, handleOpenUnifiedCard } = useContractorCards({
    inboxRows,
    rows,
    openWorkAddModal,
  });
  const actBuilderModalProps = useContractorActBuilderModalProps({
    jobHeader,
    resolvedObjectName,
    actBuilderDateText,
    actBuilderSelectedWorkCount,
    actBuilderSelectedMatCount,
    actBuilderMatSum,
    actBuilderWorkSum,
    works: actBuilderWorks,
    items: actBuilderItems,
    expandedWorkId: actBuilderExpandedWork,
    expandedMatId: actBuilderExpandedMat,
    handleToggleExpandedWork,
    handleToggleExpandedMat,
    handleActWorkToggleInclude,
    handleActWorkQtyChange,
    handleActWorkUnitChange,
    handleActWorkPriceChange,
    handleActMatToggleInclude,
    handleActMatDecrement,
    handleActMatIncrement,
    handleActMatPriceChange,
    actBuilderSaving,
    actBuilderHint,
    actBuilderHasSelected,
    actBuilderCanSubmit,
    submitActBuilder,
  });
  const contractorWorkModalProps = useContractorWorkModalProps({
    workModalRow,
    workModalLoading,
    resolvedObjectName,
    jobHeader,
    workModalSaving,
    loadingIssued,
    workModalHint,
    progressSyncLabel: contractorProgress.activeProgressStatus.label,
    progressSyncDetail: contractorProgress.activeProgressStatus.detail,
    progressSyncTone: contractorProgress.activeProgressStatus.tone,
    canSubmitProgress: contractorProgress.canSubmitProgress,
    canRetryProgress: contractorProgress.canRetryProgress,
    onSubmitProgress: contractorProgress.submitProgressDraft,
    onRetryProgress: contractorProgress.retryContractorProgressNow,
    onOpenContract: openContractDetailsModal,
    onOpenActBuilder: openActBuilder,
    historyOpen,
    workLog,
    issuedOpen,
    warehouseIssuesState,
    onOpenEstimate: openEstimateMaterialsModal,
    styles,
    textOrDash,
    parseActMeta,
    setHistoryOpen,
    setIssuedOpen,
    handleGenerateSummaryPdf,
    handleGenerateHistoryPdf,
  });

  return {
    modalHeaderTopPad,
    sheetHeaderTopPad,
    loadingProfile,
    profile,
    code,
    setCode,
    activating,
    activateCode,
    contractorWorkCards,
    screenContract,
    refreshing,
    loadingWorks,
    rowsReady,
    subcontractsReady,
    handleRefresh,
    handleOpenUnifiedCard,
    workModalVisible,
    closeWorkModal,
    onAnyModalDismissed,
    contractorWorkModalProps,
    actBuilderVisible,
    setActBuilderVisible,
    actBuilderModalProps,
    workOverlayModal,
    closeContractDetailsModal,
    jobHeader,
    workModalRow,
    resolvedObjectName,
    closeEstimateMaterialsModal,
    workModalMaterials,
    setWorkModalMaterials: contractorProgress.setWorkModalMaterials,
    workModalReadOnly,
    workSearchVisible,
    workSearchQuery,
    handleWorkSearchChange,
    workSearchResults,
    renderWorkSearchItem,
    setWorkSearchVisible,
    clearWorkSearchState,
    closeWorkStagePickerModal,
    workStageOptions,
    renderWorkStageItem,
  };
}

export type ContractorScreenController = ReturnType<typeof useContractorScreenController>;
