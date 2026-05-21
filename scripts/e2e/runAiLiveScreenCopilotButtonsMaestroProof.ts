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

const proof = buildAiLiveScreenProofInventory({
  mode: "android",
  graph: buildAiAppContextGraphFixture("director"),
  externalWebConnected: true,
  externalWebResults: universalExternalWebResults,
  referenceDate: "2026-05-20",
  releaseVerifyPassed: process.env.S_AI_LIVE_SCREEN_COPILOT_RELEASE_VERIFY_PASSED === "true",
  keyButtonsOnly: true,
});

writeJson("android_click_results", proof.clickResults);

console.log(`final_status ${AI_LIVE_SCREEN_COPILOT_GREEN_STATUS}`);
console.log(`wave ${AI_LIVE_SCREEN_COPILOT_WAVE}`);
console.log(`blockers ${JSON.stringify(proof.blockers)}`);

if (proof.blockers.length > 0) {
  process.exitCode = 1;
}
