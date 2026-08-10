import { formatEstimateUnitLabel } from "../../../ai/globalEstimate/formatEstimateUnitLabel";
import type { ConsumerRepairAiDraft, ConsumerRepairItemType } from "../../../consumerRequests/consumerRequestTypes";
import type { BuildEstimateFromInlineWorkPromptInput } from "../../buildEstimateFromInlineWorkPrompt";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import { applyProfessionalBoqRuntimeContract } from "../../professionalBoqAssumptions";
import type { DomainResolutionReadiness } from "../../estimateDraftRevisionContract";
import {
  ASPHALT_RELATED_SEMANTIC_REGISTRY_VERSION_V4,
  getAsphaltRelatedProfileByCatalogRecordIdV4,
  type AsphaltRelatedOperationClassV4,
  type AsphaltRelatedProfileV4,
} from "./asphaltRelatedSemanticRegistryV4";
import { getAsphaltRelatedProfessionalPassportV4 } from "./asphaltRelatedProfessionalPassportsV4";

export type AsphaltRelatedParameterTierV4 = "P0" | "P1" | "P2";

export type AsphaltRelatedParameterMetadataV4 = {
  labelRu: string;
  tier: AsphaltRelatedParameterTierV4;
  unit?: string;
  allowedValues?: readonly (string | boolean)[];
  minimum?: number;
  maximum?: number;
  integer?: boolean;
};

export const ASPHALT_RELATED_PARAMETER_METADATA_V4: Readonly<Record<string, AsphaltRelatedParameterMetadataV4>> = Object.freeze({
  area_m2: { labelRu: "Площадь покрытия", tier: "P0", unit: "m2" },
  removal_area_m2: { labelRu: "Площадь демонтируемого покрытия", tier: "P0", unit: "m2" },
  total_area_m2: { labelRu: "Общая площадь покрытия", tier: "P0", unit: "m2" },
  removal_share: { labelRu: "Доля площади частичного снятия", tier: "P0", minimum: Number.EPSILON, maximum: 1 },
  existing_total_thickness_mm: { labelRu: "Общая фактическая толщина существующего покрытия", tier: "P0", unit: "mm" },
  removal_depth_mm: { labelRu: "Глубина удаления", tier: "P0", unit: "mm" },
  removal_method: {
    labelRu: "Способ удаления",
    tier: "P0",
    allowedValues: ["COLD_MILLING", "MECHANICAL_BREAKOUT", "MANUAL_BREAKOUT", "COMBINED"],
  },
  removal_extent: {
    labelRu: "Полный или частичный демонтаж",
    tier: "P0",
    allowedValues: ["FULL", "PARTIAL"],
  },
  material_destination: {
    labelRu: "Дальнейшая судьба демонтированного материала",
    tier: "P0",
    allowedValues: ["RECYCLING", "RECOVERED_MATERIAL", "TEMPORARY_STORAGE", "DISPOSAL"],
  },
  haul_required: {
    labelRu: "Требуется вывоз демонтированного материала",
    tier: "P0",
    allowedValues: [true, false],
  },
  haul_distance_km: { labelRu: "Расстояние транспортирования", tier: "P0", unit: "km" },
  truck_payload_t: { labelRu: "Полезная загрузка транспорта", tier: "P0", unit: "t" },
  existing_asphalt_density_t_m3: { labelRu: "Плотность существующего асфальтобетона с источником", tier: "P1", unit: "t/m3" },
  boundary_cut_length_m: { labelRu: "Длина границ резки", tier: "P1", unit: "m" },
  cut_map_geometry: { labelRu: "Схема границ и карт демонтажа", tier: "P1" },
  number_of_cards: { labelRu: "Количество карт", tier: "P1", unit: "pcs" },
  number_of_passes: { labelRu: "Количество проходов фрезы", tier: "P1", unit: "pcs", integer: true },
  base_disposition: { labelRu: "Сохранение или демонтаж основания", tier: "P1" },
  base_condition_after_removal: { labelRu: "Состояние основания после снятия", tier: "P1" },
  traffic_constraint: { labelRu: "Ограничения движения и стеснённость", tier: "P1" },
  dust_suppression_required: { labelRu: "Необходимость пылеподавления", tier: "P1" },
  contamination_reject_t: { labelRu: "Масса загрязнённого брака", tier: "P1", unit: "t" },
  disposal_loss_t: { labelRu: "Потери при обращении с материалом", tier: "P1", unit: "t" },
  payload_utilization_factor: { labelRu: "Коэффициент полезной загрузки", tier: "P1" },
  work_scope: {
    labelRu: "Состав работ",
    tier: "P0",
    allowedValues: ["PURE_DEMOLITION", "DEMOLITION_AND_REINSTATEMENT"],
  },
  reinstatement_depth_mm: { labelRu: "Толщина восстанавливаемого слоя", tier: "P0", unit: "mm" },
  new_asphalt_density_t_m3: { labelRu: "Плотность новой смеси по проекту/паспорту", tier: "P0", unit: "t/m3" },
  wearing_layer_thickness_mm: { labelRu: "Толщина верхнего слоя", tier: "P0", unit: "mm" },
  binder_layer_thickness_mm: { labelRu: "Толщина нижнего слоя", tier: "P0", unit: "mm" },
  asphalt_density_t_m3: { labelRu: "Плотность смеси по проекту/паспорту", tier: "P0", unit: "t/m3" },
  prepared_base_confirmed: { labelRu: "Подготовленное основание подтверждено", tier: "P0", allowedValues: [true] },
  bridge_deck_system_confirmed: { labelRu: "Система покрытия мостовой плиты подтверждена проектом", tier: "P0", allowedValues: [true] },
  traffic_class_confirmed: { labelRu: "Класс транспортной нагрузки подтверждён", tier: "P0", allowedValues: [true] },
});

