// app/(tabs)/warehouse.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Modal,
} from "react-native";

import { supabase } from "../../src/lib/supabaseClient";


import {
  WorkMaterialsEditor,
  WorkMaterialRow,
} from "../../src/components/WorkMaterialsEditor";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { webOpenPdfWindow, webWritePdfWindow, webDownloadHtml } from "../../src/lib/rik_api";



/** ========= типы ========= */
type IncomingRow = {
  incoming_id: string;
  purchase_id: string;
  incoming_status: string;
  po_no: string | null;
  purchase_status: string | null;
  purchase_created_at: string | null;
  confirmed_at: string | null;
  qty_expected_sum: number;
  qty_received_sum: number;
  qty_left_sum: number;
  items_cnt: number;
};

type ItemRow = {
  incoming_item_id: string | null;      // у виртуалок null
  purchase_item_id: string;             // всегда есть
  code: string | null;
  name: string;
  uom: string | null;
  qty_expected: number;
  qty_received: number;
  sort_key: number;
};

type HistoryRow = {
  event_dt: string;
  event_type: string; // 'RECEIPT' | 'ISSUE'
  purchase_id?: string | null;
  code?: string | null;
  uom_id?: string | null;
  qty?: number | null;
  meta?: any;
};

type CatalogItem = {
  ref_table: "rik_materials" | "rik_works" | string;
  ref_id: string;
  code: string | null;
  name: string;
  unit_id: string | null;
  sector: string | null;
  score?: number | null;
};

type RikSearchRow = {
  kind: "material" | "work";
  ref_table: "rik_materials" | "rik_works";
  ref_id: string;
  code: string;
  name: string;
  unit_id: string | null;
  unit_label?: string | null;
  sector: string | null;
  search_text?: string | null;
};

type InvSession = {
  id: string;
  object_id: string | null;
  started_at: string;
  finished_at: string | null;
  status: string;
  comment: string | null;
};


type WorkRow = {
  progress_id: string;
  purchase_item_id: string;
  purchase_id: string | null;
  proposal_id: string | null;
  object_id: string | null;
  object_name?: string | null;
  work_code: string | null;
  work_name: string | null;
  uom_id: string | null;
  qty_planned: number;
  qty_done: number;
  qty_left: number;
  work_status: string;
  started_at: string | null;
  finished_at: string | null;
};

type WorkLogRow = {
  id: string;
  created_at: string;
  qty: number;
  work_uom: string | null;
  stage_note: string | null;
  note: string | null;
};

type Option = { id: string; label: string };

type Tab =
  | "К приходу"
  | "Склад факт"
  | "Работы"
  | "Расход"
  | "История"
  | "Инвентаризация"
  | "Отчёты";

const TABS: Tab[] = [
  "К приходу",
  "Склад факт",
  "Работы",
  "Расход",
  "История",
  "Инвентаризация",
  "Отчёты",
];

/** ========= утилиты ========= */
const nz = (v: any, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const showErr = (e: any) =>
  Alert.alert(
    "Ошибка",
    String(e?.message || e?.error_description || e?.hint || e || "Неизвестная ошибка"),
  );
const pickErr = (e: any) =>
  String(e?.message || e?.error_description || e?.hint || JSON.stringify(e));
const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();

// ПАРСЕР КОЛИЧЕСТВА ДЛЯ ИНПУТА: пусто → остаток; понимает запятую
const parseQty = (s: string | undefined | null, left: number) => {
  if (s == null || String(s).trim() === "") return Math.max(0, left);
  const t = String(s).replace(",", ".").replace(/\s+/g, "").trim();
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, Math.max(0, left));
};

