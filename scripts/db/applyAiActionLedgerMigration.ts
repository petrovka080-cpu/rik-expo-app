import fs from "node:fs";
import path from "node:path";

import {
  buildBoundedMigrationPlan,
  formatBoundedMigrationPlanForLog,
  normalizeMigrationFilename,
} from "../release/boundedMigrationRunner.shared";

export const AI_ACTION_LEDGER_APPLY_MIGRATION =
  "20260513230000_ai_action_ledger_apply.sql";

const APPLY_APPROVAL_FLAGS = [
  "S_DB_MIGRATION_APPLY_APPROVED",
  "S_PRODUCTION_DB_MIGRATION_APPLY_APPROVED",
  "S_STAGING_DB_MIGRATION_APPLY_APPROVED",
] as const;

const ADDITIVE_APPROVAL_FLAGS = [
  "S_ADDITIVE_MIGRATIONS_APPROVED",
  "S_ADDITIVE_PRODUCTION_MIGRATIONS_APPROVED",
  "S_ADDITIVE_STAGING_MIGRATIONS_APPROVED",
] as const;

type ApplyStatus =
  | "BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED"
  | "GREEN_AI_ACTION_LEDGER_MIGRATION_PACKAGE_READY";

export type AiActionLedgerMigrationApplyPackage = {
  status: ApplyStatus;
  migration: typeof AI_ACTION_LEDGER_APPLY_MIGRATION;
  boundedPlan: Record<string, unknown>;
  approvalFlagsChecked: readonly string[];
  approvalValuesPrinted: false;
  dbWriteAttempted: false;
  sqlContentsPrinted: false;
  secretsPrinted: false;
  blocker: "BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED" | null;
  exactReason: string | null;
};

function isEnabled(value: unknown): boolean {
  return value === "1" || value === "true" || value === "TRUE" || value === "yes";
}

function hasAnyEnabled(env: NodeJS.ProcessEnv, keys: readonly string[]): boolean {
  return keys.some((key) => isEnabled(env[key]));
}

function readLocalMigration(projectRoot: string): { file: string; sqlSource: string } {
  const migrationPath = path.join(
    projectRoot,
    "supabase",
    "migrations",
    AI_ACTION_LEDGER_APPLY_MIGRATION,
  );
  return {
    file: AI_ACTION_LEDGER_APPLY_MIGRATION,
    sqlSource: fs.readFileSync(migrationPath, "utf8"),
  };
}

export function buildAiActionLedgerMigrationApplyPackage(
  env: NodeJS.ProcessEnv = process.env,
  projectRoot = process.cwd(),
): AiActionLedgerMigrationApplyPackage {
  const migration = readLocalMigration(projectRoot);
  const plan = buildBoundedMigrationPlan({
    mode: "plan",
    allowlist: [normalizeMigrationFilename(AI_ACTION_LEDGER_APPLY_MIGRATION)],
    localMigrations: [migration],
    remoteMigrations: [],
    destructiveApproval: false,
  });
  const applyApproved = hasAnyEnabled(env, APPLY_APPROVAL_FLAGS);
  const additiveApproved = hasAnyEnabled(env, ADDITIVE_APPROVAL_FLAGS);
  const approved = applyApproved && additiveApproved;

  if (!approved) {
    return {
      status: "BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED",
      migration: AI_ACTION_LEDGER_APPLY_MIGRATION,
      boundedPlan: formatBoundedMigrationPlanForLog(plan),
      approvalFlagsChecked: [...APPLY_APPROVAL_FLAGS, ...ADDITIVE_APPROVAL_FLAGS],
      approvalValuesPrinted: false,
      dbWriteAttempted: false,
      sqlContentsPrinted: false,
      secretsPrinted: false,
      blocker: "BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED",
      exactReason:
        "AI action ledger migration apply requires an existing DB migration apply approval flag and an additive migration approval flag.",
    };
  }

  return {
    status: "GREEN_AI_ACTION_LEDGER_MIGRATION_PACKAGE_READY",
    migration: AI_ACTION_LEDGER_APPLY_MIGRATION,
    boundedPlan: formatBoundedMigrationPlanForLog(plan),
    approvalFlagsChecked: [...APPLY_APPROVAL_FLAGS, ...ADDITIVE_APPROVAL_FLAGS],
    approvalValuesPrinted: false,
    dbWriteAttempted: false,
    sqlContentsPrinted: false,
    secretsPrinted: false,
    blocker: null,
    exactReason: null,
  };
}

function main(): void {
  const result = buildAiActionLedgerMigrationApplyPackage();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode =
    result.status === "GREEN_AI_ACTION_LEDGER_MIGRATION_PACKAGE_READY" ? 0 : 2;
}

if (require.main === module) {
  main();
}
