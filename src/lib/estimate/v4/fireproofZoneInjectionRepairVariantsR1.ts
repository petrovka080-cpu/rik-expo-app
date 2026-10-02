import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimatePriceItem,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

type InputValue = string | number | boolean;
type Json = Record<string, unknown>;

export const FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_ID =
  "sika_injection_201_ce_current_pds_ac20_pds_sds_and_method_preliminary_model_v4";
export const FIREPROOF_ZONE_INJECTION_REPAIR_NORM_ID =
  "norm:manufacturer:sika_injection_201_ce:pds_ac20_method_geometry:v4";
export const FIREPROOF_ZONE_INJECTION_REPAIR_SIKA_ARTIFACT_SHA256 =
  "8708718824ae50b3b083cee3389d10e6295a3290752bb325f5879a3ed79478c4";
export const FIREPROOF_ZONE_INJECTION_REPAIR_AC20_ARTIFACT_SHA256 =
  "190c7df2deb5e8ae94487ae886e05590bde63b68752b117b5cf3a06076a2d20f";
export const FIREPROOF_ZONE_INJECTION_REPAIR_METHOD_ARTIFACT_SHA256 =
  "54b154f8d63eb466174568a936ac325e57509cd965d45966dc05f6ead4bfdff9";
export const FIREPROOF_ZONE_INJECTION_REPAIR_PART_A_SDS_ARTIFACT_SHA256 =
  "cccfa51f9f7f9b64f35a5f2b14dc9d3ca2ed1f8dfe8fbb55c92b9ecf5a849a71";
export const FIREPROOF_ZONE_INJECTION_REPAIR_PART_B_SDS_ARTIFACT_SHA256 =
  "74dd1fbd2e3aea6e6b68c2a8b06b013023f090b3ba9dfae55c84b6fd920ba57a";
export const FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_BUNDLE_SHA256 =
  "2237ee16716974acb1f73660ca0f898ecd2a242279760ae358ebd7c6cebf2a22";

const REACTION_TIME_MIN_BY_TEMPERATURE_AND_AC20 = Object.freeze({
  "5": Object.freeze({ "0": 180, "0.5": 60, "1": 29, "2": 16, "3": 13, "5": 9 }),
  "10": Object.freeze({ "0": 180, "0.5": 55, "1": 32, "2": 17, "3": 14, "5": 7 }),
  "20": Object.freeze({ "0": 135, "0.5": 38, "1": 24, "2": 13, "3": 10, "5": 5 }),
} as const);

const REACTION_TIME_EXACT_LOOKUP_ROWS = Object.freeze(
  Object.entries(REACTION_TIME_MIN_BY_TEMPERATURE_AND_AC20).flatMap(
    ([temperature, dosageRows]) => Object.entries(dosageRows).map(([dosage, reactionTime]) => ({
      inputValues: [Number(temperature), Number(dosage)],
      outputValue: reactionTime,
    })),
  ),
);

const AC20_DOSAGES = Object.freeze([0, 0.5, 1, 2, 3, 5]);

export const FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_METADATA = Object.freeze({
  source_title:
    "Sika Injection-201 CE Product Data Sheet, December 2023, Version 02.01; Sika Injection AC-20 Product Data Sheet, September 2020, Version 01.02; current 2025 Part A/B SDS; Method Statement Crack Injection with Sika Injection-201 CE, 19.07.2019, Version 01",
  source_authority: "Sika product manufacturer",
  source_document_version:
    "SIKA_INJECTION_201_CE_PDS_2023_02_01_PLUS_AC20_2020_01_02_PLUS_SDS_2025_PLUS_METHOD_2019_01",
  definition_hash: FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_BUNDLE_SHA256,
  exact_locator:
    "Sika Injection-201 CE PDS 2023 pp.1-3: packaging A=10/20 kg and B=10.6/21.2 kg, 1:1 parts by volume, densities A=1.00 kg/l and B=1.07 kg/l, AC-20 reaction table, +5..+35 C limits, mixing >=3 min at max 250 rpm and pot-life control; AC-20 PDS 2020 pp.1-2: 1 kg package, 0..5% by mass of component A and reaction table; Method Statement 2019 pp.3-12: equipment/PPE, d/2 packers, injection, second pass, Pmax=(concrete strength*10)/3 bar, pot-life and completion controls; current 2025 Part A/B SDS: handling and PPE",
  source_supported_result_ru:
    "Постоянная гибкая водонепроницаемая герметизация трещины в бетонном основании без гидростатического напора.",
  workflow_role:
    "CONCRETE_SUBSTRATE_CRACK_SEALING_BEFORE_SEPARATE_FIREPROOF_SYSTEM_RESTORATION",
  fireproofing_restored_by_this_profile: false,
  separate_fireproof_restoration_required: true,
  use_restriction:
    "Предварительная автоматическая модель применяется только к гибкой постоянной водонепроницаемой герметизации трещины шириной более 0,2 мм в бетонном основании системой Sika Injection-201 CE без гидростатического напора. Этот источник не подтверждает огнезащитные свойства и этот профиль не восстанавливает огнезащитное покрытие, облицовку или предел огнестойкости: после ремонта основания требуется отдельная совместимая операция восстановления огнезащитной системы и её контроль. Объём рассчитан как геометрический объём прямоугольного раскрытия с видимым редактируемым коэффициентом 1,0; это не скрытая гарантия фактического поглощения. Шаг механических пакеров d/2 взят из method statement. Суффиксы standard/small_area не меняют физические нормы. Structural-bond, masonry/stone, void fill и hydrostatic-pressure требуют другого подтверждённого профиля.",
  source_kind: "MANUFACTURER_PDS_METHOD_PLUS_TRANSPARENT_PRELIMINARY_GEOMETRY_MODEL",
  compatible_system_url:
    "https://ind.sika.com/dms/getdocument.get/c07bce7d-2c39-4099-813b-5aea842e989d/sika_injection-201ce.pdf",
  accelerator_pds_url:
    "https://prt.sika.com/content/dam/dms/za01/e/sika_injection_ac-20.pdf",
  method_statement_url:
    "https://vnm.sika.com/content/dam/dms/vn01/3/MS_Crack%20Injection%20with%20Sika%20Injection-201%20CE.pdf",
  artifact_sha256: FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_BUNDLE_SHA256,
  artifact_components: [
    {
      file: "sika_injection_201_ce_pds_2023_02_01.pdf",
      sha256: FIREPROOF_ZONE_INJECTION_REPAIR_SIKA_ARTIFACT_SHA256,
    },
    {
      file: "sika_injection_ac20_pds_2020_01_02.pdf",
      sha256: FIREPROOF_ZONE_INJECTION_REPAIR_AC20_ARTIFACT_SHA256,
    },
    {
      file: "sika_injection_201_ce_method_statement_2019_01.pdf",
      sha256: FIREPROOF_ZONE_INJECTION_REPAIR_METHOD_ARTIFACT_SHA256,
    },
    {
      file: "sika_injection_201_ce_part_a_sds_2025_10_0.pdf",
      sha256: FIREPROOF_ZONE_INJECTION_REPAIR_PART_A_SDS_ARTIFACT_SHA256,
    },
    {
      file: "sika_injection_201_ce_part_b_sds_2025_4_1.pdf",
      sha256: FIREPROOF_ZONE_INJECTION_REPAIR_PART_B_SDS_ARTIFACT_SHA256,
    },
  ],
});

