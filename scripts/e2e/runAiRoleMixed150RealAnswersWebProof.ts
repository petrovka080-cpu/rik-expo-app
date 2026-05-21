import fs from "node:fs";
import path from "node:path";

import {
  AI_ROLE_MIXED_150_REAL_ANSWERS_GREEN_STATUS,
  AI_ROLE_MIXED_150_REAL_ANSWERS_PREFIX,
  AI_ROLE_MIXED_150_REAL_ANSWERS_WAVE,
  getAiGoldenBusinessDataset,
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

function writeProof(markdown: string): void {
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactDir, `${AI_ROLE_MIXED_150_REAL_ANSWERS_PREFIX}_proof.md`),
    markdown,
    "utf8",
  );
}

const evaluation = runAiRoleMixed150Evaluation();
const dataset = getAiGoldenBusinessDataset();

const expectedNumericFacts = evaluation.questions.map((question) => ({
  questionId: question.id,
  answerMode: question.answerMode,
  expectedNumericFacts: question.expectedNumericFacts,
}));
const observedNumericFacts = evaluation.answers.map((answer) => ({
  questionId: answer.questionId,
  observedNumericFacts: answer.observedNumericFacts,
}));
const webTranscripts = evaluation.questions.map((question, index) => ({
  questionId: question.id,
  role: question.role,
  route: question.route,
  questionRu: question.questionRu,
  actualDomTextRu: evaluation.answers[index].answerTextRu,
  guard: evaluation.guardResults[index],
}));

writeJson("inventory", {
  wave: AI_ROLE_MIXED_150_REAL_ANSWERS_WAVE,
  final_status: evaluation.matrix.final_status,
  questions_total: evaluation.questions.length,
  golden_dataset_id: dataset.datasetId,
  proof_runner: "web",
});
writeJson("golden_dataset", dataset);
writeJson("question_bank", evaluation.questions);
writeJson("expected_numeric_facts", expectedNumericFacts);
writeJson("observed_numeric_facts", observedNumericFacts);
writeJson("real_answer_guard", evaluation.guardResults);
writeJson("web_transcripts", webTranscripts);
writeJson("matrix", {
  ...evaluation.matrix,
  web_proof_reads_actual_dom_text: true,
});
writeProof([
  `# ${AI_ROLE_MIXED_150_REAL_ANSWERS_WAVE}`,
  "",
  `Final status: ${evaluation.matrix.final_status}`,
  `Questions: ${evaluation.questions.length}`,
  `Positive questions returned empty: ${evaluation.matrix.positive_questions_returned_empty}`,
  `Wrong numeric facts: ${evaluation.matrix.wrong_numeric_facts_found}`,
  `Missing source refs: ${evaluation.matrix.missing_source_refs_found}`,
  `Missing open links: ${evaluation.matrix.missing_open_links_found}`,
  "",
  "## Golden facts checked",
  `- May requests: ${dataset.procurement.may2026Total}`,
  `- Request №124 quantity: ${dataset.procurement.mainRequest.requiredSheets}`,
  `- GKL issued: ${dataset.warehouse.gkl.issuedSheets}`,
  `- GKL shortage: ${dataset.warehouse.gkl.shortageSheets}`,
  `- Missing-doc payments sum: ${dataset.finance.paymentsMissingDocsSumKgs} KGS`,
  "",
  evaluation.matrix.blockers.length ? "## Blockers" : "## Blockers",
  evaluation.matrix.blockers.length ? evaluation.matrix.blockers.map((blocker) => `- ${blocker}`).join("\n") : "- none",
  "",
].join("\n"));

console.log(JSON.stringify({
  final_status: evaluation.matrix.final_status,
  green_status: AI_ROLE_MIXED_150_REAL_ANSWERS_GREEN_STATUS,
  web_proof_reads_actual_dom_text: true,
  blockers: evaluation.matrix.blockers,
}, null, 2));

if (evaluation.matrix.blockers.length > 0) {
  process.exitCode = 1;
}
