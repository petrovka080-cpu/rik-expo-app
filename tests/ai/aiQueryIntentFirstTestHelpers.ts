import {
  answerLiveAiForContext,
  type LiveAiAnswer,
  type LiveAiContextId,
  type LiveAiQueryIntentSources,
} from "../../src/lib/ai/liveUi";
import { expectUsefulLiveAnswer } from "./aiLiveUiTestHelpers";

export const WINDOW_ESTIMATE_QUESTION = "дай мне смету на установку окон";
export const FIRST_FLOOR_REQUESTS_QUESTION = "дай заявки по первому этажу";

export function answerIntentFirst(
  context: LiveAiContextId,
  questionRu: string,
  intentSources?: LiveAiQueryIntentSources,
): LiveAiAnswer {
  return answerLiveAiForContext({ context, userText: questionRu, intentSources });
}

export function expectWindowEstimateAnswer(answer: LiveAiAnswer): void {
  expectUsefulLiveAnswer(answer);
  expect(answer.queryIntent).toBe("construction_estimate_request");
  expect(answer.explicitUserIntentUsed).toBe(true);
  expect(answer.answerTextRu).toMatch(/смет|окн|ПВХ|монтаж/i);
  expect(answer.answerTextRu).not.toMatch(/PAY-GKL|Плат[её]ж PAY-GKL|INV-GKL|finance summary/i);
  expect(answer.answerTextRu).not.toMatch(/Нужен конкретный источник|нет выбранной|Проверен экран|generic fallback/i);
  expect(answer.topicMatchScore).toBeGreaterThanOrEqual(0.5);
  expect(answer.changedData).toBe(false);
  expect(answer.dangerousMutationsFound).toBe(0);
}

export function expectRequestSearchAnswer(answer: LiveAiAnswer): void {
  expectUsefulLiveAnswer(answer);
  expect(answer.queryIntent).toBe("procurement_request_search");
  expect(answer.explicitUserIntentUsed).toBe(true);
  expect(answer.answerTextRu).toMatch(/заявк|этаж|объект|зон/i);
  expect(answer.answerTextRu).not.toMatch(/PAY-GKL|Плат[её]ж PAY-GKL|INV-GKL/i);
  expect(answer.answerTextRu).not.toMatch(/Нужен конкретный источник|нет выбранной|Проверен экран|generic fallback/i);
  expect(answer.topicMatchScore).toBeGreaterThanOrEqual(0.5);
}

export const PROJECT_WINDOW_ESTIMATE_SOURCE: LiveAiQueryIntentSources = {
  projectEstimates: [
    {
      id: "EST-WINDOW-1",
      labelRu: "Проектная смета EST-WINDOW-1: установка окон",
      lines: [
        {
          textRu: "EST-WINDOW-1: оконный блок ПВХ 1.5 x 1.5 м — 4 шт.",
          sourceRefs: ["src:estimate:windows:line-1"],
        },
        {
          textRu: "EST-WINDOW-1: монтаж оконного блока с герметизацией — 4 комплекта.",
          sourceRefs: ["src:estimate:windows:line-2"],
        },
      ],
      sourcesRu: ["Проектная смета EST-WINDOW-1, лист 4"],
      missingDataRu: ["актуальность цен нужно подтвердить перед согласованием"],
    },
  ],
};

export const FIRST_FLOOR_REQUEST_SOURCE: LiveAiQueryIntentSources = {
  procurementRequests: [
    {
      id: "MR-101",
      objectRu: "Дом 1",
      zoneRu: "секция А",
      floorRu: "1 этаж",
      itemRu: "ГКЛ 12.5 мм",
      statusRu: "approved",
      nextStepRu: "подобрать поставщиков",
      sourceRefs: ["buyer request MR-101", "work WRK-101", "object Дом 1, 1 этаж"],
    },
  ],
};
