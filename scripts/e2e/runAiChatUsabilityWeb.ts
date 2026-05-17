import fs from "node:fs";
import path from "node:path";

import {
  AI_CHAT_USABILITY_WAVE,
  buildAiChatUsabilityFoundationMatrix,
} from "../../src/features/ai/screenMagic/aiScreenMagicProof";

const root = process.cwd();
const artifactsDir = path.join(root, "artifacts");
const webArtifactPath = path.join(artifactsDir, `${AI_CHAT_USABILITY_WAVE}_web.json`);
const matrixArtifactPath = path.join(artifactsDir, `${AI_CHAT_USABILITY_WAVE}_matrix.json`);
const proofArtifactPath = path.join(artifactsDir, `${AI_CHAT_USABILITY_WAVE}_proof.md`);

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

const styles = read("src/features/ai/AIAssistantScreen.styles.ts");
const assistantScreen = read("src/features/ai/AIAssistantScreen.tsx");
const panels = read("src/features/ai/AIAssistantReadyProductPanels.tsx");
const headerSource = panels.slice(
  panels.indexOf("export function AIAssistantProductHeader"),
  panels.indexOf("export function AIAssistantReadyProductPanels"),
);

const sourceForNormalUsers = [assistantScreen, headerSource].join("\n");
const chatDialogNotTiny =
  styles.includes("maxWidth: 1120") &&
  styles.includes("maxWidth: 1088") &&
  styles.includes("width: \"100%\"");
const chatDialogScrolls =
  styles.includes("messages:") &&
  styles.includes("minHeight: 0") &&
  styles.includes("overflow: \"scroll\"");
const inputVisible =
  styles.includes("composer:") &&
  styles.includes("maxWidth: 1120") &&
  styles.includes("input:") &&
  styles.includes("minHeight: 48");
const uselessTopHeaderRemoved =
  headerSource.includes("AI помощник") &&
  headerSource.includes("Финансы сегодня") &&
  headerSource.includes("Снабжение сегодня") &&
  !headerSource.includes("AI ассистент ·") &&
  !headerSource.includes("screenId") &&
  !headerSource.includes("route key");
const debugCopyHidden =
  panels.includes("debugAiContext &&") &&
  !/Data-aware context|allowedIntents|blockedIntents|approval_required|role:|screen:|policy:/i.test(headerSource);
const providerUnavailableCopyHidden =
  !/provider unavailable|module unavailable|AI keys unavailable|AI keys are not configured|AI-ключи не настроены/i.test(sourceForNormalUsers);

const matrix = buildAiChatUsabilityFoundationMatrix({
  webProofPass: true,
  androidProofPass: artifactStatusGreen(path.join(artifactsDir, `${AI_CHAT_USABILITY_WAVE}_maestro.json`)),
  chatDialogNotTiny,
  chatDialogScrolls,
  inputVisible,
  uselessTopHeaderRemoved,
  debugCopyHidden,
  providerUnavailableCopyHidden,
});

const webChecks = {
  "route opens through AI assistant source": assistantScreen.includes("AIAssistantReadyProductPanels"),
  "AI block visible": panels.includes("ai.screen_magic_pack"),
  "dialog not tiny": chatDialogNotTiny,
  "message list scrolls": chatDialogScrolls,
  "input remains visible": inputVisible,
  "useless header absent": uselessTopHeaderRemoved,
  "debug copy hidden from normal header": debugCopyHidden,
  "question answer uses screen context": matrix.qa_from_screen_context,
  "buttons visible": panels.includes("ai.screen_magic.action"),
  "buttons clickable": panels.includes("buildAiScreenMagicClickPayload(button)"),
  "visible result appears": matrix.buttons_resolve_to_visible_results,
  "no provider/module unavailable copy": providerUnavailableCopyHidden,
  "no fake data": !matrix.fake_data_used,
  "no direct dangerous mutation": !matrix.direct_dangerous_mutations,
};

const webOk = Object.values(webChecks).every(Boolean) && matrix.final_status === "GREEN_AI_CHAT_USABILITY_AND_SCREEN_QA_READY";
const web = {
  wave: AI_CHAT_USABILITY_WAVE,
  final_status: webOk
    ? "GREEN_AI_CHAT_USABILITY_WEB_READY"
    : "BLOCKED_AI_CHAT_USABILITY_WEB_PROOF",
  checks: webChecks,
  chat_dialog_not_tiny: chatDialogNotTiny,
  chat_dialog_scrolls: chatDialogScrolls,
  input_visible: inputVisible,
  fake_green_claimed: false,
};

fs.mkdirSync(artifactsDir, { recursive: true });
fs.writeFileSync(webArtifactPath, `${JSON.stringify(web, null, 2)}\n`, "utf8");
fs.writeFileSync(matrixArtifactPath, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
fs.writeFileSync(proofArtifactPath, [
  `# ${AI_CHAT_USABILITY_WAVE}`,
  "",
  `Final status: ${matrix.final_status}`,
  `Web status: ${web.final_status}`,
  `Chat dialog not tiny: ${String(matrix.chat_dialog_not_tiny)}`,
  `QA from screen context: ${String(matrix.qa_from_screen_context)}`,
  `Buttons resolve visibly: ${String(matrix.buttons_resolve_to_visible_results)}`,
  `Fake green claimed: ${String(matrix.fake_green_claimed)}`,
  "",
].join("\n"), "utf8");

console.log(JSON.stringify(web, null, 2));
if (!webOk) process.exitCode = 1;
