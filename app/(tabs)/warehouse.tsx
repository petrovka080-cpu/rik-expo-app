// app/(tabs)/warehouse.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
  TextInput,
  Animated,
  Keyboard,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";


import { supabase } from "../../src/lib/supabaseClient";
import { formatProposalBaseNo, roleBadgeLabel } from "../../src/lib/format";
import PeriodPickerSheet from "../../src/components/PeriodPickerSheet";

import { useWarehouseIncoming } from "../../src/screens/warehouse/warehouse.incoming";
import {
  uomLabelRu,
} from "../../src/screens/warehouse/warehouse.uom";

import { useWarehouseRecipient } from "../../src/screens/warehouse/warehouse.recipient";
import { useWarehouseStockPick } from "../../src/screens/warehouse/warehouse.stockPick";
import { useWarehouseReqPick } from "../../src/screens/warehouse/warehouse.reqPick";
import WarehouseHeader, { useWarehouseHeaderApi } from "../../src/screens/warehouse/components/WarehouseHeader";
import { useWarehouseReports } from "../../src/screens/warehouse/warehouse.reports";
import WarehouseReportsTab from "../../src/screens/warehouse/components/WarehouseReportsTab";

import {
  apiFetchStock,
  apiFetchReqHeads,
  apiFetchReqItems,
  apiFetchReports,
  apiFetchIncomingReports,
} from "../../src/screens/warehouse/warehouse.api";



import { useGlobalBusy } from "../../src/ui/GlobalBusy";
import { seedEnsureIncomingItems } from "../../src/screens/warehouse/warehouse.seed";
import { showToast } from "../../src/ui/toast";
import { useStockAvailability } from "../../src/screens/warehouse/warehouse.availability";
import { useWarehousePdf } from "../../src/screens/warehouse/warehouse.pdfs";
import { useWarehouseDicts } from "../../src/screens/warehouse/warehouse.dicts";
import { useWarehouseScope } from "../../src/screens/warehouse/warehouse.scope";
import StockRowView from "../../src/screens/warehouse/components/StockRowView";
import HistoryRowView from "../../src/screens/warehouse/components/HistoryRowView";
import ExpenditureHeader from "../../src/screens/warehouse/components/ExpenditureHeader";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import type {
  IncomingRow, StockRow, ReqHeadRow, ReqItemUiRow,
  Option, Tab,
} from "../../src/screens/warehouse/warehouse.types";
import { makeWarehouseIssueActions } from "../../src/screens/warehouse/warehouse.issue";

import { UI, s } from "../../src/screens/warehouse/warehouse.styles";

import StockFactHeader from "../../src/screens/warehouse/components/StockFactHeader";
import IssueDetailsSheet from "../../src/screens/warehouse/components/IssueDetailsSheet";
import IncomingDetailsSheet from "../../src/screens/warehouse/components/IncomingDetailsSheet";
import IncomingItemsSheet from "../../src/screens/warehouse/components/IncomingItemsSheet";
import ReqIssueModal from "../../src/screens/warehouse/components/ReqIssueModal";
import PickOptionSheet from "../../src/screens/warehouse/components/PickOptionSheet";
import StockIssueSheet from "../../src/screens/warehouse/components/StockIssueSheet";
import {
  nz,
  pickErr,
  showErr,
  norm,
  parseQtySelected,
  matchQuerySmart,
} from "../../src/screens/warehouse/warehouse.utils";


