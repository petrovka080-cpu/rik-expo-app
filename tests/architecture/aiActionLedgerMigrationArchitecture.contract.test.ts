import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

describe("AI action ledger migration architecture package", () => {
  it("contains the additive migration, apply runner, verify runner, and safety contracts", () => {
    const requiredFiles = [
      "supabase/migrations/20260513230000_ai_action_ledger_apply.sql",
      "scripts/db/applyAiActionLedgerMigration.ts",
      "scripts/db/verifyAiActionLedgerMigration.ts",
      "tests/db/aiActionLedgerMigrationSafety.contract.test.ts",
      "tests/db/aiActionLedgerMigrationVerify.contract.test.ts",
      "tests/db/aiActionLedgerRlsPolicy.contract.test.ts",
      "tests/db/aiActionLedgerVerifyQuery.contract.test.ts",
    ];

    for (const relativePath of requiredFiles) {
      expect(fs.existsSync(path.join(root, relativePath))).toBe(true);
    }

    const applyRunner = fs.readFileSync(
      path.join(root, "scripts/db/applyAiActionLedgerMigration.ts"),
      "utf8",
    );
    const flagChecker = fs.readFileSync(
      path.join(root, "scripts/env/checkRequiredAgentFlags.ts"),
      "utf8",
    );
    expect(applyRunner).toContain("REQUIRED_AGENT_OWNER_FLAGS");
    expect(flagChecker).toContain("S_AI_ACTION_LEDGER_MIGRATION_APPLY_APPROVED");
    expect(flagChecker).toContain("S_AI_ACTION_LEDGER_MIGRATION_VERIFY_APPROVED");
    expect(applyRunner).toContain("BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED");
    expect(applyRunner).toContain("approvalValuesPrinted: false");
    expect(applyRunner).toContain("dbWriteAttempted: false");
  });
});
