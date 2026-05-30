import type { DynamicProfessionalBoqRow, EstimatorReasoningPlan } from "../estimatorKernel/estimatorKernelTypes";
import {
  resolveInfrastructureBoqDepthPolicy,
  type InfrastructureBoqDepthWorkKind,
} from "./buildInfrastructureBoqDepthPolicy";

function round2(value: number): number {
  return Math.max(0.01, Math.round(value * 100) / 100);
}

function row(
  sectionType: DynamicProfessionalBoqRow["sectionType"],
  code: string,
  name: string,
  unit: string,
  quantity: number,
  unitPrice: number,
  materialKey?: string,
): DynamicProfessionalBoqRow {
  return {
    sectionType,
    code,
    name,
    unit,
    quantity,
    unitPrice,
    materialKey,
    rateKey: `dynamic_infrastructure_${code}`,
    sourcePolicy: "configured_reference",
    comment: "Infrastructure BOQ depth policy row backed by the estimator semantic frame.",
  };
}

function pavingStoneDepthRows(plan: EstimatorReasoningPlan): DynamicProfessionalBoqRow[] {
  const area = Math.max(1, plan.quantities.areaM2 ?? 1);
  const edge = Math.max(8, round2(Math.sqrt(area) * 4));
  const soilM3 = round2(area * 0.18);
  const crushedStoneM3 = round2(area * 0.12);
  return [
    row("labor", "paving_geodesy_axis", "Геодезическая разбивка осей мощения", "set", 1, 5200),
    row("labor", "paving_level_marks", "Перенос высотных отметок и уклонов покрытия", "set", 1, 4800),
    row("labor", "paving_existing_surface_check", "Обследование существующего основания и водоотвода", "set", 1, 3600),
    row("labor", "paving_site_clearance", "Подготовка площадки и расчистка зоны работ", "sq_m", area, 45),
    row("labor", "paving_topsoil_removal", "Снятие плодородного слоя / слабого грунта", "m3", round2(area * 0.08), 720),
    row("delivery", "paving_soil_loading", "Погрузка вынутого грунта", "m3", soilM3, 260),
    row("delivery", "paving_soil_haulage", "Вывоз грунта после устройства корыта", "trip", Math.max(1, Math.ceil(soilM3 / 8)), 5600),
    row("labor", "paving_subgrade_compaction", "Уплотнение грунтового основания", "sq_m", area, 85),
    row("labor", "paving_subgrade_acceptance", "Контроль плотности и отметок основания", "sq_m", area, 35),
    row("materials", "paving_geotextile_overlap", "Геотекстиль с нахлестами и подрезкой", "sq_m", round2(area * 1.12), 74, "geotextile"),
    row("labor", "paving_geotextile_laying", "Укладка геотекстиля с выпуском к краям", "sq_m", round2(area * 1.12), 38),
    row("materials", "paving_sand_leveling_layer", "Песчаный выравнивающий слой", "m3", round2(area * 0.05), 1550, "sand"),
    row("labor", "paving_sand_spreading", "Распределение и протяжка песчаного слоя", "sq_m", area, 90),
    row("materials", "paving_lower_crushed_stone_layer", "Нижний слой щебеночного основания", "m3", round2(crushedStoneM3 * 0.58), 1900, "crushed_stone"),
    row("materials", "paving_upper_crushed_stone_layer", "Верхний слой щебеночного основания", "m3", round2(crushedStoneM3 * 0.42), 2050, "crushed_stone"),
    row("equipment", "paving_layer_plate_compactor", "Послойное уплотнение основания виброплитой", "shift", Math.max(1, Math.ceil(area / 220)), 6800),
    row("equipment", "paving_roller", "Каток для уплотнения основания при большой площади", "shift", Math.max(1, Math.ceil(area / 600)), 16500),
    row("labor", "paving_drainage_slope_forming", "Формирование уклонов к водоотводу", "sq_m", area, 65),
    row("labor", "paving_curb_trench", "Разработка канавки под бордюр / поребрик", "linear_m", edge, 150),
    row("materials", "paving_curb_bedding_concrete", "Бетонная подготовка под бордюр", "m3", round2(edge * 0.035), 5600, "concrete"),
    row("labor", "paving_curb_alignment", "Выставление бордюра по шнуру и отметкам", "linear_m", edge, 240),
    row("materials", "paving_edge_restraint", "Краевые ограничители и крепеж мощения", "linear_m", edge, 210, "edge_restraint"),
    row("labor", "paving_hatches_adjustment", "Подгонка отметок люков и примыканий", "pcs", Math.max(1, Math.ceil(area / 250)), 2800),
    row("materials", "paving_tactile_or_edge_tiles", "Доборные / тактильные элементы при примыканиях", "sq_m", round2(area * 0.02), 980, "paving_stone"),
    row("labor", "paving_pattern_layout", "Раскладка рисунка и стартовых рядов брусчатки", "sq_m", area, 65),
    row("labor", "paving_edge_zone_laying", "Укладка краевых зон и примыканий", "linear_m", edge, 180),
    row("labor", "paving_curve_cutting", "Резка брусчатки по радиусам и люкам", "linear_m", round2(edge * 0.22), 260),
    row("equipment", "paving_cutting_tool", "Аренда резчика брусчатки / алмазного инструмента", "shift", Math.max(1, Math.ceil(edge / 80)), 6200),
    row("equipment", "paving_compaction_mat", "Виброуплотнение покрытия через защитный коврик", "shift", Math.max(1, Math.ceil(area / 260)), 7200),
    row("labor", "paving_joint_first_sweep", "Первичное заполнение швов песком / смесью", "sq_m", area, 55),
    row("labor", "paving_joint_second_sweep", "Повторная прометка и досыпка швов после уплотнения", "sq_m", area, 45),
    row("labor", "paving_drainage_interface", "Сопряжение мощения с лотками / водоприемниками", "linear_m", Math.max(4, round2(edge * 0.18)), 220),
    row("delivery", "paving_unloading", "Разгрузка и складирование брусчатки и инертных", "trip", Math.max(1, Math.ceil(area / 220)), 5200),
    row("delivery", "paving_internal_movement", "Перемещение паллет и инертных по площадке", "set", 1, Math.round(area * 18)),
    row("labor", "paving_quality_levels", "Контроль ровности покрытия правилом", "sq_m", area, 35),
    row("labor", "paving_quality_thickness", "Контроль толщины слоев основания", "set", 1, 3600),
    row("labor", "paving_as_built_measurement", "Исполнительный обмер фактической площади мощения", "set", 1, 2800),
    row("labor", "paving_site_cleanup", "Финишная уборка покрытия и примыканий", "sq_m", area, 30),
    row("materials", "paving_waste_reserve", "Резерв брусчатки на бой и добор", "sq_m", round2(area * 0.03), 720, "paving_stone_reserve"),
  ];
}

