import { useCallback, useMemo, useState } from "react";
import { Platform } from "react-native";
import { supabase } from "../../../lib/supabaseClient";
import { useGlobalBusy } from "../../../ui/GlobalBusy";
import { showToast } from "../../../ui/toast";
import { useWarehouseIncoming } from "../warehouse.incoming";
import { useWarehouseRecipient } from "../warehouse.recipient";
import { useWarehouseStockPick } from "../warehouse.stockPick";
import { useWarehouseReqPick } from "../warehouse.reqPick";
import { useWarehouseHeaderApi } from "../components/WarehouseHeader";
import { useWarehouseReports } from "../warehouse.reports";
import { useStockAvailability } from "../warehouse.availability";
import { useWarehousePdf } from "../warehouse.pdfs";
import { useWarehouseDicts } from "../warehouse.dicts";
import { useWarehouseScope } from "../warehouse.scope";
import { WAREHOUSE_TABS, type Tab, type WarehouseStockLike } from "../warehouse.types";
import { nz, showErr } from "../warehouse.utils";
import { useWarehousemanFio } from "./useWarehousemanFio";
import { useWarehouseKeyboard } from "./useWarehouseKeyboard";
import { useWarehouseIncomingItemsModal } from "./useWarehouseIncomingItemsModal";
import { useWarehouseModals } from "./useWarehouseModals";
import { useWarehouseSearch } from "./useWarehouseSearch";
import { useWarehouseState } from "./useWarehouseState";
import { useWarehouseDerived } from "./useWarehouseDerived";
import { useWarehouseReportsData } from "./useWarehouseReportsData";
import { useWarehouseFetchRefs } from "./useWarehouseFetchRefs";
import { useWarehouseReceiveFlow } from "./useWarehouseReceiveFlow";
import { useWarehouseIssueFlow } from "./useWarehouseIssueFlow";
import { useWarehouseStockData } from "./useWarehouseStockData";
import { useWarehouseReportState } from "./useWarehouseReportState";
import { useWarehouseExpenseQueueSlice } from "./useWarehouseExpenseQueueSlice";
import { useWarehouseUiStore } from "../warehouseUi.store";

const ORG_NAME = "";
const REQ_PAGE_SIZE = 80;
const TAB_STOCK_FACT = WAREHOUSE_TABS[1] ?? ("\u0421\u043A\u043B\u0430\u0434 \u0444\u0430\u043A\u0442" as Tab);
const TAB_EXPENSE = WAREHOUSE_TABS[2] ?? ("\u0420\u0430\u0441\u0445\u043E\u0434" as Tab);
const WAREHOUSE_NAME = "\u0421\u043A\u043B\u0430\u0434";

function isRecipientRequiredTab(tab: Tab) {
  return tab === TAB_EXPENSE || tab === TAB_STOCK_FACT;
}

