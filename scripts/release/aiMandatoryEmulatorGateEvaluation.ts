export type AiMandatoryEmulatorRuntimeGatePolicy = {
  required: boolean;
  artifactPath: string;
  finalStatus: string | null;
  androidInstalledRuntimeSmoke: string | null;
  fakeEmulatorPass: boolean | null;
  secretsPrinted: boolean | null;
  exactReason: string | null;
  blockers: string[];
  hardeningArtifactPath?: string;
  hardeningFinalStatus?: string | null;
  hardeningCoreReleaseArtifactOverwritten?: boolean | null;
  hardeningAiGateArtifactIsolated?: boolean | null;
};

export const AI_MANDATORY_EMULATOR_RUNTIME_GATE_MATRIX_ARTIFACT =
  "artifacts/S_AI_QA_01_MANDATORY_EMULATOR_RUNTIME_GATE_matrix.json";
export const AI_EMULATOR_GATE_HARDENING_MATRIX_ARTIFACT =
  "artifacts/S_AI_QA_02_EMULATOR_GATE_HARDENING_matrix.json";
export const AI_QA03_DUAL_PLATFORM_RUNTIME_TARGETABILITY_MATRIX_ARTIFACT =
  "artifacts/S_AI_QA_03_DUAL_PLATFORM_RUNTIME_TARGETABILITY_matrix.json";
export const AI_QA04_FRESH_IOS_BUILD_SIGNOFF_MATRIX_ARTIFACT =
  "artifacts/S_AI_QA_04_FRESH_IOS_BUILD_SIGNOFF_matrix.json";

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "");
}

export function isAiMandatoryEmulatorRuntimeGateRequiredPath(filePath: string): boolean {
  const normalized = normalizePath(filePath);
  return (
    normalized.startsWith("src/features/ai/") ||
    normalized.startsWith("src/screens/") ||
    normalized.startsWith("src/components/") ||
    normalized.startsWith("app/") ||
    normalized.startsWith("src/navigation/") ||
    normalized.startsWith("src/lib/navigation/") ||
    normalized.startsWith("src/lib/entry/") ||
    /^tests\/e2e\/.*\.ya?ml$/i.test(normalized) ||
    normalized.startsWith("scripts/e2e/runAi") ||
    normalized === "scripts/e2e/aiEmulatorFlakePolicy.ts" ||
    normalized === "scripts/e2e/aiMaestroRetryPolicy.ts" ||
    normalized === "scripts/e2e/ensureAndroidEmulatorReady.ts" ||
    normalized === "scripts/release/verifyAndroidInstalledBuildRuntime.ts" ||
    normalized === "scripts/release/requireAndroidRebuildForAiSourceChanges.ts" ||
    normalized === "scripts/release/buildInstallAndroidPreviewForEmulator.ts" ||
    normalized === "scripts/release/releaseGuard.shared.ts" ||
    normalized === "scripts/release/run-release-guard.ts" ||
    normalized === "scripts/release/verifyIosAiRuntimeBuildSignoff.ts" ||
    normalized === "scripts/release/aiMandatoryEmulatorGateEvaluation.ts"
  );
}

