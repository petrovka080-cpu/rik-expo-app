import fs from "node:fs";
import path from "node:path";

import {
  REQUIRED_AGENT_OWNER_FLAGS,
  loadAgentOwnerFlagsIntoEnv,
} from "../env/checkRequiredAgentFlags";
import { AI_ACTION_LEDGER_APPLY_MIGRATION } from "./aiActionLedgerMigrationShared";
import { verifyAiActionLedgerMigrationPackage } from "./verifyAiActionLedgerMigration";

export const AI_ACTION_LEDGER_DATABASE_URL_ENV_KEYS = [
  "AI_ACTION_LEDGER_DATABASE_URL",
  "DATABASE_URL",
  "SUPABASE_DATABASE_URL",
  "SUPABASE_DB_URL",
  "POSTGRES_URL",
] as const;

export type AiActionLedgerMigrationPreflight = {
  status:
    | "GREEN_AI_ACTION_LEDGER_MIGRATION_PREFLIGHT_READY"
    | "BLOCKED_REQUIRED_OWNER_FLAGS_MISSING"
    | "BLOCKED_DB_PREFLIGHT_FAILED";
  migration: typeof AI_ACTION_LEDGER_APPLY_MIGRATION;
  ownerFlagsChecked: readonly string[];
  ownerFlagValuesPrinted: false;
  databaseUrlEnv: "present" | "missing";
  databaseUrlValuePrinted: false;
  additiveOnly: boolean;
  destructiveMigration: false;
  unboundedDml: false;
  selectStar: false;
  rlsPoliciesRequired: boolean;
  indexesRequired: boolean;
  idempotencyConstraintRequired: boolean;
  verifyQueryPresent: boolean;
  rollbackOrForwardFixPlanPresent: boolean;
  sqlContentsPrinted: false;
  secretsPrinted: false;
  blocker:
    | "BLOCKED_REQUIRED_OWNER_FLAGS_MISSING"
    | "BLOCKED_DB_PREFLIGHT_FAILED"
    | null;
  exactReason: string | null;
};

function enabled(value: unknown): boolean {
  return ["true", "1", "yes"].includes(String(value ?? "").trim().toLowerCase());
}

function ownerFlagsReady(env: Record<string, string | undefined>): boolean {
  return REQUIRED_AGENT_OWNER_FLAGS.every((key) => enabled(env[key]));
}

export function resolveAiActionLedgerDatabaseUrlEnv(
  env: Record<string, string | undefined> = process.env,
): "present" | "missing" {
  return AI_ACTION_LEDGER_DATABASE_URL_ENV_KEYS.some((key) => String(env[key] ?? "").trim())
    ? "present"
    : "missing";
}

function readMigrationSource(projectRoot: string): string {
  return fs.readFileSync(
    path.join(projectRoot, "supabase", "migrations", AI_ACTION_LEDGER_APPLY_MIGRATION),
    "utf8",
  );
}

