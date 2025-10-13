// app/(tabs)/warehouse.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, FlatList, Pressable, Alert, ActivityIndicator,
  RefreshControl, Platform, TextInput, ScrollView, Modal
} from "react-native";
import { supabase } from "../../src/lib/supabaseClient";

/** ========= типы ========= */
type IncomingRow = {
  id: string;                // wh_incoming.id или синтетический "p:<purchase_id>"
  purchase_id: string;
  status: "pending" | "confirmed" | string;
  qty?: number | null;
  note?: string | null;
  created_at?: string | null;
  confirmed_at?: string | null;
  po_no?: string | null;     // из compat
  purchase_status?: string | null;
};

type StockRow = {
  material_id: string;
  rik_code?: string | null;
  name_human?: string | null;
  uom_id?: string | null;
  qty_on_hand?: number;
  qty_reserved?: number;
  qty_available?: number;
  object_name?: string | null;
  warehouse_name?: string | null;
  updated_at?: string | null;
};

type HistoryRow = {
  event_dt: string;
  event_type: string; // 'RECEIPT' | 'ISSUE'
  purchase_id?: string | null;
  rik_code?: string | null;
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
  rik_code: string;
  name: string;
  unit_id: string | null;
  unit_label?: string | null;
  sector: string | null;
};

type InvSession = {
  id: string;
  object_id: string | null;
  started_at: string;
  finished_at: string | null;
  status: string;
  comment: string | null;
};

type ItemRow = {
  incoming_item_id: string;
  purchase_item_id: string;
  rik_code?: string | null;
  name_human: string;
  uom?: string | null;
  qty_expected: number;
  qty_received: number;
};

type Option = { id: string; label: string };

type Tab =
  | "К приходу"
  | "Склад факт"
  | "Расход"
  | "История"
  | "Инвентаризация"
  | "Отчёты";

const TABS: Tab[] = ["К приходу", "Склад факт", "Расход", "История", "Инвентаризация", "Отчёты"];


/** ========= утилиты ========= */
const nz = (v: any, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const showErr = (e: any) =>
  Alert.alert("Ошибка", String(e?.message || e?.error_description || e?.hint || e || "Неизвестная ошибка"));
const pickErr = (e: any) => String(e?.message || e?.error_description || e?.hint || JSON.stringify(e));
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
// Проверка на UUID
const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s));

// определить unit_id по rik_code
const resolveUnitIdByCode = async (rik_code: string): Promise<string | null> => {
  try {
    const m = await supabase.from("rik_materials" as any).select("unit_id").eq("mat_code", rik_code).maybeSingle();
    if (!m.error && m.data?.unit_id) return String(m.data.unit_id);
    const w = await supabase.from("rik_works" as any).select("unit_id").eq("rik_code", rik_code).maybeSingle();
    if (!w.error && w.data?.unit_id) return String(w.data.unit_id);
    return null;
  } catch { return null; }
};

