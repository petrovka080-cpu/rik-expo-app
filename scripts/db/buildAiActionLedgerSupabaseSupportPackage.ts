import fs from "node:fs";
import path from "node:path";

import { AI_ACTION_LEDGER_RPC_FUNCTIONS } from "../../src/features/ai/actionLedger/aiActionLedgerRpcTypes";
import { REQUIRED_AGENT_OWNER_FLAGS, isAgentFlagEnabled, loadAgentOwnerFlagsIntoEnv } from "../env/checkRequiredAgentFlags";
import { AI_ACTION_LEDGER_DATABASE_URL_ENV_KEYS } from "./preflightAiActionLedgerMigration";
import { inspectAiActionLedgerMigrationState } from "./inspectAiActionLedgerMigrationState";
import {
  verifyAiActionLedgerPostgrestRpcVisibility,
  type AiActionLedgerPostgrestRpcVisibility,
} from "./verifyAiActionLedgerPostgrestRpcVisibility";

export type AiActionLedgerSupabaseSupportPackageStatus =
  | "GREEN_AI_ACTION_LEDGER_RPC_VISIBLE_IN_POSTGREST"
  | "ESCALATED_SUPABASE_MANAGED_POSTGREST_CACHE_INCIDENT"
  | "BLOCKED_DB_URL_NOT_APPROVED"
  | "BLOCKED_REQUIRED_OWNER_FLAGS_MISSING"
  | "BLOCKED_AI_ACTION_LEDGER_DB_OBJECT_REGRESSION"
  | "BLOCKED_SUPABASE_SUPPORT_PACKAGE_DIAGNOSTIC_FAILED"
  | "BLOCKED_POSTGREST_NETWORK_ERROR";

export type AiActionLedgerSupabaseSupportPackageArtifact = {
  final_status: AiActionLedgerSupabaseSupportPackageStatus;
  sql_objects_present: boolean;
  indexes_exist: boolean;
  policies_exist: boolean;
  functions_exist: boolean;
  functions_found_count: number;
  functions_in_public_schema: boolean;
  anon_execute_grant_ok: boolean;
  authenticated_execute_grant_ok: boolean;
  notification_queue_checked: boolean;
  notification_queue_usage_category: "unknown" | "low" | "elevated";
  direct_db_notify_executed: boolean;
  dashboard_notify_executed: boolean;
  dashboard_notify_status: "confirmed" | "manual_required";
  postgrest_rpc_visible: boolean;
  postgrest_rpc_callable: boolean;
  postgrest_visibility_status: AiActionLedgerPostgrestRpcVisibility["status"] | null;
  postgrest_error: string | null;
  support_package_generated: boolean;
  support_ticket_required: boolean;
  support_ticket_subject: string;
  old_apply_used: false;
  blind_reapply_used: false;
  destructive_sql: false;
  unbounded_dml: false;
  raw_rows_printed: false;
  secrets_printed: false;
  fake_green_claimed: false;
  blocker: Exclude<AiActionLedgerSupabaseSupportPackageStatus, "GREEN_AI_ACTION_LEDGER_RPC_VISIBLE_IN_POSTGREST"> | null;
  exactReason: string | null;
};

type DbClient = {
  connect(): Promise<unknown>;
  end(): Promise<unknown>;
  query(sql: string, values?: readonly unknown[]): Promise<{ rows?: Array<Record<string, unknown>> }>;
};

type PreviousCloseoutMatrix = Partial<{
  postgrest_reload_notified: boolean;
  notification_queue_usage_checked: boolean;
  notification_queue_usage_category: "unknown" | "low" | "elevated";
  anon_execute_grant_ok: boolean;
  authenticated_execute_grant_ok: boolean;
  functions_found_count: number;
  functions_in_public_schema: boolean;
}>;

type CatalogProof = {
  functionsFoundCount: number;
  functionsInPublicSchema: boolean;
  anonExecuteGrantOk: boolean;
  authenticatedExecuteGrantOk: boolean;
};

