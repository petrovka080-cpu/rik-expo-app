import { useCallback, useState } from "react";
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
import { WAREHOUSE_TABS, type Tab } from "../warehouse.types";
import { nz, showErr } from "../warehouse.utils";
import { useWarehousemanFio } from "./useWarehousemanFio";
import { useWarehouseKeyboard } from "./useWarehouseKeyboard";
import { useWarehouseIncomingItemsModal } from "./useWarehouseIncomingItemsModal";
import { useWarehouseModals } from "./useWarehouseModals";
import { useWarehouseSearch } from "./useWarehouseSearch";
import { useWarehouseState } from "./useWarehouseState";
import { useWarehouseReqModalFlow } from "./useWarehouseReqModalFlow";
import { useWarehouseDerived } from "./useWarehouseDerived";
import { useWarehouseReqHeads } from "./useWarehouseReqHeads";
import { useWarehouseReportsData } from "./useWarehouseReportsData";
import { useWarehouseFetchRefs } from "./useWarehouseFetchRefs";
import { useWarehouseReceiveFlow } from "./useWarehouseReceiveFlow";
import { useWarehouseIssueFlow } from "./useWarehouseIssueFlow";
import { useWarehouseStockData } from "./useWarehouseStockData";
import { useWarehouseReqItemsData } from "./useWarehouseReqItemsData";
import { useWarehouseReportState } from "./useWarehouseReportState";

const ORG_NAME = "";
const REQ_PAGE_SIZE = 80;
const TAB_INCOMING = WAREHOUSE_TABS[0] ?? ("\u041A \u043F\u0440\u0438\u0445\u043E\u0434\u0443" as Tab);
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
  const [tab, setTab] = useState<Tab>(TAB_INCOMING);

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
    reqModal,
    setReqModal,
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
  const { reqHeads, reqHeadsLoading, reqRefs, fetchReqHeads } = useWarehouseReqHeads({
    supabase,
    pageSize: REQ_PAGE_SIZE,
  });

  const { reqItems, setReqItems, reqItemsLoading, setReqItemsLoading, fetchReqItems } = useWarehouseReqItemsData({ supabase });
  const { stock, stockSupported, stockCount, fetchStock } = useWarehouseStockData({ supabase });
  const { sortedReqHeads, stockFiltered, matNameByCode } = useWarehouseDerived({
    reqHeads,
    stock,
    stockSearchDeb,
  });

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

  const { callFetchToReceive, callFetchStock, callFetchReqHeads, callFetchReports } = useWarehouseFetchRefs({
    fetchToReceive: incoming.fetchToReceive,
    fetchStock,
    fetchReqHeads,
    fetchReports,
  });
  const { loading, setLoading, refreshing, onRefresh } = useWarehouseState({
    tab,
    fetchToReceive: callFetchToReceive,
    fetchStock: callFetchStock,
    fetchReports: callFetchReports,
    fetchReqHeads: callFetchReqHeads,
    onError: showErr,
  });

  const scope = useWarehouseScope();
  const { objectOpt, levelOpt, systemOpt, zoneOpt, scopeLabel, scopeOpt, pickModal, pickFilter, setPickFilter, closePick, applyPick, setPickModal } = scope;

  const dicts = useWarehouseDicts(supabase, tab);
  const { objectList, levelList, systemList, zoneList, recipientList } = dicts;
  const rec = useWarehouseRecipient({ enabled: isRecipientRequiredTab(tab), recipientList });

  const onTabChange = useCallback((nextTab: Tab) => {
    setTab(nextTab);
    if (isRecipientRequiredTab(nextTab)) setIsRecipientModalVisible(true);
  }, [setIsRecipientModalVisible]);

  const availability = useStockAvailability(stock, matNameByCode);
  const getAvailableByCode = availability.getAvailableByCode;
  const getAvailableByCodeUom = availability.getAvailableByCodeUom;
  const getMaterialNameByCode = availability.getMaterialNameByCode;
  const [issueBusy, setIssueBusy] = useState(false);
  const [issueMsg, setIssueMsg] = useState<{ kind: "error" | "ok" | null; text: string }>({ kind: null, text: "" });

  const reqPickUi = useWarehouseReqPick({ nz, setIssueMsg, getAvailableByCode, getAvailableByCodeUom });
  const stockPickUi = useWarehouseStockPick({ nz, rec, objectOpt, workTypeOpt: scopeOpt, setIssueMsg });
  const { openReq, closeReq } = useWarehouseReqModalFlow({
    supabase,
    reqPickUi,
    setReqModal,
    setReqItems,
    setReqItemsLoading,
    onError: showErr,
  });
  const { submitReqPick, submitStockPick } = useWarehouseIssueFlow({
    supabase,
    recipientText: rec.recipientText,
    objectLabel: String(objectOpt?.label ?? ""),
    scopeLabel,
    warehousemanFio,
    fetchStock,
    fetchReqItems,
    fetchReqHeads: () => fetchReqHeads(),
    getAvailableByCode,
    getAvailableByCodeUom,
    getMaterialNameByCode,
    clearStockPick: stockPickUi.clearStockPick,
    clearReqPick: reqPickUi.clearReqPick,
    clearReqQtyInput: reqPickUi.clearQtyInput,
    reqModalRequestId: reqModal?.request_id,
    reqModalDisplayNo: reqModal?.display_no,
    reqPick: reqPickUi.reqPick,
    reqItems,
    stockPick: stockPickUi.stockPick,
    closeReq,
    setIsRecipientModalVisible,
    setIssueBusy,
    setIssueMsg,
  });

  const { qtyInputByItem, setQtyInputByItem, receiveSelectedForHead } = useWarehouseReceiveFlow({
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
    callFetchReqHeads,
    callFetchReports,
    fetchReqHeads,
    fetchReports,
    setReportsMode,
    setIsRecipientModalVisible,
    reportsMode,
    repStock,
    repMov,
    repIncoming,
    reqHeadsLoading,
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
    reqRefs,
    setItemsModal,
    reportsUi,
    receiveSelectedForHead,
    reqModal,
    reqItems,
    reqItemsLoading,
    reqPickUi,
    stockPickUi,
    issueBusy,
    issueMsg,
    openReq,
    openItemsModal,
    itemsModal,
    kbH,
    qtyInputByItem,
    setQtyInputByItem,
    receivingHeadId,
    onIncomingItemsSubmit: receiveSelectedForHead,
    issueDetailsId,
    issueLinesLoadingId,
    issueLinesById,
    matNameByCode,
    incomingDetailsId,
    incomingLinesLoadingId,
    incomingLinesById,
    closeReq,
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
