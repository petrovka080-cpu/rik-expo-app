import fs from "node:fs";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

type UnknownRow = Record<string, unknown>;

type StockRow = {
  material_id: string;
  code: string | null;
  name: string | null;
  uom_id: string | null;
  qty_on_hand: number;
  qty_reserved: number;
  qty_available: number;
  updated_at: string | null;
};

const projectRoot = process.cwd();
for (const file of [".env.local", ".env"]) {
  const full = path.join(projectRoot, file);
  if (fs.existsSync(full)) loadDotenv({ path: full, override: false });
}

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseKey = String(
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
).trim();

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-client-info": "warehouse-stock-windowing-v2" } },
});

const writeArtifact = (relativePath: string, payload: unknown) => {
  const full = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `${JSON.stringify(payload, null, 2)}\n`);
};

const measure = async <T>(fn: () => Promise<T>) => {
  const startedAt = Date.now();
  const result = await fn();
  return {
    result,
    durationMs: Date.now() - startedAt,
  };
};

const toNullableString = (value: unknown): string | null => {
  const normalized = String(value ?? "").trim();
  return normalized || null;
};

const adaptRow = (rowValue: unknown): StockRow => {
  const row = rowValue && typeof rowValue === "object" ? (rowValue as UnknownRow) : {};
  const code = toNullableString(row.code);
  const uomId = toNullableString(row.uom_id);
  return {
    material_id: String(row.material_id ?? `${code ?? ""}::${uomId ?? ""}`),
    code,
    name: toNullableString(row.name),
    uom_id: uomId,
    qty_on_hand: Number(row.qty_on_hand ?? 0) || 0,
    qty_reserved: Number(row.qty_reserved ?? 0) || 0,
    qty_available: Number(row.qty_available ?? 0) || 0,
    updated_at: toNullableString(row.updated_at),
  };
};

const buildSignature = (row: StockRow) =>
  [
    row.material_id,
    row.code ?? "",
    row.name ?? "",
    row.uom_id ?? "",
    row.qty_on_hand,
    row.qty_reserved,
    row.qty_available,
  ].join("|");

async function loadLegacyFull(limit: number) {
  const { data, error } = await supabase.rpc("warehouse_stock_scope_v1", {
    p_limit: limit,
    p_offset: 0,
  });
  if (error) throw error;
  const root = data && typeof data === "object" && !Array.isArray(data) ? (data as UnknownRow) : {};
  const rows = Array.isArray(root.rows) ? root.rows.map(adaptRow) : [];
  return rows;
}

async function loadPrimaryPage(limit: number, offset: number) {
  const { data, error } = await supabase.rpc("warehouse_stock_scope_v2", {
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;

  const root = data && typeof data === "object" && !Array.isArray(data) ? (data as UnknownRow) : {};
  const meta = root.meta && typeof root.meta === "object" && !Array.isArray(root.meta) ? (root.meta as UnknownRow) : {};
  return {
    rows: Array.isArray(root.rows) ? root.rows.map(adaptRow) : [],
    meta: {
      totalRowCount: Number(meta.total_row_count ?? 0) || 0,
      returnedRowCount: Number(meta.returned_row_count ?? 0) || 0,
      hasMore: Boolean(meta.has_more),
      limit: Number(meta.limit ?? limit) || limit,
      offset: Number(meta.offset ?? offset) || offset,
    },
  };
}

async function loadTruthCount() {
  const { count, error } = await supabase
    .from("v_wh_balance_ledger_truth_ui")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return Number(count ?? 0) || 0;
}

async function main() {
  const pageSize = 120;
  const legacy = await measure(() => loadLegacyFull(2000));
  const primaryPage1 = await measure(() => loadPrimaryPage(pageSize, 0));
  const primaryPage2 = await measure(() => loadPrimaryPage(pageSize, pageSize));
  const truthCount = await measure(() => loadTruthCount());

  const legacyPage1 = legacy.result.slice(0, pageSize);
  const legacyPage2 = legacy.result.slice(pageSize, pageSize * 2);

  const page1ParityOk =
    legacyPage1.length === primaryPage1.result.rows.length &&
    legacyPage1.every((row, index) => buildSignature(row) === buildSignature(primaryPage1.result.rows[index]!));
  const page2ParityOk =
    legacyPage2.length === primaryPage2.result.rows.length &&
    legacyPage2.every((row, index) => buildSignature(row) === buildSignature(primaryPage2.result.rows[index]!));
  const appendUniqueOk =
    new Set([...primaryPage1.result.rows, ...primaryPage2.result.rows].map((row) => row.material_id)).size ===
    primaryPage1.result.rows.length + primaryPage2.result.rows.length;
  const totalCountOk = primaryPage1.result.meta.totalRowCount === truthCount.result;
  const hasMoreOk =
    primaryPage1.result.meta.hasMore === (primaryPage1.result.meta.offset + primaryPage1.result.meta.returnedRowCount < truthCount.result);

  const artifact = {
    status: page1ParityOk && page2ParityOk && appendUniqueOk && totalCountOk && hasMoreOk ? "passed" : "failed",
    legacy: {
      durationMs: legacy.durationMs,
      rows: legacy.result.length,
      sourceKind: "rpc:warehouse_stock_scope_v1",
      primaryOwner: "rpc_scope_v1",
    },
    primary: {
      page1DurationMs: primaryPage1.durationMs,
      page2DurationMs: primaryPage2.durationMs,
      sourceKind: "rpc:warehouse_stock_scope_v2",
      primaryOwner: "rpc_scope_v2",
      pageSize,
      page1: primaryPage1.result.meta,
      page2: primaryPage2.result.meta,
    },
    truth: {
      countDurationMs: truthCount.durationMs,
      totalRows: truthCount.result,
    },
    parity: {
      page1ParityOk,
      page2ParityOk,
      appendUniqueOk,
      totalCountOk,
      hasMoreOk,
      legacyPage1Rows: legacyPage1.length,
      legacyPage2Rows: legacyPage2.length,
      primaryPage1Rows: primaryPage1.result.rows.length,
      primaryPage2Rows: primaryPage2.result.rows.length,
    },
  };

  writeArtifact("artifacts/warehouse-stock-windowing-v2.json", artifact);
  writeArtifact("artifacts/warehouse-stock-windowing-v2.summary.json", {
    status: artifact.status,
    legacy: artifact.legacy,
    primary: artifact.primary,
    truth: artifact.truth,
    parity: artifact.parity,
  });

  console.log(
    JSON.stringify(
      {
        status: artifact.status,
        legacyDurationMs: artifact.legacy.durationMs,
        primaryPage1DurationMs: artifact.primary.page1DurationMs,
        primaryOwner: artifact.primary.primaryOwner,
        page1ParityOk,
        page2ParityOk,
        totalCountOk,
        hasMoreOk,
      },
      null,
      2,
    ),
  );
}

void main();
