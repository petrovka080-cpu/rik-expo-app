import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

type InputValue = string | number | boolean;
type Json = Record<string, unknown>;

export const FIRE_ALARM_SYSTEM_EXPANDED_CATALOG_ID =
  "canonical-work:expanded:fire_alarm_system";
export const FIRE_ALARM_SYSTEM_EXPANDED_SOURCE_ID =
  "official_sp_kr_21_101_2024_complete_fire_alarm_system_visible_profile_v1";
export const FIRE_ALARM_SYSTEM_EXPANDED_NORM_ID =
  "norm:kg:sp_kr_21_101_2024:complete_fire_alarm_system_visible_profile:v1";
export const FIRE_ALARM_SYSTEM_EXPANDED_ARTIFACT_SHA256 =
  "0eab462536d90bf329f9b1c6605b0a8527e941b18f6e563776ff3eddc44ff33c";

export const FIRE_ALARM_SYSTEM_EXPANDED_SOURCE_METADATA = Object.freeze({
  source_title:
    "СП КР 21-101:2024 «Пожарная автоматика зданий и сооружений» и утверждённая рабочая документация системы",
  source_authority:
    "Государственное агентство архитектуры, строительства и жилищно-коммунального хозяйства при Кабинете Министров Кыргызской Республики (Госстрой); проектная организация пожарной автоматики; изготовитель адресной системы; ответственный инженер проекта",
  source_document_version:
    "SP_KR_21_101_2024_PLUS_APPROVED_COMPLETE_FIRE_ALARM_SYSTEM_PROJECT",
  definition_hash: FIRE_ALARM_SYSTEM_EXPANDED_ARTIFACT_SHA256,
  exact_locator:
    "СП КР 21-101:2024: §3, термины 6, 77 и 80; §§12.13–12.24 о зонах контроля, адресных шлейфах, количестве, адресации, контроле извещателей и технической документации; §§12.57–12.72 о кабелях, способах прокладки, контроле целостности, разделении трасс, соединительных коробках и защите от наводок",
  use_restriction:
    "Источник задаёт техническую область, состав проектных решений и обязательные проверки, но не универсальную плотность устройств, длину кабеля, запас, шаг крепежа, трудоёмкость, производительность механизмов или нормы отходов. Для первого расчёта все такие значения показаны как единый редактируемый предварительный профиль и не выдаются за официальные нормы; перед выполнением они заменяются рабочим проектом, адресной ведомостью, кабельным журналом, матрицей причинно-следственных связей и документацией изготовителя.",
  source_kind:
    "OFFICIAL_NORMATIVE_TECHNICAL_BOUNDARY_PLUS_VISIBLE_EDITABLE_COMPLETE_SYSTEM_PROFILE",
  official_url: "https://minstroy.gov.kg/ru/kyzmat/217/show",
  artifact_sha256: FIRE_ALARM_SYSTEM_EXPANDED_ARTIFACT_SHA256,
  effective_from: "2024-07-05",
});

type ParameterSpec = readonly [
  parameterId: string,
  titleRu: string,
  valueType: "decimal" | "integer" | "text" | "enum",
  unitId: string | null,
  enumValues: readonly string[] | null,
  profileValue: InputValue | null,
  sourceClass: "KNOWN_SCOPE" | "APPLICABILITY" | "PROFESSIONAL_ASSUMPTION",
  guideRu: string,
];