export const FIREPROOF_ZONE_INJECTION_REPAIR_VARIANTS = Object.freeze({
  small_area: Object.freeze({
    catalogId: "canonical-work:base:special_repair_interior_fireproof_inject_small_area",
    catalogVariant: "SMALL_AREA_SEARCH_IDENTITY",
    canonicalNameRu:
      "Герметизация трещин бетонного основания перед восстановлением огнезащиты малой площади",
    aliasesRu: [
      "инъектирование трещин бетонного основания перед восстановлением огнезащиты малая площадь",
      "ремонт основания в зоне повреждённой огнезащиты инъекцией небольшой участок",
      "инъектирование огнезащиты на малой площади",
    ],
  }),
  standard: Object.freeze({
    catalogId: "canonical-work:base:special_repair_interior_fireproof_inject_standard",
    catalogVariant: "STANDARD_AREA_SEARCH_IDENTITY",
    canonicalNameRu:
      "Герметизация трещин бетонного основания перед восстановлением огнезащиты",
    aliasesRu: [
      "инъектирование трещин бетонного основания перед восстановлением огнезащиты",
      "ремонт основания в зоне повреждённой огнезащиты инъекцией",
      "инъектирование огнезащиты в стандартной зоне",
    ],
  }),
});

export type FireproofZoneInjectionRepairVariantKey =
  keyof typeof FIREPROOF_ZONE_INJECTION_REPAIR_VARIANTS;

type ParameterSpec = readonly [
  parameterId: string,
  titleRu: string,
  valueType: "boolean" | "decimal" | "integer" | "enum",
  unitId: string | null,
  enumValues: readonly string[] | null,
  profileValue: InputValue | null,
  sourceClass:
    | "KNOWN_GEOMETRY"
    | "SITE_CONDITION"
    | "APPLICABILITY"
    | "PROFESSIONAL_NORM"
    | "COST_BASIS"
    | "DERIVED_OR_CONFIRMED_CONTROL",
  guideRu: string,
];

