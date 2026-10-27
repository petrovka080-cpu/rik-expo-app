import type { EstimateDraftRevision } from "./estimateDraftRevisionContract";
import {
  buildNormativeParameterCompletenessModel,
  type AiEstimateNormativeParameterCompletenessModel,
} from "./buildNormativeParameterCompletenessModel";
import {
  rankAiEstimateMissingInputs,
  type RankedAiEstimateMissingInput,
} from "./rankAiEstimateMissingInputs";

export type AiEstimateMissingInputQuestionSet = {
  revisionId: string;
  selectedTemplateId: string;
  headingRu: string;
  promptRu: string;
  maxVisibleQuestions: 5;
  questions: RankedAiEstimateMissingInput[];
  requiredQuantityMissingCount: number;
  requiredProfessionalMissingCount: number;
};

export function buildAiEstimateMissingInputQuestions(input: {
  revision: EstimateDraftRevision | null | undefined;
  model?: AiEstimateNormativeParameterCompletenessModel | null;
  maxQuestions?: number;
}): AiEstimateMissingInputQuestionSet | null {
  const revision = input.revision;
  if (!revision) return null;
  const model = input.model ?? buildNormativeParameterCompletenessModel(revision);
  if (!model) return null;
  const questions = rankAiEstimateMissingInputs({
    model,
    maxQuestions: input.maxQuestions ?? model.visibleMissingQuestionLimit,
  });
  return {
    revisionId: revision.revisionId,
    selectedTemplateId: revision.selectedTemplateId,
    headingRu: "Недостающие параметры",
    promptRu: model.professionalPromptRu,
    maxVisibleQuestions: 5,
    questions,
    requiredQuantityMissingCount: model.requiredQuantityMissing.length,
    requiredProfessionalMissingCount: model.requiredProfessionalMissing.length,
  };
}
