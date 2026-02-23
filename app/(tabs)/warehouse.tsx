// app/(tabs)/warehouse.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
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
import TopRightActionBar from "../../src/ui/TopRightActionBar";`r`nimport { showToast } from "../../src/ui/toast";

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
  if (c.startsWith("MAT-")) return "РјР°С‚РµСЂРёР°Р»";
  if (c.startsWith("TOOL-")) return "РёРЅСЃС‚СЂСѓРјРµРЅС‚";
  return null;
};
const ORG_NAME = "";
export default function Warehouse() {
  const busy = useGlobalBusy();
  const insets = useSafeAreaInsets();`r`n  const notifyInfo = useCallback((title: string, message?: string) => {`r`n    showToast.info(title, message);`r`n  }, []);`r`n  const notifyError = useCallback((title: string, message?: string) => {`r`n    showToast.error(title, message);`r`n  }, []);
  const [tab, setTab] = useState<Tab>("Рљ РїСЂРёС…РѕРґСѓ");
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

    // вњ… PROD: РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ СЃРєСЂС‹РІР°РµРј РЅСѓР»Рё
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
    warehouseName: "РЎРєР»Р°Рґ",

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
        label: "Р“РѕС‚РѕРІР»СЋ РЅР°РєР»Р°РґРЅСѓСЋвЂ¦",
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
      label: "Р“РѕС‚РѕРІР»СЋ СЂРµРµСЃС‚СЂвЂ¦",
      mode: Platform.OS === "web" ? "preview" : "share",
      fileName: `Warehouse_Issues_${periodFrom || "all"}_${periodTo || "all"}`,
      getRemoteUrl: async () => await reportsUi.buildRegisterHtml(),
    });
  }, [busy, supabase, periodFrom, periodTo, reportsUi]);

  const onPdfMaterials = useCallback(async () => {
    let w: any = null;

    // вњ… web: РѕС‚РєСЂС‹С‚СЊ РѕРєРЅРѕ РЎР РђР—РЈ РїРѕ РєР»РёРєСѓ (РёРЅР°С‡Рµ Р±СЂР°СѓР·РµСЂ Р±Р»РѕРєРЅРµС‚)
    if (Platform.OS === "web") {
      w = window.open("", "_blank");
      try {
        if (w?.document) {
          w.document.title = "РћС‚С‡С‘С‚ РїРѕ РјР°С‚РµСЂРёР°Р»Р°Рј";
          w.document.body.style.margin = "0";
          w.document.body.innerHTML = `
          <div style="font-family:system-ui,Segoe UI,Roboto,Arial;padding:18px">
            <h3 style="margin:0 0 8px 0">РћС‚С‡С‘С‚ РїРѕ РјР°С‚РµСЂРёР°Р»Р°Рј</h3>
            <div style="color:#64748b">Р¤РѕСЂРјРёСЂСѓСЋ PDFвЂ¦</div>
          </div>`;
        }
      } catch (e) { console.warn(e); }
    }

    try {
      const url = await busy.run(
        async () => await reportsUi.buildMaterialsReportPdf(),
        { label: "Р“РѕС‚РѕРІР»СЋ РѕС‚С‡С‘С‚ РїРѕ РјР°С‚РµСЂРёР°Р»Р°РјвЂ¦" } as any
      );
      if (!url) throw new Error("Не удалось сформировать PDF");
      if (Platform.OS === "web") {
        if (w) w.location.href = url;
        else window.open(url, "_blank");
        return;
      }

      await runPdfTop({
        busy,
        supabase,
        key: `pdf:warehouse:materials:${periodFrom || "all"}:${periodTo || "all"}`,
        label: "РћС‚РєСЂС‹РІР°СЋ PDFвЂ¦",
        mode: "share",
        fileName: `WH_Materials_${periodFrom || "all"}_${periodTo || "all"}`,
        getRemoteUrl: async () => url,
      });
    } catch (e) {
      try { if (w) w.close(); } catch (e) { console.warn(e); }
      showErr(e);
    }
  }, [busy, supabase, periodFrom, periodTo, reportsUi]);

  const onPdfObjectWork = useCallback(async () => {
    let w: any = null;

    if (Platform.OS === "web") {
      w = window.open("", "_blank");
      try {
        if (w?.document) {
          w.document.title = "РћС‚С‡С‘С‚ РїРѕ РѕР±СЉРµРєС‚Р°Рј/СЂР°Р±РѕС‚Р°Рј";
          w.document.body.style.margin = "0";
          w.document.body.innerHTML = `
          <div style="font-family:system-ui,Segoe UI,Roboto,Arial;padding:18px">
            <h3 style="margin:0 0 8px 0">РћС‚С‡С‘С‚ РїРѕ РѕР±СЉРµРєС‚Р°Рј/СЂР°Р±РѕС‚Р°Рј</h3>
            <div style="color:#64748b">Р¤РѕСЂРјРёСЂСѓСЋ PDFвЂ¦</div>
          </div>`;
        }
      } catch (e) { console.warn(e); }
    }

    try {
      const url = await busy.run(
        async () => await reportsUi.buildObjectWorkReportPdf(),
        { label: "Р“РѕС‚РѕРІР»СЋ РѕС‚С‡С‘С‚ РїРѕ РѕР±СЉРµРєС‚Р°РјвЂ¦" } as any
      );
      if (!url) throw new Error("Не удалось сформировать PDF");
      if (Platform.OS === "web") {
        if (w) w.location.href = url;
        else window.open(url, "_blank");
        return;
      }

      await runPdfTop({
        busy,
        supabase,
        key: `pdf:warehouse:objwork:${periodFrom || "all"}:${periodTo || "all"}`,
        label: "РћС‚РєСЂС‹РІР°СЋ PDFвЂ¦",
        mode: "share",
        fileName: `WH_ObjectWork_${periodFrom || "all"}_${periodTo || "all"}`,
        getRemoteUrl: async () => url,
      });
    } catch (e) {
      try { if (w) w.close(); } catch (e) { console.warn(e); }
      showErr(e);
    }
  }, [busy, supabase, periodFrom, periodTo, reportsUi]);

  const onPdfDayRegister = useCallback(async (dayLabel: string) => {
    await runPdfTop({
      busy,
      supabase,
      key: `pdf:warehouse:day-register:${dayLabel}`,
      label: "Р“РѕС‚РѕРІР»СЋ СЂРµРµСЃС‚СЂ Р·Р° РґРµРЅСЊвЂ¦",
      mode: Platform.OS === "web" ? "preview" : "share",
      fileName: `WH_Register_${String(dayLabel).trim().replace(/\s+/g, "_")}`,
      getRemoteUrl: async () => await (reportsUi as any).buildDayRegisterPdf(dayLabel),
    });
  }, [busy, supabase, reportsUi]);

  const onPdfDayMaterials = useCallback(async (dayLabel: string) => {
    let w: any = null;

    // вњ… web: РѕС‚РєСЂС‹С‚СЊ РѕРєРЅРѕ СЃСЂР°Р·Сѓ, С‡С‚РѕР±С‹ РЅРµ Р±Р»РѕРєРЅСѓР»Рѕ
    if (Platform.OS === "web") {
      w = window.open("", "_blank");
      try {
        if (w?.document) {
          w.document.title = "РЎРІРѕРґ РјР°С‚РµСЂРёР°Р»РѕРІ Р·Р° РґРµРЅСЊ";
          w.document.body.style.margin = "0";
          w.document.body.innerHTML = `
          <div style="font-family:system-ui,Segoe UI,Roboto,Arial;padding:18px">
            <h3 style="margin:0 0 8px 0">РЎРІРѕРґ РјР°С‚РµСЂРёР°Р»РѕРІ Р·Р° РґРµРЅСЊ</h3>
            <div style="color:#64748b">Р¤РѕСЂРјРёСЂСѓСЋ PDFвЂ¦</div>
          </div>`;
        }
      } catch (e) { console.warn(e); }
    }

    try {
      const url = await busy.run(
        async () => await (reportsUi as any).buildDayMaterialsReportPdf(dayLabel),
        { label: "Р“РѕС‚РѕРІР»СЋ СЃРІРѕРґ РјР°С‚РµСЂРёР°Р»РѕРІ Р·Р° РґРµРЅСЊвЂ¦" } as any
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
        label: "РћС‚РєСЂС‹РІР°СЋ PDFвЂ¦",
        mode: "share",
        fileName: `WH_DayMaterials_${String(dayLabel).trim().replace(/\s+/g, "_")}`,
        getRemoteUrl: async () => url,
      });
    } catch (e) {
      try { if (w) w.close(); } catch (e) { console.warn(e); }
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
  const getUomByCode = useCallback((code: string): string | null => {
    const key = normMatCode(code);
    if (!key) return null;

    let bestUom: string | null = null;
    let bestAvail = -1;
    for (const s of stock) {
      const sKey = normMatCode(String((s as any).rik_code ?? (s as any).code ?? ""));
      if (sKey !== key) continue;
      const avail = nz((s as any).qty_available, 0);
      if (avail > bestAvail) {
        bestAvail = avail;
        const u = String((s as any).uom_id ?? "").trim();
        bestUom = u || null;
      }
    }
    return bestUom;
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
    if (lvl) parts.push(`Р­С‚Р°Р¶: ${lvl}`);
    if (sys) parts.push(`РЎРёСЃС‚РµРјР°: ${sys}`);
    if (zn) parts.push(`Р—РѕРЅР°: ${zn}`);

    return parts.join(" В· ");
  }, [levelOpt?.label, systemOpt?.label, zoneOpt?.label]);


  const scopeOpt = useMemo<Option | null>(() => {
    if (!levelOpt?.id) return null;
    return { id: String(levelOpt.id), label: scopeLabel || String(levelOpt.label ?? "") };
  }, [levelOpt, scopeLabel]);

  const [objectList, setObjectList] = useState<Option[]>([]);
  const [recipientList, setRecipientList] = useState<Option[]>([]);
  const [objectOpt, setObjectOpt] = useState<Option | null>(null);
  const rec = useWarehouseRecipient({
    enabled: tab === "Р Р°СЃС…РѕРґ" || tab === "РЎРєР»Р°Рґ С„Р°РєС‚",
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
    // РµСЃР»Рё СЃР±СЂРѕСЃРёР»Рё РѕР±СЉРµРєС‚ вЂ” СЃР±СЂР°СЃС‹РІР°РµРј Рё РЅРёР¶Рµ
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
      getUomByCode,
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
    getUomByCode,
    stockPickUi.clearStockPick,
  ]);
  const submitReqPick = useCallback(async () => {
    const rid = String(reqModal?.request_id ?? "").trim();
    if (!rid) {
      setIssueMsg({ kind: "error", text: "Р—Р°СЏРІРєР° РЅРµ РІС‹Р±СЂР°РЅР°" });
      return;
    }

    const ok = await issueActions.submitReqPick({
      requestId: rid,
      requestDisplayNo: reqModal?.display_no ?? null,
      reqPick: reqPickUi.reqPick,
      reqItems,
    });

    // рџ”Ґ PROD: СЃР±СЂРѕСЃ UI
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
    async (table: string, opts?: { order?: string }) => {
      let q = supabase
        .from(table as any)
        .select("code,display_name,name_human_ru,name_ru,name")
        .limit(2000);

      if (opts?.order) {
        q = q.order(opts.order, { ascending: true }) as any;
      }

      const res = await q;

      if (res.error || !Array.isArray(res.data)) {
        console.log(`[${table}] error:`, res.error?.message);
        return [] as Option[];
      }

      const out: Option[] = [];
      for (const r of res.data as any[]) {
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

      // СЃРѕСЂС‚РёСЂРѕРІРєР° СѓР¶Рµ РЅР° С„СЂРѕРЅС‚Рµ (С‡С‚РѕР±С‹ РЅРµ Р·Р°РІРёСЃРµС‚СЊ РѕС‚ РєРѕР»РѕРЅРѕРє Р‘Р”)
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

    const opts = await tryRefOptions("ref_object_types", { order: "name" as any });

    const cleaned = (opts || []).filter((o) => {
      const t = String(o.label ?? "").toLowerCase();
      const c = String(o.id ?? "").toLowerCase();
      if (t.includes("Р±РµР· РѕР±СЉРµРєС‚Р°")) return false;
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
    if (tab === "Р Р°СЃС…РѕРґ" || tab === "РЎРєР»Р°Рґ С„Р°РєС‚") {
      loadObjects().catch((e) => showErr(e));
      loadLevels().catch((e) => showErr(e));
      loadSystems().catch((e) => showErr(e));
      loadZones().catch((e) => showErr(e));
      loadRecipients().catch((e) => showErr(e));
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
              .update({ status: "РќР° СЃРєР»Р°РґРµ" })
              .eq("id", pid);
            if (upd.error) throw upd.error;
          }
        }

        await Promise.all([incoming.fetchToReceive(), fetchStock()]);
        Alert.alert("Р“РѕС‚РѕРІРѕ", "РџРѕСЃС‚Р°РІРєР° РїСЂРёРЅСЏС‚Р° РЅР° СЃРєР»Р°Рґ.");
      } catch (e) {
        showErr(e);
      } finally {
        setConfirmingId(null);
      }
    },
    [incoming, fetchStock, notifyInfo],
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
      } catch (e) { console.warn(e); }
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
          return Alert.alert("РќРµС‚ РїРѕР·РёС†РёРё", "РќРµРёР·РІРµСЃС‚РЅС‹Р№ ID РїРѕР·РёС†РёРё РїСЂРёС…РѕРґР°");
        const q = Number(qty);
        if (!Number.isFinite(q) || q <= 0)
          return Alert.alert("РљРѕР»РёС‡РµСЃС‚РІРѕ", "Р’РІРµРґРёС‚Рµ РїРѕР»РѕР¶РёС‚РµР»СЊРЅРѕРµ РєРѕР»РёС‡РµСЃС‚РІРѕ.");
        const r = await supabase.rpc("wh_receive_item_v2" as any, {
          p_incoming_item_id: incomingItemId,
          p_qty: q,
          p_note: null,
        } as any);
        if (r.error)
          return Alert.alert("РћС€РёР±РєР° РїСЂРёС…РѕРґР°", pickErr(r.error));

        await incoming.fetchToReceive();
        await fetchStock();
      } catch (e) {
        showErr(e);
      }
    },
    [incoming, fetchStock, notifyInfo],
  );

  const receiveAllHead = useCallback(
    async (incomingIdRaw: string) => {
      try {
        const incomingId = String(incomingIdRaw ?? "").trim();
        if (!incomingId) return;

        // Р±РµСЂС‘Рј СЃС‚СЂРѕРєРё С‡РµСЂРµР· incoming-С…СѓРє
        const rows = await incoming.loadItemsForHead(incomingId, true);
        if (!rows.length) {
          return Alert.alert(
            "РќРµС‚ РїРѕР·РёС†РёР№",
            "РџРѕРґ СЌС‚РѕР№ РїРѕСЃС‚Р°РІРєРѕР№ РЅРµС‚ СЃС‚СЂРѕРє РґР»СЏ РїСЂРёС…РѕРґР°. Р Р°СЃРєСЂРѕР№ В«РџРѕРєР°Р·Р°С‚СЊ РїРѕР·РёС†РёРёВ» Рё РїСЂРѕРІРµСЂСЊ СЃРѕСЃС‚Р°РІ.",
          );
        }

        const totalLeft = rows.reduce(
          (s, r) => s + Math.max(0, nz(r.qty_expected, 0) - nz(r.qty_received, 0)),
          0,
        );
        if (totalLeft <= 0) {
          return Alert.alert("РќРµС‡РµРіРѕ РїСЂРёС…РѕРґРѕРІР°С‚СЊ", "Р’СЃРµ РїРѕР·РёС†РёРё СѓР¶Рµ РїСЂРёРЅСЏС‚С‹.");
        }

        const pr = await supabase.rpc("wh_receive_confirm" as any, {
          p_wh_id: incomingId,
        } as any);
        if (pr.error) return Alert.alert("РћС€РёР±РєР° РїРѕР»РЅРѕРіРѕ РїСЂРёС…РѕРґР°", pickErr(pr.error));

        await Promise.all([incoming.fetchToReceive(), fetchStock()]);
        Alert.alert("Р“РѕС‚РѕРІРѕ", "РџРѕСЃС‚Р°РІРєР° РѕРїСЂРёС…РѕРґРѕРІР°РЅР° РїРѕР»РЅРѕСЃС‚СЊСЋ");
      } catch (e) {
        showErr(e);
      }
    },
    [incoming, fetchStock, notifyError, notifyInfo],`r`n  );`r`n`r`n  const receiveSelectedForHead = useCallback(
    async (incomingIdRaw: string) => {
      try {
        const incomingId = String(incomingIdRaw ?? "").trim();
        if (!incomingId) return;

        // Р±РµСЂС‘Рј СЃС‚СЂРѕРєРё РўРћР›Р¬РљРћ С‡РµСЂРµР· incoming-С…СѓРє
        const freshRows = await incoming.loadItemsForHead(incomingId, true);

        if (!freshRows.length) {
          return Alert.alert(
            "РќРµС‚ РјР°С‚РµСЂРёР°Р»РѕРІ",
            "Р’ СЌС‚РѕР№ РїРѕСЃС‚Р°РІРєРµ РЅРµС‚ РјР°С‚РµСЂРёР°Р»РѕРІ РґР»СЏ СЃРєР»Р°РґР°. Р Р°Р±РѕС‚С‹/СѓСЃР»СѓРіРё СЃРјРѕС‚СЂРё РІ В«РџРѕРґСЂСЏРґС‡РёРєРёВ».",
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
          return Alert.alert("РќРµС‡РµРіРѕ РѕРїСЂРёС…РѕРґРѕРІР°С‚СЊ", "Р’РІРµРґРёС‚Рµ РєРѕР»РёС‡РµСЃС‚РІРѕ > 0 РґР»СЏ РЅСѓР¶РЅС‹С… СЃС‚СЂРѕРє.");
        }

        setReceivingHeadId(incomingId);

        const { data, error } = await supabase.rpc("wh_receive_apply_ui" as any, {
          p_incoming_id: incomingId,
          p_items: toApply,
          p_note: null,
        } as any);

        if (error) {
          console.warn("[wh_receive_apply_ui] error:", error.message);
          return Alert.alert("РћС€РёР±РєР° РїСЂРёС…РѕРґР°", pickErr(error));
        }

        // РѕР±РЅРѕРІР»СЏРµРј РѕС‡РµСЂРµРґСЊ + СЃРєР»Р°Рґ + СЃС‚СЂРѕРєРё РІ РјРѕРґР°Р»РєРµ
        await Promise.all([
          incoming.fetchToReceive(),
          fetchStock(),
          incoming.loadItemsForHead(incomingId, true),
        ]);

        // С‡РёСЃС‚РёРј РІРІРѕРґС‹ РїРѕ СЃС‚СЂРѕРєР°Рј
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
          "Р“РѕС‚РѕРІРѕ",
          `РџСЂРёРЅСЏС‚Рѕ РїРѕР·РёС†РёР№: ${ok}${fail ? `, РѕС€РёР±РѕРє: ${fail}` : ""}\nРћСЃС‚Р°Р»РѕСЃСЊ: ${leftAfter}`,
        );
      } catch (e) {
        showErr(e);
      } finally {
        setReceivingHeadId(null);
      }
    },
    [incoming, fetchStock, notifyError, notifyInfo, qtyInputByItem],
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

  // рџ”Ґ PROD FIX: Р”РѕР±Р°РІР»СЏРµРј useRef РґР»СЏ РѕС‚СЃР»РµР¶РёРІР°РЅРёСЏ Р·Р°РіСЂСѓР¶РµРЅРЅС‹С… РґР°РЅРЅС‹С… РїРѕ С‚Р°Р±Р°Рј,
  // С‡С‚РѕР±С‹ РёР·Р±РµР¶Р°С‚СЊ Р±РµСЃРєРѕРЅРµС‡РЅС‹С… С†РёРєР»РѕРІ РёР·-Р·Р° РёР·РјРµРЅРµРЅРёСЏ СЃСЃС‹Р»РѕРє fetchReports/fetchReqHeads
  const loadedTabsRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (tab === "РћС‚С‡С‘С‚С‹" && !loadedTabsRef.current["РћС‚С‡С‘С‚С‹"]) {
      loadedTabsRef.current["РћС‚С‡С‘С‚С‹"] = true;
      fetchReports().catch((e) => showErr(e));
    }
  }, [tab, fetchReports]);

  useEffect(() => {
    if (tab === "Р Р°СЃС…РѕРґ" && !loadedTabsRef.current["Р Р°СЃС…РѕРґ"]) {
      loadedTabsRef.current["Р Р°СЃС…РѕРґ"] = true;
      fetchReqHeads().catch((e) => showErr(e));
    }
  }, [tab, fetchReqHeads]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (tab === "Рљ РїСЂРёС…РѕРґСѓ") await incoming.fetchToReceive();
      else if (tab === "РЎРєР»Р°Рґ С„Р°РєС‚") await fetchStock();
      else if (tab === "РћС‚С‡С‘С‚С‹") await fetchReports();
      else if (tab === "Р Р°СЃС…РѕРґ") {
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
                {String(r.name ?? "").trim() || "вЂ”"}
              </Text>

              <Text style={s.mobMeta} numberOfLines={2}>
                {`Р”РѕСЃС‚СѓРїРЅРѕ ${fmtQty(available)} ${uomLabel} В· Р РµР·РµСЂРІ ${fmtQty(reserved)}`}
              </Text>

              {isPicked ? (
                <Text style={{ marginTop: 6, color: UI.text, fontWeight: "900" }}>
                  {`Р’С‹Р±СЂР°РЅРѕ: ${fmtQty(Number(pickedQty))} ${uomLabel}`}
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
        ? "РџСЂРёС…РѕРґ"
        : h.event_type === "ISSUE"
          ? "Р Р°СЃС…РѕРґ"
          : h.event_type;

    return (
      <View style={{ marginBottom: 12, paddingHorizontal: 16 }}>
        <View style={s.mobCard}>
          <View style={s.mobMain}>
            <Text style={s.mobTitle} numberOfLines={1}>{typeLabel}</Text>
            <Text style={s.mobMeta} numberOfLines={2}>
              {`${dt} В· ${h.code || "вЂ”"} В· ${uomLabelRu(h.uom_id) || "вЂ”"} В· ${qty}`}
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
          data={reqHeads as any[]}
          keyExtractor={(x: any) => x.request_id}
          contentContainerStyle={{ paddingTop: HEADER_MAX + 12, paddingBottom: 24 }}
          onScroll={isWeb ? undefined : headerApi.onListScroll}
          scrollEventThrottle={isWeb ? undefined : 16}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={() => (
            <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
              <View style={s.sectionBox}>
                <Text style={s.sectionBoxTitle}>Р РђРЎРҐРћР” РџРћ Р—РђРЇР’РљРђРњ (REQ)</Text>
                <Text style={{ color: UI.sub, fontWeight: "800" }}>
                  Р’С‹РґР°С‡Р° РґРѕСЃС‚СѓРїРЅР° С‚РѕР»СЊРєРѕ РїРѕ СѓС‚РІРµСЂР¶РґС‘РЅРЅС‹Рј СЃС‚СЂРѕРєР°Рј Рё С‚РѕР»СЊРєРѕ РµСЃР»Рё РµСЃС‚СЊ РѕСЃС‚Р°С‚РѕРє РЅР° СЃРєР»Р°РґРµ.
                </Text>

                <View style={{ marginTop: 10 }}>
                  <Text style={{ color: UI.sub, fontWeight: "800", marginBottom: 6 }}>
                    РџРѕР»СѓС‡Р°С‚РµР»СЊ
                  </Text>

                  <TextInput
                    value={rec.recipientText}
                    onChangeText={(t) => {
                      rec.setRecipientText(t);
                      rec.setRecipientSuggestOpen(true);
                    }}
                    placeholder="Р’РІРµРґРёС‚Рµ Р¤РРћ РїРѕР»СѓС‡Р°С‚РµР»СЏвЂ¦"
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

          renderItem={({ item }: { item: any }) => {
            const status = String(item.issue_status ?? "").trim().toUpperCase();
            const totalPos = Math.max(0, Number(item.items_cnt ?? 0));
            const openPos = Math.max(0, Number(item.ready_cnt ?? 0));
            const issuedPos = Math.max(0, Number(item.done_cnt ?? 0));
            const badge =
              status === "WAITING_STOCK" ? "РћР¶РёРґР°РµС‚ РїСЂРёС…РѕРґ"
                : status === "PARTIAL" ? "Р§Р°СЃС‚РёС‡РЅРѕ"
                  : status === "DONE" ? "Р—Р°РєСЂС‹С‚Р°"
                    : "РњРѕР¶РЅРѕ РІС‹РґР°РІР°С‚СЊ";

            return (
              <View style={{ marginBottom: 12, paddingHorizontal: 16 }}>
                <Pressable
                  onPress={() => openReq(item)}
                  style={({ pressed }) => [s.groupHeader, pressed && { opacity: 0.9 }]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.groupTitle} numberOfLines={1}>
                      {item.display_no || `REQ-${item.request_id.slice(0, 8)}`}
                    </Text>
                    <Text style={s.cardMeta} numberOfLines={2}>
                      {(item.level_name || item.level_code) ? `Р­С‚Р°Р¶: ${item.level_name || item.level_code}` : ""}
                      {(item.system_name || item.system_code) ? ` В· РЎРёСЃС‚РµРјР°: ${item.system_name || item.system_code}` : ""}
                      {(item.zone_name || item.zone_code) ? ` В· Р—РѕРЅР°: ${item.zone_name || item.zone_code}` : ""}

                    </Text>
                  </View>

                  <View style={s.rightStack}>
                    <View style={s.metaPill}>
                      <Text style={s.metaPillText}>{badge}</Text>
                    </View>

                    <View style={s.metaPill}>
                      <Text style={s.metaPillText}>{`Рљ РІС‹РґР°С‡Рµ ${openPos}`}</Text>
                    </View>

                    <View style={s.metaPill}>
                      <Text style={s.metaPillText}>{`Р’С‹РґР°РЅРѕ ${issuedPos}`}</Text>
                    </View>

                    <View style={s.metaPill}>
                      <Text style={s.metaPillText}>{`Р’СЃРµРіРѕ ${totalPos}`}</Text>
                    </View>
                  </View>
                </Pressable>
              </View>
            );
          }}
          ListEmptyComponent={
            reqHeadsLoading ? (
              <Text style={{ color: UI.sub, paddingHorizontal: 16, fontWeight: "800" }}>
                Р—Р°РіСЂСѓР·РєР°вЂ¦
              </Text>
            ) : (
              <Text style={{ color: UI.sub, paddingHorizontal: 16, fontWeight: "800" }}>
                РќРµС‚ Р·Р°СЏРІРѕРє РґР»СЏ РІС‹РґР°С‡Рё.
                {"\n"}РџРѕС‚СЏРЅРё РІРЅРёР·, С‡С‚РѕР±С‹ РѕР±РЅРѕРІРёС‚СЊ.
              </Text>
            )
          }

        />
      </View>
    );
  };
  const renderTab = () => {
    if (tab === "Рљ РїСЂРёС…РѕРґСѓ") {
      return (
        <View style={{ flex: 1 }}>
          <AnimatedFlatList
            data={incoming.toReceive as any[]}
            keyExtractor={(i: any) => i.incoming_id}
            contentContainerStyle={{ paddingTop: HEADER_MAX + 12, paddingBottom: 24 }}
            onScroll={isWeb ? undefined : headerApi.onListScroll}
            scrollEventThrottle={isWeb ? undefined : 16}
            renderItem={({ item }: { item: any }) => {
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
                          : "вЂ”"}
                        {item.purchase_status ? ` В· ${item.purchase_status}` : ""}
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

                      const statusLabel = isPartial ? "Р§Р°СЃС‚РёС‡РЅРѕ" : "РћР¶РёРґР°РµС‚";

                      return (
                        <View style={s.rightStack}>
                          {/* СЃС‚Р°С‚СѓСЃ */}
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
                                <Text style={s.metaPillText}>{`РџСЂРёРЅСЏС‚Рѕ ${Math.round(rec)} / РћСЃС‚Р°Р»РѕСЃСЊ ${Math.round(left)}`}</Text>
                              </View>
                            );
                          })()}


                          {/* РѕСЃС‚Р°С‚РѕРє РїРѕ РєРѕР»РёС‡РµСЃС‚РІСѓ */}
                          <View style={s.metaPill}>
                            <Text style={s.metaPillText}>{`РћСЃС‚Р°С‚РѕРє ${Math.round(totalLeft)}`}</Text>
                          </View>

                          <Pressable onPress={() => void openItemsModal(item)} style={s.openBtn}>
                            <Text style={s.openBtnText}>РћС‚РєСЂС‹С‚СЊ</Text>
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
                РќРµС‚ Р·Р°РїРёСЃРµР№ РІ РѕС‡РµСЂРµРґРё СЃРєР»Р°РґР°.
              </Text>
            }
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        </View>
      );
    }

    if (tab === "РЎРєР»Р°Рґ С„Р°РєС‚") {
      if (stockSupported === false) {
        return (
          <View style={{ padding: 12 }}>
            <Text style={{ color: "#475569" }}>
              Р Р°Р·РґРµР» В«РЎРєР»Р°Рґ С„Р°РєС‚В» С‚СЂРµР±СѓРµС‚ РІСЊСЋ{" "}
              <Text style={{ fontWeight: "700" }}>v_warehouse_fact</Text> РёР»Рё
              RPC СЃ С„Р°РєС‚РёС‡РµСЃРєРёРјРё РѕСЃС‚Р°С‚РєР°РјРё.
            </Text>
          </View>
        );
      }

      return (
        <AnimatedFlatList
          data={stockFiltered as any[]}
          keyExtractor={(i: any) => i.material_id}
          contentContainerStyle={{ paddingTop: HEADER_MAX + 12, paddingBottom: 24 }}
          onScroll={isWeb ? undefined : headerApi.onListScroll}
          scrollEventThrottle={isWeb ? undefined : 16}
          renderItem={({ item }: { item: any }) => {
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
              РџРѕРєР° РЅРµС‚ РґР°РЅРЅС‹С… РїРѕ СЃРєР»Р°РґСѓ.
            </Text>
          }
        />
      );

    }

    if (tab === "Р Р°СЃС…РѕРґ") return renderReqIssue();
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
            <Text style={{ marginTop: 8, color: UI.sub }}>Р—Р°РіСЂСѓР·РєР°вЂ¦</Text>
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
        title="РџРѕР·РёС†РёРё РїСЂРёС…РѕРґР°"
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
        title={`Р’С‹РґР°С‡Р° РїРѕ Р·Р°СЏРІРєРµ ${reqModal?.display_no || "вЂ”"}`}
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
            ? "Р’С‹Р±РѕСЂ РѕР±СЉРµРєС‚Р°"
            : pickModal.what === "level"
              ? "Р’С‹Р±РѕСЂ СЌС‚Р°Р¶Р°/СѓСЂРѕРІРЅСЏ"
              : pickModal.what === "system"
                ? "Р’С‹Р±РѕСЂ СЃРёСЃС‚РµРјС‹/РІРёРґР° СЂР°Р±РѕС‚"
                : pickModal.what === "zone"
                  ? "Р’С‹Р±РѕСЂ Р·РѕРЅС‹/СѓС‡Р°СЃС‚РєР°"
                  : "Р’С‹Р±РѕСЂ РїРѕР»СѓС‡Р°С‚РµР»СЏ"
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




