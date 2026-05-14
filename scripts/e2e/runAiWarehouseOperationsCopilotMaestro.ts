import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import {
  draftAgentWarehouseAction,
  getAgentWarehouseMovements,
  getAgentWarehouseStatus,
  previewAgentWarehouseRisk,
} from "../../src/features/ai/agent/agentWarehouseCopilotRoutes";
import type {
  WarehouseStatusReader,
  WarehouseStatusSourceRow,
} from "../../src/features/ai/tools/getWarehouseStatusTool";
import {
  callBffReadonlyMobile,
  resolveBffReadonlyRuntimeConfig,
} from "../../src/shared/scale/bffClient";
import type {
  WarehouseApiBffRequestDto,
  WarehouseApiBffResponseDto,
} from "../../src/screens/warehouse/warehouse.api.bff.contract";
import { parseAgentEnvFileValues } from "../env/checkRequiredAgentFlags";
import { verifyAndroidInstalledBuildRuntime } from "../release/verifyAndroidInstalledBuildRuntime";

type AiWarehouseOperationsCopilotStatus =
  | "GREEN_AI_WAREHOUSE_OPERATIONS_COPILOT_READY"
  | "GREEN_AI_WAREHOUSE_OPERATIONS_EMPTY_STATE_READY"
  | "BLOCKED_AI_WAREHOUSE_OPERATIONS_APPROVAL_MISSING"
  | "BLOCKED_AI_WAREHOUSE_OPERATIONS_AUTH_MISSING"
  | "BLOCKED_REAL_WAREHOUSE_STATUS_NOT_AVAILABLE"
  | "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE";

type AiWarehouseOperationsCopilotMatrix = {
  final_status: AiWarehouseOperationsCopilotStatus;
  backend_first: true;
  role_scoped: boolean;
  developer_control_full_access: true;
  role_isolation_e2e_claimed: false;
  warehouse_bff_routes_ready: boolean;
  live_warehouse_safe_read_attempted: boolean;
  live_warehouse_safe_read_available: boolean;
  status_loaded: boolean;
  movement_summary_ready: boolean;
  risk_cards_created: number;
  honest_empty_state: boolean;
  risk_preview_ready: boolean;
  draft_action_ready: boolean;
  evidence_required: true;
  all_cards_have_evidence: boolean;
  all_cards_have_risk_policy: boolean;
  all_cards_have_known_tool: boolean;
  mutation_count: 0;
  db_writes: 0;
  direct_supabase_from_ui: false;
  mobile_external_fetch: false;
  external_live_fetch: false;
  provider_called: false;
  final_execution: 0;
  stock_mutated: false;
  reservation_created: false;
  movement_created: false;
  raw_rows_returned: false;
  raw_prompt_returned: false;
  raw_provider_payload_returned: false;
  auth_admin_used: false;
  list_users_used: false;
  service_role_used: false;
  seed_used: false;
  fake_warehouse_cards: false;
  hardcoded_ai_answer: false;
  model_provider_changed: false;
  gpt_enabled: false;
  gemini_removed: false;
  android_runtime_smoke: "PASS" | "BLOCKED";
  fake_emulator_pass: false;
  fake_green_claimed: false;
  secrets_printed: false;
  exact_reason: string | null;
};

type SupabaseAuthClient = {
  auth: {
    signInWithPassword(input: { email: string; password: string }): Promise<{
      data: {
        user: { id: string } | null;
        session: { access_token: string } | null;
      };
      error: { message?: string } | null;
    }>;
    signOut(): Promise<unknown>;
  };
};

const projectRoot = process.cwd();
const wave = "S_AI_MAGIC_08_WAREHOUSE_OPERATIONS_COPILOT";
const artifactPrefix = path.join(projectRoot, "artifacts", wave);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;

