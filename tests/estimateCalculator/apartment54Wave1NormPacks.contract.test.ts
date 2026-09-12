import {
  compileProductionExpandedEstimate10000,
  isProfessionalNormPackSourceId,
} from "../../src/lib/ai/estimateTemplate10000";

describe("apartment 54 wave1 norm packs", () => {
  it("keeps the full apartment assembly but does not auto-select product-specific norm packs", () => {
    const compiled = compileProductionExpandedEstimate10000({
      workKey: "apartment_capital_renovation",
      quantity: 54,
      countryCode: "KG",
    });
    const realRows = compiled.rows.filter((row) => isProfessionalNormPackSourceId(row.normSourceId));

    expect(compiled.templateKey).toBe("apartment_capital_renovation_project_template_group_v1");
    expect(compiled.rows).toHaveLength(1381);
    expect(realRows).toEqual([]);
    expect(compiled.rows.every((row) =>
      row.normSourceId.startsWith("src_professional_norm_pack_catalog_"))).toBe(true);
    expect(compiled.rows.every((row) =>
      row.normId.includes(":professional_pack:") && row.calculationTrace.includes("normSource="))).toBe(true);
    expect(compiled.rows.some((row) => /(?:ceresit|gerflor|knauf_d112)/u.test(row.normSourceId))).toBe(false);
  });
});
