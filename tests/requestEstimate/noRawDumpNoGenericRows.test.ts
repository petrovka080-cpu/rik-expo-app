import { runRealNamedBoqCriticalCases } from "../../scripts/estimate/realNamedBoqCriticalCases";
import { buildProfessionalWorkPassport } from "../../src/lib/estimate/buildProfessionalWorkPassport";
import {
  buildProfessionalBoqGroupedMainViewModel,
} from "../../src/lib/estimate/professionalBoqSectionPolicy";
import {
  buildProfessionalBoqLineItemQualityFromPassportRow,
  containsRawFormulaOrDebugProfessionalBoqName,
  isGenericProfessionalBoqLineItemName,
} from "../../src/lib/estimate/validateProfessionalBoqLineItemQuality";

describe("real named BOQ rows avoid raw dumps and generic names", () => {
  it("keeps critical recipe rows and grouped UI rows clean", () => {
    const critical = runRealNamedBoqCriticalCases();
    expect(critical.filter((result) => !result.passed)).toEqual([]);
    expect(critical.flatMap((result) => result.row_names_sample).filter(isGenericProfessionalBoqLineItemName)).toEqual([]);
    expect(critical.flatMap((result) => result.row_names_sample).filter(containsRawFormulaOrDebugProfessionalBoqName)).toEqual([]);

    const templateIds = [
      "ventilated_facade_rom_concept_expanded_complex_v1",
      "village_water_supply_rom_concept_expanded_complex_v1",
      "demolition_interior_tile_remove_standard_professional_expanded_v1",
    ];
    const rows = templateIds.flatMap((templateId) => {
      const passport = buildProfessionalWorkPassport(templateId);
      if (!passport) throw new Error(`passport_missing:${templateId}`);
      return passport.boqRecipe.allRows.map((row) => buildProfessionalBoqLineItemQualityFromPassportRow(passport, row));
    });
    const model = buildProfessionalBoqGroupedMainViewModel(rows, 40);

    expect(model.rawRowsCount).toBeGreaterThan(model.visibleRowsCount);
    expect(model.noRawDump).toBe(true);
    expect(model.sections.flatMap((section) => section.visibleRows).filter((row) => !row.nameIsNotGeneric)).toEqual([]);
    expect(model.sections.flatMap((section) => section.visibleRows).filter((row) => !row.nameIsNotRawFormulaOrDebug)).toEqual([]);
  });
});
