import { buildProfessionalWorkPassportV2 } from "../../src/lib/estimate/buildProfessionalWorkPassportV2";
import { listProfessionalWorkPassportTemplateIds } from "../../src/lib/estimate/buildProfessionalWorkPassport";
import {
  adaptProfessionalWorkPassportV2ToV4,
  CATEGORY_UNIT_CONTRACT_V4,
  composeWorkSpecificQuestionsV4,
  convertEngineeringUnitV4,
  ENGINEERING_UNIT_REGISTRY_V4,
  getEngineeringUnitV4,
  PROFESSIONAL_ESTIMATE_V4_SCHEMA,
  validateCategoryUnitV4,
  validateFormulaDimensionsV4,
  V4_TRUTH_BLOCKER_KEYS,
  type WorkSpecificParameterSchemaV4,
} from "../../src/lib/estimate/v4";

describe("AI Estimate V4 Phase 0 contracts", () => {
  test("the engineering unit registry owns every required dimension and canonical conversion", () => {
    const requiredDimensions = [
      "dimensionless", "count", "length", "area", "volume", "mass", "time", "labor_time", "machine_time",
      "power", "energy", "pressure", "temperature", "flow", "density", "application_rate", "transport_distance",
      "transport_work", "package", "service", "test", "document", "currency", "currency_per_unit",
    ];
    expect(new Set(ENGINEERING_UNIT_REGISTRY_V4.map((unit) => unit.dimension))).toEqual(new Set(requiredDimensions));
    expect(convertEngineeringUnitV4(1000, "mm", "m")).toBe(1);
    expect(convertEngineeringUnitV4(1, "t", "kg")).toBe(1000);
    expect(convertEngineeringUnitV4(20, "degC", "degC")).toBe(20);
    expect(getEngineeringUnitV4("arbitrary-passport-string")).toBeNull();
  });

  test("dimensional validation proves valid engineering formulas", () => {
    expect(validateFormulaDimensionsV4({
      expression: "length_m * width_m",
      input_unit_ids: { length_m: "m", width_m: "m" },
      output_unit_id: "m2",
    }).ok).toBe(true);
    expect(validateFormulaDimensionsV4({
      expression: "area_m2 * thickness_m",
      input_unit_ids: { area_m2: "m2", thickness_m: "m" },
      output_unit_id: "m3",
    }).ok).toBe(true);
    expect(validateFormulaDimensionsV4({
      expression: "area_m2 * thickness_m * density",
      input_unit_ids: { area_m2: "m2", thickness_m: "m", density: "t_m3" },
      output_unit_id: "t",
    }).ok).toBe(true);
    expect(validateFormulaDimensionsV4({
      expression: "area_m2 * application_rate",
      input_unit_ids: { area_m2: "m2", application_rate: "l_m2" },
      output_unit_id: "l",
    }).ok).toBe(true);
  });

  test("dimensional validation emits the required blocker vocabulary", () => {
    const mismatch = validateFormulaDimensionsV4({
      expression: "length_m * width_m",
      input_unit_ids: { length_m: "m", width_m: "m" },
      output_unit_id: "m3",
    });
    expect(mismatch.blockers).toContain("FORMULA_DIMENSION_MISMATCH");

    const missing = validateFormulaDimensionsV4({
      expression: "area_m2 * thickness_m",
      input_unit_ids: { area_m2: "m2", thickness_m: null },
      output_unit_id: "m3",
    });
    expect(missing.blockers).toEqual(expect.arrayContaining(["PARAMETER_UNIT_MISSING", "FORMULA_INPUT_DIMENSION_UNKNOWN"]));

    const unconverted = validateFormulaDimensionsV4({
      expression: "length_m",
      input_unit_ids: { length_m: "meter" },
      output_unit_id: "m",
    });
    expect(unconverted.blockers).toContain("UNCONVERTED_UNIT");
  });

  test("category-unit contract rejects semantic category errors", () => {
    expect(validateCategoryUnitV4({ category: "labor", unit_id: "man_hour" }).ok).toBe(true);
    expect(validateCategoryUnitV4({ category: "machinery", unit_id: "machine_hour" }).ok).toBe(true);
    expect(validateCategoryUnitV4({ category: "labor", unit_id: "m2" }).blockers).toContain("CATEGORY_UNIT_MISMATCH");
    expect(Object.keys(CATEGORY_UNIT_CONTRACT_V4)).toHaveLength(12);
  });

  test("V2 adapter is non-destructive and never claims native V4 truth", () => {
    const templateId = listProfessionalWorkPassportTemplateIds()[0];
    const v2 = buildProfessionalWorkPassportV2(templateId);
    expect(v2).not.toBeNull();
    const before = JSON.stringify(v2);
    const v4 = adaptProfessionalWorkPassportV2ToV4(v2!);
    expect(JSON.stringify(v2)).toBe(before);
    expect(v4.schema_version).toBe(PROFESSIONAL_ESTIMATE_V4_SCHEMA);
    expect(v4.identity.stable_work_id).toBe(templateId);
    expect(v4.status).toBe("V2_COMPATIBILITY_GAPS_RECORDED");
    expect(v4.inheritance.work_specific_overlay_id).toBeNull();
    expect(v4.unresolved_requirements).toContain("missing_work_specific_overlay");
    expect(v4.boq_rows).toHaveLength(v4.formulas.length);
    expect(v4.deterministic_hash).toMatch(/^eh_[0-9a-f]{16}$/);
  });

  test("question composer respects facts, necessity, controls and a bounded initial budget", () => {
    const schema: WorkSpecificParameterSchemaV4 = {
      schema_id: "asphalt:test:v4",
      schema_version: "WorkSpecificParameterSchemaV4",
      owner_work_id: "asphalt_concrete_pavement",
      owner_family_id: "road_construction",
      compatibility_source: "native_v4",
      question_budget: { initial_maximum: 3, hard_maximum: 5 },
      mutually_exclusive_input_groups: [],
      parameters: [
        {
          parameter_id: "asphalt:area", canonical_key: "area_m2", owner_work_id: "asphalt_concrete_pavement", owner_family_id: "road_construction",
          professional_name_ru: "Площадь покрытия", user_help_ru: "Определяет все объёмы покрытия.", input_kind: "quantity", data_type: "number",
          necessity: "critical", dimension: "area", canonical_unit_id: "m2", display_unit_ids: ["m2"], choices: [], range: { minimum: 1, maximum: null },
          step: 0.01, precision: 2, example_ru: "Например: 1000 м²", default_value: null, default_source: null, required_condition: "always",
          applicability_condition: "always", formula_dependencies: [], affected_row_ids: ["asphalt_mix"], specification_bindings: [], price_binding_keys: [], provenance: "native_v4", confidence: "high",
          validation_message_ru: "Введите площадь.", missing_value_consequence_ru: "Расчёт количества заблокирован.", assumption_when_missing_ru: null, internal_only: false,
        },
        {
          parameter_id: "asphalt:thickness", canonical_key: "asphalt_thickness_mm", owner_work_id: "asphalt_concrete_pavement", owner_family_id: "road_construction",
          professional_name_ru: "Толщина верхнего слоя асфальтобетона", user_help_ru: "Определяет массу смеси.", input_kind: "quantity", data_type: "number",
          necessity: "recommended", dimension: "length", canonical_unit_id: "mm", display_unit_ids: ["mm", "cm"], choices: [], range: { minimum: 20, maximum: 150 },
          step: 1, precision: 0, example_ru: "Например: 50 мм", default_value: null, default_source: null, required_condition: "when_asphalt_layer_applicable",
          applicability_condition: "asphalt_layer_applicable", formula_dependencies: [], affected_row_ids: ["asphalt_mix"], specification_bindings: [], price_binding_keys: [], provenance: "native_v4", confidence: "high",
          validation_message_ru: "Введите толщину.", missing_value_consequence_ru: "Смета останется предварительной.", assumption_when_missing_ru: "Требуется подтверждённое допущение.", internal_only: false,
        },
        {
          parameter_id: "asphalt:condition", canonical_key: "existing_surface_condition", owner_work_id: "asphalt_concrete_pavement", owner_family_id: "road_construction",
          professional_name_ru: "Состояние существующего покрытия", user_help_ru: "Определяет необходимость фрезерования.", input_kind: "enum", data_type: "selection",
          necessity: "optional", dimension: null, canonical_unit_id: null, display_unit_ids: [], choices: [{ value: "unknown", label_ru: "Неизвестно" }], range: null,
          step: null, precision: null, example_ru: "Например: колейность", default_value: null, default_source: null, required_condition: "not_required",
          applicability_condition: "existing_surface_present", formula_dependencies: [], affected_row_ids: ["milling"], specification_bindings: [], price_binding_keys: [], provenance: "native_v4", confidence: "high",
          validation_message_ru: "Выберите состояние.", missing_value_consequence_ru: "Фрезерование не включается автоматически.", assumption_when_missing_ru: null, internal_only: false,
        },
      ],
    };
    const composition = composeWorkSpecificQuestionsV4({
      schema,
      facts: [{ fact_id: "fact:area", parameter_id: "asphalt:area", value: 1000, unit_id: "m2", provenance: "user_confirmed", confirmed: true, source_reference: null, confidence: "high" }],
    });
    expect(composition.understood_fact_parameter_ids).toEqual(["asphalt:area"]);
    expect(composition.questions.map((question) => question.parameter_id)).toEqual(["asphalt:thickness", "asphalt:condition"]);
    expect(composition.questions[0].display_units.map((unit) => unit.symbol)).toEqual(["мм", "см"]);
    expect(composition.questions[1].input_kind).toBe("enum");
    expect(composition.questions).toHaveLength(2);
  });

  test("the catalog and blocker vocabulary are frozen for the five Phase 0 truth ledgers", () => {
    expect(listProfessionalWorkPassportTemplateIds()).toHaveLength(11610);
    expect(V4_TRUTH_BLOCKER_KEYS).toEqual(expect.arrayContaining([
      "missing_work_specific_overlay",
      "formula_dimension_mismatch",
      "synthetic_quantity",
      "generic_padding_row",
      "missing_explanation_trace",
    ]));
    expect(new Set(V4_TRUTH_BLOCKER_KEYS).size).toBe(V4_TRUTH_BLOCKER_KEYS.length);
  });
});
