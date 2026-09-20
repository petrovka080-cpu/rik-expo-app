import { compileAsphaltRelatedProfessionalEstimateV4 } from "../../src/lib/estimate/v4/asphalt/compileAsphaltRelatedProfessionalEstimateV4";
import { ASPHALT_RELATED_EXTRA_PROFILES_V4 } from "../../src/lib/estimate/v4/asphalt/asphaltRelatedSemanticRegistryV4";
import { ASPHALT_BRIDGE_RESOURCE_LEVEL_PARAMETER_KEYS_V4 } from "../../src/lib/estimate/v4/asphalt/compileAsphaltRelatedThroughCoreV4";

describe("R9 bridge asphalt focused schema", () => {
  const profile = ASPHALT_RELATED_EXTRA_PROFILES_V4.find(
    (candidate) => candidate.canonicalWorkKey === "bridge_asphalt",
  )!;

  it("requires both asphalt layers and does not inherit road-base or site-feature questions", () => {
    expect(profile.requiredParameters).toEqual(expect.arrayContaining([
      "binder_layer_thickness_mm",
      "binder_mix_type",
      "wearing_layer_thickness_mm",
      "wearing_mix_type",
    ]));
    expect(profile.optionalParameters).toEqual(expect.arrayContaining([
      "length_m",
      "width_m",
      "protective_layer_thickness_mm",
      "waterproofing_material_kg_m2",
      "bridge_waterproofing_productivity_m2_per_man_hour",
    ]));

    const parameterIds = new Set([
      ...profile.requiredParameters,
      ...profile.optionalParameters,
    ]);
    expect(profile.requiredParameters).not.toContain("protective_layer_thickness_mm");
    for (const unrelated of [
      "sand_layer_required",
      "crushed_stone_layer_required",
      "geotextile_required",
      "curb_required",
      "drainage_required",
      "marking_required",
      "signing_required",
      "lighting_required",
      "bridge_deck_package_required",
    ]) {
      expect(parameterIds.has(unrelated)).toBe(false);
    }
    expect(new Set<string>(ASPHALT_BRIDGE_RESOURCE_LEVEL_PARAMETER_KEYS_V4).has("sand_layer_required")).toBe(false);
  });

  it("derives the exact 6,400 m² bridge geometry before asking for source-owned rates", () => {
    const paramOverrides = Object.fromEntries(Object.entries({
      bridge_deck_system_confirmed: true,
      waterproofing_type: "ROLLED",
      waterproofing_condition: "ACCEPTED",
      protective_layer_thickness_mm: 40,
      binder_layer_thickness_mm: 60,
      binder_mix_type: "DENSE_COARSE_GRAINED",
      wearing_layer_thickness_mm: 50,
      wearing_mix_type: "DENSE_FINE_GRAINED",
      asphalt_density_t_m3: 2.35,
      traffic_class: "HEAVY",
      estimate_scope_mode: "MINIMAL_EXPLICIT_SCOPE",
      project_scope: "SURFACING_ONLY",
    }).map(([parameterId, value]) => [parameterId, { value, source: "user_input" as const }]));

    const result = compileAsphaltRelatedProfessionalEstimateV4({
      rawInput: "Устройство асфальтобетонного покрытия моста 200 × 32 м",
      selectedWorkKey: "bridge_asphalt",
      selectedTemplateId: "bridge_asphalt",
      paramOverrides,
    });

    expect(result).not.toBeNull();
    expect(result?.draft.missingData).not.toContain("Площадь покрытия");
    expect(result?.draft.missingData).not.toContain("Длина участка");
    expect(result?.draft.missingData).not.toContain("Ширина участка");
    expect(result?.draft.missingData).not.toContain("Требуется устройство песчаного слоя");
  });
});
