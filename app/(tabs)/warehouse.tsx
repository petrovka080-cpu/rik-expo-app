// app/(tabs)/warehouse.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  TextInput,
  ScrollView,
  Animated,
  Keyboard,
} from "react-native";

import { supabase } from "../../src/lib/supabaseClient";
import { formatProposalBaseNo, roleBadgeLabel } from "../../src/lib/format";
import PeriodPickerSheet from "../../src/components/PeriodPickerSheet";

import { useWarehouseIncoming } from "../../src/screens/warehouse/warehouse.incoming";
import {
  resolveUnitIdByCode,
  resolveUomTextByCode,
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
} from "../../src/screens/warehouse/warehouse.api";

import { useGlobalBusy } from "../../src/ui/GlobalBusy";
import { runPdfTop } from "../../src/lib/pdfRunner";
import { seedEnsureIncomingItems } from "../../src/screens/warehouse/warehouse.seed";
import TopRightActionBar from "../../src/ui/TopRightActionBar";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import type {
  StockRow, ReqHeadRow, ReqItemUiRow,
  ReqPickLine, Option, Tab, StockPickLine
} from "../../src/screens/warehouse/warehouse.types";
import { makeWarehouseIssueActions } from "../../src/screens/warehouse/warehouse.issue";

import { UI, s } from "../../src/screens/warehouse/warehouse.styles";

import WarehouseSheet from "../../src/screens/warehouse/components/WarehouseSheet";
import StockFactHeader from "../../src/screens/warehouse/components/StockFactHeader";
import IssueDetailsSheet from "../../src/screens/warehouse/components/IssueDetailsSheet";
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
  normMatCode,
} from "../../src/screens/warehouse/warehouse.utils";


const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

function SafeView({ children, ...rest }: any) {
  const kids = React.Children.toArray(children).map((c, i) => {
    if (typeof c === "string") return c.trim() ? <Text key={`t${i}`}>{c}</Text> : null;
    if (typeof c === "number") return <Text key={`n${i}`}>{String(c)}</Text>;
    if (c && typeof c === "object" && !React.isValidElement(c)) return null;
    return c;
  });
  return <View {...rest}>{kids}</View>;
}

const pickUom = (v: any): string | null => {
  const s = v == null ? "" : String(v).trim();
  return s !== "" ? s : null;
};

const detectKindLabel = (code?: string | null): string | null => {
  if (!code) return null;
  const c = String(code).toUpperCase();
  if (c.startsWith("MAT-")) return "материал";
  if (c.startsWith("TOOL-")) return "инструмент";
  return null;
}; 
const ORG_NAME = "";
export default function Warehouse() {
  const busy = useGlobalBusy();
  const insets = useSafeAreaInsets();
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

const itemsListRef = useRef<FlatList<any> | null>(null);
const [kbH, setKbH] = useState(0);

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
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
const [reqHeads, setReqHeads] = useState<ReqHeadRow[]>([]);
const [reqHeadsLoading, setReqHeadsLoading] = useState(false);
const [reqModal, setReqModal] = useState<ReqHeadRow | null>(null);

const [reqItems, setReqItems] = useState<ReqItemUiRow[]>([]);
const [reqItemsLoading, setReqItemsLoading] = useState(false);
   const [stock, setStock] = useState<StockRow[]>([]);
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
    const hay = `${code} ${name} ${uom}`;

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
const [issueLinesById, setIssueLinesById] = useState<Record<string, any[]>>({});
const [issueLinesLoadingId, setIssueLinesLoadingId] = useState<number | null>(null);
const [issueDetailsId, setIssueDetailsId] = useState<number | null>(null);
const [reportsSupported, setReportsSupported] = useState<null | boolean>(null);
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

  nameByCode: matNameByCode, 
});
const onPdfIssue = useCallback(
  async (issueId: number) => {
    await runPdfTop({
      busy,
      supabase,
      key: `pdf:warehouse:issue:${issueId}`,
      label: "Готовлю накладную…",
      mode: Platform.OS === "web" ? "preview" : "share",
      fileName: `ISSUE-${issueId}`,
      getRemoteUrl: async () => await reportsUi.buildIssueHtml(issueId),
    });
  },
  [busy, supabase, reportsUi],
);

const onPdfRegister = useCallback(async () => {
  await runPdfTop({
    busy,
    supabase,
    key: `pdf:warehouse:issues-register:${periodFrom || "all"}:${periodTo || "all"}`,
    label: "Готовлю реестр…",
    mode: Platform.OS === "web" ? "preview" : "share",
    fileName: `Warehouse_Issues_${periodFrom || "all"}_${periodTo || "all"}`,
    getRemoteUrl: async () => await reportsUi.buildRegisterHtml(),
  });
}, [busy, supabase, periodFrom, periodTo, reportsUi]);

