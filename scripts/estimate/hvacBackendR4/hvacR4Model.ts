import {
  compileFormulaGraph,
  type FormulaAst,
} from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import {
  HVAC_DOMAIN_INVENTORY,
  hvacTechnologyProfile,
  type HvacDomainInventoryRow,
  type HvacTechnologyClass,
  type HvacTechnologyProfile,
} from "../../../src/lib/estimate/v4/domains/heatingVentilationComplete";
import { semanticSha256 } from "./support";
import {
  HVAC_A2_EXTERNAL_NON_DEMOLITION_SPECS,
  hvacA2SpecForCatalogId,
} from "./hvacR4NormativeGapA2";

export type HvacComplexity = "L1" | "L2" | "L3" | "L4" | "L5";
export type HvacComponentKind =
  | "PIPE"
  | "DUCT"
  | "EQUIPMENT"
  | "VALVE"
  | "INSTRUMENT"
  | "MATERIAL"
  | "SUPPORT"
  | "INTERFACE"
  | "DOCUMENT"
  | "TEST"
  | "TEMPORARY"
  | "WASTE";

export type HvacComponent = {
  kind: HvacComponentKind;
  key: string;
  titleRu: string;
  unitId: string;
};

export type HvacActivity = {
  key: string;
  action: string;
  stage: string;
  category: string;
  rowType: string;
  titlePrefixRu: string;
  formulaMode: "QUANTITY" | "LABOR" | "MACHINE" | "LOGISTICS" | "TEST" | "FIXED" | "WASTE";
  procurementEligible: boolean;
};

export type HvacParameter = {
  catalogId: string;
  parameterId: string;
  ordinal: number;
  valueType: "decimal" | "integer" | "boolean" | "enum" | "text";
  unitId: string | null;
  titleRu: string;
  required: boolean;
  defaultValue: null;
  constraints: Record<string, unknown>;
};

export type HvacFormula = {
  catalogId: string;
  formulaId: string;
  outputUnitId: string;
  expressionSource: string;
  ast: FormulaAst;
  inputParameterIds: string[];
};

export type HvacResource = {
  catalogId: string;
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  titleRu: string;
  rowType: string;
  unitId: string;
  formulaId: string;
  inclusionAst: Record<string, unknown>;
  resourceGraph: Record<string, unknown>;
  semanticOwner: string;
  costOwnerId: string | null;
  procurementEligible: boolean;
  sourceMetadata: Record<string, unknown>;
};

export type HvacPassport = {
  catalogId: string;
  familyKey: string;
  subfamilyKey: string;
  complexity: HvacComplexity;
  profile: HvacTechnologyProfile;
  expectedStages: string[];
  expectedCategories: string[];
  engineeringInputs: Array<{ parameterId: string; statusWhenMissing: string; consumerRole: string }>;
  forbiddenDefaults: string[];
  components: HvacComponent[];
  parameters: HvacParameter[];
  formulas: HvacFormula[];
  resources: HvacResource[];
  scenarios: { valid: number; invalid: number };
  passportSha256: string;
};

const componentLines = (source: string): HvacComponent[] => source.trim().split(/\r?\n/)
  .map((line) => line.trim()).filter(Boolean).map((line) => {
    const [kind, key, titleRu, unitId] = line.split("|");
    if (!kind || !key || !titleRu || !unitId) throw new Error(`HVAC_COMPONENT_LINE_RED:${line}`);
    return { kind: kind as HvacComponentKind, key, titleRu, unitId };
  });

const COMMON_COMPONENTS = componentLines(`
TEMPORARY|existing_system_survey|обследование существующей инженерной системы|service
TEMPORARY|project_and_specification_review|проверка проекта и спецификаций|service
TEMPORARY|access_and_lifting_route_survey|проверка доступа и маршрута такелажа|service
TEMPORARY|permit_and_safe_work_plan|наряд-допуск и план безопасного производства работ|service
TEMPORARY|temporary_shutdown_plan|план временного отключения действующей системы|service
TEMPORARY|existing_assets_protection|защита сохраняемых сетей и оборудования|service
INTERFACE|electrical_power_boundary|граница электропитания и защит Electrical owner|service
INTERFACE|bms_points_boundary|граница BMS points и общесистемной автоматики|service
INTERFACE|fire_signal_boundary|граница пожарных сигналов и сценариев Fire owner|service
INTERFACE|structural_load_boundary|передача нагрузок на основания Structural owner|service
INTERFACE|water_drain_boundary|граница подпитки и дренажа Water owner|service
INTERFACE|roof_facade_penetration_boundary|граница кровельной или фасадной проходки|service
DOCUMENT|submittal_register|реестр согласованных submittals|document
DOCUMENT|material_equipment_passports|паспорта материалов и оборудования|document
DOCUMENT|inspection_and_test_plan|план инспекций и испытаний ITP|document
DOCUMENT|as_built_drawings|исполнительные чертежи|document
DOCUMENT|operation_maintenance_manual|руководство по эксплуатации и обслуживанию|document
DOCUMENT|training_and_handover_record|протокол обучения и акт передачи|document
TEST|pre_functional_checklist|предпусковой контрольный лист|test
TEST|integrated_functional_test|комплексное функциональное испытание|test
TEST|final_performance_verification|итоговая проверка производительности|test
WASTE|packaging_segregation|раздельный сбор упаковки|kg
WASTE|metal_scrap_segregation|раздельный сбор металлического лома|kg
WASTE|hazardous_waste_route|маршрут опасных отходов при применимости|kg
WASTE|final_residue_cleanup|финальная очистка зоны работ|service
`);

const L1_COMMON_KEYS = new Set([
  "existing_system_survey",
  "permit_and_safe_work_plan",
  "electrical_power_boundary",
  "as_built_drawings",
  "inspection_and_test_plan",
  "pre_functional_checklist",
  "final_residue_cleanup",
]);

const L2_COMMON_KEYS = new Set([
  ...L1_COMMON_KEYS,
  "project_and_specification_review",
  "access_and_lifting_route_survey",
  "temporary_shutdown_plan",
  "structural_load_boundary",
  "fire_signal_boundary",
  "material_equipment_passports",
  "operation_maintenance_manual",
  "integrated_functional_test",
  "packaging_segregation",
]);

const EXPANDED_PROJECT_COMPONENTS = componentLines(`
TEMPORARY|project_basis_freeze|заморозка project basis и revision|service
TEMPORARY|design_input_gap_register|реестр недостающих инженерных входов|service
TEMPORARY|multidiscipline_coordination_review|междисциплинарная координационная проверка|service
TEMPORARY|construction_sequence_plan|план последовательности производства работ|service
TEMPORARY|heavy_lift_and_access_plan|план тяжёлого такелажа и доступа|service
TEMPORARY|temporary_services_plan|план временных инженерных подключений|service
INTERFACE|architectural_space_boundary|граница помещений и зон обслуживания Architecture owner|service
INTERFACE|structural_opening_boundary|граница проёмов и усилений Structural owner|service
INTERFACE|electrical_load_schedule_boundary|граница ведомости электрических нагрузок Electrical owner|service
INTERFACE|controls_network_boundary|граница сети автоматики BMS/Electrical owner|service
INTERFACE|fire_cause_effect_boundary|граница cause-and-effect Fire owner|service
INTERFACE|water_treatment_boundary|граница водоподготовки Water owner|service
TEST|factory_acceptance_review|проверка программы factory acceptance|test
TEST|site_acceptance_test|site acceptance test|test
TEST|integrated_systems_test|комплексное испытание смежных систем|test
TEST|seasonal_performance_test|сезонное испытание производительности|test
TEST|witness_and_hold_points|освидетельствование witness и hold points|test
DOCUMENT|design_basis_report|отчёт design basis|document
DOCUMENT|equipment_and_material_schedule|ведомость оборудования и материалов|document
DOCUMENT|inspection_request_register|реестр заявок на освидетельствование|document
DOCUMENT|nonconformance_closeout|реестр закрытия несоответствий|document
DOCUMENT|commissioning_plan|план пусконаладки|document
DOCUMENT|systems_manual|systems manual|document
DOCUMENT|asset_register|реестр активов|document
DOCUMENT|spare_parts_register|ведомость запасных частей|document
DOCUMENT|warranty_register|реестр гарантий|document
DOCUMENT|final_handover_dossier|финальное handover dossier|document
`);

