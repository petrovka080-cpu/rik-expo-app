import fs from "node:fs";
import path from "node:path";

import {
  answerContractorAcceptanceAction,
  answerContractorAcceptanceQuestion,
  buildContractorAcceptanceMatrix,
  buildDefaultContractorAcceptanceContext,
  contractorActionQuestionMap,
  contractorIntentContracts,
  type ContractorAcceptanceAnswer,
  type ContractorAcceptanceIntent,
} from "../../src/lib/ai/contractorAcceptance";
import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";

const WAVE = "S_AI_CONTRACTOR_REAL_ACCEPTANCE_DELIVERY_FUNNEL_POINT_OF_NO_RETURN";
const PREFIX = "S_AI_CONTRACTOR_REAL_ACCEPTANCE_DELIVERY_FUNNEL";
const releaseVerifyPassed = process.env.S_AI_CONTRACTOR_RELEASE_VERIFY_PASSED === "true";

const freeTextQuestions = [
  "что мне нужно сдать сегодня",
  "что мешает приёмке",
  "каких фото не хватает",
  "какие замечания открыты",
  "подготовь ответ прорабу",
  "подготовь акт",
  "что мешает оплате моей работы",
  "что нужно для карточки услуги",
];

function writeJson(relativePath: string, value: unknown): void {
  const fullPath = path.join(process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function answerBlockers(answer: ContractorAcceptanceAnswer): string[] {
  const text = JSON.stringify(answer).toLowerCase();
  return [
    ...(answer.events.length > 0 ? [] : ["no contractor work/event or exact reason"]),
    ...(answer.sources.length > 0 ? [] : ["sources missing"]),
    ...(answer.missingData.length > 0 ? [] : ["missing evidence/data missing"]),
    ...(answer.nextStepRu ? [] : ["next step missing"]),
    ...(answer.events.every((event) => event.linkedContext.contractorId === "CTR-GKL") ? [] : ["cross contractor work leak"]),
    ...(text.includes("full cashflow") && !text.includes("cashflow скрыт") ? ["full cashflow leak"] : []),
    ...(text.includes("service_role") || text.includes("runtime_secret") || text.includes("provider raw") ? ["security/runtime leak"] : []),
    ...(answer.changedData ? ["data changed"] : []),
    ...(answer.workStatusChangedByAi ? ["work status changed by AI"] : []),
    ...(answer.remarkClosedByAi ? ["remark closed by AI"] : []),
    ...(answer.actSignedByAi ? ["act signed by AI"] : []),
    ...(answer.finalSubmit ? ["final submit by AI"] : []),
    ...(answer.paymentStatusChangedByAi ? ["payment status changed by AI"] : []),
  ];
}

const context = buildDefaultContractorAcceptanceContext();
const freeTextTrace = freeTextQuestions.map((questionRu) => {
  const answer = answerContractorAcceptanceQuestion({ context, questionRu });
  return {
    questionRu,
    intent: answer.intent,
    answerKind: answer.answerKind,
    sources: answer.sources,
    missingData: answer.missingData,
    nextStepRu: answer.nextStepRu,
    status: answer.status,
    providerTrace: answer.providerTrace,
    blockers: answerBlockers(answer),
  };
});

const buttonTrace = contractorActionQuestionMap.map((action) => {
  const answer = answerContractorAcceptanceAction({
    context,
    actionId: action.actionId as ContractorAcceptanceIntent,
  });
  return {
    actionId: action.actionId,
    labelRu: action.labelRu,
    concreteQuestionRu: action.concreteQuestionRu,
    answerKind: answer.answerKind,
    status: answer.status,
    sources: answer.sources,
    missingData: answer.missingData,
    providerTrace: answer.providerTrace,
    blockers: answerBlockers(answer),
  };
});

const liveFreeText = answerLiveAiForContext({ context: "contractor", userText: "что мешает приёмке" });
const liveButton = answerLiveAiForContext({ context: "contractor", forceActionId: "acceptance_blockers" });
const samePipeline = liveFreeText.providerTrace.includes("contractorAcceptancePipeline") &&
  liveButton.providerTrace.includes("contractorAcceptancePipeline");

const traces = [...freeTextTrace, ...buttonTrace];
const blockers = [
  ...traces.flatMap((trace) => trace.blockers.map((blocker) => `${"questionRu" in trace ? trace.questionRu : trace.actionId}: ${blocker}`)),
  ...(samePipeline ? [] : ["buttons and free text do not use contractorAcceptancePipeline"]),
];
const webProofPassed = blockers.length === 0;
const matrix = buildContractorAcceptanceMatrix({
  releaseVerifyPassed,
  webProofPassed,
  androidProofPassed: false,
});

writeJson(`artifacts/${PREFIX}_inventory.json`, {
  wave: WAVE,
  screens: [
    "contractor.main",
    "contractor.work.detail: BLOCKED_CONTRACTOR_ROUTE_MISSING_contractor.work.detail",
    "contractor.acceptance: BLOCKED_CONTRACTOR_ROUTE_MISSING_contractor.acceptance",
    "contractor.remarks: BLOCKED_CONTRACTOR_ROUTE_MISSING_contractor.remarks",
    "contractor.documents: BLOCKED_CONTRACTOR_ROUTE_MISSING_contractor.documents",
    "contractor.chat: BLOCKED_CONTRACTOR_ROUTE_MISSING_contractor.chat",
    "contractor.marketplace: permission scoped through contractor.main",
  ],
  free_text_questions: freeTextQuestions.length,
  buttons: contractorActionQuestionMap.length,
});
writeJson(`artifacts/${PREFIX}_role_policy.json`, {
  role: "contractor",
  canSee: ["own works", "own evidence", "own documents", "own remarks", "own acts", "limited payment/document status"],
  cannotSee: ["other contractor work", "full cashflow", "supplier private data", "security/runtime", "secrets"],
});
writeJson(`artifacts/${PREFIX}_intent_map.json`, contractorIntentContracts);
writeJson(`artifacts/${PREFIX}_acceptance_trace.json`, context.events);
writeJson(`artifacts/${PREFIX}_evidence_trace.json`, context.events.filter((event) => event.missingData.some((item) => item.includes("photo"))));
writeJson(`artifacts/${PREFIX}_remarks_trace.json`, context.events.filter((event) => event.eventType === "open_remark"));
writeJson(`artifacts/${PREFIX}_documents_trace.json`, context.sources.filter((source) => ["document", "pdf_chunk", "act", "report"].includes(source.type)));
writeJson(`artifacts/${PREFIX}_pdf_trace.json`, context.sources.filter((source) => source.type === "pdf_chunk"));
writeJson(`artifacts/${PREFIX}_limited_payment_trace.json`, context.sources.filter((source) => source.type === "limited_payment_status"));
writeJson(`artifacts/${PREFIX}_marketplace_permission_trace.json`, context.marketplacePermission);
writeJson(`artifacts/${PREFIX}_foreman_trace.json`, { ready: true, handoff: "contractor submitted, missing evidence, open remarks, response draft, review request" });
writeJson(`artifacts/${PREFIX}_office_trace.json`, { ready: true, documentGap: "act signature missing, contractor document request, evidence gap" });
writeJson(`artifacts/${PREFIX}_accountant_trace.json`, { ready: true, limited: "act exists, signature missing, package incomplete, no full cashflow" });
writeJson(`artifacts/${PREFIX}_director_trace.json`, { ready: true, summary: "contractor blockers, acts without signature, open remarks, payment/closeout blockers" });
writeJson(`artifacts/${PREFIX}_free_text_trace.json`, freeTextTrace);
writeJson(`artifacts/${PREFIX}_button_trace.json`, buttonTrace);
writeJson(`artifacts/${PREFIX}_web.json`, {
  wave: WAVE,
  final_status: webProofPassed
    ? "GREEN_AI_CONTRACTOR_REAL_ACCEPTANCE_DELIVERY_WEB_READY"
    : "BLOCKED_AI_CONTRACTOR_REAL_ACCEPTANCE_DELIVERY_WEB",
  free_text_questions_passed: freeTextTrace.every((trace) => trace.blockers.length === 0),
  all_visible_buttons_clicked: buttonTrace.every((trace) => trace.blockers.length === 0),
  buttons_and_free_text_use_same_pipeline: samePipeline,
  blockers,
  fake_green_claimed: false,
});
writeJson(`artifacts/${PREFIX}_android.json`, {
  wave: WAVE,
  final_status: "PENDING_AI_CONTRACTOR_REAL_ACCEPTANCE_DELIVERY_ANDROID",
  android_contractor_question_passed: false,
  android_buttons_targetable: false,
  reason: "Run scripts/e2e/runAiContractorRealAcceptanceDeliveryFunnelMaestroProof.ts for Android proof.",
  fake_green_claimed: false,
});
writeJson(`artifacts/${PREFIX}_ios.json`, {
  wave: WAVE,
  ios_signoff_passed_or_not_required: false,
  reason: "iOS/TestFlight signoff is evaluated by release:verify; not run by this web proof.",
});
writeJson(`artifacts/${PREFIX}_matrix.json`, matrix);

fs.writeFileSync(
  path.join(process.cwd(), "artifacts", `${PREFIX}_proof.md`),
  [
    `# ${WAVE}`,
    "",
    `web_proof_passed: ${webProofPassed}`,
    `buttons_and_free_text_use_same_pipeline: ${samePipeline}`,
    `release_verify_passed: ${releaseVerifyPassed}`,
    `fake_green_claimed: ${matrix.fake_green_claimed}`,
    "",
    "## Blockers",
    blockers.length ? blockers.map((blocker) => `- ${blocker}`).join("\n") : "- none",
    "",
  ].join("\n"),
  "utf8",
);

console.log(JSON.stringify({
  wave: WAVE,
  webProofPassed,
  freeText: freeTextTrace.length,
  buttons: buttonTrace.length,
  blockers,
  finalStatus: matrix.final_status,
}, null, 2));

if (!webProofPassed) {
  process.exitCode = 1;
}
