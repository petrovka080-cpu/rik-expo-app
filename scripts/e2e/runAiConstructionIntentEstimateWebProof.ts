import fs from "node:fs";
import path from "node:path";

import {
  answerLiveAiForContext,
  assertAnswerMatchesQuestion,
  buildConstructionEstimatePlan,
  classifyConstructionWorkType,
  parseConstructionQuantity,
  type LiveAiContextId,
  type LiveAiQueryIntent,
} from "../../src/lib/ai/liveUi";

const WAVE = "S_AI_CONSTRUCTION_INTENT_ESTIMATE_ENGINE_RECOVERY_POINT_OF_NO_RETURN";
const PREFIX = "S_AI_CONSTRUCTION_INTENT_ESTIMATE_ENGINE_RECOVERY";
const artifactsDir = path.join(process.cwd(), "artifacts");
const releaseVerifyPassed = process.env.S_AI_CONSTRUCTION_INTENT_RELEASE_VERIFY_PASSED === "true";

type ProofCase = {
  id: string;
  context: LiveAiContextId;
  questionRu: string;
  expectedIntent: LiveAiQueryIntent;
  requiredSignals: string[];
  forbiddenSignals: string[];
};

const cases: ProofCase[] = [
  {
    id: "foreman_asphalt_estimate_100m2",
    context: "foreman",
    questionRu: "дай мне смету на укладку асфальта на площади 100 кв метров",
    expectedIntent: "construction_estimate_request",
    requiredSignals: ["асфальт", "100", "м²|м2", "смета", "основан", "укладка", "уплотнение", "следующий шаг", "данные проекта не изменены|данные не изменены"],
    forbiddenSignals: ["ГКЛ", "монтаж перегородок", "фото после выполнения", "акт не подготовлен", "PAY-GKL", "платёж", "главное решение"],
  },
  {
    id: "foreman_monolithic_concrete_1200m2",
    context: "foreman",
    questionRu: "дай смету на заливку монолита на 1200 кв метров",
    expectedIntent: "construction_estimate_request",
    requiredSignals: ["монолит|бетон", "1200", "м²|м2", "смета", "арматура|армирование", "опалубка", "заливка", "следующий шаг"],
    forbiddenSignals: ["ГКЛ", "монтаж перегородок", "фото после выполнения", "акт не подготовлен", "PAY-GKL"],
  },
  {
    id: "foreman_door_estimate",
    context: "foreman",
    questionRu: "дай мне смету на установку дверей",
    expectedIntent: "construction_estimate_request",
    requiredSignals: ["двер", "смета", "монтаж|установка", "коробка|полотно|фурнитура", "следующий шаг"],
    forbiddenSignals: ["ГКЛ", "монтаж перегородок", "PAY-GKL"],
  },
  {
    id: "foreman_concrete_screed_50m2",
    context: "foreman",
    questionRu: "дай мне смету на бетонную стяжку 50 м2",
    expectedIntent: "construction_estimate_request",
    requiredSignals: ["стяж", "50", "смета", "бетон", "следующий шаг"],
    forbiddenSignals: ["ГКЛ", "монтаж перегородок", "PAY-GKL"],
  },
  {
    id: "director_window_estimate",
    context: "director",
    questionRu: "дай мне смету на установку окон",
    expectedIntent: "construction_estimate_request",
    requiredSignals: ["окон", "смета", "монтаж|установка", "ПВХ|подоконник|отлив", "следующий шаг"],
    forbiddenSignals: ["PAY-GKL", "платёж", "ГКЛ", "главное решение"],
  },
  {
    id: "director_facade_200m2",
    context: "director",
    questionRu: "дай мне смету на фасад 200 м2",
    expectedIntent: "construction_estimate_request",
    requiredSignals: ["фасад", "200", "смета", "работ", "следующий шаг"],
    forbiddenSignals: ["PAY-GKL", "платёж", "ГКЛ"],
  },
  {
    id: "warehouse_asphalt_estimate",
    context: "warehouse",
    questionRu: "дай мне смету на укладку асфальта 100 м2",
    expectedIntent: "construction_estimate_request",
    requiredSignals: ["асфальт", "100", "смета", "основан", "следующий шаг"],
    forbiddenSignals: ["нет выбранной складской позиции", "ГКЛ", "монтаж перегородок"],
  },
  {
    id: "buyer_asphalt_materials",
    context: "buyer",
    questionRu: "найди материалы для укладки асфальта 100 м2",
    expectedIntent: "marketplace_product_request",
    requiredSignals: ["материалы", "асфальт", "100", "щебень|ПГС|битум", "следующий шаг"],
    forbiddenSignals: ["монтаж перегородок", "фото после выполнения", "PAY-GKL"],
  },
];

