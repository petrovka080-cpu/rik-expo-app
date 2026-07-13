import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  selectedWorkFromBundle,
  syncConsumerRepairDraftFromScreenState,
} from "../../src/features/consumerRepair/requestEstimateScreenActions";
import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";

describe("professional BOQ runtime dynamic selected work sync", () => {
  it("preserves runtime selectedWorkKey through screen sync and approval PDF generation", () => {
    __resetConsumerRepairRequestStoreForTests();
    const prompt = "алмазное бурение отверстий в бетоне 20 шт диаметр 110 мм глубина 200 мм";
    const aiDraft = buildConsumerRepairAiDraft(prompt, { city: "Bishkek", currency: "KGS" });
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "professional-boq-runtime-selected-work-sync",
      problemText: prompt,
      repairType: aiDraft.repairType,
      city: "Bishkek",
      addressText: "runtime selected work sync address",
      preferredTimeText: "today",
      contactPhone: "0700000000",
      aiDraft,
    });
    const selectedWork = selectedWorkFromBundle(bundle);

    expect(selectedWork?.selectedWorkKey).toBe("diamond_core_drilling_concrete");

    const synced = syncConsumerRepairDraftFromScreenState(bundle, {
      problemText: "",
      repairType: bundle.draft.repairType,
      city: "Bishkek",
      addressText: "runtime selected work sync address",
      preferredTimeText: "today",
      contactPhone: "0700000000",
      selectedWork,
    });
    const approved = approveConsumerRepairRequestDraft({
      requestDraftId: synced.draft.id,
      userId: synced.draft.consumerUserId,
      generatedAt: "2026-07-05T00:00:00.000Z",
    });

    expect(synced.draft.selectedWorkKey).toBe("diamond_core_drilling_concrete");
    expect(approved.pdfs[0]?.pdfStatus).toBe("generated");
    expect(approved.estimateRevisionState?.current_revision_id).toBeTruthy();
  });
});
