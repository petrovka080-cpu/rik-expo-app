// app/(tabs)/buyer.tsx 
import { formatRequestDisplay, formatProposalBaseNo } from "../../src/lib/format";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, FlatList, Pressable, Alert, ActivityIndicator,
  RefreshControl, StyleSheet, Platform, TextInput, ScrollView, Animated,
  Keyboard, KeyboardAvoidingView, Linking
} from 'react-native';
import { useLatest } from "../../src/lib/useLatest";
import IconSquareButton from "../../src/ui/IconSquareButton";
import SendPrimaryButton from "../../src/ui/SendPrimaryButton";
import { pickFileAny } from "../../src/lib/filePick";
import { Ionicons } from '@expo/vector-icons';
import { D, UI, P_LIST, P_SHEET, KICK_THROTTLE_MS, TOAST_DEFAULT_MS } from "../../src/screens/buyer/buyerUi";
import type { LineMeta, DraftAttachmentMap } from "../../src/screens/buyer/buyer.components";
import ToastOverlay from "../../src/screens/buyer/ToastOverlay";
import {
  fmtLocal as fmtLocalHelper,
  setDeadlineHours as setDeadlineHoursHelper,
  isDeadlineHoursActive as isDeadlineHoursActiveHelper,
  stripToLocal as stripToLocalHelper,
  inferCountryCode as inferCountryCodeHelper,
  requestSum as requestSumHelper,
  lineTotal as lineTotalHelper,
} from "../../src/screens/buyer/buyer.helpers";
import { fetchBuyerInboxProd, fetchBuyerBucketsProd } from "../../src/screens/buyer/buyer.fetchers";
import { openSignedUrlUniversal } from "../../src/lib/files";
import {
  selectPickedIds,
  selectGroups,
  selectRfqPickedPreview,
  selectSupplierGroups,
  selectRequiredSuppliers,
  selectMissingAttachSuppliers,
  selectAttachStats,
  selectNeedAttachWarn,
  selectSheetData,
  selectListData,
} from "../../src/screens/buyer/buyer.selectors";
import { attachBuyerSubscriptions } from "../../src/screens/buyer/buyer.subscriptions";
import {
  publishRfqAction,
  sendToAccountingAction,
  handleCreateProposalsBySupplierAction,
  openReworkAction,
  rwSaveItemsAction,
  rwSendToDirectorAction,
  rwSendToAccountingAction,
  preloadProposalTitlesAction,
  openProposalViewAction,
  snapshotProposalItemsAction,
  setProposalBuyerFioAction,
} from "../../src/screens/buyer/buyer.actions";
import {
  attachFileToProposalAction,
  openInvoicePickerWebAction,
  pickInvoiceFileAction,
} from "../../src/screens/buyer/buyer.attachments.actions";
import { useGlobalBusy } from "../../src/ui/GlobalBusy";
import { runPdfTop } from "../../src/lib/pdfRunner";

import AppButton from "../../src/ui/AppButton";
import {
  BuyerItemRow,
  BuyerGroupBlock,
  BuyerProposalCard,
  BuyerScreenHeader,
  BuyerMainList,
  BuyerSheetShell,
  SafeView,
  Chip,
  TabCount,
  WideActionButton,
  BuyerAttachmentsSticky,
  BuyerAccountingSheetBody,
  BuyerReworkSheetBody,
  SheetFooterActions,
  BuyerRfqSheetBody,
  BuyerPropDetailsSheetBody,
  BuyerInboxSheetBody,
} from "../../src/screens/buyer/buyer.components";
import {
  repoGetLatestProposalPdfAttachment,
  repoGetProposalItemsForAccounting,
  repoGetSupplierCardByName,
  repoListProposalAttachments,
  type PropAttachmentRow,
} from "../../src/screens/buyer/buyer.repo";
import {
  SUPP_NONE,
  normName,
  splitNote,
  mergeNote,
  isReqContextNote,
  extractReqContextLines,
} from "../../src/screens/buyer/buyerUtils";
import { openBuyerProposalPdf } from "../../src/screens/buyer/buyerPdf";
import {
  listBuyerInbox,
  proposalSubmit,
  exportProposalPdf,
  buildProposalPdfHtml,
  type BuyerInboxRow,
  proposalItems,
  uploadProposalAttachment,
  proposalSendToAccountant,
  batchResolveRequestLabels,
  createProposalsBySupplier as apiCreateProposalsBySupplier,
} from '../../src/lib/catalog_api';
import { supabase } from '../../src/lib/supabaseClient';
import { useFocusEffect } from "expo-router";
import { listSuppliers, type Supplier } from '../../src/lib/catalog_api';


const isWeb = Platform.OS === 'web';
type Tab = "inbox" | "pending" | "approved" | "rejected";

type Group = {
  request_id: string;
  request_id_old?: number | null;
  items: BuyerInboxRow[];
};


