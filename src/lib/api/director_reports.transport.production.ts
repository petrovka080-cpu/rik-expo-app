import { supabase } from "../supabaseClient";
import type {
  DirectorDisciplinePayload,
  DirectorReportOptions,
  DirectorReportPayload,
} from "./director_reports.shared";
import {
  forEachChunkParallel,
  normalizeProposalItemPriceRow,
  normalizePurchaseItemPriceRow,
  normalizePurchaseItemRequestPriceRow,
  toNum,
} from "./director_reports.shared";
import {
  DIRECTOR_REPORTS_STRICT_FACT_SOURCES,
} from "./director_reports.cache";
import {
  adaptCanonicalMaterialsPayload,
  adaptCanonicalOptionsPayload,
  adaptCanonicalWorksPayload,
  unwrapRpcPayload,
} from "./director_reports.adapters";
import {
  fetchBestMaterialNamesByCode,
  looksLikeMaterialCode,
} from "./director_reports.naming";
import { recordDirectorReportsTransportWarning } from "./director_reports.observability";
import { runTypedRpc } from "./director_reports.transport.base";

async function fetchIssuePriceMapByCode(opts?: {
  skipPurchaseItems?: boolean;
  codes?: string[];
}): Promise<Map<string, number>> {
  const weighted = new Map<string, { sum: number; w: number }>();
  const scopedCodes = Array.from(
    new Set((opts?.codes ?? []).map((x) => String(x ?? "").trim().toUpperCase()).filter(Boolean)),
  );
  const hasScopedCodes = scopedCodes.length > 0;

  const push = (codeRaw: unknown, priceRaw: unknown, qtyRaw: unknown) => {
    const code = String(codeRaw ?? "").trim().toUpperCase();
    const price = toNum(priceRaw);
    if (!code || !(price > 0)) return;
    const qty = Math.max(1, toNum(qtyRaw));
    const prev = weighted.get(code) ?? { sum: 0, w: 0 };
    prev.sum += price * qty;
    prev.w += qty;
    weighted.set(code, prev);
  };

  if (!opts?.skipPurchaseItems) {
    try {
      if (hasScopedCodes) {
        await forEachChunkParallel(scopedCodes, 500, 4, async (part) => {
          const q = await supabase
            .from("purchase_items" as never)
            .select("rik_code,code,price,qty")
            .in("rik_code", part)
            .limit(50000);
          if (!q.error && Array.isArray(q.data)) {
            for (const r of q.data) {
              const row = normalizePurchaseItemPriceRow(r);
              push(row.rik_code ?? row.code, row.price, row.qty);
            }
          }
        });
      } else {
        const q = await supabase
          .from("purchase_items" as never)
          .select("rik_code,code,price,qty")
          .limit(50000);
        if (!q.error && Array.isArray(q.data)) {
          for (const r of q.data) {
            const row = normalizePurchaseItemPriceRow(r);
            push(row.rik_code ?? row.code, row.price, row.qty);
          }
        }
      }
    } catch (error) {
      recordDirectorReportsTransportWarning("issue_price_map_purchase_items_failed", error, {
        hasScopedCodes,
        scopedCodeCount: scopedCodes.length,
        skipPurchaseItems: !!opts?.skipPurchaseItems,
      });
    }
  }

  if (!weighted.size && !DIRECTOR_REPORTS_STRICT_FACT_SOURCES) {
    try {
      if (hasScopedCodes) {
        await forEachChunkParallel(scopedCodes, 500, 4, async (part) => {
          const q2 = await supabase
            .from("proposal_items" as never)
            .select("rik_code,price,qty")
            .in("rik_code", part)
            .limit(50000);
          if (!q2.error && Array.isArray(q2.data)) {
            for (const r of q2.data) {
              const row = normalizeProposalItemPriceRow(r);
              push(row.rik_code, row.price, row.qty);
            }
          }
        });
      } else {
        const q2 = await supabase
          .from("proposal_items" as never)
          .select("rik_code,price,qty")
          .limit(50000);
        if (!q2.error && Array.isArray(q2.data)) {
          for (const r of q2.data) {
            const row = normalizeProposalItemPriceRow(r);
            push(row.rik_code, row.price, row.qty);
          }
        }
      }
    } catch (error) {
      recordDirectorReportsTransportWarning("issue_price_map_proposal_items_failed", error, {
        hasScopedCodes,
        scopedCodeCount: scopedCodes.length,
      });
    }
  }

  const out = new Map<string, number>();
  for (const [code, a] of weighted.entries()) {
    out.set(code, a.w > 0 ? a.sum / a.w : 0);
  }
  return out;
}