const PARAMETER_SPECS: readonly ParameterSpec[] = Object.freeze([
  ["repair_zone_area_m2", "Площадь зоны ремонта", "decimal", "m2", null, null, "KNOWN_GEOMETRY", "Введите известную площадь зоны, в которой выполняется инъекционная герметизация."],
  ["defect_length_m", "Длина трещины", "decimal", "m", null, null, "KNOWN_GEOMETRY", "Измеренная длина трещины."],
  ["defect_mean_opening_mm", "Среднее раскрытие трещины", "decimal", "mm", null, null, "KNOWN_GEOMETRY", "Измеренное среднее раскрытие; профиль применим при значении более 0,2 мм."],
  ["defect_mean_depth_mm", "Средняя глубина заполнения", "decimal", "mm", null, null, "KNOWN_GEOMETRY", "Измеренная или проектная средняя глубина заполняемого объёма."],
  ["component_thickness_mm", "Толщина бетонного элемента", "decimal", "mm", null, null, "KNOWN_GEOMETRY", "Толщина элемента d для расчёта шага механических пакеров d/2."],
  ["ambient_air_temperature_c", "Температура воздуха при инъектировании", "decimal", "celsius", null, null, "SITE_CONDITION", "Измеренная температура воздуха; допустимый диапазон PDS от +5 до +35 °C."],
  ["substrate_temperature_c", "Температура бетонного основания", "decimal", "celsius", null, null, "SITE_CONDITION", "Измеренная температура основания; допустимый диапазон PDS от +5 до +35 °C."],
  ["injection_material_temperature_c", "Температура компонентов смеси", "decimal", "celsius", null, null, "SITE_CONDITION", "Фактическая температура материала для выбора строки таблицы времени реакции; без точного табличного значения нужен подтверждённый контроль времени на объекте."],
  ["substrate_class", "Основание", "enum", null, ["CONCRETE"], "CONCRETE", "APPLICABILITY", "Предварительный профиль method statement подтверждён для бетона."],
  ["defect_geometry_type", "Тип дефекта", "enum", null, ["CRACK"], "CRACK", "APPLICABILITY", "Этот профиль предназначен для трещины; пустоты и швы требуют отдельного подтверждения."],
  ["defect_movement_status", "Подвижность трещины", "enum", null, ["STABLE", "LIMITED_MOVEMENT"], "LIMITED_MOVEMENT", "APPLICABILITY", "Sika Injection-201 CE допускает ограниченное движение после отверждения."],
  ["defect_moisture_condition", "Состояние по влаге", "enum", null, ["DRY", "DAMP", "WATER_BEARING"], "DAMP", "APPLICABILITY", "PDS допускает сухие, влажные и водонесущие трещины; гидростатический напор выбирается отдельно."],
  ["repair_objective", "Цель ремонта", "enum", null, ["WATERTIGHT_FLEXIBLE_FILL"], "WATERTIGHT_FLEXIBLE_FILL", "APPLICABILITY", "Постоянная гибкая водонепроницаемая герметизация."],
  ["hydrostatic_pressure_mode", "Гидростатический напор", "enum", null, ["ABSENT"], "ABSENT", "APPLICABILITY", "При напоре нужна предварительная инъекция Sika Injection-101 RC и отдельная норма; этот профиль её не выдумывает."],
  ["injection_system_profile", "Инъекционная система", "enum", null, ["SIKA_INJECTION_201_CE"], "SIKA_INJECTION_201_CE", "APPLICABILITY", "Совместимая двухкомпонентная PUR-система Sika Injection-201 CE."],
  ["packer_type", "Тип пакеров", "enum", null, ["MECHANICAL_DRILL_HOLE"], "MECHANICAL_DRILL_HOLE", "APPLICABILITY", "Механические скважинные пакеры по method statement."],
  ["material_volume_factor", "Коэффициент к геометрическому объёму", "decimal", "ratio", null, 1, "PROFESSIONAL_NORM", "Предварительно 1,0 без скрытого запаса; заменить подтверждённым коэффициентом пробной инъекции."],
  ["packer_spacing_thickness_ratio", "Шаг пакеров к толщине элемента", "decimal", "ratio", null, 0.5, "PROFESSIONAL_NORM", "Method statement: интервал от пакера до пакера d/2."],
  ["mix_ratio_a_volume_part", "Компонент A: объёмная доля", "decimal", "ratio", null, 1, "PROFESSIONAL_NORM", "PDS: A:B = 1:1 по объёму."],
  ["mix_ratio_b_volume_part", "Компонент B: объёмная доля", "decimal", "ratio", null, 1, "PROFESSIONAL_NORM", "PDS: A:B = 1:1 по объёму."],
  ["component_a_density_kg_l", "Плотность компонента A", "decimal", "kg_l", null, 1, "PROFESSIONAL_NORM", "PDS: около 1,00 кг/л при +20 °C."],
  ["component_b_density_kg_l", "Плотность компонента B", "decimal", "kg_l", null, 1.07, "PROFESSIONAL_NORM", "PDS: около 1,07 кг/л при +20 °C."],
  ["use_large_injection_201_package", "Использовать крупный комплект A/B", "boolean", null, null, false, "PROFESSIONAL_NORM", "Нет: комплект A 10 кг + B 10,6 кг. Да: комплект A 20 кг + B 21,2 кг. Компоненты закупаются совместно, не как независимые товары."],
  ["use_injection_ac20", "Применять ускоритель Sika Injection-AC20", "boolean", null, null, false, "APPLICABILITY", "Ускоритель применяется только по подтверждённому решению; особенно предназначен для низких температур 5–10 °C."],
  ["injection_ac20_dosage_percent", "Дозировка Sika Injection-AC20 к массе компонента A", "decimal", "percent", null, 0, "PROFESSIONAL_NORM", "PDS допускает табличные дозировки 0; 0,5; 1; 2; 3; 5 % от массы компонента A. Значение не выбирается произвольно."],
  ["injection_reaction_time_min", "Подтверждённое время реакции смеси", "decimal", "min", null, null, "DERIVED_OR_CONFIRMED_CONTROL", "Автоматически берётся только для точной пары температура/дозировка из таблицы PDS; для иных условий вводится подтверждённое испытанием или специалистом значение."],
  ["concrete_compressive_strength_n_mm2", "Прочность бетона для предела давления", "decimal", "n_mm2", null, null, "SITE_CONDITION", "Подтверждённая прочность бетона в Н/мм² для расчёта верхнего предела Pmax=(прочность×10)/3 бар."],
  ["planned_injection_pressure_bar", "Плановое рабочее давление", "decimal", "bar", null, null, "DERIVED_OR_CONFIRMED_CONTROL", "Рабочее давление задаёт квалифицированный специалист; оно не должно превышать расчётный предел, при этом method statement рекомендует длительное инъектирование на минимально возможном давлении."],
  ["injection_pass_count", "Число проходов инъектирования", "integer", "pcs", null, 2, "PROFESSIONAL_NORM", "Method statement рекомендует повторную инъекцию каждого пакера в пределах времени отверждения."],
  ["workfront_count", "Комплект оборудования на фронт работ", "integer", "set", null, 1, "PROFESSIONAL_NORM", "Предварительная производственная модель: один одновременно работающий фронт и один комплект каждого вида оборудования."],
  ["equipment_cost_mode", "Основание стоимости инструмента и оборудования", "enum", null, ["OWNED_AMORTIZATION", "RENTAL", "PURCHASE"], "OWNED_AMORTIZATION", "COST_BASIS", "Выберите одно основание: использование собственного оснащения, аренда или закупка. Одновременный двойной учёт запрещён."],
  ["equipment_rental_days", "Срок аренды комплекта оборудования", "decimal", "day", null, null, "COST_BASIS", "Вводится только для режима аренды по подтверждённому графику работ."],
  ["curing_check_count", "Контроль готовности после выдерживания", "integer", "test", null, 1, "PROFESSIONAL_NORM", "Один контроль завершения на принятый фронт работ; расширяется планом качества."],
  ["qa_protocol_document_count", "Протокол качества и завершения", "integer", "document", null, 1, "PROFESSIONAL_NORM", "Один протокол на принятую сметную операцию; расширяется проектным планом контроля."],
  ["waste_disposal_service_count", "Передача отходов", "integer", "service", null, 1, "PROFESSIONAL_NORM", "Method statement требует ответственную передачу отходов; предварительно одна услуга на фронт."],
]);

export type FireproofZoneInjectionRepairParameter =
  CanonicalEstimateParameterDefinition & {
    ordinal: number;
    unit_id: string | null;
    title_ru: string;
    truth_metadata: Json;
  };

export const FIREPROOF_ZONE_INJECTION_REPAIR_PRELIMINARY_PROFILE = Object.freeze(
  Object.fromEntries(PARAMETER_SPECS
    .filter(([, , , , , profileValue]) => profileValue !== null)
    .map(([parameterId, , , , , profileValue]) => [parameterId, profileValue])) as
    Record<string, InputValue>,
);

const NORMATIVE_PROFILE_PARAMETER_IDS = new Set([
  "packer_spacing_thickness_ratio",
  "mix_ratio_a_volume_part",
  "mix_ratio_b_volume_part",
  "component_a_density_kg_l",
  "component_b_density_kg_l",
  "use_large_injection_201_package",
  "injection_ac20_dosage_percent",
  "injection_pass_count",
]);

function parameterConstraints(
  parameterId: string,
  valueType: ParameterSpec[2],
  enumValues: readonly string[] | null,
): Record<string, unknown> {
  if (enumValues) return { values: enumValues };
  if (valueType === "boolean") return {};
  if ([
    "ambient_air_temperature_c",
    "substrate_temperature_c",
    "injection_material_temperature_c",
  ].includes(parameterId)) return { min: 5, max: 35 };
  if (parameterId === "injection_ac20_dosage_percent") return { min: 0, max: 5 };
  if (parameterId === "injection_reaction_time_min") return { min: 1, max: 24 * 60 };
  if (parameterId === "concrete_compressive_strength_n_mm2") return { min: 0.1, max: 200 };
  if (parameterId === "planned_injection_pressure_bar") return { min: 0.01, max: 1000 };
  if (parameterId === "equipment_rental_days") return { min: 0.25, max: 365 };
  return { min: valueType === "integer" ? 1 : 0.000_001 };
}

