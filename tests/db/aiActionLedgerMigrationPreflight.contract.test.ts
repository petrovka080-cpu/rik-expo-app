import {
  REQUIRED_AGENT_OWNER_FLAGS,
} from "../../scripts/env/checkRequiredAgentFlags";
import {
  preflightAiActionLedgerMigration,
  resolveAiActionLedgerDatabaseUrlEnv,
} from "../../scripts/db/preflightAiActionLedgerMigration";

function approvedEnv(extra: Record<string, string> = {}): Record<string, string> {
  return {
    ...Object.fromEntries(REQUIRED_AGENT_OWNER_FLAGS.map((key) => [key, "true"])),
    ...extra,
  };
}

describe("AI action ledger migration preflight", () => {
  it("checks owner approvals and database URL presence without printing values", () => {
    const result = preflightAiActionLedgerMigration(approvedEnv());

    expect(result).toMatchObject({
      status: "BLOCKED_DB_PREFLIGHT_FAILED",
      databaseUrlEnv: "missing",
      ownerFlagValuesPrinted: false,
      databaseUrlValuePrinted: false,
      sqlContentsPrinted: false,
      secretsPrinted: false,
      destructiveMigration: false,
      unboundedDml: false,
      selectStar: false,
      blocker: "BLOCKED_DB_PREFLIGHT_FAILED",
    });
    expect(result.ownerFlagsChecked).toEqual([...REQUIRED_AGENT_OWNER_FLAGS]);
    expect(JSON.stringify(result)).not.toContain("postgres://");
    expect(JSON.stringify(result)).not.toContain("=true");
  });

  it("can reach green preflight when all local safety gates and an approved DB URL env are present", () => {
    const result = preflightAiActionLedgerMigration(
      approvedEnv({ AI_ACTION_LEDGER_DATABASE_URL: "postgres://redacted-host/db" }),
    );

    expect(result).toMatchObject({
      status: "GREEN_AI_ACTION_LEDGER_MIGRATION_PREFLIGHT_READY",
      databaseUrlEnv: "present",
      databaseUrlValuePrinted: false,
      additiveOnly: true,
      rlsPoliciesRequired: true,
      indexesRequired: true,
      idempotencyConstraintRequired: true,
      verifyQueryPresent: true,
      rollbackOrForwardFixPlanPresent: true,
      blocker: null,
    });
    expect(JSON.stringify(result)).not.toContain("redacted-host");
  });

  it("resolves database URL as present or missing without exposing the selected key value", () => {
    expect(resolveAiActionLedgerDatabaseUrlEnv({})).toBe("missing");
    expect(resolveAiActionLedgerDatabaseUrlEnv({ POSTGRES_URL: "postgres://secret" })).toBe("present");
  });
});
