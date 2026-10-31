import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  FIREPROOF_ZONE_INJECTION_REPAIR_ACCEPTANCE_INPUT,
  FIREPROOF_ZONE_INJECTION_REPAIR_AC20_ARTIFACT_SHA256,
  FIREPROOF_ZONE_INJECTION_REPAIR_FORMULAS,
  FIREPROOF_ZONE_INJECTION_REPAIR_METHOD_ARTIFACT_SHA256,
  FIREPROOF_ZONE_INJECTION_REPAIR_PART_A_SDS_ARTIFACT_SHA256,
  FIREPROOF_ZONE_INJECTION_REPAIR_PART_B_SDS_ARTIFACT_SHA256,
  FIREPROOF_ZONE_INJECTION_REPAIR_PARAMETERS,
  FIREPROOF_ZONE_INJECTION_REPAIR_PRELIMINARY_PROFILE,
  FIREPROOF_ZONE_INJECTION_REPAIR_RESOURCES,
  FIREPROOF_ZONE_INJECTION_REPAIR_RUNTIME_CLASSIFICATION,
  FIREPROOF_ZONE_INJECTION_REPAIR_SHORT_INPUT,
  FIREPROOF_ZONE_INJECTION_REPAIR_SIKA_ARTIFACT_SHA256,
  FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_BUNDLE_SHA256,
  FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_METADATA,
  FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_ID,
  FIREPROOF_ZONE_INJECTION_REPAIR_VARIANTS,
  compileFireproofZoneInjectionRepairVariantR1,
  fireproofZoneInjectionRepairCompletenessMap,
  resolveFireproofZoneInjectionRepairVariant,
  type FireproofZoneInjectionRepairVariantKey,
} from "../../src/lib/estimate/v4/fireproofZoneInjectionRepairVariantsR1";

const VARIANT_KEYS = Object.keys(
  FIREPROOF_ZONE_INJECTION_REPAIR_VARIANTS,
) as FireproofZoneInjectionRepairVariantKey[];

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(resolve(path))).digest("hex");
}

function quantity(compiled: Awaited<ReturnType<
  typeof compileFireproofZoneInjectionRepairVariantR1
>>, rowId: string): string | undefined {
  return compiled.rows.find((row) => row.row_id === rowId)?.quantity;
}

