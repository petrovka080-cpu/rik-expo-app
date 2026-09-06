import {
  REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT as COMPATIBILITY_PASSPORT,
  STRIP_FOUNDATION_FORMULAS as COMPATIBILITY_FORMULAS,
  STRIP_FOUNDATION_INPUTS as COMPATIBILITY_INPUTS,
  STRIP_FOUNDATION_ROWS as COMPATIBILITY_ROWS,
} from "../../scripts/estimate/concreteBackendR6/reinforcedConcreteStripFoundationR1";
import { calculateExpandedComplexEstimate } from "../../src/lib/ai/expandedComplexWorks";
import {
  buildProfessionalWorkPassport,
  listProfessionalWorkPassportTemplateIds,
} from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { buildProfessionalWorkPassportV2 } from "../../src/lib/estimate/buildProfessionalWorkPassportV2";
import {
  REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT,
  STRIP_FOUNDATION_FORMULAS,
  STRIP_FOUNDATION_INPUTS,
  STRIP_FOUNDATION_ROWS,
} from "../../src/lib/estimate/v4/reinforcedConcreteStripFoundationR1";

const TEMPLATE_ID = "strip_foundation_preliminary_boq_expanded_complex_v1";
const WRONG_BUILDING_FINGERPRINTS = [
  "Здания и жилые комплексы",
  "Несущий каркас",
  "Ограждающие конструкции / фасад",
  "Общестроительные работы каркаса",
  "highRiseBuildingCalculator",
];

