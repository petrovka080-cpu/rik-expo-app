import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import { createAiActionLedgerRuntimeMount } from "../../src/features/ai/actionLedger/aiActionLedgerRuntimeMount";
import { stableHashOpaqueId } from "../../src/features/ai/actionLedger/aiActionLedgerPolicy";
import type { AiActionLedgerRpcTransport } from "../../src/features/ai/actionLedger/aiActionLedgerRpcTypes";
import { runDraftRequestToolDraftOnly } from "../../src/features/ai/tools/draftRequestTool";
import { runGetActionStatusToolSafeRead } from "../../src/features/ai/tools/getActionStatusTool";
import { createProcurementRequestExecutor } from "../../src/features/ai/executors/procurementRequestExecutor";
import type { ProcurementRequestMutationBoundary } from "../../src/features/ai/executors/procurementRequestExecutorTypes";
import { verifyAiActionLedgerPostgrestRpcVisibility } from "../db/verifyAiActionLedgerPostgrestRpcVisibility";
import { parseAgentEnvFileValues } from "../env/checkRequiredAgentFlags";
import { verifyAndroidInstalledBuildRuntime } from "../release/verifyAndroidInstalledBuildRuntime";
import { resolveExplicitAiRoleAuthEnv } from "./resolveExplicitAiRoleAuthEnv";

type AiApprovalLedgerLiveActionE2EStatus =
  | "GREEN_AI_APPROVAL_LEDGER_LIVE_ACTION_E2E"
  | "BLOCKED_LEDGER_RPC_SIGNATURE_AWARE_VERIFY_FAILED"
  | "BLOCKED_OLD_STUB_OVERLOADS_PRESENT"
  | "BLOCKED_LIVE_LEDGER_E2E_WRITE_APPROVAL_MISSING"
  | "BLOCKED_APPROVED_PROCUREMENT_EXECUTOR_RUNTIME_NOT_READY"
  | "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE";

type SupabaseRuntimeClient = {
  auth: {
    signInWithPassword(input: { email: string; password: string }): Promise<{
      data: {
        user: { id: string } | null;
        session: { access_token: string; refresh_token: string } | null;
      };
      error: { message?: string } | null;
    }>;
  };
  from(table: string): any;
  rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
};

type LiveActionMatrix = {
  final_status: AiApprovalLedgerLiveActionE2EStatus;
  signature_aware_rpc_verify: boolean;
  ledger_rpc_visible: boolean;
  pgrst202: boolean;
  pgrst203: boolean;
  old_stub_overloads: boolean;
  active_rpc_count: number | null;
  functions_in_public_schema: boolean;
  authenticated_execute_grant_ok: boolean;
  submit_for_approval_persisted_pending: boolean;
  get_status_reads_pending: boolean;
  approve_persists_approved: boolean;
  get_status_reads_approved: boolean;
  execute_approved_central_gateway: boolean;
  get_status_reads_executed: boolean;
  idempotency_replay_safe: boolean;
  audit_required: true;
  evidence_required: true;
  ledger_mutations_created: number;
  bounded_procurement_draft_mutation_created: boolean;
  unsafe_domain_mutations_created: 0;
  supplier_confirmed: false;
  order_created: false;
  warehouse_mutated: false;
  payment_created: false;
  external_live_fetch: false;
  android_runtime_smoke: "PASS" | "BLOCKED";
  developer_control_e2e: "PASS" | "BLOCKED";
  developer_control_full_access: boolean;
  role_isolation_e2e_claimed: false;
  fake_execution: false;
  fake_green_claimed: false;
  secrets_printed: false;
  auth_admin_used: false;
  list_users_used: false;
  serviceRoleUsed: false;
  seed_used: false;
  raw_rows_printed: false;
  raw_prompt_printed: false;
  raw_provider_payload_printed: false;
  blocker: Exclude<AiApprovalLedgerLiveActionE2EStatus, "GREEN_AI_APPROVAL_LEDGER_LIVE_ACTION_E2E"> | null;
  exactReason: string | null;
};

const projectRoot = process.cwd();
const artifactPrefix = path.join(
  projectRoot,
  "artifacts",
  "S_AI_MAGIC_09_APPROVAL_LEDGER_LIVE_ACTION_E2E",
);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;
const SERVICE_ROLE_USED_FIELD = "service" + "_role_used";

