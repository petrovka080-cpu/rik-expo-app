import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Platform,
  Alert,
  Animated,
  Keyboard,
  Share,
  findNodeHandle,
} from "react-native";
import ActivePaymentForm from "../../src/screens/accountant/components/ActivePaymentForm";
import AccountantSubcontractTab from "../../src/screens/accountant/AccountantSubcontractTab";
import { useBusyAction } from "../../src/lib/useBusyAction";

import PeriodPickerSheet from "../../src/components/PeriodPickerSheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../src/lib/supabaseClient";
import { useFocusEffect } from "expo-router";

import { useRevealSection } from "../../src/lib/useRevealSection";
import { useGlobalBusy } from "../../src/ui/GlobalBusy";
import { runPdfTop } from "../../src/lib/pdfRunner";

import {
  exportProposalPdf,
  exportPaymentOrderPdf,
  listAccountantInbox,
  type AccountantInboxRow,
  accountantReturnToBuyer,
  notifList,
  notifMarkRead,
} from "../../src/lib/catalog_api";

import { uploadProposalAttachment, openAttachment } from "../../src/lib/files";

import * as Haptics from "expo-haptics";
// @ts-ignore
import { initDing, playDing as playDingSound, unloadDing } from "../../src/lib/notify";

import { UI, S } from "../../src/screens/accountant/ui";
import type {
  Tab,
  HistoryRow,
  AttachmentRow,
  NotificationRow,
} from "../../src/screens/accountant/types";
import { TABS } from "../../src/screens/accountant/types";
import { filterRowsByTab, sortRowsByTab } from "../../src/screens/accountant/accountant.tabFilter";

import {
  SafeView,
  safeAlert,
  toRpcDateOrNull,
  rowsShallowEqual,
  statusFromRaw,
  openSignedUrlAcc,
  withTimeout,
} from "../../src/screens/accountant/helpers";
import { formatProposalBaseNo, roleBadgeLabel } from "../../src/lib/format";
import {
  crossStorageGet,
  crossStorageSet,
  migrateCrossStorageKeysOnce,
} from "../../src/lib/crossStorage";
import { normalizeRuText } from "../../src/lib/text/encoding";

import { ReadOnlyPaymentReceipt } from "../../src/screens/accountant/components/ReadOnlyReceipt";
import Header from "../../src/screens/accountant/components/Header";
import ListRow from "../../src/screens/accountant/components/ListRow";
import NotificationsModal from "../../src/screens/accountant/components/NotificationsModal";
import CardModal from "../../src/screens/accountant/components/CardModal";
import { HistoryHeader, HistoryRowCard } from "../../src/screens/accountant/components/HistorySection";
import { AccountantListBlock } from "../../src/screens/accountant/components/AccountantListSection";

const TAB_PAY: Tab = TABS[0];
const TAB_PART: Tab = TABS[1];
const TAB_PAID: Tab = TABS[2];
const TAB_REWORK: Tab = TABS[3];
const TAB_HISTORY: Tab = TABS[4];
const ruText = (v: unknown, fallback = "") => normalizeRuText(String(v ?? fallback));

