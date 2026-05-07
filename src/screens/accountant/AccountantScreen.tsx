import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  ScrollView,
  Platform,
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import ActivePaymentForm from "./components/ActivePaymentForm";
import AccountantSubcontractTab from "./AccountantSubcontractTab";
import { useBusyAction } from "../../lib/useBusyAction";

import PeriodPickerSheet from "../../components/PeriodPickerSheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRevealSection } from "../../lib/useRevealSection";
import { useGlobalBusy } from "../../ui/GlobalBusy";

import {
  type AccountantInboxRow,
} from "../../lib/catalog_api";

import { UI } from "./ui";
import type {
  AccountantInboxUiRow,
  Tab,
  HistoryRow,
  AttachmentRow,
} from "./types";
import { TABS } from "./types";

import {
  SafeView,
  safeAlert,
  toRpcDateOrNull,
  statusFromRaw,
  runNextTick,
} from "./helpers";
import { formatProposalBaseNo, roleBadgeLabel } from "../../lib/format";
import { normalizeRuText } from "../../lib/text/encoding";

import { ReadOnlyPaymentReceipt } from "./components/ReadOnlyReceipt";
import ListRow from "./components/ListRow";
import NotificationsModal from "./components/NotificationsModal";
import CardModal from "./components/CardModal";
import { HistoryHeader, HistoryRowCard } from "./components/HistorySection";
import { AccountantListBlock } from "./components/AccountantListSection";
import WarehouseFioModal from "../warehouse/components/WarehouseFioModal";
import { useAccountantPersistedFields } from "./accountant.storage";
import { useAccountantKeyboard } from "./useAccountantKeyboard";
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
import { AccountantCardContent } from "./components/AccountantCardContent";
import { useAccountantHeaderAnimation } from "./useAccountantHeaderAnimation";
import { useAccountantInvoiceForm } from "./useAccountantInvoiceForm";
import { useAccountantHistoryFlow } from "./useAccountantHistoryFlow";
import { AccountantHeader } from "./components/AccountantHeader";
import RoleScreenLayout from "../../components/layout/RoleScreenLayout";
import { useAccountantScreenViewModel } from "./useAccountantScreenViewModel";

const TAB_PAY: Tab = TABS[0];
const TAB_PART: Tab = TABS[1];
const TAB_PAID: Tab = TABS[2];
const TAB_REWORK: Tab = TABS[3];
const TAB_HISTORY: Tab = TABS[4];
const ruText = (v: unknown, fallback = "") => normalizeRuText(String(v ?? fallback));
const getErrorText = (e: unknown) => {
  const x = e as { message?: string; error_description?: string; details?: string };
  return x?.message ?? x?.error_description ?? x?.details ?? String(e);
};

