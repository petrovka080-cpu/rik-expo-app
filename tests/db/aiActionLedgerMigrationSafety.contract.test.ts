import fs from "node:fs";
import path from "node:path";

import {
  AI_ACTION_LEDGER_APPLY_MIGRATION,
  buildAiActionLedgerMigrationApplyPackage,
} from "../../scripts/db/applyAiActionLedgerMigration";

const migrationPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  AI_ACTION_LEDGER_APPLY_MIGRATION,
);

describe("AI action ledger migration safety package", () => {
  const source = fs.readFileSync(migrationPath, "utf8");

  it("is additive and never prints approval values or SQL contents from the apply package", () => {
    expect(source).toContain("Additive only");
    expect(source).toContain("Apply only after explicit migration approval");
    expect(source).not.toMatch(/\b(drop|truncate|delete\s+from)\b/i);
    expect(source).not.toMatch(/\bselect\s+\*/i);
    expect(source).not.toMatch(/\breturning\s+\*/i);
    expect(source).not.toMatch(/\bservice_role\b|\bauth\.admin\b|\blistUsers\b/i);

    const packageResult = buildAiActionLedgerMigrationApplyPackage({ NODE_ENV: "test" });
    expect(packageResult).toMatchObject({
      status: "BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED",
      approvalValuesPrinted: false,
      dbWriteAttempted: false,
      sqlContentsPrinted: false,
      secretsPrinted: false,
      blocker: "BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED",
    });
  });

  it("uses bounded updates scoped by action id and approved status", () => {
    expect(source).toContain("where id = p_action_id");
    expect(source).toContain("and status = 'approved'");
    expect(source).toContain("ai_action_ledger_no_raw_payload_v1");
    expect(source).toContain("insert into public.ai_action_ledger_audit");
  });
});
