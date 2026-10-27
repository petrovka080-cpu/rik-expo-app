import type {
  AiEstimateNormativeCompletenessItem,
  AiEstimateNormativeParameterCompletenessModel,
} from "./buildNormativeParameterCompletenessModel";

export type AiEstimateMissingInputPriority = "P0" | "P1" | "P2";

export type RankedAiEstimateMissingInput = {
  key: string;
  labelRu: string;
  unitRu: string;
  priority: AiEstimateMissingInputPriority;
  rank: number;
  questionRu: string;
  reasonRu: string;
  affectsRowIds: string[];
  affectsRowTitlesRu: string[];
};

function priorityFor(item: AiEstimateNormativeCompletenessItem): AiEstimateMissingInputPriority {
  if (item.requirement.role === "required_for_quantity") return "P0";
  if (item.requirement.role === "required_for_professional_accuracy") return "P1";
  return "P2";
}

function priorityWeight(priority: AiEstimateMissingInputPriority): number {
  if (priority === "P0") return 0;
  if (priority === "P1") return 1;
  return 2;
}

export function rankAiEstimateMissingInputs(input: {
  model: AiEstimateNormativeParameterCompletenessModel | null;
  maxQuestions?: number;
}): RankedAiEstimateMissingInput[] {
  const model = input.model;
  if (!model) return [];
  const maxQuestions = Math.max(1, Math.min(5, input.maxQuestions ?? model.visibleMissingQuestionLimit));
  return model.missingRequirements
    .map((item) => {
      const priority = priorityFor(item);
      return {
        key: item.requirement.key,
        labelRu: item.requirement.labelRu,
        unitRu: item.requirement.unitRu,
        priority,
        rank: 0,
        questionRu: item.requirement.userQuestionRu,
        reasonRu: item.requirement.missingReasonRu,
        affectsRowIds: item.requirement.affectsRowIds,
        affectsRowTitlesRu: item.requirement.affectsRowTitlesRu,
      };
    })
    .sort((a, b) =>
      priorityWeight(a.priority) - priorityWeight(b.priority) ||
      (model.passport.requirements.find((item) => item.key === a.key)?.priority ?? 99) -
        (model.passport.requirements.find((item) => item.key === b.key)?.priority ?? 99) ||
      a.labelRu.localeCompare(b.labelRu, "ru"),
    )
    .slice(0, maxQuestions)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}
