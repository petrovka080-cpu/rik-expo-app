import fs from "node:fs";
import path from "node:path";

import { AI_ACTION_LEDGER_APPLY_MIGRATION } from "./applyAiActionLedgerMigration";

export const AI_ACTION_LEDGER_VERIFY_QUERY =
  "select public.ai_action_ledger_verify_apply_v1();";

export type AiActionLedgerMigrationVerification = {
  status:
    | "GREEN_AI_ACTION_LEDGER_MIGRATION_VERIFY_PACKAGE_READY"
    | "BLOCKED_AI_ACTION_LEDGER_VERIFY_FAILED";
  migration: typeof AI_ACTION_LEDGER_APPLY_MIGRATION;
  verifyQuery: typeof AI_ACTION_LEDGER_VERIFY_QUERY;
  additiveOnly: boolean;
  rlsPoliciesRequired: boolean;
  indexesRequired: boolean;
  rollbackOrForwardFixPlanPresent: boolean;
  migrationHistoryProofRequired: boolean;
  rawRowsPrinted: false;
  secretsPrinted: false;
};

export function verifyAiActionLedgerMigrationPackage(
  projectRoot = process.cwd(),
): AiActionLedgerMigrationVerification {
  const source = fs.readFileSync(
    path.join(projectRoot, "supabase", "migrations", AI_ACTION_LEDGER_APPLY_MIGRATION),
    "utf8",
  );
  const additiveOnly =
    source.includes("Additive only") &&
    !/\b(drop|truncate)\b/i.test(source);
  const rlsPoliciesRequired =
    source.includes("create policy ai_action_ledger_update_executed_company_scope") &&
    source.includes("ai_action_ledger_actor_can_manage_company_v1");
  const indexesRequired =
    source.includes("create index if not exists ai_action_ledger_org_hash_status_created_idx") &&
    source.includes("create index if not exists ai_action_ledger_status_expires_idx");
  const rollbackOrForwardFixPlanPresent =
    source.includes("Forward-fix plan") && source.includes("Rollback plan");
  const migrationHistoryProofRequired = source.includes("Verify query");
  const ready =
    additiveOnly &&
    rlsPoliciesRequired &&
    indexesRequired &&
    rollbackOrForwardFixPlanPresent &&
    migrationHistoryProofRequired &&
    source.includes(AI_ACTION_LEDGER_VERIFY_QUERY);

  return {
    status: ready
      ? "GREEN_AI_ACTION_LEDGER_MIGRATION_VERIFY_PACKAGE_READY"
      : "BLOCKED_AI_ACTION_LEDGER_VERIFY_FAILED",
    migration: AI_ACTION_LEDGER_APPLY_MIGRATION,
    verifyQuery: AI_ACTION_LEDGER_VERIFY_QUERY,
    additiveOnly,
    rlsPoliciesRequired,
    indexesRequired,
    rollbackOrForwardFixPlanPresent,
    migrationHistoryProofRequired,
    rawRowsPrinted: false,
    secretsPrinted: false,
  };
}

function main(): void {
  const result = verifyAiActionLedgerMigrationPackage();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode =
    result.status === "GREEN_AI_ACTION_LEDGER_MIGRATION_VERIFY_PACKAGE_READY" ? 0 : 1;
}

if (require.main === module) {
  main();
}