const COMPONENTS_BY_CLASS: Readonly<Record<HvacTechnologyClass, readonly HvacComponent[]>> = Object.freeze({
  HEATING_PIPE_NETWORK: componentLines(`
PIPE|supply_heating_pipe|подающий трубопровод отопления|m
PIPE|return_heating_pipe|обратный трубопровод отопления|m
PIPE|branch_pipe|ответвления трубопровода|m
PIPE|drain_pipe|дренажный трубопровод контура|m
PIPE|air_vent_pipe|линия воздухоудаления|m
VALVE|isolation_valve|запорная арматура|item
VALVE|balancing_valve|балансировочная арматура|item
VALVE|drain_valve|дренажная арматура|item
VALVE|air_vent|автоматический воздухоотводчик|item
MATERIAL|elbow_fitting|отводы по проектному диаметру|item
MATERIAL|tee_fitting|тройники по проектному диаметру|item
MATERIAL|reducer_fitting|переходы по проектным диаметрам|item
MATERIAL|joint_seal|уплотнения соединений|item
MATERIAL|welding_brazing_press_consumables|расходные материалы выбранного метода соединения|kg
SUPPORT|pipe_hanger|подвесы трубопровода|item
SUPPORT|pipe_support|опоры трубопровода|item
SUPPORT|fixed_point|неподвижные точки|item
SUPPORT|guide_support|направляющие опоры|item
MATERIAL|pipe_insulation|теплоизоляция трубопровода|m2
MATERIAL|insulation_vapor_barrier|пароизоляционный слой при применимости|m2
MATERIAL|pipe_identification|маркировка трубопровода и направления потока|item
TEST|hydraulic_pressure_test|гидравлическое испытание участков|test
TEST|system_flushing|промывка системы|test
TEST|hydronic_balancing|гидравлическая балансировка|test
`),
  OUTDOOR_HEAT_NETWORK: componentLines(`
PIPE|district_supply_pipe|подающий трубопровод тепловой сети|m
PIPE|district_return_pipe|обратный трубопровод тепловой сети|m
MATERIAL|preinsulated_joint_kit|комплект изоляции стыка предизолированной трубы|item
MATERIAL|weld_joint|сварные стыки трубопровода|item
MATERIAL|branch_assembly|узлы ответвлений|item
MATERIAL|reducer_assembly|переходные узлы|item
VALVE|network_isolation_valve|секционирующая арматура|item
VALVE|drain_assembly|дренажный узел|item
VALVE|air_release_assembly|воздушный узел|item
SUPPORT|fixed_anchor|неподвижная опора тепловой сети|item
SUPPORT|sliding_support|скользящая опора|item
SUPPORT|guide_support_network|направляющая опора|item
EQUIPMENT|bellows_expansion_joint|сильфонный компенсатор|item
PIPE|u_expansion_loop|П-образный компенсационный участок|m
EQUIPMENT|heat_chamber_equipment|оборудование тепловой камеры|item
MATERIAL|protective_casing|защитная оболочка теплоизоляции|m2
MATERIAL|corrosion_protection|антикоррозионная защита|m2
INSTRUMENT|remote_leak_detection_wire|провод системы оперативного дистанционного контроля|m
INSTRUMENT|remote_detection_terminal|терминал системы оперативного контроля|item
INTERFACE|earthworks_boundary|граница траншеи и обратной засыпки Earthworks owner|service
INTERFACE|road_restoration_boundary|граница восстановления покрытия Road owner|service
INTERFACE|survey_boundary|граница исполнительной геодезии Survey owner|service
TEST|weld_visual_inspection|визуальный контроль сварных соединений|test
TEST|weld_ndt|неразрушающий контроль сварных соединений|test
TEST|network_pressure_test|гидравлическое испытание тепловой сети|test
TEST|network_flushing|промывка тепловой сети|test
`),
  HEATING_TERMINAL: componentLines(`
EQUIPMENT|heating_terminal|отопительный прибор проектного типа|item
SUPPORT|terminal_bracket|кронштейны отопительного прибора|item
VALVE|terminal_isolation_valve|запорный клапан прибора|item
VALVE|terminal_control_valve|регулирующий или термостатический клапан|item
VALVE|terminal_balancing_valve|балансировочный клапан прибора|item
VALVE|terminal_air_vent|воздухоотводчик прибора|item
MATERIAL|terminal_connection_set|разъёмные подключения прибора|item
MATERIAL|terminal_seal_set|уплотнения подключений|item
TEST|terminal_leak_test|проверка герметичности подключения|test
TEST|terminal_regulation|настройка и проверка теплоотдачи|test
`),
  HYDRONIC_EQUIPMENT: componentLines(`
EQUIPMENT|primary_hydronic_unit|основной гидравлический агрегат по проектной спецификации|item
EQUIPMENT|duty_pump|рабочий насос|item
EQUIPMENT|standby_pump|резервный насос при проектной применимости|item
EQUIPMENT|plate_heat_exchanger|пластинчатый теплообменник|item
EQUIPMENT|hydraulic_separator|гидравлический разделитель|item
EQUIPMENT|distribution_manifold|распределительный коллектор|item
EQUIPMENT|expansion_vessel|расширительный сосуд|item
EQUIPMENT|pressurization_unit|установка поддержания давления|item
EQUIPMENT|makeup_unit|узел подпитки|item
EQUIPMENT|water_treatment_unit|узел водоподготовки контура|item
VALVE|equipment_isolation_valve|запорная арматура оборудования|item
VALVE|control_valve|регулирующий клапан|item
VALVE|check_valve|обратный клапан|item
VALVE|safety_valve|предохранительный клапан|item
VALVE|strainer|сетчатый фильтр|item
INSTRUMENT|temperature_sensor|датчик температуры|item
INSTRUMENT|pressure_sensor|датчик давления|item
INSTRUMENT|differential_pressure_sensor|датчик перепада давления|item
INSTRUMENT|flow_meter|расходомер|item
INSTRUMENT|heat_meter|теплосчётчик при применимости|item
INSTRUMENT|local_controller|локальный контроллер HVAC|item
INSTRUMENT|valve_actuator|привод регулирующего клапана|item
SUPPORT|equipment_frame|монтажная рама оборудования|item
SUPPORT|vibration_isolator|виброизоляторы оборудования|item
MATERIAL|equipment_connection_pipe|обвязочные трубопроводы|m
MATERIAL|equipment_flexible_connector|гибкие вставки оборудования|item
MATERIAL|equipment_drain|дренаж оборудования|m
MATERIAL|equipment_insulation|изоляция оборудования и обвязки|m2
TEST|equipment_pressure_test|испытание обвязки давлением|test
TEST|pump_rotation_test|проверка направления вращения насоса|test
TEST|control_sequence_test|испытание последовательности управления|test
TEST|hydronic_performance_test|испытание гидравлической производительности|test
`),
  WARM_FLOOR_SYSTEM: componentLines(`
PIPE|floor_heating_circuit|контур водяного тёплого пола|m
MATERIAL|substrate_insulation|теплоизоляция основания|m2
MATERIAL|edge_insulation_strip|краевая изоляционная лента|m
MATERIAL|pipe_fixing_system|система крепления трубы|m2
MATERIAL|movement_joint_sleeve|защитная гильза в деформационном шве|m
EQUIPMENT|floor_heating_manifold|коллектор тёплого пола|item
EQUIPMENT|manifold_cabinet|коллекторный шкаф|item
VALVE|manifold_isolation_valve|запорная арматура коллектора|item
VALVE|circuit_balancing_device|балансировочное устройство контура|item
INSTRUMENT|zone_actuator|зональный привод|item
INSTRUMENT|zone_thermostat|зональный термостат|item
INSTRUMENT|floor_temperature_sensor|датчик температуры пола|item
INTERFACE|floor_screed_boundary|граница стяжки и напольной конструкции Interior owner|service
TEST|circuit_pressure_test_before_closure|испытание контуров до закрытия|test
TEST|circuit_pressure_test_after_closure|испытание контуров после закрытия|test
TEST|circuit_balancing|балансировка контуров|test
`),
  DUCT_NETWORK: componentLines(`
DUCT|straight_round_duct|прямой круглый воздуховод проектного класса|m
DUCT|straight_rectangular_duct|прямой прямоугольный воздуховод проектного класса|m2
DUCT|duct_elbow|отвод воздуховода|item
DUCT|duct_tee|тройник воздуховода|item
DUCT|duct_transition|переход воздуховода|item
DUCT|duct_branch_takeoff|врезка ответвления воздуховода|item
MATERIAL|duct_flange|фланцы воздуховода|m
MATERIAL|duct_gasket|прокладки фланцев|m
MATERIAL|duct_fasteners|крепёж соединений воздуховода|item
MATERIAL|duct_sealant|герметик соединений|kg
SUPPORT|duct_hanger|подвес воздуховода|item
SUPPORT|duct_trapeze|траверса воздуховода|item
SUPPORT|duct_anchor|анкер крепления воздуховода|item
VALVE|volume_control_damper|регулирующий воздушный клапан|item
VALVE|backdraft_damper|обратный воздушный клапан|item
VALVE|fire_damper_mechanical_component|механический компонент противопожарного клапана|item
MATERIAL|flexible_duct_connector|гибкая вставка воздуховода|item
MATERIAL|duct_access_door|лючок обслуживания воздуховода|item
MATERIAL|duct_insulation|теплоизоляция воздуховода|m2
MATERIAL|duct_vapor_barrier|пароизоляция воздуховода|m2
MATERIAL|duct_fire_protection|огнезащита воздуховода при доказанной применимости|m2
MATERIAL|duct_identification|маркировка воздуховода|item
INTERFACE|fire_damper_scenario_boundary|граница пожарного сценария клапана Fire owner|service
TEST|duct_visual_inspection|визуальный контроль воздуховодной сети|test
TEST|duct_leakage_test|испытание плотности воздуховодов|test
TEST|airflow_measurement|измерение расхода воздуха|test
TEST|air_balancing|аэродинамическая балансировка|test
TEST|sound_vibration_test|проверка шума и вибрации|test
`),
  AIR_TERMINAL: componentLines(`
EQUIPMENT|air_terminal|воздухораспределительное устройство проектного типа|item
EQUIPMENT|terminal_plenum|пленум воздухораспределителя|item
VALVE|terminal_balancing_damper|регулирующий клапан терминала|item
MATERIAL|terminal_flexible_connection|гибкое подключение терминала|m
SUPPORT|terminal_frame|монтажная рама терминала|item
MATERIAL|terminal_seal|уплотнение терминала|item
MATERIAL|terminal_label|маркировка терминала|item
TEST|terminal_airflow_measurement|измерение расхода воздуха на терминале|test
TEST|terminal_throw_pattern_check|проверка струи воздухораспределения|test
TEST|terminal_noise_check|проверка шума терминала|test
`),
  AIR_HANDLING_EQUIPMENT: componentLines(`
EQUIPMENT|air_handling_unit|вентиляционная установка проектной конфигурации|item
EQUIPMENT|supply_fan|приточный вентилятор|item
EQUIPMENT|exhaust_fan|вытяжной вентилятор|item
EQUIPMENT|filter_section|секция фильтрации|item
EQUIPMENT|heating_coil|секция нагрева|item
EQUIPMENT|cooling_coil|секция охлаждения|item
EQUIPMENT|heat_recovery_section|секция рекуперации|item
EQUIPMENT|humidification_section|секция увлажнения при применимости|item
EQUIPMENT|sound_attenuator|шумоглушитель|item
VALVE|equipment_isolation_damper|отсечной воздушный клапан|item
VALVE|equipment_control_damper|регулирующий воздушный клапан установки|item
MATERIAL|equipment_flexible_duct_connector|гибкая вставка установки|item
MATERIAL|condensate_drain_pan|поддон конденсата|item
MATERIAL|condensate_drain_line|дренаж конденсата|m
SUPPORT|ahu_base_frame|опорная рама установки|item
SUPPORT|ahu_vibration_isolator|виброизолятор установки|item
INSTRUMENT|filter_pressure_switch|реле перепада давления фильтра|item
INSTRUMENT|freeze_protection_sensor|датчик защиты от замораживания|item
INSTRUMENT|supply_air_temperature_sensor|датчик температуры приточного воздуха|item
INSTRUMENT|fan_speed_drive_interface|интерфейс задания частоты вращения вентилятора|item
INSTRUMENT|local_ahu_controller|локальный контроллер установки|item
TEST|fan_rotation_check|проверка направления вращения вентилятора|test
TEST|filter_integrity_check|проверка целостности фильтрации|test
TEST|condensate_drain_test|испытание отвода конденсата|test
TEST|ahu_airflow_static_pressure_test|проверка расхода и внешнего статического давления|test
TEST|ahu_sequence_test|функциональное испытание последовательности AHU|test
`),
  REFRIGERANT_SYSTEM: componentLines(`
EQUIPMENT|outdoor_refrigerant_unit|наружный холодильный агрегат проектной модели|item
EQUIPMENT|indoor_refrigerant_unit|внутренний блок проектной модели|item
EQUIPMENT|compressor|компрессор|item
EQUIPMENT|condenser|конденсатор|item
EQUIPMENT|evaporator|испаритель|item
EQUIPMENT|receiver|ресивер при применимости|item
EQUIPMENT|oil_separator|маслоотделитель при применимости|item
EQUIPMENT|liquid_separator|отделитель жидкости при применимости|item
PIPE|liquid_refrigerant_pipe|жидкостная холодильная линия|m
PIPE|gas_refrigerant_pipe|газовая холодильная линия|m
PIPE|oil_equalization_pipe|масляная уравнительная линия при применимости|m
MATERIAL|refrigerant_branch_joint|холодильный разветвитель проектной системы|item
MATERIAL|refrigerant_pipe_insulation|изоляция холодильных трубопроводов|m
MATERIAL|refrigerant_pipe_support|крепления холодильных линий|item
VALVE|service_valve|сервисный клапан|item
VALVE|solenoid_valve|соленоидный клапан|item
VALVE|expansion_valve|расширительный клапан|item
MATERIAL|refrigerant_condensate_line|линия отвода конденсата|m
EQUIPMENT|condensate_pump|насос конденсата при применимости|item
INSTRUMENT|refrigerant_leak_detector|датчик утечки хладагента при применимости|item
INSTRUMENT|refrigerant_pressure_sensor|датчик давления холодильного контура|item
INSTRUMENT|refrigerant_temperature_sensor|датчик температуры холодильного контура|item
INTERFACE|refrigerant_safety_ventilation_boundary|граница аварийной вентиляции холодильного помещения|service
TEST|nitrogen_pressure_test|испытание сухим азотом|test
TEST|vacuum_dehydration|вакуумирование и осушка контура|test
TEST|vacuum_hold_test|испытание удержания вакуума|test
TEST|refrigerant_charge_record|контроль проектной заправки хладагента|test
TEST|refrigerant_leak_test|контроль утечек хладагента|test
TEST|cooling_heating_performance_test|проверка холодильной или тепловой производительности|test
WASTE|refrigerant_recovery|извлечение и учёт существующего хладагента|kg
WASTE|refrigerant_cylinder_route|маршрут баллонов и recovered refrigerant|item
`),
  FLUE_CHIMNEY: componentLines(`
DUCT|flue_straight_section|прямой участок газохода|m
DUCT|flue_elbow|отвод газохода|item
DUCT|flue_tee|тройник газохода|item
DUCT|flue_transition|переход газохода|item
EQUIPMENT|chimney_stack_section|секция дымовой трубы|m
EQUIPMENT|draft_fan|дымосос при применимости|item
VALVE|flue_damper|шибер или клапан газохода|item
MATERIAL|flue_expansion_joint|компенсатор газохода|item
MATERIAL|flue_access_door|лючок ревизии газохода|item
MATERIAL|flue_condensate_drain|отвод конденсата газохода|m
MATERIAL|flue_insulation|теплоизоляция газохода|m2
MATERIAL|flue_weather_cladding|защитная наружная оболочка|m2
MATERIAL|flue_seal|высокотемпературное уплотнение|m
SUPPORT|flue_support|опора газохода|item
SUPPORT|stack_guy_or_frame|растяжки или несущая рама трубы|item
INTERFACE|stack_foundation_boundary|граница фундамента дымовой трубы Structural owner|service
INSTRUMENT|flue_temperature_point|точка измерения температуры дымовых газов|item
INSTRUMENT|flue_sampling_point|точка отбора проб дымовых газов|item
TEST|flue_leakage_test|испытание плотности газохода|test
TEST|draft_measurement|измерение тяги|test
TEST|emissions_interface_test|проверка интерфейса контроля выбросов|test
`),
  THERMAL_INSULATION: componentLines(`
MATERIAL|insulation_product|теплоизоляционное изделие проектной марки|m2
MATERIAL|insulation_fastener|крепёж теплоизоляции|item
MATERIAL|vapor_barrier|пароизоляционный материал|m2
MATERIAL|protective_cladding|защитная покровная оболочка|m2
MATERIAL|insulation_joint_tape|лента и материал стыков изоляции|m
MATERIAL|insulation_sealant|герметик изоляционной системы|kg
MATERIAL|removable_insulation_cover|съёмный теплоизоляционный чехол арматуры|item
TEMPORARY|surface_preparation|подготовка изолируемой поверхности|m2
TEST|insulation_thickness_check|контроль толщины изоляции|test
TEST|vapor_barrier_continuity_check|контроль непрерывности пароизоляции|test
TEST|cladding_weather_tightness_check|контроль защитной оболочки|test
`),
  TESTING_BALANCING_COMMISSIONING: componentLines(`
INSTRUMENT|calibrated_thermometer|поверенный термометр|item
INSTRUMENT|calibrated_pressure_gauge|поверенный манометр|item
INSTRUMENT|differential_pressure_meter|измеритель перепада давления|item
INSTRUMENT|airflow_hood|измерительный расходомер воздуха|item
INSTRUMENT|anemometer|анемометр|item
INSTRUMENT|sound_level_meter|шумомер|item
INSTRUMENT|vibration_meter|виброметр|item
INSTRUMENT|refrigerant_service_station|холодильная сервисная станция|item
TEST|point_to_point_test|point-to-point проверка автоматики|test
TEST|alarm_fail_safe_test|проверка аварий и fail-safe состояний|test
TEST|trend_log_review|проверка trend logs|test
TEST|seasonal_commissioning_requirement|обязательство сезонной наладки|test
DOCUMENT|tab_report|отчёт TAB|document
DOCUMENT|commissioning_report|отчёт пусконаладки|document
DOCUMENT|cause_effect_matrix|матрица cause-and-effect|document
`),
});

const SPECIFIC_COMPONENTS: Readonly<Record<string, readonly HvacComponent[]>> = Object.freeze({
  BOILER: componentLines(`EQUIPMENT|boiler_unit|котёл проектного типа и мощности|item\nEQUIPMENT|burner_unit|горелочное устройство проектного топлива|item\nINSTRUMENT|boiler_safety_chain|локальная цепь безопасности котла|item\nINTERFACE|gas_fuel_boundary|граница газового или топливного хозяйства|service`),
  CHILLER: componentLines(`EQUIPMENT|chiller_unit|чиллер проектного типа и холодопроизводительности|item\nEQUIPMENT|buffer_tank|буферная ёмкость холодильного контура|item\nEQUIPMENT|primary_chilled_water_pump|первичный насос холодоснабжения|item\nEQUIPMENT|secondary_chilled_water_pump|вторичный насос холодоснабжения|item\nVALVE|chiller_isolation_valve|запорная арматура чиллера|item\nINSTRUMENT|chiller_local_controller|локальный контроллер чиллера|item`),
  CONDITIONER: componentLines(`EQUIPMENT|conditioner_matched_system|согласованный комплект блоков кондиционирования|item\nMATERIAL|manufacturer_branch_accessories|заводские разветвители по таблице совместимости|item\nEQUIPMENT|conditioner_indoor_section|внутренняя секция кондиционера|item\nEQUIPMENT|conditioner_outdoor_section|наружная секция кондиционера|item\nINSTRUMENT|conditioner_local_controller|локальный контроллер кондиционера|item\nTEST|conditioner_capacity_test|испытание производительности кондиционера|test\nTEST|conditioner_condensate_test|испытание отвода конденсата кондиционера|test`),
  SPLIT: componentLines(`EQUIPMENT|split_indoor_unit|внутренний блок split-системы|item\nEQUIPMENT|split_outdoor_unit|наружный блок split-системы|item\nSUPPORT|outdoor_unit_bracket|кронштейн наружного блока|item`),
  FANCOIL: componentLines(`EQUIPMENT|fan_coil_unit|фанкойл проектного исполнения|item\nVALVE|fan_coil_control_valve|регулирующий клапан фанкойла|item\nMATERIAL|fan_coil_condensate_trap|сифон дренажа фанкойла|item`),
  HEAT_STATION: componentLines(`EQUIPMENT|heat_interface_station|комплект индивидуального теплового пункта|item\nEQUIPMENT|heating_heat_exchanger|теплообменник отопления|item\nEQUIPMENT|dhw_heat_exchanger_boundary|теплообменник ГВС на Water boundary|item`),
  AIR_CURTAIN: componentLines(`EQUIPMENT|air_curtain_unit|воздушно-тепловая завеса|item\nSUPPORT|air_curtain_bracket|кронштейн завесы|item`),
  HOOD: componentLines(`EQUIPMENT|kitchen_exhaust_hood|вытяжной зонт|item\nEQUIPMENT|grease_filter|жироулавливающий фильтр|item\nMATERIAL|grease_drain|дренаж жира|item\nINTERFACE|kitchen_fire_boundary|граница пожарной защиты кухонной вытяжки|service`),
  RECUPERATOR: componentLines(`EQUIPMENT|heat_recovery_exchanger|теплоутилизатор проектного типа|item\nVALVE|heat_recovery_bypass_damper|байпасный клапан рекуперации|item\nINSTRUMENT|heat_recovery_frost_control|контроль обмерзания рекуператора|item`),
  SILENCER: componentLines(`EQUIPMENT|duct_silencer|канальный шумоглушитель проектного сечения|item\nTEST|insertion_loss_verification|проверка акустической эффективности|test`),
  COOLING_TOWER: componentLines(`EQUIPMENT|cooling_tower_cell|секция градирни|item\nEQUIPMENT|cooling_tower_fan|вентилятор градирни|item\nEQUIPMENT|drift_eliminator|каплеуловитель|item\nEQUIPMENT|fill_pack|оросительное устройство|item\nINTERFACE|makeup_blowdown_water_boundary|граница подпитки и продувки Water owner|service`),
});

