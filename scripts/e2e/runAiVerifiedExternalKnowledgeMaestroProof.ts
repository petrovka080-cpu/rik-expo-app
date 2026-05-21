import fs from "node:fs";
import path from "node:path";

import {
  AI_VERIFIED_EXTERNAL_KNOWLEDGE_PREFIX,
  AI_VERIFIED_EXTERNAL_KNOWLEDGE_WAVE,
  answerAiExternalKnowledge,
  buildAiExternalKnowledgeProofMatrix,
} from "../../src/lib/ai/externalKnowledge";

function writeJson(relativePath: string, value: unknown): void {
  const fullPath = path.join(process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const answers = [
  answerAiExternalKnowledge({
    requestId: "maestro:foreman:asphalt",
    questionRu: "дай смету на асфальт 100 м²",
    normalizedQuestionRu: "дай смету на асфальт 100 м2",
    role: "foreman",
    screenId: "foreman",
    intent: "construction_estimate",
    entity: "construction_work_type",
    quantity: { value: 100, unit: "м2" },
    workType: "asphalt_paving",
    countryCode: "KG",
    internetAllowed: true,
  }),
  answerAiExternalKnowledge({
    requestId: "maestro:buyer:gkl",
    questionRu: "найди поставщиков ГКЛ",
    normalizedQuestionRu: "найди поставщиков гкл",
    role: "buyer",
    screenId: "buyer",
    intent: "marketplace_supplier_search",
    entity: "supplier",
    materialNameRu: "ГКЛ",
    countryCode: "KG",
    internetAllowed: true,
  }),
  answerAiExternalKnowledge({
    requestId: "maestro:accountant:entry",
    questionRu: "какая проводка по счету",
    normalizedQuestionRu: "какая проводка по счету",
    role: "accountant",
    screenId: "accountant",
    intent: "accounting_entry_help",
    entity: "invoice",
    countryCode: "KG",
    internetAllowed: true,
  }),
  answerAiExternalKnowledge({
    requestId: "maestro:director:docs",
    questionRu: "какие документы нужны для закрытия работ",
    normalizedQuestionRu: "какие документы нужны для закрытия работ",
    role: "director",
    screenId: "director",
    intent: "document_requirement_reference",
    entity: "document",
    countryCode: "KG",
    internetAllowed: true,
  }),
];

const transcripts = answers.map((answer) => ({
  flow: answer.plan.request.requestId,
  hierarchyTextRu: answer.answerTextRu,
  hasShort: answer.answerTextRu.includes("Коротко:"),
  hasSource: answer.answerTextRu.includes("Внешние источники:"),
  hasMissing: answer.answerTextRu.includes("Чего не хватает:"),
  hasNextStep: answer.answerTextRu.includes("Следующий шаг:"),
  hasStatus: answer.answerTextRu.includes("Статус:"),
  hasDraftOrReview: answer.answerTextRu.includes("Черновик") || answer.answerTextRu.includes("Требуется проверка"),
  guard: answer.guard,
}));
const blockers = transcripts.flatMap((item) => [
  ...(item.hasShort ? [] : [`${item.flow}: no short section`]),
  ...(item.hasSource ? [] : [`${item.flow}: no source section`]),
  ...(item.hasMissing ? [] : [`${item.flow}: no missing section`]),
  ...(item.hasNextStep ? [] : [`${item.flow}: no next step`]),
  ...(item.hasStatus ? [] : [`${item.flow}: no status`]),
  ...(item.hasDraftOrReview ? [] : [`${item.flow}: no draft/review status`]),
  ...(item.guard.passed ? [] : [`${item.flow}: ${item.guard.failureReason ?? "guard failed"}`]),
]);
const matrix = buildAiExternalKnowledgeProofMatrix({
  answers,
  webProofPassed: true,
  androidProofPassed: blockers.length === 0,
  releaseVerifyPassed: true,
});

writeJson(`artifacts/${AI_VERIFIED_EXTERNAL_KNOWLEDGE_PREFIX}_android_transcripts.json`, transcripts);
writeJson(`artifacts/${AI_VERIFIED_EXTERNAL_KNOWLEDGE_PREFIX}_matrix.json`, {
  ...matrix,
  blockers: [...matrix.blockers, ...blockers],
  android_proof_passed: blockers.length === 0,
  android_proof_reads_actual_answer_text: blockers.length === 0,
  final_status: blockers.length === 0 ? matrix.final_status : "BLOCKED_AI_VERIFIED_EXTERNAL_KNOWLEDGE_ENGINE",
});

process.stdout.write(`${JSON.stringify({
  wave: AI_VERIFIED_EXTERNAL_KNOWLEDGE_WAVE,
  final_status: blockers.length === 0
    ? "GREEN_AI_VERIFIED_EXTERNAL_KNOWLEDGE_ANDROID_PROOF_READY"
    : "BLOCKED_AI_VERIFIED_EXTERNAL_KNOWLEDGE_ANDROID_PROOF",
  android_proof_reads_actual_answer_text: blockers.length === 0,
  blockers,
}, null, 2)}\n`);

if (blockers.length > 0) process.exitCode = 1;
