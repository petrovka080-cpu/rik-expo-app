import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

import {
  buildWarehouseBuyerRpcScaleRankings,
  createWarehouseBuyerRpcScaleInventory,
  validateWarehouseBuyerRpcScaleInventory,
  median,
  max,
  recommendWarehouseBuyerRpcPath,
  renderWarehouseBuyerRpcScaleNotes,
  renderWarehouseBuyerRpcScaleProof,
  summarizePathResult,
  type WarehouseBuyerRpcDefinition,
  type WarehouseBuyerRpcMatrixEntry,
  type WarehouseBuyerRpcTierPlan,
  type WarehouseBuyerRpcTierResult,
} from "./_shared/warehouseBuyerRpcScaleCore";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

const projectRoot = process.cwd();
const collectedAt = new Date().toISOString();

const INVENTORY_PATH = "artifacts/WAREHOUSE_BUYER_rpc_scale_inventory.json";
const MATRIX_PATH = "artifacts/WAREHOUSE_BUYER_rpc_scale_matrix.json";
const RANKINGS_PATH = "artifacts/WAREHOUSE_BUYER_rpc_scale_rankings.json";
const NOTES_PATH = "artifacts/WAREHOUSE_BUYER_rpc_scale_notes.md";
const PROOF_PATH = "artifacts/WAREHOUSE_BUYER_rpc_scale_proof.md";

type RpcCallResult = {
  data: unknown;
  error: { message?: string } | null;
};

type RpcAdmin = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<RpcCallResult>;
};

type ResolvedTierInvocation = {
  args?: Record<string, unknown>;
  filterBehaviorNotes: string[];
  paginationBehaviorNotes: string[];
  stageErrors: string[];
  insufficientFixture: boolean;
};

type TierRunSample = {
  latencyMs: number;
  payloadBytes: number;
  rowCount: number;
  filterBehaviorNotes: string[];
  paginationBehaviorNotes: string[];
};

type CollectorContext = {
  issueRequestIds: string[] | null;
  buyerSearchToken: string | null;
};

const missingEnvKeys = ["EXPO_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter((key) =>
  String(process.env[key] ?? "").trim().length === 0,
);

const writeJson = (relativePath: string, payload: unknown) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const writeText = (relativePath: string, payload: string) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, payload);
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const toText = (value: unknown): string => String(value ?? "").trim();

const extractRowsArray = (data: unknown): unknown[] => {
  if (Array.isArray(data)) return data;
  const root = asRecord(data);
  if (Array.isArray(root.rows)) return root.rows;
  return [];
};

const extractBuyerBucketRows = (data: unknown): number => {
  const root = asRecord(data);
  return asArray(root.pending).length + asArray(root.approved).length + asArray(root.rejected).length;
};

const countRows = (definition: WarehouseBuyerRpcDefinition, data: unknown): number => {
  if (definition.id === "buyer_summary_buckets_scope_v1") {
    return extractBuyerBucketRows(data);
  }
  return extractRowsArray(data).length;
};

const payloadBytes = (data: unknown): number => Buffer.byteLength(JSON.stringify(data ?? null), "utf8");

const toDateStringDaysAgo = (daysAgo: number): string => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
};

const summarizeStabilityNotes = (latencyValues: number[], payloadValues: number[], rowCounts: number[]): string[] => {
  const notes: string[] = [];
  const latencyFloor = Math.min(...latencyValues);
  const latencyCeiling = Math.max(...latencyValues);
  const payloadFloor = Math.min(...payloadValues);
  const payloadCeiling = Math.max(...payloadValues);
  const rowFloor = Math.min(...rowCounts);
  const rowCeiling = Math.max(...rowCounts);

  if (latencyValues.length > 1) {
    const latencySpread = latencyFloor > 0 ? Number((latencyCeiling / latencyFloor).toFixed(2)) : null;
    notes.push(
      latencySpread != null && latencySpread >= 2
        ? `latency spread ${latencySpread}x across repeated runs`
        : "latency stable across repeated runs",
    );
  }

  if (payloadValues.length > 1) {
    const payloadSpread = payloadFloor > 0 ? Number((payloadCeiling / payloadFloor).toFixed(2)) : null;
    notes.push(
      payloadSpread != null && payloadSpread >= 1.5
        ? `payload spread ${payloadSpread}x across repeated runs`
        : "payload stable across repeated runs",
    );
  }

  if (rowCounts.length > 1) {
    notes.push(
      rowFloor === rowCeiling
        ? "row count stable across repeated runs"
        : `row count varied from ${rowFloor} to ${rowCeiling} across repeated runs`,
    );
  }

  return notes;
};

