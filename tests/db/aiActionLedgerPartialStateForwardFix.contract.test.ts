import fs from "node:fs";
import path from "node:path";

import { AI_ACTION_LEDGER_FORWARD_FIX_MIGRATION } from "../../scripts/db/aiActionLedgerMigrationShared";
import {
  buildAiActionLedgerPartialStateForwardFix,
  canApplyAiActionLedgerForwardFix,
  isAiActionLedgerPartialState,
} from "../../scripts/db/forwardFixAiActionLedgerPartialState";

describe("AI action ledger partial state forward-fix package", () => {
  it("only marks STATE_F as partial-state forward-fix territory", () => {
    expect(isAiActionLedgerPartialState("STATE_F_HISTORY_PRESENT_PARTIAL_OBJECTS")).toBe(true);
    expect(isAiActionLedgerPartialState("STATE_D_PARTIAL_OBJECTS_HISTORY_MISSING")).toBe(false);
    expect(isAiActionLedgerPartialState("STATE_A_OBJECTS_AND_HISTORY_PRESENT")).toBe(false);
    expect(isAiActionLedgerPartialState("STATE_B_OBJECTS_PRESENT_HISTORY_MISSING")).toBe(false);
    expect(isAiActionLedgerPartialState("STATE_C_OBJECTS_MISSING_HISTORY_MISSING")).toBe(false);
    expect(isAiActionLedgerPartialState("STATE_E_HISTORY_PRESENT_OBJECTS_MISSING")).toBe(false);
    expect(isAiActionLedgerPartialState(null)).toBe(false);
  });

  it("does not apply a forward-fix package while DB inspection is unavailable", async () => {
    const result = await buildAiActionLedgerPartialStateForwardFix({}, process.cwd());

    expect(result).toMatchObject({
      status: "BLOCKED_FORWARD_FIX_PREFLIGHT_FAILED",
      forwardFixPackageCreated: false,
      forwardFixApplied: false,
      destructiveMigration: false,
      unboundedDml: false,
      secretsPrinted: false,
      rawRowsPrinted: false,
    });
  });

  it("refuses forward-fix when history is missing or both table and functions are absent", () => {
    expect(canApplyAiActionLedgerForwardFix({
      state: "STATE_F_HISTORY_PRESENT_PARTIAL_OBJECTS",
      migrationHistoryRecordExists: true,
      tableExists: true,
      functionsExist: true,
    })).toBe(true);
    expect(canApplyAiActionLedgerForwardFix({
      state: "STATE_F_HISTORY_PRESENT_PARTIAL_OBJECTS",
      migrationHistoryRecordExists: false,
      tableExists: true,
      functionsExist: true,
    })).toBe(false);
    expect(canApplyAiActionLedgerForwardFix({
      state: "STATE_F_HISTORY_PRESENT_PARTIAL_OBJECTS",
      migrationHistoryRecordExists: true,
      tableExists: false,
      functionsExist: false,
    })).toBe(false);
  });

  it("ships bounded idempotent SQL for indexes, policies, grants, and schema reload", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "supabase", "migrations", AI_ACTION_LEDGER_FORWARD_FIX_MIGRATION),
      "utf8",
    );

    expect(source).toContain("create index if not exists ai_action_ledger_org_hash_status_created_idx");
    expect(source).toContain("create index if not exists ai_action_ledger_status_expires_idx");
    expect(source).toContain("create index if not exists ai_action_ledger_idempotency_key_idx");
    expect(source).toContain("alter table public.ai_action_ledger enable row level security");
    expect(source).toContain("create policy ai_action_ledger_select_company_scope");
    expect(source).toContain("create policy ai_action_ledger_insert_pending_company_scope");
    expect(source).toContain("create policy ai_action_ledger_update_approval_company_scope");
    expect(source).toContain("create policy ai_action_ledger_update_executed_company_scope");
    expect(source).toContain("grant execute on function public.ai_action_ledger_submit_for_approval_v1");
    expect(source).toContain("notify pgrst, 'reload schema'");
    expect(source).not.toMatch(/\b(drop|truncate|delete\s+from)\b/i);
    expect(source).not.toMatch(/\bupdate\s+public\./i);
    expect(source).not.toMatch(/\bselect\s+\*/i);
    expect(source).not.toMatch(/\bservice_role\b|\bauth\.admin\b|\blistUsers\b/i);
  });
});
