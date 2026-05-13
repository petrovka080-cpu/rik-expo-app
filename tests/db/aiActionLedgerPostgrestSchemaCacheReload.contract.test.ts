import fs from "node:fs";
import path from "node:path";

describe("AI action ledger PostgREST schema-cache reload runner", () => {
  it("is bounded to a schema-cache notification and visibility polling", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/db/reloadAiActionLedgerPostgrestSchemaCache.ts"),
      "utf8",
    );
    const withoutComments = source.replace(/\/\/.*$/gm, "").toLowerCase();

    expect(source).toContain("select pg_notify('pgrst', 'reload schema')");
    expect(source).toContain("verifyAiActionLedgerPostgrestRpcVisibility");
    expect(source).toContain("inspectAiActionLedgerMigrationState");
    expect(source).not.toContain("applyAiActionLedgerMigration.ts");
    expect(withoutComments).not.toMatch(/\b(create\s+table|create\s+function|insert\s+into|delete\s+from|drop\s+|truncate\s+)\b/);
    expect(withoutComments).not.toMatch(/\bupdate\s+public\./);
    expect(withoutComments).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|auth\.admin|listUsers/i);
  });

  it("declares S_DB_04B artifacts and no fake-green safety fields", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/db/reloadAiActionLedgerPostgrestSchemaCache.ts"),
      "utf8",
    );

    expect(source).toContain("S_DB_04B_POSTGREST_SCHEMA_CACHE_VISIBILITY");
    expect(source).toContain("GREEN_AI_ACTION_LEDGER_RPC_VISIBLE_IN_POSTGREST");
    expect(source).toContain("BLOCKED_POSTGREST_SCHEMA_CACHE_RELOAD_NOT_OBSERVED");
    expect(source).toContain("old_apply_used: false");
    expect(source).toContain("blind_reapply_used: false");
    expect(source).toContain("destructive_sql: false");
    expect(source).toContain("unbounded_dml: false");
    expect(source).toContain("fake_green_claimed: false");
  });
});
