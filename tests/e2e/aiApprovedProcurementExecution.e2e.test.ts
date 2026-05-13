import fs from "node:fs";
import path from "node:path";

import {
  runApprovedProcurementExecutionMaestro,
} from "../../scripts/e2e/runApprovedProcurementExecutionMaestro";

describe("AI approved procurement execution E2E contract", () => {
  it("runs the production-safe runner or records an exact blocker without fake execution", async () => {
    const artifact = await runApprovedProcurementExecutionMaestro();

    expect([
      "GREEN_AI_APPROVED_PROCUREMENT_EXECUTION_E2E",
      "BLOCKED_APPROVED_PROCUREMENT_ACTION_NOT_AVAILABLE",
      "BLOCKED_PROCUREMENT_BFF_MUTATION_BOUNDARY_NOT_FOUND",
      "BLOCKED_LEDGER_RPC_NOT_MOUNTED",
      "BLOCKED_ANDROID_APK_BUILD_FAILED",
    ]).toContain(artifact.final_status);
    expect(artifact.fake_action_created).toBe(false);
    expect(artifact.fake_request_created).toBe(false);
    expect(artifact.fake_execution).toBe(false);
    expect(artifact.direct_supabase_from_ui).toBe(false);
    expect(artifact.direct_mutation_from_ui).toBe(false);
    expect(artifact.duplicate_execution_creates_duplicate).toBe(false);
    expect(artifact.mutations_created).toBe(0);
    expect(artifact.raw_ids_in_artifact).toBe(false);
    expect(artifact.exactReason).toEqual(expect.any(String));

    const artifactPath = path.join(
      process.cwd(),
      "artifacts",
      "S_AI_EXEC_01_APPROVED_PROCUREMENT_EXECUTION_E2E_emulator.json",
    );
    expect(fs.existsSync(artifactPath)).toBe(true);
  });

  it("uses explicit fixtures and never uses admin discovery or direct mobile mutation", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/runApprovedProcurementExecutionMaestro.ts"),
      "utf8",
    );

    expect(source).toContain("resolveAiE2eFixtureRegistry");
    expect(source).toContain("redactAiE2eFixtureRecord");
    expect(source).toContain("fake_action_created: false");
    expect(source).toContain("direct_supabase_from_ui: false");
    expect(source).not.toMatch(/auth\.admin|listUsers|service_role|SUPABASE_SERVICE_ROLE_KEY/i);
  });
});
