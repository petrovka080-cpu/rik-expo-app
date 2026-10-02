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
      "waterproofing_membrane_m2_per_m2",
      "bridge_waterproofing_equipment_set_count",
    ]));
    expect(profile.optionalParameters).not.toEqual(expect.arrayContaining([
      "waterproofing_material_kg_m2",
      "protective_layer_density_t_m3",
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

  const compile = (rawInput: string, overrides: Record<string, string | number | boolean> = {}) =>
    compileAsphaltRelatedProfessionalEstimateV4({
      rawInput,
      selectedWorkKey: "bridge_asphalt",
      selectedTemplateId: "bridge_asphalt",
      paramOverrides: Object.fromEntries(Object.entries(overrides)
        .map(([parameterId, value]) => [parameterId, { value, source: "user_input" as const }])),
    });

  const ownerRow = (
    result: NonNullable<ReturnType<typeof compileAsphaltRelatedProfessionalEstimateV4>>,
    owner: string,
  ) => result.draft.items.find((row) => row.sourceParameters?.boqSemanticOwner === owner);

  it("turns the minimal 150 × 32 m request into a useful 4,800 m² preliminary BOQ", () => {
    const result = compile("Устройство асфальтобетонного покрытия моста 150 × 32 м");

    expect(result).not.toBeNull();
    expect(result?.readiness).toBe("CALCULATION_READY");
    expect(result?.draft.missingData).toEqual([]);
    expect(result?.draft.items).toHaveLength(44);
    expect(result?.draft.items[0]?.quantity).toBe(4_800);
    expect(result?.draft.items.some((row) => row.titleRu.includes("нижнего связующего слоя") && row.quantity === 697.104)).toBe(true);
    expect(result?.draft.items.some((row) => row.titleRu.includes("Автогудронатор") && row.quantity === 12)).toBe(true);
    expect(result?.draft.items.some((row) => row.titleRu.includes("Доставка асфальтобетонной смеси"))).toBe(true);
  });

  it("does not invent the 100 m² reference geometry when dimensions are absent", () => {
    const result = compile("Устройство асфальтобетонного покрытия моста");

    expect(result?.readiness).toBe("NEEDS_REQUIRED_INPUTS");
    expect(result?.draft.items).toEqual([]);
    expect(result?.draft.missingData).toEqual(["Площадь покрытия"]);
  });

  it("changes the resource set for a full rolled-waterproofing replacement using visible TDS inputs", () => {
    const accepted = compile("Устройство асфальтобетонного покрытия моста 150 × 32 м");
    const replacement = compile("Устройство асфальтобетонного покрытия моста 150 × 32 м", {
      waterproofing_condition: "REPLACEMENT_REQUIRED",
    });

    expect(accepted?.readiness).toBe("CALCULATION_READY");
    expect(replacement?.readiness).toBe("CALCULATION_READY");
    expect(replacement?.draft.items).toHaveLength((accepted?.draft.items.length ?? 0) + 5);
    expect(ownerRow(accepted!, "bridge:waterproofing")).toBeUndefined();

    const membrane = ownerRow(replacement!, "bridge:waterproofing");
    expect(membrane).toMatchObject({ quantity: 5_376, unit: "m2" });
    expect(membrane?.sourceParameters?.scopeTriggerParameter).toBe("waterproofing_condition");
    expect(membrane?.sourceParameters?.normativeSourceIds).toContain(
      "manufacturer_tds:tn-doroga-most-b:tds-05-by:2017-12",
    );
    expect(membrane?.sourceParameters?.parameterSourceIds).toEqual(expect.arrayContaining([
      "derived:full-waterproofing-replacement:waterproofing_repair_area_m2=area_m2",
      "manufacturer_tds:tn-doroga-most-b:waterproofing_membrane_m2_per_m2",
    ]));
    expect(ownerRow(replacement!, "bridge:primer")).toMatchObject({ quantity: 1_440, unit: "l" });
    expect(ownerRow(replacement!, "bridge:protective_layer")).toMatchObject({ quantity: 192, unit: "m3" });
    expect(ownerRow(replacement!, "bridge:waterproofing_output")).toMatchObject({ quantity: 4_800, unit: "m2" });
    expect(ownerRow(replacement!, "bridge:equipment")).toMatchObject({ quantity: 1, unit: "set" });
  });

  it("keeps local repair area as the one object fact and never expands it to the full deck", () => {
    const unresolved = compile("Устройство асфальтобетонного покрытия моста 150 × 32 м", {
      waterproofing_condition: "LOCAL_REPAIR_REQUIRED",
    });
    const resolved = compile("Устройство асфальтобетонного покрытия моста 150 × 32 м", {
      waterproofing_condition: "LOCAL_REPAIR_REQUIRED",
      waterproofing_repair_area_m2: 120,
    });

    expect(unresolved?.readiness).toBe("NEEDS_REQUIRED_INPUTS");
    expect(unresolved?.draft.missingData).toEqual(["Площадь ремонта или замены гидроизоляции"]);
    expect(resolved?.readiness).toBe("CALCULATION_READY");
    expect(ownerRow(resolved!, "bridge:waterproofing")).toMatchObject({ quantity: 134.4, unit: "m2" });
    expect(ownerRow(resolved!, "bridge:protective_layer")).toMatchObject({ quantity: 4.8, unit: "m3" });
  });

  it("reports one source-profile gap for an unsupported system instead of asking for professional rates", () => {
    const result = compile("Устройство асфальтобетонного покрытия моста 150 × 32 м", {
      waterproofing_condition: "REPLACEMENT_REQUIRED",
      waterproofing_type: "MASTIC",
    });

    expect(result?.readiness).toBe("NORMATIVE_SOURCE_GAP");
    expect(result?.draft.items).toEqual([]);
    expect(result?.draft.missingData).toEqual([
      "Для выбранного типа мостовой гидроизоляции ещё не подключён совместимый профиль/TDS",
    ]);
  });

  it("routes a 5,000 m² waterproofing area on a 4,800 m² deck to semantic review", () => {
    const result = compile("Устройство асфальтобетонного покрытия моста 150 × 32 м", {
      waterproofing_condition: "REPLACEMENT_REQUIRED",
      waterproofing_repair_area_m2: 5_000,
    });

    expect(result?.readiness).toBe("NEEDS_REQUIRED_INPUTS");
    expect(result?.draft.items).toEqual([]);
    expect(result?.draft.missingData).toEqual([
      "Площадь гидроизоляции больше площади полотна: укажите отдельные поверхности или исправьте границы работ",
    ]);
  });

  it("changes quantities but not row count when only confirmed geometry changes", () => {
    const first = compile("Устройство асфальтобетонного покрытия моста 150 × 32 м");
    const second = compile("Устройство асфальтобетонного покрытия моста 200 × 32 м");

    expect(first?.readiness).toBe("CALCULATION_READY");
    expect(second?.readiness).toBe("CALCULATION_READY");
    expect(first?.draft.items).toHaveLength(second?.draft.items.length ?? -1);
    expect(first?.draft.items[0]?.quantity).toBe(4_800);
    expect(second?.draft.items[0]?.quantity).toBe(6_400);
  });
});