const PARAMETER_SPECS: readonly ParameterSpec[] = Object.freeze([
  ["protected_area_m2", "Защищаемая площадь системой пожарной сигнализации", "decimal", "m2", null, null, "KNOWN_SCOPE", "Введите подтверждённую защищаемую площадь по рабочему проекту или обмеру."],
  ["system_scope_statement", "Описание объекта и границ системы пожарной сигнализации", "text", null, null, null, "KNOWN_SCOPE", "Укажите подтверждённые границы системы, исключения и интерфейсы по заданию или проекту."],
  ["system_project_reference", "Рабочий проект и спецификация системы", "text", null, null, "Предварительный профиль полной адресной системы пожарной сигнализации; заменить утверждённым рабочим проектом", "APPLICABILITY", "Заменить обозначением утверждённого проекта, спецификации и адресной ведомости."],
  ["control_panel_designation", "Приёмно-контрольный прибор", "text", null, null, "Адресный приёмно-контрольный прибор совместимой системы", "APPLICABILITY", "Уточнить марку и исполнение по спецификации."],
  ["smoke_detector_designation", "Адресный дымовой извещатель", "text", null, null, "Адресный оптико-электронный дымовой извещатель совместимой системы", "APPLICABILITY", "Уточнить тип и марку по спецификации."],
  ["detector_base_designation", "Совместимая база извещателя", "text", null, null, "Совместимая монтажная база адресного извещателя", "APPLICABILITY", "Уточнить базу по документации изготовителя."],
  ["manual_call_point_designation", "Ручной пожарный извещатель", "text", null, null, "Адресный ручной пожарный извещатель совместимой системы", "APPLICABILITY", "Уточнить тип и исполнение по проекту."],
  ["sounder_designation", "Звуковой оповещатель", "text", null, null, "Совместимый звуковой оповещатель", "APPLICABILITY", "Уточнить тип по расчёту оповещения и спецификации."],
  ["visual_alarm_mode", "Световые оповещатели входят в систему", "enum", null, ["NOT_REQUIRED", "REQUIRED"], "REQUIRED", "APPLICABILITY", "Предварительно включены; можно отключить по проекту."],
  ["visual_alarm_designation", "Световой оповещатель", "text", null, null, "Совместимый световой оповещатель", "APPLICABILITY", "Уточнить тип по проекту."],
  ["loop_isolator_designation", "Адресный изолятор шлейфа", "text", null, null, "Совместимый адресный изолятор шлейфа", "APPLICABILITY", "Уточнить тип и места установки по адресной схеме."],
  ["interface_module_mode", "Интерфейсные модули входят в систему", "enum", null, ["NOT_REQUIRED", "REQUIRED"], "REQUIRED", "APPLICABILITY", "Предварительно включены для внешних интерфейсов; можно отключить по матрице."],
  ["interface_module_designation", "Адресный интерфейсный модуль", "text", null, null, "Совместимый адресный интерфейсный модуль", "APPLICABILITY", "Уточнить тип и назначение по матрице причинно-следственных связей."],
  ["power_supply_designation", "Резервированный источник питания", "text", null, null, "Совместимый резервированный источник питания", "APPLICABILITY", "Уточнить марку и мощность по расчёту питания."],
  ["battery_designation", "Аккумуляторная батарея", "text", null, null, "Аккумуляторная батарея требуемой ёмкости", "APPLICABILITY", "Уточнить тип и ёмкость по расчёту автономности."],
  ["fire_alarm_cable_designation", "Огнестойкий кабель пожарной сигнализации", "text", null, null, "Огнестойкий кабель пожарной сигнализации по проекту", "APPLICABILITY", "Уточнить марку и сечение по кабельному журналу."],
  ["cable_containment_designation", "Огнестойкая система прокладки кабеля", "text", null, null, "Огнестойкая труба, короб или лоток с совместимым креплением", "APPLICABILITY", "Уточнить систему прокладки по узлам трассы."],
  ["junction_box_designation", "Огнестойкая соединительная коробка", "text", null, null, "Огнестойкая соединительная коробка по схеме линии", "APPLICABILITY", "Уточнить тип по проекту."],
  ["cable_fastener_designation", "Огнестойкий крепёж кабельной трассы", "text", null, null, "Совместимый огнестойкий крепёж трассы", "APPLICABILITY", "Уточнить тип и шаг по узлам проекта."],
  ["device_fastener_designation", "Комплект крепежа устройств", "text", null, null, "Комплект совместимого крепежа одного устройства", "APPLICABILITY", "Уточнить состав комплекта по монтажным узлам."],
  ["firestop_mode", "Противопожарная заделка проходок входит в систему", "enum", null, ["NOT_REQUIRED", "REQUIRED"], "REQUIRED", "APPLICABILITY", "Предварительно включена; можно отключить при отсутствии проходок."],
  ["firestop_kit_designation", "Комплект противопожарной заделки проходки", "text", null, null, "Сертифицированный комплект противопожарной заделки проходки", "APPLICABILITY", "Уточнить систему по ведомости проходок."],
  ["device_reserve_factor", "Коэффициент запаса количества устройств", "decimal", null, null, 1.05, "PROFESSIONAL_ASSUMPTION", "Предварительно 1,05; заменить проектным количеством без скрытого коэффициента."],
  ["smoke_detector_density_pcs_m2", "Плотность дымовых извещателей на 1 м²", "decimal", "pcs_m2", null, 0.08, "PROFESSIONAL_ASSUMPTION", "Предварительно 0,08 шт./м²; заменить расстановкой проекта."],
  ["manual_call_point_density_pcs_m2", "Плотность ручных извещателей на 1 м²", "decimal", "pcs_m2", null, 0.01, "PROFESSIONAL_ASSUMPTION", "Предварительно 0,01 шт./м²; заменить проектным количеством."],
  ["sounder_density_pcs_m2", "Плотность звуковых оповещателей на 1 м²", "decimal", "pcs_m2", null, 0.02, "PROFESSIONAL_ASSUMPTION", "Предварительно 0,02 шт./м²; заменить расчётом оповещения."],
  ["visual_alarm_density_pcs_m2", "Плотность световых оповещателей на 1 м²", "decimal", "pcs_m2", null, 0.01, "PROFESSIONAL_ASSUMPTION", "Предварительно 0,01 шт./м²; заменить проектным количеством."],
  ["panel_capacity_point", "Расчётная вместимость одного прибора", "integer", "pcs", null, 127, "PROFESSIONAL_ASSUMPTION", "Предварительно 127 адресных точек на прибор."],
  ["loop_capacity_point", "Расчётная вместимость одного адресного шлейфа", "integer", "pcs", null, 80, "PROFESSIONAL_ASSUMPTION", "Предварительно 80 адресных точек на шлейф."],
  ["isolator_interval_point", "Количество адресных точек на один изолятор", "integer", "pcs", null, 20, "PROFESSIONAL_ASSUMPTION", "Предварительно один изолятор на 20 адресных точек."],
  ["interface_module_density_pcs_m2", "Плотность интерфейсных модулей на 1 м²", "decimal", "pcs_m2", null, 0.002, "PROFESSIONAL_ASSUMPTION", "Предварительно 0,002 шт./м²; заменить матрицей интерфейсов."],
  ["power_supply_output_capacity_point", "Количество оповещателей на один источник питания", "integer", "pcs", null, 50, "PROFESSIONAL_ASSUMPTION", "Предварительно 50 выходных устройств на источник; заменить расчётом питания."],
  ["battery_quantity_per_power_supply", "Количество батарей на один источник питания", "integer", "pcs", null, 2, "PROFESSIONAL_ASSUMPTION", "Предварительно две батареи на источник; заменить расчётом автономности."],
  ["cable_length_rate_m_m2", "Чистая длина кабеля на 1 м²", "decimal", "m_m2", null, 2.4, "PROFESSIONAL_ASSUMPTION", "Предварительно 2,40 м/м²; заменить кабельным журналом."],
  ["cable_reserve_factor", "Коэффициент запаса кабеля", "decimal", null, null, 1.1, "PROFESSIONAL_ASSUMPTION", "Предварительно 1,10; заменить проектным запасом."],
  ["containment_share", "Доля кабеля в трубе, коробе или лотке", "decimal", null, null, 0.75, "PROFESSIONAL_ASSUMPTION", "Предварительно 0,75 длины кабеля; заменить ведомостью трасс."],
  ["junction_box_interval_m", "Длина трассы на одну соединительную коробку", "decimal", "m", null, 40, "PROFESSIONAL_ASSUMPTION", "Предварительно одна коробка на 40 м трассы."],
  ["cable_fastener_spacing_m", "Шаг крепежа кабельной трассы", "decimal", "m", null, 0.5, "PROFESSIONAL_ASSUMPTION", "Предварительно 0,50 м; заменить монтажным узлом."],
  ["markers_per_addressable_point", "Количество кабельных маркеров на адресную точку", "decimal", "pcs", null, 2, "PROFESSIONAL_ASSUMPTION", "Предварительно два маркера на точку."],
  ["firestop_interval_route_m", "Длина трассы на одну противопожарную проходку", "decimal", "m", null, 200, "PROFESSIONAL_ASSUMPTION", "Предварительно одна проходка на 200 м; заменить ведомостью проходок."],
  ["termination_material_per_point", "Количество комплектов оконцевания на адресную точку", "decimal", "set", null, 1, "PROFESSIONAL_ASSUMPTION", "Предварительно один комплект на адресную точку."],
  ["device_install_labor_rate_man_hour_pcs", "Труд монтажника на одно полевое устройство", "decimal", "man_hour_pcs", null, 0.6, "PROFESSIONAL_ASSUMPTION", "Предварительно 0,60 чел.-ч/шт."],
  ["panel_install_labor_rate_man_hour_pcs", "Труд монтажника на один прибор", "decimal", "man_hour_pcs", null, 8, "PROFESSIONAL_ASSUMPTION", "Предварительно 8 чел.-ч/шт."],
  ["cable_laying_labor_rate_man_hour_m", "Труд прокладки одного метра кабеля", "decimal", "man_hour_m", null, 0.08, "PROFESSIONAL_ASSUMPTION", "Предварительно 0,08 чел.-ч/м."],
  ["containment_install_labor_rate_man_hour_m", "Труд монтажа одного метра системы прокладки", "decimal", "man_hour_m", null, 0.12, "PROFESSIONAL_ASSUMPTION", "Предварительно 0,12 чел.-ч/м."],
  ["connection_labor_rate_man_hour_end", "Труд присоединения одного конца проводника", "decimal", "man_hour_pcs", null, 0.12, "PROFESSIONAL_ASSUMPTION", "Предварительно 0,12 чел.-ч на конец."],
  ["commissioning_labor_rate_man_hour_point", "Труд пусконаладки одной адресной точки", "decimal", "man_hour_pcs", null, 0.25, "PROFESSIONAL_ASSUMPTION", "Предварительно 0,25 чел.-ч/точку."],
  ["access_equipment_rate_machine_hour_device", "Работа средства доступа на одно устройство", "decimal", "machine_hour_pcs", null, 0.05, "PROFESSIONAL_ASSUMPTION", "Предварительно 0,05 маш.-ч/устройство."],
  ["cable_test_equipment_rate_machine_hour_loop", "Работа тестера на один шлейф", "decimal", "machine_hour_pcs", null, 2, "PROFESSIONAL_ASSUMPTION", "Предварительно 2 маш.-ч/шлейф."],
  ["aerosol_test_equipment_rate_machine_hour_detector", "Работа устройства аэрозольной проверки на извещатель", "decimal", "machine_hour_pcs", null, 0.03, "PROFESSIONAL_ASSUMPTION", "Предварительно 0,03 маш.-ч/извещатель."],
  ["cause_effect_scenario_area_m2", "Площадь на один сценарий матрицы", "decimal", "m2", null, 250, "PROFESSIONAL_ASSUMPTION", "Предварительно один сценарий на 250 м²."],
  ["acceptance_protocol_document_count", "Количество итоговых протоколов", "integer", "document", null, 3, "PROFESSIONAL_ASSUMPTION", "Предварительно три итоговых протокола."],
  ["as_built_document_set_count", "Количество комплектов исполнительной документации", "integer", "set", null, 1, "PROFESSIONAL_ASSUMPTION", "Предварительно один комплект."],
  ["training_session_count", "Количество сеансов обучения персонала", "integer", "session", null, 1, "PROFESSIONAL_ASSUMPTION", "Предварительно один сеанс."],
  ["waste_mass_rate_kg_cable_m", "Масса отходов на 1 м кабеля", "decimal", "kg_m", null, 0.02, "PROFESSIONAL_ASSUMPTION", "Предварительно 0,02 кг/м."],
  ["waste_container_capacity_kg", "Вместимость одной единицы тары", "decimal", "kg", null, 10, "PROFESSIONAL_ASSUMPTION", "Предварительно 10 кг на единицу тары."],
  ["waste_transport_mode", "Требуется отдельная перевозка отходов", "enum", null, ["HANDOVER_ON_SITE", "TRANSPORT_REQUIRED"], "TRANSPORT_REQUIRED", "APPLICABILITY", "Предварительно включён отдельный рейс; можно заменить передачей на площадке."],
  ["waste_transport_capacity_kg", "Расчётная вместимость одного рейса", "decimal", "kg", null, 500, "PROFESSIONAL_ASSUMPTION", "Предварительно 500 кг на рейс."],
]);

export type FireAlarmSystemExpandedParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};

export const FIRE_ALARM_SYSTEM_EXPANDED_PARAMETERS:
readonly FireAlarmSystemExpandedParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId, enumValues, profileValue, sourceClass, guideRu], ordinal) => ({
    parameter_id: parameterId, ordinal, value_type: valueType, unit_id: unitId,
    title_ru: titleRu, required: true, default_value: null,
    constraints_json: {
      ...(enumValues ? { values: enumValues }
        : valueType === "decimal" || valueType === "integer"
          ? { min: valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
    },
    truth_metadata: {
      contract: "rik-expo-app.fire-alarm-system-expanded-r1",
      semantic_parameter_key: `fire-alarm-system-expanded:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: sourceClass === "KNOWN_SCOPE" ? "USER_MEASURED"
        : sourceClass === "APPLICABILITY" ? "VISIBLE_PRELIMINARY_SCENARIO"
          : "VISIBLE_BASELINE_ASSUMPTION",
      input_origin_class: sourceClass,
      preliminary_compilation_allowed: sourceClass !== "KNOWN_SCOPE",
      source_confirmation_required: false,
      runtime_profile_value: sourceClass !== "KNOWN_SCOPE",
      runtime_profile_classification: sourceClass === "PROFESSIONAL_ASSUMPTION"
        ? "EXPLICIT_PRELIMINARY_ASSUMPTION" : sourceClass,
      guide: {
        guide_kind: sourceClass === "KNOWN_SCOPE" ? "MEASUREMENT_RULE" : "PRACTICE_REFERENCE",
        guide_short_ru: guideRu, source_role: sourceClass,
        source_document: FIRE_ALARM_SYSTEM_EXPANDED_SOURCE_ID,
        source_locator: FIRE_ALARM_SYSTEM_EXPANDED_SOURCE_METADATA.exact_locator,
        guide_version: "fire-alarm-system-expanded-r1",
        source_snapshot_hash: FIRE_ALARM_SYSTEM_EXPANDED_ARTIFACT_SHA256,
        applicability: "Полная адресная система пожарной сигнализации в границах подтверждённой площади.",
        verified_at: "2026-09-25T00:00:00+06:00",
        guide_validation_policy:
          "FIRST_ESTIMATE_NOW_SHOW_AND_ALLOW_REPLACEMENT_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: sourceClass === "KNOWN_SCOPE",
      synthetic: false,
    },
  }),
));

export const FIRE_ALARM_SYSTEM_EXPANDED_PRELIMINARY_PROFILE = Object.freeze(
  Object.fromEntries(PARAMETER_SPECS.filter(([, , , , , value]) => value !== null)
    .map(([parameterId, , , , , value]) => [parameterId, value])) as Record<string, InputValue>,
);
export const FIRE_ALARM_SYSTEM_EXPANDED_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(FIRE_ALARM_SYSTEM_EXPANDED_PRELIMINARY_PROFILE)
    .map((parameterId) => [parameterId, "ASSUMPTION"])),
) as Readonly<Record<string, "ASSUMPTION">>;
export const FIRE_ALARM_SYSTEM_EXPANDED_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(FIRE_ALARM_SYSTEM_EXPANDED_PRELIMINARY_PROFILE)
    .map((parameterId) => [parameterId, parameterId === "system_project_reference"
      ? [FIRE_ALARM_SYSTEM_EXPANDED_SOURCE_ID] : []])),
) as Readonly<Record<string, readonly string[]>>;

function formula(id: string, unitId: string, expression: string) {
  const compiled = compileFormulaGraph(expression);
  return { formula_id: id, output_unit_id: unitId, expression_source: expression,
    ast: compiled.ast, input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" };
}

const addressablePoints =
  "ceil(protected_area_m2*smoke_detector_density_pcs_m2*device_reserve_factor)+ceil(protected_area_m2*manual_call_point_density_pcs_m2*device_reserve_factor)+ceil(protected_area_m2*interface_module_density_pcs_m2*device_reserve_factor)";
const fieldDevices =
  `${addressablePoints}+ceil(protected_area_m2*sounder_density_pcs_m2*device_reserve_factor)+ceil(protected_area_m2*visual_alarm_density_pcs_m2*device_reserve_factor)`;
const cableLength = "protected_area_m2*cable_length_rate_m_m2*cable_reserve_factor";
const containmentLength = `(${cableLength})*containment_share`;
const panelCount = `ceil((${addressablePoints})/panel_capacity_point)`;
const loopCount = `ceil((${addressablePoints})/loop_capacity_point)`;
const powerSupplyCount = `ceil((ceil(protected_area_m2*sounder_density_pcs_m2*device_reserve_factor)+ceil(protected_area_m2*visual_alarm_density_pcs_m2*device_reserve_factor))/power_supply_output_capacity_point)`;

const FORMULA_SPECS = Object.freeze([
  ["fire_alarm_system_area_v1", "m2", "protected_area_m2"],
  ["fire_alarm_system_panel_v1", "pcs", panelCount],
  ["fire_alarm_system_detector_v1", "pcs", "ceil(protected_area_m2*smoke_detector_density_pcs_m2*device_reserve_factor)"],
  ["fire_alarm_system_detector_base_v1", "pcs", "ceil(protected_area_m2*smoke_detector_density_pcs_m2*device_reserve_factor)"],
  ["fire_alarm_system_manual_call_point_v1", "pcs", "ceil(protected_area_m2*manual_call_point_density_pcs_m2*device_reserve_factor)"],
  ["fire_alarm_system_sounder_v1", "pcs", "ceil(protected_area_m2*sounder_density_pcs_m2*device_reserve_factor)"],
  ["fire_alarm_system_visual_alarm_v1", "pcs", "ceil(protected_area_m2*visual_alarm_density_pcs_m2*device_reserve_factor)"],
  ["fire_alarm_system_loop_isolator_v1", "pcs", `ceil((${addressablePoints})/isolator_interval_point)`],
  ["fire_alarm_system_interface_module_v1", "pcs", "ceil(protected_area_m2*interface_module_density_pcs_m2*device_reserve_factor)"],
  ["fire_alarm_system_power_supply_v1", "pcs", powerSupplyCount],
  ["fire_alarm_system_battery_v1", "pcs", `(${powerSupplyCount})*battery_quantity_per_power_supply`],
  ["fire_alarm_system_cable_v1", "m", cableLength],
  ["fire_alarm_system_containment_v1", "m", containmentLength],
  ["fire_alarm_system_junction_box_v1", "pcs", `ceil((${cableLength})/junction_box_interval_m)`],
  ["fire_alarm_system_cable_fastener_v1", "pcs", `ceil((${containmentLength})/cable_fastener_spacing_m)`],
  ["fire_alarm_system_device_fastener_v1", "set", fieldDevices],
  ["fire_alarm_system_marker_v1", "pcs", `ceil((${addressablePoints})*markers_per_addressable_point)`],
  ["fire_alarm_system_firestop_v1", "set", `ceil((${containmentLength})/firestop_interval_route_m)`],
  ["fire_alarm_system_termination_material_v1", "set", `ceil((${addressablePoints})*termination_material_per_point)`],
  ["fire_alarm_system_device_install_labor_v1", "man_hour", `(${fieldDevices})*device_install_labor_rate_man_hour_pcs`],
  ["fire_alarm_system_panel_install_labor_v1", "man_hour", `(${panelCount})*panel_install_labor_rate_man_hour_pcs`],
  ["fire_alarm_system_cable_laying_labor_v1", "man_hour", `(${cableLength})*cable_laying_labor_rate_man_hour_m`],
  ["fire_alarm_system_containment_install_labor_v1", "man_hour", `(${containmentLength})*containment_install_labor_rate_man_hour_m`],
  ["fire_alarm_system_connection_labor_v1", "man_hour", `((${addressablePoints})*2+(${panelCount})*10)*connection_labor_rate_man_hour_end`],
  ["fire_alarm_system_commissioning_labor_v1", "man_hour", `(${addressablePoints})*commissioning_labor_rate_man_hour_point`],
  ["fire_alarm_system_access_equipment_v1", "machine_hour", `(${fieldDevices})*access_equipment_rate_machine_hour_device`],
  ["fire_alarm_system_cable_test_equipment_v1", "machine_hour", `(${loopCount})*cable_test_equipment_rate_machine_hour_loop`],
  ["fire_alarm_system_aerosol_test_equipment_v1", "machine_hour", "ceil(protected_area_m2*smoke_detector_density_pcs_m2*device_reserve_factor)*aerosol_test_equipment_rate_machine_hour_detector"],
  ["fire_alarm_system_integrity_test_v1", "test", loopCount],
  ["fire_alarm_system_activation_test_v1", "test", "ceil(protected_area_m2*smoke_detector_density_pcs_m2*device_reserve_factor)+ceil(protected_area_m2*manual_call_point_density_pcs_m2*device_reserve_factor)"],
  ["fire_alarm_system_cause_effect_test_v1", "test", "ceil(protected_area_m2/cause_effect_scenario_area_m2)"],
  ["fire_alarm_system_protocol_v1", "document", "acceptance_protocol_document_count"],
  ["fire_alarm_system_as_built_v1", "set", "as_built_document_set_count"],
  ["fire_alarm_system_training_v1", "session", "training_session_count"],
  ["fire_alarm_system_waste_v1", "kg", `(${cableLength})*waste_mass_rate_kg_cable_m`],
  ["fire_alarm_system_waste_container_v1", "pcs", `ceil((${cableLength})*waste_mass_rate_kg_cable_m/waste_container_capacity_kg)`],
  ["fire_alarm_system_waste_transport_v1", "trip", `ceil((${cableLength})*waste_mass_rate_kg_cable_m/waste_transport_capacity_kg)`],
] as const);

export const FIRE_ALARM_SYSTEM_EXPANDED_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze(
  FORMULA_SPECS.map(([id, unit, expression]) => formula(id, unit, expression)),
);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });
const ROW_SPECS = Object.freeze([
  ["f09:fire_alarm_system_area", "Объём системы", "construction_work", "Защищаемая площадь полной системы пожарной сигнализации", false, literalTrue, ["system_scope_statement", "system_project_reference"]],
  ["f09:fire_alarm_system_panel", "Оборудование", "equipment", "Адресный приёмно-контрольный прибор", true, literalTrue, ["control_panel_designation"]],
  ["f09:fire_alarm_system_detector", "Оборудование", "equipment", "Адресный дымовой пожарный извещатель", true, literalTrue, ["smoke_detector_designation"]],
  ["f09:fire_alarm_system_detector_base", "Комплектующие", "material", "Совместимая монтажная база извещателя", true, literalTrue, ["detector_base_designation"]],
  ["f09:fire_alarm_system_manual_call_point", "Оборудование", "equipment", "Адресный ручной пожарный извещатель", true, literalTrue, ["manual_call_point_designation"]],
  ["f09:fire_alarm_system_sounder", "Оборудование", "equipment", "Звуковой пожарный оповещатель", true, literalTrue, ["sounder_designation"]],
  ["f09:fire_alarm_system_visual_alarm", "Оборудование", "equipment", "Световой пожарный оповещатель", true, equals("visual_alarm_mode", "REQUIRED"), ["visual_alarm_designation"]],
  ["f09:fire_alarm_system_loop_isolator", "Оборудование", "equipment", "Адресный изолятор короткого замыкания шлейфа", true, literalTrue, ["loop_isolator_designation"]],
  ["f09:fire_alarm_system_interface_module", "Оборудование", "equipment", "Адресный интерфейсный модуль внешней системы", true, equals("interface_module_mode", "REQUIRED"), ["interface_module_designation"]],
  ["f09:fire_alarm_system_power_supply", "Оборудование", "equipment", "Резервированный источник питания оповещателей", true, literalTrue, ["power_supply_designation"]],
  ["f09:fire_alarm_system_battery", "Комплектующие", "material", "Аккумуляторная батарея резервного питания", true, literalTrue, ["battery_designation"]],
  ["f09:fire_alarm_system_cable", "Материалы", "material", "Огнестойкий кабель пожарной сигнализации", true, literalTrue, ["fire_alarm_cable_designation"]],
  ["f09:fire_alarm_system_containment", "Материалы", "material", "Огнестойкая труба, короб или лоток кабельной трассы", true, literalTrue, ["cable_containment_designation"]],
  ["f09:fire_alarm_system_junction_box", "Комплектующие", "material", "Огнестойкая соединительная коробка", true, literalTrue, ["junction_box_designation"]],
  ["f09:fire_alarm_system_cable_fastener", "Крепёж", "material", "Огнестойкий крепёж кабельной трассы", true, literalTrue, ["cable_fastener_designation"]],
  ["f09:fire_alarm_system_device_fastener", "Крепёж", "material", "Комплект крепежа полевого устройства", true, literalTrue, ["device_fastener_designation"]],
  ["f09:fire_alarm_system_marker", "Расходные материалы", "material", "Маркер адреса и кабельной линии", true, literalTrue, []],
  ["f09:fire_alarm_system_firestop", "Материалы", "material", "Комплект противопожарной заделки кабельной проходки", true, equals("firestop_mode", "REQUIRED"), ["firestop_kit_designation"]],
  ["f09:fire_alarm_system_termination_material", "Расходные материалы", "material", "Комплект оконцевания проводников адресной точки", true, literalTrue, []],
  ["f09:fire_alarm_system_device_install_labor", "Труд", "construction_work", "Монтаж полевых устройств пожарной сигнализации", false, literalTrue, []],
  ["f09:fire_alarm_system_panel_install_labor", "Труд", "construction_work", "Монтаж приёмно-контрольных приборов", false, literalTrue, []],
  ["f09:fire_alarm_system_cable_laying_labor", "Труд", "construction_work", "Прокладка огнестойкого кабеля пожарной сигнализации", false, literalTrue, []],
  ["f09:fire_alarm_system_containment_install_labor", "Труд", "construction_work", "Монтаж огнестойкой системы прокладки кабеля", false, literalTrue, []],
  ["f09:fire_alarm_system_connection_labor", "Труд", "construction_work", "Оконцевание и подключение линий к устройствам и приборам", false, literalTrue, []],
  ["f09:fire_alarm_system_commissioning_labor", "Труд", "construction_work", "Адресация, настройка и системная пусконаладка", false, literalTrue, []],
  ["f09:fire_alarm_system_access_equipment", "Механизмы", "equipment", "Средство подмащивания и доступа к устройствам", true, literalTrue, []],
  ["f09:fire_alarm_system_cable_test_equipment", "Механизмы", "equipment", "Измерительное оборудование проверки кабельных шлейфов", true, literalTrue, []],
  ["f09:fire_alarm_system_aerosol_test_equipment", "Механизмы", "equipment", "Устройство аэрозольной проверки дымовых извещателей", true, literalTrue, []],
  ["f09:fire_alarm_system_integrity_test", "Контроль качества", "service", "Проверка целостности, обрыва и короткого замыкания шлейфа", false, literalTrue, []],
  ["f09:fire_alarm_system_activation_test", "Контроль качества", "service", "Индивидуальная проверка срабатывания извещателя", false, literalTrue, []],
  ["f09:fire_alarm_system_cause_effect_test", "Контроль качества", "service", "Испытание сценария матрицы причинно-следственных связей", false, literalTrue, []],
  ["f09:fire_alarm_system_protocol", "Документация", "service", "Итоговый протокол испытаний и пусконаладки", false, literalTrue, []],
  ["f09:fire_alarm_system_as_built", "Документация", "service", "Комплект исполнительной документации системы", false, literalTrue, []],
  ["f09:fire_alarm_system_training", "Передача системы", "service", "Обучение эксплуатационного персонала", false, literalTrue, []],
  ["f09:fire_alarm_system_waste", "Отходы", "service", "Сбор обрезков кабеля и монтажных расходников", false, literalTrue, []],
  ["f09:fire_alarm_system_waste_container", "Материалы", "material", "Маркированная тара для монтажных отходов", true, literalTrue, []],
  ["f09:fire_alarm_system_waste_transport", "Перевозка", "service", "Перевозка монтажных отходов к утверждённому получателю", false, equals("waste_transport_mode", "TRANSPORT_REQUIRED"), []],
] as const);

export const FIRE_ALARM_SYSTEM_EXPANDED_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(ROW_SPECS.map(
  ([rowId, section, category, titleRu, procurementEligible, inclusionAst, titleParameterIds], ordinal) => {
    const [formulaId, unitId] = FORMULA_SPECS[ordinal];
    const resourceGraph = {
      formulaId, normalizedUom: unitId,
      semanticOwnerId: `fire-alarm-system-expanded:${rowId}`,
      costOwner: ordinal === 0 ? "scope" : "resource",
      costTreatment: ordinal === 0 ? "INFORMATIONAL_SCOPE" : "OWN_COST",
      payable: ordinal !== 0, noDoubleCount: true,
      ...(titleParameterIds.length > 0 ? {
        titleSpecificationParameterIds: [...titleParameterIds],
        titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — ",
      } : {}),
      scopeContextParameterIds: ["protected_area_m2", "system_scope_statement",
        "system_project_reference"],
    };
    const sourceMetadata = {
      truth_contract_version: "R3", synthetic: false,
      sourceRole: ordinal === 0 ? "CONFIRMED_COMPLETE_FIRE_ALARM_SYSTEM_SCOPE"
        : "VISIBLE_EDITABLE_PRELIMINARY_COMPLETE_FIRE_ALARM_SYSTEM_PROFILE",
      normativeTrace: [{
        sourceId: FIRE_ALARM_SYSTEM_EXPANDED_SOURCE_ID,
        source_id: FIRE_ALARM_SYSTEM_EXPANDED_SOURCE_ID,
        normId: FIRE_ALARM_SYSTEM_EXPANDED_NORM_ID,
        norm_id: FIRE_ALARM_SYSTEM_EXPANDED_NORM_ID,
        normVersion: FIRE_ALARM_SYSTEM_EXPANDED_SOURCE_METADATA.source_document_version,
        source_title: FIRE_ALARM_SYSTEM_EXPANDED_SOURCE_METADATA.source_title,
        exact_locator: FIRE_ALARM_SYSTEM_EXPANDED_SOURCE_METADATA.exact_locator,
        source_definition_hash: FIRE_ALARM_SYSTEM_EXPANDED_ARTIFACT_SHA256,
      }],
      quantityBasis: ordinal === 0 ? "CONFIRMED_PROTECTED_AREA_INFORMATIONAL_SCOPE"
        : "AUTOMATIC_FROM_AREA_AND_VISIBLE_EDITABLE_PRELIMINARY_SYSTEM_PROFILE",
      excludedUnownedAssumptions: ["claim that preliminary densities or productivity are official norms",
        "hidden classification factor", "non-fire-alarm building electrical distribution",
        "sprinkler, hydrant, smoke-exhaust or pump-station scope", "invented price"],
    };
    return {
      id: `resource-${rowId.replace(/:/gu, "-")}`, row_id: rowId, ordinal, section,
      category, title_ru: titleRu, unit_id: unitId, formula_id: formulaId,
      inclusion_ast: inclusionAst, resource_graph: resourceGraph,
      procurement_eligible: procurementEligible, cost_owner_id: rowId,
      source_metadata: sourceMetadata,
      row_sha256: estimateDeterministicHash({ rowId, ordinal, section, category, titleRu,
        unitId, formulaId, procurementEligible, inclusionAst, resourceGraph, sourceMetadata }),
    };
  },
));

export const FIRE_ALARM_SYSTEM_EXPANDED_SHORT_INPUT = Object.freeze({
  protected_area_m2: 1_000,
  system_scope_statement:
    "Полная адресная система пожарной сигнализации в подтверждённых границах объекта",
});
export const FIRE_ALARM_SYSTEM_EXPANDED_ACCEPTANCE_INPUT = Object.freeze({
  ...FIRE_ALARM_SYSTEM_EXPANDED_SHORT_INPUT,
  ...FIRE_ALARM_SYSTEM_EXPANDED_PRELIMINARY_PROFILE,
});

export function fireAlarmSystemExpandedCompletenessMap() {
  return Object.freeze({
    contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
    sourceKind: "PROJECT_SYSTEM",
    generatedFromCurrentRows: false,
    evidenceSha256: FIRE_ALARM_SYSTEM_EXPANDED_ARTIFACT_SHA256,
    evidenceReferences: [FIRE_ALARM_SYSTEM_EXPANDED_SOURCE_METADATA.official_url,
      "СП КР 21-101:2024 §§12.13–12.24 and §§12.57–12.72",
      "approved project, address schedule, cable journal, cause-effect matrix and commissioning program"],
    catalogVariant: "COMPLETE_ADDRESSABLE_FIRE_ALARM_SYSTEM_NO_HIDDEN_QUANTITY_FACTOR",
    entries: ROW_SPECS.map(([rowId, , category, titleRu], ordinal) => ({
      operationId: rowId.replace("f09:", ""),
      expectedResourceId: `required-operation:${rowId.replace("f09:", "")}`,
      category, specification: titleRu,
      condition: ordinal === 6 ? "visual_alarm_mode=REQUIRED"
        : ordinal === 8 ? "interface_module_mode=REQUIRED"
          : ordinal === 17 ? "firestop_mode=REQUIRED"
            : ordinal === 36 ? "waste_transport_mode=TRANSPORT_REQUIRED"
              : "complete_fire_alarm_system_selected",
      sourceId: FIRE_ALARM_SYSTEM_EXPANDED_SOURCE_ID,
      unitId: FORMULA_SPECS[ordinal][1], formulaId: FORMULA_SPECS[ordinal][0],
      quantityRule: ordinal === 0 ? "CONFIRMED_PROTECTED_AREA_INFORMATIONAL_SCOPE"
        : "AUTOMATIC_FROM_AREA_AND_VISIBLE_EDITABLE_PRELIMINARY_SYSTEM_PROFILE",
      detailPrinciple: "ONE_COMPLETE_FIRE_ALARM_SYSTEM_WITH_NAMED_COMPONENTS_NO_GENERIC_ELECTRICAL_SUBSTITUTE",
      priceRelation: ordinal === 0 ? "INFORMATIONAL_SCOPE" : "OWN_COST_OR_HONESTLY_UNKNOWN",
      resolution: { kind: "ROW", rowId },
    })),
  });
}

export async function compileFireAlarmSystemExpandedR1(
  parameters: Readonly<Record<string, InputValue>>,
): Promise<CanonicalEstimateCompileCoreResult> {
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.fire-alarm-system-expanded-r1",
    catalogId: FIRE_ALARM_SYSTEM_EXPANDED_CATALOG_ID,
    primaryMeasureParameterId: "protected_area_m2",
    parameterDefinitions: [...FIRE_ALARM_SYSTEM_EXPANDED_PARAMETERS],
    formulaDefinitions: [...FIRE_ALARM_SYSTEM_EXPANDED_FORMULAS],
    resourceDefinitions: [...FIRE_ALARM_SYSTEM_EXPANDED_RESOURCES],
    submittedParameters: { ...FIRE_ALARM_SYSTEM_EXPANDED_PRELIMINARY_PROFILE, ...parameters },
    confirmedParameters: {}, currencyCode: "KGS", priceItems: [], maximumResourceRows: 40,
    hashJson: async (value) => JSON.stringify(value),
  });
}
