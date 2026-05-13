import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import { getAgentWorkdayLiveEvidenceTasks } from "../../src/features/ai/agent/agentWorkdayLiveEvidenceRoutes";
import {
  buildAiWorkdayRuntimeEvidenceFromSafeReads,
  AI_WORKDAY_LIVE_EVIDENCE_BRIDGE_CONTRACT,
  type AiWorkdayLiveEvidenceBridgeInput,
  type AiWorkdayLiveEvidenceSourceProbe,
} from "../../src/features/ai/workday/aiWorkdayLiveEvidenceBridge";
import type {
  AiFinanceSummaryTransportResult,
  AiWarehouseStatusTransportResult,
  AiWarehouseStatusTransportRow,
} from "../../src/features/ai/tools/transport/aiToolTransportTypes";
import {
  callBffReadonlyMobile,
  resolveBffReadonlyRuntimeConfig,
} from "../../src/shared/scale/bffClient";
import type {
  DirectorFinanceBffRequestDto,
  DirectorFinanceBffResponseDto,
} from "../../src/screens/director/director.finance.bff.contract";
import type {
  WarehouseApiBffRequestDto,
  WarehouseApiBffResponseDto,
} from "../../src/screens/warehouse/warehouse.api.bff.contract";
import { parseAgentEnvFileValues } from "../env/checkRequiredAgentFlags";
import { verifyAndroidInstalledBuildRuntime } from "../release/verifyAndroidInstalledBuildRuntime";
import { resolveExplicitAiRoleAuthEnv } from "./resolveExplicitAiRoleAuthEnv";

type AiWorkdayLiveEvidenceBridgeStatus =
  | "GREEN_AI_WORKDAY_LIVE_EVIDENCE_BRIDGE_READY"
  | "GREEN_AI_WORKDAY_LIVE_EVIDENCE_EMPTY_READY"
  | "BLOCKED_AI_WORKDAY_LIVE_EVIDENCE_APPROVAL_MISSING"
  | "BLOCKED_AI_WORKDAY_LIVE_EVIDENCE_AUTH_MISSING"
  | "BLOCKED_AI_WORKDAY_LIVE_EVIDENCE_SAFE_READ_UNAVAILABLE"
  | "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE";

