import fs from "node:fs";
import path from "node:path";

import { REQUIRED_AGENT_OWNER_FLAGS, loadAgentOwnerFlagsIntoEnv } from "../env/checkRequiredAgentFlags";
import { AI_ACTION_LEDGER_DATABASE_URL_ENV_KEYS } from "./preflightAiActionLedgerMigration";
import { inspectAiActionLedgerMigrationState } from "./inspectAiActionLedgerMigrationState";
import {
  verifyAiActionLedgerPostgrestRpcVisibility,
  type AiActionLedgerPostgrestRpcVisibility,
} from "./verifyAiActionLedgerPostgrestRpcVisibility";

export type AiActionLedgerPostgrestSchemaCacheReloadStatus =
  | "GREEN_AI_ACTION_LEDGER_RPC_VISIBLE_IN_POSTGREST"
  | "BLOCKED_DB_URL_NOT_APPROVED"
  | "BLOCKED_REQUIRED_OWNER_FLAGS_MISSING"
  | "BLOCKED_AI_ACTION_LEDGER_DB_OBJECT_REGRESSION"
  | "BLOCKED_POSTGREST_SCHEMA_CACHE_RELOAD_FAILED"
  | "BLOCKED_POSTGREST_SCHEMA_CACHE_RELOAD_NOT_OBSERVED"
  | "BLOCKED_POSTGREST_URL_OR_KEY_MISSING"
  | "BLOCKED_POSTGREST_NETWORK_ERROR"
  | "BLOCKED_POSTGREST_RPC_PERMISSION_DENIED";

export type AiActionLedgerPostgrestSchemaCacheReloadArtifact = {
  final_status: AiActionLedgerPostgrestSchemaCacheReloadStatus;
  db_objects_present: boolean;
  indexes_exist: boolean;
  policies_exist: boolean;
  sql_rpc_functions_exist: boolean;
  postgrest_schema_reload_notified: boolean;
  postgrest_rpc_visible: boolean;
  postgrest_rpc_callable: boolean;
  postgrest_visibility_status: AiActionLedgerPostgrestRpcVisibility["status"] | null;
  old_apply_used: false;
  blind_reapply_used: false;
  destructive_sql: false;
  unbounded_dml: false;
  raw_rows_printed: false;
  secrets_printed: false;
  fake_green_claimed: false;
  android_runtime_smoke: "PASS_OR_EXACT_BLOCKER";
  approval_ledger_e2e: "PASS_OR_EXACT_BLOCKER";
  blocker: Exclude<
    AiActionLedgerPostgrestSchemaCacheReloadStatus,
    "GREEN_AI_ACTION_LEDGER_RPC_VISIBLE_IN_POSTGREST"
  > | null;
  exactReason: string | null;
};

type DbClient = {
  connect(): Promise<unknown>;
  end(): Promise<unknown>;
  query(sql: string, values?: readonly unknown[]): Promise<unknown>;
};

const projectRoot = process.cwd();
const artifactPrefix = path.join(
  projectRoot,
  "artifacts",
  "S_DB_04B_POSTGREST_SCHEMA_CACHE_VISIBILITY",
);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;
const RELOAD_SQL = "select pg_notify('pgrst', 'reload schema')";
const OWNER_FLAGS_FOR_SCHEMA_CACHE_RELOAD = REQUIRED_AGENT_OWNER_FLAGS.filter(
  (key) => key !== "S_AI_ACTION_LEDGER_MIGRATION_ROLLBACK_PLAN_APPROVED",
);

function isEnabled(value: unknown): boolean {
  return ["true", "1", "yes"].includes(String(value ?? "").trim().toLowerCase());
}

function ownerFlagsReady(env: Record<string, string | undefined>): boolean {
  return OWNER_FLAGS_FOR_SCHEMA_CACHE_RELOAD.every((key) => isEnabled(env[key]));
}