const SYSTEM_IDENTITY_COMPONENTS: Readonly<Record<string, readonly HvacComponent[]>> = Object.freeze({
  BALANCING: componentLines(`TEST|balancing_measurement_point_set|комплект точек измерения и балансировки|test\nINSTRUMENT|balancing_instrument_set|поверенный комплект приборов балансировки|item`),
  BOILER_HOUSE: componentLines(`EQUIPMENT|boiler_house_process_system|технологическая система котельной по проектной схеме|system`),
  BOILER_INSTALLATION: componentLines(`EQUIPMENT|boiler_installation_assembly|монтажный комплект котельного агрегата|item`),
  CHIMNEY: componentLines(`EQUIPMENT|chimney_system|система дымохода проектного сечения|system`),
  CHIMNEY_STACK: componentLines(`EQUIPMENT|freestanding_chimney_stack|отдельно стоящая дымовая труба проектной высоты|item`),
  COLLECTOR: componentLines(`EQUIPMENT|hydronic_collector_assembly|гидравлический коллекторный узел|item\nVALVE|collector_branch_valve_set|комплект арматуры ветвей коллектора|item`),
  COMMISSIONING: componentLines(`TEST|commissioning_functional_system_set|комплект функциональных испытаний системы|test\nDOCUMENT|commissioning_result_dossier|досье результатов пусконаладки|document`),
  DIFFUSER: componentLines(`EQUIPMENT|air_diffuser_terminal|воздухораспределитель проектного типа|item`),
  DISTRICT_HEATING_PIPELINE: componentLines(`PIPE|district_heating_trunk|магистральный трубопровод теплоснабжения|m`),
  DUCT: componentLines(`DUCT|work_identity_duct|воздуховод проектного профиля и класса|m2`),
  DUCT_INSULATION: componentLines(`MATERIAL|duct_identity_insulation_system|система теплоизоляции воздуховода проектной толщины|m2`),
  EXHAUST: componentLines(`EQUIPMENT|exhaust_air_system|вытяжная вентиляционная система|system`),
  FAN: componentLines(`EQUIPMENT|fan_project_selection|вентилятор проектного типа и рабочей точки|item`),
  GRILLE: componentLines(`EQUIPMENT|air_grille_terminal|вентиляционная решётка проектного типа|item`),
  HEAT_CHAMBER: componentLines(`EQUIPMENT|heat_chamber_process_assembly|технологический узел тепловой камеры|system\nINTERFACE|heat_chamber_structure_boundary|граница строительных конструкций тепловой камеры|service`),
  HEAT_NETWORK: componentLines(`PIPE|heat_network_system|система трубопроводов тепловой сети|m`),
  HEATING_PIPE: componentLines(`PIPE|heating_distribution_pipe|распределительный трубопровод отопления|m`),
  HEATING_PUMP: componentLines(`EQUIPMENT|heating_circulation_pump|циркуляционный насос отопления проектной рабочей точки|item`),
  HVAC_PLANT_ROOM: componentLines(`EQUIPMENT|hvac_plant_room_integrated_system|интегрированный технологический комплекс HVAC машинного помещения|system`),
  INSULATION: componentLines(`MATERIAL|heating_identity_insulation_system|система теплоизоляции отопительного оборудования или трубопровода|m2`),
  PIPELINE_COMPENSATORS: componentLines(`EQUIPMENT|pipeline_expansion_compensator|компенсатор теплового удлинения проектного типа|item\nSUPPORT|compensator_anchor_system|анкерная система компенсатора|item`),
  PREINSULATED_PIPE_INSTALLATION: componentLines(`PIPE|preinsulated_heat_pipe_system|предизолированный трубопровод заводской системы|m\nINSTRUMENT|leak_detection_conductor|проводник оперативного дистанционного контроля|m`),
  RADIATOR: componentLines(`EQUIPMENT|heating_radiator|радиатор проектного материала и теплоотдачи|item\nVALVE|radiator_connection_valve_set|комплект подключения и регулирования радиатора|item`),
  SERVER_ROOM_COOLING: componentLines(`EQUIPMENT|server_room_precision_cooling_system|система прецизионного охлаждения серверного помещения|system`),
  SITE_HEAT_CONNECTION: componentLines(`EQUIPMENT|site_heat_connection_assembly|узел подключения площадки к тепловой сети|system`),
  SUPPLY: componentLines(`EQUIPMENT|supply_air_system|приточная вентиляционная система|system`),
  THERMOSTAT: componentLines(`INSTRUMENT|local_hvac_thermostat|локальный термостат HVAC|item\nINTERFACE|thermostat_wiring_boundary|граница кабельного подключения термостата Electrical owner|service`),
  TUNNEL_VENTILATION: componentLines(`EQUIPMENT|tunnel_ventilation_system|тоннельная вентиляционная система|system\nEQUIPMENT|tunnel_jet_fan|струйный вентилятор тоннеля|item`),
  VENT_CHANNEL: componentLines(`DUCT|natural_ventilation_channel|канал естественной вентиляции проектного сечения|m`),
  VENTILATION_SYSTEM: componentLines(`EQUIPMENT|integrated_ventilation_system|комплектная приточно-вытяжная вентиляционная система|system`),
  WARM_FLOOR: componentLines(`PIPE|warm_floor_circuit|контур водяного тёплого пола|m\nEQUIPMENT|warm_floor_manifold|коллектор тёплого пола|item\nMATERIAL|perimeter_insulation_strip|краевая изоляционная лента|m`),
});

const OPERATION_SCOPE_COMPONENTS: Readonly<Record<string, readonly HvacComponent[]>> = Object.freeze({
  BALANCE: componentLines(`TEMPORARY|balancing_measurement_plan|план точек и последовательности балансировки|service\nINSTRUMENT|balancing_verified_instrument|поверенный прибор балансировки|item\nTEST|balancing_initial_reading|исходное измерение до регулировки|test\nTEST|balancing_final_reading|итоговое измерение после регулировки|test\nDOCUMENT|balancing_result_protocol|протокол фактических результатов балансировки|document`),
  COMMISSION: componentLines(`DOCUMENT|commissioning_sequence_of_operation|проверенная последовательность работы системы|document\nTEST|commissioning_pre_functional_check|предпусковая функциональная проверка|test\nTEST|commissioning_control_sequence_test|испытание последовательностей локального управления|test\nTEST|commissioning_performance_test|функциональное испытание производительности|test\nDOCUMENT|commissioning_handover_record|акт пусконаладки и передачи|document`),
  DEMOLITION: componentLines(`TEMPORARY|demolition_existing_asset_survey|индивидуальное обследование существующего HVAC актива до демонтажа|service\nDOCUMENT|demolition_isolation_and_permit_plan|план изоляции энергоносителей и наряд-допуск на демонтаж|document\nTEMPORARY|demolition_protection_and_access_plan|защита смежных конструкций и безопасный доступ при демонтаже|service\nWASTE|demolition_asset_material_segregation|раздельный учёт демонтированного оборудования и материалов|kg\nWASTE|demolition_hazardous_material_route|типизированный маршрут опасных материалов при подтверждённой применимости|kg\nDOCUMENT|demolition_asset_closeout_register|реестр демонтированных tags, массы, маршрута передачи и закрытия interfaces|document`),
  INSTALL: componentLines(`TEMPORARY|installation_setting_out|разбивка и привязка мест монтажа|service\nDOCUMENT|installation_hold_point_register|реестр hold points монтажа|document`),
  REPAIR: componentLines(`TEMPORARY|repair_defect_survey|индивидуальная дефектация ремонтируемого узла|service\nMATERIAL|repair_parts_schedule|ведомость фактически заменяемых деталей без придуманного состава|item\nTEST|repair_post_assembly_test|повторное испытание после ремонта|test\nDOCUMENT|repair_defect_closeout|закрытие дефектной ведомости|document`),
  REPLACE: componentLines(`TEMPORARY|replacement_isolation_and_drain|изоляция, дренирование или recovery перед заменой|service\nWASTE|replaced_asset_segregation|сортировка заменяемого оборудования и материалов|kg\nEQUIPMENT|replacement_asset_schedule|ведомость нового заменяющего актива проектного выбора|item\nTEST|replacement_recommissioning|повторная пусконаладка после замены|test\nDOCUMENT|replacement_asset_register_update|обновление реестра активов после замены|document`),
  ROUTE: componentLines(`TEMPORARY|route_setting_out_survey|геодезическая или координационная разбивка трассы|service\nDOCUMENT|route_penetration_register|реестр проходок и пересечений трассы|document\nSUPPORT|route_support_coordination|координация опор и подвесов трассы|item\nTEST|route_accessibility_review|проверка доступности трассы для обслуживания|test`),
});

const PROJECTION_SCOPE_COMPONENTS: Readonly<Record<string, readonly HvacComponent[]>> = Object.freeze({
  ROM_CONCEPT: componentLines(`DOCUMENT|rom_design_basis|концептуальный design basis без придуманных мощностей|document\nDOCUMENT|rom_input_gap_register|реестр отсутствующих входов ROM|document\nDOCUMENT|rom_system_alternative_register|реестр допустимых системных альтернатив|document\nDOCUMENT|rom_scope_exclusion_register|реестр границ и исключений ROM|document`),
  PRELIMINARY_BOQ: componentLines(`DOCUMENT|preliminary_system_schedule|предварительная ведомость систем и зон|document\nDOCUMENT|preliminary_takeoff_basis|основание предварительного подсчёта объёмов|document\nDOCUMENT|preliminary_measurement_rules|правила измерения предварительной BOQ|document\nDOCUMENT|preliminary_input_gap_register|реестр недостающих входов preliminary BOQ|document`),
  DETAILED_BOQ_FROM_DRAWINGS: componentLines(`DOCUMENT|detailed_coordinated_drawing_register|реестр координированных рабочих чертежей|document\nDOCUMENT|detailed_segment_tag_schedule|поэлементная ведомость сегментов и equipment tags|document\nDOCUMENT|detailed_connection_schedule|детальная ведомость соединений и подключений|document\nDOCUMENT|detailed_test_point_schedule|детальная ведомость точек испытаний и TAB|document\nDOCUMENT|detailed_procurement_schedule|детальная закупочная ведомость без придуманной цены|document`),
  TENDER_BOQ: componentLines(`DOCUMENT|tender_bidder_scope_matrix|тендерная матрица границ ответственности|document\nDOCUMENT|tender_approved_equal_register|реестр требований approved equal|document\nDOCUMENT|tender_long_lead_register|реестр long-lead оборудования|document\nDOCUMENT|tender_spares_and_vendor_services|ведомость запасных частей и vendor services|document\nDOCUMENT|tender_clarification_register|реестр тендерных уточнений и исключений|document`),
  AS_BUILT_ESTIMATE: componentLines(`DOCUMENT|as_built_field_quantity_reconciliation|сверка фактических полевых объёмов|document\nDOCUMENT|as_built_asset_serial_register|реестр tags, моделей и серийных номеров|document\nDOCUMENT|as_built_test_certificate_register|реестр фактических протоколов испытаний|document\nDOCUMENT|as_built_redline_reconciliation|сверка redline и исполнительных чертежей|document\nDOCUMENT|as_built_commissioning_result_register|реестр фактических результатов пусконаладки|document`),
});

const CONTEXT_COMPONENTS: Readonly<Record<string, readonly HvacComponent[]>> = Object.freeze({
  wet_zone: componentLines(`MATERIAL|wet_zone_corrosion_protection|антикоррозионная защита для влажной зоны|m2\nMATERIAL|wet_zone_penetration_seal|герметизация проходок влажной зоны|item\nTEST|wet_zone_condensate_and_leak_check|контроль конденсата и протечек во влажной зоне|test`),
  large_area: componentLines(`EQUIPMENT|large_area_access_equipment|механизированное средство доступа большой зоны|machine_h\nTEMPORARY|large_area_material_distribution_plan|план распределения материалов по большой зоне|service\nTEST|large_area_zonal_acceptance|поэтапная приёмка зон большой площади|test`),
  small_area: componentLines(`TEMPORARY|confined_access_plan|план работ в стеснённом доступе|service\nMATERIAL|small_area_protection|локальная защита отделки малой зоны|m2\nTEST|small_area_accessibility_check|проверка доступности обслуживания в малой зоне|test`),
  technical_room: componentLines(`SUPPORT|technical_room_service_platform|площадка обслуживания технического помещения|item\nMATERIAL|technical_room_equipment_label|расширенная маркировка оборудования техпомещения|item\nTEST|technical_room_maintenance_clearance_check|проверка сервисных проходов техпомещения|test`),
});

