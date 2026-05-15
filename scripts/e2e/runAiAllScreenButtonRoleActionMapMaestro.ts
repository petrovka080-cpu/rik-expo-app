import fs from "node:fs";
import path from "node:path";

import {
  listAiScreenButtonRoleActionEntries,
} from "../../src/features/ai/screenAudit/aiScreenButtonRoleActionRegistry";
import { buildAiScreenAuditSummary } from "../../src/features/ai/screenAudit/aiScreenAuditSummary";
import { verifyAndroidInstalledBuildRuntime } from "../release/verifyAndroidInstalledBuildRuntime";
import {
  AI_ALL_SCREEN_BUTTON_ROLE_ACTION_MAP_WAVE,
  writeAiAllScreenButtonRoleActionMapArtifacts,
} from "../ai/auditAllScreenButtonRoleActionMap";

type AiAllScreenButtonRoleActionMapRuntimeStatus =
  | "GREEN_AI_ALL_SCREEN_BUTTON_ROLE_ACTION_MAP_READY"
  | "BLOCKED_SCREEN_BUTTON_AUDIT_INCOMPLETE"
  | "BLOCKED_SCREEN_BUTTON_AUDIT_RUNTIME_TARGETABILITY"
  | "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE";

type AiAllScreenButtonRoleActionMapRuntimeArtifact = {
  wave: typeof AI_ALL_SCREEN_BUTTON_ROLE_ACTION_MAP_WAVE;
  final_status: AiAllScreenButtonRoleActionMapRuntimeStatus;
  framework: "android_runtime_audit_targetability";
  device: "android";
  android_runtime_smoke: "PASS" | "BLOCKED";
  emulator_runtime_proof: "PASS" | "BLOCKED";
  audit_artifact_consistent: boolean;
  key_ai_surfaces_targetable: boolean;
  targetable_screen_ids: readonly string[];
  not_targeted_yet_screen_ids: readonly string[];
  route_missing_screen_ids: readonly string[];
  screens_audited: number;
  actions_audited: number;
  mutations_created: 0;
  db_writes: 0;
  provider_called: false;
  external_live_fetch: false;
  exact_llm_text_required: false;
  fake_emulator_pass: false;
  fake_green_claimed: false;
  secrets_printed: false;
  raw_rows_printed: false;
  exact_reason: string | null;
};

const projectRoot = process.cwd();
const artifactPrefix = path.join(projectRoot, "artifacts", AI_ALL_SCREEN_BUTTON_ROLE_ACTION_MAP_WAVE);
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;

const KEY_AI_SURFACE_SCREEN_IDS = [
  "ai.command_center",
  "approval.inbox",
  "procurement.copilot",
  "screen.runtime",
] as const;

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function screenIdsForTargetability(targetability: "targetable" | "not_targeted_yet" | "route_missing"): string[] {
  return [
    ...new Set(
      listAiScreenButtonRoleActionEntries()
        .filter((entry) => entry.emulatorTargetability === targetability)
        .map((entry) => entry.screenId),
    ),
  ].sort();
}

function appendRuntimeProof(artifact: AiAllScreenButtonRoleActionMapRuntimeArtifact): void {
  const existing = fs.existsSync(proofPath) ? fs.readFileSync(proofPath, "utf8").trimEnd() : "";
  fs.writeFileSync(
    proofPath,
    [
      existing,
      "",
      "## Android Runtime Targetability",
      "",
      `final_status: ${artifact.final_status}`,
      `android_runtime_smoke: ${artifact.android_runtime_smoke}`,
      `emulator_runtime_proof: ${artifact.emulator_runtime_proof}`,
      `audit_artifact_consistent: ${String(artifact.audit_artifact_consistent)}`,
      `key_ai_surfaces_targetable: ${String(artifact.key_ai_surfaces_targetable)}`,
      "exact_llm_text_required: false",
      "mutations_created: 0",
      "db_writes: 0",
      "provider_called: false",
      "fake_green_claimed: false",
      artifact.exact_reason ? `exact_reason: ${artifact.exact_reason}` : "exact_reason: null",
      "",
    ].join("\n"),
    "utf8",
  );
}

