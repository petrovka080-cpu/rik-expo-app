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
  type KeyboardEvent,
  type ViewStyle,
} from "react-native";


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
  WarehouseStockLike,
  ReqItemUiRowWithNote,
  WarehouseReportRow,
  RpcReceiveApplyResult,
  ReportsUiLike,
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
import WarehouseFioModal from "../../src/screens/warehouse/components/WarehouseFioModal";
import WarehouseRecipientModal from "../../src/screens/warehouse/components/WarehouseRecipientModal";
import {
  nz,
  pickErr,
  showErr,
  parseQtySelected,
  matchQuerySmart,
  parseReqHeaderContext,
} from "../../src/screens/warehouse/warehouse.utils";
import { useDebouncedValue } from "../../src/screens/warehouse/hooks/useDebouncedValue";
import { useWarehousemanFio } from "../../src/screens/warehouse/hooks/useWarehousemanFio";


const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const ORG_NAME = "";
const REPORTS_CACHE_TTL_MS = 60 * 1000;
const REQ_PAGE_SIZE = 80;
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
  const stockSearchDeb = useDebouncedValue(stockSearch, 180);

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

  useEffect(() => {
    if (Platform.OS === "web") return;
    const onShow = (e: KeyboardEvent) => {
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
  }, []);

  const [isRecipientModalVisible, setIsRecipientModalVisible] = useState(false);

  const [reportsMode, setReportsMode] = useState<"choice" | "issue" | "incoming">("choice");

  const [itemsModal, setItemsModal] = useState<{
    incomingId: string;
    purchaseId: string;
    poNo: string | null;
    status: string; // incoming_status
  } | null>(null);

  const [qtyInputByItem, setQtyInputByItem] = useState<Record<string, string>>({});
  const [receivingHeadId, setReceivingHeadId] = useState<string | null>(null);
  const openItemsModal = useCallback((head: Partial<IncomingRow> | null | undefined) => {
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
  const reqOpenSeqRef = useRef(0);
  const [stock, setStock] = useState<StockRow[]>([]);
  const stockFetchMutex = useRef(false);

  const stockMaterialsByCode = useMemo(() => stock, [stock]);
  const [stockSupported, setStockSupported] = useState<null | boolean>(null);
  const [stockCount, setStockCount] = useState(0);

  const stockFiltered = useMemo(() => {
    const baseAll = stockMaterialsByCode || [];

    // ✅ PROD: по умолчанию скрываем нули
    const base = baseAll.filter((r) => nz(r.qty_available, 0) > 0);

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
    for (const r of (stock || []) as WarehouseStockLike[]) {
      const code = String(
        r.rik_code ?? r.code ?? r.material_code ?? ""
      )
        .trim()
        .toUpperCase();

      const name = String(
        r.name_human ?? r.name ?? r.item_name_ru ?? ""
      ).trim();

      if (code && name && !m[code]) m[code] = name;
    }
    return m;
  }, [stock]);

  const [repStock, setRepStock] = useState<StockRow[]>([]);
  const [repMov, setRepMov] = useState<WarehouseReportRow[]>([]);
  const [repIssues, setRepIssues] = useState<WarehouseReportRow[]>([]);
  const [repIncoming, setRepIncoming] = useState<WarehouseReportRow[]>([]);
  const reportsReqSeqRef = useRef(0);
  const reportsInFlightRef = useRef<Map<string, Promise<void>>>(new Map());
  const reportsCacheRef = useRef<
    Map<string, { ts: number; repStock: StockRow[]; repMov: WarehouseReportRow[]; repIssues: WarehouseReportRow[]; repIncoming: WarehouseReportRow[] }>
  >(new Map());

  const [issueLinesById, setIssueLinesById] = useState<Record<string, WarehouseReportRow[]>>({});
  const [issueLinesLoadingId, setIssueLinesLoadingId] = useState<number | null>(null);
  const [issueDetailsId, setIssueDetailsId] = useState<number | null>(null);

  const [incomingLinesById, setIncomingLinesById] = useState<Record<string, WarehouseReportRow[]>>({});
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
  const didInitLoadRef = useRef(false);
  const focusRefreshInFlightRef = useRef<Promise<void> | null>(null);
  const lastFocusRefreshAtRef = useRef(0);

  const fetchStock = useCallback(async () => {
    if (stockFetchMutex.current) return;

    stockFetchMutex.current = true;
    try {
      const r = await apiFetchStock(supabase, 0, 2000);

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
      const rows = await apiFetchReqHeads(supabase, pageIndex, REQ_PAGE_SIZE);

      // IMPORTANT:
      // apiFetchReqHeads applies status/view filtering, so page can be shorter than REQ_PAGE_SIZE
      // even when more rows exist in later ranges. Stop only when backend returns zero rows.
      const hasNext = rows.length > 0;
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
      const rows = await apiFetchReqItems(supabase, requestId);
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
      setRepStock(hit.repStock);
      setRepMov(hit.repMov);
      setRepIssues(hit.repIssues);
      setRepIncoming(hit.repIncoming);
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
        apiFetchReports(supabase, from, to),
        apiFetchIncomingReports(supabase, { from, to }),
      ]);
      if (reqId !== reportsReqSeqRef.current) return;

      const next = {
        ts: Date.now(),
        repStock: r.repStock || [],
        repMov: r.repMov || [],
        repIssues: r.repIssues || [],
        repIncoming: (inc as WarehouseReportRow[]) || [],
      };
      reportsCacheRef.current.set(key, next);
      setRepStock(next.repStock);
      setRepMov(next.repMov);
      setRepIssues(next.repIssues);
      setRepIncoming(next.repIncoming);
    })().finally(() => {
      reportsInFlightRef.current.delete(key);
    });

    reportsInFlightRef.current.set(key, task);
    await task;
  }, [periodFrom, periodTo]);
  const fetchToReceiveRef = useRef(incoming.fetchToReceive);
  const fetchStockRef = useRef(fetchStock);
  const fetchReqHeadsRef = useRef(fetchReqHeads);
  const fetchReportsRef = useRef(fetchReports);
  useEffect(() => {
    fetchToReceiveRef.current = incoming.fetchToReceive;
  }, [incoming.fetchToReceive]);
  useEffect(() => {
    fetchStockRef.current = fetchStock;
  }, [fetchStock]);
  useEffect(() => {
    fetchReqHeadsRef.current = fetchReqHeads;
  }, [fetchReqHeads]);
  useEffect(() => {
    fetchReportsRef.current = fetchReports;
  }, [fetchReports]);
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

  const onTabChange = useCallback((nextTab: Tab) => {
    setTab(nextTab);
    if (nextTab === "Расход" || nextTab === "Склад факт") {
      setIsRecipientModalVisible(true);
    }
  }, []);

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
      const seq = ++reqOpenSeqRef.current;
      const normalizePhone = (raw: unknown): string => {
        const src = String(raw ?? "").trim();
        if (!src) return "";
        if (/^\d{4}-\d{2}-\d{2}$/.test(src)) return "";
        if (/^\d{4}[./]\d{2}[./]\d{2}$/.test(src)) return "";
        const m = src.match(/(\+?\d[\d\s()\-]{7,}\d)/);
        if (!m) return "";
        const candidate = String(m[1] || "").trim();
        const digits = candidate.replace(/[^\d]/g, "");
        if (digits.length < 9) return "";
        return candidate.replace(/\s+/g, "");
      };

      setReqModal(h);
      reqPickUi.setReqQtyInputByItem({});
      reqPickUi.clearReqPick();
      setReqItems([]);

      setReqItemsLoading(true);
      try {
        // Enrich header with source request note/comment fields
        // (used for contractor/phone/volume metadata if present).
        const metaQ = await supabase
          .from("requests")
          .select("*")
          .eq("id", rid)
          .maybeSingle();
        if (!metaQ.error && metaQ.data) {
          const meta = metaQ.data as Record<string, unknown>;
          setReqModal((prev) => {
            if (!prev || String(prev.request_id) !== rid) return prev;
            const contractor =
              String(
                meta?.contractor_name ??
                meta?.contractor_org ??
                meta?.subcontractor_name ??
                meta?.subcontractor_org ??
                "",
              ).trim() || null;
            const phone = normalizePhone(
              meta?.contractor_phone ??
              meta?.subcontractor_phone ??
              meta?.phone_number ??
              meta?.phone ??
              meta?.tel ??
              "",
            ) || null;
            const volume =
              String(
                meta?.planned_volume ??
                meta?.qty_planned ??
                meta?.planned_qty ??
                meta?.volume ??
                meta?.qty_plan ??
                "",
              ).trim() || null;

            return {
              ...prev,
              note: (meta?.note as string | null) ?? prev.note ?? null,
              comment: (meta?.comment as string | null) ?? prev.comment ?? null,
              contractor_name: contractor || prev.contractor_name || null,
              contractor_phone: phone || prev.contractor_phone || null,
              planned_volume: volume || prev.planned_volume || null,
            };
          });
        }

        const rows = await apiFetchReqItems(supabase, rid);
        if (seq !== reqOpenSeqRef.current) return;
        setReqItems(Array.isArray(rows) ? rows : []);

        const fromItemNotes = parseReqHeaderContext(
          Array.isArray(rows) ? rows.map((r: ReqItemUiRowWithNote) => String(r?.note ?? "")) : [],
        );
        if (fromItemNotes.contractor || fromItemNotes.phone || fromItemNotes.volume) {
          setReqModal((prev) =>
            prev && String(prev.request_id) === rid
              ? {
                ...prev,
                contractor_name: prev.contractor_name || fromItemNotes.contractor || null,
                contractor_phone: prev.contractor_phone || fromItemNotes.phone || null,
                planned_volume: prev.planned_volume || fromItemNotes.volume || null,
              }
              : prev,
          );
        }
      } catch (e) {
        if (seq === reqOpenSeqRef.current) {
          setReqItems([]);
        }
        showErr(e);
      } finally {
        if (seq === reqOpenSeqRef.current) {
          setReqItemsLoading(false);
        }
      }
    },
    [reqPickUi, supabase],
  );

  const closeReq = useCallback(() => {
    reqOpenSeqRef.current += 1;
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
      getWarehousemanFio: () => warehousemanFio,
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
    warehousemanFio,
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

    if (!rec.recipientText.trim()) {
      setIsRecipientModalVisible(true);
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
    rec.recipientText,
  ]);
  const submitStockPick = useCallback(async () => {
    if (!rec.recipientText.trim()) {
      setIsRecipientModalVisible(true);
      return;
    }
    await issueActions.submitStockPick({ stockPick: stockPickUi.stockPick });
  }, [issueActions, stockPickUi.stockPick, rec.recipientText]);

  const issueByRequestItem = useCallback(
    async (row: ReqItemUiRow) => {
      const requestItemId = String(row.request_item_id || "").trim();
      const requestId = String(row.request_id || "").trim();
      if (!requestItemId || !requestId) {
        setIssueMsg({ kind: "error", text: "Пустые ID заявки/строки" });
        return;
      }

      if (!rec.recipientText.trim()) {
        setIsRecipientModalVisible(true);
        return;
      }

      const raw = String(reqPickUi.reqQtyInputByItem[requestItemId] ?? "").trim().replace(",", ".");
      const qty = Number(raw);
      const ok = await issueActions.issueByRequestItem({ row, qty });
      if (ok) {
        closeReq();
      }
    },
    [issueActions, reqPickUi.reqQtyInputByItem, closeReq, rec.recipientText]

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
          setIsFioConfirmVisible(true);
          return;
        }

        const { data, error } = await supabase.rpc("wh_receive_apply_ui", {
          p_incoming_id: incomingId,
          p_items: toApply,
          p_warehouseman_fio: warehousemanFio.trim(),
          p_note: null,
        });


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

        const d = (data as RpcReceiveApplyResult | null) ?? null;
        const ok = Number(d?.ok ?? 0);
        const fail = Number(d?.fail ?? 0);
        const leftAfter = nz(d?.left_after, 0);

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
      await fetchToReceiveRef.current();
      await fetchStockRef.current();
    } catch (e) {
      showErr(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (didInitLoadRef.current) return;
    didInitLoadRef.current = true;
    void loadAll().finally(() => {
      lastFocusRefreshAtRef.current = Date.now();
    });
  }, [loadAll]);

  const refreshActiveTab = useCallback(async () => {
    if (tab === "К приходу") {
      await fetchToReceiveRef.current();
      return;
    }
    if (tab === "Склад факт") {
      await fetchStockRef.current();
      return;
    }
    if (tab === "Расход") {
      await fetchReqHeadsRef.current(0, true);
      return;
    }
    if (tab === "Отчёты") {
      await fetchReportsRef.current();
    }
  }, [tab]);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastFocusRefreshAtRef.current < 1200) return undefined;
      if (focusRefreshInFlightRef.current) return undefined;

      const task = refreshActiveTab().catch((e) => showErr(e)).finally(() => {
        if (focusRefreshInFlightRef.current === task) {
          focusRefreshInFlightRef.current = null;
        }
      });
      focusRefreshInFlightRef.current = task;
      lastFocusRefreshAtRef.current = now;
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
      fetchReqHeadsRef.current(0, true).catch((e) => showErr(e));
    }
  }, [tab]);
  useEffect(() => {
    const ch = supabase
      .channel("warehouse-expense-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests" },
        () => {
          if (tab !== "Расход") return;
          void fetchReqHeadsRef.current(0, true);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "request_items" },
        () => {
          if (tab !== "Расход") return;
          void fetchReqHeadsRef.current(0, true);
        },
      )
      .subscribe();

    return () => {
      try {
        ch.unsubscribe();
      } catch { }
      try {
        supabase.removeChannel(ch);
      } catch { }
    };
  }, [tab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (tab === "К приходу") await fetchToReceiveRef.current();
      else if (tab === "Склад факт") await fetchStockRef.current();
      else if (tab === "Отчёты") await fetchReportsRef.current();
      else if (tab === "Расход") {
        await fetchReqHeadsRef.current();
      }

    } catch (e) {
      showErr(e);
    } finally {
      setRefreshing(false);
    }
  }, [tab]);

  // StockRowView, HistoryRowView — now imported from components/
  // ExpenditureHeader — now imported from components/
  const openStockIssue = stockPickUi.openStockIssue;

  const expenditureHeaderProps = useMemo(() => ({
    recipientText: rec.recipientText,
    onOpenRecipientModal: () => setIsRecipientModalVisible(true),
  }), [rec.recipientText]);

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
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, []);

  // onWarehousemanFioChange removed, handled by handleFioConfirm

  const onReqEndReached = useCallback(() => {
    if (reqRefs.current.hasMore && !reqRefs.current.fetching) {
      fetchReqHeads(reqRefs.current.page + 1);
    }
  }, [fetchReqHeads]);

  const onIncomingEndReached = useCallback(() => {
    if (incoming.toReceiveHasMore && !incoming.toReceiveIsFetching) {
      void fetchToReceiveRef.current(incoming.toReceivePage + 1);
    }
  }, [incoming.toReceiveHasMore, incoming.toReceiveIsFetching, incoming.toReceivePage]);

  const getIncomingHeadStats = useCallback((item: IncomingRow) => {
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
    (reportsUi as ReportsUiLike).closeIncomingDetails();
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
    ...(reportsUi as ReportsUiLike),
    issuesByDay:
      reportsMode === "incoming"
        ? (reportsUi as ReportsUiLike).incomingByDay
        : (reportsUi as ReportsUiLike).vydachaByDay,
  }), [reportsUi, reportsMode]);

  const reportsOnScroll = useMemo(() => (Platform.OS === "web" ? undefined : headerApi.onListScroll), [headerApi.onListScroll]);
  const reportsScrollEventThrottle = useMemo(() => (Platform.OS === "web" ? undefined : 16), []);
  const renderReqHeadItem = useCallback(({ item }: { item: unknown }) => {
    const row = item as ReqHeadRow;
    const totalPos = Math.max(0, Number(row.items_cnt ?? 0));
    const openPos = Math.max(0, Number(row.ready_cnt ?? 0));
    const issuedPos = Math.max(0, Number(row.done_cnt ?? 0));

    const hasToIssue = openPos > 0;
    const isFullyIssued = issuedPos >= totalPos && totalPos > 0;

    const locParts: string[] = [];
    const obj = String(row.object_name || "").trim();
    const lvl = String(row.level_name || row.level_code || "").trim();
    const sys = String(row.system_name || row.system_code || "").trim();

    if (obj) locParts.push(obj);
    if (lvl) locParts.push(lvl);
    if (sys) locParts.push(sys);

    const dateStr = fmtRuDate(row.submitted_at);

    return (
      <View style={s.listItemContainer}>
        <Pressable
          onPress={() => openReq(row)}
          style={({ pressed }) => [
            s.groupHeader,
            s.reqItemPressable,
            {
              borderLeftWidth: hasToIssue ? 5 : 0,
              borderLeftColor: "#22c55e",
            },
            pressed && { opacity: 0.9 }
          ]}
        >
          <View style={s.listItemFlex}>
            {/* 1 row: ID + DATE */}
            <View style={s.listItemRow1}>
              <Text style={[s.groupTitle, { fontSize: 16 }]} numberOfLines={1}>
                {row.display_no || `REQ-${row.request_id.slice(0, 8)}`}
              </Text>
              <Text style={s.reqItemDate}>{dateStr}</Text>
            </View>

            {/* 2 row: ACTION */}
            <View style={s.reqItemRow2}>
              {isFullyIssued ? (
                <Text style={s.reqItemStatusFullyIssued}>Выдано полностью</Text>
              ) : (
                <Text style={s.reqItemStatusNotFullyIssued}>
                  К выдаче: <Text style={{ color: hasToIssue ? "#22c55e" : UI.text, fontWeight: "900" }}>{hasToIssue ? `${openPos} ${openPos === 1 ? 'позиция' : (openPos > 1 && openPos < 5) ? 'позиции' : 'позиций'}` : "0"}</Text>
                  {" • "}
                  Выдано: <Text style={{ color: issuedPos > 0 ? "#22c55e" : UI.text, fontWeight: "800" }}>{issuedPos}</Text>
                </Text>
              )}
            </View>

            {/* 3 row: CONTEXT */}
            {locParts.length > 0 && (
              <Text style={s.reqItemRow3}>
                {locParts.join(" • ")}
              </Text>
            )}
          </View>
        </Pressable>
      </View>
    );
  }, [openReq]);

  const renderIncomingItem = useCallback(({ item }: { item: unknown }) => {
    const row = item as IncomingRow;
    const { recSum, leftSum } = getIncomingHeadStats(row);

    const prNo = formatProposalBaseNo(
      incoming.proposalNoByPurchase[row.purchase_id] || row.po_no,
      row.purchase_id
    );

    const dateStr = fmtRuDate(row.purchase_created_at) || "—";

    return (
      <View style={s.listItemContainer}>
        <Pressable
          onPress={() => void openItemsModal(row)}
          style={({ pressed }) => [
            s.groupHeader,
            s.incomingItemPressable,
            pressed && { opacity: 0.8, backgroundColor: "rgba(255,255,255,0.08)" }
          ]}
        >
          <View style={s.listItemFlex}>
            {/* 1 row: ID + DATE */}
            <View style={s.incomingItemRow1}>
              <Text style={[s.groupTitle, { fontSize: 16 }]} numberOfLines={1}>
                {prNo}
              </Text>
              <Text style={s.incomingItemDate}>{dateStr}</Text>
            </View>

            {/* 2 row: MAIN STATS */}
            <View style={s.incomingItemRow2}>
              <Text style={s.incomingItemRecText}>
                Принято {recSum}
              </Text>
              <Text style={s.incomingItemLeftText}>
                Осталось {leftSum}
              </Text>
            </View>
          </View>
        </Pressable>
      </View>
    );
  }, [openItemsModal, incoming.proposalNoByPurchase]);

  const renderStockItem = useCallback(({ item }: { item: unknown }) => {
    const row = item as StockRow;
    const codeRaw = String(row.code ?? "").trim();
    const pickedQty = stockPickUi.getPickedQty(codeRaw, row?.uom_id ? String(row.uom_id).trim() : null);
    return <StockRowView r={row} pickedQty={pickedQty} onPress={openStockIssue} />;
  }, [stockPickUi.getPickedQty, openStockIssue]);

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
          renderItem={renderReqHeadItem}
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
            keyExtractor={(i: IncomingRow) =>
              String(i.incoming_id || `${i.purchase_id || ""}:${i.po_no || ""}:${i.purchase_created_at || ""}`)
            }
            contentContainerStyle={listContentStyle}
            onScroll={listOnScroll}
            scrollEventThrottle={listScrollEventThrottle}
            ListHeaderComponent={null}
            onEndReached={onIncomingEndReached}
            onEndReachedThreshold={0.5}
            ListFooterComponent={null}
            renderItem={renderIncomingItem}
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
          keyExtractor={(i: StockRow) => String(i.material_id || `${i.code || ""}:${i.uom_id || ""}`)}
          contentContainerStyle={listContentStyle}
          onScroll={listOnScroll}
          scrollEventThrottle={listScrollEventThrottle}
          renderItem={renderStockItem}
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
              onOpenRecipientModal={() => setIsRecipientModalVisible(true)}
              recipientText={rec.recipientText}

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
              } as unknown as ViewStyle)
            : null,
          {
            height: headerApi.headerHeight,
            transform: isWeb ? [{ translateY: headerApi.headerTranslateY }] : undefined,
            shadowOpacity: headerApi.headerShadowSafe,
            elevation: 6,
          }

        ]}
      >
        <WarehouseHeader
          tab={tab}
          onTab={onTabChange}
          incomingCount={incoming.incomingCount}
          stockCount={stockCount}
          titleSize={headerApi.titleSize}
          warehousemanFio={warehousemanFio}
          onOpenFioModal={() => setIsFioConfirmVisible(true)}
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

      <WarehouseFioModal
        visible={isFioConfirmVisible}
        initialFio={warehousemanFio}
        onConfirm={handleFioConfirm}
        loading={isFioLoading}
        history={warehousemanHistory}
      />
      <WarehouseRecipientModal
        visible={isRecipientModalVisible}
        onClose={() => setIsRecipientModalVisible(false)}
        onConfirm={(name) => {
          void rec.commitRecipient(name);
          setIsRecipientModalVisible(false);
        }}
        suggestions={rec.recipientSuggestions}
        initialValue={rec.recipientText}
      />
    </View>
  );
}
