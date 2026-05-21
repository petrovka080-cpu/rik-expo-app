import type { MediaAiAnalysis } from "./mediaAiAnalysisTypes";

export type MediaAiSuggestionAnswer = {
  shortRu: string;
  foundRu: string[];
  nextStepRu: string;
  statusRu: string;
};

export function composeMediaAiSuggestion(analysis: MediaAiAnalysis): MediaAiSuggestionAnswer {
  return {
    shortRu: "AI подготовил подсказку по медиа, но это не финальный факт.",
    foundRu: [
      `Тип анализа: ${analysis.analysisKind}`,
      ...analysis.detectedObjects.map((object) => `Похоже на: ${object.labelRu}`),
    ],
    nextStepRu: "Проверить подсказку и подтвердить связь вручную.",
    statusRu: "Данные не изменены. Требуется проверка человека.",
  };
}
