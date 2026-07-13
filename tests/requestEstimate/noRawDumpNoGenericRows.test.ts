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

    const passport = buildProfessionalWorkPassport("ventilated_facade_rom_concept_expanded_complex_v1");
    if (!passport) throw new Error("passport_missing");
    const rows = passport.boqRecipe.allRows.map((row) => buildProfessionalBoqLineItemQualityFromPassportRow(passport, row));
    const model = buildProfessionalBoqGroupedMainViewModel([...rows, ...rows], 40);

    expect(model.rawRowsCount).toBeGreaterThan(model.visibleRowsCount);
    expect(model.noRawDump).toBe(true);
    expect(model.sections.flatMap((section) => section.visibleRows).filter((row) => !row.nameIsNotGeneric)).toEqual([]);
    expect(model.sections.flatMap((section) => section.visibleRows).filter((row) => !row.nameIsNotRawFormulaOrDebug)).toEqual([]);
  });
});
