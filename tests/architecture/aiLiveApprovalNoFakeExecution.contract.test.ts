import fs from "node:fs";
import path from "node:path";

describe("S11 no-fake live approval architecture", () => {
  const s11Runner = fs.readFileSync(
    path.join(process.cwd(), "scripts", "e2e", "runAiLiveApprovalToExecutionPointOfNoReturn.ts"),
    "utf8",
  );
  const runtimeRunner = fs.readFileSync(
    path.join(process.cwd(), "scripts", "e2e", "runAiCommandCenterApprovalRuntimeMaestro.ts"),
    "utf8",
  );
  const gatewaySource = fs.readFileSync(
    path.join(process.cwd(), "src", "features", "ai", "executors", "executeApprovedActionGateway.ts"),
    "utf8",
  );

  it("has no local-only approval, fake status, or fake execution green path", () => {
    const combined = `${s11Runner}\n${runtimeRunner}\n${gatewaySource}`;
    expect(combined).toContain("fake_green_claimed: false");
    expect(combined).toContain("fake_execution: false");
    expect(combined).toContain("fake_status: false");
    expect(combined).not.toMatch(/fake_green_claimed:\s*true|fake_execution:\s*true|fake_status:\s*true/i);
    expect(combined).not.toMatch(/local[-_ ]only green|local_gate_only:\s*true/i);
  });

  it("does not use forbidden privileged auth, seeds, migrations, provider changes, or UI direct mutation", () => {
    const combined = `${s11Runner}\n${runtimeRunner}`;
    expect(combined).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|auth\.admin|listUsers\s*\(/i);
    expect(combined).not.toMatch(/seedUsers|truncate\s+table|drop\s+table|applyAiActionLedgerMigration/i);
    expect(combined).not.toMatch(/from\s+["']openai["']|new\s+OpenAI|GPT_ENABLEMENT_APPROVED=true|MODEL_PROVIDER_CHANGE_APPROVED=true/i);
    expect(combined).not.toMatch(/directSupabaseFromUi:\s*true|directMutationFromUi:\s*true/i);
  });
});
