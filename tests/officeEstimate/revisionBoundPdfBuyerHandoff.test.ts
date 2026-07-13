import { buildEstimateFromInlineWorkPrompt } from "../../src/lib/estimate/buildEstimateFromInlineWorkPrompt";
import {
  __resetConsumerRepairRequestStoreForTests,
  applyConsumerRepairDraftRevisionParamPatch,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";
import { buildConsumerRepairProcurementHandoffFromSnapshot } from "../../src/features/procurement/consumerRepairProcurementHandoff";

describe("revision-bound PDF buyer handoff", () => {
  it("regenerates PDF and buyer handoff from the latest recalculated revision", () => {
    __resetConsumerRepairRequestStoreForTests();
    const prompt = "габион стена длина 150 метров высота 30 метров толщина 1 метр";
    const result = buildEstimateFromInlineWorkPrompt({ rawInput: prompt, currency: "KGS" });
    if (!result.draft) throw new Error("draft_missing");
    let bundle = createConsumerRepairRequestDraft({
      consumerUserId: "revision-bound-office",
      problemText: prompt,
      repairType: result.draft.repairType,
      city: "Бишкек",
      addressText: "Адрес",
      contactPhone: "+996700000000",
      aiDraft: result.draft,
    });
    bundle = applyConsumerRepairDraftRevisionParamPatch({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      operation: "update_param",
      paramKey: "length_m",
      rawValue: "100 м",
      createdAt: "2026-07-07T00:01:00.000Z",
    });
    bundle = generateConsumerRepairRequestPdfForDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      generatedAt: "2026-07-07T00:02:00.000Z",
    });
    const latestEstimateRevision = bundle.estimateRevisionState?.current_revision_id;
    const latestDraftRevision = bundle.estimateDraftRevisionState?.currentRevisionId;
    const pdf = bundle.pdfs[0];
    const pdfView = buildConsumerRepairStructuredEstimatePdfViewModel({
      draft: bundle.draft,
      items: bundle.items,
      media: bundle.media,
      generatedAt: "2026-07-07T00:02:00.000Z",
    });
    const handoff = buildConsumerRepairProcurementHandoffFromSnapshot(bundle);

    expect(latestDraftRevision).toBeTruthy();
    expect(pdf.revisionId).toBe(latestEstimateRevision);
    expect(pdfView?.sections.flatMap((section) => section.rows)).toHaveLength(bundle.items.length);
    expect(bundle.items.every((item) => item.sourceParameters?.estimateDraftRevisionId === latestDraftRevision)).toBe(true);
    expect(handoff.revisionId).toBe(latestEstimateRevision);
    expect(handoff.items.every((item) => String(item.itemType) !== "work")).toBe(true);
  });
});
