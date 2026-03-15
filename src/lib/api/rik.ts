import { client } from "./_core";
import type { CatalogItem } from "./types";

type RikQuickSearchArgs = {
  p_q: string;
  p_limit: number;
  p_apps: string[] | null;
};

type RikQuickSearchRpcRow = CatalogItem;

type RikItemsFallbackRow = Pick<
  CatalogItem,
  "rik_code" | "name_human" | "uom_code" | "sector_code" | "spec" | "kind"
> & {
  name_human_ru?: string | null;
};

type RikAliasCodeRow = {
  rik_code: string | null;
};

type RikAliasRow = {
  rik_code: string | null;
  alias: string | null;
};

function buildRikQuickSearchArgs(
  pQuery: string,
  pLimit: number,
  apps?: string[]
): RikQuickSearchArgs {
  return {
    p_q: pQuery,
    p_limit: pLimit,
    p_apps: apps ?? null,
  };
}

function parseRikQuickSearchRows(data: unknown): RikQuickSearchRpcRow[] {
  return Array.isArray(data) ? (data as RikQuickSearchRpcRow[]) : [];
}

function parseRikItemsFallbackRows(data: unknown): RikItemsFallbackRow[] {
  return Array.isArray(data) ? (data as RikItemsFallbackRow[]) : [];
}

function parseRikAliasCodeRows(data: unknown): RikAliasCodeRow[] {
  return Array.isArray(data) ? (data as RikAliasCodeRow[]) : [];
}

function parseRikAliasRows(data: unknown): RikAliasRow[] {
  return Array.isArray(data) ? (data as RikAliasRow[]) : [];
}

// ============================== RIK search ==============================
export async function rikQuickSearch(q: string, limit = 50, apps?: string[]) {
  const pQuery = (q ?? "").trim();
  const pLimit = Math.max(1, Math.min(200, limit || 50));
  const args = buildRikQuickSearchArgs(pQuery, pLimit, apps);

  // 1) RU - главный (фразы/порядок слов)
  try {
    const { data, error } = await client.rpc("rik_quick_ru", args);
    const rows = parseRikQuickSearchRows(data);

    if (!error && rows.length > 0) {
      return rows;
    }
  } catch {}

  // 2) typed - вторым
  try {
    const { data, error } = await client.rpc("rik_quick_search_typed", args);
    const rows = parseRikQuickSearchRows(data);

    if (!error && rows.length > 0) {
      return rows;
    }
  } catch {}

  // 3) legacy - третьим
  try {
    const { data, error } = await client.rpc("rik_quick_search", args);
    const rows = parseRikQuickSearchRows(data);

    if (!error && rows.length > 0) {
      return rows;
    }
  } catch {}

  if (!pQuery) return [];

  let base: RikItemsFallbackRow[] = [];
  {
    const fb = await client
      .from("rik_items")
      .select("rik_code,name_human,uom_code,sector_code,spec,kind,name_human_ru")
      .or(
        `rik_code.ilike.%${pQuery}%,name_human.ilike.%${pQuery}%,name_human_ru.ilike.%${pQuery}%`
      )
      .order("rik_code", { ascending: true })
      .limit(pLimit * 2);

    if (!fb.error) base = parseRikItemsFallbackRows(fb.data);
  }

  let aliasCodes: string[] = [];
  try {
    const al = await client
      .from("rik_aliases")
      .select("rik_code")
      .ilike("alias", `%${pQuery}%`)
      .limit(pLimit * 2);
    if (!al.error) {
      aliasCodes = Array.from(
        new Set(parseRikAliasCodeRows(al.data).map((r) => String(r.rik_code)))
      );
    }
  } catch {}

  if (aliasCodes.length) {
    const have = new Set(base.map((r) => String(r.rik_code)));
    const extraCodes = aliasCodes.filter((c) => !have.has(c));
    if (extraCodes.length) {
      const add = await client
        .from("rik_items")
        .select("rik_code,name_human,uom_code,sector_code,spec,kind")
        .in("rik_code", extraCodes)
        .limit(pLimit * 2);
      if (!add.error) base = base.concat(parseRikItemsFallbackRows(add.data));
    }
  }

  let aliasMap: Record<string, string> = {};
  const allCodes = Array.from(
    new Set(base.map((r) => String(r.rik_code)).filter(Boolean))
  );

  if (allCodes.length) {
    try {
      const al2 = await client
        .from("rik_aliases")
        .select("rik_code,alias")
        .in("rik_code", allCodes);
      if (!al2.error) {
        const prefer = pQuery.toLowerCase();
        const byCode: Record<string, { hit?: string; any?: string }> = {};
        for (const r of parseRikAliasRows(al2.data)) {
          const a = (r.alias || "").trim();
          if (!a) continue;
          if (!/[А-Яа-яЁё]/.test(a)) continue;
          const code = String(r.rik_code);
          byCode[code] ||= {};
          if (!byCode[code].any) byCode[code].any = a;
          if (!byCode[code].hit && a.toLowerCase().startsWith(prefer)) byCode[code].hit = a;
        }
        aliasMap = Object.fromEntries(
          Object.entries(byCode).map(([k, v]) => [k, v.hit ?? v.any!])
        );
      }
    } catch {}
  }

  const merged = base.map((r) => ({
    ...r,
    name_human: aliasMap[r.rik_code] ?? r.name_human ?? r.rik_code,
  }));

  const seen = new Set<string>();
  const qa = pQuery.toLowerCase();

  const ranked = merged.sort((a, b) => {
    const aName = String(a.name_human || "").toLowerCase();
    const bName = String(b.name_human || "").toLowerCase();
    const aCode = String(a.rik_code || "").toLowerCase();
    const bCode = String(b.rik_code || "").toLowerCase();
    const ra = aName.startsWith(qa)
      ? 0
      : aCode.startsWith(qa)
        ? 1
        : aName.includes(qa)
          ? 2
          : 3;
    const rb = bName.startsWith(qa)
      ? 0
      : bCode.startsWith(qa)
        ? 1
        : bName.includes(qa)
          ? 2
          : 3;
    return ra - rb || String(a.rik_code).localeCompare(String(b.rik_code));
  });

  const out: CatalogItem[] = [];
  for (const r of ranked) {
    const key = String(r.rik_code);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
    if (out.length >= pLimit) break;
  }
  return out;
}
