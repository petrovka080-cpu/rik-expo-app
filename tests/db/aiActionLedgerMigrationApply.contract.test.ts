import {
  REQUIRED_AGENT_OWNER_FLAGS,
} from "../../scripts/env/checkRequiredAgentFlags";
import {
  AI_ACTION_LEDGER_APPLY_MIGRATION,
  buildAiActionLedgerMigrationApplyPackage,
  runAiActionLedgerMigrationApply,
} from "../../scripts/db/applyAiActionLedgerMigration";

function approvedEnv(): Record<string, string> {
  return Object.fromEntries(REQUIRED_AGENT_OWNER_FLAGS.map((key) => [key, "true"]));
}

describe("AI action ledger migration apply approval package", () => {
  it("accepts only the exact owner approval flags and still does not print values or SQL", () => {
    const result = buildAiActionLedgerMigrationApplyPackage(approvedEnv());

    expect(result).toMatchObject({
      status: "GREEN_AI_ACTION_LEDGER_MIGRATION_PACKAGE_READY",
      migration: AI_ACTION_LEDGER_APPLY_MIGRATION,
      approvalValuesPrinted: false,
      dbWriteAttempted: false,
      sqlContentsPrinted: false,
      secretsPrinted: false,
      blocker: null,
    });
    expect(result.approvalFlagsChecked).toEqual([...REQUIRED_AGENT_OWNER_FLAGS]);
    expect(JSON.stringify(result)).not.toContain("=true");
    expect(JSON.stringify(result)).not.toContain("create table");
  });

  it("blocks when any exact owner approval flag is missing", () => {
    const env = approvedEnv();
    delete env.S_AI_ACTION_LEDGER_MIGRATION_VERIFY_APPROVED;

    const result = buildAiActionLedgerMigrationApplyPackage(env);

    expect(result).toMatchObject({
      status: "BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED",
      blocker: "BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED",
      dbWriteAttempted: false,
      approvalValuesPrinted: false,
    });
    expect(result.exactReason).toContain("every exact owner approval flag");
  });

  it("does not attempt DB writes when the bounded apply DB URL is missing", async () => {
    const result = await runAiActionLedgerMigrationApply(approvedEnv());

    expect(result).toMatchObject({
      status: "BLOCKED_DB_PREFLIGHT_FAILED",
      migration: AI_ACTION_LEDGER_APPLY_MIGRATION,
      databaseUrlEnv: "missing",
      databaseUrlValuePrinted: false,
      dbWriteAttempted: false,
      sqlContentsPrinted: false,
      rawRowsPrinted: false,
      secretsPrinted: false,
      destructiveMigration: false,
      unboundedDml: false,
      blocker: "BLOCKED_DB_PREFLIGHT_FAILED",
    });
    expect(JSON.stringify(result)).not.toContain("postgres://");
    expect(JSON.stringify(result)).not.toContain("=true");
  });
});
