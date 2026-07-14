import type { GlobalSelectedWorkBinding } from "../../lib/ai/globalEstimate";
import type { ConsumerRepairAiDraft } from "../../lib/consumerRequests";
import { buildConsumerRepairDraftFromAiEstimateRuntime } from "../../lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime";

export function buildWorkEstimatePromptPreviewDraft(input: {
  value: string;
  selectedWork?: GlobalSelectedWorkBinding | null;
  draft?: ConsumerRepairAiDraft | null;
}): ConsumerRepairAiDraft | null {
  if (input.draft || !input.value.trim()) return input.draft ?? null;
  return buildConsumerRepairDraftFromAiEstimateRuntime({
    rawInput: input.value,
    selectedTemplateId: input.selectedWork?.selectedWorkKey,
    selectedWorkKey: input.selectedWork?.selectedWorkKey,
    selectedTemplateName: input.selectedWork?.selectedTitleRu,
    currency: "KGS",
    countryCode: "KG",
  });
}