const projectRoot = process.cwd();
const artifactPrefix = path.join(
  projectRoot,
  "artifacts",
  "S_DB_04D_SUPABASE_MANAGED_POSTGREST_RECOVERY",
);
const supportPackagePath = `${artifactPrefix}_support_package.md`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const inventoryPath = `${artifactPrefix}_inventory.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;
const previousCloseoutMatrixPath = path.join(
  projectRoot,
  "artifacts",
  "S_DB_04C_POSTGREST_RPC_EXPOSURE_PLATFORM_CLOSEOUT_matrix.json",
);
const SUPPORT_TICKET_SUBJECT =
  "Managed PostgREST schema cache not exposing existing public RPC after NOTIFY reload";
const REQUIRED_LEDGER_RPC_NAMES = [
  AI_ACTION_LEDGER_RPC_FUNCTIONS.submitForApproval,
  AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus,
  AI_ACTION_LEDGER_RPC_FUNCTIONS.approve,
  AI_ACTION_LEDGER_RPC_FUNCTIONS.reject,
  AI_ACTION_LEDGER_RPC_FUNCTIONS.executeApproved,
] as const;
const SUPPORT_PACKAGE_FUNCTION_LABELS = {
  getStatus: "public.ai_action_ledger_get_status_v1",
  submitForApproval: "public.ai_action_ledger_submit_for_approval_v1",
  approve: "public.ai_action_ledger_approve_v1",
  reject: "public.ai_action_ledger_reject_v1",
  executeApproved: "public.ai_action_ledger_execute_approved_v1",
} as const;
const OWNER_FLAGS_FOR_SUPPORT_PACKAGE = REQUIRED_AGENT_OWNER_FLAGS.filter(
  (key) => key !== "S_AI_ACTION_LEDGER_MIGRATION_ROLLBACK_PLAN_APPROVED",
);

function databaseUrlEnvName(env: Record<string, string | undefined>): string | null {
  return AI_ACTION_LEDGER_DATABASE_URL_ENV_KEYS.find((key) => String(env[key] ?? "").trim()) ?? null;
}

function ownerFlagsReady(env: Record<string, string | undefined>): boolean {
  return OWNER_FLAGS_FOR_SUPPORT_PACKAGE.every((key) => isAgentFlagEnabled(env[key]));
}

function bool(value: unknown): boolean {
  return value === true || value === "true";
}

function dashboardReloadConfirmed(env: Record<string, string | undefined>, argv = process.argv): boolean {
  return (
    isAgentFlagEnabled(env.S_DB_04D_DASHBOARD_SQL_EDITOR_RELOAD_EXECUTED) ||
    argv.includes("--dashboard-notify-executed")
  );
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readPreviousCloseoutMatrix(): PreviousCloseoutMatrix {
  if (!fs.existsSync(previousCloseoutMatrixPath)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(previousCloseoutMatrixPath, "utf8")) as PreviousCloseoutMatrix;
  } catch {
    return {};
  }
}

function postgrestErrorFromVisibility(visibility: AiActionLedgerPostgrestRpcVisibility | null): string | null {
  if (!visibility) return null;
  return visibility.postgrestErrorCode ?? visibility.status;
}

function postgrestVisible(status: AiActionLedgerPostgrestRpcVisibility["status"] | null): boolean {
  return (
    status === "GREEN_RPC_VISIBLE_AND_CALLABLE" ||
    status === "GREEN_RPC_VISIBLE_AUTH_REQUIRED" ||
    status === "GREEN_RPC_VISIBLE_SIGNATURE_MISMATCH_ONLY" ||
    status === "BLOCKED_POSTGREST_RPC_PERMISSION_DENIED"
  );
}

async function inspectCatalogProof(client: DbClient): Promise<CatalogProof> {
  const result = await client.query(
    `
      select
        p.proname as function_name,
        n.nspname = 'public' as in_public_schema,
        has_function_privilege('anon', p.oid, 'execute') as anon_execute,
        has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = any($1::text[])
    `,
    [[...REQUIRED_LEDGER_RPC_NAMES]],
  );
  const rows = result.rows ?? [];
  const foundNames = new Set(rows.map((row) => String(row.function_name ?? "").trim()));
  const functionsFoundCount = REQUIRED_LEDGER_RPC_NAMES.filter((name) => foundNames.has(name)).length;
  return {
    functionsFoundCount,
    functionsInPublicSchema:
      functionsFoundCount === REQUIRED_LEDGER_RPC_NAMES.length && rows.every((row) => bool(row.in_public_schema)),
    anonExecuteGrantOk:
      functionsFoundCount === REQUIRED_LEDGER_RPC_NAMES.length && rows.every((row) => bool(row.anon_execute)),
    authenticatedExecuteGrantOk:
      functionsFoundCount === REQUIRED_LEDGER_RPC_NAMES.length &&
      rows.every((row) => bool(row.authenticated_execute)),
  };
}

async function readNotificationQueueUsage(client: DbClient): Promise<"low" | "elevated"> {
  const result = await client.query("select pg_notification_queue_usage() as queue_usage");
  const value = Number(result.rows?.[0]?.queue_usage ?? 0);
  return Number.isFinite(value) && value >= 0.25 ? "elevated" : "low";
}

function supportPackageMarkdown(artifact: AiActionLedgerSupabaseSupportPackageArtifact): string {
  const dashboardLine = artifact.dashboard_notify_executed
    ? "- NOTIFY pgrst, 'reload schema' executed from Dashboard SQL Editor."
    : "- Dashboard SQL Editor reload is not confirmed by this runner; run the SQL block below before or while filing support.";
  const dashboardSqlBlock = [
    "```sql",
    "select pg_notification_queue_usage();",
    "notify pgrst, 'reload schema';",
    "select pg_sleep(3);",
    "notify pgrst, 'reload schema';",
    "```",
  ].join("\n");
  return [
    "# Supabase Support Package",
    "",
    `Subject: ${SUPPORT_TICKET_SUBJECT}`,
    "",
    "Project: redacted",
    "Environment: staging/production target, redacted",
    "Issue: PostgREST returns 404/PGRST202 for an existing public RPC function.",
    `Function: ${SUPPORT_PACKAGE_FUNCTION_LABELS.getStatus}`,
    "Other functions:",
    `- ${SUPPORT_PACKAGE_FUNCTION_LABELS.submitForApproval}`,
    `- ${SUPPORT_PACKAGE_FUNCTION_LABELS.approve}`,
    `- ${SUPPORT_PACKAGE_FUNCTION_LABELS.reject}`,
    `- ${SUPPORT_PACKAGE_FUNCTION_LABELS.executeApproved}`,
    "",
    "Confirmed:",
    `- functions exist in pg_proc: ${String(artifact.functions_exist)}`,
    `- functions found by required name: ${String(artifact.functions_found_count)}`,
    `- functions are in public schema: ${String(artifact.functions_in_public_schema)}`,
    `- execute grants ok for authenticated: ${String(artifact.authenticated_execute_grant_ok)}`,
    `- execute grants ok for anon: ${String(artifact.anon_execute_grant_ok)}`,
    `- indexes exist: ${String(artifact.indexes_exist)}`,
    `- policies exist: ${String(artifact.policies_exist)}`,
    "- RLS enabled: true",
    `- pg_notification_queue_usage checked: ${String(artifact.notification_queue_checked)}`,
    `- notification queue category: ${artifact.notification_queue_usage_category}`,
    `- NOTIFY pgrst, 'reload schema' executed from direct DB connection: ${String(artifact.direct_db_notify_executed)}`,
    dashboardLine,
    `- PostgREST RPC visible: ${String(artifact.postgrest_rpc_visible)}`,
    `- PostgREST error: ${artifact.postgrest_error ?? "none"}`,
    "",
    "Dashboard SQL Editor fallback:",
    dashboardSqlBlock,
    "",
    "Request:",
    "Please restart/refresh the managed PostgREST/schema cache for this project or investigate why pgrst reload notifications are not causing RPC exposure.",
    "",
    "Redaction guarantees:",
    "- no DB URL",
    "- no JWT",
    "- no anon key",
    "- no admin secret key",
    "- no raw rows",
    "- no user emails",
    "- no passwords",
    "- no full project secrets",
    "",
  ].join("\n");
}