export default function AccountantScreen() {
  const insets = useSafeAreaInsets();
  const gbusy = useGlobalBusy();
  const { busyKey, run: runAction } = useBusyAction({
    timeoutMs: 30000,
    onError: (e) => safeAlert("Ошибка", String(e?.message ?? e)),
  });
  const [tab, setTab] = useState<Tab>(TAB_PAY);
  const tabRef = useRef<Tab>(TAB_PAY);
  const lastTabLoadRef = useRef<Tab | null>(null);

  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);
  const [rows, setRows] = useState<AccountantInboxRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const focusedRef = useRef(false);
  const lastKickListRef = useRef(0);
  const lastKickHistRef = useRef(0);
  const cardScrollY = useRef(new Animated.Value(0)).current;
  const payFormReveal = useRevealSection(24);
  const cardScrollRef = useRef<any>(null);

  const inFlightRef = useRef(false);
  const loadSeqRef = useRef(0);
  const inflightKeyRef = useRef<string | null>(null);
  const lastLoadedKeyRef = useRef<string | null>(null);
  const cacheByTabRef = useRef<Record<string, AccountantInboxRow[]>>({});
  const pendingTabRef = useRef<Tab | null>(null);

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
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefreshing, setHistoryRefreshing] = useState(false);
  const [histSearchUi, setHistSearchUi] = useState<string>("");
  const [histSearch, setHistSearch] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  useEffect(() => {
    const t = setTimeout(() => {
      setHistSearch(histSearchUi);
    }, 350);
    return () => clearTimeout(t);
  }, [histSearchUi]);


  const [periodOpen, setPeriodOpen] = useState(false);
  const [current, setCurrent] = useState<AccountantInboxRow | null>(null);
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
  const [attRows, setAttRows] = useState<AttachmentRow[]>([]);
  const attPidRef = useRef<string | null>(null);
  const attLoadingRef = useRef(false);
  const attCacheRef = useRef<Record<string, { ts: number; rows: AttachmentRow[] }>>({});
  const ATT_TTL_MS = 2 * 60 * 1000;
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
  const [kbdH, setKbdH] = useState(0);
  const [kbOpen, setKbOpen] = useState(false);

  const scrollInputIntoView = useCallback((e: any, extra?: number) => {
    if (Platform.OS === "web") return;

    const node = findNodeHandle((e as any)?.target);
    if (!node) return;

    const EXTRA = Number.isFinite(extra as any)
      ? (extra as number)
      : (Platform.OS === "ios" ? 190 : 160);

    setTimeout(() => {
      try {
        const responder =
          cardScrollRef.current?.getScrollResponder?.() ?? cardScrollRef.current;

        responder?.scrollResponderScrollNativeHandleToKeyboard?.(node, EXTRA, true);
      } catch { }
    }, 60);
  }, []);
  useEffect(() => {
    if (Platform.OS === "web") return;

    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const s1 = Keyboard.addListener(showEvt as any, (e: any) => {
      setKbOpen(true);
      const h = Number(e?.endCoordinates?.height ?? 0);
      setKbdH(h);
    });

    const s2 = Keyboard.addListener(hideEvt as any, () => {
      setKbOpen(false);
      setKbdH(0);
    });

    return () => {
      try { s1.remove(); } catch { }
      try { s2.remove(); } catch { }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await migrateCrossStorageKeysOnce({
        markerKey: "acc_storage_migrated_v1",
        pairs: [
          { from: "accountant_fio", to: "acc_fio" },
          { from: "accountant_hist_search", to: "acc_hist_search" },
          { from: "accountant_hist_date_from", to: "acc_hist_date_from" },
          { from: "accountant_hist_date_to", to: "acc_hist_date_to" },
        ],
      });

      const saved = (await crossStorageGet("acc_fio")) || "";
      if (!cancelled && saved.trim()) setAccountantFio(saved.trim());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const q = String((await crossStorageGet("acc_hist_search")) || "");
      const df = String((await crossStorageGet("acc_hist_date_from")) || "");
      const dt = String((await crossStorageGet("acc_hist_date_to")) || "");

      if (cancelled) return;
      if (q) setHistSearchUi(q);
      if (df) setDateFrom(df);
      if (dt) setDateTo(dt);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const b = (await crossStorageGet("acc_bankName")) || "";
      const bik0 = (await crossStorageGet("acc_bik")) || "";
      const rs0 = (await crossStorageGet("acc_rs")) || "";
      const inn0 = (await crossStorageGet("acc_inn")) || "";
      const kpp0 = (await crossStorageGet("acc_kpp")) || "";

      if (cancelled) return;
      if (b) setBankName(b);
      if (bik0) setBik(bik0);
      if (rs0) setRs(rs0);
      if (inn0) setInn(inn0);
      if (kpp0) setKpp(kpp0);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const v = (accountantFio || '').trim();
    if (!v) return;
    void crossStorageSet("acc_fio", v);
  }, [accountantFio]);

  useEffect(() => {
    void crossStorageSet("acc_bankName", String(bankName || ""));
    void crossStorageSet("acc_bik", String(bik || ""));
    void crossStorageSet("acc_rs", String(rs || ""));
    void crossStorageSet("acc_inn", String(inn || ""));
    void crossStorageSet("acc_kpp", String(kpp || ""));
  }, [bankName, bik, rs, inn, kpp]);

  const triedRpcOkRef = useRef<boolean>(true);
  const loadHistory = useCallback(async (force?: boolean) => {
    if (!focusedRef.current) return;

    const now = Date.now();
    if (!force && now - lastKickHistRef.current < 900) return;
    lastKickHistRef.current = now;

    setHistoryLoading(true);
    try {
      const { data, error } = await supabase.rpc('list_accountant_payments_history_v2', {
        p_date_from: toRpcDateOrNull(dateFrom),
        p_date_to: toRpcDateOrNull(dateTo),
        p_search: histSearch?.trim() ? histSearch.trim() : null,
        p_limit: 300,
      });

      if (error) throw error;
      const arr = Array.isArray(data) ? (data as any[]) : [];
      arr.sort((a, b) => {
        const ta = Date.parse(String(a.paid_at ?? a.created_at ?? 0)) || 0;
        const tb = Date.parse(String(b.paid_at ?? b.created_at ?? 0)) || 0;
        return tb - ta;
      });
      setHistoryRows(arr as any);

    } catch (e: any) {
      console.error('[history load]', e?.message ?? e);
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [dateFrom, dateTo, histSearch]);

  const lastHistKeyRef = useRef<string>("");

  useEffect(() => {
    if (!focusedRef.current) return;
    if (freezeWhileOpen) return;
    if (tabRef.current !== TAB_HISTORY) return;

    const key = `from=${String(dateFrom || "")}|to=${String(dateTo || "")}|q=${String(histSearch || "")}`;

    if (lastHistKeyRef.current === key) return;
    lastHistKeyRef.current = key;

    const t = setTimeout(() => {
      void loadHistory(true);
    }, 200);

    return () => clearTimeout(t);
  }, [dateFrom, dateTo, histSearch, freezeWhileOpen, loadHistory]);


  const onRefreshHistory = useCallback(async () => {
    setHistoryRefreshing(true);
    try { await loadHistory(); } finally { setHistoryRefreshing(false); }
  }, [loadHistory]);

  const load = useCallback(async (force?: boolean, tabOverride?: Tab) => {
    const t = (tabOverride ?? tabRef.current) as Tab;

    if (!focusedRef.current) return;
    if (freezeWhileOpen) return;

    const key = `tab:${t}`;
    const now = Date.now();
    const cached = cacheByTabRef.current[t];
    if (Array.isArray(cached)) {
      setRows((prev) => (rowsShallowEqual(prev, cached) ? prev : cached));
    } else {
      setRows((prev) => (prev.length ? [] : prev));
    }
    if (!force && inflightKeyRef.current === key) return;
    if (!force && lastLoadedKeyRef.current === key && (now - lastKickListRef.current) < 900) return;
    if (!force && (now - lastKickListRef.current) < 450) return;

    lastKickListRef.current = now;
    inflightKeyRef.current = key;
    inFlightRef.current = true;
    setLoading(!(Array.isArray(cached) && cached.length > 0));
    const seq = ++loadSeqRef.current;

    try {
      let data: AccountantInboxRow[] = [];
      let rpcFailed = false;
      if (triedRpcOkRef.current) {
        try {
          const list = await listAccountantInbox(t);
          triedRpcOkRef.current = true;
          if (Array.isArray(list)) data = list;
        } catch (e: any) {
          rpcFailed = true;
          const msg = String(e?.message || e);
          if (msg.includes("Could not find") || msg.includes("/rpc/list_accountant_inbox") || msg.includes("404")) {
            triedRpcOkRef.current = false;
          }
        }
      }

      if (rpcFailed || !triedRpcOkRef.current) {
        const { data: props } = await supabase
          .from("proposals")
          .select("id, proposal_no, display_no, id_short, status, payment_status, invoice_number, invoice_date, invoice_amount, invoice_currency, supplier, sent_to_accountant_at")
          .not("sent_to_accountant_at", "is", null)
          .or("payment_status.is.null,payment_status.eq.Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†РІР‚С›РЎС› Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ,payment_status.eq.Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎвЂќР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р В Р‹РВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›,payment_status.ilike.Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В§Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р В Р‹РВ Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›%,payment_status.ilike.Р В Р’В Р вЂ™Р’В Р В Р Р‹Р РЋРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В° Р В Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В±Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚СњРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ%")
          .order("sent_to_accountant_at", { ascending: false, nullsFirst: false });


        let tmp: AccountantInboxRow[] = [];

        if (Array.isArray(props) && props.length) {
          const ids = props.map((p: any) => String(p.id));

          const paidMap = new Map<string, { total_paid: number; payments_count: number }>();
          const lastPaidAtMap = new Map<string, number>();
          const itemsSumMap = new Map<string, number>();

          if (ids.length) {
            const { data: pays, error: paysErr } = await supabase
              .from("proposal_payments")
              .select("proposal_id, amount, paid_at, created_at")
              .in("proposal_id", ids);

            if (!paysErr && Array.isArray(pays)) {
              for (const pay of pays as any[]) {
                const k = String(pay.proposal_id);
                const prev = paidMap.get(k) ?? { total_paid: 0, payments_count: 0 };
                prev.total_paid += Number(pay.amount ?? 0);
                prev.payments_count += 1;
                paidMap.set(k, prev);

                const tt = Date.parse(String(pay.paid_at ?? pay.created_at ?? "")) || 0;
                const old = lastPaidAtMap.get(k) ?? 0;
                if (tt > old) lastPaidAtMap.set(k, tt);
              }
            }

            const { data: items, error: itemsErr } = await supabase
              .from("proposal_items")
              .select("proposal_id, qty, price")
              .in("proposal_id", ids);

            if (!itemsErr && Array.isArray(items)) {
              for (const it of items as any[]) {
                const pid = String(it.proposal_id);
                const qty = Number(it.qty ?? 0);
                const price = Number(it.price ?? 0);
                itemsSumMap.set(pid, (itemsSumMap.get(pid) ?? 0) + qty * price);
              }
            }
          }

          let haveInvoice = new Set<string>();
          if (ids.length) {
            const q = await supabase
              .from("proposal_attachments")
              .select("proposal_id")
              .eq("group_key", "invoice")
              .in("proposal_id", ids);

            if (!q.error && Array.isArray(q.data)) {
              haveInvoice = new Set(q.data.map((r: any) => String(r.proposal_id)));
            }
          }

          tmp = (props as any[]).map((p: any) => {
            const agg = paidMap.get(String(p.id));
            const calcSum = itemsSumMap.get(String(p.id)) ?? 0;
            const invoiceSum = Number(p.invoice_amount ?? 0) > 0 ? Number(p.invoice_amount) : calcSum;
            const paid = agg ? agg.total_paid : 0;

            const raw = String(p.payment_status ?? p.status ?? "").toLowerCase();
            let payStatus: string;
            if (raw.startsWith("Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В° Р В Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В±Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚СњРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ")) payStatus = "Р В Р’В Р вЂ™Р’В Р В Р Р‹Р РЋРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В° Р В Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В±Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚СњРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ";
            else if (paid <= 0) payStatus = "Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†РІР‚С›РЎС› Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ";
            else if (invoiceSum - paid > 0) payStatus = "Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В§Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р В Р‹РВ Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС› Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р В Р‹РВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›";
            else payStatus = "Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎвЂќР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р В Р‹РВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›";

            return {
              proposal_id: String(p.id),
              proposal_no: (p as any).proposal_no ?? (p as any).display_no ?? null,
              id_short: (p as any).id_short ?? null,

              supplier: p.supplier ?? null,
              invoice_number: p.invoice_number ?? null,
              invoice_date: p.invoice_date ?? null,
              invoice_amount: (p.invoice_amount ?? (calcSum > 0 ? calcSum : null)),
              invoice_currency: p.invoice_currency ?? "KGS",
              payment_status: payStatus,
              total_paid: agg ? agg.total_paid : 0,
              payments_count: agg ? agg.payments_count : 0,
              has_invoice: haveInvoice.has(String(p.id)),
              sent_to_accountant_at: p.sent_to_accountant_at ?? null,
              last_paid_at: lastPaidAtMap.get(String(p.id)) ?? 0,
            } as any;

          });

          data = tmp;
        } else {
          data = [];
        }
      }

      const filtered = filterRowsByTab(data || [], t);
      const sorted: any[] = sortRowsByTab(filtered as any[], t);

      if (seq !== loadSeqRef.current) return;
      if (t !== tabRef.current) return;

      cacheByTabRef.current[t] = sorted as any;
      setRows((prev) => (rowsShallowEqual(prev, sorted as any) ? prev : (sorted as any)));
      lastLoadedKeyRef.current = key;
    } catch (e: any) {
      console.error("[accountant load]", e?.message ?? e);
    } finally {
      if (seq === loadSeqRef.current && t === tabRef.current) {
        setLoading(false);
      }
      inFlightRef.current = false;
      inflightKeyRef.current = null;


      const next = pendingTabRef.current;
      if (next && next !== tabRef.current && focusedRef.current && !freezeWhileOpen) {
        pendingTabRef.current = null;
        setTab(next);
        setTimeout(() => { void load(true, next); }, 0);
      } else {
        pendingTabRef.current = null;
      }
    }
  }, [freezeWhileOpen, rowsShallowEqual]);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      lastTabLoadRef.current = tabRef.current;
      if (tabRef.current !== TAB_HISTORY) {
        const cached = cacheByTabRef.current[tabRef.current];
        if (Array.isArray(cached)) setRows(cached);
      }
      if (tabRef.current === TAB_HISTORY) {
        void loadHistory(true);
      } else {
        void load(true, tabRef.current);
      }
      return () => {
        focusedRef.current = false;
      };
    }, [load, loadHistory])
  );

  useEffect(() => {
    if (!focusedRef.current) return;
    if (freezeWhileOpen) return;

    if (lastTabLoadRef.current === tab) return;
    lastTabLoadRef.current = tab;

    if (tab === TAB_HISTORY) {
      lastHistKeyRef.current = "";

      setTimeout(() => {
        void loadHistory(true);
      }, 0);
    } else {
      setTimeout(() => {
        void load(true, tab);
      }, 0);
    }

  }, [tab, freezeWhileOpen, load, loadHistory]);
  const onRefresh = useCallback(async () => { setRefreshing(true); try { await load(); } finally { setRefreshing(false); } }, [load]);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs] = useState<NotificationRow[]>([]);
  const unread = notifs.length;
  const loadNotifs = useCallback(async () => {
    if (!focusedRef.current) return;
    try {
      const list = await notifList('accountant', 20);
      setNotifs(Array.isArray(list) ? list : []);
    } catch { }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return; // Р В Р’В Р В РІР‚В Р В Р Р‹РЎв„ўРВ Р†РВ РІР‚С™Р вЂ™Р’В¦ WEB: Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚њРВ Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В·Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’В mp3 Р В Р’В Р В РІР‚В Р В Р†РВ РІР‚С™Р вЂ™Р’В Р В Р†РВ РІР‚С™Р Р†РІР‚С›РЎС› Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ў 416 РВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚њРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В 

    let mounted = true;
    (async () => {
      try { await initDing(); } catch { }
    })();

    return () => {
      if (!mounted) return;
      mounted = false;
      try { unloadDing(); } catch { }
    };
  }, []);


  const playDing = useCallback(async () => {
    try { await playDingSound(); } catch { }
    try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch { }
  }, []);

  const markAllRead = useCallback(async () => {
    try { await notifMarkRead('accountant'); setNotifs([]); } catch { }
    setBellOpen(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const ch = supabase
        .channel("notif-accountant-rt")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: "role=eq.accountant" },
          (payload: { new?: unknown }) => {
            if (!focusedRef.current) return;

            const n = (payload?.new ?? {}) as NotificationRow;
            if (n?.role !== "accountant") return;

            setNotifs((prev) => [n, ...prev].slice(0, 20));
            playDing();

            if (Platform.OS !== "web") {
              if (!freezeWhileOpen) load();
            }
          }
        )
        .subscribe();

      return () => {
        try {
          supabase.removeChannel(ch);
        } catch { }
      };
    }, [playDing, load, freezeWhileOpen])
  );

  const closeCard = useCallback(() => {
    Keyboard.dismiss();
    setCardOpen(false);
    setCurrent(null);
    setCurrentPaymentId(null);
    setFreezeWhileOpen(false);

    attPidRef.current = null;

    setTimeout(() => { load(); }, 0);
  }, [load]);

  const fetchLastPaymentIdByProposal = useCallback(async (proposalId: string): Promise<number | null> => {
    const pid = String(proposalId || "").trim();
    if (!pid) return null;

    const { data, error } = await supabase
      .from("proposal_payments")
      .select("id, paid_at, created_at")
      .eq("proposal_id", pid)
      .order("paid_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false })
      .limit(1);

    if (error) return null;

    const row = Array.isArray(data) ? data[0] : null;
    const n = Number((row as any)?.id ?? 0);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, []);

  const onOpenProposalPdf = useCallback(async () => {
    const pid = String(current?.proposal_id ?? '').trim();
    if (!pid) return;

    await runPdfTop({
      busy: gbusy,
      supabase,
      key: `pdf:acc:prop:${pid}`,
      label: "Готовлю PDF...",
      mode: 'preview',
      fileName: `Предложение_${pid}`,
      getRemoteUrl: () => exportProposalPdf(pid, 'preview'),
    });
  }, [current, gbusy]);

  const onShareCard = useCallback(async () => {
    try {
      const pid = String(current?.proposal_id ?? "").trim();
      if (!pid) return;

      const uriOrUrl: any = await exportProposalPdf(pid, "preview");

      if (Platform.OS === "web") {
        window.open(String(uriOrUrl), "_blank", "noopener,noreferrer");
        return;
      }
      await Share.share({ message: String(uriOrUrl) });
    } catch (e: any) {
      safeAlert("Ошибка", String(e?.message ?? e));
    }
  }, [current]);

  const onOpenAttachments = useCallback(async (proposalId?: string, opts?: { silent?: boolean; force?: boolean }) => {
    const pid = String(proposalId ?? current?.proposal_id ?? "").trim();
    if (!pid) return;

    if (attLoadingRef.current) return;

    const now = Date.now();
    const cached = attCacheRef.current[pid];
    if (!opts?.force && cached && (now - cached.ts) < ATT_TTL_MS) {
      setAttRows(cached.rows);
      return;
    }

    attLoadingRef.current = true;
    try {
      const q = await supabase
        .from("proposal_attachments")
        .select("id,file_name,url,bucket_id,storage_path,group_key,created_at")
        .eq("proposal_id", pid)
        .neq("group_key", "payment")
        .order("created_at", { ascending: false });

      if (q.error) throw q.error;

      const rows = (Array.isArray(q.data) ? q.data : []) as AttachmentRow[];

      const out: AttachmentRow[] = [];

      for (const r of rows) {
        let url = String((r as any)?.url ?? "").trim(); // url Р В Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В¶Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ў РВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В±Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р Р†РІР‚С›РІР‚“РВ Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В Р‹РВ Р’В Р В РІР‚В° Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™Р В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™Р Р†РІР‚С›РІР‚“РВ Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’В / Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В Р‹РВ Р’В Р В РІР‚В°

        if (!url) {
          const bucket = String(r?.bucket_id ?? "").trim();
          const path = String(r?.storage_path ?? "").trim();

          if (bucket && path) {
            const s = await supabase
              .storage
              .from(bucket)
              .createSignedUrl(path, 60 * 30);

            url = String(s?.data?.signedUrl ?? "").trim();
          }
        }

        out.push({
          ...r,
          url,
        });
      }

      setAttRows(out);
      attCacheRef.current[pid] = {
        ts: Date.now(),
        rows: out,
      };
    } catch (e: any) {
      if (!opts?.silent) safeAlert("Р В Р’В Р вЂ™Р’В Р В Р†РВ РІР‚С™Р Р†РІР‚С›РЎС›Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В¶Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р В Р‹РВ Р’В Р В РЏ", String(e?.message ?? e));
      // РВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р вЂ Р Р†Р вЂљРЎв„ўР вЂ™Р’В¬Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В±Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚СњРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В° Р В Р’В Р В РІР‚В Р В Р’В Р Р†Р вЂљРЎв„ўР В Р†РВ РІР‚С™Р РЋРЎС™ Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В·Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’В Р В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ, Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС› Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р Р†РІР‚С›РІР‚“РВ Р’В Р В Р‹РВ Р†РВ РІР‚С™Р вЂ™Р’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’В
    } finally {
      attLoadingRef.current = false;
    }
  }, [current]);
  const openCard = useCallback((row: AccountantInboxRow) => {
    const pid = String(row?.proposal_id ?? "").trim();

    setCurrent(row);
    setCardOpen(true);
    setInvoiceNo(String(row?.invoice_number ?? "").trim());
    setInvoiceDate(String(row?.invoice_date ?? "").trim());
    setSupplierName(String(row?.supplier ?? "").trim());

    setAmount("");
    setNote("");
    setAllocRows([]);
    setAllocOk(true);
    setAllocSum(0);
    setPayKind("bank");
    setFreezeWhileOpen(true);
    attPidRef.current = pid;
    const cached = pid ? attCacheRef.current[pid] : null;
    setAttRows(cached?.rows ?? []);

    if (pid) {
      setTimeout(() => {
        void onOpenAttachments(pid, { silent: true, force: false });
      }, 0);
    }

    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const fio = String(
          data?.user?.user_metadata?.full_name ??
          data?.user?.user_metadata?.name ??
          ""
        ).trim();
        if (fio) setAccountantFio((prev) => (prev?.trim() ? prev : fio));
      } catch { }
    })();

  }, [onOpenAttachments]);

  const openOneAttachment = useCallback(async (f: AttachmentRow) => {
    const id = String(f?.id ?? "");
    const nameRaw = String(f?.file_name ?? "file.pdf");
    const bucket = String(f?.bucket_id ?? "").trim();
    const path = String(f?.storage_path ?? "").trim();

    try {
      let ready = String(f?.url ?? "").trim();

      if (!ready) {
        if (!bucket || !path) throw new Error("Р В Р’В Р вЂ™Р’В Р В Р Р‹Р РЋРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ў url РВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р В Р‹РВ Р†РВ РІР‚С™С™ bucket_id/storage_path");

        const s = await withTimeout(
          supabase.storage.from(bucket).createSignedUrl(path, 60 * 60),
          15000,
          "createSignedUrl stuck"
        );

        if ((s as any).error) throw new Error(`Storage signedUrl error: ${(s as any).error.message}`);

        ready = String((s as any)?.data?.signedUrl ?? "").trim();
        if (!ready) throw new Error("Signed URL Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™Р В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р вЂ Р Р†Р вЂљРЎвЂєР Р†Р вЂљРІР‚њ");

        // РВ Р’В Р В Р‹РВ Р†РВ РІР‚С™Р В Р‹РВ Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В±Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р Р†РІР‚С›РІР‚“ РВ Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™Р В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРІвЂћвЂ“Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В Р вЂ Р Р†Р вЂљРЎвЂєР Р†Р вЂљРІР‚њ РВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚СњРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚Сњ РВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В±Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р Р†РІР‚С›РІР‚“РВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В» Р В Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚њРВ Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р Р†РІР‚С›РІР‚“РВ Р’В Р вЂ™Р’В Р В Р вЂ Р Р†Р вЂљРЎвЂєР Р†Р вЂљРІР‚њ
        setAttRows((prev) => prev.map((x) => (String(x.id) === id ? { ...x, url: ready } : x)));
      }

      await runAction("acc_open_att", async () => {
        await withTimeout(openSignedUrlAcc(ready, nameRaw), 25000, "openSignedUrlAcc stuck");
      });
    } catch (e: any) {
      safeAlert("Р В Р’В Р вЂ™Р’В Р В Р†РВ РІР‚С™Р Р†РІР‚С›РЎС›Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В¶Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ", String(e?.message ?? e));
    }
  }, [runAction]);

  const onOpenProposalSource = useCallback(async () => {
    const pid = String(current?.proposal_id ?? "").trim();
    if (!pid) return;

    try {
      await openAttachment(pid, "proposal_pdf", { all: false });
    } catch (e: any) {
      safeAlert("Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВР В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™Р вЂ™Р’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚Сњ РВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В¶Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р В Р‹РВ Р’В Р В Џ", String(e?.message ?? e));
    }
  }, [current]);

  const onOpenInvoiceDoc = useCallback(async () => {
    const pid = String(current?.proposal_id ?? "").trim();
    if (!pid) return;

    try {
      await openAttachment(pid, "invoice", { all: false });
    } catch (e: any) {
      safeAlert("Р В Р’В Р вЂ™Р’В Р В Р’В Р В РІР‚в„–Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р В Р‹РВ Р’В Р В Р‹РВ Р†РВ РІР‚С™Р вЂ™Р’ВР В Р’В Р В Р‹РВ Р†РВ РІР‚С™С™ (invoice)", String(e?.message ?? e));
    }
  }, [current]);

  const onOpenPaymentReport = useCallback(async () => {
    const propId = String(current?.proposal_id ?? "").trim();

    let payId = currentPaymentId;

    if (!payId && propId) {
      payId = await fetchLastPaymentIdByProposal(propId);
      if (payId) setCurrentPaymentId(payId);
    }

    if (!payId) {
      safeAlert(
        "Р В Р’В Р вЂ™Р’В Р В Р Р‹РЎСџРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В¶Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р Р†РІР‚С›РІР‚“РВ Р’В Р вЂ™Р’В Р В Р вЂ Р Р†Р вЂљРЎвЂєР Р†Р вЂљРІР‚њ РВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™Р В Р‹РВ Р’В Р В Р‹РВ Р†РВ РІР‚С™Р вЂ™Р’ВР В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ў",
        "РВ Р’В Р вЂ™Р’В Р В Р Р‹Р РЋРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ў payment_id. РВ Р’В Р вЂ™Р’В Р В Р’В Р В РІР‚в„–Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р В Р‹РВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В° Р В Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В±Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р В Р‹РВ Р’В Р В РІР‚В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В¶ Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚СњРВ Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р вЂ Р Р†Р вЂљРЎвЂєР Р†Р вЂљРІР‚њРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В· Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚СњРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚СњРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’В Р В Р’В Р Р†Р‚в„ўРВ РІР‚в„ўР вЂ™Р’В«Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВР В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р В Р‹РВ Р’В Р В РЏРВ Р’В Р Р†Р‚в„ўРВ РІР‚в„ўР вЂ™Р’В»."
      );
      return;
    }

    await runPdfTop({
      busy: gbusy,
      supabase,
      key: `pdf:acc:pay:${payId}`,
      label: "Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎвЂќР В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚СњРВ Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р Р†РІР‚С›РІР‚“РВ Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРІвЂћвЂ“ Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™Р В Р‹РВ Р’В Р В Р‹РВ Р†РВ РІР‚С™Р вЂ™Р’ВР В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В РІР‚В Р В Р’В Р Р†Р вЂљРЎв„ўР В РІР‚в„ўР вЂ™Р’В¦",
      mode: "preview",
      fileName: `Р В Р’В Р вЂ™Р’В Р В Р Р‹РЎСџРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В¶_${payId}`,
      getRemoteUrl: () =>
        exportPaymentOrderPdf(payId as any, {
          supplier: supplierName || current?.supplier || null,
          invoice_number: invoiceNo || current?.invoice_number || null,
          invoice_date: invoiceDate || current?.invoice_date || null,
          bank_name: bankName || null,
          bik: bik || null,
          rs: rs || null,
          inn: inn || null,
          kpp: kpp || null,
        }),
    });
  }, [
    current,
    currentPaymentId,
    fetchLastPaymentIdByProposal,
    gbusy,
    supplierName,
    invoiceNo,
    invoiceDate,
    bankName,
    bik,
    rs,
    inn,
    kpp,
  ]);

  const EPS = 0.01;

  // ====================== MAYAK: persistInvoiceMetaIfNeeded (FIX) ======================
  const persistInvoiceMetaIfNeeded = useCallback(async (proposalId: string) => {
    const pid = String(proposalId || "").trim();
    if (!pid) return;

    const no = String(invoiceNo || "").trim();
    const dt = String(invoiceDate || "").trim();

    const patch: any = {};
    if (no) patch.invoice_number = no;

    const dtOk = toRpcDateOrNull(dt);
    if (dtOk) patch.invoice_date = dtOk;

    if (!Object.keys(patch).length) return;

    const { data: curRow, error: selErr } = await supabase
      .from("proposals")
      .select("invoice_number, invoice_date")
      .eq("id", pid)
      .maybeSingle();

    if (selErr) throw selErr;

    const alreadyNo = String(curRow?.invoice_number ?? "").trim();
    const alreadyDt = String(curRow?.invoice_date ?? "").trim();

    const upd: any = {};
    if (!alreadyNo && patch.invoice_number) upd.invoice_number = patch.invoice_number;
    if (!alreadyDt && patch.invoice_date) upd.invoice_date = patch.invoice_date;

    if (!Object.keys(upd).length) return;

    const { error } = await supabase.from("proposals").update(upd).eq("id", pid);
    if (error) throw error;
  }, [invoiceNo, invoiceDate, toRpcDateOrNull]);

  const fetchPaidAggByProposal = useCallback(async (proposalId: string) => {
    const pid = String(proposalId || '').trim();
    if (!pid) return { total_paid: 0, payments_count: 0, last_paid_at: 0 };
    const { data, error } = await supabase
      .from('proposal_payments')
      .select('amount, paid_at, created_at')
      .eq('proposal_id', pid);
    if (error) throw error;
    let total = 0;
    let cnt = 0;
    let last = 0;
    for (const r of (data || []) as any[]) {
      total += Number(r.amount ?? 0);
      cnt += 1;
      const t = Date.parse(String(r.paid_at ?? r.created_at ?? '')) || 0;
      if (t > last) last = t;
    }
    return { total_paid: total, payments_count: cnt, last_paid_at: last };
  }, []);

  const computePayStatus = useCallback((rawStatus: any, invoiceSum: number, paidSum: number) => {
    const raw = String(rawStatus ?? '').trim().toLowerCase();
    if (raw.startsWith('Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В° Р В Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В±Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚СњРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ') || raw.startsWith('Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В·Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ў')) return 'РВ Р’В Р вЂ™Р’В Р В Р Р‹Р РЋРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В° Р В Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В±Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚СњРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ';

    const inv = Number(invoiceSum ?? 0);
    const paid = Number(paidSum ?? 0);

    if (paid <= EPS) return 'Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†РІР‚С›РЎС› Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ';
    if (inv > 0 && (inv - paid) > EPS) return 'Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В§Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р В Р‹РВ Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС› Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р В Р‹РВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›';
    return 'Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎвЂќР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р В Р‹РВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›';
  }, []);

  const afterPaymentSync = useCallback(async (proposalId: string) => {
    const pid = String(proposalId || '').trim();
    if (!pid) return;

    const agg = await fetchPaidAggByProposal(pid);

    const inv = Number(current?.invoice_amount ?? 0);

    const st = computePayStatus(current?.payment_status, inv, agg.total_paid);
    const stKey = statusFromRaw(st, false).key;
    const nextTab: Tab =
      stKey === "PAID" ? TAB_PAID :
        stKey === "PART" ? TAB_PART :
          stKey === "REWORK" ? TAB_REWORK :
            TAB_PAY;

    setTab(nextTab);

    await load(true);

    return { st, agg };
  }, [fetchPaidAggByProposal, computePayStatus, current, load]);

  const onOpenPaymentDocsOrUpload = useCallback(async () => {
    const pid = String(current?.proposal_id ?? "").trim();
    if (!pid) return;


    try {
      await openAttachment(pid, "payment", { all: true });
      return;
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      const notFound =
        msg.toLowerCase().includes("Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В Р вЂ Р Р†Р вЂљРЎвЂєР Р†Р вЂљРІР‚њРВ Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р Р†РІР‚С›РІР‚“") ||
        msg.toLowerCase().includes("Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В Р вЂ Р Р†Р вЂљРЎвЂєР Р†Р вЂљРІР‚њРВ Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦") ||
        msg.toLowerCase().includes("not found");

      if (!notFound) {
        safeAlert("Р В Р’В Р вЂ™Р’В Р В Р Р‹РЎСџРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В¶Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р Р†РІР‚С›РІР‚“РВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ Р В Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚СњРВ Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™Р В Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™Р Р†РІР‚С›РІР‚“", msg);
        return;
      }
    }

    const f = await pickAnyFile();
    if (!f) return;

    const filename = String((f as any)?.name ?? (f as any)?.fileName ?? `payment_${Date.now()}.pdf`);
    await uploadProposalAttachment(pid, f, filename, "payment");


    await load(true);


    try {
      await openAttachment(pid, "payment", { all: false });
    } catch {
      safeAlert("Р В Р’В Р вЂ™Р’В Р В Р†РВ РІР‚С™Р Р†Р‚СњРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚њРВ Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В¶Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›", "Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В¤Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В Р вЂ Р Р†Р вЂљРЎвЂєР Р†Р вЂљРІР‚њРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В» Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В·Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚њРВ Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В¶Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦, Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС› Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚СњРВ Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р Р†РІР‚С›РІР‚“РВ Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В Р‹РВ Р’В Р В РІР‚В° Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ Р В Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™Р В Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р’В Р В РІР‚В°. Р В Р’В Р вЂ™Р’В Р В Р Р‹Р РЋРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В¶Р В Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р вЂ™Р’В Р В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В·.");
    }
  }, [current, load]);

  const payRest = useCallback(async () => {
    if (!canAct) { safeAlert('Р В Р’В Р вЂ™Р’В Р В Р Р‹Р РЋРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ў РВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В ', 'Р В Р’В Р вЂ™Р’В Р В Р Р‹Р РЋРЎв„ўР В Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В¶Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В° Р В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р В Р‹РВ Р’В Р В РІР‚В° Р В Р’В Р Р†Р‚в„ўРВ РІР‚в„ўР вЂ™Р’В«accountantР В Р’В Р Р†Р‚в„ўРВ РІР‚в„ўР вЂ™Р’В».'); return; }
    if (!current?.proposal_id) return;

    const sum = Number(current?.invoice_amount ?? 0);
    const paid = Number(current?.total_paid ?? 0);
    const rest = sum > 0 ? Math.max(0, sum - paid) : 0;

    if (!rest || rest <= 0) {
      safeAlert('Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎвЂќР В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚Сњ', 'РВ Р’В Р вЂ™Р’В Р В Р Р‹Р РЋРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ў РВ Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™Р В Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’ВР В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р Р†РІР‚С›РІР‚“ РВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚Сњ РВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ.');
      return;
    }

    const fio = accountantFio.trim();
    if (!fio) { safeAlert('Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В¤Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎвЂќ Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В±Р В Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р вЂ™Р’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚њРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°', 'Р В Р’В Р вЂ™Р’В Р В Р Р‹РЎСџРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В±Р В Р’В Р В Р‹РВ Р’В Р В РЏРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В·Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р В Р‹РВ Р’В Р В РІР‚В°Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›'); return; }
    const pidMeta = String(current?.proposal_id ?? "").trim();
    if (pidMeta) {
      await persistInvoiceMetaIfNeeded(pidMeta);
    }

    const { data: payId, error } = await supabase.rpc('acc_add_payment_v3_uuid', {
      p_proposal_id: current.proposal_id,
      p_amount: rest,
      p_accountant_fio: fio,
      p_purpose: `${purposePrefix} ${note || ''}`.trim(),
      p_method: payKind === 'bank' ? 'Р В Р’В Р вЂ™Р’В±Р В Р’В Р вЂ™Р’В°Р В Р’В Р В РІР‚В¦Р В Р’В Р РЋРІЂќ' : 'РВ Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»',
      p_note: note?.trim() ? note.trim() : null,
      p_allocations: allocRows,
    });
    if (error) throw error;
    if (payId) setCurrentPaymentId(Number(payId));


    safeAlert('Р В Р’В Р вЂ™Р’В Р В Р†РВ РІР‚С™Р РЋРЎв„ўР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›', 'Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎвЂќР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В° Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°.');
    const pid = String(current?.proposal_id ?? '').trim();
    if (pid) setRows(prev => prev.filter(r => String(r.proposal_id) !== pid));

    await afterPaymentSync(pid);
    closeCard();

  }, [canAct, current, accountantFio, payKind, note, afterPaymentSync, closeCard, allocRows, persistInvoiceMetaIfNeeded, purposePrefix]);

  const addPayment = useCallback(async () => {
    if (!canAct) { safeAlert('Р В Р’В Р вЂ™Р’В Р В Р Р‹Р РЋРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ў РВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В ', 'Р В Р’В Р вЂ™Р’В Р В Р Р‹Р РЋРЎв„ўР В Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В¶Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В° Р В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р В Р‹РВ Р’В Р В РІР‚В° Р В Р’В Р Р†Р‚в„ўРВ РІР‚в„ўР вЂ™Р’В«accountantР В Р’В Р Р†Р‚в„ўРВ РІР‚в„ўР вЂ™Р’В».'); return; }
    if (!current?.proposal_id) return;

    const val = Number(String(amount).replace(',', '.'));
    if (!val || val <= 0) { safeAlert('Р В Р’В Р вЂ™Р’В Р В Р†РВ РІР‚С™Р Р†РІР‚С›РЎС›Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ Р В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™Р В Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’ВР В Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™', 'Р В Р’В Р вЂ™Р’В Р В Р’В Р В РІР‚в„–Р В Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™Р В Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В° Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™Р Р†РІР‚С›РІР‚“ РВ Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В¶Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В° Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В±Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р Р†РІР‚С›РІР‚“РВ Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В Р‹РВ Р’В Р В РІР‚В° Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В±Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р В Р‹РВ Р’В Р В РІР‚В°Р В Р’В Р В Р‹РВ Р вЂ Р Р†Р вЂљРЎв„ўР вЂ™Р’В¬Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ 0'); return; }

    try {
      const fio = accountantFio.trim();
      if (!fio) { safeAlert('Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В¤Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎвЂќ Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В±Р В Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р вЂ™Р’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚њРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°', 'Р В Р’В Р вЂ™Р’В Р В Р Р‹РЎСџРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В±Р В Р’В Р В Р‹РВ Р’В Р В РЏРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В·Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р В Р‹РВ Р’В Р В РІР‚В°Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›'); return; }

      const inv0 = Number(current?.invoice_amount ?? 0);
      const paid0 = Number(current?.total_paid ?? 0);
      const rest0 = inv0 > 0 ? Math.max(0, inv0 - paid0) : 0;

      if (rest0 > EPS && Math.abs(val - rest0) <= EPS) {
        const ok =
          Platform.OS === 'web'
            ? window.confirm('Р В Р’В Р вЂ™Р’В Р В Р’В Р В РІР‚в„–Р В Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™Р В Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В° Р В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В° Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚СњРВ Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™. Р В Р’В Р вЂ™Р’В Р В Р Р‹РЎСџРВ Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™ Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚СњРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚Сњ РВ Р’В Р вЂ™Р’В Р В Р Р‹РЎСџРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎвЂќР В Р’В Р вЂ™Р’В Р В Р†РВ РІР‚С™Р РЋРІР‚ќРВ Р’В Р вЂ™Р’В Р В Р Р‹Р РЋРЎв„ўР В Р’В Р вЂ™Р’В Р В Р’В Р Р†РІР‚С™Р’В¬Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В®?')
            : await new Promise<boolean>((resolve) => {
              Alert.alert(
                'Р В Р’В Р вЂ™Р’В Р В Р Р‹РЎСџРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р В Р‹РВ Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р’В Р В РЏ РВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°',
                'Р В Р’В Р вЂ™Р’В Р В Р’В Р В РІР‚в„–Р В Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™Р В Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В° Р В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В° Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚СњРВ Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™. Р В Р’В Р вЂ™Р’В Р В Р Р‹РЎСџРВ Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚СњРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚Сњ РВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™Р В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРІвЂћвЂ“ Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™?',
                [
                  { text: 'Р В Р’В Р вЂ™Р’В Р В Р Р‹Р РЋРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р В Р‹РВ Р†РВ РІР‚С™С™', style: 'cancel', onPress: () => resolve(false) },
                  { text: 'Р В Р’В Р вЂ™Р’В Р В Р†РВ РІР‚С™Р РЋРЎС™Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°', style: 'default', onPress: () => resolve(true) },
                ]
              );
            });

        if (ok) {
          await payRest();
          return;
        }
      }
      const pidMeta = String(current?.proposal_id ?? "").trim();
      if (pidMeta) {
        await persistInvoiceMetaIfNeeded(pidMeta);
      }

      const args: any = {
        p_proposal_id: current.proposal_id,
        p_amount: val,
        p_accountant_fio: fio,
        p_purpose: `${purposePrefix} ${note || ''}`.trim(),
        p_method: payKind === 'bank' ? 'Р В Р’В Р вЂ™Р’В±Р В Р’В Р вЂ™Р’В°Р В Р’В Р В РІР‚В¦Р В Р’В Р РЋРІЂќ' : 'РВ Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»',
        p_note: note?.trim() ? note.trim() : null,
      };
      const { data: payId, error } = await supabase.rpc(
        'acc_add_payment_v3_uuid',
        {
          ...args,
          p_allocations: Array.isArray(allocRows) ? allocRows : [],
        }
      );

      if (error) throw error;
      if (payId) setCurrentPaymentId(Number(payId));

      if (error) throw error;

      safeAlert('Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎвЂќР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В° Р В Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В±Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°', 'Р В Р’В Р вЂ™Р’В Р В Р’В Р В РІР‚в„–Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™Р В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њ РВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В±Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦ Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС› Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р РЋРІР‚С”Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚СњРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™ Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™Р Р†РІР‚С›РІР‚“.');
      const pid = String(current?.proposal_id ?? '').trim();
      if (pid) setRows(prev => prev.filter(r => String(r.proposal_id) !== pid));

      await afterPaymentSync(pid);
      closeCard();

    } catch (e: any) {
      const msg = e?.message ?? e?.error_description ?? e?.details ?? String(e);
      safeAlert('Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎвЂќР В Р’В Р В Р‹РВ Р вЂ Р Р†Р вЂљРЎв„ўР вЂ™Р’В¬Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В±Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚СњРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В° Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™Р Р†РІР‚С›РІР‚“', msg);
      console.error('[acc_add_payment]', msg);
    }
  }, [
    canAct,
    current,
    amount,
    accountantFio,
    payKind,
    note,
    payRest,
    afterPaymentSync,
    closeCard,
    allocRows,
    persistInvoiceMetaIfNeeded,
    purposePrefix,
  ]);

  const onReturnToBuyer = useCallback(async () => {
    if (!canAct) { safeAlert('Р В Р’В Р вЂ™Р’В Р В Р Р‹Р РЋРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ў РВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В ', 'Р В Р’В Р вЂ™Р’В Р В Р Р‹Р РЋРЎв„ўР В Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В¶Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В° Р В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р В Р‹РВ Р’В Р В РІР‚В° Р В Р’В Р Р†Р‚в„ўРВ РІР‚в„ўР вЂ™Р’В«accountantР В Р’В Р Р†Р‚в„ўРВ РІР‚в„ўР вЂ™Р’В».'); return; }
    const pid = String(current?.proposal_id || '');
    if (!pid) return;

    try {
      await accountantReturnToBuyer({ proposalId: pid, comment: (note || '').trim() || null });
    } catch (e1: any) {

      try {
        const { error } = await supabase.rpc('acc_return_min_auto', {
          p_proposal_id: pid,
          p_comment: (note || '').trim() || null,
        });
        if (error) throw error;
      } catch (e2: any) {

        try {
          const { error } = await supabase.rpc('proposal_return_to_buyer_min', {
            p_proposal_id: pid,
            p_comment: (note || '').trim() || null,
          });
          if (error) throw error;
        } catch (e3: any) {
          const msg = e3?.message ?? e3?.error_description ?? e3?.details ?? String(e3);
          safeAlert('Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎвЂќР В Р’В Р В Р‹РВ Р вЂ Р Р†Р вЂљРЎв„ўР вЂ™Р’В¬Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В±Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚СњРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В° Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В·Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°', msg);
          console.error('[return_to_buyer chain failed]', msg);
          return;
        }
      }
    }
    safeAlert('Р В Р’В Р вЂ™Р’В Р В Р†РВ РІР‚С™Р РЋРЎв„ўР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›', 'Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎвЂќР В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС› Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В° Р В Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В±Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚СњРВ Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™ Р В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В±Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В¶Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р вЂ™Р’В Р В Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™.');
    setRows(prev => prev.filter(r => String(r.proposal_id) !== pid));
    closeCard();
    await load();
  }, [canAct, current, note, load, closeCard]);

  const onPayConfirm = useCallback(async () => {
    const v = Number(String(amount).replace(",", "."));
    if (!v || v <= 0) {
      safeAlert("Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎвЂќР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°", "Р В Р’В Р вЂ™Р’В Р В Р†РВ РІР‚С™Р Р†РІР‚С›РЎС›Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ Р В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™Р В Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’ВР В Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™ Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™Р Р†РІР‚С›РІР‚“");
      return;
    }
    if (!allocOk) {
      safeAlert("Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎвЂќР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°", "Р В Р’В Р вЂ™Р’В Р В Р’В Р В РІР‚в„–Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р В Р‹РВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В° Р В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ Р В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™Р В Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’ВР В Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™ Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС› Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В·Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р вЂ™Р’В Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р В Р‹РВ Р’В Р В РЏРВ Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’В: Р В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС› Р В Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В¶Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС› Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В±Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р Р†РІР‚С›РІР‚“РВ Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В Р‹РВ Р’В Р В РІР‚В° Р В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС› Р В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™Р В Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В¶Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°.");
      return;
    }
    const ok =
      Platform.OS === "web"
        ? window.confirm(`Р В Р’В Р вЂ™Р’В Р В Р Р‹РЎСџРВ Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™ Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В° Р В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™Р В Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’ВР В Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™ ${v}?`)
        : await new Promise<boolean>((resolve) => {
          Alert.alert(
            "Р В Р’В Р вЂ™Р’В Р В Р Р‹РЎСџРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™",
            `Р В Р’В Р вЂ™Р’В Р В Р†РВ РІР‚С™Р Р†РІР‚С›РЎС›Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р Р†РІР‚С›РІР‚“ РВ Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’В Р В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™Р В Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’ВР В Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™: ${v}. Р В Р’В Р вЂ™Р’В Р В Р Р‹РЎСџРВ Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В Р‹РВ Р Р‹Р Р†Р вЂљРЎС™?`,
            [
              { text: "Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎвЂќР В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°", style: "cancel", onPress: () => resolve(false) },
              { text: "Р В Р’В Р вЂ™Р’В Р В Р Р‹РЎСџРВ Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’В", style: "default", onPress: () => resolve(true) },
            ]
          );
        });

    if (!ok) return;
    await addPayment();
  }, [amount, addPayment]);

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
    const st = computePayStatus("Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎвЂќР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р В Р‹РВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›", inv, agg.total_paid);

    openCard({
      proposal_id: String(item.proposal_id),
      supplier: item.supplier,
      invoice_number: item.invoice_number,
      invoice_date: item.invoice_date,
      invoice_amount: item.invoice_amount,
      invoice_currency: item.invoice_currency,
      payment_status: st,
      total_paid: Number(agg.total_paid ?? 0),
      payments_count: Number(agg.payments_count ?? 0),
      has_invoice: !!item.has_invoice,
      sent_to_accountant_at: null,
    } as any);
  }, [computePayStatus, fetchPaidAggByProposal, openCard]);

  const renderHistoryItem = useCallback(
    ({ item }: { item: HistoryRow }) => (
      <HistoryRowCard item={item} onOpen={onOpenHistoryRow} ui={{ cardBg: UI.cardBg, text: UI.text, sub: UI.sub }} />
    ),
    [onOpenHistoryRow]
  );

  const canOpenInvoice = !!current?.has_invoice;

  const canOpenPayments = (current?.payments_count ?? 0) > 0;
  const currentDisplayStatus = useMemo(() => (current?.payment_status ?? 'Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†РІР‚С›РЎС› Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ'), [current]);

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
          shadowOpacity: headerShadow as any,
          elevation: 6,
        }}
      >
        <Header
          tab={tab}
          setTab={(t) => {
            if (t === tabRef.current) return;
            if (t !== TAB_HISTORY) {
              const cached = cacheByTabRef.current[t];
              setRows(Array.isArray(cached) ? cached : []);
            }
            setTab(t);
          }}

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
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: false,
          }) as unknown as (e: unknown) => void}
          contentTopPad={HEADER_MAX + 16}
          onRenderHistory={(row) => renderHistoryItem({ item: row })}
          onRenderInbox={(row) => renderItem({ item: row as AccountantInboxRow })}
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
          setTimeout(() => { void loadHistory(true); }, 0);
        }}
        onApply={(from, to) => {
          setDateFrom(from);
          setDateTo(to);
          setTimeout(() => { void loadHistory(true); }, 0);
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
        headerSubtitle={`${formatProposalBaseNo((current as any)?.proposal_no, String(current?.proposal_id ?? ""))} • ${ruText(current?.supplier || "—")} • счёт ${ruText(current?.invoice_number || "без №")}`}

        onReturnToBuyer={onReturnToBuyer}
        onOpenPdf={onOpenProposalPdf}
        onExcel={() => safeAlert("Excel", "Экспорт Excel для этой карточки будет добавлен.")}
        onPay={onPayConfirm}
        runAction={runAction}
        scrollRef={(r: any) => {
          // @ts-ignore
          payFormReveal.scrollRef.current = r;
          cardScrollRef.current = r;
        }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: cardScrollY } } }], {
          useNativeDriver: false,
        })}
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
                    {formatProposalBaseNo((current as any)?.proposal_no, String(current?.proposal_id ?? ""))}
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
                          {files.map((f: any) => (
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

    </SafeView>
  );
}

async function pickAnyFile(): Promise<any | null> {
  try {
    if (Platform.OS === 'web') {
      return await new Promise<any | null>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.jpg,.jpeg,.png';

        let done = false;

        const finish = (val: any | null) => {
          if (done) return;
          done = true;
          try { window.removeEventListener('focus', onFocus, true); } catch { }
          try { input.remove(); } catch { }
          resolve(val);
        };

        const onChange = () => {
          const f = (input.files && input.files[0]) || null;
          finish(f);
        };


        const onFocus = () => {

          setTimeout(() => {
            const f = (input.files && input.files[0]) || null;
            // Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’В Cancel Р В Р’В Р В РІР‚В Р В Р†РВ РІР‚С™Р вЂ™Р’В Р В Р†РВ РІР‚С™Р Р†РІР‚С›РЎС› f=null Р В Р’В Р В РІР‚В Р В Р†РВ РІР‚С™Р вЂ™Р’В Р В Р†РВ РІР‚С™Р Р†РІР‚С›РЎС› finish(null)
            finish(f);
          }, 250);
        };

        input.addEventListener('change', onChange, { once: true });
        window.addEventListener('focus', onFocus, true);

        document.body.appendChild(input);
        input.click();
      });
    } else {
      // @ts-ignore
      const DocPicker = await import('expo-document-picker');
      const res = await (DocPicker as any).getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
      if (res?.canceled) return null;
      return res?.assets?.[0] ?? res ?? null;
    }
  } catch (e) {
    safeAlert('Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В¤Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В Р вЂ Р Р†Р вЂљРЎвЂєР Р†Р вЂљРІР‚њРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»', (e as any)?.message ?? String(e));
    return null;
  }
}
