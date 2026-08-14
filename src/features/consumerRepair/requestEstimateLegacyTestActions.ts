import type { GlobalSelectedWorkBinding } from "../../lib/ai/globalEstimate/globalWorkSmartSearch";
import type { ConsumerRepairAiDraft, ConsumerRepairDraftBundle } from "../../lib/consumerRequests/consumerRequestTypes";
import { saveConsumerRepairProjectExecutionDraft } from "../../lib/consumerRequests/consumerRequestService";
import {
  buildProjectExecutionDraftFromEstimate,
  buildProjectExecutionDraftFromRevision,
} from "../../lib/projectExecution";

export * from "./requestEstimateScreenActions";

export type ConsumerRepairProjectExecutionAction =
  | "create_project"
  | "send_to_procurement"
  | "open_material_list";

export function saveProjectExecutionDraftForRequest(input: {
  action: ConsumerRepairProjectExecutionAction;
  bundle: ConsumerRepairDraftBundle;
  userId: string;
}): { bundle: ConsumerRepairDraftBundle; statusMessage: string } {
  const payload = input.bundle.structuredEstimatePayload;
  const revisionState = input.bundle.estimateDraftRevisionState;
  const revision = revisionState?.revisions.find((item) => item.revisionId === revisionState.currentRevisionId) ?? null;
  const projectExecutionDraft = revision && revision.boq.rows.length > 0
    ? buildProjectExecutionDraftFromRevision(revision, {
        source: "request_estimate",
        countryCode: payload?.locale.countryCode ?? "KG",
        cityOrRegion: payload?.locale.city ?? payload?.locale.stateOrRegion ?? input.bundle.draft.city ?? undefined,
        generatedAt: input.bundle.draft.updatedAt ?? input.bundle.draft.createdAt,
        sourceRequestId: input.bundle.draft.id,
      })
    : payload ? buildProjectExecutionDraftFromEstimate(payload, {
        source: "request_estimate",
        countryCode: payload.locale.countryCode,
        cityOrRegion: payload.locale.city ?? payload.locale.stateOrRegion,
        generatedAt: input.bundle.draft.updatedAt ?? input.bundle.draft.createdAt,
        sourceRequestId: input.bundle.draft.id,
      }) : null;
  if (!projectExecutionDraft) return { bundle: input.bundle, statusMessage: "Сначала заполните критические параметры и получите измеримые позиции сметы." };
  const bundle = saveConsumerRepairProjectExecutionDraft({
    requestDraftId: input.bundle.draft.id,
    userId: input.userId,
    projectExecutionDraft,
  });
  const statusMessage = input.action === "create_project"
    ? "Проект создан из сметы."
    : input.action === "send_to_procurement" ? "Список закупки подготовлен." : "Список материалов открыт.";
  return { bundle, statusMessage };
}

/**
 * Compile-time compatibility for pre-cutover test fixtures only.
 * Production entrypoints must never import this module.
 */
export function buildConsumerRepairSelectedWorkDraftBundle(_params: {
  consumerUserId: string;
  problemText: string;
  repairType: string;
  city: string;
  addressText: string;
  preferredTimeText: string;
  contactPhone: string;
  selectedWork: GlobalSelectedWorkBinding | null;
}): {
  bundle: ConsumerRepairDraftBundle;
  selectedWork: GlobalSelectedWorkBinding | null;
  aiDraft: ConsumerRepairAiDraft;
} {
  throw new Error("FRONTEND_COMPILER_RETIRED_TEST_FIXTURE");
}
