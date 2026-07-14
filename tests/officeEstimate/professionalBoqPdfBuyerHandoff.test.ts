import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { buildConsumerRepairProcurementHandoffFromSnapshot } from "../../src/features/procurement/consumerRepairProcurementHandoff";
import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";
import {
  buildExpandedComplexBuyerHandoff,
  buildExpandedComplexPdfModel,
  buildExpandedComplexSnapshot,
  calculateExpandedComplexEstimate,
} from "../../src/lib/ai/expandedComplexWorks";

describe("professional BOQ PDF and buyer handoff", () => {
  it("builds PDF rows from the approved snapshot and sends only procurement rows to buyer handoff", () => {
    const estimate = calculateExpandedComplexEstimate({
      prompt: "строительство дороги 1 км ширина 6 м асфальт",
    });
    if (!estimate) throw new Error("estimate_missing");
    const snapshot = buildExpandedComplexSnapshot(estimate);
    const directPdf = buildExpandedComplexPdfModel(snapshot);
    const directBuyer = buildExpandedComplexBuyerHandoff(snapshot);
    const directBuyerRows = [
      ...directBuyer.procurement_materials,
      ...directBuyer.equipment_to_purchase,
      ...directBuyer.delivery_procurement_services,
    ];
    const snapshotRows = [
      ...snapshot.material_rows,
      ...snapshot.work_rows,
      ...snapshot.equipment_rows,
      ...snapshot.service_rows,
    ];
    const pdfGroupedRows = Object.values(directPdf.grouped_quantities).flat();

    expect(directPdf.rows_equal_snapshot).toBe(true);
    expect(pdfGroupedRows).toHaveLength(snapshotRows.length);
    expect(pdfGroupedRows.length).toBeGreaterThanOrEqual(45);
    expect(directBuyerRows.every((row) => row.lineType !== "work")).toBe(true);

    __resetConsumerRepairRequestStoreForTests();
    const prompt = "строительство дороги 1 км ширина 6 м асфальт";
    const aiDraft = buildConsumerRepairAiDraft(prompt, { currency: "KGS", city: "Бишкек" });
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "professional-boq-office-pdf",
      problemText: prompt,
      repairType: aiDraft.repairType,
      city: "Бишкек",
      addressText: "Бишкек, тестовый адрес",
      contactPhone: "+996700000000",
      aiDraft,
    });
    const approved = approveConsumerRepairRequestDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      generatedAt: "2026-07-05T00:00:00.000Z",
    });
    const revision = approved.estimateRevisionState?.revisions.find(
      (candidate) => candidate.revision_id === approved.estimateRevisionState?.current_revision_id,
    );
    const pdf = buildConsumerRepairStructuredEstimatePdfViewModel({
      draft: approved.draft,
      items: approved.items,
      media: approved.media,
      generatedAt: "2026-07-05T00:00:00.000Z",
    });
    if (!pdf) throw new Error("pdf_missing");
    const handoff = buildConsumerRepairProcurementHandoffFromSnapshot(approved);
    const approvedSnapshotRows = revision?.editable_estimate_snapshot.rows.filter((row) => !row.removed) ?? [];
    const pdfRows = pdf.sections.flatMap((section) => section.rows);
    const publicPdfText = pdfRows.flatMap((row) => [
      row.sectionTitle,
      row.name,
      row.quantity,
      row.unitPrice,
      row.total,
      ...row.sourceLabels,
    ]).join("\n");

    expect(approvedSnapshotRows).toHaveLength(approved.items.length);
    expect(approvedSnapshotRows.length).toBeGreaterThanOrEqual(45);
    expect(pdfRows).toHaveLength(approvedSnapshotRows.length);
    expect(approved.pdfs[0]?.revisionRowsHash).toBe(revision?.rows_hash);
    expect(handoff.fakeGreenClaimed).toBe(false);
    expect(handoff.items.length).toBeGreaterThan(0);
    expect(handoff.items.every((item) => String(item.itemType) !== "work")).toBe(true);
    expect(handoff.items.every((item) => item.requestItemId)).toBe(true);
    expect(publicPdfText).not.toMatch(/PRICE_MISSING|source_parameters|template_id|template_version|formula_id|raw_ai_json/i);
  });
});