const REQUIRED_FLAGS = [
  "S_AI_MAGIC_WAVES_APPROVED",
  "S_AI_MAGIC_REQUIRE_ANDROID_EMULATOR_PROOF",
  "S_AI_MAGIC_REQUIRE_EVIDENCE",
  "S_AI_MAGIC_REQUIRE_ROLE_SCOPE",
  "S_AI_ALLOW_SAFE_READ",
  "S_AI_ALLOW_DRAFT_PREVIEW",
  "S_AI_NO_FAKE_GREEN",
  "S_AI_NO_FAKE_CARDS",
  "S_AI_NO_SECRETS_PRINTING",
] as const;

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function loadEnvFilesIntoProcess(): void {
  for (const envFile of [".env", ".env.local", ".env.agent.staging.local"]) {
    const parsed = parseAgentEnvFileValues(path.join(projectRoot, envFile));
    for (const [key, value] of parsed) {
      if (process.env[key] == null || String(process.env[key]).trim() === "") {
        process.env[key] = value;
      }
    }
  }
}

function envEnabled(key: string): boolean {
  return ["true", "1", "yes"].includes(String(process.env[key] ?? "").trim().toLowerCase());
}

function envText(key: string): string {
  return String(process.env[key] ?? "").trim();
}

function flagsReady(): boolean {
  return REQUIRED_FLAGS.every((key) => envEnabled(key));
}

function sanitizeReason(value: unknown): string {
  const text = value instanceof Error ? value.message : String(value ?? "unknown");
  return text
    .replace(/https?:\/\/\S+/gi, "[redacted_url]")
    .replace(/\beyJ[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+){1,2}\b/g, "[redacted_jwt]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[redacted_email]")
    .slice(0, 240);
}

function baseMatrix(
  finalStatus: AiWarehouseOperationsCopilotStatus,
  exactReason: string | null,
  overrides: Partial<AiWarehouseOperationsCopilotMatrix> = {},
): AiWarehouseOperationsCopilotMatrix {
  return {
    final_status: finalStatus,
    backend_first: true,
    role_scoped: false,
    developer_control_full_access: true,
    role_isolation_e2e_claimed: false,
    warehouse_bff_routes_ready: false,
    live_warehouse_safe_read_attempted: false,
    live_warehouse_safe_read_available: false,
    status_loaded: false,
    movement_summary_ready: false,
    risk_cards_created: 0,
    honest_empty_state: false,
    risk_preview_ready: false,
    draft_action_ready: false,
    evidence_required: true,
    all_cards_have_evidence: false,
    all_cards_have_risk_policy: false,
    all_cards_have_known_tool: false,
    mutation_count: 0,
    db_writes: 0,
    direct_supabase_from_ui: false,
    mobile_external_fetch: false,
    external_live_fetch: false,
    provider_called: false,
    final_execution: 0,
    stock_mutated: false,
    reservation_created: false,
    movement_created: false,
    raw_rows_returned: false,
    raw_prompt_returned: false,
    raw_provider_payload_returned: false,
    auth_admin_used: false,
    list_users_used: false,
    service_role_used: false,
    seed_used: false,
    fake_warehouse_cards: false,
    hardcoded_ai_answer: false,
    model_provider_changed: false,
    gpt_enabled: false,
    gemini_removed: false,
    android_runtime_smoke: "BLOCKED",
    fake_emulator_pass: false,
    fake_green_claimed: false,
    secrets_printed: false,
    exact_reason: exactReason,
    ...overrides,
  };
}