const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const ORG_NAME = "";
const REPORTS_CACHE_TTL_MS = 60 * 1000;
export default function Warehouse() {
  const busy = useGlobalBusy();
  const insets = useSafeAreaInsets();
  const notifyInfo = useCallback((title: string, message?: string) => {
    showToast.info(title, message);
  }, []);
  const notifyError = useCallback((title: string, message?: string) => {
    showToast.error(title, message);
  }, []);
  const [tab, setTab] = useState<Tab>("К приходу");
  const incoming = useWarehouseIncoming();

  const [stockSearch, setStockSearch] = useState<string>("");

  const [stockSearchDeb, setStockSearchDeb] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setStockSearchDeb(stockSearch), 180);
    return () => clearTimeout(t);
  }, [stockSearch]);

  const isWeb = Platform.OS === "web";
  const headerApi = useWarehouseHeaderApi({ isWeb, hasSubRow: false });
  const HEADER_MAX = 92;

  const renderPrWithRoleBadge = useCallback((pr: string, roleLabel: string) => {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Text style={{ fontWeight: "900", color: UI.text }}>{pr}</Text>

        {!!roleLabel && (
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
              {roleLabel}
            </Text>
          </View>
        )}
      </View>
    );
  }, []);
  const [kbH, setKbH] = useState(0);

  const [warehousemanFio, setWarehousemanFio] = useState("");
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem("wh_warehouseman_fio");
      if (saved) setWarehousemanFio(saved);
    })();
  }, []);

  const [reportsMode, setReportsMode] = useState<"choice" | "issue" | "incoming">("choice");


  const [itemsModal, setItemsModal] = useState<{
    incomingId: string;
    purchaseId: string;
    poNo: string | null;
    status: string; // incoming_status
  } | null>(null);

  const [qtyInputByItem, setQtyInputByItem] = useState<Record<string, string>>({});
  const [receivingHeadId, setReceivingHeadId] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!itemsModal) {
      setKbH(0);
      return;
    }
    const onShow = (e: any) => {
      const h = Number(e?.endCoordinates?.height ?? 0);
      setKbH(h > 0 ? h : 0);
    };
    const onHide = () => setKbH(0);
    const subShow =
      Platform.OS === "ios"
        ? Keyboard.addListener("keyboardWillShow", onShow)
        : Keyboard.addListener("keyboardDidShow", onShow);
    const subHide =
      Platform.OS === "ios"
        ? Keyboard.addListener("keyboardWillHide", onHide)
        : Keyboard.addListener("keyboardDidHide", onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [itemsModal]);
  const openItemsModal = useCallback((head: any) => {
    const incomingId = String(head?.incoming_id ?? "").trim();
    if (!incomingId) return;

    setItemsModal({
      incomingId,
      purchaseId: String(head?.purchase_id ?? ""),
      poNo: head?.po_no ?? null,
      status: String(head?.incoming_status ?? ""),
    });
  }, []);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reqHeads, setReqHeads] = useState<ReqHeadRow[]>([]);
  const sortedReqHeads = useMemo(() => {
    return [...reqHeads].sort((a, b) => {
      const readyA = Math.max(0, Number(a.ready_cnt ?? 0));
      const readyB = Math.max(0, Number(b.ready_cnt ?? 0));
      if (readyA > 0 && readyB === 0) return -1;
      if (readyA === 0 && readyB > 0) return 1;
      return 0;
    });
  }, [reqHeads]);

  const [reqHeadsLoading, setReqHeadsLoading] = useState(false);

  const [reqHeadsFetchingPage, setReqHeadsFetchingPage] = useState(false);
  const reqRefs = useRef({ page: 0, hasMore: true, fetching: false });

  const [reqModal, setReqModal] = useState<ReqHeadRow | null>(null);

  const [reqItems, setReqItems] = useState<ReqItemUiRow[]>([]);
  const [reqItemsLoading, setReqItemsLoading] = useState(false);
  const [stock, setStock] = useState<StockRow[]>([]);
  const stockFetchMutex = useRef(false);

  const stockMaterialsByCode = useMemo(() => stock, [stock]);
  const [stockSupported, setStockSupported] = useState<null | boolean>(null);
  const [stockCount, setStockCount] = useState(0);

  const stockFiltered = useMemo(() => {
    const baseAll = stockMaterialsByCode || [];

    // ✅ PROD: по умолчанию скрываем нули
    const base = baseAll.filter((r) => nz((r as any).qty_available, 0) > 0);

    const qRaw = String(stockSearchDeb ?? "").trim();
    if (!qRaw) return base;

    const out: StockRow[] = [];
    for (const r of base) {
      const code = String(r?.code ?? "");
      const name = String(r?.name ?? "");
      const uom = String(r?.uom_id ?? "");
      const hay = `${code} ${name} ${uom} `;

      if (matchQuerySmart(hay, qRaw)) out.push(r);
      if (out.length >= 400) break;
    }
    return out;
  }, [stockMaterialsByCode, stockSearchDeb]);

  const matNameByCode = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of (stock || [])) {
      const code = String(
        (r as any).rik_code ?? (r as any).code ?? (r as any).material_code ?? ""
      )
        .trim()
        .toUpperCase();

      const name = String(
        (r as any).name_human ?? (r as any).name ?? (r as any).item_name_ru ?? ""
      ).trim();

      if (code && name && !m[code]) m[code] = name;
    }
    return m;
  }, [stock]);

  const [repStock, setRepStock] = useState<StockRow[]>([]);
  const [repMov, setRepMov] = useState<any[]>([]);
  const [repIssues, setRepIssues] = useState<any[]>([]);
  const [repIncoming, setRepIncoming] = useState<any[]>([]);
  const reportsReqSeqRef = useRef(0);
  const reportsInFlightRef = useRef<Map<string, Promise<void>>>(new Map());
  const reportsCacheRef = useRef<
    Map<string, { ts: number; repStock: any[]; repMov: any[]; repIssues: any[]; repIncoming: any[] }>
  >(new Map());

  const [issueLinesById, setIssueLinesById] = useState<Record<string, any[]>>({});
  const [issueLinesLoadingId, setIssueLinesLoadingId] = useState<number | null>(null);
  const [issueDetailsId, setIssueDetailsId] = useState<number | null>(null);

  const [incomingLinesById, setIncomingLinesById] = useState<Record<string, any[]>>({});
  const [incomingLinesLoadingId, setIncomingLinesLoadingId] = useState<string | null>(null);
  const [incomingDetailsId, setIncomingDetailsId] = useState<string | null>(null);
  const [periodFrom, setPeriodFrom] = useState<string>("");
  const [periodTo, setPeriodTo] = useState<string>("");
  const reportsUi = useWarehouseReports({
    busy,
    supabase,

    repIssues,
    periodFrom,
    periodTo,

    orgName: ORG_NAME,
    warehouseName: "Склад",

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

  // ── PDF generation (extracted into useWarehousePdf) ──
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

  const [repPeriodOpen, setRepPeriodOpen] = useState(false);

  const fetchStock = useCallback(async () => {
    if (stockFetchMutex.current) return;

    stockFetchMutex.current = true;
    try {
      const r = await apiFetchStock(supabase as any, 0, 2000);

      const newRows = r.rows || [];

      setStock(newRows);
      setStockCount(newRows.length);
      setStockSupported(r.supported);
    } catch (e) {
      console.warn("[fetchStock] error", e);
    } finally {
      stockFetchMutex.current = false;
    }
  }, []);

  const fetchReqHeads = useCallback(async (pageIndex: number = 0, forceRefresh: boolean = false) => {
    if (reqRefs.current.fetching) return;
    if (pageIndex > 0 && !reqRefs.current.hasMore && !forceRefresh) return;

    reqRefs.current.fetching = true;
    setReqHeadsFetchingPage(true);
    if (pageIndex === 0) setReqHeadsLoading(true);

    try {
      const rows = await apiFetchReqHeads(supabase as any, pageIndex, 50);

      const hasNext = rows.length === 50;
      reqRefs.current.hasMore = hasNext;
      reqRefs.current.page = pageIndex;

      if (pageIndex === 0) {
        setReqHeads(rows);
      } else {
        setReqHeads((prev) => {
          const exist = new Set(prev.map(r => r.request_id));
          const toAdd = rows.filter(r => !exist.has(r.request_id));
          return [...prev, ...toAdd];
        });
      }
    } finally {
      reqRefs.current.fetching = false;
      setReqHeadsFetchingPage(false);
      if (pageIndex === 0) setReqHeadsLoading(false);
    }
  }, [supabase]);

  const fetchReqItems = useCallback(async (requestId: string) => {
    setReqItemsLoading(true);
    try {
      const rows = await apiFetchReqItems(supabase as any, requestId);
      setReqItems(rows);
    } finally {
      setReqItemsLoading(false);
    }
  }, []);

  const fetchReports = useCallback(async (opts?: { from?: string; to?: string }) => {
    const from = String(opts?.from ?? periodFrom ?? "").trim();
    const to = String(opts?.to ?? periodTo ?? "").trim();
    const key = `${from}|${to}`;
    const hit = reportsCacheRef.current.get(key);
    if (hit && Date.now() - hit.ts <= REPORTS_CACHE_TTL_MS) {
      setRepStock(hit.repStock as any);
      setRepMov(hit.repMov as any);
      setRepIssues(hit.repIssues as any);
      setRepIncoming(hit.repIncoming as any);
      return;
    }

    const inFlight = reportsInFlightRef.current.get(key);
    if (inFlight) {
      await inFlight;
      return;
    }

    const reqId = ++reportsReqSeqRef.current;
    const task = (async () => {
      const [r, inc] = await Promise.all([
        apiFetchReports(supabase as any, from, to),
        apiFetchIncomingReports(supabase as any, { from, to }),
      ]);
      if (reqId !== reportsReqSeqRef.current) return;

      const next = {
        ts: Date.now(),
        repStock: (r.repStock as any[]) || [],
        repMov: (r.repMov as any[]) || [],
        repIssues: (r.repIssues as any[]) || [],
        repIncoming: (inc as any[]) || [],
      };
      reportsCacheRef.current.set(key, next);
      setRepStock(next.repStock as any);
      setRepMov(next.repMov as any);
      setRepIssues(next.repIssues as any);
      setRepIncoming(next.repIncoming as any);
    })().finally(() => {
      reportsInFlightRef.current.delete(key);
    });

    reportsInFlightRef.current.set(key, task);
    await task;
  }, [periodFrom, periodTo]);
  // ── Scope & Picker (extracted) ──
  const scope = useWarehouseScope();
  const { objectOpt, levelOpt, systemOpt, zoneOpt, scopeLabel, scopeOpt, pickModal, pickFilter, setPickFilter, closePick, applyPick, setPickModal } = scope;

  // ── Dictionaries (extracted) ──
  const dicts = useWarehouseDicts(supabase, tab);
  const { objectList, levelList, systemList, zoneList, recipientList } = dicts;

  const rec = useWarehouseRecipient({
    enabled: tab === "Расход" || tab === "Склад факт",
    recipientList,
  });

  const [issueBusy, setIssueBusy] = useState(false);
  const [issueMsg, setIssueMsg] = useState<{
    kind: "error" | "ok" | null;
    text: string;
  }>({ kind: null, text: "" });

  // ── Shared availability lookup (eliminates 3× duplication) ──
  const availability = useStockAvailability(stock, matNameByCode);

  const reqPickUi = useWarehouseReqPick({
    nz,
    setIssueMsg,
    getAvailableByCode: availability.getAvailableByCode,
    getAvailableByCodeUom: availability.getAvailableByCodeUom,
  });

  const stockPickUi = useWarehouseStockPick({
    nz,
    rec,
    objectOpt,
    workTypeOpt: scopeOpt,
    setIssueMsg,
  });
  const openReq = useCallback(
    async (h: ReqHeadRow) => {
      const rid = String(h?.request_id ?? "").trim();
      if (!rid) return;

      setReqModal(h);
      reqPickUi.setReqQtyInputByItem({});
      reqPickUi.clearReqPick();
      setReqItems([]);

      setReqItemsLoading(true);
      try {
        const rows = await apiFetchReqItems(supabase as any, rid);
        setReqItems(Array.isArray(rows) ? rows : []);
      } catch (e) {
        setReqItems([]);
        showErr(e);
      } finally {
        setReqItemsLoading(false);
      }
    },
    [reqPickUi, supabase],
  );

  const closeReq = useCallback(() => {
    setReqModal(null);
    setReqItems([]);
    setReqItemsLoading(false);

    reqPickUi.setReqQtyInputByItem({});
    reqPickUi.clearReqPick();
  }, [reqPickUi]);

  const issueActions = useMemo(() => {
    return makeWarehouseIssueActions({
      supabase,
      nz,
      pickErr,
      getRecipient: () => rec.recipientText.trim(),
      getObjectLabel: () => String(objectOpt?.label ?? ""),
      getWorkLabel: () => scopeLabel,
      fetchStock,
      fetchReqItems,
      fetchReqHeads,
      getAvailableByCode: availability.getAvailableByCode,
      getAvailableByCodeUom: availability.getAvailableByCodeUom,
      getMaterialNameByCode: availability.getMaterialNameByCode,

      setIssueBusy,
      setIssueMsg,
      clearStockPick: () => stockPickUi.clearStockPick(),
      clearReqPick: () => reqPickUi.clearReqPick(),
      clearReqQtyInput: (requestItemId: string) => reqPickUi.clearQtyInput(String(requestItemId)),
    });

  }, [
    supabase,
    stock,
    nz,
    pickErr,
    rec.recipientText,
    objectOpt?.label,
    scopeLabel,
    fetchStock,
    fetchReqItems,
    fetchReqHeads,

    stockPickUi.clearStockPick,
    reqPickUi.clearReqPick,
    reqPickUi.clearQtyInput,
  ]);
  const submitReqPick = useCallback(async () => {
    const rid = String(reqModal?.request_id ?? "").trim();
    if (!rid) {
      setIssueMsg({ kind: "error", text: "Заявка не выбрана" });
      return;
    }

    const ok = await issueActions.submitReqPick({
      requestId: rid,
      requestDisplayNo: reqModal?.display_no ?? null,
      reqPick: reqPickUi.reqPick,
      reqItems,
    });

    // 🔥 PROD: сброс UI
    if (ok) {
      closeReq();
    }
  }, [
    issueActions,
    reqModal?.request_id,
    reqModal?.display_no,
    reqPickUi.reqPick,
    reqItems,
    closeReq,
  ]);
  const submitStockPick = useCallback(async () => {
    await issueActions.submitStockPick({ stockPick: stockPickUi.stockPick });
  }, [issueActions, stockPickUi.stockPick]);

  const issueByRequestItem = useCallback(
    async (row: ReqItemUiRow) => {
      const requestItemId = String(row.request_item_id || "").trim();
      const raw = String(reqPickUi.reqQtyInputByItem[requestItemId] ?? "").trim().replace(",", ".");
      const qty = Number(raw);
      const ok = await issueActions.issueByRequestItem({ row, qty });
      if (ok) {
        closeReq();
      }
    },
    [issueActions, reqPickUi.reqQtyInputByItem, closeReq]

  );


  // Dict loading is now handled by useWarehouseDicts hook
  useEffect(() => {
    if (!itemsModal) return;

    (async () => {
      await seedEnsureIncomingItems({ supabase, incomingId: itemsModal.incomingId });
      await incoming.loadItemsForHead(itemsModal.incomingId, true);
    })();

  }, [itemsModal?.incomingId]);

  const receiveSelectedForHead = useCallback(
    async (incomingIdRaw: string) => {
      try {
        const incomingId = String(incomingIdRaw ?? "").trim();
        if (!incomingId) return;

        // берём строки ТОЛЬКО через incoming-хук
        const freshRows = await incoming.loadItemsForHead(incomingId, true);

        if (!freshRows.length) {
          return notifyError(
            "Нет материалов",
            "В этой поставке нет материалов для склада. Работы/услуги смотри в «Подрядчики».",
          );
        }

        const toApply: Array<{ purchase_item_id: string; qty: number }> = [];
        for (const r of freshRows) {
          const exp = nz(r.qty_expected, 0);
          const rec = nz(r.qty_received, 0);
          const left = Math.max(0, exp - rec);
          if (!left) continue;

          const inputKey = String(r.incoming_item_id ?? r.purchase_item_id ?? "");
          const raw = qtyInputByItem[inputKey];
          if (raw == null || String(raw).trim() === "") continue;

          const qty = parseQtySelected(raw, left);
          if (qty > 0) toApply.push({ purchase_item_id: String(r.purchase_item_id), qty });
        }

        if (!toApply.length) {
          return notifyInfo("Нечего оприходовать", "Введите количество > 0 для нужных строк.");
        }

        setReceivingHeadId(incomingId);

        if (!warehousemanFio.trim()) {
          setItemsModal(null);
          return notifyError("ФИО обязательно", "Введите ФИО кладовщика во вкладке «К приходу»");
        }

        const { data, error } = await supabase.rpc("wh_receive_apply_ui" as any, {
          p_incoming_id: incomingId,
          p_items: toApply,
          p_warehouseman_fio: warehousemanFio.trim(),
          p_note: null,
        } as any);


        if (error) {
          console.warn("[wh_receive_apply_ui] error:", error.message);
          return notifyError("Ошибка прихода", pickErr(error));
        }

        // обновляем очередь + склад + строки в модалке
        await Promise.all([
          incoming.fetchToReceive(),
          fetchStock(),
          incoming.loadItemsForHead(incomingId, true),
        ]);

        // чистим вводы по строкам
        setQtyInputByItem((prev) => {
          const next = { ...(prev || {}) };
          for (const r of freshRows) {
            const k = String(r.incoming_item_id ?? r.purchase_item_id ?? "");
            delete next[k];
          }
          return next;
        });

        const ok = Number((data as any)?.ok ?? 0);
        const fail = Number((data as any)?.fail ?? 0);
        const leftAfter = nz((data as any)?.left_after, 0);

        if (leftAfter <= 0) setItemsModal(null);

        notifyInfo(
          "Готово",
          `Принято позиций: ${ok}${fail ? `, ошибок: ${fail}` : ""} \nОсталось: ${leftAfter} `,
        );
      } catch (e) {
        showErr(e);
      } finally {
        setReceivingHeadId(null);
      }
    },
    [incoming, fetchStock, notifyError, notifyInfo, qtyInputByItem],
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await incoming.fetchToReceive();
      await fetchStock();
    } catch (e) {
      showErr(e);
    } finally {
      setLoading(false);
    }
  }, [incoming, fetchStock]);

  useEffect(() => {
    loadAll();

  }, []);

  const refreshActiveTab = useCallback(async () => {
    if (tab === "К приходу") {
      await incoming.fetchToReceive();
      return;
    }
    if (tab === "Склад факт") {
      await fetchStock();
      return;
    }
    if (tab === "Расход") {
      await fetchReqHeads(0, true);
      return;
    }
    if (tab === "Отчёты") {
      await fetchReports();
    }
  }, [tab, incoming, fetchStock, fetchReqHeads, fetchReports]);

  useFocusEffect(
    useCallback(() => {
      void refreshActiveTab().catch((e) => showErr(e));
      return undefined;
    }, [refreshActiveTab]),
  );

  useEffect(() => {
    if (tab === "Отчёты") {
      fetchReports().catch((e) => showErr(e));
    }
  }, [tab, periodFrom, periodTo, fetchReports]);

  useEffect(() => {
    if (tab === "Расход") {
      fetchReqHeads(0, true).catch((e) => showErr(e));
    }
  }, [tab, fetchReqHeads]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (tab === "К приходу") await incoming.fetchToReceive();
      else if (tab === "Склад факт") await fetchStock();
      else if (tab === "Отчёты") await fetchReports();
      else if (tab === "Расход") {
        await fetchReqHeads();
      }

    } catch (e) {
      showErr(e);
    } finally {
      setRefreshing(false);
    }
  }, [
    tab,
    incoming,
    fetchStock,
    fetchReports,
    fetchReqHeads,
  ]);

  // StockRowView, HistoryRowView — now imported from components/
  // ExpenditureHeader — now imported from components/
  const openStockIssue = stockPickUi.openStockIssue;

  const expenditureHeaderProps = useMemo(() => ({
    recipientText: rec.recipientText,
    onRecipientChange: (t: string) => {
      rec.setRecipientText(t);
      rec.setRecipientSuggestOpen(true);
    },
    onRecipientFocus: () => rec.setRecipientSuggestOpen(true),
    onRecipientBlur: () => {
      setTimeout(() => rec.setRecipientSuggestOpen(false), 150);
    },
    recipientSuggestOpen: rec.recipientSuggestOpen,
    recipientSuggestions: rec.recipientSuggestions,
    onCommitRecipient: (name: string) => void rec.commitRecipient(name),
  }), [rec.recipientText, rec.recipientSuggestOpen, rec.recipientSuggestions, rec.setRecipientText, rec.setRecipientSuggestOpen, rec.commitRecipient]);

  const pickOptions = useMemo(() => {
    const base =
      pickModal.what === "object"
        ? objectList
        : pickModal.what === "level"
          ? levelList
          : pickModal.what === "system"
            ? systemList
            : pickModal.what === "zone"
              ? zoneList
              : recipientList;

    const q = pickFilter.trim().toLowerCase();
    if (!q) return base;

    return (base || []).filter((x) => String(x.label || "").toLowerCase().includes(q));
  }, [pickModal.what, pickFilter, objectList, levelList, systemList, zoneList, recipientList]);

  const applyReportPeriod = useCallback((from: string, to: string) => {
    const nextFrom = from || "";
    const nextTo = to || "";
    setPeriodFrom(nextFrom);
    setPeriodTo(nextTo);
    setRepPeriodOpen(false);
    void fetchReports({ from: nextFrom, to: nextTo });
  }, [fetchReports]);

  const clearReportPeriod = useCallback(() => {
    setPeriodFrom("");
    setPeriodTo("");
    setRepPeriodOpen(false);
    void fetchReports({ from: "", to: "" });
  }, [fetchReports]);

  const onPickOption = useCallback((opt: Option) => {
    if (pickModal.what === "recipient") {
      void rec.commitRecipient(opt.label);
      closePick();
      return;
    }
    applyPick(opt);
  }, [pickModal.what, rec.commitRecipient, closePick, applyPick]);

  const closeReportPeriod = useCallback(() => {
    setRepPeriodOpen(false);
  }, []);

  const repPeriodUi = useMemo(() => ({
    cardBg: UI.cardBg,
    text: UI.text,
    sub: UI.sub,
    border: "rgba(255,255,255,0.14)",
    accentBlue: "#3B82F6",
    approve: UI.accent,
  }), []);

  const listContentStyle = useMemo(
    () => ({ paddingTop: HEADER_MAX + 12, paddingBottom: 24 }),
    [HEADER_MAX],
  );

  const listRefreshControl = useMemo(
    () => <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />,
    [refreshing, onRefresh],
  );
  const listOnScroll = useMemo(() => (isWeb ? undefined : headerApi.onListScroll), [isWeb, headerApi.onListScroll]);
  const listScrollEventThrottle = useMemo(() => (isWeb ? undefined : 16), [isWeb]);

  const fmtRuDate = useCallback((iso?: string | null) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, []);

  const onWarehousemanFioChange = useCallback((t: string) => {
    setWarehousemanFio(t);
    void AsyncStorage.setItem("wh_warehouseman_fio", t);
  }, []);

  const onReqEndReached = useCallback(() => {
    if (reqRefs.current.hasMore && !reqRefs.current.fetching) {
      fetchReqHeads(reqRefs.current.page + 1);
    }
  }, [fetchReqHeads]);

  const onIncomingEndReached = useCallback(() => {
    if (incoming.toReceiveHasMore && !incoming.toReceiveIsFetching) {
      incoming.fetchToReceive(incoming.toReceivePage + 1);
    }
  }, [incoming]);

  const getIncomingHeadStats = useCallback((item: any) => {
    const recSum = Math.round(nz(item.qty_received_sum, 0));
    const leftSum = Math.round(nz(item.qty_expected_sum, 0) - nz(item.qty_received_sum, 0));
    return { recSum, leftSum };
  }, []);

  const onIncomingItemsSubmit = useCallback((id: string) => {
    if (!id) return;
    void receiveSelectedForHead(id);
  }, [receiveSelectedForHead]);

  const closeItemsModal = useCallback(() => {
    setItemsModal(null);
  }, []);

  const onPickRecipient = useCallback((name: string) => {
    void rec.commitRecipient(name);
  }, [rec.commitRecipient]);

  const closeIncomingDetails = useCallback(() => {
    (reportsUi as any).closeIncomingDetails();
  }, [reportsUi]);
  const pickTitle = useMemo(() => {
    return pickModal.what === "object"
      ? "Выбор объекта"
      : pickModal.what === "level"
        ? "Выбор этажа/уровня"
        : pickModal.what === "system"
          ? "Выбор системы/вида работ"
          : pickModal.what === "zone"
            ? "Выбор зоны/участка"
            : "Выбор получателя";
  }, [pickModal.what]);

  const onReportsBack = useCallback(() => {
    setReportsMode("choice");
  }, []);

  const onReportsSelectMode = useCallback((m: "choice" | "issue" | "incoming") => {
    setReportsMode(m);
  }, []);

  const onOpenRepPeriod = useCallback(() => {
    setRepPeriodOpen(true);
  }, []);

  const onReportsRefresh = useCallback(() => {
    void fetchReports();
  }, [fetchReports]);

  const onPdfRegisterPress = useCallback(() => {
    void onPdfRegister();
  }, [onPdfRegister]);

  const onPdfDocumentPress = useCallback((id: string | number) => {
    void onPdfDocument(id);
  }, [onPdfDocument]);

  const onPdfMaterialsPress = useCallback(() => {
    void onPdfMaterials();
  }, [onPdfMaterials]);

  const onPdfObjectWorkPress = useCallback(() => {
    void onPdfObjectWork();
  }, [onPdfObjectWork]);

  const onPdfDayRegisterPress = useCallback((day: string) => {
    void onPdfDayRegister(day);
  }, [onPdfDayRegister]);

  const onPdfDayMaterialsPress = useCallback((day: string) => {
    void onPdfDayMaterials(day);
  }, [onPdfDayMaterials]);

  const reportsTabUi = useMemo(() => ({
    ...reportsUi,
    issuesByDay: reportsMode === "incoming" ? (reportsUi as any).incomingByDay : (reportsUi as any).vydachaByDay,
  }), [reportsUi, reportsMode]);

  const reportsOnScroll = useMemo(() => (Platform.OS === "web" ? undefined : headerApi.onListScroll), [headerApi.onListScroll]);
  const reportsScrollEventThrottle = useMemo(() => (Platform.OS === "web" ? undefined : 16), []);
  const renderReqIssue = () => {
    return (
      <View style={{ flex: 1 }}>
        <AnimatedFlatList
          data={sortedReqHeads}
          keyExtractor={(x: ReqHeadRow) => x.request_id}
          contentContainerStyle={listContentStyle}
          onScroll={listOnScroll}
          scrollEventThrottle={listScrollEventThrottle}
          onEndReached={onReqEndReached}
          onEndReachedThreshold={0.5}
          refreshControl={listRefreshControl}
          ListFooterComponent={null}
          ListHeaderComponent={<ExpenditureHeader {...expenditureHeaderProps} />}

          renderItem={({ item }: { item: any }) => {
            const totalPos = Math.max(0, Number(item.items_cnt ?? 0));
            const openPos = Math.max(0, Number(item.ready_cnt ?? 0));
            const issuedPos = Math.max(0, Number(item.done_cnt ?? 0));

            const hasToIssue = openPos > 0;
            const isFullyIssued = issuedPos >= totalPos && totalPos > 0;

            const locParts: string[] = [];
            const obj = String(item.object_name || "").trim();
            const lvl = String(item.level_name || item.level_code || "").trim();
            const sys = String(item.system_name || item.system_code || "").trim();

            if (obj) locParts.push(obj);
            if (lvl) locParts.push(lvl);
            if (sys) locParts.push(sys);

            const dateStr = fmtRuDate(item.submitted_at);

            return (
              <View style={{ marginBottom: 10, paddingHorizontal: 6 }}>
                <Pressable
                  onPress={() => openReq(item)}
                  style={({ pressed }) => [
                    s.groupHeader,
                    {
                      borderLeftWidth: hasToIssue ? 5 : 0,
                      borderLeftColor: "#22c55e",
                      paddingHorizontal: 12,
                    },
                    pressed && { opacity: 0.9 }
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    {/* 1 row: ID + DATE */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                      <Text style={[s.groupTitle, { fontSize: 16 }]} numberOfLines={1}>
                        {item.display_no || `REQ-${item.request_id.slice(0, 8)}`}
                      </Text>
                      <Text style={{ color: UI.sub, fontSize: 12, fontWeight: "700" }}>{dateStr}</Text>
                    </View>

                    {/* 2 row: ACTION */}
                    <View style={{ marginBottom: 5 }}>
                      {isFullyIssued ? (
                        <Text style={{ color: "#22c55e", fontWeight: "900", fontSize: 13 }}>Выдано полностью</Text>
                      ) : (
                        <Text style={{ color: UI.sub, fontSize: 13, fontWeight: "700" }}>
                          К выдаче: <Text style={{ color: hasToIssue ? "#22c55e" : UI.text, fontWeight: "900" }}>{hasToIssue ? `${openPos} ${openPos === 1 ? 'позиция' : (openPos > 1 && openPos < 5) ? 'позиции' : 'позиций'}` : "0"}</Text>
                          {" • "}
                          Выдано: <Text style={{ color: issuedPos > 0 ? "#22c55e" : UI.text, fontWeight: "800" }}>{issuedPos}</Text>
                        </Text>
                      )}
                    </View>

                    {/* 3 row: CONTEXT */}
                    {locParts.length > 0 && (
                      <Text style={{ color: UI.sub, fontSize: 12, fontWeight: "600", lineHeight: 16 }}>
                        {locParts.join(" • ")}
                      </Text>
                    )}
                  </View>
                </Pressable>
              </View>
            );
          }}
          ListEmptyComponent={
            reqHeadsLoading ? (
              <Text style={{ color: UI.sub, paddingHorizontal: 16, fontWeight: "800" }}>
                Загрузка...
              </Text>
            ) : (
              <Text style={{ color: UI.sub, paddingHorizontal: 16, fontWeight: "800" }}>
                Нет заявок для выдачи.
                {"\n"}Потяни вниз, чтобы обновить.
              </Text>
            )
          }

        />
      </View>
    );
  };
  const renderTab = () => {
    if (tab === "К приходу") {
      return (
        <View style={{ flex: 1 }}>
          <AnimatedFlatList
            data={incoming.toReceive}
            keyExtractor={(i: IncomingRow) => i.incoming_id}
            contentContainerStyle={listContentStyle}
            onScroll={listOnScroll}
            scrollEventThrottle={listScrollEventThrottle}
            ListHeaderComponent={
              <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                <View style={s.sectionBox}>
                  <Text style={{ color: UI.sub, fontWeight: "800", marginBottom: 6 }}>
                    ФИО кладовщика (обязательно)
                  </Text>
                  <TextInput
                    value={warehousemanFio}
                    onChangeText={onWarehousemanFioChange}
                    placeholder="Введите ФИО…"
                    placeholderTextColor={UI.sub}
                    style={s.input}
                  />
                </View>
              </View>
            }
            onEndReached={onIncomingEndReached}
            onEndReachedThreshold={0.5}
            ListFooterComponent={null}
            renderItem={({ item }: { item: any }) => {
              const { recSum, leftSum } = getIncomingHeadStats(item);

              const prNo = formatProposalBaseNo(
                incoming.proposalNoByPurchase[item.purchase_id] || item.po_no,
                item.purchase_id
              );

              const dateStr = fmtRuDate(item.purchase_created_at) || "—";

              return (
                <View style={{ marginBottom: 10, paddingHorizontal: 6 }}>
                  <Pressable
                    onPress={() => void openItemsModal(item)}
                    style={({ pressed }) => [
                      s.groupHeader,
                      { paddingHorizontal: 12 },
                      pressed && { opacity: 0.8, backgroundColor: "rgba(255,255,255,0.08)" }
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      {/* 1 row: ID + DATE */}
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <Text style={[s.groupTitle, { fontSize: 16 }]} numberOfLines={1}>
                          {prNo}
                        </Text>
                        <Text style={{ color: UI.sub, fontSize: 12, fontWeight: "700" }}>{dateStr}</Text>
                      </View>

                      {/* 2 row: MAIN STATS */}
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ color: "#22c55e", fontSize: 14, fontWeight: "900" }}>
                          Принято {recSum}
                        </Text>
                        <Text style={{ color: "#ef4444", fontSize: 14, fontWeight: "900" }}>
                          Осталось {leftSum}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                </View>
              );
            }}
            ListEmptyComponent={
              <Text style={{ color: UI.sub, paddingHorizontal: 16, fontWeight: "800" }}>
                Нет записей в очереди склада.
              </Text>
            }
            refreshControl={listRefreshControl}
          />
        </View>
      );
    }

    if (tab === "Склад факт") {
      if (stockSupported === false) {
        return (
          <View style={{ padding: 12 }}>
            <Text style={{ color: "#475569" }}>
              Раздел «Склад факт» требует вью{" "}
              <Text style={{ fontWeight: "700" }}>v_warehouse_fact</Text> или
              RPC с фактическими остатками.
            </Text>
          </View>
        );
      }

      return (
        <AnimatedFlatList
          data={stockFiltered}
          keyExtractor={(i: StockRow) => i.material_id}
          contentContainerStyle={listContentStyle}
          onScroll={listOnScroll}
          scrollEventThrottle={listScrollEventThrottle}
          renderItem={({ item }: { item: any }) => {
            const codeRaw = String(item.code ?? "").trim();
            const pickedQty = stockPickUi.getPickedQty(codeRaw, item?.uom_id ? String(item.uom_id).trim() : null);
            return <StockRowView r={item} pickedQty={pickedQty} onPress={openStockIssue} />;
          }}
          ListHeaderComponent={
            <StockFactHeader
              objectOpt={objectOpt}
              levelOpt={levelOpt}
              systemOpt={systemOpt}
              zoneOpt={zoneOpt}
              onPickObject={() => setPickModal({ what: "object" })}
              onPickLevel={() => setPickModal({ what: "level" })}
              onPickSystem={() => setPickModal({ what: "system" })}
              onPickZone={() => setPickModal({ what: "zone" })}

              recipientText={rec.recipientText}
              onRecipientChange={rec.setRecipientText}
              recipientSuggestOpen={rec.recipientSuggestOpen}
              setRecipientSuggestOpen={rec.setRecipientSuggestOpen}
              recipientSuggestions={rec.recipientSuggestions}
              onPickRecipient={onPickRecipient}

              stockSearch={stockSearch}
              onStockSearch={setStockSearch}
              stockPick={stockPickUi.stockPick}
              onRemovePick={stockPickUi.removeStockPickLine}
              issueBusy={issueBusy}
              onClear={stockPickUi.clearStockPick}
              onSubmit={submitStockPick}
              issueMsg={issueMsg}
            />
          }
          ListEmptyComponent={
            <Text style={{ color: UI.sub, paddingHorizontal: 16, fontWeight: "800" }}>
              Пока нет данных по складу.
            </Text>
          }
        />
      );
    }

    if (tab === "Расход") return renderReqIssue();
    return (
      <WarehouseReportsTab
        headerTopPad={HEADER_MAX + 8}
        mode={reportsMode}
        onBack={onReportsBack}
        onSelectMode={onReportsSelectMode}
        onScroll={reportsOnScroll}
        scrollEventThrottle={reportsScrollEventThrottle}
        periodFrom={periodFrom}
        periodTo={periodTo}
        repStock={repStock}
        repMov={repMov}
        reportsUi={reportsTabUi}
        onOpenPeriod={onOpenRepPeriod}
        onRefresh={onReportsRefresh}
        onPdfRegister={onPdfRegisterPress}
        onPdfDocument={onPdfDocumentPress}
        onPdfMaterials={onPdfMaterialsPress}
        onPdfObjectWork={onPdfObjectWorkPress}
        onPdfDayRegister={onPdfDayRegisterPress}
        onPdfDayMaterials={onPdfDayMaterialsPress}
      />
    );



  };
  return (
    <View style={{ flex: 1, backgroundColor: UI.bg }}>
      {/* Collapsing Header */}
      <Animated.View
        pointerEvents="auto"
        style={[
          s.collapsingHeader,
          isWeb
            ? ({
              position: "sticky",
              top: 0,
              zIndex: 50,
              overflow: "hidden",
            } as any)
            : null,
          {
            height: headerApi.headerHeight as any,
            transform: isWeb ? ([{ translateY: headerApi.headerTranslateY as any }] as any) : undefined,
            shadowOpacity: headerApi.headerShadowSafe as any,
            elevation: 6,
          }

        ]}
      >
        <WarehouseHeader
          tab={tab}
          onTab={setTab}
          incomingCount={incoming.incomingCount}
          stockCount={stockCount}
          titleSize={headerApi.titleSize}
        />

      </Animated.View>
      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 8, color: UI.sub }}>Загрузка...</Text>
          </View>
        ) : (
          <View
            style={{
              flex: 1,
              paddingHorizontal: 12,
            }}
          >
            {renderTab()}
          </View>
        )}
      </View><StockIssueSheet
        visible={!!stockPickUi.stockIssueModal}
        item={stockPickUi.stockIssueModal}
        qty={stockPickUi.stockIssueQty}
        setQty={stockPickUi.setStockIssueQty}
        busy={issueBusy}
        onAdd={stockPickUi.addStockPickLine}
        onClose={stockPickUi.closeStockIssue}
      />
      <IncomingItemsSheet
        visible={!!itemsModal}
        onClose={closeItemsModal}
        title="Позиции прихода"
        prText={
          itemsModal
            ? formatProposalBaseNo(
              (itemsModal.purchaseId ? incoming.proposalNoByPurchase[itemsModal.purchaseId] : null) ||
              (itemsModal.poNo ?? null),
              itemsModal.purchaseId ?? ""
            )
            : ""
        }
        roleLabel={roleBadgeLabel("S")}
        incomingId={itemsModal?.incomingId ?? ""}
        rows={itemsModal ? (incoming.itemsByHead[itemsModal.incomingId] ?? []) : []}
        kbH={kbH}
        qtyInputByItem={qtyInputByItem}
        setQtyInputByItem={setQtyInputByItem}
        receivingHeadId={receivingHeadId}
        onSubmit={onIncomingItemsSubmit}
      />
      <IssueDetailsSheet
        visible={issueDetailsId != null}
        issueId={issueDetailsId}
        loadingId={issueLinesLoadingId}
        linesById={issueLinesById}
        matNameByCode={matNameByCode}
        onClose={reportsUi.closeIssueDetails}
      />
      <IncomingDetailsSheet
        visible={incomingDetailsId != null}
        incomingId={incomingDetailsId}
        loadingId={incomingLinesLoadingId}
        linesById={incomingLinesById}
        matNameByCode={matNameByCode}
        onClose={closeIncomingDetails}
      />

      <ReqIssueModal
        visible={!!reqModal}
        onClose={closeReq}
        title={`Выдача по заявке ${reqModal?.display_no || "—"}`}
        head={reqModal}
        reqItems={reqItems}
        reqItemsLoading={reqItemsLoading}
        reqQtyInputByItem={reqPickUi.reqQtyInputByItem}
        setReqQtyInputByItem={reqPickUi.setReqQtyInputByItem}
        recipientText={rec.recipientText}
        issueBusy={issueBusy}
        addReqPickLine={reqPickUi.addReqPickLine}
        submitReqPick={submitReqPick}
        reqPick={reqPickUi.reqPick}
        removeReqPickLine={reqPickUi.removeReqPickLine}
        issueMsg={issueMsg}
      />
      <PickOptionSheet
        visible={!!pickModal.what}
        title={pickTitle}
        filter={pickFilter}
        onFilterChange={setPickFilter}
        items={pickOptions}
        onPick={onPickOption}
        onClose={closePick}
      />

      {repPeriodOpen ? (
        <PeriodPickerSheet
          visible={repPeriodOpen}
          onClose={closeReportPeriod}
          initialFrom={periodFrom || ""}
          initialTo={periodTo || ""}
          onApply={applyReportPeriod}
          onClear={clearReportPeriod}
          ui={repPeriodUi}
        />
      ) : null}
    </View>
  );
}




