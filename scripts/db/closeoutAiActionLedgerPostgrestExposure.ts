import fs from "node:fs";
import path from "node:path";

import { AI_ACTION_LEDGER_RPC_FUNCTIONS } from "../../src/features/ai/actionLedger/aiActionLedgerRpcTypes";
import { REQUIRED_AGENT_OWNER_FLAGS, loadAgentOwnerFlagsIntoEnv } from "../env/checkRequiredAgentFlags";
import { runAiApprovalLedgerPersistenceMaestro } from "../e2e/runAiApprovalLedgerPersistenceMaestro";
import { AI_ACTION_LEDGER_DATABASE_URL_ENV_KEYS } from "./preflightAiActionLedgerMigration";
import { inspectAiActionLedgerMigrationState } from "./inspectAiActionLedgerMigrationState";
import {
  verifyAiActionLedgerPostgrestRpcVisibility,
  type AiActionLedgerPostgrestRpcVisibility,
} from "./verifyAiActionLedgerPostgrestRpcVisibility";

export type AiActionLedgerPostgrestExposureCloseoutStatus =
  | "GREEN_AI_ACTION_LEDGER_RPC_VISIBLE_AND_CALLABLE"
  | "BLOCKED_DB_URL_NOT_APPROVED"
  | "BLOCKED_REQUIRED_OWNER_FLAGS_MISSING"
  | "BLOCKED_AI_ACTION_LEDGER_DB_OBJECT_REGRESSION"
  | "BLOCKED_POSTGREST_EXPOSURE_DIAGNOSTIC_FAILED"
  | "BLOCKED_POSTGREST_RPC_PERMISSION_DENIED"
  | "BLOCKED_POSTGREST_NETWORK_ERROR"
  | "BLOCKED_APPROVAL_LEDGER_E2E_NOT_GREEN"
  | "BLOCKED_SUPABASE_MANAGED_POSTGREST_RESTART_OR_SUPPORT_REQUIRED";

export type AiActionLedgerPostgrestExposureCloseoutArtifact = {
  final_status: AiActionLedgerPostgrestExposureCloseoutStatus;
  sql_objects_present: boolean;
  indexes_exist: boolean;
  policies_exist: boolean;
  functions_exist: boolean;
  functions_found_count: number;
  functions_in_public_schema: boolean;
  anon_execute_grant_ok: boolean;
  authenticated_execute_grant_ok: boolean;
  bounded_grant_repair_executed: boolean;
  grant_repair_function_count: number;
  notification_queue_usage_checked: boolean;
  notification_queue_usage_category: "unknown" | "low" | "elevated";
  notification_queue_nudge_executed: boolean;
  postgrest_reload_notified: boolean;
  postgrest_rpc_visible: boolean;
  postgrest_rpc_callable: boolean;
  postgrest_visibility_status: AiActionLedgerPostgrestRpcVisibility["status"] | null;
  postgrest_error: string | null;
  manual_dashboard_reload_required: boolean;
  approval_ledger_e2e: "PASS" | "PASS_OR_EXACT_BLOCKER" | string;
  old_apply_used: false;
  blind_reapply_used: false;
  destructive_sql: false;
  unbounded_dml: false;
  raw_rows_printed: false;
  secrets_printed: false;
  fake_green_claimed: false;
  blocker: Exclude<AiActionLedgerPostgrestExposureCloseoutStatus, "GREEN_AI_ACTION_LEDGER_RPC_VISIBLE_AND_CALLABLE"> | null;
  exactReason: string | null;
};

type DbClient = {
  connect(): Promise<unknown>;
  end(): Promise<unknown>;
  query(sql: string, values?: readonly unknown[]): Promise<{ rows?: Array<Record<string, unknown>> }>;
};

type FunctionExposureProof = {
  functionsFoundCount: number;
  functionsInPublicSchema: boolean;
  anonExecuteGrantOk: boolean;
  authenticatedExecuteGrantOk: boolean;
  missingAuthenticatedGrantRegprocedures: string[];
};

const projectRoot = process.cwd();
const artifactPrefix = path.join(
  projectRoot,
  "artifacts",
  "S_DB_04C_POSTGREST_RPC_EXPOSURE_PLATFORM_CLOSEOUT",
);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;
const OWNER_FLAGS_FOR_POSTGREST_EXPOSURE_CLOSEOUT = REQUIRED_AGENT_OWNER_FLAGS.filter(
  (key) => key !== "S_AI_ACTION_LEDGER_MIGRATION_ROLLBACK_PLAN_APPROVED",
);
const REQUIRED_LEDGER_RPC_NAMES = [
  AI_ACTION_LEDGER_RPC_FUNCTIONS.submitForApproval,
  AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus,
  AI_ACTION_LEDGER_RPC_FUNCTIONS.approve,
  AI_ACTION_LEDGER_RPC_FUNCTIONS.reject,
  AI_ACTION_LEDGER_RPC_FUNCTIONS.executeApproved,
] as const;
const POLL_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 5000;