const createBlockedTierResult = (
  tier: WarehouseBuyerRpcTierPlan,
  envKeys: string[],
): WarehouseBuyerRpcTierResult => ({
  tier: tier.tier,
  label: tier.label,
  status: "blocked_missing_env",
  readOnly: true,
  repeatedRunsPlanned: tier.repeatedRuns,
  repeatedRunsCompleted: 0,
  missingEnvKeys: envKeys,
  latencyMs: [],
  payloadBytes: [],
  rowCounts: [],
  medianLatencyMs: null,
  maxLatencyMs: null,
  medianPayloadBytes: null,
  maxPayloadBytes: null,
  medianRowCount: null,
  maxRowCount: null,
  filterShape: tier.filterShape,
  paginationShape: tier.paginationShape,
  filterBehaviorNotes: [],
  paginationBehaviorNotes: [],
  stabilityNotes: [],
  stageErrors: ["Collector environment missing Supabase admin credentials"],
});

const createRpcAdmin = (): RpcAdmin => {
  const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-client-info": "warehouse-buyer-rpc-scale-collect" } },
  });

  return {
    rpc: async (fn, args) => {
      const result =
        args == null ? await client.rpc(fn as never) : await client.rpc(fn as never, args as never);
      return {
        data: result.data,
        error: result.error ? { message: result.error.message } : null,
      };
    },
  };
};

const invokeRpcMeasured = async (
  admin: RpcAdmin,
  fn: string,
  args?: Record<string, unknown>,
): Promise<{ latencyMs: number; data: unknown }> => {
  const startedAt = Date.now();
  const result = await admin.rpc(fn, args);
  const latencyMs = Date.now() - startedAt;
  if (result.error) {
    throw new Error(result.error.message || `${fn} failed`);
  }
  return {
    latencyMs,
    data: result.data,
  };
};

const extractSearchToken = (data: unknown): string | null => {
  const rows = extractRowsArray(data)
    .map((row) => asRecord(row))
    .filter((row) => Object.keys(row).length > 0);

  for (const row of rows) {
    const candidates = [
      toText(row.rik_code),
      toText(row.name_human),
      toText(row.object_name),
      toText(row.request_id),
    ].filter(Boolean);

    for (const candidate of candidates) {
      const token = candidate
        .split(/[^0-9A-Za-zА-Яа-я_-]+/)
        .map((part) => part.trim())
        .find((part) => part.length >= 3);
      if (token) return token;
    }
  }

  return null;
};

const getIssueRequestIds = async (admin: RpcAdmin, context: CollectorContext): Promise<string[]> => {
  if (context.issueRequestIds) return context.issueRequestIds;
  const { data } = await invokeRpcMeasured(admin, "warehouse_issue_queue_scope_v4", {
    p_offset: 0,
    p_limit: 100,
  });
  const ids = extractRowsArray(data)
    .map((row) => toText(asRecord(row).request_id))
    .filter(Boolean);
  context.issueRequestIds = ids;
  return ids;
};

const getBuyerSearchToken = async (admin: RpcAdmin, context: CollectorContext): Promise<string | null> => {
  if (context.buyerSearchToken !== null) return context.buyerSearchToken;
  const { data: canonicalData } = await invokeRpcMeasured(admin, "buyer_summary_inbox_scope_v1", {
    p_offset: 0,
    p_limit: 25,
    p_search: null,
    p_company_id: null,
  });
  const canonicalToken = extractSearchToken(canonicalData);
  if (canonicalToken) {
    context.buyerSearchToken = canonicalToken;
    return context.buyerSearchToken;
  }

  const { data: legacyData } = await invokeRpcMeasured(admin, "list_buyer_inbox", {
    p_company_id: null,
  });
  context.buyerSearchToken = extractSearchToken(legacyData);
  return context.buyerSearchToken;
};

