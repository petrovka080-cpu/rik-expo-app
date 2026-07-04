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

describe("expanded complex PDF and buyer handoff", () => {
  it("builds grouped PDF model from snapshot and procurement-only buyer handoff", () => {
    const estimate = calculateExpandedComplexEstimate({ prompt: "ТЭЦ 100 МВт турбинный зал котельное отделение" });
    if (!estimate) throw new Error("Expanded complex estimate was not created.");
    const snapshot = buildExpandedComplexSnapshot(estimate);
    const pdf = buildExpandedComplexPdfModel(snapshot);
    const buyer = buildExpandedComplexBuyerHandoff(snapshot);
    const buyerRows = [
      ...buyer.procurement_materials,
      ...buyer.equipment_to_purchase,
      ...buyer.delivery_procurement_services,
    ];

    expect(pdf.estimate_level).toBe("PRELIMINARY_BOQ");
    expect(pdf.rows_equal_snapshot).toBe(true);
    expect(pdf.missing_design_inputs.length).toBeGreaterThan(0);
    expect(pdf.grouped_quantities.material.length).toBeGreaterThan(0);
    expect(pdf.grouped_quantities.equipment.length).toBeGreaterThan(0);
    expect(buyer.forbidden_rows_present).toBe(false);
    expect(buyerRows.length).toBeGreaterThan(0);
    expect(buyerRows.every((row) => row.lineType !== "work")).toBe(true);
  });

  it("keeps consumer PDF rows aligned with approved snapshot and excludes work rows from procurement handoff", () => {
    __resetConsumerRepairRequestStoreForTests();
    const prompt = "мост 30 м 2 полосы свайное основание";
    const aiDraft = buildConsumerRepairAiDraft(prompt, { currency: "KGS", city: "Бишкек" });
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "expanded-complex-office-pdf",
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
      generatedAt: "2026-07-04T00:00:00.000Z",
    });
    const revision = approved.estimateRevisionState?.revisions.find(
      (candidate) => candidate.revision_id === approved.estimateRevisionState?.current_revision_id,
    ) ?? null;
    const pdf = buildConsumerRepairStructuredEstimatePdfViewModel({
      draft: approved.draft,
      items: approved.items,
      media: approved.media,
      generatedAt: "2026-07-04T00:00:00.000Z",
    });
    if (!pdf) throw new Error("PDF view model missing.");
    const handoff = buildConsumerRepairProcurementHandoffFromSnapshot(approved);
    const snapshotRows = revision?.editable_estimate_snapshot.rows.filter((row) => !row.removed) ?? [];
    const pdfRows = pdf.sections.flatMap((section) => section.rows);
    const publicText = pdfRows.flatMap((row) => [
      row.sectionTitle,
      row.name,
      row.quantity,
      row.unitPrice,
      row.total,
      ...row.sourceLabels,
    ]).join("\n");

    expect(snapshotRows.length).toBe(approved.items.length);
    expect(pdfRows.length).toBeGreaterThan(0);
    expect(approved.pdfs[0]?.revisionRowsHash).toBe(revision?.rows_hash);
    expect(handoff.items.length).toBeGreaterThan(0);
    expect(handoff.items.every((item) => String(item.itemType) !== "work")).toBe(true);
    expect(handoff.items.every((item) => item.requestItemId)).toBe(true);
    expect(publicText).toContain("Не рассчитан");
    expect(publicText).not.toMatch(/PRICE_MISSING|source_parameters|template_id|formula_id|raw_ai_json/i);
  });
});
