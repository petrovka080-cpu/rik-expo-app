import fs from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  buildSqlCriticalPathRankings,
  createSqlCriticalPathInventory,
  recommendSqlBaselineAction,
  renderSqlCriticalPathNotes,
  renderSqlCriticalPathProof,
  summarizeExplainPayload,
  type SqlCriticalPathDefinition,
  type SqlCriticalPathMatrixEntry,
  validateSqlCriticalPathInventory,
} from "./_shared/sqlExplainBaselineCore";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

type PostgrestLikeError = {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
};

type ExplainOptions = {
  analyze?: boolean;
  verbose?: boolean;
  settings?: boolean;
  buffers?: boolean;
  wal?: boolean;
  format?: "json" | "text";
};

type ExplainableResponse = {
  data: unknown;
  error: PostgrestLikeError | null;
};

type ExplainableRequest = PromiseLike<ExplainableResponse> & {
  explain: (options?: ExplainOptions) => PromiseLike<ExplainableResponse>;
};

type RequestEnvelope = {
  request: ExplainableRequest;
};

type BaselineContext = {
  admin: SupabaseClient;
  sampleIds: {
    warehouseRequestId: string | null;
    warehouseIncomingId: string | null;
  };
};

const projectRoot = process.cwd();
const artifactsDir = path.join(projectRoot, "artifacts");
const inventoryOutPath = path.join(artifactsDir, "SQL_critical_path_inventory.json");
const matrixOutPath = path.join(artifactsDir, "SQL_critical_path_explain_matrix.json");
const rankingsOutPath = path.join(artifactsDir, "SQL_critical_path_rankings.json");
const notesOutPath = path.join(artifactsDir, "SQL_critical_path_explain_notes.md");
const proofOutPath = path.join(artifactsDir, "SQL_critical_path_explain_proof.md");

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").trim();
const supabaseServiceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

const REQUIRED_ENV_KEYS = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const READ_ONLY_ANALYZE_OPTIONS: ExplainOptions = {
  analyze: true,
  verbose: true,
  buffers: true,
  format: "json",
};

const READ_ONLY_EXPLAIN_OPTIONS: ExplainOptions = {
  analyze: false,
  verbose: true,
  buffers: true,
  format: "json",
};

const writeJson = (filePath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
};

const writeText = (filePath: string, payload: string) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, payload);
};

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) return message;
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message = String(record.message ?? "").trim();
    if (message) return message;
  }

  const message = String(error ?? "").trim();
  return message || fallback;
};

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const daysAgoIso = (days: number): string => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return toIsoDate(date);
};

const defaultFromIso = daysAgoIso(90);
const defaultToIso = toIsoDate(new Date());

const deriveRowCount = (data: unknown): number | null => {
  if (Array.isArray(data)) return data.length;
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.rows)) return record.rows.length;
  }
  return null;
};

const toExplainableRequest = (request: ExplainableRequest): ExplainableRequest => request;

const missingEnvKeys = (): string[] =>
  REQUIRED_ENV_KEYS.filter((key) => !String(process.env[key] ?? "").trim());

const createAdminClient = (): SupabaseClient =>
  createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-client-info": "sql-critical-path-explain-baselines" } },
  });

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const loadWarehouseRequestId = async (context: BaselineContext): Promise<string | null> => {
  if (context.sampleIds.warehouseRequestId) return context.sampleIds.warehouseRequestId;

  const response = await context.admin.rpc("warehouse_issue_queue_scope_v4", {
    p_offset: 0,
    p_limit: 1,
  });
  if (response.error) throw response.error;

  const rows = Array.isArray(asRecord(response.data).rows) ? (asRecord(response.data).rows as unknown[]) : [];
  const requestId = rows
    .map((value) => String(asRecord(value).request_id ?? "").trim())
    .find((value) => value.length > 0) ?? null;
  context.sampleIds.warehouseRequestId = requestId;
  return requestId;
};

const loadWarehouseIncomingId = async (context: BaselineContext): Promise<string | null> => {
  if (context.sampleIds.warehouseIncomingId) return context.sampleIds.warehouseIncomingId;

  const response = await context.admin.rpc("warehouse_incoming_queue_scope_v1", {
    p_offset: 0,
    p_limit: 1,
  });
  if (response.error) throw response.error;

  const rows = Array.isArray(asRecord(response.data).rows) ? (asRecord(response.data).rows as unknown[]) : [];
  const incomingId = rows
    .map((value) => String(asRecord(value).incoming_id ?? "").trim())
    .find((value) => value.length > 0) ?? null;
  context.sampleIds.warehouseIncomingId = incomingId;
  return incomingId;
};