type ExactParameterSet = {
  values: Record<string, unknown>;
  missingRequired: string[];
  missingNormative: string[];
  assumptionKeys: string[];
};

type ExactBoqSeed = {
  rowId: string;
  itemType: ConsumerRepairItemType;
  titleRu: string;
  quantity: number;
  unit: string;
  category: string;
  formulaId: string;
  quantityFormula: string;
  calculationTrace: string;
  affectedBy: readonly string[];
  semanticOwner: string;
  phaseOwner: "PHASE_1_DEMOLITION" | "PHASE_2_BASE_INSPECTION_OR_REPAIR" | "PHASE_2_INSTALLATION" | "PHASE_3_REINSTATEMENT" | "SINGLE_OPERATION";
  includedInProcurement: boolean;
  materialKey?: string | null;
};

function explicitOverride(input: BuildEstimateFromInlineWorkPromptInput, key: string): unknown {
  const override = input.paramOverrides?.[key];
  if (!override || override.source === "default_assumption" || override.source === "derived") return undefined;
  return override.value;
}

function numberFromRawInput(text: string, patterns: readonly RegExp[]): number | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const value = Number(match[1].replace(/\s/g, "").replace(",", "."));
    if (Number.isFinite(value) && value > 0) return value;
  }
  return undefined;
}

function rawArea(text: string): number | undefined {
  return numberFromRawInput(text, [
    /(\d[\d\s]*(?:[.,]\d+)?)\s*(?:м2|м²|кв(?:адратн\p{L}*)?\s*м)/iu,
    /площад\p{L}*\s*(?:—|:|=)?\s*(\d[\d\s]*(?:[.,]\d+)?)/iu,
  ]);
}

function rawDepth(text: string): number | undefined {
  return numberFromRawInput(text, [
    /(?:глубин\p{L}*|снят\p{L}*|фрезер\p{L}*)\s*(?:—|:|=)?\s*(\d+(?:[.,]\d+)?)\s*мм/iu,
    /(?:толщин\p{L}*\s+удален\p{L}*)\s*(?:—|:|=)?\s*(\d+(?:[.,]\d+)?)\s*мм/iu,
  ]);
}

function inferredString(input: BuildEstimateFromInlineWorkPromptInput, key: string): string | undefined {
  const explicit = explicitOverride(input, key);
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  const text = input.rawInput.toLocaleLowerCase("ru-RU");
  if (key === "removal_method") {
    if (/фрезер|milling/.test(text)) return "COLD_MILLING";
    if (/ручн/.test(text)) return "MANUAL_BREAKOUT";
    if (/комбинирован/.test(text)) return "COMBINED";
    if (/механическ|breakout/.test(text)) return "MECHANICAL_BREAKOUT";
  }
  if (key === "removal_extent") {
    if (/частичн/.test(text)) return "PARTIAL";
    if (/полн\p{L}*\s+(?:демонтаж|снят|удален)/u.test(text)) return "FULL";
  }
  if (key === "material_destination") {
    if (/переработ|recycl/.test(text)) return "RECYCLING";
    if (/возвратн|повторн\p{L}*\s+использ/u.test(text)) return "RECOVERED_MATERIAL";
    if (/временн\p{L}*\s+склад/u.test(text)) return "TEMPORARY_STORAGE";
    if (/утилиз|полигон|disposal/.test(text)) return "DISPOSAL";
  }
  if (key === "work_scope") {
    if (/восстанов|заново\s+улож|reinstate/.test(text)) return "DEMOLITION_AND_REINSTATEMENT";
  }
  return undefined;
}

function parameterValue(input: BuildEstimateFromInlineWorkPromptInput, key: string): unknown {
  const direct = explicitOverride(input, key);
  if (direct !== undefined && direct !== null && direct !== "") return direct;
  if (key === "area_m2" || key === "removal_area_m2") {
    const counterpart = key === "area_m2" ? "removal_area_m2" : "area_m2";
    const other = explicitOverride(input, counterpart);
    return other ?? rawArea(input.rawInput);
  }
  if (key === "removal_depth_mm") return rawDepth(input.rawInput);
  if (key === "haul_required") {
    const text = input.rawInput.toLocaleLowerCase("ru-RU");
    if (/без\s+вывоз|вывоз\s+не\s+треб|no\s+haul/u.test(text)) return false;
    if (/(?:^|\s)вывоз\p{L}*|транспортирован|haul/u.test(text)) return true;
  }
  return inferredString(input, key);
}

function validParameter(key: string, value: unknown): boolean {
  const metadata = ASPHALT_RELATED_PARAMETER_METADATA_V4[key];
  if (metadata?.allowedValues) return metadata.allowedValues.includes(value as never);
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return false;
    if (metadata?.minimum != null && value < metadata.minimum) return false;
    if (metadata?.maximum != null && value > metadata.maximum) return false;
    if (metadata?.integer && !Number.isInteger(value)) return false;
    return true;
  }
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "boolean") return value;
  return false;
}

