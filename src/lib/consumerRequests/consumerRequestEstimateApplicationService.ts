import {
  buildGlobalEstimateFromEstimatorKernel,
} from "../ai/globalEstimate/globalEstimateCalculator";
import type { GlobalEstimateResult } from "../ai/globalEstimate/globalEstimateTypes";
import { buildConsumerRepairAiDraftFromGlobalEstimate } from "./consumerRequestGlobalEstimateIntegration";
import { createConsumerRepairRequestDraft } from "./consumerRequestService";
import type {
  ConsumerRepairDraftBundle,
  ConsumerRepairSelectedWork,
} from "./consumerRequestTypes";

export function buildConsumerRepairEstimateFromEstimatorKernel(
  ...input: Parameters<typeof buildGlobalEstimateFromEstimatorKernel>
): ReturnType<typeof buildGlobalEstimateFromEstimatorKernel> {
  return buildGlobalEstimateFromEstimatorKernel(...input);
}

export function createConsumerRepairDraftFromGlobalEstimate(input: {
  consumerUserId: string;
  estimate: GlobalEstimateResult;
  originalText: string;
  city?: string | null;
  addressText?: string | null;
  contactPhone?: string | null;
  selectedWork?: ConsumerRepairSelectedWork | null;
}): ConsumerRepairDraftBundle {
  const aiDraft = buildConsumerRepairAiDraftFromGlobalEstimate(
    input.estimate,
    undefined,
    input.selectedWork ?? undefined,
  );
  return createConsumerRepairRequestDraft({
    consumerUserId: input.consumerUserId,
    problemText: input.originalText,
    repairType: input.estimate.work.category,
    city: input.city ?? input.estimate.locale.city ?? null,
    addressText: input.addressText ?? null,
    contactPhone: input.contactPhone ?? null,
    selectedWork: input.selectedWork ?? null,
    aiDraft,
  });
}
