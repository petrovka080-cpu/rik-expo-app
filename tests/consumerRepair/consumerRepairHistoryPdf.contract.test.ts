import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  createConsumerRepairRequestDraft,
  getConsumerRepairRequestPdf,
  listConsumerRepairRequestHistory,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair";
import { CONSUMER_REPAIR_VALID_PROBLEM } from "./consumerRepairTestHelpers";

describe("consumer repair PDF history contract", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("lists own saved PDF requests after approval", () => {
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "consumer-1",
      problemText: CONSUMER_REPAIR_VALID_PROBLEM,
      aiDraft: buildConsumerRepairAiDraft(CONSUMER_REPAIR_VALID_PROBLEM),
    });
    const approved = approveConsumerRepairRequestDraft({ requestDraftId: bundle.draft.id, userId: "consumer-1" });
    const history = listConsumerRepairRequestHistory("consumer-1");
    const pdf = getConsumerRepairRequestPdf({ requestDraftId: approved.draft.id });

    expect(history.map((item) => item.draft.id)).toContain(approved.draft.id);
    expect(pdf.titleRu).toContain("ламин");
    expect(pdf.signedUrl).toContain("application/pdf");
  });
});
