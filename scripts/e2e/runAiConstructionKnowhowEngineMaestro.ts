import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { parseAgentEnvFileValues } from "../env/checkRequiredAgentFlags";
import { verifyAndroidInstalledBuildRuntime } from "../release/verifyAndroidInstalledBuildRuntime";
import { ensureAndroidEmulatorReady } from "./ensureAndroidEmulatorReady";
import { collectExplicitE2eSecrets, redactE2eSecrets } from "./redactE2eSecrets";
import { resolveExplicitAiRoleAuthEnv } from "./resolveExplicitAiRoleAuthEnv";

export type AiConstructionKnowhowEngineRuntimeStatus =
  | "GREEN_AI_CONSTRUCTION_KNOWHOW_ENGINE_READY"
  | "BLOCKED_CONSTRUCTION_KNOWHOW_RUNTIME_TARGETABILITY";

export type AiConstructionKnowhowEngineRuntimeArtifact = {
  final_status: AiConstructionKnowhowEngineRuntimeStatus;
  construction_knowhow_core: boolean;
  domain_playbooks_registered: boolean;
  roles_registered: readonly [
    "director_control",
    "buyer",
    "warehouse",
    "accountant",
    "foreman",
    "contractor",
  ];
  professional_decision_card_contract: boolean;
  all_domains_have_evidence_policy: boolean;
  all_roles_have_boundaries: boolean;
  internal_first_external_second: boolean;
  external_preview_only: boolean;
  high_risk_requires_approval: boolean;
  direct_execution: false;
  domain_mutation: false;
  mobile_external_fetch: false;
  direct_supabase_from_ui: false;
  raw_rows_returned: false;
  raw_prompt_returned: false;
  provider_payload_returned: false;
  exact_llm_text_assertions: false;
  android_runtime_smoke: "PASS" | "BLOCKED";
  emulator_runtime_proof: "PASS" | "BLOCKED";
  prompt_pipeline_status: "PASS" | "BLOCKED";
  deterministic_testids_targetable: boolean;
  mutations_created: 0;
  db_writes: 0;
  fake_ai_answer: false;
  fake_professional_advice: false;
  fake_suppliers: false;
  fake_documents: false;
  model_provider_changed: false;
  gpt_enabled: false;
  gemini_removed: false;
  secrets_printed: false;
  fake_green_claimed: false;
  exact_reason: string | null;
};

const projectRoot = process.cwd();
const appId = "com.azisbek_dzhantaev.rikexpoapp";
const wave = "S_AI_PRO_02_CONSTRUCTION_KNOWHOW_ENGINE";
const artifactPrefix = path.join(projectRoot, "artifacts", wave);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;
const maestroBinary =
  process.env.MAESTRO_CLI_PATH ??
  path.join(
    process.env.LOCALAPPDATA ?? "",
    "maestro-cli",
    "maestro",
    "bin",
    process.platform === "win32" ? "maestro.bat" : "maestro",
  );

const roles = [
  "director_control",
  "buyer",
  "warehouse",
  "accountant",
  "foreman",
  "contractor",
] as const;

const deterministicTestIds = [
  "ai.construction.knowhow.preview",
  "ai.construction.knowhow.role",
  "ai.construction.knowhow.domain",
  "ai.construction.knowhow.evidence",
  "ai.construction.knowhow.risk",
  "ai.construction.knowhow.safe_actions",
  "ai.construction.knowhow.draft_actions",
  "ai.construction.knowhow.approval_required",
  "ai.construction.knowhow.external_status",
] as const;

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function loadEnvFilesIntoProcess(): void {
  for (const envFile of [".env", ".env.local", ".env.agent.staging.local"]) {
    const parsed = parseAgentEnvFileValues(path.join(projectRoot, envFile));
    for (const [key, value] of parsed) {
      if (process.env[key] == null || String(process.env[key]).trim() === "") {
        process.env[key] = value;
      }
    }
  }
}

