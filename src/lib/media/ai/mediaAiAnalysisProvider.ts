import type { MediaAsset } from "../mediaTypes";
import { planMediaAiAnalysis } from "./mediaAiAnalysisPlanner";
import { sampleMediaVideoFrames } from "./mediaAiFrameSampler";
import type { MediaAiAnalysis } from "./mediaAiAnalysisTypes";

export function createDeterministicMediaAiAnalysis(input: {
  asset: MediaAsset;
  analyzedAt: string;
}): MediaAiAnalysis {
  const plan = planMediaAiAnalysis(input.asset);
  const product = plan.analysisKind === "marketplace_product";
  const warehouse = plan.analysisKind === "warehouse_event";
  const document = plan.analysisKind === "document_scan";
  const construction = plan.analysisKind === "construction_evidence";

  return {
    id: `analysis-${input.asset.id}`,
    mediaAssetId: input.asset.id,
    analysisKind: plan.analysisKind,
    analyzedAt: input.analyzedAt,
    confidence: "medium",
    detectedObjects: product
      ? [{ labelRu: "строительный материал", category: "construction_material", confidence: 0.72 }]
      : document
        ? [{ labelRu: "документ", category: "document", confidence: 0.78 }]
        : [{ labelRu: "рабочая зона", category: "work_area", confidence: 0.69 }],
    suggestedLinks: input.asset.workId
      ? [
          {
            targetType: "work",
            targetId: input.asset.workId,
            labelRu: "Связать с работой",
            reasonRu: "Медиа загружено в контексте работы.",
            confidence: 0.72,
            finalLinkAllowed: false,
            requiresHumanConfirm: true,
          },
        ]
      : [],
    videoAnalysis:
      input.asset.mediaKind === "video"
        ? {
            sampledFrames: sampleMediaVideoFrames({ durationMs: input.asset.durationMs ?? 0 }),
            motionSummaryRu: "Видео проанализировано как черновая подсказка.",
            durationMs: input.asset.durationMs ?? 0,
            frameCountAnalyzed: sampleMediaVideoFrames({ durationMs: input.asset.durationMs ?? 0 }).length,
          }
        : undefined,
    productSuggestion: product
      ? {
          titleRu: "Черновик товара по фото",
          category: "Строительные материалы",
          subcategory: "Требует уточнения",
          unit: "шт",
          missingData: ["price", "availability", "supplier", "brand", "model", "size", "certificate", "stock"],
          mustReview: true,
        }
      : undefined,
    constructionSuggestion: construction
      ? {
          workTypeRu: "Строительная работа",
          evidenceType: input.asset.purpose === "before_photo" ? "before" : input.asset.purpose === "after_photo" ? "after" : "progress",
          possibleIssuesRu: [],
          missingData: ["подтверждение прораба", "связь с работой"],
          mustReview: true,
        }
      : undefined,
    warehouseSuggestion: warehouse
      ? {
          eventType: input.asset.purpose === "warehouse_discrepancy" ? "discrepancy" : input.asset.purpose === "warehouse_issue" ? "issue" : "incoming",
          materialGuessRu: "материал на фото",
          quantityGuess: "требует пересчёта человеком",
          quantityIsFact: false,
          missingData: ["накладная", "количество по документу"],
          mustReview: true,
        }
      : undefined,
    documentSuggestion: document
      ? {
          documentType: "unknown",
          mustReview: true,
        }
      : undefined,
    safetyFlags: input.asset.safety.containsPeople ? ["possible_face_present"] : [],
    finalFact: false,
  };
}
