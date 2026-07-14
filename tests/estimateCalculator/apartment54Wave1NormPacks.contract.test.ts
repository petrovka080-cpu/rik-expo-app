import {
  compileProductionExpandedEstimate10000,
  isProfessionalNormPackSourceId,
  PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS,
} from "../../src/lib/ai/estimateTemplate10000";

const GROUP_BY_SOURCE_ID = new Map(PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS.map((item) => [item.sourceId, item.workGroup]));

describe("apartment 54 wave1 norm packs", () => {
  it("uses source-backed norm packs for all wave1 apartment finish groups", () => {
    const compiled = compileProductionExpandedEstimate10000({
      workKey: "apartment_capital_renovation",
      quantity: 54,
      countryCode: "KG",
    });
    const realRows = compiled.rows.filter((row) => isProfessionalNormPackSourceId(row.normSourceId));
    const groups = [...new Set(realRows.map((row) => GROUP_BY_SOURCE_ID.get(row.normSourceId)))];

    expect(compiled.templateKey).toBe("apartment_capital_renovation_project_template_group_v1");
    expect(realRows.length).toBeGreaterThanOrEqual(12);
    expect(groups).toEqual(expect.arrayContaining(["tile", "plaster", "putty", "paint", "flooring", "drywall", "waterproofing"]));
    expect(realRows.every((row) => row.normId.includes(":professional_pack:"))).toBe(true);
    expect([...new Set(realRows.map((row) => row.unit))]).toEqual(expect.arrayContaining(["kg", "l"]));
  });
});
