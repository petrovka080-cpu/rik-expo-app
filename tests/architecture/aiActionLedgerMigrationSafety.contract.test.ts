import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const serviceRoleEnvKey = "SUPABASE_" + "SERVICE_ROLE_KEY";

describe("AI action ledger persistence runtime architecture safety", () => {
  it("keeps apply/preflight/runtime/e2e surfaces bounded and redacted", () => {
    const requiredFiles = [
      "scripts/db/preflightAiActionLedgerMigration.ts",
      "scripts/db/applyAiActionLedgerMigration.ts",
      "scripts/db/verifyAiActionLedgerMigration.ts",
      "scripts/e2e/runAiApprovalLedgerPersistenceMaestro.ts",
      "src/features/ai/actionLedger/aiActionLedgerRuntimeHealth.ts",
      "src/features/ai/actionLedger/aiActionLedgerRuntimeMount.ts",
      "supabase/migrations/20260513230000_ai_action_ledger_apply.sql",
    ];

    for (const relativePath of requiredFiles) {
      expect(fs.existsSync(path.join(root, relativePath))).toBe(true);
    }

    const migration = fs.readFileSync(
      path.join(root, "supabase/migrations/20260513230000_ai_action_ledger_apply.sql"),
      "utf8",
    );
    const runner = fs.readFileSync(
      path.join(root, "scripts/e2e/runAiApprovalLedgerPersistenceMaestro.ts"),
      "utf8",
    );
    const mount = fs.readFileSync(
      path.join(root, "src/features/ai/actionLedger/aiActionLedgerRuntimeMount.ts"),
      "utf8",
    );

    expect(migration).not.toMatch(/\b(drop|truncate|delete\s+from)\b/i);
    expect(migration).not.toMatch(/\bselect\s+\*|\breturning\s+\*/i);
    expect(runner).not.toContain(serviceRoleEnvKey);
    expect(runner).not.toMatch(/auth\.admin|listUsers\s*\(|seedUsers|seedDb|seed\(/i);
    expect(mount).toContain("serverSideOnly: true");
    expect(mount).toContain("directUiSupabase: false");
    expect(mount).toContain("finalExecutionFromUi: false");
  });
});
