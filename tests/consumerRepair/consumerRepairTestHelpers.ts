import {
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  createConsumerRepairRequestDraft,
  type ConsumerRepairDraftBundle,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair";

export const CONSUMER_REPAIR_TEST_USER_ID = "consumer-1";
export const CONSUMER_REPAIR_VALID_PROBLEM = "Хочу уложить ламинат на 100 кв м в комнате, нужен ремонт пола";
export const CONSUMER_REPAIR_VALID_PHONE = "+996 555 123 456";

export function createApprovedConsumerRepairRequest(input: {
  problemText?: string;
  contactPhone?: string | null;
  withMedia?: boolean;
  withPdf?: boolean;
  userId?: string;
} = {}): ConsumerRepairDraftBundle {
  let bundle = createConsumerRepairRequestDraft({
    consumerUserId: input.userId ?? CONSUMER_REPAIR_TEST_USER_ID,
    problemText: input.problemText ?? CONSUMER_REPAIR_VALID_PROBLEM,
    contactPhone: input.contactPhone === undefined ? CONSUMER_REPAIR_VALID_PHONE : input.contactPhone,
    repairType: "flooring",
    aiDraft: buildConsumerRepairAiDraft(input.problemText ?? CONSUMER_REPAIR_VALID_PROBLEM),
  });

  if (input.withMedia !== false) {
    bundle = attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "photo" });
  }

  if (input.withPdf !== false) {
    bundle = approveConsumerRepairRequestDraft({
      requestDraftId: bundle.draft.id,
      userId: input.userId ?? CONSUMER_REPAIR_TEST_USER_ID,
    });
  }

  return bundle;
}