const EXPANDED_COMPONENTS: Readonly<Record<string, readonly HvacComponent[]>> = Object.freeze({
  boiler_house: componentLines(`
EQUIPMENT|boiler_cascade_header|каскадный коллектор котлов|item
EQUIPMENT|economizer|экономайзер при проектной применимости|item
EQUIPMENT|deaerator|деаэратор при проектной применимости|item
EQUIPMENT|feedwater_tank|бак питательной воды|item
EQUIPMENT|feedwater_pump|питательный насос|item
EQUIPMENT|network_pump|сетевой насос|item
EQUIPMENT|makeup_pump|подпиточный насос|item
EQUIPMENT|chemical_water_treatment|оборудование химводоочистки|item
EQUIPMENT|softener|умягчитель подпиточной воды|item
EQUIPMENT|chemical_dosing_unit|установка дозирования реагентов|item
EQUIPMENT|blowdown_separator|сепаратор продувки|item
EQUIPMENT|condensate_tank|бак конденсата|item
EQUIPMENT|condensate_return_pump|насос возврата конденсата|item
EQUIPMENT|flash_steam_tank|бак расширения непрерывной продувки|item
EQUIPMENT|fuel_day_tank_boundary|суточный топливный бак на Fuel owner boundary|item
EQUIPMENT|combustion_air_fan|вентилятор воздуха горения|item
EQUIPMENT|flue_gas_fan|дымосос|item
EQUIPMENT|boiler_room_ventilation_unit|вентиляционная установка котельной|item
EQUIPMENT|boiler_room_air_heater|калорифер вентиляции котельной|item
VALVE|boiler_safety_valve|предохранительный клапан котла|item
VALVE|steam_stop_valve|паровая запорная арматура при применимости|item
VALVE|continuous_blowdown_valve|арматура непрерывной продувки|item
VALVE|intermittent_blowdown_valve|арматура периодической продувки|item
VALVE|fuel_shutoff_boundary|граница отсечного топливного клапана|item
INSTRUMENT|flame_detector|датчик пламени|item
INSTRUMENT|combustion_controller|контроллер горения|item
INSTRUMENT|oxygen_trim_input|вход кислородной коррекции при применимости|item
INSTRUMENT|gas_detection_boundary|граница сигнализатора газа Gas/Fire owner|service
INSTRUMENT|boiler_water_level_control|контроль уровня котловой воды|item
INSTRUMENT|steam_pressure_control|контроль давления пара при применимости|item
INSTRUMENT|makeup_water_meter|счётчик подпиточной воды|item
INSTRUMENT|fuel_meter_boundary|граница учёта топлива Fuel owner|service
INSTRUMENT|emissions_monitoring_interface|интерфейс контроля выбросов|service
INTERFACE|gas_supply_boundary|граница газоснабжения котельной Gas owner|service
INTERFACE|fuel_storage_boundary|граница топливного хозяйства Fuel owner|service
INTERFACE|boiler_foundation_boundary|граница фундаментов котлов Structural owner|service
INTERFACE|chimney_foundation_boundary|граница фундамента дымовой трубы Structural owner|service
INTERFACE|chemical_drain_boundary|граница химических стоков Water/Environmental owner|service
INTERFACE|fire_suppression_boundary|граница пожаротушения Fire owner|service
INTERFACE|boiler_room_power_boundary|граница силового электроснабжения Electrical owner|service
TEST|boiler_hydrostatic_test|гидравлическое испытание котла|test
TEST|burner_interlock_test|испытание блокировок горелки|test
TEST|low_water_cutoff_test|испытание защиты по низкому уровню воды|test
TEST|safety_valve_set_pressure_test|проверка настройки предохранительной арматуры|test
TEST|combustion_analysis|режимно-наладочный анализ горения|test
TEST|boiler_efficiency_test|проверка КПД котельной установки|test
TEST|emissions_measurement_interface|передача результатов измерения выбросов|test
TEST|boiler_cascade_sequence_test|испытание каскадной последовательности|test
DOCUMENT|boiler_passport|паспорт котла|document
DOCUMENT|burner_commissioning_record|режимная карта горелки|document
DOCUMENT|pressure_equipment_conformity|документы соответствия оборудования под давлением|document
DOCUMENT|water_chemistry_log|журнал водно-химического режима|document
DOCUMENT|emissions_record|протокол контроля выбросов|document
DOCUMENT|operator_training_record|протокол обучения персонала котельной|document
`),
  HVAC_plant_room: componentLines(`
EQUIPMENT|plant_primary_heat_exchanger|основной теплообменник машинного помещения|item
EQUIPMENT|plant_secondary_heat_exchanger|резервный или второй теплообменник|item
EQUIPMENT|plant_chiller|холодильная машина машинного помещения|item
EQUIPMENT|plant_boiler|теплогенератор машинного помещения|item
EQUIPMENT|plant_cooling_tower|градирня машинного помещения|item
EQUIPMENT|plant_dry_cooler|сухой охладитель|item
EQUIPMENT|plant_primary_pump|первичный циркуляционный насос|item
EQUIPMENT|plant_secondary_pump|вторичный циркуляционный насос|item
EQUIPMENT|plant_condenser_pump|насос конденсаторного контура|item
EQUIPMENT|plant_buffer_tank|буферная ёмкость|item
EQUIPMENT|plant_expansion_unit|установка поддержания давления|item
EQUIPMENT|plant_air_dirt_separator|сепаратор воздуха и шлама|item
EQUIPMENT|plant_water_treatment|водоподготовка закрытого контура|item
PIPE|plant_heating_supply_header|подающий коллектор отопления|m
PIPE|plant_heating_return_header|обратный коллектор отопления|m
PIPE|plant_chilled_supply_header|подающий коллектор холодоснабжения|m
PIPE|plant_chilled_return_header|обратный коллектор холодоснабжения|m
PIPE|plant_condenser_supply_header|подающий коллектор конденсаторного контура|m
PIPE|plant_condenser_return_header|обратный коллектор конденсаторного контура|m
VALVE|plant_motorized_isolation_valve|моторизованная отсечная арматура|item
VALVE|plant_differential_bypass_valve|клапан перепуска по перепаду давления|item
VALVE|plant_flow_control_valve|регулирующий клапан расхода|item
VALVE|plant_pressure_relief_valve|предохранительный клапан|item
INSTRUMENT|plant_supply_temperature_sensor|датчик температуры подачи|item
INSTRUMENT|plant_return_temperature_sensor|датчик температуры возврата|item
INSTRUMENT|plant_flow_meter|расходомер контура|item
INSTRUMENT|plant_energy_meter|счётчик тепловой или холодильной энергии|item
INSTRUMENT|plant_pressure_sensor|датчик давления контура|item
INSTRUMENT|plant_differential_pressure_sensor|датчик перепада давления контура|item
INSTRUMENT|plant_sequence_controller|локальный контроллер последовательности агрегатов|item
INSTRUMENT|plant_optimization_interface|интерфейс оптимизации BMS|service
INTERFACE|plant_structural_frames_boundary|граница тяжёлых рам и фундаментов Structural owner|service
INTERFACE|plant_electrical_mcc_boundary|граница MCC и силовых feeders Electrical owner|service
INTERFACE|plant_water_makeup_boundary|граница подпитки Water owner|service
INTERFACE|plant_drainage_boundary|граница аварийного дренажа Water owner|service
INTERFACE|plant_fire_scenario_boundary|граница пожарного сценария Fire owner|service
TEST|plant_pressure_test|испытание каждого гидравлического контура|test
TEST|plant_flushing_cleaning|промывка и очистка контуров|test
TEST|plant_water_quality_verification|проверка качества теплоносителя|test
TEST|plant_pump_curve_test|проверка рабочей точки насосов|test
TEST|plant_heat_exchanger_performance_test|проверка производительности теплообменников|test
TEST|plant_chiller_performance_test|проверка производительности чиллера|test
TEST|plant_lead_lag_test|испытание lead-lag последовательности|test
TEST|plant_failover_test|испытание резервирования|test
TEST|plant_trend_log_test|проверка trend logs|test
DOCUMENT|plant_equipment_schedule|итоговая спецификация оборудования|document
DOCUMENT|plant_valve_schedule|ведомость арматуры|document
DOCUMENT|plant_instrument_schedule|ведомость КИП|document
DOCUMENT|plant_points_list|BMS points list|document
DOCUMENT|plant_sequence_of_operations|описание последовательности работы|document
DOCUMENT|plant_functional_performance_report|отчёт функциональных испытаний|document
`),
  server_room_cooling: componentLines(`
EQUIPMENT|precision_crac_unit|прецизионный CRAC агрегат|item
EQUIPMENT|precision_crah_unit|прецизионный CRAH агрегат|item
EQUIPMENT|in_row_cooling_unit|in-row охладитель при применимости|item
EQUIPMENT|rear_door_heat_exchanger|rear-door heat exchanger при наличии проекта|item
EQUIPMENT|redundant_cooling_unit|резервный холодильный агрегат|item
EQUIPMENT|free_cooling_module|модуль free cooling|item
EQUIPMENT|dry_cooler_unit|сухой охладитель|item
EQUIPMENT|cooling_distribution_unit|cooling distribution unit|item
EQUIPMENT|server_cooling_pump|насос серверного холодоснабжения|item
EQUIPMENT|server_cooling_buffer_tank|буферная ёмкость|item
PIPE|server_chilled_supply_pipe|подающий трубопровод серверного холодоснабжения|m
PIPE|server_chilled_return_pipe|обратный трубопровод серверного холодоснабжения|m
PIPE|server_refrigerant_liquid_pipe|жидкостная холодильная линия|m
PIPE|server_refrigerant_gas_pipe|газовая холодильная линия|m
PIPE|server_condensate_main|магистраль конденсата|m
VALVE|server_isolation_valve|запорная арматура серверного охлаждения|item
VALVE|server_control_valve|регулирующий клапан серверного охладителя|item
VALVE|server_leak_isolation_valve|клапан аварийного отсечения|item
INSTRUMENT|server_room_temperature_sensor|датчик температуры серверного помещения|item
INSTRUMENT|server_room_humidity_sensor|датчик влажности серверного помещения|item
INSTRUMENT|server_supply_air_sensor|датчик температуры подаваемого воздуха|item
INSTRUMENT|server_return_air_sensor|датчик температуры возвратного воздуха|item
INSTRUMENT|server_water_leak_sensor|датчик протечки|item
INSTRUMENT|server_refrigerant_leak_sensor|датчик утечки хладагента|item
INSTRUMENT|server_airflow_sensor|датчик расхода воздуха|item
INSTRUMENT|server_differential_pressure_sensor|датчик перепада давления|item
INSTRUMENT|server_cooling_controller|локальный контроллер серверного охлаждения|item
INTERFACE|server_ups_heat_load_input|вход тепловыделений от Electrical/UPS owner|service
INTERFACE|server_floor_plenum_boundary|граница фальшпола Structural/Interior owner|service
INTERFACE|server_bms_alarm_boundary|граница общесистемных тревог BMS|service
INTERFACE|server_fire_shutdown_boundary|граница пожарного отключения Fire owner|service
TEST|server_sensible_capacity_test|проверка явной холодопроизводительности|test
TEST|server_airflow_distribution_test|проверка распределения воздуха|test
TEST|server_redundancy_failover_test|испытание резервирования N+1|test
TEST|server_power_failure_recovery_test|испытание восстановления после потери питания|test
TEST|server_high_temperature_alarm_test|испытание аварии высокой температуры|test
TEST|server_condensate_alarm_test|испытание аварии конденсата|test
TEST|server_leak_alarm_test|испытание сигнализации протечки|test
TEST|server_trend_stability_test|проверка стабильности по trend logs|test
DOCUMENT|server_cooling_capacity_schedule|ведомость холодопроизводительности|document
DOCUMENT|server_redundancy_matrix|матрица резервирования|document
DOCUMENT|server_alarm_matrix|матрица тревог|document
DOCUMENT|server_failover_report|отчёт испытания failover|document
`),
  tunnel_ventilation: componentLines(`
EQUIPMENT|tunnel_supply_fan|приточный тоннельный вентилятор|item
EQUIPMENT|tunnel_exhaust_fan|вытяжной тоннельный вентилятор|item
EQUIPMENT|jet_fan|струйный вентилятор|item
EQUIPMENT|smoke_exhaust_fan_mechanical|механический вентилятор дымоудаления|item
EQUIPMENT|emergency_ventilation_fan|аварийный вентилятор|item
EQUIPMENT|tunnel_silencer|тоннельный шумоглушитель|item
EQUIPMENT|fan_reversal_assembly|узел реверса вентилятора|item
DUCT|tunnel_supply_duct|приточный воздуховод тоннеля|m2
DUCT|tunnel_exhaust_duct|вытяжной воздуховод тоннеля|m2
DUCT|tunnel_smoke_duct|механический дымовой воздуховод|m2
VALVE|tunnel_isolation_damper|отсечной воздушный клапан|item
VALVE|tunnel_smoke_damper_mechanical|механический дымовой клапан|item
VALVE|tunnel_backdraft_damper|обратный клапан тоннельной вентиляции|item
SUPPORT|tunnel_fan_support|опора тоннельного вентилятора|item
SUPPORT|tunnel_duct_support|опора тоннельного воздуховода|item
SUPPORT|tunnel_vibration_isolator|виброизолятор тоннельного оборудования|item
INSTRUMENT|tunnel_co_sensor|датчик CO при проектной применимости|item
INSTRUMENT|tunnel_no2_sensor|датчик NO2 при проектной применимости|item
INSTRUMENT|tunnel_visibility_sensor|датчик видимости|item
INSTRUMENT|tunnel_air_velocity_sensor|датчик скорости воздуха|item
INSTRUMENT|tunnel_temperature_sensor|датчик температуры|item
INSTRUMENT|tunnel_fan_vibration_sensor|датчик вибрации вентилятора|item
INSTRUMENT|tunnel_local_controller|локальный контроллер тоннельной вентиляции|item
INTERFACE|tunnel_fire_scenario_input|вход пожарного сценария Fire owner|service
INTERFACE|tunnel_traffic_control_boundary|граница системы управления движением|service
INTERFACE|tunnel_emergency_power_boundary|граница аварийного питания Electrical owner|service
INTERFACE|tunnel_structural_support_boundary|граница закладных и конструкций Structural owner|service
TEST|tunnel_fan_thrust_test|испытание тяги струйного вентилятора|test
TEST|tunnel_air_velocity_profile_test|измерение профиля скорости воздуха|test
TEST|tunnel_pollutant_sensor_test|испытание датчиков загрязнений|test
TEST|tunnel_fan_reversal_test|испытание реверса вентиляторов|test
TEST|tunnel_emergency_mode_test|испытание аварийного режима|test
TEST|tunnel_fire_mode_interface_test|комплексное испытание пожарного interface|test
TEST|tunnel_noise_test|измерение шума тоннельной вентиляции|test
TEST|tunnel_vibration_test|измерение вибрации вентиляторов|test
EQUIPMENT|tunnel_fan_local_panel_mechanical_boundary|механическая граница локальной панели вентилятора|item
INSTRUMENT|tunnel_motor_temperature_sensor|датчик температуры двигателя вентилятора|item
INSTRUMENT|tunnel_bearing_temperature_sensor|датчик температуры подшипников вентилятора|item
TEST|tunnel_power_loss_recovery_test|испытание восстановления после потери питания|test
DOCUMENT|tunnel_airflow_test_report|отчёт аэродинамических испытаний тоннеля|document
DOCUMENT|tunnel_emergency_mode_matrix|матрица аварийных режимов|document
DOCUMENT|tunnel_fire_interface_matrix|матрица интерфейсов пожарного режима|document
DOCUMENT|tunnel_sensor_calibration_register|реестр поверки датчиков|document
`),
});

const activity = (
  key: string,
  action: string,
  stage: string,
  category: string,
  rowType: string,
  titlePrefixRu: string,
  formulaMode: HvacActivity["formulaMode"],
  procurementEligible = false,
): HvacActivity => ({ key, action, stage, category, rowType, titlePrefixRu, formulaMode, procurementEligible });

