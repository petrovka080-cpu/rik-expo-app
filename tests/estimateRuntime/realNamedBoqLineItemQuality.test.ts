import { buildProfessionalWorkPassport } from "../../src/lib/estimate/buildProfessionalWorkPassport";
import {
  auditProfessionalWorkPassportLineItemQuality,
} from "../../src/lib/estimate/validateProfessionalBoqLineItemQuality";

describe("real named BOQ line item quality", () => {
  it("keeps a professional expanded template named, sourced, traced, and unit-valid", () => {
    const passport = buildProfessionalWorkPassport("ventilated_facade_rom_concept_expanded_complex_v1");
    if (!passport) throw new Error("passport_missing");

    const { result, items } = auditProfessionalWorkPassportLineItemQuality(passport);

    expect(result.ready_real_named_professional_boq_line_items).toBe(true);
    expect(result.row_count).toBeGreaterThanOrEqual(45);
    expect(result.generic_rows_count).toBe(0);
    expect(result.template_only_rows_count).toBe(0);
    expect(result.raw_formula_or_debug_rows_count).toBe(0);
    expect(result.rows_without_real_nomenclature_count).toBe(0);
    expect(result.rows_without_source_citation_count).toBe(0);
    expect(result.rows_without_formula_count).toBe(0);
    expect(result.rows_without_calculation_trace_count).toBe(0);
    expect(result.wrong_unit_rows_count).toBe(0);
    expect(items.some((row) => row.displayName.includes("Кронштейны вентилируемого фасада"))).toBe(true);
    expect(items.some((row) => row.displayName.includes("Облицовочные панели вентфасада"))).toBe(true);
    expect(items.every((row) => row.sourceBacked && row.normId && row.sourceId && row.citationLabel)).toBe(true);
  });
});