// Универсальный парсер чисел из БД
const parseNum = (v: any, d = 0): number => {
  if (v == null) return d;
  const s = String(v).trim();
  if (s === "") return d;
  const cleaned = s.replace(/[^\d,\.\-]+/g, "").replace(",", ".").replace(/\s+/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : d;
};
// нормализация UOM из БД: null/"" -> null
const pickUom = (v: any): string | null => {
  const s = v == null ? "" : String(v).trim();
  return s !== "" ? s : null;
};
// ===== timeout wrapper (чтобы UI не зависал навсегда) =====
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let t: any;
  const timeout = new Promise<T>((_, reject) => {
    t = setTimeout(() => reject(new Error(`Timeout ${ms}ms: ${label}`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(t));
}


// Проверка на UUID
const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(s),
  );

// определить тип по rik-коду: работа / материал / услуга
const detectKindLabel = (code?: string | null): string | null => {
  if (!code) return null;
  const c = String(code).toUpperCase();

  // работы
  if (c.startsWith("WRK-") || c.startsWith("WORK-") || c.startsWith("WT-")) {
    return "работа";
  }

  // услуги
  if (c.startsWith("SRV-") || c.startsWith("SPEC-")) {
    return "услуга";
  }

  // материалы
  if (c.startsWith("MAT-")) {
    return "материал";
  }

  return null;
};

// определить unit_id по code
const resolveUnitIdByCode = async (code: string): Promise<string | null> => {
  try {
    const m = await supabase
      .from("rik_materials" as any)
      .select("unit_id")
      .eq("mat_code", code)
      .maybeSingle();
    if (!m.error && m.data?.unit_id) return String(m.data.unit_id);

    const w = await supabase
      .from("rik_works" as any)
      .select("unit_id")
      .eq("code", code)
      .maybeSingle();
    if (!w.error && w.data?.unit_id) return String(w.data.unit_id);

    return null;
  } catch {
    return null;
  }
};

/* ===== PDF по факту работы (акт) ===== */
async function generateWorkPdf(
  work: WorkRow | null,
  materials: WorkMaterialRow[],
  opts?: { actDate?: string | Date; webWindow?: Window | null },
) {
  if (!work) return;

  try {
    const dt = opts?.actDate ? new Date(opts.actDate) : new Date();
    const dateStr = dt.toLocaleDateString("ru-RU");
    const timeStr = dt.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const objectName = work.object_name || "Объект не указан";
    const workName = work.work_name || work.work_code || "Работа";
    const actNo = work.progress_id.slice(0, 8);

   const workUrl = `https://app.goxbuild.com/work/${work.progress_id}`;
const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
  workUrl,
)}`;

const isWeb = Platform.OS === "web";
const qrBlock = isWeb
  ? `<div style="font-size:9px;color:#555">
       QR отключён на WEB (чтобы быстрее). Ссылка:
       <a href="${workUrl}" target="_blank">${workUrl}</a>
     </div>`
  : `<img src="${qrUrl}" alt="QR" />`;


    const materialsRowsHtml = materials
      .map(
        (m, index) => `
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
          <td style="border:1px solid #000; padding:4px;"></td>
        </tr>
      `,
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
        <!-- ШАПКА АКТА -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
          <div>
            <div class="bold">Акт выполнения работ № ${actNo}</div>
            <div>Дата: ${dateStr} ${timeStr}</div>
          </div>
          <div style="text-align:right; font-size:10px;">
            <div>Приложение к договору подряда</div>
            <div>Форма условно по КС-2 / ГОСТ</div>
          </div>
        </div>

        <div style="margin-bottom:8px;">
          <div><span class="bold">Объект:</span> ${objectName}</div>
          <div><span class="bold">Работа:</span> ${workName}</div>
        </div>

        <!-- Сводка по объёму -->
        <table style="margin-top:6px; margin-bottom:12px;">
          <tr>
            <td class="bold">Плановый объём:</td>
            <td>${work.qty_planned} ${work.uom_id || ""}</td>
          </tr>
          <tr>
            <td class="bold">Выполнено по акту:</td>
            <td>${work.qty_done} ${work.uom_id || ""}</td>
          </tr>
          <tr>
            <td class="bold">Остаток по плану:</td>
            <td>${work.qty_left} ${work.uom_id || ""}</td>
          </tr>
        </table>

        <!-- Таблица материалов -->
        <div class="bold" style="margin-top:10px; margin-bottom:4px;">
          Использованные материалы (по факту)
        </div>
        <table>
          <tr>
            <th style="border:1px solid #000; padding:4px; width:5%;">№</th>
            <th style="border:1px solid #000; padding:4px;">Наименование</th>
            <th style="border:1px solid #000; padding:4px; width:10%;">Ед.</th>
            <th style="border:1px solid #000; padding:4px; width:15%;">Количество</th>
            <th style="border:1px solid #000; padding:4px; width:20%;">Примечание</th>
          </tr>
          ${
            materialsRowsHtml ||
            `
          <tr>
            <td colspan="5" style="border:1px solid #000; padding:4px; text-align:center;">
              Материалы по факту не указаны
            </td>
          </tr>`
          }
        </table>

        <!-- Подписи -->
        <div style="margin-top:24px;">
          <table style="width:100%;">
            <tr>
              <td style="width:33%; padding:4px;">Прораб</td>
              <td style="width:33%; padding:4px; border-bottom:1px solid #000;">&nbsp;</td>
              <td style="width:34%; padding:4px;">(ФИО, подпись)</td>
            </tr>
            <tr>
              <td style="padding:4px;">Мастер/Бригадир</td>
              <td style="padding:4px; border-bottom:1px solid #000;">&nbsp;</td>
              <td style="padding:4px;">(ФИО, подпись)</td>
            </tr>
            <tr>
              <td style="padding:4px;">Представитель заказчика</td>
              <td style="padding:4px; border-bottom:1px solid #000;">&nbsp;</td>
              <td style="padding:4px;">(ФИО, подпись)</td>
            </tr>
          </table>
        </div>

        <!-- QR-код и служебная инфа -->
        <div style="margin-top:16px; display:flex; justify-content:space-between; align-items:flex-end;">
          <div style="font-size:9px; color:#555;">
            Сформировано в системе GOX BUILD<br/>
            ID работы: ${work.progress_id}
          </div>
          <div style="text-align:right;">
            <div style="font-size:9px; margin-bottom:4px;">QR для проверки акта</div>
            ${qrBlock}

          </div>
        </div>
      </body>
    </html>
    `;

if (Platform.OS === "web") {
  // ✅ если окно открылось — пишем туда
  if (opts?.webWindow && !opts.webWindow.closed) {
    webWritePdfWindow(opts.webWindow, html);
    return;
  }

  webDownloadHtml(html, `act_${work.progress_id.slice(0, 8)}`);

  return;
}


    // MOBILE: печать + PDF + share + upload
    await Print.printAsync({ html });

    const { uri } = await Print.printToFileAsync({ html });

    try {
      await Sharing.shareAsync(uri);
    } catch (e) {
      console.warn("[generateWorkPdf] shareAsync error", e);
    }

    try {
      const bucket = "work-pdfs";
      const fileName = `work-${work.progress_id}-${Date.now()}.pdf`;

      const resp = await fetch(uri);
      const blob = await resp.blob();

      const uploadRes = await supabase.storage.from(bucket).upload(fileName, blob, {
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
  } catch (e: any) {
    console.warn("[generateWorkPdf] general error", e);
    Alert.alert("Ошибка PDF", String(e?.message || e));
  }
}

/* ===== Свод по работе: все акты + материалы ===== */
async function loadAggregatedWorkSummary(
  progressId: string,
  baseWork: WorkRow,
  logs?: Array<{ id: string; qty: number }>
): Promise<{ work: WorkRow; materials: WorkMaterialRow[] }> {

  // ✅ если логи уже есть (workLog) — НЕ трогаем work_progress_log второй раз
  let logRows = logs ?? [];

  if (!logRows.length) {
    const logsQ = await withTimeout(
      supabase
        .from("work_progress_log" as any)
        .select("id, qty")
        .eq("progress_id", progressId),
      15000, // ✅ увеличили (на всякий)
      "work_progress_log select",
    );

    if (logsQ.error || !Array.isArray(logsQ.data) || logsQ.data.length === 0) {
      return { work: baseWork, materials: [] };
    }

    logRows = (logsQ.data as any[]).map((l) => ({
      id: String(l.id),
      qty: Number(l.qty ?? 0),
    }));
  }

  const logIds = logRows.map((l) => l.id);
  const totalQty = logRows.reduce((sum, l) => sum + Number(l.qty ?? 0), 0);

 // ✅ Вместо N запросов по одному log_id — 1..N батчей через IN()
let allMats: any[] = [];

const BATCH = 200; // можно 100..500
for (let i = 0; i < logIds.length; i += BATCH) {
  const chunk = logIds.slice(i, i + BATCH);

  const q = await withTimeout(
    supabase
      .from("work_progress_log_materials" as any)
      .select("log_id, mat_code, uom_mat, qty_fact")
      .in("log_id", chunk),
    15000, // ✅ увеличили, потому что это уже “тяжёлый” запрос
    `work_progress_log_materials select batch ${i}-${i + chunk.length}`,
  );

  if (q.error) throw q.error;
  if (Array.isArray(q.data)) allMats.push(...q.data);
}

const matsQ = { data: allMats, error: null as any };



  let aggregated: WorkMaterialRow[] = [];

  if (!matsQ.error && Array.isArray(matsQ.data) && matsQ.data.length > 0) {
    const aggMap = new Map<string, { mat_code: string; uom: string; qty: number }>();

    for (const m of matsQ.data as any[]) {
      const code = m.mat_code ? String(m.mat_code) : "";
      if (!code) continue;
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
      const ci = await withTimeout(
        supabase
          .from("catalog_items" as any)
          .select("rik_code, name_human_ru, name_human, uom_code")
          .in("rik_code", codes),
        15000,
        "catalog_items select",
      );

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
      } as WorkMaterialRow;
    });
  }

  const work: WorkRow = {
    ...baseWork,
    qty_done: totalQty,
    qty_left: Math.max(0, baseWork.qty_planned - totalQty),
  };

  return { work, materials: aggregated };
}
/** ========= экран ========= */
export default function Warehouse() {
    const [tab, setTab] = useState<Tab>("К приходу");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
const pdfWindowRef = React.useRef<Window | null>(null);

  /** ===== К ПРИХОДУ ===== */
  const [toReceive, setToReceive] = useState<IncomingRow[]>([]);
  const [recvFilter, setRecvFilter] =
    useState<"pending" | "partial" | "confirmed">("pending");
  const [countPending, setCountPending] = useState(0);
  const [countConfirmed, setCountConfirmed] = useState(0);
  const [countPartial, setCountPartial] = useState(0);
const [toReceivePending, setToReceivePending] = useState<IncomingRow[]>([]);
const [toReceivePartial, setToReceivePartial] = useState<IncomingRow[]>([]);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // карта алиасов p:<pid> -> <real_incoming_id>
  const [headIdAlias, setHeadIdAlias] = useState<Record<string, string>>({});

  // раскрытая шапка
  const [expanded, setExpanded] = useState<string | null>(null);
  const [itemsByHead, setItemsByHead] = useState<Record<string, ItemRow[]>>({});
  const [qtyInputByItem, setQtyInputByItem] = useState<Record<string, string>>({});
  const [receivingHeadId, setReceivingHeadId] = useState<string | null>(null);
  // ===== PDF lock (WEB) =====
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfBusyLogId, setPdfBusyLogId] = useState<string | null>(null);

  // helper: канонический id
  const canonId = useCallback(
    (id: string) => headIdAlias[id] ?? id,
    [headIdAlias],
  );

 const fetchToReceive = useCallback(async () => {
  try {
    const q = await supabase
      .from("v_wh_incoming_heads_ui" as any)
      .select("*")
      .order("purchase_created_at", { ascending: false });

    if (q.error || !Array.isArray(q.data)) {
      console.warn("[warehouse] v_wh_incoming_heads_ui error:", q.error?.message);
      setToReceive([]);
      setToReceivePending([]);
      setToReceivePartial([]);
      setCountPending(0);
      setCountPartial(0);
      setCountConfirmed(0);
      return;
    }

    const rows: IncomingRow[] = (q.data as any[]).map((x) => ({
      incoming_id: String(x.incoming_id),
      purchase_id: String(x.purchase_id),
      incoming_status: String(x.incoming_status ?? "pending"),
      po_no: x.po_no ?? null,
      purchase_status: x.purchase_status ?? null,
      purchase_created_at: x.purchase_created_at ?? null,
      confirmed_at: x.confirmed_at ?? null,
      qty_expected_sum: nz(x.qty_expected_sum, 0),
      qty_received_sum: nz(x.qty_received_sum, 0),
      qty_left_sum: nz(x.qty_left_sum, 0),
      items_cnt: Number(x.items_cnt ?? 0),
    }));

    const pending: IncomingRow[] = [];
    const partial: IncomingRow[] = [];

    for (const r of rows) {
      const exp = nz(r.qty_expected_sum, 0);
      const rec = nz(r.qty_received_sum, 0);
      const left = nz(r.qty_left_sum, Math.max(0, exp - rec));

      // закрытые не показываем
      if (left <= 0) continue;

      if (rec > 0) partial.push(r);
      else pending.push(r);
    }

    setToReceivePending(pending);
    setToReceivePartial(partial);
    setCountPending(pending.length);
    setCountPartial(partial.length);
    setCountConfirmed(0);

    // ✅ ВАЖНО: toReceive зависит ТОЛЬКО от recvFilter
    setToReceive(recvFilter === "partial" ? partial : pending);
  } catch (e) {
    console.warn("[warehouse] fetchToReceive throw:", e);
    setToReceive([]);
    setToReceivePending([]);
    setToReceivePartial([]);
    setCountPending(0);
    setCountPartial(0);
    setCountConfirmed(0);
  }
}, [recvFilter]);

 // ✅ ВОТ СЮДА ВСТАВИТЬ:
useEffect(() => {
  setToReceive(recvFilter === "partial" ? toReceivePartial : toReceivePending);
}, [recvFilter, toReceivePending, toReceivePartial]);
  /** ===== ОСТАТКИ ===== */
  const [stock, setStock] = useState<StockRow[]>([]);
  const [stockSupported, setStockSupported] = useState<null | boolean>(null);

  const stockMaterialsByCode = useMemo(() => {
    const map = new Map<string, StockRow>();

    for (const row of stock) {
      

      const key = row.material_id; // строго

      if (!key) continue;

      const exist = map.get(key);
      if (!exist) {
        map.set(key, { ...row });
      } else {
        exist.qty_on_hand = nz(exist.qty_on_hand, 0) + nz(row.qty_on_hand, 0);
        exist.qty_reserved =
          nz(exist.qty_reserved, 0) + nz(row.qty_reserved, 0);
        exist.qty_available =
          nz(exist.qty_available, 0) + nz(row.qty_available, 0);
      }
    }

    return Array.from(map.values());
  }, [stock]);

  const getAvailableByCode = useCallback(
    (code: string): number => {
      const row = stock.find((s) => s.code === code);
      if (!row) return 0;
      const onHand = nz(row.qty_on_hand, 0);
      const reserved = nz(row.qty_reserved, 0);
      const avail = nz(
        row.qty_available ?? onHand - reserved,
        0,
      );
      return avail;
    },
    [stock],
  );

  const fetchStock = useCallback(async () => {
    try {
      const fact = await supabase
        .from("v_warehouse_fact" as any)
        .select("*")
        .limit(5000);

      if (!fact.error && Array.isArray(fact.data)) {

        const rows = (fact.data || []).map(
  (x: any) =>
    ({
      material_id: String(x.material_id ?? ""),   // ✅ строго ID
      code: x.code ?? null,
      name: x.name ?? x.name_human ?? x.name_human_ru ?? null,

      uom_id:
        pickUom(x.uom_id) ??
        pickUom(x.uom) ??
        pickUom(x.uom_code) ??
        pickUom(x.unit) ??
        pickUom(x.unit_id) ??
        null,

      qty_on_hand: nz(x.qty_on_hand, 0),
      qty_reserved: nz(x.qty_reserved, 0),
      qty_available: nz(
        x.qty_available ?? nz(x.qty_on_hand, 0) - nz(x.qty_reserved, 0),
        0,
      ),
      object_name: x.object_name ?? null,
      warehouse_name: x.warehouse_name ?? null,
      updated_at: x.updated_at ?? null,
    } as StockRow),
);

        setStock(rows);
        setStockSupported(true);
        return;
      }

      const rpcNames = [
        { fn: "list_stock", args: {} },
        { fn: "warehouse_list_stock", args: {} },
        { fn: "list_warehouse_stock", args: {} },
        { fn: "acc_list_stock", args: {} },
      ] as const;

      for (const r of rpcNames) {
        const res = await supabase.rpc(r.fn as any, r.args as any);
        if (!res.error && Array.isArray(res.data)) {
          const rows = (res.data || []).map(
            (x: any) =>
              ({
                material_id: String(x.material_id ?? x.id ?? x.code ?? ""),
                code: x.code ?? x.mat_code ?? null,
                uom_id:
  pickUom(x.uom_id) ??
  pickUom(x.uom) ??
  pickUom(x.uom_code) ??
  pickUom(x.unit) ??
  pickUom(x.unit_id) ??
  null,

name: (x.name ?? x.name_human ?? x.name_human_ru ?? null),

                qty_on_hand: nz(x.qty_on_hand ?? x.on_hand, 0),
                qty_reserved: nz(x.qty_reserved ?? x.reserved, 0),
                qty_available: nz(
                  x.qty_available ??
                    x.available ??
                    nz(x.qty_on_hand) - nz(x.qty_reserved),
                  0,
                ),
                object_name: x.object_name ?? null,
                warehouse_name: x.warehouse_name ?? null,
                updated_at: x.updated_at ?? null,
              } as StockRow),
          );
          setStock(rows);
          setStockSupported(true);
          return;
        }
      }

      const v = await supabase
        .from("v_warehouse_stock" as any)
        .select("*")
        .limit(2000);

      if (!v.error && Array.isArray(v.data)) {
        const rows = (v.data || []).map(
          (x: any) =>
            ({
              material_id: String(x.code ?? ""),
              code: x.code ?? null,
              name: x.name ?? null,
              uom_id:
  pickUom(x.uom_id) ??
  pickUom(x.uom) ??
  pickUom(x.uom_code) ??
  pickUom(x.unit) ??
  pickUom(x.unit_id),

              qty_on_hand: nz(x.qty_on_hand, 0),
              qty_reserved: nz(x.qty_reserved, 0),
              qty_available: nz(
                x.qty_available ?? nz(x.qty_on_hand) - nz(x.qty_reserved),
                0,
              ),
              object_name: null,
              warehouse_name: null,
              updated_at: x.updated_at ?? null,
            } as StockRow),
        );
        setStock(rows);
        setStockSupported(true);
        return;
      }

      setStockSupported(false);
      setStock([]);
    } catch (e) {
      console.warn("[fetchStock]", e);
      setStockSupported(false);
      setStock([]);
    }
  }, []);

  /** ===== РАСХОД ===== */
  const [uoms, setUoms] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [catalog, setCatalog] = useState<RikSearchRow[]>([]);
  const [allCatalog, setAllCatalog] = useState<RikSearchRow[]>([]);
  const [availability, setAvailability] = useState<Record<string, number>>({});
  const [qtyToIssue, setQtyToIssue] = useState<string>("1");
  const [objectList, setObjectList] = useState<Option[]>([]);
  const [workTypeList, setWorkTypeList] = useState<Option[]>([]);
  const [recipientList, setRecipientList] = useState<Option[]>([]);
  const [pickModal, setPickModal] = useState<{
    what: "object" | "work" | "recipient" | null;
  }>({ what: null });
  const [pickFilter, setPickFilter] = useState("");
  const [objectOpt, setObjectOpt] = useState<Option | null>(null);
  const [workTypeOpt, setWorkTypeOpt] = useState<Option | null>(null);
  const [recipientOpt, setRecipientOpt] = useState<Option | null>(null);
  const [issueBusy, setIssueBusy] = useState(false);
  const [issueMsg, setIssueMsg] = useState<{
    kind: "error" | "ok" | null;
    text: string;
  }>({ kind: null, text: "" });

  const loadUoms = useCallback(async () => {
  try {
    // 1) сначала самый безопасный набор
    let q = await supabase
      .from("rik_uoms" as any)
      .select("uom_code, name_ru")
      .limit(2000);

    // 2) если name_ru тоже нет — пробуем name
    if (q.error) {
      q = await supabase
        .from("rik_uoms" as any)
        .select("uom_code, name")
        .limit(2000);
    }

    // 3) если есть какая-то “короткая” колонка — пробуем (на случай другой схемы)
    if (q.error) {
      q = await supabase
        .from("rik_uoms" as any)
        .select("uom_code, title")
        .limit(2000);
    }

    if (q.error || !Array.isArray(q.data)) {
      console.warn("[loadUoms] error:", q.error?.message);
      return;
    }

    const map: Record<string, string> = {};
    for (const r of q.data as any[]) {
      const code = String(r.uom_code ?? "").trim();
      if (!code) continue;

      const label = String(r.name_ru ?? r.name ?? r.title ?? code).trim();
      map[code] = label || code;
    }
    setUoms(map);
  } catch (e) {
    console.warn("[loadUoms] throw:", e);
  }
}, []);

useEffect(() => {
  // UOM нужен для: "Склад факт" (подписи остатков) и "Расход"
  if (tab === "Склад факт" || tab === "Расход") {
    loadUoms();
  }
}, [tab, loadUoms]);
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

  const loadObjects = useCallback(async () => {
    const opts = await tryOptions("objects", ["id", "name"]);
    setObjectList(opts);
  }, [tryOptions]);

  const loadWorkTypes = useCallback(async () => {
    const opts = await tryOptions("rik_works", ["id", "name"]);
    setWorkTypeList(opts);
  }, [tryOptions]);

  const loadRecipients = useCallback(async () => {
    const opts = await tryOptions("profiles", ["id", "full_name"]);
    setRecipientList(opts);
  }, [tryOptions]);

  const normalizeToRikRow = useCallback(
    (x: CatalogItem): RikSearchRow => {
      const kind: "material" | "work" =
        x.ref_table === "rik_works" ? "work" : "material";
      return {
        kind,
        ref_table: x.ref_table as any,
        ref_id: String(x.ref_id ?? ""),
        code: String(x.code ?? ""),
        name: String(x.name ?? x.code ?? ""),
        unit_id: x.unit_id ? String(x.unit_id) : null,
        unit_label: x.unit_id
          ? uoms[String(x.unit_id)] ?? String(x.unit_id)
          : null,
        sector: x.sector ?? null,
      };
    },
    [uoms],
  );

  const mapRikItemsRow = (x: any): RikSearchRow => {
    const rc = String(x.code ?? x.code ?? "");
    const nm = String(x.name ?? x.name ?? rc);
    const kind: "material" | "work" =
      String(x.kind ?? "").toLowerCase() === "work" ? "work" : "material";
    return {
      kind,
      ref_table: kind === "work" ? "rik_works" : "rik_materials",
      ref_id: String(x.ref_id ?? ""),
      code: rc,
      name: nm,
      unit_id: null,
      unit_label: x.uom_code ?? x.uom ?? null,
      sector: x.sector ?? x.sector_code ?? null,
    };
  };

  function refreshAvailability(rows: RikSearchRow[]) {
    (async () => {
      try {
        let map: Record<string, number> = {};

        const v = await supabase
          .from("v_warehouse_stock" as any)
          .select("rik_code, uom_id, qty_on_hand, qty_reserved")
          .limit(10000);

        if (!v.error && Array.isArray(v.data)) {
          for (const x of v.data as any[]) {
            const code = String(x.rik_code ?? "");
            const avail = nz(x.qty_on_hand, 0) - nz(x.qty_reserved, 0);
            if (code) map[code] = avail;
          }
        } else {
          const t = await supabase
            .from("stock_balances" as any)
            .select("code, uom_id, qty_on_hand, qty_reserved")
            .limit(10000);
          if (!t.error && Array.isArray(t.data)) {
            for (const x of t.data as any[]) {
              const code = String(x.code ?? "");
              const avail = nz(x.qty_on_hand, 0) - nz(x.qty_reserved, 0);
              if (code) map[code] = avail;
            }
          }
        }

        const filtered: Record<string, number> = {};
        for (const it of rows) {
          filtered[it.code] = map[it.code] ?? 0;
        }
        setAvailability(filtered);
      } catch (e) {
        console.warn("[refreshAvailability]", e);
      }
    })();
  }

  const preloadCatalogAll = useCallback(async () => {
    try {
      const seen = new Set<string>();
      const merged: RikSearchRow[] = [];

      const pushUnique = (rows: RikSearchRow[]) => {
        for (const r of rows) {
          if (!r.code) continue;
          if (seen.has(r.code)) continue;
          seen.add(r.code);
          merged.push(r);
        }
      };

      try {
        const cat = await supabase
          .from("catalog_items" as any)
          .select(
            "id, rik_code, kind, name_human, name_human_ru, uom_code, sector_code, name_search",
          )
          .limit(10000);

        if (!cat.error && Array.isArray(cat.data)) {
          const rows = (cat.data as any[])
            .map((x) => {
              const code = String(x.rik_code ?? "").trim();
              if (!code) return null;

              const name = String(
                x.name_human_ru ?? x.name_human ?? code,
              );

              const unitId = x.uom_code ? String(x.uom_code) : null;
              const sector = x.sector_code ? String(x.sector_code) : null;

              const kind: "material" | "work" =
                String(x.kind ?? "").toLowerCase() === "work"
                  ? "work"
                  : "material";

              const ci: CatalogItem = {
                ref_table: kind === "work" ? "rik_works" : "rik_materials",
                ref_id: String(x.id ?? code),
                code,
                name,
                unit_id: unitId,
                sector,
                score: null,
              };

              const row = normalizeToRikRow(ci) as RikSearchRow;
              const searchPieces = [name, code, x.name_search]
                .filter(Boolean)
                .map((s: any) => String(s));
              row.search_text = searchPieces.join(" ");

              return row;
            })
            .filter(Boolean) as RikSearchRow[];

          pushUnique(rows);
        } else if (cat.error) {
          console.warn("[catalog_items] error:", cat.error.message, cat.error.code);
        }
      } catch (e) {
        console.warn("[catalog_items] throw:", e);
      }

      const stockView = await supabase
        .from("v_warehouse_fact" as any)
        .select("code,name,uom_id")
        .limit(5000);

      if (!stockView.error && Array.isArray(stockView.data)) {
        const rows = (stockView.data as any[]).map((x) => {
          const code = String(x.code ?? "");
          const name = String(x.name ?? x.code ?? "");
          const unitId = x.uom_id ? String(x.uom_id) : null;

          const kind: "material" | "work" =
            code.startsWith("WRK-") || code.startsWith("WT-")
              ? "work"
              : "material";

          return {
            kind,
            ref_table: kind === "work" ? "rik_works" : "rik_materials",
            ref_id: code,
            code,
            name,
            unit_id: unitId,
            unit_label: unitId,
            sector: null,
          } as RikSearchRow;
        });
        pushUnique(rows);
      }

      setAllCatalog(merged);
      setCatalog(merged);
      refreshAvailability(merged);
    } catch (e) {
      console.warn("[catalog preload]", e);
    }
  }, [normalizeToRikRow]);

  const runCatalogSearch = useCallback(
    async (q: string) => {
      const s = norm(q);

      if (!s || s.length < 2) {
        setCatalog([]);
        setAvailability({});
        return;
      }

      try {
        const { data, error } = await supabase.rpc("catalog_search" as any, {
          p_query: q,
          p_kind: null,
        } as any);

        if (error) {
          console.warn("[runCatalogSearch] catalog_search error:", error.message);
          setCatalog([]);
          setAvailability({});
          return;
        }
        if (!Array.isArray(data)) {
          setCatalog([]);
          setAvailability({});
          return;
        }

        const availMap: Record<string, number> = {};

        const rows: RikSearchRow[] = (data as any[]).map((x) => {
          const code = String(x.rik_code ?? "").trim();
          if (!code) return null;

          const name = String(
            x.name_human_ru ?? x.name_human ?? code,
          );

          const unitId = x.uom_code ? String(x.uom_code) : null;

          const kind: "material" | "work" =
            String(x.kind ?? "").toLowerCase() === "work"
              ? "work"
              : "material";

          const qtyAvail = Number(x.qty_available ?? 0);
          if (Number.isFinite(qtyAvail)) {
            availMap[code] = qtyAvail;
          }

          const ci: CatalogItem = {
            ref_table: kind === "work" ? "rik_works" : "rik_materials",
            ref_id: code,
            code,
            name,
            unit_id: unitId,
            sector: null,
            score: null,
          };

          const row = normalizeToRikRow(ci) as RikSearchRow;
          row.search_text = `${name} ${code}`;
          return row;
        }).filter(Boolean) as RikSearchRow[];

        setCatalog(rows);
        setAvailability(availMap);
      } catch (e: any) {
        console.warn("[runCatalogSearch] throw:", e?.message || e);
        setCatalog([]);
        setAvailability({});
      }
    },
    [normalizeToRikRow],
  );

  useEffect(() => {
    if (tab === "Расход") {
      setSearch("");
      loadObjects().catch(() => {});
      loadWorkTypes().catch(() => {});
      loadRecipients().catch(() => {});
    }
  }, [tab, loadObjects, loadWorkTypes, loadRecipients]);

  const issueOne = useCallback(
    async (it: RikSearchRow) => {
      try {
        const qty = nz(qtyToIssue, 0);
        const canIssue = qty > 0 && !!recipientOpt?.id && !!objectOpt?.id;

        if (!canIssue) {
          setIssueMsg({
            kind: "error",
            text: "Выберите объект и получателя и введите количество > 0",
          });
          return;
        }

        setIssueBusy(true);
        setIssueMsg({ kind: null, text: "" });

        let unitId = it.unit_id;
        if (!unitId) {
          unitId = await resolveUnitIdByCode(it.code);
          if (!unitId) {
            setIssueMsg({
              kind: "error",
              text: "Не удалось определить ед. изм. (unit_id) — проверь справочник.",
            });
            return;
          }
        }

        const r1 = await supabase.rpc("acc_issue_create" as any, {
          p_object_id: objectOpt?.id ?? null,
          p_work_type_id: workTypeOpt?.id ?? null,
          p_comment: `Выдача ${it.name} (${it.code}) ${qty} ${
            it.unit_label ?? ""
          } — ${recipientOpt?.label ?? ""}`,
        } as any);

        if (r1.error || !r1.data) {
          console.warn("[acc_issue_create] err:", r1.error?.message, r1.error);
          setIssueMsg({
            kind: "error",
            text: `acc_issue_create: ${pickErr(r1.error)}`,
          });
          return;
        }
        const issue_id = r1.data;

        const r2 = await supabase.rpc("acc_issue_add_item" as any, {
          p_issue_id: issue_id,
          p_rik_code: it.code,
          p_uom_id: unitId,
          p_qty: qty,
        } as any);

        if (r2.error) {
          console.warn("[acc_issue_add_item] err:", r2.error?.message, r2.error);
          setIssueMsg({
            kind: "error",
            text: `acc_issue_add_item: ${pickErr(r2.error)}`,
          });
          return;
        }

        await fetchStock();

        setIssueMsg({
          kind: "ok",
          text: `✓ Выдано: ${qty} ${it.unit_label ?? unitId} — ${it.name}`,
        });
      } catch (e: any) {
        console.warn("[issueOne] throw:", e?.message || e);
        setIssueMsg({ kind: "error", text: String(e?.message ?? e) });
      } finally {
        setIssueBusy(false);
      }
    },
    [qtyToIssue, recipientOpt, objectOpt, workTypeOpt, fetchStock],
  );

  /** ===== РАБОТЫ ===== */
  const [works, setWorks] = useState<WorkRow[]>([]);
  const [worksSupported, setWorksSupported] = useState<null | boolean>(null);
  const [worksBusyId, setWorksBusyId] = useState<string | null>(null);
  const [finishDialog, setFinishDialog] = useState<{
    row: WorkRow;
    message: string;
  } | null>(null);

  // модалка по работам
  const [workModalVisible, setWorkModalVisible] = useState(false);
  const [workModalRow, setWorkModalRow] = useState<WorkRow | null>(null);
  const [workModalQty, setWorkModalQty] = useState("");
  const [workModalStage, setWorkModalStage] = useState("");
  const [workModalComment, setWorkModalComment] = useState("");
  const [workModalMaterials, setWorkModalMaterials] = useState<WorkMaterialRow[]>(
    [],
  );
  const [workModalSaving, setWorkModalSaving] = useState(false);
  const [workModalLocation, setWorkModalLocation] = useState("");
  const [workModalReadOnly, setWorkModalReadOnly] = useState(false);
  const [workModalLoading, setWorkModalLoading] = useState(false);
  const [workLog, setWorkLog] = useState<WorkLogRow[]>([]);

  // история прогрессов по работе
  const loadWorkLog = useCallback(async (progressId: string) => {
    try {
      const { data, error } = await supabase
        .from("work_progress_log" as any)
        .select("id, created_at, qty, work_uom, stage_note, note")
        .eq("progress_id", progressId)
        .order("created_at", { ascending: true });

      if (!error && Array.isArray(data)) {
        setWorkLog(
          data.map((r: any) => ({
            id: String(r.id),
            created_at: r.created_at,
            qty: Number(r.qty ?? 0),
            work_uom: r.work_uom ?? null,
            stage_note: r.stage_note ?? null,
            note: r.note ?? null,
          })),
        );
      } else {
        setWorkLog([]);
      }
    } catch (e) {
      console.warn("[loadWorkLog] error", e);
      setWorkLog([]);
    }
  }, []);

  // список этапов
  const [workStageOptions, setWorkStageOptions] = useState<
    { code: string; name: string }[]
  >([]);
  const [workStagePickerVisible, setWorkStagePickerVisible] =
    useState(false);

  const [workSearchVisible, setWorkSearchVisible] = useState(false);
  const [workSearchQuery, setWorkSearchQuery] = useState("");
  const [workSearchResults, setWorkSearchResults] = useState<
    WorkMaterialRow[]
  >([]);
  const workSearchActiveQuery = React.useRef<string>("");

  const fetchWorks = useCallback(async () => {
    try {
      const q = await supabase
        .from("v_works_fact" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5000);

      if (q.error || !Array.isArray(q.data)) {
        console.warn("[fetchWorks] error:", q.error?.message);
        setWorks([]);
        setWorksSupported(false);
        return;
      }

      const rows: WorkRow[] = (q.data as any[]).map((x) => ({
        progress_id: String(x.progress_id),
        purchase_item_id: String(x.purchase_item_id),
        purchase_id: x.purchase_id ? String(x.purchase_id) : null,
        proposal_id: x.proposal_id ? String(x.proposal_id) : null,
        object_id: x.object_id ? String(x.object_id) : null,
        object_name: x.object_name ?? null,
        work_code: x.work_code ?? null,
        work_name: x.work_name ?? null,
        uom_id:
  pickUom(x.uom_id) ??
  pickUom(x.uom) ??
  pickUom(x.uom_code) ??
  pickUom(x.unit) ??
  pickUom(x.unit_id),

        qty_planned: Number(x.qty_planned ?? 0),
        qty_done: Number(x.qty_done ?? 0),
        qty_left: Number(x.qty_left ?? 0),
        work_status: String(x.work_status ?? "К запуску"),
        started_at: x.started_at ?? null,
        finished_at: x.finished_at ?? null,
      }));

      const filtered = rows.filter((w) => {
        if (!w.work_code) return false;
        const c = w.work_code.toUpperCase();
        return (
          c.startsWith("WRK-") ||
          c.startsWith("WORK-") ||
          c.startsWith("WT-") ||
          c.startsWith("SRV-") ||
          c.startsWith("SPEC-")
        );
      });

      // подгрузим имена объектов, если пустые
      for (const w of filtered) {
        if (!w.object_name && w.object_id) {
          try {
            const o = await supabase
              .from("objects" as any)
              .select("name")
              .eq("id", w.object_id)
              .maybeSingle();
            if (!o.error && o.data?.name) {
              w.object_name = String(o.data.name);
            }
          } catch {}
        }
      }

      setWorks(filtered);
      setWorksSupported(true);
    } catch (e) {
      console.warn("[fetchWorks] throw:", (e as any)?.message ?? e);
      setWorks([]);
      setWorksSupported(false);
    }
  }, []);

  const handleWorkStart = useCallback(
    async (row: WorkRow) => {
      try {
        setWorksBusyId(row.progress_id);
        const r = await supabase.rpc("work_start" as any, {
          p_progress_id: row.progress_id,
        } as any);
        if (r.error) throw r.error;
        await fetchWorks();
      } catch (e) {
        showErr(e);
      } finally {
        setWorksBusyId(null);
      }
    },
    [fetchWorks],
  );

  const handleWorkFinish = useCallback((row: WorkRow) => {
    const total = nz(row.qty_planned, 0);
    const done = nz(row.qty_done, 0);
    const left = nz(row.qty_left, total - done);

    if (done <= 0) {
      Alert.alert(
        "Работа не выполнена",
        "Нельзя завершить работу с нулевым объёмом. Сначала внеси факт через «+ объём».",
      );
      return;
    }

    const message =
      left > 0
        ? `По этой работе ещё остался план (${left} ${
            row.uom_id || ""
          }).\n\nПосле нажатия «Окончено»:\n• будет сформирован итоговый акт по всем этапам\n• ввод объёма и материалов будет заблокирован\n\nПроверь, что все данные введены верно.`
        : `Плановый объём выполнен на 100%.\n\nПосле нажатия «Окончено»:\n• будет сформирован итоговый акт по всем этапам\n• изменить объём и материалы уже нельзя\n\nЗакрыть работу окончательно?`;

    setFinishDialog({ row, message });
  }, []);

  const confirmFinishWork = useCallback(async () => {
    if (!finishDialog) return;
    const row = finishDialog.row;

    try {
      setWorksBusyId(row.progress_id);

      const r = await supabase.rpc("work_finish" as any, {
        p_progress_id: row.progress_id,
      } as any);
      if (r.error) throw r.error;

      await fetchWorks();

      try {
        const { work, materials } = await loadAggregatedWorkSummary(
          row.progress_id,
          row,
        );
        await generateWorkPdf(work, materials);
      } catch (e) {
        console.warn("[confirmFinishWork] PDF error", e);
      }

      setFinishDialog(null);
      Alert.alert(
        "Работа закрыта",
        "Итоговый акт сформирован. Ввод новых данных по этой работе больше недоступен.",
      );
    } catch (e) {
      showErr(e);
    } finally {
      setWorksBusyId(null);
    }
  }, [finishDialog, fetchWorks]);

  const submitWorkProgress = useCallback(
    async (withStock: boolean) => {
      if (!workModalRow) return;

      if (workModalRow.qty_left <= 0) {
        Alert.alert(
          "Работа завершена",
          "Плановый объём выполнен полностью. Для дополнительного объёма сначала увеличь план в смете.",
        );
        return;
      }

      const qtyNum = Number(String(workModalQty).replace(",", "."));
      if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
        Alert.alert("Объём", "Введи выполненный объём > 0");
        return;
      }

      const left = Number(workModalRow.qty_left ?? 0);
      if (left <= 0) {
        Alert.alert("План закрыт", "По этой работе уже нет остатка по плану.");
        return;
      }

      if (qtyNum > left) {
        Alert.alert(
          "Объём больше остатка",
          `Осталось по плану максимум ${left} ${workModalRow.uom_id || ""}.`,
        );
        return;
      }

      const materialsPayload = workModalMaterials
        .map((m) => {
          const raw = (m as any).qty_fact ?? (m as any).qty ?? 0;
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

        const payload: any = {
          p_progress_id: workModalRow.progress_id,
          p_qty: qtyNum,
          p_work_uom: workModalRow.uom_id || "",
          p_stage_note: workModalStage || null,
          p_note: workModalComment || null,
          p_materials: materialsPayload,
          p_with_stock: withStock,
          p_location: workModalLocation || null,
        };
        const { data, error } = await supabase.rpc(
          "work_progress_apply_ui" as any,
          payload,
        );
       
        if (error) {
          Alert.alert("Ошибка сохранения факта", pickErr(error));
          return;
        }

        const updatedWork: WorkRow = {
          ...workModalRow,
          qty_done: workModalRow.qty_done + qtyNum,
          qty_left: Math.max(0, workModalRow.qty_left - qtyNum),
        };

        await generateWorkPdf(updatedWork, workModalMaterials);

        Alert.alert("Готово", "Факт по работе сохранён.");
        setWorkModalVisible(false);
        await fetchWorks();
      } catch (e: any) {
        console.warn("[submitWorkProgress] exception:", e);
        showErr(e);
      } finally {
        setWorkModalSaving(false);
      }
    },
    [
      workModalRow,
      workModalQty,
      workModalStage,
      workModalComment,
      workModalMaterials,
      workModalLocation,
      fetchWorks,
    ],
  );

  // ⚡️ НОВАЯ БЫСТРАЯ openWorkAddModal — модалка открывается сразу
  const openWorkAddModal = useCallback(
    (row: WorkRow, readOnly: boolean = false) => {
      // базовые поля
      setWorkModalRow(row);
      setWorkModalQty("");
      setWorkModalStage("");
      setWorkModalComment("");
      setWorkModalLocation("");
      setWorkModalReadOnly(readOnly);

      // очистка
      setWorkLog([]);
      setWorkModalMaterials([]);
      setWorkStageOptions([]);
      setWorkSearchVisible(false);
      setWorkSearchQuery("");
      setWorkSearchResults([]);

      // сразу показать модалку
      setWorkModalVisible(true);
      setWorkModalLoading(true);

      // дальше грузим фоном
      (async () => {
        try {
          // история
          await loadWorkLog(row.progress_id);

          if (!readOnly) {
            setWorkModalMaterials([]);

            try {
              const lastLogQ = await supabase
                .from("work_progress_log" as any)
                .select("id, qty, work_uom, stage_note, note")
                .eq("progress_id", row.progress_id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              let restoredMaterials: WorkMaterialRow[] = [];

              if (!lastLogQ.error && lastLogQ.data?.id) {
                const logId = String(lastLogQ.data.id);

                const matsQ = await withTimeout(
  supabase
    .from("work_progress_log_materials" as any)
    .select("mat_code, uom_mat, qty_fact")
    .eq("log_id", logId),
  15000,
  `work_progress_log_materials restore for last log ${logId}`,
);

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
                      .select("rik_code, name_human_ru, name_human, uom_code")
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
                    } as WorkMaterialRow;
                  });
                }
              }

              if (restoredMaterials.length) {
                setWorkModalMaterials(restoredMaterials);
              } else {
                const workCode = row.work_code || row.purchase_item_id;

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
                      { p_work_code: workCode } as any,
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
                        seed.error.message,
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
                          "rik_code, name_human_ru, name_human, uom_code",
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
                      };
                    });

                    setWorkModalMaterials(mats);
                  }
                }
              }
            } catch (e) {
              console.warn("[openWorkAddModal] materials error:", e);
            }
          }

          // этапы
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
                })),
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
    [loadWorkLog],
  );

  // debounce helper
  function debounce<F extends (...args: any[]) => any>(fn: F, delay: number) {
    let timer: any;
    return (...args: Parameters<F>) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  // RPC-поиск материалов
  const runMaterialSearch = useCallback(async (q: string) => {
    try {
      const { data, error } = await supabase.rpc("catalog_search" as any, {
        p_query: q,
        p_kind: "material",
      } as any);

      if (workSearchActiveQuery.current !== q) return;

      if (error) {
        console.warn(
          "[material_search/catalog_search] error:",
          error.message,
        );
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
        };
      });

      mapped.sort((a, b) => {
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
        e?.message || e,
      );
    }
  }, []);

  const debouncedMaterialSearch = React.useRef(
    debounce((q: string) => {
      runMaterialSearch(q);
    }, 300),
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
    [debouncedMaterialSearch],
  );

    // ===== Добавить материал из поиска в список факта =====
  const addWorkMaterial = useCallback((item: WorkMaterialRow) => {
    setWorkModalMaterials((prev) => {
      // если такой код уже есть — не дублируем строку, просто обновляем
      const idx = prev.findIndex((m) => m.mat_code === item.mat_code);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          name: item.name,
          uom: item.uom,
          available: item.available,
        };
        return copy;
      }

      // новый материал
      return [...prev, item];
    });

    // закрываем модалку поиска и чистим запрос/результаты
    setWorkSearchVisible(false);
    setWorkSearchQuery("");
    setWorkSearchResults([]);
  }, []);

  // удалить материал из списка "по факту"
  const removeWorkMaterial = useCallback((index: number) => {
    setWorkModalMaterials((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const closeWorkModal = useCallback(() => {
    setWorkSearchVisible(false);
    setWorkSearchQuery("");
    setWorkSearchResults([]);
    setWorkModalVisible(false);
  }, []);
const confirmIncoming = useCallback(
    async (whIncomingId: string) => {
      try {
        setConfirmingId(whIncomingId);

        // 1) основная логика прихода
        const r = await supabase.rpc("wh_receive_confirm" as any, {
          p_wh_id: whIncomingId,
        } as any);

        // 2) узнаём purchase_id
        let pid: string | null = null;
        try {
          const q = await supabase
            .from("wh_incoming" as any)
            .select("purchase_id")
            .eq("id", whIncomingId)
            .maybeSingle();
          if (!q.error && q.data?.purchase_id) {
            pid = String(q.data.purchase_id);
          }
        } catch (e) {
          console.warn("[confirmIncoming] purchase_id lookup err:", e);
        }

        // 3) если RPC упал — руками статус закупки
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

        // 4) если знаем purchase_id — сеем работы из закупки
        if (pid) {
          try {
            const seed = await supabase.rpc("work_seed_from_purchase" as any, {
              p_purchase_id: pid,
            } as any);
            if (seed.error) {
              console.warn(
                "[confirmIncoming][work_seed_from_purchase] error:",
                seed.error.message,
              );
            }
          } catch (e) {
            console.warn(
              "[confirmIncoming] work_seed_from_purchase throw:",
              e,
            );
          }
        }

        // 5) обновить экраны
        await Promise.all([fetchToReceive(), fetchStock(), fetchWorks()]);
        Alert.alert("Готово", "Поставка принята на склад.");
      } catch (e) {
        showErr(e);
      } finally {
        setConfirmingId(null);
      }
    },
    [fetchToReceive, fetchStock, fetchWorks],
  );

  // создать реальный wh_incoming для синтетической шапки p:<purchase_id>
  const ensureRealIncoming = useCallback(
    async (headId: string) => {
      try {
        if (!headId.startsWith("p:")) return headId; // уже реальный
        const purchaseId = headId.slice(2);

        const tryRpcs = [
          "wh_incoming_open_from_purchase",
          "wh_incoming_seed_from_purchase",
          "wh_incoming_create_from_purchase",
        ];
        for (const fn of tryRpcs) {
          try {
            const r = await supabase.rpc(fn as any, {
              p_purchase_id: purchaseId,
            } as any);
            if (!r.error && r.data) {
              const real = String(r.data);
              setHeadIdAlias((prev) => ({ ...prev, [headId]: real }));
              await fetchToReceive();
              return real;
            }
          } catch {}
        }

        // REST фоллбэк
        const ins = await supabase
          .from("wh_incoming" as any)
          .insert({ purchase_id: purchaseId, status: "pending" } as any)
          .select("id")
          .single();
        if (ins.error) throw ins.error;
        const realId = String(ins.data.id);

        const pi = await supabase
          .from("purchase_items" as any)
          .select(
            "id, rik_code as code, name_human as name, uom, qty",
          )
          .eq("purchase_id", purchaseId);

        if (!pi.error && Array.isArray(pi.data) && pi.data.length > 0) {
          const rows = (pi.data as any[])
            .map((x) => {
              const s = String(x.qty ?? "").trim();
              const n = Number(
                s.replace(/[^\d,\.\-]+/g, "").replace(",", "."),
              );
              const qty = Number.isFinite(n) ? n : 0;

              return {
  incoming_id: realId,
  purchase_item_id: x.id,
  qty_expected: qty,
  qty_received: 0,
};

            })
            .filter((r) => r.qty_expected > 0);

          if (rows.length) {
            const bulk = await supabase
              .from("wh_incoming_items" as any)
              .insert(rows as any);
            if (bulk.error) {
              console.warn(
                "[ensureRealIncoming] insert items warning:",
                bulk.error.message,
              );
            }
          }
        }

        setHeadIdAlias((prev) => ({ ...prev, [headId]: realId }));
        await fetchToReceive();
        return realId;
      } catch (e) {
        showErr(e);
        return headId;
      }
    },
    [fetchToReceive],
  );

  const reseedIncomingItems = async (
  incomingId: string,
  purchaseId: string,
): Promise<boolean> => {
  

  const toNum = (v: any): number => {
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

  // 1) читаем purchase_items
  let pi = await supabase
  .from("purchase_items" as any)
  .select(
    `
    id,
    request_item_id,
    qty,
    uom,
    name_human,
    request_items:request_items (
      rik_code,
      name_human,
      uom
    )
  `,
  )
  .eq("purchase_id", purchaseId)
  .order("id", { ascending: true });


  if (pi.error) {
    console.warn("[reseedIncomingItems] select purchase_items error:", pi.error.message);
    return false;
  }


  // 2) если пусто — создаём purchase_items из proposal_snapshot_items
  if (Array.isArray(pi.data) && pi.data.length === 0) {
    console.warn("[reseedIncomingItems] purchase_items empty → seed from proposal_snapshot_items");

    const link = await supabase
      .from("purchases" as any)
      .select("proposal_id")
      .eq("id", purchaseId)
      .maybeSingle();

    const propId =
      !link.error && link.data?.proposal_id ? String(link.data.proposal_id) : null;

    if (!propId) {
      console.warn("[reseedIncomingItems] purchases.proposal_id not found", link.error?.message);
      return false;
    }

    const snap = await supabase
      .from("proposal_snapshot_items" as any)
      .select("request_item_id, uom, total_qty")

      .eq("proposal_id", propId);
// ✅ подтянем name_human из request_items (иначе purchase_items insert упадёт)
const reqIds = (snap.data as any[])
  .map((x: any) => x.request_item_id)
  .filter(Boolean)
  .map((v: any) => String(v));

const riMap: Record<string, { name_human: string; rik_code: string | null; uom: string | null }> = {};

if (reqIds.length) {
  const ri = await supabase
    .from("request_items" as any)
    .select("id, name_human, rik_code, uom")
    .in("id", reqIds);

  if (!ri.error && Array.isArray(ri.data)) {
    for (const r of ri.data as any[]) {
      const id = String(r.id);
      riMap[id] = {
        name_human: String(r.name_human ?? ""),
        rik_code: r.rik_code ? String(r.rik_code) : null,
        uom: r.uom ? String(r.uom) : null,
      };
    }
  }
}

    if (snap.error || !Array.isArray(snap.data) || snap.data.length === 0) {
      console.warn("[reseedIncomingItems] snapshot empty", snap.error?.message);
      return false;
    }
const piToInsert = (snap.data as any[])
  .map((x: any) => {
    const qty = toNum(x.total_qty ?? 0);

    const rid = x.request_item_id ? String(x.request_item_id) : null;
    if (!rid || qty <= 0) return null;

    const meta = riMap[rid];

    const name_human = (meta?.name_human || "").trim();
    if (!name_human) return null; // чтобы точно не вставить null/пусто

    return {
  purchase_id: purchaseId,
  request_item_id: rid,
  qty,
  uom: x.uom ?? meta?.uom ?? null,
  name_human, // ✅ обязательно, иначе NOT NULL снова
};

  })
  .filter(Boolean) as any[];
    if (piToInsert.length === 0) {
      console.warn("[reseedIncomingItems] nothing to seed into purchase_items");
      return false;
    }

    const insPI = await supabase.from("purchase_items" as any).insert(piToInsert as any);
    if (insPI.error) {
      console.warn("[reseedIncomingItems] purchase_items insert error:", insPI.error.message);
      return false;
    }

    // перечитываем purchase_items
    pi = await supabase
      .from("purchase_items" as any)
      .select(
        `
        id,
        request_item_id,
        qty,
        uom,
        request_items:request_items (
          rik_code,
          name_human,
          note,
          uom
        )
      `,
      )
      .eq("purchase_id", purchaseId)
      .order("id", { ascending: true });

    if (pi.error) {
      console.warn("[reseedIncomingItems] reselect purchase_items error:", pi.error.message);
      return false;
    }

    console.log("[reseedIncomingItems] purchase_items seeded rows:", Array.isArray(pi.data) ? pi.data.length : 0);
  }

  // 3) строим wh_incoming_items
  let rows = ((pi.data as any[]) || [])
  .map((x) => {
    const piId = String(x.id ?? "");
    const qty_expected = toNum(x.qty ?? 0);
    if (qty_expected <= 0) return null;

    // request_items relation может быть объектом или массивом
    const ri =
      Array.isArray((x as any)?.request_items)
        ? (x as any).request_items[0]
        : (x as any)?.request_items;

    const piIdShort = isUuid(piId) ? piId.slice(0, 8) : piId.slice(0, 8);

    // базовый код из request_items (если есть)
    const baseCode =
      ri?.rik_code && String(ri.rik_code).trim()
        ? String(ri.rik_code).trim()
        : null;

    // ✅ ключ склада: уникальный на уровне purchase_item
    // если baseCode есть — добавляем суффикс #xxxx, чтобы не конфликтовать при дроблении закупки
    // если baseCode нет — используем PI-xxxx
    const finalCode = baseCode ? `${baseCode}#${piIdShort}` : `PI-${piIdShort}`;

    // имя/единица: приоритет purchase_items (быстрее и надёжнее), затем request_items, затем код
    const finalName =
      (x as any)?.name_human && String((x as any).name_human).trim()
        ? String((x as any).name_human).trim()
        : ri?.name_human && String(ri.name_human).trim()
        ? String(ri.name_human).trim()
        : finalCode;

    const finalUom =
      (x as any)?.uom && String((x as any).uom).trim()
        ? String((x as any).uom).trim()
        : ri?.uom && String(ri.uom).trim()
        ? String(ri.uom).trim()
        : null;

    return {
      incoming_id: incomingId,
      purchase_item_id: isUuid(piId) ? piId : null,
      qty_expected,
      qty_received: 0,

      rik_code: finalCode,      // ✅ теперь всегда уникально
      name_human: finalName,
      uom: finalUom,
    };
  })
  .filter(Boolean) as any[];

// ✅ защита от дублей на всякий случай (если вдруг прилетели одинаковые purchase_item_id)
{
  const map = new Map<string, any>();
  for (const r of rows) {
    const k = r.purchase_item_id ? `pi:${r.purchase_item_id}` : `code:${String(r.rik_code ?? "")}`;
    if (!map.has(k)) map.set(k, r);
    else {
      const prev = map.get(k);
      prev.qty_expected = Number(prev.qty_expected ?? 0) + Number(r.qty_expected ?? 0);
      map.set(k, prev);
    }
  }
  rows = Array.from(map.values());
}


  // ✅ идемпотентно: если reseed повторится — не упадёт
const ins = await supabase
  .from("wh_incoming_items" as any)
  .upsert(rows as any, { onConflict: "incoming_id,purchase_item_id" });

if (ins.error) {
  console.warn("[reseedIncomingItems] wh_incoming_items upsert error:", ins.error.message);
  return false;
}
return true;
};

  // нормализация строки -> число
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

  // безопасные геттеры
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
const mapRow = (x: any, syntheticBase?: string): ItemRow => {
  // ✅ Supabase relation может прийти как массив — берём первый элемент
  const piRel: any = Array.isArray((x as any)?.purchase_items)
    ? (x as any).purchase_items[0]
    : (x as any)?.purchase_items;

  const riRel: any = Array.isArray(piRel?.request_items)
    ? piRel.request_items[0]
    : piRel?.request_items;

  // ✅ код/рик из разных источников (RPC / view / таблицы)
  const rawCode =
    __pick(x, ["code", "mat_code", "rik_code"], undefined) ??
    __pick(x, ["app_code", "rik"], undefined) ??
    __pickDeep(x, [
      "request_items.rik_code",
      "purchase_items.request_items.rik_code",
    ]);

  const code =
    rawCode != null && String(rawCode).trim() !== ""
      ? String(rawCode)
      : null;

  // ✅ имя из разных источников (RPC / view / relation)
  const name = String(
    __pick(x, ["name", "name_human", "title"], undefined) ??
      __pick(x, ["name_human_ru", "item_name"], undefined) ??
      riRel?.name_human ??
      __pickDeep(x, ["request_items.name_human"]) ??
      rawCode ??
      "",
  );

  // ✅ ед. изм
  const uom =
    __pick(x, ["uom", "uom_id", "unit", "unit_id", "uom_code"], null) ??
    piRel?.uom ??
    riRel?.uom ??
    null;

  const expRaw =
    __pick(x, [
      "qty_expected",
      "total_qty",
      "qty_plan",
      "qty_approved",
      "qty_total",
      "quantity",
      "qty",
      "approved_qty",
      "planned_qty",
      "qty_ordered",
      "qty_txt",
      "qty_expected_txt",
      "approved_qty_txt",
      "count",
      "cnt",
      "pcs",
      "qty_units",
      "quantity_value",
      "q",
      "qnty",
    ]) ??
    __pickDeep(x, [
      "meta.qty",
      "meta.quantity",
      "meta.qty_approved",
      "meta.qty_expected",
      "details.qty",
      "details.quantity",
      "extra.qty",
      "extra.quantity",
      "row.qty",
      "row.quantity",
      "request_items.qty",
    ]);

  const recRaw =
    __pick(x, [
      "qty_received",
      "received",
      "qty_recv",
      "fact_qty",
      "received_qty",
      "qty_fact",
      "qty_accepted",
      "accepted_qty",
      "qty_in",
      "qty_received_txt",
    ]) ??
    __pickDeep(x, [
      "meta.qty_received",
      "meta.received",
      "details.qty_received",
      "details.received",
      "row.qty_received",
      "row.received",
    ]);

  const qty_expected = __toNum(expRaw);
  const qty_received = __toNum(recRaw);

  return {
    incoming_item_id: String(
      x?.incoming_item_id ??
        x?.id ??
        (syntheticBase ? `${syntheticBase}:${x?.id ?? ""}` : ""),
    ),
    purchase_item_id: String(__pick(x, ["purchase_item_id", "pi_id", "id"], "")),
    code,
    name,
    uom,
    qty_expected,
    qty_received,
  };
};
  /** ===== загрузка позиций по шапке ===== */
  const loadItemsForHead = useCallback(
  async (incomingId: string, force = false): Promise<ItemRow[] | undefined> => {
    if (!incomingId) return [];

    if (!force && Object.prototype.hasOwnProperty.call(itemsByHead, incomingId)) {
      return itemsByHead[incomingId];
    }

    const q = await supabase
      .from("v_wh_incoming_items_ui" as any)
      .select("*")
      .eq("incoming_id", incomingId)
      .order("sort_key", { ascending: true });

    if (q.error) {
      console.warn("[loadItemsForHead] v_wh_incoming_items_ui error:", q.error.message);
      setItemsByHead((prev) => ({ ...prev, [incomingId]: [] }));
      return [];
    }

    const rows: ItemRow[] = ((q.data as any[]) || []).map((x) => ({
      incoming_item_id: x.incoming_item_id ? String(x.incoming_item_id) : null,
      purchase_item_id: String(x.purchase_item_id),
      code: x.code ? String(x.code) : null,
      name: String(x.name ?? x.code ?? ""),
      uom: x.uom ? String(x.uom) : null,
      qty_expected: nz(x.qty_expected, 0),
      qty_received: nz(x.qty_received, 0),
      sort_key: Number(x.sort_key ?? 1),
    }));

    setItemsByHead((prev) => ({ ...prev, [incomingId]: rows }));
    return rows;
  },
  [itemsByHead],
);


 const onToggleHead = useCallback(
  (incomingId: string) => {
    if (!incomingId) return;

    const next = expanded === incomingId ? null : incomingId;
    setExpanded(next);

    if (next) {
      // не блокируем UI: без await
      setItemsByHead((prev) => ({ ...prev, [next]: prev[next] ?? [] }));
      void loadItemsForHead(next, true);
    }
  },
  [expanded, loadItemsForHead],
);



  // частичная приёмка одной строки
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

        await fetchToReceive();
        if (expanded) {
          setItemsByHead((prev) => {
            const c = { ...prev };
            delete c[expanded];
            return c;
          });
          await loadItemsForHead(expanded, true);
          setQtyInputByItem((prev) => {
            const n = { ...prev };
            delete n[incomingItemId];
            return n;
          });
        }
        await fetchStock();
      } catch (e) {
        showErr(e);
      }
    },
    [expanded, fetchToReceive, loadItemsForHead, fetchStock],
  );

  // полная приёмка
  const receiveAllHead = useCallback(
    async (incomingIdRaw: string, _purchaseId: string) => {
      try {
        const incomingId = canonId(incomingIdRaw);
        if (!itemsByHead[incomingId]) await loadItemsForHead(incomingId, true);
        const rows = itemsByHead[incomingId] || [];
        if (rows.length === 0) {
          return Alert.alert(
            "Нет позиций",
            "Под этой поставкой нет строк для прихода. Раскрой «Показать позиции» и проверь состав.",
          );
        }
        const totalLeft = rows.reduce(
          (s, r) => s + Math.max(0, nz(r.qty_expected, 0) - nz(r.qty_received, 0)),
          0,
        );
        if (totalLeft <= 0)
          return Alert.alert("Нечего приходовать", "Все позиции уже приняты.");

        const pr = await supabase.rpc("wh_receive_confirm" as any, {
          p_wh_id: incomingId,
        } as any);
        if (pr.error)
          return Alert.alert("Ошибка полного прихода", pickErr(pr.error));

        await fetchToReceive();
        setItemsByHead((prev) => {
          const c = { ...prev };
          delete c[incomingId];
          return c;
        });
        await fetchStock();
        Alert.alert("Готово", "Поставка оприходована полностью");
      } catch (e) {
        showErr(e);
      }
    },
    [itemsByHead, fetchToReceive, loadItemsForHead, canonId, fetchStock],
  );

  // гарантируем, что у реальной шапки есть строки
 const ensurePositionsForHead = async (incomingId: string) => {
  // 0) если уже есть строки — выходим
  const pre = await supabase
    .from("wh_incoming_items" as any)
    .select("id")
    .eq("incoming_id", incomingId)
    .limit(1);

  if (!pre.error && Array.isArray(pre.data) && pre.data.length > 0) return true;

  // 1) пробуем серверные ensure/seed функции (какая есть — та и сработает)
  const tryFns = [
    "wh_incoming_ensure_items",
    "ensure_incoming_items",
    "wh_incoming_seed_from_purchase",
  ];

  for (const fn of tryFns) {
    try {
      const r = await supabase.rpc(fn as any, { p_incoming_id: incomingId } as any);
      if (!r.error) break;
    } catch {}
  }

  // 2) проверяем снова
  const fb = await supabase
    .from("wh_incoming_items" as any)
    .select("id")
    .eq("incoming_id", incomingId)
    .limit(1);

  if (!fb.error && Array.isArray(fb.data) && fb.data.length > 0) return true;

  // 3) последний шанс: reseed из purchase_id
  const head = await supabase
    .from("wh_incoming" as any)
    .select("purchase_id")
    .eq("id", incomingId)
    .maybeSingle();

  const pId = !head.error && head.data?.purchase_id ? String(head.data.purchase_id) : null;
  if (pId) await reseedIncomingItems(incomingId, pId);

  return true;
};

  const receiveSelectedForHead = useCallback(
  async (incomingId: string) => {
    try {
      if (!incomingId) return;

      const freshRows = (await loadItemsForHead(incomingId, true)) ?? [];
      if (freshRows.length === 0) {
        return Alert.alert("Нет позиций", "Под этой поставкой нет строк для прихода.");
      }

      // собираем выбранное по введённым qty (ключ теперь purchase_item_id)
      const toApply: Array<{ purchase_item_id: string; qty: number }> = [];

      for (const r of freshRows) {
        const exp = nz(r.qty_expected, 0);
        const rec = nz(r.qty_received, 0);
        const left = Math.max(0, exp - rec);
        if (!left) continue;

        // input ключ: если incoming_item_id есть — используем его, иначе purchase_item_id
        const inputKey = (r.incoming_item_id ?? r.purchase_item_id) as string;
        const qty = parseQty(qtyInputByItem[inputKey], left);
        if (qty > 0) {
          toApply.push({ purchase_item_id: r.purchase_item_id, qty });
        }
      }

      if (toApply.length === 0) {
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

      // обновляем UI
      await Promise.all([fetchToReceive(), fetchStock()]);
      setItemsByHead((prev) => {
        const c = { ...prev };
        delete c[incomingId];
        return c;
      });
      await loadItemsForHead(incomingId, true);

      // чистим инпуты
      setQtyInputByItem((prev) => {
        const next = { ...prev };
        for (const r of freshRows) {
          const k = (r.incoming_item_id ?? r.purchase_item_id) as string;
          delete next[k];
        }
        return next;
      });

      const ok = Number((data as any)?.ok ?? 0);
      const fail = Number((data as any)?.fail ?? 0);
      const leftAfter = nz((data as any)?.left_after, 0);

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
  [loadItemsForHead, qtyInputByItem, fetchToReceive, fetchStock],
);


  /** ===== ИСТОРИЯ ===== */
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historySupported, setHistorySupported] = useState<null | boolean>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const rpcs = ["list_warehouse_history", "acc_list_history"] as const;
      for (const fn of rpcs) {
        const rpc = await supabase.rpc(fn as any, {} as any);
        if (!rpc.error && Array.isArray(rpc.data)) {
          setHistory(rpc.data as HistoryRow[]);
          setHistorySupported(true);
          return;
        }
      }

      const vw = await supabase
        .from("v_warehouse_history" as any)
        .select("*")
        .order("event_dt", { ascending: false })
        .limit(400);

      if (!vw.error && Array.isArray(vw.data)) {
        setHistory(vw.data as any);
        setHistorySupported(true);
        return;
      }

      setHistorySupported(false);
      setHistory([]);
    } catch {
      setHistorySupported(false);
      setHistory([]);
    }
  }, []);

  /** ===== ИНВЕНТАРИЗАЦИЯ ===== */
  const [inv, setInv] = useState<InvSession[]>([]);
  const [invSupported, setInvSupported] = useState<null | boolean>(null);

  const fetchInv = useCallback(async () => {
    try {
      const rpc = await supabase.rpc("acc_inv_list" as any, {} as any);
      if (!rpc.error && Array.isArray(rpc.data)) {
        setInv(rpc.data as InvSession[]);
        setInvSupported(true);
        return;
      }
      setInvSupported(false);
      setInv([]);
    } catch {
      setInvSupported(false);
      setInv([]);
    }
  }, []);

  const createInv = useCallback(async () => {
    try {
      const r = await supabase.rpc("acc_inv_open" as any, {
        p_object_id: null,
        p_comment: "Инвентаризация (склад)",
      } as any);
      if (r.error) throw r.error;
      await fetchInv();
      Alert.alert("Создано", "Сессия инвентаризации открыта.");
    } catch (e) {
      showErr(e);
    }
  }, [fetchInv]);

  const finishInv = useCallback(
    async (id: string) => {
      try {
        const r = await supabase.rpc("acc_inv_finish" as any, {
          p_session_id: id,
        } as any);
        if (r.error) throw r.error;
        await fetchInv();
        Alert.alert("Готово", "Инвентаризация завершена.");
      } catch (e) {
        showErr(e);
      }
    },
    [fetchInv],
  );

  /** ===== ОТЧЁТЫ ===== */
  const [repStock, setRepStock] = useState<StockRow[]>([]);
  const [repMov, setRepMov] = useState<HistoryRow[]>([]);
  const [reportsSupported, setReportsSupported] = useState<null | boolean>(null);
  const [periodFrom, setPeriodFrom] = useState<string>("");
  const [periodTo, setPeriodTo] = useState<string>("");

  const fetchReports = useCallback(async () => {
    try {
      const s = await supabase.rpc("acc_report_stock" as any, {} as any);
      const m = await supabase.rpc("acc_report_movement" as any, {
        p_from: periodFrom || null,
        p_to: periodTo || null,
      } as any);

      if (!s.error && Array.isArray(s.data) && !m.error && Array.isArray(m.data)) {
        setRepStock(s.data as any);
        setRepMov(m.data as any);
        setReportsSupported(true);
        return;
      }

      setReportsSupported(false);
      setRepStock([]);
      setRepMov([]);
    } catch {
      setReportsSupported(false);
      setRepStock([]);
      setRepMov([]);
    }
  }, [periodFrom, periodTo]);

  /** ===== init / refresh ===== */
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await fetchToReceive();
await fetchStock();
await fetchWorks();

    } catch (e) {
      showErr(e);
    } finally {
      setLoading(false);
    }
  }, [fetchToReceive, fetchStock, fetchWorks]);

  useEffect(() => {
  loadAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


  useEffect(() => {
    if (tab === "История") fetchHistory().catch(() => {});
    if (tab === "Инвентаризация") fetchInv().catch(() => {});
    if (tab === "Отчёты") fetchReports().catch(() => {});
    if (tab === "Работы") fetchWorks().catch(() => {});
  }, [tab, fetchHistory, fetchInv, fetchReports, fetchWorks]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (tab === "К приходу") await fetchToReceive();
      else if (tab === "Склад факт") await fetchStock();
      else if (tab === "Работы") await fetchWorks();
      else if (tab === "История") await fetchHistory();
      else if (tab === "Инвентаризация") await fetchInv();
      else if (tab === "Отчёты") await fetchReports();
      else if (tab === "Расход") {
        const s = norm(search);
        if (s.length >= 2) {
          await runCatalogSearch(search);
        } else {
          setCatalog([]);
          setAvailability({});
        }
      }
    } catch (e) {
      showErr(e);
    } finally {
      setRefreshing(false);
    }
  }, [
    tab,
    search,
    fetchToReceive,
    fetchStock,
    fetchWorks,
    fetchHistory,
    fetchInv,
    fetchReports,
    runCatalogSearch,
  ]);

  // ==== карточка "Склад факт" ====
  const StockRowView = ({ r }: { r: StockRow }) => {
    // ед.изм: сначала из справочника uoms, иначе что пришло из БД
    const rawUom = r.uom_id ? String(r.uom_id).trim() : "";
const uomLabel =
  rawUom
    ? (uoms[rawUom] ?? uoms[rawUom.toLowerCase()] ?? uoms[rawUom.toUpperCase()] ?? rawUom)
    : "—";


    const onHand = nz(r.qty_on_hand, 0);
    const reserved = nz(r.qty_reserved, 0);
    const available = nz(r.qty_available ?? onHand - reserved, 0);

    // тип позиции: работа / материал (по rik-коду)
    const kindLabel = detectKindLabel(r.code);

    // формат числа
    const fmtQty = (n: number) =>
      Number(n).toLocaleString("ru-RU", { maximumFractionDigits: 3 });

    // цвета бейджа доступности
    const badgeBg = available <= 0 ? "#fee2e2" : "#e0f2fe";
    const badgeFg = available <= 0 ? "#991b1b" : "#075985";

    return (
      <View
        style={{
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderBottomWidth: 1,
          borderColor: "#e5e7eb",
          backgroundColor: "#fff",
        }}
      >
        {/* Верхняя строка: название + бейдж */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            style={{
              flex: 1,
              fontWeight: "800",
              fontSize: 16,
              color: "#0f172a",
            }}
            numberOfLines={2}
          >
            {r.name || r.code || r.material_id}
          </Text>
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: badgeBg,
            }}
          >
            <Text style={{ fontWeight: "800", color: badgeFg }}>
              {fmtQty(available)} {uomLabel}
            </Text>
          </View>
        </View>

        {/* Вторая строка: бейдж + ед.изм + доступность */}
        <View
          style={{
            marginTop: 4,
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {kindLabel && (
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: "#0f766e",
                color: "#0f766e",
              }}
            >
              {kindLabel}
            </Text>
          )}
          <Text style={{ color: "#475569" }}>
            {uomLabel} • Доступно: {fmtQty(available)}
          </Text>
        </View>
      </View>
    );
  };

  // ==== строка истории склада ====
  const HistoryRowView = ({ h }: { h: HistoryRow }) => {
    const dt = new Date(h.event_dt).toLocaleString("ru-RU");
    const qty = h.qty ?? 0;

    const typeLabel =
      h.event_type === "RECEIPT"
        ? "Приход"
        : h.event_type === "ISSUE"
        ? "Расход"
        : h.event_type;

    return (
      <View
        style={{
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderBottomWidth: 1,
          borderColor: "#e5e7eb",
          backgroundColor: "#fff",
        }}
      >
        <Text style={{ fontWeight: "600", color: "#0f172a" }}>
          {dt} • {typeLabel}
        </Text>
        <Text style={{ color: "#475569", marginTop: 2 }}>
          {h.code || "—"} • {h.uom_id || "—"} • Кол-во: {qty}
        </Text>
      </View>
    );
  };

  /** ===== Рендер вкладки «Расход» ===== */
  const renderIssue = () => {
    const openPicker = (what: "object" | "work" | "recipient") =>
      setPickModal({ what });

    // Глобальное условие: можно ли сейчас жать «Выдать»
    const canIssueGlobal =
      nz(qtyToIssue, 0) > 0 && !!recipientOpt?.id && !!objectOpt?.id;

    return (
      <View style={{ flex: 1 }}>
        {/* Панель параметров выдачи */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: "#e2e8f0",
            marginBottom: 10,
            gap: 10,
          }}
        >
          <Text style={{ fontWeight: "800" }}>Параметры выдачи</Text>

          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Pressable
              onPress={() => openPicker("object")}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                backgroundColor: "#fff",
              }}
            >
              <Text>
                Объект:{" "}
                <Text style={{ fontWeight: "700" }}>
                  {objectOpt?.label ?? "—"}
                </Text>
              </Text>
            </Pressable>

            <Pressable
              onPress={() => openPicker("work")}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                backgroundColor: "#fff",
              }}
            >
              <Text>
                Работы:{" "}
                <Text style={{ fontWeight: "700" }}>
                  {workTypeOpt?.label ?? "—"}
                </Text>
              </Text>
            </Pressable>

            <Pressable
              onPress={() => openPicker("recipient")}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                backgroundColor: "#fff",
              }}
            >
              <Text>
                Получатель:{" "}
                <Text style={{ fontWeight: "700" }}>
                  {recipientOpt?.label ?? "—"}
                </Text>
              </Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Text style={{ width: 90, color: "#334155" }}>Кол-во</Text>
            <TextInput
              value={qtyToIssue}
              onChangeText={setQtyToIssue}
              keyboardType="numeric"
              placeholder="1"
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 8,
              }}
            />
          </View>

          {/* Подсказка, почему кнопка может быть неактивна */}
          {!canIssueGlobal && (
            <View
              style={{
                backgroundColor: "#fff7ed",
                borderColor: "#fed7aa",
                borderWidth: 1,
                borderRadius: 10,
                padding: 8,
              }}
            >
              <Text style={{ color: "#92400e" }}>
                Выберите <Text style={{ fontWeight: "700" }}>Объект</Text>,{" "}
                <Text style={{ fontWeight: "700" }}>Получателя</Text> и введите{" "}
                <Text style={{ fontWeight: "700" }}>кол-во &gt; 0</Text>.
              </Text>
            </View>
          )}
        </View>

        {/* Поиск по каталогу */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: "#e2e8f0",
            marginBottom: 10,
          }}
        >
          <Text style={{ fontWeight: "800", marginBottom: 6 }}>
            Каталог: материалы / работы / услуги
          </Text>

          <TextInput
            value={search}
            onChangeText={(t) => {
              setSearch(t);
              runCatalogSearch(t).catch(() => {});
            }}
            placeholder="Поиск по коду/названию (мин. 2 символа)"
            style={{
              borderWidth: 1,
              borderColor: "#e2e8f0",
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 8,
            }}
          />
        </View>

        {/* Результаты каталога */}
        <FlatList
          data={catalog}
          keyExtractor={(x, idx) => `cat:${x.ref_id || x.code || "x"}:${idx}`}

          renderItem={({ item }) => {
            const avail = availability[item.code] ?? 0;
            const canIssue = canIssueGlobal;

            return (
              <View
                style={{
                  padding: 12,
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  borderRadius: 12,
                  backgroundColor: "#fff",
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontWeight: "800" }}>{item.name}</Text>
                <Text style={{ color: "#475569" }}>
                  [{item.kind === "work" ? "работа" : "материал"}] {item.code} •{" "}
                  {item.unit_label ?? item.unit_id ?? "—"} • Доступно: {avail}
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    marginTop: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <Pressable
                    onPress={() => issueOne(item)}
                    disabled={!canIssue}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: !canIssue ? "#94a3b8" : "#0ea5e9",
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700" }}>
                      Выдать
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={{ color: "#475569" }}>Ничего не найдено.</Text>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />

        {/* Пикер объектов / работ / получателей */}
        <Modal
          visible={!!pickModal.what}
          animationType="slide"
          onRequestClose={() => setPickModal({ what: null })}
          transparent
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
                padding: 12,
                borderTopLeftRadius: 12,
                borderTopRightRadius: 12,
                maxHeight: "70%",
              }}
            >
              <Text style={{ fontWeight: "800", marginBottom: 8 }}>
                {pickModal.what === "object"
                  ? "Выбор объекта"
                  : pickModal.what === "work"
                  ? "Выбор вида работ"
                  : "Выбор получателя"}
              </Text>

              <TextInput
                value={pickFilter}
                onChangeText={setPickFilter}
                placeholder="Фильтр…"
                style={{
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  marginBottom: 8,
                }}
              />

              <FlatList
                data={(() => {
                  const list =
                    pickModal.what === "object"
                      ? objectList
                      : pickModal.what === "work"
                      ? workTypeList
                      : recipientList;
                  const f = pickFilter.trim().toLowerCase();
                  if (!f) return list;
                  return list.filter((x) =>
                    x.label.toLowerCase().includes(f),
                  );
                })()}
                keyExtractor={(x) => x.id}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      if (pickModal.what === "object") setObjectOpt(item);
                      else if (pickModal.what === "work") setWorkTypeOpt(item);
                      else if (pickModal.what === "recipient")
                        setRecipientOpt(item);

                      setPickModal({ what: null });
                      setPickFilter("");
                    }}
                    style={{
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderColor: "#f1f5f9",
                    }}
                  >
                    <Text>{item.label}</Text>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Text style={{ color: "#64748b" }}>Нет вариантов.</Text>
                }
                style={{ maxHeight: "60%" }}
              />

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                <Pressable
                  onPress={() => {
                    setPickModal({ what: null });
                    setPickFilter("");
                  }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                  }}
                >
                  <Text>Отмена</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  /** ===== рендер вкладки ===== */
  const renderTab = () => {
    // ─────────── К ПРИХОДУ ───────────
    if (tab === "К приходу") {
      return (
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
            {(["pending", "partial"] as const).map((f) => {
              const active = recvFilter === f;
              const cnt = f === "pending" ? countPending : countPartial;
              const label = f === "pending" ? "Ожидает" : "Частично";

              return (
                <Pressable
                  key={f}
                 onPress={() => {
  setRecvFilter(f);
  // мгновенно меняем список
  setToReceive(f === "partial" ? toReceivePartial : toReceivePending);
}}

                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: active ? "#0ea5e9" : "#e2e8f0",
                    flexDirection: "row",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: active ? "#fff" : "#0f172a",
                      fontWeight: "700",
                    }}
                  >
                    {label}
                  </Text>
                  <View
                    style={{
                      backgroundColor: active
                        ? "rgba(255,255,255,0.25)"
                        : "#ffffff",
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 999,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "800",
                        color: active ? "#fff" : "#0f172a",
                      }}
                    >
                      {cnt}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <FlatList
            data={toReceive}
            keyExtractor={(i) => i.incoming_id}

            renderItem={({ item }) => {
              const rid = item.incoming_id;

              const isExpanded = expanded === rid;
              const rows = (itemsByHead[rid] as ItemRow[] | undefined) || [];

              const expSum = nz(item.qty_expected_sum, 0);
const recSum = nz(item.qty_received_sum, 0);
const totalLeft = nz(item.qty_left_sum, 0);


              return (
                <View
                  style={{
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    backgroundColor: "#fff",
                    borderRadius: 12,
                    padding: 12,
                    gap: 8,
                  }}
                >
                  {/* шапка карточки */}
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ fontSize: 16, fontWeight: "700" }}>
                      {item.po_no ||
                        (Platform.OS === "web"
                          ? item.purchase_id
                          : item.purchase_id.slice(0, 8))}
                    </Text>
                    <View
                      style={{
                        marginLeft: "auto",
                        backgroundColor:
  item.incoming_status === "confirmed" ? "#dcfce7" : "#fee2e2",
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 999,
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: "700",
                          color:
  item.incoming_status === "confirmed" ? "#166534" : "#991b1b",
                        }}
                      >
                        {item.incoming_status === "confirmed" ? "Принято" : "Ожидает"}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ color: "#334155" }}>
                    Статус закупки: {item.purchase_status ?? "—"}
                  </Text>
                  <Text style={{ color: "#64748b" }}>
  Создано:{" "}
  {item.purchase_created_at
    ? new Date(item.purchase_created_at).toLocaleString("ru-RU")
    : "—"}
  {item.incoming_status === "confirmed" && item.confirmed_at
    ? ` • Принято: ${new Date(item.confirmed_at).toLocaleString("ru-RU")}`
    : ""}
</Text>

                  {/* кнопка показать/скрыть позиции */}
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 10,
                      marginTop: 4,
                      flexWrap: "wrap",
                    }}
                  >
                   <Pressable
  onPress={() => onToggleHead(item.incoming_id)}
  style={{
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    cursor: "pointer" as any,          // ✅ web
  }}
>
  <Text>{isExpanded ? "Скрыть позиции" : "Показать позиции"}</Text>
</Pressable>

                  </View>

                  {/* раскрытая часть */}
                  {isExpanded && (
                    <View
                      style={{
                        marginTop: 8,
                        borderTopWidth: 1,
                        borderColor: "#f1f5f9",
                      }}
                    >
                      <View style={{ padding: 8 }}>
                        <Text
                          style={{
                            color: "#334155",
                            fontWeight: "700",
                          }}
                        >
                          {`Ожидается: ${expSum} • Принято: ${recSum} • Осталось принять: ${totalLeft}`}
                        </Text>
                      </View>

                      {rows.length > 0 ? (
                        <>
                          {rows
                            .filter((row) => {
                              const exp = nz(row.qty_expected, 0);
                              const rec = nz(row.qty_received, 0);
                              const left = Math.max(0, exp - rec);
                              return left > 0;
                            })
                            .map((row) => {
                              const exp = nz(row.qty_expected, 0);
                              const rec = nz(row.qty_received, 0);
                              const left = Math.max(0, exp - rec);
                              const inputKey = (row.incoming_item_id ?? row.purchase_item_id ?? `${row.code ?? "x"}:${row.sort_key}`) as string;

const val = qtyInputByItem[inputKey] ?? "";

                              const isRealIncoming =
                                typeof row.incoming_item_id === "string" &&
                                !row.incoming_item_id.startsWith("p:");

                              return (
                                <View
                                  key={row.incoming_item_id ?? row.purchase_item_id}
                                  style={{
                                    padding: 10,
                                    borderBottomWidth: 1,
                                    borderColor: "#f8fafc",
                                  }}
                                >
                                  <Text style={{ fontWeight: "700" }}>
  {row.name || "—"} {row.code ? `(${row.code})` : ""}
</Text>


                                  {(() => {
                                    const kindLabel = detectKindLabel(row.code);
                                    return (
                                      <View
                                        style={{
                                          flexDirection: "row",
                                          alignItems: "center",
                                          flexWrap: "wrap",
                                          marginTop: 2,
                                          gap: 6,
                                        }}
                                      >
                                        {kindLabel && (
                                          <Text
                                            style={{
                                              fontSize: 12,
                                              fontWeight: "700",
                                              paddingHorizontal: 8,
                                              paddingVertical: 2,
                                              borderRadius: 999,
                                              borderWidth: 1,
                                              borderColor: "#0f766e",
                                              color: "#0f766e",
                                            }}
                                          >
                                            {kindLabel}
                                          </Text>
                                        )}
                                        <Text style={{ color: "#475569" }}>
                                          {row.uom || "—"} • Ожидается: {exp} •
                                          Принято: {rec} • Остаток: {left}
                                        </Text>
                                      </View>
                                    );
                                  })()}

                                  {item.incoming_status !== "confirmed" && left > 0 && (

                                      <View
                                        style={{
                                          flexDirection: "row",
                                          gap: 8,
                                          marginTop: 8,
                                          alignItems: "center",
                                          flexWrap: "wrap",
                                        }}
                                      >
                                        <TextInput
                                          value={val}
                                          onChangeText={(t) => {
                                            const cleaned = t
                                              .replace(",", ".")
                                              .replace(/\s+/g, "");
                                            setQtyInputByItem((prev) => ({
                                              ...prev,
                                              [inputKey]:
                                                cleaned === "" ||
                                                /^0+(\.0+)?$/.test(cleaned)
                                                  ? ""
                                                  : cleaned,
                                            }));
                                          }}
                                          onFocus={() => {
                                            setQtyInputByItem((prev) => {
                                              const cur =
                                                prev[inputKey] ?? "";
                                              if (cur !== "") return prev;
                                              return {
                                                ...prev,
                                                [inputKey]: String(left),
                                              };
                                            });
                                          }}
                                          keyboardType="numeric"
                                          placeholder={`Кол-во (ост: ${left})`}
                                          style={{
                                            width: 160,
                                            borderWidth: 1,
                                            borderColor: "#e2e8f0",
                                            borderRadius: 10,
                                            paddingHorizontal: 10,
                                            paddingVertical: 8,
                                            backgroundColor: "#fff",
                                          }}
                                        />
                                      </View>
                                    )}
                                </View>
                              );
                            })}

                          {item.incoming_status !== "confirmed" && (
                            <View style={{ padding: 10, gap: 8 }}>
                              <Pressable
                               onPress={() => receiveSelectedForHead(rid)}
disabled={receivingHeadId === rid}
style={{
                                  alignSelf: "flex-start",
                                  paddingHorizontal: 14,
                                  paddingVertical: 10,
                                  borderRadius: 10,
                                  backgroundColor:
                                    receivingHeadId === rid
                                      ? "#94a3b8"
                                      : "#0ea5e9",
                                }}
                              >
                                <Text
                                  style={{
                                    color: "#fff",
                                    fontWeight: "800",
                                  }}
                                >
                                  {receivingHeadId === rid 
                                    ? "Оприходуем…"
                                    : "Оприходовать выбранное"}
                                </Text>
                              </Pressable>
                            </View>
                          )}
                        </>
                      ) : (
                        <Text style={{ padding: 8, color: "#64748b" }}>
                          Позиции не загружены или пусто
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              );
            }}
            ListEmptyComponent={
              <Text style={{ color: "#475569" }}>
                Нет записей в очереди склада.
              </Text>
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        </View>
      );
    }

    // ─────────── ОСТАТКИ ───────────
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
        <FlatList
          data={stockMaterialsByCode}
          keyExtractor={(i) => i.material_id}

          renderItem={({ item }) => <StockRowView r={item} />}
          ListEmptyComponent={
            <Text style={{ color: "#475569" }}>
              Пока нет данных по складу.
            </Text>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      );
    }

    // ─────────── РАБОТЫ ───────────
    if (tab === "Работы") {
      if (worksSupported === false) {
        return (
          <View style={{ padding: 12 }}>
            <Text style={{ color: "#475569" }}>
              Раздел «Работы» требует view{" "}
              <Text style={{ fontWeight: "700" }}>v_works_fact</Text> и таблицу{" "}
              <Text style={{ fontWeight: "700" }}>work_progress</Text>.
            </Text>
          </View>
        );
      }

      return (
        <>
          {/* СПИСОК РАБОТ */}
          <FlatList
            data={works}
            keyExtractor={(w) => w.progress_id}
            renderItem={({ item }) => {
              const left = item.qty_left;
              const total = item.qty_planned;
              const done = item.qty_done;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const busy = worksBusyId === item.progress_id;
              const isClosed = item.work_status === "Выполнено";

              return (
                <View
                  style={{
                    padding: 12,
                    marginBottom: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    backgroundColor: "#fff",
                    gap: 6,
                  }}
                >
                  <Text style={{ fontWeight: "800", fontSize: 15 }}>
                    {item.work_name || item.work_code || item.progress_id}
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flexWrap: "wrap",
                      marginTop: 2,
                      gap: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: "#0f766e",
                        color: "#0f766e",
                      }}
                    >
                      работа
                    </Text>
                    <Text style={{ color: "#64748b" }}>
                      {item.uom_id || "—"}
                    </Text>
                  </View>

                  <Text style={{ color: "#334155" }}>
                    Закуплено: {total} {item.uom_id || ""} • Выполнено: {done} •
                    Остаток: {left}
                  </Text>
                  <Text style={{ color: "#64748b" }}>
                    Статус: {item.work_status} • Прогресс: {pct}%
                  </Text>

                  {item.started_at && (
                    <Text style={{ color: "#64748b" }}>
                      Начато:{" "}
                      {new Date(item.started_at).toLocaleString("ru-RU")}
                    </Text>
                  )}
                  {item.finished_at && (
                    <Text style={{ color: "#64748b" }}>
                      Завершено:{" "}
                      {new Date(item.finished_at).toLocaleString("ru-RU")}
                    </Text>
                  )}

                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 6,
                    }}
                  >
                    {item.work_status === "К запуску" && !isClosed && (
                      <Pressable
                        onPress={() => handleWorkStart(item)}
                        disabled={busy}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                          backgroundColor: busy ? "#94a3b8" : "#0ea5e9",
                        }}
                      >
                        <Text style={{ color: "#fff", fontWeight: "700" }}>
                          {busy ? "..." : "Начать"}
                        </Text>
                      </Pressable>
                    )}

                    {!isClosed && (
                      <Pressable
                        onPress={() => openWorkAddModal(item)}
                        disabled={busy}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                          backgroundColor: busy ? "#94a3b8" : "#22c55e",
                        }}
                      >
                        <Text style={{ color: "#fff", fontWeight: "700" }}>
                          {busy ? "..." : "+ объём"}
                        </Text>
                      </Pressable>
                    )}

                    {!isClosed && (
                      <Pressable
                        onPress={() => {
                          console.log(
                            "[UI] Окончено нажато",
                            item.progress_id,
                          );
                          handleWorkFinish(item);
                        }}
                        disabled={busy}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                          backgroundColor: busy ? "#94a3b8" : "#16a34a",
                        }}
                      >
                        <Text style={{ color: "#fff", fontWeight: "700" }}>
                          {busy ? "..." : "Окончено"}
                        </Text>
                      </Pressable>
                    )}

                    {isClosed && (
                      <Pressable
                        onPress={() => openWorkAddModal(item, true)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                          backgroundColor: "#6b7280",
                        }}
                      >
                        <Text style={{ color: "#fff", fontWeight: "700" }}>
                          Просмотр акта
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <Text style={{ color: "#475569", padding: 12 }}>
                Работ пока нет.
              </Text>
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />

          {/* МОДАЛКА ФАКТА ВЫПОЛНЕНИЯ */}
          <Modal
            visible={workModalVisible}
            animationType="slide"
            onRequestClose={closeWorkModal}
          >
            <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
              <View style={{ padding: 16, paddingBottom: 8 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "800",
                    marginBottom: 12,
                  }}
                >
                  Факт выполнения работы
                </Text>

                {workModalLoading && (
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#94a3b8",
                      marginBottom: 4,
                    }}
                  >
                    Загружаем историю и материалы…
                  </Text>
                )}
