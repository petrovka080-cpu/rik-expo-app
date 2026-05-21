import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair";
import { CONSUMER_REPAIR_VALID_PROBLEM } from "./consumerRepairTestHelpers";

describe("consumer repair approve creates PDF contract", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("consumer approval fixes the draft and creates PDF history entry", () => {
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "consumer-1",
      problemText: CONSUMER_REPAIR_VALID_PROBLEM,
      aiDraft: buildConsumerRepairAiDraft(CONSUMER_REPAIR_VALID_PROBLEM),
    });
    const approved = approveConsumerRepairRequestDraft({ requestDraftId: bundle.draft.id, userId: "consumer-1" });

    expect(approved.draft.status).toBe("consumer_approved");
    expect(approved.pdfs).toHaveLength(1);
    expect(approved.pdfs[0].pdfStatus).toBe("generated");
    expect(approved.pdfs[0].contentType).toBe("application/pdf");
    expect(approved.events.some((event) => event.eventType === "consumer_approved_pdf_generated")).toBe(true);
  });
});
