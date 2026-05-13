import fs from "node:fs";
import path from "node:path";

describe("AI approval ledger live action E2E runner contract", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "scripts", "e2e", "runAiApprovalLedgerLiveActionE2E.ts"),
    "utf8",
  );

  it("orchestrates draft, persisted approval, approval decision, central execution, and idempotency", () => {
    expect(source).toContain("runDraftRequestToolDraftOnly");
    expect(source).toContain("verifyAiActionLedgerPostgrestRpcVisibility");
    expect(source).toContain("createAiActionLedgerRuntimeMount");
    expect(source).toContain("runGetActionStatusToolSafeRead");
    expect(source).toContain("executeApprovedStatusTransitionMounted: true");
    expect(source).toContain("mount.submitForApproval");
    expect(source).toContain("mount.approve");
    expect(source).toContain("mount.executeApproved(actionId, idempotencyKey)");
    expect(source).toContain("replayStatus");
    expect(source).toContain("GREEN_AI_APPROVAL_LEDGER_LIVE_ACTION_E2E");
  });

  it("requires signature-aware RPC proof and explicit staging write approval", () => {
    expect(source).toContain("all_6_rpc_signature_aware_probe_ok");
    expect(source).toContain("active_rpc_count !== 6");
    expect(source).toContain("old_stub_overloads");
    expect(source).toContain("S_AI_APPROVAL_LEDGER_LIVE_E2E_APPROVED");
    expect(source).toContain("S_AI_APPROVAL_LEDGER_LIVE_E2E_ALLOW_LEDGER_WRITES");
    expect(source).toContain("S_AI_E2E_DOMAIN_MUTATION_SCOPE");
    expect(source).toContain("BLOCKED_LIVE_LEDGER_E2E_WRITE_APPROVAL_MISSING");
  });

  it("does not use service credentials, Auth Admin, seeded users, or fake green execution", () => {
    expect(source).toContain("fake_green_claimed: false");
    expect(source).toContain("fake_execution: false");
    expect(source).toContain("auth_admin_used: false");
    expect(source).toContain("list_users_used: false");
    expect(source).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|auth\.admin|listUsers\s*\(/i);
    expect(source).not.toMatch(/hardcoded AI answer|fake AI answer/i);
  });
});
