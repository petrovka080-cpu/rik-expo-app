import fs from "node:fs";
import path from "node:path";

describe("AI action ledger Supabase managed PostgREST support package", () => {
  it("ships a redacted S_DB_04D incident package runner without migration or ledger SQL rewrites", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/db/buildAiActionLedgerSupabaseSupportPackage.ts"),
      "utf8",
    );
    const withoutComments = source.replace(/\/\/.*$/gm, "").toLowerCase();

    expect(source).toContain("buildAiActionLedgerSupabaseSupportPackage");
    expect(source).toContain("S_DB_04D_SUPABASE_MANAGED_POSTGREST_RECOVERY");
    expect(source).toContain("ESCALATED_SUPABASE_MANAGED_POSTGREST_CACHE_INCIDENT");
    expect(source).toContain("GREEN_AI_ACTION_LEDGER_RPC_VISIBLE_IN_POSTGREST");
    expect(source).toContain("Managed PostgREST schema cache not exposing existing public RPC after NOTIFY reload");
    expect(source).toContain("Project: redacted");
    expect(source).toContain("Environment: staging/production target, redacted");
    expect(source).toContain("support_package_generated");
    expect(source).toContain("support_ticket_required");
    expect(source).not.toContain("applyAiActionLedgerMigration.ts");
    expect(source).not.toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION/i);
    expect(withoutComments).not.toMatch(/\b(create\s+table|insert\s+into|delete\s+from|drop\s+|truncate\s+)\b/);
    expect(withoutComments).not.toMatch(/\bupdate\s+public\./);
    expect(withoutComments).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|auth\.admin|listUsers/i);
  });

  it("keeps support artifacts redacted and differentiates direct DB reload from Dashboard confirmation", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/db/buildAiActionLedgerSupabaseSupportPackage.ts"),
      "utf8",
    );

    expect(source).toContain("S_DB_04D_DASHBOARD_SQL_EDITOR_RELOAD_EXECUTED");
    expect(source).toContain("--dashboard-notify-executed");
    expect(source).toContain("direct_db_notify_executed");
    expect(source).toContain("dashboard_notify_executed");
    expect(source).toContain("dashboard_notify_status");
    expect(source).toContain("manual_required");
    expect(source).toContain("no DB URL");
    expect(source).toContain("no JWT");
    expect(source).toContain("no anon key");
    expect(source).toContain("no admin secret key");
    expect(source).toContain("no raw rows");
    expect(source).toContain("no user emails");
    expect(source).toContain("no passwords");
    expect(source).toContain("no full project secrets");
    expect(source).toContain("raw_rows_printed: false");
    expect(source).toContain("secrets_printed: false");
    expect(source).toContain("fake_green_claimed: false");
  });

  it("preserves the exact managed-cache incident facts for Supabase support", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/db/buildAiActionLedgerSupabaseSupportPackage.ts"),
      "utf8",
    );

    expect(source).toContain("public.ai_action_ledger_get_status_v1");
    expect(source).toContain("public.ai_action_ledger_submit_for_approval_v1");
    expect(source).toContain("public.ai_action_ledger_approve_v1");
    expect(source).toContain("public.ai_action_ledger_reject_v1");
    expect(source).toContain("public.ai_action_ledger_execute_approved_v1");
    expect(source).toContain("pg_notification_queue_usage()");
    expect(source).toContain("notify pgrst, 'reload schema'");
    expect(source).toContain("PostgREST returns 404/PGRST202");
    expect(source).toContain("Please restart/refresh the managed PostgREST/schema cache");
    expect(source).toContain("old_apply_used: false");
    expect(source).toContain("blind_reapply_used: false");
    expect(source).toContain("destructive_sql: false");
    expect(source).toContain("unbounded_dml: false");
  });
});
