import fs from "node:fs";
import path from "node:path";

import {
  runAiApprovedProcurementExecutorMaestro,
} from "../../scripts/e2e/runAiApprovedProcurementExecutorMaestro";

describe("AI approved procurement executor Android runtime contract", () => {
  it("runs the deterministic approved executor probe or emits an exact blocker", async () => {
    const artifact = await runAiApprovedProcurementExecutorMaestro();

    expect([
      "GREEN_AI_APPROVED_PROCUREMENT_EXECUTOR_READY",
      "BLOCKED_APPROVAL_ACTION_LEDGER_NOT_READY",
      "BLOCKED_APPROVED_PROCUREMENT_ACTION_NOT_AVAILABLE",
      "BLOCKED_PROCUREMENT_BFF_MUTATION_BOUNDARY_NOT_FOUND",
      "BLOCKED_AGENT_BFF_HTTP_MOUNT_NOT_FOUND",
    ]).toContain(artifact.final_status);
    expect(artifact.fake_execution).toBe(false);
    expect(artifact.fake_action_status).toBe(false);
    expect(artifact.final_domain_mutation_happened).toBe(false);
    expect(artifact.duplicate_execution_creates_duplicate).toBe(false);
    expect(artifact.mutations_created).toBe(0);

    const artifactPath = path.join(
      process.cwd(),
      "artifacts",
      "S_AI_MAGIC_08_APPROVED_PROCUREMENT_EXECUTOR_emulator.json",
    );
    expect(fs.existsSync(artifactPath)).toBe(true);
  });

  it("does not seed, use Auth Admin, or print credentials in the runner", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/runAiApprovedProcurementExecutorMaestro.ts"),
      "utf8",
    );

    expect(source).toContain("runAiApprovedProcurementExecutorMaestro");
    expect(source).toContain("fake_execution: false");
    expect(source).toContain("mutations_created: 0");
    expect(source).not.toMatch(/seed|auth\.admin|listUsers|service_role|SUPABASE_SERVICE_ROLE_KEY/i);
  });
});