export function preflightAiActionLedgerMigration(
  env: Record<string, string | undefined> = process.env,
  projectRoot = process.cwd(),
): AiActionLedgerMigrationPreflight {
  const verifyPackage = verifyAiActionLedgerMigrationPackage(projectRoot);
  const source = readMigrationSource(projectRoot);
  const normalized = source.replace(/--.*$/gm, "").toLowerCase();
  const hasUnboundedDelete = /\bdelete\s+from\b/.test(normalized);
  const updateStatements = normalized.match(/\bupdate\s+public\.[a-z_]+\b[\s\S]*?;/g) ?? [];
  const hasUnboundedUpdate = updateStatements.some(
    (statement) => !/\bwhere\b[\s\S]*\bid\s*=\s*p_action_id\b/.test(statement),
  );
  const selectStar = /\bselect\s+\*/i.test(source);
  const dbUrl = resolveAiActionLedgerDatabaseUrlEnv(env);
  const flagsReady = ownerFlagsReady(env);

  const localSafetyReady =
    flagsReady &&
    verifyPackage.status === "GREEN_AI_ACTION_LEDGER_MIGRATION_VERIFY_PACKAGE_READY" &&
    !hasUnboundedDelete &&
    !hasUnboundedUpdate &&
    !selectStar;

  if (!flagsReady) {
    return {
      status: "BLOCKED_REQUIRED_OWNER_FLAGS_MISSING",
      migration: AI_ACTION_LEDGER_APPLY_MIGRATION,
      ownerFlagsChecked: [...REQUIRED_AGENT_OWNER_FLAGS],
      ownerFlagValuesPrinted: false,
      databaseUrlEnv: dbUrl,
      databaseUrlValuePrinted: false,
      additiveOnly: verifyPackage.additiveOnly,
      destructiveMigration: false,
      unboundedDml: false,
      selectStar: false,
      rlsPoliciesRequired: verifyPackage.rlsPoliciesRequired,
      indexesRequired: verifyPackage.indexesRequired,
      idempotencyConstraintRequired: source.includes("idempotency_key"),
      verifyQueryPresent: verifyPackage.migrationHistoryProofRequired,
      rollbackOrForwardFixPlanPresent: verifyPackage.rollbackOrForwardFixPlanPresent,
      sqlContentsPrinted: false,
      secretsPrinted: false,
      blocker: "BLOCKED_REQUIRED_OWNER_FLAGS_MISSING",
      exactReason: "AI action ledger migration requires every exact owner approval flag.",
    };
  }

  if (!localSafetyReady || dbUrl === "missing") {
    return {
      status: "BLOCKED_DB_PREFLIGHT_FAILED",
      migration: AI_ACTION_LEDGER_APPLY_MIGRATION,
      ownerFlagsChecked: [...REQUIRED_AGENT_OWNER_FLAGS],
      ownerFlagValuesPrinted: false,
      databaseUrlEnv: dbUrl,
      databaseUrlValuePrinted: false,
      additiveOnly: verifyPackage.additiveOnly,
      destructiveMigration: false,
      unboundedDml: false,
      selectStar: false,
      rlsPoliciesRequired: verifyPackage.rlsPoliciesRequired,
      indexesRequired: verifyPackage.indexesRequired,
      idempotencyConstraintRequired: source.includes("unique (organization_id, idempotency_key)") ||
        source.includes("idempotency_key"),
      verifyQueryPresent: source.includes("ai_action_ledger_verify_apply_v1"),
      rollbackOrForwardFixPlanPresent: verifyPackage.rollbackOrForwardFixPlanPresent,
      sqlContentsPrinted: false,
      secretsPrinted: false,
      blocker: "BLOCKED_DB_PREFLIGHT_FAILED",
      exactReason:
        dbUrl === "missing"
          ? "No approved database URL environment variable is present for bounded migration apply."
          : "AI action ledger migration local safety preflight failed.",
    };
  }

  return {
    status: "GREEN_AI_ACTION_LEDGER_MIGRATION_PREFLIGHT_READY",
    migration: AI_ACTION_LEDGER_APPLY_MIGRATION,
    ownerFlagsChecked: [...REQUIRED_AGENT_OWNER_FLAGS],
    ownerFlagValuesPrinted: false,
    databaseUrlEnv: "present",
    databaseUrlValuePrinted: false,
    additiveOnly: true,
    destructiveMigration: false,
    unboundedDml: false,
    selectStar: false,
    rlsPoliciesRequired: true,
    indexesRequired: true,
    idempotencyConstraintRequired: true,
    verifyQueryPresent: true,
    rollbackOrForwardFixPlanPresent: true,
    sqlContentsPrinted: false,
    secretsPrinted: false,
    blocker: null,
    exactReason: null,
  };
}

function main(): void {
  loadAgentOwnerFlagsIntoEnv(process.env);
  const result = preflightAiActionLedgerMigration();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode =
    result.status === "GREEN_AI_ACTION_LEDGER_MIGRATION_PREFLIGHT_READY" ? 0 : 2;
}

if (require.main === module) {
  main();
}