export default function BuyerScreen() {
  const busy = useGlobalBusy();
  const [tab, setTab] = useState<Tab>("inbox");
  const [buyerFio, setBuyerFio] = useState<string>("");


  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [meta, setMeta] = useState<Record<string, LineMeta>>({});
  const [attachments, setAttachments] = useState<DraftAttachmentMap>({});


  const pickedIds = useMemo(() => selectPickedIds(picked), [picked]);



  const pickedIdsRef = useLatest(pickedIds);
  const metaRef = useLatest(meta);
  const attachmentsRef = useLatest(attachments);
  const buyerFioRef = useLatest(buyerFio);


  type SheetKind = 'none' | 'inbox' | 'accounting' | 'rework' | 'prop_details' | 'rfq';

  const [sheetKind, setSheetKind] = useState<SheetKind>('none');
  const isSheetOpen = sheetKind !== 'none';


  const [showAttachBlock, setShowAttachBlock] = useState(false);

  // ✅ клавиатура (PROD)
  const [kbOpen, setKbOpen] = useState(false);

  useEffect(() => {

    if (sheetKind === "inbox") setShowAttachBlock(false);
  }, [sheetKind]);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const s1 = Keyboard.addListener(showEvt, () => setKbOpen(true));
    const s2 = Keyboard.addListener(hideEvt, () => setKbOpen(false));

    return () => {
      try { s1.remove(); } catch { }
      try { s2.remove(); } catch { }
    };
  }, []);


  useEffect(() => {
    if (kbOpen) setShowAttachBlock(false);
  }, [kbOpen]);


  const [sheetGroup, setSheetGroup] = useState<Group | null>(null);
  const [sheetPid, setSheetPid] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<any>(null);
  const showToast = useCallback((msg: string, ms = TOAST_DEFAULT_MS) => {
    try {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    } catch { }
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(null), ms);
  }, []);


  useEffect(() => {
    return () => {
      try {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      } catch { }
    };
  }, []);
  const closeSheet = useCallback(() => {
    setSheetKind('none');
    setSheetGroup(null);
    setSheetPid(null);
    setShowAttachBlock(false);
  }, []);

  const openInboxSheet = useCallback((g: Group) => {
    setSheetGroup(g);
    setSheetPid(null);
    setSheetKind('inbox');
  }, []);

  const openAccountingSheet = useCallback((pid: string | number) => {
    setSheetPid(String(pid));
    setSheetGroup(null);
    setSheetKind('accounting');
  }, []);

  const openReworkSheet = useCallback((pid: string | number) => {
    setSheetPid(String(pid));
    setSheetGroup(null);
    setSheetKind('rework');
  }, []);

  const openPropDetailsSheet = useCallback((pid: string | number) => {
    setSheetPid(String(pid));
    setSheetGroup(null);
    setSheetKind('prop_details');
  }, []);

  const openRfqSheet = useCallback(() => {
    setSheetPid(null);
    setSheetGroup(null);
    setSheetKind('rfq');
  }, []);



  const [rfqBusy, setRfqBusy] = useState(false);


  const [rfqDeadlineIso, setRfqDeadlineIso] = useState(() => {
    const d = new Date(Date.now() + 24 * 3600 * 1000);
    return d.toISOString();
  });


  const [rfqDeliveryDays, setRfqDeliveryDays] = useState("2");


  const [rfqPhone, setRfqPhone] = useState("");
  const [rfqCountryCode, setRfqCountryCode] = useState("+996");
  const [rfqEmail, setRfqEmail] = useState("");


  const [rfqCity, setRfqCity] = useState("");
  const [rfqAddressText, setRfqAddressText] = useState("");


  const [rfqNote, setRfqNote] = useState("");
  const [rfqShowItems, setRfqShowItems] = useState(false);

  const [rfqVisibility, setRfqVisibility] = useState<"open" | "company_only">("open");
  const [rfqPaymentTerms, setRfqPaymentTerms] = useState<"cash" | "bank" | "after" | "deferred">("bank");
  const [rfqDeliveryType, setRfqDeliveryType] = useState<"delivery" | "pickup" | "on_site">("delivery");
  const [rfqDeliveryWindow, setRfqDeliveryWindow] = useState("9:00–18:00");


  const [rfqNeedInvoice, setRfqNeedInvoice] = useState(true);
  const [rfqNeedWaybill, setRfqNeedWaybill] = useState(true);
  const [rfqNeedCert, setRfqNeedCert] = useState(false);


  const [rfqRememberContacts, setRfqRememberContacts] = useState(true);

  const rfqCountryCodeTouched = useRef(false);


  const HEADER_MIN = 76;

  const [measuredHeaderMax, setMeasuredHeaderMax] = useState<number>(160);
  const HEADER_MAX = Math.max(measuredHeaderMax, 160);

  const HEADER_SCROLL = Math.max(0, HEADER_MAX - HEADER_MIN);

  // scroll (JS driver, как у бухгалтера)
  const scrollY = useRef(new Animated.Value(0)).current;
  const clampedY = useMemo(
    () => Animated.diffClamp(scrollY, 0, HEADER_SCROLL || 1),
    [scrollY, HEADER_SCROLL]
  );

  const headerHeight = useMemo(() => clampedY.interpolate({
    inputRange: [0, HEADER_SCROLL || 1],
    outputRange: [HEADER_MAX, HEADER_MIN],
    extrapolate: 'clamp',
  }), [clampedY, HEADER_SCROLL, HEADER_MAX]);

  const titleSize = useMemo(() => clampedY.interpolate({
    inputRange: [0, HEADER_SCROLL || 1],
    outputRange: [24, 16],
    extrapolate: 'clamp',
  }), [clampedY, HEADER_SCROLL]);

  const subOpacity = useMemo(() => clampedY.interpolate({
    inputRange: [0, HEADER_SCROLL || 1],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  }), [clampedY, HEADER_SCROLL]);

  const headerShadow = useMemo(() => clampedY.interpolate({
    inputRange: [0, 10],
    outputRange: [0, 0.12],
    extrapolate: 'clamp',
  }), [clampedY]);

  const fmtLocal = (iso: string) => fmtLocalHelper(iso);

  const setDeadlineHours = (hours: number) => {
    setDeadlineHoursHelper(hours, setRfqDeadlineIso);
  };

  const isDeadlineHoursActive = (hours: number) => {
    return isDeadlineHoursActiveHelper(hours, rfqDeadlineIso);
  };

  useEffect(() => {
    if (sheetKind !== "rfq") return;

    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const md: any = data?.user?.user_metadata || {};

        if (!rfqCountryCodeTouched.current) {
          setRfqCountryCode(inferCountryCodeHelper(rfqCity, md.phone ?? md.whatsapp));
        }
        if (!rfqEmail) setRfqEmail(String(md.email ?? "").trim());
        if (!rfqPhone) setRfqPhone(stripToLocalHelper(md.phone ?? ""));
      } catch { }
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetKind]);
  const [rows, setRows] = useState<BuyerInboxRow[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [creating, setCreating] = useState(false);
  const sendingRef = useRef(false);

  const [pending, setPending] = useState<any[]>([]);
  const [approved, setApproved] = useState<any[]>([]);
  const [rejected, setRejected] = useState<any[]>([]);

  const [titleByPid, setTitleByPid] = useState<Record<string, string>>({});
  const titleByPidRef = useLatest(titleByPid);
  // ===================== MAYAK: PROPOSAL_ID → PROPOSAL_NO CACHE (PROD) =====================
  const [proposalNoByPid, setProposalNoByPid] = useState<Record<string, string>>({});
  const proposalNoByPidRef = useLatest(proposalNoByPid);

  const prNoInflightRef = useRef<Record<string, Promise<void>>>({});
  const prNoTsRef = useRef<Record<string, number>>({});
  const PRNO_TTL_MS = 10 * 60 * 1000;

  const uniq = (arr: string[]) => Array.from(new Set((arr || []).map(String).map(s => s.trim()).filter(Boolean)));
  const chunk = <T,>(arr: T[], size: number) => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  const preloadProposalNosByIds = useCallback(async (proposalIdsRaw: string[]) => {
    const now = Date.now();
    const ids = uniq(proposalIdsRaw);
    if (!ids.length) return;

    const need = ids.filter((id) => {
      const have = proposalNoByPidRef.current?.[id];
      const ts = prNoTsRef.current[id] ?? 0;
      if (have && (now - ts) < PRNO_TTL_MS) return false;
      return true;
    });

    if (!need.length) return;

    const wait: Promise<void>[] = [];
    const toFetch: string[] = [];

    for (const id of need) {
      const infl = prNoInflightRef.current[id];
      if (infl) wait.push(infl);
      else toFetch.push(id);
    }

    if (toFetch.length) {
      const p = (async () => {
        try {
          const patch: Record<string, string> = {};

          for (const part of chunk(toFetch, 250)) {
            const q = await supabase
              .from("proposals" as any)
              .select("id, proposal_no")
              .in("id", part);

            if (!q.error && Array.isArray(q.data)) {
              for (const r of q.data as any[]) {
                const id = String(r?.id ?? "").trim();
                const no = String(r?.proposal_no ?? "").trim();
                if (id && no) patch[id] = no;
                if (id) prNoTsRef.current[id] = Date.now(); // TTL ставим всегда
              }
            } else {
              // если ошибка — TTL не ставим, чтобы можно было повторить
            }
          }

          if (Object.keys(patch).length) {
            setProposalNoByPid((prev) => ({ ...(prev || {}), ...patch }));
          }
        } catch (e) {
          console.warn("[buyer] preloadProposalNosByIds failed:", (e as any)?.message ?? e);
        }
      })();

      for (const id of toFetch) prNoInflightRef.current[id] = p;
      wait.push(p);

      p.finally(() => {
        for (const id of toFetch) {
          if (prNoInflightRef.current[id] === p) delete prNoInflightRef.current[id];
        }
      });
    }

    if (wait.length) {
      try { await Promise.all(wait); } catch { }
    }
  }, [proposalNoByPidRef, setProposalNoByPid]);
  // =================== END MAYAK: PROPOSAL_ID → PROPOSAL_NO CACHE (PROD) ===================

  const [loadingBuckets, setLoadingBuckets] = useState(false);


  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [suppliersLoaded, setSuppliersLoaded] = useState(false);


  const [acctProposalId, setAcctProposalId] = useState<string | number | null>(null);
  const [invNumber, setInvNumber] = useState('');
  const [invDate, setInvDate] = useState('');
  const [invAmount, setInvAmount] = useState('');
  const [invCurrency, setInvCurrency] = useState('KGS');
  const [invFile, setInvFile] = useState<any | null>(null);
  const [acctBusy, setAcctBusy] = useState(false);

  const [propViewId, setPropViewId] = useState<string | null>(null);
  const [propViewHead, setPropViewHead] = useState<any | null>(null);
  const [propViewBusy, setPropViewBusy] = useState(false);
  const [propViewLines, setPropViewLines] = useState<any[]>([]);

  const [propAttBusy, setPropAttBusy] = useState(false);
  const [propAttByPid, setPropAttByPid] = useState<Record<string, PropAttachmentRow[]>>({});
  const [propAttErrByPid, setPropAttErrByPid] = useState<Record<string, string>>({});


  const [acctSupp, setAcctSupp] = useState<{
    name: string;
    inn?: string | null;
    bank?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null>(null);
  type ListRow = Group | { id: string }; // для табов proposals достаточно id
  const listRef = useRef<FlatList<ListRow> | null>(null);

  const tabsScrollRef = useRef<ScrollView | null>(null);
  const scrollTabsToStart = useCallback((animated = true) => {
    try { tabsScrollRef.current?.scrollTo?.({ x: 0, y: 0, animated }); } catch { }
  }, []);

  const [propDocAttached, setPropDocAttached] = useState<{ name: string; url?: string } | null>(null);
  const [propDocBusy, setPropDocBusy] = useState(false);
  const focusedRef = useRef(false);
  const lastInboxKickRef = useRef(0);
  const lastBucketsKickRef = useRef(0);


  const [invoiceUploadedName, setInvoiceUploadedName] = useState<string>('');


  const [displayNoByReq, setDisplayNoByReq] = useState<Record<string, string>>({});
  const displayNoByReqRef = useLatest(displayNoByReq);

  const [prNoByReq, setPrNoByReq] = useState<Record<string, string>>({});
  const prNoByReqRef = useLatest(prNoByReq);
  const prettyLabel = useCallback((rid: string, ridOld?: number | null) => {
    const key = String(rid).trim();
    const dn = displayNoByReqRef.current?.[key];
    if (dn) return `Заявка ${dn}`;
    return `Заявка ${formatRequestDisplay(String(rid), ridOld ?? null)}`;
  }, []);


  const preloadDisplayNos = useCallback(async (ids: string[]) => {
    const uniq = Array.from(new Set((ids || []).map(String).filter(Boolean)));


    const existing = displayNoByReqRef.current || {};
    const need = uniq.filter(id => existing[id] == null);
    if (!need.length) return;

    try {
      const map = await batchResolveRequestLabels(need);
      if (map && typeof map === 'object') {
        setDisplayNoByReq(prev => ({ ...prev, ...map }));
      }
    } catch { /* no-op */ }
  }, []);

  // ===================== MAYAK: PRELOAD PR NOS BY REQUESTS (RPC BATCH) =====================
  const preloadPrNosByRequests = useCallback(async (reqIds: string[]) => {
    const ids = Array.from(
      new Set((reqIds || []).map(String).map(s => s.trim()).filter(Boolean))
    );

    const need = ids.filter(id => prNoByReqRef.current?.[id] == null);

    console.log("[buyer] resolve_req_pr_map need sample:", need.slice(0, 3), "needLen=", need.length);

    if (!need.length) return;

    try {
      const { data, error } = await supabase.rpc("resolve_req_pr_map" as any, {
        p_request_ids: need,
      } as any);

      if (error) throw error;

      console.log("[buyer] resolve_req_pr_map dataLen:", Array.isArray(data) ? data.length : -1, "sample:", (data as any[])?.slice?.(0, 3));

      const patch: Record<string, string> = {};
      for (const r of (data as any[]) || []) {
        const rid = String(r?.request_id ?? "").trim();
        const pr = String(r?.proposal_no ?? "").trim();
        if (rid && pr) patch[rid] = pr;
      }

      if (Object.keys(patch).length) {
        setPrNoByReq(prev => ({ ...(prev || {}), ...patch }));
      }
    } catch (e) {
      console.warn("[buyer] preloadPrNosByRequests failed:", (e as any)?.message ?? e);
    }
  }, [prNoByReqRef]);
  // =================== END MAYAK: PRELOAD PR NOS BY REQUESTS (RPC BATCH) ===================

  const openInvoicePickerWeb = useCallback(async () => {
    await openInvoicePickerWebAction({
      proposalId: String(acctProposalId || ""),
      uploadProposalAttachment,
      setInvoiceUploadedName,
      alert: (t, m) => Alert.alert(t, m),
    });
  }, [acctProposalId]);


  const preloadProposalTitles = useCallback(async (proposalIds: string[]) => {
    await preloadProposalTitlesAction({
      proposalIds,
      supabase,
      batchResolveRequestLabels,
      getExisting: () => titleByPidRef.current || {},
      setTitleByPid,
    });
  }, []);


  useEffect(() => {
    (async () => {
      try {
        if (buyerFio) return;
        const { data } = await supabase.auth.getUser();
        const fio =
          (data?.user?.user_metadata?.full_name?.trim()) ||
          (data?.user?.user_metadata?.name?.trim()) || '';
        if (fio) { setBuyerFio(fio); }
      } catch { }
    })();
  }, [buyerFio]);

  const didAutoScrollTabs = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (didAutoScrollTabs.current) return;
    didAutoScrollTabs.current = true;

    requestAnimationFrame(() => {
      scrollTabsToStart(false); // ✅ всегда в начало, без прыжка
    });
  }, [scrollTabsToStart]);

  const fetchInbox = useCallback(async () => {
    await fetchBuyerInboxProd({
      focusedRef,
      lastKickRef: lastInboxKickRef,
      kickMs: KICK_THROTTLE_MS,
      listBuyerInbox,
      preloadDisplayNos,
      setLoadingInbox,
      setRows,
      alert: (t, m) => Alert.alert(t, m),
      log: console.warn,
    });
  }, [preloadDisplayNos]);
  const fetchBuckets = useCallback(async () => {
    await fetchBuyerBucketsProd({
      focusedRef,
      lastKickRef: lastBucketsKickRef,
      kickMs: 900,
      supabase,
      preloadProposalTitles,
      setLoadingBuckets,
      setPending,
      setApproved,
      setRejected,
      log: console.warn,
    });
  }, [preloadProposalTitles]);
  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;

      fetchInbox();
      fetchBuckets();

      const detach = attachBuyerSubscriptions({
        supabase,
        focusedRef,
        onNotif: (t, m) => Alert.alert(t, m),
        onProposalsChanged: () => {
          fetchBuckets();
          fetchInbox();
        },
        log: console.warn,
      });

      return () => {
        focusedRef.current = false;
        try { detach(); } catch { }
      };
    }, [fetchInbox, fetchBuckets])
  );
  const onRefresh = useCallback(async () => {

    setRefreshing(true);
    await fetchInbox();
    await fetchBuckets();
    setRefreshing(false);
  }, [fetchInbox, fetchBuckets]);


  useEffect(() => {
    (async () => {
      if (suppliersLoaded) return;
      try {
        const list = await listSuppliers();
        setSuppliers(list);
        setSuppliersLoaded(true);
      } catch (e) {
        console.warn('[buyer] suppliers load failed', e);
      }
    })();
  }, [suppliersLoaded]);


  const getSupplierSuggestions = useCallback((q: string) => {
    const needle = normName(q);
    if (!needle) return [];
    return (suppliers || [])
      .filter((s) => normName((s as any)?.name).includes(needle))
      .slice(0, 8)
      .map((s) => (s as any).name as string)
      .filter(Boolean);
  }, [suppliers]);

  const groups = useMemo(() => selectGroups(rows), [rows]);

  useEffect(() => {
    const ids = Array.from(
      new Set((groups || []).map(g => String(g.request_id || "").trim()).filter(Boolean))
    );
    if (ids.length) void preloadPrNosByRequests(ids);
  }, [groups, preloadPrNosByRequests]);
  const rfqPickedPreview = useMemo(
    () => selectRfqPickedPreview(rows, pickedIds),
    [rows, pickedIds]
  );

  const publishRfq = useCallback(async () => {
    await publishRfqAction({
      pickedIds,
      rfqDeadlineIso,
      rfqDeliveryDays,
      rfqCity,
      rfqAddressText,
      rfqPhone,
      rfqCountryCode,
      rfqEmail,
      rfqVisibility,
      rfqNote,
      supabase,
      setBusy: setRfqBusy,
      closeSheet,
      alert: (t, m) => Alert.alert(t, m),
    });
  }, [
    pickedIds,
    rfqDeadlineIso,
    rfqDeliveryDays,
    rfqCity,
    rfqAddressText,
    rfqPhone,
    rfqCountryCode,
    rfqEmail,
    rfqVisibility,
    rfqNote,
    closeSheet,
  ]);
  const supplierGroups = useMemo(
    () => selectSupplierGroups(pickedIds, meta),
    [pickedIds, meta]
  );
  const lineTotal = (it: BuyerInboxRow) => {
    const key = String((it as any)?.request_item_id ?? "");
    return lineTotalHelper(it, meta?.[key]?.price);
  };

  const requestSum = (g: Group) => requestSumHelper(g.items, meta);
  const pickedTotal = useMemo(() => {
    let sum = 0; const set = new Set(pickedIds);
    for (const r of rows) if (r.request_item_id && set.has(r.request_item_id)) sum += lineTotal(r);
    return sum;
  }, [pickedIds, rows, meta]);


  const requiredSuppliers = useMemo(
    () => selectRequiredSuppliers(supplierGroups),
    [supplierGroups]
  );
  const missingAttachSuppliers = useMemo(
    () => selectMissingAttachSuppliers(requiredSuppliers, attachments),
    [requiredSuppliers, attachments]
  );
  const { attachSlotsTotal, attachMissingCount, attachFilledCount } = useMemo(
    () => selectAttachStats(requiredSuppliers, missingAttachSuppliers),
    [requiredSuppliers, missingAttachSuppliers]
  );

  const needAttachWarn = useMemo(
    () => selectNeedAttachWarn(pickedIds.length, attachSlotsTotal, attachMissingCount),
    [pickedIds.length, attachSlotsTotal, attachMissingCount]
  );

  const sheetData = useMemo(
    () => selectSheetData(sheetKind, sheetGroup),
    [sheetKind, sheetGroup]
  );


  const togglePick = useCallback((ri: BuyerInboxRow) => {
    const key = String(ri.request_item_id ?? '').trim();
    if (!key) return;
    setPicked(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const clearPick = useCallback(() => {
    setPicked({});

    requestAnimationFrame(() => {
      showToast("Выбор снят");
    });
  }, [showToast]);
  const setLineMeta = useCallback((id: string, patch: Partial<LineMeta>) => {
    const key = String(id || '').trim();
    if (!key) return;
    setMeta(prev => ({ ...prev, [key]: { ...(prev[key] || {}), ...patch } }));
  }, []);

  const pickedRef = useLatest(picked);


  const applyToPickedInGroup = useCallback((g: Group, patch: Partial<LineMeta>) => {
    setMeta(prev => {
      const next = { ...prev };
      const pickedNow = pickedRef.current;

      for (const it of g.items) {
        const id = String(it?.request_item_id || "");
        if (!id) continue;
        if (!pickedNow[id]) continue;
        next[id] = { ...(next[id] || {}), ...patch };
      }
      return next;
    });
  }, []);
  const renderItemRow = useCallback((it: BuyerInboxRow, idx2: number) => {
    const key = String(it.request_item_id ?? "");
    const selected = !!picked[key];
    const m = (key && meta[key]) || {};
    const sum = lineTotal(it);

    const prettyText = `${it.qty} ${it.uom || ""}`.trim();
    const rejectedByDirector =
      !!(it as any).director_reject_at || !!(it as any).director_reject_note;

    const sugg = getSupplierSuggestions(String(m.supplier ?? ""));

    return (
      <BuyerItemRow
        s={s}
        it={it}
        selected={selected}
        inSheet={isSheetOpen && sheetKind === "inbox"}
        m={m}
        sum={sum}
        prettyText={prettyText}
        rejectedByDirector={rejectedByDirector}
        onTogglePick={() => togglePick(it)}
        onSetPrice={(v) => setLineMeta(key, { price: v })}
        onSetSupplier={(v) => setLineMeta(key, { supplier: v })}
        onSetNote={(v) => setLineMeta(key, { note: v })}
        supplierSuggestions={sugg}
        onPickSupplier={(name) => {
          const match =
            (suppliers || []).find((s) => normName(s.name) === normName(name)) || null;

          const parts = splitNote(m.note);
          const user = parts.user;

          let auto = "";
          if (match) {
            const partsAuto: string[] = [];
            if ((match as any).inn) partsAuto.push(`ИНН: ${(match as any).inn}`);
            if ((match as any).bank_account) partsAuto.push(`Счёт: ${(match as any).bank_account}`);
            if ((match as any).phone) partsAuto.push(`Тел.: ${(match as any).phone}`);
            if ((match as any).email) partsAuto.push(`Email: ${(match as any).email}`);
            auto = partsAuto.join(" • ");
          }

          setLineMeta(key, { supplier: name, note: mergeNote(user, auto) });
        }}
        onFocusField={() => {
          setShowAttachBlock(false);
        }}
      />
    );
  }, [
    picked,
    meta,
    lineTotal,
    togglePick,
    setLineMeta,
    getSupplierSuggestions,


    suppliers,
    isSheetOpen,
    sheetKind,
  ]);
  const renderGroupBlock = useCallback((g: Group, index: number) => {
    const gsum = requestSum(g);
    const isOpen = false;

    const pr = (prNoByReq?.[String(g.request_id)] || "").trim();
    const reqLabel = prettyLabel(g.request_id, g.request_id_old ?? null);

    const headerTitle = pr ? pr : reqLabel;

    const total = g.items.length;

    const rejectedCount = g.items.filter(
      (it) => (it as any).director_reject_at || (it as any).director_reject_note
    ).length;

    const allRejected = total > 0 && rejectedCount === total;

    const baseMeta = `${total} позиций${gsum ? ` · итого ${gsum.toLocaleString()} сом` : ""}`;

    const headerMetaBase = allRejected
      ? "❌ ОТКЛОНЕНА"
      : rejectedCount > 0
        ? `${baseMeta} · ❌ отклонено ${rejectedCount}/${total}`
        : baseMeta;

    // ✅ если есть PR — показываем REQ внутри meta (вторая смысловая строка)
    const headerMeta = pr
      ? `REQ: ${reqLabel} · ${headerMetaBase}`
      : headerMetaBase;


    return (
      <BuyerGroupBlock
        s={s}
        g={g}
        index={index}
        isOpen={isOpen}
        gsum={gsum}
        headerTitle={headerTitle}
        headerMeta={headerMeta}
        onToggle={() => openInboxSheet(g)}
        renderItemRow={renderItemRow}
        isWeb={isWeb}
        supplierGroups={supplierGroups}
        attachments={attachments}
        onPickAttachment={(key, att) =>
          setAttachments((prev) => ({ ...prev, [key]: att }))
        }
      />
    );
  }, [
    requestSum,
    prettyLabel,
    openInboxSheet,
    renderItemRow,
    supplierGroups,
    attachments,
    prNoByReq,
  ]);


  const validatePicked = useCallback(() => {
    const missing: string[] = [];
    for (const g of groups) {
      g.items.forEach((it, idx) => {
        const key = String(it.request_item_id || `${g.request_id}:${idx}`);
        if (!picked[key]) return;
        const m = meta[key] || {};
        if (!m.price || !m.supplier) missing.push(`• ${formatRequestDisplay(g.request_id, g.request_id_old)}: ${it.name_human}`);
      });
    }
    if (missing.length) {
      Alert.alert('Заполните данные', `Укажи цену и поставщика:\n\n${missing.slice(0, 10).join('\n')}${missing.length > 10 ? '\n…' : ''}`);
      return false;
    }
    return true;
  }, [groups, picked, meta]);

  const removeFromInboxLocally = useCallback((ids: string[]) => {
    setRows(prev => prev.filter(r => !ids.includes(String(r.request_item_id))));
  }, []);

  const confirmSendWithoutAttachments = useCallback(async (): Promise<boolean> => {

    if (attachMissingCount === 0) return true;


    if (attachSlotsTotal === 0) return true;

    const list = missingAttachSuppliers.slice(0, 3).join(", ");
    const more = missingAttachSuppliers.length > 3 ? ` и ещё ${missingAttachSuppliers.length - 3}` : "";

    return await new Promise<boolean>((resolve) => {
      Alert.alert(
        "Не все вложения прикреплены",
        `Нет вложений для: ${list}${more}.\nПозиции этих поставщиков уйдут директору без вложений. Продолжить?`,
        [
          { text: "Отмена", style: "cancel", onPress: () => resolve(false) },
          { text: "Отправить без части вложений", style: "destructive", onPress: () => resolve(true) },
        ]
      );
    });
  }, [attachMissingCount, attachSlotsTotal, missingAttachSuppliers]);

  const handleCreateProposalsBySupplier = useCallback(async () => {
    if (creating) return;
    setCreating(true);

    try {
      await handleCreateProposalsBySupplierAction({
        creating,
        sendingRef,

        pickedIds: pickedIdsRef.current || [],
        metaNow: metaRef.current || {},
        attachmentsNow: attachmentsRef.current || {},
        buyerFio: (buyerFioRef.current || "").trim(),

        needAttachWarn,
        kbOpen,

        validatePicked,
        confirmSendWithoutAttachments,

        apiCreateProposalsBySupplier,
        supabase,
        uploadProposalAttachment,

        setAttachments,
        removeFromInboxLocally,
        clearPick,
        fetchInbox,
        fetchBuckets,
        setTab,
        closeSheet,

        setShowAttachBlock,
        showToast,
        alert: (t, m) => Alert.alert(t, m),
      });
    } finally {
      setCreating(false);
    }
  }, [
    creating,
    needAttachWarn,
    kbOpen,
    validatePicked,
    confirmSendWithoutAttachments,
    fetchInbox,
    fetchBuckets,
    removeFromInboxLocally,
    clearPick,
    closeSheet,
    showToast,
  ]);

  const openProposalPdf = useCallback(
    async (pid: string | number) => {
      const id = String(pid || "").trim();
      if (!id) return;

      await runPdfTop({
        busy,
        supabase,
        key: `pdf:proposal:${id}`,
        label: "Открываю PDF…",
        mode: "preview",
        fileName: `Предложение_${id.slice(0, 8)}`,
        getRemoteUrl: () => exportProposalPdf(id as any, "preview"),
      });
    },
    [busy, supabase]
  );
  async function ensureProposalDocumentAttached(pidStr: string) {
    setPropDocBusy(true);
    try {
      const latest = await repoGetLatestProposalPdfAttachment(supabase, pidStr);

      if (latest?.file_name) {
        setPropDocAttached({ name: latest.file_name });
        return;
      }

      const html = await buildProposalPdfHtml(pidStr);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const name = `proposal_${pidStr.slice(0, 8)}.html`;

      await uploadProposalAttachment(pidStr, blob as any, name, "proposal_pdf");
      setPropDocAttached({ name });
    } catch (e) {
      console.warn("[buyer] ensureProposalDocumentAttached:", (e as any)?.message ?? e);
    } finally {
      setPropDocBusy(false);
    }
  }
  async function prefillAccountingFromProposal(pidStr: string) {
    try {
      const rows = await repoGetProposalItemsForAccounting(supabase, pidStr);

      let total = 0;
      for (const r of rows) {
        const qty = Number(r?.qty) || 0;
        const price = Number(r?.price) || 0;
        total += qty * price;
      }
      if (total > 0) setInvAmount(String(total));

      const names = Array.from(new Set(rows.map((r: any) => String(r?.supplier || "").trim()).filter(Boolean)));
      const name = names[0] || "";

      if (!name) {
        setAcctSupp(null);
        return;
      }

      const card = await repoGetSupplierCardByName(supabase, name);
      setAcctSupp({
        name: card?.name || name,
        inn: card?.inn || null,
        bank: (card as any)?.bank_account || null,
        phone: card?.phone || null,
        email: card?.email || null,
      });
    } catch {
      setAcctSupp(null);
    }
  }
  const loadProposalAttachments = useCallback(async (pidStr: string) => {
    const pid = String(pidStr || "").trim();
    if (!pid) return;

    setPropAttErrByPid((prev) => ({ ...prev, [pid]: "" }));
    setPropAttBusy(true);

    try {
      const rows = await repoListProposalAttachments(supabase, pid);
      console.log("[ATTACH SAMPLE]", rows?.[0]);
      setPropAttByPid((prev) => ({ ...prev, [pid]: rows }));
    } catch (e: any) {
      setPropAttErrByPid((prev) => ({ ...prev, [pid]: e?.message ?? String(e) }));
    } finally {
      setPropAttBusy(false);
    }
  }, []);
  const pickUrl = (x: any) =>
    String(x?.signed_url || x?.public_url || x?.url || x?.file_url || x?.file_public_url || "").trim();

  const openPropAttachment = useCallback(
    async (att: any) => {
      try {
        let url = pickUrl(att);


        if (!url && att?.id) {
          const q = await supabase
            .from("proposal_attachments")
            .select("id, file_name, url, bucket_id, storage_path")
            .eq("id", String(att.id))
            .maybeSingle();

          const row = q?.data || null;
          url = pickUrl(row);

          const bucket = String((row as any)?.bucket_id || "").trim();
          const path = String((row as any)?.storage_path || "").trim();

          if (!url && bucket && path) {
            const s = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 30);
            url = String(s?.data?.signedUrl || "").trim();
          }
        }

        if (!url) {
          Alert.alert("Вложение", "Нет ссылки на файл (url пустой и нет bucket_id/storage_path)");
          return;
        }
        await openSignedUrlUniversal(url, String(att?.file_name ?? att?.name ?? "file"));
      } catch (e: any) {
        Alert.alert("Вложение", e?.message ?? "Не удалось открыть файл");
      }
    },
    [supabase]
  );

  const attachFileToProposal = useCallback(async (pidStr: string, groupKey: string) => {
    await attachFileToProposalAction({
      proposalId: String(pidStr),
      groupKey,
      pickFileAny,
      uploadProposalAttachment,
      loadProposalAttachments,
      setBusy: setPropAttBusy,
      alert: (t, m) => Alert.alert(t, m),
    });
  }, [loadProposalAttachments]);


  function openAccountingModal(proposalId: string | number) {
    setAcctProposalId(proposalId);
    setInvNumber('');
    setInvDate(new Date().toISOString().slice(0, 10));
    setInvAmount('');
    setInvCurrency('KGS');
    setInvFile(null);
    setPropDocAttached(null);
    setAcctSupp(null);
    openAccountingSheet(proposalId);
    ensureProposalDocumentAttached(String(proposalId));
    prefillAccountingFromProposal(String(proposalId));
  }

  async function pickInvoiceFile(): Promise<any | null> {
    const f = await pickInvoiceFileAction();
    if (!f) {
      // 1:1 поведение: раньше ты показывал Alert только на исключениях.
      // тут молчим, потому что action возвращает null при cancel/ошибке
      return null;
    }
    return f;
  }


  async function ensureAccountingFlags(pidStr: string, invoiceAmountNum?: number) {
    try {
      const chk = await supabase
        .from('proposals')
        .select('payment_status, sent_to_accountant_at, invoice_amount')
        .eq('id', pidStr)
        .maybeSingle();

      if (chk.error) return;

      const ps = String(chk.data?.payment_status ?? '').trim();
      const sent = !!chk.data?.sent_to_accountant_at;
      const shouldReset = ps.length === 0 || /^на доработке/i.test(ps);


      if (!sent || shouldReset || (chk.data?.invoice_amount == null && typeof invoiceAmountNum === 'number')) {
        const upd: any = {};
        if (!sent) upd.sent_to_accountant_at = new Date().toISOString();
        if (shouldReset) upd.payment_status = 'К оплате';
        if (chk.data?.invoice_amount == null && typeof invoiceAmountNum === 'number') {
          upd.invoice_amount = invoiceAmountNum;
        }
        if (Object.keys(upd).length) {
          await supabase.from('proposals').update(upd).eq('id', pidStr);
          await proposalSubmit(pidStr as any);   // чтобы статус согласования не «переехал» назад
        }
      }
    } catch (e) {

    }
  }
  const sendToAccounting = useCallback(async () => {
    if (!acctProposalId) return;

    await sendToAccountingAction({
      acctProposalId: String(acctProposalId),

      invNumber,
      invDate,
      invAmount,
      invCurrency,
      invFile,
      invoiceUploadedName,

      buildProposalPdfHtml,
      proposalSendToAccountant: async (payload) => {
        await proposalSendToAccountant(payload as any);
      },
      uploadProposalAttachment,
      ensureAccountingFlags,

      supabase,
      fetchBuckets,
      closeSheet,


      setApproved,

      setBusy: setAcctBusy,
      alert: (t, m) => Alert.alert(t, m),
      log: console.warn,
    });
  }, [
    acctProposalId,
    invNumber,
    invDate,
    invAmount,
    invCurrency,
    invFile,
    invoiceUploadedName,
    fetchBuckets,
    closeSheet,
    ensureAccountingFlags,
  ]);

  const [rwBusy, setRwBusy] = useState(false);
  const [rwPid, setRwPid] = useState<string | null>(null);
  const [rwReason, setRwReason] = useState<string>('');
  type RwItem = {
    request_item_id: string;
    name_human?: string | null;
    uom?: string | null;
    qty?: number | null;
    price?: string;
    supplier?: string;
    note?: string;
  };
  const [rwItems, setRwItems] = useState<RwItem[]>([]);



  const [rwInvNumber, setRwInvNumber] = useState('');
  const [rwInvDate, setRwInvDate] = useState(new Date().toISOString().slice(0, 10));
  const [rwInvAmount, setRwInvAmount] = useState('');
  const [rwInvCurrency, setRwInvCurrency] = useState('KGS');
  const [rwInvFile, setRwInvFile] = useState<any | null>(null);
  const [rwInvUploadedName, setRwInvUploadedName] = useState('');

  // источник возврата: 'director' | 'accountant'
  const [rwSource, setRwSource] = useState<'director' | 'accountant'>('director');
  const openProposalView = useCallback(async (pidStr: string, head: any) => {
    const pid = String(pidStr || "").trim();
    if (pid) {
      // ✅ подгружаем PR-номер заранее, чтобы заголовок был красивый
      await preloadProposalNosByIds([pid]);
    }

    await openProposalViewAction({
      pidStr: String(pidStr),
      head,
      supabase,
      openPropDetailsSheet,
      setPropViewId,
      setPropViewHead,
      setPropViewLines,
      setPropViewBusy,
      log: console.warn,
    });
  }, [preloadProposalNosByIds]);
  const openProposalDetailsLines = useCallback(async (pidStr: string, head: any) => {

    await loadProposalAttachments(String(pidStr));
    await openProposalView(pidStr, head);
  }, [loadProposalAttachments, openProposalView]);
  if (Platform.OS === "web") {
    requestAnimationFrame(() => {
      try {
        const el = document.getElementById("propAttachmentsAnchor");
        el?.scrollIntoView?.({ behavior: "smooth", block: "start" });
      } catch { }
    });
  }

  const openProposalDetailsAttachments = useCallback(async (pidStr: string, head: any) => {

    await loadProposalAttachments(String(pidStr));
    await openProposalView(pidStr, head);
  }, [loadProposalAttachments, openProposalView]);

  const openRework = useCallback(async (pidStr: string) => {
    await openReworkAction({
      pid: String(pidStr),
      supabase,

      openReworkSheet,

      setRwBusy,
      setRwPid,
      setRwReason,
      setRwItems,
      setRwInvNumber,
      setRwInvDate,
      setRwInvAmount,
      setRwInvCurrency,
      setRwInvFile,
      setRwInvUploadedName,
      setRwSource,

      alert: (t, m) => Alert.alert(t, m),
    });
  }, []);

  const rwSaveItems = useCallback(async () => {
    if (!rwPid) return;
    await rwSaveItemsAction({
      pid: rwPid,
      items: rwItems,
      supabase,
      setBusy: setRwBusy,
      alert: (t, m) => Alert.alert(t, m),
    });
  }, [rwPid, rwItems]);

  const rwPickInvoiceWeb = useCallback(async () => {
    if (!rwPid) return;
    await openInvoicePickerWebAction({
      proposalId: String(rwPid),
      uploadProposalAttachment,
      setInvoiceUploadedName: setRwInvUploadedName,
      alert: (t, m) => Alert.alert(t, m),
    });
  }, [rwPid]);

  const rwPickInvoiceNative = useCallback(async () => {
    const f = await pickInvoiceFileAction();
    if (!f) return;
    setRwInvFile(f || null);
    if (f?.name) setRwInvUploadedName(f.name);
  }, []);

  const rwSendToDirector = useCallback(async () => {
    if (!rwPid) return;
    await rwSendToDirectorAction({
      pid: rwPid,
      items: rwItems,
      supabase,
      proposalSubmit: async (pid) => {
        await proposalSubmit(pid as any);
      },
      fetchBuckets,
      setRejected,
      closeSheet,
      setBusy: setRwBusy,
      alert: (t, m) => Alert.alert(t, m),
    });
  }, [rwPid, rwItems, fetchBuckets, closeSheet]);

  const rwSendToAccounting = useCallback(async () => {
    if (!rwPid) return;

    await rwSendToAccountingAction({
      pid: rwPid,
      items: rwItems,

      invNumber: rwInvNumber,
      invDate: rwInvDate,
      invAmount: rwInvAmount,
      invCurrency: rwInvCurrency,
      invFile: rwInvFile,

      supabase,

      buildProposalPdfHtml,
      uploadProposalAttachment,
      proposalSendToAccountant: async (payload) => {
        await proposalSendToAccountant(payload as any);
      },
      ensureAccountingFlags,

      fetchBuckets,
      setRejected,
      closeSheet,

      setBusy: setRwBusy,
      alert: (t, m) => Alert.alert(t, m),
    });
  }, [
    rwPid,
    rwItems,
    rwInvNumber,
    rwInvDate,
    rwInvAmount,
    rwInvCurrency,
    rwInvFile,
    fetchBuckets,
    closeSheet,
    ensureAccountingFlags,
  ]);

  const listData = useMemo(
    () => selectListData(tab, groups, pending, approved, rejected),
    [tab, groups, pending, approved, rejected]
  );

  const renderProposalCard = useCallback((item: any) => {
    const pid = String(item?.id ?? "");
    const cnt = pid ? (propAttByPid?.[pid]?.length ?? null) : null;

    return (
      <BuyerProposalCard
        s={s}
        head={item}
        title={titleByPid[String(item?.id ?? "")] || ""}
        attCount={typeof cnt === "number" ? cnt : null}
        onOpenPdf={(pid2) => openProposalPdf(pid2)}
        onOpenAccounting={(pid2) => openAccountingModal(pid2)}
        onOpenRework={(pid2) => openRework(pid2)}
        onOpenDetails={(pid2) => openProposalDetailsLines(pid2, item)}
        onOpenAttachments={(pid2) => openProposalDetailsAttachments(pid2, item)}
      />
    );
  }, [
    titleByPid,
    propAttByPid,
    openProposalPdf,
    openAccountingModal,
    openRework,
    openProposalDetailsLines,
    openProposalDetailsAttachments,
  ]);

  const pendingCount = pending.length;
  const approvedCount = approved.length;
  const rejectedCount = rejected.length;
  const inboxCount = groups.length; // ✅ кол-во входящих ЗАЯВОК
  const header = useMemo(() => (
    <BuyerScreenHeader
      s={s}
      tab={tab}
      setTab={setTab}
      buyerFio={buyerFio}
      setBuyerFio={setBuyerFio}
      titleSize={titleSize}
      subOpacity={subOpacity}
      inboxCount={inboxCount}
      pendingCount={pending.length}
      approvedCount={approved.length}
      rejectedCount={rejected.length}
      tabsScrollRef={tabsScrollRef}
      scrollTabsToStart={scrollTabsToStart}
    />
  ), [
    tab,
    buyerFio,
    titleSize,
    subOpacity,
    inboxCount,
    pending.length,
    approved.length,
    rejected.length,
    scrollTabsToStart,
  ]);

  const ScreenBody = (
    <View style={[s.screen, { backgroundColor: UI.bg }]}>


      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, opacity: 0, zIndex: -1 }}
        onLayout={(e) => {
          const h = Math.round(e?.nativeEvent?.layout?.height ?? 0);
          if (h > 0 && h > measuredHeaderMax + 2) {
            requestAnimationFrame(() => setMeasuredHeaderMax(h));
          }

        }}
      >
        {header}
      </View>


      <Animated.View
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          zIndex: 50,
          height: headerHeight,
          backgroundColor: UI.cardBg,
          borderBottomWidth: 1,
          borderColor: UI.border,
          paddingTop: Platform.OS === 'web' ? 10 : 12,
          paddingBottom: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowRadius: 14,
          shadowOpacity: headerShadow as any,
          elevation: 6,
        }}
      >
        {header}
      </Animated.View>

      <BuyerMainList
        s={s}
        tab={tab}
        data={listData}
        listRef={listRef}
        measuredHeaderMax={measuredHeaderMax}
        refreshing={refreshing}
        onRefresh={onRefresh}
        loadingInbox={loadingInbox}
        loadingBuckets={loadingBuckets}
        scrollY={scrollY}
        renderGroupBlock={(g, index) => renderGroupBlock(g as any, index)}
        renderProposalCard={renderProposalCard}
      />



      <BuyerSheetShell
        isOpen={isSheetOpen}
        onClose={closeSheet}
        s={s}
        title={
          sheetKind === "inbox" && sheetGroup
            ? (() => {
              const rid = String(sheetGroup.request_id || "").trim();
              const pr = (prNoByReq?.[rid] || "").trim();
              const reqLabel = prettyLabel(sheetGroup.request_id, sheetGroup.request_id_old ?? null);
              return pr ? pr : reqLabel;
            })()
            : sheetKind === "accounting" && acctProposalId != null
              ? `В бухгалтерию • ${formatProposalBaseNo(null, String(acctProposalId))}`
              : sheetKind === "rework" && rwPid
                ? `Доработка • ${formatProposalBaseNo(null, String(rwPid))}`
                : sheetKind === "prop_details" && propViewId
                  ? `Предложение • ${formatProposalBaseNo(
                    proposalNoByPid[String(propViewId)] || null,
                    String(propViewId)
                  )}`

                  : sheetKind === "rfq"
                    ? "Торги (RFQ)"
                    : "—"
        }

      >
        <KeyboardAvoidingView
          style={{ flex: 1, minHeight: 0 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          <View style={s.sheetBody}>
            {sheetKind === "inbox" && sheetGroup ? (
              <BuyerInboxSheetBody
                s={s}
                sheetGroup={sheetGroup}
                sheetData={sheetData}
                kbOpen={kbOpen}
                creating={creating}
                needAttachWarn={needAttachWarn}
                showAttachBlock={showAttachBlock}
                setShowAttachBlock={setShowAttachBlock}
                requiredSuppliers={requiredSuppliers}
                missingAttachSuppliers={missingAttachSuppliers}
                attachMissingCount={attachMissingCount}
                attachFilledCount={attachFilledCount}
                attachSlotsTotal={attachSlotsTotal}
                pickedIdsLen={pickedIds.length}
                attachments={attachments}
                setAttachments={setAttachments}
                renderItemRow={renderItemRow}
                footer={
                  !kbOpen ? (
                    <SheetFooterActions
                      s={s}
                      left={
                        <IconSquareButton
                          onPress={clearPick}
                          disabled={pickedIds.length === 0 || creating}
                          accessibilityLabel="Очистить выбор"
                          width={52}
                          height={52}
                          radius={16}
                          bg="#1F2933"
                          bgPressed="#273341"
                          bgDisabled="#111827"
                          spinnerColor="#FFFFFF"
                        >
                          <Ionicons name="close" size={22} color="#FFFFFF" />
                        </IconSquareButton>
                      }
                      center={
                        <AppButton
                          label="ТОРГИ"
                          variant="blue"
                          shape="wide"
                          disabled={creating || pickedIds.length === 0}
                          onPress={openRfqSheet}
                        />
                      }
                      right={
                        <View style={needAttachWarn ? s.sendBtnWarnWrap : null}>
                          <SendPrimaryButton
                            variant="green"
                            disabled={creating}
                            loading={creating}
                            accessibilityLabel="Отправить директору"
                            onPress={handleCreateProposalsBySupplier}
                          />
                        </View>
                      }
                    />
                  ) : null
                }
              />
            ) : null}

            {sheetKind === "prop_details" ? (
              <BuyerPropDetailsSheetBody
                s={s}
                propViewBusy={propViewBusy}
                propViewLines={propViewLines}
                isReqContextNote={isReqContextNote}
                extractReqContextLines={extractReqContextLines}

                propAttBusy={propAttBusy}
                propAttErr={propViewId ? (propAttErrByPid[propViewId] || "") : ""}
                attachments={propViewId ? (propAttByPid[propViewId] || []) : []}

                onReloadAttachments={() => {
                  if (propViewId) loadProposalAttachments(propViewId);
                }}
                onAttachFile={() => {
                  if (propViewId) attachFileToProposal(propViewId, "extra");
                }}
                onOpenAttachment={openPropAttachment}
              />
            ) : null}

            {sheetKind === "accounting" ? (
              <BuyerAccountingSheetBody
                s={s}
                isWeb={isWeb}
                acctProposalId={acctProposalId}
                propDocBusy={propDocBusy}
                propDocAttached={propDocAttached}
                acctSupp={acctSupp}
                invNumber={invNumber}
                setInvNumber={setInvNumber}
                invDate={invDate}
                setInvDate={setInvDate}
                invAmount={invAmount}
                setInvAmount={setInvAmount}
                invCurrency={invCurrency}
                setInvCurrency={setInvCurrency}
                invoiceUploadedName={invoiceUploadedName}
                openInvoicePickerWeb={openInvoicePickerWeb}
                invFile={invFile}
                pickInvoiceFile={pickInvoiceFile}
                setInvFile={setInvFile}
                acctBusy={acctBusy}
                sendToAccounting={sendToAccounting}
                closeSheet={closeSheet}
              />
            ) : null}

            {sheetKind === "rework" ? (
              <BuyerReworkSheetBody
                s={s}
                rwBusy={rwBusy}
                rwPid={rwPid}
                rwReason={rwReason}
                rwItems={rwItems}
                setRwItems={setRwItems}
                rwInvNumber={rwInvNumber}
                setRwInvNumber={setRwInvNumber}
                rwInvDate={rwInvDate}
                setRwInvDate={setRwInvDate}
                rwInvAmount={rwInvAmount}
                setRwInvAmount={setRwInvAmount}
                rwInvCurrency={rwInvCurrency}
                setRwInvCurrency={setRwInvCurrency}
                rwInvFile={rwInvFile}
                setRwInvFile={setRwInvFile}
                rwInvUploadedName={rwInvUploadedName}
                pickInvoiceFile={rwPickInvoiceNative}
                rwSaveItems={rwSaveItems}
                rwSendToDirector={rwSendToDirector}
                rwSendToAccounting={rwSendToAccounting}
                closeSheet={closeSheet}
              />
            ) : null}

            {sheetKind === "rfq" ? (
              <BuyerRfqSheetBody
                s={s}
                rfqBusy={rfqBusy}
                closeSheet={closeSheet}
                pickedIdsLen={pickedIds.length}
                rfqShowItems={rfqShowItems}
                setRfqShowItems={setRfqShowItems}
                rfqPickedPreview={rfqPickedPreview}
                fmtLocal={fmtLocal}
                rfqDeadlineIso={rfqDeadlineIso}
                setDeadlineHours={setDeadlineHours}
                isDeadlineHoursActive={isDeadlineHoursActive}
                rfqDeliveryDays={rfqDeliveryDays}
                setRfqDeliveryDays={setRfqDeliveryDays}
                rfqDeliveryType={rfqDeliveryType}
                setRfqDeliveryType={setRfqDeliveryType}
                rfqCity={rfqCity}
                setRfqCity={setRfqCity}
                rfqCountryCodeTouchedRef={rfqCountryCodeTouched}
                inferCountryCode={inferCountryCodeHelper}
                setRfqCountryCode={setRfqCountryCode}
                rfqAddressText={rfqAddressText}
                setRfqAddressText={setRfqAddressText}
                rfqDeliveryWindow={rfqDeliveryWindow}
                setRfqDeliveryWindow={setRfqDeliveryWindow}
                rfqCountryCode={rfqCountryCode}
                rfqPhone={rfqPhone}
                setRfqPhone={setRfqPhone}
                rfqEmail={rfqEmail}
                setRfqEmail={setRfqEmail}
                rfqRememberContacts={rfqRememberContacts}
                setRfqRememberContacts={setRfqRememberContacts}
                rfqVisibility={rfqVisibility}
                setRfqVisibility={setRfqVisibility}
                rfqPaymentTerms={rfqPaymentTerms}
                setRfqPaymentTerms={setRfqPaymentTerms}
                rfqNeedInvoice={rfqNeedInvoice}
                setRfqNeedInvoice={setRfqNeedInvoice}
                rfqNeedWaybill={rfqNeedWaybill}
                setRfqNeedWaybill={setRfqNeedWaybill}
                rfqNeedCert={rfqNeedCert}
                setRfqNeedCert={setRfqNeedCert}
                rfqNote={rfqNote}
                setRfqNote={setRfqNote}
                publishRfq={publishRfq}
              />
            ) : null}
          </View>
        </KeyboardAvoidingView>

      </BuyerSheetShell>
      <ToastOverlay toast={toast} />
    </View>
  );
  return ScreenBody;
}


