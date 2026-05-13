import fs from "node:fs";
import path from "node:path";

export const AI_ACTION_LEDGER_APPLY_MIGRATION =
  "20260513230000_ai_action_ledger_apply.sql";

export function readAiActionLedgerApplyMigration(projectRoot: string): {
  file: typeof AI_ACTION_LEDGER_APPLY_MIGRATION;
  sqlSource: string;
} {
  return {
    file: AI_ACTION_LEDGER_APPLY_MIGRATION,
    sqlSource: fs.readFileSync(
      path.join(projectRoot, "supabase", "migrations", AI_ACTION_LEDGER_APPLY_MIGRATION),
      "utf8",
    ),
  };
}
