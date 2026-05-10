import React, { useCallback, useEffect, useMemo, useState } from "react";

import { useBusyAction } from "../../lib/useBusyAction";
import { useGlobalBusy } from "../../ui/GlobalBusy";
import { type AccountantInboxRow } from "../../lib/catalog_api";
import { UI } from "./ui";
import type { AccountantInboxUiRow, Tab, HistoryRow } from "./types";
import { TABS } from "./types";
import { safeAlert, toRpcDateOrNull, getAccountantErrorText } from "./helpers";
import ListRow from "./components/ListRow";
import { HistoryHeader, HistoryRowCard } from "./components/HistorySection";
import { useAccountantPersistedFields } from "./accountant.storage";
import { useAccountantNotifications } from "./useAccountantNotifications";
import { useAccountantRealtimeLifecycle } from "./accountant.realtime.lifecycle";
import { useAccountantAttachments } from "./useAccountantAttachments";
import { useAccountantCardFlow } from "./useAccountantCardFlow";
import { useAccountantDocuments } from "./useAccountantDocuments";
import { useAccountantFioConfirm } from "./useAccountantFioConfirm";
import { useAccountantPostPaymentSync } from "./useAccountantPostPaymentSync";
import { useAccountantPayActions } from "./useAccountantPayActions";
import { useAccountantReturnAction } from "./useAccountantReturnAction";
import { useAccountantScreenController } from "./useAccountantScreenController";
import { useAccountantInvoiceForm } from "./useAccountantInvoiceForm";
import { useAccountantHistoryFlow } from "./useAccountantHistoryFlow";
import { useAccountantScreenChromeModel } from "./useAccountantScreenChromeModel";
import { useAccountantScreenViewModel } from "./useAccountantScreenViewModel";

const TAB_PAY: Tab = TABS[0];
const TAB_PART: Tab = TABS[1];
const TAB_PAID: Tab = TABS[2];
const TAB_REWORK: Tab = TABS[3];
const TAB_HISTORY: Tab = TABS[4];

