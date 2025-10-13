// src/lib/catalog_api.ts
import { supabase } from "./supabaseClient";

/** ========= Нейтральные типы ========= */
export type CatalogItem = {
  code: string;
  name: string;
  uom?: string | null;
  sector_code?: string | null;
  spec?: string | null;
  kind?: string | null;
  group_code?: string | null;
};

export type CatalogGroup = {
  code: string;
  name: string;
  parent_code?: string | null;
};

export type UomRef = {
  id?: string;
  code: string;
  name: string;
};

export type IncomingItem = {
  incoming_id: string;
  incoming_item_id: string;
  purchase_item_id: string | null;
  code: string | null;
  name: string | null;
  uom: string | null;
  qty_expected: number;
  qty_received: number;
};

/** ========= Вспомогательные ========= */
const norm = (s?: string | null) => String(s ?? "").trim();

/** ========= Каталог: быстрый поиск ========= */
export async function searchCatalogItems(q: string, limit = 50, apps?: string[]): Promise<CatalogItem[]> {
  const pQuery = norm(q);
  const pLimit = Math.max(1, Math.min(200, limit || 50));

  // 1) пробуем твои RPC, если есть
  for (const fn of ["rik_quick_search_typed", "rik_quick_ru", "rik_quick_search"]) {
    try {
      const { data, error } = await supabase.rpc(fn as any, {
        p_q: pQuery,
        p_limit: pLimit,
        p_apps: apps ?? null,
      } as any);
      if (!error && Array.isArray(data)) {
        return (data as any[]).slice(0, pLimit).map((r) => ({
          code: r.rik_code,
          name: r.name_human ?? r.rik_code,
          uom: r.uom ?? r.uom_code ?? null,
          sector_code: r.sector_code ?? null,
          spec: r.spec ?? null,
          kind: r.kind ?? null,
          group_code: r.group_code ?? null,
        }));
      }
    } catch {}
  }

  // 2) читаем из нашего clean-view (поверх rik_*)
  const { data, error } = await supabase
    .from("catalog_items_clean")
    .select("code,name,uom,sector_code,spec,kind,group_code")
    .or(`code.ilike.%${pQuery}%,name.ilike.%${pQuery}%`)
    .order("code", { ascending: true })
    .limit(pLimit);

  if (error || !Array.isArray(data)) return [];
  return data as CatalogItem[];
}

/** ========= Группы ========= */
export async function listCatalogGroups(): Promise<CatalogGroup[]> {
  const { data, error } = await supabase
    .from("catalog_groups_clean")
    .select("code,name,parent_code")
    .order("code", { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return data as CatalogGroup[];
}

/** ========= Единицы измерения ========= */
export async function listUoms(): Promise<UomRef[]> {
  const { data, error } = await supabase
    .from("ref_uoms_clean")
    .select("id,code,name")
    .order("code", { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return data as UomRef[];
}

/** ========= Склад: позиции к приходу/принято ========= */
export async function listIncomingItems(incomingId: string): Promise<IncomingItem[]> {
  const id = norm(incomingId);
  if (!id) return [];
  const { data, error } = await supabase
    .from("wh_incoming_items_clean")
    .select("incoming_id,incoming_item_id,purchase_item_id,code,name,uom,qty_expected,qty_received")
    .eq("incoming_id", id)
    .order("incoming_item_id", { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return data as IncomingItem[];
}