export const FIREPROOF_ZONE_INJECTION_REPAIR_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(FIREPROOF_ZONE_INJECTION_REPAIR_PRELIMINARY_PROFILE)
    .map((parameterId) => [
      parameterId,
      NORMATIVE_PROFILE_PARAMETER_IDS.has(parameterId) ? "NORMATIVE" : "ASSUMPTION",
    ])),
) as Readonly<Record<string, "NORMATIVE" | "ASSUMPTION">>;

export const FIREPROOF_ZONE_INJECTION_REPAIR_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(FIREPROOF_ZONE_INJECTION_REPAIR_PRELIMINARY_PROFILE)
    .map((parameterId) => [
      parameterId,
      NORMATIVE_PROFILE_PARAMETER_IDS.has(parameterId)
        ? [FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_ID] : [],
    ])),
);

export const FIREPROOF_ZONE_INJECTION_REPAIR_PARAMETERS:
readonly FireproofZoneInjectionRepairParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId, enumValues, profileValue, sourceClass,
    guideRu], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: !["injection_reaction_time_min", "equipment_rental_days"].includes(parameterId),
    default_value: null,
    constraints_json: parameterConstraints(parameterId, valueType, enumValues),
    truth_metadata: {
      contract: "rik-expo-app.fireproof-zone-injection-repair-variants-r4",
      semantic_parameter_key: `fireproof-zone-injection-repair:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: sourceClass === "KNOWN_GEOMETRY"
        ? "USER_MEASURED" : sourceClass === "SITE_CONDITION"
          ? "USER_MEASURED_SITE_CONDITION" : sourceClass === "APPLICABILITY"
            ? "VISIBLE_PRELIMINARY_SCENARIO" : sourceClass === "COST_BASIS"
              ? "USER_SELECTED_COST_BASIS" : sourceClass === "DERIVED_OR_CONFIRMED_CONTROL"
                ? "SOURCE_TABLE_DERIVED_OR_SPECIALIST_CONFIRMED"
                : "SOURCE_BACKED_PRELIMINARY_PROFILE",
      input_origin_class: sourceClass,
      preliminary_compilation_allowed: !["KNOWN_GEOMETRY", "SITE_CONDITION"]
        .includes(sourceClass),
      source_confirmation_required: sourceClass === "DERIVED_OR_CONFIRMED_CONTROL",
      runtime_profile_value: profileValue !== null,
      runtime_profile_classification: sourceClass === "PROFESSIONAL_NORM"
        ? "SOURCE_BACKED_OR_EXPLICIT_PRODUCTION_ASSUMPTION" : sourceClass,
      guide: {
        guide_kind: ["KNOWN_GEOMETRY", "SITE_CONDITION"].includes(sourceClass)
          ? "MEASUREMENT_RULE" : "PRACTICE_REFERENCE",
        guide_short_ru: guideRu,
        source_role: sourceClass,
        source_document: FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_ID,
        source_locator: FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_METADATA.exact_locator,
        guide_version: "fireproof-zone-injection-repair-r4",
        source_snapshot_hash: FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_BUNDLE_SHA256,
        applicability: FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_METADATA.use_restriction,
        verified_at: "2026-09-28T00:00:00+06:00",
        guide_validation_policy:
          "FIRST_ESTIMATE_NOW_SHOW_AND_ALLOW_REPLACEMENT_REJECT_INCOMPATIBLE_SCENARIO",
      },
      hidden_default_forbidden: ["KNOWN_GEOMETRY", "SITE_CONDITION"]
        .includes(sourceClass),
      ...(parameterId === "injection_reaction_time_min" ? {
        derived_exact_lookup_v1: {
          version: "canonical-derived-exact-lookup:v1",
          inputParameterIds: [
            "injection_material_temperature_c",
            "injection_ac20_dosage_percent",
          ],
          rows: REACTION_TIME_EXACT_LOOKUP_ROWS,
          interpolation: "FORBIDDEN",
        },
      } : {}),
      synthetic: false,
    },
  }),
));

function formula(formulaId: string, outputUnitId: string, expression: string) {
  const compiled = compileFormulaGraph(expression);
  return {
    formula_id: formulaId,
    output_unit_id: outputUnitId,
    expression_source: expression,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  };
}

const VOLUME = "(defect_length_m*defect_mean_opening_mm*defect_mean_depth_mm/1000*material_volume_factor)";
const MIX_TOTAL = "(mix_ratio_a_volume_part+mix_ratio_b_volume_part)";
const A_MASS = `${VOLUME}*mix_ratio_a_volume_part/${MIX_TOTAL}*component_a_density_kg_l`;
const B_MASS = `${VOLUME}*mix_ratio_b_volume_part/${MIX_TOTAL}*component_b_density_kg_l`;
const A_PACKAGE = "(use_large_injection_201_package?20:10)";
const B_PACKAGE = "(use_large_injection_201_package?21.2:10.6)";
const KIT_COUNT = `max(ceil(${A_MASS}/${A_PACKAGE}),ceil(${B_MASS}/${B_PACKAGE}))`;
const AC20_MASS = `${A_MASS}*injection_ac20_dosage_percent/100`;
const PACKERS = "(ceil(defect_length_m/(component_thickness_mm/1000*packer_spacing_thickness_ratio))+1)";

const FORMULA_SPECS = Object.freeze([
  ["fireproof_zone_injection_repair_area_v2", "m2", "repair_zone_area_m2"],
  ["fireproof_zone_injection_crack_length_v2", "m", "defect_length_m"],
  ["fireproof_zone_injection_packer_spacing_v2", "m", "component_thickness_mm/1000*packer_spacing_thickness_ratio"],
  ["fireproof_zone_injection_geometry_volume_v2", "l", "defect_length_m*defect_mean_opening_mm*defect_mean_depth_mm/1000"],
  ["fireproof_zone_injection_material_volume_v2", "l", VOLUME],
  ["fireproof_zone_injection_ambient_temperature_v5", "celsius", "ambient_air_temperature_c"],
  ["fireproof_zone_injection_substrate_temperature_v5", "celsius", "substrate_temperature_c"],
  ["fireproof_zone_injection_material_temperature_v5", "celsius", "injection_material_temperature_c"],
  ["fireproof_zone_injection_component_a_mass_v4", "kg", A_MASS],
  ["fireproof_zone_injection_component_b_mass_v4", "kg", B_MASS],
  ["fireproof_zone_injection_201_kit_count_v4", "set", KIT_COUNT],
  ["fireproof_zone_injection_component_a_purchased_mass_v4", "kg", `${KIT_COUNT}*${A_PACKAGE}`],
  ["fireproof_zone_injection_component_b_purchased_mass_v4", "kg", `${KIT_COUNT}*${B_PACKAGE}`],
  ["fireproof_zone_injection_component_a_remainder_v4", "kg", `${KIT_COUNT}*${A_PACKAGE}-${A_MASS}`],
  ["fireproof_zone_injection_component_b_remainder_v4", "kg", `${KIT_COUNT}*${B_PACKAGE}-${B_MASS}`],
  ["fireproof_zone_injection_ac20_mass_v4", "kg", AC20_MASS],
  ["fireproof_zone_injection_ac20_pack_count_v4", "pack", `ceil(${AC20_MASS})`],
  ["fireproof_zone_injection_ac20_remainder_v4", "kg", `ceil(${AC20_MASS})-${AC20_MASS}`],
  ["fireproof_zone_injection_reaction_time_v4", "min", "injection_reaction_time_min"],
  ["fireproof_zone_injection_max_pressure_v4", "bar", "concrete_compressive_strength_n_mm2*10/3"],
  ["fireproof_zone_injection_planned_pressure_v4", "bar", "planned_injection_pressure_bar"],
  ["fireproof_zone_injection_packers_v2", "pcs", PACKERS],
  ["fireproof_zone_injection_surface_preparation_v2", "m", "defect_length_m"],
  ["fireproof_zone_injection_drill_holes_v2", "pcs", PACKERS],
  ["fireproof_zone_injection_install_packers_v2", "pcs", PACKERS],
  ["fireproof_zone_injection_work_volume_v2", "l", VOLUME],
  ["fireproof_zone_injection_passes_v2", "pcs", `${PACKERS}*injection_pass_count`],
  ["fireproof_zone_injection_pump_set_v2", "set", "workfront_count"],
  ["fireproof_zone_injection_nipple_gripper_set_v2", "set", "workfront_count"],
  ["fireproof_zone_injection_compressor_set_v2", "set", "workfront_count"],
  ["fireproof_zone_injection_impact_drill_set_v2", "set", "workfront_count"],
  ["fireproof_zone_injection_battery_drill_set_v2", "set", "workfront_count"],
  ["fireproof_zone_injection_toolbox_set_v2", "set", "workfront_count"],
  ["fireproof_zone_injection_owned_equipment_use_v4", "set", "workfront_count"],
  ["fireproof_zone_injection_equipment_rental_v4", "set_day", "workfront_count*equipment_rental_days"],
  ["fireproof_zone_injection_equipment_purchase_v4", "set", "workfront_count"],
  ["fireproof_zone_injection_bucket_set_v2", "set", "workfront_count"],
  ["fireproof_zone_injection_towels_pack_v2", "pack", "workfront_count"],
  ["fireproof_zone_injection_ppe_set_v2", "set", "workfront_count"],
  ["fireproof_zone_injection_cleaning_system_v2", "set", "workfront_count"],
  ["fireproof_zone_injection_patching_material_v2", "set", "workfront_count"],
  ["fireproof_zone_injection_remove_patch_v2", "pcs", PACKERS],
  ["fireproof_zone_injection_completion_check_v2", "test", "curing_check_count"],
  ["fireproof_zone_injection_qa_observations_v2", "pcs", `${PACKERS}*injection_pass_count`],
  ["fireproof_zone_injection_qa_protocol_v2", "document", "qa_protocol_document_count"],
  ["fireproof_zone_injection_waste_service_v2", "service", "waste_disposal_service_count"],
] as const);

export const FIREPROOF_ZONE_INJECTION_REPAIR_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze(FORMULA_SPECS.map(
  ([formulaId, unitId, expression]) => formula(formulaId, unitId, expression),
));

const literalTrue = Object.freeze({ kind: "literal", value: true });
const booleanParameter = (id: string) => ({ kind: "parameter", id });
const equalsParameter = (parameterId: string, value: string) => ({
  kind: "equals", parameterId, value,
});

type RowSpec = Readonly<{
  rowId: string;
  section: string;
  category: string;
  titleRu: string;
  procurementEligible: boolean;
  costTreatment: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS" | "CONTROL_OR_DOCUMENT";
  inclusionAst?: Record<string, unknown>;
  costOwnerId?: string | null;
}>;

const row = (
  rowId: string,
  section: string,
  category: string,
  titleRu: string,
  procurementEligible: boolean,
  costTreatment: RowSpec["costTreatment"],
  options: Pick<RowSpec, "inclusionAst" | "costOwnerId"> = {},
): RowSpec => ({ rowId, section, category, titleRu, procurementEligible, costTreatment, ...options });

const ROW_SPECS: readonly RowSpec[] = Object.freeze([
  row("f09:fireproof_zone_injection_repair_area", "Объём работ", "construction_work", "Зона инъекционной герметизации трещин", false, "INFORMATIONAL_SCOPE"),
  row("f09:fireproof_zone_injection_crack_length", "Геометрия", "construction_work", "Подтверждённая длина трещины", false, "INFORMATIONAL_SCOPE"),
  row("f09:fireproof_zone_injection_packer_spacing", "Как посчитано", "construction_work", "Расчётный шаг механических пакеров d/2", false, "INFORMATIONAL_SCOPE"),
  row("f09:fireproof_zone_injection_geometry_volume", "Как посчитано", "construction_work", "Геометрический объём раскрытия трещины", false, "INFORMATIONAL_SCOPE"),
  row("f09:fireproof_zone_injection_material_volume", "Как посчитано", "material", "Расчётный объём смеси Sika Injection-201 CE", false, "INFORMATIONAL_SCOPE"),
  row("f09:fireproof_zone_injection_ambient_temperature", "Инженерные ограничения", "service", "Измеренная температура воздуха при инъектировании", false, "CONTROL_OR_DOCUMENT"),
  row("f09:fireproof_zone_injection_substrate_temperature", "Инженерные ограничения", "service", "Измеренная температура бетонного основания", false, "CONTROL_OR_DOCUMENT"),
  row("f09:fireproof_zone_injection_material_temperature", "Инженерные ограничения", "service", "Измеренная температура компонентов смеси", false, "CONTROL_OR_DOCUMENT"),
  row("f09:fireproof_zone_injection_component_a_required", "Материалы — потребность", "material", "Sika Injection-201 CE, расчётная масса компонента A", false, "INFORMATIONAL_SCOPE"),
  row("f09:fireproof_zone_injection_component_b_required", "Материалы — потребность", "material", "Sika Injection-201 CE, расчётная масса компонента B", false, "INFORMATIONAL_SCOPE"),
  row("f09:fireproof_zone_injection_201_ce_kit", "Материалы — закупка", "material", "Sika Injection-201 CE, полный комплект компонентов A/B", true, "OWN_COST", { costOwnerId: "f09:sika_injection_201_ce_kit" }),
  row("f09:fireproof_zone_injection_component_a_purchased", "Материалы — закупка", "material", "Sika Injection-201 CE, масса компонента A в закупленных комплектах", false, "INCLUDED_IN_RESOURCE_ROWS"),
  row("f09:fireproof_zone_injection_component_b_purchased", "Материалы — закупка", "material", "Sika Injection-201 CE, масса компонента B в закупленных комплектах", false, "INCLUDED_IN_RESOURCE_ROWS"),
  row("f09:fireproof_zone_injection_component_a_remainder", "Материалы — остаток", "material", "Sika Injection-201 CE, расчётный остаток компонента A", false, "INFORMATIONAL_SCOPE"),
  row("f09:fireproof_zone_injection_component_b_remainder", "Материалы — остаток", "material", "Sika Injection-201 CE, расчётный остаток компонента B", false, "INFORMATIONAL_SCOPE"),
  row("f09:fireproof_zone_injection_ac20_required", "Ускоритель — потребность", "material", "Sika Injection-AC20, расчётная масса по выбранной дозировке", false, "INFORMATIONAL_SCOPE", { inclusionAst: booleanParameter("use_injection_ac20") }),
  row("f09:fireproof_zone_injection_ac20_pack", "Ускоритель — закупка", "material", "Sika Injection-AC20, упаковка 1 кг", true, "OWN_COST", { inclusionAst: booleanParameter("use_injection_ac20"), costOwnerId: "f09:sika_injection_ac20_1kg" }),
  row("f09:fireproof_zone_injection_ac20_remainder", "Ускоритель — остаток", "material", "Sika Injection-AC20, расчётный остаток после закупки целых упаковок", false, "INFORMATIONAL_SCOPE", { inclusionAst: booleanParameter("use_injection_ac20") }),
  row("f09:fireproof_zone_injection_reaction_time", "Инженерные ограничения", "service", "Время реакции смеси при выбранных температуре и дозировке", false, "CONTROL_OR_DOCUMENT", { inclusionAst: { kind: "present", parameterId: "injection_reaction_time_min" } }),
  row("f09:fireproof_zone_injection_max_pressure", "Инженерные ограничения", "service", "Расчётный верхний предел давления Pmax=(прочность бетона×10)/3", false, "CONTROL_OR_DOCUMENT"),
  row("f09:fireproof_zone_injection_planned_pressure", "Инженерные ограничения", "service", "Подтверждённое плановое рабочее давление инъектирования", false, "CONTROL_OR_DOCUMENT"),
  row("f09:fireproof_zone_injection_packers", "Материалы", "material", "Механические инъекционные пакеры", true, "OWN_COST"),
  row("f09:fireproof_zone_injection_surface_preparation", "Работы", "construction_work", "Очистка и разметка трещины", false, "OWN_COST"),
  row("f09:fireproof_zone_injection_drill_holes", "Работы", "construction_work", "Бурение отверстий под пакеры под углом 45°", false, "OWN_COST"),
  row("f09:fireproof_zone_injection_install_packers", "Работы", "construction_work", "Установка и затяжка механических пакеров", false, "OWN_COST"),
  row("f09:fireproof_zone_injection_work_volume", "Работы", "construction_work", "Смешивание не менее 3 минут при ≤250 об/мин и низконапорное инъектирование", false, "OWN_COST"),
  row("f09:fireproof_zone_injection_passes", "Работы", "construction_work", "Последовательное инъектирование и повторный проход пакеров", false, "INCLUDED_IN_RESOURCE_ROWS"),
  row("f09:fireproof_zone_injection_pump", "Состав оснащения", "equipment", "Однокомпонентный поршневой инъекционный насос с рукавом и клапаном", false, "INFORMATIONAL_SCOPE"),
  row("f09:fireproof_zone_injection_nipple_gripper", "Состав оснащения", "equipment", "Захват круглых ниппелей для соединения насоса с пакером", false, "INFORMATIONAL_SCOPE"),
  row("f09:fireproof_zone_injection_oil_free_compressed_air", "Состав оснащения", "equipment", "Безмасляный компрессор для продувки отверстий", false, "INFORMATIONAL_SCOPE"),
  row("f09:fireproof_zone_injection_impact_drill", "Состав оснащения", "equipment", "Ударная дрель с буром под выбранный пакер", false, "INFORMATIONAL_SCOPE"),
  row("f09:fireproof_zone_injection_battery_drill", "Состав оснащения", "equipment", "Аккумуляторная дрель для смешивания с ограничением до 250 об/мин", false, "INFORMATIONAL_SCOPE"),
  row("f09:fireproof_zone_injection_toolbox", "Состав оснащения", "equipment", "Комплект ключей, трещоток, отвёрток и клещей", false, "INFORMATIONAL_SCOPE"),
  row("f09:fireproof_zone_injection_owned_equipment_use", "Стоимость оснащения", "equipment", "Использование собственного комплекта оборудования (амортизация/эксплуатация)", false, "OWN_COST", { inclusionAst: equalsParameter("equipment_cost_mode", "OWNED_AMORTIZATION") }),
  row("f09:fireproof_zone_injection_equipment_rental", "Стоимость оснащения", "service", "Аренда полного комплекта оборудования", true, "OWN_COST", { inclusionAst: equalsParameter("equipment_cost_mode", "RENTAL") }),
  row("f09:fireproof_zone_injection_equipment_purchase", "Стоимость оснащения", "equipment", "Закупка полного комплекта оборудования", true, "OWN_COST", { inclusionAst: equalsParameter("equipment_cost_mode", "PURCHASE") }),
  row("f09:fireproof_zone_injection_buckets", "Расходники", "material", "Чистые и мерные ёмкости для раздельной подготовки и смешивания", true, "OWN_COST"),
  row("f09:fireproof_zone_injection_towels", "Расходники", "material", "Очищающие салфетки", true, "OWN_COST"),
  row("f09:fireproof_zone_injection_ppe", "Безопасность", "material", "Комплект защиты глаз, рук, кожи и защитной обуви", true, "OWN_COST"),
  row("f09:fireproof_zone_injection_cleaning_system", "Расходники", "material", "Sika Injection Cleaning System для насоса и инструмента", true, "OWN_COST"),
  row("f09:fireproof_zone_injection_patching_material", "Материалы", "material", "Совместимый ремонтный состав для заделки отверстий", true, "OWN_COST"),
  row("f09:fireproof_zone_injection_remove_patch", "Работы", "construction_work", "Снятие пакеров, заделка отверстий и очистка поверхности", false, "OWN_COST"),
  row("f09:fireproof_zone_injection_completion_check", "Контроль качества", "service", "Контроль герметичности после выдерживания в пределах времени реакции", false, "OWN_COST"),
  row("f09:fireproof_zone_injection_qa_observations", "Контроль качества", "service", "Наблюдение выхода материала и отказа насоса по каждому проходу", false, "INCLUDED_IN_RESOURCE_ROWS"),
  row("f09:fireproof_zone_injection_qa_protocol", "Документация", "service", "Протокол температуры, дозировки, давления, инъектирования и завершения ремонта", false, "OWN_COST"),
  row("f09:fireproof_zone_injection_waste", "Отходы", "service", "Передача незатвердевших и загрязнённых отходов уполномоченному получателю", false, "OWN_COST"),
]);

export const FIREPROOF_ZONE_INJECTION_REPAIR_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(ROW_SPECS.map(
  ({ rowId, section, category, titleRu, procurementEligible, costTreatment,
    inclusionAst, costOwnerId }, ordinal) => {
    const [formulaId, unitId] = FORMULA_SPECS[ordinal];
    const resourceGraph = {
      formulaId,
      normalizedUom: unitId,
      semanticOwnerId: `fireproof-zone-injection-repair:${rowId}`,
      costOwner: costOwnerId ?? (ordinal <= 4 ? "scope" : "resource"),
      costTreatment,
      payable: costTreatment === "OWN_COST",
      noDoubleCount: true,
      scopeContextParameterIds: [
        "repair_zone_area_m2",
        "defect_length_m",
        "defect_mean_opening_mm",
        "defect_mean_depth_mm",
        "component_thickness_mm",
        "ambient_air_temperature_c",
        "substrate_temperature_c",
        "injection_material_temperature_c",
        "substrate_class",
        "defect_geometry_type",
        "defect_movement_status",
        "defect_moisture_condition",
        "repair_objective",
        "hydrostatic_pressure_mode",
        "injection_system_profile",
        "packer_type",
        "use_large_injection_201_package",
        "use_injection_ac20",
        "injection_ac20_dosage_percent",
        "injection_reaction_time_min",
        "concrete_compressive_strength_n_mm2",
        "planned_injection_pressure_bar",
        "equipment_cost_mode",
      ],
    };
    const sourceMetadata = {
      truth_contract_version: "R4",
      synthetic: false,
      sourceRole: ordinal <= 1
        ? "CONFIRMED_GEOMETRY"
        : "MANUFACTURER_METHOD_OR_EXPLICIT_PRELIMINARY_PRODUCTION_MODEL",
      normativeTrace: [{
        sourceId: FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_ID,
        source_id: FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_ID,
        normId: FIREPROOF_ZONE_INJECTION_REPAIR_NORM_ID,
        norm_id: FIREPROOF_ZONE_INJECTION_REPAIR_NORM_ID,
        normVersion: FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_METADATA.source_document_version,
        source_title: FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_METADATA.source_title,
        exact_locator: FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_METADATA.exact_locator,
        source_definition_hash: FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_BUNDLE_SHA256,
      }],
      quantityBasis: ordinal <= 1
        ? "CONFIRMED_GEOMETRY"
        : "GEOMETRY_TIMES_VISIBLE_SOURCE_BACKED_OR_EXPLICIT_PRELIMINARY_PARAMETER",
      uncertainty:
        "Предварительный результат: фактическое поглощение, число фронтов и план контроля заменяются подтверждёнными данными без изменения состава или semantic IDs.",
      excludedUnownedAssumptions: [
        "labor or machine hours without a verified productivity source",
        "hydrostatic-pressure preliminary foam quantity",
        "structural-bond epoxy repair",
        "classification suffix quantity factor",
        "fireproof coating application or cleaning",
        "invented price",
      ],
    };
    return {
      id: `resource-${rowId.replace(/:/gu, "-")}`,
      row_id: rowId,
      ordinal,
      section,
      category,
      title_ru: titleRu,
      unit_id: unitId,
      formula_id: formulaId,
      inclusion_ast: inclusionAst ?? literalTrue,
      resource_graph: resourceGraph,
      procurement_eligible: procurementEligible,
      cost_owner_id: costOwnerId === null ? null : (costOwnerId ?? rowId),
      source_metadata: sourceMetadata,
      row_sha256: estimateDeterministicHash({
        rowId, ordinal, section, category, titleRu, unitId, formulaId,
        procurementEligible, costTreatment, inclusionAst: inclusionAst ?? literalTrue,
        costOwnerId: costOwnerId ?? rowId, resourceGraph, sourceMetadata,
      }),
    };
  },
));

export const FIREPROOF_ZONE_INJECTION_REPAIR_SHORT_INPUT = Object.freeze({
  repair_zone_area_m2: 12,
  defect_length_m: 30,
  defect_mean_opening_mm: 0.4,
  defect_mean_depth_mm: 180,
  component_thickness_mm: 180,
});

export const FIREPROOF_ZONE_INJECTION_REPAIR_ACCEPTANCE_INPUT = Object.freeze({
  ...FIREPROOF_ZONE_INJECTION_REPAIR_SHORT_INPUT,
  ...FIREPROOF_ZONE_INJECTION_REPAIR_PRELIMINARY_PROFILE,
  ambient_air_temperature_c: 20,
  substrate_temperature_c: 20,
  injection_material_temperature_c: 20,
  concrete_compressive_strength_n_mm2: 30,
  planned_injection_pressure_bar: 5,
});

export function resolveFireproofZoneInjectionRepairVariant(
  variantKey: string,
): (typeof FIREPROOF_ZONE_INJECTION_REPAIR_VARIANTS)[
  FireproofZoneInjectionRepairVariantKey
] {
  if (!Object.prototype.hasOwnProperty.call(
    FIREPROOF_ZONE_INJECTION_REPAIR_VARIANTS,
    variantKey,
  )) {
    throw new Error(`FIREPROOF_ZONE_INJECTION_REPAIR_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return FIREPROOF_ZONE_INJECTION_REPAIR_VARIANTS[
    variantKey as FireproofZoneInjectionRepairVariantKey
  ];
}