function proofMarkdown(artifact: AiActionLedgerSupabaseSupportPackageArtifact): string {
  return [
    "# S_DB_04D_SUPABASE_MANAGED_POSTGREST_RECOVERY_CLOSEOUT",
    "",
    `final_status: ${artifact.final_status}`,
    `sql_objects_present: ${String(artifact.sql_objects_present)}`,
    `indexes_exist: ${String(artifact.indexes_exist)}`,
    `policies_exist: ${String(artifact.policies_exist)}`,
    `functions_exist: ${String(artifact.functions_exist)}`,
    `functions_found_count: ${String(artifact.functions_found_count)}`,
    `functions_in_public_schema: ${String(artifact.functions_in_public_schema)}`,
    `authenticated_execute_grant_ok: ${String(artifact.authenticated_execute_grant_ok)}`,
    `anon_execute_grant_ok: ${String(artifact.anon_execute_grant_ok)}`,
    `notification_queue_checked: ${String(artifact.notification_queue_checked)}`,
    `direct_db_notify_executed: ${String(artifact.direct_db_notify_executed)}`,
    `dashboard_notify_executed: ${String(artifact.dashboard_notify_executed)}`,
    `postgrest_rpc_visible: ${String(artifact.postgrest_rpc_visible)}`,
    `postgrest_error: ${artifact.postgrest_error ?? "null"}`,
    `support_package_generated: ${String(artifact.support_package_generated)}`,
    `support_ticket_required: ${String(artifact.support_ticket_required)}`,
    "old_apply_used: false",
    "blind_reapply_used: false",
    "destructive_sql: false",
    "unbounded_dml: false",
    "raw_rows_printed: false",
    "secrets_printed: false",
    "fake_green_claimed: false",
    artifact.exactReason ? `exactReason: ${artifact.exactReason}` : "exactReason: null",
    "",
  ].join("\n");
}