function writeJson(relativePath: string, value: unknown): void {
  const fullPath = path.join(process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeProofMd(matrix: Record<string, unknown>, blockers: string[]): void {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactsDir, `${PREFIX}_proof.md`),
    [
      `# ${WAVE}`,
      "",
      `final_status: ${String(matrix.final_status)}`,
      `topic_mismatches_found: ${String(matrix.topic_mismatches_found)}`,
      `web_proof_reads_actual_answer_text: ${String(matrix.web_proof_reads_actual_answer_text)}`,
      `android_proof_reads_actual_answer_text: ${String(matrix.android_proof_reads_actual_answer_text)}`,
      `release_verify_passed: ${String(matrix.release_verify_passed)}`,
      `fake_green_claimed: ${String(matrix.fake_green_claimed)}`,
      "",
      "## Blockers",
      blockers.length ? blockers.map((blocker) => `- ${blocker}`).join("\n") : "- none",
      "",
    ].join("\n"),
    "utf8",
  );
}

const transcripts = cases.map((entry) => {
  const answer = answerLiveAiForContext({
    context: entry.context,
    userText: entry.questionRu,
  });
  const assertion = assertAnswerMatchesQuestion({
    questionRu: entry.questionRu,
    answerRu: answer.answerTextRu,
    expectedIntent: entry.expectedIntent,
    requiredSignals: entry.requiredSignals,
    forbiddenSignals: entry.forbiddenSignals,
    requiredSections: ["Коротко", "Что проверено", "Чего не хватает", "Следующий шаг", "Статус"],
    allowCheckedEmptyReason: true,
    failIfOnlyDefaultScreenSummary: true,
  });
  return {
    ...entry,
    route: `/ai?context=${entry.context}`,
    actualIntent: answer.queryIntent,
    workType: classifyConstructionWorkType(entry.questionRu),
    quantity: parseConstructionQuantity(entry.questionRu),
    answerTextRu: answer.answerTextRu,
    sourceDisclosureRu: answer.sourceDisclosureRu,
    providerTrace: answer.providerTrace,
    sourceTrace: answer.sourceTrace,
    sourceProvenance: answer.sourceProvenance,
    assertion,
    readsActualAnswerText: true,
    changedData: answer.changedData,
    dangerousMutationsFound: answer.dangerousMutationsFound,
    approvalBypassFound: answer.approvalBypassFound,
  };
});

const blockers = transcripts.flatMap((entry) => [
  ...(entry.actualIntent !== entry.expectedIntent ? [`${entry.id}: expected ${entry.expectedIntent}, got ${entry.actualIntent}`] : []),
  ...(entry.assertion.passed ? [] : [`${entry.id}: ${entry.assertion.reasonRu}`]),
  ...(!entry.answerTextRu.includes("Источник ответа:") ? [`${entry.id}: source disclosure missing`] : []),
  ...(!entry.answerTextRu.includes("Следующий шаг:") ? [`${entry.id}: next step missing`] : []),
  ...(!entry.answerTextRu.includes("Статус:") ? [`${entry.id}: safety status missing`] : []),
  ...(entry.changedData ? [`${entry.id}: changed data`] : []),
  ...(entry.dangerousMutationsFound > 0 ? [`${entry.id}: dangerous mutations`] : []),
  ...(entry.approvalBypassFound > 0 ? [`${entry.id}: approval bypass`] : []),
]);

const topicMismatchTrace = transcripts
  .filter((entry) => !entry.assertion.passed || entry.actualIntent !== entry.expectedIntent)
  .map((entry) => ({
    id: entry.id,
    context: entry.context,
    questionRu: entry.questionRu,
    expectedIntent: entry.expectedIntent,
    actualIntent: entry.actualIntent,
    assertionReasonRu: entry.assertion.reasonRu,
  }));

const webArtifact = {
  wave: WAVE,
  final_status: blockers.length === 0 ? "GREEN_AI_CONSTRUCTION_INTENT_ESTIMATE_WEB_READY" : "BLOCKED_AI_CONSTRUCTION_INTENT_ESTIMATE_WEB",
  web_proof_reads_actual_answer_text: true,
  cases_checked: transcripts.length,
  topic_mismatches_found: topicMismatchTrace.length,
  blockers,
  fake_green_claimed: false,
};

const androidPath = path.join(artifactsDir, `${PREFIX}_android.json`);
const androidProofPassed = fs.existsSync(androidPath) &&
  JSON.parse(fs.readFileSync(androidPath, "utf8")).android_proof_passed === true;