export function fireproofZoneInjectionRepairCompletenessMap(
  variantKey: FireproofZoneInjectionRepairVariantKey,
) {
  const variant = FIREPROOF_ZONE_INJECTION_REPAIR_VARIANTS[variantKey];
  return Object.freeze({
    contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
    sourceKind: "PRODUCT_SYSTEM_TDS",
    sourceSystemClass: "MANUFACTURER_WATERPROOFING_CRACK_INJECTION_PDS_AND_METHOD",
    generatedFromCurrentRows: false,
    evidenceSha256: FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_BUNDLE_SHA256,
    evidenceReferences: [
      FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_METADATA.compatible_system_url,
      FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_METADATA.method_statement_url,
    ],
    catalogVariant: `${variant.catalogVariant}_NO_HIDDEN_QUANTITY_FACTOR`,
    entries: ROW_SPECS.map(({ rowId, category, titleRu, costTreatment }, ordinal) => ({
      operationId: rowId.replace("f09:", ""),
      expectedResourceId: `required-operation:${rowId.replace("f09:", "")}`,
      category,
      specification: titleRu,
      condition: "supported_sika_injection_201_ce_flexible_crack_scenario",
      sourceId: FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_ID,
      unitId: FORMULA_SPECS[ordinal][1],
      quantityRule:
        "AUTOMATIC_FROM_KNOWN_GEOMETRY_AND_VISIBLE_SOURCE_BACKED_OR_PRELIMINARY_PROFILE_VALUES",
      detailPrinciple:
        "SUBSTRATE_CRACK_SEALING_ONLY_FIREPROOF_SYSTEM_RESTORATION_IS_A_SEPARATE_REQUIRED_OPERATION",
      priceRelation: costTreatment === "OWN_COST"
        ? "OWN_COST_OR_HONESTLY_UNKNOWN" : costTreatment,
      formulaId: FORMULA_SPECS[ordinal][0],
      resolution: { kind: "ROW", rowId },
    })),
  });
}