describe("S27.8 F09 fireproof-zone injection repair variants", () => {
  test("preserves the surviving exact identities and source boundary", () => {
    expect(VARIANT_KEYS).toEqual([ "standard"]);
    expect(new Set(VARIANT_KEYS.map((key) =>
      FIREPROOF_ZONE_INJECTION_REPAIR_VARIANTS[key].catalogId)).size).toBe(1);
    const sourceDir =
      ".release-runtime/r568/s27-9/p6/f09-engineering-completion-v1/official-snapshots/";
    expect(sha256(`${sourceDir}sika_injection_201_ce_pds_2023_02_01.pdf`))
      .toBe(FIREPROOF_ZONE_INJECTION_REPAIR_SIKA_ARTIFACT_SHA256);
    expect(sha256(`${sourceDir}sika_injection_ac20_pds_2020_01_02.pdf`))
      .toBe(FIREPROOF_ZONE_INJECTION_REPAIR_AC20_ARTIFACT_SHA256);
    expect(sha256(`${sourceDir}sika_injection_201_ce_method_statement_2019_01.pdf`))
      .toBe(FIREPROOF_ZONE_INJECTION_REPAIR_METHOD_ARTIFACT_SHA256);
    expect(sha256(`${sourceDir}sika_injection_201_ce_part_a_sds_2025_10_0.pdf`))
      .toBe(FIREPROOF_ZONE_INJECTION_REPAIR_PART_A_SDS_ARTIFACT_SHA256);
    expect(sha256(`${sourceDir}sika_injection_201_ce_part_b_sds_2025_4_1.pdf`))
      .toBe(FIREPROOF_ZONE_INJECTION_REPAIR_PART_B_SDS_ARTIFACT_SHA256);
    expect(FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_BUNDLE_SHA256)
      .toBe("2237ee16716974acb1f73660ca0f898ecd2a242279760ae358ebd7c6cebf2a22");
    for (const key of VARIANT_KEYS) {
      expect(fireproofZoneInjectionRepairCompletenessMap(key)).toMatchObject({
        generatedFromCurrentRows: false,
        catalogVariant: expect.stringMatching(/NO_HIDDEN_QUANTITY_FACTOR$/u),
      });
    }
  });

  test("classifies injection as substrate waterproofing repair, never fireproof restoration", () => {
    expect(FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_METADATA).toMatchObject({
      workflow_role:
        "CONCRETE_SUBSTRATE_CRACK_SEALING_BEFORE_SEPARATE_FIREPROOF_SYSTEM_RESTORATION",
      fireproofing_restored_by_this_profile: false,
      separate_fireproof_restoration_required: true,
    });
    expect(FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_METADATA.source_supported_result_ru)
      .toMatch(/водонепроницаемая герметизация.*бетонн/iu);
    expect(FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_METADATA.use_restriction)
      .toMatch(/не подтверждает огнезащитные свойства.*не восстанавливает огнезащит/iu);
    for (const key of VARIANT_KEYS) {
      const variant = FIREPROOF_ZONE_INJECTION_REPAIR_VARIANTS[key];
      expect(variant.canonicalNameRu)
        .toMatch(/бетонного основания перед восстановлением огнезащиты/iu);
      expect(variant.canonicalNameRu).not.toMatch(/^инъектирование огнезащиты/iu);
      expect(fireproofZoneInjectionRepairCompletenessMap(key)).toMatchObject({
        sourceKind: "PRODUCT_SYSTEM_TDS",
        sourceSystemClass: "MANUFACTURER_WATERPROOFING_CRACK_INJECTION_PDS_AND_METHOD",
        entries: expect.arrayContaining([
          expect.objectContaining({
            detailPrinciple:
              "SUBSTRATE_CRACK_SEALING_ONLY_FIREPROOF_SYSTEM_RESTORATION_IS_A_SEPARATE_REQUIRED_OPERATION",
          }),
        ]),
      });
    }
  });

  test.each(VARIANT_KEYS)(
    "%s asks for measured temperature, strength and pressure after five geometry inputs",
    async (key) => {
      expect(Object.keys(FIREPROOF_ZONE_INJECTION_REPAIR_SHORT_INPUT)).toEqual([
        "repair_zone_area_m2",
        "defect_length_m",
        "defect_mean_opening_mm",
        "defect_mean_depth_mm",
        "component_thickness_mm",
      ]);
      const compiled = await compileFireproofZoneInjectionRepairVariantR1(key, {
        ...FIREPROOF_ZONE_INJECTION_REPAIR_SHORT_INPUT,
      });
      expect(new Set(compiled.preliminaryNeeds.flatMap((need) => need.missing_parameter_ids)))
        .toEqual(new Set([
          "ambient_air_temperature_c",
          "substrate_temperature_c",
          "injection_material_temperature_c",
          "concrete_compressive_strength_n_mm2",
          "planned_injection_pressure_bar",
        ]));
      // A missing temperature does not create a fixed reaction time or a customer norm question.
      expect(compiled.parameters.injection_reaction_time_min).toBeUndefined();
      expect(FIREPROOF_ZONE_INJECTION_REPAIR_PARAMETERS.find(parameter =>
        parameter.parameter_id === "injection_reaction_time_min")).toMatchObject({
        required: false,
        truth_metadata: {
          value_source_role: "SOURCE_TABLE_DERIVED_OR_SPECIALIST_CONFIRMED",
          derived_exact_lookup_v1: {
            inputParameterIds: ["injection_material_temperature_c", "injection_ac20_dosage_percent"],
            interpolation: "FORBIDDEN",
            rows: expect.arrayContaining([{inputValues: [20, 0], outputValue: 135}]),
          },
          guide: {source_document: FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_ID,
            source_snapshot_hash: FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_BUNDLE_SHA256},
        },
      });
      // The actual manufacturer norm remains in the immutable calculation snapshot.
      expect(Number(compiled.parameters.packer_spacing_thickness_ratio)).toBe(0.5);
      expect(compiled.revisionProjection.parameters.packer_spacing_thickness_ratio)
        .toBe(compiled.parameters.packer_spacing_thickness_ratio);
      expect(FIREPROOF_ZONE_INJECTION_REPAIR_RUNTIME_CLASSIFICATION.packer_spacing_thickness_ratio).toBe("NORMATIVE");
      expect(FIREPROOF_ZONE_INJECTION_REPAIR_PARAMETERS.find(parameter =>
        parameter.parameter_id === "packer_spacing_thickness_ratio")).toMatchObject({
        truth_metadata: {value_source_role: "SOURCE_BACKED_PRELIMINARY_PROFILE",
          guide: {source_document: FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_ID,
            source_snapshot_hash: FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_BUNDLE_SHA256}},
      });
      expect(compiled.rows).toHaveLength(35);
      expect(quantity(compiled, "f09:fireproof_zone_injection_repair_area")).toBe("12");
      expect(quantity(compiled, "f09:fireproof_zone_injection_packer_spacing")).toBe("0.09");
      expect(quantity(compiled, "f09:fireproof_zone_injection_geometry_volume")).toBe("2.16");
      expect(quantity(compiled, "f09:fireproof_zone_injection_material_volume")).toBe("2.16");
      expect(quantity(compiled, "f09:fireproof_zone_injection_component_a_required")).toBe("1.08");
      expect(quantity(compiled, "f09:fireproof_zone_injection_component_b_required")).toBe("1.1556");
      expect(quantity(compiled, "f09:fireproof_zone_injection_201_ce_kit")).toBe("1");
      expect(quantity(compiled, "f09:fireproof_zone_injection_component_a_purchased")).toBe("10");
      expect(quantity(compiled, "f09:fireproof_zone_injection_component_b_purchased")).toBe("10.6");
      expect(quantity(compiled, "f09:fireproof_zone_injection_packers")).toBe("335");
      expect(quantity(compiled, "f09:fireproof_zone_injection_passes")).toBe("670");
      expect(quantity(compiled, "f09:fireproof_zone_injection_pump")).toBe("1");
      expect(quantity(compiled, "f09:fireproof_zone_injection_nipple_gripper")).toBe("1");
      expect(quantity(compiled, "f09:fireproof_zone_injection_battery_drill")).toBe("1");
      expect(quantity(compiled, "f09:fireproof_zone_injection_qa_protocol")).toBe("1");
    },
  );

  test.each(VARIANT_KEYS)(
    "%s compiles the complete professional composition with package remainders and controls",
    async (key) => {
      const compiled = await compileFireproofZoneInjectionRepairVariantR1(key, {
        ...FIREPROOF_ZONE_INJECTION_REPAIR_ACCEPTANCE_INPUT,
      });
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.rows).toHaveLength(41);
      expect(quantity(compiled, "f09:fireproof_zone_injection_ambient_temperature")).toBe("20");
      expect(quantity(compiled, "f09:fireproof_zone_injection_substrate_temperature")).toBe("20");
      expect(quantity(compiled, "f09:fireproof_zone_injection_material_temperature")).toBe("20");
      expect(quantity(compiled, "f09:fireproof_zone_injection_component_a_remainder")).toBe("8.92");
      expect(quantity(compiled, "f09:fireproof_zone_injection_component_b_remainder")).toBe("9.4444");
      expect(quantity(compiled, "f09:fireproof_zone_injection_reaction_time")).toBe("135");
      expect(quantity(compiled, "f09:fireproof_zone_injection_max_pressure")).toBe("100");
      expect(quantity(compiled, "f09:fireproof_zone_injection_planned_pressure")).toBe("5");
      expect(quantity(compiled, "f09:fireproof_zone_injection_owned_equipment_use")).toBe("1");
      expect(quantity(compiled, "f09:fireproof_zone_injection_equipment_rental")).toBeUndefined();
      expect(quantity(compiled, "f09:fireproof_zone_injection_equipment_purchase")).toBeUndefined();
    },
  );

  test.each(VARIANT_KEYS)("%s applies several visible norm edits in one compile", async (key) => {
    const compiled = await compileFireproofZoneInjectionRepairVariantR1(key, {
      ...FIREPROOF_ZONE_INJECTION_REPAIR_ACCEPTANCE_INPUT,
      material_volume_factor: 1.1,
      workfront_count: 2,
      curing_check_count: 2,
      qa_protocol_document_count: 2,
      waste_disposal_service_count: 2,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(quantity(compiled, "f09:fireproof_zone_injection_material_volume")).toBe("2.376");
    expect(quantity(compiled, "f09:fireproof_zone_injection_component_a_required")).toBe("1.188");
    expect(quantity(compiled, "f09:fireproof_zone_injection_component_b_required")).toBe("1.27116");
    expect(quantity(compiled, "f09:fireproof_zone_injection_pump")).toBe("2");
    expect(quantity(compiled, "f09:fireproof_zone_injection_completion_check")).toBe("2");
    expect(quantity(compiled, "f09:fireproof_zone_injection_qa_protocol")).toBe("2");
    expect(quantity(compiled, "f09:fireproof_zone_injection_waste")).toBe("2");
    expect(FIREPROOF_ZONE_INJECTION_REPAIR_PARAMETERS).toHaveLength(35);
    expect(FIREPROOF_ZONE_INJECTION_REPAIR_FORMULAS).toHaveLength(46);
    expect(FIREPROOF_ZONE_INJECTION_REPAIR_RESOURCES).toHaveLength(46);
  });

  test("uses the exact AC-20 table, whole packs and one mutually exclusive equipment basis", async () => {
    const compiled = await compileFireproofZoneInjectionRepairVariantR1("standard", {
      ...FIREPROOF_ZONE_INJECTION_REPAIR_ACCEPTANCE_INPUT,
      ambient_air_temperature_c: 5,
      substrate_temperature_c: 5,
      injection_material_temperature_c: 5,
      use_injection_ac20: true,
      injection_ac20_dosage_percent: 2,
      equipment_cost_mode: "RENTAL",
      equipment_rental_days: 3,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(quantity(compiled, "f09:fireproof_zone_injection_ac20_required")).toBe("0.0216");
    expect(quantity(compiled, "f09:fireproof_zone_injection_ac20_pack")).toBe("1");
    expect(quantity(compiled, "f09:fireproof_zone_injection_ac20_remainder")).toBe("0.9784");
    expect(quantity(compiled, "f09:fireproof_zone_injection_reaction_time")).toBe("16");
    expect(quantity(compiled, "f09:fireproof_zone_injection_equipment_rental")).toBe("3");
    expect(quantity(compiled, "f09:fireproof_zone_injection_owned_equipment_use")).toBeUndefined();
    expect(quantity(compiled, "f09:fireproof_zone_injection_equipment_purchase")).toBeUndefined();
  });

  test("accepts compatible supplied prices but keeps absent F09 prices honestly NULL", async () => {
    const unpriced = await compileFireproofZoneInjectionRepairVariantR1(
      "standard",
      { ...FIREPROOF_ZONE_INJECTION_REPAIR_ACCEPTANCE_INPUT },
    );
    const kit = unpriced.rows.find((entry) =>
      entry.row_id === "f09:fireproof_zone_injection_201_ce_kit");
    expect(kit).toMatchObject({ unit_price: null, amount: null });
    expect(unpriced.priceSnapshotIds).toEqual([]);

    const priced = await compileFireproofZoneInjectionRepairVariantR1(
      "standard",
      { ...FIREPROOF_ZONE_INJECTION_REPAIR_ACCEPTANCE_INPUT },
      {
        priceSnapshotIds: ["test-compatible-snapshot"],
        priceItems: [{
          price_key: "f09:sika_injection_201_ce_kit",
          unit_id: "set",
          currency_code: "KGS",
          unit_price: "100",
          snapshot_id: "test-compatible-snapshot",
        }],
      },
    );
    expect(priced.rows.find((entry) =>
      entry.row_id === "f09:fireproof_zone_injection_201_ce_kit"))
      .toMatchObject({ unit_price: "100", amount: "100" });
    expect(priced.priceSnapshotIds).toEqual(["test-compatible-snapshot"]);
  });

  test("exposes every supplied norm as a visible editable reference", () => {
    const professionalParameters = FIREPROOF_ZONE_INJECTION_REPAIR_PARAMETERS
      .filter((parameter) => parameter.truth_metadata.input_origin_class === "PROFESSIONAL_NORM");
    expect(professionalParameters.length).toBeGreaterThan(0);
    for (const parameter of professionalParameters) {
      expect(FIREPROOF_ZONE_INJECTION_REPAIR_PRELIMINARY_PROFILE)
        .toHaveProperty(parameter.parameter_id);
      expect(parameter.default_value).toBeNull();
      expect(parameter.truth_metadata).toMatchObject({
        visibility_role: "USER_INPUT",
        preliminary_compilation_allowed: true,
        hidden_default_forbidden: false,
      });
    }
  });

  test("keeps injection separate from coating, cleaning and hidden suffix factors", () => {
    const rows = JSON.stringify(FIREPROOF_ZONE_INJECTION_REPAIR_RESOURCES.map((row) => ({
      row_id: row.row_id,
      title_ru: row.title_ru,
      category: row.category,
    })));
    expect(rows).toMatch(/инъекц|пакер|насос|компрессор|отход/iu);
    expect(rows).toContain("fireproof_zone_injection_nipple_gripper");
    expect(rows).toContain("fireproof_zone_injection_battery_drill");
    expect(rows).not.toMatch(
      /paint_evrika|coating_application|fireproof_coating|surface_cleaning|strengthening/iu,
    );
    expect(JSON.stringify(FIREPROOF_ZONE_INJECTION_REPAIR_FORMULAS))
      .not.toMatch(/classification|area_factor|small_area_factor|golden_rate|normFactor/iu);
  });

  test("rejects identity substitution and scenarios outside exact source applicability", async () => {
    expect(() => resolveFireproofZoneInjectionRepairVariant("large_area"))
      .toThrow("FIREPROOF_ZONE_INJECTION_REPAIR_VARIANT_UNSUPPORTED");
    await expect(compileFireproofZoneInjectionRepairVariantR1(
      "standard",
      { ...FIREPROOF_ZONE_INJECTION_REPAIR_SHORT_INPUT },
      { catalogId: "canonical-work:base:unrelated_work_standard" },
    )).rejects.toThrow("FIREPROOF_ZONE_INJECTION_REPAIR_CATALOG_UNSUPPORTED");
    await expect(compileFireproofZoneInjectionRepairVariantR1("standard", {
      ...FIREPROOF_ZONE_INJECTION_REPAIR_SHORT_INPUT,
      repair_objective: "STRUCTURAL_BOND",
    })).rejects.toThrow("FIREPROOF_ZONE_INJECTION_REPAIR_SCENARIO_UNSUPPORTED");
    await expect(compileFireproofZoneInjectionRepairVariantR1("standard", {
      ...FIREPROOF_ZONE_INJECTION_REPAIR_SHORT_INPUT,
      hydrostatic_pressure_mode: "PRESENT",
    })).rejects.toThrow("FIREPROOF_ZONE_INJECTION_REPAIR_SCENARIO_UNSUPPORTED");
    await expect(compileFireproofZoneInjectionRepairVariantR1("standard", {
      ...FIREPROOF_ZONE_INJECTION_REPAIR_SHORT_INPUT,
      defect_mean_opening_mm: 0.2,
    })).rejects.toThrow("FIREPROOF_ZONE_INJECTION_REPAIR_CRACK_OPENING_UNSUPPORTED");
    await expect(compileFireproofZoneInjectionRepairVariantR1("standard", {
      ...FIREPROOF_ZONE_INJECTION_REPAIR_SHORT_INPUT,
      repair_zone_area_m2: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileFireproofZoneInjectionRepairVariantR1("standard", {
      ...FIREPROOF_ZONE_INJECTION_REPAIR_ACCEPTANCE_INPUT,
      use_injection_ac20: true,
      injection_ac20_dosage_percent: 1.5,
    })).rejects.toThrow("FIREPROOF_ZONE_INJECTION_REPAIR_AC20_DOSAGE_UNSUPPORTED");
    await expect(compileFireproofZoneInjectionRepairVariantR1("standard", {
      ...FIREPROOF_ZONE_INJECTION_REPAIR_ACCEPTANCE_INPUT,
      planned_injection_pressure_bar: 101,
    })).rejects.toThrow("FIREPROOF_ZONE_INJECTION_REPAIR_PRESSURE_EXCEEDS_PMAX");
  });
});
