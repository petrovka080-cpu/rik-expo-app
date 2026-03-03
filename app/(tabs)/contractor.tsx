// app/(tabs)/contractor.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  Platform,
} from "react-native";
import { useFocusEffect } from 'expo-router';
import { supabase } from "../../src/lib/supabaseClient";
import {
  WorkMaterialsEditor,
  WorkMaterialRow,
} from "../../src/components/WorkMaterialsEditor";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import { useForemanDicts } from "../../src/screens/foreman/useForemanDicts";

const UI = {
  bg: "#F8FAFC",
  text: "#0F172A",
  sub: "#64748B",
  border: "#E2E8F0",
  cardBg: "#FFFFFF",
  accent: "#0EA5E9",
  btnTake: "#16A34A",
};

// DEV toggle: true = если не нашли совпадения по компании/телефону,
// показываем все approved подряды (для разработки/тестирования).
const DEV_SHOW_ALL_SUBCONTRACTS = true;

// ---- TYPES ----
type WorkRow = {
  progress_id: string;
  purchase_item_id?: string | null;
  work_code: string | null;
  work_name: string | null;
  object_name: string | null;
  contractor_org?: string | null;
  contractor_phone?: string | null;
  request_id?: string | null;
  request_status?: string | null;
  contractor_job_id?: string | null;
  uom_id: string | null;
  qty_planned: number;
  qty_done: number;
  qty_left: number;
  work_status: string;
  contractor_id: string | null;
  started_at?: string | null;
  finished_at?: string | null;
};

type WorkLogRow = {
  id: string;
  created_at: string;
  qty: number;
  work_uom: string | null;
  stage_note: string | null;
  note: string | null;
};

type UserProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  company: string | null;
  is_contractor: boolean;
};

type Contractor = {
  id: string;
  company_name: string | null;
  full_name: string | null;
  phone: string | null;
};
type SubcontractLite = {
  id: string;
  status?: string | null;
  object_name?: string | null;
  work_type?: string | null;
  qty_planned?: number | null;
  uom?: string | null;
  contractor_org?: string | null;
  created_at?: string | null;
};

type IssuedItemRow = {
  issue_item_id: string;
  mat_code?: string | null;
  request_id?: string | null;
  title: string;
  unit: string | null;
  qty: number;
  qty_left?: number | null;
  price: number | null;
  sum: number | null;
  qty_fact: number;
};

type ContractorJobHeader = {
  contractor_org: string | null;
  contractor_inn: string | null;
  contractor_rep: string | null;
  contractor_phone: string | null;
  contract_number: string | null;
  contract_date: string | null;
  object_name: string | null;
  work_type?: string | null;
  zone: string | null;
  level_name: string | null;
  qty_planned?: number | null;
  uom?: string | null;
  unit_price: number | null;
  total_price?: number | null;
  date_start: string | null;
  date_end: string | null;
};

type LinkedReqCard = {
  request_id: string;
  req_no: string;
  status: string | null;
  issue_nos: string[];
};

type ActBuilderItem = {
  id: string;
  mat_code: string;
  name: string;
  uom: string;
  issuedQty: number;
  qtyMax: number;
  qty: number;
  price: number | null;
  include: boolean;
  source: "issued" | "ready";
};

type ActBuilderWorkItem = {
  id: string;
  name: string;
  include: boolean;
};

const pickFirstNonEmpty = (...vals: any[]): string | null => {
  for (const v of vals) {
    const s = typeof v === "string" ? v.trim() : String(v ?? "").trim();
    if (s) return s;
  }
  return null;
};

const toLocalDateKey = (value: string | Date | null | undefined): string => {
  if (!value) return "";
  const dt = new Date(value);
  if (!Number.isFinite(dt.getTime())) return "";
  return dt.toLocaleDateString("en-CA", { timeZone: "Asia/Bishkek" });
};

