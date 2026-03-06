import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import ActivePaymentForm from "../../src/screens/accountant/components/ActivePaymentForm";
import AccountantSubcontractTab from "../../src/screens/accountant/AccountantSubcontractTab";
import { useBusyAction } from "../../src/lib/useBusyAction";

import PeriodPickerSheet from "../../src/components/PeriodPickerSheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRevealSection } from "../../src/lib/useRevealSection";
import { useGlobalBusy } from "../../src/ui/GlobalBusy";

import {
  type AccountantInboxRow,
} from "../../src/lib/catalog_api";

import { UI, S } from "../../src/screens/accountant/ui";
import type {
  AccountantInboxUiRow,
  Tab,
  HistoryRow,
  AttachmentRow,
} from "../../src/screens/accountant/types";
import { TABS } from "../../src/screens/accountant/types";

import {
  SafeView,
  safeAlert,
  toRpcDateOrNull,
  statusFromRaw,
  runNextTick,
} from "../../src/screens/accountant/helpers";
import { formatProposalBaseNo, roleBadgeLabel } from "../../src/lib/format";
import { normalizeRuText } from "../../src/lib/text/encoding";

import { ReadOnlyPaymentReceipt } from "../../src/screens/accountant/components/ReadOnlyReceipt";
import Header from "../../src/screens/accountant/components/Header";
import ListRow from "../../src/screens/accountant/components/ListRow";
import NotificationsModal from "../../src/screens/accountant/components/NotificationsModal";
import CardModal from "../../src/screens/accountant/components/CardModal";
import { HistoryHeader, HistoryRowCard } from "../../src/screens/accountant/components/HistorySection";
import { AccountantListBlock } from "../../src/screens/accountant/components/AccountantListSection";
import WarehouseFioModal from "../../src/screens/warehouse/components/WarehouseFioModal";
import { useAccountantPersistedFields } from "../../src/screens/accountant/accountant.storage";
import { useAccountantKeyboard } from "../../src/screens/accountant/useAccountantKeyboard";
import { useAccountantNotifications } from "../../src/screens/accountant/useAccountantNotifications";
import { useAccountantAttachments } from "../../src/screens/accountant/useAccountantAttachments";
import { useAccountantCardFlow } from "../../src/screens/accountant/useAccountantCardFlow";
import { useAccountantDocuments } from "../../src/screens/accountant/useAccountantDocuments";
import { useAccountantFioConfirm } from "../../src/screens/accountant/useAccountantFioConfirm";
import { useAccountantPostPaymentSync } from "../../src/screens/accountant/useAccountantPostPaymentSync";
import { useAccountantPayActions } from "../../src/screens/accountant/useAccountantPayActions";
import { useAccountantReturnAction } from "../../src/screens/accountant/useAccountantReturnAction";
import { mapHistoryRowToCurrentRow } from "../../src/screens/accountant/accountant.history.service";
import {
  computePayStatus,
  fetchPaidAggByProposal,
  persistInvoiceMetaIfNeeded as persistInvoiceMetaIfNeededService,
} from "../../src/screens/accountant/accountant.payment";
import { useAccountantScreenController } from "../../src/screens/accountant/useAccountantScreenController";

const TAB_PAY: Tab = TABS[0];
const TAB_PART: Tab = TABS[1];
const TAB_PAID: Tab = TABS[2];
const TAB_REWORK: Tab = TABS[3];
const TAB_HISTORY: Tab = TABS[4];
const HISTORY_SEARCH_DEBOUNCE_MS = 350;
const ruText = (v: unknown, fallback = "") => normalizeRuText(String(v ?? fallback));
const getErrorText = (e: unknown) => {
  const x = e as { message?: string; error_description?: string; details?: string };
  return x?.message ?? x?.error_description ?? x?.details ?? String(e);
};

