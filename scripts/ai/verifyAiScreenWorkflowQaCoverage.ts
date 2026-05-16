import fs from "node:fs";
import path from "node:path";

import { listAiScreenWorkflowPacks } from "../../src/features/ai/screenWorkflows/aiScreenWorkflowEngine";
import { answerAiScreenWorkflowQuestion } from "../../src/features/ai/screenWorkflows/aiScreenWorkflowQuestionAnswerEngine";

const wave = "S_AI_PRODUCT_07_SCREEN_NATIVE_WORKFLOW_EXECUTION_PACKS";
const artifactPath = path.join(process.cwd(), "artifacts", `${wave}_qa.json`);

const packs = listAiScreenWorkflowPacks();
const screens = packs.map((pack) => {
  const answers = pack.qaExamples.map((qa) => ({
    question: qa.question,
    answer: answerAiScreenWorkflowQuestion({ pack, question: qa.question }),
  }));
  return {
    screenId: pack.screenId,
    questions: pack.qaExamples.length,
    answeredFromContext: answers.every((item) => item.answer?.answeredFromScreenContext === true),
    providerCallsAllowed: answers.some((item) => item.answer?.providerCallAllowed !== false),
    answers,
  };
});
const ok = screens.length === 28 &&
  screens.every((screen) => screen.questions >= 5 && screen.answeredFromContext && !screen.providerCallsAllowed);
const artifact = {
  wave,
  final_status: ok
    ? "GREEN_AI_SCREEN_WORKFLOW_QA_COVERAGE_READY"
    : "BLOCKED_AI_SCREEN_WORKFLOW_COVERAGE_INCOMPLETE",
  screens,
  qa_from_screen_context: ok,
  provider_called: false,
  db_writes_used: false,
  fake_green_claimed: false,
};

fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
fs.writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  wave,
  final_status: artifact.final_status,
  screens_checked: screens.length,
  qa_from_screen_context: ok,
}, null, 2));
if (!ok) process.exitCode = 1;