const pickWorkProgressRow = (row: any): string => {
  return String(row?.id || row?.progress_id || "").trim();
};
const looksLikeUuid = (v: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

function isActiveWork(w: WorkRow): boolean {
  const status = (w.work_status || "").toLowerCase();
  const closed = ["окончено", "завершено", "закрыто"];
  const hasLeft = w.qty_left == null ? true : Number(w.qty_left) > 0;
  return hasLeft && !closed.includes(status);
}

const showErr = (e: any) =>
  Alert.alert(
    "Ошибка",
    String(e?.message || e?.error_description || e?.hint || e || "Неизвестная ошибка")
  );

const pickErr = (e: any) =>
  String(e?.message || e?.error_description || e?.hint || e || "Ошибка");

// ===== PDF РїРѕ С„Р°РєС‚Сѓ СЂР°Р±РѕС‚С‹ (Р°РєС‚) (РєР°Рє РЅР° СЃРєР»Р°РґРµ) =====
async function generateWorkPdf(
  work: WorkRow | null,
  materials: WorkMaterialRow[],
  opts?: { actDate?: string | Date; selectedWorks?: string[] }
) {
  if (!work) return;

  try {
    const dt = opts?.actDate ? new Date(opts.actDate) : new Date();
    const dateStr = dt.toLocaleDateString("ru-RU");
    const timeStr = dt.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const objectName = work.object_name || "РћР±СЉРµРєС‚ РЅРµ СѓРєР°Р·Р°РЅ";
    const workName = work.work_name || work.work_code || "Р Р°Р±РѕС‚Р°";
    const selectedWorks = (opts?.selectedWorks || []).filter(Boolean);
    const actNo = work.progress_id.slice(0, 8);

    const workUrl = `https://app.goxbuild.com/work/${work.progress_id}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
      workUrl
    )}`;

    const materialsRowsHtml = materials
      .map(
        (m: any, index) => `
        <tr>
          <td style="border:1px solid #000; padding:4px; text-align:center;">${
            index + 1
          }</td>
          <td style="border:1px solid #000; padding:4px;">${m.name}</td>
          <td style="border:1px solid #000; padding:4px; text-align:center;">${
            m.uom
          }</td>
          <td style="border:1px solid #000; padding:4px; text-align:right;">${
            m.qty_fact ?? 0
          }</td>
          <td style="border:1px solid #000; padding:4px; text-align:right;">${
            m.price == null || Number.isNaN(Number(m.price)) ? "—" : Number(m.price).toLocaleString("ru-RU")
          }</td>
          <td style="border:1px solid #000; padding:4px; text-align:right;">${
            m.price == null || Number.isNaN(Number(m.price))
              ? "—"
              : (Number(m.qty_fact ?? 0) * Number(m.price)).toLocaleString("ru-RU")
          }</td>
          <td style="border:1px solid #000; padding:4px;"></td>
        </tr>
      `
      )
      .join("");

    const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 11px;
          }
          .center { text-align: center; }
          .right  { text-align: right; }
          .bold   { font-weight: bold; }
          table { border-collapse: collapse; width: 100%; }
        </style>
      </head>
      <body>
        <!-- РЁРђРџРљРђ РђРљРўРђ -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
          <div>
            <div class="bold">РђРєС‚ РІС‹РїРѕР»РЅРµРЅРёСЏ СЂР°Р±РѕС‚ в„– ${actNo}</div>
            <div>Р”Р°С‚Р°: ${dateStr} ${timeStr}</div>
          </div>
          <div style="text-align:right; font-size:10px;">
            <div>РџСЂРёР»РѕР¶РµРЅРёРµ Рє РґРѕРіРѕРІРѕСЂСѓ РїРѕРґСЂСЏРґР°</div>
            <div>Р¤РѕСЂРјР° СѓСЃР»РѕРІРЅРѕ РїРѕ РљРЎ-2 / Р“РћРЎРў</div>
          </div>
        </div>

        <div style="margin-bottom:8px;">
          <div><span class="bold">РћР±СЉРµРєС‚:</span> ${objectName}</div>
          <div><span class="bold">Р Р°Р±РѕС‚Р°:</span> ${workName}</div>
        </div>

        <div class="bold" style="margin-top:10px; margin-bottom:4px;">
          Работы по подряду (выбрано)
        </div>
        <div style="margin-bottom:10px;">
          ${
            selectedWorks.length
              ? selectedWorks.map((w) => `<div>• ${w}</div>`).join("")
              : `<div style="color:#666;">Работы не выбраны</div>`
          }
        </div>

        <!-- РЎРІРѕРґРєР° РїРѕ РѕР±СЉС‘РјСѓ -->
        <table style="margin-top:6px; margin-bottom:12px;">
          <tr>
            <td class="bold">РџР»Р°РЅРѕРІС‹Р№ РѕР±СЉС‘Рј:</td>
            <td>${work.qty_planned} ${work.uom_id || ""}</td>
          </tr>
          <tr>
            <td class="bold">Р’С‹РїРѕР»РЅРµРЅРѕ РїРѕ Р°РєС‚Сѓ:</td>
            <td>${work.qty_done} ${work.uom_id || ""}</td>
          </tr>
          <tr>
            <td class="bold">РћСЃС‚Р°С‚РѕРє РїРѕ РїР»Р°РЅСѓ:</td>
            <td>${work.qty_left} ${work.uom_id || ""}</td>
          </tr>
        </table>

        <!-- РўР°Р±Р»РёС†Р° РјР°С‚РµСЂРёР°Р»РѕРІ -->
        <div class="bold" style="margin-top:10px; margin-bottom:4px;">
          РСЃРїРѕР»СЊР·РѕРІР°РЅРЅС‹Рµ РјР°С‚РµСЂРёР°Р»С‹ (РїРѕ С„Р°РєС‚Сѓ)
        </div>
        <table>
          <tr>
            <th style="border:1px solid #000; padding:4px; width:5%;">в„–</th>
            <th style="border:1px solid #000; padding:4px;">РќР°РёРјРµРЅРѕРІР°РЅРёРµ</th>
            <th style="border:1px solid #000; padding:4px; width:10%;">Р•Рґ.</th>
            <th style="border:1px solid #000; padding:4px; width:15%;">РљРѕР»РёС‡РµСЃС‚РІРѕ</th>
            <th style="border:1px solid #000; padding:4px; width:12%;">Цена</th>
            <th style="border:1px solid #000; padding:4px; width:12%;">Сумма</th>
            <th style="border:1px solid #000; padding:4px; width:20%;">РџСЂРёРјРµС‡Р°РЅРёРµ</th>
          </tr>
          ${
            materialsRowsHtml ||
            `
          <tr>
            <td colspan="7" style="border:1px solid #000; padding:4px; text-align:center;">
              РњР°С‚РµСЂРёР°Р»С‹ РїРѕ С„Р°РєС‚Сѓ РЅРµ СѓРєР°Р·Р°РЅС‹
            </td>
          </tr>`
          }
        </table>

        <!-- РџРѕРґРїРёСЃРё -->
        <div style="margin-top:24px;">
          <table style="width:100%;">
            <tr>
              <td style="width:33%; padding:4px;">РџСЂРѕСЂР°Р±</td>
              <td style="width:33%; padding:4px; border-bottom:1px solid #000;">&nbsp;</td>
              <td style="width:34%; padding:4px;">(Р¤РРћ, РїРѕРґРїРёСЃСЊ)</td>
            </tr>
            <tr>
              <td style="padding:4px;">РњР°СЃС‚РµСЂ/Р‘СЂРёРіР°РґРёСЂ</td>
              <td style="padding:4px; border-bottom:1px solid #000;">&nbsp;</td>
              <td style="padding:4px;">(Р¤РРћ, РїРѕРґРїРёСЃСЊ)</td>
            </tr>
            <tr>
              <td style="padding:4px;">РџСЂРµРґСЃС‚Р°РІРёС‚РµР»СЊ Р·Р°РєР°Р·С‡РёРєР°</td>
              <td style="padding:4px; border-bottom:1px solid #000;">&nbsp;</td>
              <td style="padding:4px;">(Р¤РРћ, РїРѕРґРїРёСЃСЊ)</td>
            </tr>
          </table>
        </div>

        <!-- QR-РєРѕРґ Рё СЃР»СѓР¶РµР±РЅР°СЏ РёРЅС„Р° -->
        <div style="margin-top:16px; display:flex; justify-content:space-between; align-items:flex-end;">
          <div style="font-size:9px; color:#555;">
            РЎС„РѕСЂРјРёСЂРѕРІР°РЅРѕ РІ СЃРёСЃС‚РµРјРµ GOX BUILD<br/>
            ID СЂР°Р±РѕС‚С‹: ${work.progress_id}
          </div>
          <div style="text-align:right;">
            <div style="font-size:9px; margin-bottom:4px;">QR РґР»СЏ РїСЂРѕРІРµСЂРєРё Р°РєС‚Р°</div>
            <img src="${qrUrl}" alt="QR" />
          </div>
        </div>
      </body>
    </html>
    `;

    const fileName = `work-${work.progress_id}-${Date.now()}.pdf`;
    const uploadToStorage = async (uri: string) => {
      try {
        const bucket = "work-pdfs";
        const resp = await fetch(uri);
        const blob = await resp.blob();
        const uploadRes = await supabase.storage
          .from(bucket)
          .upload(fileName, blob, {
            contentType: "application/pdf",
            upsert: true,
          });
        if (uploadRes.error) {
          console.warn("[generateWorkPdf] upload error:", uploadRes.error.message);
        } else {
          console.log("[generateWorkPdf] uploaded to storage:", uploadRes.data.path);
        }
      } catch (e) {
        console.warn("[generateWorkPdf] storage error", e);
      }
    };

    // Try to create a real PDF file first (web + native).
    let pdfUri = "";
    try {
      const fileRes = await Print.printToFileAsync({ html });
      pdfUri = String(fileRes?.uri || "").trim();
    } catch (e) {
      console.warn("[generateWorkPdf] printToFileAsync failed:", e);
    }

    if (!pdfUri) {
      Alert.alert("PDF", "Не удалось сформировать PDF-файл. Повтори попытку.");
      return;
    }

    if (Platform.OS === "web") {
      try {
        const link = document.createElement("a");
        link.href = pdfUri;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {
        console.warn("[generateWorkPdf] web download failed:", e);
      }
      await uploadToStorage(pdfUri);
      return;
    }

    // Native flow: only share/open generated file, never print page/screen.
    try {
      await Sharing.shareAsync(pdfUri);
    } catch (e) {
      console.warn("[generateWorkPdf] shareAsync error", e);
    }
    await uploadToStorage(pdfUri);
  } catch (e: any) {
    console.warn("[generateWorkPdf] general error", e);
    Alert.alert("РћС€РёР±РєР° PDF", String(e?.message || e));
  }
}

// ===== РЎРІРѕРґ РїРѕ СЂР°Р±РѕС‚Рµ: РІСЃРµ Р°РєС‚С‹ + РјР°С‚РµСЂРёР°Р»С‹ (РєР°Рє РЅР° СЃРєР»Р°РґРµ) =====
async function loadAggregatedWorkSummary(
  progressId: string,
  baseWork: WorkRow
): Promise<{ work: WorkRow; materials: WorkMaterialRow[] }> {
  const logsQ = await supabase
    .from("work_progress_log" as any)
    .select("id, qty")
    .eq("progress_id", progressId);

  if (logsQ.error || !Array.isArray(logsQ.data) || logsQ.data.length === 0) {
    return { work: baseWork, materials: [] };
  }

  const logIds = (logsQ.data as any[]).map((l) => String(l.id));
  const totalQty = (logsQ.data as any[]).reduce(
    (sum, l) => sum + Number(l.qty ?? 0),
    0
  );

  const matsQ = await supabase
    .from("work_progress_log_materials" as any)
    .select("log_id, mat_code, uom_mat, qty_fact")
    .in("log_id", logIds);

  let aggregated: WorkMaterialRow[] = [];

  if (!matsQ.error && Array.isArray(matsQ.data) && matsQ.data.length > 0) {
    const aggMap = new Map<string, { mat_code: string; uom: string; qty: number }>();

    for (const m of matsQ.data as any[]) {
      const code = String(m.mat_code);
      const uom = m.uom_mat ? String(m.uom_mat) : "";
      const qty = Number(m.qty_fact ?? 0) || 0;
      if (!qty) continue;

      const key = `${code}||${uom}`;
      const prev = aggMap.get(key) || { mat_code: code, uom, qty: 0 };
      prev.qty += qty;
      aggMap.set(key, prev);
    }

    const aggArr = Array.from(aggMap.values());
    const codes = aggArr.map((a) => a.mat_code);
    const namesMap: Record<string, { name: string; uom: string | null }> = {};

    if (codes.length) {
      const ci = await supabase
        .from("catalog_items" as any)
        .select("rik_code, name_human_ru, name_human, uom_code")
        .in("rik_code", codes);

      if (!ci.error && Array.isArray(ci.data)) {
        for (const n of ci.data as any[]) {
          const code = String(n.rik_code);
          const name = n.name_human_ru || n.name_human || code;
          const uom = n.uom_code ?? null;
          namesMap[code] = { name, uom };
        }
      }
    }

    aggregated = aggArr.map((a) => {
      const meta = namesMap[a.mat_code];
      return {
        mat_code: a.mat_code,
        name: meta?.name || a.mat_code,
        uom: meta?.uom || a.uom || "",
        available: 0,
        qty_fact: a.qty,
      } as any as WorkMaterialRow;
    });
  }

  const work: WorkRow = {
    ...baseWork,
    qty_done: totalQty,
    qty_left: Math.max(0, baseWork.qty_planned - totalQty),
  };

  return { work, materials: aggregated };
}

// debounce helper
function debounce<F extends (...args: any[]) => any>(fn: F, delay: number) {
  let timer: any;
  return (...args: Parameters<F>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ---- MAIN SCREEN ----
export default function ContractorScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [code, setCode] = useState("");
  const [activating, setActivating] = useState(false);

  const [rows, setRows] = useState<WorkRow[]>([]);
  const [manualClaimedJobIds, setManualClaimedJobIds] = useState<string[]>([]);
  const [subcontractCards, setSubcontractCards] = useState<SubcontractLite[]>([]);
  const [loadingWorks, setLoadingWorks] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const [tab, setTab] = useState<"available" | "mine">("available");
const focusedRef = useRef(false);
const lastKickRef = useRef(0);
  const openingWorkRef = useRef(false);
  const profileRef = useRef<UserProfile | null>(null);
  const contractorRef = useRef<Contractor | null>(null);

  const slider = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(0);
  const [selectedSubcontractId, setSelectedSubcontractId] = useState<string | null>(null);
  const [listMode, setListMode] = useState<"home" | "subcontracts" | "others">("home");
  const { objOptions, lvlOptions, sysOptions } = useForemanDicts();

  const handleTrackLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    contractorRef.current = contractor;
  }, [contractor]);

  useEffect(() => {
    Animated.spring(slider, {
      toValue: tab === "available" ? 0 : 1,
      useNativeDriver: false,
    }).start();
  }, [tab, slider]);

  const objNameByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of objOptions || []) m.set(String(o.code || "").trim(), String(o.name || "").trim());
    return m;
  }, [objOptions]);
  const lvlNameByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of lvlOptions || []) m.set(String(o.code || "").trim(), String(o.name || "").trim());
    return m;
  }, [lvlOptions]);
  const sysNameByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of sysOptions || []) m.set(String(o.code || "").trim(), String(o.name || "").trim());
    return m;
  }, [sysOptions]);

  const toHumanObject = useCallback((raw: string | null | undefined): string => {
    const src = String(raw || "").trim();
    if (!src) return "—";
    const parts = src.split("/").map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return src;
    const out = parts.map((p) => objNameByCode.get(p) || lvlNameByCode.get(p) || sysNameByCode.get(p) || p);
    return out.join(" / ");
  }, [objNameByCode, lvlNameByCode, sysNameByCode]);

  const toHumanWork = useCallback((raw: string | null | undefined): string => {
    const src = String(raw || "").trim();
    if (!src) return "—";
    return sysNameByCode.get(src) || src;
  }, [sysNameByCode]);

  // ===== РњРћР”РђР›РљРђ Р РђР‘РћРў РљРђРљ РќРђ РЎРљР›РђР”Р• =====
  const [workModalVisible, setWorkModalVisible] = useState(false);
  const [workModalRow, setWorkModalRow] = useState<WorkRow | null>(null);
  const [workModalStage, setWorkModalStage] = useState("");
  const [workModalComment, setWorkModalComment] = useState("");
  const [workModalMaterials, setWorkModalMaterials] = useState<WorkMaterialRow[]>(
    []
  );
  const [workModalSaving, setWorkModalSaving] = useState(false);
  const [workModalLocation, setWorkModalLocation] = useState("");
  const [workModalReadOnly, setWorkModalReadOnly] = useState(false);
  const [workModalLoading, setWorkModalLoading] = useState(false);
  const [workLog, setWorkLog] = useState<WorkLogRow[]>([]);
  const [jobHeader, setJobHeader] = useState<ContractorJobHeader | null>(null);
  const [contractModalVisible, setContractModalVisible] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [issuedOpen, setIssuedOpen] = useState(false);
  const [estimateModalVisible, setEstimateModalVisible] = useState(false);
  const [actBuilderVisible, setActBuilderVisible] = useState(false);
  const [actBuilderItems, setActBuilderItems] = useState<ActBuilderItem[]>([]);
  const [actBuilderWorks, setActBuilderWorks] = useState<ActBuilderWorkItem[]>([]);
  const [actBuilderSaving, setActBuilderSaving] = useState(false);
  const [issuedItems, setIssuedItems] = useState<IssuedItemRow[]>([]);
  const [loadingIssued, setLoadingIssued] = useState(false);
  const [issuedHint, setIssuedHint] = useState<string>("");
  const [linkedReqCards, setLinkedReqCards] = useState<LinkedReqCard[]>([]);
  const [workStageOptions, setWorkStageOptions] = useState<
    { code: string; name: string }[]
  >([]);
  const [workStagePickerVisible, setWorkStagePickerVisible] = useState(false);
  const [workSearchVisible, setWorkSearchVisible] = useState(false);
  const [workSearchQuery, setWorkSearchQuery] = useState("");
  const [workSearchResults, setWorkSearchResults] = useState<WorkMaterialRow[]>(
    []
  );
  const workSearchActiveQuery = useRef<string>("");

  // ---- LOAD USER PROFILE ----
  const loadProfile = useCallback(async () => {
    if (!focusedRef.current) return;
setLoadingProfile(true);
    const { data: auth } = await supabase.auth.getUser();

    if (!auth.user) {
      setProfile(null);
      setLoadingProfile(false);
      return;
    }

    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (data) {
      setProfile({
        id: auth.user.id,
        full_name: data.full_name,
        phone: data.phone,
        company: data.company,
        is_contractor: data.is_contractor === true,
      });
    }

    setLoadingProfile(false);
  }, []);

  // ---- LOAD CONTRACTOR (РёР· С‚Р°Р±Р»РёС†С‹ contractors РїРѕ user_id) ----
  const loadContractor = useCallback(async () => {
if (!focusedRef.current) return;

  setLoadingWorks(true);
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) {
      setContractor(null);
      return;
    }

    const { data, error } = await supabase
      .from("contractors")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("[contractor] loadContractor error:", error.message);
    }

    if (data) {
      setContractor({
        id: data.id,
        company_name: data.company_name ?? null,
        full_name: data.full_name ?? null,
        phone: data.phone ?? null,
      });
    } else {
      setContractor(null);
    }
  }, []);

  // ---- LOAD WORKS ----
 const loadWorks = useCallback(async () => {
  if (!focusedRef.current) return;

  setLoadingWorks(true);

    const { data, error } = await supabase
      .from("v_works_fact")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("loadWorks error:", error);
      setRows([]);
      setLoadingWorks(false);
      return;
    }

    const mappedBase: WorkRow[] = (data ?? []).map((x: any) => ({
      progress_id: x.progress_id,
      purchase_item_id: x.purchase_item_id ?? null,
      work_code: x.work_code ?? null,
      work_name: x.work_name,
      object_name: x.object_name ?? null,
      contractor_org: x.contractor_org ?? x.subcontractor_org ?? null,
      contractor_phone: x.contractor_phone ?? x.subcontractor_phone ?? null,
      request_id: x.request_id ?? x.req_id ?? null,
      request_status: x.request_status ?? x.status ?? null,
      contractor_job_id: x.contractor_job_id ?? x.subcontract_id ?? null,
      uom_id: x.uom_id,
      qty_planned: Number(x.qty_planned ?? 0),
      qty_done: Number(x.qty_done ?? 0),
      qty_left: Number(x.qty_left ?? 0),
      work_status: x.work_status,
      contractor_id: x.contractor_id,
      started_at: x.started_at ?? null,
      finished_at: x.finished_at ?? null,
    }));

    const wpIds = mappedBase
      .map((r) => String(r.progress_id || "").trim())
      .filter((id) => looksLikeUuid(id));
    const wpById = new Map<string, any>();
    if (wpIds.length) {
      const wpByIdRes = await supabase.from("work_progress" as any).select("*").in("id", wpIds);
      if (!wpByIdRes.error && Array.isArray(wpByIdRes.data)) {
        for (const row of wpByIdRes.data as any[]) {
          const id = pickWorkProgressRow(row);
          if (id) wpById.set(id, row);
        }
      }
    }

    const mapped = mappedBase.map((r) => {
      const wp = wpById.get(String(r.progress_id));
      if (!wp) return r;
      return {
        ...r,
        request_id: r.request_id || wp.request_id || wp.req_id || null,
        contractor_job_id: r.contractor_job_id || wp.contractor_job_id || wp.subcontract_id || null,
        object_name: r.object_name || wp.object_name || null,
      };
    });

    const piIds = Array.from(
      new Set(mapped.map((r) => String(r.purchase_item_id || "").trim()).filter(Boolean))
    );
    const requestIdByPurchaseItem = new Map<string, string>();
    if (piIds.length) {
      const piQ = await supabase
        .from("purchase_items" as any)
        .select("id, request_item_id")
        .in("id", piIds);
      if (!piQ.error && Array.isArray(piQ.data)) {
        const reqItemIds = Array.from(
          new Set((piQ.data as any[]).map((x: any) => String(x.request_item_id || "").trim()).filter(Boolean))
        );
        const reqByReqItem = new Map<string, string>();
        if (reqItemIds.length) {
          const riQ = await supabase
            .from("request_items" as any)
            .select("id, request_id")
            .in("id", reqItemIds);
          if (!riQ.error && Array.isArray(riQ.data)) {
            for (const ri of riQ.data as any[]) {
              const riId = String(ri.id || "").trim();
              const reqId = String(ri.request_id || "").trim();
              if (riId && reqId) reqByReqItem.set(riId, reqId);
            }
          }
        }
        for (const pi of piQ.data as any[]) {
          const piId = String(pi.id || "").trim();
          const riId = String(pi.request_item_id || "").trim();
          const reqId = reqByReqItem.get(riId) || "";
          if (piId && reqId) requestIdByPurchaseItem.set(piId, reqId);
        }
      }
    }

    const mappedByPurchase = mapped.map((r) => {
      const piId = String(r.purchase_item_id || "").trim();
      return {
        ...r,
        request_id: r.request_id || (piId ? requestIdByPurchaseItem.get(piId) || null : null),
      };
    });

    const reqIds = Array.from(
      new Set(mappedByPurchase.map((r) => String(r.request_id || "").trim()).filter(Boolean))
    );
    const reqById = new Map<string, any>();
    if (reqIds.length) {
      const rq = await supabase
        .from("requests" as any)
        .select("id, status, subcontract_id, object_type_code, level_code, system_code")
        .in("id", reqIds);
      if (!rq.error && Array.isArray(rq.data)) {
        for (const r of rq.data as any[]) {
          const id = String(r.id || "").trim();
          if (id) reqById.set(id, r);
        }
      }
    }

    const mappedByReq = mappedByPurchase.map((r) => {
      const req = reqById.get(String(r.request_id || "").trim());
      if (!req) return r;
      const reqObject = [req.object_type_code, req.level_code, req.system_code]
        .map((v: any) => String(v || "").trim())
        .filter(Boolean)
        .join(" / ");
      return {
        ...r,
        request_status: r.request_status || req.status || null,
        contractor_job_id: r.contractor_job_id || req.subcontract_id || null,
        object_name: r.object_name || reqObject || null,
      };
    });

    const jobIds = Array.from(new Set(mappedByReq.map((r) => String(r.contractor_job_id || "").trim()).filter(Boolean)));
    const objByJob = new Map<string, string>();
    let subcontractsByOrg: SubcontractLite[] = [];
    if (jobIds.length) {
      const sq = await supabase
        .from("subcontracts" as any)
        .select("id, object_name")
        .in("id", jobIds);
      if (!sq.error && Array.isArray(sq.data)) {
        for (const s of sq.data as any[]) {
          const id = String(s.id || "").trim();
          const obj = String(s.object_name || "").trim();
          if (id && obj) objByJob.set(id, obj);
        }
      }
    }

    // Подряды подрядчика: в прод-логике ограничиваем по компании/телефону.
    // В dev можно временно включить все approved через DEV_SHOW_ALL_SUBCONTRACTS.
    const sqApproved = await supabase
      .from("subcontracts" as any)
      .select("id, status, work_type, object_name, qty_planned, uom, contractor_org, contractor_phone, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(500);
    if (!sqApproved.error && Array.isArray(sqApproved.data)) {
      const allApproved = sqApproved.data as SubcontractLite[];
      const myOrg = String(
        contractorRef.current?.company_name || profileRef.current?.company || ""
      )
        .trim()
        .toLowerCase();
      const normPhone = (v: string) => v.replace(/\D+/g, "");
      const myPhone = normPhone(
        String(contractorRef.current?.phone || profileRef.current?.phone || "").trim()
      );

      const scoped = allApproved.filter((s) => {
        const org = String(s.contractor_org || "").trim().toLowerCase();
        const phone = normPhone(String((s as any).contractor_phone || "").trim());
        const byOrg = !!myOrg && !!org && org === myOrg;
        const byPhone = !!myPhone && !!phone && phone === myPhone;
        return byOrg || byPhone;
      });

      subcontractsByOrg =
        scoped.length > 0 ? scoped : DEV_SHOW_ALL_SUBCONTRACTS ? allApproved : [];
      setSubcontractCards(subcontractsByOrg);
    }

    const norm = (v: any) =>
      String(v || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
    const keyByObjWork = (obj: any, work: any) => `${norm(obj)}|${norm(work)}`;
    const subcontractByObjWork = new Map<string, string>();
    const subcontractByWork = new Map<string, string | "MULTI">();
    for (const s of subcontractsByOrg) {
      const sid = String(s.id || "").trim();
      if (!sid) continue;
      const obj = String(s.object_name || "").trim();
      const work = String(s.work_type || "").trim();
      if (obj && work) subcontractByObjWork.set(keyByObjWork(obj, work), sid);
      if (work) {
        const wk = norm(work);
        const prev = subcontractByWork.get(wk);
        if (!prev) subcontractByWork.set(wk, sid);
        else if (prev !== sid) subcontractByWork.set(wk, "MULTI");
      }
    }

    const mappedWithObject = mappedByReq.map((r) => {
      let jid = String(r.contractor_job_id || "").trim();
      if (!jid) {
        const k = keyByObjWork(r.object_name, r.work_name || r.work_code);
        jid = subcontractByObjWork.get(k) || "";
      }
      if (!jid) {
        const wk = norm(r.work_name || r.work_code);
        const candidate = subcontractByWork.get(wk);
        if (candidate && candidate !== "MULTI") jid = candidate;
      }
      const fallbackObject = jid ? objByJob.get(jid) || null : null;
      return {
        ...r,
        contractor_job_id: jid || null,
        object_name: r.object_name || fallbackObject,
      };
    });

    const allowedJobIds = new Set(
      subcontractsByOrg.map((s) => String(s.id || "").trim()).filter(Boolean)
    );
    const myContractorId = String(contractorRef.current?.id || "").trim();

const filtered = mappedWithObject.filter((r) => {
  const c = String(r.work_code ?? "").toUpperCase();
  const rowContractorId = String(r.contractor_id || "").trim();
  const jid = String(r.contractor_job_id || "").trim();
  const ownedByMe = !!myContractorId && rowContractorId === myContractorId;
  const inMySubcontract = jid && allowedJobIds.has(jid);
  const isOther = !jid;
  const myOrg = String(contractorRef.current?.company_name || profileRef.current?.company || "").trim().toLowerCase();
  const normPhone = (v: string) => v.replace(/\D+/g, "");
  const myPhone = normPhone(String(contractorRef.current?.phone || profileRef.current?.phone || "").trim());
  const rowOrg = String(r.contractor_org || "").trim().toLowerCase();
  const rowPhone = normPhone(String(r.contractor_phone || "").trim());
  const matchedByOrgPhone = (!!myOrg && !!rowOrg && myOrg === rowOrg) || (!!myPhone && !!rowPhone && myPhone === rowPhone);
  const reqStatus = String(r.request_status || "").toLowerCase();
  const approvedForOther =
    !reqStatus ||
    reqStatus.includes("ready") ||
    reqStatus.includes("approved") ||
    reqStatus.includes("waiting_stock") ||
    reqStatus.includes("stock") ||
    reqStatus.includes("в работе") ||
    reqStatus.includes("готов");

  // Оставляем только мои строки или строки моих подрядов
  if (
    !ownedByMe &&
    allowedJobIds.size > 0 &&
    !inMySubcontract &&
    !(isOther && matchedByOrgPhone && approvedForOther) &&
    !DEV_SHOW_ALL_SUBCONTRACTS
  )
    return false;
  if (!ownedByMe && allowedJobIds.size === 0 && !DEV_SHOW_ALL_SUBCONTRACTS && !(isOther && matchedByOrgPhone && approvedForOther)) return false;

  // рџљ« СЃР»СѓР¶РµР±РЅРѕРµ/РєРѕСЌС„С„РёС†РёРµРЅС‚С‹ вЂ” РЅРёРєСѓРґР°
  if (
    c.startsWith("FACTOR-") ||
    c.startsWith("KIT-") ||
    c.startsWith("GENERIC-") ||
    c.startsWith("AUX-") ||
    c.startsWith("SUP-") ||
    c.startsWith("TEST-") ||
    c.startsWith("WRK-META-K-") // вњ… С‚РІРѕРё "РєРѕСЌС„С‹" РІ СЂР°Р±РѕС‚Р°С…
  ) return false;

  // вњ… РїРѕРґСЂСЏРґС‡РёРєРё: С‚РѕР»СЊРєРѕ СЂР°Р±РѕС‚С‹/СѓСЃР»СѓРіРё/СЃРїРµС†
  return !(
    c.startsWith("MAT-") ||
    c.startsWith("KIT-") ||
    c.startsWith("FACTOR-") ||
    c.startsWith("GENERIC-") ||
    c.startsWith("AUX-") ||
    c.startsWith("SUP-") ||
    c.startsWith("TEST-") ||
    c.startsWith("WRK-META-K-")
  );
});

    const existingJobIds = new Set(
      filtered.map((r) => String(r.contractor_job_id || "").trim()).filter(Boolean)
    );
    const syntheticRows: WorkRow[] = subcontractsByOrg
      .filter((s) => String(s.status || "").toLowerCase() === "approved")
      .filter((s) => {
        const sid = String(s.id || "").trim();
        return !!sid && !existingJobIds.has(sid);
      })
      .map((s) => {
        const sid = String(s.id || "").trim();
        const planned = Number(s.qty_planned ?? 0) || 0;
        return {
          progress_id: `subcontract:${sid}`,
          purchase_item_id: null,
          work_code: "WRK-SUBCONTRACT",
          work_name: String(s.work_type || "Подряд").trim() || "Подряд",
          object_name: String(s.object_name || "").trim() || null,
          request_id: null,
          contractor_job_id: sid,
          uom_id: String(s.uom || "").trim() || null,
          qty_planned: planned,
          qty_done: 0,
          qty_left: planned,
          work_status: "к запуску",
          contractor_id: null,
          started_at: null,
          finished_at: null,
        };
      });

setRows([...syntheticRows, ...filtered]);


    setLoadingWorks(false);
  }, []);

  // ---- ACTIVATE CODE ----
  const activateCode = async () => {
    if (!code.trim()) return;

    try {
      setActivating(true);

      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) return;

      // РўР•РЎРўРћР’Рћ: РїСЂРѕСЃС‚Рѕ РІРєР»СЋС‡Р°РµРј С„Р»Р°Рі is_contractor
      const { error } = await supabase
        .from("user_profiles")
        .update({ is_contractor: true })
        .eq("user_id", user.id);

      if (error) throw error;

      Alert.alert("Готово", "Доступ подрядчика активирован.");
      await loadProfile();
      await loadContractor();
      await loadWorks();
    } catch (e: any) {
      Alert.alert("Ошибка", e.message);
    } finally {
      setActivating(false);
    }
  };

  // ====== Р›РћР“РРљРђ РњРћР”РђР›РљР "Р¤РђРљРў Р’Р«РџРћР›РќР•РќРРЇ" (РљРђРљ РќРђ РЎРљР›РђР”Р•) ======

  // РёСЃС‚РѕСЂРёСЏ Р°РєС‚РѕРІ
  const loadWorkLog = useCallback(async (progressId: string) => {
    try {
      let q = await supabase
        .from("work_progress_log" as any)
        .select("id, created_at, qty, work_uom, stage_note, note")
        .eq("progress_id", progressId)
        .order("created_at", { ascending: true });
      if (q.error) {
        q = await supabase
          .from("work_progress_log" as any)
          .select("id, created_at, qty, work_uom, stage_note, note")
          .eq("id", progressId)
          .order("created_at", { ascending: true });
      }
      const { data, error } = q;

      if (!error && Array.isArray(data)) {
        setWorkLog(
          data.map((r: any) => ({
            id: String(r.id),
            created_at: r.created_at,
            qty: Number(r.qty ?? 0),
            work_uom: r.work_uom ?? null,
            stage_note: r.stage_note ?? null,
            note: r.note ?? null,
          }))
        );
      } else {
        setWorkLog([]);
      }
    } catch (e) {
      console.warn("[loadWorkLog] error", e);
      setWorkLog([]);
    }
  }, []);

  const resolveRequestId = useCallback(async (row: WorkRow): Promise<string> => {
    const direct = String(row.request_id || "").trim();
    if (direct) return direct;

    const piId = String(row.purchase_item_id || "").trim();
    if (piId) {
      const pi = await supabase
        .from("purchase_items" as any)
        .select("request_item_id")
        .eq("id", piId)
        .maybeSingle();
      const reqItemId = String((pi.data as any)?.request_item_id || "").trim();
      if (reqItemId) {
        const ri = await supabase
          .from("request_items" as any)
          .select("request_id")
          .eq("id", reqItemId)
          .maybeSingle();
        const rid = String((ri.data as any)?.request_id || "").trim();
        if (rid) return rid;
      }
    }

    const workCode = String(row.work_code || "").trim();
    if (workCode) {
      const riByCode = await supabase
        .from("request_items" as any)
        .select("request_id, updated_at")
        .eq("rik_code", workCode)
        .order("updated_at", { ascending: false })
        .limit(5);
      if (!riByCode.error && Array.isArray(riByCode.data) && riByCode.data.length) {
        const rid = String((riByCode.data[0] as any).request_id || "").trim();
        if (rid) return rid;
      }
    }
    return "";
  }, []);

  const resolveContractorJobId = useCallback(async (row: WorkRow): Promise<string> => {
    const direct = String(row.contractor_job_id || "").trim();
    if (direct) return direct;

    const reqId = await resolveRequestId(row);
    if (reqId) {
      const req = await supabase
        .from("requests" as any)
        .select("subcontract_id, contractor_job_id")
        .eq("id", reqId)
        .maybeSingle();
      if (!req.error && req.data) {
        const rid = String((req.data as any).subcontract_id || (req.data as any).contractor_job_id || "").trim();
        if (rid) return rid;
      }
    }

    const [wpById, wpByProgress] = await Promise.all([
      supabase.from("work_progress" as any).select("*").eq("id", row.progress_id).maybeSingle(),
      supabase.from("work_progress" as any).select("*").eq("progress_id", row.progress_id).maybeSingle(),
    ]);
    const wpData = wpById.data || wpByProgress.data;
    if (wpData) {
      const id = String((wpData as any).contractor_job_id || (wpData as any).subcontract_id || "").trim();
      if (id) return id;
    }

    const workType = String(row.work_name || row.work_code || "").trim();
    if (!workType) return "";

    const sq = await supabase
      .from("subcontracts" as any)
      .select("id, work_type, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(300);
    if (sq.error || !Array.isArray(sq.data) || !sq.data.length) return "";
    const exact = (sq.data as any[]).find(
      (s) => String(s.work_type || "").trim().toLowerCase() === workType.toLowerCase()
    );
    return String((exact || (sq.data as any[])[0])?.id || "").trim();
  }, [resolveRequestId]);

  const loadContractorJobHeader = useCallback(async (row: WorkRow) => {
    try {
      const jobId = await resolveContractorJobId(row);
      if (!jobId) {
        const reqId = await resolveRequestId(row);
        if (reqId) {
          const req = await supabase
            .from("requests" as any)
            .select("display_no, object_type_code, level_code, system_code, contractor_org, contractor_phone")
            .eq("id", reqId)
            .maybeSingle();
          if (!req.error && req.data) {
            const r = req.data as any;
            const reqObject = [r.object_type_code, r.level_code, r.system_code]
              .map((v: any) => String(v || "").trim())
              .filter(Boolean)
              .join(" / ");
            if (String(reqObject || "").trim()) {
              setWorkModalRow((prev) => (prev ? { ...prev, object_name: String(reqObject) } : prev));
            }
            setJobHeader({
              contractor_org: String(r.contractor_org || contractor?.company_name || profile?.company || "").trim() || null,
              contractor_inn: null,
              contractor_rep: null,
              contractor_phone: String(r.contractor_phone || contractor?.phone || profile?.phone || "").trim() || null,
              contract_number: String(r.display_no || "").trim() || null,
              contract_date: null,
              object_name: reqObject || null,
              work_type: row.work_name || row.work_code || null,
              zone: String(r.level_code || "").trim() || null,
              level_name: String(r.level_code || "").trim() || null,
              qty_planned: Number(row.qty_planned || 0),
              uom: row.uom_id || null,
              unit_price: null,
              total_price: null,
              date_start: null,
              date_end: null,
            });
          }
        }
        return null;
      }

      const sq = await supabase.from("subcontracts" as any).select("*").eq("id", jobId).maybeSingle();
      if (sq.error || !sq.data) {
        setJobHeader(null);
        return null;
      }

      const s = sq.data as any;
      const hdr: ContractorJobHeader = {
        contractor_org: s.contractor_org ?? null,
        contractor_inn: s.contractor_inn ?? null,
        contractor_rep: s.contractor_rep ?? null,
        contractor_phone: s.contractor_phone ?? null,
        contract_number: s.contract_number ?? null,
        contract_date: s.contract_date ?? null,
        object_name: s.object_name ?? null,
        work_type: s.work_type ?? null,
        zone: s.work_zone ?? null,
        level_name: null,
        qty_planned: s.qty_planned == null ? null : Number(s.qty_planned),
        uom: s.uom ?? null,
        unit_price: s.price_per_unit == null ? null : Number(s.price_per_unit),
        total_price: s.total_price == null ? null : Number(s.total_price),
        date_start: s.date_start ?? null,
        date_end: s.date_end ?? null,
      };
      setJobHeader(hdr);
      if (String(hdr.object_name || "").trim()) {
        setWorkModalRow((prev) => (prev ? { ...prev, object_name: String(hdr.object_name) } : prev));
      }
      return hdr;
    } catch (e) {
      console.warn("[loadContractorJobHeader] error:", e);
      setJobHeader(null);
      return null;
    }
  }, [resolveContractorJobId, contractor, profile, resolveRequestId]);

  const loadIssuedToday = useCallback(async (row: WorkRow) => {
    setLoadingIssued(true);
    try {
      const jobId = await resolveContractorJobId(row);
      const reqIdForRow = await resolveRequestId(row);

      let reqRows: any[] = [];
      if (jobId) {
        const reqQ = await supabase
          .from("requests" as any)
          .select("id, status")
          .eq("subcontract_id", jobId);
        reqRows = (reqQ.data as any[] | null) || [];
      } else if (reqIdForRow) {
        reqRows = [{ id: reqIdForRow, status: null }];
      }
      const requestIds = reqRows.map((r: any) => String(r.id || "").trim()).filter(Boolean);
      if (!requestIds.length) {
        setIssuedItems([]);
        setLinkedReqCards([]);
        setIssuedHint("");
        return;
      }

      const reqDisplayQ = await supabase
        .from("requests" as any)
        .select("id, display_no, request_no, status")
        .in("id", requestIds);
      const reqDisplayById = new Map<string, { req_no: string; status: string | null }>();
      if (!reqDisplayQ.error && Array.isArray(reqDisplayQ.data)) {
        for (const rowReq of reqDisplayQ.data as any[]) {
          const rid = String(rowReq.id || "").trim();
          if (!rid) continue;
          const reqNo = String(rowReq.request_no || rowReq.display_no || `REQ-${rid.slice(0, 8)}`).trim();
          const status = String(rowReq.status || "").trim() || null;
          reqDisplayById.set(rid, { req_no: reqNo, status });
        }
      }

      const issueHeadsQ = await supabase
        .from("warehouse_issues" as any)
        .select("id, request_id, base_no")
        .in("request_id", requestIds);
      const issueNosByReq = new Map<string, string[]>();
      if (!issueHeadsQ.error && Array.isArray(issueHeadsQ.data)) {
        for (const issue of issueHeadsQ.data as any[]) {
          const rid = String(issue.request_id || "").trim();
          if (!rid) continue;
          const issueNo = String(issue.base_no || "").trim() || `ISSUE-${String(issue.id || "").slice(0, 8)}`;
          const list = issueNosByReq.get(rid) || [];
          if (!list.includes(issueNo)) list.push(issueNo);
          issueNosByReq.set(rid, list);
        }
      }

      const headsQ = await supabase
        .from("v_wh_issue_req_heads_ui" as any)
        .select("request_id, submitted_at, issue_status, qty_issued_sum")
        .in("request_id", requestIds);
      const issueStatusByReq = new Map<string, string>();
      const issuedSumByReq = new Map<string, number>();
      const buildReqCards = (issuedByItems?: Map<string, number>): LinkedReqCard[] =>
        requestIds.map((rid) => {
          const meta = reqDisplayById.get(rid);
          const fallbackIssued =
            Number(issuedByItems?.get(rid) || 0) > 0 || Number(issuedSumByReq.get(rid) || 0) > 0;
          const issueNos = issueNosByReq.get(rid) || (fallbackIssued ? ["выдача есть"] : []);
          return {
            request_id: rid,
            req_no: meta?.req_no || `REQ-${rid.slice(0, 8)}`,
            status: issueStatusByReq.get(rid) || meta?.status || null,
            issue_nos: issueNos,
          };
        });

      const todayKey = toLocalDateKey(new Date());
      const todayReqIds = new Set<string>();
      if (!headsQ.error && Array.isArray(headsQ.data)) {
        for (const h of headsQ.data as any[]) {
          const rid = String(h.request_id || "").trim();
          if (!rid) continue;
          const issueStatus = String(h.issue_status || "").trim();
          if (issueStatus) issueStatusByReq.set(rid, issueStatus);
          const issuedSum = Number(h.qty_issued_sum ?? 0);
          if (Number.isFinite(issuedSum)) issuedSumByReq.set(rid, issuedSum);
          if (!h.submitted_at || toLocalDateKey(h.submitted_at) === todayKey) {
            todayReqIds.add(rid);
          }
        }
      }
      let scopeIds = Array.from(todayReqIds);
      if (!scopeIds.length) {
        scopeIds = requestIds;
      }
      if (!scopeIds.length) {
        setIssuedItems([]);
        setLinkedReqCards(buildReqCards());
        const hasWaiting = reqRows.some((r: any) => {
          const st = String(r.status || "").toLowerCase();
          return st.includes("утвержд") || st.includes("на утверж");
        });
        setIssuedHint(hasWaiting ? "Есть заявки, но они еще не утверждены/не готовы к выдаче." : "");
        return;
      }

      const itemsQ = await supabase
        .from("v_wh_issue_req_items_ui" as any)
        .select("*")
        .in("request_id", scopeIds);
      if (itemsQ.error || !Array.isArray(itemsQ.data)) {
        setIssuedItems([]);
        setLinkedReqCards(buildReqCards());
        setIssuedHint("");
        return;
      }

      const mapped = (itemsQ.data as any[])
        .map((r: any, idx: number) => ({
        issue_item_id: String(r.request_item_id || `${r.request_id || ""}-${idx}`),
        mat_code: String(r.rik_code || r.request_item_id || `${r.request_id || ""}-${idx}`),
        request_id: String(r.request_id || ""),
        title: String(r.name_human || r.rik_code || "Материал"),
        unit: r.uom ?? null,
        qty: Number(r.qty_issued ?? 0),
        qty_left: Number(r.qty_left ?? 0),
        price: null,
        sum: null,
        qty_fact: Number(r.qty_issued ?? 0),
        }))
        .sort((a: IssuedItemRow, b: IssuedItemRow) => Number(b.qty || 0) - Number(a.qty || 0));
      const issuedByItems = new Map<string, number>();
      for (const rowItem of mapped) {
        const rid = String(rowItem.request_id || "").trim();
        if (!rid) continue;
        issuedByItems.set(rid, Number(issuedByItems.get(rid) || 0) + Number(rowItem.qty || 0));
      }
      const cards = buildReqCards(issuedByItems);
      setLinkedReqCards(cards);
      setIssuedItems(mapped as IssuedItemRow[]);
      setIssuedHint("");
    } catch (e) {
      console.warn("[loadIssuedToday] error:", e);
      setIssuedItems([]);
      setLinkedReqCards([]);
      setIssuedHint("");
    } finally {
      setLoadingIssued(false);
    }
  }, [resolveContractorJobId, resolveRequestId]);

  // РѕС‚РєСЂС‹С‚СЊ РјРѕРґР°Р»РєСѓ (РєР°Рє openWorkAddModal РІ warehouse.tsx)
  const openWorkAddModal = useCallback(
    (row: WorkRow, readOnly: boolean = false) => {
      setWorkModalRow(row);
      setWorkModalStage("");
      setWorkModalComment("");
      setWorkModalLocation("");
      setWorkModalReadOnly(readOnly);

      setWorkLog([]);
      setWorkModalMaterials([]);
      setWorkStageOptions([]);
      setWorkSearchVisible(false);
      setWorkSearchQuery("");
      setWorkSearchResults([]);

      setWorkModalVisible(true);
      setWorkModalLoading(true);
      setJobHeader(null);
      setIssuedItems([]);
      setLinkedReqCards([]);
      setIssuedHint("");
      setHistoryOpen(false);
      setIssuedOpen(false);
      setEstimateModalVisible(false);
      setContractModalVisible(false);

      (async () => {
        try {
          // РёСЃС‚РѕСЂРёСЏ
          await loadContractorJobHeader(row);
          await loadIssuedToday(row);
          await loadWorkLog(row.progress_id);

          if (!readOnly) {
            setWorkModalMaterials([]);

            try {
              // РїРѕСЃР»РµРґРЅРёР№ Р»РѕРі вЂ” РІРѕСЃСЃС‚Р°РЅРѕРІР»РµРЅРёРµ РјР°С‚РµСЂРёР°Р»РѕРІ
              let lastLogQ = await supabase
                .from("work_progress_log" as any)
                .select("id, qty, work_uom, stage_note, note")
                .eq("progress_id", row.progress_id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              if (lastLogQ.error) {
                lastLogQ = await supabase
                  .from("work_progress_log" as any)
                  .select("id, qty, work_uom, stage_note, note")
                  .eq("id", row.progress_id)
                  .order("created_at", { ascending: false })
                  .limit(1)
                  .maybeSingle();
              }

              let restoredMaterials: WorkMaterialRow[] = [];

              if (!lastLogQ.error && lastLogQ.data?.id) {
                const logId = String(lastLogQ.data.id);

                const matsQ = await supabase
                  .from("work_progress_log_materials" as any)
                  .select("mat_code, uom_mat, qty_fact")
                  .eq("log_id", logId);

                if (
                  !matsQ.error &&
                  Array.isArray(matsQ.data) &&
                  matsQ.data.length
                ) {
                  const codes = matsQ.data
                    .map((m: any) => m.mat_code)
                    .filter(Boolean);
                  let namesMap: Record<
                    string,
                    { name: string; uom: string | null }
                  > = {};

                  if (codes.length) {
                    const ci = await supabase
                      .from("catalog_items" as any)
                      .select(
                        "rik_code, name_human_ru, name_human, uom_code"
                      )
                      .in("rik_code", codes);

                    if (!ci.error && Array.isArray(ci.data)) {
                      for (const n of ci.data as any[]) {
                        const code = String(n.rik_code);
                        const name =
                          n.name_human_ru || n.name_human || code;
                        const uom = n.uom_code ?? null;
                        namesMap[code] = { name, uom };
                      }
                    }
                  }

                  restoredMaterials = matsQ.data.map((m: any) => {
                    const code = String(m.mat_code);
                    const meta = namesMap[code];
                    return {
                      mat_code: code,
                      name: meta?.name || code,
                      uom: meta?.uom || m.uom_mat || row.uom_id || "",
                      available: 0,
                      qty_fact: Number(m.qty_fact ?? 0),
                    } as any as WorkMaterialRow;
                  });
                }
              }

              if (restoredMaterials.length) {
                setWorkModalMaterials(restoredMaterials);
              } else {
                const workCode = row.work_code;

                if (workCode) {
                  let defaults: any[] = [];

                  const q1 = await supabase
                    .from("work_default_materials" as any)
                    .select("*")
                    .eq("work_code", workCode)
                    .limit(100);

                  if (!q1.error && Array.isArray(q1.data) && q1.data.length) {
                    defaults = q1.data;
                  } else {
                    const seed = await supabase.rpc(
                      "work_seed_defaults_auto" as any,
                      { p_work_code: workCode } as any
                    );

                    if (!seed.error) {
                      const q2 = await supabase
                        .from("work_default_materials" as any)
                        .select("*")
                        .eq("work_code", workCode)
                        .limit(100);

                      if (!q2.error && Array.isArray(q2.data)) {
                        defaults = q2.data;
                      }
                    } else {
                      console.warn(
                        "[work_seed_defaults_auto] error:",
                        seed.error.message
                      );
                    }
                  }

                  if (defaults.length) {
                    const codes = defaults
                      .map((d: any) => d.mat_code)
                      .filter((c: any) => !!c);

                    const namesMap: Record<
                      string,
                      { name: string; uom: string | null }
                    > = {};
                    if (codes.length) {
                      const ci = await supabase
                        .from("catalog_items" as any)
                        .select(
                          "rik_code, name_human_ru, name_human, uom_code"
                        )
                        .in("rik_code", codes);

                      if (!ci.error && Array.isArray(ci.data)) {
                        for (const n of ci.data as any[]) {
                          const code = String(n.rik_code);
                          const name =
                            n.name_human_ru || n.name_human || code;
                          const uom = n.uom_code ?? null;
                          namesMap[code] = { name, uom };
                        }
                      }
                    }

                    const mats: WorkMaterialRow[] = defaults.map((d: any) => {
                      const code = String(d.mat_code);
                      const meta = namesMap[code];

                      return {
                        mat_code: code,
                        name: meta?.name || code,
                        uom:
                          meta?.uom ||
                          String(d.uom || row.uom_id || ""),
                        available: 0,
                        qty_fact: 0,
                      } as any as WorkMaterialRow;
                    });

                    setWorkModalMaterials(mats);
                  }
                }
              }
            } catch (e) {
              console.warn("[openWorkAddModal] materials error:", e);
            }
          }

          // СЌС‚Р°РїС‹ СЂР°Р±РѕС‚
          try {
            const { data, error } = await supabase
              .from("work_stages" as any)
              .select("code, name")
              .eq("is_active", true)
              .order("sort_order", { ascending: true });
            if (!error && Array.isArray(data)) {
              setWorkStageOptions(
                data.map((s: any) => ({
                  code: String(s.code),
                  name: String(s.name),
                }))
              );
            } else {
              setWorkStageOptions([]);
            }
          } catch (e) {
            console.warn("[openWorkAddModal] work_stages error:", e);
            setWorkStageOptions([]);
          }
        } finally {
          setWorkModalLoading(false);
        }
      })();
    },
    [loadContractorJobHeader, loadIssuedToday, loadWorkLog]
  );

  useEffect(() => {
    if (!workModalVisible || !issuedOpen || !workModalRow) return;
    const timer = setInterval(() => {
      void loadIssuedToday(workModalRow);
    }, 25000);
    return () => clearInterval(timer);
  }, [workModalVisible, issuedOpen, workModalRow, loadIssuedToday]);

  // RPC-РїРѕРёСЃРє РјР°С‚РµСЂРёР°Р»РѕРІ (РєР°Рє РІ warehouse)
  const runMaterialSearch = useCallback(async (q: string) => {
    try {
      const { data, error } = await supabase.rpc("catalog_search" as any, {
        p_query: q,
        p_kind: "material",
      } as any);

      if (workSearchActiveQuery.current !== q) return;

      if (error) {
        console.warn("[material_search/catalog_search] error:", error.message);
        return;
      }
      if (!Array.isArray(data)) return;

      const mapped: WorkMaterialRow[] = (data as any[]).map((d) => {
        const rawName =
          (d.name_human_ru as string) ??
          (d.name_human as string) ??
          (d.rik_code as string) ??
          "";
        const cleanName = String(rawName).replace(/\s+/g, " ").trim();

        return {
          mat_code: d.rik_code,
          name: cleanName,
          uom: d.uom_code,
          available: Number(d.qty_available ?? 0),
          qty_fact: 0,
        } as any as WorkMaterialRow;
      });

      mapped.sort((a: any, b: any) => {
        const aHas = a.available > 0 ? 0 : 1;
        const bHas = b.available > 0 ? 0 : 1;
        if (aHas !== bHas) return aHas - bHas;
        if (b.available !== a.available) return b.available - a.available;
        return a.name.localeCompare(b.name, "ru");
      });

      setWorkSearchResults(mapped);
    } catch (e: any) {
      if (workSearchActiveQuery.current !== q) return;
      console.warn(
        "[material_search/catalog_search] exception:",
        e?.message || e
      );
    }
  }, []);

  const debouncedMaterialSearch = useRef(
    debounce((q: string) => {
      runMaterialSearch(q);
    }, 300)
  ).current;

  const handleWorkSearchChange = useCallback(
    (text: string) => {
      setWorkSearchQuery(text);

      const q = text.trim();
      workSearchActiveQuery.current = q;

      if (q.length < 2) {
        setWorkSearchResults([]);
        return;
      }

      debouncedMaterialSearch(q);
    },
    [debouncedMaterialSearch]
  );

  const addWorkMaterial = useCallback((item: WorkMaterialRow) => {
    setWorkModalMaterials((prev) => {
      const idx = prev.findIndex(
        (m: any) => m.mat_code === (item as any).mat_code
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          name: (item as any).name,
          uom: (item as any).uom,
          available: (item as any).available,
        };
        return copy;
      }
      return [...prev, item];
    });

    setWorkSearchVisible(false);
    setWorkSearchQuery("");
    setWorkSearchResults([]);
  }, []);

  const closeWorkModal = useCallback(() => {
    setWorkSearchVisible(false);
    setWorkSearchQuery("");
    setWorkSearchResults([]);
    setLinkedReqCards([]);
    setWorkModalVisible(false);
  }, []);

  const openActBuilder = useCallback(() => {
    const seeded = issuedItems.map((it) => {
      const issued = Number(it.qty || 0);
      const left = Number(it.qty_left || 0);
      const maxQty = Math.max(0, issued > 0 ? issued : left);
      const defaultQty = issued > 0 ? issued : maxQty;
      return {
        id: String(it.issue_item_id),
        mat_code: String(it.mat_code || it.issue_item_id || it.title),
        name: String(it.title || "Материал"),
        uom: String(it.unit || ""),
        issuedQty: issued,
        qtyMax: maxQty,
        qty: defaultQty,
        price: it.price == null ? null : Number(it.price),
        include: false,
        source: issued > 0 ? "issued" : "ready",
      } as ActBuilderItem;
    });

    const byCode = new Set(seeded.map((s) => s.mat_code));
    const fallback = workModalMaterials
      .filter((m: any) => !byCode.has(String(m.mat_code || "")))
      .map((m: any, idx: number) => ({
        id: `fallback-${idx}-${String(m.mat_code || m.name || "mat")}`,
        mat_code: String(m.mat_code || m.name || `MAT-${idx}`),
        name: String(m.name || m.mat_code || "Материал"),
        uom: String(m.uom || ""),
        issuedQty: Number(m.qty_fact || 0),
        qtyMax: Number(m.qty_fact || 0),
        qty: Number(m.qty_fact || 0),
        price: null,
        include: false,
        source: "issued" as const,
      }));

    setActBuilderItems([...seeded, ...fallback]);
    const worksPool = Array.from(
      new Set(
        rows
          .filter((r) => String(r.contractor_job_id || "").trim() === String(workModalRow?.contractor_job_id || "").trim())
          .map((r) => toHumanWork(r.work_name || r.work_code))
          .filter(Boolean)
      )
    );
    setActBuilderWorks(
      worksPool.map((name, idx) => ({
        id: `w-${idx}-${name}`,
        name,
        include: false,
      }))
    );
    setActBuilderVisible(true);
  }, [issuedItems, workModalMaterials, rows, workModalRow, toHumanWork]);

  const actBuilderSelectedMatCount = useMemo(
    () => actBuilderItems.filter((x) => x.include && Number(x.qty || 0) > 0).length,
    [actBuilderItems]
  );
  const actBuilderSelectedWorkCount = useMemo(
    () => actBuilderWorks.filter((x) => x.include).length,
    [actBuilderWorks]
  );
  const actBuilderHasSelected = useMemo(
    () => actBuilderSelectedMatCount + actBuilderSelectedWorkCount > 0,
    [actBuilderSelectedMatCount, actBuilderSelectedWorkCount]
  );

  const submitActBuilder = useCallback(async () => {
    if (!workModalRow) return;
    const selectedWorks = actBuilderWorks.filter((x) => x.include).map((x) => x.name);
    const selected = actBuilderItems.filter((x) => x.include && Number(x.qty || 0) > 0);
    if (!selectedWorks.length && !selected.length) {
      Alert.alert("Акт", "Выберите хотя бы одну работу или один материал, чтобы сформировать акт.");
      return;
    }
    if (selectedWorks.length > 0 && selected.length === 0) {
      Alert.alert("Информация", "Акт будет сформирован без материалов — только по работам.");
    }
    if (selected.length > 0 && selectedWorks.length === 0) {
      Alert.alert("Информация", "Акт будет сформирован без работ — только по материалам.");
    }
    const objectName = pickFirstNonEmpty(workModalRow?.object_name, jobHeader?.object_name) || "";
    if (!String(objectName || "").trim()) {
      Alert.alert("Нет объекта", "Сохранение акта заблокировано: у работы не привязан объект.");
      return;
    }
    try {
      setActBuilderSaving(true);
      const { data: logRow, error: logErr } = await supabase
        .from("work_progress_log" as any)
        .insert({
          progress_id: workModalRow.progress_id,
          qty: 1,
          work_uom: workModalRow.uom_id || null,
          stage_note: null,
          note: "Акт сформирован из модалки конструктора",
        } as any)
        .select("id")
        .single();
      if (logErr) {
        Alert.alert("Ошибка сохранения акта", pickErr(logErr));
        return;
      }
      const logId = String((logRow as any)?.id || "").trim();
      if (!logId) {
        Alert.alert("Ошибка сохранения акта", "Не удалось получить ID акта.");
        return;
      }

      const matsPayload = selected.map((m) => ({
        log_id: logId,
        mat_code: m.mat_code,
        uom_mat: m.uom || null,
        qty_fact: Number(m.qty || 0),
      }));
      if (matsPayload.length) {
        const { error: matsErr } = await supabase
          .from("work_progress_log_materials" as any)
          .insert(matsPayload as any);
        if (matsErr) {
          Alert.alert("Ошибка сохранения материалов", pickErr(matsErr));
          return;
        }
      }

      const pdfMaterials = selected.map((m) => ({
        mat_code: m.mat_code,
        name: m.name,
        uom: m.uom,
        available: 0,
        qty_fact: Number(m.qty || 0),
        price: m.price,
      })) as any;
      await generateWorkPdf(workModalRow, pdfMaterials, { selectedWorks });

      setActBuilderVisible(false);
      Alert.alert("Готово", "Акт сформирован и PDF создан.");
      await loadWorks();
    } catch (e) {
      showErr(e);
    } finally {
      setActBuilderSaving(false);
    }
  }, [workModalRow, jobHeader, actBuilderItems, actBuilderWorks, loadWorks]);

  const submitWorkProgress = useCallback(
    async () => {
      if (!workModalRow) return;
      if (!String(resolvedObjectName || "").trim()) {
        Alert.alert(
          "Нет объекта",
          "Сохранение акта заблокировано: у работы не привязан объект."
        );
        return;
      }

      // Прогресс/объем в UI отключен: сохраняем акт как факт выполнения (маркер=1).
      const qtyNum = 1;

      const materialsPayload = workModalMaterials
        .map((m: any) => {
          const raw = m.qty_fact ?? m.qty ?? 0;
          const fact = Number(String(raw).replace(",", "."));
          return {
            mat_code: m.mat_code,
            uom: m.uom,
            qty_fact: Number.isFinite(fact) ? fact : 0,
          };
        })
        .filter((m) => m.qty_fact > 0);

      try {
        setWorkModalSaving(true);
        const noteParts = [workModalLocation, workModalComment]
          .map((v) => String(v || "").trim())
          .filter(Boolean);
        const note = noteParts.length ? noteParts.join(" · ") : null;
        const { data: logRow, error: logErr } = await supabase
          .from("work_progress_log" as any)
          .insert({
            progress_id: workModalRow.progress_id,
            qty: qtyNum,
            work_uom: workModalRow.uom_id || null,
            stage_note: workModalStage || null,
            note,
          } as any)
          .select("id")
          .single();
        if (logErr) {
          Alert.alert("Ошибка сохранения акта", pickErr(logErr));
          return;
        }
        const logId = String((logRow as any)?.id || "").trim();
        if (!logId) {
          Alert.alert("Ошибка сохранения акта", "Не удалось получить ID акта.");
          return;
        }
        if (materialsPayload.length) {
          const matsPayload = materialsPayload.map((m) => ({
            log_id: logId,
            mat_code: m.mat_code,
            uom_mat: m.uom || null,
            qty_fact: m.qty_fact,
          }));
          const { error: matsErr } = await supabase
            .from("work_progress_log_materials" as any)
            .insert(matsPayload as any);
          if (matsErr) {
            Alert.alert("Ошибка сохранения материалов", pickErr(matsErr));
            return;
          }
        }

        const updatedWork: WorkRow = {
          ...workModalRow,
          object_name: resolvedObjectName || workModalRow.object_name,
          qty_done: workModalRow.qty_done + qtyNum,
          qty_left: Math.max(0, (workModalRow.qty_planned || 0) - (workModalRow.qty_done + qtyNum)),
        };

        Alert.alert("Готово", "Факт по работе сохранен.");
        setWorkModalVisible(false);
        await loadWorks();
      } catch (e: any) {
        console.warn("[submitWorkProgress] exception:", e);
        showErr(e);
      } finally {
        setWorkModalSaving(false);
      }
    },
    [
      workModalRow,
      workModalStage,
      workModalComment,
      workModalMaterials,
      workModalLocation,
      jobHeader,
      loadWorks,
    ]
  );

  // Подряды, уже "взятые в работу" этим подрядчиком.
  // Если подряд взят хотя бы по одной строке, новые строки того же contractor_job_id должны идти в "Мои".
  const claimedJobIds = useMemo(() => {
    if (!contractor) return new Set<string>();
    return new Set(
      rows
        .filter((r) => r.contractor_id === contractor.id)
        .map((r) => String(r.contractor_job_id || "").trim())
        .filter(Boolean)
        .concat(manualClaimedJobIds)
    );
  }, [rows, contractor, manualClaimedJobIds]);

  // Доступные работы
  const availableRows = useMemo(() => {
    return rows.filter((r) => {
      const jobId = String(r.contractor_job_id || "").trim();
      if (jobId && claimedJobIds.has(jobId)) return false;
      if (r.contractor_id) return false;
      if (!isActiveWork(r)) return false;

      const code = (r.work_code || "").toUpperCase();
      if (code.startsWith("MAT-") || code.startsWith("KIT-")) return false;

      return true;
    });
  }, [rows, claimedJobIds]);

  // Мои работы
  const myRows = useMemo(() => {
    if (!contractor) return [];
    return rows.filter((r) => {
      if (r.contractor_id === contractor.id) return true;
      const jobId = String(r.contractor_job_id || "").trim();
      return !!jobId && claimedJobIds.has(jobId);
    });
  }, [rows, contractor, claimedJobIds]);
  const unifiedRows = useMemo(() => {
    const ownSet = new Set(myRows.map((r) => String(r.progress_id)));
    const availableOnly = availableRows.filter((r) => !ownSet.has(String(r.progress_id)));
    return [...myRows, ...availableOnly];
  }, [myRows, availableRows]);
  const openWorkInOneClick = useCallback(
    async (row: WorkRow) => {
      if (actingId || openingWorkRef.current) return;
      const rpcProgressId = pickWorkProgressRow(row);
      if (!looksLikeUuid(rpcProgressId)) {
        Alert.alert("Работа недоступна", "Для этого подряда пока нет активной рабочей строки.");
        return;
      }
      openingWorkRef.current = true;
      try {
        openWorkAddModal(row);
      } finally {
        openingWorkRef.current = false;
      }
    },
    [actingId, openWorkAddModal]
  );
  const groupedWorksByJob = useMemo(() => {
    const map = new Map<string, WorkRow[]>();
    for (const r of rows) {
      const jid = String(r.contractor_job_id || "").trim();
      if (!jid) continue;
      if (!map.has(jid)) map.set(jid, []);
      map.get(jid)!.push(r);
    }
    return map;
  }, [rows]);
  const otherRows = useMemo(
    () => unifiedRows.filter((r) => !String(r.contractor_job_id || "").trim()),
    [unifiedRows]
  );
  const jobCards = useMemo(() => {
    const cards: Array<{
      id: string;
      contractor: string;
      objectName: string;
      workType: string;
      qtyPlanned: number;
      uom: string;
      createdAt: string;
    }> = [];
    const used = new Set<string>();

    for (const s of subcontractCards) {
      const id = String(s.id || "").trim();
      if (!id) continue;
      used.add(id);
      cards.push({
        id,
        contractor: String(s.contractor_org || "").trim() || contractor?.company_name || profile?.company || "Подрядчик",
        objectName: toHumanObject(String(s.object_name || "").trim()),
        workType: toHumanWork(String(s.work_type || "").trim()),
        qtyPlanned: Number(s.qty_planned ?? 0) || 0,
        uom: String(s.uom || "").trim(),
        createdAt: String(s.created_at || ""),
      });
    }

    for (const [jid, rowsForJob] of groupedWorksByJob.entries()) {
      if (used.has(jid)) continue;
      const first = rowsForJob[0];
      const createdAt = String((first as any)?.created_at || "");
      cards.push({
        id: jid,
        contractor: contractor?.company_name || profile?.company || "Подрядчик",
        objectName: toHumanObject(first?.object_name),
        workType: toHumanWork(first?.work_name || first?.work_code),
        qtyPlanned: Number(first?.qty_planned ?? 0) || 0,
        uom: String(first?.uom_id || "").trim(),
        createdAt,
      });
    }

    return cards.sort((a, b) => {
      const ta = Date.parse(a.createdAt || "") || 0;
      const tb = Date.parse(b.createdAt || "") || 0;
      if (tb !== ta) return tb - ta;
      return b.id.localeCompare(a.id);
    });
  }, [subcontractCards, groupedWorksByJob, contractor, profile, toHumanObject, toHumanWork]);
  const selectedJobCard = useMemo(
    () => jobCards.find((j) => j.id === selectedSubcontractId) || null,
    [jobCards, selectedSubcontractId]
  );
  const selectedSubcontractRaw = useMemo(
    () =>
      subcontractCards.find((s) => String(s.id || "").trim() === String(selectedSubcontractId || "").trim()) || null,
    [subcontractCards, selectedSubcontractId]
  );
  const selectedJobWorks = useMemo(
    () => {
      const direct = selectedSubcontractId ? groupedWorksByJob.get(selectedSubcontractId) || [] : [];
      if (direct.length > 0) return direct;

      // Fallback only for UI visibility: if contractor_job_id wasn't propagated,
      // infer rows by approved subcontract object/work pair.
      if (!selectedSubcontractRaw) return direct;
      const norm = (v: any) =>
        String(v || "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, " ");
      const targetObject = norm(selectedSubcontractRaw.object_name);
      const targetWork = norm(selectedSubcontractRaw.work_type);
      if (!targetObject && !targetWork) return direct;

      const inferred = rows.filter((r) => {
        if (String(r.progress_id || "").startsWith("subcontract:")) return false;
        const rowObject = norm(r.object_name);
        const rowWork = norm(r.work_name || r.work_code);
        const byObject = !!targetObject && rowObject === targetObject;
        const byWork = !!targetWork && rowWork === targetWork;
        return byObject && byWork;
      });
      return inferred;
    },
    [groupedWorksByJob, selectedSubcontractId, selectedSubcontractRaw, rows]
  );
  const resolvedObjectName = pickFirstNonEmpty(workModalRow?.object_name, jobHeader?.object_name) || "";

  useFocusEffect(
  useCallback(() => {
    focusedRef.current = true;

    const now = Date.now();
    if (now - lastKickRef.current > 900) {
      lastKickRef.current = now;
      (async () => {
        await loadProfile();
        await loadContractor();
        await loadWorks();
      })();
    }

    return () => {
      focusedRef.current = false;
    };
  }, [loadProfile, loadContractor, loadWorks])
);


  if (loadingProfile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Загрузка профиля...</Text>
      </View>
    );
  }

  // ---- USER IS NOT CONTRACTOR в†’ SHOW CODE INPUT ----
  if (!profile?.is_contractor) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Подрядчик - вход</Text>

        <Text style={{ marginTop: 12, fontSize: 14 }}>
          Введите код доступа, который отправил директор:
        </Text>

        <TextInput
          placeholder="Например: A3F9-C8ZD"
          value={code}
          onChangeText={setCode}
          style={styles.input}
        />

        <Pressable
          onPress={activateCode}
          disabled={activating}
          style={styles.activateBtn}
        >
          <Text style={styles.activateText}>
            {activating ? "Проверяем..." : "Активировать"}
          </Text>
        </Pressable>
      </View>
    );
  }

  // ---- CONTRACTOR ACTIVE в†’ SHOW WORKS ----
  return (
    <View style={[styles.container, styles.homeContainer]}>
      <View pointerEvents="none" style={styles.homeGlow} />
      <View style={styles.homeHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <Text style={[styles.headerTitle, styles.homeHeaderTitle]}>
            {listMode === "home" ? "Подрядчик" : listMode === "subcontracts" ? "Подряды" : "Другие"}
          </Text>
          {listMode !== "home" ? (
            <Pressable
              style={styles.modeHeaderClose}
              onPress={() => {
                setListMode("home");
                setSelectedSubcontractId(null);
              }}
            >
              <Text style={styles.modeHeaderCloseText}>×</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {listMode === "home" ? (
        <View style={styles.modeHomeWrap}>
          <Pressable style={styles.modeBtn} onPress={() => setListMode("others")}>
            <Text style={styles.modeBtnText}>[ ДРУГИЕ ]</Text>
          </Pressable>
          <Pressable style={styles.modeBtn} onPress={() => setListMode("subcontracts")}>
            <Text style={styles.modeBtnText}>[ ПОДРЯДЫ ]</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1, marginTop: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || loadingWorks}
              onRefresh={async () => {
                setRefreshing(true);
                await loadProfile();
                await loadContractor();
                await loadWorks();
                setRefreshing(false);
              }}
            />
          }
        >
          {listMode === "subcontracts" ? (
            <View style={{ marginTop: 8 }}>
              {jobCards.length === 0 ? (
                <View style={[styles.card, styles.cardDark, styles.cardSeparated]}>
                  <Text style={styles.cardMetaDark}>Нет данных</Text>
                </View>
              ) : (
                jobCards.map((job) => {
                  return (
                    <View key={job.id} style={[styles.card, styles.cardDark, styles.cardSeparated]}>
                      <Pressable
                        onPress={() => {
                          setSelectedSubcontractId(job.id);
                        }}
                      >
                        <Text style={[styles.cardCompany, styles.cardCompanyDark]}>{job.contractor || "Подрядчик"}</Text>
                        <Text style={[styles.cardWork, styles.cardWorkDark]}>{job.workType || "Работа"}</Text>
                        <Text style={[styles.cardObject, styles.cardObjectDark]}>Объект: {job.objectName || "—"}</Text>
                        <Text style={[styles.cardMetaDark, { marginTop: 6, color: "#38BDF8", fontWeight: "700" }]}>
                          Открыть работы →
                        </Text>
                      </Pressable>
                    </View>
                  );
                })
              )}
            </View>
          ) : (
            <View style={{ marginTop: 8, marginBottom: 8 }}>
              {otherRows.length === 0 ? (
                <View style={[styles.card, styles.cardDark, styles.cardSeparated]}>
                  <Text style={styles.cardMetaDark}>Нет данных</Text>
                </View>
              ) : (
                otherRows.map((item) => {
                  const wid = String(item.progress_id);
                  return (
                    <View key={`other:${wid}`} style={[styles.card, styles.cardDark, styles.cardSeparated]}>
                      <Pressable
                        onPress={() => {
                          void openWorkInOneClick(item);
                        }}
                        style={({ pressed }) => [styles.workCardTap, pressed && styles.workCardTapPressed]}
                      >
                        <Text style={[styles.cardTitle, { color: "#F8FAFC" }]}>{toHumanWork(item.work_name || item.work_code)}</Text>
                        <Text style={styles.cardMetaDark}>Объект: {toHumanObject(item.object_name)}</Text>
                        <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "flex-end" }}>
                          <Ionicons name="chevron-forward" size={18} color="#38BDF8" />
                        </View>
                      </Pressable>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        visible={!!selectedSubcontractId}
        animationType="slide"
        onRequestClose={() => {
          setSelectedSubcontractId(null);
        }}
      >
        <View style={[styles.container, styles.homeContainer]}>
          <View pointerEvents="none" style={styles.homeGlow} />
          <View style={styles.homeHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.headerTitle, styles.homeHeaderTitle]} numberOfLines={1}>
                  {selectedJobCard?.contractor || "Подряд"}
                </Text>
                <Text style={{ color: "#94A3B8", marginTop: 2 }} numberOfLines={1}>
                  {(selectedJobCard?.workType || "Работа")} · {(selectedJobCard?.objectName || "—")}
                </Text>
              </View>
              <Pressable
                style={styles.modeHeaderClose}
                onPress={() => {
                  setSelectedSubcontractId(null);
                }}
              >
                <Text style={styles.modeHeaderCloseText}>×</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView style={{ flex: 1, marginTop: 12 }}>
            <View style={[styles.card, styles.cardDark, styles.cardSeparated]}>
              <Text style={[styles.cardCompany, styles.cardCompanyDark]}>
                {selectedJobCard?.contractor || "Подрядчик"}
              </Text>
              <Text style={[styles.cardWork, styles.cardWorkDark]}>
                {selectedJobCard?.workType || "Работа"}
              </Text>
              <Text style={[styles.cardObject, styles.cardObjectDark]}>
                Объект: {selectedJobCard?.objectName || "—"}
              </Text>
            </View>

            <View style={{ marginTop: 8, marginBottom: 8 }}>
              {selectedJobWorks.length === 0 ? (
                <View style={[styles.card, styles.cardDark, styles.cardSeparated]}>
                  <Text style={styles.cardMetaDark}>Нет данных</Text>
                </View>
              ) : (
                selectedJobWorks.map((item) => {
                  const wid = String(item.progress_id);
                  const isSynthetic = wid.startsWith("subcontract:");
                  return (
                    <View key={`sc:${selectedSubcontractId}:${wid}`} style={[styles.card, styles.cardDark, styles.cardSeparated]}>
                      <Pressable
                        onPress={() => {
                          if (isSynthetic) return;
                          void openWorkInOneClick(item);
                        }}
                        style={({ pressed }) => [
                          styles.workCardTap,
                          pressed && !isSynthetic && styles.workCardTapPressed,
                          isSynthetic && { opacity: 0.85 },
                        ]}
                      >
                        <Text style={[styles.cardTitle, { color: "#F8FAFC" }]}>{toHumanWork(item.work_name || item.work_code)}</Text>
                        <Text style={styles.cardMetaDark}>Объект: {toHumanObject(item.object_name)}</Text>
                        {isSynthetic ? (
                          <Text style={[styles.cardMetaDark, { marginTop: 8 }]}>
                            Работы по подряду появятся после первой утвержденной заявки.
                          </Text>
                        ) : (
                          <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "flex-end" }}>
                            <Ionicons name="chevron-forward" size={18} color="#38BDF8" />
                          </View>
                        )}
                      </Pressable>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ===== РњРћР”РђР›РљРђ Р¤РђРљРўРђ Р’Р«РџРћР›РќР•РќРРЇ (РР”Р•РќРўРР§РќРђРЇ РЎРљР›РђР”РЈ) ===== */}
      <Modal
        visible={workModalVisible}
        animationType="slide"
        onRequestClose={closeWorkModal}
      >
        <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
          <View style={{ padding: 16, paddingBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: "800" }}>
                Факт выполнения работы
              </Text>
              <Pressable
                onPress={() => setContractModalVisible(true)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "#cbd5e1",
                  backgroundColor: "#fff",
                }}
              >
                <Text style={{ color: "#334155", fontWeight: "700" }}>Договор</Text>
              </Pressable>
            </View>

            {workModalLoading && (
              <Text
                style={{
                  fontSize: 12,
                  color: "#94a3b8",
                  marginBottom: 4,
                }}
              >
                Загружаем историю и материалы...
              </Text>
            )}

            <View
              style={{
                backgroundColor: "#fff",
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                marginBottom: 8,
              }}
            >
              <Text style={{ fontSize: 11, color: "#334155" }}>
                {jobHeader?.contractor_org || "—"} · ИНН {jobHeader?.contractor_inn || "—"} · {jobHeader?.contractor_phone || "—"}
              </Text>
              <Text style={{ fontSize: 11, color: "#334155" }}>
                Договор {jobHeader?.contract_number || "—"} {jobHeader?.contract_date || ""} · {jobHeader?.contractor_rep || "—"}
              </Text>
              <Text style={{ fontSize: 11, color: "#334155" }}>
                Объект: {resolvedObjectName || "—"} · Зона/этаж: {jobHeader?.zone || "—"} / {jobHeader?.level_name || "—"} · Цена/ед: {jobHeader?.unit_price ?? "—"}
              </Text>
            </View>

            {workModalRow && (
              <View
                style={{
                  backgroundColor: "#fff",
                  padding: 10,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                }}
              >
                <Text
                  style={{
                    fontWeight: "800",
                    fontSize: 15,
                    marginBottom: 4,
                  }}
                >
                  {workModalRow.work_name ||
                    workModalRow.work_code ||
                    "Работа"}
                </Text>

                <Text style={{ color: resolvedObjectName ? "#475569" : "#dc2626", marginBottom: 4 }}>
                  <Text style={{ fontWeight: "600" }}>Объект: </Text>
                  {resolvedObjectName || "⚠ ОБЪЕКТ НЕ ПРИВЯЗАН! (сообщите прорабу)"}
                </Text>

              </View>
            )}
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 24,
            }}
          >
            {workModalRow && (
              <>
                <View style={{ marginTop: 8, marginBottom: 8, gap: 8 }}>
                  <Pressable
                    onPress={openActBuilder}
                    disabled={workModalSaving || loadingIssued}
                    style={{
                      width: "100%",
                      borderRadius: 10,
                      paddingVertical: 10,
                      backgroundColor: workModalSaving || loadingIssued ? "#94a3b8" : "#16a34a",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700" }}>
                      Сформировать акт выполненных работ
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={async () => {
                      if (!workModalRow) return;
                      try {
                        const { work, materials } = await loadAggregatedWorkSummary(
                          workModalRow.progress_id,
                          workModalRow
                        );
                        await generateWorkPdf(work, materials as any);
                      } catch (e) {
                        console.warn("[PDF aggregated] error", e);
                        showErr(e);
                      }
                    }}
                    style={{
                      width: "100%",
                      borderRadius: 10,
                      paddingVertical: 10,
                      backgroundColor: "#0ea5e9",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700" }}>Итоговый PDF</Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => setHistoryOpen((v) => !v)}
                  style={{
                    marginTop: 8,
                    marginBottom: 8,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    backgroundColor: "#fff",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ fontWeight: "700", color: "#334155" }}>История актов</Text>
                  <Ionicons name={historyOpen ? "chevron-down" : "chevron-forward"} size={18} color="#64748B" />
                </Pressable>
                {historyOpen && (
                <View
                  style={{
                    marginBottom: 8,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    backgroundColor: "#fff",
                    gap: 6,
                  }}
                >
                  {workLog.length === 0 && (
                    <Text style={{ color: "#94a3b8", fontSize: 12 }}>
                      Пока нет зафиксированных актов по этой работе.
                    </Text>
                  )}

                  {workLog.map((log) => {
                    const dt = new Date(
                      log.created_at
                    ).toLocaleString("ru-RU");
                    return (
                      <View
                        key={log.id}
                        style={{
                          paddingVertical: 6,
                          borderBottomWidth: 1,
                          borderColor: "#f1f5f9",
                        }}
                      >
                        <Text
                          style={{
                            fontWeight: "600",
                            color: "#0f172a",
                          }}
                        >
                          {dt} вЂў {log.qty}{" "}
                          {log.work_uom || workModalRow.uom_id || ""}
                        </Text>

                        {log.stage_note && (
                          <Text
                            style={{ color: "#64748b", fontSize: 12 }}
                          >
                            Этап: {log.stage_note}
                          </Text>
                        )}

                        {log.note && (
                          <Text
                            style={{ color: "#94a3b8", fontSize: 12 }}
                          >
                            Комментарий: {log.note}
                          </Text>
                        )}

                        {/* PDF РїРѕ РєРѕРЅРєСЂРµС‚РЅРѕРјСѓ Р°РєС‚Сѓ */}
                        <Pressable
                          onPress={async () => {
                            try {
                              const { data: mats } = await supabase
                                .from(
                                  "work_progress_log_materials" as any
                                )
                                .select("mat_code, uom_mat, qty_fact")
                                .eq("log_id", log.id);

                              const codes =
                                (mats || []).map(
                                  (m: any) => m.mat_code
                                ) || [];
                              let namesMap: Record<
                                string,
                                { name: string; uom: string | null }
                              > = {};

                              if (codes.length) {
                                const ci = await supabase
                                  .from("catalog_items" as any)
                                  .select(
                                    "rik_code, name_human_ru, name_human, uom_code"
                                  )
                                  .in("rik_code", codes);

                                if (!ci.error && Array.isArray(ci.data)) {
                                  for (const n of ci.data as any[]) {
                                    namesMap[n.rik_code] = {
                                      name:
                                        n.name_human_ru ||
                                        n.name_human ||
                                        n.rik_code,
                                      uom: n.uom_code,
                                    };
                                  }
                                }
                              }

                              const matsRows: WorkMaterialRow[] = (
                                (mats as any[]) || []
                              ).map((m: any) => {
                                const code = String(m.mat_code);
                                const meta = namesMap[code];
                                return {
                                  mat_code: code,
                                  name: meta?.name || code,
                                  uom: meta?.uom || m.uom_mat || "",
                                  available: 0,
                                  qty_fact: Number(m.qty_fact ?? 0),
                                } as any as WorkMaterialRow;
                              });

                              const actWork: WorkRow = {
                                ...workModalRow,
                                qty_done: log.qty,
                                qty_left: Math.max(
                                  0,
                                  (workModalRow.qty_planned || 0) - log.qty
                                ),
                              };

                              await generateWorkPdf(
                                actWork,
                                matsRows as any,
                                {
                                  actDate: log.created_at,
                                }
                              );
                            } catch (e) {
                              showErr(e);
                            }
                          }}
                          style={{
                            alignSelf: "flex-start",
                            marginTop: 4,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: "#e2e8f0",
                          }}
                        >
                          <Text style={{ fontSize: 12 }}>PDF этого акта</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
                )}

                <Pressable
                  onPress={() => setIssuedOpen((v) => !v)}
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    backgroundColor: "#fff",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ fontWeight: "700", color: "#334155" }}>Выдано со склада</Text>
                  <Ionicons name={issuedOpen ? "chevron-down" : "chevron-forward"} size={18} color="#64748B" />
                </Pressable>
                {issuedOpen && (
                  <View style={{ marginTop: 8, marginBottom: 8 }}>
                    {loadingIssued && <ActivityIndicator size="small" />}
                    {!loadingIssued && linkedReqCards.length > 0 && (
                      <View style={{ marginBottom: 8 }}>
                        {linkedReqCards.map((card) => (
                          <View
                            key={card.request_id}
                            style={{
                              backgroundColor: "#f8fafc",
                              borderWidth: 1,
                              borderColor: "#e2e8f0",
                              borderRadius: 10,
                              padding: 10,
                              marginBottom: 6,
                            }}
                          >
                            <Text style={{ fontWeight: "700", color: "#0f172a" }}>
                              {card.req_no}
                            </Text>
                            <Text style={{ marginTop: 2, fontSize: 12, color: "#64748b" }}>
                              Статус: {card.status || "—"}
                            </Text>
                            <Text style={{ marginTop: 2, fontSize: 12, color: "#64748b" }}>
                              Выдачи: {card.issue_nos.length ? card.issue_nos.join(", ") : "еще не выдано"}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {!loadingIssued && issuedItems.length === 0 && (
                      <Text style={{ color: "#94a3b8", fontSize: 12 }}>
                        По этой работе сегодня выдачи не было
                      </Text>
                    )}
                    {!loadingIssued && !!issuedHint && (
                      <Text style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                        {issuedHint}
                      </Text>
                    )}
                    {issuedItems.map((it) => (
                      <View
                        key={it.issue_item_id}
                        style={{
                          backgroundColor: "#fff",
                          borderWidth: 1,
                          borderColor: "#e2e8f0",
                          borderRadius: 10,
                          padding: 10,
                          marginBottom: 6,
                        }}
                      >
                        <Text style={{ fontWeight: "700", color: "#0f172a" }}>{it.title}</Text>
                        <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                          Выдано: {Number(it.qty || 0).toLocaleString("ru-RU")} {it.unit || "—"} · Осталось:{" "}
                          {Number(it.qty_left || 0).toLocaleString("ru-RU")} {it.unit || "—"}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <Pressable
                  onPress={() => setEstimateModalVisible(true)}
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    backgroundColor: "#fff",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ fontWeight: "700", color: "#334155" }}>Смета / сопутствующие позиции</Text>
                  <Ionicons name="chevron-forward" size={18} color="#64748B" />
                </Pressable>

                <View style={{ height: 24 }} />
              </>
            )}
          </ScrollView>

          <Pressable
            onPress={closeWorkModal}
            style={{ paddingVertical: 10, alignItems: "center" }}
          >
            <Text style={{ color: "#64748b", fontWeight: "600" }}>
              Закрыть
            </Text>
          </Pressable>
        </View>
      </Modal>

      <Modal
        visible={actBuilderVisible}
        animationType="slide"
        onRequestClose={() => setActBuilderVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
          <View style={{ padding: 16, paddingBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 18, fontWeight: "800" }}>Формирование акта</Text>
              <Pressable
                onPress={() => setActBuilderVisible(false)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "#cbd5e1",
                  backgroundColor: "#fff",
                }}
              >
                <Text style={{ color: "#334155", fontWeight: "700" }}>Закрыть</Text>
              </Pressable>
            </View>

            <View
              style={{
                marginTop: 10,
                backgroundColor: "#fff",
                borderWidth: 1,
                borderColor: "#e2e8f0",
                borderRadius: 12,
                padding: 10,
                gap: 2,
              }}
            >
              <Text style={{ fontSize: 12, color: "#334155" }}>
                {jobHeader?.contractor_org || "—"} · ИНН {jobHeader?.contractor_inn || "—"} · {jobHeader?.contractor_phone || "—"}
              </Text>
              <Text style={{ fontSize: 12, color: "#334155" }}>
                Договор {jobHeader?.contract_number || "—"} от {jobHeader?.contract_date || "—"}
              </Text>
              <Text style={{ fontSize: 12, color: "#334155" }}>
                Объект: {resolvedObjectName || "—"} · Зона/этаж: {jobHeader?.zone || "—"} / {jobHeader?.level_name || "—"}
              </Text>
              <Text style={{ fontSize: 12, color: "#334155" }}>
                Цена/ед: {jobHeader?.unit_price == null ? "—" : Number(jobHeader.unit_price).toLocaleString("ru-RU")} · Дата акта: {new Date().toLocaleDateString("ru-RU")}
              </Text>
              <Text style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: "700" }}>
                Работы по подряду
              </Text>
              {actBuilderWorks.length === 0 ? (
                <Text style={{ fontSize: 12, color: "#94a3b8" }}>Нет работ для выбора</Text>
              ) : (
                actBuilderWorks.map((w, idx) => (
                  <View
                    key={w.id}
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 4 }}
                  >
                    <Text style={{ flex: 1, fontSize: 12, color: "#334155" }}>{w.name}</Text>
                    <Pressable
                      onPress={() =>
                        setActBuilderWorks((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, include: !p.include } : p))
                        )
                      }
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 8,
                        backgroundColor: w.include ? "#16a34a" : "#e2e8f0",
                      }}
                    >
                      <Text style={{ color: w.include ? "#fff" : "#334155", fontWeight: "700" }}>
                        {w.include ? "✓" : "○"}
                      </Text>
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}>
            <Text style={{ color: "#334155", fontSize: 12, marginBottom: 4 }}>
              Работы выбрано: {actBuilderSelectedWorkCount}
            </Text>
            <Text style={{ color: "#334155", fontSize: 12, marginBottom: 8 }}>
              Материалов выбрано: {actBuilderSelectedMatCount}
            </Text>
            <Text style={{ fontWeight: "700", color: "#334155", marginBottom: 8 }}>Материалы со склада</Text>
            {actBuilderItems.length === 0 ? (
              <View style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 12 }}>
                <Text style={{ color: "#94a3b8" }}>Нет позиций для акта.</Text>
              </View>
            ) : (
              actBuilderItems.map((it, idx) => {
                const sum = it.price == null ? null : Number(it.qty || 0) * Number(it.price || 0);
                return (
                  <View
                    key={it.id}
                    style={{
                      backgroundColor: "#fff",
                      borderWidth: 1,
                      borderColor: "#e2e8f0",
                      borderRadius: 12,
                      padding: 10,
                      marginBottom: 8,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <Text style={{ flex: 1, fontWeight: "700", color: "#0f172a" }}>{it.name}</Text>
                      <Pressable
                        onPress={() =>
                          setActBuilderItems((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, include: !p.include } : p))
                          )
                        }
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 8,
                          backgroundColor: it.include ? "#16a34a" : "#e2e8f0",
                        }}
                      >
                        <Text style={{ color: it.include ? "#fff" : "#334155", fontWeight: "700" }}>
                          {it.include ? "✓" : "○"}
                        </Text>
                      </Pressable>
                    </View>
                    <Text style={{ marginTop: 2, color: "#64748b", fontSize: 12 }}>
                      {it.uom || "—"} · Выдано: {Number(it.issuedQty || 0).toLocaleString("ru-RU")}
                    </Text>
                    <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Pressable
                        onPress={() =>
                          setActBuilderItems((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, qty: Math.max(0, Number(p.qty || 0) - 1) } : p))
                          )
                        }
                        style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#e2e8f0", alignItems: "center", justifyContent: "center" }}
                      >
                        <Text style={{ fontSize: 18, fontWeight: "700", color: "#0f172a" }}>−</Text>
                      </Pressable>
                      <Text style={{ minWidth: 72, textAlign: "center", fontWeight: "700", color: "#0f172a" }}>
                        {Number(it.qty || 0).toLocaleString("ru-RU")}
                      </Text>
                      <Pressable
                        onPress={() =>
                          setActBuilderItems((prev) =>
                            prev.map((p, i) =>
                              i === idx ? { ...p, qty: Math.min(Number(p.qtyMax || 0), Number(p.qty || 0) + 1) } : p
                            )
                          )
                        }
                        style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#e2e8f0", alignItems: "center", justifyContent: "center" }}
                      >
                        <Text style={{ fontSize: 18, fontWeight: "700", color: "#0f172a" }}>+</Text>
                      </Pressable>
                      <View style={{ flex: 1 }} />
                      <TextInput
                        value={it.price == null ? "" : String(it.price)}
                        onChangeText={(txt) => {
                          const num = Number(String(txt).replace(",", "."));
                          setActBuilderItems((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, price: Number.isFinite(num) ? num : null } : p))
                          );
                        }}
                        keyboardType="numeric"
                        placeholder="Цена"
                        style={{
                          width: 86,
                          borderWidth: 1,
                          borderColor: "#e2e8f0",
                          borderRadius: 8,
                          paddingHorizontal: 8,
                          paddingVertical: 6,
                          backgroundColor: "#fff",
                        }}
                      />
                    </View>
                    <Text style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>
                      Сумма: {sum == null ? "—" : Number(sum).toLocaleString("ru-RU")}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={{ borderTopWidth: 1, borderColor: "#e5e7eb", padding: 12 }}>
            <Pressable
              onPress={submitActBuilder}
              disabled={actBuilderSaving}
              style={{
                width: "100%",
                borderRadius: 10,
                paddingVertical: 12,
                backgroundColor: actBuilderSaving ? "#94a3b8" : "#16a34a",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                {actBuilderSaving ? "Формирую..." : "Сформировать акт (PDF)"}
              </Text>
            </Pressable>
            {!actBuilderHasSelected && (
              <Text style={{ marginTop: 6, color: "#94a3b8", fontSize: 12, textAlign: "center" }}>
                Выберите хотя бы одну позицию
              </Text>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={contractModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setContractModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(15,23,42,0.45)",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <View
            style={{
              maxHeight: "80%",
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <Text style={{ fontWeight: "800", fontSize: 16, marginBottom: 10 }}>Детали договора</Text>
            <ScrollView>
              <Text>Организация: {jobHeader?.contractor_org || "—"}</Text>
              <Text>ИНН: {jobHeader?.contractor_inn || "—"}</Text>
              <Text>Телефон: {jobHeader?.contractor_phone || "—"}</Text>
              <Text>Договор №: {jobHeader?.contract_number || "—"} от {jobHeader?.contract_date || "—"}</Text>
              <Text>Объект: {resolvedObjectName || "—"}</Text>
              <Text>Работа: {jobHeader?.work_type || workModalRow?.work_name || "—"} · Зона/этаж: {jobHeader?.zone || "—"} / {jobHeader?.level_name || "—"}</Text>
              <Text>
                Цена/ед: {jobHeader?.unit_price == null ? "—" : Number(jobHeader.unit_price).toLocaleString("ru-RU")}
                {" · "}Сумма: {jobHeader?.total_price == null ? "—" : Number(jobHeader.total_price).toLocaleString("ru-RU")}
              </Text>
              <Text>Сроки: {jobHeader?.date_start || "—"} — {jobHeader?.date_end || "—"}</Text>
            </ScrollView>
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 10 }}>
              <Pressable
                onPress={() => setContractModalVisible(false)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#cbd5e1",
                }}
              >
                <Text style={{ color: "#334155", fontWeight: "600" }}>Закрыть</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={estimateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEstimateModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(15,23,42,0.45)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              maxHeight: "85%",
              backgroundColor: "#fff",
              borderTopLeftRadius: 14,
              borderTopRightRadius: 14,
              padding: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ fontWeight: "800", fontSize: 16 }}>Смета / сопутствующие позиции</Text>
              <Pressable onPress={() => setEstimateModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </Pressable>
            </View>

            <WorkMaterialsEditor
              rows={workModalMaterials}
              onChange={(nextRows) => setWorkModalMaterials(nextRows)}
              onAdd={() => setWorkSearchVisible(true)}
              onRemove={(idx) =>
                setWorkModalMaterials((prev) => prev.filter((_, i) => i !== idx))
              }
              readOnly={workModalReadOnly}
            />

            {workSearchVisible && !workModalReadOnly && (
              <View
                style={{
                  marginTop: 10,
                  padding: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                  backgroundColor: "#fff",
                  gap: 8,
                }}
              >
                <Text style={{ fontWeight: "600" }}>Поиск материала по каталогу</Text>
                <TextInput
                  value={workSearchQuery}
                  onChangeText={handleWorkSearchChange}
                  placeholder="Поиск по названию/коду..."
                  style={{
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                  }}
                />
                <FlatList
                  data={workSearchResults}
                  keyExtractor={(m: any) => m.mat_code}
                  style={{ maxHeight: 220 }}
                  renderItem={({ item }: any) => {
                    const hasStock = (item.available || 0) > 0;
                    return (
                      <Pressable
                        onPress={() => addWorkMaterial(item as WorkMaterialRow)}
                        style={{
                          paddingVertical: 8,
                          borderBottomWidth: 1,
                          borderColor: "#f1f5f9",
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: "600", color: "#0f172a" }} numberOfLines={2}>
                            {item.name}
                          </Text>
                          <Text style={{ color: "#64748b", marginTop: 2 }}>{item.uom || "—"}</Text>
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: hasStock ? "#166534" : "#6b7280" }}>
                          {hasStock ? `доступно ${item.available}` : "нет в наличии"}
                        </Text>
                      </Pressable>
                    );
                  }}
                  ListEmptyComponent={<Text style={{ color: "#94a3b8" }}>Введите минимум 2 символа для поиска.</Text>}
                />
                <Pressable
                  onPress={() => {
                    setWorkSearchVisible(false);
                    setWorkSearchQuery("");
                    setWorkSearchResults([]);
                  }}
                  style={{
                    alignSelf: "flex-end",
                    marginTop: 4,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                  }}
                >
                  <Text>Закрыть поиск</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* РњРћР”РђР›РљРђ Р’Р«Р‘РћР Рђ Р­РўРђРџРђ */}
      <Modal
        visible={workStagePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setWorkStagePickerVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              padding: 16,
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              maxHeight: "60%",
            }}
          >
            <Text
              style={{
                fontWeight: "800",
                fontSize: 16,
                marginBottom: 8,
              }}
            >
              Выбор этапа работы
            </Text>

            <FlatList
              data={workStageOptions}
              keyExtractor={(s, index) => `${s.code}-${index}`}
              style={{ maxHeight: "80%" }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setWorkModalStage(item.name);
                    setWorkStagePickerVisible(false);
                  }}
                  style={{
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderColor: "#f1f5f9",
                  }}
                >
                  <Text style={{ fontWeight: "600" }}>{item.name}</Text>
                  <Text style={{ color: "#9ca3af", fontSize: 12 }}>
                    {item.code}
                  </Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={{ color: "#64748b" }}>
                  Этапы еще не настроены. Добавь строки в таблицу
                  work_stages.
                </Text>
              }
            />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                marginTop: 8,
              }}
            >
              <Pressable
                onPress={() => setWorkStagePickerVisible(false)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                }}
              >
                <Text>Закрыть</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ---- STYLES ----
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: UI.bg },
  homeContainer: {
    backgroundColor: "#071124",
  },
  homeGlow: {
    position: "absolute",
    left: -80,
    right: -80,
    top: -120,
    height: 260,
    backgroundColor: "rgba(34,197,94,0.10)",
    borderBottomLeftRadius: 260,
    borderBottomRightRadius: 260,
    opacity: 0.9,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  title: { fontSize: 20, fontWeight: "800", color: UI.text, marginBottom: 12 },

  input: {
    marginTop: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 10,
    backgroundColor: "#fff",
  },

  activateBtn: {
    marginTop: 20,
    backgroundColor: UI.accent,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  activateText: { color: "#fff", fontWeight: "700" },

  header: { paddingBottom: 6, borderBottomWidth: 1, borderColor: UI.border },
  headerTitle: { fontSize: 20, fontWeight: "800", color: UI.text },
  homeHeader: {
    marginHorizontal: -16,
    marginTop: -16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "#0B1324",
  },
  homeHeaderTitle: {
    color: "#F8FAFC",
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 34,
  },

  segmentWrapper: { marginTop: 14 },
  segmentTrack: {
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    padding: 3,
    overflow: "hidden",
  },
  segmentRow: { flexDirection: "row" },
  segmentTab: { flex: 1, paddingVertical: 10, alignItems: "center" },
  segmentText: { fontWeight: "700", color: "#64748B" },
  segmentActive: { color: "#000" },
  segmentThumb: {
    position: "absolute",
    top: 3,
    bottom: 3,
    borderRadius: 999,
    backgroundColor: "#fff",
    elevation: 2,
  },
  modeHomeWrap: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 14,
    paddingTop: 56,
  },
  modeBtn: {
    width: "100%",
    maxWidth: 370,
    height: 78,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#121A2A",
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  modeBtnText: {
    fontSize: 38,
    lineHeight: 42,
    fontWeight: "900",
    color: "#F8FAFC",
  },
  modeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modeHeaderTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#F8FAFC",
  },
  modeHeaderClose: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  modeHeaderCloseText: {
    fontSize: 24,
    lineHeight: 24,
    fontWeight: "900",
    color: "#F8FAFC",
  },

  card: {
    marginTop: 10,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI.border,
  },
  cardSeparated: {
    marginBottom: 12,
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardDark: {
    backgroundColor: "#0F172A",
    borderColor: "rgba(255,255,255,0.14)",
  },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardCompany: { fontSize: 20, fontWeight: "800", color: UI.text },
  cardWork: { fontSize: 13, color: "#0F172A", marginTop: 4 },
  cardObject: { fontSize: 13, color: UI.sub, marginTop: 4 },
  cardCompanyDark: { color: "#F8FAFC" },
  cardWorkDark: { color: "rgba(248,250,252,0.85)" },
  cardObjectDark: { color: "rgba(226,232,240,0.9)" },
  cardMetaDark: { fontSize: 13, color: "rgba(226,232,240,0.9)", marginTop: 2 },
  cardStatsRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginTop: 6 },
  cardProgressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
    marginTop: 8,
  },
  cardProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#0EA5E9",
  },
  cardMeta: { fontSize: 13, color: UI.sub, marginTop: 2 },
  workCardTap: {
    borderRadius: 10,
    padding: 2,
  },
  workCardTapPressed: {
    opacity: 0.72,
  },

  takeBtn: {
    marginTop: 10,
    backgroundColor: UI.btnTake,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  takeText: { color: "#fff", fontWeight: "700" },
});