const buildPathRequest = async (
  definition: SqlCriticalPathDefinition,
  context: BaselineContext,
): Promise<RequestEnvelope> => {
  const admin = context.admin;

  switch (definition.id) {
    case "director_finance_panel_scope_v4":
      return {
        request: toExplainableRequest(
          admin.rpc(definition.rpcName, {
          p_object_id: undefined,
          p_date_from: defaultFromIso,
          p_date_to: defaultToIso,
          p_due_days: 7,
          p_critical_days: 14,
          p_limit: 50,
          p_offset: 0,
          }),
        ),
      };
    case "director_report_transport_scope_v1":
      return {
        request: toExplainableRequest(
          admin.rpc(definition.rpcName, {
          p_from: defaultFromIso,
          p_to: defaultToIso,
          p_object_name: null,
          p_include_discipline: true,
          p_include_costs: true,
          }),
        ),
      };
    case "director_report_fetch_options_v1":
      return {
        request: toExplainableRequest(
          admin.rpc(definition.rpcName, {
          p_from: defaultFromIso,
          p_to: defaultToIso,
          }),
        ),
      };
    case "warehouse_stock_scope_v2":
      return {
        request: toExplainableRequest(
          admin.rpc(definition.rpcName, {
          p_limit: 120,
          p_offset: 0,
          }),
        ),
      };
    case "warehouse_issue_queue_scope_v4":
      return {
        request: toExplainableRequest(
          admin.rpc(definition.rpcName, {
          p_offset: 0,
          p_limit: 50,
          }),
        ),
      };
    case "warehouse_issue_items_scope_v1": {
      const requestId = await loadWarehouseRequestId(context);
      if (!requestId) {
        throw new Error("warehouse_issue_items_scope_v1 sample request_id could not be resolved from queue scope");
      }
      return {
        request: toExplainableRequest(
          admin.rpc(definition.rpcName, {
          p_request_id: requestId,
          }),
        ),
      };
    }
    case "warehouse_incoming_queue_scope_v1":
      return {
        request: toExplainableRequest(
          admin.rpc(definition.rpcName, {
          p_offset: 0,
          p_limit: 30,
          }),
        ),
      };
    case "warehouse_incoming_items_scope_v1": {
      const incomingId = await loadWarehouseIncomingId(context);
      if (!incomingId) {
        throw new Error("warehouse_incoming_items_scope_v1 sample incoming_id could not be resolved from queue scope");
      }
      return {
        request: toExplainableRequest(
          admin.rpc(definition.rpcName, {
          p_incoming_id: incomingId,
          }),
        ),
      };
    }
    case "wh_report_issued_materials_fast":
      return {
        request: toExplainableRequest(
          admin.rpc(definition.rpcName, {
          p_from: defaultFromIso,
          p_to: defaultToIso,
          p_object_id: null,
          }),
        ),
      };
    case "buyer_summary_inbox_scope_v1":
      return {
        request: toExplainableRequest(
          admin.rpc(definition.rpcName, {
          p_offset: 0,
          p_limit: 100,
          p_search: null,
          p_company_id: null,
          }),
        ),
      };
    case "buyer_summary_buckets_scope_v1":
      return {
        request: toExplainableRequest(admin.rpc(definition.rpcName)),
      };
    case "list_buyer_inbox":
      return {
        request: toExplainableRequest(
          admin.rpc(definition.rpcName, {
          p_company_id: null,
          }),
        ),
      };
    default:
      throw new Error(`Unsupported SQL critical path: ${definition.id}`);
  }
};

const createBlockedEntry = (
  definition: SqlCriticalPathDefinition,
  status: SqlCriticalPathMatrixEntry["collection"]["status"],
  options?: {
    missingEnv?: string[];
    stageErrors?: SqlCriticalPathMatrixEntry["collection"]["stageErrors"];
    explainBlockedReason?: string | null;
    analyzeBlockedReason?: string | null;
  },
): SqlCriticalPathMatrixEntry => {
  const entry: SqlCriticalPathMatrixEntry = {
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
    evidenceSource: definition.evidenceSource,
    contrastGroup: definition.contrastGroup,
    shortlistPriority: definition.shortlistPriority,
    collection: {
      status,
      readOnly: true,
      collectedAt: null,
      explainAvailable: false,
      analyzeAvailable: false,
      missingEnvKeys: options?.missingEnv ?? [],
      latencyMs: null,
      rowCount: null,
      explainFormat: null,
      explainBlockedReason: options?.explainBlockedReason ?? null,
      analyzeBlockedReason: options?.analyzeBlockedReason ?? null,
      stageErrors: options?.stageErrors ?? [],
    },
    explain: {
      summary: null,
      nodeTypes: [],
      scanTypes: [],
      joinTypes: [],
      sortOrHashNodes: [],
      relationNames: [],
      warnings: [],
      estimatedRows: null,
      actualRows: null,
      totalCost: null,
      actualTotalTimeMs: null,
    },
    recommendation: "blocked",
  };
  entry.recommendation = recommendSqlBaselineAction(entry);
  return entry;
};