const s = StyleSheet.create({
  screen: { flex: 1 },


  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingRight: 16,
    paddingVertical: 6,
  },
  tabLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  tabPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tabPillActive: { backgroundColor: UI.cardBg, borderColor: UI.accent },
  tabPillText: {
    color: UI.sub,
    fontWeight: '800',
    fontSize: 14,
    lineHeight: 18,
  },
  tabPillTextActive: { color: UI.text },

  tabBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,255,255,0.18)',
  },
  tabBadgeText: { fontSize: 12, fontWeight: '900', color: '#E5E7EB' },
  tabBadgeTextActive: { color: '#FFFFFF' },


  group: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 18,
    backgroundColor: UI.cardBg,
    marginBottom: 12,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  groupTitle: { fontSize: 16, fontWeight: '900', color: UI.text },
  groupMeta: { fontSize: 12, fontWeight: '800', color: UI.sub },


  card: {
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 18,
    backgroundColor: UI.cardBg,
  },
  cardPicked: { backgroundColor: 'rgba(255,255,255,0.03)' },

  cardTitle: { fontSize: 16, fontWeight: '800', color: UI.text },
  cardMeta: { marginTop: 6, color: UI.sub, fontSize: 14, fontWeight: '700' },


  smallBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  smallBtnText: { fontWeight: '900', color: UI.text, fontSize: 12 },

  openBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13, letterSpacing: 0.2 },


  fioLabel: { fontSize: 12, color: D.sub, fontWeight: '700', marginBottom: 4 },
  fioInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: D.text,
  },

  fieldLabel: { fontSize: 12, color: D.sub, fontWeight: '700', marginBottom: 4 },
  fieldInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: D.text,
  },

  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: D.text,
    minWidth: 220,
  },


  suggestBoxInline: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(16,24,38,0.92)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  suggestItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(16,24,38,0.92)',
  },


  proposalCard: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: UI.cardBg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },


  dirSheet: {
    height: '88%',
    width: "100%",
    alignSelf: "stretch",
    backgroundColor: D.cardBg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },

  dirSheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 10,
  },
  dirSheetTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  dirSheetTitle: {
    flex: 1,
    minWidth: 0,
    color: D.text,
    fontWeight: '900',
    fontSize: 18,
    lineHeight: 22,
  },
  dirSheetCloseBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.10)',
    flexShrink: 0,
  },
  dirSheetCloseText: { color: '#0B0F14', fontWeight: '900', fontSize: 13 },
  reqActionsBottom: {
    marginTop: 12,
    width: "100%",
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",

    padding: 10,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    flexShrink: 0,
  },
  buyerMobCard: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(16,24,38,0.92)',
    borderWidth: 1.25,
    borderColor: 'rgba(255,255,255,0.16)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },
  buyerMobCardPicked: {
    borderColor: 'rgba(34,197,94,0.55)',
    backgroundColor: 'rgba(16,24,38,0.98)',
  },

  dirMobCard: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(16,24,38,0.92)',
    borderWidth: 1.25,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  dirMobMain: { flex: 1, minWidth: 0 },
  dirMobTitle: { fontSize: 16, fontWeight: '900', color: D.text },
  dirMobMeta: { marginTop: 6, fontSize: 13, fontWeight: '800', color: D.sub },
  dirMobNote: { marginTop: 6, fontSize: 13, fontWeight: '800', color: D.text, opacity: 0.95 },

  // misc
  openBody: { paddingTop: 10, paddingBottom: 12 },
  itemsPanel: { marginTop: 10, marginHorizontal: 12, marginBottom: 12 },
  itemsBox: {},
  modalTitle: { fontSize: 18, fontWeight: '800', color: D.text },
  modalHelp: { fontSize: 12, color: D.sub },
  reqNoteBox: {
    marginTop: 8,
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: UI.border,
    borderLeftWidth: 4,
    borderLeftColor: UI.accent,
  },
  reqNoteLine: {
    color: UI.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
    fontWeight: "800",
  },
  warnPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(239,68,68,0.14)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.45)",
  },
  warnDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#EF4444",
  },
  warnPillText: {
    color: "#FCA5A5",
    fontWeight: "900",
    fontSize: 12,
  },

  sendHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "rgba(239,68,68,0.10)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.35)",
  },
  sendHintText: {
    color: "#FCA5A5",
    fontWeight: "900",
    fontSize: 12,
    flex: 1,
    minWidth: 0,
  },
  sendBtnWarnWrap: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.45)",
    padding: 2,
    backgroundColor: "rgba(239,68,68,0.06)",
  },
  sheetBody: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    alignSelf: "stretch",
    alignItems: "stretch",
  },

  sheetSection: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    alignSelf: "stretch",
  },
  sumPill: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  sumPillText: {
    color: UI.text,
    fontWeight: "900",
    fontSize: 12,
  },

});