async function fetchDirectorReportCanonicalMaterials(p: {
  from: string;
  to: string;
  objectName: string | null;
}): Promise<DirectorReportPayload | null> {
  const { data, error } = await runTypedRpc<Record<string, unknown>>("director_report_fetch_materials_v1", {
    p_from: p.from || "1970-01-01",
    p_to: p.to || "2099-12-31",
    p_object_name: p.objectName ?? null,
  });
  if (error) throw error;
  const payload = unwrapRpcPayload(data);
  const adapted = adaptCanonicalMaterialsPayload(payload);
  if (!adapted || !Array.isArray(adapted.rows) || !adapted.rows.length) return adapted;

  const codesToResolve = Array.from(
    new Set(
      adapted.rows
        .filter((row) => {
          const code = String(row.rik_code ?? "").trim().toUpperCase();
          if (!code) return false;
          const name = String(row.name_human_ru ?? "").trim();
          return !name || looksLikeMaterialCode(name);
        })
        .map((row) => String(row.rik_code ?? "").trim().toUpperCase())
        .filter(Boolean),
    ),
  );
  if (!codesToResolve.length) return adapted;

  try {
    const nameByCode = await fetchBestMaterialNamesByCode(codesToResolve);
    if (!nameByCode.size) return adapted;
    return {
      ...adapted,
      rows: adapted.rows.map((row) => {
        const code = String(row.rik_code ?? "").trim().toUpperCase();
        const best = nameByCode.get(code);
        if (!best) return row;
        const current = String(row.name_human_ru ?? "").trim();
        if (current && !looksLikeMaterialCode(current)) return row;
        return { ...row, name_human_ru: best };
      }),
    };
  } catch (error) {
    recordDirectorReportsTransportWarning("canonical_materials_name_resolution_failed", error, {
      codeCount: codesToResolve.length,
      objectName: p.objectName,
    });
    return adapted;
  }
}

async function fetchDirectorReportCanonicalWorks(p: {
  from: string;
  to: string;
  objectName: string | null;
  includeCosts: boolean;
}): Promise<DirectorDisciplinePayload | null> {
  const { data, error } = await runTypedRpc<Record<string, unknown>>("director_report_fetch_works_v1", {
    p_from: p.from || "1970-01-01",
    p_to: p.to || "2099-12-31",
    p_object_name: p.objectName ?? null,
    p_include_costs: !!p.includeCosts,
  });
  if (error) throw error;
  const payload = unwrapRpcPayload(data);
  return adaptCanonicalWorksPayload(payload);
}

async function fetchDirectorReportCanonicalOptions(p: {
  from: string;
  to: string;
}): Promise<DirectorReportOptions | null> {
  const { data, error } = await runTypedRpc<Record<string, unknown>>("director_report_fetch_options_v1", {
    p_from: p.from || "1970-01-01",
    p_to: p.to || "2099-12-31",
  });
  if (error) throw error;
  const payload = unwrapRpcPayload(data);
  return adaptCanonicalOptionsPayload(payload);
}

async function fetchPriceByRequestItemId(requestItemIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const ids = Array.from(
    new Set((requestItemIds || []).map((x) => String(x || "").trim()).filter(Boolean)),
  );
  if (!ids.length) return out;

  await forEachChunkParallel(ids, 500, 4, async (part) => {
    try {
      const q = await supabase
        .from("purchase_items" as never)
        .select("request_item_id,price,qty")
        .in("request_item_id", part);
      if (q.error || !Array.isArray(q.data)) return;

      const agg = new Map<string, { sum: number; w: number }>();
      for (const r of q.data) {
        const row = normalizePurchaseItemRequestPriceRow(r);
        const id = String(row.request_item_id ?? "").trim();
        const price = toNum(row.price);
        if (!id || !(price > 0)) continue;
        const w = Math.max(1, toNum(row.qty));
        const prev = agg.get(id) ?? { sum: 0, w: 0 };
        prev.sum += price * w;
        prev.w += w;
        agg.set(id, prev);
      }
      for (const [id, value] of agg.entries()) {
        if (value.w > 0) out.set(id, value.sum / value.w);
      }
    } catch (error) {
      recordDirectorReportsTransportWarning("request_item_price_lookup_failed", error, {
        chunkSize: part.length,
        totalIds: ids.length,
      });
    }
  });

  return out;
}

export {
  fetchDirectorReportCanonicalMaterials,
  fetchDirectorReportCanonicalOptions,
  fetchDirectorReportCanonicalWorks,
  fetchIssuePriceMapByCode,
  fetchPriceByRequestItemId,
};