function safeParseJsonRecord(source: string | null): Record<string, unknown> | null {
  if (!source) return null;
  try {
    const parsed: unknown = JSON.parse(source);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function stringRecordValue(record: Record<string, unknown> | null, key: string): string | null {
  const value = record?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function booleanRecordValue(record: Record<string, unknown> | null, key: string): boolean | null {
  const value = record?.[key];
  return typeof value === "boolean" ? value : null;
}

function buildNotRequiredPolicy(): AiMandatoryEmulatorRuntimeGatePolicy {
  return {
    required: false,
    artifactPath: AI_MANDATORY_EMULATOR_RUNTIME_GATE_MATRIX_ARTIFACT,
    finalStatus: null,
    androidInstalledRuntimeSmoke: null,
    fakeEmulatorPass: null,
    secretsPrinted: null,
    exactReason: null,
    blockers: [],
    hardeningArtifactPath: AI_EMULATOR_GATE_HARDENING_MATRIX_ARTIFACT,
    hardeningFinalStatus: null,
    hardeningCoreReleaseArtifactOverwritten: null,
    hardeningAiGateArtifactIsolated: null,
  };
}

function evaluateHardeningArtifact(source: string | null): {
  finalStatus: string | null;
  coreReleaseArtifactOverwritten: boolean | null;
  aiGateArtifactIsolated: boolean | null;
  blockers: string[];
} {
  const artifact = safeParseJsonRecord(source);
  if (!artifact) {
    return {
      finalStatus: null,
      coreReleaseArtifactOverwritten: null,
      aiGateArtifactIsolated: null,
      blockers: ["BLOCKED_AI_EMULATOR_GATE_HARDENING_ARTIFACT_MISSING"],
    };
  }

  const finalStatus = stringRecordValue(artifact, "final_status");
  const coreReleaseArtifactOverwritten = booleanRecordValue(artifact, "core_release_artifact_overwritten");
  const aiGateArtifactIsolated = booleanRecordValue(artifact, "ai_gate_artifact_isolated");
  const exactReason = stringRecordValue(artifact, "exact_reason");
  const exactLlmTextAssertions = booleanRecordValue(artifact, "exact_llm_text_assertions");
  const llmResponseSmokeBlocking = booleanRecordValue(artifact, "llm_response_smoke_blocking");
  const singleEmulatorParallelMaestro = booleanRecordValue(artifact, "single_emulator_parallel_maestro");
  const fakeEmulatorPass = booleanRecordValue(artifact, "fake_emulator_pass");
  const fakeGreenClaimed = booleanRecordValue(artifact, "fake_green_claimed");
  const secretsPrinted = booleanRecordValue(artifact, "secrets_printed");

  const blockers = [
    ...(finalStatus === "GREEN_AI_EMULATOR_GATE_HARDENED"
      ? []
      : [`${finalStatus ?? "BLOCKED_AI_EMULATOR_GATE_HARDENING_RUNTIME"}: ${exactReason ?? "AI emulator hardening gate is not green."}`]),
    ...(coreReleaseArtifactOverwritten === false ? [] : ["BLOCKED_AI_EMULATOR_GATE_HARDENING_CORE_ARTIFACT_OVERWRITE"]),
    ...(aiGateArtifactIsolated === true ? [] : ["BLOCKED_AI_EMULATOR_GATE_HARDENING_ARTIFACT_NOT_ISOLATED"]),
    ...(exactLlmTextAssertions === false ? [] : ["BLOCKED_AI_EMULATOR_GATE_HARDENING_EXACT_LLM_ASSERTION"]),
    ...(llmResponseSmokeBlocking === false ? [] : ["BLOCKED_AI_EMULATOR_GATE_HARDENING_LLM_SMOKE_BLOCKING"]),
    ...(singleEmulatorParallelMaestro === false ? [] : ["BLOCKED_AI_EMULATOR_GATE_HARDENING_SINGLE_EMULATOR_PARALLEL_MAESTRO"]),
    ...(fakeEmulatorPass === false ? [] : ["BLOCKED_AI_EMULATOR_GATE_HARDENING_FAKE_EMULATOR_PASS"]),
    ...(fakeGreenClaimed === false ? [] : ["BLOCKED_AI_EMULATOR_GATE_HARDENING_FAKE_GREEN"]),
    ...(secretsPrinted === false ? [] : ["BLOCKED_AI_EMULATOR_GATE_HARDENING_SECRETS_PRINTED"]),
  ];

  return {
    finalStatus,
    coreReleaseArtifactOverwritten,
    aiGateArtifactIsolated,
    blockers,
  };
}

function evaluateDualPlatformArtifact(source: string | null): {
  finalStatus: string | null;
  blockers: string[];
} {
  const artifact = safeParseJsonRecord(source);
  if (!artifact) {
    return {
      finalStatus: null,
      blockers: ["BLOCKED_AI_QA03_DUAL_PLATFORM_ARTIFACT_MISSING"],
    };
  }

  const finalStatus = stringRecordValue(artifact, "final_status");
  const exactReason = stringRecordValue(artifact, "exact_reason");
  const blockers = [
    ...(finalStatus === "GREEN_AI_QA03_DUAL_PLATFORM_RUNTIME_TARGETABILITY_READY"
      ? []
      : [`${finalStatus ?? "BLOCKED_AI_RUNTIME_TARGETABILITY_EXACT"}: ${exactReason ?? "QA03 dual-platform runtime targetability is not green."}`]),
    ...(booleanRecordValue(artifact, "fake_emulator_pass") === false ? [] : ["BLOCKED_AI_QA03_FAKE_EMULATOR_PASS"]),
    ...(booleanRecordValue(artifact, "fake_ios_pass") === false ? [] : ["BLOCKED_AI_QA03_FAKE_IOS_PASS"]),
    ...(booleanRecordValue(artifact, "physical_ios_runtime_claimed") === false ? [] : ["BLOCKED_AI_QA03_FAKE_PHYSICAL_IOS_RUNTIME_CLAIM"]),
    ...(booleanRecordValue(artifact, "exact_llm_text_assertions") === false ? [] : ["BLOCKED_AI_QA03_EXACT_LLM_ASSERTION"]),
    ...(booleanRecordValue(artifact, "secrets_printed") === false ? [] : ["BLOCKED_AI_QA03_SECRETS_PRINTED"]),
  ];

  return {
    finalStatus,
    blockers,
  };
}

function evaluateFreshIosSignoffArtifact(source: string | null): {
  finalStatus: string | null;
  blockers: string[];
} {
  const artifact = safeParseJsonRecord(source);
  if (!artifact) {
    return {
      finalStatus: null,
      blockers: ["BLOCKED_AI_QA04_FRESH_IOS_SIGNOFF_ARTIFACT_MISSING"],
    };
  }

  const finalStatus = stringRecordValue(artifact, "final_status");
  const exactReason = stringRecordValue(artifact, "exact_reason");
  const blockers = [
    ...(finalStatus === "GREEN_AI_DUAL_PLATFORM_RUNTIME_SIGNOFF_AND_IOS_SUBMIT_READY"
      ? []
      : [`${finalStatus ?? "BLOCKED_IOS_BUILD_SIGNOFF_REQUIRED"}: ${exactReason ?? "QA04 fresh iOS build signoff is not green."}`]),
    ...(stringRecordValue(artifact, "android_runtime_smoke") === "PASS" ? [] : ["BLOCKED_AI_QA04_ANDROID_RUNTIME_SMOKE_MISSING"]),
    ...(stringRecordValue(artifact, "mandatory_ai_runtime_matrix") === "PASS" ? [] : ["BLOCKED_AI_QA04_MANDATORY_MATRIX_MISSING"]),
    ...(booleanRecordValue(artifact, "ios_build_git_commit_matches_head") === true ? [] : ["BLOCKED_AI_QA04_IOS_BUILD_STALE_COMMIT"]),
    ...(stringRecordValue(artifact, "ios_app_store_connect_submit") === "PASS" ? [] : ["BLOCKED_AI_QA04_IOS_SUBMIT_PROOF_MISSING"]),
    ...(booleanRecordValue(artifact, "ios_simulator_build") === false ? [] : ["BLOCKED_AI_QA04_IOS_SIMULATOR_BUILD"]),
    ...(booleanRecordValue(artifact, "physical_ios_runtime_claimed") === false ? [] : ["BLOCKED_AI_QA04_FAKE_PHYSICAL_IOS_RUNTIME_CLAIM"]),
    ...(booleanRecordValue(artifact, "fake_ios_pass") === false ? [] : ["BLOCKED_AI_QA04_FAKE_IOS_PASS"]),
    ...(booleanRecordValue(artifact, "fake_emulator_pass") === false ? [] : ["BLOCKED_AI_QA04_FAKE_EMULATOR_PASS"]),
    ...(booleanRecordValue(artifact, "exact_llm_text_assertions") === false ? [] : ["BLOCKED_AI_QA04_EXACT_LLM_ASSERTION"]),
    ...(booleanRecordValue(artifact, "secrets_printed") === false ? [] : ["BLOCKED_AI_QA04_SECRETS_PRINTED"]),
  ];

  return {
    finalStatus,
    blockers,
  };
}

export function evaluateAiMandatoryEmulatorRuntimeGate(params: {
  changedFiles: string[];
  matrixArtifactSource: string | null;
  hardeningArtifactSource?: string | null;
  dualPlatformArtifactSource?: string | null;
  freshIosSignoffArtifactSource?: string | null;
}): AiMandatoryEmulatorRuntimeGatePolicy {
  const required = params.changedFiles.some(isAiMandatoryEmulatorRuntimeGateRequiredPath);
  const hardeningSupplied = Object.prototype.hasOwnProperty.call(params, "hardeningArtifactSource");
  const dualPlatformSupplied = Object.prototype.hasOwnProperty.call(params, "dualPlatformArtifactSource");
  const freshIosSupplied = Object.prototype.hasOwnProperty.call(params, "freshIosSignoffArtifactSource");
  if (!required) {
    return buildNotRequiredPolicy();
  }

  const matrix = safeParseJsonRecord(params.matrixArtifactSource);
  if (!matrix) {
    const hardening = hardeningSupplied ? evaluateHardeningArtifact(params.hardeningArtifactSource ?? null) : null;
    const dualPlatform = dualPlatformSupplied
      ? evaluateDualPlatformArtifact(params.dualPlatformArtifactSource ?? null)
      : null;
    const freshIos = freshIosSupplied
      ? evaluateFreshIosSignoffArtifact(params.freshIosSignoffArtifactSource ?? null)
      : null;
    return {
      required: true,
      artifactPath: AI_MANDATORY_EMULATOR_RUNTIME_GATE_MATRIX_ARTIFACT,
      finalStatus: null,
      androidInstalledRuntimeSmoke: null,
      fakeEmulatorPass: null,
      secretsPrinted: null,
      exactReason: null,
      blockers: [
        "BLOCKED_AI_MANDATORY_EMULATOR_ARTIFACT_MISSING",
        ...(hardening?.blockers ?? []),
        ...(dualPlatform?.blockers ?? []),
        ...(freshIos?.blockers ?? []),
      ],
      hardeningArtifactPath: AI_EMULATOR_GATE_HARDENING_MATRIX_ARTIFACT,
      hardeningFinalStatus: hardening?.finalStatus ?? null,
      hardeningCoreReleaseArtifactOverwritten: hardening?.coreReleaseArtifactOverwritten ?? null,
      hardeningAiGateArtifactIsolated: hardening?.aiGateArtifactIsolated ?? null,
    };
  }

  const finalStatus = stringRecordValue(matrix, "final_status");
  const androidInstalledRuntimeSmoke = stringRecordValue(matrix, "android_installed_runtime_smoke");
  const exactReason = stringRecordValue(matrix, "exact_reason");
  const fakeEmulatorPass = booleanRecordValue(matrix, "fake_emulator_pass");
  const secretsPrinted = booleanRecordValue(matrix, "secrets_printed");
  const hardening = hardeningSupplied ? evaluateHardeningArtifact(params.hardeningArtifactSource ?? null) : null;
  const dualPlatform = dualPlatformSupplied
    ? evaluateDualPlatformArtifact(params.dualPlatformArtifactSource ?? null)
    : null;
  const freshIos = freshIosSupplied
    ? evaluateFreshIosSignoffArtifact(params.freshIosSignoffArtifactSource ?? null)
    : null;
  const blockers = [
    ...(finalStatus === "GREEN_AI_MANDATORY_EMULATOR_RUNTIME_GATE_READY"
      ? []
      : [`${finalStatus ?? "BLOCKED_AI_RUNTIME_EMULATOR_GATE"}: ${exactReason ?? "AI mandatory emulator runtime gate is not green."}`]),
    ...(androidInstalledRuntimeSmoke === "PASS" ? [] : ["BLOCKED_ANDROID_INSTALLED_RUNTIME_SMOKE_MISSING"]),
    ...(fakeEmulatorPass === false ? [] : ["BLOCKED_AI_MANDATORY_EMULATOR_FAKE_PASS_FIELD_NOT_FALSE"]),
    ...(secretsPrinted === false ? [] : ["BLOCKED_AI_MANDATORY_EMULATOR_SECRETS_PRINTED_FIELD_NOT_FALSE"]),
    ...(hardening?.blockers ?? []),
    ...(dualPlatform?.blockers ?? []),
    ...(freshIos?.blockers ?? []),
  ];

  return {
    required: true,
    artifactPath: AI_MANDATORY_EMULATOR_RUNTIME_GATE_MATRIX_ARTIFACT,
    finalStatus,
    androidInstalledRuntimeSmoke,
    fakeEmulatorPass,
    secretsPrinted,
    exactReason,
    blockers,
    hardeningArtifactPath: AI_EMULATOR_GATE_HARDENING_MATRIX_ARTIFACT,
    hardeningFinalStatus: hardening?.finalStatus ?? null,
    hardeningCoreReleaseArtifactOverwritten: hardening?.coreReleaseArtifactOverwritten ?? null,
    hardeningAiGateArtifactIsolated: hardening?.aiGateArtifactIsolated ?? null,
  };
}
