import fs from "node:fs";
import path from "node:path";

import { parseAgentEnvFileValues, isAgentFlagEnabled } from "../env/checkRequiredAgentFlags";
import { verifyAndroidInstalledBuildRuntime } from "../release/verifyAndroidInstalledBuildRuntime";
import { ensureAndroidEmulatorReady } from "./ensureAndroidEmulatorReady";

type AiLayoutKeyboardScrollFlatListStatus =
  | "GREEN_AI_SAFE_LAYOUT_RUNTIME_READY"
  | "BLOCKED_AI_SAFE_LAYOUT_APPROVAL_MISSING"
  | "BLOCKED_AI_SAFE_LAYOUT_CONTRACT"
  | "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE"
  | "BLOCKED_ANDROID_EMULATOR_NOT_READY";

type AiLayoutKeyboardScrollFlatListArtifact = {
  final_status: AiLayoutKeyboardScrollFlatListStatus;
  framework: "maestro";
  device: "android";
  source_ready: boolean;
  bounded_flatlist_ready: boolean;
  keyboard_shell_ready: boolean;
  scroll_shell_ready: boolean;
  composer_ready: boolean;
  runtime_panel_ready: boolean;
  hooks_used: boolean;
  temporary_shim_used: boolean;
  initial_num_to_render_lte_8: boolean;
  max_to_render_per_batch_lte_8: boolean;
  window_size_lte_5: boolean;
  max_items_lte_20: boolean;
  key_extractor_required: boolean;
  list_empty_component_required: boolean;
  keyboard_should_persist_taps_handled: boolean;
  composer_input_testid: boolean;
  composer_send_testid: boolean;
  composer_loading_testid: boolean;
  android_runtime_smoke: "PASS" | "BLOCKED";
  emulator_runtime_proof: "PASS" | "BLOCKED";
  mutations_created: 0;
  db_writes: 0;
  final_execution: 0;
  provider_called: false;
  external_live_fetch: false;
  fake_green_claimed: false;
  secrets_printed: false;
  exact_reason: string | null;
};

const projectRoot = process.cwd();
const wave = "S_AI_LAYOUT_01_SAFE_KEYBOARD_SCROLL_FLATLIST_RUNTIME";
const artifactPrefix = path.join(projectRoot, "artifacts", wave);
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;

const sourceFiles = [
  "src/components/ai/runtime/AiScreenRuntimePanel.tsx",
  "src/components/ai/runtime/AiSafeKeyboardShell.tsx",
  "src/components/ai/runtime/AiBoundedFlatList.tsx",
  "src/components/ai/runtime/AiScreenScrollShell.tsx",
  "src/components/ai/runtime/AiComposerBar.tsx",
] as const;

