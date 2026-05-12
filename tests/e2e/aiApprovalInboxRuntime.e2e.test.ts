import fs from "node:fs";
import path from "node:path";

import { runAiApprovalInboxMaestro } from "../../scripts/e2e/runAiApprovalInboxMaestro";

describe("AI Approval Inbox Android runtime contract", () => {
  it("runs the deterministic approval inbox E2E probe or emits an exact blocker", async () => {
    const artifact = await runAiApprovalInboxMaestro();

    expect([
      "GREEN_AI_APPROVAL_INBOX_EXECUTION_GATE_READY",
      "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND",
      "BLOCKED_APPROVAL_TEST_ACTION_NOT_AVAILABLE",
      "BLOCKED_APPROVAL_INBOX_UI_NOT_MOUNTED",
    ]).toContain(artifact.final_status);
    expect(artifact.fake_approval).toBe(false);
    expect(artifact.fake_action_status).toBe(false);
    expect(artifact.fake_execution).toBe(false);
    expect(artifact.final_domain_mutation_happened).toBe(false);
    expect(artifact.mutations_created).toBe(0);

    const artifactPath = path.join(
      process.cwd(),
      "artifacts",
      "S_AI_MAGIC_07_APPROVAL_INBOX_EXECUTION_GATE_emulator.json",
    );
    expect(fs.existsSync(artifactPath)).toBe(true);
  });

  it("does not seed, use Auth Admin, or print credentials in the runner", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/runAiApprovalInboxMaestro.ts"),
      "utf8",
    );

    expect(source).toContain("runAiApprovalInboxMaestro");
    expect(source).toContain("fake_approval: false");
    expect(source).toContain("mutations_created: 0");
    expect(source).not.toMatch(/seed|auth\.admin|listUsers|service_role|SUPABASE_SERVICE_ROLE_KEY/i);
  });
});
