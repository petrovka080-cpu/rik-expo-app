import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
  getConsumerRepairRequestPdf,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  CONSUMER_REPAIR_TEST_USER_ID,
  createApprovedConsumerRepairRequest,
} from "./consumerRepairTestHelpers";

describe("history PDF does not use current workspace", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("opens the approved history PDF even when another draft is active", () => {
    const laminate = createApprovedConsumerRepairRequest();
    const foundation = createConsumerRepairRequestDraft({
      consumerUserId: CONSUMER_REPAIR_TEST_USER_ID,
      problemText: "армирование фундамента на 10 куб метров",
      repairType: "foundation",
      aiDraft: buildConsumerRepairAiDraft("армирование фундамента на 10 куб метров"),
    });

    const pdf = getConsumerRepairRequestPdf({ requestDraftId: laminate.draft.id });

    expect(pdf.requestId).toBe(laminate.draft.id);
    expect(pdf.requestId).not.toBe(foundation.draft.id);
    expect(laminate.items.map((item) => item.titleRu).join(" ")).toContain("Ламинат");
    expect(foundation.items.map((item) => item.titleRu).join(" ")).not.toContain("Ламинат");
  });
});