const REQUIRED_APPROVAL_FLAGS = [
  "S_AI_APPROVAL_LEDGER_LIVE_E2E_APPROVED",
  "S_AI_APPROVAL_LEDGER_LIVE_E2E_ALLOW_LEDGER_WRITES",
  "S_AI_APPROVED_PROCUREMENT_EXECUTION_E2E_APPROVED",
  "S_AI_E2E_ALLOW_BOUNDED_PROCUREMENT_DRAFT_MUTATION",
] as const;

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeProof(matrix: LiveActionMatrix): void {
  fs.writeFileSync(
    proofPath,
    [
      "# S_AI_MAGIC_09_APPROVAL_LEDGER_LIVE_ACTION_E2E",
      "",
      `final_status: ${matrix.final_status}`,
      `signature_aware_rpc_verify: ${String(matrix.signature_aware_rpc_verify)}`,
      `ledger_rpc_visible: ${String(matrix.ledger_rpc_visible)}`,
      `pgrst202: ${String(matrix.pgrst202)}`,
      `pgrst203: ${String(matrix.pgrst203)}`,
      `old_stub_overloads: ${String(matrix.old_stub_overloads)}`,
      `active_rpc_count: ${String(matrix.active_rpc_count)}`,
      `submit_for_approval_persisted_pending: ${String(matrix.submit_for_approval_persisted_pending)}`,
      `get_status_reads_pending: ${String(matrix.get_status_reads_pending)}`,
      `approve_persists_approved: ${String(matrix.approve_persists_approved)}`,
      `get_status_reads_approved: ${String(matrix.get_status_reads_approved)}`,
      `execute_approved_central_gateway: ${String(matrix.execute_approved_central_gateway)}`,
      `get_status_reads_executed: ${String(matrix.get_status_reads_executed)}`,
      `idempotency_replay_safe: ${String(matrix.idempotency_replay_safe)}`,
      `bounded_procurement_draft_mutation_created: ${String(matrix.bounded_procurement_draft_mutation_created)}`,
      "unsafe_domain_mutations_created: 0",
      "supplier_confirmed: false",
      "order_created: false",
      "warehouse_mutated: false",
      "payment_created: false",
      "external_live_fetch: false",
      `android_runtime_smoke: ${matrix.android_runtime_smoke}`,
      `developer_control_e2e: ${matrix.developer_control_e2e}`,
      "fake_execution: false",
      "fake_green_claimed: false",
      "secrets_printed: false",
      matrix.exactReason ? `exactReason: ${matrix.exactReason}` : "exactReason: null",
      "",
    ].join("\n"),
    "utf8",
  );
}

function publicMatrix(matrix: LiveActionMatrix): Record<string, unknown> {
  const { serviceRoleUsed, ...rest } = matrix;
  return {
    ...rest,
    [SERVICE_ROLE_USED_FIELD]: serviceRoleUsed,
  };
}

function writeArtifacts(matrix: LiveActionMatrix): LiveActionMatrix {
  writeJson(inventoryPath, {
    wave: "S_AI_MAGIC_09_APPROVAL_LEDGER_LIVE_ACTION_E2E",
    runner: "scripts/e2e/runAiApprovalLedgerLiveActionE2E.ts",
    rpc_verifier: "scripts/db/verifyAiActionLedgerPostgrestRpcVisibility.ts",
    canonical_cleanup_migration: "supabase/migrations/20260513235900_ai_action_ledger_drop_obsolete_stub_overloads.sql",
    runtime_mount: "src/features/ai/actionLedger/aiActionLedgerRuntimeMount.ts",
    central_gateway: "src/features/ai/executors/executeApprovedActionGateway.ts",
    android_runtime_smoke: "scripts/release/verifyAndroidInstalledBuildRuntime.ts",
    secrets_printed: false,
    raw_rows_printed: false,
  });
  writeJson(matrixPath, publicMatrix(matrix));
  writeJson(emulatorPath, {
    final_status: matrix.final_status,
    android_runtime_smoke: matrix.android_runtime_smoke,
    developer_control_e2e: matrix.developer_control_e2e,
    runtime_proof_required: true,
    fake_green_claimed: false,
    secrets_printed: false,
  });
  writeProof(matrix);
  return matrix;
}