type AiWorkdayLiveEvidenceBridgeMatrix = {
  final_status: AiWorkdayLiveEvidenceBridgeStatus;
  backend_first: true;
  safe_read_only: true;
  role_scoped: true;
  developer_control_full_access: true;
  role_isolation_e2e_claimed: false;
  bridge_contract_ready: boolean;
  live_safe_read_attempted: boolean;
  live_safe_read_sources: number;
  safe_read_blockers: number;
  local_supabase_user_jwt_verify: "PASS" | "BLOCKED" | "SKIPPED";
  bff_mobile_auth_rejected_valid_jwt: boolean;
  workday_cards_created: number;
  all_cards_have_evidence: boolean;
  all_cards_have_known_tool: boolean;
  all_cards_have_risk_policy: boolean;
  high_risk_requires_approval: boolean;
  forbidden_actions_blocked: boolean;
  honest_empty_state: boolean;
  mutation_count: 0;
  db_writes: 0;
  direct_supabase_from_ui: false;
  mobile_external_fetch: false;
  external_live_fetch: false;
  uncontrolled_external_fetch: false;
  raw_rows_returned: false;
  raw_prompt_returned: false;
  raw_provider_payload_returned: false;
  auth_admin_used: false;
  list_users_used: false;
  service_role_used: false;
  seed_used: false;
  model_provider_changed: false;
  gpt_enabled: false;
  gemini_removed: false;
  android_runtime_smoke: "PASS" | "BLOCKED";
  fake_cards: false;
  hardcoded_ai_answer: false;
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
const wave = "S_AI_MAGIC_13_WORKDAY_LIVE_EVIDENCE_BRIDGE";
const artifactPrefix = path.join(projectRoot, "artifacts", wave);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;

const REQUIRED_FLAGS = [
  "S_AI_MAGIC_13_WORKDAY_LIVE_EVIDENCE_APPROVED",
  "S_AI_MAGIC_13_REQUIRE_SAFE_READ_ONLY",
  "S_AI_MAGIC_13_REQUIRE_EVIDENCE",
  "S_AI_MAGIC_13_REQUIRE_ANDROID_RUNTIME_SMOKE",
] as const;

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeProof(matrix: AiWorkdayLiveEvidenceBridgeMatrix): void {
  fs.writeFileSync(
    proofPath,
    [
      "# S_AI_MAGIC_13_WORKDAY_LIVE_EVIDENCE_BRIDGE",
      "",
      `final_status: ${matrix.final_status}`,
      `live_safe_read_sources: ${matrix.live_safe_read_sources}`,
      `local_supabase_user_jwt_verify: ${matrix.local_supabase_user_jwt_verify}`,
      `bff_mobile_auth_rejected_valid_jwt: ${String(matrix.bff_mobile_auth_rejected_valid_jwt)}`,
      `workday_cards_created: ${matrix.workday_cards_created}`,
      `honest_empty_state: ${String(matrix.honest_empty_state)}`,
      `mutation_count: ${matrix.mutation_count}`,
      `db_writes: ${matrix.db_writes}`,
      `android_runtime_smoke: ${matrix.android_runtime_smoke}`,
      `exact_reason: ${matrix.exact_reason ?? "none"}`,
      "",
    ].join("\n"),
    "utf8",
  );
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

function sourceProbe(
  source: AiWorkdayLiveEvidenceSourceProbe["source"],
  status: AiWorkdayLiveEvidenceSourceProbe["status"],
  exactReason: string | null,
): AiWorkdayLiveEvidenceSourceProbe {
  return {
    source,
    status,
    evidenceRefs: [],
    redacted: true,
    rawRowsReturned: false,
    exactReason,
  };
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

function toWarehouseRow(row: Record<string, unknown>): AiWarehouseStatusTransportRow {
  return {
    material_id: typeof row.material_id === "string" ? row.material_id : null,
    code: typeof row.code === "string" ? row.code : null,
    name: typeof row.name === "string" ? row.name : null,
    uom_id: typeof row.uom_id === "string" ? row.uom_id : null,
    qty_on_hand:
      typeof row.qty_on_hand === "number" || typeof row.qty_on_hand === "string"
        ? row.qty_on_hand
        : null,
    qty_reserved:
      typeof row.qty_reserved === "number" || typeof row.qty_reserved === "string"
        ? row.qty_reserved
        : null,
    qty_available:
      typeof row.qty_available === "number" || typeof row.qty_available === "string"
        ? row.qty_available
        : null,
    qty_incoming:
      typeof row.qty_incoming === "number" || typeof row.qty_incoming === "string"
        ? row.qty_incoming
        : null,
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

function parseWarehousePayload(payload: unknown, offset: number, limit: number): AiWarehouseStatusTransportResult {
  const payloadRecord = isRecord(payload) ? payload : {};
  const rows = Array.isArray(payloadRecord.rows)
    ? payloadRecord.rows.filter(isRecord).map(toWarehouseRow)
    : [];
  const totalRowCount = readMetaNumber(payloadRecord.meta, "total_row_count");
  const hasMore =
    readMetaBoolean(payloadRecord.meta, "has_more") ??
    (totalRowCount === null ? rows.length >= limit : offset + rows.length < totalRowCount);

  return {
    rows,
    totalRowCount,
    hasMore,
    dtoOnly: true,
    rawRowsExposed: false,
  };
}

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function readRecord(record: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  for (const key of keys) {
    const value = record[key];
    if (isRecord(value)) return value;
  }
  return record;
}

function readNumber(record: Record<string, unknown>, keys: readonly string[]): number {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) return toNumber(record[key]);
  }
  return 0;
}

function readStringArray(record: Record<string, unknown>, keys: readonly string[]): string[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }
  }
  return [];
}

function readArrayCount(record: Record<string, unknown>, keys: readonly string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value.length;
  }
  return 0;
}

function redactFinancePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const summary = readRecord(payload, ["summary", "summaryV2", "totals"]);
  return {
    summary: {
      total_payable: readNumber(summary, [
        "total_payable",
        "totalPayable",
        "total_amount",
        "totalAmount",
        "payable",
      ]),
      total_paid: readNumber(summary, ["total_paid", "totalPaid", "paid"]),
      total_debt: readNumber(summary, ["total_debt", "totalDebt", "debt"]),
      overdue_amount: readNumber(summary, ["overdue_amount", "overdueAmount", "overdue"]),
      critical_amount: readNumber(summary, ["critical_amount", "criticalAmount"]),
      overdue_count: readNumber(summary, ["overdue_count", "overdueCount"]),
      document_count: readNumber(summary, ["document_count", "documentCount", "documents"]),
      supplier_count:
        readNumber(summary, ["supplier_count", "supplierCount"]) ||
        readArrayCount(payload, ["by_supplier", "bySupplier", "suppliers"]),
    },
    document_gaps: readStringArray(payload, ["document_gaps", "documentGaps"]),
  };
}