function extractParameters(
  input: BuildEstimateFromInlineWorkPromptInput,
  profile: AsphaltRelatedProfileV4,
): ExactParameterSet {
  const parameterKeys = [...new Set([...profile.requiredParameters, ...profile.optionalParameters, "work_scope"])];
  const values = Object.fromEntries(parameterKeys.map((key) => [key, parameterValue(input, key)]));
  if (profile.canonicalWorkKey === "asphalt_demolition" && !validParameter("work_scope", values.work_scope)) {
    values.work_scope = "PURE_DEMOLITION";
  }
  const reinstate = values.work_scope === "DEMOLITION_AND_REINSTATEMENT";
  const reinstatementRequired = reinstate ? ["reinstatement_depth_mm", "new_asphalt_density_t_m3"] : [];
  const haulRequired = values.haul_required === true;
  const haulParameters = haulRequired ? ["haul_distance_km", "truck_payload_t"] : [];
  const partialAreaParameters = values.removal_extent === "PARTIAL"
    ? ["total_area_m2", "removal_share"]
    : [];
  const missingRequired = [
    ...profile.requiredParameters,
    ...haulParameters,
    ...reinstatementRequired,
    ...partialAreaParameters,
  ]
    .filter((key) => !validParameter(key, values[key]));
  const missingNormative: string[] = [];
  return {
    values,
    missingRequired,
    missingNormative,
    assumptionKeys: [...missingRequired, ...missingNormative],
  };
}

