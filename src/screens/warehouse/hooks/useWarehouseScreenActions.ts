import { useCallback } from "react";
import { UI } from "../warehouse.styles";
import type { WarehouseTabContentProps } from "../components/WarehouseTabContent";
import { supabase } from "../../../lib/supabaseClient";
import { showErr } from "../warehouse.utils";
import { useWarehouseLifecycle } from "./useWarehouseLifecycle";
import { useWarehouseTabEffects } from "./useWarehouseTabEffects";
import { useWarehouseExpenseRealtime } from "./useWarehouseExpenseRealtime";
import { useWarehousePickerUi } from "./useWarehousePickerUi";
import { useWarehouseReportPeriod } from "./useWarehouseReportPeriod";
import { useWarehouseListUi } from "./useWarehouseListUi";
import { useWarehouseListHandlers } from "./useWarehouseListHandlers";
import { useWarehouseReportActions } from "./useWarehouseReportActions";
import { useWarehouseRenderers } from "./useWarehouseRenderers";
import { useWarehousePickerActions } from "./useWarehousePickerActions";
import { useWarehouseModalsManagerProps } from "./useWarehouseModalsManagerProps";
import type { WarehouseScreenData } from "./useWarehouseScreenData";

export function useWarehouseScreenActions(data: WarehouseScreenData) {
  const fetchReqHeadsForce = useCallback(() => data.callFetchReqHeads(0, true), [data.callFetchReqHeads]);

  useWarehouseLifecycle({
    tab: data.tab,
    setLoading: data.setLoading,
    fetchToReceive: data.callFetchToReceive,
    fetchStock: data.callFetchStock,
    fetchReqHeadsForce,
    fetchReports: data.callFetchReports,
    onError: showErr,
  });

  useWarehouseTabEffects({
    tab: data.tab,
    periodFrom: data.periodFrom,
    periodTo: data.periodTo,
    fetchReports: data.fetchReports,
    fetchReqHeadsForce,
    onError: showErr,
  });

  useWarehouseExpenseRealtime({
    supabase,
    tab: data.tab,
    fetchReqHeadsForce,
  });

  const { pickOptions, pickTitle } = useWarehousePickerUi({
    pickWhat: data.pickModal.what,
    pickFilter: data.pickFilter,
    objectList: data.objectList,
    levelList: data.levelList,
    systemList: data.systemList,
    zoneList: data.zoneList,
    recipientList: data.recipientList,
  });

  const {
    applyReportPeriod,
    clearReportPeriod,
    closeReportPeriod,
    onOpenRepPeriod,
    onReportsRefresh,
    repPeriodUi,
  } = useWarehouseReportPeriod({
    setPeriodFrom: data.setPeriodFrom,
    setPeriodTo: data.setPeriodTo,
    setRepPeriodOpen: data.setRepPeriodOpen,
    fetchReports: data.fetchReports,
  });

  const onPickOption = useCallback((opt: { id: string; label: string }) => {
    if (data.pickModal.what === "recipient") {
      void data.rec.commitRecipient(opt.label);
      data.closePick();
      return;
    }
    data.applyPick(opt);
  }, [data]);

  const { listContentStyle, listRefreshControl, listOnScroll, listScrollEventThrottle, fmtRuDate } = useWarehouseListUi({
    headerMax: data.HEADER_MAX,
    refreshing: data.refreshing,
    onRefresh: data.onRefresh,
    isWeb: data.isWeb,
    onListScroll: data.headerApi.onListScroll,
  });

  const {
    onReqEndReached,
    onIncomingEndReached,
    closeItemsModal,
    onPickRecipient,
    closeIncomingDetails,
    onIncomingItemsSubmit,
  } = useWarehouseListHandlers({
    reqRefs: data.reqRefs,
    fetchReqHeads: data.fetchReqHeads,
    toReceiveHasMore: data.incoming.toReceiveHasMore,
    toReceiveIsFetching: data.incoming.toReceiveIsFetching,
    toReceivePage: data.incoming.toReceivePage,
    fetchToReceivePage: data.callFetchToReceive,
    setItemsModal: data.setItemsModal,
    commitRecipient: data.rec.commitRecipient,
    closeIncomingDetailsRaw: data.reportsUi.closeIncomingDetails,
    receiveSelectedForHead: data.receiveSelectedForHead,
  });

  const {
    onReportsBack,
    onReportsSelectMode,
    onPdfRegisterPress,
    onPdfDocumentPress,
    onPdfMaterialsPress,
    onPdfObjectWorkPress,
    onPdfDayRegisterPress,
    onPdfDayMaterialsPress,
    reportsOnScroll,
    reportsScrollEventThrottle,
  } = useWarehouseReportActions({
    isWeb: data.isWeb,
    onListScroll: data.headerApi.onListScroll,
    setReportsMode: data.setReportsMode,
    onPdfRegister: data.onPdfRegister,
    onPdfDocument: data.onPdfDocument,
    onPdfMaterials: data.onPdfMaterials,
    onPdfObjectWork: data.onPdfObjectWork,
    onPdfDayRegister: data.onPdfDayRegister,
    onPdfDayMaterials: data.onPdfDayMaterials,
  });

  const { renderReqHeadItem, renderIncomingItem, renderStockItem } = useWarehouseRenderers({
    openReq: data.openReq,
    fmtRuDate,
    openItemsModal: data.openItemsModal,
    proposalNoByPurchase: data.incoming.proposalNoByPurchase,
    getPickedQty: data.stockPickUi.getPickedQty,
    openStockIssue: data.stockPickUi.openStockIssue,
  });

  const { onPickObject, onPickLevel, onPickSystem, onPickZone, onOpenRecipientModal } = useWarehousePickerActions({
    setPickModal: data.setPickModal,
    setIsRecipientModalVisible: data.setIsRecipientModalVisible,
  });

  const modalsManagerProps = useWarehouseModalsManagerProps({
    stockIssueModal: data.stockPickUi.stockIssueModal,
    stockIssueQty: data.stockPickUi.stockIssueQty,
    setStockIssueQty: data.stockPickUi.setStockIssueQty,
    issueBusy: data.issueBusy,
    addStockPickLine: data.stockPickUi.addStockPickLine,
    closeStockIssue: data.stockPickUi.closeStockIssue,
    itemsModal: data.itemsModal,
    onCloseItemsModal: closeItemsModal,
    proposalNoByPurchase: data.incoming.proposalNoByPurchase,
    itemsByHead: data.incoming.itemsByHead,
    kbH: data.kbH,
    qtyInputByItem: data.qtyInputByItem,
    setQtyInputByItem: data.setQtyInputByItem,
    receivingHeadId: data.receivingHeadId,
    onIncomingItemsSubmit,
    issueDetailsId: data.issueDetailsId,
    issueLinesLoadingId: data.issueLinesLoadingId,
    issueLinesById: data.issueLinesById,
    matNameByCode: data.matNameByCode,
    onCloseIssueDetails: data.reportsUi.closeIssueDetails,
    incomingDetailsId: data.incomingDetailsId,
    incomingLinesLoadingId: data.incomingLinesLoadingId,
    incomingLinesById: data.incomingLinesById,
    onCloseIncomingDetails: closeIncomingDetails,
    reqModal: data.reqModal,
    onCloseReqModal: data.closeReq,
    reqItems: data.reqItems,
    reqItemsLoading: data.reqItemsLoading,
    reqQtyInputByItem: data.reqPickUi.reqQtyInputByItem,
    setReqQtyInputByItem: data.reqPickUi.setReqQtyInputByItem,
    recipientText: data.rec.recipientText,
    addReqPickLine: data.reqPickUi.addReqPickLine,
    submitReqPick: data.submitReqPick,
    reqPick: data.reqPickUi.reqPick,
    removeReqPickLine: data.reqPickUi.removeReqPickLine,
    issueMsg: data.issueMsg,
    pickVisible: !!data.pickModal.what,
    pickTitle,
    pickFilter: data.pickFilter,
    setPickFilter: data.setPickFilter,
    pickOptions,
    onPickOption,
    closePick: data.closePick,
    repPeriodOpen: data.repPeriodOpen,
    closeReportPeriod,
    periodFrom: data.periodFrom,
    periodTo: data.periodTo,
    applyReportPeriod,
    clearReportPeriod,
    repPeriodUi,
    isFioConfirmVisible: data.isFioConfirmVisible,
    warehousemanFio: data.warehousemanFio,
    handleFioConfirm: data.handleFioConfirm,
    isFioLoading: data.isFioLoading,
    warehousemanHistory: data.warehousemanHistory,
    isRecipientModalVisible: data.isRecipientModalVisible,
    recipientSuggestions: data.rec.recipientSuggestions,
    recipientInitialValue: data.rec.recipientText,
    setIsRecipientModalVisible: data.setIsRecipientModalVisible,
    onPickRecipient,
  });

  const tabContentProps: WarehouseTabContentProps = {
    tab: data.tab,
    emptyColor: UI.sub,
    listContentStyle,
    listOnScroll,
    listScrollEventThrottle,
    listRefreshControl,
    incomingData: data.incoming.toReceive,
    onIncomingEndReached,
    renderIncomingItem,
    stockSupported: data.stockSupported,
    stockFiltered: data.stockFiltered,
    renderStockItem,
    objectOpt: data.objectOpt,
    levelOpt: data.levelOpt,
    systemOpt: data.systemOpt,
    zoneOpt: data.zoneOpt,
    onPickObject,
    onPickLevel,
    onPickSystem,
    onPickZone,
    onOpenRecipientModal,
    recipientText: data.rec.recipientText,
    stockSearch: data.stockSearch,
    onStockSearch: data.setStockSearch,
    stockPick: data.stockPickUi.stockPick,
    onRemovePick: data.stockPickUi.removeStockPickLine,
    issueBusy: data.issueBusy,
    onClearStockPick: data.stockPickUi.clearStockPick,
    onSubmitStockPick: data.submitStockPick,
    issueMsg: data.issueMsg,
    reqHeadsData: data.sortedReqHeads,
    onReqEndReached,
    renderReqHeadItem,
    reqHeadsLoading: data.reqHeadsLoading,
    reportsHeaderTopPad: data.HEADER_MAX + 8,
    reportsMode: data.reportsMode,
    onReportsBack,
    onReportsSelectMode,
    reportsOnScroll,
    reportsScrollEventThrottle,
    periodFrom: data.periodFrom,
    periodTo: data.periodTo,
    repStock: data.repStock,
    repMov: data.repMov,
    reportsUi: data.reportsUi,
    onOpenRepPeriod,
    onReportsRefresh,
    onPdfRegisterPress,
    onPdfDocumentPress,
    onPdfMaterialsPress,
    onPdfObjectWorkPress,
    onPdfDayRegisterPress,
    onPdfDayMaterialsPress,
  };

  return { tabContentProps, modalsManagerProps };
}
