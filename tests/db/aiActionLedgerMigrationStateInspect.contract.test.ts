import {
  classifyAiActionLedgerMigrationState,
} from "../../scripts/db/inspectAiActionLedgerMigrationState";

describe("AI action ledger migration state inspector S_DB_04B closeout", () => {
  it("separates complete DB objects from stale PostgREST schema cache", () => {
    expect(classifyAiActionLedgerMigrationState({
      tableExists: true,
      indexesExist: true,
      rlsEnabled: true,
      policiesExist: true,
      submitRpcExists: true,
      getStatusRpcExists: true,
      approveRpcExists: true,
      rejectRpcExists: true,
      executeApprovedRpcExists: true,
      verifyApplyRpcExists: true,
      migrationHistoryTableExists: true,
      migrationHistoryRecordExists: true,
      postgrestSchemaCacheRpcVisible: false,
    })).toBe("STATE_READY_BUT_POSTGREST_SCHEMA_CACHE_STALE");
  });
});