function positiveNumber(values: Record<string, unknown>, key: string): number {
  const value = values[key];
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export type AsphaltRelatedResolvedOperationClassV4 =
  | AsphaltRelatedOperationClassV4
  | "PARTIAL_DEPTH_REMOVAL"
  | "COLD_MILLING"
  | "LOCAL_BREAKUP"
  | "DEMOLITION_AND_REINSTATEMENT";

export function resolveAsphaltRelatedOperationClassV4(
  profile: AsphaltRelatedProfileV4,
  values: Readonly<Record<string, unknown>>,
): AsphaltRelatedResolvedOperationClassV4 {
  if (values.work_scope === "DEMOLITION_AND_REINSTATEMENT") {
    return "DEMOLITION_AND_REINSTATEMENT";
  }
  if (profile.canonicalWorkKey === "asphalt_milling" || values.removal_method === "COLD_MILLING") {
    return "COLD_MILLING";
  }
  if (profile.canonicalWorkKey === "asphalt_demolition" && values.removal_extent === "PARTIAL") {
    return values.removal_method === "MANUAL_BREAKOUT" || values.removal_method === "MECHANICAL_BREAKOUT"
      ? "LOCAL_BREAKUP"
      : "PARTIAL_DEPTH_REMOVAL";
  }
  return profile.operationClass;
}

function demolitionRows(
  profile: AsphaltRelatedProfileV4,
  values: Record<string, unknown>,
  resolvedOperationClass: AsphaltRelatedResolvedOperationClassV4,
): ExactBoqSeed[] {
  const totalArea = positiveNumber(values, "total_area_m2");
  const removalShare = positiveNumber(values, "removal_share");
  const partialArea = totalArea > 0 && removalShare > 0
    ? round(totalArea * removalShare)
    : 0;
  const area = (
    resolvedOperationClass === "PARTIAL_DEPTH_REMOVAL" || resolvedOperationClass === "LOCAL_BREAKUP"
  ) && partialArea > 0
    ? partialArea
    : positiveNumber(values, "removal_area_m2") || positiveNumber(values, "area_m2");
  const depthMm = positiveNumber(values, "removal_depth_mm");
  const depthM = depthMm / 1000;
  const density = positiveNumber(values, "existing_asphalt_density_t_m3") || positiveNumber(values, "asphalt_density_t_m3");
  const removedVolume = round(area * depthM);
  const removedMass = round(removedVolume * density);
  const haulDistance = positiveNumber(values, "haul_distance_km");
  const payload = positiveNumber(values, "truck_payload_t");
  const haulTkm = round(removedMass * haulDistance);
  const trips = payload > 0 ? Math.ceil(removedMass / payload) : 0;
  const contaminationReject = positiveNumber(values, "contamination_reject_t");
  const disposalLoss = positiveNumber(values, "disposal_loss_t");
  const recoveredMass = round(Math.max(0, removedMass - contaminationReject - disposalLoss));
  const boundary = positiveNumber(values, "boundary_cut_length_m");
  const numberOfPasses = positiveNumber(values, "number_of_passes");
  const method = String(values.removal_method ?? (resolvedOperationClass === "COLD_MILLING" ? "COLD_MILLING" : "UNCONFIRMED"));
  const destination = String(values.material_destination ?? "UNCONFIRMED");
  const haulRequired = values.haul_required === true;
  const removalTitle = resolvedOperationClass === "COLD_MILLING"
    ? "Холодное фрезерование асфальтобетонного покрытия"
    : resolvedOperationClass === "LOCAL_BREAKUP"
      ? "Локальная разборка асфальтобетонного покрытия"
      : resolvedOperationClass === "PARTIAL_DEPTH_REMOVAL"
        ? "Частичное снятие асфальтобетонного покрытия"
        : "Полный демонтаж асфальтобетонного покрытия";
  const equipmentTitle = resolvedOperationClass === "COLD_MILLING"
    ? "Дорожная фреза подтверждённого класса для снятия покрытия"
    : method === "MANUAL_BREAKOUT"
      ? "Компрессор и ручной отбойный инструмент для локальной разборки"
      : "Экскаватор, погрузчик и отбойное оборудование для разборки покрытия";
  const rows: ExactBoqSeed[] = [
    {
      rowId: `${profile.canonicalWorkKey}:survey_and_marking`, itemType: "work",
      titleRu: "Обследование, приёмка исходного покрытия и разметка границ удаления",
      quantity: area, unit: "m2", category: "work",
      formulaId: partialArea > 0 ? "effective_partial_removal_area_v1" : "confirmed_removal_area_v1",
      quantityFormula: partialArea > 0 ? "Q = total_area_m2 * removal_share" : "Q = removal_area_m2",
      calculationTrace: partialArea > 0
        ? `${totalArea} m2 * ${removalShare} = ${area} m2`
        : `removal_area_m2=${area}`,
      affectedBy: partialArea > 0 ? ["total_area_m2", "removal_share"] : ["removal_area_m2"],
      semanticOwner: "DEMOLITION_BOUNDARY_AND_SURVEY", phaseOwner: "PHASE_1_DEMOLITION", includedInProcurement: false,
    },
    ...(boundary > 0 ? ([{
      rowId: `${profile.canonicalWorkKey}:boundary_cutting`, itemType: "work" as const,
      titleRu: "Резка границ асфальтобетонного покрытия", quantity: boundary, unit: "m", category: "work",
      formulaId: "confirmed_boundary_cut_length_v1", quantityFormula: "Q = boundary_cut_length_m",
      calculationTrace: `boundary_cut_length_m=${boundary}`, affectedBy: ["boundary_cut_length_m"],
      semanticOwner: "DEMOLITION_BOUNDARY_CUTTING", phaseOwner: "PHASE_1_DEMOLITION" as const, includedInProcurement: false,
    }] satisfies ExactBoqSeed[]) : []),
    {
      rowId: `${profile.canonicalWorkKey}:removal`, itemType: "work",
      titleRu: removalTitle,
      quantity: removedVolume, unit: "m3", category: "work",
      formulaId: resolvedOperationClass === "COLD_MILLING" ? "milled_volume_geometry_v1" : "removed_volume_geometry_v1",
      quantityFormula: partialArea > 0
        ? "Q = total_area_m2 * removal_share * removal_depth_mm / 1000"
        : "Q = removal_area_m2 * removal_depth_mm / 1000",
      calculationTrace: `${area} m2 * ${depthMm} mm / 1000 = ${removedVolume} m3; method=${method}; passes=${numberOfPasses || "not_set"}`,
      affectedBy: [
        ...(partialArea > 0 ? ["total_area_m2", "removal_share"] : ["removal_area_m2"]),
        "removal_depth_mm",
        "removal_method",
        ...(resolvedOperationClass === "COLD_MILLING" ? ["number_of_passes"] : []),
      ],
      semanticOwner: resolvedOperationClass,
      phaseOwner: "PHASE_1_DEMOLITION", includedInProcurement: false,
    },
    {
      rowId: `${profile.canonicalWorkKey}:demolition_labor`, itemType: "work",
      titleRu: "Труд дорожных рабочих и операторов при снятии покрытия",
      quantity: removedVolume, unit: "m3", category: "labor",
      formulaId: "demolition_labor_scope_volume_v1", quantityFormula: "Q = removed_volume_m3 (scope quantity; no invented labor rate)",
      calculationTrace: `labor_scope_volume=${removedVolume} m3; normative labor rate remains price-source input`,
      affectedBy: ["removal_area_m2", "removal_depth_mm", "removal_method"], semanticOwner: "DEMOLITION_LABOR_SCOPE",
      phaseOwner: "PHASE_1_DEMOLITION", includedInProcurement: false,
    },
    {
      rowId: `${profile.canonicalWorkKey}:demolition_equipment`, itemType: "service",
      titleRu: equipmentTitle,
      quantity: removedVolume, unit: "m3", category: "equipment",
      formulaId: "demolition_equipment_scope_volume_v1", quantityFormula: "Q = removed_volume_m3 (scope quantity; no invented machine-hour rate)",
      calculationTrace: `equipment_scope_volume=${removedVolume} m3; method=${method}`,
      affectedBy: ["removal_area_m2", "removal_depth_mm", "removal_method"], semanticOwner: "DEMOLITION_EQUIPMENT_SCOPE",
      phaseOwner: "PHASE_1_DEMOLITION", includedInProcurement: true,
    },
    {
      rowId: `${profile.canonicalWorkKey}:removed_material`, itemType: "other",
      titleRu: "Демонтированный асфальтобетон (поток возвратного материала/отхода)",
      quantity: removedMass, unit: "t", category: "recovered_material",
      formulaId: resolvedOperationClass === "COLD_MILLING" ? "milled_mass_geometry_density_v1" : "removed_mass_geometry_density_v1",
      quantityFormula: resolvedOperationClass === "COLD_MILLING"
        ? "Q = milled_volume_m3 * existing_asphalt_density_t_m3"
        : "Q = removed_volume_m3 * existing_asphalt_density_t_m3",
      calculationTrace: `${removedVolume} m3 * ${density} t/m3 = ${removedMass} t`,
      affectedBy: ["removal_area_m2", "removal_depth_mm", "existing_asphalt_density_t_m3"], semanticOwner: "RECOVERED_OR_WASTE_ASPHALT",
      phaseOwner: "PHASE_1_DEMOLITION", includedInProcurement: false, materialKey: null,
    },
    {
      rowId: `${profile.canonicalWorkKey}:loading`, itemType: "service",
      titleRu: "Погрузка демонтированного асфальтобетона", quantity: removedMass, unit: "t", category: "service",
      formulaId: "loading_mass_balance_v1", quantityFormula: "Q = removed_mass_t",
      calculationTrace: `loading_mass=${removedMass} t`, affectedBy: ["existing_asphalt_density_t_m3"], semanticOwner: "DEMOLITION_LOADING",
      phaseOwner: "PHASE_1_DEMOLITION", includedInProcurement: true,
    },
    ...(haulRequired ? ([{
      rowId: `${profile.canonicalWorkKey}:haul`, itemType: "service",
      titleRu: "Транспортная работа по вывозу демонтированного материала", quantity: haulTkm, unit: "t*km", category: "logistics",
      formulaId: "removed_material_haul_v1", quantityFormula: "Q = removed_mass_t * haul_distance_km",
      calculationTrace: `${removedMass} t * ${haulDistance} km = ${haulTkm} t*km`,
      affectedBy: ["existing_asphalt_density_t_m3", "haul_distance_km"], semanticOwner: "DEMOLITION_HAUL",
      phaseOwner: "PHASE_1_DEMOLITION" as const, includedInProcurement: true,
    }, {
      rowId: `${profile.canonicalWorkKey}:truck_trips`, itemType: "service",
      titleRu: "Рейсы транспорта для вывоза демонтированного материала", quantity: trips, unit: "pcs", category: "logistics",
      formulaId: "truck_trip_ceiling_v1", quantityFormula: "Q = ceil(removed_mass_t / truck_payload_t)",
      calculationTrace: `ceil(${removedMass} t / ${payload} t) = ${trips}`, affectedBy: ["truck_payload_t"],
      semanticOwner: "DEMOLITION_TRUCK_TRIPS", phaseOwner: "PHASE_1_DEMOLITION" as const, includedInProcurement: true,
    }] satisfies ExactBoqSeed[]) : []),
    {
      rowId: `${profile.canonicalWorkKey}:destination`, itemType: "service",
      titleRu: destination === "RECYCLING" || destination === "RECOVERED_MATERIAL"
        ? "Передача асфальтогранулята на переработку или повторное использование"
        : "Передача демонтированного материала на подтверждённую площадку обращения с отходами",
      quantity: recoveredMass, unit: "t", category: "waste_stream",
      formulaId: "recovered_material_mass_balance_v1",
      quantityFormula: "Q = removed_mass_t - contamination_reject_t - disposal_loss_t",
      calculationTrace: `${removedMass} - ${contaminationReject} - ${disposalLoss} = ${recoveredMass} t; destination=${destination}`,
      affectedBy: ["material_destination", "contamination_reject_t", "disposal_loss_t"], semanticOwner: "ASPHALT_MATERIAL_DESTINATION",
      phaseOwner: "PHASE_1_DEMOLITION", includedInProcurement: true,
    },
    {
      rowId: `${profile.canonicalWorkKey}:base_acceptance`, itemType: "document",
      titleRu: "Очистка, осмотр и приёмка основания после снятия покрытия", quantity: area, unit: "m2", category: "quality_control",
      formulaId: "base_acceptance_area_v1", quantityFormula: "Q = removal_area_m2",
      calculationTrace: `accepted_base_area=${area} m2`, affectedBy: ["removal_area_m2", "base_condition_after_removal"],
      semanticOwner: "POST_DEMOLITION_BASE_ACCEPTANCE", phaseOwner: "PHASE_2_BASE_INSPECTION_OR_REPAIR", includedInProcurement: false,
    },
    {
      rowId: `${profile.canonicalWorkKey}:documentation`, itemType: "document",
      titleRu: "Акты объёмов, движения материала и исполнительная документация демонтажа", quantity: 1, unit: "set", category: "documentation",
      formulaId: "required_document_set_v1", quantityFormula: "Q = 1 set",
      calculationTrace: "one traceable document set", affectedBy: ["material_destination"], semanticOwner: "DEMOLITION_DOCUMENTATION",
      phaseOwner: "PHASE_1_DEMOLITION", includedInProcurement: false,
    },
  ];
  if (values.work_scope === "DEMOLITION_AND_REINSTATEMENT") {
    const newDepthMm = positiveNumber(values, "reinstatement_depth_mm");
    const newDensity = positiveNumber(values, "new_asphalt_density_t_m3");
    const newMass = round(area * newDepthMm / 1000 * newDensity);
    rows.push(
      {
        rowId: `${profile.canonicalWorkKey}:reinstatement_mix`, itemType: "material",
        titleRu: "Новая асфальтобетонная смесь для отдельной фазы восстановления", quantity: newMass, unit: "t", category: "material",
        formulaId: "reinstatement_mix_mass_v1", quantityFormula: "Q = area_m2 * reinstatement_depth_mm / 1000 * new_asphalt_density_t_m3",
        calculationTrace: `${area} * ${newDepthMm} / 1000 * ${newDensity} = ${newMass} t`,
        affectedBy: ["reinstatement_depth_mm", "new_asphalt_density_t_m3"], semanticOwner: "NEW_REINSTATEMENT_ASPHALT_MIX",
        phaseOwner: "PHASE_2_INSTALLATION", includedInProcurement: true, materialKey: "new_reinstatement_asphalt_mix",
      },
      {
        rowId: `${profile.canonicalWorkKey}:reinstatement_placement`, itemType: "work",
        titleRu: "Укладка и уплотнение отдельной фазы восстановления покрытия", quantity: area, unit: "m2", category: "work",
        formulaId: "reinstatement_area_v1", quantityFormula: "Q = area_m2",
        calculationTrace: `reinstatement_area=${area} m2`, affectedBy: ["reinstatement_depth_mm"], semanticOwner: "REINSTATEMENT_PLACEMENT",
        phaseOwner: "PHASE_2_INSTALLATION", includedInProcurement: false,
      },
    );
  }
  return rows;
}

function installationRows(profile: AsphaltRelatedProfileV4, values: Record<string, unknown>): ExactBoqSeed[] {
  const area = positiveNumber(values, "area_m2") || positiveNumber(values, "removal_area_m2");
  const depthKey = profile.operationClass === "INSTALL_BINDER_LAYER" ? "binder_layer_thickness_mm" : "wearing_layer_thickness_mm";
  const depth = positiveNumber(values, depthKey) || positiveNumber(values, "removal_depth_mm");
  const density = positiveNumber(values, "asphalt_density_t_m3") || positiveNumber(values, "existing_asphalt_density_t_m3");
  const volume = round(area * depth / 1000);
  const mass = round(volume * density);
  const isRepair = profile.operationClass === "LOCAL_PATCH_REPAIR";
  return [
    {
      rowId: `${profile.canonicalWorkKey}:scope_acceptance`, itemType: "document", titleRu: "Подтверждение основания, границ и проектного состава работ",
      quantity: area, unit: "m2", category: "quality_control", formulaId: "confirmed_work_area_v1", quantityFormula: "Q = area_m2",
      calculationTrace: `confirmed_area=${area} m2`, affectedBy: ["area_m2", "prepared_base_confirmed"], semanticOwner: "INSTALLATION_SCOPE_ACCEPTANCE",
      phaseOwner: "SINGLE_OPERATION", includedInProcurement: false,
    },
    ...(isRepair ? demolitionRows(
      profile,
      { ...values, removal_area_m2: area, removal_depth_mm: depth, haul_required: false },
      "LOCAL_BREAKUP",
    ).filter((row) =>
      ["LOCAL_BREAKUP", "RECOVERED_OR_WASTE_ASPHALT", "POST_DEMOLITION_BASE_ACCEPTANCE"].includes(row.semanticOwner)
    ) : []),
    {
      rowId: `${profile.canonicalWorkKey}:asphalt_mix`, itemType: "material", titleRu: "Асфальтобетонная смесь подтверждённого проектом типа",
      quantity: mass, unit: "t", category: "material", formulaId: "new_asphalt_mix_mass_v1",
      quantityFormula: `Q = area_m2 * ${depthKey} / 1000 * asphalt_density_t_m3`,
      calculationTrace: `${area} * ${depth} / 1000 * ${density} = ${mass} t`, affectedBy: ["area_m2", depthKey, "asphalt_density_t_m3"],
      semanticOwner: "NEW_ASPHALT_MIX", phaseOwner: isRepair ? "PHASE_3_REINSTATEMENT" : "SINGLE_OPERATION", includedInProcurement: true,
      materialKey: `${profile.canonicalWorkKey}:asphalt_mix`,
    },
    {
      rowId: `${profile.canonicalWorkKey}:placement`, itemType: "work", titleRu: profile.professionalNameRu,
      quantity: area, unit: "m2", category: "work", formulaId: "confirmed_placement_area_v1", quantityFormula: "Q = area_m2",
      calculationTrace: `placement_area=${area} m2; operation=${profile.operationClass}`, affectedBy: ["area_m2", depthKey],
      semanticOwner: profile.operationClass, phaseOwner: isRepair ? "PHASE_3_REINSTATEMENT" : "SINGLE_OPERATION", includedInProcurement: false,
    },
    {
      rowId: `${profile.canonicalWorkKey}:quality_documentation`, itemType: "document", titleRu: "Контроль качества и исполнительная документация",
      quantity: 1, unit: "set", category: "documentation", formulaId: "required_document_set_v1", quantityFormula: "Q = 1 set",
      calculationTrace: "one traceable document set", affectedBy: [], semanticOwner: "INSTALLATION_QUALITY_DOCUMENTATION",
      phaseOwner: isRepair ? "PHASE_3_REINSTATEMENT" : "SINGLE_OPERATION", includedInProcurement: false,
    },
  ];
}

function readinessFor(parameters: ExactParameterSet): DomainResolutionReadiness {
  if (parameters.missingRequired.length > 0) return "NEEDS_REQUIRED_INPUTS";
  if (parameters.missingNormative.length > 0) return "NORMATIVE_SOURCE_GAP";
  return "CALCULATION_READY";
}

function metadataFor(profile: AsphaltRelatedProfileV4): Record<string, AsphaltRelatedParameterMetadataV4> {
  return Object.fromEntries(
    [...new Set([...profile.requiredParameters, ...profile.optionalParameters, "work_scope"])]
      .map((key) => [key, ASPHALT_RELATED_PARAMETER_METADATA_V4[key] ?? { labelRu: key, tier: profile.requiredParameters.includes(key) ? "P0" : "P1" }]),
  );
}

/**
 * V4 domain compiler for exact asphalt-related passports. Persistence,
 * revision creation, history, PDF and procurement remain owned by the shared
 * estimate platform; this function only compiles typed parameters to BOQ.
 */
export function compileAsphaltRelatedProfessionalEstimateV4(
  input: BuildEstimateFromInlineWorkPromptInput,
): {
  draft: ConsumerRepairAiDraft;
  profile: AsphaltRelatedProfileV4;
  requestedCatalogRecordId: string;
  passport: NonNullable<ReturnType<typeof getAsphaltRelatedProfessionalPassportV4>>;
  readiness: DomainResolutionReadiness;
  resolvedOperationClass: AsphaltRelatedResolvedOperationClassV4;
} | null {
  const requestedCatalogRecordId = input.selectedWorkKey?.trim() || input.selectedTemplateId?.trim() || "";
  const profile = getAsphaltRelatedProfileByCatalogRecordIdV4(requestedCatalogRecordId);
  if (!profile) return null;
  const passport = getAsphaltRelatedProfessionalPassportV4(requestedCatalogRecordId);
  if (!passport) throw new Error(`ASPHALT_RELATED_PASSPORT_NOT_FOUND:${requestedCatalogRecordId}`);
  const parameters = extractParameters(input, profile);
  const readiness = readinessFor(parameters);
  const executable = readiness === "CALCULATION_READY";
  const resolvedOperationClass = resolveAsphaltRelatedOperationClassV4(profile, parameters.values);
  const removalOperation = [
    "FULL_DEPTH_DEMOLITION",
    "PARTIAL_DEPTH_REMOVAL",
    "COLD_MILLING",
    "LOCAL_BREAKUP",
    "DEMOLITION_AND_REINSTATEMENT",
  ].includes(resolvedOperationClass);
  const seeds = executable
    ? removalOperation
      ? demolitionRows(profile, parameters.values, resolvedOperationClass)
      : installationRows(profile, parameters.values)
    : [];
  const parameterMetadata = metadataFor(profile);
  const semanticFingerprint = estimateDeterministicHash({
    requestedCatalogRecordId,
    canonicalWorkKey: profile.canonicalWorkKey,
    operationClass: resolvedOperationClass,
    applicationContext: profile.applicationContext,
    passportId: passport.passportId,
    strategyId: passport.calculation.calculationStrategyId,
    formulaGraphVersion: passport.calculation.formulaGraphVersion,
    parameters: parameters.values,
  });
  const currency = input.currency ?? "KGS";
  const draft: ConsumerRepairAiDraft = {
    titleRu: executable
      ? `Предварительная профессиональная смета: ${profile.professionalNameRu}`
      : `${profile.professionalNameRu}: требуются обязательные исходные данные`,
    summaryRu: executable
      ? `Точная операция ${resolvedOperationClass}; сформировано ${seeds.length} семантически типизированных позиций без generic fallback.`
      : `Точная операция сохранена. Статус ${readiness}; укладочный профиль вместо выбранной операции не применяется.`,
    repairType: profile.canonicalWorkKey,
    selectedWork: {
      selectedCatalogWorkId: requestedCatalogRecordId,
      selectedWorkKey: profile.canonicalWorkKey,
      selectedWorkTitleRu: profile.professionalNameRu,
      selectedWorkCategoryKey: profile.uiGroup === "DEMOLITION_WORKS" ? "demolition" : "roadworks",
      selectedWorkCategoryTitleRu: profile.uiGroup === "DEMOLITION_WORKS" ? "Демонтаж" : "Дорожные работы",
      selectedWorkRawInput: input.rawInput,
      selectedWorkSource: "user_selected",
      selectedWorkResolverReGuessed: false,
    },
    dangerousDiyBlocked: false,
    missingData: [...parameters.missingRequired, ...parameters.missingNormative]
      .map((key) => parameterMetadata[key]?.labelRu ?? key),
    items: seeds.map((seed, index) => ({
      itemType: seed.itemType,
      titleRu: seed.titleRu,
      quantity: seed.quantity,
      unit: seed.unit,
      unitLabel: formatEstimateUnitLabel(seed.unit),
      unitPrice: null,
      currency,
      source: "reference_price_book",
      category: seed.category,
      sourceId: "asphalt-related-professional-estimate-compiler-v4",
      sourceLabel: "Точная семантическая привязка; цена не выбрана",
      formulaId: seed.formulaId,
      quantityFormula: seed.quantityFormula,
      calculationTrace: seed.calculationTrace,
      sourceParameters: {
        asphaltRelatedV4: true,
        requestedCatalogWorkId: requestedCatalogRecordId,
        selectedWorkId: profile.canonicalWorkKey,
        canonicalWorkId: profile.canonicalWorkKey,
        canonicalModelId: profile.canonicalWorkKey,
        canonicalModelVersion: ASPHALT_RELATED_SEMANTIC_REGISTRY_VERSION_V4,
        operationClass: resolvedOperationClass,
        catalogOperationClass: profile.operationClass,
        applicationContext: profile.applicationContext,
        professionalNameRu: profile.professionalNameRu,
        semanticDomains: profile.semanticDomains,
        surfaceMaterial: profile.surfaceMaterial,
        semanticOwner: passport.passportId,
        professionalEstimatePassportId: passport.passportId,
        professionalEstimatePassportVersion: passport.version,
        calculationStrategyId: passport.calculation.calculationStrategyId,
        calculationProfileId: profile.calculationProfileId,
        calculationProfileVersion: ASPHALT_RELATED_SEMANTIC_REGISTRY_VERSION_V4,
        parameterSchemaId: profile.parameterSchemaId,
        parameterSchemaVersion: ASPHALT_RELATED_SEMANTIC_REGISTRY_VERSION_V4,
        formulaGraphVersion: profile.formulaGraphVersion,
        normativeCompositionId: profile.normativeCompositionId,
        semanticFingerprint,
        positiveVectorId: profile.positiveVectorId,
        forbiddenOwnerSetId: profile.forbiddenOwnerSetId,
        domainResolutionReadiness: readiness,
        exactSelectionGenericFallbackUsed: false,
        exactSelectionUnsupported: false,
        phaseOwner: seed.phaseOwner,
        boqSemanticOwner: seed.semanticOwner,
        includedInProcurement: seed.includedInProcurement,
        parameterSnapshot: index === 0 ? parameters.values : undefined,
        assumptionKeys: index === 0 ? parameters.assumptionKeys : undefined,
        asphaltRelatedParameterMetadata: index === 0 ? parameterMetadata : undefined,
        asphaltV4QuantityBasis: index === 0 ? {
          basis_type: "project",
          length_m: null,
          width_m: null,
          area_m2: positiveNumber(parameters.values, "removal_area_m2") || positiveNumber(parameters.values, "area_m2"),
          source: "confirmed_parameter",
          formula_trace: "area_m2 = confirmed exact-operation area",
          assumption_ids: [],
        } : undefined,
        affectedBy: seed.affectedBy,
        formulaSourceTrace: `${profile.formulaGraphVersion}:${seed.formulaId}`,
        normativeSourceId: "KRER_APPLICABILITY_REVIEW_REQUIRED_NO_INVENTED_NUMERIC_RATE",
        normativeReviewStatus: "official_scope_verified_numeric_rate_requires_exact_table_review",
        demolitionMassBalance: removalOperation && executable ? "PASS" : undefined,
        newMaterialBalance: parameters.values.work_scope === "DEMOLITION_AND_REINSTATEMENT" && executable ? "PASS" : undefined,
        sameOperationDoubleCount: 0,
        wasteAndProcurementMixing: 0,
      },
      templateId: `${profile.canonicalWorkKey}:exact-professional-estimate:v1`,
      templateVersion: ASPHALT_RELATED_SEMANTIC_REGISTRY_VERSION_V4,
      normId: `${profile.canonicalWorkKey}:${seed.rowId}:norm-applicability`,
      normFamilyId: "asphalt-related-kr-applicability",
      normSourceId: "KRER_APPLICABILITY_REVIEW_REQUIRED_NO_INVENTED_NUMERIC_RATE",
      normSourceTitle: "Официальная область применения КРЕР; числовая норма требует точного выбора таблицы",
      normVersion: "reviewed-2026-08-10",
      normReviewStatus: "exact_rate_review_required_before_contract_price",
      priceStatus: "PRICE_MISSING",
      priceSource: "missing",
      priceSourceId: null,
      priceSourceLabel: "Цена не заполнена",
      confidence: executable ? "high" : "medium",
      addedBy: "ai",
      materialKey: seed.materialKey ?? null,
      rateKey: `${profile.canonicalWorkKey}:${seed.rowId}`,
    })),
  };
  return {
    draft: applyProfessionalBoqRuntimeContract(draft, { prompt: input.rawInput }),
    profile,
    passport,
    requestedCatalogRecordId,
    readiness,
    resolvedOperationClass,
  };
}

export function isExactAsphaltRelatedConsumerDraftV4(
  draft: ConsumerRepairAiDraft | null,
): boolean {
  if (!draft || draft.selectedWork?.selectedWorkResolverReGuessed !== false) return false;
  const selectedId = draft.selectedWork.selectedCatalogWorkId ?? draft.selectedWork.selectedWorkKey;
  const profile = getAsphaltRelatedProfileByCatalogRecordIdV4(selectedId);
  if (!profile || profile.canonicalWorkKey !== draft.selectedWork.selectedWorkKey) return false;
  return draft.items.length === 0 ||
    draft.items.every((item) => item.sourceParameters?.asphaltRelatedV4 === true);
}
