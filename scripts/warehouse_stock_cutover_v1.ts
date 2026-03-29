import fs from "node:fs";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

import {
  getPlatformObservabilityEvents,
  recordPlatformObservability,
  resetPlatformObservabilityEvents,
  summarizePlatformObservabilityEvents,
} from "../src/lib/observability/platformObservability";
import { normalizeRuText } from "../src/lib/text/encoding";

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
  global: { headers: { "x-client-info": "warehouse-stock-cutover-v1" } },
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

const pickUom = (value: unknown): string | null => {
  const normalized = String(value ?? "").trim();
  return normalized || null;
};

const pickDisplayName = (codeKey: string, maps: Record<string, Record<string, string>>) => {
  const projection = String(normalizeRuText(String(maps.projection[codeKey] ?? ""))).trim();
  const override = String(normalizeRuText(String(maps.overrides[codeKey] ?? ""))).trim();
  const ui = String(normalizeRuText(String(maps.ledgerUi[codeKey] ?? ""))).trim();
  return projection || override || ui || codeKey || "—";
};

const mapLegacyTruthRows = (
  truthRows: UnknownRow[],
  maps: Record<string, Record<string, string>>,
): StockRow[] =>
  truthRows.map((row) => {
    const code = String(row.code ?? "").trim();
    const codeKey = code.toUpperCase();
    const uomId = pickUom(row.uom_id);
    const qtyAvailable = Number(row.qty_available ?? 0) || 0;
    return {
      material_id: `${code}::${uomId ?? ""}`,
      code: code || null,
      name: pickDisplayName(codeKey, maps),
      uom_id: uomId,
      qty_on_hand: qtyAvailable,
      qty_reserved: 0,
      qty_available: qtyAvailable,
      updated_at: row.updated_at == null ? null : String(row.updated_at),
    };
  });

const buildRowSignature = (row: StockRow) =>
  [
    row.material_id,
    row.code ?? "",
    row.name ?? "",
    row.uom_id ?? "",
    row.qty_on_hand,
    row.qty_reserved,
    row.qty_available,
  ].join("|");

async function loadLegacyWarehouseStock(limit = 2000) {
  const truthObservationAt = Date.now();
  const truth = await supabase
    .from("v_wh_balance_ledger_truth_ui")
    .select("code, uom_id, qty_available, updated_at")
    .order("code", { ascending: true })
    .range(0, limit - 1);
  if (truth.error) throw truth.error;

  const truthRows = Array.isArray(truth.data) ? (truth.data as UnknownRow[]) : [];
  const codes = Array.from(
    new Set(truthRows.map((row) => String(row.code ?? "").trim().toUpperCase()).filter(Boolean)),
  );

  const projection = await supabase
    .from("warehouse_name_map_ui")
    .select("code, display_name")
    .in("code", codes.slice(0, 5000));
  const projectionAvailable = !projection.error;

  const projectionMap: Record<string, string> = {};
  if (projectionAvailable && Array.isArray(projection.data)) {
    for (const row of projection.data as UnknownRow[]) {
      const code = String(row.code ?? "").trim().toUpperCase();
      const displayName = String(row.display_name ?? "").trim();
      if (code && displayName && !projectionMap[code]) projectionMap[code] = displayName;
    }
  }

  const missingCodes = projectionAvailable ? codes.filter((code) => !projectionMap[code]) : codes;
  const [overrides, ledgerUi] = await Promise.all([
    missingCodes.length > 0
      ? supabase.from("catalog_name_overrides").select("code, name_ru").in("code", missingCodes.slice(0, 5000))
      : Promise.resolve({ data: [], error: null }),
    missingCodes.length > 0
      ? supabase.from("v_wh_balance_ledger_ui").select("code, name").in("code", missingCodes.slice(0, 5000))
      : Promise.resolve({ data: [], error: null }),
  ]);

  const overrideMap: Record<string, string> = {};
  if (!overrides.error && Array.isArray(overrides.data)) {
    for (const row of overrides.data as UnknownRow[]) {
      const code = String(row.code ?? "").trim().toUpperCase();
      const name = String(row.name_ru ?? "").trim();
      if (code && name && !overrideMap[code]) overrideMap[code] = name;
    }
  }

  const ledgerUiMap: Record<string, string> = {};
  if (!ledgerUi.error && Array.isArray(ledgerUi.data)) {
    for (const row of ledgerUi.data as UnknownRow[]) {
      const code = String(row.code ?? "").trim().toUpperCase();
      const name = String(row.name ?? "").trim();
      if (code && name && !ledgerUiMap[code]) ledgerUiMap[code] = name;
    }
  }

  const rows = mapLegacyTruthRows(truthRows, {
    projection: projectionMap,
    overrides: overrideMap,
    ledgerUi: ledgerUiMap,
  });

  recordPlatformObservability({
    screen: "warehouse",
    surface: "stock_list",
    category: "fetch",
    event: "fetch_stock_legacy_script",
    result: "success",
    durationMs: Date.now() - truthObservationAt,
    rowCount: rows.length,
    sourceKind: "legacy:view:v_wh_balance_ledger_truth_ui+name_map",
    fallbackUsed: !projectionAvailable || missingCodes.length > 0,
    extra: {
      projectionAvailable,
      projectionMissCount: missingCodes.length,
    },
  });

  return {
    rows,
    projectionAvailable,
    projectionMissCount: missingCodes.length,
  };
}