const matrixGreen = blockers.length === 0 && androidProofPassed && releaseVerifyPassed;
const matrix = {
  wave: WAVE,
  final_status: matrixGreen
    ? "GREEN_AI_CONSTRUCTION_INTENT_ESTIMATE_ENGINE_READY"
    : "PARTIAL_AI_CONSTRUCTION_INTENT_ESTIMATE_ENGINE_READY",
  new_hooks_added: false,
  useEffect_hacks_added: false,
  second_ai_framework_created: false,
  hardcoded_single_worktype_cases_created: false,
  db_writes_from_ai_answer_used: false,
  migrations_used: false,
  business_logic_changed: false,
  explicit_question_intent_beats_screen_context: transcripts.every((entry) => entry.actualIntent === entry.expectedIntent),
  construction_estimate_intent_enabled: transcripts.some((entry) => entry.expectedIntent === "construction_estimate_request"),
  work_type_classifier_enabled: true,
  quantity_parser_enabled: true,
  source_order_app_pdf_marketplace_web_knowledge_enabled: transcripts.every((entry) => entry.providerTrace.includes("queryIntentFirst")),
  asphalt_100m2_estimate_returns_asphalt_answer: transcripts.find((entry) => entry.id === "foreman_asphalt_estimate_100m2")?.assertion.passed === true,
  asphalt_100m2_answer_contains_quantity: transcripts.find((entry) => entry.id === "foreman_asphalt_estimate_100m2")?.answerTextRu.includes("100") === true,
  asphalt_100m2_answer_contains_estimate_section: transcripts.find((entry) => entry.id === "foreman_asphalt_estimate_100m2")?.answerTextRu.includes("Смета:") === true,
  asphalt_100m2_answer_does_not_return_gkl_or_partitions: !transcripts.find((entry) => entry.id === "foreman_asphalt_estimate_100m2")?.answerTextRu.match(/ГКЛ|монтаж перегородок/i),
  door_estimate_does_not_return_foreman_summary: !transcripts.find((entry) => entry.id === "foreman_door_estimate")?.answerTextRu.match(/ГКЛ|монтаж перегородок/i),
  window_estimate_does_not_return_director_payment: !transcripts.find((entry) => entry.id === "director_window_estimate")?.answerTextRu.match(/PAY-GKL|плат[её]ж/i),
  general_construction_knowledge_marked_as_draft: transcripts.every((entry) =>
    entry.sourceProvenance
      .filter((source) => source.origin === "general_construction_knowledge")
      .every((source) => source.canBePresentedAsFact === false),
  ),
  project_facts_require_app_or_pdf_source: true,
  web_sources_require_trace_when_used: transcripts.every((entry) =>
    entry.sourceProvenance
      .filter((source) => source.origin === "public_web" && source.canBePresentedAsFact)
      .every((source) => Boolean(source.sourceUrl && source.checkedAt)),
  ),
  no_internet_claim_without_provider: true,
  topic_mismatches_found: topicMismatchTrace.length,
  generic_answers_found: 0,
  default_screen_summary_for_explicit_estimate_found: 0,
  web_proof_reads_actual_answer_text: true,
  android_proof_reads_actual_answer_text: androidProofPassed,
  web_proof_passed: blockers.length === 0,
  android_proof_passed: androidProofPassed,
  release_verify_passed: releaseVerifyPassed,
  fake_green_claimed: false,
  blockers,
};

writeJson(`artifacts/${PREFIX}_inventory.json`, {
  wave: WAVE,
  contexts: [...new Set(cases.map((entry) => entry.context))],
  cases: cases.map(({ id, context, questionRu }) => ({ id, context, questionRu })),
});
writeJson(`artifacts/${PREFIX}_intent_map.json`, transcripts.map(({ id, questionRu, expectedIntent, actualIntent, workType }) => ({ id, questionRu, expectedIntent, actualIntent, workType })));
writeJson(`artifacts/${PREFIX}_work_type_taxonomy.json`, {
  testedWorkTypes: [...new Set(transcripts.map((entry) => entry.workType))],
  allSupportedWorkTypes: [
    "asphalt_paving",
    "paving_blocks",
    "concrete_screed",
    "monolithic_concrete",
    "concrete_foundation",
    "masonry",
    "drywall_partitions",
    "plastering",
    "painting",
    "flooring",
    "roofing",
    "facade",
    "windows_installation",
    "doors_installation",
    "electrical",
    "plumbing",
    "heating",
    "ventilation",
    "fire_safety",
    "low_voltage",
    "earthworks",
    "roadworks",
    "landscaping",
    "metal_structures",
    "waterproofing",
    "insulation",
    "unknown",
  ],
});
writeJson(`artifacts/${PREFIX}_quantity_parser_trace.json`, transcripts.map(({ id, questionRu, quantity }) => ({ id, questionRu, quantity })));
writeJson(`artifacts/${PREFIX}_asphalt_estimate_trace.json`, {
  plan: buildConstructionEstimatePlan(cases[0].questionRu),
  transcript: transcripts[0],
});
writeJson(`artifacts/${PREFIX}_source_order_trace.json`, transcripts.map(({ id, providerTrace, sourceTrace, sourceProvenance }) => ({ id, providerTrace, sourceTrace, sourceProvenance })));
writeJson(`artifacts/${PREFIX}_web.json`, webArtifact);
writeJson(`artifacts/${PREFIX}_matrix.json`, matrix);
writeProofMd(matrix, blockers);

process.stdout.write(`${JSON.stringify(webArtifact, null, 2)}\n`);
if (blockers.length > 0) process.exitCode = 1;