function isEnabled(value: unknown): boolean {
  return ["true", "1", "yes"].includes(String(value ?? "").trim().toLowerCase());
}

function ownerFlagsReady(env: Record<string, string | undefined>): boolean {
  return OWNER_FLAGS_FOR_POSTGREST_EXPOSURE_CLOSEOUT.every((key) => isEnabled(env[key]));
}

function databaseUrlEnvName(env: Record<string, string | undefined>): string | null {
  return AI_ACTION_LEDGER_DATABASE_URL_ENV_KEYS.find((key) => String(env[key] ?? "").trim()) ?? null;
}

function bool(value: unknown): boolean {
  return value === true || value === "true";
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeArtifacts(artifact: AiActionLedgerPostgrestExposureCloseoutArtifact): void {
  const inventory = {
    wave: "S_DB_04C_POSTGREST_RPC_EXPOSURE_PLATFORM_CLOSEOUT",
    runner: "scripts/db/closeoutAiActionLedgerPostgrestExposure.ts",
    verifier: "scripts/db/verifyAiActionLedgerPostgrestRpcVisibility.ts",
    inspector: "scripts/db/inspectAiActionLedgerMigrationState.ts",
    e2e_runner: "scripts/e2e/runAiApprovalLedgerPersistenceMaestro.ts",
    old_apply_used: false,
    blind_reapply_used: false,
    destructive_sql: false,
    unbounded_dml: false,
    raw_rows_printed: false,
    secrets_printed: false,
  };
  writeJson(inventoryPath, inventory);
  writeJson(matrixPath, artifact);
  writeJson(emulatorPath, artifact);
  fs.writeFileSync(
    proofPath,
    [
      "# S_DB_04C_POSTGREST_RPC_EXPOSURE_PLATFORM_CLOSEOUT",
      "",
      `final_status: ${artifact.final_status}`,
      `sql_objects_present: ${String(artifact.sql_objects_present)}`,
      `indexes_exist: ${String(artifact.indexes_exist)}`,
      `policies_exist: ${String(artifact.policies_exist)}`,
      `functions_exist: ${String(artifact.functions_exist)}`,
      `functions_found_count: ${String(artifact.functions_found_count)}`,
      `functions_in_public_schema: ${String(artifact.functions_in_public_schema)}`,
      `anon_execute_grant_ok: ${String(artifact.anon_execute_grant_ok)}`,
      `authenticated_execute_grant_ok: ${String(artifact.authenticated_execute_grant_ok)}`,
      `bounded_grant_repair_executed: ${String(artifact.bounded_grant_repair_executed)}`,
      `notification_queue_usage_checked: ${String(artifact.notification_queue_usage_checked)}`,
      `notification_queue_nudge_executed: ${String(artifact.notification_queue_nudge_executed)}`,
      `postgrest_reload_notified: ${String(artifact.postgrest_reload_notified)}`,
      `postgrest_rpc_visible: ${String(artifact.postgrest_rpc_visible)}`,
      `postgrest_visibility_status: ${artifact.postgrest_visibility_status ?? "null"}`,
      `postgrest_error: ${artifact.postgrest_error ?? "null"}`,
      `manual_dashboard_reload_required: ${String(artifact.manual_dashboard_reload_required)}`,
      `approval_ledger_e2e: ${artifact.approval_ledger_e2e}`,
      "old_apply_used: false",
      "blind_reapply_used: false",
      "destructive_sql: false",
      "unbounded_dml: false",
      "raw_rows_printed: false",
      "secrets_printed: false",
      "fake_green_claimed: false",
      artifact.manual_dashboard_reload_required
        ? "manual_step: Supabase Dashboard SQL Editor -> NOTIFY pgrst, 'reload schema'; select pg_notification_queue_usage(); NOTIFY pgrst, 'reload schema';"
        : "manual_step: null",
      artifact.exactReason ? `exactReason: ${artifact.exactReason}` : "exactReason: null",
    ].join("\n") + "\n",
    "utf8",
  );
}

function artifact(
  status: AiActionLedgerPostgrestExposureCloseoutStatus,
  exactReason: string | null,
  overrides: Partial<AiActionLedgerPostgrestExposureCloseoutArtifact> = {},
): AiActionLedgerPostgrestExposureCloseoutArtifact {
  const green = status === "GREEN_AI_ACTION_LEDGER_RPC_VISIBLE_AND_CALLABLE";
  const result: AiActionLedgerPostgrestExposureCloseoutArtifact = {
    final_status: status,
    sql_objects_present: false,
    indexes_exist: false,
    policies_exist: false,
    functions_exist: false,
    functions_found_count: 0,
    functions_in_public_schema: false,
    anon_execute_grant_ok: false,
    authenticated_execute_grant_ok: false,
    bounded_grant_repair_executed: false,
    grant_repair_function_count: 0,
    notification_queue_usage_checked: false,
    notification_queue_usage_category: "unknown",
    notification_queue_nudge_executed: false,
    postgrest_reload_notified: false,
    postgrest_rpc_visible: false,
    postgrest_rpc_callable: false,
    postgrest_visibility_status: null,
    postgrest_error: null,
    manual_dashboard_reload_required: false,
    approval_ledger_e2e: "PASS_OR_EXACT_BLOCKER",
    old_apply_used: false,
    blind_reapply_used: false,
    destructive_sql: false,
    unbounded_dml: false,
    raw_rows_printed: false,
    secrets_printed: false,
    fake_green_claimed: false,
    blocker: green ? null : (status as Exclude<
      AiActionLedgerPostgrestExposureCloseoutStatus,
      "GREEN_AI_ACTION_LEDGER_RPC_VISIBLE_AND_CALLABLE"
    >),
    exactReason,
    ...overrides,
  };
  writeArtifacts(result);
  return result;
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function inspectFunctionExposure(client: DbClient): Promise<FunctionExposureProof> {
  const result = await client.query(
    `
      select
        p.proname as function_name,
        p.oid::regprocedure::text as regprocedure,
        n.nspname = 'public' as in_public_schema,
        has_function_privilege('anon', p.oid, 'execute') as anon_execute,
        has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = any($1::text[])
      order by p.proname
    `,
    [[...REQUIRED_LEDGER_RPC_NAMES]],
  );
  const rows = result.rows ?? [];
  const foundNames = new Set(rows.map((row) => String(row.function_name ?? "").trim()));
  const requiredNamesFound = REQUIRED_LEDGER_RPC_NAMES.filter((name) => foundNames.has(name)).length;
  const missingAuthenticatedGrantRegprocedures = rows
    .filter((row) => !bool(row.authenticated_execute))
    .map((row) => String(row.regprocedure ?? "").trim())
    .filter((value) => value.startsWith("public.ai_action_ledger_"));

  return {
    functionsFoundCount: requiredNamesFound,
    functionsInPublicSchema: requiredNamesFound === REQUIRED_LEDGER_RPC_NAMES.length &&
      rows.every((row) => bool(row.in_public_schema)),
    anonExecuteGrantOk: requiredNamesFound === REQUIRED_LEDGER_RPC_NAMES.length &&
      rows.every((row) => bool(row.anon_execute)),
    authenticatedExecuteGrantOk: requiredNamesFound === REQUIRED_LEDGER_RPC_NAMES.length &&
      rows.every((row) => bool(row.authenticated_execute)),
    missingAuthenticatedGrantRegprocedures,
  };
}

async function repairAuthenticatedExecuteGrants(
  client: DbClient,
  regprocedures: readonly string[],
): Promise<number> {
  for (const regprocedure of regprocedures) {
    await client.query(`grant execute on function ${regprocedure} to authenticated`);
  }
  return regprocedures.length;
}

async function readNotificationQueueUsage(client: DbClient): Promise<"low" | "elevated"> {
  const result = await client.query("select pg_notification_queue_usage() as queue_usage");
  const value = Number(result.rows?.[0]?.queue_usage ?? 0);
  return Number.isFinite(value) && value >= 0.25 ? "elevated" : "low";
}

function isPostgrestVisible(status: AiActionLedgerPostgrestRpcVisibility["status"]): boolean {
  return (
    status === "GREEN_RPC_VISIBLE_AND_CALLABLE" ||
    status === "GREEN_RPC_VISIBLE_AUTH_REQUIRED" ||
    status === "GREEN_RPC_VISIBLE_SIGNATURE_MISMATCH_ONLY" ||
    status === "BLOCKED_POSTGREST_RPC_PERMISSION_DENIED"
  );
}

function postgrestErrorFromVisibility(visibility: AiActionLedgerPostgrestRpcVisibility | null): string | null {
  if (!visibility) return null;
  return visibility.postgrestErrorCode ?? visibility.status;
}

async function pollPostgrestVisibility(
  env: Record<string, string | undefined>,
  root: string,
): Promise<AiActionLedgerPostgrestRpcVisibility | null> {
  let lastVisibility: AiActionLedgerPostgrestRpcVisibility | null = null;
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
    if (attempt > 0) {
      await wait(POLL_INTERVAL_MS);
    }
    lastVisibility = await verifyAiActionLedgerPostgrestRpcVisibility(env, root);
    if (
      isPostgrestVisible(lastVisibility.status) ||
      lastVisibility.status === "BLOCKED_POSTGREST_URL_OR_KEY_MISSING" ||
      lastVisibility.status === "BLOCKED_POSTGREST_NETWORK_ERROR"
    ) {
      break;
    }
  }
  return lastVisibility;
}

export async function closeoutAiActionLedgerPostgrestExposure(
  env: Record<string, string | undefined> = process.env,
  root = projectRoot,
): Promise<AiActionLedgerPostgrestExposureCloseoutArtifact> {
  const dbEnvName = databaseUrlEnvName(env);
  if (!dbEnvName) {
    return artifact(
      "BLOCKED_DB_URL_NOT_APPROVED",
      "AI_ACTION_LEDGER_DATABASE_URL or another approved DB URL env key is not present in this process.",
    );
  }
  if (!ownerFlagsReady(env)) {
    return artifact(
      "BLOCKED_REQUIRED_OWNER_FLAGS_MISSING",
      "PostgREST exposure closeout requires explicit owner approval flags in this process.",
    );
  }

  const inspection = await inspectAiActionLedgerMigrationState(env, root);
  const baseline = {
    sql_objects_present: Boolean(inspection.objectsPresent),
    indexes_exist: Boolean(inspection.indexesExist),
    policies_exist: Boolean(inspection.policiesExist),
    functions_exist: Boolean(inspection.functionsExist),
  };
  if (
    inspection.status !== "GREEN_AI_ACTION_LEDGER_MIGRATION_STATE_INSPECTED" ||
    !inspection.objectsPresent ||
    !inspection.indexesExist ||
    !inspection.policiesExist ||
    !inspection.functionsExist
  ) {
    return artifact(
      "BLOCKED_AI_ACTION_LEDGER_DB_OBJECT_REGRESSION",
      "AI action ledger DB objects are not fully present; S_DB_04C refuses PostgREST exposure closeout as a regression.",
      baseline,
    );
  }

  let exposureProof: FunctionExposureProof | null = null;
  let grantRepairCount = 0;
  let notificationQueueUsageCategory: "unknown" | "low" | "elevated" = "unknown";
  const pgModule = await import("pg");
  const client = new pgModule.Client({ connectionString: env[dbEnvName] }) as DbClient;
  try {
    await client.connect();
    exposureProof = await inspectFunctionExposure(client);
    if (
      exposureProof.functionsFoundCount !== REQUIRED_LEDGER_RPC_NAMES.length ||
      !exposureProof.functionsInPublicSchema
    ) {
      return artifact(
        "BLOCKED_AI_ACTION_LEDGER_DB_OBJECT_REGRESSION",
        "AI action ledger RPC functions are not all present in the public exposed schema.",
        {
          ...baseline,
          functions_found_count: exposureProof.functionsFoundCount,
          functions_in_public_schema: exposureProof.functionsInPublicSchema,
          anon_execute_grant_ok: exposureProof.anonExecuteGrantOk,
          authenticated_execute_grant_ok: exposureProof.authenticatedExecuteGrantOk,
        },
      );
    }

    if (!exposureProof.authenticatedExecuteGrantOk) {
      grantRepairCount = await repairAuthenticatedExecuteGrants(
        client,
        exposureProof.missingAuthenticatedGrantRegprocedures,
      );
      exposureProof = await inspectFunctionExposure(client);
    }

    notificationQueueUsageCategory = await readNotificationQueueUsage(client);
    await client.query("select pg_notify('pgrst', 'reload schema')");
  } catch {
    return artifact(
      "BLOCKED_POSTGREST_EXPOSURE_DIAGNOSTIC_FAILED",
      "AI action ledger PostgREST exposure closeout failed during bounded catalog/grant/cache diagnostics.",
      {
        ...baseline,
        functions_found_count: exposureProof?.functionsFoundCount ?? 0,
        functions_in_public_schema: Boolean(exposureProof?.functionsInPublicSchema),
        anon_execute_grant_ok: Boolean(exposureProof?.anonExecuteGrantOk),
        authenticated_execute_grant_ok: Boolean(exposureProof?.authenticatedExecuteGrantOk),
        bounded_grant_repair_executed: grantRepairCount > 0,
        grant_repair_function_count: grantRepairCount,
        notification_queue_usage_category: notificationQueueUsageCategory,
      },
    );
  } finally {
    await client.end().catch(() => undefined);
  }

  const afterNotifyVisibility = await pollPostgrestVisibility(env, root);
  const common = {
    ...baseline,
    functions_found_count: exposureProof?.functionsFoundCount ?? 0,
    functions_in_public_schema: Boolean(exposureProof?.functionsInPublicSchema),
    anon_execute_grant_ok: Boolean(exposureProof?.anonExecuteGrantOk),
    authenticated_execute_grant_ok: Boolean(exposureProof?.authenticatedExecuteGrantOk),
    bounded_grant_repair_executed: grantRepairCount > 0,
    grant_repair_function_count: grantRepairCount,
    notification_queue_usage_checked: true,
    notification_queue_usage_category: notificationQueueUsageCategory,
    notification_queue_nudge_executed: true,
    postgrest_reload_notified: true,
    postgrest_rpc_visible: Boolean(afterNotifyVisibility?.postgrestRpcVisible),
    postgrest_rpc_callable: Boolean(afterNotifyVisibility?.postgrestRpcCallable),
    postgrest_visibility_status: afterNotifyVisibility?.status ?? null,
    postgrest_error: postgrestErrorFromVisibility(afterNotifyVisibility),
  };

  if (!exposureProof?.authenticatedExecuteGrantOk) {
    return artifact(
      "BLOCKED_POSTGREST_RPC_PERMISSION_DENIED",
      "Authenticated execute grants are still not verified after bounded grant repair.",
      common,
    );
  }

  if (!afterNotifyVisibility || afterNotifyVisibility.status === "BLOCKED_POSTGREST_NETWORK_ERROR") {
    return artifact(
      "BLOCKED_POSTGREST_NETWORK_ERROR",
      afterNotifyVisibility?.exactReason ?? "PostgREST visibility probe failed after queue nudge and schema reload.",
      common,
    );
  }

  if (afterNotifyVisibility.status === "BLOCKED_POSTGREST_RPC_PERMISSION_DENIED") {
    return artifact(
      "BLOCKED_POSTGREST_RPC_PERMISSION_DENIED",
      afterNotifyVisibility.exactReason,
      common,
    );
  }

  if (!isPostgrestVisible(afterNotifyVisibility.status)) {
    const e2e = await runAiApprovalLedgerPersistenceMaestro();
    return artifact(
      "BLOCKED_SUPABASE_MANAGED_POSTGREST_RESTART_OR_SUPPORT_REQUIRED",
      "SQL objects, public schema placement, authenticated execute grants, notification queue check, and schema reload notify all passed, but managed PostgREST still returns PGRST202 for the ledger RPC.",
      {
        ...common,
        manual_dashboard_reload_required: true,
        approval_ledger_e2e: e2e.final_status,
      },
    );
  }

  const e2e = await runAiApprovalLedgerPersistenceMaestro();
  if (e2e.final_status !== "GREEN_AI_APPROVAL_LEDGER_PERSISTENCE_RUNTIME_READY") {
    return artifact(
      "BLOCKED_APPROVAL_LEDGER_E2E_NOT_GREEN",
      e2e.exactReason ?? String(e2e.final_status),
      {
        ...common,
        postgrest_rpc_visible: true,
        approval_ledger_e2e: e2e.final_status,
      },
    );
  }

  return artifact(
    "GREEN_AI_ACTION_LEDGER_RPC_VISIBLE_AND_CALLABLE",
    null,
    {
      ...common,
      postgrest_rpc_visible: true,
      postgrest_rpc_callable: true,
      approval_ledger_e2e: "PASS",
    },
  );
}

if (require.main === module) {
  loadAgentOwnerFlagsIntoEnv(process.env);
  void closeoutAiActionLedgerPostgrestExposure()
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      process.exitCode =
        result.final_status === "GREEN_AI_ACTION_LEDGER_RPC_VISIBLE_AND_CALLABLE" ? 0 : 2;
    })
    .catch(() => {
      process.stdout.write(
        `${JSON.stringify(
          artifact(
            "BLOCKED_POSTGREST_EXPOSURE_DIAGNOSTIC_FAILED",
            "AI action ledger PostgREST exposure closeout failed before producing a sanitized result.",
          ),
          null,
          2,
        )}\n`,
      );
      process.exitCode = 2;
    });
}