/** ========= экран ========= */
export default function Warehouse() {
  const [tab, setTab] = useState<Tab>("К приходу");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /** ===== К ПРИХОДУ ===== */
  const [toReceive, setToReceive] = useState<IncomingRow[]>([]);
  const [recvFilter, setRecvFilter] =
    useState<"pending" | "partial" | "confirmed">("pending");
  const [countPending, setCountPending] = useState(0);
  const [countConfirmed, setCountConfirmed] = useState(0);
  const [countPartial, setCountPartial] = useState(0);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // ─── НОВОЕ: карта алиасов p:<pid> -> <real_incoming_id> ───
  const [headIdAlias, setHeadIdAlias] = useState<Record<string, string>>({});

  // раскрытая шапка (всегда в каноническом id: real либо p:<id> если ещё не материализована)
  const [expanded, setExpanded] = useState<string | null>(null);
  const [itemsByHead, setItemsByHead] = useState<Record<string, ItemRow[]>>({});
  const [qtyInputByItem, setQtyInputByItem] = useState<Record<string, string>>({});
  const [receivingHeadId, setReceivingHeadId] = useState<string | null>(null);

  // helper: получить канонический id для рендера/операций
  const canonId = useCallback((id: string) => headIdAlias[id] ?? id, [headIdAlias]);

  const fetchToReceive = useCallback(async () => {
    try {
      const sel = "id, purchase_id, status, qty, note, created_at, confirmed_at, po_no, purchase_status";
      const all = await supabase
        .from("wh_incoming_compat" as any)
        .select(sel)
        .order("created_at", { ascending: false });

      let rows = (all.data || []) as IncomingRow[];

      // фоллбек: добавим утверждённые закупки без записей wh_incoming
      try {
        const covered = new Set(rows.map(r => r.purchase_id).filter(Boolean) as string[]);
        const po = await supabase
          .from("purchases" as any)
          .select("id, po_no, status, created_at")
          .in("status", ["Утверждено", "Approved"] as any)
          .order("created_at", { ascending: false })
          .limit(200);

        if (!po.error && Array.isArray(po.data)) {
          const synth: IncomingRow[] = [];
          for (const p of po.data as any[]) {
            const pid = String(p.id);
            if (covered.has(pid)) continue;
            synth.push({
              id: `p:${pid}`,
              purchase_id: pid,
              status: "pending",
              qty: null,
              note: null,
              created_at: p.created_at ?? null,
              confirmed_at: null,
              po_no: p.po_no ?? null,
              purchase_status: p.status ?? "Утверждено",
            });
          }
          if (synth.length) rows = [...synth, ...rows];
        }
      } catch (e) {
        console.warn("[warehouse] fallback purchases:", e);
      }

      // === расчёт прогресса и раскладка по корзинам ===
      type Agg = { exp: number; rec: number; };
      const progress: Record<string, Agg> = {};

      // реальные шапки → суммы из wh_incoming_items
      const realIds = rows.map(r => r.id).filter(id => isUuid(id));
      if (realIds.length) {
        const agg = await supabase
          .from("wh_incoming_items" as any)
          .select("incoming_id, qty_expected, qty_received")
          .in("incoming_id", realIds)
          .limit(20000);
        if (!agg.error && Array.isArray(agg.data)) {
          for (const x of agg.data as any[]) {
            const id = String(x.incoming_id);
            const exp = nz(x.qty_expected, 0);
            const rec = nz(x.qty_received, 0);
            if (!progress[id]) progress[id] = { exp: 0, rec: 0 };
            progress[id].exp += exp;
            progress[id].rec += rec;
          }
        }
      }

      // синтетика p:<pid> → суммы из purchase_items (rec=0)
      const synth = rows.filter(r => String(r.id).startsWith("p:"));
      if (synth.length) {
        const pids = synth.map(r => r.purchase_id).filter(Boolean) as string[];
        if (pids.length) {
          const pi = await supabase
            .from("purchase_items" as any)
            .select("purchase_id, qty")
            .in("purchase_id", pids)
            .limit(20000);
          if (!pi.error && Array.isArray(pi.data)) {
            const sumByPid: Record<string, number> = {};
            for (const x of pi.data as any[]) {
              const s = String(x.qty ?? "").trim();
              const n = Number(s.replace(/[^\d,\.\-]+/g, "").replace(",", "."));
              const q = Number.isFinite(n) ? n : 0;
              const pid = String(x.purchase_id ?? "");
              sumByPid[pid] = (sumByPid[pid] ?? 0) + q;
            }
            for (const r of synth) {
              progress[r.id] = { exp: sumByPid[r.purchase_id] ?? 0, rec: 0 };
            }
          }
        }
      }

      // классификация
      let cPending = 0, cPartial = 0, cConfirmed = 0;
      const filtered: IncomingRow[] = [];
      for (const r of rows) {
        const pr = progress[r.id] ?? { exp: nz(r.qty ?? 0), rec: 0 };
        const left = Math.max(0, pr.exp - pr.rec);
        let bucket: "pending" | "partial" | "confirmed";
        if (r.status === "confirmed") bucket = "confirmed";
        else if (pr.rec > 0 && left > 0) bucket = "partial";
        else bucket = "pending";

        if (bucket === "pending") cPending++;
        else if (bucket === "partial") cPartial++;
        else cConfirmed++;

        if (recvFilter === "pending" && bucket === "pending") filtered.push(r);
        if (recvFilter === "partial" && bucket === "partial") filtered.push(r);
        if (recvFilter === "confirmed" && bucket === "confirmed") filtered.push(r);
      }

      setCountPending(cPending);
      setCountPartial(cPartial);
      setCountConfirmed(cConfirmed);
      setToReceive(filtered);
    } catch (e) {
      setToReceive([]); setCountPending(0); setCountPartial(0); setCountConfirmed(0);
      console.warn("[warehouse] fetchToReceive:", e);
    }
  }, [recvFilter]);

  useEffect(() => { fetchToReceive().catch(() => {}); }, [fetchToReceive]);

  const confirmIncoming = useCallback(async (whIncomingId: string) => {
    try {
      setConfirmingId(whIncomingId);
      // ✅ фикс: здесь должна вызываться confirm, а не receive_item
      const r = await supabase.rpc('wh_receive_confirm' as any, { p_wh_id: whIncomingId } as any);
      if (r.error) {
        console.warn("[wh_receive_confirm] rpc error:", r.error.message);
        const q = await supabase.from("wh_incoming" as any).select("purchase_id").eq("id", whIncomingId).maybeSingle();
        const pid = q?.data?.purchase_id;
        if (pid) {
          const upd = await supabase.from("purchases" as any).update({ status: "На складе" }).eq("id", pid);
          if (upd.error) throw upd.error;
        }
      }
      await fetchToReceive();
      await fetchStock();
      Alert.alert("Готово", "Поставка принята на склад.");
    } catch (e) { showErr(e); }
    finally { setConfirmingId(null); }
  }, [fetchToReceive]);

  // создать реальный wh_incoming для синтетической шапки p:<purchase_id>
  const ensureRealIncoming = useCallback(async (headId: string) => {
    try {
      if (!headId.startsWith("p:")) return headId; // уже реальный
      const purchaseId = headId.slice(2);

      // попробуем известные RPC
      const tryRpcs = [
        "wh_incoming_open_from_purchase",
        "wh_incoming_seed_from_purchase",
        "wh_incoming_create_from_purchase",
      ];
      for (const fn of tryRpcs) {
        try {
          const r = await supabase.rpc(fn as any, { p_purchase_id: purchaseId } as any);
          if (!r.error && r.data) {
            const real = String(r.data);
            setHeadIdAlias(prev => ({ ...prev, [headId]: real }));
            await fetchToReceive();
            return real;
          }
        } catch {}
      }

      // REST фоллбэк (если RLS позволяет)
      // 1) создаём шапку
      const ins = await supabase
        .from("wh_incoming" as any)
        .insert({ purchase_id: purchaseId, status: "pending" } as any)
        .select("id")
        .single();
      if (ins.error) throw ins.error;
      const realId = String(ins.data.id);

      // 2) создаём позиции из purchase_items
      const pi = await supabase
        .from("purchase_items" as any)
        .select("id, rik_code, name, uom, qty")
        .eq("purchase_id", purchaseId);
      if (!pi.error && Array.isArray(pi.data) && pi.data.length > 0) {
        const rows = (pi.data as any[]).map(x => {
          const qty = (() => {
            const s = String(x.qty ?? "").trim();
            if (!s) return 0;
            const n = Number(s.replace(/[^\d,\.\-]+/g, "").replace(",", "."));
            return Number.isFinite(n) ? n : 0;
          })();
          return {
            incoming_id: realId,
            purchase_item_id: x.id,
            rik_code: x.rik_code ?? null,
            name_human: x.name ?? x.rik_code ?? null,
            uom: x.uom ?? null,
            qty_expected: qty,
            qty_received: 0,
          };
        }).filter(r => r.qty_expected > 0);

        if (rows.length) {
          const bulk = await supabase.from("wh_incoming_items" as any).insert(rows as any);
          if (bulk.error) console.warn("[ensureRealIncoming] insert items warning:", bulk.error.message);
        }
      }

      setHeadIdAlias(prev => ({ ...prev, [headId]: realId }));
      await fetchToReceive();
      return realId;
    } catch (e) {
      showErr(e);
      return headId;
    }
  }, [fetchToReceive, supabase]);

  /// Функция восстановления позиций, если их нет
  const reseedIncomingItems = async (incomingId: string, purchaseId: string) => {
    console.log("[reseedIncomingItems] start", { incomingId, purchaseId });

    const pi = await supabase
      .from("purchase_items" as any)
      .select(`
        id, request_item_id, qty, uom,
        request_items:request_items ( rik_code, name_human, uom )
      `)
      .eq("purchase_id", purchaseId);

    if (pi.error) {
      console.warn("[reseedIncomingItems] select error:", pi.error.message, pi.error.details, pi.error.hint, pi.error.code);
      return false;
    }
    console.log("[reseedIncomingItems] select rows:", Array.isArray(pi.data) ? pi.data.length : 0);

    const rows = (pi.data as any[]).map(x => {
      const s = String(x.qty ?? "").trim();
      const qtyNum = s ? Number(s.replace(/[^\d,\.\-]+/g, "").replace(",", ".")) : 0;
      const ri = x.request_items ?? {};
      const piId = String(x.id ?? "");
      const row: any = {
        incoming_id: incomingId,
        // purchase_item_id: пишем только если UUID; иначе колонка пропускается
        ...(isUuid(piId) ? { purchase_item_id: piId } : {}),
        rik_code: ri.rik_code ?? null,
        name_human: (ri.name_human ?? ri.rik_code ?? null),
        uom: (x.uom ?? ri.uom ?? null),
        qty_expected: Number.isFinite(qtyNum) ? qtyNum : 0,
        qty_received: 0,
      };
      return row;
    }).filter(r => r.qty_expected > 0);

    console.log("[reseedIncomingItems] rows to insert:", rows.length);

    if (rows.length === 0) return false;

    const ins = await supabase.from("wh_incoming_items" as any).insert(rows as any);
    if (ins.error) {
      console.warn("[reseedIncomingItems] insert error:", ins.error.message, ins.error.details, ins.error.hint, ins.error.code);
      return false;
    }
    console.log("[reseedIncomingItems] insert ok");
    return true;
  };

  // ===== нормализация строки -> число
  const __toNum = (v: any): number => {
    if (v == null) return 0;
    const s = String(v).trim();
    if (!s) return 0;
    const cleaned = s.replace(/[^\d,\.\-]+/g, "").replace(",", ".").replace(/\s+/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  };

  // ===== безопасные геттеры
  const __pick = (row: any, names: string[], def?: any) => {
    for (const n of names) if (row && row[n] !== undefined && row[n] !== null) return row[n];
    return def;
  };
  const __pickDeep = (obj: any, paths: string[]): any => {
    for (const p of paths) {
      try {
        const v = p.split(".").reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), obj);
        if (v !== undefined && v !== null) return v;
      } catch {}
    }
    return undefined;
  };

  // ===== приведение любой БД-строки к ItemRow
  const mapRow = (x: any, syntheticBase?: string): ItemRow => {
    const rik_code =
      String(
        __pick(x, ["rik_code", "mat_code", "code"], __pickDeep(x, ["request_items.rik_code"]) || "")
        || ""
      ) || null;

    const name_human =
      String(
        __pick(x, ["name_human", "name", "title"], __pickDeep(x, ["request_items.name_human","request_items.name"]) || (rik_code ?? ""))
        || (rik_code ?? "")
      );

    const uom =
      __pick(x, ["uom", "uom_id", "unit", "unit_id", "uom_code"], null)
      ?? __pickDeep(x, ["request_items.uom","request_items.unit","request_items.unit_id"])
      ?? null;

    // кандидаты «Ожидается»
    const expRaw =
      __pick(x, [
        "qty_expected", "total_qty",
        "qty_plan", "qty_approved", "qty_total", "quantity", "qty",
        "approved_qty", "planned_qty", "qty_ordered", "qty_txt",
        "qty_expected_txt", "approved_qty_txt", "count", "cnt", "pcs", "qty_units",
        "quantity_value", "q", "qnty"
      ]) ??
      __pickDeep(x, [
        "meta.qty", "meta.quantity", "meta.qty_approved", "meta.qty_expected",
        "details.qty", "details.quantity", "extra.qty", "extra.quantity",
        "row.qty", "row.quantity",
        "request_items.qty"
      ]);

    // кандидаты «Принято»
    const recRaw =
      __pick(x, [
        "qty_received","received","qty_recv","fact_qty","received_qty",
        "qty_fact","qty_accepted","accepted_qty","qty_in","qty_received_txt"
      ]) ??
      __pickDeep(x, [
        "meta.qty_received","meta.received","details.qty_received","details.received",
        "row.qty_received","row.received"
      ]);

    const qty_expected = __toNum(expRaw);
    const qty_received = __toNum(recRaw);

    return {
      incoming_item_id: String(x?.incoming_item_id ?? x?.id ?? (syntheticBase ? `${syntheticBase}:${x?.id ?? ""}` : "")),
      purchase_item_id: String(__pick(x, ["purchase_item_id", "pi_id", "id"], "")),
      rik_code,
      name_human,
      uom,
      qty_expected,
      qty_received,
    };
  };

  /** ===== загрузка позиций под шапкой (каскад источников) ===== */
  const loadItemsForHead = useCallback(
    async (incomingIdRaw: string, force = false): Promise<ItemRow[] | undefined> => {
      const incomingId = canonId(incomingIdRaw);
      if (!incomingId) return [];

      if (!force && Object.prototype.hasOwnProperty.call(itemsByHead, incomingId)) {
        console.log("[loadItemsForHead] cache hit", { incomingIdRaw, incomingId });
        return itemsByHead[incomingId];
      }

      // найти purchase_id (+ поддержка "p:<purchase_id>")
      let purchaseId: string | null =
        toReceive.find((x) => canonId(x.id) === incomingId)?.purchase_id ?? null;
      if (!purchaseId && typeof incomingIdRaw === "string" && incomingIdRaw.startsWith("p:")) {
        purchaseId = incomingIdRaw.slice(2);
      }

      const isSynthetic = String(incomingIdRaw).startsWith("p:");
      console.log("[loadItemsForHead] start", { incomingIdRaw, incomingId, isSynthetic, purchaseId });

      // если purchaseId всё ещё нет — дёрнем саму шапку wh_incoming (делаем ПОСЛЕ объявления isSynthetic)
      if (!purchaseId && isUuid(incomingId) && !isSynthetic) {
        try {
          const qHead = await supabase
            .from("wh_incoming" as any)
            .select("purchase_id")
            .eq("id", incomingId)
            .maybeSingle();
          if (!qHead.error && qHead.data?.purchase_id) {
            purchaseId = String(qHead.data.purchase_id);
            console.log("[loadItemsForHead] purchase_id fallback from wh_incoming", { purchaseId });
          }
        } catch (e) {
          console.warn("[loadItemsForHead] purchase_id fallback err:", e);
        }
      }

      // 1) RPC по реальному incoming (только если id = UUID)
      if (!isSynthetic && isUuid(incomingId)) {
        console.log("[loadItemsForHead] trying RPC list_wh_items", incomingId);
        try {
          const r = await supabase.rpc("list_wh_items" as any, { p_incoming_id: incomingId } as any);
          if (!r.error && Array.isArray(r.data) && r.data.length > 0) {
            const rows = (r.data as any[]).map((x) => mapRow(x));
            setItemsByHead((prev) => ({ ...prev, [incomingId]: rows }));
            return rows;
          }
          if (r.error) {
            console.warn(
              "[list_wh_items] rpc error:",
              r.error.message, r.error.details, r.error.hint, (r as any).status
            );
          }
        } catch (e: any) {
          console.warn("[list_wh_items] throw:", e?.message || e);
        }
      } else if (!isSynthetic) {
        console.warn("[list_wh_items] skipped: incomingId is not UUID:", incomingId);
      }

      // 2) wh_incoming_items (реальный incoming)
      if (!isSynthetic) {
        console.log("[loadItemsForHead] trying wh_incoming_items", incomingId);
        const fb = await supabase
          .from("wh_incoming_items" as any)
          .select("*")
          .eq("incoming_id", incomingId)
          .order("created_at", { ascending: true });

        if (!fb.error && Array.isArray(fb.data) && fb.data.length > 0) {
          const rows = (fb.data as any[]).map((x) => mapRow(x));
          setItemsByHead((prev) => ({ ...prev, [incomingId]: rows }));
          return rows;
        }

        // если реальная шапка, но позиций нет — тихо ресидим из purchase_items и перечитываем
        if (purchaseId) {
          console.log("[loadItemsForHead] reseed try", { incomingId, purchaseId });
          const seeded = await reseedIncomingItems(incomingId, purchaseId);
          if (seeded) {
            const fb2 = await supabase
              .from("wh_incoming_items" as any)
              .select("*")
              .eq("incoming_id", incomingId)
              .order("created_at", { ascending: true });
            if (!fb2.error && Array.isArray(fb2.data) && fb2.data.length > 0) {
              const rows = (fb2.data as any[]).map((x) => mapRow(x));
              setItemsByHead((prev) => ({ ...prev, [incomingId]: rows }));
              return rows;
            }
          }
        }
      }

      // 3) purchase_items — ТОЛЬКО для синтетики ("p:<pid>")
      if (isSynthetic && purchaseId) {
        console.log("[loadItemsForHead] trying purchase_items (synthetic)", { incomingIdRaw, purchaseId });
        const pi = await supabase
          .from("purchase_items" as any)
          .select(`
            id, purchase_id, request_item_id,
            qty, uom,
            request_items:request_items ( rik_code, name_human, uom, qty )
          `)
          .eq("purchase_id", purchaseId)
          .order("id", { ascending: true });

        if (!pi.error && Array.isArray(pi.data) && pi.data.length > 0) {
          const rows = (pi.data as any[]).map((x) => mapRow(x, incomingIdRaw)); // incoming_item_id = "p:<pid>:<pi_id>"
          setItemsByHead((prev) => ({ ...prev, [incomingId]: rows }));
          return rows;
        }
        // доп.кейс: snapshot
        const link = await supabase
          .from("purchases" as any)
          .select("proposal_id")
          .eq("id", purchaseId!)
          .maybeSingle();
        const propId = link?.data?.proposal_id;
        if (propId) {
          const r2 = await supabase
            .from("proposal_snapshot_items" as any)
            .select("*")
            .eq("proposal_id", propId)
            .order("id", { ascending: true });
          if (!r2.error && Array.isArray(r2.data) && r2.data.length > 0) {
            const rows = (r2.data as any[]).map((x) => mapRow(x, incomingIdRaw));
            setItemsByHead((prev) => ({ ...prev, [incomingId]: rows }));
            return rows;
          }
        }
      }

      // 4) пусто
      console.log("[loadItemsForHead] empty", { incomingIdRaw, incomingId, isSynthetic, purchaseId });
      setItemsByHead((prev) => ({ ...prev, [incomingId]: [] }));
      return [];
    },
    [itemsByHead, toReceive, canonId, reseedIncomingItems]
  );

  // ===== раскрыть/скрыть карточку и загрузить позиции =====
  const onToggleHead = useCallback(
    async (incomingIdRaw: string) => {
      const id = canonId(incomingIdRaw);
      const next = expanded === id ? null : id;
      setExpanded(next);
      if (next) {
        setItemsByHead((prev) => ({ ...prev, [next]: prev[next] ?? [] }));
        await loadItemsForHead(next, true);
      }
    },
    [expanded, loadItemsForHead, canonId]
  );

  // частичная приёмка одной строки (как было, только RPC v2)
  const receivePart = useCallback(async (incomingItemId: string, qty: number) => {
    try {
      if (!incomingItemId) return Alert.alert("Нет позиции", "Неизвестный ID позиции прихода");
      const q = Number(qty);
      if (!Number.isFinite(q) || q <= 0) return Alert.alert("Количество", "Введите положительное количество.");
      const r = await supabase.rpc('wh_receive_item_v2' as any, { p_incoming_item_id: incomingItemId, p_qty: q } as any);
      if (r.error) return Alert.alert("Ошибка прихода", pickErr(r.error));

      await fetchToReceive();
      if (expanded) {
        setItemsByHead(prev => { const c = { ...prev }; delete c[expanded]; return c; });
        await loadItemsForHead(expanded, true);
        setQtyInputByItem(prev => { const n = { ...prev }; delete n[incomingItemId]; return n; });
      }
      await fetchStock();
    } catch (e) { showErr(e); }
  }, [expanded, fetchToReceive, loadItemsForHead]);

  // полная приёмка (как было)
  const receiveAllHead = useCallback(async (incomingIdRaw: string, _purchaseId: string) => {
    try {
      const incomingId = canonId(incomingIdRaw);
      if (!itemsByHead[incomingId]) await loadItemsForHead(incomingId, true);
      const rows = itemsByHead[incomingId] || [];
      if (rows.length === 0) {
        return Alert.alert("Нет позиций", "Под этой поставкой нет строк для прихода. Раскрой «Показать позиции» и проверь состав.");
      }
      const totalLeft = rows.reduce((s, r) => s + Math.max(0, nz(r.qty_expected,0) - nz(r.qty_received,0)), 0);
      if (totalLeft <= 0) return Alert.alert("Нечего приходовать", "Все позиции уже приняты.");

      const pr = await supabase.rpc('wh_receive_confirm' as any, { p_wh_id: incomingId } as any);
      if (pr.error) return Alert.alert("Ошибка полного прихода", pickErr(pr.error));

      await fetchToReceive();
      setItemsByHead(prev => { const c = { ...prev }; delete c[incomingId]; return c; });
      await fetchStock();
      Alert.alert('Готово','Поставка оприходована полностью');
    } catch (e) { showErr(e); }
  }, [itemsByHead, fetchToReceive, loadItemsForHead, canonId]);

  // ===== общая кнопка "Оприходовать выбранное" под списком позиций =====
  const receiveSelectedForHead = useCallback(async (incomingIdInitial: string) => {
    try {
      if (!incomingIdInitial) return;

      // 1) материализуем синтетику
      let incomingId = incomingIdInitial;
      if (incomingId.startsWith("p:")) {
        const real = await ensureRealIncoming(incomingId);
        if (real) incomingId = real;
      }
      const cid = canonId(incomingId);

      // 2) гарантируем, что строки существуют в БД
      if (!isUuid(cid)) {
        return Alert.alert("Ошибка", "Неверный ID поставки");
      }
      await ensurePositionsForHead(cid);

      // 3) берём СВЕЖИЙ список строк (чтобы ids были актуальные)
      const freshRows = (await loadItemsForHead(cid, true)) ?? [];
      if (freshRows.length === 0) {
        return Alert.alert("Нет позиций", "Под этой шапкой нет строк для прихода.");
      }

      // 4) собираем только реальные UUID строки + введённые > 0
      const toApply: Array<{ id: string; qty: number }> = [];
      for (const r of freshRows) {
        const exp = nz(r.qty_expected, 0);
        const rec = nz(r.qty_received, 0);
        const left = Math.max(0, exp - rec);
        if (!left) continue;

        const id = r.incoming_item_id;
        if (!isUuid(id)) continue; // никакой синтетики
        const qty = parseQty(qtyInputByItem[id], left);
        if (qty > 0) toApply.push({ id, qty });
      }

      if (toApply.length === 0) {
        return Alert.alert("Нечего оприходовать", "Введите количество > 0 для нужных строк.");
      }

      // 5) страховка от «не найдена»: проверяем существование id в БД
      const ids = toApply.map(t => t.id);
      const check = await supabase.from("wh_incoming_items" as any).select("id").in("id", ids).limit(10000);
      const existing = new Set<string>((check.data || []).map((x: any) => String(x.id)));
      const valid = toApply.filter(t => existing.has(t.id));
      const missed = toApply.filter(t => !existing.has(t.id));
      if (missed.length) {
        console.warn("[receiveSelectedForHead] skipped stale ids:", missed.map(m => m.id));
        if (valid.length === 0) {
          return Alert.alert("Обнови список", "Позиции были пересозданы. Нажми «Показать позиции» ещё раз и повтори ввод количества.");
        }
      }

      // 6) батч приёмка
      setReceivingHeadId(incomingIdInitial);
      let ok = 0, fail = 0;
      for (const it of valid) {
        const r = await supabase.rpc('wh_receive_item_v2' as any, {
          p_incoming_item_id: it.id,
          p_qty: it.qty
        } as any);
        if (r.error) {
          fail++;
          console.warn("[wh_receive_item] err:", it.id, r.error.message);
        } else ok++;
      }

      // 7) обновления и автоконфирм, если остаток 0
      const rows2 = (await loadItemsForHead(cid, true)) ?? [];
      const leftAfter = rows2.reduce((s, r) => s + Math.max(0, nz(r.qty_expected, 0) - nz(r.qty_received, 0)), 0);

      if (leftAfter <= 0) {
        try {
          const pr = await supabase.rpc('wh_receive_confirm' as any, { p_wh_id: cid } as any);
          if (pr.error) console.warn("[auto confirm] err:", pr.error.message);
        } catch {}
      }

      await fetchToReceive();
      setItemsByHead(prev => { const c = { ...prev }; delete c[cid]; return c; });
      setQtyInputByItem(prev => {
        const next = { ...prev };
        for (const it of valid) delete next[it.id];
        return next;
      });
      await fetchStock();

      Alert.alert("Готово", `Принято позиций: ${ok}${fail ? `, ошибок: ${fail}` : ""}`);
    } catch (e) {
      showErr(e);
    } finally {
      setReceivingHeadId(null);
    }
  }, [itemsByHead, qtyInputByItem, fetchToReceive, loadItemsForHead, ensureRealIncoming, canonId]);

  // гарантируем, что у реальной шапки есть строки в wh_incoming_items
  const ensurePositionsForHead = async (incomingId: string) => {
    // если есть RPC — отлично
    try {
      // у тебя эта функция уже создана в БД
      await supabase.rpc('ensure_incoming_items' as any, { p_incoming_id: incomingId } as any);
    } catch {}
    // на всякий случай: если RPC нет, fallback
    const fb = await supabase
      .from("wh_incoming_items" as any)
      .select("id")
      .eq("incoming_id", incomingId)
      .limit(1);
    if (!fb.error && Array.isArray(fb.data) && fb.data.length > 0) return true;

    // последний шанс — ресид из purchase_items
    const pidRow = await supabase.from("wh_incoming" as any).select("purchase_id").eq("id", incomingId).maybeSingle();
    const pId = pidRow?.data?.purchase_id ? String(pidRow.data.purchase_id) : null;
    if (pId) await reseedIncomingItems(incomingId, pId);
    return true;
  };

  /** ===== ОСТАТКИ ===== */
  const [stock, setStock] = useState<StockRow[]>([]);
  const [stockSupported, setStockSupported] = useState<null | boolean>(null);

 const fetchStock = useCallback(async () => {
  try {
    // 0) ФАКТ сразу после приёмки
    const fact = await supabase
      .from("v_warehouse_fact" as any)
      .select("*")
      .limit(5000);

    if (!fact.error && Array.isArray(fact.data)) {
      const rows = (fact.data || []).map((x: any) => ({
        material_id: String(x.rik_code ?? x.material_id ?? ""),
        rik_code: x.rik_code ?? null,
        name_human: x.name_human ?? x.name ?? null,
        uom_id: x.uom_id ?? null,
        qty_on_hand: nz(x.qty_on_hand, 0),
        qty_reserved: nz(x.qty_reserved, 0),
        qty_available: nz(
          x.qty_available ?? (nz(x.qty_on_hand, 0) - nz(x.qty_reserved, 0)),
          0
        ),
        object_name: x.object_name ?? null,
        warehouse_name: x.warehouse_name ?? null,
        updated_at: x.updated_at ?? null,
      })) as StockRow[];
      setStock(rows);
      setStockSupported(true);
      return;
    }

    // 1) RPC-источники (как было)
    const rpcNames = [
      { fn: "list_stock", args: {} },
      { fn: "warehouse_list_stock", args: {} },
      { fn: "list_warehouse_stock", args: {} },
      { fn: "acc_list_stock", args: {} },
    ] as const;

    for (const r of rpcNames) {
      const res = await supabase.rpc(r.fn as any, r.args as any);
      if (!res.error && Array.isArray(res.data)) {
        const rows = (res.data || []).map((x: any) => ({
          material_id: String(x.material_id ?? x.id ?? x.rik_code ?? ""),
          rik_code: x.rik_code ?? x.mat_code ?? null,
          name_human: x.name_human ?? x.name ?? null,
          uom_id: x.uom_id ?? x.uom ?? null,
          qty_on_hand: nz(x.qty_on_hand ?? x.on_hand, 0),
          qty_reserved: nz(x.qty_reserved ?? x.reserved, 0),
          qty_available: nz(
            x.qty_available ?? x.available ?? (nz(x.qty_on_hand) - nz(x.qty_reserved)),
            0
          ),
          object_name: x.object_name ?? null,
          warehouse_name: x.warehouse_name ?? null,
          updated_at: x.updated_at ?? null,
        })) as StockRow[];
        setStock(rows);
        setStockSupported(true);
        return;
      }
    }

    // 2) Фоллбэк на старую вью «остатков»
    const v = await supabase
      .from("v_warehouse_stock" as any)
      .select("*")
      .limit(2000);

    if (!v.error && Array.isArray(v.data)) {
      const rows = (v.data || []).map((x: any) => ({
        material_id: String(x.rik_code ?? ""),
        rik_code: x.rik_code ?? null,
        name_human: x.name ?? null,
        uom_id: x.uom_id ?? null,
        qty_on_hand: nz(x.qty_on_hand, 0),
        qty_reserved: nz(x.qty_reserved, 0),
        qty_available: nz(
          x.qty_available ?? (nz(x.qty_on_hand) - nz(x.qty_reserved)),
          0
        ),
        object_name: null,
        warehouse_name: null,
        updated_at: x.updated_at ?? null,
      })) as StockRow[];
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

  /** ===== ИСТОРИЯ ===== */
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historySupported, setHistorySupported] = useState<null | boolean>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const rpcs = ["list_warehouse_history", "acc_list_history" ] as const;
      for (const fn of rpcs) {
        const rpc = await supabase.rpc(fn as any, {} as any);
        if (!rpc.error && Array.isArray(rpc.data)) { setHistory(rpc.data as HistoryRow[]); setHistorySupported(true); return; }
      }
      const vw = await supabase.from("v_warehouse_history" as any).select("*").order("event_dt", { ascending: false }).limit(400);
      if (!vw.error && Array.isArray(vw.data)) { setHistory(vw.data as any); setHistorySupported(true); return; }
      setHistorySupported(false); setHistory([]);
    } catch { setHistorySupported(false); setHistory([]); }
  }, []);

  /** ===== ИНВЕНТАРИЗАЦИЯ ===== */
  const [inv, setInv] = useState<InvSession[]>([]);
  const [invSupported, setInvSupported] = useState<null | boolean>(null);

  const fetchInv = useCallback(async () => {
    try {
      const rpc = await supabase.rpc("acc_inv_list" as any, {} as any);
      if (!rpc.error && Array.isArray(rpc.data)) { setInv(rpc.data as InvSession[]); setInvSupported(true); return; }
      setInvSupported(false); setInv([]);
    } catch { setInvSupported(false); setInv([]); }
  }, []);

  const createInv = useCallback(async () => {
    try {
      const r = await supabase.rpc("acc_inv_open" as any, { p_object_id: null, p_comment: "Инвентаризация (склад)" } as any);
      if (r.error) throw r.error;
      await fetchInv();
      Alert.alert("Создано", "Сессия инвентаризации открыта.");
    } catch (e) { showErr(e); }
  }, [fetchInv]);

  const finishInv = useCallback(async (id: string) => {
    try {
      const r = await supabase.rpc("acc_inv_finish" as any, { p_session_id: id } as any);
      if (r.error) throw r.error;
      await fetchInv();
      Alert.alert("Готово", "Инвентаризация завершена.");
    } catch (e) { showErr(e); }
  }, [fetchInv]);

  /** ===== ОТЧЁТЫ ===== */
  const [repStock, setRepStock] = useState<StockRow[]>([]);
  const [repMov, setRepMov] = useState<HistoryRow[]>([]);
  const [reportsSupported, setReportsSupported] = useState<null | boolean>(null);
  const [periodFrom, setPeriodFrom] = useState<string>("");
  const [periodTo, setPeriodTo] = useState<string>("");

  const fetchReports = useCallback(async () => {
    try {
      const s = await supabase.rpc("acc_report_stock" as any, {} as any);
      const m = await supabase.rpc("acc_report_movement" as any, { p_from: periodFrom || null, p_to: periodTo || null } as any);
      if (!s.error && Array.isArray(s.data) && !m.error && Array.isArray(m.data)) {
        setRepStock(s.data as any); setRepMov(m.data as any); setReportsSupported(true); return;
      }
      setReportsSupported(false); setRepStock([]); setRepMov([]);
    } catch {
      setReportsSupported(false); setRepStock([]); setRepMov([]);
    }
  }, [periodFrom, periodTo]);

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
  const [pickModal, setPickModal] = useState<{ what: "object"|"work"|"recipient" | null }>({ what: null });
  const [pickFilter, setPickFilter] = useState("");
  const [objectOpt, setObjectOpt] = useState<Option | null>(null);
  const [workTypeOpt, setWorkTypeOpt] = useState<Option | null>(null);
  const [recipientOpt, setRecipientOpt] = useState<Option | null>(null);