const STANDARD_ACTIVITIES = [
  activity("takeoff", "DESIGN", "PROJECT_DATA_AND_SURVEY", "SPECIAL_SERVICE", "service", "Проверка количества и применимости:", "FIXED"),
  activity("submittal", "SUBMITTAL", "PROJECT_DATA_AND_SURVEY", "DOCUMENTATION", "document", "Проверка submittal:", "FIXED"),
  activity("supply", "SUPPLY", "MATERIALS_AND_EQUIPMENT", "MATERIAL", "material", "Поставка:", "QUANTITY", true),
  activity("delivery", "DELIVERY", "DELIVERY_UNLOADING_RIGGING", "LOGISTICS", "transport", "Внешняя логистика:", "LOGISTICS"),
  activity("receiving", "INSPECT", "DELIVERY_UNLOADING_RIGGING", "SPECIAL_SERVICE", "service", "Входной контроль:", "FIXED"),
  activity("storage", "TEMPORARY", "DELIVERY_UNLOADING_RIGGING", "TEMPORARY_WORK", "service", "Складирование и сохранность:", "FIXED"),
  activity("installation", "INSTALL", "INSTALLATION", "CONSTRUCTION_WORK", "work", "Монтаж:", "LABOR"),
  activity("installation_machine", "INSTALL", "INSTALLATION", "MACHINE", "equipment", "Механизация монтажа:", "MACHINE"),
  activity("connection", "CONNECT", "INSTALLATION", "CONSTRUCTION_WORK", "work", "Соединение и подключение:", "LABOR"),
  activity("identification", "DOCUMENT", "INSTALLATION", "DOCUMENTATION", "document", "Маркировка и трассировка:", "FIXED"),
  activity("quality_control", "INSPECT", "TESTING", "TESTING", "testing", "Контроль качества:", "TEST"),
  activity("functional_test", "TEST", "TESTING", "TESTING", "testing", "Испытание:", "TEST"),
  activity("commissioning", "COMMISSION", "TAB_COMMISSIONING", "TAB_COMMISSIONING", "commissioning", "Пусконаладка:", "TEST"),
  activity("as_built_record", "DOCUMENT", "DOCUMENTATION", "DOCUMENTATION", "document", "Исполнительная запись:", "FIXED"),
];

const DEMOLITION_ACTIVITIES = Object.freeze([
  activity("shutdown_isolation", "ISOLATE", "DECOMMISSION_AND_ISOLATION", "CONSTRUCTION_WORK", "work", "Остановка и подтверждённая изоляция:", "LABOR"),
  activity("service_disconnection", "DISCONNECT", "DECOMMISSION_AND_ISOLATION", "CONSTRUCTION_WORK", "work", "Отсоединение в границах HVAC owner:", "LABOR"),
  activity("contained_recovery", "RECOVER", "DECOMMISSION_AND_ISOLATION", "SPECIAL_SERVICE", "service", "Контролируемое извлечение фактически присутствующей рабочей среды:", "FIXED"),
  activity("dismantling", "DEMOLISH", "DEMOLITION", "CONSTRUCTION_WORK", "work", "Поэлементный демонтаж:", "LABOR"),
  activity("dismantling_machine", "DEMOLISH", "DEMOLITION", "MACHINE", "equipment", "Механизация безопасного демонтажа при подтверждённой применимости:", "MACHINE"),
]);
const DEMOLITION_PHYSICAL_KINDS = new Set<HvacComponentKind>(["PIPE", "DUCT", "EQUIPMENT", "VALVE", "INSTRUMENT", "MATERIAL", "SUPPORT"]);

const SPECIAL_OPERATION_ACTIVITIES: Readonly<Record<string, readonly HvacActivity[]>> = Object.freeze({
  PRESSURE_TEST: [activity("exact_pressure_test", "PRESSURE_TEST", "TESTING", "TESTING", "testing", "Испытательная операция:", "TEST")],
  FLUSH: [activity("exact_flush_clean", "FLUSH", "FLUSHING_AND_CLEANING", "SPECIAL_SERVICE", "service", "Промывка или очистка:", "QUANTITY")],
  DIAGNOSTIC: [activity("exact_diagnostics", "DIAGNOSE", "DIAGNOSTICS", "TESTING", "testing", "Диагностическое измерение:", "TEST")],
  DIAGNOSTIC_REPAIR: [
    activity("exact_diagnostics", "DIAGNOSE", "DIAGNOSTICS", "TESTING", "testing", "Диагностическое измерение:", "TEST"),
    activity("exact_repair", "REPAIR", "REPAIR", "CONSTRUCTION_WORK", "work", "Подтверждённый ремонт:", "LABOR"),
  ],
  RECOMMISSION: [activity("exact_recommission", "RECOMMISSION", "TAB_COMMISSIONING", "TAB_COMMISSIONING", "commissioning", "Повторная пусконаладка:", "TEST")],
  SERVICE: [activity("exact_service", "SERVICE", "SERVICE", "SPECIAL_SERVICE", "service", "Самостоятельная сервисная операция:", "LABOR")],
  RECOVERY: [activity("exact_recovery", "RECOVER", "CONTROLLED_MEDIA_RECOVERY", "WASTE", "waste", "Контролируемое извлечение рабочей среды:", "WASTE")],
  CALIBRATE: [activity("exact_calibration", "CALIBRATE", "CALIBRATION", "TESTING", "testing", "Калибровка as-found/as-left:", "TEST")],
  CONSERVE: [activity("exact_conservation", "CONSERVE", "PRESERVATION", "SPECIAL_SERVICE", "service", "Консервация:", "LABOR")],
  DECONSERVE: [activity("exact_deconservation", "DECONSERVE", "PRESERVATION", "SPECIAL_SERVICE", "service", "Расконсервация:", "LABOR")],
});

const ACTIVITIES_BY_KIND: Readonly<Record<HvacComponentKind, readonly HvacActivity[]>> = Object.freeze({
  PIPE: STANDARD_ACTIVITIES,
  DUCT: [...STANDARD_ACTIVITIES, activity("sealing", "SEAL", "INSTALLATION", "CONSTRUCTION_WORK", "work", "Герметизация:", "LABOR")],
  EQUIPMENT: [...STANDARD_ACTIVITIES, activity("rigging", "RIGGING", "DELIVERY_UNLOADING_RIGGING", "TOOL_OR_EQUIPMENT", "equipment", "Такелаж и установка:", "MACHINE"), activity("alignment", "INSTALL", "INSTALLATION", "CONSTRUCTION_WORK", "work", "Выверка и центрирование:", "LABOR")],
  VALVE: STANDARD_ACTIVITIES.filter((item) => !["storage", "installation_machine"].includes(item.key)),
  INSTRUMENT: STANDARD_ACTIVITIES.filter((item) => !["installation_machine", "storage"].includes(item.key)),
  MATERIAL: STANDARD_ACTIVITIES.filter((item) => !["commissioning", "installation_machine"].includes(item.key)),
  SUPPORT: STANDARD_ACTIVITIES.filter((item) => !["commissioning"].includes(item.key)),
  INTERFACE: [
    activity("owner_boundary", "INTERFACE", "TYPED_CHILD_INTERFACES", "TYPED_CHILD_INTERFACE", "interface", "Граница ответственности со смежным разделом:", "FIXED"),
  ],
  DOCUMENT: [
    activity("prepare", "DOCUMENT", "DOCUMENTATION", "DOCUMENTATION", "document", "Подготовка:", "FIXED"),
    activity("technical_review", "DOCUMENT", "DOCUMENTATION", "DOCUMENTATION", "document", "Техническая проверка:", "FIXED"),
    activity("approval", "DOCUMENT", "DOCUMENTATION", "DOCUMENTATION", "document", "Согласование:", "FIXED"),
    activity("issue", "DOCUMENT", "DOCUMENTATION", "DOCUMENTATION", "document", "Выпуск и передача:", "FIXED"),
  ],
  TEST: [
    activity("procedure", "DOCUMENT", "TESTING", "DOCUMENTATION", "document", "Методика:", "FIXED"),
    activity("instrument_readiness", "INSPECT", "TESTING", "TOOL_OR_EQUIPMENT", "equipment", "Подготовка средств измерения:", "FIXED"),
    activity("execution", "TEST", "TESTING", "TESTING", "testing", "Выполнение:", "TEST"),
    activity("witness", "TEST", "TESTING", "SPECIAL_SERVICE", "service", "Освидетельствование:", "TEST"),
    activity("protocol", "DOCUMENT", "DOCUMENTATION", "DOCUMENTATION", "document", "Протокол:", "FIXED"),
  ],
  TEMPORARY: [
    activity("plan", "SAFETY", "PROJECT_DATA_AND_SURVEY", "TEMPORARY_WORK", "service", "Планирование:", "FIXED"),
    activity("mobilization", "TEMPORARY", "TEMPORARY_WORKS", "TEMPORARY_WORK", "service", "Мобилизация:", "FIXED"),
    activity("execution", "SURVEY", "PROJECT_DATA_AND_SURVEY", "SPECIAL_SERVICE", "service", "Выполнение:", "FIXED"),
    activity("protection", "SAFETY", "TEMPORARY_WORKS", "TEMPORARY_WORK", "service", "Защита и безопасность:", "FIXED"),
    activity("closeout", "DOCUMENT", "DOCUMENTATION", "DOCUMENTATION", "document", "Закрывающая запись:", "FIXED"),
  ],
  WASTE: [
    activity("segregation", "WASTE", "WASTE_ENVIRONMENTAL_CLOSEOUT", "WASTE", "waste", "Сортировка:", "WASTE"),
    activity("handling", "WASTE", "WASTE_ENVIRONMENTAL_CLOSEOUT", "LABOR", "work", "Внутреннее перемещение:", "LABOR"),
    activity("transport", "WASTE", "WASTE_ENVIRONMENTAL_CLOSEOUT", "LOGISTICS", "transport", "Вывоз:", "LOGISTICS"),
    activity("disposition", "WASTE", "WASTE_ENVIRONMENTAL_CLOSEOUT", "SPECIAL_SERVICE", "service", "Передача по разрешённому маршруту:", "FIXED"),
    activity("record", "DOCUMENT", "DOCUMENTATION", "DOCUMENTATION", "document", "Подтверждающий документ:", "FIXED"),
  ],
});

const OPERATION_ALLOWED_ACTIONS: Readonly<Record<string, ReadonlySet<string>>> = Object.freeze({
  INSTALL: new Set(["DESIGN", "SUBMITTAL", "SUPPLY", "DELIVERY", "INSPECT", "INSTALL", "RIGGING", "CONNECT", "TEST", "COMMISSION", "DOCUMENT", "WASTE", "INTERFACE", "SAFETY", "SURVEY", "TEMPORARY"]),
  REPAIR: new Set(["DESIGN", "SUBMITTAL", "SUPPLY", "DELIVERY", "INSPECT", "INSTALL", "RIGGING", "CONNECT", "TEST", "COMMISSION", "DOCUMENT", "WASTE", "INTERFACE", "SAFETY", "SURVEY", "TEMPORARY"]),
  REPLACE: new Set(["DESIGN", "SUBMITTAL", "SUPPLY", "DELIVERY", "INSPECT", "INSTALL", "RIGGING", "CONNECT", "TEST", "COMMISSION", "DOCUMENT", "WASTE", "INTERFACE", "SAFETY", "SURVEY", "TEMPORARY"]),
  ROUTE: new Set(["DESIGN", "SUBMITTAL", "SUPPLY", "DELIVERY", "INSPECT", "INSTALL", "RIGGING", "CONNECT", "TEST", "DOCUMENT", "WASTE", "INTERFACE", "SAFETY", "SURVEY", "TEMPORARY"]),
  PREPARE: new Set(["DESIGN", "SUBMITTAL", "INSPECT", "TEMPORARY", "SURVEY", "SAFETY", "DOCUMENT", "INTERFACE"]),
  SEAL: new Set(["SUPPLY", "DELIVERY", "INSTALL", "SEAL", "INSPECT", "TEST", "DOCUMENT", "WASTE", "INTERFACE"]),
  BALANCE: new Set(["DESIGN", "INSPECT", "TEST", "COMMISSION", "DOCUMENT", "INTERFACE"]),
  COMMISSION: new Set(["DESIGN", "INSPECT", "TEST", "COMMISSION", "DOCUMENT", "INTERFACE"]),
  INSULATE: new Set(["DESIGN", "SUPPLY", "DELIVERY", "INSPECT", "INSTALL", "SEAL", "TEST", "DOCUMENT", "WASTE", "INTERFACE"]),
  CONNECT: new Set(["DESIGN", "SUBMITTAL", "SUPPLY", "DELIVERY", "INSPECT", "INSTALL", "CONNECT", "TEST", "COMMISSION", "DOCUMENT", "WASTE", "INTERFACE"]),
  PRESSURE_TEST: new Set(["DESIGN", "INSPECT", "TEST", "PRESSURE_TEST", "DOCUMENT", "INTERFACE", "SAFETY", "TEMPORARY"]),
  FLUSH: new Set(["DESIGN", "SUPPLY", "DELIVERY", "INSPECT", "CONNECT", "TEST", "FLUSH", "DOCUMENT", "WASTE", "INTERFACE", "SAFETY", "TEMPORARY"]),
  DIAGNOSTIC: new Set(["DESIGN", "INSPECT", "TEST", "DIAGNOSE", "DOCUMENT", "INTERFACE", "SAFETY", "SURVEY"]),
  DIAGNOSTIC_REPAIR: new Set(["DESIGN", "SUBMITTAL", "SUPPLY", "DELIVERY", "INSPECT", "INSTALL", "CONNECT", "TEST", "DIAGNOSE", "REPAIR", "DOCUMENT", "WASTE", "INTERFACE", "SAFETY"]),
  RECOMMISSION: new Set(["DESIGN", "INSPECT", "TEST", "COMMISSION", "RECOMMISSION", "DOCUMENT", "INTERFACE"]),
  SERVICE: new Set(["DESIGN", "SUBMITTAL", "SUPPLY", "DELIVERY", "INSPECT", "INSTALL", "CONNECT", "TEST", "SERVICE", "DOCUMENT", "WASTE", "INTERFACE", "SAFETY"]),
  RECOVERY: new Set(["DESIGN", "INSPECT", "ISOLATE", "DISCONNECT", "RECOVER", "TEST", "DOCUMENT", "WASTE", "INTERFACE", "SAFETY"]),
  CALIBRATE: new Set(["DESIGN", "INSPECT", "TEST", "CALIBRATE", "DOCUMENT", "INTERFACE"]),
  CONSERVE: new Set(["DESIGN", "INSPECT", "ISOLATE", "CONSERVE", "TEST", "DOCUMENT", "WASTE", "INTERFACE", "SAFETY", "TEMPORARY"]),
  DECONSERVE: new Set(["DESIGN", "INSPECT", "DECONSERVE", "TEST", "COMMISSION", "DOCUMENT", "WASTE", "INTERFACE", "SAFETY", "TEMPORARY"]),
  DEMOLITION: new Set(["DESIGN", "INSPECT", "ISOLATE", "DISCONNECT", "RECOVER", "DEMOLISH", "RIGGING", "TEST", "DOCUMENT", "WASTE", "INTERFACE", "SAFETY", "SURVEY", "TEMPORARY"]),
});

