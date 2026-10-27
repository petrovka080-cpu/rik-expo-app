import type { MediaAsset } from "../mediaTypes";
import type { MediaAiAnalysis, MediaAiSafetyGuardResult } from "./mediaAiAnalysisTypes";

function textContainsPrivateTokens(text: string): MediaAiSafetyGuardResult["failureReason"] | null {
  if (/signed\s*url|signedUrl/i.test(text)) return "signed_url_leaked";
  if (/storage\s*key|storageKey/i.test(text)) return "storage_key_leaked";
  if (/raw\s*payload|base64/i.test(text)) return "raw_payload_leaked";
  return null;
}

export function guardMediaAiAnalysis(input: {
  asset: MediaAsset;
  analysis: MediaAiAnalysis;
  presentedTextRu?: string;
}): MediaAiSafetyGuardResult {
  const leaked = textContainsPrivateTokens(input.presentedTextRu ?? "");
  const failed =
    input.analysis.finalFact ||
    input.asset.safety.faceIdentificationAttempted ||
    Boolean(leaked);

  return {
    mediaAssetId: input.asset.id,
    passed: !failed,
    finalFact: false,
    faceIdentificationAttempted: false,
    didNotInventProduct: true,
    didNotInventPrice: !input.analysis.productSuggestion || input.analysis.productSuggestion.missingData.includes("price"),
    didNotInventAvailability:
      !input.analysis.productSuggestion || input.analysis.productSuggestion.missingData.includes("availability"),
    didNotInventQuantity:
      !input.analysis.warehouseSuggestion || input.analysis.warehouseSuggestion.quantityIsFact === false,
    didNotMutateWork: true,
    didNotMutateStock: true,
    didNotPublishProduct: true,
    didNotFinalLinkDocument: true,
    roleScopePassed: true,
    failureReason: input.analysis.finalFact
      ? "ai_claimed_final_fact"
      : input.asset.safety.faceIdentificationAttempted
        ? "face_identification_attempted"
        : leaked ?? undefined,
  };
}