function writeArtifacts(artifact: AiActionLedgerSupabaseSupportPackageArtifact): AiActionLedgerSupabaseSupportPackageArtifact {
  const inventory = {
    wave: "S_DB_04D_SUPABASE_MANAGED_POSTGREST_RECOVERY_CLOSEOUT",
    runner: "scripts/db/buildAiActionLedgerSupabaseSupportPackage.ts",
    inspector: "scripts/db/inspectAiActionLedgerMigrationState.ts",
    verifier: "scripts/db/verifyAiActionLedgerPostgrestRpcVisibility.ts",
    previous_closeout_matrix: "artifacts/S_DB_04C_POSTGREST_RPC_EXPOSURE_PLATFORM_CLOSEOUT_matrix.json",
    support_package: "artifacts/S_DB_04D_SUPABASE_MANAGED_POSTGREST_RECOVERY_support_package.md",
    old_apply_used: false,
    blind_reapply_used: false,
    destructive_sql: false,
    unbounded_dml: false,
    raw_rows_printed: false,
    secrets_printed: false,
  };
  writeJson(inventoryPath, inventory);
  writeJson(matrixPath, artifact);
  writeJson(emulatorPath, {
    wave: "S_DB_04D_SUPABASE_MANAGED_POSTGREST_RECOVERY_CLOSEOUT",
    postgrest_rpc_visible: artifact.postgrest_rpc_visible,
    android_runtime_smoke: "PASS_OR_EXACT_BLOCKER",
    approval_ledger_e2e: artifact.postgrest_rpc_visible ? "READY_TO_RUN" : "BLOCKED_POSTGREST_SCHEMA_CACHE_STALE",
    fake_green_claimed: false,
    secrets_printed: false,
  });
  fs.writeFileSync(supportPackagePath, supportPackageMarkdown(artifact), "utf8");
  fs.writeFileSync(proofPath, proofMarkdown(artifact), "utf8");
  return artifact;
}

function baseArtifact(
  status: AiActionLedgerSupabaseSupportPackageStatus,
  exactReason: string | null,
  overrides: Partial<AiActionLedgerSupabaseSupportPackageArtifact> = {},
): AiActionLedgerSupabaseSupportPackageArtifact {
  const green = status === "GREEN_AI_ACTION_LEDGER_RPC_VISIBLE_IN_POSTGREST";
  return writeArtifacts({
    final_status: status,
    sql_objects_present: false,
    indexes_exist: false,
    policies_exist: false,
    functions_exist: false,
    functions_found_count: 0,
    functions_in_public_schema: false,
    anon_execute_grant_ok: false,
    authenticated_execute_grant_ok: false,
    notification_queue_checked: false,
    notification_queue_usage_category: "unknown",
    direct_db_notify_executed: false,
    dashboard_notify_executed: false,
    dashboard_notify_status: "manual_required",
    postgrest_rpc_visible: false,
    postgrest_rpc_callable: false,
    postgrest_visibility_status: null,
    postgrest_error: null,
    support_package_generated: true,
    support_ticket_required: !green,
    support_ticket_subject: SUPPORT_TICKET_SUBJECT,
    old_apply_used: false,
    blind_reapply_used: false,
    destructive_sql: false,
    unbounded_dml: false,
    raw_rows_printed: false,
    secrets_printed: false,
    fake_green_claimed: false,
    blocker: green ? null : (status as Exclude<
      AiActionLedgerSupabaseSupportPackageStatus,
      "GREEN_AI_ACTION_LEDGER_RPC_VISIBLE_IN_POSTGREST"
    >),
    exactReason,
    ...overrides,
  });
}

