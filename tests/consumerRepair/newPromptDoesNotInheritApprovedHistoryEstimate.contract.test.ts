import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
  listConsumerRepairRequestHistory,
} from "../../src/lib/consumerRequests";
import { saveConsumerRepairBundle } from "../../src/lib/consumerRequests/consumerRequestRepository";
import {
  buildApprovedConsumerRepairWorkspaceClearedState,
} from "../../src/features/consumerRepair/requestEstimateScreenActions";
import { CONSUMER_REPAIR_TEST_USER_ID } from "./consumerRepairTestHelpers";

const FOUNDATION_PROMPT = "армирование фундамента на 10 куб метров";

function bundleText(value: unknown): string {
  return JSON.stringify(value).toLocaleLowerCase("ru-RU");
}

describe("new prompt does not inherit approved history estimate", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("keeps laminate in history while the next active workspace is foundation", () => {
    const laminateDraft = createConsumerRepairRequestDraft({
      consumerUserId: CONSUMER_REPAIR_TEST_USER_ID,
      problemText: "Укладка ламината 100 м²",
      repairType: "flooring",
    });
    const laminate = saveConsumerRepairBundle({
      ...laminateDraft,
      draft: {
        ...laminateDraft.draft,
        status: "consumer_approved",
        approvedAt: "2026-08-22T00:00:00.000Z",
      },
    });
    const cleared = buildApprovedConsumerRepairWorkspaceClearedState({
      history: listConsumerRepairRequestHistory(CONSUMER_REPAIR_TEST_USER_ID),
      statusMessage: "approved",
    });

    const foundation = createConsumerRepairRequestDraft({
      consumerUserId: CONSUMER_REPAIR_TEST_USER_ID,
      problemText: FOUNDATION_PROMPT,
      repairType: "repair",
      city: "",
      addressText: "",
      preferredTimeText: "",
      contactPhone: "",
      selectedWork: null,
    });

    const history = listConsumerRepairRequestHistory(CONSUMER_REPAIR_TEST_USER_ID);

    expect(cleared.bundle).toBeNull();
    expect(foundation.draft.id).not.toBe(laminate.draft.id);
    expect(foundation.draft.problemText).toBe(FOUNDATION_PROMPT);
    expect(bundleText(foundation)).toContain("фундамент");
    expect(bundleText(foundation.items)).not.toContain("ламинат");
    expect(history.map((bundle) => bundle.draft.id)).toContain(laminate.draft.id);
    expect(history.find((bundle) => bundle.draft.id === laminate.draft.id)?.draft.status).toBe("consumer_approved");
  });
});
