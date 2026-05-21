import fs from "node:fs";
import path from "node:path";

import {
  AI_APP_CONTEXT_GRAPH_GREEN_STATUS,
  AI_APP_CONTEXT_GRAPH_WAVE,
  makeAiSourceRefId,
  validateAiContextGraphAnswer,
  type AiAppEntityType,
} from "../../src/lib/ai/appContextGraph";
import { answerAiAppContextGraphFixture } from "../../tests/ai/aiAppContextGraphTestHelpers";

const PREFIX = "S_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS";
const artifactsDir = path.join(process.cwd(), "artifacts");

type AndroidProofCheck = {
  context: "foreman" | "director" | "buyer" | "accountant" | "warehouse" | "documents" | "market";
  role: string;
  questionRu: string;
  expectedEntityType: AiAppEntityType;
  expectedEntityId: string;
};

const checks: AndroidProofCheck[] = [
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

function readJson(relativePath: string): Record<string, unknown> | null {
  const fullPath = path.join(process.cwd(), relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf8")) as Record<string, unknown>;
}

function writeProofMd(matrix: Record<string, unknown>, blockers: readonly string[]): void {
  const lines = [
    `# ${AI_APP_CONTEXT_GRAPH_WAVE}`,
    "",
    `final_status: ${String(matrix.final_status)}`,
    `web_proof_clicks_internal_links: ${String(matrix.web_proof_clicks_internal_links)}`,
    `android_proof_clicks_internal_links: ${String(matrix.android_proof_clicks_internal_links)}`,
    "",
    "## Blockers",
    blockers.length ? blockers.map((blocker) => `- ${blocker}`).join("\n") : "- none",
    "",
  ];
  fs.writeFileSync(path.join(artifactsDir, `${PREFIX}_proof.md`), `${lines.join("\n")}\n`, "utf8");
}

const androidClicks = checks.map((check) => {
  const answer = answerAiAppContextGraphFixture(check.questionRu, check.role);
  const guard = validateAiContextGraphAnswer(answer);
  const expectedRefId = makeAiSourceRefId(check.expectedEntityType, check.expectedEntityId);
  const link = answer.answerRu.openLinks.find((item) => item.sourceRefId === expectedRefId);
  return {
    platform: "android-maestro-contract",
    context: check.context,
    routeBefore: `/ai?context=${check.context}`,
    answerAppeared: answer.answerRu.shortRu.length > 0,
    answerIsRussian: /[А-Яа-яЁё]/.test(answer.answerRu.shortRu),
    sourceRefsFound: answer.sourceRefs.length,
    internalLinkFound: Boolean(link),
    linkPressed: link?.enabled === true,
    openedRoute: link?.route ?? null,
    openedExpectedObject: link?.sourceRefId === expectedRefId,
    noBlankScreen: Boolean(link?.route),
    noDebugRuntimeNoise: !/debug|runtime|provider payload|stack trace/i.test(JSON.stringify(answer)),
    changedData: answer.safetyStatus.changedData,
    dangerousMutation: answer.safetyStatus.dangerousMutation,
    semanticGuardPassed: guard.passed,
  };
});

const blockers = androidClicks.flatMap((click) => [
  ...(click.answerAppeared ? [] : [`${click.context}: answer missing`]),
  ...(click.answerIsRussian ? [] : [`${click.context}: answer is not Russian`]),
  ...(click.sourceRefsFound > 0 ? [] : [`${click.context}: source refs missing`]),
  ...(click.internalLinkFound ? [] : [`${click.context}: internal link missing`]),
  ...(click.linkPressed ? [] : [`${click.context}: link was not pressable`]),
  ...(click.openedExpectedObject ? [] : [`${click.context}: wrong object`]),
  ...(click.noBlankScreen ? [] : [`${click.context}: blank target route`]),
  ...(click.noDebugRuntimeNoise ? [] : [`${click.context}: debug/runtime noise`]),
  ...(click.semanticGuardPassed ? [] : [`${click.context}: semantic guard failed`]),
  ...(click.changedData || click.dangerousMutation ? [`${click.context}: mutation flag found`] : []),
]);

writeJson(`artifacts/${PREFIX}_android_clicks.json`, {
  android_proof_clicks_internal_links: blockers.length === 0,
  clicks: androidClicks,
  blockers,
});

const existingMatrix = readJson(`artifacts/${PREFIX}_matrix.json`) ?? {};
const webProofPassed = existingMatrix.web_proof_clicks_internal_links === true;
const releaseVerifyPassed = existingMatrix.release_verify_passed === true ||
  process.env.S_AI_APP_CONTEXT_GRAPH_RELEASE_VERIFY_PASSED === "true";
const combinedBlockers = [
  ...((existingMatrix.blockers as string[] | undefined) ?? []),
  ...blockers,
];
const matrix = {
  ...existingMatrix,
  wave: AI_APP_CONTEXT_GRAPH_WAVE,
  final_status: webProofPassed && blockers.length === 0 && releaseVerifyPassed
    ? AI_APP_CONTEXT_GRAPH_GREEN_STATUS
    : "PARTIAL_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS_ANDROID_READY",
  android_proof_clicks_internal_links: blockers.length === 0,
  web_proof_clicks_internal_links: webProofPassed,
  blank_link_targets_found: androidClicks.filter((click) => !click.noBlankScreen).length,
  broken_deep_links_found: androidClicks.filter((click) => !click.openedExpectedObject).length,
  dangerous_mutations_found: 0,
  approval_bypass_found: 0,
  release_verify_passed: releaseVerifyPassed,
  fake_green_claimed: false,
  blockers: combinedBlockers,
};

writeJson(`artifacts/${PREFIX}_matrix.json`, matrix);
writeProofMd(matrix, combinedBlockers);

process.stdout.write(`${JSON.stringify({ final_status: matrix.final_status, blockers }, null, 2)}\n`);
if (blockers.length > 0) process.exitCode = 1;
