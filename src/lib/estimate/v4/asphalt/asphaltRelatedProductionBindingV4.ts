import type { ConsumerRepairAiDraft } from "../../../consumerRequests/consumerRequestTypes";
import type { BuildEstimateFromInlineWorkPromptInput } from "../../buildEstimateFromInlineWorkPrompt";
import {
  compileAsphaltRelatedProfessionalEstimateV4,
  isExactAsphaltRelatedConsumerDraftV4 as isExactCompiledAsphaltRelatedDraftV4,
} from "./compileAsphaltRelatedProfessionalEstimateV4";

export {
  ASPHALT_RELATED_PARAMETER_METADATA_V4,
  resolveAsphaltRelatedOperationClassV4,
} from "./compileAsphaltRelatedProfessionalEstimateV4";
export type {
  AsphaltRelatedParameterMetadataV4,
  AsphaltRelatedParameterTierV4,
  AsphaltRelatedResolvedOperationClassV4,
} from "./compileAsphaltRelatedProfessionalEstimateV4";

/**
 * Product adapter only: exact selection enters the shared V4 compiler and the
 * resulting draft continues through the common revision/storage/PDF pipeline.
 */
export function buildAsphaltRelatedExactProductionDraftV4(
  input: BuildEstimateFromInlineWorkPromptInput,
): ReturnType<typeof compileAsphaltRelatedProfessionalEstimateV4> {
  return compileAsphaltRelatedProfessionalEstimateV4(input);
}

export function isExactAsphaltRelatedConsumerDraftV4(
  draft: ConsumerRepairAiDraft | null,
): boolean {
  return isExactCompiledAsphaltRelatedDraftV4(draft);
}
