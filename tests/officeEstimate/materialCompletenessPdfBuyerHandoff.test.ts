import { createBuyerHandoffFromDraftRevision } from "../../src/features/procurement/createBuyerHandoffFromDraftRevision";
import { validateBuyerHandoffCompleteness } from "../../src/features/procurement/validateBuyerHandoffCompleteness";
import { countProfessionalBoqFullMaterialCompositionRows } from "../../src/features/pdf/renderProfessionalBoqFullMaterialComposition";
import { renderPdfFromDraftRevision } from "../../src/features/pdf/renderPdfFromDraftRevision";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { MATERIAL_COMPLETENESS_RUNTIME_CASES } from "../../scripts/estimate/materialCompletenessCriticalCases";

function revisionFor(prompt: string) {
  return createEstimateDraftRevision({
    rawInput: prompt,
    city: "Bishkek",
    currency: "KGS",
    countryCode: "KG",
    createdAt: "2026-07-08T00:00:00.000Z",
  });
}

describe("material completeness PDF and buyer handoff", () => {
  it("renders full BOQ composition in PDF and passes only complete procurement rows to buyer", () => {
    const cases = MATERIAL_COMPLETENESS_RUNTIME_CASES.filter((item) =>
      item.expected_family === "dynamic_fencing_estimate" ||
      item.expected_family === "village_water_supply" ||
      item.expected_family === "earth_dam"
    ).slice(0, 3);

    expect(cases).toHaveLength(3);
    for (const testCase of cases) {
      const revision = revisionFor(testCase.prompt);
      const pdf = renderPdfFromDraftRevision({ revision });
      const buyer = createBuyerHandoffFromDraftRevision({ revision: pdf.revision, snapshot: pdf.snapshot });
      const buyerValidation = validateBuyerHandoffCompleteness({
        boqRows: revision.boq.rows,
        buyerHandoffRowIds: buyer.buyerHandoff.items.map((item) => item.rowId),
      });

      expect(pdf.pdf.body).toContain("professional_boq_full_material_composition=true");
      expect(pdf.pdf.body).toContain(`professional_boq_full_rows_count=${revision.boq.rows.length}`);
      expect(countProfessionalBoqFullMaterialCompositionRows(pdf.pdf.body)).toBe(revision.boq.rows.length);
      expect(pdf.snapshot.rows).toHaveLength(revision.boq.rows.length);
      expect(buyerValidation.passed).toBe(true);
      expect(buyerValidation.forbiddenWorkRowsCount).toBe(0);
      expect(buyerValidation.missingProcurementRowIds).toEqual([]);
    }
  });
});