const onPdfMaterials = useCallback(async () => {
  let w: any = null;

  // ✅ web: открыть окно СРАЗУ по клику (иначе браузер блокнет)
  if (Platform.OS === "web") {
    w = window.open("", "_blank");
    try {
      if (w?.document) {
        w.document.title = "Отчёт по материалам";
        w.document.body.style.margin = "0";
        w.document.body.innerHTML = `
          <div style="font-family:system-ui,Segoe UI,Roboto,Arial;padding:18px">
            <h3 style="margin:0 0 8px 0">Отчёт по материалам</h3>
            <div style="color:#64748b">Формирую PDF…</div>
          </div>`;
      }
    } catch {}
  }

  try {
    const url = await busy.run(
      async () => await reportsUi.buildMaterialsReportPdf(),
      { label: "Готовлю отчёт по материалам…" } as any
    );

    if (Platform.OS === "web") {
      if (w) w.location.href = url;
      else window.open(url, "_blank");
      return;
    }

    await runPdfTop({
      busy,
      supabase,
      key: `pdf:warehouse:materials:${periodFrom || "all"}:${periodTo || "all"}`,
      label: "Открываю PDF…",
      mode: "share",
      fileName: `WH_Materials_${periodFrom || "all"}_${periodTo || "all"}`,
      getRemoteUrl: async () => url,
    });
  } catch (e) {
    try { if (w) w.close(); } catch {}
    showErr(e);
  }
}, [busy, supabase, periodFrom, periodTo, reportsUi]);

const onPdfObjectWork = useCallback(async () => {
  let w: any = null;

  if (Platform.OS === "web") {
    w = window.open("", "_blank");
    try {
      if (w?.document) {
        w.document.title = "Отчёт по объектам/работам";
        w.document.body.style.margin = "0";
        w.document.body.innerHTML = `
          <div style="font-family:system-ui,Segoe UI,Roboto,Arial;padding:18px">
            <h3 style="margin:0 0 8px 0">Отчёт по объектам/работам</h3>
            <div style="color:#64748b">Формирую PDF…</div>
          </div>`;
      }
    } catch {}
  }

  try {
    const url = await busy.run(
      async () => await reportsUi.buildObjectWorkReportPdf(),
      { label: "Готовлю отчёт по объектам…" } as any
    );

    if (Platform.OS === "web") {
      if (w) w.location.href = url;
      else window.open(url, "_blank");
      return;
    }

    await runPdfTop({
      busy,
      supabase,
      key: `pdf:warehouse:objwork:${periodFrom || "all"}:${periodTo || "all"}`,
      label: "Открываю PDF…",
      mode: "share",
      fileName: `WH_ObjectWork_${periodFrom || "all"}_${periodTo || "all"}`,
      getRemoteUrl: async () => url,
    });
  } catch (e) {
    try { if (w) w.close(); } catch {}
    showErr(e);
  }
}, [busy, supabase, periodFrom, periodTo, reportsUi]);

const onPdfDayRegister = useCallback(async (dayLabel: string) => {
  await runPdfTop({
    busy,
    supabase,
    key: `pdf:warehouse:day-register:${dayLabel}`,
    label: "Готовлю реестр за день…",
    mode: Platform.OS === "web" ? "preview" : "share",
    fileName: `WH_Register_${String(dayLabel).trim().replace(/\s+/g, "_")}`,
    getRemoteUrl: async () => await (reportsUi as any).buildDayRegisterPdf(dayLabel),
  });
}, [busy, supabase, reportsUi]);

const onPdfDayMaterials = useCallback(async (dayLabel: string) => {
  let w: any = null;

  // ✅ web: открыть окно сразу, чтобы не блокнуло
  if (Platform.OS === "web") {
    w = window.open("", "_blank");
    try {
      if (w?.document) {
        w.document.title = "Свод материалов за день";
        w.document.body.style.margin = "0";
        w.document.body.innerHTML = `
          <div style="font-family:system-ui,Segoe UI,Roboto,Arial;padding:18px">
            <h3 style="margin:0 0 8px 0">Свод материалов за день</h3>
            <div style="color:#64748b">Формирую PDF…</div>
          </div>`;
      }
    } catch {}
  }

  try {
    const url = await busy.run(
      async () => await (reportsUi as any).buildDayMaterialsReportPdf(dayLabel),
      { label: "Готовлю свод материалов за день…" } as any
    );

    if (Platform.OS === "web") {
      if (w) w.location.href = url;
      else window.open(url, "_blank");
      return;
    }

    await runPdfTop({
      busy,
      supabase,
      key: `pdf:warehouse:day-materials:${dayLabel}`,
      label: "Открываю PDF…",
      mode: "share",
      fileName: `WH_DayMaterials_${String(dayLabel).trim().replace(/\s+/g, "_")}`,
      getRemoteUrl: async () => url,
    });
  } catch (e) {
    try { if (w) w.close(); } catch {}
    showErr(e);
  }
}, [busy, supabase, reportsUi]);
const [repPeriodOpen, setRepPeriodOpen] = useState(false);

