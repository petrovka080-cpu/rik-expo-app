import {
  buildAiEstimateParameterCards,
  type AiEstimateParameterCard,
} from "../buildAiEstimateParameterCards";
import type { EstimateDraftRevision } from "../estimateDraftRevisionContract";

export function buildAiEstimateParameterCardView(input: {
  revision: EstimateDraftRevision;
  includeMissing?: boolean;
}): AiEstimateParameterCard[] {
  return buildAiEstimateParameterCards(input);
}