async function loadRpcWarehouseStockV1(limit = 2000) {
  const startedAt = Date.now();
  const { data, error } = await supabase.rpc("warehouse_stock_scope_v1", {
    p_limit: limit,
    p_offset: 0,
  });
  if (error) throw error;

  const root = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  const rowsValue = Array.isArray(root.rows) ? root.rows : [];
  const rows: StockRow[] = rowsValue.map((rowValue) => {
    const row = rowValue && typeof rowValue === "object" ? (rowValue as Record<string, unknown>) : {};
    const code = String(row.code ?? "").trim() || null;
    const uomId = String(row.uom_id ?? "").trim() || null;
    return {
      material_id: String(row.material_id ?? `${code ?? ""}::${uomId ?? ""}`),
      code,
      name: String(normalizeRuText(String(row.name ?? ""))).trim() || null,
      uom_id: uomId,
      qty_on_hand: Number(row.qty_on_hand ?? 0) || 0,
      qty_reserved: Number(row.qty_reserved ?? 0) || 0,
      qty_available: Number(row.qty_available ?? 0) || 0,
      updated_at: row.updated_at == null ? null : String(row.updated_at),
    };
  });

  recordPlatformObservability({
    screen: "warehouse",
    surface: "stock_list",
    category: "fetch",
    event: "fetch_stock_rpc_script",
    result: "success",
    durationMs: Date.now() - startedAt,
    rowCount: rows.length,
    sourceKind: "rpc:warehouse_stock_scope_v1",
    fallbackUsed: false,
  });

  return {
    rows,
  };
}

async function loadRpcWarehouseStockV2(limit = 2000) {
  const startedAt = Date.now();
  const { data, error } = await supabase.rpc("warehouse_stock_scope_v2", {
    p_limit: limit,
    p_offset: 0,
  });
  if (error) throw error;

  const root = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  const rowsValue = Array.isArray(root.rows) ? root.rows : [];
  const rows: StockRow[] = rowsValue.map((rowValue) => {
    const row = rowValue && typeof rowValue === "object" ? (rowValue as Record<string, unknown>) : {};
    const code = String(row.code ?? "").trim() || null;
    const uomId = String(row.uom_id ?? "").trim() || null;
    return {
      material_id: String(row.material_id ?? `${code ?? ""}::${uomId ?? ""}`),
      code,
      name: String(normalizeRuText(String(row.name ?? ""))).trim() || null,
      uom_id: uomId,
      qty_on_hand: Number(row.qty_on_hand ?? 0) || 0,
      qty_reserved: Number(row.qty_reserved ?? 0) || 0,
      qty_available: Number(row.qty_available ?? 0) || 0,
      updated_at: row.updated_at == null ? null : String(row.updated_at),
    };
  });

  recordPlatformObservability({
    screen: "warehouse",
    surface: "stock_list",
    category: "fetch",
    event: "fetch_stock_rpc_v2_script",
    result: "success",
    durationMs: Date.now() - startedAt,
    rowCount: rows.length,
    sourceKind: "rpc:warehouse_stock_scope_v2",
    fallbackUsed: false,
  });

  return {
    rows,
  };
}