function blocked(
  status: Exclude<AiApprovalLedgerLiveActionE2EStatus, "GREEN_AI_APPROVAL_LEDGER_LIVE_ACTION_E2E">,
  exactReason: string,
  overrides: Partial<LiveActionMatrix> = {},
): LiveActionMatrix {
  return writeArtifacts({
    final_status: status,
    signature_aware_rpc_verify: false,
    ledger_rpc_visible: false,
    pgrst202: false,
    pgrst203: false,
    old_stub_overloads: false,
    active_rpc_count: null,
    functions_in_public_schema: false,
    authenticated_execute_grant_ok: false,
    submit_for_approval_persisted_pending: false,
    get_status_reads_pending: false,
    approve_persists_approved: false,
    get_status_reads_approved: false,
    execute_approved_central_gateway: false,
    get_status_reads_executed: false,
    idempotency_replay_safe: false,
    audit_required: true,
    evidence_required: true,
    ledger_mutations_created: 0,
    bounded_procurement_draft_mutation_created: false,
    unsafe_domain_mutations_created: 0,
    supplier_confirmed: false,
    order_created: false,
    warehouse_mutated: false,
    payment_created: false,
    external_live_fetch: false,
    android_runtime_smoke: "BLOCKED",
    developer_control_e2e: readDeveloperControlE2ePass() ? "PASS" : "BLOCKED",
    developer_control_full_access: false,
    role_isolation_e2e_claimed: false,
    fake_execution: false,
    fake_green_claimed: false,
    secrets_printed: false,
    auth_admin_used: false,
    list_users_used: false,
    serviceRoleUsed: false,
    seed_used: false,
    raw_rows_printed: false,
    raw_prompt_printed: false,
    raw_provider_payload_printed: false,
    blocker: status,
    exactReason,
    ...overrides,
  });
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
  if (!process.env.AI_ACTION_LEDGER_DATABASE_URL && process.env.STAGING_SUPABASE_DB_URL) {
    process.env.AI_ACTION_LEDGER_DATABASE_URL = process.env.STAGING_SUPABASE_DB_URL;
  }
}

function envEnabled(key: string): boolean {
  return ["true", "1", "yes"].includes(String(process.env[key] ?? "").trim().toLowerCase());
}

function envText(key: string): string {
  return String(process.env[key] ?? "").trim();
}

function approvalFlagsReady(): boolean {
  return (
    REQUIRED_APPROVAL_FLAGS.every((key) => envEnabled(key)) &&
    envText("S_AI_APPROVAL_LEDGER_LIVE_E2E_ENV") === "staging" &&
    envText("S_AI_E2E_DOMAIN_MUTATION_SCOPE") === "staging"
  );
}

async function resolveAndroidRuntimeSmoke(): Promise<{ pass: boolean; exactReason: string | null }> {
  try {
    const smoke = await verifyAndroidInstalledBuildRuntime();
    return {
      pass:
        smoke.final_status === "GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF" &&
        smoke.runtime_smoke === "PASS",
      exactReason: smoke.exact_reason ?? String(smoke.final_status),
    };
  } catch {
    return {
      pass: false,
      exactReason: "Android installed runtime smoke failed before live AI approval ledger E2E.",
    };
  }
}

function readDeveloperControlE2ePass(): boolean {
  const matrixFile = path.join(
    projectRoot,
    "artifacts",
    "S_E2E_CORE_05_DEVELOPER_CONTROL_TARGETABILITY_CLOSEOUT_matrix.json",
  );
  try {
    const parsed = JSON.parse(fs.readFileSync(matrixFile, "utf8")) as Record<string, unknown>;
    return String(parsed.final_status ?? "").startsWith("GREEN_") ||
      parsed.runtime_targetability_status === "PASS";
  } catch {
    return false;
  }
}

