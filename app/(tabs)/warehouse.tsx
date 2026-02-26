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
import AsyncStorage from "@react-native-async-storage/async-storage";


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
  apiFetchIncomingReports,
  apiFetchIncomingLines,
} from "../../src/screens/warehouse/warehouse.api";



import { useGlobalBusy } from "../../src/ui/GlobalBusy";
import { runPdfTop } from "../../src/lib/pdfRunner";
import {
  buildWarehouseIncomingFormHtml,
  exportWarehouseHtmlPdf,
} from "../../src/lib/api/pdf_warehouse";
import { seedEnsureIncomingItems } from "../../src/screens/warehouse/warehouse.seed";
import TopRightActionBar from "../../src/ui/TopRightActionBar";
import { showToast } from "../../src/ui/toast";

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
  normMatCode,
} from "../../src/screens/warehouse/warehouse.utils";


const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

function SafeView({ children, ...rest }: any) {
  const kids = React.Children.toArray(children).map((c, i) => {
    if (typeof c === "string") return c.trim() ? <Text key={`t${i} `}>{c}</Text> : null;
    if (typeof c === "number") return <Text key={`n${i} `}>{String(c)}</Text>;
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
  const insets = useSafeAreaInsets();
  const notifyInfo = useCallback((title: string, message?: string) => {
    showToast.info(title, message);
  }, []);
  const notifyError = useCallback((title: string, message?: string) => {
    showToast.error(title, message);
  }, []);
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
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
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
  const [stockHasMore, setStockHasMore] = useState(true);
  const stockFetchMutex = useRef(false);

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

  const [issueLinesById, setIssueLinesById] = useState<Record<string, any[]>>({});
  const [issueLinesLoadingId, setIssueLinesLoadingId] = useState<number | null>(null);
  const [issueDetailsId, setIssueDetailsId] = useState<number | null>(null);

  const [incomingLinesById, setIncomingLinesById] = useState<Record<string, any[]>>({});
  const [incomingLinesLoadingId, setIncomingLinesLoadingId] = useState<string | null>(null);
  const [incomingDetailsId, setIncomingDetailsId] = useState<string | null>(null);
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

    incomingLinesById,
    setIncomingLinesById,
    incomingLinesLoadingId,
    setIncomingLinesLoadingId,
    incomingDetailsId,
    setIncomingDetailsId,

    nameByCode: matNameByCode,
    repIncoming,
  });

  const onPdfDocument = useCallback(
    async (docId: string | number) => {
      const pid = String(docId ?? "").trim();
      if (!pid) {
        notifyError("PDF", "РќРµРєРѕСЂСЂРµРєС‚РЅС‹Р№ РЅРѕРјРµСЂ РїСЂРёС…РѕРґР°.");
        return;
      }

      if (reportsMode === "incoming") {
        await runPdfTop({
          busy,
          supabase,
          key: `pdf: warehouse: incoming - form:${pid}`,
          label: "Р“РѕС‚РѕРІР»СЋ РїСЂРёС…РѕРґРЅС‹Р№ РѕСЂРґРµСЂ...",
          mode: Platform.OS === "web" ? "preview" : "share",
          fileName: `Incoming_${pid}`,
          getRemoteUrl: async () => {
            const t0 = Date.now();
            console.info(`INCOMING_PDF_START pr_id=${pid}`);
            let source: "main" | "fallback" = "main";
            try {
              const head = (repIncoming || []).find(
                (x) =>
                  String(x.incoming_id || "") === pid ||
                  String(x.id || "") === pid
              );

              const who = String(
                head?.who ?? head?.warehouseman_fio ?? warehousemanFio ?? ""
              ).trim() || "вЂ”";

              let lines = await apiFetchIncomingLines(supabase as any, pid);
              if (!Array.isArray(lines) || lines.length === 0) {
                source = "fallback";
                const fallbackLines = await (reportsUi as any).ensureIncomingLines?.(pid);
                if (Array.isArray(fallbackLines)) lines = fallbackLines;
              }

              if (!Array.isArray(lines) || lines.length === 0) {
                const err = new Error("РќРµС‚ РѕРїСЂРёС…РѕРґРѕРІР°РЅРЅС‹С… РїРѕР·РёС†РёР№");
                (err as any).reason = "empty";
                throw err;
              }

              const isDashLike = (v: string) => /^[-\u2014\u2013\u2212]+$/.test(v);
              const linesForPdf = (lines || []).map((ln: any) => {
                const code = String(ln?.code ?? "").trim().toUpperCase();
                const mapped = String((matNameByCode as any)?.[code] ?? "").trim();
                const raw = String(
                  ln?.name_ru ?? ln?.material_name ?? ln?.name ?? ""
                ).trim();
                const goodMapped = mapped && !isDashLike(mapped);
                const goodRaw = raw && !isDashLike(raw);
                return {
                  ...ln,
                  material_name: goodMapped ? mapped : (goodRaw ? raw : code),
                };
              });

              const incomingHead =
                head ??
                ({
                  incoming_id: pid,
                  event_dt: null,
                  display_no: `PR-${pid.slice(0, 8)}`,
                  warehouseman_fio: who,
                  who,
                } as any);

              const html = buildWarehouseIncomingFormHtml({
                incoming: incomingHead,
                lines: linesForPdf,
                orgName: ORG_NAME || "РћРћРћ В«Р РРљВ»",
                warehouseName: "Р“Р»Р°РІРЅС‹Р№ СЃРєР»Р°Рґ",
              });

              const url = await exportWarehouseHtmlPdf({
                fileName: `Incoming_${pid}`,
                html,
              });

              console.info(
                `INCOMING_PDF_OK pr_id=${pid} ms=${Date.now() - t0} source=${source}`
              );
              return url;
            } catch (e: any) {
              const msg = String(e?.message ?? "").toLowerCase();
              const reason =
                String(e?.reason ?? "").trim() ||
                (msg.includes("timeout") ? "timeout" : "build_error");
              console.error(`INCOMING_PDF_FAIL pr_id=${pid} reason=${reason}`, e);
              throw e;
            }
          },
        });
        return;
      }

      await runPdfTop({
        busy,
        supabase,
        key: `pdf: warehouse: issue - form:${docId}`,
        label: "Р“РѕС‚РѕРІР»СЋ РЅР°РєР»Р°РґРЅСѓСЋ...",
        mode: Platform.OS === "web" ? "preview" : "share",
        fileName: `Issue_${docId}`,
        getRemoteUrl: async () => await reportsUi.buildIssueHtml(Number(docId)),
      });
    },
    [busy, supabase, reportsUi, reportsMode, repIncoming, warehousemanFio, notifyError, matNameByCode],
  );

  const onPdfRegister = useCallback(async () => {
    const isIncoming = reportsMode === "incoming";
    await runPdfTop({
      busy,
      supabase,
      key: `pdf: warehouse: ${isIncoming ? "incoming" : "issues"} - register:${periodFrom || "all"}:${periodTo || "all"} `,
      label: "Р“РѕС‚РѕРІР»СЋ СЂРµРµСЃС‚СЂвЂ¦",
      mode: Platform.OS === "web" ? "preview" : "share",
      fileName: `WH_${isIncoming ? "Incoming" : "Issues"}_Register_${periodFrom || "all"}_${periodTo || "all"} `,
      getRemoteUrl: async () => isIncoming ? await reportsUi.buildIncomingRegisterHtml() : await reportsUi.buildRegisterHtml(),
    });
  }, [busy, supabase, periodFrom, periodTo, reportsUi, reportsMode]);

  const onPdfMaterials = useCallback(async () => {
    let w: any = null;
    const isIncoming = reportsMode === "incoming";

    if (Platform.OS === "web") {
      w = window.open("", "_blank");
      try {
        if (w?.document) {
          w.document.title = isIncoming ? "РЎРІРѕРґ РїСЂРёС…РѕРґР° РјР°С‚РµСЂРёР°Р»РѕРІ" : "РЎРІРѕРґ РѕС‚РїСѓСЃРєР° РјР°С‚РµСЂРёР°Р»РѕРІ";
          w.document.body.style.margin = "0";
          w.document.body.innerHTML = `
            <div style="font-family:system-ui,Segoe UI,Roboto,Arial;padding:18px">
              <h3 style="margin:0 0 8px 0">${isIncoming ? "РЎРІРѕРґ РїСЂРёС…РѕРґР° РјР°С‚РµСЂРёР°Р»РѕРІ" : "РЎРІРѕРґ РѕС‚РїСѓСЃРєР° РјР°С‚РµСЂРёР°Р»РѕРІ"}</h3>
              <div style="color:#64748b">Р¤РѕСЂРјРёСЂСѓСЋ PDFвЂ¦</div>
            </div>`;
        }
      } catch (e) { console.warn(e); }
    }

    try {
      const url = await busy.run(
        async () => isIncoming
          ? await (reportsUi as any).buildIncomingMaterialsReportPdf()
          : await reportsUi.buildMaterialsReportPdf(),
        { label: "Р“РѕС‚РѕРІР»СЋ СЃРІРѕРґ РјР°С‚РµСЂРёР°Р»РѕРІвЂ¦" } as any
      );
      if (!url) throw new Error("РќРµ СѓРґР°Р»РѕСЃСЊ СЃС„РѕСЂРјРёСЂРѕРІР°С‚СЊ PDF");
      if (Platform.OS === "web") {
        if (w) w.location.href = url;
        else window.open(url, "_blank");
        return;
      }

      await runPdfTop({
        busy,
        supabase,
        key: `pdf: warehouse: materials:${isIncoming ? "incoming" : "issues"}:${periodFrom || "all"}:${periodTo || "all"} `,
        label: "РћС‚РєСЂС‹РІР°СЋ PDFвЂ¦",
        mode: "share",
        fileName: `WH_${isIncoming ? "Incoming" : "Issued"}_Materials_${periodFrom || "all"}_${periodTo || "all"} `,
        getRemoteUrl: async () => url,
      });
    } catch (e) {
      try { if (w) w.close(); } catch (e2) { console.warn(e2); }
      showErr(e);
    }
  }, [busy, supabase, periodFrom, periodTo, reportsUi, reportsMode]);

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
      if (!url) throw new Error("РќРµ СѓРґР°Р»РѕСЃСЊ СЃС„РѕСЂРјРёСЂРѕРІР°С‚СЊ PDF");
      if (Platform.OS === "web") {
        if (w) w.location.href = url;
        else window.open(url, "_blank");
        return;
      }

      await runPdfTop({
        busy,
        supabase,
        key: `pdf: warehouse: objwork:${periodFrom || "all"}:${periodTo || "all"} `,
        label: "РћС‚РєСЂС‹РІР°СЋ PDFвЂ¦",
        mode: "share",
        fileName: `WH_ObjectWork_${periodFrom || "all"}_${periodTo || "all"} `,
        getRemoteUrl: async () => url,
      });
    } catch (e) {
      try { if (w) w.close(); } catch (e) { console.warn(e); }
      showErr(e);
    }
  }, [busy, supabase, periodFrom, periodTo, reportsUi]);

  const onPdfDayRegister = useCallback(async (dayLabel: string) => {
    const isIncoming = reportsMode === "incoming";
    await runPdfTop({
      busy,
      supabase,
      key: `pdf: warehouse: day - register:${isIncoming ? "incoming" : "issues"}:${dayLabel} `,
      label: "Р“РѕС‚РѕРІР»СЋ СЂРµРµСЃС‚СЂ Р·Р° РґРµРЅСЊвЂ¦",
      mode: Platform.OS === "web" ? "preview" : "share",
      fileName: `WH_${isIncoming ? "Incoming" : "Register"}_${String(dayLabel).trim().replace(/\s+/g, "_")} `,
      getRemoteUrl: async () => isIncoming
        ? await (reportsUi as any).buildDayIncomingRegisterPdf(dayLabel)
        : await (reportsUi as any).buildDayRegisterPdf(dayLabel),
    });
  }, [busy, supabase, reportsUi, reportsMode]);

  const onPdfDayMaterials = useCallback(async (dayLabel: string) => {
    let w: any = null;
    const isIncoming = reportsMode === "incoming";

    if (Platform.OS === "web") {
      w = window.open("", "_blank");
      try {
        if (w?.document) {
          w.document.title = isIncoming ? "РЎРІРѕРґ РїСЂРёС…РѕРґР° Р·Р° РґРµРЅСЊ" : "РЎРІРѕРґ РѕС‚РїСѓСЃРєР° Р·Р° РґРµРЅСЊ";
          w.document.body.style.margin = "0";
          w.document.body.innerHTML = `
            <div style="font-family:system-ui,Segoe UI,Roboto,Arial;padding:18px">
              <h3 style="margin:0 0 8px 0">${isIncoming ? "РЎРІРѕРґ РїСЂРёС…РѕРґР° Р·Р° РґРµРЅСЊ" : "РЎРІРѕРґ РѕС‚РїСѓСЃРєР° Р·Р° РґРµРЅСЊ"}</h3>
              <div style="color:#64748b">Р¤РѕСЂРјРёСЂСѓСЋ PDFвЂ¦</div>
            </div>`;
        }
      } catch (e) { console.warn(e); }
    }

    try {
      const url = await busy.run(
        async () => isIncoming
          ? await (reportsUi as any).buildDayIncomingMaterialsReportPdf(dayLabel)
          : await (reportsUi as any).buildDayMaterialsReportPdf(dayLabel),
        { label: "Р“РѕС‚РѕРІР»СЋ СЃРІРѕРґ РјР°С‚РµСЂРёР°Р»РѕРІ Р·Р° РґРµРЅСЊвЂ¦" } as any
      );

      if (!url) throw new Error("РќРµ СѓРґР°Р»РѕСЃСЊ СЃС„РѕСЂРјРёСЂРѕРІР°С‚СЊ PDF");

      if (Platform.OS === "web") {
        if (w) w.location.href = url;
        else window.open(url, "_blank");
        return;
      }

      await runPdfTop({
        busy,
        supabase,
        key: `pdf: warehouse: day - materials:${isIncoming ? "incoming" : "issues"}:${dayLabel} `,
        label: "Р“РѕС‚РѕРІР»СЋ СЃРІРѕРґ РјР°С‚РµСЂРёР°Р»РѕРІ Р·Р° РґРµРЅСЊвЂ¦",
        mode: "share",
        fileName: `WH_${isIncoming ? "Incoming" : "Issued"}_DayMaterials_${String(dayLabel).trim().replace(/\s+/g, "_")} `,
        getRemoteUrl: async () => url,
      });
    } catch (e) {
      try { if (w) w.close(); } catch (e2) { console.warn(e2); }
      showErr(e);
    }
  }, [busy, supabase, reportsUi, reportsMode]);
  const [repPeriodOpen, setRepPeriodOpen] = useState(false);

  const fetchStock = useCallback(async () => {
    if (stockFetchMutex.current) return;

    stockFetchMutex.current = true;
    try {
      const r = await apiFetchStock(supabase as any, 0, 2000);

      const newRows = r.rows || [];

      setStock(newRows);
      setStockCount(newRows.length);
      setStockHasMore(false);
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

  const fetchReports = useCallback(async () => {
    const [r, inc] = await Promise.all([
      apiFetchReports(supabase as any, periodFrom, periodTo),
      apiFetchIncomingReports(supabase as any, { from: periodFrom, to: periodTo }),
    ]);
    setReportsSupported(r.supported);
    setRepStock(r.repStock as any);
    setRepMov(r.repMov as any);
    setRepIssues(r.repIssues as any);
    setRepIncoming(inc);
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
    if (lvl) parts.push(`Р­С‚Р°Р¶: ${lvl} `);
    if (sys) parts.push(`РЎРёСЃС‚РµРјР°: ${sys} `);
    if (zn) parts.push(`Р—РѕРЅР°: ${zn} `);

    return parts.join(" Р’В· ");
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
    getAvailableByCode: (code: string) => {
      const key = normMatCode(code);
      if (!key) return 0;
      let sum = 0;
      for (const row of stock) {
        const rowKey = normMatCode(
          String((row as any).rik_code ?? (row as any).code ?? (row as any).material_code ?? ""),
        );
        if (rowKey !== key) continue;
        sum += nz((row as any).qty_available, 0);
      }
      return sum;
    },
    getAvailableByCodeUom: (code: string, uomId: string | null) => {
      const key = normMatCode(code);
      const u = String(uomId ?? "").trim().toLowerCase();
      if (!key) return 0;
      let sum = 0;
      for (const row of stock) {
        const rowKey = normMatCode(
          String((row as any).rik_code ?? (row as any).code ?? (row as any).material_code ?? ""),
        );
        if (rowKey !== key) continue;
        const rowU = String((row as any).uom_id ?? "").trim().toLowerCase();
        if (u && rowU !== u) continue;
        sum += nz((row as any).qty_available, 0);
      }
      return sum;
    },
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
      getAvailableByCode: (code: string) => {
        const key = normMatCode(code);
        if (!key) return 0;
        let sum = 0;
        for (const row of stock) {
          const rowKey = normMatCode(
            String((row as any).rik_code ?? (row as any).code ?? (row as any).material_code ?? ""),
          );
          if (rowKey !== key) continue;
          sum += nz((row as any).qty_available, 0);
        }
        return sum;
      },
      getAvailableByCodeUom: (code: string, uomId: string | null) => {
        const key = normMatCode(code);
        const u = String(uomId ?? "").trim().toLowerCase();
        if (!key) return 0;
        let sum = 0;
        for (const row of stock) {
          const rowKey = normMatCode(
            String((row as any).rik_code ?? (row as any).code ?? (row as any).material_code ?? ""),
          );
          if (rowKey !== key) continue;
          const rowU = String((row as any).uom_id ?? "").trim().toLowerCase();
          if (u && rowU !== u) continue;
          sum += nz((row as any).qty_available, 0);
        }
        return sum;
      },
      getMaterialNameByCode: (code: string) => {
        const key = normMatCode(code).toUpperCase();
        if (!key) return null;
        return matNameByCode[key] || null;
      },

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
        console.log(`[${table}]error: `, res.error?.message);
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


  const dictsLoadedRef = useRef(false);

  useEffect(() => {
    if ((tab === "Р Р°СЃС…РѕРґ" || tab === "РЎРєР»Р°Рґ С„Р°РєС‚") && !dictsLoadedRef.current) {
      dictsLoadedRef.current = true;
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
        notifyInfo("Р“РѕС‚РѕРІРѕ", "РџРѕСЃС‚Р°РІРєР° РїСЂРёРЅСЏС‚Р° РЅР° СЃРєР»Р°Рґ.");
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
          return notifyError("РќРµС‚ РїРѕР·РёС†РёРё", "РќРµРёР·РІРµСЃС‚РЅС‹Р№ ID РїРѕР·РёС†РёРё РїСЂРёС…РѕРґР°");
        const q = Number(qty);
        if (!Number.isFinite(q) || q <= 0)
          return notifyError("РљРѕР»РёС‡РµСЃС‚РІРѕ", "Р’РІРµРґРёС‚Рµ РїРѕР»РѕР¶РёС‚РµР»СЊРЅРѕРµ РєРѕР»РёС‡РµСЃС‚РІРѕ.");
        const r = await supabase.rpc("wh_receive_item_v2" as any, {
          p_incoming_item_id: incomingItemId,
          p_qty: q,
          p_note: null,
        } as any);
        if (r.error)
          return notifyError("РћС€РёР±РєР° РїСЂРёС…РѕРґР°", pickErr(r.error));

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
          return notifyError(
            "РќРµС‚ РїРѕР·РёС†РёР№",
            "РџРѕРґ СЌС‚РѕР№ РїРѕСЃС‚Р°РІРєРѕР№ РЅРµС‚ СЃС‚СЂРѕРє РґР»СЏ РїСЂРёС…РѕРґР°. Р Р°СЃРєСЂРѕР№ В«РџРѕРєР°Р·Р°С‚СЊ РїРѕР·РёС†РёРёВ» Рё РїСЂРѕРІРµСЂСЊ СЃРѕСЃС‚Р°РІ.",
          );
        }

        const totalLeft = rows.reduce(
          (s, r) => s + Math.max(0, nz(r.qty_expected, 0) - nz(r.qty_received, 0)),
          0,
        );
        if (totalLeft <= 0) {
          return notifyInfo("РќРµС‡РµРіРѕ РїСЂРёС…РѕРґРѕРІР°С‚СЊ", "Р’СЃРµ РїРѕР·РёС†РёРё СѓР¶Рµ РїСЂРёРЅСЏС‚С‹.");
        }

        const pr = await supabase.rpc("wh_receive_confirm" as any, {
          p_wh_id: incomingId,
        } as any);
        if (pr.error) return notifyError("РћС€РёР±РєР° РїРѕР»РЅРѕРіРѕ РїСЂРёС…РѕРґР°", pickErr(pr.error));

        await Promise.all([incoming.fetchToReceive(), fetchStock()]);
        notifyInfo("Р“РѕС‚РѕРІРѕ", "РџРѕСЃС‚Р°РІРєР° РѕРїСЂРёС…РѕРґРѕРІР°РЅР° РїРѕР»РЅРѕСЃС‚СЊСЋ");
      } catch (e) {
        showErr(e);
      }
    },
    [incoming, fetchStock, notifyError, notifyInfo],
  );

  const receiveSelectedForHead = useCallback(
    async (incomingIdRaw: string) => {
      try {
        const incomingId = String(incomingIdRaw ?? "").trim();
        if (!incomingId) return;

        // Р±РµСЂС‘Рј СЃС‚СЂРѕРєРё РўРћР›Р¬РљРћ С‡РµСЂРµР· incoming-С…СѓРє
        const freshRows = await incoming.loadItemsForHead(incomingId, true);

        if (!freshRows.length) {
          return notifyError(
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
          return notifyInfo("РќРµС‡РµРіРѕ РѕРїСЂРёС…РѕРґРѕРІР°С‚СЊ", "Р’РІРµРґРёС‚Рµ РєРѕР»РёС‡РµСЃС‚РІРѕ > 0 РґР»СЏ РЅСѓР¶РЅС‹С… СЃС‚СЂРѕРє.");
        }

        setReceivingHeadId(incomingId);

        if (!warehousemanFio.trim()) {
          setItemsModal(null);
          return notifyError("Р¤РРћ РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ", "Р’РІРµРґРёС‚Рµ Р¤РРћ РєР»Р°РґРѕРІС‰РёРєР° РІРѕ РІРєР»Р°РґРєРµ В«Рљ РїСЂРёС…РѕРґСѓВ»");
        }

        const { data, error } = await supabase.rpc("wh_receive_apply_ui" as any, {
          p_incoming_id: incomingId,
          p_items: toApply,
          p_warehouseman_fio: warehousemanFio.trim(),
          p_note: null,
        } as any);


        if (error) {
          console.warn("[wh_receive_apply_ui] error:", error.message);
          return notifyError("РћС€РёР±РєР° РїСЂРёС…РѕРґР°", pickErr(error));
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

        notifyInfo(
          "Р“РѕС‚РѕРІРѕ",
          `РџСЂРёРЅСЏС‚Рѕ РїРѕР·РёС†РёР№: ${ok}${fail ? `, РѕС€РёР±РѕРє: ${fail}` : ""} \nРћСЃС‚Р°Р»РѕСЃСЊ: ${leftAfter} `,
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
                {`Р”РѕСЃС‚СѓРїРЅРѕ ${fmtQty(available)} ${uomLabel} В· Р РµР·РµСЂРІ ${fmtQty(reserved)} `}
              </Text>

              {isPicked ? (
                <Text style={{ marginTop: 6, color: UI.text, fontWeight: "900" }}>
                  {`Р’С‹Р±СЂР°РЅРѕ: ${fmtQty(Number(pickedQty))} ${uomLabel} `}
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
              {`${dt} В· ${h.code || "вЂ”"} В· ${uomLabelRu(h.uom_id) || "вЂ”"} В· ${qty} `}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const ExpenditureHeader = useMemo(() => {
    return (
      <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
        <View style={s.sectionBox}>
          <View style={{ marginTop: 2 }}>
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
                {rec.recipientSuggestions.map((name: string) => (
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
    );
  }, [rec.recipientText, rec.recipientSuggestOpen, rec.recipientSuggestions, rec.setRecipientText, rec.setRecipientSuggestOpen, rec.commitRecipient]);

  const renderReqIssue = () => {
    return (
      <View style={{ flex: 1 }}>
        <AnimatedFlatList
          data={sortedReqHeads as any[]}
          keyExtractor={(x: any) => x.request_id}
          contentContainerStyle={{ paddingTop: HEADER_MAX + 12, paddingBottom: 24 }}
          onScroll={isWeb ? undefined : headerApi.onListScroll}
          scrollEventThrottle={isWeb ? undefined : 16}
          onEndReached={() => {
            if (reqRefs.current.hasMore && !reqRefs.current.fetching) {
              fetchReqHeads(reqRefs.current.page + 1);
            }
          }}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListFooterComponent={() => (
            reqHeadsFetchingPage ? (
              <View style={{ padding: 20, alignItems: "center" }}>
                <ActivityIndicator color={UI.sub} />
              </View>
            ) : null
          )}
          ListHeaderComponent={ExpenditureHeader}

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

            const dateStr = item.submitted_at ? new Date(item.submitted_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

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
                        <Text style={{ color: "#22c55e", fontWeight: "900", fontSize: 13 }}>Р’С‹РґР°РЅРѕ РїРѕР»РЅРѕСЃС‚СЊСЋ</Text>
                      ) : (
                        <Text style={{ color: UI.sub, fontSize: 13, fontWeight: "700" }}>
                          Рљ РІС‹РґР°С‡Рµ: <Text style={{ color: hasToIssue ? "#22c55e" : UI.text, fontWeight: "900" }}>{hasToIssue ? `${openPos} ${openPos === 1 ? 'РїРѕР·РёС†РёСЏ' : (openPos > 1 && openPos < 5) ? 'РїРѕР·РёС†РёРё' : 'РїРѕР·РёС†РёР№'}` : "0"}</Text>
                          {" вЂў "}
                          Р’С‹РґР°РЅРѕ: <Text style={{ color: issuedPos > 0 ? "#22c55e" : UI.text, fontWeight: "800" }}>{issuedPos}</Text>
                        </Text>
                      )}
                    </View>

                    {/* 3 row: CONTEXT */}
                    {locParts.length > 0 && (
                      <Text style={{ color: UI.sub, fontSize: 12, fontWeight: "600", lineHeight: 16 }}>
                        {locParts.join(" вЂў ")}
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
                Р—Р°РіСЂСѓР·РєР°...
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
            ListHeaderComponent={
              <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                <View style={s.sectionBox}>
                  <Text style={{ color: UI.sub, fontWeight: "800", marginBottom: 6 }}>
                    Р¤РРћ РєР»Р°РґРѕРІС‰РёРєР° (РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)
                  </Text>
                  <TextInput
                    value={warehousemanFio}
                    onChangeText={(t) => {
                      setWarehousemanFio(t);
                      void AsyncStorage.setItem("wh_warehouseman_fio", t);
                    }}
                    placeholder="Р’РІРµРґРёС‚Рµ Р¤РРћвЂ¦"
                    placeholderTextColor={UI.sub}
                    style={s.input}
                  />
                </View>
              </View>
            }
            onEndReached={() => {

              if (incoming.toReceiveHasMore && !incoming.toReceiveIsFetching) {
                incoming.fetchToReceive(incoming.toReceivePage + 1);
              }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              incoming.toReceiveIsFetching ? (
                <View style={{ padding: 20, alignItems: "center" }}>
                  <ActivityIndicator color={UI.sub} />
                </View>
              ) : null
            }
            renderItem={({ item }: { item: any }) => {
              const recSum = Math.round(nz(item.qty_received_sum, 0));
              const leftSum = Math.round(nz(item.qty_expected_sum, 0) - nz(item.qty_received_sum, 0));

              const prNo = formatProposalBaseNo(
                incoming.proposalNoByPurchase[item.purchase_id] || item.po_no,
                item.purchase_id
              );

              const dateStr = item.purchase_created_at
                ? new Date(item.purchase_created_at).toLocaleDateString("ru-RU", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric"
                })
                : "вЂ”";

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
                          РџСЂРёРЅСЏС‚Рѕ {recSum}
                        </Text>
                        <Text style={{ color: "#ef4444", fontSize: 14, fontWeight: "900" }}>
                          РћСЃС‚Р°Р»РѕСЃСЊ {leftSum}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
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
            const pickedQty = stockPickUi.getPickedQty(codeRaw, item?.uom_id ? String(item.uom_id).trim() : null);
            return <StockRowView r={item} pickedQty={pickedQty} />;
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
        mode={reportsMode}
        onBack={() => setReportsMode("choice")}
        onSelectMode={(m) => setReportsMode(m)}
        onScroll={Platform.OS === "web" ? undefined : headerApi.onListScroll}
        scrollEventThrottle={Platform.OS === "web" ? undefined : 16}
        periodFrom={periodFrom}
        periodTo={periodTo}
        repStock={repStock}
        repMov={repMov}
        reportsUi={{
          ...reportsUi,
          issuesByDay: reportsMode === "incoming" ? (reportsUi as any).incomingByDay : (reportsUi as any).vydachaByDay
        }}
        onOpenPeriod={() => setRepPeriodOpen(true)}
        onRefresh={() => void fetchReports()}
        onPdfRegister={() => {
          if (reportsMode === "incoming") {
            void runPdfTop({
              busy,
              supabase,
              key: `pdf: warehouse: incoming - register:${periodFrom || "all"}:${periodTo || "all"}`,
              label: "Р“РѕС‚РѕРІР»СЋ СЂРµРµСЃС‚СЂ РїСЂРёС…РѕРґР°вЂ¦",
              mode: Platform.OS === "web" ? "preview" : "share",
              fileName: `Warehouse_Incoming_${periodFrom || "all"}_${periodTo || "all"}`,
              getRemoteUrl: async () => await (reportsUi as any).buildIncomingRegisterHtml(),
            });
          } else {
            void onPdfRegister();
          }
        }}
        onPdfDocument={(id) => void onPdfDocument(id)}
        onPdfMaterials={() => void onPdfMaterials()}
        onPdfObjectWork={() => void onPdfObjectWork()}
        onPdfDayRegister={(day) => {
          if (reportsMode === "incoming") {
            void runPdfTop({
              busy,
              supabase,
              key: `pdf: warehouse: incoming - day - register:${day}`,
              label: "Р“РѕС‚РѕРІР»СЋ СЂРµРµСЃС‚СЂ РїСЂРёС…РѕРґР° Р·Р° РґРµРЅСЊвЂ¦",
              mode: Platform.OS === "web" ? "preview" : "share",
              fileName: `WH_Incoming_Register_${String(day).trim().replace(/\s+/g, "_")}`,
              getRemoteUrl: async () => await (reportsUi as any).buildDayIncomingRegisterPdf(day),
            });
          } else {
            void onPdfDayRegister(day);
          }
        }}
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
            <Text style={{ marginTop: 8, color: UI.sub }}>Р—Р°РіСЂСѓР·РєР°...</Text>
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
      <IncomingDetailsSheet
        visible={incomingDetailsId != null}
        incomingId={incomingDetailsId}
        loadingId={incomingLinesLoadingId}
        linesById={incomingLinesById}
        matNameByCode={matNameByCode}
        onClose={(reportsUi as any).closeIncomingDetails}
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



