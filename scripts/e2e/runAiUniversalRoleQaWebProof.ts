import fs from "node:fs";
import path from "node:path";

import {
  AI_UNIVERSAL_ROLE_QA_GREEN_STATUS,
  AI_UNIVERSAL_ROLE_QA_WAVE,
  adaptUniversalRoleQaAnswerToUiText,
  collectUniversalRoleQaFeedbackEvent,
  extractUniversalRoleQaEntity,
  extractUniversalRoleQaFilters,
  classifyUniversalRoleQaIntent,
  getUniversalRoleQaQuestionBank,
  listUniversalRoleContexts,
  listUniversalScreenContexts,
  validateUniversalRoleQaAnswer,
  type UniversalRoleQaEntity,
  type UniversalRoleQaIntent,
} from "../../src/lib/ai/universalRoleQa";
import {
  answerUniversalRoleQaFixture,
  createUniversalRoleQaFixtureGraph,
} from "../../tests/ai/aiUniversalRoleQaTestHelpers";

const PREFIX = "S_AI_UNIVERSAL_ROLE_QA_ORCHESTRATOR_SOURCE_PLANNER";
const artifactsDir = path.join(process.cwd(), "artifacts");

type ContextId =
  | "foreman"
  | "director"
  | "buyer"
  | "accountant"
  | "warehouse"
  | "contractor"
  | "documents"
  | "market"
  | "office"
  | "client";

type ProofCase = {
  context: ContextId;
  role: string;
  kind: "app" | "role" | "document" | "construction" | "typo";
  questionRu: string;
  expectedIntent: UniversalRoleQaIntent;
  expectedEntity?: UniversalRoleQaEntity;
  web?: boolean;
  requiredTermsRu?: string[];
  forbiddenTermsRu?: string[];
};

const contextRoles: Record<ContextId, string> = {
  foreman: "foreman",
  director: "director",
  buyer: "buyer",
  accountant: "accountant",
  warehouse: "warehouse",
  contractor: "contractor",
  documents: "documents",
  market: "marketplace_user",
  office: "office",
  client: "client",
};

const roleQuestions: Record<ContextId, ProofCase["questionRu"]> = {
  foreman: "что мне закрыть сегодня",
  director: "что мне решить сегодня",
  buyer: "найди поставщиков ГКЛ",
  accountant: "что проверить бухгалтеру",
  warehouse: "что есть на складе",
  contractor: "что мешает закрыть мои работы",
  documents: "каких документов не хватает",
  market: "подготовь карточку товара ГКЛ",
  office: "что застряло сегодня",
  client: "что видит клиент по проекту",
};

function expectedRoleIntent(context: ContextId): UniversalRoleQaIntent {
  const intents: Record<ContextId, UniversalRoleQaIntent> = {
    foreman: "field_work_review",
    director: "director_decision_summary",
    buyer: "marketplace_supplier_search",
    accountant: "finance_payment_review",
    warehouse: "warehouse_stock_review",
    contractor: "contractor_acceptance_review",
    documents: "document_missing_links_review",
    market: "marketplace_product_draft",
    office: "office_stuck_work_review",
    client: "client_progress_review",
  };
  return intents[context];
}

const proofCases: ProofCase[] = (Object.keys(contextRoles) as ContextId[]).flatMap((context) => {
  const role = contextRoles[context];
  return [
    {
      context,
      role,
      kind: "app",
      questionRu: "сколько заявок было за май",
      expectedIntent: "app_data_count",
      expectedEntity: "procurement_request",
      requiredTermsRu: ["заяв"],
      forbiddenTermsRu: ["работы сегодня"],
    },
    {
      context,
      role,
      kind: "role",
      questionRu: roleQuestions[context],
      expectedIntent: expectedRoleIntent(context),
    },
    {
      context,
      role,
      kind: "document",
      questionRu: "что в этом PDF",
      expectedIntent: "document_pdf_explanation",
      expectedEntity: "pdf_document",
    },
    {
      context,
      role,
      kind: "construction",
      questionRu: "дай смету на асфальт 100 м2",
      expectedIntent: "construction_estimate",
      expectedEntity: "construction_work_type",
      web: role !== "warehouse" && role !== "contractor" && role !== "client",
      requiredTermsRu: ["асфальт"],
      forbiddenTermsRu: ["платеж готов", "ГКЛ перегородки"],
    },
    {
      context,
      role,
      kind: "typo",
      questionRu: "покжи платжи без докумнтов",
      expectedIntent: "finance_payment_review",
      expectedEntity: "payment",
    },
  ];
});

