import {
  AI_EMULATOR_GATE_HARDENING_MATRIX_ARTIFACT,
  AI_MANDATORY_EMULATOR_RUNTIME_GATE_MATRIX_ARTIFACT,
  AI_QA03_DUAL_PLATFORM_RUNTIME_TARGETABILITY_MATRIX_ARTIFACT,
  AI_QA04_FRESH_IOS_BUILD_SIGNOFF_MATRIX_ARTIFACT,
  evaluateAiMandatoryEmulatorRuntimeGate,
  isAiMandatoryEmulatorRuntimeGateRequiredPath,
} from "../../scripts/release/aiMandatoryEmulatorGateEvaluation";

const greenMandatoryMatrix = JSON.stringify({
  final_status: "GREEN_AI_MANDATORY_EMULATOR_RUNTIME_GATE_READY",
  android_installed_runtime_smoke: "PASS",
  fake_emulator_pass: false,
  secrets_printed: false,
});

const greenHardeningMatrix = JSON.stringify({
  final_status: "GREEN_AI_EMULATOR_GATE_HARDENED",
  core_release_artifact_overwritten: false,
  ai_gate_artifact_isolated: true,
  exact_llm_text_assertions: false,
  llm_response_smoke_blocking: false,
  single_emulator_parallel_maestro: false,
  fake_emulator_pass: false,
  fake_green_claimed: false,
  secrets_printed: false,
});

const greenQa03Matrix = JSON.stringify({
  final_status: "GREEN_AI_QA03_DUAL_PLATFORM_RUNTIME_TARGETABILITY_READY",
  fake_emulator_pass: false,
  fake_ios_pass: false,
  physical_ios_runtime_claimed: false,
  exact_llm_text_assertions: false,
  secrets_printed: false,
});

const greenQa04Matrix = JSON.stringify({
  final_status: "GREEN_AI_DUAL_PLATFORM_RUNTIME_SIGNOFF_AND_IOS_SUBMIT_READY",
  android_runtime_smoke: "PASS",
  mandatory_ai_runtime_matrix: "PASS",
  ios_build_git_commit_matches_head: true,
  ios_app_store_connect_submit: "PASS",
  ios_simulator_build: false,
  physical_ios_runtime_claimed: false,
  fake_ios_pass: false,
  fake_emulator_pass: false,
  exact_llm_text_assertions: false,
  secrets_printed: false,
});

