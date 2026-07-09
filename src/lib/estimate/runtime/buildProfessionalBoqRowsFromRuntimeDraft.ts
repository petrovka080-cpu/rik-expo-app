import type { ConsumerRepairAiDraft } from "../../consumerRequests";
import { buildProfessionalBoqRowsFromConsumerDraft } from "../createEstimateDraftRevision";

export function buildProfessionalBoqRowsFromRuntimeDraft(draft: ConsumerRepairAiDraft | null) {
  return buildProfessionalBoqRowsFromConsumerDraft(draft);
}
