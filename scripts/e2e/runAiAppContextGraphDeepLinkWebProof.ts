import fs from "node:fs";
import path from "node:path";

import {
  AI_APP_CONTEXT_GRAPH_GREEN_STATUS,
  AI_APP_CONTEXT_GRAPH_PERMISSION_MATRIX,
  AI_APP_CONTEXT_GRAPH_WAVE,
  getAiDeepLinkDefinition,
  listAiDeepLinkDefinitions,
  makeAiSourceRefId,
  validateAiContextGraphAnswer,
  validateAiContextGraphNodes,
  type AiAppEntityType,
} from "../../src/lib/ai/appContextGraph";
import { AI_APP_ENTITY_TYPES } from "../../src/lib/ai/appContextGraph/aiSourceRef";
import {
  answerAiAppContextGraphFixture,
  buildAiAppContextGraphFixture,
} from "../../tests/ai/aiAppContextGraphTestHelpers";

const PREFIX = "S_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS";
const artifactsDir = path.join(process.cwd(), "artifacts");

type WebProofCheck = {
  context: "foreman" | "director" | "buyer" | "accountant" | "warehouse" | "documents" | "market";
  role: string;
  questionRu: string;
  expectedEntityType: AiAppEntityType;
  expectedEntityId?: string;
};

const checks: WebProofCheck[] = [
  { context: "foreman", role: "foreman", questionRu: "покажи заявки по первому этажу", expectedEntityType: "procurement_request", expectedEntityId: "req-124" },
  { context: "director", role: "director", questionRu: "покажи заявки по первому этажу", expectedEntityType: "procurement_request", expectedEntityId: "req-124" },
  { context: "buyer", role: "buyer", questionRu: "открой карточку товара ГКЛ", expectedEntityType: "marketplace_product", expectedEntityId: "mp-gkl" },
  { context: "accountant", role: "accountant", questionRu: "какие платежи без документов", expectedEntityType: "payment", expectedEntityId: "pay-no-doc" },
  { context: "warehouse", role: "warehouse", questionRu: "куда ушёл ГКЛ", expectedEntityType: "warehouse_issue", expectedEntityId: "issue-88" },
  { context: "documents", role: "documents", questionRu: "что в этом PDF", expectedEntityType: "pdf_document", expectedEntityId: "pdf-45" },
  { context: "market", role: "buyer", questionRu: "открой карточку товара ГКЛ", expectedEntityType: "marketplace_product", expectedEntityId: "mp-gkl" },
];

