import fs from "node:fs";
import path from "node:path";

import { AI_ACTION_LEDGER_APPLY_MIGRATION } from "../../scripts/db/applyAiActionLedgerMigration";

describe("AI action ledger RLS policy package", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "supabase", "migrations", AI_ACTION_LEDGER_APPLY_MIGRATION),
    "utf8",
  );

  it("requires management scope for approve/reject/execute lifecycle writes", () => {
    expect(source).toContain("ai_action_ledger_update_executed_company_scope");
    expect(source).toContain("public.ai_action_ledger_actor_can_manage_company_v1(organization_id)");
    expect(source).toContain("status = 'executed'");
    expect(source).toContain("executed_at is not null");
    expect(source).toContain("jsonb_array_length(evidence_refs) between 1 and 20");
  });
});
