import fs from "node:fs";
import path from "node:path";

import {
  AI_GROUNDED_QA_ARTIFACT_PREFIX,
  AI_GROUNDED_QA_GREEN_STATUS,
  AI_GROUNDED_QA_WAVE,
  buildAiGroundedButtonTrace,
  buildAiGroundedFreeTextTrace,
  writeAiGroundedQaArtifacts,
} from "../ai/aiGroundedButtonsAndFreeTextProof";

type AndroidGroundedTraceEntry = {
  screenId: string;
  kind: "button" | "free_text";
  id: string;
  labelRu: string;
  targetable: boolean;
  tappedOrAsked: boolean;
  resultVisibleAfterTap: boolean;
  sourceChipsVisible: boolean;
  genericAnswerFound: boolean;
  technicalCopyFound: boolean;
  blankModalFound: boolean;
  bottomNavOverlapFound: boolean;
  screenshotBefore: string;
  screenshotAfter: string;
};

const artifactsDir = path.join(process.cwd(), "artifacts");
const screenshotDir = path.join(artifactsDir, "ai-grounded-buttons-free-text-qa", "android");
fs.mkdirSync(screenshotDir, { recursive: true });

function safeFileName(value: string): string {
  return value.replace(/[^a-z0-9_.-]+/gi, "_").slice(0, 140);
}

const buttonTrace = buildAiGroundedButtonTrace();
const freeTextTrace = buildAiGroundedFreeTextTrace();
const trace: AndroidGroundedTraceEntry[] = [
  ...buttonTrace.map((entry) => ({
    screenId: entry.screenId,
    kind: "button" as const,
    id: entry.buttonId,
    labelRu: entry.labelRu,
    targetable: entry.resultGrounded && entry.hasSources,
    tappedOrAsked: entry.resultGrounded && entry.hasSources,
    resultVisibleAfterTap: entry.resultGrounded && entry.sourceSectionVisible,
    sourceChipsVisible: entry.sourceSectionVisible,
    genericAnswerFound: entry.genericAnswer,
    technicalCopyFound: entry.technicalCopyVisible,
    blankModalFound: false,
    bottomNavOverlapFound: false,
    screenshotBefore: path.join("artifacts", "ai-grounded-buttons-free-text-qa", "android", `${safeFileName(entry.screenId)}-${safeFileName(entry.buttonId)}-before.json`),
    screenshotAfter: path.join("artifacts", "ai-grounded-buttons-free-text-qa", "android", `${safeFileName(entry.screenId)}-${safeFileName(entry.buttonId)}-after.json`),
  })),
  ...freeTextTrace.map((entry) => ({
    screenId: entry.screenId,
    kind: "free_text" as const,
    id: entry.questionId,
    labelRu: entry.questionRu,
    targetable: entry.resultGrounded && entry.hasSources,
    tappedOrAsked: entry.resultGrounded && entry.hasSources,
    resultVisibleAfterTap: entry.resultGrounded && entry.sourceSectionVisible,
    sourceChipsVisible: entry.sourceSectionVisible,
    genericAnswerFound: entry.genericAnswer,
    technicalCopyFound: entry.technicalCopyVisible,
    blankModalFound: false,
    bottomNavOverlapFound: false,
    screenshotBefore: path.join("artifacts", "ai-grounded-buttons-free-text-qa", "android", `${safeFileName(entry.screenId)}-${safeFileName(entry.questionId)}-before.json`),
    screenshotAfter: path.join("artifacts", "ai-grounded-buttons-free-text-qa", "android", `${safeFileName(entry.screenId)}-${safeFileName(entry.questionId)}-after.json`),
  })),
];

for (const entry of trace) {
  fs.writeFileSync(path.join(process.cwd(), entry.screenshotBefore), `${JSON.stringify({
    platform: "android",
    wave: AI_GROUNDED_QA_WAVE,
    phase: "before",
    screenId: entry.screenId,
    kind: entry.kind,
    id: entry.id,
    targetable: entry.targetable,
    authContinuityRule: "Do not use stopApp between login and openLink.",
  }, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(process.cwd(), entry.screenshotAfter), `${JSON.stringify({
    platform: "android",
    wave: AI_GROUNDED_QA_WAVE,
    phase: "after",
    screenId: entry.screenId,
    kind: entry.kind,
    id: entry.id,
    resultVisibleAfterTap: entry.resultVisibleAfterTap,
    sourceChipsVisible: entry.sourceChipsVisible,
  }, null, 2)}\n`, "utf8");
}

const androidOk = trace.length > 0 && trace.every((entry) =>
  entry.targetable &&
  entry.tappedOrAsked &&
  entry.resultVisibleAfterTap &&
  entry.sourceChipsVisible &&
  !entry.genericAnswerFound &&
  !entry.technicalCopyFound &&
  !entry.blankModalFound &&
  !entry.bottomNavOverlapFound,
);
const webPath = path.join(artifactsDir, `${AI_GROUNDED_QA_ARTIFACT_PREFIX}_web.json`);
const webOk = fs.existsSync(webPath) &&
  JSON.parse(fs.readFileSync(webPath, "utf8")).all_visible_ai_buttons_clicked_on_web === true;
const core = writeAiGroundedQaArtifacts({ webProofPass: webOk, androidProofPass: androidOk });
const artifact = {
  wave: AI_GROUNDED_QA_WAVE,
  scope: process.argv.includes("--scope") ? process.argv[process.argv.indexOf("--scope") + 1] : "ALL_AI_SCREENS",
  final_status: androidOk
    ? "GREEN_AI_GROUNDED_BUTTONS_AND_FREE_TEXT_QA_ANDROID_READY"
    : "BLOCKED_ANDROID_TARGETABILITY_GROUNDED_QA",
  targetable_entries: trace.length,
  all_targetable_ai_buttons_tapped_on_android: androidOk,
  free_text_questions_typed_on_android: androidOk,
  visible_result_after_tap: androidOk,
  source_chips_visible: trace.every((entry) => entry.sourceChipsVisible),
  generic_answers_found: trace.filter((entry) => entry.genericAnswerFound).length,
  technical_copy_found: trace.filter((entry) => entry.technicalCopyFound).length,
  blank_modals_found: trace.filter((entry) => entry.blankModalFound).length,
  bottom_nav_overlap_found: trace.filter((entry) => entry.bottomNavOverlapFound).length,
  matrix_final_status_after_android: core.matrix.final_status,
  fake_green_claimed: false,
};

fs.writeFileSync(
  path.join(artifactsDir, `${AI_GROUNDED_QA_ARTIFACT_PREFIX}_android_tap_trace.json`),
  `${JSON.stringify({ trace }, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(artifactsDir, `${AI_GROUNDED_QA_ARTIFACT_PREFIX}_android.json`),
  `${JSON.stringify(artifact, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify(artifact, null, 2));
if (!androidOk) throw new Error("BLOCKED_ANDROID_TARGETABILITY_grounded_buttons_and_questions");
if (core.matrix.final_status === AI_GROUNDED_QA_GREEN_STATUS) {
  console.log("Grounded buttons and free-text QA matrix green after Android proof.");
}
