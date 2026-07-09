import { buildAiEstimateMissingInputQuestions } from "../buildAiEstimateMissingInputQuestions";
import {
  buildAiEstimateParameterCards,
  findAiEstimateParameterCard,
  type AiEstimateParameterCard,
} from "../buildAiEstimateParameterCards";
import { buildAiEstimateQuantityExplanationTrace } from "../buildAiEstimateQuantityExplanationTrace";
import { buildNormativeParameterCompletenessModel } from "../buildNormativeParameterCompletenessModel";
import type { EstimateDraftRevision } from "../estimateDraftRevisionContract";

export function buildAiEstimateRuntimeViewModel(input: {
  revision: EstimateDraftRevision | null;
  includeMissing?: boolean;
  maxTraceRows?: number;
}) {
  const revision = input.revision;
  if (!revision) {
    return {
      cards: [] as AiEstimateParameterCard[],
      completeness: null,
      questions: null,
      quantityTrace: null,
    };
  }
  const completeness = buildNormativeParameterCompletenessModel(revision);
  return {
    cards: buildAiEstimateParameterCards({ revision, includeMissing: input.includeMissing }),
    completeness,
    questions: buildAiEstimateMissingInputQuestions({ revision, model: completeness }),
    quantityTrace: buildAiEstimateQuantityExplanationTrace({ revision, maxRows: input.maxTraceRows }),
  };
}

export function findAiEstimateRuntimeParameterCard(
  revision: EstimateDraftRevision | null,
  key: string | null | undefined,
): AiEstimateParameterCard | null {
  return findAiEstimateParameterCard(revision, key);
}