describe("R4-A10 canonical strip-foundation catalog passport", () => {
  test("fails the legacy expanded-complex ingress closed instead of compiling a high-rise building", () => {
    const estimate = calculateExpandedComplexEstimate({
      prompt: "устройство ленточного фундамента 100 метров длина и 20 метров ширина",
      familyId: "strip_foundation",
    });
    expect(estimate).toMatchObject({
      work_family_id: "strip_foundation",
      professionalNameRu: "Устройство монолитного железобетонного ленточного фундамента",
      calculatorId: "stripFoundationCanonicalBackendHandoff",
      estimate_level: "NEEDS_INPUT",
      input_parameters: {
        source_length_mention_m: 100,
        source_width_mention_m: 20,
        total_axis_length_m: null,
        strip_width_m: null,
        strip_height_m: null,
        canonical_backend_handoff_required: true,
      },
    });
    expect([
      ...(estimate?.material_rows ?? []),
      ...(estimate?.work_rows ?? []),
      ...(estimate?.equipment_rows ?? []),
      ...(estimate?.service_rows ?? []),
    ]).toEqual([]);
    const serialized = JSON.stringify(estimate);
    for (const fingerprint of WRONG_BUILDING_FINGERPRINTS.slice(1)) expect(serialized).not.toContain(fingerprint);
  });

  test("keeps the historical tooling path as a re-export of the shared product owner", () => {
    expect(COMPATIBILITY_PASSPORT).toBe(REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT);
    expect(COMPATIBILITY_INPUTS).toBe(STRIP_FOUNDATION_INPUTS);
    expect(COMPATIBILITY_FORMULAS).toBe(STRIP_FOUNDATION_FORMULAS);
    expect(COMPATIBILITY_ROWS).toBe(STRIP_FOUNDATION_ROWS);
  });

  test("replaces the high-rise fallback with the 46/28/39 canonical backend definition", () => {
    const passport = buildProfessionalWorkPassport(TEMPLATE_ID);
    expect(passport).not.toBeNull();
    expect(STRIP_FOUNDATION_INPUTS).toHaveLength(46);
    expect(STRIP_FOUNDATION_FORMULAS).toHaveLength(28);
    expect(STRIP_FOUNDATION_ROWS).toHaveLength(39);
    expect(passport).toMatchObject({
      localizedNameRu: "Устройство монолитного железобетонного ленточного фундамента",
      workKey: "strip_foundation",
      familyId: "strip_foundation",
      contentPack: {
        calculatorId: "r6-concrete:reinforced-concrete-strip-foundation",
      },
    });
    expect(passport?.boqRecipe.rowCount).toBe(39);
    expect(passport?.boqRecipe.requiredRowTypes).toEqual([
      "equipment",
      "material",
      "transport",
      "work",
    ]);
    expect(passport?.boqRecipe.allRows).toEqual(expect.arrayContaining([
      expect.objectContaining({ rowId: "excavation_work", rowType: "work", canonicalUnit: "m3" }),
      expect.objectContaining({ rowId: "reinforcement", rowType: "material", canonicalUnit: "t" }),
      expect.objectContaining({ rowId: "concrete_pump", rowType: "equipment", canonicalUnit: "machine_hour" }),
      expect.objectContaining({ rowId: "excavated_soil_disposal", rowType: "transport", canonicalUnit: "t_km" }),
      expect.objectContaining({ rowId: "concrete_delivery", rowType: "transport", canonicalUnit: "m3_km" }),
    ]));
    const serialized = JSON.stringify(passport);
    for (const fingerprint of WRONG_BUILDING_FINGERPRINTS) expect(serialized).not.toContain(fingerprint);
  });

  test("uses the same shared owner at every selectable estimate level", () => {
    const templateIds = listProfessionalWorkPassportTemplateIds()
      .filter((templateId) => templateId.startsWith("strip_foundation_"));
    expect(templateIds).toHaveLength(5);
    for (const templateId of templateIds) {
      const passport = buildProfessionalWorkPassportV2(templateId);
      expect(passport).toMatchObject({
        identity: {
          canonical_name_ru: "Устройство монолитного железобетонного ленточного фундамента",
          calculator_id: "r6-concrete:reinforced-concrete-strip-foundation",
        },
        validation: {
          status: "SOFTWARE_SEALED_READY_FOR_EXPERT_REVIEW",
          blockers: [],
        },
      });
      expect(passport?.quantity_formulas).toHaveLength(39);
      const serialized = JSON.stringify(passport);
      for (const fingerprint of WRONG_BUILDING_FINGERPRINTS) expect(serialized).not.toContain(fingerprint);
    }
  });

  test("exposes typed technological questions and condition dependencies without building defaults", () => {
    const passport = buildProfessionalWorkPassportV2(TEMPLATE_ID);
    expect(passport?.validation).toMatchObject({
      status: "SOFTWARE_SEALED_READY_FOR_EXPERT_REVIEW",
      blockers: [],
    });
    expect(passport?.parameter_graph.p0_required).toEqual([
      "strip_height_m",
      "total_axis_length_m",
      "strip_width_m",
    ]);
    expect(passport?.parameter_graph.parameters).toEqual(expect.arrayContaining([
      expect.objectContaining({
        canonical_key: "scope_variant",
        input_type: "select",
        allowed_values: ["full_reinforced_structure", "placement_only"],
      }),
      expect.objectContaining({ canonical_key: "groundworks_included", input_type: "boolean" }),
      expect.objectContaining({
        canonical_key: "excavation_volume_m3",
        input_type: "number",
        dependencies: expect.arrayContaining(["groundworks_included", "scope_variant"]),
      }),
    ]));
    const parameterKeys = passport?.parameter_graph.parameters.map((parameter) => parameter.canonical_key) ?? [];
    expect(parameterKeys).not.toEqual(expect.arrayContaining(["area_m2", "floors", "structural_concrete_m3"]));
    expect(passport).toMatchObject({
      material_assemblies: expect.arrayContaining([expect.objectContaining({ material_code: "main_concrete" })]),
      work_operations: expect.arrayContaining([expect.objectContaining({ operation_code: "concrete_placement" })]),
      equipment: expect.arrayContaining([expect.objectContaining({ equipment_code: "concrete_pump" })]),
      services: expect.arrayContaining([expect.objectContaining({ service_code: "concrete_delivery" })]),
    });
  });
});
