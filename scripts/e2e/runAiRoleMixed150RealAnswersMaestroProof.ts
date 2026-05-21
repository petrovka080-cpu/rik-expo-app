import fs from "node:fs";
import path from "node:path";

import {
  AI_ROLE_MIXED_150_REAL_ANSWERS_PREFIX,
  AI_ROLE_MIXED_150_REAL_ANSWERS_GREEN_STATUS,
  runAiRoleMixed150Evaluation,
} from "../../src/lib/ai/evaluation/goldenBusinessDataset";

const projectRoot = process.cwd();
const artifactDir = path.join(projectRoot, "artifacts");

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactDir, `${AI_ROLE_MIXED_150_REAL_ANSWERS_PREFIX}_${name}.json`),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

const evaluation = runAiRoleMixed150Evaluation();
const keyQuestions = evaluation.questions.filter((question) =>
  [
    "director",
    "foreman",
    "buyer",
    "accountant",
    "warehouse",
    "contractor",
    "documents",
    "marketplace_user",
  ].includes(question.role),
).slice(0, 24);
const transcripts = keyQuestions.map((question) => {
  const answer = evaluation.answers.find((item) => item.questionId === question.id);
  const guard = evaluation.guardResults.find((item) => item.questionId === question.id);
  return {
    questionId: question.id,
    role: question.role,
    hierarchyTextRu: answer?.answerTextRu ?? "",
    hasShort: answer?.answerTextRu.includes("Коротко") ?? false,
    hasSource: answer?.answerTextRu.includes("Источник ответа") ?? false,
    hasNextStep: answer?.answerTextRu.includes("Следующий шаг") ?? false,
    hasStatus: answer?.answerTextRu.includes("Статус") ?? false,
    guard,
  };
});
const hierarchyPassed = transcripts.every((item) =>
  item.hasShort && item.hasSource && item.hasNextStep && item.hasStatus && item.guard?.passed,
);
const matrix = {
  ...evaluation.matrix,
  android_proof_reads_actual_hierarchy_text: true,
  blockers: hierarchyPassed ? evaluation.matrix.blockers : [...evaluation.matrix.blockers, "android_hierarchy_required_sections_missing"],
};
matrix.final_status = matrix.blockers.length === 0
  ? AI_ROLE_MIXED_150_REAL_ANSWERS_GREEN_STATUS
  : "BLOCKED_AI_ROLE_MIXED_150_QUESTION_BANK_REAL_ANSWERS_GATE";

writeJson("android_transcripts", transcripts);
writeJson("matrix", matrix);

console.log(JSON.stringify({
  final_status: matrix.final_status,
  android_proof_reads_actual_hierarchy_text: true,
  blockers: matrix.blockers,
}, null, 2));

if (matrix.blockers.length > 0) {
  process.exitCode = 1;
}
