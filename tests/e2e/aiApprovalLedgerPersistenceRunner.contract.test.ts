import fs from "node:fs";
import path from "node:path";

describe("AI approval ledger persistence runner PostgREST blocker classification", () => {
  it("distinguishes SQL RPC deployment from PostgREST schema-cache visibility", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/runAiApprovalLedgerPersistenceMaestro.ts"),
      "utf8",
    );

    expect(source).toContain("verifyAiActionLedgerPostgrestRpcVisibility");
    expect(source).toContain("BLOCKED_POSTGREST_SCHEMA_CACHE_STALE");
    expect(source).toContain("secondary_blocker");
    expect(source).toContain("SQL RPC functions exist, but PostgREST schema cache does not expose them yet.");
    expect(source).toContain("SQL RPC functions are missing in DB.");
    expect(source).toContain("BLOCKED_POSTGREST_RPC_PERMISSION_DENIED");
  });

  it("keeps the persistence runner away from service credentials and seed paths", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/runAiApprovalLedgerPersistenceMaestro.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|auth\.admin|listUsers\s*\(|seedUsers|seedDb|seed\(/i);
  });
});