// статус для кнопки "Выдать" и баннер сообщений
const [issueBusy, setIssueBusy] = useState(false);
const [issueMsg, setIssueMsg] = useState<{ kind: "error" | "ok" | null; text: string }>({
  kind: null,
  text: "",
});

  const loadUoms = useCallback(async () => {
    try {
      const q = await supabase
        .from("rik_uoms" as any)
        .select("id:uom_code, symbol:uom_code, short_name:name_ru, name:name_ru, kind")
        .limit(2000);

      if (q.error || !Array.isArray(q.data)) return;

      const map: Record<string, string> = {};
      for (const r of q.data as any[]) {
        const id = String(r.id ?? "");
        const label = (r.symbol ?? r.short_name ?? r.name ?? "").toString();
        if (id) map[id] = label;
      }
      setUoms(map);
    } catch {}
  }, []);

  useEffect(() => { loadUoms(); }, [loadUoms]);

  const tryOptions = useCallback(async (table: string, columns: string[]) => {
    const colList = columns.join(",");
    const q = await supabase.from(table as any).select(colList).limit(1000);
    if (q.error || !Array.isArray(q.data)) return [] as Option[];
    const opts: Option[] = [];
    for (const r of q.data as any[]) {
      const id = String(r.id ?? r.uuid ?? "");
      const label = String(r.name ?? r.title ?? r.object_name ?? r.fio ?? r.full_name ?? r.email ?? r.username ?? r.login ?? "");
      if (id && label) opts.push({ id, label });
    }
    return opts;
  }, []);

  const loadObjects = useCallback(async () => {
    const candidates: Array<[string,string[]]> = [["objects", ["id","name","object_name","title"]]];
    for (const [t, cols] of candidates) {
      const opts = await tryOptions(t, cols);
      if (opts.length) { setObjectList(opts); return; }
    }
    setObjectList([]);
  }, [tryOptions]);

  const loadWorkTypes = useCallback(async () => {
    const candidates: Array<[string,string[]]> = [["work_types", ["id","name","title"]], ["rik_works", ["id","name"]]];
    for (const [t, cols] of candidates) {
      const opts = await tryOptions(t, cols);
      if (opts.length) { setWorkTypeList(opts); return; }
    }
    setWorkTypeList([]);
  }, [tryOptions]);

  const loadRecipients = useCallback(async () => {
    const candidates: Array<[string,string[]]> = [["profiles", ["id","full_name","fio","email","name"]], ["employees", ["id","fio","full_name","name","email"]]];
    for (const [t, cols] of candidates) {
      const opts = await tryOptions(t, cols);
      if (opts.length) { setRecipientList(opts); return; }
    }
    setRecipientList([]);
  }, [tryOptions]);

  const normalizeToRikRow = useCallback((x: CatalogItem): RikSearchRow => {
    const kind: "material" | "work" = x.ref_table === "rik_works" ? "work" : "material";
    return {
      kind, ref_table: (x.ref_table as any), ref_id: String(x.ref_id ?? ""),
      rik_code: String(x.code ?? ""), name: String(x.name ?? x.code ?? ""),
      unit_id: x.unit_id ? String(x.unit_id) : null,
      unit_label: x.unit_id ? (uoms[String(x.unit_id)] ?? String(x.unit_id)) : null,
      sector: x.sector ?? null,
    };
  }, [uoms]);

  const mapRikItemsRow = (x: any): RikSearchRow => {
    const rc = String(x.rik_code ?? x.code ?? "");
    const nm = String(x.name_human ?? x.name ?? rc);
    const kind: "material" | "work" = String(x.kind ?? "").toLowerCase() === "work" ? "work" : "material";
    return { kind, ref_table: kind === "work" ? "rik_works" : "rik_materials", ref_id: String(x.ref_id ?? ""), rik_code: rc, name: nm, unit_id: null, unit_label: x.uom_code ?? x.uom ?? null, sector: x.sector ?? x.sector_code ?? null };
  };

  function refreshAvailability(rows: RikSearchRow[]) {
    (async () => {
      try {
        let map: Record<string, number> = {};
        const v = await supabase.from("v_warehouse_stock" as any).select("rik_code, uom_id, qty_on_hand, qty_reserved").limit(10000);
        if (!v.error && Array.isArray(v.data)) {
          for (const x of v.data as any[]) {
            const code = String(x.rik_code ?? "");
            const avail = nz(x.qty_on_hand, 0) - nz(x.qty_reserved, 0);
            if (code) map[code] = avail;
          }
        } else {
          const t = await supabase.from("stock_balances" as any).select("rik_code, uom_id, qty_on_hand, qty_reserved").limit(10000);
          if (!t.error && Array.isArray(t.data)) {
            for (const x of t.data as any[]) {
              const code = String(x.rik_code ?? "");
              const avail = nz(x.qty_on_hand, 0) - nz(x.qty_reserved, 0);
              if (code) map[code] = avail;
            }
          }
        }
        const filtered: Record<string, number> = {};
        for (const it of rows) { filtered[it.rik_code] = map[it.rik_code] ?? 0; }
        setAvailability(filtered);
      } catch {}
    })();
  }

  const preloadCatalogAll = useCallback(async () => {
    try {
      const r = await supabase.rpc("catalog_search" as any, { p_query: "", p_scope: "all", p_sector: null, p_limit: 5000 } as any);
      if (!r.error && Array.isArray(r.data) && r.data.length > 0) {
        const rows = (r.data as any[]).map(normalizeToRikRow);
        setAllCatalog(rows); setCatalog(rows); refreshAvailability(rows); return;
      }
      const v = await supabase.from("rik_items" as any).select("rik_code,name_human").limit(2000);
      if (!v.error && Array.isArray(v.data)) {
        const rows = (v.data as any[]).map((x) => mapRikItemsRow({ rik_code: x.rik_code, name_human: x.name_human, uom: null, kind: "material", ref_id: null } as any));
        setAllCatalog(rows); setCatalog(rows); refreshAvailability(rows);
      }
    } catch (e) { console.warn("[catalog preload]", e); }
  }, [normalizeToRikRow]);

  const runCatalogSearch = useCallback(async (q: string) => {
    const s = norm(q);
    if (s.length === 0) { setCatalog(allCatalog); return; }
    const local = allCatalog.filter(
      it => norm(it.name).includes(s) || norm(it.rik_code).includes(s) || (it.unit_label ? norm(it.unit_label).includes(s) : false)
    );
    setCatalog(local);
    if (s.length < 2) return;

    const seen = new Set<string>(local.map(r => r.rik_code));
    const merged: RikSearchRow[] = [...local];
    const pushUnique = (rows: RikSearchRow[]) => { for (const r of rows) { if (!r.rik_code) continue; if (seen.has(r.rik_code)) continue; seen.add(r.rik_code); merged.push(r); } };

    try {
      const r1 = await supabase.rpc("catalog_search" as any, { p_query: q, p_scope: "all", p_sector: null, p_limit: 2000 } as any);
      if (!r1.error && Array.isArray(r1.data)) pushUnique((r1.data as any[]).map(normalizeToRikRow));
      const r2 = await supabase.rpc("rik_search" as any, { p_q: q, lim: 2000 } as any);
      if (!r2.error && Array.isArray(r2.data)) {
        const rows = (r2.data as any[]).map((x) =>
          normalizeToRikRow({ ref_table: x.ref_table, ref_id: x.ref_id, code: x.rik_code, name: x.name, unit_id: x.unit_id, sector: x.sector } as CatalogItem)
        );
        pushUnique(rows);
      }
      const r3 = await supabase.rpc("rik_quick_search" as any, { p_q: q, p_limit: 2000 } as any);
      if (!r3.error && Array.isArray(r3.data)) pushUnique((r3.data as any[]).map(mapRikItemsRow));
      try {
        const r4 = await supabase.rpc("rik_quick_search_typed" as any, { p_q: q, p_limit: 2000 } as any);
        if (!r4.error && Array.isArray(r4.data)) pushUnique((r4.data as any[]).map(mapRikItemsRow));
      } catch {}
      try {
        const r5 = await supabase.rpc("rik_search_catalog" as any, { q, lim: 2000 } as any);
        if (!r5.error && Array.isArray(r5.data)) {
          const rows = (r5.data as any[]).map((x) =>
            mapRikItemsRow({ rik_code: x.rik_code ?? x.code, name_human: x.name, uom_code: x.unit ?? x.uom, kind: x.ref_table === "rik_works" ? "work" : "material", sector: x.sector, ref_id: x.ref_id } as any)
          );
          pushUnique(rows);
        }
      } catch {}
      if (merged.length === 0) {
        const fl = await supabase.from("rik_items" as any).select("rik_code,name_human").or(`name_human.ilike.%${q}%,rik_code.ilike.%${q}%`).limit(100);
        if (!fl.error && Array.isArray(fl.data)) pushUnique((fl.data as any[]).map((x) => mapRikItemsRow({ rik_code: x.rik_code, name_human: x.name_human, uom: null, kind: "material", ref_id: null } as any)));
      }
      setCatalog(merged);
      if (merged.length > 0) refreshAvailability(merged);
    } catch (e) { console.warn("[runCatalogSearch]", e); }
  }, [allCatalog, normalizeToRikRow]);

  useEffect(() => {
    if (tab === "Расход") {
      setSearch("");
      preloadCatalogAll().catch(()=>{});
      loadObjects().catch(() => {});
      loadWorkTypes().catch(() => {});
      loadRecipients().catch(() => {});
    }
  }, [tab, preloadCatalogAll, loadObjects, loadWorkTypes, loadRecipients]);

  const issueOne = useCallback(async (it: RikSearchRow) => {
  try {
    const qty = nz(qtyToIssue, 0);
    const canIssue =
      qty > 0 &&
      !!recipientOpt?.id &&
      !!objectOpt?.id;

    if (!canIssue) {
      setIssueMsg({ kind: "error", text: "Выберите объект и получателя и введите количество > 0" });
      return;
    }

    setIssueBusy(true);
    setIssueMsg({ kind: null, text: "" });

    let unitId = it.unit_id;
    if (!unitId) {
      unitId = await resolveUnitIdByCode(it.rik_code);
      if (!unitId) {
        setIssueMsg({ kind: "error", text: "Не удалось определить ед. изм. (unit_id) — проверь справочник." });
        return;
      }
    }

    // 1) создать документ выдачи
    const r1 = await supabase.rpc('acc_issue_create' as any, {
      p_object_id: objectOpt?.id ?? null,
      p_work_type_id: workTypeOpt?.id ?? null,
      p_comment: `Выдача ${it.name} (${it.rik_code}) ${qty} ${it.unit_label ?? ""} — ${recipientOpt?.label ?? ""}`
    } as any);

    if (r1.error || !r1.data) {
      console.warn("[acc_issue_create] err:", r1.error?.message, r1.error);
      setIssueMsg({ kind: "error", text: `acc_issue_create: ${pickErr(r1.error)}` });
      return;
    }
    const issue_id = r1.data;

    // 2) добавить позицию
    const r2 = await supabase.rpc('acc_issue_add_item' as any, {
      p_issue_id: issue_id,
      p_rik_code: it.rik_code,
      p_uom_id: unitId,
      p_qty: qty
    } as any);

    if (r2.error) {
      console.warn("[acc_issue_add_item] err:", r2.error?.message, r2.error);
      setIssueMsg({ kind: "error", text: `acc_issue_add_item: ${pickErr(r2.error)}` });
      return;
    }

    // Обновим «Склад факт» после выдачи
    await fetchStock();

    setIssueMsg({ kind: "ok", text: `✅ Выдано: ${qty} ${it.unit_label ?? unitId} — ${it.name}` });
  } catch (e: any) {
    console.warn("[issueOne] throw:", e?.message || e);
    setIssueMsg({ kind: "error", text: String(e?.message ?? e) });
  } finally {
    setIssueBusy(false);
  }
}, [qtyToIssue, recipientOpt, objectOpt, workTypeOpt, fetchStock]);


  /** ===== init / refresh ===== */
  const loadAll = useCallback(async () => {
    setLoading(true);
    try { await Promise.all([fetchToReceive(), fetchStock()]); }
    catch (e) { showErr(e); }
    finally { setLoading(false); }
  }, [fetchToReceive]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (tab === "История") fetchHistory().catch(() => {});
    if (tab === "Инвентаризация") fetchInv().catch(() => {});
    if (tab === "Отчёты") fetchReports().catch(() => {});
  }, [tab, fetchHistory, fetchInv, fetchReports]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (tab === "К приходу") await fetchToReceive();
      else if (tab === "Остатки") await fetchStock();
      else if (tab === "История") await fetchHistory();
      else if (tab === "Инвентаризация") await fetchInv();
      else if (tab === "Отчёты") await fetchReports();
      else if (tab === "Расход") await preloadCatalogAll();
    } catch (e) { showErr(e); }
    finally { setRefreshing(false); }
  }, [tab, fetchToReceive, fetchHistory, fetchInv, fetchReports, preloadCatalogAll]);

  /** ===== view-компоненты ===== */
  // ЗАМЕНИ ВЕСЬ компонент StockRowView на это