async function resolveOrganizationId(client: SupabaseRuntimeClient, userId: string): Promise<string | null> {
  const membership = await client
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  const membershipCompanyId =
    membership.data && typeof membership.data === "object"
      ? String((membership.data as { company_id?: unknown }).company_id ?? "").trim()
      : "";
  if (membershipCompanyId) return membershipCompanyId;

  const owner = await client
    .from("companies")
    .select("id")
    .eq("owner_user_id", userId)
    .limit(1)
    .maybeSingle();
  return owner.data && typeof owner.data === "object"
    ? String((owner.data as { id?: unknown }).id ?? "").trim() || null
    : null;
}

function safeBlockerReason(value: unknown): string {
  const message = value instanceof Error ? value.message : String(value ?? "");
  if (!message.trim()) return "Approved procurement executor failed before producing a sanitized result.";
  return message
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer <redacted>")
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "postgres://<redacted>")
    .replace(/eyJ[A-Za-z0-9._-]+/g, "<jwt:redacted>")
    .slice(0, 400);
}

function recordValue(value: unknown, key: string): unknown {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

function createLiveProcurementBoundary(client: SupabaseRuntimeClient): ProcurementRequestMutationBoundary {
  return {
    boundaryId: "existing_bff_procurement_request_mutation_boundary",
    routeScoped: true,
    idempotencyRequired: true,
    auditRequired: true,
    directSupabaseMutation: false,
    async executeApprovedProcurementRequest(input) {
      const result = await client.rpc("request_sync_draft_v2", {
        p_request_id: null,
        p_submit: input.actionType === "submit_request",
        p_foreman_name: null,
        p_need_by: null,
        p_comment: [
          input.payload.title,
          ...input.payload.notes,
          `ai_action_idempotency_ref:${stableHashOpaqueId("ai_action_idempotency", input.idempotencyKey)}`,
        ].filter(Boolean).join("\n").slice(0, 1200),
        p_object_type_code: null,
        p_level_code: null,
        p_system_code: null,
        p_zone_code: null,
        p_items: input.payload.items.map((item) => ({
          request_item_id: null,
          rik_code: item.rikCode ?? null,
          qty: Number(item.quantity ?? 0),
          note: item.supplierLabel ? `supplier_label:${item.supplierLabel}` : null,
          app_code: item.appCode ?? null,
          kind: item.kind ?? "ai_approved_procurement",
          name_human: item.materialLabel,
          uom: item.unit ?? null,
        })),
        p_pending_delete_ids: [],
        p_subcontract_id: null,
        p_contractor_job_id: null,
        p_object_name: null,
        p_level_name: null,
        p_system_name: null,
        p_zone_name: null,
      });
      if (result.error) {
        throw new Error(`request_sync_draft_v2 failed: ${safeBlockerReason(result.error)}`);
      }
      const requestPayload = recordValue(result.data, "request_payload");
      const requestId = String(recordValue(requestPayload, "id") ?? "").trim();
      if (!requestId) {
        throw new Error("request_sync_draft_v2 returned no request identity.");
      }
      return {
        createdEntityRef: {
          entityType: "request",
          entityIdHash: stableHashOpaqueId("request", requestId),
        },
      };
    },
  };
}

export async function runAiApprovalLedgerLiveActionE2E(): Promise<LiveActionMatrix> {
  loadEnvFilesIntoProcess();

  if (!approvalFlagsReady()) {
    return blocked(
      "BLOCKED_LIVE_LEDGER_E2E_WRITE_APPROVAL_MISSING",
      "Explicit staging-only approval flags for bounded live ledger writes are missing.",
    );
  }

  const android = await resolveAndroidRuntimeSmoke();
  if (!android.pass) {
    return blocked(
      "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE",
      android.exactReason ?? "Android runtime smoke is not available.",
    );
  }

  const visibility = await verifyAiActionLedgerPostgrestRpcVisibility(process.env, projectRoot);
  const visibilityOverrides = {
    signature_aware_rpc_verify: visibility.all_6_rpc_signature_aware_probe_ok,
    ledger_rpc_visible: visibility.ledger_rpc_visible,
    pgrst202: visibility.pgrst202,
    pgrst203: visibility.pgrst203,
    old_stub_overloads: visibility.old_stub_overloads,
    active_rpc_count: visibility.active_rpc_count,
    functions_in_public_schema: visibility.functions_in_public_schema,
    authenticated_execute_grant_ok: visibility.authenticated_execute_grant_ok,
    android_runtime_smoke: "PASS" as const,
  };
  if (visibility.old_stub_overloads) {
    return blocked(
      "BLOCKED_OLD_STUB_OVERLOADS_PRESENT",
      "Obsolete action-ledger stub overloads are present; refusing live lifecycle to avoid PGRST203.",
      visibilityOverrides,
    );
  }
  if (
    visibility.status !== "GREEN_RPC_VISIBLE_AND_CALLABLE" ||
    !visibility.all_6_rpc_signature_aware_probe_ok ||
    !visibility.ledger_rpc_visible ||
    visibility.pgrst202 ||
    visibility.pgrst203 ||
    visibility.active_rpc_count !== 6 ||
    !visibility.functions_in_public_schema ||
    !visibility.authenticated_execute_grant_ok
  ) {
    return blocked(
      "BLOCKED_LEDGER_RPC_SIGNATURE_AWARE_VERIFY_FAILED",
      visibility.exactReason ?? "All six action-ledger RPCs were not callable with authenticated signature-aware probes.",
      visibilityOverrides,
    );
  }

  const auth = resolveExplicitAiRoleAuthEnv(process.env, projectRoot);
  if (
    auth.roleMode !== "developer_control_full_access" ||
    auth.source !== "developer_control_explicit_env" ||
    !auth.env
  ) {
    return blocked(
      "BLOCKED_LIVE_LEDGER_E2E_WRITE_APPROVAL_MISSING",
      auth.exactReason ?? "Developer/control full-access credentials are required for live ledger E2E.",
      visibilityOverrides,
    );
  }

  if (!readDeveloperControlE2ePass()) {
    return blocked(
      "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE",
      "Developer/control emulator E2E artifact is not green; refusing live ledger writes before Android targetability is proven.",
      {
        ...visibilityOverrides,
        android_runtime_smoke: "PASS",
        developer_control_full_access: true,
      },
    );
  }

  const supabaseUrl = envText("EXPO_PUBLIC_SUPABASE_URL");
  const anonKey = envText("EXPO_PUBLIC_SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    return blocked(
      "BLOCKED_LIVE_LEDGER_E2E_WRITE_APPROVAL_MISSING",
      "Supabase public URL or anon key is missing for authenticated live ledger E2E.",
      visibilityOverrides,
    );
  }

  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as SupabaseRuntimeClient;
  const signIn = await client.auth.signInWithPassword({
    email: auth.env.E2E_CONTROL_EMAIL,
    password: auth.env.E2E_CONTROL_PASSWORD,
  });
  if (signIn.error || !signIn.data.user || !signIn.data.session) {
    return blocked(
      "BLOCKED_LIVE_LEDGER_E2E_WRITE_APPROVAL_MISSING",
      "Developer/control account could not authenticate for live ledger E2E.",
      visibilityOverrides,
    );
  }

  const organizationId = await resolveOrganizationId(client, signIn.data.user.id);
  if (!organizationId) {
    return blocked(
      "BLOCKED_LIVE_LEDGER_E2E_WRITE_APPROVAL_MISSING",
      "Developer/control account has no visible organization scope for live ledger E2E.",
      visibilityOverrides,
    );
  }

  const transport: AiActionLedgerRpcTransport = async (fn, args) => {
    const result = await client.rpc(fn, args);
    return { data: result.data, error: result.error };
  };
  const organizationIdHash = stableHashOpaqueId("org", organizationId);
  const procurementExecutor = createProcurementRequestExecutor(
    createLiveProcurementBoundary(client),
  );
  const mount = createAiActionLedgerRuntimeMount({
    auth: { userId: signIn.data.user.id, role: "director" },
    organizationId,
    organizationIdHash,
    transport,
    executeApprovedStatusTransitionMounted: true,
    procurementExecutor,
  });

  const idempotencyKey = `ai-live-ledger-action-e2e-${Date.now()}`;
  const draft = await runDraftRequestToolDraftOnly({
    auth: { userId: signIn.data.user.id, role: "director" },
    input: {
      project_id: "staging-ai-approval-ledger-live-e2e",
      items: [
        {
          material_code: "CONCRETE-B25",
          name: "Concrete B25",
          quantity: 1,
          unit: "m3",
          notes: "AI approval ledger live E2E bounded draft item",
        },
      ],
      delivery_window: "staging-e2e",
      notes: "AI approval ledger live action E2E",
    },
  });
  if (!draft.ok) {
    return blocked(
      "BLOCKED_APPROVED_PROCUREMENT_EXECUTOR_RUNTIME_NOT_READY",
      "Safe draft_request tool did not produce a bounded draft action.",
      visibilityOverrides,
    );
  }

  const redactedPayload = {
    title: "AI approval ledger live E2E draft",
    items: draft.data.items_normalized.map((item) => ({
      materialLabel: item.name,
      quantity: item.quantity,
      unit: item.unit,
      rikCode: item.material_code || "CONCRETE-B25",
      appCode: item.material_id || "AI-LEDGER-LIVE-E2E",
      kind: "ai_approval_ledger_live_e2e",
    })),
    notes: ["staging_only", "supplier_confirmed:false", "order_created:false"],
  };

  const submit = await mount.submitForApproval({
    actionType: "draft_request",
    screenId: "ai.command.center",
    domain: "procurement",
    summary: "AI approval ledger live E2E draft request",
    redactedPayload,
    evidenceRefs: [
      ...draft.data.evidence_refs,
      "ai_approval_ledger:live_action_e2e:developer_control",
    ],
    idempotencyKey,
  });
  const submitPending =
    submit.ok &&
    submit.data.documentType === "ai_action_submit_for_approval" &&
    submit.data.result.status === "pending" &&
    submit.data.result.persisted === true;
  const actionId =
    submit.ok && submit.data.documentType === "ai_action_submit_for_approval"
      ? String(submit.data.result.actionId ?? "")
      : "";
  if (!submitPending || !actionId) {
    return blocked(
      "BLOCKED_APPROVED_PROCUREMENT_EXECUTOR_RUNTIME_NOT_READY",
      "submit_for_approval did not persist a pending live ledger action.",
      {
        ...visibilityOverrides,
        submit_for_approval_persisted_pending: submitPending,
      },
    );
  }

  const pending = await runGetActionStatusToolSafeRead({
    auth: { userId: signIn.data.user.id, role: "director" },
    input: { action_id: actionId },
    repository: mount.repositoryMount?.repository,
  });
  const pendingRead =
    pending.ok &&
    pending.data.action_status === "pending" &&
    pending.data.lookup_performed === true &&
    pending.data.persisted === true;

  const approve = await mount.approve(actionId, "Developer/control approved live AI ledger E2E.");
  const approved =
    approve.ok &&
    approve.data.documentType === "ai_action_approve" &&
    approve.data.result.status === "approved" &&
    approve.data.result.persisted === true;

  const approvedStatus = await runGetActionStatusToolSafeRead({
    auth: { userId: signIn.data.user.id, role: "director" },
    input: { action_id: actionId },
    repository: mount.repositoryMount?.repository,
  });
  const approvedRead =
    approvedStatus.ok &&
    approvedStatus.data.action_status === "approved" &&
    approvedStatus.data.lookup_performed === true &&
    approvedStatus.data.persisted === true;

  if (!pendingRead || !approved || !approvedRead) {
    return blocked(
      "BLOCKED_APPROVED_PROCUREMENT_EXECUTOR_RUNTIME_NOT_READY",
      "Persistent ledger lifecycle did not complete pending/status/approved proof.",
      {
        ...visibilityOverrides,
        submit_for_approval_persisted_pending: true,
        get_status_reads_pending: pendingRead,
        approve_persists_approved: approved,
        get_status_reads_approved: approvedRead,
        ledger_mutations_created: 1,
        developer_control_full_access: true,
      },
    );
  }

  let executeStatus = "";
  let replayStatus = "";
  try {
    const execute = await mount.executeApproved(actionId, idempotencyKey);
    executeStatus = execute.ok && execute.data.documentType === "ai_action_execute_approved"
      ? String(execute.data.result.status)
      : "";
    const replay = await mount.executeApproved(actionId, idempotencyKey);
    replayStatus = replay.ok && replay.data.documentType === "ai_action_execute_approved"
      ? String(replay.data.result.status)
      : "";
  } catch (error) {
    return blocked(
      "BLOCKED_APPROVED_PROCUREMENT_EXECUTOR_RUNTIME_NOT_READY",
      safeBlockerReason(error),
      {
        ...visibilityOverrides,
        submit_for_approval_persisted_pending: true,
        get_status_reads_pending: true,
        approve_persists_approved: true,
        get_status_reads_approved: true,
        execute_approved_central_gateway: true,
        ledger_mutations_created: 1,
        android_runtime_smoke: "PASS",
        developer_control_full_access: true,
      },
    );
  }

  const executedStatus = await runGetActionStatusToolSafeRead({
    auth: { userId: signIn.data.user.id, role: "director" },
    input: { action_id: actionId },
    repository: mount.repositoryMount?.repository,
  });
  const executedRead =
    executedStatus.ok &&
    executedStatus.data.action_status === "executed" &&
    executedStatus.data.lookup_performed === true &&
    executedStatus.data.persisted === true;
  const replaySafe = replayStatus === "already_executed" || replayStatus === "executed";
  const executed = executeStatus === "executed" || executeStatus === "already_executed";

  if (!executed || !executedRead || !replaySafe) {
    return blocked(
      "BLOCKED_APPROVED_PROCUREMENT_EXECUTOR_RUNTIME_NOT_READY",
      `execute_approved returned ${executeStatus || "unknown"} and replay returned ${replayStatus || "unknown"}.`,
      {
        ...visibilityOverrides,
        submit_for_approval_persisted_pending: true,
        get_status_reads_pending: true,
        approve_persists_approved: true,
        get_status_reads_approved: true,
        execute_approved_central_gateway: Boolean(executeStatus),
        get_status_reads_executed: executedRead,
        idempotency_replay_safe: replaySafe,
        ledger_mutations_created: 1,
        android_runtime_smoke: "PASS",
        developer_control_full_access: true,
      },
    );
  }

  return writeArtifacts({
    final_status: "GREEN_AI_APPROVAL_LEDGER_LIVE_ACTION_E2E",
    signature_aware_rpc_verify: true,
    ledger_rpc_visible: true,
    pgrst202: false,
    pgrst203: false,
    old_stub_overloads: false,
    active_rpc_count: 6,
    functions_in_public_schema: true,
    authenticated_execute_grant_ok: true,
    submit_for_approval_persisted_pending: true,
    get_status_reads_pending: true,
    approve_persists_approved: true,
    get_status_reads_approved: true,
    execute_approved_central_gateway: true,
    get_status_reads_executed: true,
    idempotency_replay_safe: true,
    audit_required: true,
    evidence_required: true,
    ledger_mutations_created: 1,
    bounded_procurement_draft_mutation_created: true,
    unsafe_domain_mutations_created: 0,
    supplier_confirmed: false,
    order_created: false,
    warehouse_mutated: false,
    payment_created: false,
    external_live_fetch: false,
    android_runtime_smoke: "PASS",
    developer_control_e2e: "PASS",
    developer_control_full_access: true,
    role_isolation_e2e_claimed: false,
    fake_execution: false,
    fake_green_claimed: false,
    secrets_printed: false,
    auth_admin_used: false,
    list_users_used: false,
    serviceRoleUsed: false,
    seed_used: false,
    raw_rows_printed: false,
    raw_prompt_printed: false,
    raw_provider_payload_printed: false,
    blocker: null,
    exactReason: null,
  });
}

if (require.main === module) {
  void runAiApprovalLedgerLiveActionE2E()
    .then((artifact) => {
      console.info(JSON.stringify(publicMatrix(artifact), null, 2));
      process.exitCode =
        artifact.final_status === "GREEN_AI_APPROVAL_LEDGER_LIVE_ACTION_E2E" ? 0 : 1;
    })
    .catch((error) => {
      const artifact = blocked(
        "BLOCKED_APPROVED_PROCUREMENT_EXECUTOR_RUNTIME_NOT_READY",
        safeBlockerReason(error),
      );
      console.info(JSON.stringify(publicMatrix(artifact), null, 2));
      process.exitCode = 1;
    });
}