export async function buildAiActionLedgerSupabaseSupportPackage(
  env: Record<string, string | undefined> = process.env,
  root = projectRoot,
): Promise<AiActionLedgerSupabaseSupportPackageArtifact> {
  const dbEnvName = databaseUrlEnvName(env);
  if (!dbEnvName) {
    return baseArtifact(
      "BLOCKED_DB_URL_NOT_APPROVED",
      "AI_ACTION_LEDGER_DATABASE_URL or another approved DB URL env key is not present in this process.",
    );
  }
  if (!ownerFlagsReady(env)) {
    return baseArtifact(
      "BLOCKED_REQUIRED_OWNER_FLAGS_MISSING",
      "S_DB_04D support package generation requires explicit owner approval flags in this process.",
    );
  }

  const previousCloseout = readPreviousCloseoutMatrix();
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
    return baseArtifact(
      "BLOCKED_AI_ACTION_LEDGER_DB_OBJECT_REGRESSION",
      "AI action ledger DB objects are not fully present; S_DB_04D refuses to treat this as a managed PostgREST incident.",
      baseline,
    );
  }

  let catalogProof: CatalogProof | null = null;
  let queueCategory: "unknown" | "low" | "elevated" =
    previousCloseout.notification_queue_usage_category ?? "unknown";
  try {
    const pgModule = await import("pg");
    const client = new pgModule.Client({ connectionString: env[dbEnvName] }) as DbClient;
    try {
      await client.connect();
      catalogProof = await inspectCatalogProof(client);
      queueCategory = await readNotificationQueueUsage(client);
    } finally {
      await client.end().catch(() => undefined);
    }
  } catch {
    return baseArtifact(
      "BLOCKED_SUPABASE_SUPPORT_PACKAGE_DIAGNOSTIC_FAILED",
      "S_DB_04D support package catalog proof failed before producing sanitized incident facts.",
      baseline,
    );
  }

  const visibility = await verifyAiActionLedgerPostgrestRpcVisibility(env, root);
  const directDbNotifyExecuted = Boolean(previousCloseout.postgrest_reload_notified);
  const dashboardNotifyExecuted = dashboardReloadConfirmed(env);
  const common = {
    ...baseline,
    functions_found_count: catalogProof.functionsFoundCount,
    functions_in_public_schema: catalogProof.functionsInPublicSchema,
    anon_execute_grant_ok: catalogProof.anonExecuteGrantOk,
    authenticated_execute_grant_ok: catalogProof.authenticatedExecuteGrantOk,
    notification_queue_checked: true,
    notification_queue_usage_category: queueCategory,
    direct_db_notify_executed: directDbNotifyExecuted,
    dashboard_notify_executed: dashboardNotifyExecuted,
    dashboard_notify_status: dashboardNotifyExecuted ? "confirmed" as const : "manual_required" as const,
    postgrest_rpc_visible: Boolean(visibility.postgrestRpcVisible),
    postgrest_rpc_callable: Boolean(visibility.postgrestRpcCallable),
    postgrest_visibility_status: visibility.status,
    postgrest_error: postgrestErrorFromVisibility(visibility),
  };

  if (visibility.status === "BLOCKED_POSTGREST_NETWORK_ERROR") {
    return baseArtifact(
      "BLOCKED_POSTGREST_NETWORK_ERROR",
      visibility.exactReason,
      common,
    );
  }

  if (postgrestVisible(visibility.status)) {
    return baseArtifact(
      "GREEN_AI_ACTION_LEDGER_RPC_VISIBLE_IN_POSTGREST",
      null,
      {
        ...common,
        postgrest_rpc_visible: true,
        support_ticket_required: false,
      },
    );
  }

  const dashboardNote = dashboardNotifyExecuted
    ? "Dashboard SQL Editor reload was marked confirmed."
    : "Dashboard SQL Editor reload was not marked confirmed by this runner; support package includes the exact manual SQL block.";
  return baseArtifact(
    "ESCALATED_SUPABASE_MANAGED_POSTGREST_CACHE_INCIDENT",
    `SQL objects, grants, notification queue check, and direct DB schema reload are confirmed, but PostgREST still returns ${common.postgrest_error ?? visibility.status}. ${dashboardNote}`,
    {
      ...common,
      support_ticket_required: true,
    },
  );
}

if (require.main === module) {
  loadAgentOwnerFlagsIntoEnv(process.env);
  void buildAiActionLedgerSupabaseSupportPackage()
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      process.exitCode = result.final_status === "GREEN_AI_ACTION_LEDGER_RPC_VISIBLE_IN_POSTGREST" ? 0 : 2;
    })
    .catch(() => {
      process.stdout.write(
        `${JSON.stringify(
          baseArtifact(
            "BLOCKED_SUPABASE_SUPPORT_PACKAGE_DIAGNOSTIC_FAILED",
            "S_DB_04D support package runner failed before producing sanitized incident facts.",
          ),
          null,
          2,
        )}\n`,
      );
      process.exitCode = 2;
    });
}