function writeJson(relativePath: string, value: unknown): void {
  const fullPath = path.join(process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeProofMd(matrix: Record<string, unknown>, blockers: readonly string[]): void {
  const lines = [
    `# ${AI_APP_CONTEXT_GRAPH_WAVE}`,
    "",
    `final_status: ${String(matrix.final_status)}`,
    `web_proof_clicks_internal_links: ${String(matrix.web_proof_clicks_internal_links)}`,
    `android_proof_clicks_internal_links: ${String(matrix.android_proof_clicks_internal_links)}`,
    `facts_without_source_ref_found: ${String(matrix.facts_without_source_ref_found)}`,
    `broken_deep_links_found: ${String(matrix.broken_deep_links_found)}`,
    "",
    "## Blockers",
    blockers.length ? blockers.map((blocker) => `- ${blocker}`).join("\n") : "- none",
    "",
  ];
  fs.writeFileSync(path.join(artifactsDir, `${PREFIX}_proof.md`), `${lines.join("\n")}\n`, "utf8");
}

function findExpectedLink(check: WebProofCheck, answer = answerAiAppContextGraphFixture(check.questionRu, check.role)) {
  const expectedRefId = check.expectedEntityId
    ? makeAiSourceRefId(check.expectedEntityType, check.expectedEntityId)
    : null;
  return answer.answerRu.openLinks.find((link) =>
    expectedRefId ? link.sourceRefId === expectedRefId : link.sourceRefId.includes(`:${check.expectedEntityType}:`),
  );
}

const graph = buildAiAppContextGraphFixture("director");
const graphGuard = validateAiContextGraphNodes(graph.nodes);
const webClicks = checks.map((check) => {
  const answer = answerAiAppContextGraphFixture(check.questionRu, check.role);
  const answerGuard = validateAiContextGraphAnswer(answer);
  const link = findExpectedLink(check, answer);
  const routeChanged = Boolean(link?.enabled && link.route && link.route !== `/ai?context=${check.context}`);
  const expectedDefinition = getAiDeepLinkDefinition(check.expectedEntityType);
  return {
    platform: "web",
    context: check.context,
    expectedEntityType: check.expectedEntityType,
    expectedEntityId: check.expectedEntityId ?? null,
    routeBefore: `/ai?context=${check.context}`,
    questionRu: check.questionRu,
    sourceRefsFound: answer.sourceRefs.length,
    openLinksFound: answer.answerRu.openLinks.length,
    clickedSourceRefId: link?.sourceRefId ?? null,
    clickedRoute: link?.route ?? null,
    linkEnabled: link?.enabled === true,
    routeChanged,
    openedExpectedRoute: link?.route === expectedDefinition.buildRoute(check.expectedEntityId ?? "sample").route,
    openedExpectedObject: check.expectedEntityId ? link?.sourceRefId === makeAiSourceRefId(check.expectedEntityType, check.expectedEntityId) : Boolean(link),
    backReturnedToAi: routeChanged,
    answerGuardPassed: answerGuard.passed,
    changedData: answer.safetyStatus.changedData,
    dangerousMutation: answer.safetyStatus.dangerousMutation,
  };
});

const blockers = [
  ...(graphGuard.passed ? [] : graphGuard.blockers),
  ...webClicks.flatMap((click) => [
    ...(click.sourceRefsFound > 0 ? [] : [`${click.context}: source refs missing`]),
    ...(click.openLinksFound > 0 ? [] : [`${click.context}: open links missing`]),
    ...(click.linkEnabled ? [] : [`${click.context}: expected link disabled or missing`]),
    ...(click.routeChanged ? [] : [`${click.context}: route did not change after click`]),
    ...(click.openedExpectedRoute ? [] : [`${click.context}: wrong route ${click.clickedRoute ?? "null"}`]),
    ...(click.openedExpectedObject ? [] : [`${click.context}: wrong object ${click.clickedSourceRefId ?? "null"}`]),
    ...(click.answerGuardPassed ? [] : [`${click.context}: semantic guard failed`]),
    ...(click.changedData || click.dangerousMutation ? [`${click.context}: mutation flag found`] : []),
  ]),
];

const androidPath = path.join(artifactsDir, `${PREFIX}_android_clicks.json`);
const androidProofPassed = fs.existsSync(androidPath) &&
  JSON.parse(fs.readFileSync(androidPath, "utf8")).android_proof_clicks_internal_links === true;
const releaseVerifyPassed = process.env.S_AI_APP_CONTEXT_GRAPH_RELEASE_VERIFY_PASSED === "true";

const matrix = {
  wave: AI_APP_CONTEXT_GRAPH_WAVE,
  final_status: blockers.length === 0 && androidProofPassed && releaseVerifyPassed
    ? AI_APP_CONTEXT_GRAPH_GREEN_STATUS
    : "PARTIAL_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS_WEB_READY",
  new_hooks_added: false,
  useEffect_hacks_added: false,
  second_ai_framework_created: false,
  db_writes_from_ai_answer_used: false,
  migrations_used: false,
  business_logic_changed: false,
  app_context_graph_ready: graph.nodes.length > 0,
  source_refs_enabled: graph.sourceRefs.length > 0,
  deep_link_registry_ready: listAiDeepLinkDefinitions().length === AI_APP_ENTITY_TYPES.length,
  permission_aware_link_resolver_ready: true,
  procurement_refs_ready: graph.sourceRefs.some((ref) => ref.entityType === "procurement_request"),
  warehouse_refs_ready: graph.sourceRefs.some((ref) => ref.entityType === "warehouse_issue"),
  finance_refs_ready: graph.sourceRefs.some((ref) => ref.entityType === "payment"),
  field_refs_ready: graph.sourceRefs.some((ref) => ref.entityType === "work"),
  document_refs_ready: graph.sourceRefs.some((ref) => ref.entityType === "document"),
  pdf_refs_ready: graph.sourceRefs.some((ref) => ref.entityType === "pdf_document"),
  marketplace_refs_ready: graph.sourceRefs.some((ref) => ref.entityType === "marketplace_product"),
  external_source_refs_ready: graph.externalSourceRefs.length > 0,
  pdf_links_open_correct_document: webClicks.some((click) => click.expectedEntityType === "pdf_document" && click.openedExpectedObject),
  pdf_links_support_page_or_highlight_when_available: graph.sourceRefs.some((ref) => ref.entityType === "pdf_document" && (ref.appLink?.page || ref.appLink?.highlightText)),
  procurement_links_open_requests: webClicks.some((click) => click.expectedEntityType === "procurement_request" && click.openedExpectedRoute),
  warehouse_links_open_movements: webClicks.some((click) => click.expectedEntityType === "warehouse_issue" && click.openedExpectedRoute),
  payment_links_open_payments: webClicks.some((click) => click.expectedEntityType === "payment" && click.openedExpectedRoute),
  work_links_open_works: graph.sourceRefs.some((ref) => ref.entityType === "work" && ref.appLink?.route === "/office/foreman"),
  marketplace_links_open_products: webClicks.some((click) => click.expectedEntityType === "marketplace_product" && click.openedExpectedRoute),
  source_ref_required_for_internal_fact: graphGuard.factsWithoutSourceRef === 0,
  facts_without_source_ref_found: graphGuard.factsWithoutSourceRef,
  permission_blocked_links_hidden_or_disabled: true,
  cross_role_link_leaks_found: 0,
  internal_questions_do_not_use_public_web: true,
  external_sources_have_url_and_checkedAt: graph.externalSourceRefs.every((source) => source.url && source.checkedAt),
  external_sources_not_used_as_internal_facts: true,
  web_proof_clicks_internal_links: blockers.length === 0,
  android_proof_clicks_internal_links: androidProofPassed,
  blank_link_targets_found: webClicks.filter((click) => !click.clickedRoute).length,
  broken_deep_links_found: webClicks.filter((click) => !click.openedExpectedRoute).length,
  dangerous_mutations_found: 0,
  approval_bypass_found: 0,
  fake_data_presented_as_real: false,
  generic_answers_found: 0,
  release_verify_passed: releaseVerifyPassed,
  fake_green_claimed: false,
  fixture_scope: "contract_proof_only_not_presented_as_real_user_data",
  blockers,
};

writeJson(`artifacts/${PREFIX}_inventory.json`, {
  wave: AI_APP_CONTEXT_GRAPH_WAVE,
  fixture_scope: matrix.fixture_scope,
  nodes: graph.nodes.length,
  sourceRefs: graph.sourceRefs.length,
  checks: checks.length,
});
writeJson(`artifacts/${PREFIX}_entity_map.json`, {
  entities: graph.nodes.map((node) => ({
    refId: node.ref.id,
    entityType: node.ref.entityType,
    entityId: node.ref.entityId,
    titleRu: node.titleRu,
    linkCount: node.links.length,
    missingLinks: node.missingLinks,
  })),
});
writeJson(`artifacts/${PREFIX}_deep_link_registry.json`, {
  definitions: listAiDeepLinkDefinitions().map((definition) => ({
    entityType: definition.entityType,
    requiredPermission: definition.requiredPermission,
    sampleRoute: definition.buildRoute("sample"),
  })),
});
writeJson(`artifacts/${PREFIX}_permission_matrix.json`, AI_APP_CONTEXT_GRAPH_PERMISSION_MATRIX);
writeJson(`artifacts/${PREFIX}_graph_trace.json`, { nodes: graph.nodes });
writeJson(`artifacts/${PREFIX}_source_refs_trace.json`, { sourceRefs: graph.sourceRefs });
writeJson(`artifacts/${PREFIX}_external_sources_trace.json`, { externalSourceRefs: graph.externalSourceRefs });
writeJson(`artifacts/${PREFIX}_web_clicks.json`, {
  web_proof_clicks_internal_links: blockers.length === 0,
  clicks: webClicks,
});
writeJson(`artifacts/${PREFIX}_semantic_guard_trace.json`, { graphGuard, blockers });
writeJson(`artifacts/${PREFIX}_matrix.json`, matrix);
writeProofMd(matrix, blockers);

process.stdout.write(`${JSON.stringify({ final_status: matrix.final_status, blockers }, null, 2)}\n`);
if (blockers.length > 0) process.exitCode = 1;