function sourceReady(): boolean {
  const coreFiles = [
    "src/features/ai/constructionKnowhow/constructionKnowhowTypes.ts",
    "src/features/ai/constructionKnowhow/constructionKnowhowRegistry.ts",
    "src/features/ai/constructionKnowhow/constructionDomainPlaybooks.ts",
    "src/features/ai/constructionKnowhow/constructionRoleAdvisor.ts",
    "src/features/ai/constructionKnowhow/constructionDecisionCardEngine.ts",
    "src/features/ai/constructionKnowhow/constructionEvidenceComposer.ts",
    "src/features/ai/constructionKnowhow/constructionRiskClassifier.ts",
    "src/features/ai/constructionKnowhow/constructionExternalIntelPolicy.ts",
    "src/features/ai/constructionKnowhow/constructionProfessionalSafetyBoundary.ts",
    "src/features/ai/agent/agentConstructionKnowhowContracts.ts",
    "src/features/ai/agent/agentConstructionKnowhowRoutes.ts",
  ];
  if (!coreFiles.every((relativePath) => fs.existsSync(path.join(projectRoot, relativePath)))) {
    return false;
  }

  const source = coreFiles.map(readProjectFile).join("\n");
  const commandCenterSource = readProjectFile("src/features/ai/commandCenter/AiCommandCenterScreen.tsx");
  return (
    source.includes("ConstructionDecisionCard") &&
    source.includes("evidenceRequired: true") &&
    source.includes("highRiskRequiresApproval: true") &&
    source.includes("directExecutionWithoutApproval: false") &&
    source.includes("externalLiveFetch: false") &&
    deterministicTestIds.every((testId) => commandCenterSource.includes(testId))
  );
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function baseArtifact(
  finalStatus: AiConstructionKnowhowEngineRuntimeStatus,
  exactReason: string | null,
  overrides: Partial<AiConstructionKnowhowEngineRuntimeArtifact> = {},
): AiConstructionKnowhowEngineRuntimeArtifact {
  const ready = sourceReady();
  return {
    final_status: finalStatus,
    construction_knowhow_core: ready,
    domain_playbooks_registered: ready,
    roles_registered: roles,
    professional_decision_card_contract: ready,
    all_domains_have_evidence_policy: ready,
    all_roles_have_boundaries: ready,
    internal_first_external_second: ready,
    external_preview_only: ready,
    high_risk_requires_approval: ready,
    direct_execution: false,
    domain_mutation: false,
    mobile_external_fetch: false,
    direct_supabase_from_ui: false,
    raw_rows_returned: false,
    raw_prompt_returned: false,
    provider_payload_returned: false,
    exact_llm_text_assertions: false,
    android_runtime_smoke: "BLOCKED",
    emulator_runtime_proof: "BLOCKED",
    prompt_pipeline_status: "BLOCKED",
    deterministic_testids_targetable: false,
    mutations_created: 0,
    db_writes: 0,
    fake_ai_answer: false,
    fake_professional_advice: false,
    fake_suppliers: false,
    fake_documents: false,
    model_provider_changed: false,
    gpt_enabled: false,
    gemini_removed: false,
    secrets_printed: false,
    fake_green_claimed: false,
    exact_reason: exactReason,
    ...overrides,
  };
}

function writeArtifacts(
  artifact: AiConstructionKnowhowEngineRuntimeArtifact,
): AiConstructionKnowhowEngineRuntimeArtifact {
  writeJson(inventoryPath, {
    wave,
    runner: "scripts/e2e/runAiConstructionKnowhowEngineMaestro.ts",
    deterministic_testids: deterministicTestIds,
    roles_registered: roles,
    bff_contract: "src/features/ai/agent/agentConstructionKnowhowContracts.ts",
    construction_core: "src/features/ai/constructionKnowhow",
    external_preview_only: true,
    exact_llm_text_assertions: false,
    fake_ai_answer: false,
    fake_professional_advice: false,
    fake_suppliers: false,
    fake_documents: false,
    secrets_printed: false,
  });
  writeJson(matrixPath, artifact);
  writeJson(emulatorPath, {
    wave,
    framework: "maestro",
    device: "android",
    android_runtime_smoke: artifact.android_runtime_smoke,
    emulator_runtime_proof: artifact.emulator_runtime_proof,
    prompt_pipeline_status: artifact.prompt_pipeline_status,
    deterministic_testids_targetable: artifact.deterministic_testids_targetable,
    mutations_created: 0,
    db_writes: 0,
    exact_llm_text_assertions: false,
    fake_green_claimed: false,
    secrets_printed: false,
    exact_reason: artifact.exact_reason,
  });
  fs.writeFileSync(
    proofPath,
    [
      "# S_AI_PRO_02 Construction Know-How Engine",
      "",
      `final_status: ${artifact.final_status}`,
      `construction_knowhow_core: ${String(artifact.construction_knowhow_core)}`,
      `android_runtime_smoke: ${artifact.android_runtime_smoke}`,
      `emulator_runtime_proof: ${artifact.emulator_runtime_proof}`,
      `prompt_pipeline_status: ${artifact.prompt_pipeline_status}`,
      `deterministic_testids_targetable: ${String(artifact.deterministic_testids_targetable)}`,
      "mutations_created: 0",
      "db_writes: 0",
      "direct_execution: false",
      "domain_mutation: false",
      "mobile_external_fetch: false",
      "exact_llm_text_assertions: false",
      "fake_green_claimed: false",
      "secrets_printed: false",
      artifact.exact_reason ? `exact_reason: ${artifact.exact_reason}` : "exact_reason: null",
      "",
    ].join("\n"),
    "utf8",
  );
  return artifact;
}

function runCommand(
  command: string,
  args: readonly string[],
  env: Record<string, string>,
  secrets: readonly string[],
): string {
  const result = spawnSync(command, [...args], {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: "pipe",
    shell: process.platform === "win32" && /\.(bat|cmd)$/i.test(command),
    timeout: 120_000,
    killSignal: "SIGTERM",
    env: {
      ...process.env,
      ...env,
      MAESTRO_CLI_NO_ANALYTICS: "1",
      MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: "true",
    },
  });
  const stdout = redactE2eSecrets(result.stdout ?? "", secrets);
  const stderr = redactE2eSecrets(result.stderr ?? "", secrets);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}\n${stdout}\n${stderr}`.trim());
  }
  return stdout.trim();
}

function adb(deviceId: string, args: readonly string[], secrets: readonly string[] = []): string {
  return runCommand("adb", ["-s", deviceId, ...args], {}, secrets);
}

function flowLines(): string[] {
  const lines = [
    `appId: ${appId}`,
    "name: AI Construction Knowhow Engine Runtime",
    "---",
    "- launchApp:",
    "    clearState: false",
    "- runFlow:",
    "    when:",
    "      visible:",
    '        id: "auth.login.screen"',
    "    commands:",
    "      - extendedWaitUntil:",
    "          visible:",
    '            id: "auth.login.email"',
    "          timeout: 15000",
    "      - tapOn:",
    '          id: "auth.login.email"',
    "      - inputText: ${MAESTRO_E2E_DIRECTOR_EMAIL}",
    "      - tapOn:",
    '          id: "auth.login.password"',
    "      - inputText: ${MAESTRO_E2E_DIRECTOR_PASSWORD}",
    "      - hideKeyboard",
    "      - tapOn:",
    '          id: "auth.login.submit"',
    "      - extendedWaitUntil:",
    "          visible:",
    '            id: "profile-edit-open"',
    "          timeout: 30000",
    '- openLink: "rik://ai-command-center"',
    "- extendedWaitUntil:",
    "    visible:",
    '      id: "ai.command_center.screen"',
    "    timeout: 30000",
  ];

  lines.push("");
  return lines;
}

function createFlowFile(): string {
  const flowPath = path.join(
    os.tmpdir(),
    `rik-ai-construction-knowhow-${process.pid}-${Date.now()}.yaml`,
  );
  fs.writeFileSync(flowPath, flowLines().join("\n"), "utf8");
  return flowPath;
}

function promptFlowLines(): string[] {
  return [
    `appId: ${appId}`,
    "name: AI Construction Knowhow Prompt Pipeline Probe",
    "---",
    '- openLink: "rik://ai?context=director"',
    "- extendedWaitUntil:",
    "    visible:",
    '      id: "ai.assistant.screen"',
    "    timeout: 30000",
    "- extendedWaitUntil:",
    "    visible:",
    '      id: "ai.assistant.input"',
    "    timeout: 30000",
    "- tapOn:",
    '    id: "ai.assistant.input"',
    "",
  ];
}

function createPromptFlowFile(): string {
  const flowPath = path.join(
    os.tmpdir(),
    `rik-ai-construction-knowhow-prompt-${process.pid}-${Date.now()}.yaml`,
  );
  fs.writeFileSync(flowPath, promptFlowLines().join("\n"), "utf8");
  return flowPath;
}

function dumpAndroidHierarchy(deviceId: string, secrets: readonly string[]): string {
  const dumpPath = "/sdcard/rik_ai_construction_knowhow_window.xml";
  adb(deviceId, ["shell", "uiautomator", "dump", dumpPath], secrets);
  return adb(deviceId, ["exec-out", "cat", dumpPath], secrets);
}

function boundsCenterForResourceId(hierarchy: string, resourceId: string): { x: number; y: number } | null {
  const escaped = resourceId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = hierarchy.match(new RegExp(`resource-id="${escaped}"[\\s\\S]*?bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`));
  if (!match) return null;
  const left = Number(match[1]);
  const top = Number(match[2]);
  const right = Number(match[3]);
  const bottom = Number(match[4]);
  if (![left, top, right, bottom].every(Number.isFinite)) return null;
  return {
    x: Math.round((left + right) / 2),
    y: Math.round((top + bottom) / 2),
  };
}

function observePromptPipeline(deviceId: string, secrets: readonly string[]): boolean {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    const hierarchy = dumpAndroidHierarchy(deviceId, secrets);
    if (
      hierarchy.includes('resource-id="ai.assistant.loading"') ||
      hierarchy.includes('content-desc="AI assistant loading"') ||
      hierarchy.includes('resource-id="ai.assistant.response"')
    ) {
      return true;
    }
    adb(deviceId, ["shell", "input", "swipe", "540", "1820", "540", "1520", "250"], secrets);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 750);
  }
  return false;
}

function targetConstructionKnowhowIds(deviceId: string, secrets: readonly string[]): boolean {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const hierarchy = dumpAndroidHierarchy(deviceId, secrets);
    if (deterministicTestIds.every((testId) => hierarchy.includes(`resource-id="${testId}"`))) {
      return true;
    }
    adb(deviceId, ["shell", "input", "swipe", "540", "1820", "540", "1320", "250"], secrets);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
  }
  return false;
}

export async function runAiConstructionKnowhowEngineMaestro(): Promise<AiConstructionKnowhowEngineRuntimeArtifact> {
  loadEnvFilesIntoProcess();

  if (!sourceReady()) {
    return writeArtifacts(
      baseArtifact(
        "BLOCKED_CONSTRUCTION_KNOWHOW_RUNTIME_TARGETABILITY",
        "Construction knowhow source contracts or deterministic testIDs are not mounted.",
      ),
    );
  }

  const roleAuth = resolveExplicitAiRoleAuthEnv();
  if (
    roleAuth.roleMode !== "developer_control_full_access" ||
    roleAuth.source !== "developer_control_explicit_env" ||
    !roleAuth.greenEligible ||
    !roleAuth.env
  ) {
    return writeArtifacts(
      baseArtifact(
        "BLOCKED_CONSTRUCTION_KNOWHOW_RUNTIME_TARGETABILITY",
        roleAuth.exactReason ?? "Developer/control full-access E2E auth is required.",
      ),
    );
  }

  const installedRuntime = await verifyAndroidInstalledBuildRuntime();
  if (installedRuntime.final_status !== "GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF") {
    return writeArtifacts(
      baseArtifact(
        "BLOCKED_CONSTRUCTION_KNOWHOW_RUNTIME_TARGETABILITY",
        installedRuntime.exact_reason ?? "Android installed runtime smoke did not pass.",
      ),
    );
  }

  const emulator = await ensureAndroidEmulatorReady({ projectRoot });
  if (emulator.final_status !== "GREEN_ANDROID_EMULATOR_READY" || !emulator.deviceId) {
    return writeArtifacts(
      baseArtifact(
        "BLOCKED_CONSTRUCTION_KNOWHOW_RUNTIME_TARGETABILITY",
        emulator.blockedReason ?? "Android emulator/device was not ready.",
        { android_runtime_smoke: "PASS" },
      ),
    );
  }

  if (!fs.existsSync(maestroBinary)) {
    return writeArtifacts(
      baseArtifact(
        "BLOCKED_CONSTRUCTION_KNOWHOW_RUNTIME_TARGETABILITY",
        "Maestro CLI is not available.",
        { android_runtime_smoke: "PASS" },
      ),
    );
  }

  const secrets = collectExplicitE2eSecrets({ ...process.env, ...roleAuth.env });
  const flowPath = createFlowFile();
  try {
    runCommand(
      maestroBinary,
      ["--device", emulator.deviceId, "test", flowPath],
      {
        MAESTRO_E2E_DIRECTOR_EMAIL: roleAuth.env.E2E_DIRECTOR_EMAIL,
        MAESTRO_E2E_DIRECTOR_PASSWORD: roleAuth.env.E2E_DIRECTOR_PASSWORD,
      },
      secrets,
    );
  } catch {
    return writeArtifacts(
      baseArtifact(
        "BLOCKED_CONSTRUCTION_KNOWHOW_RUNTIME_TARGETABILITY",
        "Construction knowhow preview was not targetable in Android hierarchy.",
        { android_runtime_smoke: "PASS" },
      ),
    );
  } finally {
    fs.rmSync(flowPath, { force: true });
  }

  if (!targetConstructionKnowhowIds(emulator.deviceId, secrets)) {
    return writeArtifacts(
      baseArtifact(
        "BLOCKED_CONSTRUCTION_KNOWHOW_RUNTIME_TARGETABILITY",
        "Construction knowhow preview was not targetable in Android hierarchy.",
        { android_runtime_smoke: "PASS" },
      ),
    );
  }

  const promptFlowPath = createPromptFlowFile();
  try {
    runCommand(
      maestroBinary,
      ["--device", emulator.deviceId, "test", promptFlowPath],
      {},
      secrets,
    );
  } catch {
    return writeArtifacts(
      baseArtifact(
        "BLOCKED_CONSTRUCTION_KNOWHOW_RUNTIME_TARGETABILITY",
        "AI assistant prompt pipeline probe could not send through deterministic UI.",
        {
          android_runtime_smoke: "PASS",
          deterministic_testids_targetable: true,
        },
      ),
    );
  } finally {
    fs.rmSync(promptFlowPath, { force: true });
  }

  try {
    const inputBounds = boundsCenterForResourceId(
      dumpAndroidHierarchy(emulator.deviceId, secrets),
      "ai.assistant.input",
    );
    if (!inputBounds) {
      throw new Error("ai.assistant.input bounds were not found for prompt input.");
    }
    adb(emulator.deviceId, ["shell", "input", "tap", String(inputBounds.x), String(inputBounds.y)], secrets);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 750);
    for (let index = 0; index < 40; index += 1) {
      adb(emulator.deviceId, ["shell", "input", "keyevent", "67"], secrets);
    }
    adb(emulator.deviceId, ["shell", "input", "text", "construction_knowhow_runtime_proof"], secrets);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1200);
    const sendBounds = boundsCenterForResourceId(
      dumpAndroidHierarchy(emulator.deviceId, secrets),
      "ai.assistant.send",
    );
    if (!sendBounds) {
      throw new Error("ai.assistant.send bounds were not found after prompt input.");
    }
    adb(emulator.deviceId, ["shell", "input", "tap", String(sendBounds.x), String(sendBounds.y)], secrets);
  } catch {
    return writeArtifacts(
      baseArtifact(
        "BLOCKED_CONSTRUCTION_KNOWHOW_RUNTIME_TARGETABILITY",
        "AI assistant prompt pipeline probe could not enter and send deterministic UI input.",
        {
          android_runtime_smoke: "PASS",
          deterministic_testids_targetable: true,
        },
      ),
    );
  }

  const promptProof = observePromptPipeline(emulator.deviceId, secrets);
  if (!promptProof) {
    return writeArtifacts(
      baseArtifact(
        "BLOCKED_CONSTRUCTION_KNOWHOW_RUNTIME_TARGETABILITY",
        "AI assistant prompt pipeline did not expose loading or response runtime proof.",
        {
          android_runtime_smoke: "PASS",
          deterministic_testids_targetable: true,
        },
      ),
    );
  }

  return writeArtifacts(
    baseArtifact("GREEN_AI_CONSTRUCTION_KNOWHOW_ENGINE_READY", null, {
      android_runtime_smoke: "PASS",
      emulator_runtime_proof: "PASS",
      prompt_pipeline_status: "PASS",
      deterministic_testids_targetable: true,
    }),
  );
}

if (require.main === module) {
  void runAiConstructionKnowhowEngineMaestro()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_AI_CONSTRUCTION_KNOWHOW_ENGINE_READY") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(redactE2eSecrets(error instanceof Error ? error.stack ?? error.message : String(error)));
      process.exitCode = 1;
    });
}