export default function AccountantScreen() {
  const insets = useSafeAreaInsets();
  const gbusy = useGlobalBusy();
  const { busyKey, run: runAction } = useBusyAction({
    timeoutMs: 30000,
    onError: (e) => safeAlert("Ошибка", String(e?.message ?? e)),
  });
  const [tab, setTab] = useState<Tab>(TAB_PAY);
  const cardScrollY = useRef(new Animated.Value(0)).current;
  const payFormReveal = useRevealSection(24);
  const cardScrollRef = useRef<ScrollView | null>(null);

  const HEADER_MAX = 210;
  const HEADER_MIN = 76;
  const HEADER_SCROLL = HEADER_MAX - HEADER_MIN;

  const scrollY = useRef(new Animated.Value(0)).current;
  const clampedY = Animated.diffClamp(scrollY, 0, HEADER_SCROLL);

  const headerHeight = clampedY.interpolate({
    inputRange: [0, HEADER_SCROLL || 1],
    outputRange: [HEADER_MAX, HEADER_MIN],
    extrapolate: 'clamp',
  });

  const titleSize = clampedY.interpolate({
    inputRange: [0, HEADER_SCROLL || 1],
    outputRange: [24, 16],
    extrapolate: 'clamp',
  });

  const subOpacity = clampedY.interpolate({
    inputRange: [0, HEADER_SCROLL || 1],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const headerShadow = clampedY.interpolate({
    inputRange: [0, 10],
    outputRange: [0, 0.12],
    extrapolate: 'clamp',
  });
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
  const [histSearchUi, setHistSearchUi] = useState<string>("");
  const [histSearch, setHistSearch] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  useEffect(() => {
    // Preserve existing debounce for history search input.
    const t = setTimeout(() => {
      setHistSearch(histSearchUi);
    }, HISTORY_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [histSearchUi]);


  const [periodOpen, setPeriodOpen] = useState(false);
  const [current, setCurrent] = useState<AccountantInboxUiRow | null>(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [currentPaymentId, setCurrentPaymentId] = useState<number | null>(null);

  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const purposePrefix = useMemo(() => {
    const invNo = ruText(String((invoiceNo || current?.invoice_number || "без номера") ?? "без номера").trim() || "без номера");
    const invDt = ruText(String((invoiceDate || current?.invoice_date || "без даты") ?? "без даты").trim() || "без даты");
    const supp = ruText(String((supplierName || current?.supplier || "поставщик не указан") ?? "поставщик не указан").trim() || "поставщик не указан");
    return `Оплата по счёту №${invNo} от ${invDt}. Поставщик: ${supp}.`;
  }, [invoiceNo, invoiceDate, supplierName, current]);
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const [allocRows, setAllocRows] = useState<Array<{ proposal_item_id: string; amount: number }>>([]);
  const [allocOk, setAllocOk] = useState(true);
  const [allocSum, setAllocSum] = useState(0);

  const [accountantFio, setAccountantFio] = useState('');
  const [bankName, setBankName] = useState("");
  const [bik, setBik] = useState("");
  const [rs, setRs] = useState("");       // Р В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™Р В Р‹РВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р Р†РІР‚С›РІР‚“РВ Р’В Р вЂ™Р’В Р В Р вЂ Р Р†Р вЂљРЎвЂєР Р†Р вЂљРІР‚њ РВ Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™Р В Р‹РВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р В Р‹РВ Р†РВ РІР‚С™С™
  const [inn, setInn] = useState("");
  const [kpp, setKpp] = useState("");
  const INV_YEAR = new Date().getFullYear();
  const INV_PREFIX = `${INV_YEAR}-`;
  const [invMM, setInvMM] = useState<string>(""); // "01".."12"
  const [invDD, setInvDD] = useState<string>(""); // "01".."31"
  const mmRef = useRef<TextInput | null>(null);
  const ddRef = useRef<TextInput | null>(null);
  const invSyncRef = useRef<0 | 1>(0);
  const clamp2 = (s: string, max: number) => {
    const d = String(s || "").replace(/\D+/g, "").slice(0, 2);
    if (d.length < 2) return d; // Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚СњРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В° Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р В Р‹РВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ў РВ Р’В Р В РІР‚В Р В Р’В Р Р†Р вЂљРЎв„ўР В Р†РВ РІР‚С™Р РЋРЎС™ Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’В
    let n = Number(d);
    if (!Number.isFinite(n)) n = 0;
    if (n < 1) n = 1;
    if (n > max) n = max;
    return String(n).padStart(2, "0");
  };
  // openCard(Р В Р’В Р вЂ™Р’В Р В Р’В Р В РІР‚в„–Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚њРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р В Р‹РВ Р’В Р В РЏ/РВ Р’В Р вЂ™Р’В Р В Р†РВ РІР‚С™Р Р†РІР‚С›РЎС›Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р В Р‹РВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°)
  useEffect(() => {
    if (invSyncRef.current === 1) {
      invSyncRef.current = 0;
      return;
    }

    const v = String(invoiceDate || "").trim();
    const m = v.match(/^\d{4}-(\d{2})-(\d{2})$/);
    if (!m?.[1] || !m?.[2]) return;
    setInvMM((prev) => (prev === m[1] ? prev : m[1]));
    setInvDD((prev) => (prev === m[2] ? prev : m[2]));
  }, [invoiceDate]);
  useEffect(() => {
    const mm = String(invMM || "").replace(/\D+/g, "").slice(0, 2);
    const dd = String(invDD || "").replace(/\D+/g, "").slice(0, 2);
    if (!mm && !dd) {
      if (invoiceDate) {
        invSyncRef.current = 1;
        setInvoiceDate("");
      }
      return;
    }

    const mid = mm ? `${mm}-` : "";
    const next = INV_PREFIX + mid + dd;

    if (next === invoiceDate) return;

    invSyncRef.current = 1;
    setInvoiceDate(next);
  }, [invMM, invDD, invoiceDate, INV_PREFIX]);
  const [payKind, setPayKind] = useState<'bank' | 'cash'>('bank');
  const canAct = true;
  const isReadOnlyTab = tab === TAB_HISTORY || tab === TAB_PAID || tab === TAB_REWORK;
  const isPayActiveTab = tab === TAB_PAY || tab === TAB_PART;
  const payAccent =
    isPayActiveTab && !isReadOnlyTab
      ? {
        borderColor: "rgba(34,197,94,0.55)",
        backgroundColor: "rgba(34,197,94,0.06)",
      }
      : null;
  const kbTypeNum = Platform.OS === "web" ? "default" : "numeric";
  const amountNum = useMemo(() => {
    const v = Number(String(amount || "").replace(",", "."));
    return Number.isFinite(v) ? v : 0;
  }, [amount]);

  const amountOk = amountNum > 0;
  const canPayUi = !isReadOnlyTab && !!current?.proposal_id && amountOk && !busyKey;
  const [freezeWhileOpen, setFreezeWhileOpen] = useState(false);
  const { kbOpen, kbdH, scrollInputIntoView } = useAccountantKeyboard(cardScrollRef as { current: unknown });
  const {
    focusedRef,
    rows,
    setRows,
    loading,
    refreshing,
    historyRows,
    historyLoading,
    historyRefreshing,
    load,
    loadHistory,
    onRefresh,
    onRefreshHistory,
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
  } = useAccountantNotifications({
    focusedRef,
    freezeWhileOpen,
    onNotifReloadList: () => {
      void load();
    },
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
    setAttRows,
    attPidRef,
    attCacheRef,
    onOpenAttachments,
    openOneAttachment,
    onOpenPaymentDocsOrUpload,
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
    onShareCard,
    onOpenProposalSource,
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
  });

  const persistInvoiceMetaIfNeeded = useCallback(async (proposalId: string) => {
    await persistInvoiceMetaIfNeededService({
      proposalId,
      invoiceNo,
      invoiceDate,
      toRpcDateOrNull,
    });
  }, [invoiceNo, invoiceDate]);
  const afterPaymentSync = useAccountantPostPaymentSync({
    current,
    setTab,
    load,
    tabs: {
      pay: TAB_PAY,
      part: TAB_PART,
      paid: TAB_PAID,
      rework: TAB_REWORK,
    },
  });

  const errText = useCallback((e: unknown) => getErrorText(e), []);

  const { onPayConfirm } = useAccountantPayActions({
    canAct,
    current,
    amount,
    accountantFio,
    payKind,
    note,
    allocRows,
    allocOk,
    purposePrefix,
    persistInvoiceMetaIfNeeded,
    afterPaymentSync,
    closeCard,
    setCurrentPaymentId,
    setRows,
    safeAlert,
    errText,
  });

  const onReturnToBuyer = useAccountantReturnAction({
    canAct,
    current,
    note,
    closeCard,
    load: () => load(true),
    setRows,
    safeAlert,
    errText,
  });

  const renderItem = useCallback(
    ({ item }: { item: AccountantInboxRow }) => {
      return <ListRow item={item} onPress={() => openCard(item)} />;
    },
    [openCard]
  );

  const historyHeader = useMemo(
    () => (
      <HistoryHeader
        rows={historyRows}
        dateFrom={dateFrom}
        dateTo={dateTo}
        searchValue={histSearchUi}
        setSearchValue={setHistSearchUi}
        onOpenPeriod={() => setPeriodOpen(true)}
        onRefresh={() => void loadHistory(true)}
        ui={{ text: UI.text, sub: UI.sub, cardBg: UI.cardBg }}
      />
    ),
    [historyRows, dateFrom, dateTo, histSearchUi, loadHistory]
  );

  const onOpenHistoryRow = useCallback(async (item: HistoryRow) => {

    setCurrentPaymentId(Number(item.payment_id));
    setAccountantFio(String(item.accountant_fio ?? "").trim());

    let agg = { total_paid: 0, payments_count: 0, last_paid_at: 0 };
    try { agg = await fetchPaidAggByProposal(String(item.proposal_id)); } catch { }

    const inv = Number(item.invoice_amount ?? 0);
    const st = computePayStatus(null, inv, agg.total_paid);

    const mappedRow = mapHistoryRowToCurrentRow({
      item,
      totalPaid: agg.total_paid,
      paymentsCount: agg.payments_count,
      paymentStatus: st,
    });
    openCard(mappedRow);
  }, [computePayStatus, fetchPaidAggByProposal, openCard]);

  const renderHistoryItem = useCallback(
    ({ item }: { item: HistoryRow }) => (
      <HistoryRowCard item={item} onOpen={onOpenHistoryRow} ui={{ cardBg: UI.cardBg, text: UI.text, sub: UI.sub }} />
    ),
    [onOpenHistoryRow]
  );

  const canOpenInvoice = !!current?.has_invoice;

  const canOpenPayments = (current?.payments_count ?? 0) > 0;
  const currentDisplayStatus = useMemo(() => (current?.payment_status ?? "К оплате"), [current]);

  const isHistoryTab = tab === TAB_HISTORY;

  return (
    <SafeView style={{ flex: 1, backgroundColor: UI.bg }}>

      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          height: headerHeight,
          backgroundColor: UI.cardBg,
          borderBottomWidth: 1,
          borderColor: UI.border,
          paddingTop: Platform.OS === "web" ? 10 : 12,
          paddingBottom: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowRadius: 14,
          shadowOpacity: headerShadow,
          elevation: 6,
        }}
      >
        <Header
          tab={tab}
          setTab={setTabWithCachePreview}

          unread={unread}
          titleSize={titleSize}
          subOpacity={subOpacity}
          rowsCount={tab === TAB_HISTORY ? historyRows.length : rows.length}
          onExcel={() => safeAlert("Excel", "Экспорт Excel для этого раздела будет добавлен.")}
          onBell={async () => {
            setBellOpen(true);
            try { await loadNotifs(); } catch { }
          }}
          onTabPress={() => { }}
          accountantFio={accountantFio}
          onOpenFioModal={() => setIsFioConfirmVisible(true)}
        />

      </Animated.View>

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
          onRefreshHistory={onRefreshHistory}
          onRefresh={onRefresh}
          onScroll={onListScroll}
          contentTopPad={HEADER_MAX + 16}
          onRenderHistory={(row) => renderHistoryItem({ item: row })}
          onRenderInbox={(row) => renderItem({ item: row })}
          uiTextColor={UI.text}
          uiSubColor={UI.sub}
        />
      )}
      <PeriodPickerSheet
        visible={periodOpen}
        onClose={() => setPeriodOpen(false)}
        initialFrom={dateFrom}
        initialTo={dateTo}
        onClear={() => {
          setDateFrom('');
          setDateTo('');
          // Keep ordering so state update applies before forced reload.
          runNextTick(() => {
            void loadHistory(true);
          });
        }}
        onApply={(from, to) => {
          setDateFrom(from);
          setDateTo(to);
          // Keep ordering so state update applies before forced reload.
          runNextTick(() => {
            void loadHistory(true);
          });
        }}
        ui={{
          cardBg: UI.cardBg,
          text: UI.text,
          sub: UI.sub,
          border: 'rgba(255,255,255,0.14)',
          approve: UI.btnApprove,
          accentBlue: '#3B82F6',
        }}
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
        scrollRef={(r: ScrollView | null) => {
          payFormReveal.scrollRef.current = r;
          cardScrollRef.current = r;
        }}
        onScroll={onCardScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 68 }}
      >
        {isReadOnlyTab ? (
          <>
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
            <View style={{ height: 12 }} />
          </>
        ) : (
          <>

            <View style={S.section}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Text style={S.label}>
                  Номер предложения:{" "}
                  <Text style={S.value}>
                    {formatProposalBaseNo(current?.proposal_no, String(current?.proposal_id ?? ""))}
                  </Text>
                </Text>

                <View
                  style={{
                    paddingVertical: 3,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.18)",
                    backgroundColor: "rgba(255,255,255,0.06)",
                  }}
                >
                  <Text style={{ fontWeight: "900", color: UI.text, fontSize: 12 }}>
                    {roleBadgeLabel("A")}
                  </Text>
                </View>
              </View>


              <View style={{ height: 6 }} />

              <Text style={S.label}>
                ID заявки:{" "}
                <Text style={[S.value, { fontFamily: Platform.OS === "web" ? "monospace" : undefined }]}>
                  {current?.proposal_id || "—"}
                </Text>
              </Text>
              <View style={{ height: 8 }} />

              <Text style={S.label}>
                Поставщик: <Text style={S.value}>{ruText(current?.supplier || "—")}</Text>
              </Text>

              <Text style={[S.label, { marginTop: 6 }]}>
                Счёт (инвойс): <Text style={S.value}>{ruText(current?.invoice_number || "—")}</Text> от{" "}
                <Text style={S.value}>{ruText(current?.invoice_date || "—")}</Text>
              </Text>

              <Text style={[S.label, { marginTop: 6 }]}>
                Сумма счёта:{" "}
                <Text style={S.value}>
                  {Number(current?.invoice_amount ?? 0)} {current?.invoice_currency || "KGS"}
                </Text>
              </Text>

              <View style={{ height: 10 }} />

              {(() => {
                const isHist = tab === TAB_HISTORY;
                const st = statusFromRaw(current?.payment_status ?? currentDisplayStatus, isHist);
                return (
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <Text style={S.label}>
                      Статус оплаты: <Text style={S.value}>{st.label}</Text>
                    </Text>
                  </View>
                );
              })()}

              {(() => {
                if (!current?.proposal_id) return null;

                const isHist = tab === TAB_HISTORY;
                const st = statusFromRaw(current?.payment_status ?? currentDisplayStatus, isHist);

                const showInvoice = !!current?.has_invoice;
                const showReport = isHist || st.key === "PART" || st.key === "PAID";

                const files = Array.isArray(attRows) ? attRows : [];
                const busyAtt = busyKey === "att_refresh";

                return (
                  <View style={{ marginTop: 10 }}>

                    <View>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <Text style={{ color: UI.text, fontWeight: "900" }}>Вложения: {files.length}</Text>

                        <Pressable
                          disabled={!!busyKey}
                          onPress={() =>
                            runAction("att_refresh", async () => {
                              const pid = String(current?.proposal_id ?? "").trim();
                              await onOpenAttachments(pid, { silent: true, force: true });
                            })
                          }
                          style={{
                            paddingVertical: 6,
                            paddingHorizontal: 10,
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: "rgba(255,255,255,0.18)",
                            backgroundColor: "rgba(255,255,255,0.06)",
                            opacity: busyKey ? 0.6 : 1,
                          }}
                        >
                          <Text style={{ color: UI.text, fontWeight: "900", fontSize: 12 }}>
                            {busyAtt ? "..." : "Обновить"}
                          </Text>
                        </Pressable>
                      </View>

                      {files.length === 0 ? (
                        <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 8 }}>
                          Вложения не найдены. Добавьте файл (счёт/акт), затем нажмите «Обновить».
                        </Text>
                      ) : (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
                          {files.map((f: AttachmentRow) => (
                            <Pressable
                              key={String(f.id)}
                              disabled={!!busyKey}
                              onPress={() => void openOneAttachment(f)}
                              style={{
                                paddingVertical: 8,
                                paddingHorizontal: 12,
                                borderRadius: 999,
                                borderWidth: 1,
                                borderColor: "rgba(255,255,255,0.18)",
                                backgroundColor: "rgba(255,255,255,0.06)",
                                marginRight: 8,
                                marginBottom: 8,
                                opacity: busyKey ? 0.6 : 1,
                              }}
                            >
                              <Text style={{ color: UI.text, fontWeight: "900" }} numberOfLines={1}>
                                {(f.group_key ? `${f.group_key}: ` : "") + String(f.file_name ?? "file")}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>


                    {showInvoice || showReport ? (
                      <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
                        {showInvoice ? (
                          <Pressable
                            disabled={!!busyKey}
                            onPress={() =>
                              runAction("top_invoice", async () => {
                                await onOpenInvoiceDoc();
                              })
                            }
                            style={{
                              flex: 1,
                              paddingVertical: 10,
                              borderRadius: 14,
                              backgroundColor: "rgba(255,255,255,0.06)",
                              borderWidth: 1,
                              borderColor: "rgba(255,255,255,0.14)",
                              alignItems: "center",
                              justifyContent: "center",
                              opacity: busyKey ? 0.6 : 1,
                            }}
                          >
                            <Text style={{ color: UI.text, fontWeight: "900" }}>Счёт</Text>
                          </Pressable>
                        ) : null}

                        {showReport ? (
                          <Pressable
                            disabled={!!busyKey}
                            onPress={() =>
                              runAction("top_report", async () => {
                                await onOpenPaymentReport();
                              })
                            }
                            style={{
                              flex: 1,
                              paddingVertical: 10,
                              borderRadius: 14,
                              backgroundColor: "rgba(255,255,255,0.06)",
                              borderWidth: 1,
                              borderColor: "rgba(255,255,255,0.14)",
                              alignItems: "center",
                              justifyContent: "center",
                              opacity: busyKey ? 0.6 : 1,
                            }}
                          >
                            <Text style={{ color: UI.text, fontWeight: "900" }}>Отчёт</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                );
              })()}
            </View>

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
              onAllocStatus={(ok: boolean, sum: number) => {
                setAllocOk(ok);
                setAllocSum(sum);
              }}
            />
            <View style={{ height: 12 }} />


          </>
        )}
      </CardModal>


      <NotificationsModal
        visible={bellOpen}
        notifs={notifs}
        onMarkAllRead={markAllRead}
        onClose={() => setBellOpen(false)}
      />

      <WarehouseFioModal
        visible={isFioConfirmVisible}
        initialFio={accountantFio}
        onConfirm={handleFioConfirm}
        loading={isFioLoading}
        history={accountantHistory}
      />

    </SafeView>
  );
}
