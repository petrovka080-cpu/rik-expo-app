import { createBuyerHandoffFromDraftRevision } from "../../src/features/procurement/createBuyerHandoffFromDraftRevision";
import { validateBuyerHandoffMaterialQuantities } from "../../src/features/procurement/validateBuyerHandoffMaterialQuantities";
import { renderPdfFromDraftRevision } from "../../src/features/pdf/renderPdfFromDraftRevision";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { countProfessionalMaterialQuantityTraceRows } from "../../src/lib/estimate/professionalMaterialQuantityTrace";

describe("material quantity PDF and buyer handoff", () => {
  it("renders material quantity trace in PDF and sends procurement rounded quantities to buyer", () => {
    const revision = createEstimateDraftRevision({
      rawInput: "строительство дороги 1 км ширина 6 м асфальт два слоя щебеночное основание",
      city: "Bishkek",
      currency: "KGS",
      countryCode: "KG",
      createdAt: "2026-07-08T00:00:00.000Z",
    });
    const pdf = renderPdfFromDraftRevision({ revision });
    const buyer = createBuyerHandoffFromDraftRevision({ revision: pdf.revision, snapshot: pdf.snapshot });
    const validation = validateBuyerHandoffMaterialQuantities({
      templateId: revision.selectedTemplateId,
      family: revision.matchedFamily,
      boqRows: revision.boq.rows,
      buyerHandoffItems: buyer.buyerHandoff.items,
    });

    expect(pdf.pdf.body).toContain("professional_material_quantity_trace=true");
    expect(pdf.pdf.body).toContain("professional_material_waste_packaging=true");
    expect(countProfessionalMaterialQuantityTraceRows(pdf.pdf.body)).toBe(buyer.buyerHandoff.items.length);
    expect(validation.passed).toBe(true);
    expect(buyer.buyerHandoff.items.every((item) => item.procurementQuantity != null && item.procurementUnit)).toBe(true);
    expect(/PRICE_MISSING|source_parameters|raw_ai_json|formula_id|template_id|normFactor/i.test(pdf.pdf.body)).toBe(false);
  });
});