const fetchStock = useCallback(async () => {
  const r = await apiFetchStock(supabase as any);
  setStock(r.rows);
  setStockCount(r.rows.length);
  setStockSupported(r.supported);
}, []);

const fetchReqHeads = useCallback(async () => {
  setReqHeadsLoading(true);
  try {
    const rows = await apiFetchReqHeads(supabase as any);
    setReqHeads(rows);
  } finally {
    setReqHeadsLoading(false);
  }
}, []);

const fetchReqItems = useCallback(async (requestId: string) => {
  setReqItemsLoading(true);
  try {
    const rows = await apiFetchReqItems(supabase as any, requestId);
    setReqItems(rows);
  } finally {
    setReqItemsLoading(false);
  }
}, []);

const fetchReports = useCallback(async () => {
  const r = await apiFetchReports(supabase as any, periodFrom, periodTo);
  setReportsSupported(r.supported);
  setRepStock(r.repStock as any);
  setRepMov(r.repMov as any);
  setRepIssues(r.repIssues as any);
}, [periodFrom, periodTo]);
const getAvailableByCode = useCallback((code: string): number => {
  const key = normMatCode(code);
  if (!key) return 0;

  let sum = 0;
  for (const s of stock) {
    const sKey = normMatCode(String((s as any).rik_code ?? (s as any).code ?? ""));
    if (sKey === key) sum += nz((s as any).qty_available, 0);
  }
  return sum;
}, [stock]);
const [levelList, setLevelList] = useState<Option[]>([]);
const [systemList, setSystemList] = useState<Option[]>([]);
const [zoneList, setZoneList] = useState<Option[]>([]);

const [levelOpt, setLevelOpt] = useState<Option | null>(null);   
const [systemOpt, setSystemOpt] = useState<Option | null>(null); 
const [zoneOpt, setZoneOpt] = useState<Option | null>(null);     
const scopeLabel = useMemo(() => {
  const lvl = String(levelOpt?.label ?? "").trim();
  const sys = String(systemOpt?.label ?? "").trim();
  const zn = String(zoneOpt?.label ?? "").trim();

  const parts: string[] = [];
  if (lvl) parts.push(`Этаж: ${lvl}`);
  if (sys) parts.push(`Система: ${sys}`);
  if (zn) parts.push(`Зона: ${zn}`);

  return parts.join(" · ");
}, [levelOpt?.label, systemOpt?.label, zoneOpt?.label]);


const scopeOpt = useMemo<Option | null>(() => {
  if (!levelOpt?.id) return null;
  return { id: String(levelOpt.id), label: scopeLabel || String(levelOpt.label ?? "") };
}, [levelOpt, scopeLabel]);

const [objectList, setObjectList] = useState<Option[]>([]);
const [recipientList, setRecipientList] = useState<Option[]>([]);
const [objectOpt, setObjectOpt] = useState<Option | null>(null);
const rec = useWarehouseRecipient({
  enabled: tab === "Расход" || tab === "Склад факт",
  recipientList,
});

const [pickModal, setPickModal] = useState<{
  what: "object" | "level" | "system" | "zone" | "recipient" | null;
}>({ what: null });

const [pickFilter, setPickFilter] = useState("");

const closePick = useCallback(() => {
  setPickModal({ what: null });
  setPickFilter("");
}, []);

const applyPick = useCallback(
  (opt: Option) => {
    if (pickModal.what === "object") setObjectOpt(opt);
    if (pickModal.what === "level") setLevelOpt(opt);
    if (pickModal.what === "system") setSystemOpt(opt);
    if (pickModal.what === "zone") setZoneOpt(opt);
    closePick();
  },
  [pickModal.what, closePick],
);
useEffect(() => {
  // если сбросили объект — сбрасываем и ниже
  if (!objectOpt?.id) {
    if (levelOpt) setLevelOpt(null);
    if (systemOpt) setSystemOpt(null);
    if (zoneOpt) setZoneOpt(null);
    return;
  }
}, [objectOpt?.id]);

useEffect(() => {
    if (!levelOpt?.id) {
    if (systemOpt) setSystemOpt(null);
    if (zoneOpt) setZoneOpt(null);
    return;
  }
}, [levelOpt?.id]);

    const [issueBusy, setIssueBusy] = useState(false);
  const [issueMsg, setIssueMsg] = useState<{
    kind: "error" | "ok" | null;
    text: string;
  }>({ kind: null, text: "" });