function rejectIncompatibleScenario(parameters: Record<string, unknown>): void {
  const exact = (parameterId: string, expected: InputValue) => {
    const actual = parameters[parameterId];
    if (actual !== undefined && actual !== expected) {
      throw new Error(
        `FIREPROOF_ZONE_INJECTION_REPAIR_SCENARIO_UNSUPPORTED:${parameterId}:${String(actual)}`,
      );
    }
  };
  exact("substrate_class", "CONCRETE");
  exact("defect_geometry_type", "CRACK");
  exact("repair_objective", "WATERTIGHT_FLEXIBLE_FILL");
  exact("hydrostatic_pressure_mode", "ABSENT");
  exact("injection_system_profile", "SIKA_INJECTION_201_CE");
  exact("packer_type", "MECHANICAL_DRILL_HOLE");
  const opening = parameters.defect_mean_opening_mm;
  if (typeof opening === "number" && opening <= 0.2) {
    throw new Error(
      `FIREPROOF_ZONE_INJECTION_REPAIR_CRACK_OPENING_UNSUPPORTED:${String(opening)}`,
    );
  }
  const dosage = Number(parameters.injection_ac20_dosage_percent);
  if (!AC20_DOSAGES.includes(dosage)) {
    throw new Error(
      `FIREPROOF_ZONE_INJECTION_REPAIR_AC20_DOSAGE_UNSUPPORTED:${String(dosage)}`,
    );
  }
  const useAc20 = parameters.use_injection_ac20 === true;
  if ((!useAc20 && dosage !== 0) || (useAc20 && dosage === 0)) {
    throw new Error(
      `FIREPROOF_ZONE_INJECTION_REPAIR_AC20_DECISION_INCONSISTENT:${String(useAc20)}:${String(dosage)}`,
    );
  }
  if (parameters.equipment_cost_mode === "RENTAL") {
    const rentalDays = Number(parameters.equipment_rental_days);
    if (!Number.isFinite(rentalDays) || rentalDays <= 0) {
      throw new Error("FIREPROOF_ZONE_INJECTION_REPAIR_RENTAL_DAYS_REQUIRED");
    }
  }
  const strength = Number(parameters.concrete_compressive_strength_n_mm2);
  const pressure = Number(parameters.planned_injection_pressure_bar);
  if (Number.isFinite(strength) && Number.isFinite(pressure)
    && pressure > strength * 10 / 3) {
    throw new Error(
      `FIREPROOF_ZONE_INJECTION_REPAIR_PRESSURE_EXCEEDS_PMAX:${String(pressure)}:${String(strength * 10 / 3)}`,
    );
  }
}

