import {
  stableWorkSpecificParameterIdV4,
  type ParameterInputKindV4,
  type ParameterNecessityV4,
  type WorkSpecificParameterSchemaV4,
  type WorkSpecificParameterV4,
} from "../../../src/lib/estimate/v4";

type FixtureParameterInput = {
  workId: string;
  familyId: string;
  key: string;
  name: string;
  inputKind?: ParameterInputKindV4;
  necessity?: ParameterNecessityV4;
  unitId?: string | null;
  displayUnitIds?: string[];
  choices?: string[];
  applicability?: string;
  formulaDependencies?: string[];
  affectedRowIds?: string[];
  specificationBindings?: string[];
  priceBindingKeys?: string[];
};

function dimensionForUnit(unitId: string | null): WorkSpecificParameterV4["dimension"] {
  if (unitId === "m" || unitId === "mm" || unitId === "cm" || unitId === "km") return "length";
  if (unitId === "m2") return "area";
  if (unitId === "kW") return "power";
  if (unitId === "pcs") return "count";
  return null;
}

export function fixtureParameter(input: FixtureParameterInput): WorkSpecificParameterV4 {
  const inputKind = input.inputKind ?? (input.unitId ? "quantity" : "enum");
  return {
    parameter_id: stableWorkSpecificParameterIdV4(input.workId, input.key),
    canonical_key: input.key,
    owner_work_id: input.workId,
    owner_family_id: input.familyId,
    professional_name_ru: input.name,
    user_help_ru: `Параметр «${input.name}» влияет на состав или количество ресурсов этой работы.`,
    input_kind: inputKind,
    data_type: inputKind === "quantity" ? "number" : inputKind === "boolean" ? "boolean" : inputKind === "document" ? "document_reference" : "selection",
    necessity: input.necessity ?? "recommended",
    dimension: dimensionForUnit(input.unitId ?? null),
    canonical_unit_id: input.unitId ?? null,
    display_unit_ids: input.displayUnitIds ?? (input.unitId ? [input.unitId] : []),
    choices: (input.choices ?? []).map((value) => ({ value, label_ru: value })),
    range: inputKind === "quantity" ? { minimum: 0, maximum: null } : null,
    step: inputKind === "quantity" ? 0.01 : null,
    precision: inputKind === "quantity" ? 2 : null,
    example_ru: inputKind === "quantity" ? `Например: 100 ${input.unitId}` : `Например: ${input.choices?.[0] ?? "выбранный вариант"}`,
    default_value: null,
    default_source: null,
    required_condition: (input.necessity ?? "recommended") === "critical" ? "required_when_applicable" : "not_required",
    applicability_condition: input.applicability ?? "always",
    formula_dependencies: input.formulaDependencies ?? [],
    affected_row_ids: input.affectedRowIds ?? [],
    specification_bindings: input.specificationBindings ?? [],
    price_binding_keys: input.priceBindingKeys ?? [],
    provenance: "phase0_contract_fixture",
    confidence: "high",
    validation_message_ru: "Укажите профессионально допустимое значение.",
    missing_value_consequence_ru: "Смета останется предварительной или расчёт будет заблокирован.",
    assumption_when_missing_ru: null,
    internal_only: false,
  };
}

function schema(workId: string, familyId: string, parameters: WorkSpecificParameterV4[]): WorkSpecificParameterSchemaV4 {
  return {
    schema_id: `${workId}:parameter-schema:v4-fixture`,
    schema_version: "WorkSpecificParameterSchemaV4",
    owner_work_id: workId,
    owner_family_id: familyId,
    parameters,
    mutually_exclusive_input_groups: [],
    question_budget: { initial_maximum: 5, hard_maximum: 12 },
    compatibility_source: "native_v4",
  };
}

const TILE_WORK_ID = "fixture_tile_installation";
const ELECTRICAL_WORK_ID = "fixture_electrical_installation";
const ASPHALT_WORK_ID = "fixture_asphalt_concrete_pavement";

export const TILE_PARAMETER_SCHEMA_FIXTURE = schema(TILE_WORK_ID, "fixture_tiling", [
  fixtureParameter({ workId: TILE_WORK_ID, familyId: "fixture_tiling", key: "area_m2", name: "Площадь облицовки", unitId: "m2", necessity: "critical", formulaDependencies: ["tile_area_formula"], affectedRowIds: ["tile"] }),
  fixtureParameter({ workId: TILE_WORK_ID, familyId: "fixture_tiling", key: "tile_size", name: "Размер плитки", inputKind: "material_selection", choices: ["300×300 мм", "600×600 мм"], specificationBindings: ["tile_specification"] }),
  fixtureParameter({ workId: TILE_WORK_ID, familyId: "fixture_tiling", key: "substrate_type", name: "Тип основания", choices: ["стяжка", "бетон", "ГКЛ"], applicability: "surface_preparation_applicable", affectedRowIds: ["substrate_preparation"] }),
  fixtureParameter({ workId: TILE_WORK_ID, familyId: "fixture_tiling", key: "layout_pattern", name: "Схема раскладки", choices: ["прямая", "диагональная"], affectedRowIds: ["tile_cutting"] }),
  fixtureParameter({ workId: TILE_WORK_ID, familyId: "fixture_tiling", key: "joint_width_mm", name: "Ширина шва", unitId: "mm", formulaDependencies: ["grout_quantity_formula"], affectedRowIds: ["grout"] }),
]);

