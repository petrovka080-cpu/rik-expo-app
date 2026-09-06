import { buildConsumerRepairProcurementHandoffFromSnapshot } from "../../src/features/procurement/consumerRepairProcurementHandoff";
import { buildConsumerRepairDraftFromAiEstimateRuntime } from "../../src/lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime";
import {
  __resetConsumerRepairRequestStoreForTests,
  generateConsumerRepairRequestPdfForDraft,
} from "../../src/lib/consumerRequests";
import {
  applyCanonicalConsumerRepairAuditParamPatch as applyConsumerRepairDraftRevisionParamPatch,
  createCanonicalConsumerRepairAuditDraft as createConsumerRepairRequestDraft,
} from "../../scripts/estimate/canonicalConsumerRepairAuditHarness";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";

describe("revision-bound PDF buyer handoff", () => {
  it("regenerates PDF and buyer handoff from the latest recalculated revision", () => {
    __resetConsumerRepairRequestStoreForTests();
    const prompt = "capital apartment repair 98 m2 2 bathrooms ceiling height 2.7 m";
    const aiDraft = buildConsumerRepairDraftFromAiEstimateRuntime({
      estimateDraftId: "revision-bound-office",
      rawInput: prompt,
      selectedTemplateId: "capital_renovation_professional_calculator_v1",
      city: "Bishkek",
      currency: "KGS",
      createdAt: "2026-07-07T00:00:00.000Z",
    });
    if (!aiDraft) throw new Error("draft_missing");
    let bundle = createConsumerRepairRequestDraft({
      consumerUserId: "revision-bound-office",
      problemText: prompt,
      repairType: aiDraft.repairType,
      city: "Bishkek",
      addressText: "Test address",
      contactPhone: "+996700000000",
      aiDraft,
    });
    bundle = applyConsumerRepairDraftRevisionParamPatch({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      operation: "update_param",
      paramKey: "area_m2",
      rawValue: "120",
      createdAt: "2026-07-07T00:01:00.000Z",
    });
    bundle = generateConsumerRepairRequestPdfForDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      generatedAt: "2026-07-07T00:02:00.000Z",
    });
    const latestDraftRevision = bundle.estimateDraftRevisionState?.currentRevisionId;
    const pdf = bundle.pdfs[0];
    if (!pdf) throw new Error("pdf_missing");
    const pdfView = buildConsumerRepairStructuredEstimatePdfViewModel({
      draft: bundle.draft,
      items: bundle.items,
      media: bundle.media,
      generatedAt: "2026-07-07T00:02:00.000Z",
    });
    const handoff = buildConsumerRepairProcurementHandoffFromSnapshot(bundle);

    expect(latestDraftRevision).toBeTruthy();
    expect(pdf.revisionId).toBe(latestDraftRevision);
    expect(pdfView?.sections.flatMap((section) => section.rows)).toHaveLength(bundle.items.length);
    expect(bundle.items.every((item) =>
      item.sourceParameters?.estimateDraftRevisionId === latestDraftRevision
    )).toBe(true);
    expect(handoff.revisionId).toBe(latestDraftRevision);
    expect(handoff.rowsHash).toBe(pdf.revisionRowsHash);
    expect(handoff.items.every((item) => String(item.itemType) !== "work")).toBe(true);
  });
});