const resolveTierInvocation = async (
  admin: RpcAdmin,
  definition: WarehouseBuyerRpcDefinition,
  tier: WarehouseBuyerRpcTierPlan,
  context: CollectorContext,
): Promise<ResolvedTierInvocation> => {
  const filterBehaviorNotes: string[] = [];
  const paginationBehaviorNotes: string[] = [];

  switch (definition.id) {
    case "warehouse_issue_queue_scope_v4": {
      const offsetByTier: Record<string, number> = {
        page_0_limit_25: 0,
        page_0_limit_50: 0,
        page_0_limit_100: 0,
        deep_page_limit_100: 300,
      };
      const limitByTier: Record<string, number> = {
        page_0_limit_25: 25,
        page_0_limit_50: 50,
        page_0_limit_100: 100,
        deep_page_limit_100: 100,
      };
      const offset = offsetByTier[tier.label] ?? 0;
      const limit = limitByTier[tier.label] ?? 25;
      paginationBehaviorNotes.push(`queue pagination probe offset=${offset} limit=${limit}`);
      return {
        args: { p_offset: offset, p_limit: limit },
        filterBehaviorNotes,
        paginationBehaviorNotes,
        stageErrors: [],
        insufficientFixture: false,
      };
    }

    case "warehouse_issue_items_scope_v1": {
      const requestIds = await getIssueRequestIds(admin, context);
      const sampleIndexByTier: Record<string, number> = {
        sampled_head_page_0: 0,
        sampled_head_page_1: 3,
        sampled_head_large_window: 10,
      };
      const sampleIndex = sampleIndexByTier[tier.label] ?? 0;
      const requestId = requestIds[sampleIndex] ?? requestIds[requestIds.length - 1] ?? null;
      if (!requestId) {
        return {
          filterBehaviorNotes,
          paginationBehaviorNotes,
          stageErrors: ["No request_id sample available from warehouse_issue_queue_scope_v4"],
          insufficientFixture: true,
        };
      }
      filterBehaviorNotes.push(`sampled request_id from queue scope index=${sampleIndex}`);
      paginationBehaviorNotes.push("detail scope has no direct pagination contract");
      return {
        args: { p_request_id: requestId },
        filterBehaviorNotes,
        paginationBehaviorNotes,
        stageErrors: [],
        insufficientFixture: false,
      };
    }

    case "warehouse_incoming_queue_scope_v1": {
      const offsetByTier: Record<string, number> = {
        page_0_limit_15: 0,
        page_0_limit_30: 0,
        page_0_limit_60: 0,
        deep_page_limit_60: 180,
      };
      const limitByTier: Record<string, number> = {
        page_0_limit_15: 15,
        page_0_limit_30: 30,
        page_0_limit_60: 60,
        deep_page_limit_60: 60,
      };
      const offset = offsetByTier[tier.label] ?? 0;
      const limit = limitByTier[tier.label] ?? 15;
      paginationBehaviorNotes.push(`incoming pagination probe offset=${offset} limit=${limit}`);
      return {
        args: { p_offset: offset, p_limit: limit },
        filterBehaviorNotes,
        paginationBehaviorNotes,
        stageErrors: [],
        insufficientFixture: false,
      };
    }

    case "warehouse_stock_scope_v2": {
      const offsetByTier: Record<string, number> = {
        page_0_limit_60: 0,
        page_0_limit_120: 0,
        page_0_limit_240: 0,
        deep_page_limit_240: 480,
      };
      const limitByTier: Record<string, number> = {
        page_0_limit_60: 60,
        page_0_limit_120: 120,
        page_0_limit_240: 240,
        deep_page_limit_240: 240,
      };
      const offset = offsetByTier[tier.label] ?? 0;
      const limit = limitByTier[tier.label] ?? 60;
      paginationBehaviorNotes.push(`stock pagination probe offset=${offset} limit=${limit}`);
      return {
        args: { p_offset: offset, p_limit: limit },
        filterBehaviorNotes,
        paginationBehaviorNotes,
        stageErrors: [],
        insufficientFixture: false,
      };
    }

    case "wh_report_issued_materials_fast": {
      const rangeByTier: Record<string, { from: string | null; to: string | null }> = {
        last_7_days: { from: toDateStringDaysAgo(7), to: toDateStringDaysAgo(0) },
        last_30_days: { from: toDateStringDaysAgo(30), to: toDateStringDaysAgo(0) },
        last_180_days: { from: toDateStringDaysAgo(180), to: toDateStringDaysAgo(0) },
        unbounded_range: { from: null, to: null },
      };
      const range = rangeByTier[tier.label] ?? { from: null, to: null };
      filterBehaviorNotes.push(`date_range=${range.from ?? "null"}..${range.to ?? "null"}`);
      paginationBehaviorNotes.push("report scope is non-paginated");
      return {
        args: { p_from: range.from, p_to: range.to, p_object_id: null },
        filterBehaviorNotes,
        paginationBehaviorNotes,
        stageErrors: [],
        insufficientFixture: false,
      };
    }

    case "buyer_summary_inbox_scope_v1": {
      const offsetByTier: Record<string, number> = {
        page_0_limit_25: 0,
        page_0_limit_100: 0,
        deep_page_limit_100: 200,
        page_0_limit_100_filtered: 0,
      };
      const limitByTier: Record<string, number> = {
        page_0_limit_25: 25,
        page_0_limit_100: 100,
        deep_page_limit_100: 100,
        page_0_limit_100_filtered: 100,
      };
      const offset = offsetByTier[tier.label] ?? 0;
      const limit = limitByTier[tier.label] ?? 25;
      let search: string | null = null;
      if (tier.label === "page_0_limit_100_filtered") {
        search = await getBuyerSearchToken(admin, context);
        if (!search) {
          return {
            filterBehaviorNotes,
            paginationBehaviorNotes,
            stageErrors: ["No usable search token available from buyer_summary_inbox_scope_v1 sample rows"],
            insufficientFixture: true,
          };
        }
        filterBehaviorNotes.push(`filtered probe search=${search}`);
      } else {
        filterBehaviorNotes.push("search=null");
      }
      paginationBehaviorNotes.push(`inbox pagination probe offset=${offset} limit=${limit}`);
      return {
        args: { p_offset: offset, p_limit: limit, p_search: search, p_company_id: null },
        filterBehaviorNotes,
        paginationBehaviorNotes,
        stageErrors: [],
        insufficientFixture: false,
      };
    }

    case "buyer_summary_buckets_scope_v1": {
      filterBehaviorNotes.push("fixed summary scope with no args");
      paginationBehaviorNotes.push("summary scope is non-paginated");
      return {
        args: undefined,
        filterBehaviorNotes,
        paginationBehaviorNotes,
        stageErrors: [],
        insufficientFixture: false,
      };
    }

    case "list_buyer_inbox": {
      filterBehaviorNotes.push("legacy fixed scope with p_company_id=null");
      paginationBehaviorNotes.push("legacy scope is non-paginated");
      return {
        args: { p_company_id: null },
        filterBehaviorNotes,
        paginationBehaviorNotes,
        stageErrors: [],
        insufficientFixture: false,
      };
    }

    default:
      return {
        args: undefined,
        filterBehaviorNotes,
        paginationBehaviorNotes,
        stageErrors: [`Unhandled RPC definition: ${definition.id}`],
        insufficientFixture: true,
      };
  }
};

