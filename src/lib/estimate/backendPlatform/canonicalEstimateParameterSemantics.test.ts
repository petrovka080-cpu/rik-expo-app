import choicePack0 from "../../../../data/estimate-benchmarks/source-packs/steel-water-dn15-partial-labour-only-krer16-002-01-r2.json";
import choicePack1 from "../../../../data/estimate-benchmarks/source-packs/galvanized-round-duct200-normal-krer20-001-01-quantity-r1.json";
import choicePack2 from "../../../../data/estimate-benchmarks/source-packs/foundation-side-hot-bitumen-two-coats-krer08-003-07-r1.json";
import choicePack3 from "../../../../data/estimate-benchmarks/source-packs/facade-flashings-with-downpipes-krer12-008-01-quantity-r1.json";
import choicePack4 from "../../../../data/estimate-benchmarks/source-packs/foundation-rubble-side-preparation-krer08-003-08-r1.json";
import choicePack5 from "../../../../data/estimate-benchmarks/source-packs/manual-backfill-soil1-krer01-061-01-quantity-r1.json";
import choicePack6 from "../../../../data/estimate-benchmarks/source-packs/ceramic-skirting-m150-krer11-039-04-completion-r1.json";
import choicePack7 from "../../../../data/estimate-benchmarks/source-packs/vent-pitot-port-caps-project-p-reference-r1.json";
import choicePack8 from "../../../../data/estimate-benchmarks/source-packs/floor-sand-small-room-straightedge-spkr65-r1.json";
import {
  canonicalEstimateBlockingParameterIssues,
  canonicalEstimateParameterAllowsPreliminaryCompilation,
  canonicalEstimateParameterChangesPreliminaryEstimate,
  canonicalEstimateParameterChoiceLabelRu,
  canonicalEstimateParameterRequiresManagedProfessionalSource,
  isCanonicalEstimateConsumerSuppliedParameter,
  isCanonicalEstimateOptionalProjectNumericResourceFact,
  isCanonicalEstimateParameterRequiredForValues,
  isCanonicalEstimateSourceManagedParameter,
  isCanonicalEstimateUserEditableParameter,
  isCanonicalEstimateVisibleReplaceableProfile,
  isCanonicalEstimateVisibleUserResourceSelectionParameter,
} from "./canonicalEstimateParameterSemantics";