export function AccountantScreen() {
  const insets = useSafeAreaInsets();
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
  const cardScrollY = useRef(new Animated.Value(0)).current;
  const payFormReveal = useRevealSection(24);
  const cardScrollRef = useRef<ScrollView | null>(null);

  const {
    scrollY,
    headerHeight,
    headerShadow,
    titleSize,
    subOpacity,
    HEADER_MAX,
  } = useAccountantHeaderAnimation();

  const listScrollEvent = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false }),
    [scrollY],
  );
  const cardScrollEvent = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { y: cardScrollY } } }], { useNativeDriver: false }),
    [cardScrollY],
  );

  const onListScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    listScrollEvent(event);
  }, [listScrollEvent]);

  const onCardScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    cardScrollEvent(event);
  }, [cardScrollEvent]);

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

  const kbTypeNum = Platform.OS === "web" ? "default" : "numeric";
  const amountNum = useMemo(() => {
    const v = Number(String(amount || "").replace(",", "."));
    return Number.isFinite(v) ? v : 0;
  }, [amount]);

  const canPayUi = !isReadOnlyTab && !!current?.proposal_id && amountNum > 0 && !busyKey;

  useEffect(() => {
    if (cardOpen || !freezeWhileOpen) return;
    setFreezeWhileOpen(false);
  }, [cardOpen, freezeWhileOpen, setFreezeWhileOpen]);

  const { kbOpen, kbdH, scrollInputIntoView } = useAccountantKeyboard(cardScrollRef as { current: unknown });

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
    getErrorText,
    onBeforeNavigate: closeCard,
  });

  const afterPaymentSync = useAccountantPostPaymentSync({
    current,
    setTab,
    load,
    tabs: { pay: TAB_PAY, part: TAB_PART, paid: TAB_PAID, rework: TAB_REWORK },
  });

  const errText = useCallback((e: unknown) => getErrorText(e), []);

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

  return (
    <SafeView style={{ flex: 1, backgroundColor: UI.bg }}>
      <RoleScreenLayout>
      <AccountantHeader
        headerHeight={headerHeight}
        headerShadow={headerShadow}
        titleSize={titleSize}
        subOpacity={subOpacity}
        tab={tab}
        setTab={setTabWithCachePreview}
        unread={unread}
        rowsCount={isHistoryTab ? historyTotalCount : inboxTotalCount}
        accountantFio={accountantFio}
        onOpenFioModal={() => setIsFioConfirmVisible(true)}
        onBell={() => { setBellOpen(true); void loadNotifs(); }}
        onExcel={() => safeAlert("Excel", "Экспорт Excel для этого раздела будет добавлен.")}
      />

      {tab === "Подряды" ? (
        <AccountantSubcontractTab contentTopPad={HEADER_MAX + 16} />
      ) : (
        <AccountantListBlock
          isHistory={isHistoryTab}
          historyRows={historyRows}
          rows={rows}
          historyHeader={historyHeader}
          historyLoading={historyLoading}
          loading={loading}
          historyRefreshing={historyRefreshing}
          refreshing={refreshing}
          historyLoadingMore={historyLoadingMore}
          loadingMore={inboxLoadingMore}
          historyHasMore={historyHasMore}
          hasMore={inboxHasMore}
          onRefreshHistory={onRefreshHistory}
          onRefresh={onRefresh}
          onEndReachedHistory={loadMoreHistory}
          onEndReached={loadMoreInbox}
          onScroll={onListScroll}
          contentTopPad={HEADER_MAX + 16}
          onRenderHistory={renderHistoryRow}
          onRenderInbox={renderInboxRow}
          uiTextColor={UI.text} uiSubColor={UI.sub}
        />
      )}

      <PeriodPickerSheet
        visible={periodOpen}
        onClose={() => setPeriodOpen(false)}
        initialFrom={dateFrom}
        initialTo={dateTo}
        onClear={() => { setDateFrom(''); setDateTo(''); runNextTick(() => void loadHistory(true)); }}
        onApply={(from, to) => { setDateFrom(from); setDateTo(to); runNextTick(() => void loadHistory(true)); }}
        ui={{ cardBg: UI.cardBg, text: UI.text, sub: UI.sub, border: 'rgba(255,255,255,0.14)', approve: UI.btnApprove, accentBlue: '#3B82F6' }}
      />

      <CardModal
        visible={cardOpen}
        onClose={closeCard}
        insetsTop={insets.top || 0}
        insetsBottom={insets.bottom || 0}
        kbOpen={kbOpen}
        kbdH={kbdH}
        ui={UI}
        busyKey={busyKey}
        isReadOnlyTab={isReadOnlyTab}
        canPayUi={canPayUi}
        headerSubtitle={`${formatProposalBaseNo(current?.proposal_no, String(current?.proposal_id ?? ""))} • ${ruText(current?.supplier || "—")} • счёт ${ruText(current?.invoice_number || "без №")}`}
        onReturnToBuyer={onReturnToBuyer}
        onOpenPdf={onOpenProposalPdf}
        onExcel={() => safeAlert("Excel", "Экспорт Excel для этой карточки будет добавлен.")}
        onPay={onPayConfirm}
        runAction={runAction}
        scrollRef={(r: ScrollView | null) => { payFormReveal.scrollRef.current = r; cardScrollRef.current = r; }}
        onScroll={onCardScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 68 }}
      >
        {isReadOnlyTab ? (
          <ReadOnlyPaymentReceipt
            current={current}
            tab={tab}
            currentPaymentId={currentPaymentId}
            accountantFio={accountantFio}
            note={note}
            bankName={bankName}
            bik={bik}
            rs={rs}
            inn={inn}
            kpp={kpp}
            attRows={attRows}
            attState={attState}
            attMessage={attMessage}
            busyKey={busyKey}
            onRefreshAtt={async () => {
              const pid = String(current?.proposal_id ?? "").trim();
              await onOpenAttachments(pid, { silent: true, force: true });
            }}
            onOpenFile={(f: AttachmentRow) => void openOneAttachment(f)}
            onOpenInvoice={onOpenInvoiceDoc}
            onOpenReport={onOpenPaymentReport}
            invoiceNoDraft={invoiceNo}
            invoiceDateDraft={invoiceDate}
          />
        ) : (
          <>
            <AccountantCardContent
              current={current}
              tab={tab}
              isHist={isHistoryTab}
              busyKey={busyKey}
              attRows={attRows}
              attState={attState}
              attMessage={attMessage}
              currentDisplayStatus={current?.payment_status ?? "К оплате"}
              onRefreshAtt={async () => {
                const pid = String(current?.proposal_id ?? "").trim();
                await onOpenAttachments(pid, { silent: true, force: true });
              }}
              onOpenFile={(f: AttachmentRow) => void openOneAttachment(f)}
              onOpenInvoice={onOpenInvoiceDoc}
              onOpenReport={onOpenPaymentReport}
              formatProposalBaseNo={formatProposalBaseNo}
              roleBadgeLabel={roleBadgeLabel}
              statusFromRaw={statusFromRaw}
              runAction={runAction}
            />
            <View style={{ height: 12 }} />
            <ActivePaymentForm
              busyKey={busyKey}
              isPayActiveTab={isPayActiveTab}
              payAccent={payAccent}
              kbTypeNum={kbTypeNum}
              current={current}
              supplierName={supplierName}
              invoiceNo={invoiceNo}
              invoiceDate={invoiceDate}
              INV_PREFIX={INV_PREFIX}
              invMM={invMM}
              invDD={invDD}
              setSupplierName={setSupplierName}
              setInvoiceNo={setInvoiceNo}
              setInvoiceDate={setInvoiceDate}
              setInvMM={setInvMM}
              setInvDD={setInvDD}
              clamp2={clamp2}
              mmRef={mmRef}
              ddRef={ddRef}
              scrollInputIntoView={scrollInputIntoView}
              accountantFio={accountantFio}
              setAccountantFio={setAccountantFio}
              payKind={payKind}
              setPayKind={setPayKind}
              amount={amount}
              setAmount={setAmount}
              note={note}
              setNote={setNote}
              bankName={bankName}
              setBankName={setBankName}
              bik={bik}
              setBik={setBik}
              rs={rs}
              setRs={setRs}
              inn={inn}
              setInn={setInn}
              kpp={kpp}
              setKpp={setKpp}
              allocRows={allocRows}
              setAllocRows={setAllocRows}
              onAllocStatus={(ok: boolean, sum: number) => { setAllocOk(ok); setAllocSum(sum); }}
            />
          </>
        )}
      </CardModal>

      <NotificationsModal visible={bellOpen} notifs={notifs} onMarkAllRead={markAllRead} onClose={() => setBellOpen(false)} />
      <WarehouseFioModal visible={isFioConfirmVisible} initialFio={accountantFio} onConfirm={handleFioConfirm} loading={isFioLoading} history={accountantHistory} />
      </RoleScreenLayout>
    </SafeView >
  );
}
