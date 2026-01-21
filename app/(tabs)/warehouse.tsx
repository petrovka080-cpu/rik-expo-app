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
  Modal,
  Animated,
  Keyboard,
} from "react-native";
import { supabase } from "../../src/lib/supabaseClient";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { webOpenPdfWindow, webWritePdfWindow, webDownloadHtml } from "../../src/lib/rik_api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);


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

  // ✅ новые счётчики по строкам
  pending_cnt: number;
  partial_cnt: number;
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
  ref_table: "rik_materials" | string;
  ref_id: string;
  code: string | null;
  name: string;
  unit_id: string | null;
  sector: string | null;
  score?: number | null;
};

type RikSearchRow = {
  kind: "material";
  ref_table: "rik_materials";
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


type Option = { id: string; label: string };

type Tab =
  | "К приходу"
  | "Склад факт"
  | "Расход"
  | "История"
  | "Инвентаризация"
  | "Отчёты";

const TABS: Tab[] = [
  "К приходу",
  "Склад факт",
  "Расход",
  "История",
  "Инвентаризация",
  "Отчёты",
];
const COLORS = {
  bg: "#F8FAFC",
  text: "#0F172A",
  sub: "#475569",
  border: "#E2E8F0",
  primary: "#111827",
  tabInactiveBg: "#E5E7EB",
  tabInactiveText: "#111827",
  green: "#22C55E",
  yellow: "#CA8A04",
  red: "#EF4444",
};

// безопасный alert (web/mobile)
const safeAlert = (title: string, msg?: string) => {
  if (Platform.OS === "web") window.alert([title, msg].filter(Boolean).join("\n"));
  else Alert.alert(title, msg ?? "");
};

// SafeView: чинит RNW когда в View случайно текст/число
function SafeView({ children, ...rest }: any) {
  const kids = React.Children.toArray(children).map((c, i) => {
    if (typeof c === "string") return c.trim() ? <Text key={`t${i}`}>{c}</Text> : null;
    if (typeof c === "number") return <Text key={`n${i}`}>{String(c)}</Text>;
    if (c && typeof c === "object" && !React.isValidElement(c)) return null;
    return c;
  });
  return <View {...rest}>{kids}</View>;
}

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

// ПАРСЕР: пусто → остаток (для "Оприходовать всё/остатки")
const parseQty = (s: string | undefined | null, left: number) => {
  if (s == null || String(s).trim() === "") return Math.max(0, left);
  const t = String(s).replace(",", ".").replace(/\s+/g, "").trim();
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, Math.max(0, left));
};

// ✅ ПАРСЕР: пусто → 0 (для "Оприходовать выбранное")
const parseQtySelected = (s: string | undefined | null, left: number) => {
  if (s == null || String(s).trim() === "") return 0;
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
// определить тип по rik-коду: ТОЛЬКО материал (склад)
const detectKindLabel = (code?: string | null): string | null => {
  if (!code) return null;
  const c = String(code).toUpperCase();
  return c.startsWith("MAT-") ? "материал" : null;
};
const resolveUnitIdByCode = async (code: string): Promise<string | null> => {
  try {
    const m = await supabase
      .from("rik_materials" as any)
      .select("unit_id")
      .eq("mat_code", code)
      .maybeSingle();
    if (!m.error && m.data?.unit_id) return String(m.data.unit_id);

    return null;
  } catch {
    return null;
  }
};


/** ========= экран ========= */
export default function Warehouse() {
  const insets = useSafeAreaInsets();

  // ✅ СНАЧАЛА tab
  const [tab, setTab] = useState<Tab>("К приходу");

  const isWeb = Platform.OS === "web";
const hasSubRow = tab === "К приходу";

// ✅ safe-area уже применён в app/_layout.tsx
const TOP = 0;

// ✅ высоты шапки — БЕЗ добавления TOP (иначе на web появится воздух)
const HEADER_MAX = hasSubRow ? 130 : 92;
const HEADER_MIN = hasSubRow ? 92 : 72;

  const scrollY = useRef(new Animated.Value(0)).current;
  const HEADER_SCROLL = HEADER_MAX - HEADER_MIN;

  // ✅ web: шапка фикс, collapsing выключен
 const clampedY = useMemo(() => {
  return Animated.diffClamp(scrollY, 0, HEADER_SCROLL);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [HEADER_SCROLL]);


  const headerTranslateY = Animated.multiply(clampedY, -1);

  const titleScale = clampedY.interpolate({
    inputRange: [0, HEADER_SCROLL],
    outputRange: [1, 0.82],
    extrapolate: "clamp",
  });

  const subOpacity = clampedY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const subTranslate = clampedY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, -10],
    extrapolate: "clamp",
  });

  const headerShadowOpacity = Platform.OS === "web" ? 0 : 0.12;

  const onListScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: Platform.OS !== "web",
      }),
    [scrollY],
  );

  useEffect(() => {
  // ✅ не сбрасываем на web — иначе “анимации как будто нет”
  if (!isWeb) scrollY.setValue(0);
}, [isWeb, tab, scrollY]);


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
  // было expanded внутри карточки — теперь модалка
