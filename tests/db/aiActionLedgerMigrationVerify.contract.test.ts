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
});
