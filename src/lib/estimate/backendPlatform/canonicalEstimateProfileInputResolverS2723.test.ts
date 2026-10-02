import {
  ASPHALT_FULL_CYCLE_CATALOG_ID_S2723,
  DRYWALL_CEILING_P113_AREA_ONLY_PROFILE_S2723_ID,
  DRYWALL_CEILING_P113_FRAME_CATALOG_ID_S2723,
  STRIP_FOUNDATION_FULL_SCOPE_CATALOG_ID_S2723,
  resolveCanonicalEstimateProfileInputsS2723,
} from "./canonicalEstimateProfileInputResolverS2723";

describe("S27.23 canonical estimate profile input resolver", () => {
  it("derives the 150 m strip-foundation profile before canonical compilation", () => {
    const result = resolveCanonicalEstimateProfileInputsS2723({
      catalogId: STRIP_FOUNDATION_FULL_SCOPE_CATALOG_ID_S2723,
      confirmedParameters: {},
      effectiveUserParameters: { total_axis_length_m: 150 },
    });

    expect(result.applied).toBe(true);
    expect(result.confirmedParameters).toMatchObject({
      total_axis_length_m: 150,
      strip_width_m: 0.8,
      strip_height_m: 2,
      reinforcement_mass_t: 28.8,
      binding_wire_mass_kg: 345.6,
      formwork_transport_mass_t: 45,
      excavation_volume_m3: 540,
      foundation_bedding_volume_m3: 36,
      waterproofing_area_m2: 600,
      backfill_volume_m3: 210,
      mechanical_couplers_applicable: false,
      construction_joint_mode: "NONE",
      excavation_support_required: false,
      excavation_dewatering_required: false,
    });
  });

  it("recalculates from changed geometry and preserves explicit user overrides", () => {
    const result = resolveCanonicalEstimateProfileInputsS2723({
      catalogId: STRIP_FOUNDATION_FULL_SCOPE_CATALOG_ID_S2723,
      confirmedParameters: {
        reinforcement_mass_t: 28.8,
        excavation_volume_m3: 540,
      },
      effectiveUserParameters: {
        total_axis_length_m: 300,
        strip_width_m: 1,
        reinforcement_mass_t: 50,
      },
    });

    expect(result.confirmedParameters).toMatchObject({
      total_axis_length_m: 300,
      strip_width_m: 1,
      strip_height_m: 2,
      reinforcement_mass_t: 50,
      excavation_volume_m3: 1080,
      foundation_bedding_volume_m3: 72,
      waterproofing_area_m2: 1200,
    });
  });

  it("does not affect an unrelated definition", () => {
    const confirmed = Object.freeze({ slab_area_m2: 500 });
    const result = resolveCanonicalEstimateProfileInputsS2723({
      catalogId: "canonical-work:unrelated",
      confirmedParameters: confirmed,
      effectiveUserParameters: { total_axis_length_m: 150 },
    });

    expect(result.applied).toBe(false);
    expect(result.confirmedParameters).toBe(confirmed);
  });

  it("builds the asphalt 900 m2 x 50 mm profile without inventing plan geometry", () => {
    const result = resolveCanonicalEstimateProfileInputsS2723({
      catalogId: ASPHALT_FULL_CYCLE_CATALOG_ID_S2723,
      confirmedParameters: {},
      effectiveUserParameters: {
        area_m2: 900,
        wearing_layer_thickness_mm: 50,
      },
    });

    expect(result.applied).toBe(true);
    expect(result.confirmedParameters).toMatchObject({
      area_m2: 900,
      wearing_layer_thickness_mm: 50,
      binder_layer_thickness_mm: 60,
      asphalt_density_t_m3: 2.35,
      asphalt_waste_percent: 2,
      sand_layer_required: true,
      crushed_layer_count: 2,
      curb_required: false,
      drainage_required: false,
      marking_required: false,
      signing_required: false,
      lighting_required: false,
    });
    expect(result.confirmedParameters).not.toHaveProperty("length_m");
    expect(result.confirmedParameters).not.toHaveProperty("width_m");
    expect(result.confirmedParameters).not.toHaveProperty("edge_treatment_length_m");
  });

  it("does not reuse the 158 m2 P113 room geometry for a 500 m2 ceiling", () => {
    const result = resolveCanonicalEstimateProfileInputsS2723({
      catalogId: DRYWALL_CEILING_P113_FRAME_CATALOG_ID_S2723,
      confirmedParameters: {
        frame_quantity_basis: "P113_TYPICAL_PRELIMINARY",
        room_length_m: 15.8,
        room_width_m: 10,
        perimeter_sealing_required: true,
      },
      effectiveUserParameters: { area_m2: 500 },
    });

    expect(result.applied).toBe(true);
    expect(result.profileId).toBe(DRYWALL_CEILING_P113_AREA_ONLY_PROFILE_S2723_ID);
    expect(result.confirmedParameters).toMatchObject({
      frame_quantity_basis: "P113_TYPICAL_PRELIMINARY",
      perimeter_sealing_required: true,
    });
    expect(result.confirmedParameters).not.toHaveProperty("room_length_m");
    expect(result.confirmedParameters).not.toHaveProperty("room_width_m");
  });

  it("keeps explicitly supplied P113 room geometry", () => {
    const result = resolveCanonicalEstimateProfileInputsS2723({
      catalogId: DRYWALL_CEILING_P113_FRAME_CATALOG_ID_S2723,
      confirmedParameters: { room_length_m: 15.8, room_width_m: 10 },
      effectiveUserParameters: {
        area_m2: 500,
        room_length_m: 25,
        room_width_m: 20,
      },
    });

    expect(result.confirmedParameters).toMatchObject({
      room_length_m: 15.8,
      room_width_m: 10,
    });
  });
});