async function main() {
  resetPlatformObservabilityEvents();

  const legacy = await measure(() => loadLegacyWarehouseStock(2000));
  const rpc = await measure(() => loadRpcWarehouseStockV1(2000));
  const primary = await measure(() => loadRpcWarehouseStockV2(2000));

  const legacySignatures = legacy.result.rows.map(buildRowSignature).sort();
  const rpcSignatures = rpc.result.rows.map(buildRowSignature).sort();
  const primarySignatures = primary.result.rows.map(buildRowSignature).sort();
  const rowParityOk =
    legacySignatures.length === primarySignatures.length &&
    legacySignatures.every((signature, index) => signature === primarySignatures[index]);
  const backendParityOk =
    rpcSignatures.length === primarySignatures.length &&
    rpcSignatures.every((signature, index) => signature === primarySignatures[index]);

  const warehouseApiSource = fs.readFileSync(
    path.join(projectRoot, "src/screens/warehouse/warehouse.api.ts"),
    "utf8",
  );
  const stockServiceSource = fs.readFileSync(
    path.join(projectRoot, "src/screens/warehouse/warehouse.stockReports.service.ts"),
    "utf8",
  );
  const serviceTypeHardCutOk =
    warehouseApiSource.includes('from "./warehouse.stockReports.service";') &&
    warehouseApiSource.includes("apiFetchStockRpcV2,") &&
    stockServiceSource.includes('primaryOwner: "rpc_scope_v2" | "rpc_scope_v1";') &&
    !stockServiceSource.includes('primaryOwner: "rpc_scope_v2" | "rpc_scope_v1" | "legacy_client_shaping";') &&
    !warehouseApiSource.includes("export async function apiFetchStockLegacy(") &&
    !stockServiceSource.includes("const result = await apiFetchStockLegacy(");

  const events = getPlatformObservabilityEvents();
  const summary = summarizePlatformObservabilityEvents(events);
  const artifact = {
    status:
      rowParityOk &&
      backendParityOk &&
      primary.result.rows.length > 0 &&
      serviceTypeHardCutOk
        ? "passed"
        : "failed",
    gate:
      rowParityOk &&
      backendParityOk &&
      primary.result.rows.length > 0 &&
      serviceTypeHardCutOk
        ? "GREEN"
        : "NOT_GREEN",
    legacy: {
      durationMs: legacy.durationMs,
      rows: legacy.result.rows.length,
      projectionAvailable: legacy.result.projectionAvailable,
      projectionMissCount: legacy.result.projectionMissCount,
      sourceMeta: {
        primaryOwner: "legacy_client_shaping",
        fallbackUsed: true,
        sourceKind: "legacy:view:v_wh_balance_ledger_truth_ui+name_map",
      },
    },
    rpc: {
      durationMs: rpc.durationMs,
      rows: rpc.result.rows.length,
      sourceMeta: {
        primaryOwner: "rpc_scope_v1",
        fallbackUsed: false,
        sourceKind: "rpc:warehouse_stock_scope_v1",
      },
    },
    primary: {
      durationMs: primary.durationMs,
      rows: primary.result.rows.length,
      sourceMeta: {
        primaryOwner: "rpc_scope_v2",
        fallbackUsed: false,
        sourceKind: "rpc:warehouse_stock_scope_v2",
      },
    },
    parity: {
      rowParityOk,
      backendParityOk,
      legacyRowCount: legacy.result.rows.length,
      rpcRowCount: rpc.result.rows.length,
      primaryRowCount: primary.result.rows.length,
    },
    serviceTypeHardCutOk,
    events,
    summary,
  };

  writeArtifact("artifacts/warehouse-stock-cutover-v1.json", artifact);
  writeArtifact("artifacts/warehouse-stock-cutover-v1.summary.json", {
    status: artifact.status,
    gate: artifact.gate,
    legacy: artifact.legacy,
    rpc: artifact.rpc,
    primary: artifact.primary,
    parity: artifact.parity,
    serviceTypeHardCutOk: artifact.serviceTypeHardCutOk,
    topSlowFetches: summary.topSlowFetches.slice(0, 5),
  });

  console.log(
    JSON.stringify(
      {
        status: artifact.status,
        gate: artifact.gate,
        primaryOwner: artifact.primary.sourceMeta.primaryOwner,
        fallbackUsed: artifact.primary.sourceMeta.fallbackUsed,
        legacyDurationMs: legacy.durationMs,
        rpcDurationMs: rpc.durationMs,
        primaryDurationMs: primary.durationMs,
        rowParityOk,
        backendParityOk,
        serviceTypeHardCutOk,
      },
      null,
      2,
    ),
  );
}

void main();
