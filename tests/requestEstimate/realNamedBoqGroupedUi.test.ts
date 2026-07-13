import { buildProfessionalWorkPassport } from "../../src/lib/estimate/buildProfessionalWorkPassport";
import {
  PROFESSIONAL_BOQ_MAIN_UI_MAX_ROWS,
  buildProfessionalBoqGroupedMainViewModel,
} from "../../src/lib/estimate/professionalBoqSectionPolicy";
import {
  buildProfessionalBoqLineItemQualityFromPassportRow,
} from "../../src/lib/estimate/validateProfessionalBoqLineItemQuality";

function passportRows(templateId: string) {
  const passport = buildProfessionalWorkPassport(templateId);
  if (!passport) throw new Error(`passport_missing:${templateId}`);
  return passport.boqRecipe.allRows.map((row) => buildProfessionalBoqLineItemQualityFromPassportRow(passport, row));
}

describe("real named BOQ grouped request UI", () => {
  it("groups named rows by professional section and keeps the main view capped", () => {
    const rows = [
      ...passportRows("ventilated_facade_rom_concept_expanded_complex_v1"),
      ...passportRows("village_water_supply_rom_concept_expanded_complex_v1"),
    ];
    const model = buildProfessionalBoqGroupedMainViewModel(rows);

    expect(model.rawRowsCount).toBeGreaterThan(PROFESSIONAL_BOQ_MAIN_UI_MAX_ROWS);
    expect(model.visibleRowsCount).toBeLessThanOrEqual(PROFESSIONAL_BOQ_MAIN_UI_MAX_ROWS);
    expect(model.hiddenRowsCount).toBe(model.rawRowsCount - model.visibleRowsCount);
    expect(model.hiddenRowsCount).toBeGreaterThan(0);
    expect(model.noRawDump).toBe(true);
    expect(model.sections.map((section) => section.id)).toEqual(expect.arrayContaining([
      "materials",
      "works",
      "equipment",
      "services",
      "logistics",
    ]));
    expect(model.sections.every((section) => section.visibleRows.length <= section.rows.length)).toBe(true);
    expect(model.sections.flatMap((section) => section.visibleRows).every((row) =>
      row.nameIsNotGeneric &&
      row.nameIsNotTemplateOnly &&
      row.nameIsNotRawFormulaOrDebug &&
      row.nomenclatureResolved
    )).toBe(true);
  });
});