export function useWarehouseScreenData() {
  const busy = useGlobalBusy();
  const notifyInfo = useCallback((title: string, message?: string) => {
    showToast.info(title, message);
  }, []);
  const notifyError = useCallback((title: string, message?: string) => {
    showToast.error(title, message);
  }, []);
  const tab = useWarehouseUiStore((state) => state.tab);
  const setTab = useWarehouseUiStore((state) => state.setTab);

  const incoming = useWarehouseIncoming();
  const { stockSearch, setStockSearch, stockSearchDeb } = useWarehouseSearch();

  const getTodaySixAM = useCallback(() => {
    const d = new Date();
    d.setHours(6, 0, 0, 0);
    return d;
  }, []);

  const isWeb = Platform.OS === "web";
  const {
    warehousemanFio,
    warehousemanHistory,
    isFioConfirmVisible,
    isFioLoading,
    setIsFioConfirmVisible,
    handleFioConfirm,
  } = useWarehousemanFio({ getTodaySixAM, onError: showErr });

  const headerApi = useWarehouseHeaderApi({ isWeb, hasSubRow: !!warehousemanFio });
  const HEADER_MAX = !!warehousemanFio ? 130 : 92;
  const { kbH } = useWarehouseKeyboard();
  const {
    isRecipientModalVisible,
    setIsRecipientModalVisible,
    reportsMode,
    setReportsMode,
    issueDetailsId,
    setIssueDetailsId,
    incomingDetailsId,
    setIncomingDetailsId,
    repPeriodOpen,
    setRepPeriodOpen,
  } = useWarehouseModals();

  const {
    itemsModal,
    setItemsModal,
    openItemsModal,
    receivingHeadId,
    setReceivingHeadId,
  } = useWarehouseIncomingItemsModal();
  const {
    stock,
    stockSupported,
    stockCount,
    stockHasMore,
    stockLoadingMore,
    fetchStock,
    fetchStockNextPage,
  } = useWarehouseStockData({
    supabase,
    search: stockSearchDeb,
  });
  const matNameByCode = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of stock as WarehouseStockLike[]) {
      const code = String(row?.rik_code ?? row?.code ?? row?.material_code ?? "")
        .trim()
        .toUpperCase();
      const name = String(row?.name_human ?? row?.name ?? row?.item_name_ru ?? "").trim();
      if (code && name && !map[code]) {
        map[code] = name;
      }
    }
    return map;
  }, [stock]);

  const {
    issueLinesById,
    setIssueLinesById,
    issueLinesLoadingId,
    setIssueLinesLoadingId,
    incomingLinesById,
    setIncomingLinesById,
    incomingLinesLoadingId,
    setIncomingLinesLoadingId,
    periodFrom,
    setPeriodFrom,
    periodTo,
    setPeriodTo,
  } = useWarehouseReportState();
  const { repStock, repMov, repIssues, repIncoming, fetchReports } = useWarehouseReportsData({
    supabase,
    periodFrom,
    periodTo,
  });
  const reportsUi = useWarehouseReports({
    busy,
    supabase,
    repIssues,
    periodFrom,
    periodTo,
    orgName: ORG_NAME,
    warehouseName: WAREHOUSE_NAME,
    issueLinesById,
    setIssueLinesById,
    issueLinesLoadingId,
    setIssueLinesLoadingId,
    issueDetailsId,
    setIssueDetailsId,
    incomingLinesById,
    setIncomingLinesById,
    incomingLinesLoadingId,
    setIncomingLinesLoadingId,
    incomingDetailsId,
    setIncomingDetailsId,
    nameByCode: matNameByCode,
    repIncoming,
  });

  const pdfActions = useWarehousePdf({
    busy,
    supabase,
    reportsUi,
    reportsMode,
    repIncoming,
    periodFrom,
    periodTo,
    warehousemanFio,
    matNameByCode,
    notifyError,
    orgName: ORG_NAME,
  });
  const { onPdfDocument, onPdfRegister, onPdfMaterials, onPdfObjectWork, onPdfDayRegister, onPdfDayMaterials } = pdfActions;

  const scope = useWarehouseScope();
  const { objectOpt, levelOpt, systemOpt, zoneOpt, scopeLabel, scopeOpt, pickModal, pickFilter, setPickFilter, closePick, applyPick, setPickModal } = scope;

  const dicts = useWarehouseDicts(supabase, tab);
  const { objectList, levelList, systemList, zoneList, recipientList } = dicts;
  const rec = useWarehouseRecipient({ enabled: isRecipientRequiredTab(tab), recipientList });

  const onTabChange = useCallback((nextTab: Tab) => {
    setTab(nextTab);
    if (isRecipientRequiredTab(nextTab)) setIsRecipientModalVisible(true);
  }, [setIsRecipientModalVisible, setTab]);

  const availability = useStockAvailability(stock, matNameByCode);
  const getAvailableByCode = availability.getAvailableByCode;
  const getAvailableByCodeUom = availability.getAvailableByCodeUom;
  const getMaterialNameByCode = availability.getMaterialNameByCode;
  const [issueBusy, setIssueBusy] = useState(false);
  const [issueMsg, setIssueMsg] = useState<{ kind: "error" | "ok" | null; text: string }>({ kind: null, text: "" });

  const reqPickUi = useWarehouseReqPick({ nz, setIssueMsg, getAvailableByCode, getAvailableByCodeUom });
  const stockPickUi = useWarehouseStockPick({ nz, rec, objectOpt, workTypeOpt: scopeOpt, setIssueMsg });
  const expenseQueue = useWarehouseExpenseQueueSlice({
    supabase,
    tab,
    pageSize: REQ_PAGE_SIZE,
    reqPickUi,
    onError: showErr,
  });
  const { sortedReqHeads, stockFiltered } = useWarehouseDerived({
    reqHeads: expenseQueue.reqHeads,
    stock,
    stockSearchDeb,
  });
  const { submitReqPick, submitStockPick } = useWarehouseIssueFlow({
    supabase,
    recipientText: rec.recipientText,
    objectLabel: String(objectOpt?.label ?? ""),
    scopeLabel,
    warehousemanFio,
    fetchStock,
    fetchReqItems: expenseQueue.fetchReqItems,
    fetchReqHeads: () => expenseQueue.refreshExpenseQueue({ force: true, reason: "issue" }),
    getAvailableByCode,
    getAvailableByCodeUom,
    getMaterialNameByCode,
    clearStockPick: stockPickUi.clearStockPick,
    clearReqPick: reqPickUi.clearReqPick,
    clearReqQtyInput: reqPickUi.clearQtyInput,
    reqModalRequestId: expenseQueue.reqModal?.request_id,
    reqModalDisplayNo: expenseQueue.reqModal?.display_no,
    reqPick: reqPickUi.reqPick,
    reqItems: expenseQueue.reqItems,
    stockPick: stockPickUi.stockPick,
    closeReq: expenseQueue.closeReq,
    setIsRecipientModalVisible,
    setIssueBusy,
    setIssueMsg,
  });

  const { callFetchToReceive, callFetchStock, callFetchReports } = useWarehouseFetchRefs({
    fetchToReceive: incoming.fetchToReceive,
    fetchStock,
    fetchReqHeads: expenseQueue.fetchReqHeads,
    fetchReports,
  });
  const { loading, setLoading, refreshing, onRefresh } = useWarehouseState({
    tab,
    fetchToReceive: callFetchToReceive,
    fetchStock: callFetchStock,
    fetchReports: callFetchReports,
    refreshExpenseQueue: () => expenseQueue.refreshExpenseQueue({ force: true, reason: "manual" }),
    onError: showErr,
  });

  const {
    qtyInputByItem,
    setQtyInputByItem,
    receiveSelectedForHead,
    retryReceiveNow,
    receiveStatusByIncomingId,
    activeReceiveStatus,
    canRetryActiveReceive,
  } = useWarehouseReceiveFlow({
    supabase,
    itemsModalIncomingId: itemsModal?.incomingId,
    loadItemsForHead: incoming.loadItemsForHead,
    fetchToReceive: incoming.fetchToReceive,
    fetchStock,
    warehousemanFio,
    setReceivingHeadId,
    setIsFioConfirmVisible,
    setItemsModal,
    notifyInfo,
    notifyError,
    onError: showErr,
  });

  return {
    isWeb,
    tab,
    onTabChange,
    incoming,
    stockCount,
    stockHasMore,
    stockLoadingMore,
    warehousemanFio,
    setIsFioConfirmVisible,
    headerApi,
    HEADER_MAX,
    loading,
    setLoading,
    refreshing,
    onRefresh,
    callFetchToReceive,
    callFetchStock,
    callFetchReports,
    fetchReports,
    fetchStockNextPage,
    setReportsMode,
    setIsRecipientModalVisible,
    reportsMode,
    repStock,
    repMov,
    repIncoming,
    reqHeadsLoading: expenseQueue.reqHeadsLoading,
    reqHeadsFetchingPage: expenseQueue.reqHeadsFetchingPage,
    reqHeadsHasMore: expenseQueue.reqHeadsHasMore,
    sortedReqHeads,
    stockSupported,
    stockFiltered,
    objectOpt,
    levelOpt,
    systemOpt,
    zoneOpt,
    pickModal,
    pickFilter,
    setPickFilter,
    closePick,
    applyPick,
    setPickModal,
    objectList,
    levelList,
    systemList,
    zoneList,
    recipientList,
    rec,
    stockSearch,
    setStockSearch,
    reqRefs: expenseQueue.reqRefs,
    onReqEndReached: expenseQueue.onReqEndReached,
    setItemsModal,
    reportsUi,
    receiveSelectedForHead,
    reqModal: expenseQueue.reqModal,
    reqItems: expenseQueue.reqItems,
    reqItemsLoading: expenseQueue.reqItemsLoading,
    reqPickUi,
    stockPickUi,
    issueBusy,
    issueMsg,
    openReq: expenseQueue.openReq,
    openItemsModal,
    itemsModal,
    kbH,
    qtyInputByItem,
    setQtyInputByItem,
    receivingHeadId,
    onIncomingItemsSubmit: receiveSelectedForHead,
    retryReceiveNow,
    receiveStatusByIncomingId,
    activeReceiveStatus,
    canRetryActiveReceive,
    issueDetailsId,
    issueLinesLoadingId,
    issueLinesById,
    matNameByCode,
    incomingDetailsId,
    incomingLinesLoadingId,
    incomingLinesById,
    closeReq: expenseQueue.closeReq,
    repPeriodOpen,
    periodFrom,
    periodTo,
    setPeriodFrom,
    setPeriodTo,
    setRepPeriodOpen,
    isFioConfirmVisible,
    handleFioConfirm,
    isFioLoading,
    warehousemanHistory,
    isRecipientModalVisible,
    onPdfRegister,
    onPdfDocument,
    onPdfMaterials,
    onPdfObjectWork,
    onPdfDayRegister,
    onPdfDayMaterials,
    submitReqPick,
    submitStockPick,
  };
}

export type WarehouseScreenData = ReturnType<typeof useWarehouseScreenData>;
