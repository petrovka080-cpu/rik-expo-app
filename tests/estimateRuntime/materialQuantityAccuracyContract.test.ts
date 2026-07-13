import { createBuyerHandoffFromDraftRevision } from "../../src/features/procurement/createBuyerHandoffFromDraftRevision";
import { validateBuyerHandoffMaterialQuantities } from "../../src/features/procurement/validateBuyerHandoffMaterialQuantities";
import { renderPdfFromDraftRevision } from "../../src/features/pdf/renderPdfFromDraftRevision";
import { countProfessionalMaterialQuantityTraceRows } from "../../src/lib/estimate/professionalMaterialQuantityTrace";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { validateProfessionalMaterialQuantityAccuracy } from "../../src/lib/estimate/validateProfessionalMaterialQuantityAccuracy";
import { validateProfessionalMaterialQuantityNorms } from "../../src/lib/estimate/validateProfessionalMaterialQuantityNorms";

describe("professional material quantity accuracy contract", () => {
  it("binds material net/gross/procurement quantities to revision, PDF, and buyer handoff", () => {
    const revision = createEstimateDraftRevision({
      rawInput: "водоснабжение села 5 км труба ПНД 110 водонапорная башня 25 м3",
      city: "Bishkek",
      currency: "KGS",
      countryCode: "KG",
      createdAt: "2026-07-08T00:00:00.000Z",
    });
    const pdf = renderPdfFromDraftRevision({ revision });
    const buyer = createBuyerHandoffFromDraftRevision({ revision: pdf.revision, snapshot: pdf.snapshot });
    const validation = validateProfessionalMaterialQuantityAccuracy({
      templateId: revision.selectedTemplateId,
      family: revision.matchedFamily,
      rows: revision.boq.rows,
      buyerHandoffItems: buyer.buyerHandoff.items,
    });
    const buyerValidation = validateBuyerHandoffMaterialQuantities({
      templateId: revision.selectedTemplateId,
      family: revision.matchedFamily,
      boqRows: revision.boq.rows,
      buyerHandoffItems: buyer.buyerHandoff.items,
    });

    expect(validateProfessionalMaterialQuantityNorms().passed).toBe(true);
    expect(validation.passed).toBe(true);
    expect(validation.procurementRowsCount).toBeGreaterThan(0);
    expect(validation.materialQuantityLinesCount).toBe(validation.procurementRowsCount);
    expect(validation.formulaBackedLinesCount).toBe(validation.procurementRowsCount);
    expect(validation.sourceBackedLinesCount).toBe(validation.procurementRowsCount);
    expect(validation.roundingBackedLinesCount).toBe(validation.procurementRowsCount);
    expect(validation.dynamicParamBackedLinesCount).toBe(validation.procurementRowsCount);
    expect(countProfessionalMaterialQuantityTraceRows(pdf.pdf.body)).toBe(validation.procurementRowsCount);
    expect(buyerValidation.passed).toBe(true);
    expect(buyer.buyerHandoff.items.every((item) =>
      item.procurementQuantity != null &&
      item.grossQuantity != null &&
      item.procurementQuantity >= item.grossQuantity
    )).toBe(true);
  });
});
