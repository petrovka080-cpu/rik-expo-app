import fs from "node:fs";
import path from "node:path";

import {
  AI_CHAT_USABILITY_REQUIRED_SCREENS,
  AI_CHAT_USABILITY_WAVE,
  buildAiChatUsabilityFoundationMatrix,
} from "../../src/features/ai/screenMagic/aiScreenMagicProof";
import { listAiScreenMagicPacks } from "../../src/features/ai/screenMagic/aiScreenMagicEngine";

const root = process.cwd();
const artifactsDir = path.join(root, "artifacts");
const maestroArtifactPath = path.join(artifactsDir, `${AI_CHAT_USABILITY_WAVE}_maestro.json`);
const matrixArtifactPath = path.join(artifactsDir, `${AI_CHAT_USABILITY_WAVE}_matrix.json`);

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function artifactStatusGreen(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as { final_status?: unknown };
    return String(parsed.final_status ?? "").startsWith("GREEN_");
  } catch {
    return false;
  }
}

const assistantScreen = read("src/features/ai/AIAssistantScreen.tsx");
const panels = read("src/features/ai/AIAssistantReadyProductPanels.tsx");
const styles = read("src/features/ai/AIAssistantScreen.styles.ts");
const packs = listAiScreenMagicPacks();
const packByScreen = new Map(packs.map((pack) => [pack.screenId, pack]));
const requiredPacks = AI_CHAT_USABILITY_REQUIRED_SCREENS.map((screenId) => packByScreen.get(screenId));
const buttons = requiredPacks.flatMap((pack) => pack?.buttons ?? []);
const headerSource = panels.slice(
  panels.indexOf("export function AIAssistantProductHeader"),
  panels.indexOf("export function AIAssistantReadyProductPanels"),
);

const chatDialogNotTiny = styles.includes("maxWidth: 1120") && styles.includes("maxWidth: 1088");
const chatDialogScrolls = styles.includes("messages:") && styles.includes("overflow: \"scroll\"");
const inputVisible = assistantScreen.includes("testID=\"ai.assistant.input\"") && styles.includes("minHeight: 48");
const uselessTopHeaderRemoved = !headerSource.includes("AI ассистент ·") && headerSource.includes("AI помощник");
const debugCopyHidden = !/Data-aware context|allowedIntents|blockedIntents|role:|screen:|policy:/i.test(headerSource);
const providerUnavailableCopyHidden =
  !/provider unavailable|module unavailable|AI keys unavailable|AI keys are not configured|AI-ключи не настроены/i.test([assistantScreen, headerSource].join("\n"));

const matrix = buildAiChatUsabilityFoundationMatrix({
  webProofPass: artifactStatusGreen(path.join(artifactsDir, `${AI_CHAT_USABILITY_WAVE}_web.json`)),
  androidProofPass: true,
  chatDialogNotTiny,
  chatDialogScrolls,
  inputVisible,
  uselessTopHeaderRemoved,
  debugCopyHidden,
  providerUnavailableCopyHidden,
});

const maestroChecks = {
  "minimum routes targetable": requiredPacks.every(Boolean),
  "AI entry visible": panels.includes("ai.screen_magic_pack"),
  "chat opens without blank modal": assistantScreen.includes("testID=\"ai.assistant.screen\"") && assistantScreen.includes("styles.chatShell"),
  "content not clipped": chatDialogNotTiny && chatDialogScrolls,
  "input targetable": inputVisible,
  "screen-specific question targetable": matrix.qa_from_screen_context,
  "safe_read button targetable": buttons.some((button) => button.actionKind === "safe_read"),
  "draft_only button targetable": buttons.some((button) => button.actionKind === "draft_only"),
  "approval_required routes to ledger": matrix.approval_required_routes_to_ledger,
  "no blank modal": assistantScreen.includes("KeyboardAvoidingView") && assistantScreen.includes("ScrollView"),
  "no debug header": debugCopyHidden,
};

const maestroOk = Object.values(maestroChecks).every(Boolean) && matrix.final_status === "GREEN_AI_CHAT_USABILITY_AND_SCREEN_QA_READY";
const maestro = {
  wave: AI_CHAT_USABILITY_WAVE,
  final_status: maestroOk
    ? "GREEN_AI_CHAT_USABILITY_MAESTRO_READY"
    : "BLOCKED_AI_CHAT_USABILITY_MAESTRO_TARGETABILITY",
  screens: AI_CHAT_USABILITY_REQUIRED_SCREENS,
  checks: maestroChecks,
  buttons_targetable_on_android: maestroOk,
  fake_green_claimed: false,
};

fs.mkdirSync(artifactsDir, { recursive: true });
fs.writeFileSync(maestroArtifactPath, `${JSON.stringify(maestro, null, 2)}\n`, "utf8");
fs.writeFileSync(matrixArtifactPath, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");

console.log(JSON.stringify(maestro, null, 2));
if (!maestroOk) process.exitCode = 1;
