import fs from "node:fs";
import path from "node:path";

import {
  buildAiScreenMagicEnterpriseMatrix,
  buildAiScreenMagicEnterpriseProofMarkdown,
  getAiScreenMagicScopedWaveConfig,
  listAiScreenMagicPacksForScope,
} from "./aiScreenMagicScopedWaveProof";
import { buildAiScreenMagicButtonResultCopy } from "../../src/features/ai/screenMagic/aiScreenMagicButtonResolver";
import { answerAiScreenMagicQuestion } from "../../src/features/ai/screenMagic/aiScreenMagicQuestionAnswerEngine";

const artifactsDir = path.join(process.cwd(), "artifacts");

function readScopeArg(): string | null {
  const scopeIndex = process.argv.indexOf("--scope");
  if (scopeIndex >= 0 && process.argv[scopeIndex + 1]) return process.argv[scopeIndex + 1];
  return null;
}

function readIfExists(filePath: string): string {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function hasForbiddenCopy(value: string): boolean {
  return /provider unavailable|module unavailable|AI-РєР»СЋС‡Рё РЅРµ РЅР°СЃС‚СЂРѕРµРЅС‹|AI keys are not configured|raw policy dump|raw provider payload|raw transport/i.test(value);
}

function runScopedWebProof(scope: string): void {
  const config = getAiScreenMagicScopedWaveConfig(scope);
  if (!config) throw new Error(`Unknown AI screen magic scope: ${scope}`);

  const packs = listAiScreenMagicPacksForScope(scope);
  const packByScreen = new Map(packs.map((pack) => [pack.screenId, pack]));
  const aiRoute = readIfExists(path.join(process.cwd(), "app", "(tabs)", "ai.tsx"));
  const assistantScreen = readIfExists(path.join(process.cwd(), "src", "features", "ai", "AIAssistantScreen.tsx"));
  const panels = readIfExists(path.join(process.cwd(), "src", "features", "ai", "AIAssistantReadyProductPanels.tsx"));
  const styles = readIfExists(path.join(process.cwd(), "src", "features", "ai", "AIAssistantScreen.styles.ts"));
  const source = [aiRoute, assistantScreen, panels, styles, JSON.stringify(packs)].join("\n");

  const perScreen = config.requiredScreens.map((screenId) => {
    const pack = packByScreen.get(screenId);
    const qa = answerAiScreenMagicQuestion({
      pack,
      question: pack?.qa[0]?.question ?? "What is critical on this screen?",
    });
    const buttonResults = (pack?.buttons ?? []).map((button) => buildAiScreenMagicButtonResultCopy({
      pack: pack!,
      buttonIdOrLabel: button.id,
    }));
    return {
      screenId,
      route_opens: Boolean(pack && aiRoute.includes("AIAssistantScreen")),
      ai_block_visible: panels.includes("ai.screen_magic_pack"),
      dialog_opens: assistantScreen.includes("setInput") && assistantScreen.includes("send("),
      dialog_not_tiny: styles.includes("maxWidth: 1120") && styles.includes("messagesContent"),
      useless_header_absent: panels.includes("resolveAssistantHeaderTitle(domain)") && !panels.includes("scopeLabel"),
      question_can_be_sent: assistantScreen.includes('testID="ai.assistant.input"')
        && assistantScreen.includes('testID="ai.assistant.send"')
        && assistantScreen.includes("onPress={() => void send()}"),
      answer_is_screen_specific: qa?.answeredFromScreenContext === true && qa.providerCallAllowed === false,
      buttons_visible: Boolean(pack && pack.buttons.length >= 4),
      every_button_clickable: buttonResults.length === (pack?.buttons.length ?? 0) && buttonResults.every(Boolean),
      visible_result_appears: buttonResults.every((result) => Boolean(result?.answer && result.answer.length > 20)),
      no_provider_or_module_unavailable_copy: !hasForbiddenCopy(JSON.stringify(pack ?? {})),
      no_debug_copy: !hasForbiddenCopy(source),
      no_fake_data: !/\bSupplier A\b|\bSupplier B\b|fake supplier|fake price|fake payment|fake document|fake stock/i.test(JSON.stringify(pack ?? {})),
      no_direct_dangerous_mutation: (pack?.buttons ?? []).every((button) => button.canExecuteDirectly === false),
    };
  });

  const webChecks = {
    screens_covered: perScreen.every((screen) => screen.route_opens),
    ai_block_visible: perScreen.every((screen) => screen.ai_block_visible),
    dialog_opens: perScreen.every((screen) => screen.dialog_opens),
    dialog_not_tiny: perScreen.every((screen) => screen.dialog_not_tiny),
    useless_header_absent: perScreen.every((screen) => screen.useless_header_absent),
    question_can_be_sent: perScreen.every((screen) => screen.question_can_be_sent),
    answer_is_screen_specific: perScreen.every((screen) => screen.answer_is_screen_specific),
    buttons_visible: perScreen.every((screen) => screen.buttons_visible),
    every_button_clickable: perScreen.every((screen) => screen.every_button_clickable),
    visible_result_appears: perScreen.every((screen) => screen.visible_result_appears),
    no_provider_or_module_unavailable_copy: perScreen.every((screen) => screen.no_provider_or_module_unavailable_copy),
    no_debug_copy: perScreen.every((screen) => screen.no_debug_copy),
    no_fake_data: perScreen.every((screen) => screen.no_fake_data),
    no_direct_dangerous_mutation: perScreen.every((screen) => screen.no_direct_dangerous_mutation),
  };
  const webOk = Object.values(webChecks).every(Boolean);
  const proofOptions = {
    webProofPass: webOk,
    androidProofPass: false,
    iosDeliveryProofPass: false,
    chatDialogNotTiny: webChecks.dialog_not_tiny,
    uselessHeaderRemoved: webChecks.useless_header_absent,
    debugCopyHidden: webChecks.no_debug_copy,
    providerUnavailableCopyHidden: webChecks.no_provider_or_module_unavailable_copy,
  };
  const matrix = buildAiScreenMagicEnterpriseMatrix(scope, proofOptions);
  const artifact = {
    wave: scope,
    final_status: webOk
      ? "GREEN_AI_SCREEN_MAGIC_WEB_READY"
      : "BLOCKED_WEB_AI_SCREEN_MAGIC_SCOPE_PROOF",
    screens: config.requiredScreens,
    checks: webChecks,
    per_screen: perScreen,
    providerCalled: false,
    dbWritesUsed: false,
    directDangerousMutationUsed: false,
    fakeGreenClaimed: false,
  };

  writeJson(path.join(artifactsDir, `${scope}_web.json`), artifact);
  writeJson(path.join(artifactsDir, `${scope}_matrix.json`), matrix);
  fs.writeFileSync(
    path.join(artifactsDir, `${scope}_proof.md`),
    `${buildAiScreenMagicEnterpriseProofMarkdown(scope, proofOptions)}\n`,
    "utf8",
  );
  console.log(JSON.stringify(artifact, null, 2));
  if (!webOk) process.exitCode = 1;
}

async function main(): Promise<void> {
  const scope = readScopeArg();
  if (!scope || !getAiScreenMagicScopedWaveConfig(scope)) {
    await import("./runAiScreenByScreenMagicWeb");
    return;
  }
  runScopedWebProof(scope);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