describe("AI mandatory emulator gate release evaluator", () => {
  it("requires the gate for AI runtime and gate hardening files", () => {
    expect(AI_MANDATORY_EMULATOR_RUNTIME_GATE_MATRIX_ARTIFACT).toContain("S_AI_QA_01");
    expect(AI_EMULATOR_GATE_HARDENING_MATRIX_ARTIFACT).toContain("S_AI_QA_02");
    expect(AI_QA03_DUAL_PLATFORM_RUNTIME_TARGETABILITY_MATRIX_ARTIFACT).toContain("S_AI_QA_03");
    expect(AI_QA04_FRESH_IOS_BUILD_SIGNOFF_MATRIX_ARTIFACT).toContain("S_AI_QA_04");
    expect(isAiMandatoryEmulatorRuntimeGateRequiredPath("src/features/ai/AIAssistantScreen.tsx")).toBe(true);
    expect(isAiMandatoryEmulatorRuntimeGateRequiredPath("scripts/e2e/aiMaestroRetryPolicy.ts")).toBe(true);
    expect(isAiMandatoryEmulatorRuntimeGateRequiredPath("scripts/release/aiMandatoryEmulatorGateEvaluation.ts")).toBe(true);
    expect(isAiMandatoryEmulatorRuntimeGateRequiredPath("scripts/release/run-release-guard.ts")).toBe(true);
    expect(isAiMandatoryEmulatorRuntimeGateRequiredPath("scripts/release/verifyIosAiRuntimeBuildSignoff.ts")).toBe(true);
  });

  it("passes only when mandatory and hardening artifacts are green", () => {
    const result = evaluateAiMandatoryEmulatorRuntimeGate({
      changedFiles: ["scripts/e2e/aiMaestroRetryPolicy.ts"],
      matrixArtifactSource: greenMandatoryMatrix,
      hardeningArtifactSource: greenHardeningMatrix,
      dualPlatformArtifactSource: greenQa03Matrix,
      freshIosSignoffArtifactSource: greenQa04Matrix,
    });

    expect(result.blockers).toEqual([]);
    expect(result.hardeningFinalStatus).toBe("GREEN_AI_EMULATOR_GATE_HARDENED");
    expect(result.hardeningCoreReleaseArtifactOverwritten).toBe(false);
    expect(result.hardeningAiGateArtifactIsolated).toBe(true);
  });

  it("blocks release verification when the hardening artifact is missing or fake-green", () => {
    const missing = evaluateAiMandatoryEmulatorRuntimeGate({
      changedFiles: ["scripts/release/buildInstallAndroidPreviewForEmulator.ts"],
      matrixArtifactSource: greenMandatoryMatrix,
      hardeningArtifactSource: null,
      dualPlatformArtifactSource: greenQa03Matrix,
      freshIosSignoffArtifactSource: greenQa04Matrix,
    });
    expect(missing.blockers).toContain("BLOCKED_AI_EMULATOR_GATE_HARDENING_ARTIFACT_MISSING");

    const fakeGreen = evaluateAiMandatoryEmulatorRuntimeGate({
      changedFiles: ["scripts/release/buildInstallAndroidPreviewForEmulator.ts"],
      matrixArtifactSource: greenMandatoryMatrix,
      hardeningArtifactSource: JSON.stringify({
        ...JSON.parse(greenHardeningMatrix),
        core_release_artifact_overwritten: true,
      }),
      dualPlatformArtifactSource: greenQa03Matrix,
      freshIosSignoffArtifactSource: greenQa04Matrix,
    });
    expect(fakeGreen.blockers).toContain("BLOCKED_AI_EMULATOR_GATE_HARDENING_CORE_ARTIFACT_OVERWRITE");
  });

  it("blocks release verification when QA03 dual-platform proof is missing or fake", () => {
    const missing = evaluateAiMandatoryEmulatorRuntimeGate({
      changedFiles: ["scripts/release/verifyIosAiRuntimeBuildSignoff.ts"],
      matrixArtifactSource: greenMandatoryMatrix,
      hardeningArtifactSource: greenHardeningMatrix,
      dualPlatformArtifactSource: null,
    });
    expect(missing.blockers).toContain("BLOCKED_AI_QA03_DUAL_PLATFORM_ARTIFACT_MISSING");

    const fakeIos = evaluateAiMandatoryEmulatorRuntimeGate({
      changedFiles: ["scripts/release/verifyIosAiRuntimeBuildSignoff.ts"],
      matrixArtifactSource: greenMandatoryMatrix,
      hardeningArtifactSource: greenHardeningMatrix,
      dualPlatformArtifactSource: JSON.stringify({
        ...JSON.parse(greenQa03Matrix),
        fake_ios_pass: true,
      }),
    });
    expect(fakeIos.blockers).toContain("BLOCKED_AI_QA03_FAKE_IOS_PASS");
  });

  it("blocks release verification when QA04 fresh iOS signoff is missing or stale", () => {
    const missing = evaluateAiMandatoryEmulatorRuntimeGate({
      changedFiles: ["scripts/release/verifyIosAiRuntimeBuildSignoff.ts"],
      matrixArtifactSource: greenMandatoryMatrix,
      hardeningArtifactSource: greenHardeningMatrix,
      dualPlatformArtifactSource: greenQa03Matrix,
      freshIosSignoffArtifactSource: null,
    });
    expect(missing.blockers).toContain("BLOCKED_AI_QA04_FRESH_IOS_SIGNOFF_ARTIFACT_MISSING");

    const stale = evaluateAiMandatoryEmulatorRuntimeGate({
      changedFiles: ["scripts/release/verifyIosAiRuntimeBuildSignoff.ts"],
      matrixArtifactSource: greenMandatoryMatrix,
      hardeningArtifactSource: greenHardeningMatrix,
      dualPlatformArtifactSource: greenQa03Matrix,
      freshIosSignoffArtifactSource: JSON.stringify({
        ...JSON.parse(greenQa04Matrix),
        ios_build_git_commit_matches_head: false,
      }),
    });
    expect(stale.blockers).toContain("BLOCKED_AI_QA04_IOS_BUILD_STALE_COMMIT");

    const missingSubmit = evaluateAiMandatoryEmulatorRuntimeGate({
      changedFiles: ["scripts/release/verifyIosAiRuntimeBuildSignoff.ts"],
      matrixArtifactSource: greenMandatoryMatrix,
      hardeningArtifactSource: greenHardeningMatrix,
      dualPlatformArtifactSource: greenQa03Matrix,
      freshIosSignoffArtifactSource: JSON.stringify({
        ...JSON.parse(greenQa04Matrix),
        ios_app_store_connect_submit: "NOT_APPROVED",
      }),
    });
    expect(missingSubmit.blockers).toContain("BLOCKED_AI_QA04_IOS_SUBMIT_PROOF_MISSING");
  });
});