<Pressable
 onPress={() => {
  if (!workModalRow) return;

  const isWeb = Platform.OS === "web";

  // ✅ ЛОК ТОЛЬКО НА МОБИЛЕ
  if (!isWeb) {
    if (pdfBusy) return;
    setPdfBusy(true);
  }

  let pdfWin: Window | null = null;

if (Platform.OS === "web") {
  pdfWin = webOpenPdfWindow("Формируем итоговый акт…"); // всегда новое окно
}


  (async () => {
    try {
      const logsLite = workLog.map((l) => ({ id: l.id, qty: l.qty }));

      if (isWeb) {
        const { data } = await supabase.auth.getSession();
        if (!data?.session) throw new Error("Supabase session not ready (web)");
      }

      const agg = await withTimeout(
        loadAggregatedWorkSummary(workModalRow.progress_id, workModalRow, logsLite),
        20000,
        "loadAggregatedWorkSummary TOTAL",
      );

      await withTimeout(
        generateWorkPdf(agg.work, agg.materials, { webWindow: pdfWin }),
        15000,
        "generateWorkPdf TOTAL",
      );
    } catch (e) {
      if (isWeb) {
        webWritePdfWindow(
          pdfWin,
          `<html><body style="font-family:sans-serif;padding:16px">
             <h3>Ошибка формирования PDF</h3>
             <pre style="white-space:pre-wrap">${String((e as any)?.message || e)}</pre>
           </body></html>`,
        );
        return;
      }
      showErr(e);
    } finally {
      if (!isWeb) setPdfBusy(false);
    }
  })();
}}
style={{
  alignSelf: "flex-start",
  backgroundColor: "#0ea5e9",
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 8,
  marginBottom: 4,
  opacity: Platform.OS !== "web" && pdfBusy ? 0.6 : 1,
}}
disabled={Platform.OS !== "web" ? pdfBusy : false}

