import { buildProfessionalWorkPassport } from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { buildProfessionalBoqGroupedMainViewModel } from "../../src/lib/estimate/professionalBoqSectionPolicy";
import {
  buildProfessionalBoqLineItemQualityFromPassportRow,
} from "../../src/lib/estimate/validateProfessionalBoqLineItemQuality";

function passportRows(templateId: string) {
  const passport = buildProfessionalWorkPassport(templateId);
  if (!passport) throw new Error(`passport_missing:${templateId}`);
  return passport.boqRecipe.allRows.map((row) => buildProfessionalBoqLineItemQualityFromPassportRow(passport, row));
}

describe("real named BOQ grouped request UI", () => {
  it("groups named rows by professional section without truncating the technological composition", () => {
    const rows = [
      ...passportRows("ventilated_facade_rom_concept_expanded_complex_v1"),
      ...passportRows("village_water_supply_rom_concept_expanded_complex_v1"),
      ...passportRows("demolition_interior_tile_remove_standard_professional_expanded_v1"),
    ];
    const model = buildProfessionalBoqGroupedMainViewModel(rows);

    expect(model.rawRowsCount).toBeGreaterThan(80);
    expect(model.visibleRowsCount).toBe(model.rawRowsCount);
    expect(model.hiddenRowsCount).toBe(0);
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