const DESIGN_INPUTS_BY_CLASS: Readonly<Record<HvacTechnologyClass, readonly string[]>> = Object.freeze({
  HEATING_PIPE_NETWORK: ["heat_load_kw", "supply_temperature_c", "return_temperature_c", "pipe_material", "nominal_diameter_mm", "working_pressure_mpa", "route_length_m"],
  OUTDOOR_HEAT_NETWORK: ["heat_load_kw", "supply_temperature_c", "return_temperature_c", "pipe_material", "nominal_diameter_mm", "working_pressure_mpa", "route_length_m", "soil_and_route_profile"],
  HEATING_TERMINAL: ["heat_load_kw", "terminal_selection_reference", "supply_temperature_c", "return_temperature_c", "component_count"],
  HYDRONIC_EQUIPMENT: ["heat_load_kw", "design_flow_m3_h", "pump_head_kpa", "supply_temperature_c", "return_temperature_c", "equipment_selection_reference", "redundancy_class"],
  WARM_FLOOR_SYSTEM: ["heat_load_kw", "zone_area_m2", "circuit_layout_reference", "supply_temperature_c", "return_temperature_c", "floor_construction_reference"],
  DUCT_NETWORK: ["design_airflow_m3_h", "external_static_pressure_pa", "duct_dimensions_reference", "duct_material", "duct_leakage_class", "fire_smoke_class", "route_length_m"],
  AIR_TERMINAL: ["design_airflow_m3_h", "terminal_selection_reference", "acoustic_limit_db", "component_count"],
  AIR_HANDLING_EQUIPMENT: ["design_airflow_m3_h", "external_static_pressure_pa", "heating_load_kw", "cooling_load_kw", "filter_class", "equipment_selection_reference", "acoustic_limit_db"],
  REFRIGERANT_SYSTEM: ["cooling_load_kw", "heating_load_kw", "refrigerant_type", "manufacturer_charge_kg", "liquid_line_length_m", "gas_line_length_m", "elevation_difference_m", "equipment_selection_reference"],
  FLUE_CHIMNEY: ["flue_gas_flow_input", "flue_temperature_c", "flue_material", "flue_size_reference", "route_length_m", "structural_stack_input"],
  THERMAL_INSULATION: ["surface_area_m2", "service_temperature_c", "insulation_material", "insulation_thickness_mm", "environment_class"],
  TESTING_BALANCING_COMMISSIONING: ["design_airflow_m3_h", "design_flow_m3_h", "commissioning_scope_reference", "measurement_point_count"],
});