export function useAccountantScreenComposition() {
  const gbusy = useGlobalBusy();
  const { busyKey, run: runAction } = useBusyAction({
    timeoutMs: 30000,
    onError: (e) => safeAlert("Ошибка", String(e?.message ?? e)),
  });

  const {
    tab,
    setTab,
    histSearchUi,
    setHistSearchUi,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    periodOpen,
    setPeriodOpen,
    cardOpen,
    setCardOpen,
    currentPaymentId,
    setCurrentPaymentId,
    accountantFio,
    setAccountantFio,
    freezeWhileOpen,
    setFreezeWhileOpen,
  } = useAccountantScreenViewModel();
  const {
    insets,
    cardScrollRef,
    payFormReveal,
    headerHeight,
    headerShadow,
    titleSize,
    subOpacity,
    HEADER_MAX,
    onListScroll,
    onCardScroll,
    kbTypeNum,
    kbOpen,
    kbdH,
    scrollInputIntoView,
  } = useAccountantScreenChromeModel();

  const histSearch = React.useDeferredValue(histSearchUi);
  const [current, setCurrent] = useState<AccountantInboxUiRow | null>(null);

  const {
    invoiceNo, setInvoiceNo,
    invoiceDate, setInvoiceDate,
    supplierName, setSupplierName,
    purposePrefix,
    amount, setAmount,
    note, setNote,
    allocRows, setAllocRows,
    allocOk, setAllocOk,
    setAllocSum,
    bankName, setBankName,
    bik, setBik,
    rs, setRs,
    inn, setInn,
    kpp, setKpp,
    INV_PREFIX,
    invMM, setInvMM,
    invDD, setInvDD,
    mmRef, ddRef,
    clamp2,
    payKind, setPayKind,
  } = useAccountantInvoiceForm({ current, toRpcDateOrNull });

  const isReadOnlyTab = tab === TAB_HISTORY || tab === TAB_PAID || tab === TAB_REWORK;
  const isPayActiveTab = tab === TAB_PAY || tab === TAB_PART;

  const payAccent = isPayActiveTab && !isReadOnlyTab
    ? { borderColor: "rgba(34,197,94,0.55)", backgroundColor: "rgba(34,197,94,0.06)" }
    : null;

  const parsedAmount = Number(String(amount || "").replace(",", "."));
  const amountNum = Number.isFinite(parsedAmount) ? parsedAmount : 0;

  const canPayUi = !isReadOnlyTab && !!current?.proposal_id && amountNum > 0 && !busyKey;

  useEffect(() => {
    if (cardOpen || !freezeWhileOpen) return;
    setFreezeWhileOpen(false);
  }, [cardOpen, freezeWhileOpen, setFreezeWhileOpen]);

  const {
    focusedRef,
    rows,
    setRows,
    loading,
    refreshing,
    inboxLoadingMore,
    inboxHasMore,
    inboxTotalCount,
    historyRows,
    historyLoading,
    historyRefreshing,
    historyLoadingMore,
    historyHasMore,
    historyTotalCount,
    historyTotalAmount,
    historyCurrency,
    load,
    loadMoreInbox,
    loadHistory,
    loadMoreHistory,
    onRefresh,
    onRefreshHistory,
    refreshCurrentVisibleScope,
    isRealtimeRefreshInFlight,
    setTabWithCachePreview,
  } = useAccountantScreenController({
    tab,
    setTab,
    tabHistory: TAB_HISTORY,
    freezeWhileOpen,
    dateFrom,
    dateTo,
    histSearch,
    toRpcDateOrNull,
  });

  useAccountantPersistedFields({
    accountantFio,
    bankName,
    bik,
    rs,
    inn,
    kpp,
    setAccountantFio,
    setHistSearchUi,
    setDateFrom,
    setDateTo,
    setBankName,
    setBik,
    setRs,
    setInn,
    setKpp,
  });

  const {
    bellOpen,
    setBellOpen,
    notifs,
    unread,
    loadNotifs,
    markAllRead,
    handleRealtimeNotification,
  } = useAccountantNotifications({
    focusedRef,
  });

  useAccountantRealtimeLifecycle({
    focusedRef,
    freezeWhileOpen,
    currentTab: tab,
    historyTab: TAB_HISTORY,
    refreshCurrentVisibleScope,
    isRefreshInFlight: isRealtimeRefreshInFlight,
    onRealtimeNotification: handleRealtimeNotification,
  });

  const {
    accountantHistory,
    isFioConfirmVisible,
    isFioLoading,
    setIsFioConfirmVisible,
    handleFioConfirm,
  } = useAccountantFioConfirm({ setAccountantFio });

  const {
    attRows,
    attState,
    attMessage,
    setAttRows,
    setAttState,
    setAttMessage,
    attPidRef,
    attCacheRef,
    onOpenAttachments,
    openOneAttachment,
  } = useAccountantAttachments({
    current,
    runAction,
    safeAlert,
    reloadList: () => load(true),
  });

  const { openCard, closeCard } = useAccountantCardFlow({
    load: () => load(),
    onOpenAttachments,
    attPidRef,
    attCacheRef,
    setAttRows,
    setAttState,
    setAttMessage,
    setCurrent,
    setCardOpen,
    setCurrentPaymentId,
    setFreezeWhileOpen,
    setInvoiceNo,
    setInvoiceDate,
    setSupplierName,
    setAmount,
    setNote,
    setAllocRows,
    setAllocOk,
    setAllocSum,
    setPayKind,
    setAccountantFio,
  });

  const {
    onOpenProposalPdf,
    onOpenInvoiceDoc,
    onOpenPaymentReport,
  } = useAccountantDocuments({
    current,
    currentPaymentId,
    setCurrentPaymentId,
    supplierName,
    invoiceNo,
    invoiceDate,
    bankName,
    bik,
    rs,
    inn,
    kpp,
    gbusy,
    safeAlert,
    getErrorText: getAccountantErrorText,
    onBeforeNavigate: closeCard,
  });

  const afterPaymentSync = useAccountantPostPaymentSync({
    current,
    setTab,
    load,
    tabs: { pay: TAB_PAY, part: TAB_PART, paid: TAB_PAID, rework: TAB_REWORK },
  });

  const errText = useCallback((e: unknown) => getAccountantErrorText(e), []);

  const { onPayConfirm } = useAccountantPayActions({
    canAct: true,
    current,
    amount,
    accountantFio,
    payKind,
    note,
    allocRows,
    allocOk,
    purposePrefix,
    afterPaymentSync,
    closeCard,
    setCurrentPaymentId,
    setRows,
    safeAlert,
    errText,
    invoiceNumber: invoiceNo,
    invoiceDate,
    invoiceCurrency: current?.invoice_currency ?? "KGS",
  });

  const onReturnToBuyer = useAccountantReturnAction({
    canAct: true,
    current,
    note,
    closeCard,
    load: () => load(true),
    setRows,
    safeAlert,
    errText,
  });

  const { onOpenHistoryRow } = useAccountantHistoryFlow({
    setCurrentPaymentId,
    setAccountantFio,
    openCard,
    safeAlert,
    errText,
  });

  const renderInboxRow = useCallback(
    (item: AccountantInboxRow) => <ListRow item={item} onPress={() => openCard(item)} />,
    [openCard]
  );

  const historyHeader = useMemo(
    () => (
      <HistoryHeader
        totalCount={historyTotalCount}
        totalAmount={historyTotalAmount}
        totalCurrency={historyCurrency}
        dateFrom={dateFrom}
        dateTo={dateTo}
        searchValue={histSearchUi}
        setSearchValue={setHistSearchUi}
        onOpenPeriod={() => setPeriodOpen(true)}
        onRefresh={() => void loadHistory(true)}
        ui={{ text: UI.text, sub: UI.sub, cardBg: UI.cardBg }}
      />
    ),
    [
      historyTotalCount,
      historyTotalAmount,
      historyCurrency,
      dateFrom,
      dateTo,
      histSearchUi,
      loadHistory,
      setHistSearchUi,
      setPeriodOpen,
    ]
  );

  const renderHistoryRow = useCallback(
    (item: HistoryRow) => (
      <HistoryRowCard item={item} onOpen={onOpenHistoryRow} ui={{ cardBg: UI.cardBg, text: UI.text, sub: UI.sub }} />
    ),
    [onOpenHistoryRow]
  );

  const isHistoryTab = tab === TAB_HISTORY;

  return {
    insets,
    busyKey,
    runAction,
    tab,
    setTabWithCachePreview,
    histSearchUi,
    setHistSearchUi,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    periodOpen,
    setPeriodOpen,
    cardOpen,
    currentPaymentId,
    setCurrentPaymentId,
    accountantFio,
    setAccountantFio,
    cardScrollRef,
    payFormReveal,
    headerHeight,
    headerShadow,
    titleSize,
    subOpacity,
    HEADER_MAX,
    onListScroll,
    onCardScroll,
    current,
    setCurrent,
    invoiceNo,
    setInvoiceNo,
    invoiceDate,
    setInvoiceDate,
    supplierName,
    setSupplierName,
    purposePrefix,
    amount,
    setAmount,
    note,
    setNote,
    allocRows,
    setAllocRows,
    allocOk,
    setAllocOk,
    setAllocSum,
    bankName,
    setBankName,
    bik,
    setBik,
    rs,
    setRs,
    inn,
    setInn,
    kpp,
    setKpp,
    INV_PREFIX,
    invMM,
    setInvMM,
    invDD,
    setInvDD,
    mmRef,
    ddRef,
    clamp2,
    payKind,
    setPayKind,
    isReadOnlyTab,
    isPayActiveTab,
    payAccent,
    kbTypeNum,
    canPayUi,
    kbOpen,
    kbdH,
    scrollInputIntoView,
    rows,
    loading,
    refreshing,
    inboxLoadingMore,
    inboxHasMore,
    inboxTotalCount,
    historyRows,
    historyLoading,
    historyRefreshing,
    historyLoadingMore,
    historyHasMore,
    historyTotalCount,
    historyTotalAmount,
    historyCurrency,
    loadHistory,
    loadMoreInbox,
    loadMoreHistory,
    onRefresh,
    onRefreshHistory,
    bellOpen,
    setBellOpen,
    notifs,
    unread,
    loadNotifs,
    markAllRead,
    accountantHistory,
    isFioConfirmVisible,
    isFioLoading,
    setIsFioConfirmVisible,
    handleFioConfirm,
    attRows,
    attState,
    attMessage,
    onOpenAttachments,
    openOneAttachment,
    closeCard,
    onOpenProposalPdf,
    onOpenInvoiceDoc,
    onOpenPaymentReport,
    onPayConfirm,
    onReturnToBuyer,
    onOpenHistoryRow,
    renderInboxRow,
    historyHeader,
    renderHistoryRow,
    isHistoryTab,
  };
}

export type AccountantScreenComposition = ReturnType<typeof useAccountantScreenComposition>;