async function readWarehouseStatusViaNodeBff(
  accessToken: string,
): Promise<AiWarehouseStatusTransportResult> {
  const offset = 0;
  const limit = 10;
  const runtime = resolveBffReadonlyRuntimeConfig();
  const response = await callBffReadonlyMobile<WarehouseApiBffResponseDto, WarehouseApiBffRequestDto>({
    config: runtime.clientConfig,
    operation: "warehouse.api.read.scope",
    input: {
      operation: "warehouse.api.stock.scope",
      args: { p_offset: offset, p_limit: limit },
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

  const firstRow = Array.isArray(response.data.payload.result.data)
    ? response.data.payload.result.data[0]
    : null;
  const payload = isRecord(firstRow) && Object.prototype.hasOwnProperty.call(firstRow, "payload")
    ? firstRow.payload
    : firstRow;
  return parseWarehousePayload(payload, offset, limit);
}

async function readFinanceSummaryViaNodeBff(
  accessToken: string,
): Promise<AiFinanceSummaryTransportResult> {
  const runtime = resolveBffReadonlyRuntimeConfig();
  const response = await callBffReadonlyMobile<DirectorFinanceBffResponseDto, DirectorFinanceBffRequestDto>({
    config: runtime.clientConfig,
    operation: "director.finance.rpc.scope",
    input: {
      operation: "director.finance.summary.v2",
      args: {
        p_object_id: undefined,
        p_date_from: undefined,
        p_date_to: undefined,
      },
    },
    getAccessToken: async () => accessToken,
  });

  if (!response.ok) throw new Error(response.error.code);
  if (response.data.operation !== "director.finance.summary.v2") {
    throw new Error("DIRECTOR_FINANCE_BFF_INVALID_RESPONSE");
  }

  return {
    payload: redactFinancePayload(response.data.payload),
    dtoOnly: true,
    rawRowsExposed: false,
  };
}

async function verifySupabaseUserJwt(params: {
  supabaseUrl: string;
  anonKey: string;
  accessToken: string;
}): Promise<"PASS" | "BLOCKED"> {
  try {
    const response = await fetch(new URL("/auth/v1/user", params.supabaseUrl), {
      method: "GET",
      headers: {
        accept: "application/json",
        apikey: params.anonKey,
        authorization: `Bearer ${params.accessToken}`,
      },
    });
    if (!response.ok) return "BLOCKED";
    const body: unknown = await response.json().catch(() => undefined);
    return isRecord(body) && typeof body.id === "string" && body.id.length > 0 ? "PASS" : "BLOCKED";
  } catch {
    return "BLOCKED";
  }
}

async function readSafeEvidence(accessToken: string): Promise<AiWorkdayLiveEvidenceBridgeInput> {
  const sourceProbes: AiWorkdayLiveEvidenceSourceProbe[] = [];
  let warehouse: AiWarehouseStatusTransportResult | null = null;
  let finance: AiFinanceSummaryTransportResult | null = null;

  try {
    warehouse = await readWarehouseStatusViaNodeBff(accessToken);
    if (warehouse.rows.length === 0) {
      sourceProbes.push(sourceProbe("warehouse_status", "empty", "Warehouse safe-read returned no bounded rows."));
    }
  } catch (error) {
    sourceProbes.push(sourceProbe("warehouse_status", "unavailable", sanitizeReason(error)));
  }

  try {
    finance = await readFinanceSummaryViaNodeBff(accessToken);
  } catch (error) {
    sourceProbes.push(sourceProbe("finance_summary", "unavailable", sanitizeReason(error)));
  }

  return { warehouse, finance, sourceProbes };
}

function baseMatrix(
  finalStatus: AiWorkdayLiveEvidenceBridgeStatus,
  exactReason: string | null,
  overrides: Partial<AiWorkdayLiveEvidenceBridgeMatrix> = {},
): AiWorkdayLiveEvidenceBridgeMatrix {
  return {
    final_status: finalStatus,
    backend_first: true,
    safe_read_only: true,
    role_scoped: true,
    developer_control_full_access: true,
    role_isolation_e2e_claimed: false,
    bridge_contract_ready:
      AI_WORKDAY_LIVE_EVIDENCE_BRIDGE_CONTRACT.safeReadOnly &&
      AI_WORKDAY_LIVE_EVIDENCE_BRIDGE_CONTRACT.mutationCount === 0,
    live_safe_read_attempted: false,
    live_safe_read_sources: 0,
    safe_read_blockers: 0,
    local_supabase_user_jwt_verify: "SKIPPED",
    bff_mobile_auth_rejected_valid_jwt: false,
    workday_cards_created: 0,
    all_cards_have_evidence: false,
    all_cards_have_known_tool: false,
    all_cards_have_risk_policy: false,
    high_risk_requires_approval: false,
    forbidden_actions_blocked: true,
    honest_empty_state: false,
    mutation_count: 0,
    db_writes: 0,
    direct_supabase_from_ui: false,
    mobile_external_fetch: false,
    external_live_fetch: false,
    uncontrolled_external_fetch: false,
    raw_rows_returned: false,
    raw_prompt_returned: false,
    raw_provider_payload_returned: false,
    auth_admin_used: false,
    list_users_used: false,
    service_role_used: false,
    seed_used: false,
    model_provider_changed: false,
    gpt_enabled: false,
    gemini_removed: false,
    android_runtime_smoke: "BLOCKED",
    fake_cards: false,
    hardcoded_ai_answer: false,
    fake_green_claimed: false,
    secrets_printed: false,
    exact_reason: exactReason,
    ...overrides,
  };
}

function persistArtifacts(matrix: AiWorkdayLiveEvidenceBridgeMatrix): void {
  writeJson(matrixPath, matrix);
  writeJson(inventoryPath, {
    wave,
    artifacts: [inventoryPath, matrixPath, emulatorPath, proofPath].map((filePath) =>
      path.relative(projectRoot, filePath).replace(/\\/g, "/"),
    ),
    safe_read_only: true,
    mutation_count: 0,
    db_writes: 0,
    secrets_printed: false,
  });
  writeJson(emulatorPath, {
    wave,
    android_runtime_smoke: matrix.android_runtime_smoke,
    live_safe_read_attempted: matrix.live_safe_read_attempted,
    workday_cards_created: matrix.workday_cards_created,
    fake_emulator_pass: false,
  });
  writeProof(matrix);
}

async function run(): Promise<AiWorkdayLiveEvidenceBridgeMatrix> {
  loadEnvFilesIntoProcess();

  if (!flagsReady()) {
    return baseMatrix(
      "BLOCKED_AI_WORKDAY_LIVE_EVIDENCE_APPROVAL_MISSING",
      `Missing required approval flags: ${REQUIRED_FLAGS.filter((key) => !envEnabled(key)).join(", ")}`,
    );
  }

  const android = await verifyAndroidInstalledBuildRuntime();
  if (android.final_status !== "GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF") {
    return baseMatrix("BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE", android.exact_reason, {
      android_runtime_smoke: "BLOCKED",
    });
  }

  const roleAuth = resolveExplicitAiRoleAuthEnv(process.env, projectRoot);
  if (
    roleAuth.roleMode !== "developer_control_full_access" ||
    roleAuth.source !== "developer_control_explicit_env" ||
    !roleAuth.env
  ) {
    return baseMatrix(
      "BLOCKED_AI_WORKDAY_LIVE_EVIDENCE_AUTH_MISSING",
      roleAuth.exactReason ?? "Developer/control explicit auth is required for live evidence bridge.",
      { android_runtime_smoke: "PASS" },
    );
  }

  const supabaseUrl = envText("STAGING_SUPABASE_URL") || envText("EXPO_PUBLIC_SUPABASE_URL");
  const anonKey = envText("STAGING_SUPABASE_ANON_KEY") || envText("EXPO_PUBLIC_SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    return baseMatrix(
      "BLOCKED_AI_WORKDAY_LIVE_EVIDENCE_AUTH_MISSING",
      "Supabase public URL or anon key is missing for authenticated safe-read proof.",
      { android_runtime_smoke: "PASS" },
    );
  }

  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as SupabaseAuthClient;

  const signIn = await client.auth.signInWithPassword({
    email: roleAuth.env.E2E_CONTROL_EMAIL,
    password: roleAuth.env.E2E_CONTROL_PASSWORD,
  });
  if (signIn.error || !signIn.data.user || !signIn.data.session) {
    return baseMatrix(
      "BLOCKED_AI_WORKDAY_LIVE_EVIDENCE_AUTH_MISSING",
      "Developer/control account could not authenticate for live evidence bridge.",
      { android_runtime_smoke: "PASS" },
    );
  }

  try {
    const localSupabaseUserJwtVerify = await verifySupabaseUserJwt({
      supabaseUrl,
      anonKey,
      accessToken: signIn.data.session.access_token,
    });
    const evidenceInput = await readSafeEvidence(signIn.data.session.access_token);
    const bridge = buildAiWorkdayRuntimeEvidenceFromSafeReads(evidenceInput);
    const response = getAgentWorkdayLiveEvidenceTasks({
      auth: { userId: signIn.data.user.id, role: "director" },
      input: { screenId: "ai.command_center", limit: 5 },
      evidenceInput,
    });

    if (!response.ok) {
      return baseMatrix(
        "BLOCKED_AI_WORKDAY_LIVE_EVIDENCE_AUTH_MISSING",
        response.error.message,
        { android_runtime_smoke: "PASS", live_safe_read_attempted: true },
      );
    }

    const cards = response.data.result.cards;
    const safeReadBlockers = bridge.sourceProbes.filter(
      (probe) => probe.status === "blocked" || probe.status === "unavailable",
    ).length;
    const bffMobileAuthRejectedValidJwt =
      localSupabaseUserJwtVerify === "PASS" &&
      bridge.sourceProbes.some(
        (probe) =>
          (probe.status === "blocked" || probe.status === "unavailable") &&
          probe.exactReason === "BFF_AUTH_REQUIRED",
      );
    const allSourcesUnavailable =
      bridge.sourceProbes.length > 0 &&
      bridge.sourceProbes.every((probe) => probe.status === "blocked" || probe.status === "unavailable");
    const finalStatus =
      cards.length > 0
        ? "GREEN_AI_WORKDAY_LIVE_EVIDENCE_BRIDGE_READY"
        : allSourcesUnavailable
          ? "BLOCKED_AI_WORKDAY_LIVE_EVIDENCE_SAFE_READ_UNAVAILABLE"
        : "GREEN_AI_WORKDAY_LIVE_EVIDENCE_EMPTY_READY";
    const exactReason =
      bffMobileAuthRejectedValidJwt && cards.length === 0
        ? "BFF mobile readonly auth rejected a locally valid staging Supabase JWT; staging BFF verifier env is missing or mismatched."
        : cards.length > 0
          ? null
          : bridge.exactReason;

    return baseMatrix(finalStatus, exactReason, {
      android_runtime_smoke: "PASS",
      live_safe_read_attempted: true,
      live_safe_read_sources: bridge.evidenceSourceCount,
      safe_read_blockers: safeReadBlockers,
      local_supabase_user_jwt_verify: localSupabaseUserJwtVerify,
      bff_mobile_auth_rejected_valid_jwt: bffMobileAuthRejectedValidJwt,
      workday_cards_created: cards.length,
      all_cards_have_evidence: response.data.result.allCardsHaveEvidence,
      all_cards_have_known_tool: response.data.result.allCardsHaveKnownTool,
      all_cards_have_risk_policy: response.data.result.allCardsHaveRiskPolicy,
      high_risk_requires_approval: response.data.result.highRiskRequiresApproval,
      forbidden_actions_blocked: response.data.result.forbiddenActionsBlocked,
      honest_empty_state: cards.length === 0 && response.data.result.emptyState?.honest === true,
    });
  } finally {
    await client.auth.signOut().catch(() => undefined);
  }
}

export async function runAiWorkdayLiveEvidenceBridge(): Promise<AiWorkdayLiveEvidenceBridgeMatrix> {
  const matrix = await run();
  persistArtifacts(matrix);
  return matrix;
}

if (require.main === module) {
  void runAiWorkdayLiveEvidenceBridge()
    .then((matrix) => {
      console.info(JSON.stringify(matrix, null, 2));
      if (!matrix.final_status.startsWith("GREEN_")) process.exitCode = 1;
    })
    .catch((error) => {
      const matrix = baseMatrix(
        "BLOCKED_AI_WORKDAY_LIVE_EVIDENCE_SAFE_READ_UNAVAILABLE",
        sanitizeReason(error),
      );
      persistArtifacts(matrix);
      console.info(JSON.stringify(matrix, null, 2));
      process.exitCode = 1;
    });
}
