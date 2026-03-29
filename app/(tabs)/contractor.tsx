// app/(tabs)/contractor.tsx
import React, { useCallback } from "react";
import {
  View,
  Alert,
  Platform,
} from "react-native";
import RoleScreenLayout from "../../src/components/layout/RoleScreenLayout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../src/lib/supabaseClient";
import { mapCatalogSearchToWorkMaterials } from "../../src/screens/contractor/contractor.search";
import {
  isApprovedForOtherStatus,
  isRejectedOrCancelledRequestStatus,
} from "../../src/screens/contractor/contractor.status";
import {
  isActiveWork,
  isExcludedWorkCode,
  looksLikeUuid,
  normText,
  parseActMeta,
  pickFirstNonEmpty,
  pickWorkProgressRow,
  textOrDash,
  toLocalDateKey,
} from "../../src/screens/contractor/contractor.utils";
import { useContractorWorkSearchController } from "../../src/screens/contractor/contractor.workSearchController";
import EstimateMaterialsModal from "../../src/screens/contractor/components/EstimateMaterialsModal";
import WorkStagePickerModal from "../../src/screens/contractor/components/WorkStagePickerModal";
import ContractDetailsModal from "../../src/screens/contractor/components/ContractDetailsModal";
import ActBuilderModal from "../../src/screens/contractor/components/ActBuilderModal";
import ContractorSubcontractsList from "../../src/screens/contractor/components/ContractorSubcontractsList";
import ContractorWorkModal from "../../src/screens/contractor/components/ContractorWorkModal";
import ContractorActivationView from "../../src/screens/contractor/components/ContractorActivationView";
import ContractorLoadingView from "../../src/screens/contractor/components/ContractorLoadingView";
import { styles } from "../../src/screens/contractor/contractor.styles";
import Text from "../../src/screens/contractor/components/NormalizedText";
import { useContractorActivation } from "../../src/screens/contractor/hooks/useContractorActivation";
import { useContractorActBuilderController } from "../../src/screens/contractor/hooks/useContractorActBuilderController";
import { useContractorActBuilderModalProps } from "../../src/screens/contractor/hooks/useContractorActBuilderModalProps";
import { useContractorCards } from "../../src/screens/contractor/hooks/useContractorCards";
import { useContractorHumanizers } from "../../src/screens/contractor/hooks/useContractorHumanizers";
import { useContractorHomeController } from "../../src/screens/contractor/hooks/useContractorHomeController";
import { useContractorWorkModalController } from "../../src/screens/contractor/hooks/useContractorWorkModalController";
import { useContractorWorkModalProps } from "../../src/screens/contractor/hooks/useContractorWorkModalProps";
import { useContractorProgressReliability } from "../../src/screens/contractor/hooks/useContractorProgressReliability";
import { useContractorScreenState } from "../../src/screens/contractor/hooks/useContractorScreenState";
import { withScreenErrorBoundary } from "../../src/shared/ui/ScreenErrorBoundary";

const showErr = (e: any) =>
  Alert.alert(
    "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0432\u044b\u043f\u043e\u043b\u043d\u0438\u0442\u044c \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435",
    String(e?.message || e?.error_description || e?.hint || e || "\u041d\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043d\u0430\u044f \u043e\u0448\u0438\u0431\u043a\u0430")
  );

const UI_TEXT = {
  loading: "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...",
  activationTitle: "\u0410\u043a\u0442\u0438\u0432\u0430\u0446\u0438\u044f \u043f\u043e\u0434\u0440\u044f\u0434\u0447\u0438\u043a\u0430",
  activationSubtitle: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043a\u043e\u0434 \u0430\u043a\u0442\u0438\u0432\u0430\u0446\u0438\u0438, \u043a\u043e\u0442\u043e\u0440\u044b\u0439 \u0432\u044b\u0434\u0430\u043b \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440.",
  activationPlaceholder: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043a\u043e\u0434 \u0430\u043a\u0442\u0438\u0432\u0430\u0446\u0438\u0438, \u043d\u0430\u043f\u0440\u0438\u043c\u0435\u0440: A3F9-C8ZD",
  activating: "\u0410\u043a\u0442\u0438\u0432\u0430\u0446\u0438\u044f...",
  activate: "\u0410\u043a\u0442\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u0442\u044c",
  homeTitle: "\u041f\u043e\u0434\u0440\u044f\u0434\u0447\u0438\u043a",
} as const;

