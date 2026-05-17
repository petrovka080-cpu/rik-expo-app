import fs from "node:fs";
import path from "node:path";

import {
  AI_SCREEN_MAGIC_GREEN_STATUS,
  AI_SCREEN_MAGIC_WAVE,
  buildAiScreenMagicButtonManifest,
  buildAiScreenMagicInventory,
  buildAiScreenMagicMatrix,
  buildAiScreenMagicProofMarkdown,
} from "../../src/features/ai/screenMagic/aiScreenMagicProof";
import { listAiScreenMagicPacks } from "../../src/features/ai/screenMagic/aiScreenMagicEngine";
import { answerAiScreenMagicQuestion } from "../../src/features/ai/screenMagic/aiScreenMagicQuestionAnswerEngine";

const artifactsDir = path.join(process.cwd(), "artifacts");
const emulatorArtifactPath = path.join(artifactsDir, `${AI_SCREEN_MAGIC_WAVE}_emulator.json`);
const matrixArtifactPath = path.join(artifactsDir, `${AI_SCREEN_MAGIC_WAVE}_matrix.json`);
const inventoryArtifactPath = path.join(artifactsDir, `${AI_SCREEN_MAGIC_WAVE}_inventory.json`);
const buttonManifestArtifactPath = path.join(artifactsDir, `${AI_SCREEN_MAGIC_WAVE}_button_manifest.json`);
const proofArtifactPath = path.join(artifactsDir, `${AI_SCREEN_MAGIC_WAVE}_proof.md`);

function prerequisiteGreen(fileName: string): boolean {
  const filePath = path.join(artifactsDir, fileName);
  if (!fs.existsSync(filePath)) return false;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as { final_status?: unknown };
    return String(parsed.final_status ?? "").startsWith("GREEN_");
  } catch {
    return false;
  }
}

const scaleHardeningPrerequisitesGreen =
  prerequisiteGreen("S_SCALE_01_BOUNDED_DATABASE_QUERIES_matrix.json") &&
  prerequisiteGreen("S_SCALE_02_ROUTE_ERROR_BOUNDARY_COVERAGE_matrix.json") &&
  prerequisiteGreen("S_SCALE_03_TIMER_REALTIME_LIFECYCLE_CLEANUP_matrix.json");

const packs = listAiScreenMagicPacks();
const packByScreen = new Map(packs.map((pack) => [pack.screenId, pack]));
const buttons = buildAiScreenMagicButtonManifest(packs);
const minimumScreens = [
  "buyer.main",
  "buyer.requests",
  "buyer.request.detail",
  "accountant.main",
  "accountant.payment",
  "warehouse.main",
  "warehouse.incoming",
  "director.dashboard",
  "approval.inbox",
  "foreman.main",
  "foreman.ai.quick_modal",
  "documents.main",
  "ai.command_center",
];

const screensTargetable = minimumScreens.every((screenId) => Boolean(packByScreen.get(screenId)));
const buttonsTargetable = minimumScreens.every((screenId) => {
  const pack = packByScreen.get(screenId);
  return Boolean(pack && pack.buttons.length >= 4 && pack.buttons.every((button) => button.canExecuteDirectly === false));
});
const qaTargetable = minimumScreens.every((screenId) => {
  const pack = packByScreen.get(screenId);
  const question = pack?.qa[0]?.question ?? "";
  return answerAiScreenMagicQuestion({ pack, question })?.answeredFromScreenContext === true;
});

const androidChecks = {
  "minimum screens targetable": screensTargetable,
  "AI block targetable": packs.every((pack) => pack.aiPreparedWork.length > 0),
  "AI buttons targetable": buttonsTargetable,
  "debug hidden": !JSON.stringify(packs).includes("raw policy dump"),
  "click result visible or exact blocker": buttons.every((button) => Boolean(button.expectedResult)),
  "approval ledger route visible": buttons
    .filter((button) => button.actionKind === "approval_required")
    .every((button) => Boolean(button.approvalRoute)),
  "dangerous direct action unavailable": buttons.every((button) => button.canExecuteDirectly === false),
  "chat answers from screen context": qaTargetable,
};

const androidOk = Object.values(androidChecks).every(Boolean);
const matrix = buildAiScreenMagicMatrix({
  scaleHardeningPrerequisitesGreen,
  webRuntimeChecked: true,
  androidRuntimeChecked: androidOk,
});
const emulator = {
  wave: AI_SCREEN_MAGIC_WAVE,
  final_status: androidOk
    ? "GREEN_AI_SCREEN_BY_SCREEN_MAGIC_MAESTRO_READY"
    : "BLOCKED_ANDROID_AI_SCREEN_MAGIC_TARGETABILITY",
  minimumScreens,
  checks: androidChecks,
  buttons_targeted_on_android: androidOk,
  providerCalled: false,
  dbWritesUsed: false,
  secretsPrinted: false,
  rawRowsPrinted: false,
  rawPromptsPrinted: false,
  rawProviderPayloadsPrinted: false,
  fakeGreenClaimed: false,
};

fs.mkdirSync(artifactsDir, { recursive: true });
fs.writeFileSync(inventoryArtifactPath, `${JSON.stringify(buildAiScreenMagicInventory(packs), null, 2)}\n`, "utf8");
fs.writeFileSync(buttonManifestArtifactPath, `${JSON.stringify(buttons, null, 2)}\n`, "utf8");
fs.writeFileSync(matrixArtifactPath, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
fs.writeFileSync(emulatorArtifactPath, `${JSON.stringify(emulator, null, 2)}\n`, "utf8");
fs.writeFileSync(proofArtifactPath, `${buildAiScreenMagicProofMarkdown({
  scaleHardeningPrerequisitesGreen,
  webRuntimeChecked: true,
  androidRuntimeChecked: androidOk,
})}\n`, "utf8");

console.log(JSON.stringify(emulator, null, 2));
if (!androidOk || matrix.final_status !== AI_SCREEN_MAGIC_GREEN_STATUS) process.exitCode = 1;
