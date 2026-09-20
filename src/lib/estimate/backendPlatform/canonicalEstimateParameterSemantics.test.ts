import {
  canonicalEstimateBlockingParameterIssues,
  canonicalEstimateParameterAllowsPreliminaryCompilation,
  canonicalEstimateParameterChangesPreliminaryEstimate,
  canonicalEstimateParameterChoiceLabelRu,
  canonicalEstimateParameterRequiresManagedProfessionalSource,
  isCanonicalEstimateConsumerSuppliedParameter,
  isCanonicalEstimateParameterRequiredForValues,
  isCanonicalEstimateSourceManagedParameter,
  isCanonicalEstimateUserEditableParameter,
} from "./canonicalEstimateParameterSemantics";

describe("canonical preliminary-stage validation", () => {
  it("matches compiler semantics for empty and legacy conditional objects", () => {
    const base = {
      parameterId: "productivity_m2_per_hour",
      titleRu: "Производительность",
      required: false,
      constraints: {},
    };
    expect(isCanonicalEstimateParameterRequiredForValues({
      ...base,
      requiredWhen: {},
    } as never, {})).toBe(false);
    expect(isCanonicalEstimateParameterRequiredForValues({
      ...base,
      requiredWhen: { parameterId: "method", equals: "MECHANIZED" },
    } as never, { method: "MECHANIZED" })).toBe(true);
    expect(isCanonicalEstimateParameterRequiredForValues({
      ...base,
      requiredWhen: { parameterId: "method", equals: "MECHANIZED" },
    } as never, { method: "MANUAL" })).toBe(false);
  });

  it("defers only admitted missing values and keeps conflicts blocking", () => {
    const schema = [{
      parameterId: "material_class",
      preliminaryCompilationAllowed: true,
    }, {
      parameterId: "area_m2",
      preliminaryCompilationAllowed: false,
    }] as never;
    const issues = [
      { code: "REQUIRED", parameterId: "material_class" },
      { code: "REQUIRED", parameterId: "area_m2" },
      { code: "GEOMETRY_CONFLICT", parameterId: "area_m2" },
    ];

    expect(canonicalEstimateBlockingParameterIssues(schema, issues)).toEqual([
      { code: "GEOMETRY_CONFLICT", parameterId: "area_m2" },
    ]);
  });

  it("does not let a legacy non-deferrable flag block the first estimate", () => {
    const schema = {
      parameterId: "approved_repair_method_designation",
      valueType: "text",
      visibilityRole: "USER_INPUT",
      valueSourceRole: "PROJECT_SPECIFIC_INPUT",
      formulaConsumers: [],
      resourceBranchConsumers: [],
      preliminaryCompilationAllowed: false,
    } as never;

    expect(canonicalEstimateParameterAllowsPreliminaryCompilation(schema)).toBe(true);
    expect(canonicalEstimateBlockingParameterIssues([schema], [
      { code: "REQUIRED", parameterId: "approved_repair_method_designation" },
    ])).toEqual([]);
  });
});