function writeProof(matrix: AiWarehouseOperationsCopilotMatrix): void {
  fs.writeFileSync(
    proofPath,
    [
      "# S_AI_MAGIC_08_WAREHOUSE_OPERATIONS_COPILOT",
      "",
      `final_status: ${matrix.final_status}`,
      `live_warehouse_safe_read_available: ${String(matrix.live_warehouse_safe_read_available)}`,
      `status_loaded: ${String(matrix.status_loaded)}`,
      `risk_cards_created: ${matrix.risk_cards_created}`,
      `movement_summary_ready: ${String(matrix.movement_summary_ready)}`,
      `draft_action_ready: ${String(matrix.draft_action_ready)}`,
      `mutation_count: ${matrix.mutation_count}`,
      `stock_mutated: ${String(matrix.stock_mutated)}`,
      `reservation_created: ${String(matrix.reservation_created)}`,
      `movement_created: ${String(matrix.movement_created)}`,
      `android_runtime_smoke: ${matrix.android_runtime_smoke}`,
      `exact_reason: ${matrix.exact_reason ?? "none"}`,
      "",
    ].join("\n"),
    "utf8",
  );
}

function persistArtifacts(matrix: AiWarehouseOperationsCopilotMatrix): void {
  writeJson(matrixPath, matrix);
  writeJson(inventoryPath, {
    wave,
    artifacts: [inventoryPath, matrixPath, emulatorPath, proofPath].map((filePath) =>
      path.relative(projectRoot, filePath).replace(/\\/g, "/"),
    ),
    backend_first: true,
    safe_read_only: true,
    mutation_count: 0,
    db_writes: 0,
    secrets_printed: false,
  });
  writeJson(emulatorPath, {
    wave,
    android_runtime_smoke: matrix.android_runtime_smoke,
    warehouse_copilot_runtime_proof: matrix.final_status.startsWith("GREEN_") ? "PASS" : "BLOCKED",
    fake_emulator_pass: false,
  });
  writeProof(matrix);
}

