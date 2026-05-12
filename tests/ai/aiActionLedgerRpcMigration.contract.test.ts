import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "artifacts/S_AI_MAGIC_08_APPROVAL_LEDGER_BACKEND_MOUNT_write_rpc_mount.sql",
);

describe("AI action ledger RPC write migration contract", () => {
  const source = fs.readFileSync(migrationPath, "utf8");

  it("is additive and keeps final execution blocked", () => {
    expect(source).toContain("Additive proposal only");
    expect(source).toContain("Apply only after explicit migration approval");
    expect(source).toContain("add column if not exists requested_role");
    expect(source).toContain("add column if not exists requested_by_user_id_hash");
    expect(source).toContain("add column if not exists organization_id_hash");
    expect(source).toContain("finalExecution', false");
    expect(source).not.toMatch(/\b(drop|truncate|delete)\b/i);
    expect(source).not.toMatch(/\b(service_role|auth\.admin|listUsers)\b/i);
  });

  it("mounts the persistent approval lifecycle RPCs with audit and idempotency", () => {
    expect(source).toContain("ai_action_ledger_submit_for_approval_v1");
    expect(source).toContain("ai_action_ledger_find_by_idempotency_key_v1");
    expect(source).toContain("ai_action_ledger_list_by_org_v1");
    expect(source).toContain("ai_action_ledger_approve_v1");
    expect(source).toContain("ai_action_ledger_reject_v1");
    expect(source).toContain("insert into public.ai_action_ledger");
    expect(source).toContain("insert into public.ai_action_ledger_audit");
    expect(source).toContain("ai.action.submitted_for_approval");
    expect(source).toContain("ai.action.idempotency_reused");
    expect(source).toContain("ai.action.approved");
    expect(source).toContain("ai.action.rejected");
    expect(source).toContain("unique_violation");
    expect(source).toContain("length(btrim(coalesce(p_idempotency_key");
  });

  it("returns only redacted safe JSON fields to the app boundary", () => {
    expect(source).toContain("ai_action_ledger_to_safe_json_v1");
    expect(source).toContain("'requestedByUserIdHash'");
    expect(source).toContain("'organizationIdHash'");
    expect(source).toContain("'redactedPayload'");
    expect(source).toContain("'evidenceRefs'");
    expect(source).not.toContain("'requested_by'");
    expect(source).not.toContain("'organization_id'");
  });
});
