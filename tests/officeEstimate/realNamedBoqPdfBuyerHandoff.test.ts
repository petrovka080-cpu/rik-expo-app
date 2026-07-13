import { createBuyerHandoffFromDraftRevision } from "../../src/features/procurement/createBuyerHandoffFromDraftRevision";
import { renderPdfFromDraftRevision } from "../../src/features/pdf/renderPdfFromDraftRevision";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import {
  containsRawFormulaOrDebugProfessionalBoqName,
  isGenericProfessionalBoqLineItemName,
} from "../../src/lib/estimate/validateProfessionalBoqLineItemQuality";

describe("real named BOQ PDF and buyer handoff", () => {
  it("renders named facade rows to PDF and sends procurement-only named items to buyer", () => {
    const revision = createEstimateDraftRevision({
      rawInput: "вентфасад под ключ 1500 кв метров утеплитель минвата керамогранит",
      selectedTemplateId: "ventilated_facade_rom_concept_expanded_complex_v1",
      city: "Бишкек",
      currency: "KGS",
      countryCode: "KG",
      createdAt: "2026-07-07T00:00:00.000Z",
    });
    const pdf = renderPdfFromDraftRevision({ revision });
    const buyer = createBuyerHandoffFromDraftRevision({ revision: pdf.revision, snapshot: pdf.snapshot });
    const rowsById = new Map(pdf.snapshot.rows.map((row) => [row.rowId, row]));

    expect(pdf.pdf.rowsEqualLatestRevision).toBe(true);
    expect(pdf.snapshot.rows).toHaveLength(revision.boq.rows.length);
    expect(pdf.pdf.body).toContain("Кронштейны вентилируемого фасада");
    expect(pdf.pdf.body).toContain("Облицовочные панели вентфасада");
    expect(/PRICE_MISSING|source_parameters|raw_ai_json|formula_id|template_id|normFactor/i.test(pdf.pdf.body)).toBe(false);

    expect(buyer.buyerHandoff.forbiddenWorkRowsPresent).toBe(false);
    expect(buyer.buyerHandoff.items.length).toBeGreaterThan(0);
    expect(buyer.buyerHandoff.items.every((item) => item.normId && item.normSourceId)).toBe(true);
    expect(buyer.buyerHandoff.items.every((item) => {
      const row = rowsById.get(item.rowId);
      return row && row.rowType !== "work" && row.rowType !== "labor";
    })).toBe(true);
    expect(buyer.buyerHandoff.items.some((item) => item.titleRu.includes("Минераловатный утеплитель вентфасада"))).toBe(true);
    expect(buyer.buyerHandoff.items.some((item) => item.titleRu.includes("Кронштейны вентилируемого фасада"))).toBe(true);
    expect(buyer.buyerHandoff.items.map((item) => item.titleRu).filter(isGenericProfessionalBoqLineItemName)).toEqual([]);
    expect(buyer.buyerHandoff.items.map((item) => item.titleRu).filter(containsRawFormulaOrDebugProfessionalBoqName)).toEqual([]);
  });
});