describe("schema-owned facts are independent of presentation", () => {
  const fact = {
    parameterId: "construction_scope_conditions", semanticParameterKey: "work:construction_scope_conditions",
    titleRu: "Условия участка", ordinal: 1, valueType: "enum", unitId: null,
    visibilityRole: "USER_INPUT", valueSourceRole: "PROJECT_SPECIFIC_INPUT", required: false,
    defaultValue: null, constraints: { values: ["own", "hired"] }, formulaConsumers: [], resourceBranchConsumers: ["machine"],
    provenance: { consumer_input_role_v1: "OBJECT_FACT" },
    guide: { guideKind: "PROJECT_DEFINED", guideValidationPolicy: "MANDATORY_BLOCK", sourceRole: "PROJECT_DOCUMENTATION",
      sourceDocument: "bound-project", sourceLocator: "Actual object conditions", sourceSnapshotHash: "a".repeat(64) },
  };
  it.each(["Нормальные условия строительства", "Расход времени выбранного механизма", "Количество: условия участка", "Выбор = собственные механизмы"])(
    "keeps optional resource choice ownership and requiredness after renaming to %s", titleRu => {
      const schema = { ...fact, titleRu } as never;
      expect(isCanonicalEstimateConsumerSuppliedParameter(schema)).toBe(true);
      expect(isCanonicalEstimateSourceManagedParameter(schema)).toBe(false);
      expect(canonicalEstimateParameterChangesPreliminaryEstimate(schema)).toBe(true);
      expect(isCanonicalEstimateParameterRequiredForValues(schema, {})).toBe(false);
    },
  );
  it("uses the same bound project guide for passports predating the role tag", () => {
    expect(isCanonicalEstimateConsumerSuppliedParameter({ ...fact, provenance: undefined, titleRu: "Нормальные условия" } as never)).toBe(true);
  });
  it.each(["MANDATORY_NORM_VALUE", "UNRESOLVED_APPLICATION_NORM", "MANUFACTURER_CONFIRMED", "SELECTED_EQUIPMENT_PASSPORT", "BACKEND_DERIVED"])(
    "a conflicting OBJECT_FACT tag cannot expose %s", valueSourceRole => {
      const schema = { ...fact, valueSourceRole, titleRu: "Площадь объекта" } as never;
      expect(isCanonicalEstimateConsumerSuppliedParameter(schema)).toBe(false);
      expect(isCanonicalEstimateVisibleUserResourceSelectionParameter(schema)).toBe(false);
      expect(isCanonicalEstimateSourceManagedParameter(schema)).toBe(true);
    },
  );
  it.each([
    { visibilityRole: "USER_DERIVED_READONLY" }, { visibilityRole: "INTERNAL_ONLY" },
    { provenance: { consumer_input_role_v1: "APPLICATION_TECHNICAL" } },
    { parameterId: "quantity_material" }, { parameterId: "unit_price_material" }, { parameterId: "qty_material_per_output" },
    { guide: { ...fact.guide, guideKind: "DERIVED_VALUE_RULE" } },
    { guide: { ...fact.guide, sourceRole: "MANUFACTURER_CONFIRMED" } },
  ])("preserves protected schema/ID/guide ownership (%p)", patch => {
    const schema = { ...fact, ...patch } as never;
    expect(isCanonicalEstimateConsumerSuppliedParameter(schema)).toBe(false);
    expect(isCanonicalEstimateSourceManagedParameter(schema)).toBe(true);
  });
  it.each([
    { guide: undefined }, { guide: { ...fact.guide, sourceSnapshotHash: "missing" } },
    { semanticParameterKey: undefined }, { formulaConsumers: [], resourceBranchConsumers: [] },
    { parameterId: "labor_productivity_m2_per_man_hour" },
  ])("does not use an OBJECT_FACT tag alone to override the legacy norm guard (%p)", patch => {
    expect(isCanonicalEstimateConsumerSuppliedParameter({ ...fact, ...patch, titleRu: "Норма расхода" } as never)).toBe(false);
  });
});

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

  it("collects only explicitly mandatory primary facts before compilation", () => {
    const schema = {
      parameterId: "flt_filter_cell_count",
      valueType: "integer",
      visibilityRole: "USER_INPUT",
      valueSourceRole: "USER_INPUT",
      preliminaryCompilationAllowed: false,
      guide: {
        guideValidationPolicy: "MANDATORY_BLOCK",
        sourceRole: "USER_SUPPLIED_PRIMARY_FACT",
      },
    } as never;

    expect(canonicalEstimateParameterAllowsPreliminaryCompilation(schema)).toBe(false);
    expect(canonicalEstimateBlockingParameterIssues([schema], [
      { code: "REQUIRED", parameterId: "flt_filter_cell_count" },
    ])).toEqual([
      { code: "REQUIRED", parameterId: "flt_filter_cell_count" },
    ]);
  });
});