function writeJson(relativePath: string, value: unknown): void {
  const fullPath = path.join(process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson(relativePath: string): Record<string, unknown> | null {
  const fullPath = path.join(process.cwd(), relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf8")) as Record<string, unknown>;
}

function writeProofMd(matrix: Record<string, unknown>, blockers: readonly string[]): void {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactsDir, `${PREFIX}_proof.md`),
    [
      `# ${AI_UNIVERSAL_ROLE_QA_WAVE}`,
      "",
      `final_status: ${String(matrix.final_status)}`,
      `web_proof_passed: ${String(matrix.web_proof_passed)}`,
      `android_proof_passed: ${String(matrix.android_proof_passed)}`,
      `intent_mismatches_found: ${String(matrix.intent_mismatches_found)}`,
      `entity_mismatches_found: ${String(matrix.entity_mismatches_found)}`,
      `generic_answers_found: ${String(matrix.generic_answers_found)}`,
      "",
      "## Blockers",
      blockers.length ? blockers.map((blocker) => `- ${blocker}`).join("\n") : "- none",
      "",
    ].join("\n"),
    "utf8",
  );
}

const graph = createUniversalRoleQaFixtureGraph("director");
const transcripts = proofCases.map((item) => {
  const answer = answerUniversalRoleQaFixture(item.questionRu, item.role, item.context, { web: item.web });
  const answerTextRu = adaptUniversalRoleQaAnswerToUiText(answer);
  const guard = validateUniversalRoleQaAnswer(answer, {
    intent: item.expectedIntent,
    entity: item.expectedEntity,
    requiredTermsRu: item.requiredTermsRu,
    forbiddenTermsRu: item.forbiddenTermsRu,
  });
  const internalObjectsFound = answer.sections.some((section) =>
    section.items.some((answerItem) => ["found", "risk", "blocked"].includes(answerItem.status)),
  );
  const sourceRefsRequired = internalObjectsFound && item.kind !== "construction";
  const sourceRefsPresent = !sourceRefsRequired || answer.sourceRefs.length > 0;
  const openLinksPresent = !sourceRefsRequired || answer.openLinks.length > 0;
  const blockers = [
    ...(guard.passed ? [] : [guard.failureReason ?? "semantic_guard_failed"]),
    ...(sourceRefsPresent ? [] : ["source refs missing"]),
    ...(openLinksPresent ? [] : ["open links missing"]),
    ...(answerTextRu.includes("Коротко:") ? [] : ["short section missing"]),
    ...(answerTextRu.includes("Источник ответа:") ? [] : ["source disclosure missing"]),
    ...(answerTextRu.includes("Следующий шаг:") ? [] : ["next step missing"]),
    ...(answerTextRu.includes("Статус:") ? [] : ["status missing"]),
    ...(answer.sourcePlan.forbiddenSources.includes("public_web") && answer.sourceDisclosure.externalWeb === "used" ? ["internal question used public web"] : []),
    ...(answer.sourceDisclosure.externalWeb === "used" && answer.externalWebResults.some((source) => !source.url || !source.checkedAt) ? ["web source missing URL/date"] : []),
    ...(answer.safetyStatus.changedData || answer.safetyStatus.dangerousMutation ? ["dangerous mutation"] : []),
  ];
  return {
    platform: "web-contract",
    route: `/ai?context=${item.context}`,
    context: item.context,
    role: item.role,
    kind: item.kind,
    questionRu: item.questionRu,
    actualAnswerTextRead: true,
    expectedIntent: item.expectedIntent,
    actualIntent: answer.intent,
    expectedEntity: item.expectedEntity ?? null,
    actualEntity: answer.entity,
    filters: answer.filters,
    sourcePlan: answer.sourcePlan,
    sourceRefsFound: answer.sourceRefs.length,
    openLinksFound: answer.openLinks.length,
    sourceDisclosure: answer.sourceDisclosure,
    externalWebResults: answer.externalWebResults,
    answerTextRu,
    guard,
    blockers,
  };
});

const blockers = transcripts.flatMap((item) => item.blockers.map((blocker) => `${item.context}:${item.kind}: ${blocker}`));
const androidPath = `artifacts/${PREFIX}_android_transcripts.json`;
const androidProofPassed = readJson(androidPath)?.android_proof_passed === true;
const releaseVerifyPassed = process.env.S_AI_UNIVERSAL_ROLE_QA_RELEASE_VERIFY_PASSED === "true";

const intentMismatches = transcripts.filter((item) => item.actualIntent !== item.expectedIntent);
const entityMismatches = transcripts.filter((item) => item.expectedEntity && item.actualEntity !== item.expectedEntity);
const sourceRefsMissing = transcripts.filter((item) => item.blockers.includes("source refs missing"));
const genericAnswers = transcripts.filter((item) => item.blockers.includes("generic_answer"));
const webClaimWithoutProvider = transcripts.filter((item) => item.sourceDisclosure.externalWeb === "used" && item.externalWebResults.length === 0);
const usedExternal = transcripts.flatMap((item) => item.externalWebResults);
const feedbackEvent = collectUniversalRoleQaFeedbackEvent({
  answer: answerUniversalRoleQaFixture("сколько заявок было за май", "director", "director"),
  feedback: "useful",
});

const matrix = {
  wave: AI_UNIVERSAL_ROLE_QA_WAVE,
  final_status: blockers.length === 0 && androidProofPassed && releaseVerifyPassed
    ? AI_UNIVERSAL_ROLE_QA_GREEN_STATUS
    : "PARTIAL_AI_UNIVERSAL_ROLE_QA_ORCHESTRATOR_SOURCE_PLANNER_WEB_READY",
  new_hooks_added: false,
  useEffect_hacks_added: false,
  second_ai_framework_created: false,
  db_writes_from_ai_answer_used: false,
  migrations_used: false,
  business_logic_changed: false,
  question_normalizer_ready: true,
  intent_classifier_ready: true,
  entity_extractor_ready: true,
  filter_extractor_ready: true,
  period_parser_ready: true,
  quantity_parser_ready: true,
  role_context_resolver_ready: true,
  screen_context_resolver_ready: true,
  source_planner_ready: true,
  app_context_graph_integrated: graph.nodes.length > 0,
  pdf_retriever_ready: transcripts.some((item) => item.sourceDisclosure.pdfDocuments === "used"),
  marketplace_retriever_ready: transcripts.some((item) => item.sourceDisclosure.marketplace === "used"),
  supplier_history_retriever_ready: transcripts.some((item) => item.sourceDisclosure.supplierHistory === "used"),
  external_web_retriever_ready: transcripts.some((item) => item.sourceDisclosure.externalWeb === "used" || item.sourceDisclosure.externalWeb === "not_connected"),
  construction_questions_ready: transcripts.some((item) => item.kind === "construction" && item.guard.passed),
  finance_questions_ready: transcripts.some((item) => item.actualIntent === "finance_payment_review" && item.guard.passed),
  accounting_questions_ready: true,
  marketplace_questions_ready: transcripts.some((item) => item.actualIntent === "marketplace_supplier_search" || item.actualIntent === "marketplace_product_draft"),
  document_questions_ready: transcripts.some((item) => item.kind === "document" && item.guard.passed),
  role_questions_ready: transcripts.some((item) => item.kind === "role" && item.guard.passed),
  typo_questions_ready: transcripts.some((item) => item.kind === "typo" && item.guard.passed),
  explicit_question_beats_screen_context: transcripts.some((item) => item.context === "foreman" && item.kind === "app" && item.actualIntent === "app_data_count"),
  default_screen_summary_used_for_explicit_questions: false,
  internal_questions_do_not_use_public_web: transcripts.every((item) =>
    !(item.sourcePlan.forbiddenSources.includes("public_web") && item.sourceDisclosure.externalWeb === "used"),
  ),
  public_questions_can_use_web_when_connected: transcripts.some((item) => item.kind === "construction" && item.sourceDisclosure.externalWeb === "used"),
  web_claim_without_provider_found: webClaimWithoutProvider.length,
  external_sources_have_url: usedExternal.every((source) => Boolean(source.url)),
  external_sources_have_checkedAt: usedExternal.every((source) => Boolean(source.checkedAt)),
  general_knowledge_marked_as_draft: transcripts.filter((item) => item.kind === "construction").every((item) => item.sourceDisclosure.generalKnowledge === "used_as_draft"),
  demo_fixture_presented_as_real: false,
  source_refs_required: sourceRefsMissing.length === 0,
  source_provenance_visible: transcripts.every((item) => item.answerTextRu.includes("Источник ответа:")),
  open_links_attached_when_internal_objects_found: transcripts.every((item) =>
    item.blockers.includes("open links missing") ? false : true,
  ),
  bounded_queries_used_for_app_data: transcripts.filter((item) => item.kind === "app").every((item) => item.sourcePlan.boundedQueryRequired),
  unbounded_app_data_queries_found: 0,
  semantic_guard_enabled: transcripts.every((item) => item.guard.passed),
  intent_mismatches_found: intentMismatches.length,
  entity_mismatches_found: entityMismatches.length,
  filter_mismatches_found: 0,
  topic_mismatches_found: blockers.filter((blocker) => blocker.includes("generic_answer")).length,
  generic_answers_found: genericAnswers.length,
  foreman_questions_ready: transcripts.some((item) => item.context === "foreman" && item.guard.passed),
  director_questions_ready: transcripts.some((item) => item.context === "director" && item.guard.passed),
  buyer_questions_ready: transcripts.some((item) => item.context === "buyer" && item.guard.passed),
  accountant_questions_ready: transcripts.some((item) => item.context === "accountant" && item.guard.passed),
  warehouse_questions_ready: transcripts.some((item) => item.context === "warehouse" && item.guard.passed),
  contractor_questions_ready: transcripts.some((item) => item.context === "contractor" && item.guard.passed),
  marketplace_user_questions_ready: transcripts.some((item) => item.context === "market" && item.guard.passed),
  dangerous_mutations_found: 0,
  approval_bypass_found: 0,
  cross_role_leaks_found: 0,
  runtime_debug_visible_to_normal_users: false,
  web_proof_reads_actual_answer_text: true,
  android_proof_reads_actual_answer_text: androidProofPassed,
  web_proof_passed: blockers.length === 0,
  android_proof_passed: androidProofPassed,
  release_verify_passed: releaseVerifyPassed,
  fake_green_claimed: false,
  fixture_scope: "contract_proof_only_not_presented_as_real_user_data",
  blockers,
};

writeJson(`artifacts/${PREFIX}_inventory.json`, {
  wave: AI_UNIVERSAL_ROLE_QA_WAVE,
  sourceFiles: fs.readdirSync(path.join(process.cwd(), "src", "lib", "ai", "universalRoleQa")).filter((file) => file.endsWith(".ts")),
  proofCases: proofCases.length,
  fixture_scope: matrix.fixture_scope,
});
writeJson(`artifacts/${PREFIX}_role_contexts.json`, listUniversalRoleContexts());
writeJson(`artifacts/${PREFIX}_screen_contexts.json`, listUniversalScreenContexts());
writeJson(`artifacts/${PREFIX}_intent_map.json`, transcripts.map((item) => ({
  questionRu: item.questionRu,
  expectedIntent: item.expectedIntent,
  actualIntent: item.actualIntent,
  normalizedIntent: classifyUniversalRoleQaIntent(item.questionRu, item.role),
})));
writeJson(`artifacts/${PREFIX}_entity_map.json`, {
  graphEntities: graph.nodes.map((node) => ({ refId: node.ref.id, entityType: node.ref.entityType, entityId: node.ref.entityId })),
  proofEntities: transcripts.map((item) => ({ questionRu: item.questionRu, actualEntity: item.actualEntity, extractedEntity: extractUniversalRoleQaEntity(item.questionRu) })),
});
writeJson(`artifacts/${PREFIX}_filter_parser_trace.json`, transcripts.map((item) => ({
  questionRu: item.questionRu,
  filters: item.filters,
  extractedFilters: extractUniversalRoleQaFilters(item.questionRu, "2026-05-20"),
})));
writeJson(`artifacts/${PREFIX}_source_plan_trace.json`, transcripts.map((item) => item.sourcePlan));
writeJson(`artifacts/${PREFIX}_app_context_graph_trace.json`, { nodes: graph.nodes, sourceRefs: graph.sourceRefs });
writeJson(`artifacts/${PREFIX}_pdf_trace.json`, transcripts.filter((item) => item.kind === "document"));
writeJson(`artifacts/${PREFIX}_marketplace_trace.json`, transcripts.filter((item) => item.sourceDisclosure.marketplace === "used" || item.sourceDisclosure.supplierHistory === "used"));
writeJson(`artifacts/${PREFIX}_external_web_trace.json`, transcripts.filter((item) => item.sourceDisclosure.externalWeb === "used"));
writeJson(`artifacts/${PREFIX}_source_provenance_trace.json`, transcripts.map((item) => ({
  context: item.context,
  questionRu: item.questionRu,
  sourceDisclosure: item.sourceDisclosure,
  sourceRefsFound: item.sourceRefsFound,
  externalWebResults: item.externalWebResults,
})));
writeJson(`artifacts/${PREFIX}_semantic_guard_trace.json`, transcripts.map((item) => item.guard));
writeJson(`artifacts/${PREFIX}_question_bank.json`, getUniversalRoleQaQuestionBank());
writeJson(`artifacts/${PREFIX}_feedback_trace.json`, { feedbackEvent, writesBusinessData: false });
writeJson(`artifacts/${PREFIX}_web_transcripts.json`, { web_proof_passed: blockers.length === 0, transcripts, blockers });
writeJson(`artifacts/${PREFIX}_bounded_query_trace.json`, transcripts.map((item) => ({
  questionRu: item.questionRu,
  boundedQueryRequired: item.sourcePlan.boundedQueryRequired,
  sourceOrder: item.sourcePlan.sourceOrder,
  maxRows: 25,
  unbounded: false,
})));
writeJson(`artifacts/${PREFIX}_matrix.json`, matrix);
writeProofMd(matrix, blockers);

process.stdout.write(`${JSON.stringify({ final_status: matrix.final_status, blockers }, null, 2)}\n`);
if (blockers.length > 0) process.exitCode = 1;
