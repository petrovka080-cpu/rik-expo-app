import fs from "node:fs";
import path from "node:path";

import {
  classifyAiActionLedgerMigrationState,
  inspectAiActionLedgerMigrationState,
} from "../../scripts/db/inspectAiActionLedgerMigrationState";

const allObjects = {
  tableExists: true,
  indexesExist: true,
  rlsEnabled: true,
  policiesExist: true,
  submitRpcExists: true,
  getStatusRpcExists: true,
  approveRpcExists: true,
  rejectRpcExists: true,
  executeApprovedRpcExists: true,
  migrationHistoryTableExists: true,
};

describe("AI action ledger migration state inspection", () => {
  it("classifies objects/history combinations before any repair or reapply decision", () => {
    expect(classifyAiActionLedgerMigrationState({
      ...allObjects,
      migrationHistoryRecordExists: true,
    })).toBe("STATE_A_OBJECTS_AND_HISTORY_PRESENT");
    expect(classifyAiActionLedgerMigrationState({
      ...allObjects,
      migrationHistoryRecordExists: false,
    })).toBe("STATE_B_OBJECTS_PRESENT_HISTORY_MISSING");
    expect(classifyAiActionLedgerMigrationState({
      tableExists: false,
      indexesExist: false,
      rlsEnabled: false,
      policiesExist: false,
      submitRpcExists: false,
      getStatusRpcExists: false,
      approveRpcExists: false,
      rejectRpcExists: false,
      executeApprovedRpcExists: false,
      migrationHistoryTableExists: false,
      migrationHistoryRecordExists: false,
    })).toBe("STATE_C_OBJECTS_MISSING_HISTORY_MISSING");
    expect(classifyAiActionLedgerMigrationState({
      ...allObjects,
      approveRpcExists: false,
      migrationHistoryRecordExists: false,
    })).toBe("STATE_D_PARTIAL_OBJECTS_HISTORY_MISSING");
    expect(classifyAiActionLedgerMigrationState({
      ...allObjects,
      submitRpcExists: false,
      migrationHistoryRecordExists: true,
    })).toBe("STATE_E_HISTORY_PRESENT_OBJECTS_MISSING");
  });

  it("blocks without an approved DB URL and does not print values or rows", async () => {
    const result = await inspectAiActionLedgerMigrationState({}, process.cwd());

    expect(result).toMatchObject({
      status: "BLOCKED_DB_URL_NOT_APPROVED",
      databaseUrlEnv: "missing",
      databaseUrlValuePrinted: false,
      rawRowsPrinted: false,
      secretsPrinted: false,
      state: null,
      blocker: "BLOCKED_DB_URL_NOT_APPROVED",
    });
    expect(JSON.stringify(result)).not.toContain("postgres://");
  });

  it("uses bounded metadata probes and never selects raw ledger rows", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/db/inspectAiActionLedgerMigrationState.ts"),
      "utf8",
    );

    expect(source).toContain("to_regclass('public.ai_action_ledger')");
    expect(source).toContain("pg_policies");
    expect(source).toContain("pg_proc");
    expect(source).not.toMatch(/select\s+\*/i);
    expect(source).not.toMatch(/\bfrom\s+public\.ai_action_ledger\s+al\b/i);
    expect(source).not.toContain("console.log");
  });
});