const [itemsModal, setItemsModal] = useState<{
  incomingId: string;
  purchaseId: string;
  poNo: string | null;
  status: string; // incoming_status
} | null>(null);

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
      pending_cnt: Number(x.pending_cnt ?? 0),
      partial_cnt: Number(x.partial_cnt ?? 0),
      }));

    const pending: IncomingRow[] = [];
const partial: IncomingRow[] = [];


for (const r of rows) {
  const exp = nz(r.qty_expected_sum, 0);
  const rec = nz(r.qty_received_sum, 0);
  const left = nz(r.qty_left_sum, Math.max(0, exp - rec));

  // закрытые не показываем
  if (left <= 0) continue;

  if (r.items_cnt <= 0) continue;

  if (r.pending_cnt > 0) pending.push(r);
if (r.partial_cnt > 0) partial.push(r);
}

setToReceivePending(pending);
setToReceivePartial(partial);
setCountPending(pending.length);
setCountPartial(partial.length);
setCountConfirmed(0);
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

        const onlyMaterials = rows.filter((r) => {
  const code = String(r.code ?? "").toUpperCase();
  return code.startsWith("MAT-"); // при желании добавишь EQUIP- отдельно
});
setStock(onlyMaterials);

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
   const [recipientList, setRecipientList] = useState<Option[]>([]);
const [workTypeList, setWorkTypeList] = useState<Option[]>([]);
const [workTypeOpt, setWorkTypeOpt] = useState<Option | null>(null);

  const [pickModal, setPickModal] = useState<{
  what: "object" | "work" | "recipient" | null;
}>({ what: null });

  const [pickFilter, setPickFilter] = useState("");
  const [objectOpt, setObjectOpt] = useState<Option | null>(null);
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

   const loadRecipients = useCallback(async () => {
    const opts = await tryOptions("profiles", ["id", "full_name"]);
    setRecipientList(opts);
  }, [tryOptions]);

const loadWorkTypes = useCallback(async () => {
  const opts = await tryOptions("rik_works", ["id", "name"]);
  setWorkTypeList(opts);
}, [tryOptions]);

  const normalizeToRikRow = useCallback(
  (x: CatalogItem): RikSearchRow => {
    return {
      kind: "material",
      ref_table: "rik_materials",
      ref_id: String(x.ref_id ?? ""),
      code: String(x.code ?? ""),
      name: String(x.name ?? x.code ?? ""),
      unit_id: x.unit_id ? String(x.unit_id) : null,
      unit_label: x.unit_id
        ? uoms[String(x.unit_id)] ?? String(x.unit_id)
        : null,
      sector: x.sector ?? null,
      search_text: (x as any)?.search_text ?? undefined,
    };
  },
  [uoms],
);


  
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

const ci: CatalogItem = {
  ref_table: "rik_materials",
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

          
         return {
  kind: "material",
  ref_table: "rik_materials",
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
  p_kind: "material",
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

          
          const qtyAvail = Number(x.qty_available ?? 0);
          if (Number.isFinite(qtyAvail)) {
            availMap[code] = qtyAvail;
          }

          const ci: CatalogItem = {
  ref_table: "rik_materials",
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
      const canIssue =
        qty > 0 && !!recipientOpt?.id && !!objectOpt?.id;

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
  [qtyToIssue, recipientOpt, objectOpt, workTypeOpt, fetchStock]
);



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

        
        // 5) обновить экраны
        await Promise.all([fetchToReceive(), fetchStock()]);

        Alert.alert("Готово", "Поставка принята на склад.");
      } catch (e) {
        showErr(e);
      } finally {
        setConfirmingId(null);
      }
    },
    [fetchToReceive, fetchStock],
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

    const rowsAll: ItemRow[] = ((q.data as any[]) || []).map((x) => ({
      incoming_item_id: x.incoming_item_id ? String(x.incoming_item_id) : null,
      purchase_item_id: String(x.purchase_item_id),
      code: x.code ? String(x.code) : null,
      name: String(x.name ?? x.code ?? ""),
      uom: x.uom ? String(x.uom) : null,
      qty_expected: nz(x.qty_expected, 0),
      qty_received: nz(x.qty_received, 0),
      sort_key: Number(x.sort_key ?? 1),
    }));

    // ✅ склад: только материалы
    const rows = rowsAll.filter((r) => String(r.code ?? "").toUpperCase().startsWith("MAT-"));

    setItemsByHead((prev) => ({ ...prev, [incomingId]: rows }));
    return rows;
  },
  [itemsByHead],
);

 const openItemsModal = useCallback((head: IncomingRow) => {
  const incomingId = canonId(head.incoming_id);
  setItemsModal({
    incomingId,
    purchaseId: head.purchase_id,
    poNo: head.po_no,
    status: head.incoming_status,
  });
}, [canonId]);

