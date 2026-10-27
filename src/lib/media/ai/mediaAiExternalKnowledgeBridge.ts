import type { MediaAiAnalysis } from "./mediaAiAnalysisTypes";

export type MediaAiExternalKnowledgeBridgeResult = {
  usedExternalKnowledge: boolean;
  sourceRoleRu: string;
  canBeProjectFact: false;
  statusRu: "Справка. Не проектный факт." | "Внешняя справка не нужна.";
};

export function bridgeMediaAnalysisToExternalKnowledge(
  analysis: Pick<MediaAiAnalysis, "analysisKind">,
): MediaAiExternalKnowledgeBridgeResult {
  const needsReference =
    analysis.analysisKind === "construction_evidence" || analysis.analysisKind === "marketplace_product";
  return {
    usedExternalKnowledge: needsReference,
    sourceRoleRu: needsReference ? "Внешние знания используются только как справка." : "Достаточно данных приложения.",
    canBeProjectFact: false,
    statusRu: needsReference ? "Справка. Не проектный факт." : "Внешняя справка не нужна.",
  };
}
