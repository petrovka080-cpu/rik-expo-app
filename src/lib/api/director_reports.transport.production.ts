import { supabase } from "../supabaseClient";
import type {
  DirectorDisciplinePayload,
  DirectorIssuePriceScopeRow,
  DirectorReportOptions,
  DirectorReportPayload,
} from "./director_reports.shared";
import {
  forEachChunkParallel,
  normalizeDirectorIssuePriceScopeRow,
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

const DIRECTOR_PRODUCTION_PRICE_LOOKUP_CHUNK_SIZE = 500;
const DIRECTOR_PRODUCTION_PRICE_LOOKUP_CONCURRENCY_LIMIT = 4;

const isMissingIssuePriceScopeRpcError = (error: unknown) => {
  const record = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
  const message = String(record.message ?? error ?? "").toLowerCase();
  const details = String(record.details ?? "").toLowerCase();
  const hint = String(record.hint ?? "").toLowerCase();
  const code = String(record.code ?? "").toLowerCase();
  const text = `${message} ${details} ${hint}`;
  return (
    text.includes("director_report_fetch_issue_price_scope_v1") &&
    (text.includes("function public.") || text.includes("could not find the function")) ||
    code === "pgrst202"
  );
};

const resolvePurchaseUnitPrice = (row: {
  price?: number | string | null;
  price_per_unit?: number | string | null;
  amount?: number | string | null;
  qty?: number | string | null;
}) => {
  const pricePerUnit = toNum(row.price_per_unit);
  if (pricePerUnit > 0) return pricePerUnit;
  const price = toNum(row.price);
  if (price > 0) return price;
  const amount = toNum(row.amount);
  const qty = toNum(row.qty);
  if (amount > 0 && qty > 0) return amount / qty;
  return 0;
};

async function fetchDirectorIssuePriceMaps(args: {
  requestItemIds?: string[];
  codes?: string[];
  skipPurchaseItems?: boolean;
}): Promise<{
  priceByCode: Map<string, number>;
  priceByRequestItem: Map<string, number>;
  sourceByCode: Map<string, string>;
  sourceByRequestItem: Map<string, string>;
}> {
  const ids = Array.from(
    new Set((args.requestItemIds ?? []).map((value) => String(value ?? "").trim()).filter(Boolean)),
  );
  const codes = Array.from(
    new Set((args.codes ?? []).map((value) => String(value ?? "").trim().toUpperCase()).filter(Boolean)),
  );
  const priceByCode = new Map<string, number>();
  const priceByRequestItem = new Map<string, number>();
  const sourceByCode = new Map<string, string>();
  const sourceByRequestItem = new Map<string, string>();
  const weightedByCode = new Map<string, { sum: number; w: number }>();
  const weightedByRequestItem = new Map<string, { sum: number; w: number }>();

  if (!ids.length && !codes.length) {
    return { priceByCode, priceByRequestItem, sourceByCode, sourceByRequestItem };
  }

  try {
    const { data, error } = await runTypedRpc<DirectorIssuePriceScopeRow>("director_report_fetch_issue_price_scope_v1", {
      p_request_item_ids: ids.length ? ids : null,
      p_codes: codes.length ? codes : null,
      p_skip_purchase_items: !!args.skipPurchaseItems,
    });
    if (error) throw error;
    const rows = Array.isArray(data)
      ? data.map(normalizeDirectorIssuePriceScopeRow).filter((row): row is NonNullable<typeof row> => !!row)
      : [];
    for (const row of rows) {
      const unitPrice = toNum(row.unit_price);
      if (!(unitPrice > 0)) continue;
      const requestItemId = String(row.request_item_id ?? "").trim();
      const rikCode = String(row.rik_code ?? "").trim().toUpperCase();
      const sourceKind = String(row.source_kind ?? "").trim() || "rpc:director_report_fetch_issue_price_scope_v1";
      if (requestItemId && !priceByRequestItem.has(requestItemId)) {
        priceByRequestItem.set(requestItemId, unitPrice);
        sourceByRequestItem.set(requestItemId, sourceKind);
      }
      if (rikCode && !priceByCode.has(rikCode)) {
        priceByCode.set(rikCode, unitPrice);
        sourceByCode.set(rikCode, sourceKind);
      }
    }
    return { priceByCode, priceByRequestItem, sourceByCode, sourceByRequestItem };
  } catch (error) {
    if (!isMissingIssuePriceScopeRpcError(error)) {
      recordDirectorReportsTransportWarning("issue_price_scope_rpc_failed", error, {
        requestItemCount: ids.length,
        codeCount: codes.length,
        skipPurchaseItems: !!args.skipPurchaseItems,
      });
    }
  }

  const pushCode = (codeRaw: unknown, unitPriceRaw: unknown, qtyRaw: unknown, sourceKind: string) => {
    const code = String(codeRaw ?? "").trim().toUpperCase();
    const unitPrice = toNum(unitPriceRaw);
    if (!code || !(unitPrice > 0)) return;
    const qty = Math.max(1, toNum(qtyRaw));
    const prev = weightedByCode.get(code) ?? { sum: 0, w: 0 };
    prev.sum += unitPrice * qty;
    prev.w += qty;
    weightedByCode.set(code, prev);
    priceByCode.set(code, prev.w > 0 ? prev.sum / prev.w : unitPrice);
    if (!sourceByCode.has(code)) sourceByCode.set(code, sourceKind);
  };
  const pushRequestItem = (requestItemIdRaw: unknown, unitPriceRaw: unknown, qtyRaw: unknown, sourceKind: string) => {
    const requestItemId = String(requestItemIdRaw ?? "").trim();
    const unitPrice = toNum(unitPriceRaw);
    if (!requestItemId || !(unitPrice > 0)) return;
    const qty = Math.max(1, toNum(qtyRaw));
    const prev = weightedByRequestItem.get(requestItemId) ?? { sum: 0, w: 0 };
    prev.sum += unitPrice * qty;
    prev.w += qty;
    weightedByRequestItem.set(requestItemId, prev);
    priceByRequestItem.set(requestItemId, prev.w > 0 ? prev.sum / prev.w : unitPrice);
    if (!sourceByRequestItem.has(requestItemId)) sourceByRequestItem.set(requestItemId, sourceKind);
  };

  if (!args.skipPurchaseItems) {
    if (codes.length) {
      try {
        await forEachChunkParallel(
          codes,
          DIRECTOR_PRODUCTION_PRICE_LOOKUP_CHUNK_SIZE,
          DIRECTOR_PRODUCTION_PRICE_LOOKUP_CONCURRENCY_LIMIT,
          async (part) => {
            const q = await supabase
              .from("purchase_items" as never)
              .select("ref_id,price,price_per_unit,amount,qty")
              .in("ref_id", part)
              .limit(50000);
            if (q.error || !Array.isArray(q.data)) return;
            for (const rawRow of q.data) {
              const row = normalizePurchaseItemPriceRow(rawRow);
              pushCode(row.ref_id ?? row.rik_code ?? row.code, resolvePurchaseUnitPrice(row), row.qty, "table:purchase_items/ref_id");
            }
          },
        );
      } catch (error) {
        recordDirectorReportsTransportWarning("issue_price_map_purchase_items_failed", error, {
          codeCount: codes.length,
          skipPurchaseItems: !!args.skipPurchaseItems,
        });
      }
    }

    if (ids.length) {
      try {
        await forEachChunkParallel(
          ids,
          DIRECTOR_PRODUCTION_PRICE_LOOKUP_CHUNK_SIZE,
          DIRECTOR_PRODUCTION_PRICE_LOOKUP_CONCURRENCY_LIMIT,
          async (part) => {
            const q = await supabase
              .from("purchase_items" as never)
              .select("request_item_id,price,price_per_unit,amount,qty")
              .in("request_item_id", part)
              .limit(50000);
            if (q.error || !Array.isArray(q.data)) return;
            for (const rawRow of q.data) {
              const row = normalizePurchaseItemRequestPriceRow(rawRow);
              pushRequestItem(row.request_item_id, resolvePurchaseUnitPrice(row), row.qty, "table:purchase_items/request_item_id");
            }
          },
        );
      } catch (error) {
        recordDirectorReportsTransportWarning("request_item_price_lookup_failed", error, {
          requestItemCount: ids.length,
        });
      }
    }
  }

  if (!DIRECTOR_REPORTS_STRICT_FACT_SOURCES) {
    if (codes.length) {
      try {
        await forEachChunkParallel(
          codes,
          DIRECTOR_PRODUCTION_PRICE_LOOKUP_CHUNK_SIZE,
          DIRECTOR_PRODUCTION_PRICE_LOOKUP_CONCURRENCY_LIMIT,
          async (part) => {
            const q = await supabase
              .from("proposal_items" as never)
              .select("rik_code,price,qty")
              .in("rik_code", part)
              .limit(50000);
            if (q.error || !Array.isArray(q.data)) return;
            for (const rawRow of q.data) {
              const row = normalizeProposalItemPriceRow(rawRow);
              pushCode(row.rik_code, row.price, row.qty, "table:proposal_items/rik_code");
            }
          },
        );
      } catch (error) {
        recordDirectorReportsTransportWarning("issue_price_map_proposal_items_failed", error, {
          codeCount: codes.length,
        });
      }
    }

    if (ids.length) {
      try {
        await forEachChunkParallel(
          ids,
          DIRECTOR_PRODUCTION_PRICE_LOOKUP_CHUNK_SIZE,
          DIRECTOR_PRODUCTION_PRICE_LOOKUP_CONCURRENCY_LIMIT,
          async (part) => {
            const q = await supabase
              .from("proposal_items" as never)
              .select("request_item_id,rik_code,price,qty")
              .in("request_item_id", part)
              .limit(50000);
            if (q.error || !Array.isArray(q.data)) return;
            for (const rawRow of q.data) {
              const row = normalizeProposalItemPriceRow(rawRow as DirectorIssuePriceScopeRow);
              const requestItemId = String((rawRow as Record<string, unknown>).request_item_id ?? "").trim();
              pushRequestItem(requestItemId, row.price, row.qty, "table:proposal_items/request_item_id");
              pushCode(row.rik_code, row.price, row.qty, "table:proposal_items/rik_code");
            }
          },
        );
      } catch (error) {
        recordDirectorReportsTransportWarning("request_item_price_lookup_proposal_items_failed", error, {
          requestItemCount: ids.length,
        });
      }
    }
  }

  return { priceByCode, priceByRequestItem, sourceByCode, sourceByRequestItem };
}

async function fetchIssuePriceMapByCode(opts?: {
  skipPurchaseItems?: boolean;
  codes?: string[];
}): Promise<Map<string, number>> {
  const { priceByCode } = await fetchDirectorIssuePriceMaps({
    requestItemIds: [],
    codes: opts?.codes ?? [],
    skipPurchaseItems: !!opts?.skipPurchaseItems,
  });
  return priceByCode;
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
  const { priceByRequestItem } = await fetchDirectorIssuePriceMaps({
    requestItemIds,
    codes: [],
  });
  return priceByRequestItem;
}

export {
  fetchDirectorIssuePriceMaps,
  fetchDirectorReportCanonicalMaterials,
  fetchDirectorReportCanonicalOptions,
  fetchDirectorReportCanonicalWorks,
  fetchIssuePriceMapByCode,
  fetchPriceByRequestItemId,
};