const collectSingleRun = async (
  admin: RpcAdmin,
  definition: WarehouseBuyerRpcDefinition,
  invocation: ResolvedTierInvocation,
): Promise<TierRunSample> => {
  const { latencyMs, data } = await invokeRpcMeasured(admin, definition.rpcName, invocation.args);
  const rowCount = countRows(definition, data);
  const resultPayloadBytes = payloadBytes(data);
  const root = asRecord(data);
  const extraPaginationNotes: string[] = [];

  if (Array.isArray(root.rows)) {
    const meta = asRecord(root.meta);
    const hasMore = meta.has_more ?? meta.hasMore;
    const total = meta.total_group_count ?? meta.totalVisibleCount ?? meta.total_row_count ?? meta.totalRowCount;
    if (hasMore != null) {
      extraPaginationNotes.push(`hasMore=${String(hasMore)}`);
    }
    if (total != null) {
      extraPaginationNotes.push(`reported_total=${String(total)}`);
    }
  }

  return {
    latencyMs,
    payloadBytes: resultPayloadBytes,
    rowCount,
    filterBehaviorNotes: invocation.filterBehaviorNotes,
    paginationBehaviorNotes: [...invocation.paginationBehaviorNotes, ...extraPaginationNotes],
  };
};

const collectTier = async (
  admin: RpcAdmin | null,
  definition: WarehouseBuyerRpcDefinition,
  tier: WarehouseBuyerRpcTierPlan,
  context: CollectorContext,
): Promise<WarehouseBuyerRpcTierResult> => {
  if (!admin) {
    return createBlockedTierResult(tier, missingEnvKeys);
  }

  const invocation = await resolveTierInvocation(admin, definition, tier, context);
  if (invocation.insufficientFixture) {
    return {
      tier: tier.tier,
      label: tier.label,
      status: "insufficient_fixture",
      readOnly: true,
      repeatedRunsPlanned: tier.repeatedRuns,
      repeatedRunsCompleted: 0,
      missingEnvKeys: [],
      latencyMs: [],
      payloadBytes: [],
      rowCounts: [],
      medianLatencyMs: null,
      maxLatencyMs: null,
      medianPayloadBytes: null,
      maxPayloadBytes: null,
      medianRowCount: null,
      maxRowCount: null,
      filterShape: tier.filterShape,
      paginationShape: tier.paginationShape,
      filterBehaviorNotes: invocation.filterBehaviorNotes,
      paginationBehaviorNotes: invocation.paginationBehaviorNotes,
      stabilityNotes: [],
      stageErrors: invocation.stageErrors,
    };
  }

  const latencyMs: number[] = [];
  const payloadBytesValues: number[] = [];
  const rowCounts: number[] = [];
  const filterBehaviorNotes: string[] = [];
  const paginationBehaviorNotes: string[] = [];

  try {
    for (let runIndex = 0; runIndex < tier.repeatedRuns; runIndex += 1) {
      const sample = await collectSingleRun(admin, definition, invocation);
      latencyMs.push(sample.latencyMs);
      payloadBytesValues.push(sample.payloadBytes);
      rowCounts.push(sample.rowCount);
      filterBehaviorNotes.push(...sample.filterBehaviorNotes);
      paginationBehaviorNotes.push(...sample.paginationBehaviorNotes);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "Unknown runtime error");
    return {
      tier: tier.tier,
      label: tier.label,
      status: "runtime_error",
      readOnly: true,
      repeatedRunsPlanned: tier.repeatedRuns,
      repeatedRunsCompleted: latencyMs.length,
      missingEnvKeys: [],
      latencyMs,
      payloadBytes: payloadBytesValues,
      rowCounts,
      medianLatencyMs: median(latencyMs),
      maxLatencyMs: max(latencyMs),
      medianPayloadBytes: median(payloadBytesValues),
      maxPayloadBytes: max(payloadBytesValues),
      medianRowCount: median(rowCounts),
      maxRowCount: max(rowCounts),
      filterShape: tier.filterShape,
      paginationShape: tier.paginationShape,
      filterBehaviorNotes: Array.from(new Set(filterBehaviorNotes)),
      paginationBehaviorNotes: Array.from(new Set(paginationBehaviorNotes)),
      stabilityNotes: summarizeStabilityNotes(latencyMs, payloadBytesValues, rowCounts),
      stageErrors: [...invocation.stageErrors, message],
    };
  }

  return {
    tier: tier.tier,
    label: tier.label,
    status: "collected",
    readOnly: true,
    repeatedRunsPlanned: tier.repeatedRuns,
    repeatedRunsCompleted: tier.repeatedRuns,
    missingEnvKeys: [],
    latencyMs,
    payloadBytes: payloadBytesValues,
    rowCounts,
    medianLatencyMs: median(latencyMs),
    maxLatencyMs: max(latencyMs),
    medianPayloadBytes: median(payloadBytesValues),
    maxPayloadBytes: max(payloadBytesValues),
    medianRowCount: median(rowCounts),
    maxRowCount: max(rowCounts),
    filterShape: tier.filterShape,
    paginationShape: tier.paginationShape,
    filterBehaviorNotes: Array.from(new Set(filterBehaviorNotes)),
    paginationBehaviorNotes: Array.from(new Set(paginationBehaviorNotes)),
    stabilityNotes: summarizeStabilityNotes(latencyMs, payloadBytesValues, rowCounts),
    stageErrors: invocation.stageErrors,
  };
};

