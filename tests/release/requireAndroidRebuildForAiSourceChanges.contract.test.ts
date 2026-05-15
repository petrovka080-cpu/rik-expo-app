import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  AI_ANDROID_REBUILD_INSTALL_PROOF_ARTIFACT,
  buildAiChangedFilesFingerprint,
  buildAiMobileRuntimeSourceFingerprint,
  isAiMobileRuntimeRebuildPath,
  resolveAiAndroidRebuildRequirement,
} from "../../scripts/release/requireAndroidRebuildForAiSourceChanges";
import {
  evaluateAiMandatoryEmulatorRuntimeGate,
  isAiMandatoryEmulatorRuntimeGateRequiredPath,
} from "../../scripts/release/releaseGuard.shared";

describe("Android rebuild policy for AI source changes", () => {
  it("requires rebuild for AI/mobile runtime and stable e2e YAML changes", () => {
    expect(isAiMobileRuntimeRebuildPath("src/features/ai/AIAssistantScreen.tsx")).toBe(true);
    expect(isAiMobileRuntimeRebuildPath("src/screens/director/DirectorDashboard.tsx")).toBe(true);
    expect(isAiMobileRuntimeRebuildPath("src/components/AppCombo.tsx")).toBe(true);
    expect(isAiMobileRuntimeRebuildPath("app/ai-command-center.tsx")).toBe(true);
    expect(isAiMobileRuntimeRebuildPath("tests/e2e/ai-role-screen-knowledge/director-control-knowledge.yaml")).toBe(true);
  });

  it("does not require a fresh APK rebuild for scripts-only changes, while keeping runtime smoke mandatory", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rik-ai-scripts-only-policy-"));
    const proofPath = path.join(tempRoot, AI_ANDROID_REBUILD_INSTALL_PROOF_ARTIFACT);
    const sourceFingerprint = buildAiMobileRuntimeSourceFingerprint({ projectRoot: tempRoot });
    fs.mkdirSync(path.dirname(proofPath), { recursive: true });
    fs.writeFileSync(
      proofPath,
      JSON.stringify({
        final_status: "PASS_ANDROID_REBUILD_INSTALL_FOR_AI_RUNTIME_PROOF",
        changed_files_fingerprint: buildAiChangedFilesFingerprint([
          "scripts/e2e/runAiMandatoryEmulatorRuntimeMatrix.ts",
          "tests/e2e/aiMandatoryEmulatorRuntimeMatrix.contract.test.ts",
        ]),
        ai_mobile_runtime_source_fingerprint: sourceFingerprint,
        installed_apk_source_fingerprint: sourceFingerprint,
        source_fingerprint_matches_installed_apk: true,
        local_android_rebuild_install_after_source_change: true,
        fake_emulator_pass: false,
      }),
    );

    const result = resolveAiAndroidRebuildRequirement({
      projectRoot: tempRoot,
      changedFiles: [
        "scripts/e2e/runAiMandatoryEmulatorRuntimeMatrix.ts",
        "tests/e2e/aiMandatoryEmulatorRuntimeMatrix.contract.test.ts",
      ],
    });

    expect(result.final_status).toBe("PASS_ANDROID_REBUILD_NOT_REQUIRED");
    expect(result.require_rebuild).toBe(false);
    expect(result.installed_runtime_smoke_required).toBe(true);
    expect(result.local_android_rebuild_install).toBe("NOT_REQUIRED");
    expect(result.source_fingerprint_matches_installed_apk).toBe(true);
  });

  it("blocks AI runtime source changes until matching local rebuild/install proof exists", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rik-ai-rebuild-policy-"));
    const changedFiles = ["src/features/ai/AIAssistantScreen.tsx"];
    const sourceFingerprint = buildAiMobileRuntimeSourceFingerprint({ projectRoot: tempRoot, changedFiles });
    const blocked = resolveAiAndroidRebuildRequirement({
      projectRoot: tempRoot,
      changedFiles,
    });

    expect(blocked.final_status).toBe("BLOCKED_ANDROID_REBUILD_REQUIRED_FOR_DIRTY_AI_WORKTREE");
    expect(blocked.local_android_rebuild_install).toBe("BLOCKED");
    expect(blocked.source_fingerprint_matches_installed_apk).toBe(false);

    const proofPath = path.join(tempRoot, AI_ANDROID_REBUILD_INSTALL_PROOF_ARTIFACT);
    fs.mkdirSync(path.dirname(proofPath), { recursive: true });
    fs.writeFileSync(
      proofPath,
      JSON.stringify({
        final_status: "PASS_ANDROID_REBUILD_INSTALL_FOR_AI_RUNTIME_PROOF",
        changed_files_fingerprint: buildAiChangedFilesFingerprint(changedFiles),
        ai_mobile_runtime_source_fingerprint: sourceFingerprint,
        installed_apk_source_fingerprint: sourceFingerprint,
        source_fingerprint_matches_installed_apk: true,
        local_android_rebuild_install_after_source_change: true,
        fake_emulator_pass: false,
      }),
    );

    const passed = resolveAiAndroidRebuildRequirement({
      projectRoot: tempRoot,
      changedFiles,
    });
    expect(passed.final_status).toBe("PASS_ANDROID_REBUILD_PROOF_PRESENT");
    expect(passed.local_android_rebuild_install).toBe("PASS");
  });

  it("accepts an installed APK proof when source fingerprint still matches after script-only gate edits", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rik-ai-rebuild-source-proof-"));
    const originalChangedFiles = ["src/features/ai/AIAssistantScreen.tsx"];
    const currentChangedFiles = [
      ...originalChangedFiles,
      "scripts/e2e/runAiMandatoryEmulatorRuntimeMatrix.ts",
      "tests/e2e/aiMandatoryEmulatorRuntimeMatrix.contract.test.ts",
    ];
    const sourceFingerprint = buildAiMobileRuntimeSourceFingerprint({
      projectRoot: tempRoot,
      changedFiles: currentChangedFiles,
    });
    const proofPath = path.join(tempRoot, AI_ANDROID_REBUILD_INSTALL_PROOF_ARTIFACT);
    fs.mkdirSync(path.dirname(proofPath), { recursive: true });
    fs.writeFileSync(
      proofPath,
      JSON.stringify({
        final_status: "PASS_ANDROID_REBUILD_INSTALL_FOR_AI_RUNTIME_PROOF",
        changed_files_fingerprint: buildAiChangedFilesFingerprint(originalChangedFiles),
        ai_mobile_runtime_source_fingerprint: sourceFingerprint,
        installed_apk_source_fingerprint: sourceFingerprint,
        source_fingerprint_matches_installed_apk: true,
        local_android_rebuild_install_after_source_change: true,
        fake_emulator_pass: false,
      }),
    );

    const result = resolveAiAndroidRebuildRequirement({
      projectRoot: tempRoot,
      changedFiles: currentChangedFiles,
    });

    expect(result.final_status).toBe("PASS_ANDROID_REBUILD_PROOF_PRESENT");
    expect(result.local_android_rebuild_install).toBe("PASS");
    expect(result.source_fingerprint_matches_installed_apk).toBe(true);
  });

  it("requires a fresh S_AI_QA_01 matrix artifact in release guard for AI runtime or AI gate script changes", () => {
    expect(isAiMandatoryEmulatorRuntimeGateRequiredPath("src/features/ai/AIAssistantScreen.tsx")).toBe(true);
    expect(isAiMandatoryEmulatorRuntimeGateRequiredPath("scripts/e2e/runAiMandatoryEmulatorRuntimeMatrix.ts")).toBe(true);

    const missing = evaluateAiMandatoryEmulatorRuntimeGate({
      changedFiles: ["src/features/ai/AIAssistantScreen.tsx"],
      matrixArtifactSource: null,
    });
    expect(missing.blockers).toContain("BLOCKED_AI_MANDATORY_EMULATOR_ARTIFACT_MISSING");

    const green = evaluateAiMandatoryEmulatorRuntimeGate({
      changedFiles: ["src/features/ai/AIAssistantScreen.tsx"],
      matrixArtifactSource: JSON.stringify({
        final_status: "GREEN_AI_MANDATORY_EMULATOR_RUNTIME_GATE_READY",
        android_installed_runtime_smoke: "PASS",
        fake_emulator_pass: false,
        secrets_printed: false,
      }),
    });
    expect(green.blockers).toEqual([]);
  });
});
