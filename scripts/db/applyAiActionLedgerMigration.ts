import fs from "node:fs";
import path from "node:path";

import {
  REQUIRED_AGENT_OWNER_FLAGS,
  loadAgentOwnerFlagsIntoEnv,
} from "../env/checkRequiredAgentFlags";
import {
  buildBoundedMigrationPlan,
  formatBoundedMigrationPlanForLog,
  normalizeMigrationFilename,
} from "../release/boundedMigrationRunner.shared";

export const AI_ACTION_LEDGER_APPLY_MIGRATION =
  "20260513230000_ai_action_ledger_apply.sql";

const APPLY_APPROVAL_FLAGS = REQUIRED_AGENT_OWNER_FLAGS;

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

function hasEveryEnabled(env: Record<string, string | undefined>, keys: readonly string[]): boolean {
  return keys.every((key) => isEnabled(env[key]));
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
  env: Record<string, string | undefined> = process.env,
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
  const approved = hasEveryEnabled(env, APPLY_APPROVAL_FLAGS);

  if (!approved) {
    return {
      status: "BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED",
      migration: AI_ACTION_LEDGER_APPLY_MIGRATION,
      boundedPlan: formatBoundedMigrationPlanForLog(plan),
      approvalFlagsChecked: [...APPLY_APPROVAL_FLAGS],
      approvalValuesPrinted: false,
      dbWriteAttempted: false,
      sqlContentsPrinted: false,
      secretsPrinted: false,
      blocker: "BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED",
      exactReason:
        "AI action ledger migration apply requires every exact owner approval flag for DB apply, DB write, migration apply, verify, and rollback plan.",
    };
  }

  return {
    status: "GREEN_AI_ACTION_LEDGER_MIGRATION_PACKAGE_READY",
    migration: AI_ACTION_LEDGER_APPLY_MIGRATION,
    boundedPlan: formatBoundedMigrationPlanForLog(plan),
    approvalFlagsChecked: [...APPLY_APPROVAL_FLAGS],
    approvalValuesPrinted: false,
    dbWriteAttempted: false,
    sqlContentsPrinted: false,
    secretsPrinted: false,
    blocker: null,
    exactReason: null,
  };
}

function main(): void {
  loadAgentOwnerFlagsIntoEnv(process.env);
  const result = buildAiActionLedgerMigrationApplyPackage();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode =
    result.status === "GREEN_AI_ACTION_LEDGER_MIGRATION_PACKAGE_READY" ? 0 : 2;
}

if (require.main === module) {
  main();
}
