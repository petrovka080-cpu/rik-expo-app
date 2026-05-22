import { buildGlobalEstimateFixture } from "./globalEstimateTestHarness";
import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  buildConsumerRepairPdfSummary,
  createConsumerRepairDraftFromGlobalEstimate,
  getConsumerRepairRequestPdf,
} from "../../src/lib/consumerRequests";

describe("global estimate PDF integration contract", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("generates an owner-openable PDF with estimate rows, prices and tax status", async () => {
    const { result } = await buildGlobalEstimateFixture({ text: "Need laminate installation for 1000 sq ft in Dallas TX 75201", language: "en" });
    let bundle = createConsumerRepairDraftFromGlobalEstimate({
      consumerUserId: "consumer_pdf_owner",
      estimate: result,
      originalText: "Need laminate installation for 1000 sq ft in Dallas TX 75201 with enough detail.",
      city: "Dallas",
    });
    bundle = attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "photo" });
    bundle = approveConsumerRepairRequestDraft({ requestDraftId: bundle.draft.id, userId: bundle.draft.consumerUserId });

    const opened = getConsumerRepairRequestPdf({ requestDraftId: bundle.draft.id });
    const summary = buildConsumerRepairPdfSummary({ draft: bundle.draft, items: bundle.items, media: bundle.media });
    expect(opened.signedUrl.length).toBeGreaterThan(0);
    expect(opened.signedUrl).not.toContain(bundle.pdfs[0].storageKey);
    expect(summary).toContain("Estimate summary:");
    expect(summary).toContain("Estimate total from rows:");
    expect(summary).toContain("Tax status:");
  });
});
