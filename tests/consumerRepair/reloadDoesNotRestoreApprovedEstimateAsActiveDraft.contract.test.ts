import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
  listConsumerRepairRequestHistory,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { buildInitialConsumerRepairRequestState } from "../../src/features/consumerRepair/requestEstimateScreenActions";
import {
  CONSUMER_REPAIR_TEST_USER_ID,
  createApprovedConsumerRepairRequest,
} from "./consumerRepairTestHelpers";

describe("reload does not restore approved estimate as active draft", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("leaves active workspace empty when history contains only an approved laminate estimate", () => {
    const laminate = createApprovedConsumerRepairRequest();
    const state = buildInitialConsumerRepairRequestState({
      history: listConsumerRepairRequestHistory(CONSUMER_REPAIR_TEST_USER_ID),
    });

    expect(state.bundle).toBeNull();
    expect(state.selectedHistoryId).toBeNull();
    expect(state.history.map((bundle) => bundle.draft.id)).toContain(laminate.draft.id);
  });

  it("still restores the latest non-approved draft workspace", () => {
    createApprovedConsumerRepairRequest();
    const draft = createConsumerRepairRequestDraft({
      consumerUserId: CONSUMER_REPAIR_TEST_USER_ID,
      problemText: "новая смета на фундамент",
      repairType: "foundation",
      aiDraft: buildConsumerRepairAiDraft("новая смета на фундамент"),
    });
    const state = buildInitialConsumerRepairRequestState({
      history: listConsumerRepairRequestHistory(CONSUMER_REPAIR_TEST_USER_ID),
    });

    expect(state.bundle?.draft.id).toBe(draft.draft.id);
    expect(state.bundle?.draft.status).toBe("draft");
  });

  it("recovers an active deep-link draft instead of duplicating it on auto-prepare remount", () => {
    const prompt = "apartment capital renovation 101 sqm";
    const draft = createConsumerRepairRequestDraft({
      consumerUserId: CONSUMER_REPAIR_TEST_USER_ID,
      problemText: prompt,
      repairType: "repair",
      aiDraft: buildConsumerRepairAiDraft(prompt),
    });

    const state = buildInitialConsumerRepairRequestState({
      initialProblemText: `  ${prompt}  `,
      history: listConsumerRepairRequestHistory(CONSUMER_REPAIR_TEST_USER_ID),
    });

    expect(state.bundle?.draft.id).toBe(draft.draft.id);
    expect(state.problemText).toBe("");
    expect(state.history.map((bundle) => bundle.draft.id)).toEqual([draft.draft.id]);
  });
});