export const ELECTRICAL_PARAMETER_SCHEMA_FIXTURE = schema(ELECTRICAL_WORK_ID, "fixture_electrical", [
  fixtureParameter({ workId: ELECTRICAL_WORK_ID, familyId: "fixture_electrical", key: "points_count", name: "Количество электрических точек", unitId: "pcs", necessity: "critical", formulaDependencies: ["point_quantity_formula"], affectedRowIds: ["electrical_points"] }),
  fixtureParameter({ workId: ELECTRICAL_WORK_ID, familyId: "fixture_electrical", key: "voltage", name: "Рабочее напряжение", choices: ["220 В", "380 В"], specificationBindings: ["cable_voltage_class"] }),
  fixtureParameter({ workId: ELECTRICAL_WORK_ID, familyId: "fixture_electrical", key: "power_kw", name: "Расчётная мощность", unitId: "kW", formulaDependencies: ["cable_section_formula"], affectedRowIds: ["cable"] }),
  fixtureParameter({ workId: ELECTRICAL_WORK_ID, familyId: "fixture_electrical", key: "installation_method", name: "Способ прокладки", choices: ["скрытый", "открытый", "в лотке"], applicability: "cable_route_applicable", affectedRowIds: ["cable_installation"] }),
  fixtureParameter({ workId: ELECTRICAL_WORK_ID, familyId: "fixture_electrical", key: "route_length_m", name: "Длина трассы", unitId: "m", formulaDependencies: ["cable_length_formula"], affectedRowIds: ["cable"] }),
]);

export const ASPHALT_PARAMETER_SCHEMA_FIXTURE = schema(ASPHALT_WORK_ID, "fixture_road_construction", [
  fixtureParameter({ workId: ASPHALT_WORK_ID, familyId: "fixture_road_construction", key: "area_m2", name: "Площадь покрытия", unitId: "m2", necessity: "critical", formulaDependencies: ["pavement_area_formula"], affectedRowIds: ["asphalt_mix"] }),
  fixtureParameter({ workId: ASPHALT_WORK_ID, familyId: "fixture_road_construction", key: "length_m", name: "Длина участка", unitId: "m", formulaDependencies: ["pavement_area_formula"], affectedRowIds: ["asphalt_mix"] }),
  fixtureParameter({ workId: ASPHALT_WORK_ID, familyId: "fixture_road_construction", key: "width_m", name: "Ширина участка", unitId: "m", formulaDependencies: ["pavement_area_formula"], affectedRowIds: ["asphalt_mix"] }),
  fixtureParameter({ workId: ASPHALT_WORK_ID, familyId: "fixture_road_construction", key: "layer_thickness_mm", name: "Толщина слоя", unitId: "mm", formulaDependencies: ["asphalt_mass_formula"], affectedRowIds: ["asphalt_mix"] }),
  fixtureParameter({ workId: ASPHALT_WORK_ID, familyId: "fixture_road_construction", key: "mix_type", name: "Тип асфальтобетонной смеси", inputKind: "material_selection", choices: ["мелкозернистая", "крупнозернистая"], specificationBindings: ["asphalt_mix_specification"], priceBindingKeys: ["asphalt_mix_price"] }),
  fixtureParameter({ workId: ASPHALT_WORK_ID, familyId: "fixture_road_construction", key: "base_type", name: "Тип основания", choices: ["щебёночное", "асфальтобетонное"], applicability: "base_layer_applicable", affectedRowIds: ["base_layer"] }),
  fixtureParameter({ workId: ASPHALT_WORK_ID, familyId: "fixture_road_construction", key: "delivery_distance_km", name: "Расстояние доставки смеси", unitId: "km", formulaDependencies: ["transport_work_formula"], affectedRowIds: ["asphalt_transport"] }),
]);

ASPHALT_PARAMETER_SCHEMA_FIXTURE.mutually_exclusive_input_groups.push({
  group_id: "pavement_geometry_input",
  parameter_ids: [
    stableWorkSpecificParameterIdV4(ASPHALT_WORK_ID, "area_m2"),
    stableWorkSpecificParameterIdV4(ASPHALT_WORK_ID, "length_m"),
    stableWorkSpecificParameterIdV4(ASPHALT_WORK_ID, "width_m"),
  ],
  rule: "area OR (length AND width)",
});
