import fs from "node:fs";
import path from "node:path";

describe("S11 live approval-to-execution lifecycle contract", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "scripts", "e2e", "runAiLiveApprovalToExecutionPointOfNoReturn.ts"),
    "utf8",
  );

  it("orchestrates internal-first AI context, persisted ledger approval, central execution, and runtime proof", () => {
    expect(source).toContain("runAiProcurementCopilotMaestro");
    expect(source).toContain("resolveAiProcurementRuntimeRequest");
    expect(source).toContain("verifyAiActionLedgerPostgrestRpcVisibility");
    expect(source).toContain("runAiApprovalLedgerLiveActionE2E");
    expect(source).toContain("runAiCommandCenterApprovalRuntimeMaestro");
    expect(source).toContain("GREEN_AI_LIVE_APPROVAL_TO_EXECUTION_POINT_OF_NO_RETURN");
  });

  it("requires explicit S11 staging approval and keeps unsafe paths disabled", () => {
    expect(source).toContain("S_AI_MAGIC_11_LIVE_APPROVAL_TO_EXECUTION_APPROVED");
    expect(source).toContain("S_AI_MAGIC_11_ALLOW_LEDGER_WRITES");
    expect(source).toContain("S_AI_MAGIC_11_ALLOW_BOUNDED_EXECUTION");
    expect(source).toContain("S_AI_MAGIC_11_REQUIRE_IDEMPOTENCY");
    expect(source).toContain("S_AI_MAGIC_11_EXTERNAL_LIVE_FETCH_APPROVED");
    expect(source).toContain("S_AI_MAGIC_11_MODEL_PROVIDER_CHANGE_APPROVED");
    expect(source).toContain("S_AI_MAGIC_11_GPT_ENABLEMENT_APPROVED");
    expect(source).toContain("S_AI_MAGIC_11_UNSAFE_DOMAIN_MUTATIONS_APPROVED");
    expect(source).toContain("REQUIRED_FALSE_FLAGS.every");
  });

  it("only claims green with persisted lifecycle, idempotency, audit/evidence, and emulator proof", () => {
    expect(source).toContain("submit_for_approval_persisted_pending: true");
    expect(source).toContain("get_status_reads_pending: true");
    expect(source).toContain("approve_persists_approved: true");
    expect(source).toContain("execute_approved_uses_central_gateway: true");
    expect(source).toContain("get_status_reads_final_state: true");
    expect(source).toContain("idempotency_replay_safe: true");
    expect(source).toContain("audit_evidence_redacted: true");
    expect(source).toContain('android_runtime_smoke: "PASS"');
    expect(source).toContain('ai_live_lifecycle_e2e: "PASS"');
  });
});
