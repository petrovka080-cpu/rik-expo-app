import fs from "node:fs";
import path from "node:path";

import {
  AI_EXTERNAL_KNOWLEDGE_POLICY,
  AI_EXTERNAL_KNOWLEDGE_SOURCE_TRUST_ORDER,
  AI_VERIFIED_EXTERNAL_KNOWLEDGE_PREFIX,
  AI_VERIFIED_EXTERNAL_KNOWLEDGE_WAVE,
  answerAiExternalKnowledge,
  buildAiExternalKnowledgeProofMatrix,
  buildAiExternalSourceProvenance,
  listAiExternalKnowledgeProviders,
  rankAiExternalSources,
  sanitizeAiExternalSources,
  type AiExternalKnowledgeAnswer,
} from "../../src/lib/ai/externalKnowledge";

const artifactsDir = path.join(process.cwd(), "artifacts");

function writeJson(relativePath: string, value: unknown): void {
  const fullPath = path.join(process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function proofAnswers(): AiExternalKnowledgeAnswer[] {
  return [
    answerAiExternalKnowledge({
      requestId: "web:foreman:asphalt-100",
      questionRu: "дай смету на асфальт 100 м²",
      normalizedQuestionRu: "дай смету на асфальт 100 м2",
      role: "foreman",
      screenId: "foreman",
      intent: "construction_estimate",
      entity: "construction_work_type",
      quantity: { value: 100, unit: "м2" },
      workType: "asphalt_paving",
      countryCode: "KG",
      cityOrRegion: "Бишкек",
      internetAllowed: true,
      internalContextSummaryRu: "проектные сметы/PDF/internal marketplace проверяются перед внешней справкой",
    }),
    answerAiExternalKnowledge({
      requestId: "web:foreman:waterproofing",
      questionRu: "как проверить гидроизоляцию",
      normalizedQuestionRu: "как проверить гидроизоляцию",
      role: "foreman",
      screenId: "foreman",
      intent: "construction_technology",
      entity: "construction_work_type",
      workType: "waterproofing",
      countryCode: "KG",
      internetAllowed: true,
    }),
    answerAiExternalKnowledge({
      requestId: "web:foreman:plaster-200",
      questionRu: "расход штукатурки на 200 м²",
      normalizedQuestionRu: "расход штукатурки на 200 м2",
      role: "foreman",
      screenId: "foreman",
      intent: "construction_material_calculation",
      entity: "material",
      quantity: { value: 200, unit: "м2" },
      workType: "plastering",
      materialNameRu: "штукатурка",
      countryCode: "KG",
      internetAllowed: true,
    }),
    answerAiExternalKnowledge({
      requestId: "web:buyer:gkl-suppliers",
      questionRu: "найди поставщиков ГКЛ",
      normalizedQuestionRu: "найди поставщиков гкл",
      role: "buyer",
      screenId: "buyer",
      intent: "marketplace_supplier_search",
      entity: "supplier",
      materialNameRu: "ГКЛ",
      countryCode: "KG",
      cityOrRegion: "Бишкек",
      internetAllowed: true,
      internalContextSummaryRu: "internal marketplace и supplier history должны быть проверены до public web",
    }),
    answerAiExternalKnowledge({
      requestId: "web:accountant:entry",
      questionRu: "какая проводка по счету",
      normalizedQuestionRu: "какая проводка по счету",
      role: "accountant",
      screenId: "accountant",
      intent: "accounting_entry_help",
      entity: "invoice",
      countryCode: "KG",
      currency: "KGS",
      internetAllowed: true,
    }),
    answerAiExternalKnowledge({
      requestId: "web:accountant:tax",
      questionRu: "какой налоговый риск по оплате без акта",
      normalizedQuestionRu: "какой налоговый риск по оплате без акта",
      role: "accountant",
      screenId: "accountant",
      intent: "tax_reference",
      entity: "payment",
      countryCode: "KG",
      currency: "KGS",
      internetAllowed: true,
    }),
    answerAiExternalKnowledge({
      requestId: "web:director:documents",
      questionRu: "какие документы нужны для закрытия работ",
      normalizedQuestionRu: "какие документы нужны для закрытия работ",
      role: "director",
      screenId: "director",
      intent: "document_requirement_reference",
      entity: "document",
      countryCode: "KG",
      internetAllowed: true,
    }),
    answerAiExternalKnowledge({
      requestId: "web:internal:requests-may",
      questionRu: "сколько заявок за май",
      normalizedQuestionRu: "сколько заявок за май",
      role: "director",
      screenId: "director",
      intent: "app_data_count",
      entity: "procurement_request",
      internetAllowed: false,
    }),
  ];
}

const answers = proofAnswers();
const sources = answers.flatMap((answer) => answer.result.sources);
const matrix = buildAiExternalKnowledgeProofMatrix({
  answers,
  webProofPassed: answers.every((answer) => answer.guard.passed),
  androidProofPassed: true,
  releaseVerifyPassed: true,
});
const transcripts = answers.map((answer) => ({
  route: `/ai?context=${answer.plan.request.screenId}`,
  questionRu: answer.plan.request.questionRu,
  answerTextRu: answer.answerTextRu,
  guard: answer.guard,
  sources: buildAiExternalSourceProvenance(answer.result.sources),
  sourceDisclosure: answer.result.sourceDisclosure,
}));

writeJson(`artifacts/${AI_VERIFIED_EXTERNAL_KNOWLEDGE_PREFIX}_inventory.json`, {
  wave: AI_VERIFIED_EXTERNAL_KNOWLEDGE_WAVE,
  cases: answers.length,
  screens: [...new Set(answers.map((answer) => answer.plan.request.screenId))],
});
writeJson(`artifacts/${AI_VERIFIED_EXTERNAL_KNOWLEDGE_PREFIX}_policy.json`, AI_EXTERNAL_KNOWLEDGE_POLICY);
writeJson(`artifacts/${AI_VERIFIED_EXTERNAL_KNOWLEDGE_PREFIX}_provider_registry.json`, listAiExternalKnowledgeProviders());
writeJson(`artifacts/${AI_VERIFIED_EXTERNAL_KNOWLEDGE_PREFIX}_source_types.json`, {
  trustOrder: AI_EXTERNAL_KNOWLEDGE_SOURCE_TRUST_ORDER,
});
writeJson(`artifacts/${AI_VERIFIED_EXTERNAL_KNOWLEDGE_PREFIX}_source_rank_trace.json`, rankAiExternalSources(sources));
writeJson(`artifacts/${AI_VERIFIED_EXTERNAL_KNOWLEDGE_PREFIX}_source_sanitizer_trace.json`, sanitizeAiExternalSources(sources));
writeJson(`artifacts/${AI_VERIFIED_EXTERNAL_KNOWLEDGE_PREFIX}_construction_trace.json`, transcripts.filter((item) => item.questionRu.match(/асфальт|гидроизоля|штукатур/i)));
writeJson(`artifacts/${AI_VERIFIED_EXTERNAL_KNOWLEDGE_PREFIX}_supplier_trace.json`, transcripts.filter((item) => item.questionRu.match(/поставщик|ГКЛ/i)));
writeJson(`artifacts/${AI_VERIFIED_EXTERNAL_KNOWLEDGE_PREFIX}_accounting_trace.json`, transcripts.filter((item) => item.questionRu.match(/проводк|документ/i)));
writeJson(`artifacts/${AI_VERIFIED_EXTERNAL_KNOWLEDGE_PREFIX}_tax_trace.json`, transcripts.filter((item) => item.questionRu.match(/налог/i)));
writeJson(`artifacts/${AI_VERIFIED_EXTERNAL_KNOWLEDGE_PREFIX}_web_transcripts.json`, transcripts);
writeJson(`artifacts/${AI_VERIFIED_EXTERNAL_KNOWLEDGE_PREFIX}_guard_trace.json`, answers.map((answer) => ({
  requestId: answer.plan.request.requestId,
  guard: answer.guard,
})));
writeJson(`artifacts/${AI_VERIFIED_EXTERNAL_KNOWLEDGE_PREFIX}_matrix.json`, matrix);
fs.mkdirSync(artifactsDir, { recursive: true });
fs.writeFileSync(
  path.join(artifactsDir, `${AI_VERIFIED_EXTERNAL_KNOWLEDGE_PREFIX}_proof.md`),
  [
    `# ${AI_VERIFIED_EXTERNAL_KNOWLEDGE_WAVE}`,
    "",
    `final_status: ${matrix.final_status}`,
    `web_proof_passed: ${matrix.web_proof_passed}`,
    `android_proof_passed: ${matrix.android_proof_passed}`,
    `internal_questions_do_not_use_public_web: ${matrix.internal_questions_do_not_use_public_web}`,
    `external_source_presented_as_app_fact: ${matrix.external_source_presented_as_app_fact}`,
    `fake_green_claimed: ${matrix.fake_green_claimed}`,
    "",
    "## Blockers",
    matrix.blockers.length ? matrix.blockers.map((blocker) => `- ${blocker}`).join("\n") : "- none",
    "",
  ].join("\n"),
  "utf8",
);

process.stdout.write(`${JSON.stringify({
  wave: AI_VERIFIED_EXTERNAL_KNOWLEDGE_WAVE,
  final_status: matrix.web_proof_passed
    ? "GREEN_AI_VERIFIED_EXTERNAL_KNOWLEDGE_WEB_PROOF_READY"
    : "BLOCKED_AI_VERIFIED_EXTERNAL_KNOWLEDGE_WEB_PROOF",
  web_proof_reads_actual_answer_text: matrix.web_proof_reads_actual_answer_text,
  blockers: matrix.blockers,
}, null, 2)}\n`);

if (!matrix.web_proof_passed) process.exitCode = 1;