async function main() {
  const inventory = createWarehouseBuyerRpcScaleInventory();
  const validation = validateWarehouseBuyerRpcScaleInventory(inventory);
  if (!validation.valid) {
    throw new Error(`Invalid Warehouse/Buyer RPC scale inventory: ${validation.errors.join("; ")}`);
  }

  const admin = missingEnvKeys.length === 0 ? createRpcAdmin() : null;
  const context: CollectorContext = {
    issueRequestIds: null,
    buyerSearchToken: null,
  };

  const matrix: WarehouseBuyerRpcMatrixEntry[] = [];
  for (const definition of inventory) {
    const tierResults: WarehouseBuyerRpcTierResult[] = [];
    for (const tier of definition.tiers) {
      tierResults.push(await collectTier(admin, definition, tier, context));
    }

    const summary = summarizePathResult(tierResults);
    const verdict = recommendWarehouseBuyerRpcPath({
      summary,
      classification: definition.classification,
    });

    matrix.push({
      id: definition.id,
      domain: definition.domain,
      category: definition.category,
      screen: definition.screen,
      owner: definition.owner,
      surface: definition.surface,
      rpcName: definition.rpcName,
      sourceKind: definition.sourceKind,
      classification: definition.classification,
      hotReason: definition.hotReason,
      typicalFilterShape: definition.typicalFilterShape,
      largeDataShape: definition.largeDataShape,
      evidenceSource: definition.evidenceSource,
      contrastGroup: definition.contrastGroup,
      shortlistPriority: definition.shortlistPriority,
      readOnly: true,
      tierResults,
      summary,
      riskLevel: verdict.riskLevel,
      recommendation: verdict.recommendation,
    });
  }

  const rankings = buildWarehouseBuyerRpcScaleRankings(matrix);
  const collectedTierCount = matrix.reduce((count, entry) => count + entry.summary.collectedTierCount, 0);
  const blockedTierCount = matrix.reduce((count, entry) => count + entry.summary.blockedTierCount, 0);

  writeJson(INVENTORY_PATH, {
    collectedAt,
    readOnly: true,
    inventory,
  });
  writeJson(MATRIX_PATH, {
    collectedAt,
    readOnly: true,
    waveStatus:
      missingEnvKeys.length > 0 ? "not_green_blocked_missing_db_env" : collectedTierCount > 0 ? "evidence_collected" : "not_green",
    environmentBlockers: missingEnvKeys,
    collectedTierCount,
    blockedTierCount,
    matrix,
  });
  writeJson(RANKINGS_PATH, {
    collectedAt,
    rankings,
  });
  writeText(NOTES_PATH, renderWarehouseBuyerRpcScaleNotes(inventory));
  writeText(PROOF_PATH, renderWarehouseBuyerRpcScaleProof(matrix, rankings));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
