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
  it("keeps CL 51 on one indoor wet-area mastic row and excludes incompatible waterproofing scopes", () => {
    const sourceMarker = "src_professional_norm_pack_waterproofing_ceresit_cl51_two_coats_kg_m2_v1";
    const bathroomWorkKey = "waterproofing_interior_bathroom_apply_standard";
    const bathroom = compileProductionExpandedEstimate10000({
      workKey: bathroomWorkKey,
      quantity: 100,
      countryCode: "KG",
    });
    const bathroomRows = bathroom.rows.filter((row) => row.normSourceId === sourceMarker);
    expect(bathroomRows).toHaveLength(1);
    expect(bathroomRows[0]).toMatchObject({
      rowCode: `${bathroomWorkKey}_materials_03`,
      quantity: 130,
      unit: "kg",
    });
    expect(bathroomRows[0]?.sourceParameters?.formulaContext).toMatchObject({
      normFactor: 1.3,
      wastePercent: 0,
      packageSize: 5,
    });
    expect(bathroomRows[0]?.sourceParameters?.normSourceDocumentVersion)
      .toBe("2026.09-ceresit-cl51-global-primary-review-r2");
    expect(bathroom.rows.find((row) => row.rowCode === `${bathroomWorkKey}_materials_01`)
      ?.normSourceId).not.toBe(sourceMarker);

    const apartment = compileProductionExpandedEstimate10000({
      workKey: "apartment_capital_renovation",
      quantity: 100,
      countryCode: "KG",
    });
    expect(apartment.rows.filter((row) => row.normSourceId === sourceMarker)).toMatchObject([{
      rowCode: "waterproofing_wet_zones_waterproofing_interior_wet_zone_apply_standard_materials_03",
      quantity: 93.6,
      unit: "kg",
    }]);

    for (const workKey of [
      "waterproofing_interior_foundation_apply_standard",
      "waterproofing_interior_roof_apply_standard",
      "waterproofing_interior_pool_apply_standard",
    ]) {
      const compiled = compileProductionExpandedEstimate10000({ workKey, quantity: 100, countryCode: "KG" });
      expect(compiled.rows.some((row) => row.normSourceId === sourceMarker)).toBe(false);
    }
  });

  it("keeps the six static Knauf D112 variant-1 rows exact and rounds only piece outputs", () => {
    const workKey = "drywall_ceiling_interior_drywall_ceiling_install_standard";
    const reference = compileProductionExpandedEstimate10000({ workKey, quantity: 100, countryCode: "KG" });
    const sourced = reference.rows.filter((row) =>
      row.normSourceId?.startsWith("src_professional_norm_pack_ceilings_knauf_d112_standard_"),
    );
    expect(sourced.map((row) => [row.rowCode, row.quantity, row.unit])).toEqual([
      [`${workKey}_materials_01`, 100, "m2"],
      [`${workKey}_materials_02`, 40, "linear_m"],
      [`${workKey}_materials_05`, 30, "kg"],
      [`${workKey}_materials_06`, 45, "linear_m"],
      [`${workKey}_components_07`, 1700, "piece"],
      [`${workKey}_components_08`, 120, "piece"],
    ]);
    expect(sourced.every((row) => row.sourceParameters?.normSourceDocumentVersion ===
      "2026.09-knauf-d11-d112-primary-review-r2")).toBe(true);

    const fractionalArea = compileProductionExpandedEstimate10000({
      workKey,
      quantity: 0.1,
      countryCode: "KG",
    });
    expect(fractionalArea.rows.find((row) => row.rowCode === `${workKey}_components_07`))
      .toMatchObject({ quantityFormula: "ceil(q * normFactor)", quantity: 2, unit: "piece" });
    expect(fractionalArea.rows.find((row) => row.rowCode === `${workKey}_components_08`))
      .toMatchObject({ quantityFormula: "ceil(q * normFactor)", quantity: 1, unit: "piece" });
  });

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

    const netAreaBeforeCutLayout = sourcedRow(
      "insulation_interior_facade_install_standard",
      "insulation_interior_facade_install_standard_materials_01",
      1,
    );
    expect(netAreaBeforeCutLayout.quantity).toBe(1);
    expect(netAreaBeforeCutLayout.sourceParameters?.formulaContext).toMatchObject({
      normFactor: 1,
      packageSize: 4.45,
    });
    expect(netAreaBeforeCutLayout.sourceParameters?.normSourceDocumentVersion)
      .toBe("2026.09-rockwool-comfortboard80-primary-review-r2");

    const coating = sourcedRow(
      "carpentry_metal_interior_metal_frame_paint_standard",
      "carpentry_metal_interior_metal_frame_paint_standard_materials_03",
    );
    expect(coating.quantity).toBeCloseTo(15.873, 3);
    expect(coating.unit).toBe("l");
    expect(coating.normId).toContain("metalwork_jotun_hardtop_xp_l_m2_100um_v1");

    const theoreticalLitresBeforeLossAndKitSelection = sourcedRow(
      "carpentry_metal_interior_metal_frame_paint_standard",
      "carpentry_metal_interior_metal_frame_paint_standard_materials_03",
      1,
    );
    expect(theoreticalLitresBeforeLossAndKitSelection.quantity).toBeCloseTo(0.1587, 4);
    expect(theoreticalLitresBeforeLossAndKitSelection.sourceParameters?.formulaContext).toMatchObject({
      normFactor: 0.15873016,
      packageSize: 5,
    });
    expect(theoreticalLitresBeforeLossAndKitSelection.sourceParameters?.normSourceDocumentVersion)
      .toBe("2026.09-jotun-hardtop-xp-primary-review-r2");
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