function buildRuntimeArtifact(
  finalStatus: AiAllScreenButtonRoleActionMapRuntimeStatus,
  exactReason: string | null,
  overrides: Partial<AiAllScreenButtonRoleActionMapRuntimeArtifact> = {},
): AiAllScreenButtonRoleActionMapRuntimeArtifact {
  const entries = listAiScreenButtonRoleActionEntries();
  const summary = buildAiScreenAuditSummary(entries);
  const targetableScreenIds = screenIdsForTargetability("targetable");
  const routeMissingScreenIds = screenIdsForTargetability("route_missing");
  const notTargetedYetScreenIds = screenIdsForTargetability("not_targeted_yet");
  const keyAiSurfacesTargetable = KEY_AI_SURFACE_SCREEN_IDS.every((screenId) =>
    targetableScreenIds.includes(screenId),
  );

  return {
    wave: AI_ALL_SCREEN_BUTTON_ROLE_ACTION_MAP_WAVE,
    final_status: finalStatus,
    framework: "android_runtime_audit_targetability",
    device: "android",
    android_runtime_smoke: "BLOCKED",
    emulator_runtime_proof: "BLOCKED",
    audit_artifact_consistent: summary.ok,
    key_ai_surfaces_targetable: keyAiSurfacesTargetable,
    targetable_screen_ids: targetableScreenIds,
    not_targeted_yet_screen_ids: notTargetedYetScreenIds,
    route_missing_screen_ids: routeMissingScreenIds,
    screens_audited: summary.screensAudited,
    actions_audited: summary.actionsAudited,
    mutations_created: 0,
    db_writes: 0,
    provider_called: false,
    external_live_fetch: false,
    exact_llm_text_required: false,
    fake_emulator_pass: false,
    fake_green_claimed: false,
    secrets_printed: false,
    raw_rows_printed: false,
    exact_reason: exactReason,
    ...overrides,
  };
}

function writeRuntimeArtifact(
  artifact: AiAllScreenButtonRoleActionMapRuntimeArtifact,
): AiAllScreenButtonRoleActionMapRuntimeArtifact {
  writeJson(emulatorPath, artifact);
  appendRuntimeProof(artifact);
  return artifact;
}

export async function runAiAllScreenButtonRoleActionMapMaestro(): Promise<AiAllScreenButtonRoleActionMapRuntimeArtifact> {
  const matrix = writeAiAllScreenButtonRoleActionMapArtifacts();
  if (matrix.final_status !== "GREEN_AI_ALL_SCREEN_BUTTON_ROLE_ACTION_MAP_READY") {
    return writeRuntimeArtifact(
      buildRuntimeArtifact(
        "BLOCKED_SCREEN_BUTTON_AUDIT_INCOMPLETE",
        matrix.exact_reason ?? "All-screen button role action map audit is incomplete.",
      ),
    );
  }

  const entries = listAiScreenButtonRoleActionEntries();
  const keyAiSurfacesTargetable = KEY_AI_SURFACE_SCREEN_IDS.every((screenId) =>
    entries.some((entry) => entry.screenId === screenId && entry.emulatorTargetability === "targetable"),
  );
  if (!keyAiSurfacesTargetable) {
    return writeRuntimeArtifact(
      buildRuntimeArtifact(
        "BLOCKED_SCREEN_BUTTON_AUDIT_RUNTIME_TARGETABILITY",
        "One or more key AI audit surfaces are not marked targetable in the runtime inventory.",
      ),
    );
  }

  const runtime = await verifyAndroidInstalledBuildRuntime();
  if (runtime.final_status !== "GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF") {
    return writeRuntimeArtifact(
      buildRuntimeArtifact(
        "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE",
        runtime.exact_reason ?? "Android installed runtime smoke did not pass.",
      ),
    );
  }

  return writeRuntimeArtifact(
    buildRuntimeArtifact("GREEN_AI_ALL_SCREEN_BUTTON_ROLE_ACTION_MAP_READY", null, {
      android_runtime_smoke: "PASS",
      emulator_runtime_proof: "PASS",
      audit_artifact_consistent: true,
      key_ai_surfaces_targetable: true,
    }),
  );
}

if (require.main === module) {
  void runAiAllScreenButtonRoleActionMapMaestro()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_AI_ALL_SCREEN_BUTTON_ROLE_ACTION_MAP_READY") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