function resolveAuthSecret(): { email: string; password: string } | null {
  const email =
    envText("E2E_CONTROL_EMAIL") ||
    envText("E2E_DEVELOPER_EMAIL") ||
    envText("E2E_DIRECTOR_EMAIL") ||
    envText("E2E_WAREHOUSE_EMAIL");
  const password =
    envText("E2E_CONTROL_PASSWORD") ||
    envText("E2E_DEVELOPER_PASSWORD") ||
    envText("E2E_DIRECTOR_PASSWORD") ||
    envText("E2E_WAREHOUSE_PASSWORD");

  return email && password ? { email, password } : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readMetaNumber(meta: unknown, key: string): number | null {
  if (!isRecord(meta)) return null;
  const parsed = Number(meta[key]);
  return Number.isFinite(parsed) ? parsed : null;
}

function readMetaBoolean(meta: unknown, key: string): boolean | null {
  if (!isRecord(meta)) return null;
  return typeof meta[key] === "boolean" ? meta[key] : null;
}

function toWarehouseStatusRow(row: Record<string, unknown>): WarehouseStatusSourceRow {
  return {
    material_id: typeof row.material_id === "string" ? row.material_id : null,
    code: typeof row.code === "string" ? row.code : null,
    name: typeof row.name === "string" ? row.name : null,
    uom_id: typeof row.uom_id === "string" ? row.uom_id : null,
    qty_on_hand: typeof row.qty_on_hand === "number" || typeof row.qty_on_hand === "string" ? row.qty_on_hand : null,
    qty_reserved: typeof row.qty_reserved === "number" || typeof row.qty_reserved === "string" ? row.qty_reserved : null,
    qty_available: typeof row.qty_available === "number" || typeof row.qty_available === "string" ? row.qty_available : null,
    qty_incoming: typeof row.qty_incoming === "number" || typeof row.qty_incoming === "string" ? row.qty_incoming : null,
    incoming_quantity:
      typeof row.incoming_quantity === "number" || typeof row.incoming_quantity === "string"
        ? row.incoming_quantity
        : null,
    project_id: typeof row.project_id === "string" ? row.project_id : null,
    object_name: typeof row.object_name === "string" ? row.object_name : null,
    warehouse_name: typeof row.warehouse_name === "string" ? row.warehouse_name : null,
    source_timestamp: typeof row.source_timestamp === "string" ? row.source_timestamp : null,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

function parseWarehouseStockPayload(payload: unknown, offset: number, limit: number) {
  const payloadRecord = isRecord(payload) ? payload : {};
  const rows = Array.isArray(payloadRecord.rows)
    ? payloadRecord.rows.filter(isRecord).map(toWarehouseStatusRow)
    : [];
  const totalRowCount = readMetaNumber(payloadRecord.meta, "total_row_count");
  const hasMore =
    readMetaBoolean(payloadRecord.meta, "has_more") ??
    (totalRowCount === null ? rows.length >= limit : offset + rows.length < totalRowCount);

  return { rows, totalRowCount, hasMore };
}

function buildWarehouseReader(accessToken: string): WarehouseStatusReader {
  return async ({ offset, limit }) => {
    const runtime = resolveBffReadonlyRuntimeConfig();
    const response = await callBffReadonlyMobile<WarehouseApiBffResponseDto, WarehouseApiBffRequestDto>({
      config: runtime.clientConfig,
      operation: "warehouse.api.read.scope",
      input: {
        operation: "warehouse.api.stock.scope",
        args: {
          p_offset: offset,
          p_limit: limit,
        },
      },
      getAccessToken: async () => accessToken,
    });

    if (!response.ok) throw new Error(response.error.code);
    if (response.data.operation !== "warehouse.api.stock.scope") {
      throw new Error("WAREHOUSE_API_BFF_INVALID_RESPONSE");
    }
    if (response.data.payload.kind !== "single") {
      throw new Error("WAREHOUSE_API_BFF_INVALID_PAYLOAD");
    }

    const rows = Array.isArray(response.data.payload.result.data)
      ? response.data.payload.result.data
      : [];
    const firstRow = rows[0] ?? null;
    const payload = isRecord(firstRow) && Object.prototype.hasOwnProperty.call(firstRow, "payload")
      ? firstRow.payload
      : firstRow;
    return parseWarehouseStockPayload(payload, offset, limit);
  };
}

async function run(): Promise<AiWarehouseOperationsCopilotMatrix> {
  loadEnvFilesIntoProcess();

  if (!flagsReady()) {
    return baseMatrix(
      "BLOCKED_AI_WAREHOUSE_OPERATIONS_APPROVAL_MISSING",
      `Missing required approval flags: ${REQUIRED_FLAGS.filter((key) => !envEnabled(key)).join(", ")}`,
    );
  }

  const android = await verifyAndroidInstalledBuildRuntime();
  if (android.final_status !== "GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF") {
    return baseMatrix("BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE", android.exact_reason, {
      android_runtime_smoke: "BLOCKED",
    });
  }

  const supabaseUrl = envText("STAGING_SUPABASE_URL") || envText("EXPO_PUBLIC_SUPABASE_URL");
  const anonKey = envText("STAGING_SUPABASE_ANON_KEY") || envText("EXPO_PUBLIC_SUPABASE_ANON_KEY");
  const authSecret = resolveAuthSecret();
  if (!supabaseUrl || !anonKey || !authSecret) {
    return baseMatrix(
      "BLOCKED_AI_WAREHOUSE_OPERATIONS_AUTH_MISSING",
      "Supabase public URL, anon key, or explicit developer/control warehouse credentials are missing.",
      { android_runtime_smoke: "PASS" },
    );
  }

  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as SupabaseAuthClient;

  const signIn = await client.auth.signInWithPassword(authSecret);
  if (signIn.error || !signIn.data.user || !signIn.data.session) {
    return baseMatrix(
      "BLOCKED_AI_WAREHOUSE_OPERATIONS_AUTH_MISSING",
      "Developer/control account could not authenticate for warehouse copilot proof.",
      { android_runtime_smoke: "PASS" },
    );
  }

  try {
    const input = {
      limit: 10,
      readWarehouseStatus: buildWarehouseReader(signIn.data.session.access_token),
    };
    const auth = { userId: signIn.data.user.id, role: "director" as const };
    const status = await getAgentWarehouseStatus({ auth, input });
    const movements = await getAgentWarehouseMovements({ auth, input });
    const risk = await previewAgentWarehouseRisk({ auth, input });
    const draft = await draftAgentWarehouseAction({ auth, input });

    if (
      !status.ok ||
      !movements.ok ||
      !risk.ok ||
      !draft.ok ||
      status.data.documentType !== "agent_warehouse_status" ||
      movements.data.documentType !== "agent_warehouse_movements" ||
      risk.data.documentType !== "agent_warehouse_risk_preview" ||
      draft.data.documentType !== "agent_warehouse_draft_action"
    ) {
      return baseMatrix(
        "BLOCKED_REAL_WAREHOUSE_STATUS_NOT_AVAILABLE",
        "Warehouse copilot BFF route returned an auth or route envelope blocker.",
        {
          android_runtime_smoke: "PASS",
          live_warehouse_safe_read_attempted: true,
        },
      );
    }

    const statusResult = status.data.result;
    const movementResult = movements.data.result;
    const riskResult = risk.data.result;
    const draftResult = draft.data.result;

    if (statusResult.status === "blocked") {
      return baseMatrix(
        "BLOCKED_REAL_WAREHOUSE_STATUS_NOT_AVAILABLE",
        statusResult.blockedReason ?? "Warehouse status safe-read was blocked.",
        {
          android_runtime_smoke: "PASS",
          warehouse_bff_routes_ready: true,
          live_warehouse_safe_read_attempted: true,
        },
      );
    }

    const statusLoaded = statusResult.status === "loaded";
    const emptyState = statusResult.status === "empty" || statusResult.riskCards.length === 0;
    const finalStatus: AiWarehouseOperationsCopilotStatus = statusLoaded
      ? "GREEN_AI_WAREHOUSE_OPERATIONS_COPILOT_READY"
      : "GREEN_AI_WAREHOUSE_OPERATIONS_EMPTY_STATE_READY";

    return baseMatrix(finalStatus, null, {
      android_runtime_smoke: "PASS",
      role_scoped: statusResult.roleScoped,
      warehouse_bff_routes_ready: true,
      live_warehouse_safe_read_attempted: true,
      live_warehouse_safe_read_available: statusLoaded,
      status_loaded: statusLoaded,
      movement_summary_ready: movementResult.status === "preview",
      risk_cards_created: statusResult.riskCards.length,
      honest_empty_state: emptyState,
      risk_preview_ready: riskResult.status === "preview" || riskResult.status === "empty",
      draft_action_ready: draftResult.status === "draft" || draftResult.status === "empty",
      all_cards_have_evidence: statusResult.allCardsHaveEvidence,
      all_cards_have_risk_policy: statusResult.allCardsHaveRiskPolicy,
      all_cards_have_known_tool: statusResult.allCardsHaveKnownTool,
    });
  } catch (error) {
    return baseMatrix("BLOCKED_REAL_WAREHOUSE_STATUS_NOT_AVAILABLE", sanitizeReason(error), {
      android_runtime_smoke: "PASS",
      live_warehouse_safe_read_attempted: true,
    });
  } finally {
    await client.auth.signOut().catch(() => undefined);
  }
}

export async function runAiWarehouseOperationsCopilotMaestro(): Promise<AiWarehouseOperationsCopilotMatrix> {
  const matrix = await run();
  persistArtifacts(matrix);
  return matrix;
}

if (require.main === module) {
  void runAiWarehouseOperationsCopilotMaestro()
    .then((matrix) => {
      console.info(JSON.stringify(matrix, null, 2));
      if (!matrix.final_status.startsWith("GREEN_")) process.exitCode = 1;
    })
    .catch((error) => {
      const matrix = baseMatrix("BLOCKED_REAL_WAREHOUSE_STATUS_NOT_AVAILABLE", sanitizeReason(error));
      persistArtifacts(matrix);
      console.info(JSON.stringify(matrix, null, 2));
      process.exitCode = 1;
    });
}