const reqPickUi = useWarehouseReqPick({
  nz,
  setIssueMsg,
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
    getAvailableByCode,
    setIssueBusy,
    setIssueMsg,
    clearStockPick: () => stockPickUi.clearStockPick(),
    clearReqPick: () => reqPickUi.clearReqPick(),
clearReqQtyInput: (requestItemId: string) => reqPickUi.clearQtyInput(String(requestItemId)),
  });
  
}, [
  supabase,
  rec.recipientText,
  objectOpt?.label,
  scopeLabel,
  fetchStock,
  fetchReqItems,
  fetchReqHeads,
  getAvailableByCode,
  stockPickUi.clearStockPick,
]);
const submitReqPick = useCallback(async () => {
  const rid = String(reqModal?.request_id ?? "").trim();
  if (!rid) {
    setIssueMsg({ kind: "error", text: "Заявка не выбрана" });
    return;
  }

  await issueActions.submitReqPick({
    requestId: rid,
    requestDisplayNo: reqModal?.display_no ?? null,
    reqPick: reqPickUi.reqPick,
    reqItems,
  });

  // 🔥 PROD: сброс UI
  reqPickUi.clearReqPick();
  reqPickUi.setReqQtyInputByItem({});

  // 🔥 PROD: обязательный рефреш источников истины
  await Promise.all([
    fetchStock(),
    fetchReqItems(rid),
  ]);
}, [
  issueActions,
  reqModal?.request_id,
  reqModal?.display_no,
  reqPickUi.reqPick,
  reqItems,
  fetchStock,
  fetchReqItems,
  reqPickUi,
]);
const submitStockPick = useCallback(async () => {
  await issueActions.submitStockPick({ stockPick: stockPickUi.stockPick });
}, [issueActions, stockPickUi.stockPick]);

const issueByRequestItem = useCallback(
  async (row: ReqItemUiRow) => {
    const requestItemId = String(row.request_item_id || "").trim();
    const raw = String(reqPickUi.reqQtyInputByItem[requestItemId] ?? "").trim().replace(",", ".");
    const qty = Number(raw);
    await issueActions.issueByRequestItem({ row, qty });
  },
  [issueActions, reqPickUi.reqQtyInputByItem]

);

  const tryOptions = useCallback(async (table: string, columns: string[]) => {
    const colList = columns.join(",");
    const q = await supabase.from(table as any).select(colList).limit(1000);
    if (q.error || !Array.isArray(q.data)) return [] as Option[];
    const opts: Option[] = [];
    for (const r of q.data as any[]) {
      const id = String(r.id ?? r.uuid ?? "");
      const label = String(
        r.name ??
          r.title ??
          r.object_name ??
          r.fio ??
          r.full_name ??
          r.email ??
          r.username ??
          r.login ??
          "",
      );
      if (id && label) opts.push({ id, label });
    }
    return opts;
  }, []);

const tryRefOptions = useCallback(
  async (table: string) => {
    const q = await supabase
      .from(table as any)
      .select("code,display_name,name_human_ru,name_ru,name")
      .limit(2000);

    if (q.error || !Array.isArray(q.data)) {
      console.log(`[${table}] error:`, q.error?.message);
      return [] as Option[];
    }

    const out: Option[] = [];
    for (const r of q.data as any[]) {
      const id = String(r.code ?? "").trim();
      const label = String(
        r.display_name ??
        r.name_human_ru ??
        r.name_ru ??
        r.name ??
        r.code ??
        ""
      ).trim();

      if (id && label) out.push({ id, label });
    }

    // сортировка уже на фронте (чтобы не зависеть от колонок БД)
    out.sort((a, b) => a.label.localeCompare(b.label, "ru"));

    return out;
  },
  [],
);

 const loadObjects = useCallback(async () => {
  const q = await supabase.from("ref_object_types" as any).select("code").limit(1);
  console.log(
    "[ref_object_types] err=",
    q.error?.message,
    "rows=",
    Array.isArray(q.data) ? q.data.length : "no-data",
  );

  const opts = await tryRefOptions("ref_object_types", { order: "name" });

  const cleaned = (opts || []).filter((o) => {
    const t = String(o.label ?? "").toLowerCase();
    const c = String(o.id ?? "").toLowerCase();
    if (t.includes("без объекта")) return false;
    if (c === "none" || c === "no_object" || c === "noobject") return false;
    return true;
  });

  setObjectList(cleaned);
}, [tryRefOptions]);



   const loadRecipients = useCallback(async () => {
    const opts = await tryOptions("profiles", ["id", "full_name"]);
    setRecipientList(opts);
  }, [tryOptions]);
const loadLevels = useCallback(async () => {
  setLevelList(await tryRefOptions("ref_levels"));
}, [tryRefOptions]);

const loadSystems = useCallback(async () => {
  setSystemList(await tryRefOptions("ref_systems"));
}, [tryRefOptions]);

const loadZones = useCallback(async () => {
  setZoneList(await tryRefOptions("ref_zones"));
}, [tryRefOptions]);


