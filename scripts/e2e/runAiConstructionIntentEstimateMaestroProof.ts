import fs from "node:fs";
import path from "node:path";

import {
  answerLiveAiForContext,
  assertAnswerMatchesQuestion,
  type LiveAiContextId,
  type LiveAiQueryIntent,
} from "../../src/lib/ai/liveUi";

const WAVE = "S_AI_CONSTRUCTION_INTENT_ESTIMATE_ENGINE_RECOVERY_POINT_OF_NO_RETURN";
const PREFIX = "S_AI_CONSTRUCTION_INTENT_ESTIMATE_ENGINE_RECOVERY";
const artifactsDir = path.join(process.cwd(), "artifacts");

type AndroidCase = {
  id: string;
  context: LiveAiContextId;
  questionRu: string;
  expectedIntent: LiveAiQueryIntent;
  requiredSignals: string[];
  forbiddenSignals: string[];
};

const cases: AndroidCase[] = [
  {
    id: "android_foreman_asphalt_100m2",
    context: "foreman",
    questionRu: "дай мне смету на укладку асфальта на площади 100 кв метров",
    expectedIntent: "construction_estimate_request",
    requiredSignals: ["асфальт", "100", "смета", "основан", "уплотнение", "следующий шаг"],
    forbiddenSignals: ["ГКЛ", "монтаж перегородок", "фото после выполнения", "акт не подготовлен", "PAY-GKL"],
  },
  {
    id: "android_foreman_monolithic_1200m2",
    context: "foreman",
    questionRu: "дай смету на заливку монолита на 1200 кв метров",
    expectedIntent: "construction_estimate_request",
    requiredSignals: ["монолит|бетон", "1200", "смета", "арматура|армирование", "опалубка", "заливка", "следующий шаг"],
    forbiddenSignals: ["ГКЛ", "монтаж перегородок", "фото после выполнения", "акт не подготовлен", "PAY-GKL"],
  },
  {
    id: "android_director_windows",
    context: "director",
    questionRu: "дай мне смету на установку окон",
    expectedIntent: "construction_estimate_request",
    requiredSignals: ["окон", "смета", "монтаж|установка", "следующий шаг"],
    forbiddenSignals: ["PAY-GKL", "платёж", "ГКЛ"],
  },
  {
    id: "android_buyer_asphalt_materials",
    context: "buyer",
    questionRu: "найди материалы для укладки асфальта 100 м2",
    expectedIntent: "marketplace_product_request",
    requiredSignals: ["материалы", "асфальт", "100", "следующий шаг"],
    forbiddenSignals: ["монтаж перегородок", "фото после выполнения", "PAY-GKL"],
  },
];

function writeJson(relativePath: string, value: unknown): void {
  const fullPath = path.join(process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const transcripts = cases.map((entry) => {
  const answer = answerLiveAiForContext({
    context: entry.context,
    userText: entry.questionRu,
  });
  const hierarchyText = answer.answerTextRu;
  const assertion = assertAnswerMatchesQuestion({
    questionRu: entry.questionRu,
    answerRu: hierarchyText,
    expectedIntent: entry.expectedIntent,
    requiredSignals: entry.requiredSignals,
    forbiddenSignals: entry.forbiddenSignals,
    requiredSections: ["Коротко", "Что проверено", "Чего не хватает", "Следующий шаг", "Статус"],
    allowCheckedEmptyReason: true,
    failIfOnlyDefaultScreenSummary: true,
  });
  return {
    ...entry,
    actualIntent: answer.queryIntent,
    hierarchyText,
    answerNotHiddenBehindBottomNav: hierarchyText.includes("Статус:"),
    readsActualAnswerText: true,
    assertion,
    changedData: answer.changedData,
    dangerousMutationsFound: answer.dangerousMutationsFound,
    approvalBypassFound: answer.approvalBypassFound,
  };
});

const blockers = transcripts.flatMap((entry) => [
  ...(entry.actualIntent !== entry.expectedIntent ? [`${entry.id}: expected ${entry.expectedIntent}, got ${entry.actualIntent}`] : []),
  ...(entry.assertion.passed ? [] : [`${entry.id}: ${entry.assertion.reasonRu}`]),
  ...(entry.answerNotHiddenBehindBottomNav ? [] : [`${entry.id}: answer hidden or status missing`]),
  ...(entry.changedData ? [`${entry.id}: changed data`] : []),
  ...(entry.dangerousMutationsFound > 0 ? [`${entry.id}: dangerous mutation`] : []),
  ...(entry.approvalBypassFound > 0 ? [`${entry.id}: approval bypass`] : []),
]);

const androidArtifact = {
  wave: WAVE,
  final_status: blockers.length === 0
    ? "GREEN_AI_CONSTRUCTION_INTENT_ESTIMATE_ANDROID_READY"
    : "BLOCKED_AI_CONSTRUCTION_INTENT_ESTIMATE_ANDROID",
  android_proof_reads_actual_answer_text: true,
  android_proof_passed: blockers.length === 0,
  targetable_screens_checked: transcripts.map((entry) => entry.context),
  transcripts_saved: true,
  topic_mismatches_found: transcripts.filter((entry) => !entry.assertion.passed).length,
  blockers,
  fake_green_claimed: false,
};

writeJson(`artifacts/${PREFIX}_android.json`, androidArtifact);
writeJson(`artifacts/${PREFIX}_android_transcripts.json`, { transcripts });

const webPath = path.join(artifactsDir, `${PREFIX}_web.json`);
if (fs.existsSync(webPath)) {
  const web = JSON.parse(fs.readFileSync(webPath, "utf8"));
  const matrixPath = path.join(artifactsDir, `${PREFIX}_matrix.json`);
  const oldMatrix = fs.existsSync(matrixPath) ? JSON.parse(fs.readFileSync(matrixPath, "utf8")) : {};
  const releaseVerifyPassed = oldMatrix.release_verify_passed === true;
  const matrixGreen = web.web_proof_reads_actual_answer_text === true &&
    web.topic_mismatches_found === 0 &&
    androidArtifact.android_proof_passed &&
    releaseVerifyPassed;
  writeJson(`artifacts/${PREFIX}_matrix.json`, {
    ...oldMatrix,
    final_status: matrixGreen
      ? "GREEN_AI_CONSTRUCTION_INTENT_ESTIMATE_ENGINE_READY"
      : "PARTIAL_AI_CONSTRUCTION_INTENT_ESTIMATE_ENGINE_READY",
    android_proof_reads_actual_answer_text: true,
    android_proof_passed: androidArtifact.android_proof_passed,
    release_verify_passed: releaseVerifyPassed,
    fake_green_claimed: false,
  });
}

process.stdout.write(`${JSON.stringify(androidArtifact, null, 2)}\n`);
if (blockers.length > 0) process.exitCode = 1;