function drainageChannelDepthRows(plan: EstimatorReasoningPlan): DynamicProfessionalBoqRow[] {
  const length = Math.max(1, plan.quantities.lengthM ?? 1);
  const trenchM3 = round2(length * 0.18);
  return [
    row("labor", "drainage_route_survey", "Обследование трассы линейного водоотвода", "set", 1, 4200),
    row("labor", "drainage_geodesic_marks", "Геодезические отметки верха лотков и уклонов", "linear_m", length, 85),
    row("labor", "drainage_utility_scan", "Проверка пересечений с сетями и выпуском", "set", 1, 5200),
    row("labor", "drainage_surface_opening", "Вскрытие существующего покрытия по трассе", "linear_m", length, 180),
    row("labor", "drainage_trench_shaping", "Формирование траншеи под лотки", "linear_m", length, 210),
    row("equipment", "drainage_trench_safety", "Крепление / безопасная организация траншеи", "set", 1, 6800),
    row("labor", "drainage_bottom_compaction", "Уплотнение дна траншеи", "linear_m", length, 70),
    row("delivery", "drainage_soil_loading", "Погрузка грунта из траншеи", "m3", trenchM3, 260),
    row("delivery", "drainage_soil_haulage", "Вывоз грунта с трассы водоотвода", "trip", Math.max(1, Math.ceil(trenchM3 / 8)), 5600),
    row("materials", "drainage_geotextile_overlap", "Геотекстиль с нахлестами в траншее", "sq_m", round2(length * 0.85), 74, "geotextile"),
    row("labor", "drainage_geotextile_laying", "Укладка геотекстиля по основанию траншеи", "linear_m", length, 48),
    row("materials", "drainage_sand_leveling", "Песчаный выравнивающий слой под лотки", "m3", round2(length * 0.08), 1600, "sand"),
    row("labor", "drainage_sand_leveling_work", "Выравнивание песчаной подготовки", "linear_m", length, 95),
    row("materials", "drainage_crushed_stone_compacted", "Щебеночное основание с уплотнением", "m3", round2(length * 0.12), 1950, "crushed_stone"),
    row("equipment", "drainage_crushed_stone_compaction", "Уплотнение щебеночного основания", "shift", Math.max(1, Math.ceil(length / 120)), 6500),
    row("materials", "drainage_concrete_bedding", "Бетонная подготовка под дренажные лотки", "m3", round2(length * 0.06), 5600, "concrete"),
    row("labor", "drainage_concrete_bedding_pour", "Устройство бетонной подготовки под лотки", "linear_m", length, 240),
    row("materials", "drainage_channel_modules", "Дренажные лотки / каналы по классу нагрузки", "linear_m", length, 2400, "drainage_channel"),
    row("materials", "drainage_grate_modules", "Решетки для дренажных лотков", "linear_m", length, 1550, "drainage_grate"),
    row("materials", "drainage_end_caps", "Заглушки и торцевые элементы лотков", "set", 1, 3800, "drainage_fittings"),
    row("materials", "drainage_silt_trap", "Пескоуловитель / смотровой элемент", "pcs", Math.max(1, Math.ceil(length / 60)), 12500, "silt_trap"),
    row("materials", "drainage_outlet_pipe", "Труба подключения к выпуску", "linear_m", Math.max(3, round2(length * 0.08)), 820, "drainage_pipe"),
    row("labor", "drainage_channel_alignment", "Выставление лотков по отметкам и уклону", "linear_m", length, 420),
    row("labor", "drainage_grate_install", "Монтаж решеток и фиксаторов", "linear_m", length, 180),
    row("materials", "drainage_joint_sealant", "Герметик / уплотнение стыков лотков", "set", Math.max(1, Math.ceil(length / 12)), 950, "sealant"),
    row("labor", "drainage_joint_sealing", "Герметизация стыков дренажных лотков", "linear_m", length, 120),
    row("labor", "drainage_expansion_gaps", "Устройство температурных зазоров и примыканий", "linear_m", length, 75),
    row("labor", "drainage_outlet_connection_work", "Подключение к выпуску / колодцу", "set", 1, 7600),
    row("materials", "drainage_side_haunch_concrete", "Бетонная обойма по бокам лотков", "m3", round2(length * 0.05), 5600, "concrete"),
    row("labor", "drainage_side_haunch_work", "Бетонирование боковой обоймы лотков", "m3", round2(length * 0.05), 4200),
    row("labor", "drainage_backfill_layers", "Послойная обратная засыпка пазух", "m3", round2(length * 0.12), 620),
    row("equipment", "drainage_backfill_compaction", "Уплотнение обратной засыпки", "shift", Math.max(1, Math.ceil(length / 120)), 6500),
    row("labor", "drainage_surface_reinstatement", "Восстановление покрытия вдоль трассы", "linear_m", length, 260),
    row("labor", "drainage_water_test_documented", "Проверка проливом с фиксацией результата", "set", 1, 5200),
    row("labor", "drainage_access_marking", "Маркировка пескоуловителей и точек обслуживания", "set", 1, 2200),
    row("delivery", "drainage_material_unloading", "Разгрузка лотков, решеток и инертных", "trip", Math.max(1, Math.ceil(length / 80)), 6500),
    row("delivery", "drainage_internal_logistics", "Внутриплощадочное перемещение лотков", "set", 1, Math.round(length * 35)),
    row("equipment", "drainage_mini_excavator", "Мини-экскаватор для разработки траншеи", "shift", Math.max(1, Math.ceil(length / 80)), 14500),
    row("equipment", "drainage_concrete_mixer", "Бетоносмеситель / малая механизация", "shift", Math.max(1, Math.ceil(length / 120)), 5200),
    row("labor", "drainage_quality_slope_control", "Контроль продольного уклона после монтажа", "linear_m", length, 55),
    row("labor", "drainage_as_built_measurement", "Исполнительный обмер трассы водоотвода", "set", 1, 2800),
    row("materials", "drainage_reserve_fittings", "Резерв фитингов, решеток и крепежа", "set", 1, Math.round(length * 140), "drainage_fittings"),
  ];
}

function supplementRowsFor(
  workKind: InfrastructureBoqDepthWorkKind,
  plan: EstimatorReasoningPlan,
): DynamicProfessionalBoqRow[] {
  if (workKind === "paving_stone") return pavingStoneDepthRows(plan);
  return drainageChannelDepthRows(plan);
}

export function expandInfrastructureBoqRows(
  plan: EstimatorReasoningPlan,
  rows: readonly DynamicProfessionalBoqRow[],
): DynamicProfessionalBoqRow[] {
  const policy = resolveInfrastructureBoqDepthPolicy(plan);
  if (!policy) return [...rows];
  const existingCodes = new Set(rows.map((item) => item.code));
  const supplement = supplementRowsFor(policy.workKind, plan)
    .filter((item) => !existingCodes.has(item.code));
  return [...rows, ...supplement].slice(0, Math.max(policy.minimumRows, rows.length + supplement.length));
}