describe("canonical estimate parameter choice labels", () => {
  it("distinguishes all concrete curing methods and their supply decisions", () => {
    const methods = ["WATER_CURING", "WET_COVERING", "IMPERVIOUS_SHEET", "MEMBRANE_CURING_COMPOUND"];
    const labels = methods.map(value => canonicalEstimateParameterChoiceLabelRu("approved_external_curing_method", value));
    expect(new Set(labels).size).toBe(methods.length);
    expect(labels).not.toContain("Вариант по проектной документации");
    expect(labels).toEqual([
      "Увлажнение бетона водой", "Укрытие влажным материалом",
      "Укрытие водонепроницаемой плёнкой", "Нанесение плёнкообразующего состава",
    ]);
    expect(canonicalEstimateParameterChoiceLabelRu("curing_water_delivery_mode", "ON_SITE_SUPPLY"))
      .not.toEqual(canonicalEstimateParameterChoiceLabelRu("curing_water_delivery_mode", "SEPARATE_DELIVERY"));
    expect(canonicalEstimateParameterChoiceLabelRu("curing_material_accessories_pricing_mode", "INCLUDED_IN_CURING_MATERIAL_RATE"))
      .not.toEqual(canonicalEstimateParameterChoiceLabelRu("curing_material_accessories_pricing_mode", "SEPARATE_SUPPLY"));
  });
  it("identifies the actual third-coat scope and selected CT127 source version", () => {
    expect(canonicalEstimateParameterChoiceLabelRu("putty_scope", "THIRD_COAT_PREPARED_MINERAL_WALL"))
      .toBe("Третье финишное нанесение по подготовленной минеральной стене");
    expect(canonicalEstimateParameterChoiceLabelRu("ct127_delivered_version", "CT127_EN_GL_0120"))
      .toBe("Ceresit CT 127, технический лист en GL 01.2020");
    expect(canonicalEstimateParameterChoiceLabelRu("ct127_delivered_version", "CT127_UNKNOWN_VERSION"))
      .toBe("Вариант по проектной документации");
  });
  it("distinguishes preliminary facts, repair and application branches in the wall editor", () => {
    const choices = [
      ["applicability_mode", "PRELIMINARY_PROFILE", "CONFIRMED_PROJECT_FACTS"],
      ["mineral_repair_mode", "SURVEY_PENDING", "CT29_REQUIRED"],
      ["paint_application_mode", "MANUAL_ROLLER_BRUSH", "PAID_SPRAY_EQUIPMENT"],
      ["paint_priming_mode", "CT17_UNDILUTED", "CT17_DILUTED_1_TO_1"],
    ];
    for (const [parameterId, first, second] of choices) {
      const labels = [first, second].map(value => canonicalEstimateParameterChoiceLabelRu(parameterId, value));
      expect(labels[0]).not.toEqual(labels[1]);
      expect(labels).not.toContain("Вариант по проектной документации");
    }
  });

  it("never exposes the internal bridge and asphalt enum codes", () => {
    expect(canonicalEstimateParameterChoiceLabelRu("c111_insulation_mode", "AKUSTIKNAUF_50"))
      .toBe("АкустиКНАУФ 50 мм, упаковка 12 м²");
    expect(canonicalEstimateParameterChoiceLabelRu("c111_insulation_mode", "NONE"))
      .toBe("Без изоляции, если допустимо по проекту");
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
    expect(canonicalEstimateParameterChoiceLabelRu("delivery_pricing_mode", "SEPARATE"))
      .toBe("Доставка отдельной строкой");
    expect(canonicalEstimateParameterChoiceLabelRu("delivery_pricing_mode", "INCLUDED_IN_SUPPLY"))
      .toBe("Доставка включена в поставку");
    expect(canonicalEstimateParameterChoiceLabelRu("construction_joint_mode", "NONE"))
      .toBe("Не требуется");
    expect(canonicalEstimateParameterChoiceLabelRu("construction_joint_mode", "WATERSTOP"))
      .toBe("Рабочий шов с гидрошпонкой");
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

describe("optional actual project numeric resource facts", () => {
  const projectPlan = {
    parameterId: "qa_interval_m2_per_test", titleRu: "План контроля; не норма по варианту зоны",
    valueType: "decimal", required: false, visibilityRole: "USER_INPUT", valueSourceRole: "CONDITIONAL_PROJECT_FACT",
    constraints: { min: 0.000001 }, formulaConsumers: ["qa-formula"], resourceBranchConsumers: ["qa-row"],
    guide: { guideKind: "PROJECT_DEFINED", guideValidationPolicy: "MANDATORY_BLOCK", sourceRole: "PROJECT_DOCUMENTATION",
      sourceDocument: "approved-method", sourceLocator: "QA plan", sourceSnapshotHash: "a".repeat(64) },
  };
  it("admits a checked project plan without treating its title as a published norm", () => {
    expect(isCanonicalEstimateOptionalProjectNumericResourceFact(projectPlan as never)).toBe(true);
    expect(isCanonicalEstimateConsumerSuppliedParameter(projectPlan as never)).toBe(true);
  });
  it.each(["Количество: площадь на один контроль", "План контроля = заданный проектом"])(
    "keeps the existing bounded optional actual-rate exception title-neutral: %s", titleRu => {
      const schema = { ...projectPlan, titleRu } as never;
      expect(isCanonicalEstimateOptionalProjectNumericResourceFact(schema)).toBe(true);
      expect(isCanonicalEstimateConsumerSuppliedParameter(schema)).toBe(true);
      expect(isCanonicalEstimateSourceManagedParameter(schema)).toBe(false);
    },
  );
  it.each([
    { guide: { ...projectPlan.guide, sourceSnapshotHash: "" } },
    { guide: { ...projectPlan.guide, sourceDocument: "" } },
    { guide: { ...projectPlan.guide, sourceLocator: "" } },
    { guide: { ...projectPlan.guide, sourceRole: "USER_INPUT" } },
    { formulaConsumers: [] }, { resourceBranchConsumers: [] },
    { valueSourceRole: "MANUFACTURER_CONFIRMED" },
    { valueSourceRole: "MANDATORY_NORM_VALUE" },
    { visibilityRole: "INTERNAL_ONLY" }, { parameterId: "quantity_qa_checks" },
  ])("keeps incomplete, protected and derived passports outside scalar user admission (%p)", patch => {
    const schema = { ...projectPlan, ...patch } as never;
    expect(isCanonicalEstimateOptionalProjectNumericResourceFact(schema)).toBe(false);
    expect(isCanonicalEstimateConsumerSuppliedParameter(schema)).toBe(false);
  });
});

describe("canonical professional norm ownership", () => {
  const conditionalResourceChoice = {
    parameterId: "selected_granular_product", titleRu: "Выбранный зернистый материал", ordinal: 0,
    valueType: "text" as const, required: false, defaultValue: null, unitId: null,
    visibilityRole: "USER_INPUT" as const, valueSourceRole: "CONDITIONAL_PROJECT_FACT" as const,
    formulaConsumers: [], resourceBranchConsumers: ["selected_material_order"],
    constraints: { requiredWhen: { kind: "equals", parameterId: "method", value: "selected" } },
  };
  it("admits an explicitly owned conditional resource choice without making its condition true", () => {
    expect(isCanonicalEstimateVisibleUserResourceSelectionParameter(conditionalResourceChoice)).toBe(true);
    expect(isCanonicalEstimateParameterRequiredForValues(conditionalResourceChoice, { method: "other" })).toBe(false);
    expect(isCanonicalEstimateParameterRequiredForValues(conditionalResourceChoice, {})).toBe(false);
    expect(isCanonicalEstimateParameterRequiredForValues(conditionalResourceChoice, { method: "selected" })).toBe(true);
  });
  const mandatoryProjectReference = {
    ...conditionalResourceChoice, parameterId: "material_compatibility_reference", titleRu: "Выбранное проектное условие совместимости материала",
    preliminaryCompilationAllowed: false,
    guide: { guideKind: "PROJECT_DEFINED", guideValidationPolicy: "MANDATORY_BLOCK" } as never,
  };
  const boundProjectReference = {
    ...mandatoryProjectReference, titleRu: "Подтверждённая совместимость и полный расход выбранного материала по документу проекта",
    constraints: { ...mandatoryProjectReference.constraints, minLength: 1, maxLength: 1000 },
    guide: { guideKind: "PROJECT_DEFINED", guideValidationPolicy: "MANDATORY_BLOCK", sourceRole: "PROJECT_DOCUMENTATION",
      sourceDocument: "Owned project specification", sourceLocator: "Actual project procedure/material paragraph", sourceSnapshotHash: "a".repeat(64) } as never,
  };
  it("keeps an immutable bounded project reference editable when its human title mentions consumption", () => {
    expect(isCanonicalEstimateSourceManagedParameter(boundProjectReference)).toBe(false);
    expect(isCanonicalEstimateVisibleUserResourceSelectionParameter(boundProjectReference)).toBe(true);
  });
  it("keeps owned actual rates and source references editable when missing facts defer to original row needs", () => {
    const reference = { ...boundProjectReference, preliminaryCompilationAllowed: true };
    expect(isCanonicalEstimateVisibleUserResourceSelectionParameter(reference)).toBe(true);
    expect(isCanonicalEstimateSourceManagedParameter(reference)).toBe(false);
    const rate = { ...reference, parameterId: "actual_machine_hours_per_m3", titleRu: "Фактические часы выбранного комплекта на м³", valueType: "decimal" as const,
      constraints: { requiredWhen: { kind: "equals", parameterId: "method", value: "selected" }, min: 0 }, formulaConsumers: ["actual_equipment_hours"], unitId: "machine_hour_per_m3" };
    expect(isCanonicalEstimateUserEditableParameter(rate)).toBe(true);
    expect(isCanonicalEstimateConsumerSuppliedParameter(rate)).toBe(true);
    expect(isCanonicalEstimateVisibleUserResourceSelectionParameter(rate)).toBe(true);
    expect(canonicalEstimateParameterAllowsPreliminaryCompilation(rate)).toBe(true);
    expect(canonicalEstimateBlockingParameterIssues([rate], [{ parameterId: rate.parameterId, code: "REQUIRED" },
      { parameterId: rate.parameterId, code: "RANGE" }])).toEqual([{ parameterId: rate.parameterId, code: "RANGE" }]);
    const physical = { ...rate, parameterId: "actual_elements_per_ring", titleRu: "Фактические элементы выбранного кольца", valueType: "integer" as const,
      valueSourceRole: "PROJECT_SPECIFIC_INPUT" as const, required: true, constraints: { min: 1 } };
    expect(isCanonicalEstimateConsumerSuppliedParameter(physical)).toBe(true);
    for (const protectedRole of ["MANDATORY_NORM_VALUE", "MANUFACTURER_CONFIRMED", "SELECTED_EQUIPMENT_PASSPORT", "BACKEND_DERIVED"] as const) {
      expect(isCanonicalEstimateConsumerSuppliedParameter({ ...rate, valueSourceRole: protectedRole })).toBe(false);
    }
    expect(isCanonicalEstimateConsumerSuppliedParameter({ ...rate, visibilityRole: "INTERNAL_ONLY" })).toBe(false);
  });
  it.each([
    { valueSourceRole: "MANUFACTURER_CONFIRMED" as const }, { valueSourceRole: "MANDATORY_NORM_VALUE" as const },
    { valueSourceRole: "SELECTED_EQUIPMENT_PASSPORT" as const }, { valueSourceRole: "BACKEND_DERIVED" as const },
    { visibilityRole: "INTERNAL_ONLY" as const }, { resourceBranchConsumers: [] },
    { constraints: { ...boundProjectReference.constraints, maxLength: 1001 } },
    { guide: { ...(boundProjectReference.guide as object), sourceRole: "PRIMARY_SOURCE_NORM" } as never },
    { guide: { ...(boundProjectReference.guide as object), sourceSnapshotHash: "missing" } as never },
  ])("a consumption-related reference cannot bypass protected ownership or unbound metadata: %j", patch => {
    expect(isCanonicalEstimateVisibleUserResourceSelectionParameter({ ...boundProjectReference, ...patch })).toBe(false);
  });
  it.each(["material_compatibility_reference", "selected_technology_document", "project_material_approval", "project_material_selection"])(
    "admits a real mandatory project resource gate from metadata regardless of name %s", parameterId => {
      const schema = { ...mandatoryProjectReference, parameterId };
      expect(isCanonicalEstimateVisibleUserResourceSelectionParameter(schema)).toBe(true);
      expect(isCanonicalEstimateParameterRequiredForValues(schema, { method: "other" })).toBe(false);
      expect(isCanonicalEstimateParameterRequiredForValues(schema, { method: "selected" })).toBe(true);
    },
  );
  it.each([
    { visibilityRole: "INTERNAL_ONLY" as const }, { valueSourceRole: "MANUFACTURER_CONFIRMED" as const },
    { valueSourceRole: "BACKEND_DERIVED" as const }, { valueSourceRole: "MANDATORY_NORM_VALUE" as const },
    { resourceBranchConsumers: [] },
    { constraints: { requiredWhen: { kind: "unsupported" } } },
    { guide: { guideKind: "DERIVED_VALUE_RULE", guideValidationPolicy: "MANDATORY_BLOCK" } as never },
    { guide: { guideKind: "PROJECT_DEFINED", guideValidationPolicy: "ADVISORY_REASON_REQUIRED" } as never },
    { titleRu: "Норма расхода материала" },
  ])("a project reference name never bypasses protected ownership or missing gate metadata: %j", patch => {
    expect(isCanonicalEstimateVisibleUserResourceSelectionParameter({ ...mandatoryProjectReference, ...patch })).toBe(false);
  });
  it.each([undefined, {}, [], " ", "not an applicability expression", { kind: "unsupported" }])(
    "keeps an unrequired resource-only text field out for an absent/invalid condition: %j", requiredWhen => {
      expect(isCanonicalEstimateVisibleUserResourceSelectionParameter({ ...conditionalResourceChoice, constraints: { requiredWhen } })).toBe(false);
    },
  );
  it.each([
    { visibilityRole: "INTERNAL_ONLY" as const },
    { valueSourceRole: "BACKEND_DERIVED" as const },
    { valueSourceRole: "MANUFACTURER_CONFIRMED" as const },
    { resourceBranchConsumers: [] },
    { parameterId: "material_approval_reference" },
    { parameterId: "material_document" },
    { parameterId: "material_certificate" },
    { titleRu: "Норма расхода материала" },
  ])("does not admit protected/document/non-consumed fields by a conditional requirement: %j", patch => {
    expect(isCanonicalEstimateVisibleUserResourceSelectionParameter({ ...conditionalResourceChoice, ...patch })).toBe(false);
  });
  it.each([
    ["ASSUMPTION", "PRIMARY_SOURCE_NORM"],
    ["VISIBLE_PRELIMINARY_SCENARIO", "PRIMARY_SOURCE_NORM"],
    ["RUNTIME_STRUCTURAL_DEFAULT", "PRIMARY_SOURCE_NORM"],
    ["NORMATIVE", "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"],
    ["NORMATIVE", "VISIBLE_PRELIMINARY_SCENARIO"],
    ["NORMATIVE", "VISIBLE_BASELINE_ASSUMPTION"],
  ])("exposes every central replaceable application-profile marker (%s/%s)", (
    runtimeProfileClassification,
    valueSourceRole,
  ) => {
    const schema = {
      parameterId: "machine_productivity_m3_h",
      titleRu: "Производительность механизма",
      valueType: "decimal",
      visibilityRole: "USER_INPUT",
      valueSourceRole,
      runtimeProfileClassification,
      formulaConsumers: ["formula"],
      resourceBranchConsumers: ["row"],
      constraints: {},
    } as never;

    expect(isCanonicalEstimateVisibleReplaceableProfile(schema)).toBe(true);
  });

  it("keeps an ordinary protected norm hidden but exposes a required resource choice", () => {
    const norm = {
      parameterId: "machine_productivity_m3_h",
      titleRu: "Производительность механизма",
      valueType: "decimal",
      visibilityRole: "USER_INPUT",
      valueSourceRole: "PRIMARY_SOURCE_NORM",
      runtimeProfileClassification: "NORMATIVE",
      formulaConsumers: ["formula"],
      resourceBranchConsumers: ["row"],
      constraints: {},
    } as never;
    const resourceChoice = {
      parameterId: "pipe_designation",
      titleRu: "Обозначение трубы",
      valueType: "text",
      required: true,
      visibilityRole: "USER_INPUT",
      valueSourceRole: "PROJECT_SPECIFIC_INPUT",
      formulaConsumers: [],
      resourceBranchConsumers: ["pipe_row"],
      constraints: {},
    } as never;

    expect(isCanonicalEstimateVisibleReplaceableProfile(norm)).toBe(false);
    expect(isCanonicalEstimateVisibleUserResourceSelectionParameter(resourceChoice)).toBe(true);
  });

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

  it("shows distinct Russian labels for the alternative slab haul tariffs", () => {
    const alternatives = {
      slab_main_concrete_transport_pricing_basis: ["PER_TRIP", "PER_M3_KM", "PER_MACHINE_HOUR"],
      slab_soil_transport_pricing_basis: ["PER_TRIP", "PER_MACHINE_HOUR"],
    };
    for (const [parameterId, values] of Object.entries(alternatives)) {
      const labels = values.map(value => canonicalEstimateParameterChoiceLabelRu(parameterId, value));
      expect(new Set(labels).size).toBe(values.length);
      expect(labels).toEqual(parameterId.includes("main_concrete")
        ? ["За рейс", "За м³·км", "За машино-час"] : ["За рейс", "За машино-час"]);
    }
  });

  it("honours application ownership before the legacy numeric project-fact exception", () => {
    const schema = {
      parameterId: 'g6_waste_crew_hours', titleRu: 'Труд погрузки и водителя', valueType: 'decimal',
      visibilityRole: 'USER_INPUT', valueSourceRole: 'CONDITIONAL_PROJECT_FACT',
      formulaConsumers: ['crew'], resourceBranchConsumers: ['waste-crew'],
      constraints: { requiredWhen: { kind: 'equals', parameterId: 'waste', value: 'required' } },
      guide: { guideKind: 'PROJECT_DEFINED', guideValidationPolicy: 'MANDATORY_BLOCK' },
      provenance: { consumer_input_role_v1: 'APPLICATION_TECHNICAL' },
    } as never;
    expect(isCanonicalEstimateSourceManagedParameter(schema)).toBe(true);
    expect(isCanonicalEstimateConsumerSuppliedParameter(schema)).toBe(false);
    expect(isCanonicalEstimateVisibleReplaceableProfile(schema)).toBe(false);
    expect(isCanonicalEstimateVisibleUserResourceSelectionParameter(schema)).toBe(false);
  });
});

describe("source-wave construction choices use the common Russian presentation path", () => {
  function collectChoices(value: unknown): string[] {
    if (typeof value === "string") return /^[A-Z][A-Z0-9_]*$/u.test(value) ? [value] : [];
    if (Array.isArray(value)) return value.flatMap(collectChoices);
    if (value && typeof value === "object") return Object.entries(value).filter(([key]) => key !== "incompatibleValue").flatMap(([, item]) => collectChoices(item));
    return [];
  }
  const fields = [choicePack0.scopeFacts, choicePack1.scopeFacts, choicePack2.scopeFacts, choicePack3.scopeFacts, choicePack4.scopeFacts, choicePack5.scopeFacts, choicePack6.scopeFacts, choicePack4.states, choicePack6.selector, choicePack7.projectFacts, choicePack7.states, choicePack8.planValue, choicePack8.recordedValue, choicePack8.otherValue];
  const current = [...new Set(fields.flatMap(collectChoices))];
  it.each(current)("shows a specific readable label for source choice %s", value => {
    const label = canonicalEstimateParameterChoiceLabelRu("source_wave_choice", value);
    expect(label).toMatch(/[А-Яа-яЁё]/u);
    expect(label).not.toBe("Вариант по проектной документации");
    expect(label).not.toMatch(/[A-Z]{2,}_[A-Z0-9_]+/u);
  });
  it("keeps the three substrate options and three backfill objects distinct", () => {
    expect(["PREPARED_EVEN_RUBBLE_MASONRY", "PREPARED_EVEN_BRICK", "PREPARED_EVEN_CONCRETE"].map(value => canonicalEstimateParameterChoiceLabelRu("waterproofing_prepared_substrate", value)))
      .toEqual(["Подготовленная выровненная бутовая кладка", "Подготовленная выровненная кирпичная кладка", "Подготовленная выровненная бетонная поверхность"]);
    expect(["TRENCH", "PIT_SIDE_SPACE", "HOLE"].map(value => canonicalEstimateParameterChoiceLabelRu("backfill_object", value)))
      .toEqual(["Траншея", "Пазухи котлована", "Яма"]);
  });
  it("distinguishes planned, recorded and unconfirmed checks without turning a label into acceptance", () => {
    const values = [choicePack8.planValue, choicePack8.recordedValue, choicePack8.otherValue];
    const labels = values.map(value => canonicalEstimateParameterChoiceLabelRu("floor_check", value));
    expect(new Set(labels).size).toBe(3);
    expect(labels[0]).toContain("План");expect(labels[1]).toContain("Записанные");expect(labels[2]).toContain("не подтверждены");
    expect(choicePack8.fullTechnicalAcceptance).toBe(false);
  });
  it("does not confuse required preparation with accepted work or an already ready base", () => {
    const labels = Object.values(choicePack4.states).map(value => canonicalEstimateParameterChoiceLabelRu("rubble_preparation", value));
    expect(new Set(labels).size).toBe(4);expect(labels[0]).toContain("ещё не принято");
    expect(labels[1]).toContain("подтверждена отдельно");expect(labels[2]).toContain("не добавлять");
  });
  it("distinguishes included watering from confirmed absence and leaves the machine values untouched", () => {
    const values = ["REQUIRED_INCLUDED_LABOUR_WATER_QUANTITY_UNRESOLVED", "NOT_REQUIRED_CONFIRMED"];
    const before = JSON.stringify(values), labels = values.map(value => canonicalEstimateParameterChoiceLabelRu("backfill_watering_state", value));
    expect(labels[0]).toContain("расход воды ещё не определён");expect(labels[1]).toContain("не требуется");
    expect(labels[0]).not.toEqual(labels[1]);expect(JSON.stringify(values)).toBe(before);
  });
  it.each(["EXACT_BASE_COLUMN_NO_THICKNESS_HEIGHT_REPAIR_ALTITUDE_OR_SPECIAL_COEFFICIENT", "LITERAL_SOURCE_CONSUMPTION_ONLY_NO_PRODUCT_ORDER_STOCK_OR_RECIPE_ADMISSION", "NET_INTERNAL_WALL_LESS_BOX_OPENINGS_AND_DRAWN_ARCHITRAVES_HEIGHT_FINISHED_FLOOR_TO_CEILING", "PHYSICAL_SIDE_PLATES_ONLY_NO_SALES_UNIT_OR_PAYMENT", "PROJECT_CONFIRMED_READY_STONE_MASONRY_FOR01601_NO_IMPORTED_PREPARATION_NORM", "PROJECT_RECONCILED_NONOVERLAPPING_INCLUDED01601_WINDOW_SURFACES_AND_DISTINCT031_ELEMENTS_NO_DOUBLE_PAYMENT", "READY_HEAVY_CEMENT_LIME_1_1_6_SOURCE03_0410_0001", "SINGLE_WHOLE_LABOUR_INCLUDES_SOURCE_OPERATIONS_NO_KNAUF_CT29_OR_EXTRA_OPERATOR", "SOURCE_SIMPLE_CEMENT_LIME_INTERNAL_STONE_WALL_COLUMN01601", "UNCONFIRMED_OR_OTHER_EP_SUPPLY"])("supports the next frozen package choice %s without importing its pack into the client", value => {
    const label = canonicalEstimateParameterChoiceLabelRu("next_source_choice", value);
    expect(label).toMatch(/[А-Яа-яЁё]/u);expect(label).not.toBe("Вариант по проектной документации");
  });
  it("keeps the physical P31 reference separate from unconfirmed supply without changing finance", () => {
    const active = canonicalEstimateParameterChoiceLabelRu("p31_ep_side_piece_reference_method", "PHYSICAL_SIDE_PLATES_ONLY_NO_SALES_UNIT_OR_PAYMENT");
    const pending = canonicalEstimateParameterChoiceLabelRu("p31_ep_side_piece_reference_method", "UNCONFIRMED_OR_OTHER_EP_SUPPLY");
    expect(active).toContain("без заказа и оплаты");expect(pending).toContain("не подтверждён");expect(active).not.toEqual(pending);
  });
  it("preserves existing fallback, Russian text and unknown-code behavior", () => {
    expect(canonicalEstimateParameterChoiceLabelRu("future", "STILL_UNKNOWN_CODE")).toBe("Вариант по проектной документации");
    expect(canonicalEstimateParameterChoiceLabelRu("future", "STILL_UNKNOWN_CODE", "Условие по отдельному проекту")).toBe("Условие по отдельному проекту");
    expect(canonicalEstimateParameterChoiceLabelRu("future", "Пригодное основание по проекту")).toBe("Пригодное основание по проекту");
  });
});
