import fs from "node:fs";
import path from "node:path";

import {
  AI_ACTION_LEDGER_APPLY_MIGRATION,
} from "../../scripts/db/applyAiActionLedgerMigration";
import { AI_ACTION_LEDGER_VERIFY_QUERY } from "../../scripts/db/verifyAiActionLedgerMigration";

describe("AI action ledger verify query contract", () => {
  it("ships a bounded verification RPC without raw row output", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "supabase", "migrations", AI_ACTION_LEDGER_APPLY_MIGRATION),
      "utf8",
    );

    expect(source).toContain("ai_action_ledger_verify_apply_v1");
    expect(source).toContain(AI_ACTION_LEDGER_VERIFY_QUERY);
    expect(source).toContain("'rawRowsPrinted', false");
    expect(source).toContain("'secretsPrinted', false");
  });
});