>
  <Text style={{ color: "#fff", fontWeight: "700" }}>
    {pdfBusy ? "Формируем…" : "Итоговый акт (PDF)"}
  </Text>
</Pressable>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    marginBottom: 12,
                  }}
                >
                  Свод всех этапов и материалов по работе
                </Text>

                {workModalRow && (
                  <View
                    style={{
                      backgroundColor: "#fff",
                      padding: 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#e2e8f0",
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "800",
                        fontSize: 16,
                        marginBottom: 6,
                      }}
                    >
                      {workModalRow.work_name ||
                        workModalRow.work_code ||
                        "Работа"}
                    </Text>

                    <Text style={{ color: "#475569", marginBottom: 4 }}>
                      <Text style={{ fontWeight: "600" }}>Объект: </Text>
                      {workModalRow.object_name || "Не указан"}
                    </Text>

                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                    >
                      <View>
                        <Text style={{ color: "#64748b", fontSize: 12 }}>
                          План
                        </Text>
                        <Text style={{ fontWeight: "700" }}>
                          {workModalRow.qty_planned} {workModalRow.uom_id}
                        </Text>
                      </View>
                      <View>
                        <Text style={{ color: "#64748b", fontSize: 12 }}>
                          Выполнено
                        </Text>
                        <Text style={{ fontWeight: "700" }}>
                          {workModalRow.qty_done} {workModalRow.uom_id}
                        </Text>
                      </View>
                      <View>
                        <Text style={{ color: "#64748b", fontSize: 12 }}>
                          Остаток
                        </Text>
                        <Text
                          style={{
                            fontWeight: "700",
                            color:
                              workModalRow.qty_left <= 0
                                ? "#dc2626"
                                : "#0f172a",
                          }}
                        >
                          {workModalRow.qty_left} {workModalRow.uom_id}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={{
                        height: 8,
                        borderRadius: 8,
                        backgroundColor: "#e2e8f0",
                        marginVertical: 8,
                      }}
                    >
                      <View
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              (Number(workModalRow.qty_done || 0) /
                                Math.max(
                                  Number(workModalRow.qty_planned || 0),
                                  1,
                                )) *
                                100,
                            ),
                          )}%`,
                          height: "100%",
                          backgroundColor: "#0ea5e9",
                          borderRadius: 8,
                        }}
                      />
                    </View>

                    <Text style={{ fontSize: 12, color: "#64748b" }}>
                      Прогресс:{" "}
                      {Math.round(
                        (Number(workModalRow.qty_done || 0) /
                          Math.max(Number(workModalRow.qty_planned || 0), 1)) *
                          100,
                      )}
                      %
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
                    {/* История актов */}
                    <View
                      style={{
                        marginTop: 8,
                        marginBottom: 8,
                        padding: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: "#e2e8f0",
                        backgroundColor: "#fff",
                        gap: 6,
                      }}
                    >
                      <Text
                        style={{ fontWeight: "700", marginBottom: 4 }}
                      >
                        История актов по работе
                      </Text>

                      {workLog.length === 0 && (
                        <Text style={{ color: "#94a3b8", fontSize: 12 }}>
                          Пока нет зафиксированных актов по этой работе.
                        </Text>
                      )}

                      {workLog.map((log) => {
                        const dt = new Date(
                          log.created_at,
                        ).toLocaleString("ru-RU");
                        return (
                          <View
                            keyExtractor={(x) => x.id}

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
                              {dt} • {log.qty}{" "}
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
  <Text style={{ color: "#94a3b8", fontSize: 12 }}>
    Комментарий: {log.note}
  </Text>
)}
<Pressable
  onPress={() => {
  if (!workModalRow) return;

  const isWeb = Platform.OS === "web";

  // ✅ ЛОК ТОЛЬКО НА МОБИЛЕ
  if (!isWeb) {
    if (pdfBusyLogId) return;
    setPdfBusyLogId(log.id);
  }

let pdfWin: Window | null = null;

if (isWeb) {
  pdfWin = webOpenPdfWindow("Формируем PDF этого акта…"); // всегда новое окно
}
  (async () => {
    try {
      const matsQ = await withTimeout(
        supabase
          .from("work_progress_log_materials" as any)
          .select("mat_code, uom_mat, qty_fact")
          .eq("log_id", log.id),
        15000,
        `work_progress_log_materials select for log ${log.id}`,
      );

      if (matsQ.error) throw matsQ.error;

      const mats = Array.isArray(matsQ.data) ? matsQ.data : [];
      const matsRows: WorkMaterialRow[] = mats.map((m: any) => ({
        mat_code: String(m.mat_code),
        name: String(m.mat_code),
        uom: m.uom_mat ? String(m.uom_mat) : "",
        available: 0,
        qty_fact: Number(m.qty_fact ?? 0),
      }));

      const actWork: WorkRow = {
        ...workModalRow,
        qty_done: Number(log.qty ?? 0),
        qty_left: Math.max(
          0,
          Number(workModalRow.qty_planned || 0) - Number(log.qty ?? 0),
        ),
      };

      await withTimeout(
        generateWorkPdf(actWork, matsRows, {
          actDate: log.created_at,
          webWindow: pdfWin,
        }),
        15000,
        "generateWorkPdf LOG",
      );
    } catch (e) {
      if (isWeb) {
        webWritePdfWindow(
          pdfWin,
          `<html><body style="font-family:sans-serif;padding:16px">
             <h3>Ошибка формирования PDF</h3>
             <pre style="white-space:pre-wrap">${String((e as any)?.message || e)}</pre>
           </body></html>`,
        );
        return;
      }
      showErr(e);
    } finally {
      if (!isWeb) setPdfBusyLogId(null);
    }
  })();
}}

  style={{
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    opacity: Platform.OS !== "web" && pdfBusyLogId ? 0.6 : 1,
}}
disabled={Platform.OS !== "web" ? !!pdfBusyLogId : false}
>
  <Text style={{ fontSize: 12 }}>PDF этого акта</Text>
</Pressable>
                          </View>
                        );
                      })}
                    </View>

                    {/* Объём */}
                    <Text style={{ fontWeight: "600", marginTop: 8 }}>
                      Выполненный объём
                    </Text>
                    <TextInput
                      editable={
                        !workModalReadOnly &&
                        (workModalRow?.qty_left || 0) > 0
                      }
                      value={workModalQty}
                      onChangeText={setWorkModalQty}
                      keyboardType="numeric"
                      placeholder="Сколько сделали…"
                      style={{
                        borderWidth: 1,
                        borderColor: "#e2e8f0",
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        backgroundColor: "#fff",
                        marginTop: 4,
                      }}
                    />
                    <Text style={{ color: "#64748b", marginTop: 4 }}>
                      Ед. изм: {workModalRow.uom_id || "—"}
                    </Text>

                    {/* Участок */}
                    <Text style={{ fontWeight: "600", marginTop: 12 }}>
                      Участок / зона (этаж, секция)
                    </Text>
                    <TextInput
                      editable={!workModalReadOnly}
                      value={workModalLocation}
                      onChangeText={setWorkModalLocation}
                      placeholder="Например: Секция А, этаж 5, кв. 25"
                      style={{
                        borderWidth: 1,
                        borderColor: "#e2e8f0",
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        backgroundColor: "#fff",
                        marginTop: 4,
                      }}
                    />

                    {/* Этап */}
                    <Text style={{ fontWeight: "600", marginTop: 12 }}>
                      Этап / что делали
                    </Text>
                    <Pressable
                      onPress={() => {
                        if (!workModalReadOnly)
                          setWorkStagePickerVisible(true);
                      }}
                      style={{
                        borderWidth: 1,
                        borderColor: "#e2e8f0",
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 10,
                        backgroundColor: "#fff",
                        marginTop: 4,
                        opacity: workModalReadOnly ? 0.6 : 1,
                      }}
                    >
                      <Text
                        style={{
                          color: workModalStage ? "#0f172a" : "#9ca3af",
                        }}
                      >
                        {workModalStage ||
                          "Выбери этап (например: Вязка арматуры)"}
                      </Text>
                    </Pressable>

                    {/* Комментарий */}
                    <Text style={{ fontWeight: "600", marginTop: 12 }}>
                      Комментарий
                    </Text>
                    <TextInput
                      editable={!workModalReadOnly}
                      value={workModalComment}
                      onChangeText={setWorkModalComment}
                      placeholder="Замечания…"
                      multiline
                      style={{
                        borderWidth: 1,
                        borderColor: "#e2e8f0",
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        backgroundColor: "#fff",
                        marginTop: 4,
                        minHeight: 60,
                        textAlignVertical: "top",
                      }}
                    />

                    {/* Материалы */}
                    <WorkMaterialsEditor
  rows={workModalMaterials}
  onChange={(nextRows) => setWorkModalMaterials(nextRows)}
  onAdd={() => setWorkSearchVisible(true)}   // ← теперь кнопка вызывает каталог!
  onRemove={(idx) =>
    setWorkModalMaterials((prev) => prev.filter((_, i) => i !== idx))
  }
  readOnly={workModalReadOnly}
/>

                  </>
                )}

                {/* Поиск материалов в модалке */}
                {workModalRow && workSearchVisible && !workModalReadOnly && (
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
                    <Text style={{ fontWeight: "600" }}>
                      Поиск материала по каталогу
                    </Text>
                    <TextInput
                      value={workSearchQuery}
                      onChangeText={handleWorkSearchChange}
                      placeholder="Поиск по названию/коду…"
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
                      keyExtractor={(m, idx) => `mat:${m.mat_code || "x"}:${idx}`}

                      style={{ maxHeight: 260 }}
                      renderItem={({ item }) => {
                        const hasStock = (item.available || 0) > 0;
                        return (
                          <Pressable
                            onPress={() => addWorkMaterial(item)}
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
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                flex: 1,
                                gap: 8,
                              }}
                            >
                              <Text style={{ fontSize: 18 }}>📦</Text>
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={{
                                    fontWeight: "600",
                                    color: "#0f172a",
                                  }}
                                  numberOfLines={2}
                                >
                                  {item.name}
                                </Text>
                                <Text
                                  style={{
                                    color: "#64748b",
                                    marginTop: 2,
                                  }}
                                >
                                  {item.uom || "—"}
                                </Text>
                              </View>
                            </View>
                            <View
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 999,
                                backgroundColor: hasStock
                                  ? "#dcfce7"
                                  : "#f3f4f6",
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 12,
                                  fontWeight: "700",
                                  color: hasStock ? "#166534" : "#6b7280",
                                }}
                              >
                                {hasStock
                                  ? `доступно ${item.available}`
                                  : "нет в наличии"}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      }}
                      ListEmptyComponent={
                        <Text style={{ color: "#94a3b8" }}>
                          Введите минимум 2 символа для поиска.
                        </Text>
                      }
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

                <View style={{ height: 24 }} />
              </ScrollView>

              {!workModalReadOnly && (
                <View
                  style={{
                    borderTopWidth: 1,
                    borderColor: "#e5e7eb",
                    paddingTop: 8,
                    paddingBottom: 12,
                    paddingHorizontal: 16,
                    flexDirection: "row",
                    gap: 8,
                  }}
                >
                  <Pressable
                    onPress={() => submitWorkProgress(true)}
                    disabled={workModalSaving}
                    style={{
                      flex: 1,
                      borderRadius: 10,
                      paddingVertical: 10,
                      backgroundColor:
                        (workModalRow?.qty_left || 0) <= 0
                          ? "#cbd5e1"
                          : workModalSaving
                          ? "#94a3b8"
                          : "#16a34a",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700" }}>
                      {workModalSaving
                        ? "Сохраняю…"
                        : "Сохранить + списать"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => submitWorkProgress(false)}
                    disabled={workModalSaving}
                    style={{
                      flex: 1,
                      borderRadius: 10,
                      paddingVertical: 10,
                      backgroundColor:
                        (workModalRow?.qty_left || 0) <= 0
                          ? "#cbd5e1"
                          : workModalSaving
                          ? "#94a3b8"
                          : "#0ea5e9",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700" }}>
                      {workModalSaving
                        ? "Сохраняю…"
                        : "Сохранить без склада"}
                    </Text>
                  </Pressable>
                </View>
              )}

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

          {/* МОДАЛКА ВЫБОРА ЭТАПА */}
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
                      Этапы ещё не настроены. Добавь строки в таблицу
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

          {/* МОДАЛКА ПОДТВЕРЖДЕНИЯ ЗАВЕРШЕНИЯ РАБОТЫ */}
          <Modal
            visible={!!finishDialog}
            transparent
            animationType="fade"
            onRequestClose={() => setFinishDialog(null)}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.4)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  backgroundColor: "#fff",
                  padding: 16,
                  borderRadius: 12,
                  width: "90%",
                  maxWidth: 420,
                }}
              >
                <Text
                  style={{
                    fontWeight: "800",
                    fontSize: 16,
                    marginBottom: 8,
                  }}
                >
                  Подтвердить завершение работы
                </Text>
                <Text
                  style={{
                    color: "#475569",
                    marginBottom: 16,
                    whiteSpace: "pre-wrap" as any,
                  }}
                >
                  {finishDialog?.message}
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    gap: 8,
                  }}
                >
                  <Pressable
                    onPress={() => setFinishDialog(null)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: "#e2e8f0",
                    }}
                  >
                    <Text>Отмена</Text>
                  </Pressable>
                  <Pressable
                    onPress={confirmFinishWork}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: "#16a34a",
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700" }}>
                      Да, всё верно
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        </>
      );
    }

    // ─────────── РАСХОД ───────────
    if (tab === "Расход") return renderIssue();

    // ─────────── ИСТОРИЯ ───────────
    if (tab === "История") {
      if (historySupported === false) {
        return (
          <View style={{ padding: 12 }}>
            <Text style={{ color: "#475569" }}>
              Раздел «История» пока недоступен: добавь RPC{" "}
              <Text style={{ fontWeight: "700" }}>
                list_warehouse_history / acc_list_history
              </Text>{" "}
              или view{" "}
              <Text style={{ fontWeight: "700" }}>
                v_warehouse_history
              </Text>
              .
            </Text>
          </View>
        );
      }

      return (
        <FlatList
          data={history}
          keyExtractor={(_, idx) => `h-${idx}`}
          renderItem={({ item }) => <HistoryRowView h={item} />}
          ListEmptyComponent={
            <Text style={{ color: "#475569" }}>История пуста.</Text>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      );
    }

    // ─────────── ИНВЕНТАРИЗАЦИЯ ───────────
    if (tab === "Инвентаризация") {
      if (invSupported === false) {
        return (
          <View style={{ padding: 12 }}>
            <Text style={{ color: "#475569" }}>
              Раздел «Инвентаризация» требует RPC{" "}
              <Text style={{ fontWeight: "700" }}>
                acc_inv_list / acc_inv_open / acc_inv_finish
              </Text>
              .
            </Text>
          </View>
        );
      }

      return (
        <View style={{ flex: 1 }}>
          <View style={{ padding: 12, flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={createInv}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: "#0ea5e9",
                borderRadius: 10,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                Создать инвентаризацию
              </Text>
            </Pressable>
          </View>

          <FlatList
            data={inv}
            keyExtractor={(x) => x.id}
            renderItem={({ item }) => (
              <View
                style={{
                  padding: 12,
                  borderBottomWidth: 1,
                  borderColor: "#e5e7eb",
                  backgroundColor: "#fff",
                }}
              >
                <Text style={{ fontWeight: "700" }}>
                  {item.id.slice(0, 8)} • {item.status}
                </Text>
                <Text style={{ color: "#64748b" }}>
                  {new Date(item.started_at).toLocaleString("ru-RU")}
                  {item.finished_at
                    ? ` → ${new Date(
                        item.finished_at,
                      ).toLocaleString("ru-RU")}`
                    : ""}
                </Text>
                {item.status !== "Завершена" && (
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 8,
                      marginTop: 8,
                    }}
                  >
                    <Pressable
                      onPress={() => finishInv(item.id)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        backgroundColor: "#16a34a",
                        borderRadius: 10,
                      }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "700" }}>
                        Завершить
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}
            ListEmptyComponent={
              <Text style={{ color: "#475569", padding: 12 }}>
                Сессий нет.
              </Text>
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        </View>
      );
    }

    // ─────────── ОТЧЁТЫ ───────────
    return (
      <ScrollView style={{ flex: 1 }}>
        <View
          style={{
            padding: 12,
            gap: 8,
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: "#e2e8f0",
            borderRadius: 12,
            marginBottom: 10,
          }}
        >
          <Text style={{ fontWeight: "800" }}>Период</Text>
          <TextInput
            value={periodFrom}
            onChangeText={setPeriodFrom}
            placeholder="От (YYYY-MM-DD)"
            style={{
              borderWidth: 1,
              borderColor: "#e2e8f0",
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 8,
            }}
          />
          <TextInput
            value={periodTo}
            onChangeText={setPeriodTo}
            placeholder="До (YYYY-MM-DD)"
            style={{
              borderWidth: 1,
              borderColor: "#e2e8f0",
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 8,
            }}
          />
          <Pressable
            onPress={fetchReports}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: "#0ea5e9",
              borderRadius: 10,
              alignSelf: "flex-start",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>
              Обновить отчёты
            </Text>
          </Pressable>
        </View>

        <View
          style={{
            padding: 12,
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: "#e2e8f0",
            borderRadius: 12,
            marginBottom: 10,
          }}
        >
          <Text style={{ fontWeight: "800", marginBottom: 8 }}>
            Остатки (сводка)
          </Text>
          {repStock.length === 0 ? (
            <Text style={{ color: "#64748b" }}>Нет данных.</Text>
          ) : (
            repStock.map((x, i) => (
              <Text key={i} style={{ color: "#334155" }}>
                {(x.code ?? (x as any).material_id) || "—"} •{" "}
                {x.uom_id || "—"} • Доступно:{" "}
                {nz(
                  x.qty_available ??
                    nz(x.qty_on_hand, 0) - nz(x.qty_reserved, 0),
                  0,
                )}
              </Text>
            ))
          )}
        </View>

        <View
          style={{
            padding: 12,
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: "#e2e8f0",
            borderRadius: 12,
          }}
        >
          <Text style={{ fontWeight: "800", marginBottom: 8 }}>
            Движение за период
          </Text>
          {repMov.length === 0 ? (
            <Text style={{ color: "#64748b" }}>Нет данных.</Text>
          ) : (
            repMov.map((h, i) => (
              <Text key={i} style={{ color: "#334155" }}>
                {new Date(h.event_dt).toLocaleString("ru-RU")} •{" "}
                {h.event_type} • {h.code || "—"} • {h.qty ?? "—"}
              </Text>
            ))
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      {/* Header */}
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 10 }}>
          Склад
        </Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {TABS.map((t) => {
            const active = t === tab;
            return (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: active ? "#0ea5e9" : "#e2e8f0",
                }}
              >
                <Text
                  style={{
                    color: active ? "#fff" : "#0f172a",
                    fontWeight: "700",
                  }}
                >
                  {t}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: "#e5e7eb" }} />

      {/* Body */}
      <View style={{ flex: 1, padding: 12 }}>
        {loading ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 8, color: "#475569" }}>Загрузка…</Text>
          </View>
        ) : (
          renderTab()
        )}
      </View>
    </View>
  );
}



