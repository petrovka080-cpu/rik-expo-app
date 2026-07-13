import {
  __resetConsumerRepairRequestStoreForTests,
  listConsumerRepairRequestHistory,
} from "../../src/lib/consumerRequests";
import {
  buildApprovedConsumerRepairWorkspaceClearedState,
  buildConsumerRepairSelectedWorkDraftBundle,
} from "../../src/features/consumerRepair/requestEstimateScreenActions";
import {
  CONSUMER_REPAIR_TEST_USER_ID,
  createApprovedConsumerRepairRequest,
} from "./consumerRepairTestHelpers";

const FOUNDATION_PROMPT = "армирование фундамента на 10 куб метров";

function bundleText(value: unknown): string {
  return JSON.stringify(value).toLocaleLowerCase("ru-RU");
}

describe("new prompt does not inherit approved history estimate", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("keeps laminate in history while the next active workspace is foundation", () => {
    const laminate = createApprovedConsumerRepairRequest();
    const cleared = buildApprovedConsumerRepairWorkspaceClearedState({
      history: listConsumerRepairRequestHistory(CONSUMER_REPAIR_TEST_USER_ID),
      statusMessage: "approved",
    });

    const foundation = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: CONSUMER_REPAIR_TEST_USER_ID,
      problemText: FOUNDATION_PROMPT,
      repairType: "repair",
      city: "",
      addressText: "",
      preferredTimeText: "",
      contactPhone: "",
      selectedWork: null,
    }).bundle;

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
