import React from "react";

import { useBusyAction } from "../../lib/useBusyAction";
import { useGlobalBusy } from "../../ui/GlobalBusy";
import { useAccountantPersistedFields } from "./accountant.storage";
import { useAccountantRealtimeLifecycle } from "./accountant.realtime.lifecycle";
import { buildAccountantCompositionMetrics } from "./accountant.compositionMetrics";
import { safeAlert, toRpcDateOrNull, getAccountantErrorText } from "./helpers";
import type { Tab } from "./types";
import { TABS } from "./types";
import { useAccountantCompositionActions } from "./useAccountantCompositionActions";
import { useAccountantCompositionCardDocuments } from "./useAccountantCompositionCardDocuments";
import { useAccountantCompositionRenderModels } from "./useAccountantCompositionRenderModels";
import { useAccountantCompositionSelection } from "./useAccountantCompositionSelection";
import { useAccountantCompositionVisibility } from "./useAccountantCompositionVisibility";
import { useAccountantInvoiceForm } from "./useAccountantInvoiceForm";
import { useAccountantScreenChromeModel } from "./useAccountantScreenChromeModel";
import { useAccountantScreenController } from "./useAccountantScreenController";
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
  const viewModel = useAccountantScreenViewModel();
  const chrome = useAccountantScreenChromeModel();
  const selected = useAccountantCompositionSelection({
    cardOpen: viewModel.cardOpen,
    freezeWhileOpen: viewModel.freezeWhileOpen,
    setFreezeWhileOpen: viewModel.setFreezeWhileOpen,
    currentPaymentId: viewModel.currentPaymentId,
    setCurrentPaymentId: viewModel.setCurrentPaymentId,
  });

  const histSearch = React.useDeferredValue(viewModel.histSearchUi);
  const invoice = useAccountantInvoiceForm({
    current: selected.current,
    toRpcDateOrNull,
  });
  const metrics = buildAccountantCompositionMetrics({
    tab: viewModel.tab,
    tabs: { pay: TAB_PAY, part: TAB_PART, paid: TAB_PAID, rework: TAB_REWORK, history: TAB_HISTORY },
    amount: invoice.amount,
    current: selected.current,
    busyKey,
  });
  const controller = useAccountantScreenController({
    tab: viewModel.tab,
    setTab: viewModel.setTab,
    tabHistory: TAB_HISTORY,
    freezeWhileOpen: viewModel.freezeWhileOpen,
    dateFrom: viewModel.dateFrom,
    dateTo: viewModel.dateTo,
    histSearch,
    toRpcDateOrNull,
  });

  useAccountantPersistedFields({
    accountantFio: viewModel.accountantFio,
    bankName: invoice.bankName,
    bik: invoice.bik,
    rs: invoice.rs,
    inn: invoice.inn,
    kpp: invoice.kpp,
    setAccountantFio: viewModel.setAccountantFio,
    setHistSearchUi: viewModel.setHistSearchUi,
    setDateFrom: viewModel.setDateFrom,
    setDateTo: viewModel.setDateTo,
    setBankName: invoice.setBankName,
    setBik: invoice.setBik,
    setRs: invoice.setRs,
    setInn: invoice.setInn,
    setKpp: invoice.setKpp,
  });

  const visibility = useAccountantCompositionVisibility({
    focusedRef: controller.focusedRef,
    setAccountantFio: viewModel.setAccountantFio,
  });
  useAccountantRealtimeLifecycle({
    focusedRef: controller.focusedRef,
    freezeWhileOpen: viewModel.freezeWhileOpen,
    currentTab: viewModel.tab,
    historyTab: TAB_HISTORY,
    refreshCurrentVisibleScope: controller.refreshCurrentVisibleScope,
    isRefreshInFlight: controller.isRealtimeRefreshInFlight,
    onRealtimeNotification: visibility.handleRealtimeNotification,
  });

  const cardDocuments = useAccountantCompositionCardDocuments({
    current: selected.current,
    currentPaymentId: selected.currentPaymentId,
    setCurrentPaymentId: selected.setCurrentPaymentId,
    runAction,
    load: controller.load,
    setCurrent: selected.setCurrent,
    setCardOpen: viewModel.setCardOpen,
    setFreezeWhileOpen: viewModel.setFreezeWhileOpen,
    setInvoiceNo: invoice.setInvoiceNo,
    setInvoiceDate: invoice.setInvoiceDate,
    setSupplierName: invoice.setSupplierName,
    setAmount: invoice.setAmount,
    setNote: invoice.setNote,
    setAllocRows: invoice.setAllocRows,
    setAllocOk: invoice.setAllocOk,
    setAllocSum: invoice.setAllocSum,
    setPayKind: invoice.setPayKind,
    setAccountantFio: viewModel.setAccountantFio,
    supplierName: invoice.supplierName,
    invoiceNo: invoice.invoiceNo,
    invoiceDate: invoice.invoiceDate,
    bankName: invoice.bankName,
    bik: invoice.bik,
    rs: invoice.rs,
    inn: invoice.inn,
    kpp: invoice.kpp,
    gbusy,
    safeAlert,
    getErrorText: getAccountantErrorText,
  });
  const actions = useAccountantCompositionActions({
    current: selected.current,
    amount: invoice.amount,
    accountantFio: viewModel.accountantFio,
    payKind: invoice.payKind,
    note: invoice.note,
    allocRows: invoice.allocRows,
    allocOk: invoice.allocOk,
    purposePrefix: invoice.purposePrefix,
    invoiceNo: invoice.invoiceNo,
    invoiceDate: invoice.invoiceDate,
    setTab: viewModel.setTab,
    load: controller.load,
    closeCard: cardDocuments.closeCard,
    setCurrentPaymentId: selected.setCurrentPaymentId,
    setRows: controller.setRows,
    setAccountantFio: viewModel.setAccountantFio,
    openCard: cardDocuments.openCard,
    safeAlert,
    tabs: { pay: TAB_PAY, part: TAB_PART, paid: TAB_PAID, rework: TAB_REWORK },
  });
  const renderModels = useAccountantCompositionRenderModels({
    openCard: cardDocuments.openCard,
    onOpenHistoryRow: actions.onOpenHistoryRow,
    historyTotalCount: controller.historyTotalCount,
    historyTotalAmount: controller.historyTotalAmount,
    historyCurrency: controller.historyCurrency,
    dateFrom: viewModel.dateFrom,
    dateTo: viewModel.dateTo,
    histSearchUi: viewModel.histSearchUi,
    setHistSearchUi: viewModel.setHistSearchUi,
    setPeriodOpen: viewModel.setPeriodOpen,
    loadHistory: controller.loadHistory,
  });

  return {
    insets: chrome.insets,
    busyKey,
    runAction,
    tab: viewModel.tab,
    setTabWithCachePreview: controller.setTabWithCachePreview,
    histSearchUi: viewModel.histSearchUi,
    setHistSearchUi: viewModel.setHistSearchUi,
    dateFrom: viewModel.dateFrom,
    setDateFrom: viewModel.setDateFrom,
    dateTo: viewModel.dateTo,
    setDateTo: viewModel.setDateTo,
    periodOpen: viewModel.periodOpen,
    setPeriodOpen: viewModel.setPeriodOpen,
    cardOpen: viewModel.cardOpen,
    currentPaymentId: selected.currentPaymentId,
    setCurrentPaymentId: selected.setCurrentPaymentId,
    accountantFio: viewModel.accountantFio,
    setAccountantFio: viewModel.setAccountantFio,
    cardScrollRef: chrome.cardScrollRef,
    payFormReveal: chrome.payFormReveal,
    headerHeight: chrome.headerHeight,
    headerShadow: chrome.headerShadow,
    titleSize: chrome.titleSize,
    subOpacity: chrome.subOpacity,
    HEADER_MAX: chrome.HEADER_MAX,
    onListScroll: chrome.onListScroll,
    onCardScroll: chrome.onCardScroll,
    current: selected.current,
    setCurrent: selected.setCurrent,
    invoiceNo: invoice.invoiceNo,
    setInvoiceNo: invoice.setInvoiceNo,
    invoiceDate: invoice.invoiceDate,
    setInvoiceDate: invoice.setInvoiceDate,
    supplierName: invoice.supplierName,
    setSupplierName: invoice.setSupplierName,
    purposePrefix: invoice.purposePrefix,
    amount: invoice.amount,
    setAmount: invoice.setAmount,
    note: invoice.note,
    setNote: invoice.setNote,
    allocRows: invoice.allocRows,
    setAllocRows: invoice.setAllocRows,
    allocOk: invoice.allocOk,
    setAllocOk: invoice.setAllocOk,
    setAllocSum: invoice.setAllocSum,
    bankName: invoice.bankName,
    setBankName: invoice.setBankName,
    bik: invoice.bik,
    setBik: invoice.setBik,
    rs: invoice.rs,
    setRs: invoice.setRs,
    inn: invoice.inn,
    setInn: invoice.setInn,
    kpp: invoice.kpp,
    setKpp: invoice.setKpp,
    INV_PREFIX: invoice.INV_PREFIX,
    invMM: invoice.invMM,
    setInvMM: invoice.setInvMM,
    invDD: invoice.invDD,
    setInvDD: invoice.setInvDD,
    mmRef: invoice.mmRef,
    ddRef: invoice.ddRef,
    clamp2: invoice.clamp2,
    payKind: invoice.payKind,
    setPayKind: invoice.setPayKind,
    isReadOnlyTab: metrics.isReadOnlyTab,
    isPayActiveTab: metrics.isPayActiveTab,
    payAccent: metrics.payAccent,
    kbTypeNum: chrome.kbTypeNum,
    canPayUi: metrics.canPayUi,
    kbOpen: chrome.kbOpen,
    kbdH: chrome.kbdH,
    scrollInputIntoView: chrome.scrollInputIntoView,
    rows: controller.rows,
    loading: controller.loading,
    refreshing: controller.refreshing,
    inboxLoadingMore: controller.inboxLoadingMore,
    inboxHasMore: controller.inboxHasMore,
    inboxTotalCount: controller.inboxTotalCount,
    historyRows: controller.historyRows,
    historyLoading: controller.historyLoading,
    historyRefreshing: controller.historyRefreshing,
    historyLoadingMore: controller.historyLoadingMore,
    historyHasMore: controller.historyHasMore,
    historyTotalCount: controller.historyTotalCount,
    historyTotalAmount: controller.historyTotalAmount,
    historyCurrency: controller.historyCurrency,
    loadHistory: controller.loadHistory,
    loadMoreInbox: controller.loadMoreInbox,
    loadMoreHistory: controller.loadMoreHistory,
    onRefresh: controller.onRefresh,
    onRefreshHistory: controller.onRefreshHistory,
    bellOpen: visibility.bellOpen,
    setBellOpen: visibility.setBellOpen,
    notifs: visibility.notifs,
    unread: visibility.unread,
    loadNotifs: visibility.loadNotifs,
    markAllRead: visibility.markAllRead,
    accountantHistory: visibility.accountantHistory,
    isFioConfirmVisible: visibility.isFioConfirmVisible,
    isFioLoading: visibility.isFioLoading,
    setIsFioConfirmVisible: visibility.setIsFioConfirmVisible,
    handleFioConfirm: visibility.handleFioConfirm,
    attRows: cardDocuments.attRows,
    attState: cardDocuments.attState,
    attMessage: cardDocuments.attMessage,
    onOpenAttachments: cardDocuments.onOpenAttachments,
    openOneAttachment: cardDocuments.openOneAttachment,
    closeCard: cardDocuments.closeCard,
    onOpenProposalPdf: cardDocuments.onOpenProposalPdf,
    onOpenInvoiceDoc: cardDocuments.onOpenInvoiceDoc,
    onOpenPaymentReport: cardDocuments.onOpenPaymentReport,
    onPayConfirm: actions.onPayConfirm,
    onReturnToBuyer: actions.onReturnToBuyer,
    onOpenHistoryRow: actions.onOpenHistoryRow,
    renderInboxRow: renderModels.renderInboxRow,
    historyHeader: renderModels.historyHeader,
    renderHistoryRow: renderModels.renderHistoryRow,
    isHistoryTab: metrics.isHistoryTab,
  };
}

export type AccountantScreenComposition = ReturnType<typeof useAccountantScreenComposition>;