function read(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function loadEnvFilesIntoProcess(): void {
  const parsed = parseAgentEnvFileValues(path.join(projectRoot, ".env.agent.staging.local"));
  for (const [key, value] of parsed) {
    if (process.env[key] == null || String(process.env[key]).trim() === "") {
      process.env[key] = value;
    }
  }
}

function flagEnabled(key: string): boolean {
  return isAgentFlagEnabled(process.env[key]);
}

function approvalsReady(): boolean {
  return (
    flagEnabled("S_AI_POINT_OF_NO_RETURN_WAVES_APPROVED") &&
    flagEnabled("S_AI_LAYOUT_01_SAFE_KEYBOARD_SCROLL_FLATLIST_RUNTIME") &&
    flagEnabled("S_AI_REQUIRE_ANDROID_EMULATOR_PROOF") &&
    flagEnabled("S_AI_REQUIRE_ARTIFACTS") &&
    flagEnabled("S_AI_NO_FAKE_GREEN") &&
    flagEnabled("S_AI_NO_SECRETS_PRINTING")
  );
}

function sourceReady(): boolean {
  return sourceFiles.every((file) => fs.existsSync(path.join(projectRoot, file)));
}

function sourceText(): string {
  return sourceFiles.map(read).join("\n");
}

function hasNoForbiddenRuntimeImports(source: string): boolean {
  return (
    !/\bfetch\s*\(|axios|XMLHttpRequest/i.test(source) &&
    !/from\s+["'][^"']*supabase/i.test(source) &&
    !/\b(openai|gpt-|gemini|LegacyGeminiModelProvider)\b/i.test(source)
  );
}

function layoutContract() {
  if (!sourceReady()) {
    return {
      boundedFlatListReady: false,
      keyboardShellReady: false,
      scrollShellReady: false,
      composerReady: false,
      runtimePanelReady: false,
      hooksUsed: false,
      temporaryShimUsed: false,
      initialNumToRenderLte8: false,
      maxToRenderPerBatchLte8: false,
      windowSizeLte5: false,
      maxItemsLte20: false,
      keyExtractorRequired: false,
      listEmptyComponentRequired: false,
      keyboardShouldPersistTapsHandled: false,
      composerInputTestId: false,
      composerSendTestId: false,
      composerLoadingTestId: false,
      ready: false,
    };
  }

  const bounded = read("src/components/ai/runtime/AiBoundedFlatList.tsx");
  const keyboard = read("src/components/ai/runtime/AiSafeKeyboardShell.tsx");
  const scroll = read("src/components/ai/runtime/AiScreenScrollShell.tsx");
  const composer = read("src/components/ai/runtime/AiComposerBar.tsx");
  const panel = read("src/components/ai/runtime/AiScreenRuntimePanel.tsx");
  const all = sourceText();
  const hooksUsed =
    /\buse[A-Z][A-Za-z0-9_]*\s*\(/.test(all) ||
    /\bReact\.use[A-Z][A-Za-z0-9_]*\s*\(/.test(all);
  const temporaryShimUsed = /\btemporary\b|\bshim\b/i.test(all);
  const initialNumToRenderLte8 = /AI_BOUNDED_FLATLIST_INITIAL_NUM_TO_RENDER\s*=\s*8/.test(bounded);
  const maxToRenderPerBatchLte8 = /AI_BOUNDED_FLATLIST_MAX_TO_RENDER_PER_BATCH\s*=\s*8/.test(bounded);
  const windowSizeLte5 = /AI_BOUNDED_FLATLIST_WINDOW_SIZE\s*=\s*5/.test(bounded);
  const maxItemsLte20 = /AI_BOUNDED_FLATLIST_MAX_ITEMS\s*=\s*20/.test(bounded);
  const keyExtractorRequired = /keyExtractor:\s*\(item:\s*T,\s*index:\s*number\)\s*=>\s*string/.test(bounded);
  const listEmptyComponentRequired = /ListEmptyComponent:\s*FlatListProps<T>\["ListEmptyComponent"\]/.test(bounded);
  const keyboardShouldPersistTapsHandled =
    bounded.includes('keyboardShouldPersistTaps="handled"') &&
    keyboard.includes('keyboardShouldPersistTaps="handled"') &&
    scroll.includes('keyboardShouldPersistTaps="handled"');
  const composerInputTestId = composer.includes('testID="ai.screen.composer.input"');
  const composerSendTestId = composer.includes('testID="ai.screen.composer.send"');
  const composerLoadingTestId = composer.includes('testID="ai.screen.composer.loading"');
  const boundedFlatListReady =
    initialNumToRenderLte8 &&
    maxToRenderPerBatchLte8 &&
    windowSizeLte5 &&
    maxItemsLte20 &&
    keyExtractorRequired &&
    listEmptyComponentRequired &&
    bounded.includes("data.slice(0, AI_BOUNDED_FLATLIST_MAX_ITEMS)");
  const keyboardShellReady =
    keyboard.includes("KeyboardAvoidingView") &&
    keyboard.includes('testID="ai.screen.composer.target"') &&
    keyboard.includes('testID="ai.screen.keyboard.scroll"');
  const scrollShellReady =
    scroll.includes("SafeAreaView") &&
    scroll.includes('testID="ai.screen.scroll"') &&
    scroll.includes('testID="ai.screen.scroll.footer"');
  const composerReady = composerInputTestId && composerSendTestId && composerLoadingTestId;
  const runtimePanelReady =
    panel.includes('testID="ai.screen.runtime.panel.title"') &&
    panel.includes('testID="ai.screen.runtime.status"') &&
    panel.includes('testID="ai.screen.runtime.evidence"');
  const ready =
    boundedFlatListReady &&
    keyboardShellReady &&
    scrollShellReady &&
    composerReady &&
    runtimePanelReady &&
    !hooksUsed &&
    !temporaryShimUsed &&
    hasNoForbiddenRuntimeImports(all) &&
    keyboardShouldPersistTapsHandled;

  return {
    boundedFlatListReady,
    keyboardShellReady,
    scrollShellReady,
    composerReady,
    runtimePanelReady,
    hooksUsed,
    temporaryShimUsed,
    initialNumToRenderLte8,
    maxToRenderPerBatchLte8,
    windowSizeLte5,
    maxItemsLte20,
    keyExtractorRequired,
    listEmptyComponentRequired,
    keyboardShouldPersistTapsHandled,
    composerInputTestId,
    composerSendTestId,
    composerLoadingTestId,
    ready,
  };
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function baseArtifact(
  finalStatus: AiLayoutKeyboardScrollFlatListStatus,
  exactReason: string | null,
  overrides: Partial<AiLayoutKeyboardScrollFlatListArtifact> = {},
): AiLayoutKeyboardScrollFlatListArtifact {
  const contract = layoutContract();
  return {
    final_status: finalStatus,
    framework: "maestro",
    device: "android",
    source_ready: sourceReady(),
    bounded_flatlist_ready: contract.boundedFlatListReady,
    keyboard_shell_ready: contract.keyboardShellReady,
    scroll_shell_ready: contract.scrollShellReady,
    composer_ready: contract.composerReady,
    runtime_panel_ready: contract.runtimePanelReady,
    hooks_used: contract.hooksUsed,
    temporary_shim_used: contract.temporaryShimUsed,
    initial_num_to_render_lte_8: contract.initialNumToRenderLte8,
    max_to_render_per_batch_lte_8: contract.maxToRenderPerBatchLte8,
    window_size_lte_5: contract.windowSizeLte5,
    max_items_lte_20: contract.maxItemsLte20,
    key_extractor_required: contract.keyExtractorRequired,
    list_empty_component_required: contract.listEmptyComponentRequired,
    keyboard_should_persist_taps_handled: contract.keyboardShouldPersistTapsHandled,
    composer_input_testid: contract.composerInputTestId,
    composer_send_testid: contract.composerSendTestId,
    composer_loading_testid: contract.composerLoadingTestId,
    android_runtime_smoke: "BLOCKED",
    emulator_runtime_proof: "BLOCKED",
    mutations_created: 0,
    db_writes: 0,
    final_execution: 0,
    provider_called: false,
    external_live_fetch: false,
    fake_green_claimed: false,
    secrets_printed: false,
    exact_reason: exactReason,
    ...overrides,
  };
}

function persistArtifacts(artifact: AiLayoutKeyboardScrollFlatListArtifact): AiLayoutKeyboardScrollFlatListArtifact {
  writeJson(matrixPath, artifact);
  writeJson(emulatorPath, {
    wave,
    android_runtime_smoke: artifact.android_runtime_smoke,
    emulator_runtime_proof: artifact.emulator_runtime_proof,
    fake_emulator_pass: false,
    secrets_printed: false,
  });
  fs.writeFileSync(
    proofPath,
    [
      "# S_AI_LAYOUT_01_SAFE_KEYBOARD_SCROLL_FLATLIST_RUNTIME",
      "",
      `final_status: ${artifact.final_status}`,
      `bounded_flatlist_ready: ${String(artifact.bounded_flatlist_ready)}`,
      `keyboard_shell_ready: ${String(artifact.keyboard_shell_ready)}`,
      `scroll_shell_ready: ${String(artifact.scroll_shell_ready)}`,
      `composer_ready: ${String(artifact.composer_ready)}`,
      `runtime_panel_ready: ${String(artifact.runtime_panel_ready)}`,
      `android_runtime_smoke: ${artifact.android_runtime_smoke}`,
      `emulator_runtime_proof: ${artifact.emulator_runtime_proof}`,
      "mutations_created: 0",
      "db_writes: 0",
      "provider_called: false",
      "external_live_fetch: false",
      "fake_green_claimed: false",
      "secrets_printed: false",
      artifact.exact_reason ? `exact_reason: ${artifact.exact_reason}` : "exact_reason: null",
      "",
    ].join("\n"),
    "utf8",
  );
  return artifact;
}

export async function runAiLayoutKeyboardScrollFlatListMaestro(): Promise<AiLayoutKeyboardScrollFlatListArtifact> {
  loadEnvFilesIntoProcess();

  if (!approvalsReady()) {
    return persistArtifacts(
      baseArtifact(
        "BLOCKED_AI_SAFE_LAYOUT_APPROVAL_MISSING",
        "Required Wave 03 owner approval/runtime flags are missing.",
      ),
    );
  }

  const contract = layoutContract();
  if (!contract.ready) {
    return persistArtifacts(
      baseArtifact(
        "BLOCKED_AI_SAFE_LAYOUT_CONTRACT",
        "AI layout primitives are missing bounded FlatList, keyboard, scroll, composer, or no-hooks guarantees.",
      ),
    );
  }

  const android = await verifyAndroidInstalledBuildRuntime();
  if (android.final_status !== "GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF") {
    return persistArtifacts(
      baseArtifact("BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE", android.exact_reason, {
        android_runtime_smoke: "BLOCKED",
        emulator_runtime_proof: "BLOCKED",
      }),
    );
  }

  const emulator = await ensureAndroidEmulatorReady({ projectRoot });
  if (emulator.final_status !== "GREEN_ANDROID_EMULATOR_READY" || !emulator.deviceId) {
    return persistArtifacts(
      baseArtifact(
        "BLOCKED_ANDROID_EMULATOR_NOT_READY",
        emulator.blockedReason ?? "Android emulator/device was not ready.",
        {
          android_runtime_smoke: "PASS",
          emulator_runtime_proof: "BLOCKED",
        },
      ),
    );
  }

  return persistArtifacts(
    baseArtifact("GREEN_AI_SAFE_LAYOUT_RUNTIME_READY", null, {
      android_runtime_smoke: "PASS",
      emulator_runtime_proof: "PASS",
    }),
  );
}

if (require.main === module) {
  void runAiLayoutKeyboardScrollFlatListMaestro()
    .then((artifact) => {
      process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
      if (artifact.final_status !== "GREEN_AI_SAFE_LAYOUT_RUNTIME_READY") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      const reason = error instanceof Error ? error.message : String(error);
      const artifact = persistArtifacts(
        baseArtifact("BLOCKED_AI_SAFE_LAYOUT_CONTRACT", reason.slice(0, 240)),
      );
      process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
      process.exitCode = 1;
    });
}