const StockRowView = ({ r }: { r: StockRow }) => {
  // ед.изм: сначала из справочника uoms, иначе что пришло из БД
  const uomLabel =
    (r.uom_id && (uoms[r.uom_id] ?? r.uom_id)) || "—";

  const onHand = nz(r.qty_on_hand, 0);
  const reserved = nz(r.qty_reserved, 0);
  const available = nz(r.qty_available ?? (onHand - reserved), 0);

  // формат числа (1 234.5 → 1 234.5)
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
            fontSize: 16, // крупнее
            color: "#0f172a",
          }}
          numberOfLines={2}
        >
          {r.name_human || r.rik_code || r.material_id}
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

      {/* Вторая строка: код • ед.изм • Доступно */}
      <Text style={{ marginTop: 4, color: "#475569" }}>
        <Text style={{ fontFamily: "monospace" }}>
          {(r.rik_code ?? "—").toString()}
        </Text>
        {"  •  "}
        {uomLabel}
        {"  •  "}
        Доступно: {fmtQty(available)}
      </Text>
    </View>
  );
};


 /** ===== Рендер вкладки «Расход» ===== */
const renderIssue = () => {
  const openPicker = (what: "object" | "work" | "recipient") => setPickModal({ what });
  const listForPicker =
    pickModal.what === "object" ? objectList :
    pickModal.what === "work" ? workTypeList : recipientList;
  const filtered = listForPicker.filter(x =>
    x.label.toLowerCase().includes(pickFilter.trim().toLowerCase())
  );

  // Глобальное условие: можно ли сейчас жать «Выдать»
  const canIssueGlobal =
    nz(qtyToIssue, 0) > 0 &&
    !!recipientOpt?.id &&
    !!objectOpt?.id;

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
              Объект: <Text style={{ fontWeight: "700" }}>{objectOpt?.label ?? "—"}</Text>
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
              Работы: <Text style={{ fontWeight: "700" }}>{workTypeOpt?.label ?? "—"}</Text>
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
              Получатель: <Text style={{ fontWeight: "700" }}>{recipientOpt?.label ?? "—"}</Text>
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
          placeholder="Поиск по коду/названию (мин. 2 символа для точного поиска)"
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
        keyExtractor={(x, idx) => `${x.rik_code}-${idx}`}
        renderItem={({ item }) => {
          const avail = availability[item.rik_code] ?? 0;
          const canIssue = canIssueGlobal; // используем глобальное условие

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
                [{item.kind === "work" ? "работа" : "материал"}] {item.rik_code} •{" "}
                {item.unit_label ?? item.unit_id ?? "—"} • Доступно: {avail}
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
                  <Text style={{ color: "#fff", fontWeight: "700" }}>
                    Выдать
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={{ color: "#475569" }}>Ничего не найдено.</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />

      {/* Пикер */}
      <Modal
        visible={!!pickModal.what}
        animationType="slide"
        onRequestClose={() => setPickModal({ what: null })}
        transparent
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" }}>
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
                return list.filter((x) =>
                  x.label.toLowerCase().includes(pickFilter.trim().toLowerCase())
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
                  style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: "#f1f5f9" }}
                >
                  <Text>{item.label}</Text>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={{ color: "#64748b" }}>Нет вариантов.</Text>}
              style={{ maxHeight: "60%" }}
            />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
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

    // ───────────── К ПРИХОДУ ─────────────
    if (tab === "К приходу") {
      return (
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
            {(["pending", "partial", "confirmed"] as const).map((f) => {
              const active = recvFilter === f;
              const cnt =
                f === "pending" ? countPending :
                f === "partial" ? countPartial :
                countConfirmed;
              const label = f === "pending" ? "Ожидает" : f === "partial" ? "Частично" : "Принято";
              return (
                <Pressable
                  key={f}
                  onPress={() => setRecvFilter(f)}
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
                  <Text style={{ color: active ? "#fff" : "#0f172a", fontWeight: "700" }}>
                    {label}
                  </Text>
                  <View
                    style={{
                      backgroundColor: active ? "rgba(255,255,255,0.25)" : "#ffffff",
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 999,
                    }}
                  >
                    <Text style={{ fontWeight: "800", color: active ? "#fff" : "#0f172a" }}>{cnt}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <FlatList
            data={toReceive}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => {
              const rid = canonId(item.id);
              const isExpanded = expanded === rid;
              const rows = itemsByHead[rid] as ItemRow[] | undefined;

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
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ fontSize: 16, fontWeight: "700" }}>
                    {item.po_no || (Platform.OS === "web" ? item.purchase_id : item.purchase_id.slice(0, 8))}
                  </Text>
                  <View
                    style={{
                      marginLeft: "auto",
                      backgroundColor: item.status === "confirmed" ? "#dcfce7" : "#fee2e2",
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 999,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "700",
                        color: item.status === "confirmed" ? "#166534" : "#991b1b",
                      }}
                    >
                      {item.status === "confirmed" ? "Принято" : "Ожидает"}
                    </Text>
                  </View>
                </View>

                <Text style={{ color: "#334155" }}>Статус закупки: {item.purchase_status ?? "—"}</Text>
                <Text style={{ color: "#64748b" }}>
                  Создано: {item.created_at ? new Date(item.created_at).toLocaleString("ru-RU") : "—"}
                  {item.status === "confirmed" && item.confirmed_at
                    ? ` • Принято: ${new Date(item.confirmed_at).toLocaleString("ru-RU")}`
                    : ""}
                </Text>

                {/* Кнопка показать/скрыть позиции — материализует синтетическую шапку при необходимости */}
                <View style={{ flexDirection: "row", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                  <Pressable
                    onPress={async () => {
                      let idToOpen = item.id;
                      if (String(item.id).startsWith("p:")) {
                        const realId = await ensureRealIncoming(item.id);
                        if (realId) {
                          setHeadIdAlias(prev => ({ ...prev, [item.id]: realId }));
                          idToOpen = realId;
                        }
                      }
                      await onToggleHead(idToOpen);
                    }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: "#e2e8f0",
                      backgroundColor: "#fff",
                    }}
                  >
                    <Text>{isExpanded ? "Скрыть позиции" : "Показать позиции"}</Text>
                  </Pressable>
                </View>

                {isExpanded && (
                  <View style={{ marginTop: 8, borderTopWidth: 1, borderColor: "#f1f5f9" }}>
                    <View style={{ padding: 8 }}>
                      <Text style={{ color: "#334155", fontWeight: "700" }}>
                        {(() => {
                          const arr = rows;
                          if (!Array.isArray(arr) || arr.length === 0) return "Позиции не загружены или пусто";
                          const expSum = arr.reduce((s, r) => s + nz(r.qty_expected, 0), 0);
                          const recSum = arr.reduce((s, r) => s + nz(r.qty_received, 0), 0);
                          const totalLeft = Math.max(0, expSum - recSum);
                          return `Ожидается: ${expSum} • Принято: ${recSum} • Осталось принять: ${totalLeft}`;
                        })()}
                      </Text>
                    </View>

                    {Array.isArray(rows) && rows.length > 0 ? (
                      <>
                        {rows.map((row) => {
                          const exp = nz(row.qty_expected, 0);
                          const rec = nz(row.qty_received, 0);
                          const left = Math.max(0, exp - rec);
                          const inputKey = row.incoming_item_id;
                          const val = qtyInputByItem[inputKey] ?? "";
                          const isRealIncoming =
                            typeof row.incoming_item_id === "string" &&
                            !row.incoming_item_id.startsWith("p:");

                          return (
                            <View
                              key={row.incoming_item_id}
                              style={{ padding: 10, borderBottomWidth: 1, borderColor: "#f8fafc" }}
                            >
                              <Text style={{ fontWeight: "700" }}>{row.name_human}</Text>
                              <Text style={{ color: "#475569" }}>
                                {(row.rik_code ? `${row.rik_code} • ` : "")}
                                {row.uom || "—"} • Ожидается: {exp} • Принято: {rec} • Остаток: {left}
                              </Text>

                              {/* Поле ввода количества — только для неподтверждённых шапок; для confirmed показываем лишь факты */}
                              {item.status !== "confirmed" && isRealIncoming && left > 0 && (
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

                        {/* Общая кнопка "Оприходовать выбранное" — только если шапка не подтверждена */}
                        {item.status !== "confirmed" && (
                          <View style={{ padding: 10, gap: 8 }}>
                            <Pressable
                              onPress={() => receiveSelectedForHead(rid)}
                              disabled={receivingHeadId === item.id}
                              style={{
                                alignSelf: "flex-start",
                                paddingHorizontal: 14,
                                paddingVertical: 10,
                                borderRadius: 10,
                                backgroundColor: receivingHeadId === item.id ? "#94a3b8" : "#0ea5e9",
                              }}
                            >
                              <Text style={{ color: "#fff", fontWeight: "800" }}>
                                {receivingHeadId === item.id ? "Оприходуем…" : "Оприходовать выбранное"}
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
            );}}
            ListEmptyComponent={<Text style={{ color: "#475569" }}>Нет записей в очереди склада.</Text>}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        </View>
      );
    } // конец "К приходу"

    // ───────────── ОСТАТКИ ─────────────
    // 1) заглушка (если источник не поддержан)
if (stockSupported === false && tab === "Склад факт") {
  return (
    <View style={{ padding: 12 }}>
      <Text style={{ color: "#475569" }}>
        Раздел «Склад факт» требует вью <Text style={{ fontWeight: "700" }}>v_warehouse_fact</Text>
        {` `}или RPC, возвращающий фактические остатки.
      </Text>
    </View>
  );
}

// 2) нормальный рендер списка
if (tab === "Склад факт") {
  return (
    <FlatList
      data={stock}
      keyExtractor={(i, idx) => `${i.material_id}-${idx}`}
      renderItem={({ item }) => <StockRowView r={item} />}
      ListEmptyComponent={<Text style={{ color: "#475569" }}>Пока нет данных по складу.</Text>}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    />
  );
}


    // ───────────── РАСХОД ─────────────
    if (tab === "Расход") return renderIssue();

    // ───────────── ИСТОРИЯ ─────────────
    if (tab === "История") {
      if (historySupported === false) {
        return (
          <View style={{ padding: 12 }}>
            <Text style={{ color: "#475569" }}>
              Раздел «История» пока недоступен: добавь RPC <Text style={{ fontWeight: "700" }}>list_warehouse_history / acc_list_history</Text> или view <Text style={{ fontWeight: "700" }}>v_warehouse_history</Text>.
            </Text>
          </View>
        );
      }
      return (
        <FlatList
          data={history}
          keyExtractor={(_, idx) => `h-${idx}`}
          renderItem={({ item }) => <HistoryRowView h={item} />}
          ListEmptyComponent={<Text style={{ color: "#475569" }}>История пуста.</Text>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      );
    }

    // ───────────── ИНВЕНТАРИЗАЦИЯ ─────────────
    if (tab === "Инвентаризация") {
      if (invSupported === false) {
        return (
          <View style={{ padding: 12 }}>
            <Text style={{ color: "#475569" }}>
              Раздел «Инвентаризация» требует RPC <Text style={{ fontWeight: "700" }}>acc_inv_list / acc_inv_open / acc_inv_finish</Text>.
            </Text>
          </View>
        );
      }
      return (
        <View style={{ flex: 1 }}>
          <View style={{ padding: 12, flexDirection: "row", gap: 10 }}>
            <Pressable onPress={createInv} style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#0ea5e9", borderRadius: 10 }}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>Создать инвентаризацию</Text>
            </Pressable>
          </View>
          <FlatList
            data={inv}
            keyExtractor={(x) => x.id}
            renderItem={({ item }) => (
              <View style={{ padding: 12, borderBottomWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff" }}>
                <Text style={{ fontWeight: "700" }}>{item.id.slice(0, 8)} • {item.status}</Text>
                <Text style={{ color: "#64748b" }}>
                  {new Date(item.started_at).toLocaleString("ru-RU")}
                  {item.finished_at ? ` → ${new Date(item.finished_at).toLocaleString("ru-RU")}` : ""}
                </Text>
                {item.status !== "Завершена" && (
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <Pressable onPress={() => finishInv(item.id)} style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#16a34a", borderRadius: 10 }}>
                      <Text style={{ color: "#fff", fontWeight: "700" }}>Завершить</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}
            ListEmptyComponent={<Text style={{ color: "#475569", padding: 12 }}>Сессий нет.</Text>}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        </View>
      );
    }

    // ───────────── ОТЧЁТЫ ─────────────
    return (
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 12, gap: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, marginBottom: 10 }}>
          <Text style={{ fontWeight: "800" }}>Период</Text>
          <TextInput value={periodFrom} onChangeText={setPeriodFrom} placeholder="От (YYYY-MM-DD)" style={{ borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }} />
          <TextInput value={periodTo} onChangeText={setPeriodTo} placeholder="До (YYYY-MM-DD)" style={{ borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }} />
          <Pressable onPress={fetchReports} style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#0ea5e9", borderRadius: 10, alignSelf: "flex-start" }}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>Обновить отчёты</Text>
          </Pressable>
        </View>

        <View style={{ padding: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, marginBottom: 10 }}>
          <Text style={{ fontWeight: "800", marginBottom: 8 }}>Остатки (сводка)</Text>
          {repStock.length === 0 ? (
            <Text style={{ color: "#64748b" }}>Нет данных.</Text>
          ) : (
            repStock.map((x, i) => (
              <Text key={i} style={{ color: "#334155" }}>
                {(x.rik_code ?? (x as any).material_id) || "—"} • {x.uom_id || "—"} • Доступно: {nz(x.qty_available ?? (nz(x.qty_on_hand, 0) - nz(x.qty_reserved, 0)), 0)}
              </Text>
            ))
          )}
        </View>

        <View style={{ padding: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12 }}>
          <Text style={{ fontWeight: "800", marginBottom: 8 }}>Движение за период</Text>
          {repMov.length === 0 ? (
            <Text style={{ color: "#64748b" }}>Нет данных.</Text>
          ) : (
            repMov.map((h, i) => (
              <Text key={i} style={{ color: "#334155" }}>
                {new Date(h.event_dt).toLocaleString("ru-RU")} • {h.event_type} • {(h.rik_code || "—")} • {h.qty ?? "—"}
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
        <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 10 }}>Склад</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {TABS.map((t) => {
            const active = t === tab;
            return (
              <Pressable key={t} onPress={() => setTab(t)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: active ? "#0ea5e9" : "#e2e8f0" }}>
                <Text style={{ color: active ? "#fff" : "#0f172a", fontWeight: "700" }}>{t}</Text>
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
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
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


