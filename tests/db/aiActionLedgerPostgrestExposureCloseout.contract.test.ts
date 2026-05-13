import fs from "node:fs";
import path from "node:path";

describe("AI action ledger PostgREST exposure platform closeout", () => {
  it("ships a bounded platform closeout runner without migration re-apply or function recreation", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/db/closeoutAiActionLedgerPostgrestExposure.ts"),
      "utf8",
    );
    const withoutComments = source.replace(/\/\/.*$/gm, "").toLowerCase();

    expect(source).toContain("closeoutAiActionLedgerPostgrestExposure");
    expect(source).toContain("pg_notification_queue_usage()");
    expect(source).toContain("select pg_notify('pgrst', 'reload schema')");
    expect(source).toContain("grant execute on function");
    expect(source).toContain("p.oid::regprocedure::text");
    expect(source).toContain("verifyAiActionLedgerPostgrestRpcVisibility");
    expect(source).toContain("isStrictSignatureAwareGreen");
    expect(source).toContain("runAiApprovalLedgerPersistenceMaestro");
    expect(source).not.toContain("applyAiActionLedgerMigration.ts");
    expect(source).not.toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION/i);
    expect(withoutComments).not.toMatch(/\b(create\s+table|insert\s+into|delete\s+from|drop\s+|truncate\s+)\b/);
    expect(withoutComments).not.toMatch(/\bupdate\s+public\./);
    expect(withoutComments).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|auth\.admin|listUsers/i);
  });

  it("declares exact S_DB_04C artifacts and honest managed-platform blocker", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/db/closeoutAiActionLedgerPostgrestExposure.ts"),
      "utf8",
    );

    expect(source).toContain("S_DB_04C_POSTGREST_RPC_EXPOSURE_PLATFORM_CLOSEOUT");
    expect(source).toContain("GREEN_AI_ACTION_LEDGER_RPC_VISIBLE_AND_CALLABLE");
    expect(source).toContain("BLOCKED_SUPABASE_MANAGED_POSTGREST_RESTART_OR_SUPPORT_REQUIRED");
    expect(source).toContain("BLOCKED_POSTGREST_SIGNATURE_AWARE_VERIFY_FAILED");
    expect(source).toContain("BLOCKED_OLD_STUB_OVERLOADS_PRESENT");
    expect(source).toContain("manual_dashboard_reload_required");
    expect(source).toContain("old_apply_used: false");
    expect(source).toContain("blind_reapply_used: false");
    expect(source).toContain("destructive_sql: false");
    expect(source).toContain("unbounded_dml: false");
    expect(source).toContain("raw_rows_printed: false");
    expect(source).toContain("secrets_printed: false");
    expect(source).toContain("fake_green_claimed: false");
  });

  it("prints only summary proof fields for catalog inspection", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/db/closeoutAiActionLedgerPostgrestExposure.ts"),
      "utf8",
    );

    expect(source).toContain("functions_found_count");
    expect(source).toContain("functions_in_public_schema");
    expect(source).toContain("anon_execute_grant_ok");
    expect(source).toContain("authenticated_execute_grant_ok");
    expect(source).toContain("all_6_rpc_signature_aware_probe_ok");
    expect(source).toContain("active_rpc_count");
    expect(source).toContain("old_stub_overloads");
    expect(source).toContain("pgrst202");
    expect(source).toContain("pgrst203");
    expect(source).toContain("raw_rows_printed: false");
    expect(source).not.toContain("console.log");
  });

  it("treats verify_apply as part of the exposed ledger RPC contract", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/db/closeoutAiActionLedgerPostgrestExposure.ts"),
      "utf8",
    );

    expect(source).toContain("AI_ACTION_LEDGER_RPC_FUNCTIONS.verifyApply");
    expect(source).toContain("visibility.active_rpc_count === REQUIRED_LEDGER_RPC_NAMES.length");
  });
});
