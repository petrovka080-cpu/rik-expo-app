import * as fs from "fs";
import * as path from "path";

const migrationPath = path.resolve(
  __dirname,
  "../../supabase/migrations/20260513100000_ai_action_ledger_audit_rls_contract.sql",
);

describe("AI action ledger audit/RLS backend readiness migration proposal", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  it("adds persistent redacted audit storage without applying destructive SQL", () => {
    expect(sql).toContain("create table if not exists public.ai_action_ledger_audit");
    expect(sql).toContain("ai.action.submitted_for_approval");
    expect(sql).toContain("ai.action.idempotency_reused");
    expect(sql).toContain("ai_action_ledger_audit_payload_redacted_check");
    expect(sql).toContain("create index if not exists ai_action_ledger_audit_action_created_idx");
    expect(sql).not.toMatch(/\b(drop|truncate|delete)\b/i);
  });

  it("requires RLS, company scope policies, evidence, and redacted payloads", () => {
    expect(sql).toContain("alter table public.ai_action_ledger enable row level security");
    expect(sql).toContain("alter table public.ai_action_ledger_audit enable row level security");
    expect(sql).toContain("force row level security");
    expect(sql).toContain("ai_action_ledger_insert_pending_company_scope");
    expect(sql).toContain("jsonb_array_length(evidence_refs) between 1 and 20");
    expect(sql).toContain("ai_action_ledger_no_raw_payload_v1(redacted_payload)");
  });

  it("defines route-aligned RPC contracts while keeping execution blocked", () => {
    expect(sql).toContain("ai_action_ledger_submit_for_approval_v1");
    expect(sql).toContain("ai_action_ledger_get_status_v1");
    expect(sql).toContain("ai_action_ledger_approve_v1");
    expect(sql).toContain("ai_action_ledger_reject_v1");
    expect(sql).toContain("ai_action_ledger_execute_approved_v1");
    expect(sql).toContain("BLOCKED_DOMAIN_EXECUTOR_NOT_READY");
    expect(sql).toContain("'finalExecution', false");
  });

  it("does not grant service-role execution or expose admin auth primitives", () => {
    expect(sql).not.toMatch(/\bservice_role\b|SUPABASE_SERVICE_ROLE_KEY|\bauth\.admin\b|\blistUsers\b/i);
  });
});