const collectOne = async (
  definition: SqlCriticalPathDefinition,
  context: BaselineContext,
): Promise<SqlCriticalPathMatrixEntry> => {
  const startedAt = Date.now();
  let response: ExplainableResponse;
  try {
    const request = (await buildPathRequest(definition, context)).request;
    response = await request;
    if (response.error) {
      return createBlockedEntry(definition, "runtime_error", {
        stageErrors: [{ stage: "invoke", message: toErrorMessage(response.error, `${definition.rpcName} invoke failed`) }],
      });
    }

    const explainRequest = (await buildPathRequest(definition, context)).request;
    const explainResponse = await explainRequest.explain(READ_ONLY_EXPLAIN_OPTIONS);
    const explainAvailable = !explainResponse.error;
    const explainSummary = explainAvailable ? summarizeExplainPayload(explainResponse.data) : summarizeExplainPayload(null);

    const analyzeRequest = (await buildPathRequest(definition, context)).request;
    const analyzeResponse = await analyzeRequest.explain(READ_ONLY_ANALYZE_OPTIONS);
    const analyzeAvailable = !analyzeResponse.error;
    const analyzedSummary =
      analyzeAvailable && explainAvailable ? summarizeExplainPayload(analyzeResponse.data) : explainSummary;
    const collectionStatus: SqlCriticalPathMatrixEntry["collection"]["status"] = explainAvailable
      ? "collected"
      : "blocked_explain_unavailable";

    const entry: SqlCriticalPathMatrixEntry = {
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
      evidenceSource: definition.evidenceSource,
      contrastGroup: definition.contrastGroup,
      shortlistPriority: definition.shortlistPriority,
      collection: {
        status: collectionStatus,
        readOnly: true,
        collectedAt: new Date().toISOString(),
        explainAvailable,
        analyzeAvailable,
        missingEnvKeys: [],
        latencyMs: Date.now() - startedAt,
        rowCount: deriveRowCount(response.data),
        explainFormat: explainAvailable ? "json" : null,
        explainBlockedReason: explainResponse.error
          ? toErrorMessage(explainResponse.error, `${definition.rpcName} explain blocked`)
          : null,
        analyzeBlockedReason: analyzeResponse.error
          ? toErrorMessage(analyzeResponse.error, `${definition.rpcName} analyze blocked`)
          : null,
        stageErrors: [
          ...(explainResponse.error
            ? [{ stage: "explain" as const, message: toErrorMessage(explainResponse.error, "Explain blocked") }]
            : []),
          ...(analyzeResponse.error
            ? [{ stage: "analyze" as const, message: toErrorMessage(analyzeResponse.error, "Analyze blocked") }]
            : []),
        ],
      },
      explain: analyzedSummary,
      recommendation: "observe",
    };
    entry.recommendation = recommendSqlBaselineAction(entry);
    return entry;
  } catch (error) {
    return createBlockedEntry(definition, "runtime_error", {
      stageErrors: [{ stage: "invoke", message: toErrorMessage(error, `${definition.rpcName} invoke failed`) }],
    });
  }
};

const main = async () => {
  const inventory = createSqlCriticalPathInventory();
  const validation = validateSqlCriticalPathInventory(inventory);
  if (!validation.valid) {
    throw new Error(`SQL critical path shortlist invalid: ${validation.errors.join("; ")}`);
  }

  writeJson(inventoryOutPath, {
    collectedAt: new Date().toISOString(),
    readOnly: true,
    inventory,
  });

  let matrix: SqlCriticalPathMatrixEntry[];
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    const missingEnv = missingEnvKeys();
    matrix = inventory.map((definition) =>
      createBlockedEntry(definition, "blocked_missing_env", {
        missingEnv,
        explainBlockedReason: "Collector environment missing Supabase admin credentials",
        analyzeBlockedReason: "Collector environment missing Supabase admin credentials",
      }),
    );
  } else {
    const context: BaselineContext = {
      admin: createAdminClient(),
      sampleIds: {
        warehouseRequestId: null,
        warehouseIncomingId: null,
      },
    };
    matrix = [];
    for (const definition of inventory) {
      matrix.push(await collectOne(definition, context));
    }
  }

  const rankings = buildSqlCriticalPathRankings(matrix);

  writeJson(matrixOutPath, {
    collectedAt: new Date().toISOString(),
    readOnly: true,
    matrix,
  });
  writeJson(rankingsOutPath, {
    collectedAt: new Date().toISOString(),
    rankings,
  });
  writeText(notesOutPath, renderSqlCriticalPathNotes(inventory));
  writeText(proofOutPath, renderSqlCriticalPathProof(matrix, rankings));

  const blockedCount = matrix.filter((entry) => entry.collection.status !== "collected").length;
  console.log(
    JSON.stringify(
      {
        inventoryCount: inventory.length,
        blockedCount,
        collectedCount: matrix.length - blockedCount,
        notesOutPath,
        proofOutPath,
        matrixOutPath,
        rankingsOutPath,
      },
      null,
      2,
    ),
  );
};

main().catch((error) => {
  const message = toErrorMessage(error, "sql explain baseline collection failed");
  console.error(message);
  process.exitCode = 1;
});
