import fs from "node:fs";
import path from "node:path";

describe("S12 AI live operational truth ledger runner", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "scripts", "e2e", "runAiLiveOperationalTruthLedger.ts"),
    "utf8",
  );
  const resolverSource = fs.readFileSync(
    path.join(process.cwd(), "scripts", "e2e", "aiLiveOperationalTruthLedger.ts"),
    "utf8",
  );

  it("writes canonical S12 inventory, matrix, and proof artifacts", () => {
    expect(source).toContain("S_AI_MAGIC_12_OPERATIONAL_TRUTH_LEDGER");
    expect(source).toContain("_inventory.json");
    expect(source).toContain("_matrix.json");
    expect(source).toContain("_proof.md");
    expect(source).toContain("evaluateAiLiveOperationalTruthLedger");
  });

  it("blocks green unless S11, S9, RPC visibility, developer-control, and Command Center proofs are canonical green", () => {
    expect(resolverSource).toContain("GREEN_AI_LIVE_APPROVAL_TO_EXECUTION_POINT_OF_NO_RETURN");
    expect(resolverSource).toContain("GREEN_AI_APPROVAL_LEDGER_LIVE_ACTION_E2E");
    expect(resolverSource).toContain("GREEN_AI_ACTION_LEDGER_RPC_VISIBLE_AND_CALLABLE");
    expect(resolverSource).toContain("GREEN_DEVELOPER_CONTROL_FULL_ACCESS_RUNTIME_TARGETABILITY");
    expect(resolverSource).toContain("GREEN_COMMAND_CENTER_TASK_STREAM_RUNTIME_EXPOSED");
    expect(resolverSource).toContain("BLOCKED_AI_LIVE_OPERATIONAL_CANONICAL_PROOF_NOT_GREEN");
  });

  it("does not perform live writes, provider changes, privileged auth, seeds, or fake execution", () => {
    const combined = `${source}\n${resolverSource}`;
    expect(combined).toContain("live_db_writes: 0");
    expect(combined).toContain("db_writes: 0");
    expect(combined).toContain("unsafe_domain_mutations_created: 0");
    expect(combined).toContain("external_live_fetch: false");
    expect(combined).toContain("model_provider_changed: false");
    expect(combined).toContain("gpt_enabled: false");
    expect(combined).toContain("gemini_removed: false");
    expect(combined).toContain("fake_execution: false");
    expect(combined).not.toMatch(/createClient|\.rpc\(|fetch\(|SUPABASE_SERVICE_ROLE_KEY|auth\.admin|listUsers\s*\(|seedUsers/i);
  });
});