export async function compileFireproofZoneInjectionRepairVariantR1(
  variantKey: FireproofZoneInjectionRepairVariantKey,
  submittedParameters: Record<string, unknown>,
  options: Readonly<{
    catalogId?: string;
    priceItems?: readonly CanonicalEstimatePriceItem[];
    priceSnapshotIds?: readonly string[];
  }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const variant = FIREPROOF_ZONE_INJECTION_REPAIR_VARIANTS[variantKey];
  const catalogId = options.catalogId ?? variant.catalogId;
  if (catalogId !== variant.catalogId) {
    throw new Error(`FIREPROOF_ZONE_INJECTION_REPAIR_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  const resolvedParameters: Record<string, unknown> = {
    ...FIREPROOF_ZONE_INJECTION_REPAIR_PRELIMINARY_PROFILE,
    ...submittedParameters,
  };
  rejectIncompatibleScenario(resolvedParameters);
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion:
      `canonical-estimate-compiler.fireproof-zone-injection-repair-${variantKey}-r4`,
    catalogId,
    primaryMeasureParameterId: "repair_zone_area_m2",
    parameterDefinitions: [...FIREPROOF_ZONE_INJECTION_REPAIR_PARAMETERS],
    formulaDefinitions: [...FIREPROOF_ZONE_INJECTION_REPAIR_FORMULAS],
    resourceDefinitions: [...FIREPROOF_ZONE_INJECTION_REPAIR_RESOURCES],
    submittedParameters: resolvedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceSnapshotIds: [...(options.priceSnapshotIds ?? [])],
    priceItems: [...(options.priceItems ?? [])],
    maximumResourceRows: 60,
    hashJson: async (value) => JSON.stringify(value),
  });
}
