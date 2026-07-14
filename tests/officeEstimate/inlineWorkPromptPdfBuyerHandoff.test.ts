import { buildEstimateFromInlineWorkPrompt } from "../../src/lib/estimate/buildEstimateFromInlineWorkPrompt";
import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";
import { buildConsumerRepairProcurementHandoffFromSnapshot } from "../../src/features/procurement/consumerRepairProcurementHandoff";

describe("inline work prompt PDF and buyer handoff", () => {
  it("binds inline prompt BOQ to approved snapshot, PDF and buyer handoff", () => {
    __resetConsumerRepairRequestStoreForTests();
    const prompt = "габион стена длина 150 метров высота 30 метров толщина 1 метр";
    const result = buildEstimateFromInlineWorkPrompt({ rawInput: prompt, currency: "KGS" });
    if (!result.draft) throw new Error("inline_draft_missing");

    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "inline-prompt-pdf-buyer",
      problemText: prompt,
      repairType: result.draft.repairType,
      city: "Бишкек",
      addressText: "Бишкек, тестовый адрес",
      contactPhone: "+996700000000",
      aiDraft: result.draft,
    });
    const approved = approveConsumerRepairRequestDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      generatedAt: "2026-07-06T00:00:00.000Z",
    });
    const revision = approved.estimateRevisionState?.revisions.find(
      (candidate) => candidate.revision_id === approved.estimateRevisionState?.current_revision_id,
    );
    const pdf = buildConsumerRepairStructuredEstimatePdfViewModel({
      draft: approved.draft,
      items: approved.items,
      media: approved.media,
      generatedAt: "2026-07-06T00:00:00.000Z",
    });
    const handoff = buildConsumerRepairProcurementHandoffFromSnapshot(approved);

    expect(revision?.editable_estimate_snapshot.rows.filter((row) => !row.removed)).toHaveLength(approved.items.length);
    expect(pdf?.sections.flatMap((section) => section.rows)).toHaveLength(approved.items.length);
    expect(handoff.items.length).toBeGreaterThan(0);
    expect(handoff.items.every((item) => String(item.itemType) !== "work")).toBe(true);
  });
});
