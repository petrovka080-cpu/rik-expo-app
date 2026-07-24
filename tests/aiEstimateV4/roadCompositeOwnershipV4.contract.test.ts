import {
  compileAsphaltProfessionalEstimateV4,
  ROAD_COMPOSITE_OWNERS_V4,
} from "../../src/lib/estimate/v4/asphalt";

describe("road composite ownership V4", () => {
  test("assigns one professional semantic owner to all 30 WBS and 702 BOQ rows", () => {
    const compilation = compileAsphaltProfessionalEstimateV4({
      raw_text: "Полное строительство автомобильной дороги 1000 м²",
      parameter_overrides: {
        scope_profile: { value: "new_full_road_infrastructure", source: "test" },
        area_m2: { value: 1000, source: "test" },
      },
    });
    const rows = compilation.compiled_rows;
    const wbsIds = new Set(rows.map((row) => row.definition.wbs_code));
    const ownerByWbs = new Map(
      ROAD_COMPOSITE_OWNERS_V4.flatMap((owner) => owner.wbsIds.map((wbsId) => [wbsId, owner] as const)),
    );

    expect(rows).toHaveLength(702);
    expect(wbsIds.size).toBe(30);
    expect([...wbsIds].every((wbsId) => ownerByWbs.has(wbsId))).toBe(true);
    expect(rows.every((row) => row.definition.semantic_owner_id === ownerByWbs.get(row.definition.wbs_code)?.ownerId)).toBe(true);
    expect(rows.every((row) => row.definition.semantic_owner_class !== "PASSPORT_GAP")).toBe(true);
    expect(rows.some((row) => /generic|placeholder|заглуш/iu.test(row.definition.semantic_owner_id ?? ""))).toBe(false);
    expect(new Set(rows.map((row) => row.definition.row_id)).size).toBe(rows.length);
    const costedRows = rows.filter((row) =>
      row.definition.priced === true &&
      row.definition.costing_mode !== "ANALYTICAL_ONLY" &&
      row.definition.costing_mode !== "INFORMATIONAL_SUBTOTAL"
    );
    expect(new Set(costedRows.map((row) => row.definition.cost_ownership_id)).size).toBe(costedRows.length);
  });
});
