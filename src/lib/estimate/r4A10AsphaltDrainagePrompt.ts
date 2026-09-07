import type { CanonicalEstimateParameterInputValue } from "./backendPlatform/contracts";

export const R4_A10_ASPHALT_DRAINAGE_CATALOG_ID =
  "canonical-work:base:paving_roads_landscape_interior_asphalt_drain_large_area" as const;
export const R4_A10_ASPHALT_DRAINAGE_PRIMARY_MEASURE_PARAMETER_ID = "route_length_m" as const;

function number(prompt: string, pattern: RegExp): string | undefined {
  return pattern.exec(prompt)?.[1]?.replace(",", ".");
}

function text(prompt: string, pattern: RegExp): string | undefined {
  return pattern.exec(prompt)?.[1]?.trim();
}

function explicitBoolean(prompt: string, pattern: RegExp): boolean | undefined {
  const value = pattern.exec(prompt)?.[1]?.toLocaleLowerCase("ru-RU");
  if (value === "да" || value === "true") return true;
  if (value === "нет" || value === "false") return false;
  return undefined;
}

/**
 * Parses drainage-scheme facts. Area of the asphalt site and a bare word
 * "водоотвод" never become route length, section, wells or outlet. For this
 * exact work, one unambiguous linear-metre quantity may be the primary route
 * length; several unlabelled metre values remain unresolved.
 */