// ---- MAIN SCREEN ----
function ContractorScreen() {
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
    supabaseClient: supabase,
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
      supabaseClient: supabase,
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
      supabaseClient: supabase,
      focusedRef,
      lastKickRef,
      setRefreshing,
    },
  });
  const { activating, activateCode } = useContractorActivation({
    supabaseClient: supabase,
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
    supabaseClient: supabase,
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
      supabaseClient: supabase,
      rows,
      normText,
      isRejectedOrCancelledRequestStatus,
      toLocalDateKey,
    },
    openModal: {
      supabaseClient: supabase,
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
      supabaseClient: supabase,
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
      supabaseClient: supabase,
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
      supabaseClient: supabase,
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

  if (loadingProfile && !profile) {
    return <ContractorLoadingView text={UI_TEXT.loading} />;
  }

  // ---- User is not contractor: show activation input ----
  if (!profile?.is_contractor) {
    return (
      <ContractorActivationView
        code={code}
        activating={activating}
        onCodeChange={setCode}
        onActivate={activateCode}
        title={UI_TEXT.activationTitle}
        subtitle={UI_TEXT.activationSubtitle}
        placeholder={UI_TEXT.activationPlaceholder}
        activateText={UI_TEXT.activate}
        activatingText={UI_TEXT.activating}
      />
    );
  }

  // ---- Contractor active: show works ----
  return (
    <RoleScreenLayout style={[styles.container, styles.homeContainer]}>
      <View pointerEvents="none" style={styles.homeGlow} />
      <View style={styles.homeHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <Text style={[styles.headerTitle, styles.homeHeaderTitle]}>{UI_TEXT.homeTitle}</Text>
        </View>
      </View>

      <ContractorSubcontractsList
        data={contractorWorkCards}
        screenContract={screenContract}
        refreshing={refreshing}
        loadingWorks={loadingWorks || !rowsReady || !subcontractsReady}
        onRefresh={handleRefresh}
        onOpen={handleOpenUnifiedCard}
        styles={styles}
      />

      <ContractorWorkModal
        visible={workModalVisible}
        onClose={closeWorkModal}
        onDismiss={onAnyModalDismissed}
        modalHeaderTopPad={modalHeaderTopPad}
        {...contractorWorkModalProps}
      />

      <ActBuilderModal
        visible={actBuilderVisible}
        onClose={() => setActBuilderVisible(false)}
        onDismiss={onAnyModalDismissed}
        modalHeaderTopPad={modalHeaderTopPad}
        {...actBuilderModalProps}
      />

      <ContractDetailsModal
        visible={workOverlayModal === "contract"}
        onClose={closeContractDetailsModal}
        jobHeader={jobHeader}
        workModalRow={workModalRow}
        resolvedObjectName={resolvedObjectName}
      />

      <EstimateMaterialsModal
        visible={workOverlayModal === "estimate"}
        onClose={closeEstimateMaterialsModal}
        sheetHeaderTopPad={sheetHeaderTopPad}
        workModalMaterials={workModalMaterials}
        setWorkModalMaterials={contractorProgress.setWorkModalMaterials}
        workModalReadOnly={workModalReadOnly}
        workSearchVisible={workSearchVisible}
        workSearchQuery={workSearchQuery}
        handleWorkSearchChange={handleWorkSearchChange}
        workSearchResults={workSearchResults}
        renderWorkSearchItem={renderWorkSearchItem}
        onOpenSearch={() => setWorkSearchVisible(true)}
        closeSearch={clearWorkSearchState}
      />

      <WorkStagePickerModal
        visible={workOverlayModal === "stage"}
        onClose={closeWorkStagePickerModal}
        sheetHeaderTopPad={sheetHeaderTopPad}
        workStageOptions={workStageOptions}
        renderWorkStageItem={renderWorkStageItem}
      />
    </RoleScreenLayout>
  );
}

export default withScreenErrorBoundary(ContractorScreen, {
  screen: "contractor",
  route: "/contractor",
});
