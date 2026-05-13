import fs from "node:fs";
import path from "node:path";

import {
  canRepairAiActionLedgerHistory,
  repairAiActionLedgerMigrationHistory,
} from "../../scripts/db/repairAiActionLedgerMigrationHistory";

describe("AI action ledger migration history repair", () => {
  it("allows history-only repair only for objects-present/history-missing state", () => {
    expect(canRepairAiActionLedgerHistory("STATE_B_OBJECTS_PRESENT_HISTORY_MISSING")).toBe(true);
    expect(canRepairAiActionLedgerHistory("STATE_A_OBJECTS_AND_HISTORY_PRESENT")).toBe(false);
    expect(canRepairAiActionLedgerHistory("STATE_C_OBJECTS_MISSING_HISTORY_MISSING")).toBe(false);
    expect(canRepairAiActionLedgerHistory("STATE_D_PARTIAL_OBJECTS_HISTORY_MISSING")).toBe(false);
    expect(canRepairAiActionLedgerHistory("STATE_E_HISTORY_PRESENT_OBJECTS_MISSING")).toBe(false);
    expect(canRepairAiActionLedgerHistory(null)).toBe(false);
  });

  it("blocks safely when DB URL is absent", async () => {
    const result = await repairAiActionLedgerMigrationHistory({}, process.cwd());

    expect(result).toMatchObject({
      status: "BLOCKED_DB_URL_NOT_APPROVED",
      historyRepairUsed: false,
      migrationSqlReapplied: false,
      ledgerDataModified: false,
      destructiveMigration: false,
      unboundedDml: false,
      rawRowsPrinted: false,
      secretsPrinted: false,
    });
  });

  it("does not re-run migration SQL or touch ledger data", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/db/repairAiActionLedgerMigrationHistory.ts"),
      "utf8",
    );

    expect(source).toContain("insert into supabase_migrations.schema_migrations");
    expect(source).toContain("where not exists");
    expect(source).not.toContain("executeMigrationSql");
    expect(source).not.toContain("readAiActionLedgerApplyMigration");
    expect(source).not.toMatch(/\b(drop|truncate)\b/i);
    expect(source).not.toMatch(/\bdelete\s+from\b/i);
    expect(source).not.toMatch(/\bupdate\s+public\.ai_action_ledger\b/i);
  });
});
