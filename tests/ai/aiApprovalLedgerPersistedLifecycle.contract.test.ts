import fs from "node:fs";
import path from "node:path";

describe("AI approval ledger persisted lifecycle contract", () => {
  const liveRunnerSource = fs.readFileSync(
    path.join(process.cwd(), "scripts", "e2e", "runAiApprovalLedgerLiveActionE2E.ts"),
    "utf8",
  );
  const s11RunnerSource = fs.readFileSync(
    path.join(process.cwd(), "scripts", "e2e", "runAiLiveApprovalToExecutionPointOfNoReturn.ts"),
    "utf8",
  );
  const mountSource = fs.readFileSync(
    path.join(process.cwd(), "src", "features", "ai", "actionLedger", "aiActionLedgerRuntimeMount.ts"),
    "utf8",
  );

  it("uses the canonical persisted RPC mount for submit/status/approve/execute", () => {
    expect(liveRunnerSource).toContain("createAiActionLedgerRuntimeMount");
    expect(mountSource).toContain("createAiActionLedgerRpcRepository");
    expect(liveRunnerSource).toContain("mount.submitForApproval");
    expect(liveRunnerSource).toContain("runGetActionStatusToolSafeRead");
    expect(liveRunnerSource).toContain("mount.approve");
    expect(liveRunnerSource).toContain("mount.executeApproved");
    expect(liveRunnerSource).toContain("executeApprovedStatusTransitionMounted: true");
  });

  it("keeps S11 blocked unless the canonical live ledger proof is green", () => {
    expect(s11RunnerSource).toContain("resolveAiApprovalLedgerLiveProof");
    expect(s11RunnerSource).toContain("liveProof.green");
    expect(s11RunnerSource).toContain("BLOCKED_APPROVED_PROCUREMENT_ACTION_NOT_AVAILABLE");
    expect(s11RunnerSource).toContain("BLOCKED_LEDGER_RPC_LIVE_VERIFY_FAILED");
    expect(s11RunnerSource).not.toMatch(/local_gate_only:\s*true|fake_status:\s*true|fake_execution:\s*true/i);
  });

  it("does not use service credentials, Auth Admin, listUsers, seeds, or direct UI mutation as a green path", () => {
    const combined = `${liveRunnerSource}\n${s11RunnerSource}`;
    expect(combined).toContain("auth_admin_used: false");
    expect(combined).toContain("list_users_used: false");
    expect(combined).toContain("seed_used: false");
    expect(combined).toContain("fake_green_claimed: false");
    expect(combined).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|auth\.admin|listUsers\s*\(|seedUsers|insert\s+into\s+auth/i);
  });
});
