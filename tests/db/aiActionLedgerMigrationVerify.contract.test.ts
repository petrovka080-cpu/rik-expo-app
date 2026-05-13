import fs from "node:fs";
import path from "node:path";

import {
  AI_ACTION_LEDGER_VERIFY_QUERY,
  verifyAiActionLedgerMigrationPackage,
} from "../../scripts/db/verifyAiActionLedgerMigration";

describe("AI action ledger migration verify package", () => {
  it("declares the redacted verify query and package invariants", () => {
    const result = verifyAiActionLedgerMigrationPackage();

    expect(result).toMatchObject({
      status: "GREEN_AI_ACTION_LEDGER_MIGRATION_VERIFY_PACKAGE_READY",
      verifyQuery: AI_ACTION_LEDGER_VERIFY_QUERY,
      additiveOnly: true,
      rlsPoliciesRequired: true,
      indexesRequired: true,
      rollbackOrForwardFixPlanPresent: true,
      migrationHistoryProofRequired: true,
      rawRowsPrinted: false,
      secretsPrinted: false,
    });
  });

  it("verifies every mounted runtime RPC needed by approval persistence", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "supabase",
        "migrations",
        "20260513230000_ai_action_ledger_apply.sql",
      ),
      "utf8",
    );

    expect(source).toContain("ai_action_ledger_submit_for_approval_v1");
    expect(source).toContain("ai_action_ledger_get_status_v1");
    expect(source).toContain("ai_action_ledger_approve_v1");
    expect(source).toContain("ai_action_ledger_reject_v1");
    expect(source).toContain("ai_action_ledger_execute_approved_v1");
    expect(source).toContain("'submitForApprovalRpcPresent'");
    expect(source).toContain("'approveRpcPresent'");
    expect(source).toContain("'rejectRpcPresent'");
  });
});