useEffect(() => {
  if (!itemsModal) return;
  // грузим после mount и после того как модалка открылась
  void loadItemsForHead(itemsModal.incomingId, true);
}, [itemsModal, loadItemsForHead]);




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
        await fetchStock();
      } catch (e) {
        showErr(e);
      }
    },
    [fetchToReceive, fetchStock]
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

      const freshRowsAll = (await loadItemsForHead(incomingId, true)) ?? [];
const freshRows = freshRowsAll.filter((r) => {
  const c = String(r.code ?? "").toUpperCase();
  return c.startsWith("MAT-");
});

if (freshRows.length === 0) {
  return Alert.alert(
    "Нет материалов",
    "В этой поставке нет материалов для склада. Работы/услуги смотри в «Подрядчики»."
  );
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
        const qty = parseQtySelected(qtyInputByItem[inputKey], left);
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

    } catch (e) {
      showErr(e);
    } finally {
      setLoading(false);
    }
  }, [fetchToReceive, fetchStock]);


  useEffect(() => {
  loadAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


 useEffect(() => {
  if (tab === "История") fetchHistory().catch(() => {});
  if (tab === "Инвентаризация") fetchInv().catch(() => {});
  if (tab === "Отчёты") fetchReports().catch(() => {});
}, [tab, fetchHistory, fetchInv, fetchReports]);


  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (tab === "К приходу") await fetchToReceive();
      else if (tab === "Склад факт") await fetchStock();
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
    const openPicker = (what: "object" | "work" | "recipient") => setPickModal({ what });


    // Глобальное условие: можно ли сейчас жать «Выдать»
    const canIssueGlobal =
      nz(qtyToIssue, 0) > 0 && !!recipientOpt?.id && !!objectOpt?.id;

    return (
  <View style={{ flex: 1 }}>
    <AnimatedFlatList

      data={catalog}
      keyExtractor={(x, idx) => `cat:${x.ref_id || x.code || "x"}:${idx}`}
      contentContainerStyle={{
        paddingTop: HEADER_MAX + 8,
        paddingBottom: 16,
      }}
      onScroll={onListScroll}
      scrollEventThrottle={16}
      ListHeaderComponent={
        <View>
          {/* Панель параметров выдачи (как было) */}
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
              {/* ОБЪЕКТ */}
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
                  Объект: <Text style={{ fontWeight: "700" }}>{objectOpt?.label ?? "—"}</Text>
                </Text>
              </Pressable>

              {/* ВИД РАБОТ */}
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
                  Вид работ: <Text style={{ fontWeight: "700" }}>{workTypeOpt?.label ?? "—"}</Text>
                </Text>
              </Pressable>

              {/* ПОЛУЧАТЕЛЬ */}
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
                  <Text style={{ fontWeight: "700" }}>{recipientOpt?.label ?? "—"}</Text>
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

            {/* Подсказка */}
            {!(nz(qtyToIssue, 0) > 0 && !!recipientOpt?.id && !!objectOpt?.id) && (
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

          {/* Поиск по каталогу (как было) */}
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
            <Text style={{ fontWeight: "800", marginBottom: 6 }}>Каталог: материалы</Text>

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
        </View>
      }
      renderItem={({ item }) => {
        const avail = availability[item.code] ?? 0;
        const canIssue = nz(qtyToIssue, 0) > 0 && !!recipientOpt?.id && !!objectOpt?.id;

        return (
          <View
            style={{
              padding: 12,
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 12,
              backgroundColor: "#fff",
              marginBottom: 10,
              marginHorizontal: 12, // чтобы было как раньше с paddingHorizontal контейнера
            }}
          >
            <Text style={{ fontWeight: "800" }}>{item.name}</Text>
            <Text style={{ color: "#475569" }}>
              {item.code} • {item.unit_label ?? item.unit_id ?? "—"} • Доступно: {avail}
            </Text>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
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
                <Text style={{ color: "#fff", fontWeight: "700" }}>Выдать</Text>
              </Pressable>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        <Text style={{ color: "#475569", paddingHorizontal: 12 }}>Ничего не найдено.</Text>
      }
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
else if (pickModal.what === "recipient") setRecipientOpt(item);

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
                   <AnimatedFlatList

  data={toReceive}
  keyExtractor={(i) => i.incoming_id}
contentContainerStyle={{
  paddingTop: HEADER_MAX + TOP + 8,
  paddingBottom: 6,
}}


onScroll={onListScroll}
scrollEventThrottle={16}

  renderItem={({ item }) => {

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
  onPress={() => openItemsModal(item)}
  style={{
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
  }}
>
  <Text>Показать позиции</Text>
</Pressable>
 </View>
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
  <AnimatedFlatList

    data={stockMaterialsByCode}
    keyExtractor={(i) => i.material_id}

    contentContainerStyle={{ paddingTop: HEADER_MAX + 8, paddingBottom: 6 }}
onScroll={onListScroll}
scrollEventThrottle={16}


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
  <AnimatedFlatList

    data={history}
    keyExtractor={(_, idx) => `h-${idx}`}

    contentContainerStyle={{ paddingTop: HEADER_MAX + 8, paddingBottom: 12 }}
onScroll={onListScroll}
scrollEventThrottle={16}


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
  <AnimatedFlatList

    data={inv}
    keyExtractor={(x) => x.id}
    contentContainerStyle={{ paddingTop: HEADER_MAX + 8, paddingBottom: 12 }}
    onScroll={onListScroll}
    scrollEventThrottle={16}
    ListHeaderComponent={
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
    }
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
            ? ` → ${new Date(item.finished_at).toLocaleString("ru-RU")}`
            : ""}
        </Text>

        {item.status !== "Завершена" && (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
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
      <Text style={{ color: "#475569", padding: 12 }}>Сессий нет.</Text>
    }
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
  />
);

    }

    // ─────────── ОТЧЁТЫ ───────────
    return (
 <AnimatedScrollView
  style={{ flex: 1 }}
  contentContainerStyle={{ paddingTop: HEADER_MAX + 8, paddingBottom: 12 }}
  onScroll={onListScroll}
  scrollEventThrottle={16}
>
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
       </AnimatedScrollView>
    );
  };
const header = useMemo(() => (
  <SafeView style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 }}>
    <SafeView style={{ flexDirection: "row", alignItems: "center" }}>
      <Animated.Text
        style={{
          fontSize: 22,
          fontWeight: "900",
          color: COLORS.text,
          transform: [{ scale: titleScale as any }],
          // transformOrigin на RN иногда глючит — лучше убрать
        }}
      >
        Склад
      </Animated.Text>
    </SafeView>

    <SafeView style={{ height: 4 }} />

    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingRight: 12 }}
    >
      {TABS.map((t) => {
        const active = tab === t;
        return (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: active ? COLORS.primary : COLORS.tabInactiveBg,
            }}
          >
            <Text style={{ color: active ? "#fff" : COLORS.tabInactiveText, fontWeight: "800" }}>
              {t}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>

    <Animated.View
      style={{
        opacity: subOpacity,
        marginTop: 10,
        transform: [{ translateY: subTranslate as any }],
      }}
    >
      {tab === "К приходу" ? (
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Pressable
            onPress={() => setRecvFilter("pending")}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 999,
              backgroundColor: recvFilter === "pending" ? COLORS.primary : "#fff",
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Text style={{ fontWeight: "900", color: recvFilter === "pending" ? "#fff" : COLORS.text }}>
              Ожидает: {countPending}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setRecvFilter("partial")}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 999,
              backgroundColor: recvFilter === "partial" ? COLORS.primary : "#fff",
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Text style={{ fontWeight: "900", color: recvFilter === "partial" ? "#fff" : COLORS.text }}>
              Частично: {countPartial}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </Animated.View>
  </SafeView>
), [tab, titleScale, subOpacity, subTranslate, recvFilter, countPending, countPartial]);

    return (
    <SafeView style={{ flex: 1, backgroundColor: COLORS.bg }}>
                {/* Collapsing Header */}
     <Animated.View
  style={{
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,

    // ✅ высота только под контент шапки
    height: HEADER_MAX + TOP,

    transform: [{ translateY: headerTranslateY as any }],
    overflow: "hidden",
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderColor: COLORS.border,

    // ✅ вот здесь убираем воздух сверху на web
    paddingTop: TOP,
    paddingBottom: 6,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    shadowOpacity: headerShadowOpacity as any,
    elevation: 6,
  }}
>
  {header}
</Animated.View>


      {/* BODY */}
      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 8, color: COLORS.sub }}>Загрузка…</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* ВАЖНО: контент уходит под шапку */}
            <View
  style={{
    flex: 1,
    paddingHorizontal: 12,
    paddingBottom: 0, // ✅ не добавляем снизу — списки сами дадут минимум
  }}
>

              {/* чтобы скролл шевелил header — прокидываем onScroll ниже */}
              <SafeView style={{ flex: 1 }}>
  {renderTab()}
</SafeView>


            </View>
          </View>
        )}
      </View>
<Modal
  visible={!!itemsModal}
  animationType="slide"
  onRequestClose={() => setItemsModal(null)}
>
  <SafeView style={{ flex: 1, backgroundColor: COLORS.bg }}>
    {/* Top bar */}
    <View
      style={{
        paddingTop: Platform.OS === "web" ? 12 : (insets.top || 12),
        paddingHorizontal: 12,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.bg,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Pressable
          onPress={() => setItemsModal(null)}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: COLORS.border,
            backgroundColor: "#fff",
          }}
        >
          <Text style={{ fontWeight: "800" }}>Назад</Text>
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "900", fontSize: 16, color: COLORS.text }}>
            Позиции прихода
          </Text>
          <Text style={{ color: COLORS.sub }}>
            {itemsModal?.poNo ?? itemsModal?.purchaseId ?? "—"}
          </Text>
        </View>

        {itemsModal?.status !== "confirmed" ? (
          <Pressable
            onPress={() => itemsModal && receiveSelectedForHead(itemsModal.incomingId)}
            disabled={receivingHeadId === itemsModal?.incomingId}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor:
                receivingHeadId === itemsModal?.incomingId ? "#94a3b8" : "#0ea5e9",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "900" }}>
              {receivingHeadId === itemsModal?.incomingId ? "..." : "Оприходовать"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={{ marginTop: 8, color: COLORS.sub }}>
        Введите кол-во только для тех позиций, которые хотите принять (пусто — не трогаем).
      </Text>
    </View>

    {/* Items list */}
    <AnimatedFlatList
      data={itemsModal ? (itemsByHead[itemsModal.incomingId] ?? []) : []}
      keyExtractor={(r, idx) => String(r.incoming_item_id ?? r.purchase_item_id ?? idx)}
      contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
      renderItem={({ item }) => {
        const exp = nz(item.qty_expected, 0);
        const rec = nz(item.qty_received, 0);
        const left = Math.max(0, exp - rec);
        const inputKey = (item.incoming_item_id ?? item.purchase_item_id) as string;
        const val = qtyInputByItem[inputKey] ?? "";

        return (
          <View
            style={{
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: "#e2e8f0",
              borderRadius: 12,
              padding: 12,
              marginBottom: 10,
              gap: 6,
            }}
          >
            <Text style={{ fontWeight: "900", color: COLORS.text }}>
              {item.name} {item.code ? `(${item.code})` : ""}
            </Text>

            <Text style={{ color: COLORS.sub }}>
              {item.uom || "—"} • Ожидается: {exp} • Принято: {rec} • Остаток: {left}
            </Text>

            {itemsModal?.status !== "confirmed" && left > 0 ? (
              <TextInput
                value={val}
                onChangeText={(t) => {
                  const cleaned = t.replace(",", ".").replace(/\s+/g, "");
                  setQtyInputByItem((prev) => ({
                    ...prev,
                    [inputKey]:
                      cleaned === "" || /^0+(\.0+)?$/.test(cleaned) ? "" : cleaned,
                  }));
                }}
                onFocus={() => {
                  setQtyInputByItem((prev) => {
                    const cur = prev[inputKey] ?? "";
                    if (cur !== "") return prev;
                    return { ...prev, [inputKey]: String(left) };
                  });
                }}
                keyboardType="numeric"
                placeholder={`Кол-во (ост: ${left})`}
                style={{
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  backgroundColor: "#fff",
                }}
              />
            ) : (
              <Text style={{ color: "#64748b" }}>Позиция уже закрыта.</Text>
            )}
          </View>
        );
      }}
      ListEmptyComponent={
        <Text style={{ color: COLORS.sub, padding: 12 }}>Позиции не найдены.</Text>
      }
    />
  </SafeView>
</Modal>

    </SafeView>
  );

}



