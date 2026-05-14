import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("S_AI_QA_01 mandatory emulator runtime matrix runner", () => {
  const source = read("scripts/e2e/runAiMandatoryEmulatorRuntimeMatrix.ts");

  it("references every mandatory AI runtime child runner and does not silently skip missing runners", () => {
    for (const runner of [
      "ensureAndroidEmulatorReady",
      "verifyAndroidInstalledBuildRuntime",
      "runDeveloperControlFullAccessMaestro",
      "runAiRoleScreenKnowledgeMaestro",
      "runAiScreenButtonActionMapMaestro",
      "runAiScreenButtonActionTruthMapMaestro",
      "runAiCommandCenterApprovalRuntimeMaestro",
      "runAiProactiveWorkdayTaskIntelligenceMaestro",
      "runAiApprovalLedgerPersistenceMaestro",
      "runAiLiveApprovalToExecutionPointOfNoReturn",
    ]) {
      expect(source).toContain(runner);
    }

    expect(source).toContain("RUNNER_NOT_FOUND_EXACT_BLOCKER");
    expect(source).toContain("BLOCKED_CHILD_AI_RUNTIME_RUNNER_NOT_FOUND");
    expect(source).toContain("blockingChildRunner");
  });

  it("requires Android installed runtime proof and rebuild policy before child E2E green", () => {
    expect(source).toContain("resolveAiAndroidRebuildRequirement");
    expect(source).toContain("BLOCKED_ANDROID_REBUILD_REQUIRED_FOR_AI_RUNTIME_PROOF");
    expect(source).toContain("GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF");
    expect(source).toContain("GREEN_AI_MANDATORY_EMULATOR_RUNTIME_GATE_READY");
  });

  it("locks deterministic UI targetability instead of exact LLM text assertions", () => {
    for (const testId of [
      "ai.assistant.screen",
      "ai.assistant.input",
      "ai.assistant.send",
      "ai.knowledge.preview",
      "ai.command_center.task_stream",
      "ai.approval_inbox.screen",
      "ai.screen.actions.preview",
      "ai.workday.section",
      "ai.workday.empty_state",
    ]) {
      expect(source).toContain(testId);
    }

    expect(source).toContain("exactLlmTextAssertionsPresent");
    expect(source).toContain("response_smoke_blocking_release: false");
    expect(source).not.toContain("fake_ai_answer: true");
    expect(source).not.toContain("hardcoded_ai_response");
  });

  it("keeps live ledger write paths behind an explicit no-DB-write boundary for this QA wave", () => {
    expect(source).toContain("forbiddenDbWriteBoundary");
    expect(source).toContain("BLOCKED_DB_WRITE_FORBIDDEN_BY_S_AI_QA_01");
    expect(source).toContain("S_AI_EMULATOR_ALLOW_DB_MUTATING_CHILD_RUNNERS");
    expect(source).toContain("mutations_created");
  });

  it("hardens the gate with matrix slicing, bounded retry policy, and latency metrics", () => {
    expect(source).toContain("S_AI_QA_02_EMULATOR_GATE_HARDENING");
    expect(source).toContain("childRunnerSlices");
    expect(source).toContain("blocking_slice_1");
    expect(source).toContain("blocking_slice_2");
    expect(source).toContain("blocking_slice_3");
    expect(source).toContain("runAiMaestroWithRetry");
    expect(source).toContain("probe_latency_ms");
    expect(source).toContain("probe_latency_budget_ms");
    expect(source).toContain("transport_retry_count");
    expect(source).toContain("flake_retry_count");
    expect(source).toContain("single_emulator_parallel_maestro: false");
    expect(source).toContain("multi_device_parallel_supported: true");
    expect(source).toContain("parallel_execution_used: false");
    expect(source).toContain("deviceIds.length >= 2");
  });
});
