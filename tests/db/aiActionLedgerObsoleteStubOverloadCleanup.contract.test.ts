import fs from "node:fs";
import path from "node:path";

import {
  AI_ACTION_LEDGER_OBSOLETE_STUB_OVERLOAD_CLEANUP_MIGRATION,
} from "../../scripts/db/aiActionLedgerMigrationShared";
import {
  AI_ACTION_LEDGER_ACTIVE_RPC_SIGNATURES,
  AI_ACTION_LEDGER_OBSOLETE_STUB_OVERLOAD_SIGNATURES,
} from "../../scripts/db/verifyAiActionLedgerPostgrestRpcVisibility";

describe("AI action ledger obsolete stub overload cleanup", () => {
  it("ships exact bounded DROP FUNCTION IF EXISTS cleanup and schema reload only", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "supabase", "migrations", AI_ACTION_LEDGER_OBSOLETE_STUB_OVERLOAD_CLEANUP_MIGRATION),
      "utf8",
    );
    const withoutComments = source.replace(/--.*$/gm, "").toLowerCase();

    expect(source).toContain("drop function if exists public.ai_action_ledger_submit_for_approval_v1");
    expect(source).toContain("drop function if exists public.ai_action_ledger_get_status_v1(uuid)");
    expect(source).toContain("drop function if exists public.ai_action_ledger_approve_v1(uuid, text)");
    expect(source).toContain("drop function if exists public.ai_action_ledger_execute_approved_v1(uuid, text)");
    expect(source).toContain("notify pgrst, 'reload schema'");
    expect(withoutComments).not.toMatch(/\b(drop\s+table|truncate|delete\s+from|insert\s+into|update\s+public\.|create\s+or\s+replace)\b/);
    expect(withoutComments).not.toMatch(/\bservice_role\b|\bauth\.admin\b|\blistUsers\b/i);
  });

  it("verifier tracks six active RPC signatures and four obsolete stub overloads", () => {
    expect(AI_ACTION_LEDGER_ACTIVE_RPC_SIGNATURES).toHaveLength(6);
    expect(AI_ACTION_LEDGER_OBSOLETE_STUB_OVERLOAD_SIGNATURES).toEqual([
      "public.ai_action_ledger_submit_for_approval_v1(uuid,text,text,text,text,text,jsonb,jsonb,text,timestamptz,text)",
      "public.ai_action_ledger_get_status_v1(uuid)",
      "public.ai_action_ledger_approve_v1(uuid,text)",
      "public.ai_action_ledger_execute_approved_v1(uuid,text)",
    ]);
  });
});