export function parseR4A10AsphaltDrainagePrompt(
  prompt: string,
): Record<string, CanonicalEstimateParameterInputValue> {
  const values: Record<string, CanonicalEstimateParameterInputValue> = {};
  const normalized = prompt.normalize("NFKC").replace(/\u00a0/gu, " ");

  if (/(?:тип\s+системы|система)\s*[:—-]?\s*линейн\p{L}*\s+(?:водоотвод\p{L}*\s+)?лот/iu.test(normalized)) {
    values.system_type = "linear_tray";
  } else if (/(?:тип\s+системы|система)\s*[:—-]?\s*подземн\p{L}*\s+дренаж/iu.test(normalized)) {
    values.system_type = "subsurface_drain";
  } else if (/(?:тип\s+системы|система)\s*[:—-]?\s*(?:закрыт\p{L}*\s+)?(?:дождев\p{L}*\s+(?:канализац|сет)|ливнев\p{L}*\s+(?:канализац|сет))/iu.test(normalized)) {
    values.system_type = "storm_sewer";
  }

  const numericPatterns: Readonly<Record<string, RegExp>> = {
    route_length_m: /(?:проектн\p{L}*\s+)?длин\p{L}*\s+трасс\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu,
    design_slope_percent: /(?:проектн\p{L}*\s+)?(?:продольн\p{L}*\s+)?уклон\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*%/iu,
    trench_width_m: /ширин\p{L}*\s+транше\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu,
    trench_depth_m: /(?:средн\p{L}*\s+)?глубин\p{L}*\s+транше\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu,
    bedding_thickness_m: /толщин\p{L}*\s+подготовк\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu,
    bedding_density_t_m3: /плотност\p{L}*\s+материал\p{L}*\s+подготовк\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*т\s*\/\s*м[³3]/iu,
    bedding_delivery_distance_km: /расстоян\p{L}*\s+доставк\p{L}*\s+(?:материал\p{L}*\s+)?подготовк\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*км/iu,
    backfill_cross_section_m2: /(?:площад\p{L}*\s+)?сечени\p{L}*\s+обратн\p{L}*\s+засыпк\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*м[²2]/iu,
    backfill_density_t_m3: /плотност\p{L}*\s+(?:привозн\p{L}*\s+)?материал\p{L}*\s+(?:обратн\p{L}*\s+)?засыпк\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*т\s*\/\s*м[³3]/iu,
    backfill_delivery_distance_km: /расстоян\p{L}*\s+доставк\p{L}*\s+(?:материал\p{L}*\s+)?(?:обратн\p{L}*\s+)?засыпк\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*км/iu,
    outlet_connection_count: /количеств\p{L}*\s+подключени\p{L}*\s+к\s+выпуск\p{L}*\s*[:=]?\s*(\d+)\s*(?:шт\p{L}*|pcs)/iu,
    soil_disposal_volume_m3: /объ[её]м\p{L}*\s+вывоз\p{L}*\s+грунт\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*м[³3]/iu,
    soil_density_t_m3: /плотност\p{L}*\s+(?:вывозим\p{L}*\s+)?грунт\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*т\s*\/\s*м[³3]/iu,
    soil_disposal_distance_km: /расстоян\p{L}*\s+вывоз\p{L}*\s+грунт\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*км/iu,
    system_transport_mass_t: /транспортн\p{L}*\s+масс\p{L}*\s+(?:элемент\p{L}*\s+)?систем\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*(?:т|тонн\p{L}*)/iu,
    system_delivery_distance_km: /расстоян\p{L}*\s+доставк\p{L}*\s+(?:элемент\p{L}*\s+)?систем\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*км/iu,
    excavator_productivity_m3_h: /производительност\p{L}*\s+экскаватор\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*м[³3]\s*\/\s*ч/iu,
    compactor_productivity_m3_h: /производительност\p{L}*\s+(?:траншейн\p{L}*\s+)?уплотнител\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*м[³3]\s*\/\s*ч/iu,
    asphalt_restoration_area_m2: /площад\p{L}*\s+(?:локальн\p{L}*\s+)?восстановлени\p{L}*\s+асфальт\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*м[²2]/iu,
    asphalt_restoration_thickness_mm: /толщин\p{L}*\s+(?:восстанавливаем\p{L}*\s+)?(?:сло\p{L}*\s+)?асфальт\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*мм/iu,
    asphalt_density_t_m3: /плотност\p{L}*\s+асфальтобетон\p{L}*\s+(?:смес\p{L}*)?\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*т\s*\/\s*м[³3]/iu,
    asphalt_emulsion_rate_kg_m2: /расход\p{L}*\s+битумн\p{L}*\s+эмульси\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*кг\s*\/\s*м[²2]/iu,
    asphalt_cut_edge_length_m: /длин\p{L}*\s+обрезк\p{L}*\s+кром\p{L}*\s+асфальт\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu,
    asphalt_delivery_distance_km: /расстоян\p{L}*\s+доставк\p{L}*\s+асфальтобетон\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*км/iu,
    asphalt_roller_productivity_m2_h: /производительност\p{L}*\s+(?:катк\p{L}*|виброплит\p{L}*)\s+(?:локальн\p{L}*\s+)?восстановлени\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*м[²2]\s*\/\s*ч/iu,
    tray_module_length_m: /длин\p{L}*\s+модул\p{L}*\s+лотк\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu,
    tray_base_concrete_cross_section_m2: /(?:площад\p{L}*\s+)?сечени\p{L}*\s+бетонн\p{L}*\s+(?:основани\p{L}*\s+и\s+обойм\p{L}*|обойм\p{L}*)\s+лотк\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*м[²2]/iu,
    tray_joint_sealant_kg_per_joint: /расход\p{L}*\s+герметик\p{L}*\s+(?:на\s+)?стык\p{L}*\s+(?:лотк\p{L}*)?\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*кг\s*\/\s*(?:стык|шт)/iu,
    tray_fasteners_per_module: /креп[её]ж\p{L}*\s+реш[её]тк\p{L}*\s+на\s+модул\p{L}*\s*[:=]?\s*(\d+)\s*шт/iu,
    tray_silt_trap_count: /(?:количеств\p{L}*\s+)?пескоуловител\p{L}*\s*[:=]?\s*(\d+)\s*шт/iu,
    concrete_delivery_distance_km: /расстоян\p{L}*\s+доставк\p{L}*\s+бетон\p{L}*\s+(?:лотк\p{L}*)?\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*км/iu,
    drain_pipe_module_length_m: /поставочн\p{L}*\s+длин\p{L}*\s+дренажн\p{L}*\s+труб\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*м/iu,
    filter_aggregate_cross_section_m2: /(?:площад\p{L}*\s+)?сечени\p{L}*\s+фильтрующ\p{L}*\s+щебн\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*м[²2]/iu,
    filter_aggregate_density_t_m3: /плотност\p{L}*\s+фильтрующ\p{L}*\s+щебн\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*т\s*\/\s*м[³3]/iu,
    filter_aggregate_delivery_distance_km: /расстоян\p{L}*\s+доставк\p{L}*\s+фильтрующ\p{L}*\s+щебн\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*км/iu,
    geotextile_developed_width_m: /разв[её]рнут\p{L}*\s+ширин\p{L}*\s+геотекстил\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*м/iu,
    drain_inspection_well_count: /количеств\p{L}*\s+смотров\p{L}*\s+колодц\p{L}*\s+дренаж\p{L}*\s*[:=]?\s*(\d+)\s*шт/iu,
    storm_pipe_module_length_m: /поставочн\p{L}*\s+длин\p{L}*\s+труб\p{L}*\s+дождев\p{L}*\s+сет\p{L}*\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*м/iu,
    storm_fitting_count: /количеств\p{L}*\s+фасонн\p{L}*\s+част\p{L}*\s+дождев\p{L}*\s+сет\p{L}*\s*[:=]?\s*(\d+)\s*шт/iu,
    storm_inlet_count: /количеств\p{L}*\s+дождепри[её]мник\p{L}*\s*[:=]?\s*(\d+)\s*шт/iu,
    storm_well_count: /количеств\p{L}*\s+смотров\p{L}*\s+колодц\p{L}*\s+дождев\p{L}*\s+сет\p{L}*\s*[:=]?\s*(\d+)\s*шт/iu,
  };
  for (const [parameterId, pattern] of Object.entries(numericPatterns)) {
    const value = number(normalized, pattern);
    if (value !== undefined) values[parameterId] = value;
  }
  if (values.route_length_m == null) {
    const bareLinearMetres = [...normalized.matchAll(
      /(?<![\p{L}\p{N}])(\d+(?:[,.]\d+)?)\s*м(?:етр\p{L}*)?(?![\p{L}\p{N}²³])/giu,
    )];
    if (bareLinearMetres.length === 1) {
      values.route_length_m = bareLinearMetres[0]![1]!.replace(",", ".");
    }
  }

  if (/материал\p{L}*\s+подготовк\p{L}*\s*[:=]?\s*щеб/iu.test(normalized)) values.bedding_material = "crushed_stone";
  else if (/материал\p{L}*\s+подготовк\p{L}*\s*[:=]?\s*пес/iu.test(normalized)) values.bedding_material = "sand";
  if (/материал\p{L}*\s+(?:привозн\p{L}*\s+)?(?:обратн\p{L}*\s+)?засыпк\p{L}*\s*[:=]?\s*щеб/iu.test(normalized)) values.backfill_material_type = "crushed_stone";
  else if (/материал\p{L}*\s+(?:привозн\p{L}*\s+)?(?:обратн\p{L}*\s+)?засыпк\p{L}*\s*[:=]?\s*пес/iu.test(normalized)) values.backfill_material_type = "sand";

  for (const [parameterId, pattern] of Object.entries({
    backfill_import_required: /привозн\p{L}*\s+(?:материал\p{L}*\s+)?(?:обратн\p{L}*\s+)?засыпк\p{L}*\s*[:=]?\s*(да|нет|true|false)/iu,
    soil_disposal_included: /вывоз\p{L}*\s+(?:излишн\p{L}*\s+)?грунт\p{L}*\s*[:=]?\s*(да|нет|true|false)/iu,
    delivery_separately_priced: /доставк\p{L}*\s+(?:учитывается\s+)?отдельн\p{L}*\s*[:=]?\s*(да|нет|true|false)/iu,
  })) {
    const value = explicitBoolean(normalized, pattern);
    if (value !== undefined) values[parameterId] = value;
  }
  if (/выпуск\p{L}*\s+(?:подтвержд[её]н|согласован)/iu.test(normalized)) values.outfall_status = "confirmed";
  if (/восстановлени\p{L}*\s+асфальт\p{L}*\s*[:=]?\s*нет/iu.test(normalized)) values.surface_restoration_scope = "none";
  else if (/восстановлени\p{L}*\s+асфальт\p{L}*\s*[:=]?\s*(?:да|локальн\p{L}*\s+полос)/iu.test(normalized)) values.surface_restoration_scope = "local_asphalt_strip";

  const textPatterns: Readonly<Record<string, RegExp>> = {
    excavator_model: /модел\p{L}*\s+экскаватор\p{L}*\s*[:=]?\s*([^;,.]+)/iu,
    compactor_model: /модел\p{L}*\s+(?:траншейн\p{L}*\s+)?уплотнител\p{L}*\s*[:=]?\s*([^;,.]+)/iu,
    asphalt_roller_model: /модел\p{L}*\s+(?:катк\p{L}*|виброплит\p{L}*)\s+(?:локальн\p{L}*\s+)?восстановлени\p{L}*\s*[:=]?\s*([^;,.]+)/iu,
    tray_nominal_size: /(?:номинальн\p{L}*\s+)?сечени\p{L}*\s+лотк\p{L}*\s*[:=]?\s*([A-Za-zА-Яа-яЁё0-9-]+)/iu,
    tray_load_class: /класс\p{L}*\s+нагрузк\p{L}*\s+лотк\p{L}*\s*[:=]?\s*(A15|B125|C250|D400|E600|F900)/iu,
    drain_pipe_nominal_size: /(?:номинальн\p{L}*\s+)?диаметр\p{L}*\s+дренажн\p{L}*\s+труб\p{L}*\s*[:=]?\s*([A-Za-zА-Яа-яЁё0-9-]+)/iu,
    drain_pipe_stiffness_class: /класс\p{L}*\s+(?:кольцев\p{L}*\s+)?ж[её]сткост\p{L}*\s+дренажн\p{L}*\s+труб\p{L}*\s*[:=]?\s*(SN4|SN8|SN16)/iu,
    storm_pipe_nominal_size: /(?:номинальн\p{L}*\s+)?диаметр\p{L}*\s+труб\p{L}*\s+дождев\p{L}*\s+сет\p{L}*\s*[:=]?\s*([A-Za-zА-Яа-яЁё0-9-]+)/iu,
    storm_pipe_material: /материал\p{L}*\s+труб\p{L}*\s+дождев\p{L}*\s+сет\p{L}*\s*[:=]?\s*(ПНД|ПП|железобетон)/iu,
    storm_pipe_stiffness_class: /класс\p{L}*\s+ж[её]сткост\p{L}*\s+труб\p{L}*\s+дождев\p{L}*\s+сет\p{L}*\s*[:=]?\s*([^;,.]+)/iu,
    storm_inlet_load_class: /класс\p{L}*\s+нагрузк\p{L}*\s+дождепри[её]мник\p{L}*\s*[:=]?\s*(A15|B125|C250|D400|E600|F900)/iu,
    storm_well_nominal_size: /(?:номинальн\p{L}*\s+)?диаметр\p{L}*\s+смотров\p{L}*\s+колодц\p{L}*\s*[:=]?\s*([A-Za-zА-Яа-яЁё0-9-]+)/iu,
  };
  for (const [parameterId, pattern] of Object.entries(textPatterns)) {
    const value = text(normalized, pattern);
    if (value !== undefined) values[parameterId] = value.toUpperCase().startsWith("SN") ? value.toUpperCase() : value;
  }
  return values;
}