function databaseUrlEnvName(env: Record<string, string | undefined>): string | null {
  return AI_ACTION_LEDGER_DATABASE_URL_ENV_KEYS.find((key) => String(env[key] ?? "").trim()) ?? null;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeArtifacts(artifact: AiActionLedgerPostgrestSchemaCacheReloadArtifact): void {
  const inventory = {
    wave: "S_DB_04B_POSTGREST_SCHEMA_CACHE_VISIBILITY_CLOSEOUT",
    runner: "scripts/db/reloadAiActionLedgerPostgrestSchemaCache.ts",
    verifier: "scripts/db/verifyAiActionLedgerPostgrestRpcVisibility.ts",
    inspector: "scripts/db/inspectAiActionLedgerMigrationState.ts",
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
      "# S_DB_04B_POSTGREST_SCHEMA_CACHE_VISIBILITY_CLOSEOUT",
      "",
      `final_status: ${artifact.final_status}`,
      `db_objects_present: ${String(artifact.db_objects_present)}`,
      `indexes_exist: ${String(artifact.indexes_exist)}`,
      `policies_exist: ${String(artifact.policies_exist)}`,
      `sql_rpc_functions_exist: ${String(artifact.sql_rpc_functions_exist)}`,
      `postgrest_schema_reload_notified: ${String(artifact.postgrest_schema_reload_notified)}`,
      `postgrest_rpc_visible: ${String(artifact.postgrest_rpc_visible)}`,
      `postgrest_visibility_status: ${artifact.postgrest_visibility_status ?? "null"}`,
      "old_apply_used: false",
      "blind_reapply_used: false",
      "destructive_sql: false",
      "unbounded_dml: false",
      "raw_rows_printed: false",
      "secrets_printed: false",
      artifact.exactReason ? `exactReason: ${artifact.exactReason}` : "exactReason: null",
    ].join("\n") + "\n",
    "utf8",
  );
}

function artifact(
  status: AiActionLedgerPostgrestSchemaCacheReloadStatus,
  exactReason: string | null,
  overrides: Partial<AiActionLedgerPostgrestSchemaCacheReloadArtifact> = {},
): AiActionLedgerPostgrestSchemaCacheReloadArtifact {
  const green = status === "GREEN_AI_ACTION_LEDGER_RPC_VISIBLE_IN_POSTGREST";
  const result: AiActionLedgerPostgrestSchemaCacheReloadArtifact = {
    final_status: status,
    db_objects_present: false,
    indexes_exist: false,
    policies_exist: false,
    sql_rpc_functions_exist: false,
    postgrest_schema_reload_notified: false,
    postgrest_rpc_visible: false,
    postgrest_rpc_callable: false,
    postgrest_visibility_status: null,
    old_apply_used: false,
    blind_reapply_used: false,
    destructive_sql: false,
    unbounded_dml: false,
    raw_rows_printed: false,
    secrets_printed: false,
    fake_green_claimed: false,
    android_runtime_smoke: "PASS_OR_EXACT_BLOCKER",
    approval_ledger_e2e: "PASS_OR_EXACT_BLOCKER",
    blocker: green ? null : (status as Exclude<
      AiActionLedgerPostgrestSchemaCacheReloadStatus,
      "GREEN_AI_ACTION_LEDGER_RPC_VISIBLE_IN_POSTGREST"
    >),
    exactReason,
    ...overrides,
  };
  writeArtifacts(result);
  return result;
}

