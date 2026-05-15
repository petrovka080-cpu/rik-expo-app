import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const prefix = "S_AI_QA_01_MANDATORY_EMULATOR_RUNTIME_GATE";
const hardeningPrefix = "S_AI_QA_02_EMULATOR_GATE_HARDENING";

function readJson(relativePath: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8")) as Record<string, unknown>;
}

describe("S_AI_QA_01 mandatory emulator runtime artifacts", () => {
  it("writes parseable inventory, matrix, emulator, and proof artifacts", () => {
    const inventory = readJson(`artifacts/${prefix}_inventory.json`);
    const matrix = readJson(`artifacts/${prefix}_matrix.json`);
    const emulator = readJson(`artifacts/${prefix}_emulator.json`);
    const proof = fs.readFileSync(path.join(root, `artifacts/${prefix}_proof.md`), "utf8");

    expect(inventory.runner).toBe("scripts/e2e/runAiMandatoryEmulatorRuntimeMatrix.ts");
    expect(inventory.fake_emulator_pass).toBe(false);
    expect(inventory.secrets_printed).toBe(false);
    expect(emulator.fake_emulator_pass).toBe(false);
    expect(proof).toContain("S_AI_QA_01 Mandatory Android Emulator AI Runtime Gate");

    expect([
      "GREEN_AI_MANDATORY_EMULATOR_RUNTIME_GATE_READY",
      "BLOCKED_AI_RUNTIME_EMULATOR_GATE",
      "BLOCKED_ANDROID_REBUILD_REQUIRED_FOR_AI_RUNTIME_PROOF",
      "BLOCKED_CHILD_AI_RUNTIME_RUNNER_NOT_FOUND",
      "BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE_AFTER_ADB_PROOF",
      "BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE",
      "BLOCKED_ANDROID_ADB_RUNTIME_UNSTABLE",
      "BLOCKED_MANDATORY_MATRIX_CHILD_RESULTS_STALE",
      "BLOCKED_MANDATORY_MATRIX_CHILD_RESULTS_NOT_RECORDED",
    ]).toContain(matrix.final_status);
  });

  it("does not allow fake green, secret printing, exact LLM text release assertions, or mutation counts", () => {
    const matrix = readJson(`artifacts/${prefix}_matrix.json`);
    const green = matrix.final_status === "GREEN_AI_MANDATORY_EMULATOR_RUNTIME_GATE_READY";

    expect(matrix.fake_emulator_pass).toBe(false);
    expect(matrix.fake_green_claimed).toBe(false);
    expect(matrix.secrets_printed).toBe(false);
    expect(matrix.exact_llm_text_assertions).toBe(false);
    expect(matrix.mutations_created).toBe(0);

    if (green) {
      expect(matrix.android_emulator_ready).toBe(true);
      expect(matrix.android_installed_runtime_smoke).toBe("PASS");
      expect(matrix.developer_control_e2e).toBe("PASS");
      expect(matrix.role_screen_knowledge_e2e).toBe("PASS");
      expect(matrix.command_center_runtime_e2e).toBe("PASS");
      expect(matrix.screen_action_runtime_e2e).toBe("PASS");
    } else {
      expect(String(matrix.exact_reason ?? matrix.blocking_child_runner ?? "")).not.toHaveLength(0);
    }
  });

  it("writes isolated S_AI_QA_02 hardening artifacts without claiming Core release ownership", () => {
    const androidBuild = readJson(`artifacts/${hardeningPrefix}_android_build.json`);
    const matrix = readJson(`artifacts/${hardeningPrefix}_matrix.json`);
    const emulator = readJson(`artifacts/${hardeningPrefix}_emulator.json`);
    const proof = fs.readFileSync(path.join(root, `artifacts/${hardeningPrefix}_proof.md`), "utf8");

    expect(androidBuild.core_release_artifact_overwritten).toBe(false);
    expect(androidBuild.ai_gate_artifact_isolated).toBe(true);
    expect(matrix.core_release_artifact_overwritten).toBe(false);
    expect(matrix.ai_gate_artifact_isolated).toBe(true);
    expect(matrix.retry_only_transport_flakes).toBe(true);
    expect(matrix.assertion_failure_retried).toBe(false);
    expect(matrix.probe_latency_tracked).toBe(true);
    expect(matrix.probe_flake_rate_tracked).toBe(true);
    expect(matrix.exact_llm_text_assertions).toBe(false);
    expect(matrix.llm_response_smoke_blocking).toBe(false);
    expect(matrix.single_emulator_parallel_maestro).toBe(false);
    expect(matrix.multi_device_parallel_supported).toBe(true);
    expect(emulator.fake_emulator_pass).toBe(false);
    expect(proof).toContain("S_AI_QA_02 Emulator Gate Hardening And Artifact Isolation");
  });
});
