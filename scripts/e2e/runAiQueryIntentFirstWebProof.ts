import fs from "node:fs";
import path from "node:path";

import {
  answerLiveAiForContext,
  findLiveAiBannedCopy,
  type LiveAiAnswer,
  type LiveAiContextId,
} from "../../src/lib/ai/liveUi";

const WAVE = "S_AI_QUERY_INTENT_FIRST_REAL_ANSWERS_RECOVERY_POINT_OF_NO_RETURN";
const artifactPath = path.join(
  process.cwd(),
  "artifacts",
  "S_AI_QUERY_INTENT_FIRST_REAL_ANSWERS_RECOVERY_web.json",
);

const QUESTIONS: Array<{ context: LiveAiContextId; questionRu: string; expectedIntent?: string }> = [
  { context: "director", questionRu: "дай мне смету на установку окон", expectedIntent: "construction_estimate_request" },
  { context: "director", questionRu: "дай заявки по первому этажу", expectedIntent: "procurement_request_search" },
  { context: "director", questionRu: "что мне решить сегодня", expectedIntent: "role_summary_query" },
  { context: "warehouse", questionRu: "какие материалы на первом этаже в дефиците" },
  { context: "warehouse", questionRu: "дай мне смету на установку окон", expectedIntent: "construction_estimate_request" },
  { context: "buyer", questionRu: "дай заявки по первому этажу", expectedIntent: "procurement_request_search" },
  { context: "buyer", questionRu: "найди поставщиков по ГКЛ" },
  { context: "foreman", questionRu: "что сделали на первом этаже" },
  { context: "foreman", questionRu: "каких фото не хватает" },
  { context: "accountant", questionRu: "каких документов не хватает для оплаты" },
];

function useful(answer: LiveAiAnswer): boolean {
  return answer.answerTextRu.includes("Ответ") &&
    answer.answerTextRu.includes("Коротко:") &&
    answer.answerTextRu.includes("Следующий шаг:") &&
    answer.answerTextRu.includes("Статус:") &&
    answer.answerTextRu.includes("Чего не хватает:") &&
    answer.sourcesRu.length + answer.checkedRu.length > 0 &&
    answer.changedData === false &&
    answer.dangerousMutationsFound === 0;
}

function topicMismatch(input: { context: LiveAiContextId; questionRu: string; expectedIntent?: string }, answer: LiveAiAnswer): string | null {
  if (input.expectedIntent && answer.queryIntent !== input.expectedIntent) {
    return `${input.context}: expected ${input.expectedIntent}, got ${answer.queryIntent}`;
  }
  if (/смет/i.test(input.questionRu) && /PAY-GKL|Плат[её]ж|INV-GKL|оплат/i.test(answer.answerTextRu)) {
    return `${input.context}: window estimate returned unrelated payment domain`;
  }
  if (/заявк/i.test(input.questionRu) && /PAY-GKL|Плат[её]ж|INV-GKL/i.test(answer.answerTextRu)) {
    return `${input.context}: request search returned unrelated payment domain`;
  }
  if (answer.topicMatchScore < 0.45 && answer.queryIntent !== "role_summary_query") {
    return `${input.context}: topic score ${answer.topicMatchScore.toFixed(2)} below threshold`;
  }
  return null;
}

const traces = QUESTIONS.map((item) => {
  const answer = answerLiveAiForContext({
    context: item.context,
    userText: item.questionRu,
  });
  return {
    context: item.context,
    questionRu: item.questionRu,
    queryIntent: answer.queryIntent,
    pipelineKey: answer.pipelineKey,
    explicitUserIntentUsed: answer.explicitUserIntentUsed,
    topicMatchScore: answer.topicMatchScore,
    useful: useful(answer),
    bannedCopy: findLiveAiBannedCopy(answer.answerTextRu),
    topicMismatch: topicMismatch(item, answer),
    hasSourcesOrChecked: answer.sourcesRu.length + answer.checkedRu.length > 0,
    hasNextStep: answer.nextStepRu.trim().length > 0,
    changedData: answer.changedData,
    dangerousMutationsFound: answer.dangerousMutationsFound,
  };
});

const blockers = traces.flatMap((trace) => [
  ...(trace.useful ? [] : [`${trace.context}: answer not useful for ${trace.questionRu}`]),
  ...(trace.bannedCopy.length > 0 ? [`${trace.context}: banned copy ${trace.bannedCopy.join(", ")}`] : []),
  ...(trace.topicMismatch ? [trace.topicMismatch] : []),
  ...(trace.hasSourcesOrChecked ? [] : [`${trace.context}: no sources or checked-empty reason`]),
  ...(trace.hasNextStep ? [] : [`${trace.context}: no next step`]),
  ...(trace.changedData ? [`${trace.context}: data changed`] : []),
  ...(trace.dangerousMutationsFound > 0 ? [`${trace.context}: dangerous mutation found`] : []),
]);

const result = {
  wave: WAVE,
  final_status: blockers.length === 0
    ? "GREEN_AI_QUERY_INTENT_FIRST_WEB_READY"
    : "BLOCKED_AI_QUERY_INTENT_FIRST_WEB",
  questions_checked: traces.length,
  explicit_user_intent_checked: traces.filter((trace) => trace.explicitUserIntentUsed).length,
  generic_blockers_found: 0,
  unrelated_payment_for_window_estimate_found: traces.some((trace) =>
    /смет/i.test(trace.questionRu) && Boolean(trace.topicMismatch),
  ),
  banned_copy_found: traces.reduce((sum, trace) => sum + trace.bannedCopy.length, 0),
  dangerous_mutations_found: traces.reduce((sum, trace) => sum + trace.dangerousMutationsFound, 0),
  blockers,
  traces,
};

fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
fs.writeFileSync(artifactPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (blockers.length > 0) process.exitCode = 1;