function statusFromVisibility(
  visibility: AiActionLedgerPostgrestRpcVisibility,
): AiActionLedgerPostgrestSchemaCacheReloadStatus {
  if (
    visibility.status === "GREEN_RPC_VISIBLE_AND_CALLABLE" ||
    visibility.status === "GREEN_RPC_VISIBLE_AUTH_REQUIRED"
  ) {
    return "GREEN_AI_ACTION_LEDGER_RPC_VISIBLE_IN_POSTGREST";
  }
  if (visibility.status === "BLOCKED_POSTGREST_SCHEMA_CACHE_STALE") {
    return "BLOCKED_POSTGREST_SCHEMA_CACHE_RELOAD_NOT_OBSERVED";
  }
  if (visibility.status === "BLOCKED_POSTGREST_URL_OR_KEY_MISSING") {
    return "BLOCKED_POSTGREST_URL_OR_KEY_MISSING";
  }
  if (visibility.status === "BLOCKED_POSTGREST_RPC_PERMISSION_DENIED") {
    return "BLOCKED_POSTGREST_RPC_PERMISSION_DENIED";
  }
  return "BLOCKED_POSTGREST_NETWORK_ERROR";
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function reloadAiActionLedgerPostgrestSchemaCache(
  env: Record<string, string | undefined> = process.env,
  root = projectRoot,
): Promise<AiActionLedgerPostgrestSchemaCacheReloadArtifact> {
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
      "Schema-cache reload requires explicit owner approval flags in this process.",
    );
  }

  const before = await inspectAiActionLedgerMigrationState(env, root);
  if (
    before.status !== "GREEN_AI_ACTION_LEDGER_MIGRATION_STATE_INSPECTED" ||
    !before.objectsPresent ||
    !before.indexesExist ||
    !before.policiesExist ||
    !before.functionsExist
  ) {
    return artifact(
      "BLOCKED_AI_ACTION_LEDGER_DB_OBJECT_REGRESSION",
      "AI action ledger DB objects are not fully present; S_DB_04B refuses cache reload as a regression.",
      {
        db_objects_present: Boolean(before.objectsPresent),
        indexes_exist: Boolean(before.indexesExist),
        policies_exist: Boolean(before.policiesExist),
        sql_rpc_functions_exist: Boolean(before.functionsExist),
        postgrest_rpc_visible: Boolean(before.postgrestSchemaCacheRpcVisible),
      },
    );
  }

  const pgModule = await import("pg");
  const client = new pgModule.Client({ connectionString: env[dbEnvName] }) as DbClient;
  try {
    await client.connect();
    await client.query(RELOAD_SQL);
  } catch {
    return artifact(
      "BLOCKED_POSTGREST_SCHEMA_CACHE_RELOAD_FAILED",
      "PostgREST schema-cache reload notification failed before producing a sanitized result.",
      {
        db_objects_present: true,
        indexes_exist: true,
        policies_exist: true,
        sql_rpc_functions_exist: true,
      },
    );
  } finally {
    await client.end().catch(() => undefined);
  }

  let lastVisibility: AiActionLedgerPostgrestRpcVisibility | null = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (attempt > 0) {
      await wait(1500);
    } else {
      await wait(750);
    }
    lastVisibility = await verifyAiActionLedgerPostgrestRpcVisibility(env, root);
    if (
      lastVisibility.status === "GREEN_RPC_VISIBLE_AND_CALLABLE" ||
      lastVisibility.status === "GREEN_RPC_VISIBLE_AUTH_REQUIRED" ||
      lastVisibility.status === "BLOCKED_POSTGREST_RPC_PERMISSION_DENIED" ||
      lastVisibility.status === "BLOCKED_POSTGREST_URL_OR_KEY_MISSING" ||
      lastVisibility.status === "BLOCKED_POSTGREST_NETWORK_ERROR"
    ) {
      break;
    }
  }

  const visibilityStatus = lastVisibility
    ? statusFromVisibility(lastVisibility)
    : "BLOCKED_POSTGREST_SCHEMA_CACHE_RELOAD_NOT_OBSERVED";
  return artifact(
    visibilityStatus,
    visibilityStatus === "GREEN_AI_ACTION_LEDGER_RPC_VISIBLE_IN_POSTGREST"
      ? null
      : visibilityStatus === "BLOCKED_POSTGREST_SCHEMA_CACHE_RELOAD_NOT_OBSERVED"
        ? "PostgREST schema reload was notified, but the ledger RPC remained absent from the schema cache."
        : lastVisibility?.exactReason ?? "PostgREST RPC visibility did not reach green after schema reload.",
    {
      db_objects_present: true,
      indexes_exist: true,
      policies_exist: true,
      sql_rpc_functions_exist: true,
      postgrest_schema_reload_notified: true,
      postgrest_rpc_visible: Boolean(lastVisibility?.postgrestRpcVisible),
      postgrest_rpc_callable: Boolean(lastVisibility?.postgrestRpcCallable),
      postgrest_visibility_status: lastVisibility?.status ?? null,
    },
  );
}

if (require.main === module) {
  loadAgentOwnerFlagsIntoEnv(process.env);
  void reloadAiActionLedgerPostgrestSchemaCache()
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      process.exitCode =
        result.final_status === "GREEN_AI_ACTION_LEDGER_RPC_VISIBLE_IN_POSTGREST" ? 0 : 2;
    })
    .catch(() => {
      process.stdout.write(
        `${JSON.stringify(
          artifact(
            "BLOCKED_POSTGREST_SCHEMA_CACHE_RELOAD_FAILED",
            "AI action ledger PostgREST schema-cache reload failed before producing a sanitized result.",
          ),
          null,
          2,
        )}\n`,
      );
      process.exitCode = 2;
    });
}