useEffect(() => {
  if (tab === "Расход" || tab === "Склад факт") {
    loadObjects().catch(() => {});
    loadLevels().catch(() => {});
    loadSystems().catch(() => {});
    loadZones().catch(() => {});
    loadRecipients().catch(() => {});
  }
}, [tab, loadObjects, loadLevels, loadSystems, loadZones, loadRecipients]);

const confirmIncoming = useCallback(
  async (whIncomingId: string) => {
    try {
      setConfirmingId(whIncomingId);

      const r = await supabase.rpc("wh_receive_confirm" as any, {
        p_wh_id: whIncomingId,
      } as any);

      let pid: string | null = null;
      try {
        const q = await supabase
          .from("wh_incoming" as any)
          .select("purchase_id")
          .eq("id", whIncomingId)
          .maybeSingle();
        if (!q.error && q.data?.purchase_id) pid = String(q.data.purchase_id);
      } catch (e) {
        console.warn("[confirmIncoming] purchase_id lookup err:", e);
      }

      if (r.error) {
        console.warn("[wh_receive_confirm] rpc error:", r.error.message);
        if (pid) {
          const upd = await supabase
            .from("purchases" as any)
            .update({ status: "На складе" })
            .eq("id", pid);
          if (upd.error) throw upd.error;
        }
      }

      await Promise.all([incoming.fetchToReceive(), fetchStock()]);
      Alert.alert("Готово", "Поставка принята на склад.");
    } catch (e) {
      showErr(e);
    } finally {
      setConfirmingId(null);
    }
  },
  [incoming, fetchStock],
);
   const __toNum = (v: any): number => {
    if (v == null) return 0;
    const s = String(v).trim();
    if (!s) return 0;
    const cleaned = s
      .replace(/[^\d,\.\-]+/g, "")
      .replace(",", ".")
      .replace(/\s+/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  };
  const __pick = (row: any, names: string[], def?: any) => {
    for (const n of names)
      if (row && row[n] !== undefined && row[n] !== null) return row[n];
    return def;
  };
  const __pickDeep = (obj: any, paths: string[]): any => {
    for (const p of paths) {
      try {
        const v = p
          .split(".")
          .reduce(
            (o, k) => (o && typeof o === "object" ? (o as any)[k] : undefined),
            obj,
          );
        if (v !== undefined && v !== null) return v;
      } catch {}
    }
    return undefined;
  };
useEffect(() => {
  if (!itemsModal) return;

  (async () => {
    await seedEnsureIncomingItems({ supabase, incomingId: itemsModal.incomingId });
    await incoming.loadItemsForHead(itemsModal.incomingId, true);
  })();
  
}, [itemsModal?.incomingId]);

  const receivePart = useCallback(
    async (incomingItemId: string, qty: number) => {
      try {
        if (!incomingItemId)
          return Alert.alert("Нет позиции", "Неизвестный ID позиции прихода");
        const q = Number(qty);
        if (!Number.isFinite(q) || q <= 0)
          return Alert.alert("Количество", "Введите положительное количество.");
        const r = await supabase.rpc("wh_receive_item_v2" as any, {
  p_incoming_item_id: incomingItemId,
  p_qty: q,
  p_note: null,
} as any);
        if (r.error)
          return Alert.alert("Ошибка прихода", pickErr(r.error));

        await incoming.fetchToReceive();
        await fetchStock();
      } catch (e) {
        showErr(e);
      }
    },
     [incoming, fetchStock],
  );

  const receiveAllHead = useCallback(
  async (incomingIdRaw: string) => {
    try {
      const incomingId = String(incomingIdRaw ?? "").trim();
      if (!incomingId) return;

      // берём строки через incoming-хук
      const rows = await incoming.loadItemsForHead(incomingId, true);
      if (!rows.length) {
        return Alert.alert(
          "Нет позиций",
          "Под этой поставкой нет строк для прихода. Раскрой «Показать позиции» и проверь состав.",
        );
      }

      const totalLeft = rows.reduce(
        (s, r) => s + Math.max(0, nz(r.qty_expected, 0) - nz(r.qty_received, 0)),
        0,
      );
      if (totalLeft <= 0) {
        return Alert.alert("Нечего приходовать", "Все позиции уже приняты.");
      }

      const pr = await supabase.rpc("wh_receive_confirm" as any, {
        p_wh_id: incomingId,
      } as any);
      if (pr.error) return Alert.alert("Ошибка полного прихода", pickErr(pr.error));

      await Promise.all([incoming.fetchToReceive(), fetchStock()]);
      Alert.alert("Готово", "Поставка оприходована полностью");
    } catch (e) {
      showErr(e);
    }
  },
  [incoming, fetchStock],
);

const receiveSelectedForHead = useCallback(
  async (incomingIdRaw: string) => {
    try {
      const incomingId = String(incomingIdRaw ?? "").trim();
      if (!incomingId) return;

      // берём строки ТОЛЬКО через incoming-хук
      const freshRows = await incoming.loadItemsForHead(incomingId, true);

      if (!freshRows.length) {
        return Alert.alert(
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
        return Alert.alert("Нечего оприходовать", "Введите количество > 0 для нужных строк.");
      }

      setReceivingHeadId(incomingId);

      const { data, error } = await supabase.rpc("wh_receive_apply_ui" as any, {
        p_incoming_id: incomingId,
        p_items: toApply,
        p_note: null,
      } as any);

      if (error) {
        console.warn("[wh_receive_apply_ui] error:", error.message);
        return Alert.alert("Ошибка прихода", pickErr(error));
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

      Alert.alert(
        "Готово",
        `Принято позиций: ${ok}${fail ? `, ошибок: ${fail}` : ""}\nОсталось: ${leftAfter}`,
      );
    } catch (e) {
      showErr(e);
    } finally {
      setReceivingHeadId(null);
    }
  },
  [incoming, fetchStock, qtyInputByItem],
);
 
const openRepPeriod = useCallback(() => setRepPeriodOpen(true), []);
const closeRepPeriod = useCallback(() => setRepPeriodOpen(false), []);


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

 useEffect(() => {
  if (tab === "Отчёты") fetchReports().catch(() => {});
}, [tab, fetchReports]);
useEffect(() => {
  if (tab !== "Расход") return;
  fetchReqHeads().catch(() => {});
  
}, [tab]);

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

const StockRowView = React.memo(function StockRowView({
  r,
  pickedQty,
}: {
  r: StockRow;
  pickedQty?: number;
}) {
 const uomLabel = uomLabelRu(r.uom_id);

  const onHand = nz(r.qty_on_hand, 0);
  const reserved = nz(r.qty_reserved, 0);
  const available = nz(r.qty_available, 0);

  const fmtQty = (n: number) => Number(n).toLocaleString("ru-RU", { maximumFractionDigits: 3 });

  const isPicked = Number(pickedQty ?? 0) > 0;

  return (
    <View style={{ marginBottom: 12, paddingHorizontal: 16 }}>
      <Pressable onPress={() => stockPickUi.openStockIssue(r)}>
        <View
          style={[
            s.mobCard,
            isPicked && { borderColor: UI.accent, borderWidth: 2 },
          ]}
        >
          <View style={s.mobMain}>
            <Text style={s.mobTitle} numberOfLines={2}>
              {String(r.name ?? "").trim() || "—"}
            </Text>

            <Text style={s.mobMeta} numberOfLines={2}>
              {`Доступно ${fmtQty(available)} ${uomLabel} · Резерв ${fmtQty(reserved)}`}
            </Text>

            {isPicked ? (
              <Text style={{ marginTop: 6, color: UI.text, fontWeight: "900" }}>
                {`Выбрано: ${fmtQty(Number(pickedQty))} ${uomLabel}`}
              </Text>
            ) : null}
          </View>

          <View style={s.metaPill}>
            <Text style={s.metaPillText}>{fmtQty(onHand)}</Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
});

const HistoryRowView = ({ h }: { h: any }) => {
  const dt = new Date(h.event_dt).toLocaleString("ru-RU");
  const qty = h.qty ?? 0;

  const typeLabel =
    h.event_type === "RECEIPT"
      ? "Приход"
      : h.event_type === "ISSUE"
      ? "Расход"
      : h.event_type;

  return (
    <View style={{ marginBottom: 12, paddingHorizontal: 16 }}>
      <View style={s.mobCard}>
        <View style={s.mobMain}>
          <Text style={s.mobTitle} numberOfLines={1}>{typeLabel}</Text>
          <Text style={s.mobMeta} numberOfLines={2}>
            {`${dt} · ${h.code || "—"} · ${uomLabelRu(h.uom_id) || "—"} · ${qty}`}
          </Text>
        </View>
      </View>
    </View>
  );
};

const renderReqIssue = () => {
  return (
    <View style={{ flex: 1 }}>
      <AnimatedFlatList
        data={reqHeads}
        keyExtractor={(x) => x.request_id}
        contentContainerStyle={{ paddingTop: HEADER_MAX + 12, paddingBottom: 24 }}
        onScroll={isWeb ? undefined : headerApi.onListScroll}
        scrollEventThrottle={isWeb ? undefined : 16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={() => (
  <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
    <View style={s.sectionBox}>
      <Text style={s.sectionBoxTitle}>РАСХОД ПО ЗАЯВКАМ (REQ)</Text>
      <Text style={{ color: UI.sub, fontWeight: "800" }}>
        Выдача доступна только по утверждённым строкам и только если есть остаток на складе.
      </Text>

      <View style={{ marginTop: 10 }}>
        <Text style={{ color: UI.sub, fontWeight: "800", marginBottom: 6 }}>
          Получатель
        </Text>

        <TextInput
          value={rec.recipientText}
onChangeText={(t) => {
  rec.setRecipientText(t);
  rec.setRecipientSuggestOpen(true);
}}
          placeholder="Введите ФИО получателя…"
          placeholderTextColor={UI.sub}
          style={s.input}
          onFocus={() => rec.setRecipientSuggestOpen(true)}
          onBlur={() => {
         setTimeout(() => rec.setRecipientSuggestOpen(false), 150);
          }}
        />

       {rec.recipientSuggestOpen && rec.recipientSuggestions.length > 0 ? (
          <View style={{ marginTop: 8, gap: 8 }}>
            {rec.recipientSuggestions.map((name) => (
              <Pressable
                key={name}
                onPress={() => void rec.commitRecipient(name)}
                style={s.openBtn}
              >
                <Text style={s.openBtnText} numberOfLines={1}>
                  {name}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  </View>
)}

        renderItem={({ item }) => {
         const status = String(item.issue_status ?? "").trim().toUpperCase();

          const badge =
            status === "WAITING_STOCK" ? "Ожидает приход"
            : status === "PARTIAL" ? "Частично"
            : status === "DONE" ? "Закрыта"
            : "Можно выдавать";

          return (
            <View style={{ marginBottom: 12, paddingHorizontal: 16 }}>
              <View style={s.groupHeader}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.groupTitle} numberOfLines={1}>
                    {item.display_no || `REQ-${item.request_id.slice(0, 8)}`}
                  </Text>
                  <Text style={s.cardMeta} numberOfLines={2}>
                    {(item.level_name || item.level_code) ? `Этаж: ${item.level_name || item.level_code}` : ""}
{(item.system_name || item.system_code) ? ` · Система: ${item.system_name || item.system_code}` : ""}
{(item.zone_name || item.zone_code) ? ` · Зона: ${item.zone_name || item.zone_code}` : ""}

                  </Text>
                </View>

                <View style={s.rightStack}>
                  <View style={s.metaPill}>
                    <Text style={s.metaPillText}>{badge}</Text>
                  </View>

                  <View style={s.metaPill}>
                    <Text style={s.metaPillText}>{`Позиций ${item.items_cnt}`}</Text>
                  </View>

                  <View style={s.metaPill}>
                    <Text style={s.metaPillText}>{`Готово ${item.ready_cnt}`}</Text>
                  </View>

                  <Pressable
                    onPress={() => openReq(item)}
                    style={[s.openBtn, (item.ready_cnt <= 0) && { opacity: 0.7 }]}
                  >
                    <Text style={s.openBtnText}>Открыть</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
  reqHeadsLoading ? (
    <Text style={{ color: UI.sub, paddingHorizontal: 16, fontWeight: "800" }}>
      Загрузка…
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
          keyExtractor={(i) => i.incoming_id}
          contentContainerStyle={{ paddingTop: HEADER_MAX + 12, paddingBottom: 24 }}
          onScroll={isWeb ? undefined : headerApi.onListScroll}
          scrollEventThrottle={isWeb ? undefined : 16}
          renderItem={({ item }) => {
            return (
              <View style={{ marginBottom: 12, paddingHorizontal: 16 }}>
                <View style={s.groupHeader}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    {renderPrWithRoleBadge(
  formatProposalBaseNo(
    incoming.proposalNoByPurchase[item.purchase_id] || item.po_no,
    item.purchase_id
  ),
  roleBadgeLabel("S")
)}

                    <Text style={s.cardMeta} numberOfLines={1}>
                      {item.purchase_created_at
                        ? new Date(item.purchase_created_at).toLocaleDateString("ru-RU")
                        : "—"}
                      {item.purchase_status ? ` · ${item.purchase_status}` : ""}
                    </Text>
                  </View>

                  {(() => {
  const totalLeft = nz(item.qty_left_sum, 0);

  const leftPos = Math.max(
    0,
    Number(item.pending_cnt ?? 0) + Number(item.partial_cnt ?? 0),
  );
  const totalPos = Math.max(0, Number(item.items_cnt ?? 0));
  const donePos = Math.max(0, totalPos - leftPos);

  const expSum = nz(item.qty_expected_sum, 0);
const recSum = nz(item.qty_received_sum, 0);
const leftSum = Math.max(0, expSum - recSum);
const isPartial = recSum > 0 && leftSum > 0;

  const statusLabel = isPartial ? "Частично" : "Ожидает";

  return (
    <View style={s.rightStack}>
      {/* статус */}
      <View
        style={[
          s.metaPill,
          isPartial
            ? { borderColor: "rgba(59,130,246,0.55)", backgroundColor: "rgba(59,130,246,0.12)" }
            : { borderColor: "rgba(34,197,94,0.55)", backgroundColor: "rgba(34,197,94,0.12)" },
        ]}
      >
        <Text style={s.metaPillText}>{statusLabel}</Text>
      </View>

      {(() => {
  const exp = nz(item.qty_expected_sum, 0);
  const rec = nz(item.qty_received_sum, 0);
  const left = Math.max(0, exp - rec);
  return (
    <View style={s.metaPill}>
      <Text style={s.metaPillText}>{`Принято ${Math.round(rec)} / Осталось ${Math.round(left)}`}</Text>
    </View>
  );
})()}


      {/* остаток по количеству */}
      <View style={s.metaPill}>
        <Text style={s.metaPillText}>{`Остаток ${Math.round(totalLeft)}`}</Text>
      </View>

      <Pressable onPress={() => void openItemsModal(item)} style={s.openBtn}>
  <Text style={s.openBtnText}>Открыть</Text>
</Pressable>

    </View>
  );
})()}

                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={{ color: UI.sub, paddingHorizontal: 16, fontWeight: "800" }}>
              Нет записей в очереди склада.
            </Text>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
    keyExtractor={(i) => i.material_id}
    contentContainerStyle={{ paddingTop: HEADER_MAX + 12, paddingBottom: 24 }}
    onScroll={isWeb ? undefined : headerApi.onListScroll}
    scrollEventThrottle={isWeb ? undefined : 16}
   renderItem={({ item }) => {
  const codeRaw = String(item.code ?? "").trim();
  const codeKey = normMatCode(codeRaw);
  const pickedQty = codeKey ? nz(stockPickUi.stockPick?.[codeKey]?.qty, 0) : 0;
  return <StockRowView r={item} pickedQty={pickedQty} />;
}}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
  onPickRecipient={(name) => void rec.commitRecipient(name)}

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
    onScroll={Platform.OS === "web" ? undefined : headerApi.onListScroll}
    scrollEventThrottle={Platform.OS === "web" ? undefined : 16}
    periodFrom={periodFrom}
    periodTo={periodTo}
    repStock={repStock}
    repMov={repMov}
    reportsUi={reportsUi}
    onOpenPeriod={() => setRepPeriodOpen(true)}
    onRefresh={() => void fetchReports()}
    onPdfRegister={() => void onPdfRegister()}
    onPdfIssue={(id) => void onPdfIssue(id)}
onPdfMaterials={() => void onPdfMaterials()}
onPdfObjectWork={() => void onPdfObjectWork()}
onPdfDayRegister={(day) => void onPdfDayRegister(day)}
  onPdfDayMaterials={(day) => void onPdfDayMaterials(day)}
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
          willChange: "transform",
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
      <Text style={{ marginTop: 8, color: UI.sub }}>Загрузка…</Text>
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
  onClose={() => setItemsModal(null)}
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
  onSubmit={(id) => {
    if (!id) return;
    void receiveSelectedForHead(id);
  }}
/>
<IssueDetailsSheet
  visible={issueDetailsId != null}
  issueId={issueDetailsId}
  loadingId={issueLinesLoadingId}
  linesById={issueLinesById}
  matNameByCode={matNameByCode}
  onClose={reportsUi.closeIssueDetails}
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
  title={
  pickModal.what === "object"
    ? "Выбор объекта"
    : pickModal.what === "level"
    ? "Выбор этажа/уровня"
    : pickModal.what === "system"
    ? "Выбор системы/вида работ"
    : pickModal.what === "zone"
    ? "Выбор зоны/участка"
    : "Выбор получателя"
}

  filter={pickFilter}
  onFilterChange={setPickFilter}
  items={(() => {
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
  })()}
  onPick={(opt) => {
    if (pickModal.what === "recipient") {
  void rec.commitRecipient(opt.label);
  closePick();
  return;
}

    applyPick(opt);
  }}
  onClose={closePick}
/>

{repPeriodOpen ? (
  <PeriodPickerSheet
    visible={repPeriodOpen}
    onClose={() => setRepPeriodOpen(false)}
    initialFrom={periodFrom || ""}
    initialTo={periodTo || ""}
    onApply={(from: string, to: string) => {
      setPeriodFrom(from || "");
      setPeriodTo(to || "");
      setRepPeriodOpen(false);
      void fetchReports();
    }}
    onClear={() => {
      setPeriodFrom("");
      setPeriodTo("");
      setRepPeriodOpen(false);
      void fetchReports();
    }}
    ui={{
      cardBg: UI.cardBg,
      text: UI.text,
      sub: UI.sub,
      border: "rgba(255,255,255,0.14)",
      accentBlue: "#3B82F6",
      approve: UI.accent,
    }}
  />
) : null}
    </View>
  );
}