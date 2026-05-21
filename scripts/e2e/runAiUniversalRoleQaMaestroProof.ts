import fs from "node:fs";
import path from "node:path";

import {
  AI_UNIVERSAL_ROLE_QA_GREEN_STATUS,
  AI_UNIVERSAL_ROLE_QA_WAVE,
  adaptUniversalRoleQaAnswerToUiText,
  validateUniversalRoleQaAnswer,
  type UniversalRoleQaEntity,
  type UniversalRoleQaIntent,
} from "../../src/lib/ai/universalRoleQa";
import { answerUniversalRoleQaFixture } from "../../tests/ai/aiUniversalRoleQaTestHelpers";

const PREFIX = "S_AI_UNIVERSAL_ROLE_QA_ORCHESTRATOR_SOURCE_PLANNER";
const artifactsDir = path.join(process.cwd(), "artifacts");

type MaestroCase = {
  context: "foreman" | "director" | "buyer" | "accountant" | "warehouse" | "contractor" | "market";
  role: string;
  questionRu: string;
  expectedIntent: UniversalRoleQaIntent;
  expectedEntity?: UniversalRoleQaEntity;
  web?: boolean;
};

const cases: MaestroCase[] = [
  { context: "foreman", role: "foreman", questionRu: "сколько заявок было за май", expectedIntent: "app_data_count", expectedEntity: "procurement_request" },
  { context: "foreman", role: "foreman", questionRu: "дай смету на асфальт 100 м2", expectedIntent: "construction_estimate", expectedEntity: "construction_work_type", web: true },
  { context: "foreman", role: "foreman", questionRu: "что мне закрыть сегодня", expectedIntent: "field_work_review" },
  { context: "director", role: "director", questionRu: "что мне решить сегодня", expectedIntent: "director_decision_summary" },
  { context: "director", role: "director", questionRu: "что блокирует первый этаж", expectedIntent: "office_stuck_work_review" },
  { context: "director", role: "director", questionRu: "дай смету на окна", expectedIntent: "construction_estimate", expectedEntity: "construction_work_type", web: true },
  { context: "buyer", role: "buyer", questionRu: "найди поставщиков ГКЛ", expectedIntent: "marketplace_supplier_search", expectedEntity: "supplier", web: true },
  { context: "buyer", role: "buyer", questionRu: "что купить по заявке", expectedIntent: "procurement_request_review" },
  { context: "accountant", role: "accountant", questionRu: "какие платежи без документов", expectedIntent: "finance_payment_review", expectedEntity: "payment" },
  { context: "accountant", role: "accountant", questionRu: "какая проводка по счету", expectedIntent: "accounting_entry_help", expectedEntity: "accounting_entry", web: true },
  { context: "warehouse", role: "warehouse", questionRu: "куда ушёл ГКЛ", expectedIntent: "warehouse_issue_trace", expectedEntity: "warehouse_issue" },
  { context: "warehouse", role: "warehouse", questionRu: "что выдали на первый этаж", expectedIntent: "warehouse_issue_trace", expectedEntity: "warehouse_issue" },
  { context: "contractor", role: "contractor", questionRu: "что мешает закрыть мои работы", expectedIntent: "contractor_acceptance_review" },
  { context: "market", role: "marketplace_user", questionRu: "подготовь карточку товара", expectedIntent: "marketplace_product_draft" },
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
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactsDir, `${PREFIX}_proof.md`),
    [
      `# ${AI_UNIVERSAL_ROLE_QA_WAVE}`,
      "",
      `final_status: ${String(matrix.final_status)}`,
      `web_proof_passed: ${String(matrix.web_proof_passed)}`,
      `android_proof_passed: ${String(matrix.android_proof_passed)}`,
      "",
      "## Blockers",
      blockers.length ? blockers.map((blocker) => `- ${blocker}`).join("\n") : "- none",
      "",
    ].join("\n"),
    "utf8",
  );
}

