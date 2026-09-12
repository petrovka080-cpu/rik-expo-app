import {
  compileProductionExpandedEstimate10000,
} from "../../src/lib/ai/estimateTemplate10000";

const PROFESSIONAL_SOURCE_PREFIX = "src_professional_norm_pack_";

function sourcedRow(workKey: string, rowCode: string, quantity = 100) {
  const compiled = compileProductionExpandedEstimate10000({ workKey, quantity, countryCode: "KG" });
  const row = compiled.rows.find((candidate) => candidate.rowCode === rowCode);
  expect(row).toBeDefined();
  expect(row?.normSourceId).toMatch(new RegExp(`^${PROFESSIONAL_SOURCE_PREFIX}`));
  return row!;
}

describe("professional norm-pack wave 3 real quantities", () => {
  it("uses the documented Sarnafil AT-18 field-overlap factor only for the exact flat-roof row", () => {
    const row = sourcedRow(
      "roofing_interior_flat_roof_install_standard",
      "roofing_interior_flat_roof_install_standard_materials_01",
    );
    expect(row.quantity).toBeCloseTo(104.1667, 4);
    expect(row.unit).toBe("m2");
    expect(row.normId).toContain("roofing_sarnafil_at18_field_overlap_m2_m2_v1");

    const grossFieldAreaBeforeRollLayout = sourcedRow(
      "roofing_interior_flat_roof_install_standard",
      "roofing_interior_flat_roof_install_standard_materials_01",
      10,
    );
    expect(grossFieldAreaBeforeRollLayout.quantity).toBeCloseTo(10.4167, 4);
    expect(grossFieldAreaBeforeRollLayout.sourceParameters?.formulaContext).toMatchObject({
      normFactor: 1.0416667,
      packageSize: 30,
    });
    expect(grossFieldAreaBeforeRollLayout.sourceParameters?.normSourceDocumentVersion)
      .toBe("2026.09-sika-sarnafil-at18-primary-review-r2");

    const unrelated = compileProductionExpandedEstimate10000({
      workKey: "roofing_interior_metal_roof_install_standard",
      quantity: 100,
      countryCode: "KG",
    });
    expect(unrelated.rows[0]?.normSourceId).not.toContain("sarnafil");
  });

  it("uses five Fixrock holders per square metre only for conventional ventilated-facade fixing", () => {
    const row = sourcedRow(
      "facade_interior_vent_facade_install_standard",
      "facade_interior_vent_facade_install_standard_components_07",
    );
    expect(row.quantity).toBe(500);
    expect(row.unit).toBe("piece");
    expect(row.normId).toContain("facade_rockwool_fixrock_conventional_fixings_piece_m2_v1");

    const smallestMeasuredArea = sourcedRow(
      "facade_interior_vent_facade_install_standard",
      "facade_interior_vent_facade_install_standard_components_07",
      0.1,
    );
    expect(smallestMeasuredArea.quantityFormula).toBe("ceil(q * normFactor)");
    expect(smallestMeasuredArea.quantity).toBe(1);
    expect(smallestMeasuredArea.calculationTrace).toContain("rounding=ceil_to_whole_unit");
    expect(smallestMeasuredArea.sourceParameters?.normSourceDocumentVersion)
      .toBe("2026.09-rockwool-vhf-fixings-primary-review-r2");
    expect(smallestMeasuredArea.sourceParameters?.normParameterRequirements).toEqual([
      { key: "normFactor", unit: "piece", required: true, source: "norm_record" },
      { key: "q", unit: "m2", required: true, source: "user_measurement" },
    ]);
  });

  it("keeps Comfortboard net area and Jotun theoretical spreading rate dimensionally explicit", () => {
    const insulation = sourcedRow(
      "insulation_interior_facade_install_standard",
      "insulation_interior_facade_install_standard_materials_01",
    );
    expect(insulation.quantity).toBe(100);
    expect(insulation.unit).toBe("m2");
    expect(insulation.normId).toContain("insulation_rockwool_comfortboard80_r63_38mm_m2_m2_v1");

    const coating = sourcedRow(
      "carpentry_metal_interior_metal_frame_paint_standard",
      "carpentry_metal_interior_metal_frame_paint_standard_materials_03",
    );
    expect(coating.quantity).toBeCloseTo(15.873, 3);
    expect(coating.unit).toBe("l");
    expect(coating.normId).toContain("metalwork_jotun_hardtop_xp_l_m2_100um_v1");
  });

  it("uses the carpentry wood-preserver source instead of a neighboring wood-floor adhesive", () => {
    const row = sourcedRow(
      "carpentry_metal_interior_wood_frame_finish_standard",
      "carpentry_metal_interior_wood_frame_finish_standard_materials_03",
    );
    expect(row.quantity).toBe(25);
    expect(row.unit).toBe("l");
    expect(row.normId).toContain("carpentry_sikagard_wood_preserver_l_m2_preventative_v1");
    expect(row.normId).not.toContain("wood_floor");

    const partialTinRequirement = sourcedRow(
      "carpentry_metal_interior_wood_frame_finish_standard",
      "carpentry_metal_interior_wood_frame_finish_standard_materials_03",
      10,
    );
    expect(partialTinRequirement.quantity).toBe(2.5);
    expect(partialTinRequirement.sourceParameters?.formulaContext).toMatchObject({
      normFactor: 0.25,
      packageSize: 1,
    });
    expect(partialTinRequirement.sourceParameters?.normSourceDocumentVersion)
      .toBe("2026.09-sikagard-wood-preserver-primary-review-r2");
    expect(partialTinRequirement.sourceParameters?.normParameterRequirements).toEqual([
      { key: "normFactor", unit: "l", required: true, source: "norm_record" },
      { key: "q", unit: "m2", required: true, source: "user_measurement" },
    ]);
  });
});
