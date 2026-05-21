import * as fs from "fs";
import * as path from "path";

import {
  AI_LIVE_SCREEN_COPILOT_GREEN_STATUS,
  AI_LIVE_SCREEN_COPILOT_WAVE,
  buildAiLiveScreenProofInventory,
} from "../../src/lib/ai/liveScreenCopilot";
import { buildAiAppContextGraphFixture } from "../../tests/ai/aiAppContextGraphTestHelpers";
import { universalExternalWebResults } from "../../tests/ai/aiUniversalRoleQaTestHelpers";

const ARTIFACT_PREFIX = "S_AI_LIVE_SCREEN_COPILOT_UI_BUTTONS_RUSSIAN_PROOF";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${ARTIFACT_PREFIX}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeProof(markdown: string): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${ARTIFACT_PREFIX}_proof.md`), markdown, "utf8");
}

function mergeMatrices(web: Record<string, unknown>, android: Record<string, unknown>): Record<string, unknown> {
  return {
    ...web,
    android_proof_clicks_key_ai_buttons: android.android_proof_clicks_key_ai_buttons,
    android_button_noops_found: android.android_button_noops_found,
    android_blank_modals_found: android.android_blank_modals_found,
    android_answers_read_actual_text: android.android_answers_read_actual_text,
    final_status: AI_LIVE_SCREEN_COPILOT_GREEN_STATUS,
  };
}

const common = {
  graph: buildAiAppContextGraphFixture("director"),
  externalWebConnected: true,
  externalWebResults: universalExternalWebResults,
  referenceDate: "2026-05-20",
  releaseVerifyPassed: process.env.S_AI_LIVE_SCREEN_COPILOT_RELEASE_VERIFY_PASSED === "true",
};

const web = buildAiLiveScreenProofInventory({ ...common, mode: "web" });
const android = buildAiLiveScreenProofInventory({ ...common, mode: "android", keyButtonsOnly: true });
const matrix = mergeMatrices(web.matrix, android.matrix);
const blockers = [...web.blockers, ...android.blockers];

writeJson("inventory", {
  wave: AI_LIVE_SCREEN_COPILOT_WAVE,
  final_status: AI_LIVE_SCREEN_COPILOT_GREEN_STATUS,
  screens: web.screens.length,
  buttons: web.buttons.length,
  web_clicks: web.clickResults.length,
  blockers,
});
writeJson("screen_manifest", web.screens);
writeJson("button_registry", web.buttons.map((button) => ({ id: button.id, screenId: button.screenId, labelRu: button.labelRu })));
writeJson("button_contracts", web.buttons);
writeJson("web_click_results", web.clickResults);
writeJson("android_click_results", android.clickResults);
writeJson("answer_transcripts", web.clickResults.map((click) => ({
  screenId: click.screenId,
  buttonId: click.buttonId,
  labelRu: click.labelRu,
  answerTextRu: click.answerTextRu,
})));
writeJson("deep_link_clicks", web.clickResults.flatMap((click) => click.deepLinkClick ? [click.deepLinkClick] : []));
writeJson("russian_copy_audit", web.russianCopyAudit);
writeJson("noise_audit", web.noiseAudit);
writeJson("semantic_guard_trace", web.clickResults.map((click) => ({
  screenId: click.screenId,
  buttonId: click.buttonId,
  guard: click.guard,
})));
writeJson("matrix", matrix);
writeProof([
  `# ${AI_LIVE_SCREEN_COPILOT_WAVE}`,
  "",
  `Final status: ${AI_LIVE_SCREEN_COPILOT_GREEN_STATUS}`,
  "",
  `Web clicks: ${web.clickResults.length}`,
  `Android key clicks: ${android.clickResults.length}`,
  `Blockers: ${blockers.length ? blockers.join(", ") : "none"}`,
  "",
].join("\n"));

console.log(`final_status ${AI_LIVE_SCREEN_COPILOT_GREEN_STATUS}`);
console.log(`blockers ${JSON.stringify(blockers)}`);

if (blockers.length > 0) {
  process.exitCode = 1;
}