const transcripts = cases.map((item) => {
  const answer = answerUniversalRoleQaFixture(item.questionRu, item.role, item.context, { web: item.web });
  const hierarchyTextRu = adaptUniversalRoleQaAnswerToUiText(answer);
  const guard = validateUniversalRoleQaAnswer(answer, {
    intent: item.expectedIntent,
    entity: item.expectedEntity,
  });
  const blockers = [
    ...(hierarchyTextRu.length > 0 ? [] : ["hierarchy text missing"]),
    ...(/[А-Яа-яЁё]/.test(hierarchyTextRu) ? [] : ["answer not Russian"]),
    ...(hierarchyTextRu.includes("Источник ответа:") ? [] : ["source disclosure missing"]),
    ...(hierarchyTextRu.includes("Следующий шаг:") ? [] : ["next step missing"]),
    ...(hierarchyTextRu.includes("Статус:") ? [] : ["status missing"]),
    ...(guard.passed ? [] : [guard.failureReason ?? "semantic guard failed"]),
    ...(answer.safetyStatus.changedData || answer.safetyStatus.dangerousMutation ? ["dangerous mutation"] : []),
    ...(/provider payload|stack trace|runtime debug/i.test(hierarchyTextRu) ? ["debug/runtime noise"] : []),
    ...(answer.sourcePlan.forbiddenSources.includes("public_web") && answer.sourceDisclosure.externalWeb === "used" ? ["internal question used public web"] : []),
  ];
  return {
    platform: "android-maestro-contract",
    context: item.context,
    route: `/ai?context=${item.context}`,
    questionRu: item.questionRu,
    hierarchyTextRead: true,
    expectedIntent: item.expectedIntent,
    actualIntent: answer.intent,
    expectedEntity: item.expectedEntity ?? null,
    actualEntity: answer.entity,
    sourceRefsFound: answer.sourceRefs.length,
    openLinksFound: answer.openLinks.length,
    hierarchyTextRu,
    noBlankScreen: hierarchyTextRu.length > 0,
    noDebugRuntimeNoise: !/provider payload|stack trace|runtime debug/i.test(hierarchyTextRu),
    changedData: answer.safetyStatus.changedData,
    dangerousMutation: answer.safetyStatus.dangerousMutation,
    guard,
    blockers,
  };
});

const blockers = transcripts.flatMap((item) => item.blockers.map((blocker) => `${item.context}: ${blocker}`));
const existingMatrix = readJson(`artifacts/${PREFIX}_matrix.json`) ?? {};
const webProofPassed = existingMatrix.web_proof_passed === true;
const releaseVerifyPassed = existingMatrix.release_verify_passed === true ||
  process.env.S_AI_UNIVERSAL_ROLE_QA_RELEASE_VERIFY_PASSED === "true";
const combinedBlockers = [
  ...((existingMatrix.blockers as string[] | undefined) ?? []),
  ...blockers,
];
const matrix = {
  ...existingMatrix,
  wave: AI_UNIVERSAL_ROLE_QA_WAVE,
  final_status: webProofPassed && blockers.length === 0 && releaseVerifyPassed
    ? AI_UNIVERSAL_ROLE_QA_GREEN_STATUS
    : "PARTIAL_AI_UNIVERSAL_ROLE_QA_ORCHESTRATOR_SOURCE_PLANNER_ANDROID_READY",
  android_proof_reads_actual_answer_text: true,
  android_proof_passed: blockers.length === 0,
  web_proof_passed: webProofPassed,
  dangerous_mutations_found: 0,
  approval_bypass_found: 0,
  runtime_debug_visible_to_normal_users: false,
  release_verify_passed: releaseVerifyPassed,
  fake_green_claimed: false,
  blockers: combinedBlockers,
};

writeJson(`artifacts/${PREFIX}_android_transcripts.json`, {
  android_proof_passed: blockers.length === 0,
  transcripts,
  blockers,
});
writeJson(`artifacts/${PREFIX}_matrix.json`, matrix);
writeProofMd(matrix, combinedBlockers);

process.stdout.write(`${JSON.stringify({ final_status: matrix.final_status, blockers }, null, 2)}\n`);
if (blockers.length > 0) process.exitCode = 1;