describe("canonical estimate parameter choice labels", () => {
  it("never exposes the internal bridge and asphalt enum codes", () => {
    expect(canonicalEstimateParameterChoiceLabelRu("waterproofing_condition", "ACCEPTED"))
      .toBe("Принято, ремонт не требуется");
    expect(canonicalEstimateParameterChoiceLabelRu("traffic_class", "VERY_HEAVY"))
      .toBe("Особо тяжёлая нагрузка");
    expect(canonicalEstimateParameterChoiceLabelRu("project_scope", "SURFACING_ONLY"))
      .toBe("Только покрытие по готовому основанию");
    expect(canonicalEstimateParameterChoiceLabelRu("laboratory_control", "contractor"))
      .toBe("Контроль выполняет подрядчик");
    expect(canonicalEstimateParameterChoiceLabelRu("future_parameter", "SOME_INTERNAL_CODE"))
      .toBe("Вариант по проектной документации");
  });

  it("shows distinct human labels for common concrete and foundation choices", () => {
    expect(canonicalEstimateParameterChoiceLabelRu("scope_variant", "full_reinforced_structure"))
      .toBe("Полное устройство железобетонной конструкции");
    expect(canonicalEstimateParameterChoiceLabelRu("scope_variant", "placement_only"))
      .toBe("Только укладка и уход за бетонной смесью");
    expect(canonicalEstimateParameterChoiceLabelRu("concrete_class", "B25"))
      .toBe("Бетон класса B25");
    expect(canonicalEstimateParameterChoiceLabelRu("watertightness", "W6"))
      .toBe("Водонепроницаемость W6");
    expect(canonicalEstimateParameterChoiceLabelRu("frost_resistance", "F150"))
      .toBe("Морозостойкость F150");
    expect(canonicalEstimateParameterChoiceLabelRu("mobility", "P4"))
      .toBe("Подвижность P4");
  });

  it("keeps calculation inputs on the first screen and defers document-only profile fields", () => {
    const base = {
      ordinal: 1,
      unitId: null,
      required: true,
      defaultValue: null,
      constraints: {},
      visibilityRole: "USER_INPUT" as const,
      valueSourceRole: "PROJECT_SPECIFIC_INPUT" as never,
      resourceBranchConsumers: ["main_concrete"],
    };
    const documentReference = {
      ...base,
      parameterId: "plan_volume_calculation_reference",
      titleRu: "Расчёт проектного объёма",
      valueType: "text" as const,
      formulaConsumers: [],
    };
    const width = {
      ...base,
      parameterId: "strip_width_m",
      titleRu: "Ширина ленты",
      valueType: "decimal" as const,
      formulaConsumers: ["concrete_volume"],
    };
    const optionalProfile = {
      ...base,
      parameterId: "product_profile_id",
      titleRu: "Правило заказа бетона",
      valueType: "enum" as const,
      required: false,
      formulaConsumers: [],
      constraints: { values: ["advanced_document_profile"] },
    };

    expect(canonicalEstimateParameterChangesPreliminaryEstimate(documentReference as never)).toBe(false);
    expect(canonicalEstimateParameterAllowsPreliminaryCompilation(documentReference as never)).toBe(true);
    expect(isCanonicalEstimateUserEditableParameter(documentReference as never)).toBe(false);
    expect(isCanonicalEstimateUserEditableParameter(width as never)).toBe(true);
    expect(isCanonicalEstimateUserEditableParameter(optionalProfile as never)).toBe(false);
  });
});

describe("canonical professional norm ownership", () => {
  it.each([
    ["machine_roller_productivity_m2_per_machine_hour", "Производительность катка"],
    ["repair_compound_kg_per_repair_m2", "Расход ремонтной смеси"],
    ["labor_productivity_m2_per_man_hour", "Норма трудозатрат"],
    ["drainage_excavation_m3_per_m", "Объём выемки на метр трассы"],
    ["laboratory_protocol_count", "Количество протоколов лаборатории"],
    ["quantity_first_layer_gypsum_board", "Количество листов"],
  ])("keeps %s source-managed even when a legacy passport says USER_INPUT", (parameterId, titleRu) => {
    const schema = {
      parameterId,
      titleRu,
      valueType: "decimal",
      visibilityRole: "USER_INPUT",
      valueSourceRole: "USER_INPUT",
      formulaConsumers: ["formula"],
      resourceBranchConsumers: ["row"],
      constraints: {},
    } as never;

    expect(canonicalEstimateParameterRequiresManagedProfessionalSource(schema)).toBe(true);
    expect(isCanonicalEstimateSourceManagedParameter(schema)).toBe(true);
    expect(isCanonicalEstimateConsumerSuppliedParameter(schema)).toBe(false);
  });

  it("keeps measured work geometry consumer-supplied", () => {
    const schema = {
      parameterId: "area_m2",
      titleRu: "Площадь работы",
      valueType: "decimal",
      visibilityRole: "USER_INPUT",
      valueSourceRole: "USER_INPUT",
      formulaConsumers: ["formula"],
      resourceBranchConsumers: ["row"],
      constraints: {},
    } as never;

    expect(canonicalEstimateParameterRequiresManagedProfessionalSource(schema)).toBe(false);
    expect(isCanonicalEstimateSourceManagedParameter(schema)).toBe(false);
    expect(isCanonicalEstimateConsumerSuppliedParameter(schema)).toBe(true);
  });
});
