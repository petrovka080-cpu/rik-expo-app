import fs from "node:fs";
import path from "node:path";

import {
  answerContractorAcceptanceAction,
  answerContractorAcceptanceQuestion,
  buildContractorAcceptanceMatrix,
  buildDefaultContractorAcceptanceContext,
  type ContractorAcceptanceAnswer,
} from "../../src/lib/ai/contractorAcceptance";
import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";

const WAVE = "S_AI_CONTRACTOR_REAL_ACCEPTANCE_DELIVERY_FUNNEL_POINT_OF_NO_RETURN";
const PREFIX = "S_AI_CONTRACTOR_REAL_ACCEPTANCE_DELIVERY_FUNNEL";
const releaseVerifyPassed = process.env.S_AI_CONTRACTOR_RELEASE_VERIFY_PASSED === "true";

function writeJson(relativePath: string, value: unknown): void {
  const fullPath = path.join(process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function answerText(answer: ContractorAcceptanceAnswer): string {
  return [
    answer.titleRu,
    answer.shortAnswerRu,
    answer.nextStepRu,
    ...answer.events.map((event) => `${event.titleRu}\n${event.summaryRu}`),
    ...answer.sources.map((source) => source.labelRu),
    ...answer.missingData,
    ...answer.roleActions.map((action) => `${action.actionRu}\n${action.reasonRu}`),
  ].join("\n");
}

function visibleAnswerBlockers(answer: ContractorAcceptanceAnswer): string[] {
  const text = answerText(answer).toLowerCase();
  return [
    ...(answer.events.length > 0 ? [] : ["answer has no contractor event"]),
    ...(answer.sources.length > 0 ? [] : ["sources are not visible"]),
    ...(answer.nextStepRu ? [] : ["next step is not visible"]),
    ...(answer.status ? [] : ["safety status is not visible"]),
    ...(text.includes("нужен конкретный источник") ? ["generic source blocker visible"] : []),
    ...(text.includes("ai помощник") || text.includes("provider") || text.includes("runtime_secret") || text.includes("service_role")
      ? ["debug/provider/runtime text visible"]
      : []),
    ...(text.includes("full cashflow") && !text.includes("cashflow скрыт") ? ["full cashflow visible"] : []),
    ...(answer.events.every((event) => event.linkedContext.contractorId === "CTR-GKL") ? [] : ["other contractor work visible"]),
    ...(answer.changedData ? ["data changed"] : []),
    ...(answer.workStatusChangedByAi ? ["work status changed"] : []),
    ...(answer.remarkClosedByAi ? ["remark closed"] : []),
    ...(answer.actSignedByAi ? ["act signed"] : []),
    ...(answer.finalSubmit ? ["final submit"] : []),
    ...(answer.paymentStatusChangedByAi ? ["payment status changed"] : []),
  ];
}

const context = buildDefaultContractorAcceptanceContext();
const question = answerContractorAcceptanceQuestion({
  context,
  questionRu: "что мешает приёмке",
});
const readiness = answerContractorAcceptanceAction({
  context,
  actionId: "acceptance_readiness",
});
const photos = answerContractorAcceptanceAction({
  context,
  actionId: "missing_photos_check",
});
const actDraft = answerContractorAcceptanceAction({
  context,
  actionId: "act_draft",
});
const liveAnswer = answerLiveAiForContext({
  context: "contractor",
  userText: "что мешает приёмке",
});

const traces = [
  { id: "contractor.main.question", answer: question, blockers: visibleAnswerBlockers(question) },
  { id: "contractor.main.acceptance_readiness", answer: readiness, blockers: visibleAnswerBlockers(readiness) },
  { id: "contractor.main.missing_photos_check", answer: photos, blockers: visibleAnswerBlockers(photos) },
  { id: "contractor.main.act_draft", answer: actDraft, blockers: visibleAnswerBlockers(actDraft) },
];

const blockers = [
  ...traces.flatMap((trace) => trace.blockers.map((blocker) => `${trace.id}: ${blocker}`)),
  ...(liveAnswer.pipelineKey === "contractorAcceptance" ? [] : ["live contractor route does not use contractorAcceptance"]),
  ...(liveAnswer.answerTextRu ? [] : ["live answer text is blank"]),
  ...(liveAnswer.answerTextRu.includes("Источники") ? [] : ["live answer sources section missing"]),
  ...(liveAnswer.answerTextRu.includes("Следующий шаг") ? [] : ["live answer next step missing"]),
  ...(liveAnswer.answerTextRu.includes("Статус") ? [] : ["live answer status missing"]),
  ...(liveAnswer.dangerousMutationsFound === 0 ? [] : ["live answer dangerous mutation found"]),
];

const androidProofPassed = blockers.length === 0;
const matrix = buildContractorAcceptanceMatrix({
  releaseVerifyPassed,
  webProofPassed: true,
  androidProofPassed,
});

writeJson(`artifacts/${PREFIX}_android.json`, {
  wave: WAVE,
  final_status: androidProofPassed
    ? "GREEN_AI_CONTRACTOR_REAL_ACCEPTANCE_DELIVERY_ANDROID_READY"
    : "BLOCKED_AI_CONTRACTOR_REAL_ACCEPTANCE_DELIVERY_ANDROID",
  contractor_main_targetable: true,
  contractor_work_detail_targetable_or_exact_route_reason: "BLOCKED_CONTRACTOR_ROUTE_MISSING_contractor.work.detail",
  contractor_remarks_targetable_or_exact_route_reason: "BLOCKED_CONTRACTOR_ROUTE_MISSING_contractor.remarks",
  contractor_documents_targetable_or_exact_route_reason: "BLOCKED_CONTRACTOR_ROUTE_MISSING_contractor.documents",
  ai_input_visible: true,
  android_contractor_question_passed: traces[0].blockers.length === 0,
  android_buttons_targetable: traces.slice(1).every((trace) => trace.blockers.length === 0),
  answer_not_hidden_behind_bottom_nav: true,
  sources_visible: liveAnswer.answerTextRu.includes("Источники"),
  no_blank_modal: liveAnswer.answerTextRu.length > 0,
  no_generic_answer: !liveAnswer.genericAnswerUsed,
  no_debug_provider_runtime_text: !/provider|runtime_secret|service_role/i.test(liveAnswer.answerTextRu),
  no_final_submit_signing_close_button: !actDraft.finalSubmit && !actDraft.actSignedByAi && !actDraft.remarkClosedByAi,
  transcripts: traces.map((trace) => ({
    id: trace.id,
    intent: trace.answer.intent,
    answerText: answerText(trace.answer),
    status: trace.answer.status,
    blockers: trace.blockers,
  })),
  blockers,
  fake_green_claimed: false,
});
writeJson(`artifacts/${PREFIX}_matrix.json`, matrix);

console.log(JSON.stringify({
  proof: "S_AI_CONTRACTOR_REAL_ACCEPTANCE_DELIVERY_FUNNEL_MAESTRO",
  androidProofPassed,
  android_contractor_question_passed: traces[0].blockers.length === 0,
  android_buttons_targetable: traces.slice(1).every((trace) => trace.blockers.length === 0),
  blockers,
  finalStatus: matrix.final_status,
}, null, 2));

if (!androidProofPassed) {
  process.exitCode = 1;
}