function normalizedKey(value: string): string {
  return value.toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function hvacFamilyKey(inventory: HvacDomainInventoryRow): string {
  const profile = hvacTechnologyProfile(inventory);
  return normalizedKey([
    profile.technology_class,
    inventory.primary_material_or_system,
    inventory.operation_class,
    inventory.new_repair_demolition_state,
  ].join("__"));
}

export function hvacComplexity(inventory: HvacDomainInventoryRow): HvacComplexity {
  const a2Spec = hvacA2SpecForCatalogId(inventory.catalog_id);
  if (a2Spec) return a2Spec.complexity;
  const profile = hvacTechnologyProfile(inventory);
  const expanded = inventory.source_domain_id.startsWith("expanded:")
    ? inventory.source_domain_id.slice("expanded:".length)
    : null;
  const projection = inventory.operation_class;
  if (expanded && ["boiler_house", "HVAC_plant_room", "server_room_cooling", "tunnel_ventilation"].includes(expanded)) {
    if (["DETAILED_BOQ_FROM_DRAWINGS", "TENDER_BOQ", "AS_BUILT_ESTIMATE"].includes(projection)) return "L5";
    return projection === "PRELIMINARY_BOQ" ? "L4" : "L3";
  }
  if (expanded) {
    if (["DETAILED_BOQ_FROM_DRAWINGS", "TENDER_BOQ", "AS_BUILT_ESTIMATE"].includes(projection)) return "L4";
    return "L3";
  }
  if (inventory.operation_class === "PREPARE") {
    return ["HEATING_TERMINAL", "AIR_TERMINAL", "THERMAL_INSULATION", "TESTING_BALANCING_COMMISSIONING"].includes(profile.technology_class)
      ? "L1"
      : "L2";
  }
  if (["SEAL", "INSULATE"].includes(inventory.operation_class)) {
    return ["HEATING_TERMINAL", "AIR_TERMINAL", "TESTING_BALANCING_COMMISSIONING"].includes(profile.technology_class)
      ? "L1"
      : "L2";
  }
  if (["BALANCE", "COMMISSION"].includes(inventory.operation_class)) {
    return ["HYDRONIC_EQUIPMENT", "AIR_HANDLING_EQUIPMENT", "REFRIGERANT_SYSTEM", "OUTDOOR_HEAT_NETWORK"].includes(profile.technology_class)
      ? "L2"
      : "L1";
  }
  if (["HEATING_TERMINAL", "AIR_TERMINAL", "THERMAL_INSULATION", "TESTING_BALANCING_COMMISSIONING"].includes(profile.technology_class)) return "L1";
  if (profile.technology_class === "HEATING_PIPE_NETWORK") return inventory.operation_class === "CONNECT" ? "L2" : "L3";
  if (profile.technology_class === "WARM_FLOOR_SYSTEM") return "L2";
  if (["OUTDOOR_HEAT_NETWORK", "DUCT_NETWORK", "AIR_HANDLING_EQUIPMENT"].includes(profile.technology_class)) return "L3";
  if (profile.technology_class === "REFRIGERANT_SYSTEM") {
    return ["CHILLER", "CONDITIONER"].includes(inventory.primary_material_or_system) ? "L4" : "L3";
  }
  if (profile.technology_class === "HYDRONIC_EQUIPMENT") {
    return ["HEAT_STATION", "BOILER"].includes(inventory.primary_material_or_system) ? "L4" : "L3";
  }
  return "L3";
}

function uniqueComponents(items: readonly HvacComponent[]): HvacComponent[] {
  const result = new Map<string, HvacComponent>();
  for (const item of items) result.set(item.key, item);
  return [...result.values()].sort((left, right) => left.key.localeCompare(right.key));
}

export function hvacComponents(inventory: HvacDomainInventoryRow): HvacComponent[] {
  const profile = hvacTechnologyProfile(inventory);
  const complexity = hvacComplexity(inventory);
  const a2Spec = hvacA2SpecForCatalogId(inventory.catalog_id);
  const expanded = inventory.source_domain_id.startsWith("expanded:")
    ? inventory.source_domain_id.slice("expanded:".length)
    : null;
  const common = complexity === "L1"
    ? COMMON_COMPONENTS.filter((item) => L1_COMMON_KEYS.has(item.key))
    : complexity === "L2"
      ? COMMON_COMPONENTS.filter((item) => L2_COMMON_KEYS.has(item.key))
      : COMMON_COMPONENTS;
  const components = [
    ...common,
    ...(a2Spec
      ? componentLines(a2Spec.components.join("\n"))
      : [
        ...COMPONENTS_BY_CLASS[profile.technology_class],
        ...(SPECIFIC_COMPONENTS[inventory.primary_material_or_system] ?? []),
        ...(SYSTEM_IDENTITY_COMPONENTS[inventory.primary_material_or_system] ?? []),
      ]),
    ...(OPERATION_SCOPE_COMPONENTS[inventory.operation_class] ?? []),
    ...(PROJECTION_SCOPE_COMPONENTS[inventory.operation_class] ?? []),
    ...(CONTEXT_COMPONENTS[inventory.scope_capability] ?? []),
    ...(expanded ? EXPANDED_COMPONENTS[expanded] ?? [] : []),
    ...((expanded || a2Spec) && ["L3", "L4", "L5"].includes(complexity) ? EXPANDED_PROJECT_COMPONENTS : []),
  ];
  return uniqueComponents(components);
}

function actionsFor(inventory: HvacDomainInventoryRow, component: HvacComponent): HvacActivity[] {
  const allowed = OPERATION_ALLOWED_ACTIONS[inventory.operation_class];
  const complexity = hvacComplexity(inventory);
  const complexityAllowed = complexity === "L1"
    ? new Set(["DESIGN", "SUPPLY", "INSTALL", "CONNECT", "TEST", "DOCUMENT", "INTERFACE", "SAFETY", "SURVEY", "WASTE", "PRESSURE_TEST", "FLUSH", "DIAGNOSE", "REPAIR", "RECOMMISSION", "SERVICE", "RECOVER", "CALIBRATE", "CONSERVE", "DECONSERVE"])
    : complexity === "L2"
      ? new Set(["DESIGN", "SUBMITTAL", "SUPPLY", "DELIVERY", "INSPECT", "INSTALL", "CONNECT", "TEST", "COMMISSION", "DOCUMENT", "INTERFACE", "SAFETY", "SURVEY", "WASTE", "PRESSURE_TEST", "FLUSH", "DIAGNOSE", "REPAIR", "RECOMMISSION", "SERVICE", "RECOVER", "CALIBRATE", "CONSERVE", "DECONSERVE"])
      : null;
  const baseActivities = inventory.operation_class === "DEMOLITION" && DEMOLITION_PHYSICAL_KINDS.has(component.kind)
    ? [...ACTIVITIES_BY_KIND[component.kind], ...DEMOLITION_ACTIVITIES]
    : ACTIVITIES_BY_KIND[component.kind];
  const specialActivities = SPECIAL_OPERATION_ACTIVITIES[inventory.operation_class] ?? [];
  const activities = specialActivities.length > 0 && ["PIPE", "DUCT", "EQUIPMENT", "VALVE", "INSTRUMENT", "TEST", "WASTE", "TEMPORARY"].includes(component.kind)
    ? [...baseActivities, ...specialActivities]
    : baseActivities;
  return activities.filter((item) =>
    (!allowed || allowed.has(item.action)) &&
    (!complexityAllowed || complexityAllowed.has(item.action)));
}

function parameter(
  catalogId: string,
  ordinal: number,
  parameterId: string,
  titleRu: string,
  valueType: HvacParameter["valueType"],
  unitId: string | null,
  source: string,
  consumers: readonly string[],
): HvacParameter {
  return {
    catalogId,
    parameterId,
    ordinal,
    valueType,
    unitId,
    titleRu,
    required: true,
    defaultValue: null,
    constraints: {
      min: valueType === "decimal" || valueType === "integer" ? Number.EPSILON : null,
      max: null,
      values: valueType === "enum" ? ["PROJECT_SPECIFIED"] : null,
      source,
      missingStatus: source,
      consumers,
      hiddenDefault: false,
    },
  };
}

function formulaFor(
  catalogId: string,
  rowKey: string,
  component: HvacComponent,
  activityItem: HvacActivity,
): HvacFormula {
  const quantityId = `${component.key}_quantity`;
  let expression = quantityId;
  let outputUnitId = component.unitId;
  if (activityItem.formulaMode === "FIXED") {
    expression = quantityId;
    outputUnitId = component.unitId;
  } else if (activityItem.formulaMode === "LABOR") {
    expression = `${quantityId} * ${component.key}_labor_norm`;
    outputUnitId = "worker_h";
  } else if (activityItem.formulaMode === "MACHINE") {
    expression = `${quantityId} * ${component.key}_machine_norm`;
    outputUnitId = "machine_h";
  } else if (activityItem.formulaMode === "LOGISTICS") {
    expression = `${quantityId} * ${component.key}_mass_kg_per_unit / 1000 * delivery_distance_km`;
    outputUnitId = "t_km";
  } else if (activityItem.formulaMode === "TEST") {
    expression = `ceil(${quantityId} / ${component.key}_test_interval)`;
    outputUnitId = "test";
  } else if (activityItem.formulaMode === "WASTE") {
    expression = `${quantityId} * ${component.key}_waste_factor`;
    outputUnitId = component.unitId;
  }
  const compiled = compileFormulaGraph(expression);
  return {
    catalogId,
    formulaId: `hvac-r4:${normalizedKey(catalogId)}:${rowKey}:formula`,
    outputUnitId,
    expressionSource: compiled.source,
    ast: compiled.ast,
    inputParameterIds: compiled.inputParameterIds,
  };
}

function designInputsFor(inventory: HvacDomainInventoryRow): readonly string[] {
  const profile = hvacTechnologyProfile(inventory);
  const a2Spec = hvacA2SpecForCatalogId(inventory.catalog_id);
  return Object.freeze([...new Set([
    ...DESIGN_INPUTS_BY_CLASS[profile.technology_class],
    ...(a2Spec?.requiredInputs ?? []),
  ])].sort());
}

function normativeRoute(inventory: HvacDomainInventoryRow, profile: HvacTechnologyProfile, activityItem: HvacActivity): { sourceId: string; locator: string; role: string } {
  const a2Spec = hvacA2SpecForCatalogId(inventory.catalog_id);
  if (a2Spec) {
    return {
      sourceId: a2Spec.sourceId,
      locator: `${a2Spec.sourceTable}; ${a2Spec.sourceItem}; source page ${a2Spec.sourcePage}`,
      role: activityItem.action === "COMMISSION" || activityItem.action === "RECOMMISSION"
        ? "COMMISSIONING_REQUIREMENT"
        : a2Spec.sourceId === "sn_kr_41_04_2022"
          ? "DESIGN_INSTALL_TEST_REQUIREMENT_AND_INDIVIDUAL_RATE_INPUT_ROUTE"
          : "RESOURCE_RATE_OR_TECHNICAL_SCOPE",
    };
  }
  if (activityItem.category === "TAB_COMMISSIONING" || activityItem.action === "COMMISSION") {
    if (profile.technology_class === "REFRIGERANT_SYSTEM") return { sourceId: "kg_krerp06_2015", locator: "Technical part and applicable commissioning table for refrigeration/compressor installation; exact equipment selection required", role: "COMMISSIONING_REQUIREMENT" };
    if (["HYDRONIC_EQUIPMENT", "OUTDOOR_HEAT_NETWORK", "HEATING_PIPE_NETWORK"].includes(profile.technology_class)) return { sourceId: "kg_krerp07_2015", locator: "Technical part and applicable heat-power equipment commissioning table; exact equipment selection required", role: "COMMISSIONING_REQUIREMENT" };
    return { sourceId: "kg_krerp03_2015", locator: "Technical part and applicable ventilation/air-conditioning commissioning table; exact system selection required", role: "COMMISSIONING_REQUIREMENT" };
  }
  if (profile.technology_class === "OUTDOOR_HEAT_NETWORK") return { sourceId: "kg_krer24_2015", locator: "Technical part; section for outdoor heat-supply networks; exact pipe/material/diameter rate selected from project inputs", role: "RESOURCE_RATE" };
  if (profile.technology_class === "THERMAL_INSULATION") return { sourceId: "kg_krer26_2015", locator: "Technical part; heat-insulation work tables; exact insulation system and thickness selected from project inputs", role: "RESOURCE_RATE" };
  if (["DUCT_NETWORK", "AIR_TERMINAL", "AIR_HANDLING_EQUIPMENT"].includes(profile.technology_class)) return { sourceId: "kg_krer20_2015", locator: "Technical part; ventilation and air-conditioning sections; exact component/material/size table selected from project inputs", role: "RESOURCE_RATE" };
  if (["HYDRONIC_EQUIPMENT", "FLUE_CHIMNEY"].includes(profile.technology_class)) return { sourceId: "kg_krerm06_2015", locator: "Technical part; heat-power equipment section; exact equipment mass and configuration table selected from project inputs", role: "RESOURCE_RATE" };
  if (profile.technology_class === "REFRIGERANT_SYSTEM") return { sourceId: "kg_krerm07_2015", locator: "Technical part; compressor/pump/fan equipment section; exact model and mass table selected from manufacturer/project inputs", role: "RESOURCE_RATE" };
  return { sourceId: "kg_krer18_2015", locator: "Technical part; internal heating systems section; exact component/material/diameter table selected from project inputs", role: "RESOURCE_RATE" };
}

function buildRows(inventory: HvacDomainInventoryRow, components: readonly HvacComponent[]): { parameters: HvacParameter[]; formulas: HvacFormula[]; resources: HvacResource[] } {
  const profile = hvacTechnologyProfile(inventory);
  const familyKey = hvacFamilyKey(inventory);
  const parameters: HvacParameter[] = [];
  const formulas: HvacFormula[] = [];
  const resources: HvacResource[] = [];
  const parameterConsumers = new Map<string, Set<string>>();
  const addConsumer = (id: string, rowId: string) => {
    const consumers = parameterConsumers.get(id) ?? new Set<string>();
    consumers.add(rowId);
    parameterConsumers.set(id, consumers);
  };
  let ordinal = 0;
  for (const component of components) {
    for (const activityItem of actionsFor(inventory, component)) {
      const rowKey = `${component.key}_${activityItem.key}`;
      const rowId = `hvac-r4:${normalizedKey(inventory.catalog_id)}:${rowKey}`;
      const formula = formulaFor(inventory.catalog_id, rowKey, component, activityItem);
      formula.inputParameterIds.forEach((id) => addConsumer(id, rowId));
      const normative = normativeRoute(inventory, profile, activityItem);
      const priceRoute = component.kind === "INTERFACE"
        ? "CHILD_OWNER_ESTIMATE"
        : activityItem.procurementEligible || ["MATERIAL", "TOOL_OR_EQUIPMENT"].includes(activityItem.category)
          ? "PRICE_INPUT_REQUIRED"
          : "OFFICIAL_RESOURCE_RATE";
      const priceSourceId = priceRoute === "CHILD_OWNER_ESTIMATE"
        ? `child-owner:${component.key}`
        : priceRoute === "PRICE_INPUT_REQUIRED"
          ? ["DUCT_NETWORK", "AIR_TERMINAL", "AIR_HANDLING_EQUIPMENT", "REFRIGERANT_SYSTEM"].includes(profile.technology_class)
            ? "kg_price_book23_2015"
            : "kg_price_book22_2015"
          : normative.sourceId;
      const priceLocator = priceRoute === "CHILD_OWNER_ESTIMATE"
        ? `Typed child ${component.key}; price is owned by the immutable child revision and is never duplicated in HVAC`
        : priceRoute === "PRICE_INPUT_REQUIRED"
          ? `Applicable ${priceSourceId} material/equipment group; exact item, unit price and current dated snapshot are INPUT_REQUIRED`
          : `${normative.locator}; exact official rate code is INPUT_REQUIRED until the row applicability inputs are supplied`;
      formulas.push(formula);
      resources.push({
        catalogId: inventory.catalog_id,
        rowId,
        ordinal: ordinal++,
        section: activityItem.stage,
        category: activityItem.category,
        titleRu: `${activityItem.titlePrefixRu} ${component.titleRu}`,
        rowType: activityItem.rowType,
        unitId: formula.outputUnitId,
        formulaId: formula.formulaId,
        inclusionAst: {
          kind: "and",
          conditions: [
            { kind: "equals", parameterId: "work_included", value: true },
            { kind: "greater_than", parameterId: `${component.key}_quantity`, value: 0 },
          ],
        },
        resourceGraph: {
          version: "ResourceGraph.hvac-r4.v1",
          catalogId: inventory.catalog_id,
          familyKey,
          componentKey: component.key,
          componentKind: component.kind,
          operation: activityItem.action,
          stage: activityItem.stage,
          quantityBasis: formula.expressionSource,
          parameterSources: formula.inputParameterIds,
          formulaAstSha256: semanticSha256(formula.ast),
          backendOwner: "HVAC_HEAT_SUPPLY_BACKEND",
          typedChild: component.kind === "INTERFACE",
        },
        semanticOwner: component.kind === "INTERFACE"
          ? `typed-child:${component.key}`
          : `hvac:${familyKey}:${component.key}:${activityItem.key}`,
        costOwnerId: component.kind === "INTERFACE" ? null : `hvac-cost:${component.key}:${activityItem.key}`,
        procurementEligible: activityItem.procurementEligible,
        sourceMetadata: {
          schemaVersion: "hvac-r4-resource-row.v1",
          backendOwner: "HVAC_HEAT_SUPPLY_BACKEND",
          catalogId: inventory.catalog_id,
          familyKey,
          complexity: hvacComplexity(inventory),
          component,
          activity: activityItem,
          formula: {
            expression: formula.expressionSource,
            inputParameterIds: formula.inputParameterIds,
            outputUnitId: formula.outputUnitId,
            astSha256: semanticSha256(formula.ast),
            rounding: "ROUND_HALF_UP_9_AFTER_AGGREGATION",
          },
          normativeTrace: [
            {
              source_id: "sn_kr_41_04_2022",
              locator: `Applicable ${profile.technology_class} design/install/test provisions; project inputs remain mandatory`,
              rule_role: activityItem.action === "TEST" ? "TEST_REQUIREMENT" : "DESIGN_OR_INSTALLATION_REQUIREMENT",
              applicability: `${profile.technology_class}/${inventory.operation_class}/${component.kind}`,
            },
            {
              source_id: normative.sourceId,
              locator: normative.locator,
              rule_role: normative.role,
              applicability: `${component.kind}/${activityItem.action}; exact rate code is INPUT_REQUIRED until material, size and execution method are supplied`,
            },
          ],
          priceRoute,
          priceSourceId,
          priceLocator,
          priceStatus: priceRoute === "CHILD_OWNER_ESTIMATE" ? "CHILD_OWNER" : priceRoute === "PRICE_INPUT_REQUIRED" ? "PRICE_INPUT_REQUIRED" : "RATE_SELECTION_INPUT_REQUIRED",
          priceSnapshotStatus: priceRoute === "PRICE_INPUT_REQUIRED" ? "CURRENT_DATED_MARKET_SNAPSHOT_REQUIRED" : "NOT_APPLICABLE_UNTIL_RATE_OR_CHILD_SELECTION",
          applicabilityPredicate: `work_included && ${component.key}_quantity > 0`,
          ownerBoundary: component.kind === "INTERFACE" ? {
            child_owner: component.key.replace(/_boundary$/, "").toLocaleUpperCase("en-US"),
            child_scope_key: component.key,
            handoff_inputs: designInputsFor(inventory),
            handoff_outputs: ["child_revision_id", "accepted_quantity_basis"],
            quantity_basis: "system_count",
            exclusion_reason: "Explicit typed-child prevents HVAC double counting",
            pricing_owner: "CHILD_OWNER_ESTIMATE",
            revision_binding: "IMMUTABLE_CHILD_REVISION_REQUIRED",
          } : null,
          padding: false,
          inventedEngineeringValue: false,
        },
      });
    }
  }
  const generalParameters: Array<[string, string, HvacParameter["valueType"], string | null, string]> = [
    ["work_included", "Работа включена в проектный scope", "boolean", null, "PROJECT_INPUT_REQUIRED"],
    ["system_count", "Количество проектных систем", "integer", "system", "PROJECT_INPUT_REQUIRED"],
    ["delivery_distance_km", "Проверенное расстояние доставки", "decimal", "km", "PROJECT_INPUT_REQUIRED"],
  ];
  for (const input of designInputsFor(inventory)) {
    generalParameters.push([input, input.replaceAll("_", " "), input.includes("reference") || input.includes("material") || input.includes("class") || input.includes("type") || input.includes("profile") ? "text" : "decimal", null, `${input.toLocaleUpperCase("en-US")}_REQUIRED`]);
  }
  let parameterOrdinal = 0;
  for (const [id, title, valueType, unit, source] of generalParameters) {
    const consumers = parameterConsumers.get(id) ?? new Set<string>(resources.slice(0, 1).map((row) => row.rowId));
    parameters.push(parameter(inventory.catalog_id, parameterOrdinal++, id, title, valueType, unit, source, [...consumers]));
  }
  const parameterIds = new Set(parameters.map((item) => item.parameterId));
  for (const component of components) {
    const modes = new Set(actionsFor(inventory, component).map((item) => item.formulaMode));
    const componentParameters: Array<[string, string, string, string]> = [
      [`${component.key}_quantity`, `Проектное количество: ${component.titleRu}`, component.unitId, "PROJECT_INPUT_REQUIRED"],
    ];
    if (modes.has("LABOR")) componentParameters.push([`${component.key}_labor_norm`, `Норма труда: ${component.titleRu}`, `worker_h_per_${component.unitId}`, "OFFICIAL_RATE_INPUT_REQUIRED"]);
    if (modes.has("MACHINE")) componentParameters.push([`${component.key}_machine_norm`, `Норма машинного времени: ${component.titleRu}`, `machine_h_per_${component.unitId}`, "OFFICIAL_RATE_INPUT_REQUIRED"]);
    if (modes.has("LOGISTICS")) componentParameters.push([`${component.key}_mass_kg_per_unit`, `Масса единицы: ${component.titleRu}`, `kg_per_${component.unitId}`, "MANUFACTURER_DATA_REQUIRED"]);
    if (modes.has("TEST")) componentParameters.push([`${component.key}_test_interval`, `Интервал испытаний: ${component.titleRu}`, `${component.unitId}_per_test`, "OFFICIAL_OR_PROJECT_TEST_PLAN_REQUIRED"]);
    if (modes.has("WASTE")) componentParameters.push([`${component.key}_waste_factor`, `Коэффициент фактических отходов: ${component.titleRu}`, "ratio", "PROJECT_WASTE_PLAN_REQUIRED"]);
    for (const [id, title, unit, source] of componentParameters) {
      if (parameterIds.has(id)) continue;
      parameters.push(parameter(inventory.catalog_id, parameterOrdinal++, id, title, "decimal", unit, source, [...(parameterConsumers.get(id) ?? [])]));
      parameterIds.add(id);
    }
  }
  const formulaInputs = new Set(formulas.flatMap((item) => item.inputParameterIds));
  for (const input of formulaInputs) {
    if (!parameterIds.has(input)) throw new Error(`HVAC_FORMULA_PARAMETER_MISSING:${inventory.catalog_id}:${input}`);
  }
  return { parameters, formulas, resources };
}

function scenariosFor(complexity: HvacComplexity): { valid: number; invalid: number } {
  const valid = { L1: 3, L2: 5, L3: 8, L4: 12, L5: 18 }[complexity];
  const invalid = { L1: 4, L2: 6, L3: 10, L4: 15, L5: 20 }[complexity];
  return { valid, invalid };
}

export function buildHvacPassport(inventory: HvacDomainInventoryRow): HvacPassport {
  const profile = hvacTechnologyProfile(inventory);
  const familyKey = hvacFamilyKey(inventory);
  const complexity = hvacComplexity(inventory);
  const components = hvacComponents(inventory);
  const { parameters, formulas, resources } = buildRows(inventory, components);
  const engineeringInputs = designInputsFor(inventory).map((parameterId) => ({
    parameterId,
    statusWhenMissing: `${parameterId.toLocaleUpperCase("en-US")}_REQUIRED`,
    consumerRole: ["airflow", "load", "capacity", "diameter", "refrigerant", "temperature", "pressure", "selection", "dimensions"].some((token) => parameterId.includes(token))
      ? "EQUIPMENT_SELECTION_OR_CONSTRAINT"
      : "FORMULA_OR_APPLICABILITY",
  }));
  const withoutHash = {
    catalogId: inventory.catalog_id,
    familyKey,
    subfamilyKey: normalizedKey(`${inventory.scope_capability}:${profile.system_purpose}:${profile.medium_or_air_system}`),
    complexity,
    profile,
    expectedStages: [...new Set(resources.map((row) => row.section))].sort(),
    expectedCategories: [...new Set(resources.map((row) => row.category))].sort(),
    engineeringInputs,
    forbiddenDefaults: ["airflow", "heat_load", "cooling_load", "pipe_diameter", "duct_size", "equipment_capacity", "refrigerant_type", "refrigerant_charge", "price"],
    components,
    parameters,
    formulas,
    resources,
    scenarios: scenariosFor(complexity),
  };
  return { ...withoutHash, passportSha256: semanticSha256(withoutHash) };
}

const HVAC_EXTERNAL_DEMOLITION_SPECS = Object.freeze([
  {
    catalogId: "external-hvac:heating-pipe-network-demolition:r4",
    titleRu: "Декомиссия и демонтаж трубопроводов отопления",
    technologyClass: "HEATING_PIPE_NETWORK" as HvacTechnologyClass,
  },
  {
    catalogId: "external-hvac:duct-network-demolition:r4",
    titleRu: "Декомиссия и демонтаж сети воздуховодов",
    technologyClass: "DUCT_NETWORK" as HvacTechnologyClass,
  },
  {
    catalogId: "external-hvac:air-handling-equipment-demolition:r4",
    titleRu: "Декомиссия и демонтаж приточно-вытяжной установки",
    technologyClass: "AIR_HANDLING_EQUIPMENT" as HvacTechnologyClass,
  },
  {
    catalogId: "external-hvac:chiller-refrigerant-system-demolition:r4",
    titleRu: "Декомиссия, recovery хладагента и демонтаж chiller-контура",
    technologyClass: "REFRIGERANT_SYSTEM" as HvacTechnologyClass,
  },
]);

function buildExternalDemolitionInventory(): readonly HvacDomainInventoryRow[] {
  return Object.freeze(HVAC_EXTERNAL_DEMOLITION_SPECS.map((spec) => {
    const prototype = HVAC_DOMAIN_INVENTORY.find((candidate) =>
      hvacTechnologyProfile(candidate).technology_class === spec.technologyClass
      && candidate.scope_capability === "standard");
    if (!prototype) throw new Error(`HVAC_EXTERNAL_DEMOLITION_PROTOTYPE_MISSING:${spec.technologyClass}`);
    const workKey = spec.catalogId.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
    const withoutInventoryHash = {
      ...prototype,
      catalog_id: spec.catalogId,
      work_key: workKey,
      title_ru: spec.titleRu,
      catalog_group: "expanded_complex_1610" as const,
      operation_class: "DEMOLITION",
      new_repair_demolition_state: "DEMOLITION" as const,
      scope_capabilities: ["existing_asset_controlled_demolition"],
      candidate_canonical_technology_id: `hvac-external-technology:${workKey}`,
      alias_candidate_of: null,
      existing_passport_id: null,
      existing_schema_id: null,
      existing_formula_pack_id: null,
      existing_normative_profile_id: null,
      current_readiness: "DOMAIN_GREEN" as const,
      current_blockers: [],
      classification_evidence: [
        "A1_SECTION_23_PRIMARY_DEMOLITION_MATRIX",
        "MISSING_FROM_GLOBAL_11610_EXTERNAL_CANONICAL_EXTENSION",
        `TECHNOLOGY_CLASS=${spec.technologyClass}`,
      ],
      source_hash: semanticSha256({ catalogId: spec.catalogId, kind: "HVAC_EXTERNAL_DEMOLITION_SOURCE" }),
      row_hash: semanticSha256({ catalogId: spec.catalogId, operation: "DEMOLITION", technologyClass: spec.technologyClass }),
      scope_capability: "existing_asset_controlled_demolition",
      canonical_technology_id: `hvac_heat_supply:external-technology:${workKey}`,
      display_title_ru: spec.titleRu,
      localized_name_ru: spec.titleRu,
      template_id: `domain-passport:${spec.catalogId}:r4`,
      work_type: "demolition",
      record_role: "PRIMARY" as const,
      equivalence_group_id: null,
    };
    return {
      ...withoutInventoryHash,
      source_inventory_hash: semanticSha256(withoutInventoryHash),
    } as HvacDomainInventoryRow;
  }).sort((left, right) => left.catalog_id.localeCompare(right.catalog_id)));
}

function buildExternalA2NonDemolitionInventory(): readonly HvacDomainInventoryRow[] {
  return Object.freeze(HVAC_A2_EXTERNAL_NON_DEMOLITION_SPECS.map((spec) => {
    const prototype = HVAC_DOMAIN_INVENTORY.find((candidate) =>
      candidate.primary_material_or_system === spec.prototypeMaterial
      && hvacTechnologyProfile(candidate).technology_class === spec.technologyClass
      && candidate.scope_capability === "standard")
      ?? HVAC_DOMAIN_INVENTORY.find((candidate) =>
        candidate.primary_material_or_system === spec.prototypeMaterial
        && hvacTechnologyProfile(candidate).technology_class === spec.technologyClass)
      ?? HVAC_DOMAIN_INVENTORY.find((candidate) =>
        hvacTechnologyProfile(candidate).technology_class === spec.technologyClass);
    if (!prototype) throw new Error(`HVAC_A2_EXTERNAL_PROTOTYPE_MISSING:${spec.catalogId}:${spec.technologyClass}`);
    const workKey = spec.catalogId.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
    const repairLike = ["REPAIR", "DIAGNOSTIC_REPAIR", "SERVICE", "FLUSH", "RECOMMISSION", "CONSERVE", "DECONSERVE"].includes(spec.operationClass);
    const withoutInventoryHash = {
      ...prototype,
      catalog_id: spec.catalogId,
      work_key: workKey,
      title_ru: spec.titleRu,
      catalog_group: "expanded_complex_1610" as const,
      operation_class: spec.operationClass,
      new_repair_demolition_state: repairLike ? "REPAIR" as const : "NEW" as const,
      scope_capabilities: ["a2_normative_external_exact"],
      candidate_canonical_technology_id: `hvac-a2-external-technology:${workKey}`,
      alias_candidate_of: null,
      existing_passport_id: null,
      existing_schema_id: null,
      existing_formula_pack_id: null,
      existing_normative_profile_id: null,
      current_readiness: "DOMAIN_GREEN" as const,
      current_blockers: [],
      classification_evidence: [
        "A2_TABLE_BY_TABLE_NORMATIVE_GAP_LEDGER",
        "MISSING_FROM_GLOBAL_11610_EXTERNAL_CANONICAL_EXTENSION",
        `SOURCE_ID=${spec.sourceId}`,
        `TABLE=${spec.sourceTable}`,
        `ITEM=${spec.sourceItem}`,
        `TECHNOLOGY_CLASS=${spec.technologyClass}`,
        `OPERATION_CLASS=${spec.operationClass}`,
        "COUNTS_TOWARD_GLOBAL_QUEUE=false",
      ],
      source_hash: semanticSha256({
        catalogId: spec.catalogId,
        sourceId: spec.sourceId,
        sourceTable: spec.sourceTable,
        sourceItem: spec.sourceItem,
        kind: "HVAC_A2_EXTERNAL_NORMATIVE_SOURCE",
      }),
      row_hash: semanticSha256({
        catalogId: spec.catalogId,
        operation: spec.operationClass,
        technologyClass: spec.technologyClass,
        components: spec.components,
        requiredInputs: spec.requiredInputs,
      }),
      scope_capability: "a2_normative_external_exact",
      canonical_technology_id: `hvac_heat_supply:a2-external-technology:${workKey}`,
      display_title_ru: spec.titleRu,
      localized_name_ru: spec.titleRu,
      template_id: `domain-passport:${spec.catalogId}:a2-r4`,
      work_type: spec.operationClass.toLocaleLowerCase("en-US"),
      record_role: "PRIMARY" as const,
      equivalence_group_id: null,
      source_identity: `${spec.sourceId}:${spec.sourceTable}:${spec.sourceItem}`,
      revision_lineage: "BATCH007_R4_A2_INITIAL_EXTERNAL_REVISION",
      counts_toward_global_queue: false,
    };
    return {
      ...withoutInventoryHash,
      source_inventory_hash: semanticSha256(withoutInventoryHash),
    } as HvacDomainInventoryRow;
  }).sort((left, right) => left.catalog_id.localeCompare(right.catalog_id)));
}

export const HVAC_R4_EXTERNAL_DEMOLITION_INVENTORY = buildExternalDemolitionInventory();
export const HVAC_R4_EXTERNAL_A2_NON_DEMOLITION_INVENTORY = buildExternalA2NonDemolitionInventory();
export const HVAC_R4_EXTERNAL_INVENTORY = Object.freeze([
  ...HVAC_R4_EXTERNAL_DEMOLITION_INVENTORY,
  ...HVAC_R4_EXTERNAL_A2_NON_DEMOLITION_INVENTORY,
].sort((left, right) => left.catalog_id.localeCompare(right.catalog_id)));

let cachedPassports: readonly HvacPassport[] | null = null;

export function buildAllHvacPassports(): readonly HvacPassport[] {
  if (!cachedPassports) {
    cachedPassports = Object.freeze([...HVAC_DOMAIN_INVENTORY, ...HVAC_R4_EXTERNAL_INVENTORY].map(buildHvacPassport)
      .sort((left, right) => left.catalogId.localeCompare(right.catalogId)));
  }
  return cachedPassports;
}

export const HVAC_R4_OFFICIAL_SOURCES = Object.freeze([
  { sourceId: "sn_kr_41_04_2022", documentCode: "СН КР 41-04:2022", titleRu: "Отопление, вентиляция и кондиционирование воздуха", authority: "Министерство строительства Кыргызской Республики", officialUrl: "https://minstroy.gov.kg/ru/kyzmat/169/show", status: "ACTIVE", role: "DESIGN_INSTALL_TEST_REQUIREMENT" },
  { sourceId: "kg_krer18_2015", documentCode: "КРЕР №18", titleRu: "Отопление — внутренние устройства", authority: "Министерство строительства Кыргызской Республики", officialUrl: "https://minstroy.gov.kg/ru/kyzmat/434/show", status: "ACTIVE_RATE_BASE_INPUT_SELECTION_REQUIRED", role: "RESOURCE_RATE" },
  { sourceId: "kg_krer20_2015", documentCode: "КРЕР №20", titleRu: "Вентиляция и кондиционирование воздуха", authority: "Министерство строительства Кыргызской Республики", officialUrl: "https://minstroy.gov.kg/ru/kyzmat/436/show", status: "ACTIVE_RATE_BASE_INPUT_SELECTION_REQUIRED", role: "RESOURCE_RATE" },
  { sourceId: "kg_krer24_2015", documentCode: "КРЕР №24", titleRu: "Теплоснабжение и газопроводы — наружные сети", authority: "Министерство строительства Кыргызской Республики", officialUrl: "https://minstroy.gov.kg/ru/kyzmat/440/show", status: "ACTIVE_RATE_BASE_INPUT_SELECTION_REQUIRED", role: "RESOURCE_RATE" },
  { sourceId: "kg_krer26_2015", documentCode: "КРЕР №26", titleRu: "Теплоизоляционные работы", authority: "Министерство строительства Кыргызской Республики", officialUrl: "https://minstroy.gov.kg/ru/kyzmat/442/show", status: "ACTIVE_RATE_BASE_INPUT_SELECTION_REQUIRED", role: "RESOURCE_RATE" },
  { sourceId: "kg_krerm06_2015", documentCode: "КРЕРм №6", titleRu: "Теплосиловое оборудование", authority: "Министерство строительства Кыргызской Республики", officialUrl: "https://minstroy.gov.kg/ru/kyzmat/365/show", status: "ACTIVE_RATE_BASE_INPUT_SELECTION_REQUIRED", role: "RESOURCE_RATE" },
  { sourceId: "kg_krerm07_2015", documentCode: "КРЕРм №7", titleRu: "Компрессорные установки, насосы и вентиляторы", authority: "Министерство строительства Кыргызской Республики", officialUrl: "https://minstroy.gov.kg/ru/kyzmat/366/show", status: "ACTIVE_RATE_BASE_INPUT_SELECTION_REQUIRED", role: "RESOURCE_RATE" },
  { sourceId: "kg_krerp03_2015", documentCode: "КРЕРп №3", titleRu: "Системы вентиляции и кондиционирования", authority: "Министерство строительства Кыргызской Республики", officialUrl: "https://minstroy.gov.kg/ru/kyzmat/406/show", status: "ACTIVE_RATE_BASE_INPUT_SELECTION_REQUIRED", role: "COMMISSIONING_REQUIREMENT" },
  { sourceId: "kg_krerp06_2015", documentCode: "КРЕРп №6", titleRu: "Холодильные и компрессорные установки", authority: "Министерство строительства Кыргызской Республики", officialUrl: "https://minstroy.gov.kg/ru/kyzmat/409/show", status: "ACTIVE_RATE_BASE_INPUT_SELECTION_REQUIRED", role: "COMMISSIONING_REQUIREMENT" },
  { sourceId: "kg_krerp07_2015", documentCode: "КРЕРп №7", titleRu: "Теплоэнергетическое оборудование", authority: "Министерство строительства Кыргызской Республики", officialUrl: "https://minstroy.gov.kg/ru/kyzmat/410/show", status: "ACTIVE_RATE_BASE_INPUT_SELECTION_REQUIRED", role: "COMMISSIONING_REQUIREMENT" },
  { sourceId: "kg_price_book22_2015", documentCode: "Книга 22", titleRu: "Материалы и изделия для систем теплоснабжения", authority: "Министерство строительства Кыргызской Республики", officialUrl: "https://minstroy.gov.kg/ru/kyzmat/273/show", status: "ACTIVE_PRICE_REFERENCE_CURRENT_SNAPSHOT_REQUIRED", role: "MATERIAL_PRICE_REFERENCE" },
  { sourceId: "kg_price_book23_2015", documentCode: "Книга 23", titleRu: "Материалы и изделия для систем вентиляции и кондиционирования", authority: "Министерство строительства Кыргызской Республики", officialUrl: "https://minstroy.gov.kg/ru/kyzmat/275/show", status: "ACTIVE_PRICE_REFERENCE_CURRENT_SNAPSHOT_REQUIRED", role: "MATERIAL_PRICE_REFERENCE" },
  { sourceId: "kg_krerr65_2015", documentCode: "КРЕРр №65", titleRu: "Внутренние санитарно-технические работы (Книга 2, сборник 65)", authority: "Министерство строительства Кыргызской Республики", officialUrl: "https://minstroy.gov.kg/ru/kyzmat/415/show", status: "ACTIVE_RATE_BASE_INPUT_SELECTION_REQUIRED", role: "REPAIR_RESOURCE_RATE" },
  { sourceId: "kg_krer_application_2015", documentCode: "Указания КРЕР-2015", titleRu: "Указания по применению КРЕР на строительные и специальные строительные работы", authority: "Министерство строительства Кыргызской Республики", officialUrl: "https://minstroy.gov.kg/ru/kyzmat/359/show", status: "ACTIVE_APPLICATION_INSTRUCTION", role: "RATE_APPLICATION_INSTRUCTION" },
  { sourceId: "kg_krerm_application_2015", documentCode: "Указания КРЕРм-2015", titleRu: "Указания по применению КРЕР на монтаж оборудования", authority: "Министерство строительства Кыргызской Республики", officialUrl: "https://minstroy.gov.kg/ru/kyzmat/353/show", status: "ACTIVE_APPLICATION_INSTRUCTION", role: "RATE_APPLICATION_INSTRUCTION" },
  { sourceId: "kg_krerp_application_2015", documentCode: "Указания КРЕРп-2015", titleRu: "Указания по применению КРЕР на пусконаладочные работы", authority: "Министерство строительства Кыргызской Республики", officialUrl: "https://minstroy.gov.kg/ru/kyzmat/357/show", status: "ACTIVE_APPLICATION_INSTRUCTION", role: "RATE_APPLICATION_INSTRUCTION" },
  { sourceId: "kg_krerr_application_2015", documentCode: "Указания КРЕРр-2015", titleRu: "Указания по применению КРЕР на ремонтно-строительные работы", authority: "Министерство строительства Кыргызской Республики", officialUrl: "https://minstroy.gov.kg/ru/kyzmat/358/show", status: "ACTIVE_APPLICATION_INSTRUCTION", role: "RATE_APPLICATION_INSTRUCTION" },
  { sourceId: "kg_order_52_npa_2022", documentCode: "Приказ №52-нпа от 28.04.2022", titleRu: "Изменения к общим указаниям и национальным сборникам", authority: "Госстрой Кыргызской Республики", officialUrl: "https://minstroy.gov.kg/ru/kyzmat/60/show", status: "AMENDMENT_APPLICABILITY_REVIEW_REQUIRED", role: "AMENDMENT" },
]);
