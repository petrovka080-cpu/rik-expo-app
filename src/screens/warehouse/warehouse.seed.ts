import type { SupabaseClient } from "@supabase/supabase-js";

type Supa = SupabaseClient;

type RequestItemMini = {
  id?: string | null;
  name_human?: string | null;
  rik_code?: string | null;
  uom?: string | null;
};

type PurchaseItemSeedRow = {
  id?: string | null;
  request_item_id?: string | null;
  qty?: number | string | null;
  uom?: string | null;
  name_human?: string | null;
  rik_code?: string | null;
  request_items?: RequestItemMini | RequestItemMini[] | null;
};

type ProposalSnapshotRow = {
  request_item_id?: string | null;
  uom?: string | null;
  total_qty?: number | string | null;
};

type IncomingSeedRow = {
  incoming_id: string;
  purchase_item_id: string;
  qty_expected: number;
  qty_received: number;
  rik_code: string | null;
  name_human: string | null;
  uom: string | null;
};

const toNum = (v: unknown): number => {
  if (v == null) return 0;
  const s = String(v).trim();
  if (!s) return 0;
  const cleaned = s.replace(/[^\d,\.\-]+/g, "").replace(",", ".").replace(/\s+/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const warnWarehouseSeed = (scope: string, error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (__DEV__) console.warn(`[warehouse.seed] ${scope}:`, message || error);
};

async function getPurchaseIdByIncoming(supabase: Supa, incomingId: string): Promise<string | null> {
  try {
    const head = await supabase
      .from("wh_incoming")
      .select("purchase_id")
      .eq("id", incomingId)
      .maybeSingle();

    const pId = !head.error && head.data?.purchase_id ? String(head.data.purchase_id) : null;
    return pId ? pId : null;
  } catch (error) {
    warnWarehouseSeed("getPurchaseIdByIncoming", error);
    return null;
  }
}

async function reseedIncomingItems(
  supabase: Supa,
  incomingId: string,
  purchaseId: string,
): Promise<boolean> {
  // 1) читаем purchase_items (если пусто - пытаемся seed из proposal_snapshot_items)
  let pi = await supabase
    .from("purchase_items")
    .select(
      `
      id,
      request_item_id,
      qty,
      uom,
      name_human,
      rik_code,
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
    if (__DEV__) console.warn("[seed] select purchase_items error:", pi.error.message);
    return false;
  }

  if (Array.isArray(pi.data) && pi.data.length === 0) {
    if (__DEV__) console.warn("[seed] purchase_items empty в†’ seed from proposal_snapshot_items");

    const link = await supabase
      .from("purchases")
      .select("proposal_id")
      .eq("id", purchaseId)
      .maybeSingle();

    const propId = !link.error && link.data?.proposal_id ? String(link.data.proposal_id) : null;
    if (!propId) {
      if (__DEV__) console.warn("[seed] purchases.proposal_id not found", link.error?.message);
      return false;
    }

    const snap = await supabase
      .from("proposal_snapshot_items")
      .select("request_item_id, uom, total_qty")
      .eq("proposal_id", propId);

    if (snap.error || !Array.isArray(snap.data) || snap.data.length === 0) {
      if (__DEV__) console.warn("[seed] snapshot empty", snap.error?.message);
      return false;
    }

    const snapshotRows = (snap.data as ProposalSnapshotRow[]) || [];
    const reqIds = snapshotRows
      .map((x) => x.request_item_id)
      .filter(Boolean)
      .map((v) => String(v));

    const riMap: Record<string, { name_human: string; rik_code: string | null; uom: string | null }> = {};

    if (reqIds.length) {
      const ri = await supabase
        .from("request_items")
        .select("id, name_human, rik_code, uom")
        .in("id", reqIds);

      if (!ri.error && Array.isArray(ri.data)) {
        for (const r of ri.data as RequestItemMini[]) {
          const id = String(r.id);
          riMap[id] = {
            name_human: String(r.name_human ?? ""),
            rik_code: r.rik_code ? String(r.rik_code) : null,
            uom: r.uom ? String(r.uom) : null,
          };
        }
      }
    }

    const piToInsert = snapshotRows
      .map((x) => {
        const qty = toNum(x.total_qty ?? 0);
        const rid = x.request_item_id ? String(x.request_item_id) : null;
        if (!rid || qty <= 0) return null;

        const meta = riMap[rid];
        const name_human = (meta?.name_human || "").trim();
        if (!name_human) return null;

        return {
          purchase_id: purchaseId,
          request_item_id: rid,
          qty,
          uom: x.uom ?? meta?.uom ?? null,
          name_human,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    if (piToInsert.length === 0) {
      if (__DEV__) console.warn("[seed] nothing to seed into purchase_items");
      return false;
    }

    const insPI = await supabase.from("purchase_items").insert(piToInsert);
    if (insPI.error) {
      if (__DEV__) console.warn("[seed] purchase_items insert error:", insPI.error.message);
      return false;
    }

    // РїРµСЂРµС‡РёС‚С‹РІР°РµРј purchase_items
    pi = await supabase
      .from("purchase_items")
      .select(
        `
        id,
        request_item_id,
        qty,
        uom,
        name_human,
        rik_code,
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
      if (__DEV__) console.warn("[seed] reselect purchase_items error:", pi.error.message);
      return false;
    }
  }

  // 2) СЃС‚СЂРѕРёРј wh_incoming_items rows
  let rows = (((pi.data as PurchaseItemSeedRow[]) || []))
    .map((x) => {
      const piId = String(x.id ?? "");
      const qty_expected = toNum(x.qty ?? 0);
      if (qty_expected <= 0) return null;

      const ri = Array.isArray(x.request_items)
        ? x.request_items[0]
        : x.request_items;

      const codeFromPI =
        x.rik_code && String(x.rik_code).trim()
          ? String(x.rik_code).trim()
          : null;

      const codeFromRI =
        ri?.rik_code && String(ri.rik_code).trim() ? String(ri.rik_code).trim() : null;

      const baseCode = codeFromPI ?? codeFromRI;
      const codeU = (baseCode ?? "").toUpperCase();

      const isWarehouse = codeU.startsWith("MAT-") || codeU.startsWith("TOOL-");
      const isKit = codeU.startsWith("KIT-");
      if (isKit) return null;
      if (!isWarehouse) return null;

      const finalCode = baseCode;

      const finalName =
        x.name_human && String(x.name_human).trim()
          ? String(x.name_human).trim()
          : ri?.name_human && String(ri.name_human).trim()
          ? String(ri.name_human).trim()
          : finalCode;

      const finalUom =
        x.uom && String(x.uom).trim()
          ? String(x.uom).trim()
          : ri?.uom && String(ri.uom).trim()
          ? String(ri.uom).trim()
          : null;

      return {
        incoming_id: incomingId,
        purchase_item_id: piId,
        qty_expected,
        qty_received: 0,

        rik_code: finalCode,
        name_human: finalName,
        uom: finalUom,
      } as IncomingSeedRow;
    })
    .filter((x): x is IncomingSeedRow => Boolean(x));

  // merge duplicates
  {
    const map = new Map<string, IncomingSeedRow>();
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

  const ins = await supabase.from("wh_incoming_items").upsert(rows, {
    onConflict: "incoming_id,purchase_item_id",
    ignoreDuplicates: false,
  });

  if (ins.error) {
    if (__DEV__) console.warn("[seed] wh_incoming_items upsert error:", ins.error.message);
    return false;
  }

  return true;
}

/**
 * PROD: РіР°СЂР°РЅС‚РёСЂСѓРµС‚ РЅР°Р»РёС‡РёРµ СЃС‚СЂРѕРє wh_incoming_items РґР»СЏ incoming head.
 * - РµСЃР»Рё СЃС‚СЂРѕРєРё РµСЃС‚СЊ в†’ ok
 * - РёРЅР°С‡Рµ РїСЂРѕР±СѓРµС‚ RPC-ensure
 * - РёРЅР°С‡Рµ РґРµР»Р°РµС‚ fallback reseed РёР· purchase_items / snapshot
 */
export async function seedEnsureIncomingItems(params: {
  supabase: Supa;
  incomingId: string;
}): Promise<boolean> {
  const supabase = params.supabase;
  const incomingId = String(params.incomingId ?? "").trim();
  if (!incomingId) return false;

  // 1) already exists?
  const pre = await supabase
    .from("wh_incoming_items")
    .select("id")
    .eq("incoming_id", incomingId)
    .limit(1);

  if (!pre.error && Array.isArray(pre.data) && pre.data.length > 0) return true;

  // 2) try RPC ensure
  const tryFns = [
    "wh_incoming_ensure_items",
    "ensure_incoming_items",
    "wh_incoming_seed_from_purchase",
  ];

  for (const fn of tryFns) {
    try {
      const r = await supabase.rpc(fn, { p_incoming_id: incomingId });
      if (!r.error) break;
      if (r.error) warnWarehouseSeed(`rpc ${fn}`, r.error.message);
    } catch (error) {
      warnWarehouseSeed(`rpc ${fn}`, error);
    }
  }

  // 3) recheck
  const fb = await supabase
    .from("wh_incoming_items")
    .select("id")
    .eq("incoming_id", incomingId)
    .limit(1);

  if (!fb.error && Array.isArray(fb.data) && fb.data.length > 0) return true;

  // 4) fallback reseed using purchase_id
  const pId = await getPurchaseIdByIncoming(supabase, incomingId);
  if (pId) return await reseedIncomingItems(supabase, incomingId, pId);

  return false;
}