import {
  compileCanonicalEstimateAndLoad,
  getCanonicalEstimateCatalogItem,
} from "../../lib/estimate/backendPlatform/canonicalEstimateClient";
import { adaptCanonicalRevisionToStructuredEstimate } from "../../lib/estimate/backendPlatform/canonicalEstimateForemanAdapter";
import { validateCanonicalEstimateParameterInputs } from "../../lib/estimate/backendPlatform/canonicalEstimateParameterValidation";
import {
  CanonicalEstimateApiError,
  type CanonicalEstimateCatalogItem,
  type CanonicalEstimateParameterInputValue,
} from "../../lib/estimate/backendPlatform/contracts";
/*
 * This module is deliberately backend-only: it may derive typed inputs from
 * the user's prompt, but it never compiles a fallback estimate on the client.
 */
import {
  mapAiEstimateToForemanDraft,
  verifyForemanAiEstimatePayloadParity,
  type ForemanAiEstimateDraftMapping,
} from "../../lib/foremanAiEstimate";
import {
  parseR4A6PumpStationPrompt,
  R4_A6_PUMP_STATION_CATALOG_ID,
  R4_A6_PUMP_STATION_PRIMARY_MEASURE_PARAMETER_ID,
} from "../../lib/estimate/r4A6PumpStationProfessional";
import {
  parseR4A10AsphaltDrainagePrompt,
  R4_A10_ASPHALT_DRAINAGE_CATALOG_ID,
  R4_A10_ASPHALT_DRAINAGE_PRIMARY_MEASURE_PARAMETER_ID,
} from "../../lib/estimate/r4A10AsphaltDrainagePrompt";
import { extractReinforcementBarScheduleCanonicalParametersV1 } from "../../lib/estimate/ownedDomain/reinforcementBarScheduleProductionBindingV1";
import { extractRicsNrm2FormworkCanonicalParametersV1 } from "../../lib/estimate/ownedDomain/formworkRicsNrm2ProductionBindingV1";
import { extractBiaTn10MasonryCanonicalParametersV1 } from "../../lib/estimate/ownedDomain/masonryBiaTn10ProductionBindingV1";
import { NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID } from "../../lib/estimate/v4/domainFactory";
import { MASONRY_BRICK_WALL_BIA_TN10_NEUTRAL_CATALOG_IDS } from "../../lib/estimate/v4/masonryBrickWallBiaTn10R1";

type UserQuantity = { value: string; unit: "pcs" | "m2" | "m3" | "m" | "kg" | "t" | null };
type CanonicalBaselinePlan = {
  parameters: Record<string, CanonicalEstimateParameterInputValue>;
  assumptions: string[];
  primaryMeasureParameterId: string;
};

const BIA_TN10_MASONRY_CATALOG_IDS = new Set<string>(
  MASONRY_BRICK_WALL_BIA_TN10_NEUTRAL_CATALOG_IDS,
);

type PromptParameterRule = {
  parameterIds: readonly string[];
  pattern: RegExp;
};

export const R4_A10_STRIP_FOUNDATION_CATALOG_ID = "canonical-work:expanded:strip_foundation";

const PROMPT_PARAMETER_RULES: readonly PromptParameterRule[] = [
  {
    parameterIds: ["route_length_m", "cable_length_m"],
    pattern: /(?:длин[а-яё]*\s+)?(?:кабельн[а-яё]*\s+)?трасс[а-яё]*\s*(\d+(?:[,.]\d+)?)\s*(?:м(?:етр[а-яё]*)?)(?![\p{L}\p{N}])/iu,
  },
  {
    parameterIds: ["outlet_count"],
    pattern: /(\d+(?:[,.]\d+)?)\s*розет[а-яё]*/iu,
  },
  {
    parameterIds: ["switch_count"],
    pattern: /(\d+(?:[,.]\d+)?)\s*выключател[а-яё]*/iu,
  },
  {
    parameterIds: ["lighting_point_count"],
    pattern: /(\d+(?:[,.]\d+)?)\s*(?:точ[а-яё]*\s+)?освещен[а-яё]*/iu,
  },
] as const;

const DERIVED_QUANTITY_PARAMETER = /(?:^quantity_|^unit_price_|(?:^|_)(?:compacted_volume|coverage_area|work_quantity|factor|coefficient|calculated|derived|consumption_total|material_m3|labor_man_hours|machine_hours|trip_count|service_count|test_count|test_frequency|test_interval|inspection_interval|control_interval|protocol_count|documentation_count|productivity)(?:_|$))/iu;
const DIRECT_USER_QUANTITY_SOURCE = new Set([
  "USER_MEASURED",
  "USER_DECLARED",
  "USER_INPUT",
  "PROJECT_SPECIFIC_INPUT",
  "USER_INPUT_REQUIRED",
  "PROJECT_DOCUMENTATION",
  "ENGINEERING_DESIGN",
  "SITE_SURVEY",
  // A visible baseline is only a pre-filled value. USER_INPUT remains the
  // owner, so an explicit value in the current request must replace it.
  "VISIBLE_BASELINE_ASSUMPTION",
]);

export function extractUserQuantity(prompt: string): UserQuantity | null {
  const normalizedPrompt = prompt
    .replace(/м²/giu, "м2")
    .replace(/м³/giu, "м3")
    .replace(/(?:кв(?:адратн[\p{L}]*)?\.?\s*м(?:етр[\p{L}]*)?)/giu, "м2")
    .replace(/(?:куб(?:ическ[\p{L}]*)?\.?\s*м(?:етр[\p{L}]*)?)/giu, "м3");
  const match = /(?<![\p{L}\p{N}])(\d+(?:[,.]\d+)?)\s*(штук(?:а|и)?|шт\.?|м2|м3|м|кг|тонн(?:а|ы)?|т)(?![\p{L}\p{N}])/iu.exec(normalizedPrompt);
  if (!match) return null;
  const rawUnit = match[2]
    .toLocaleLowerCase("ru-RU")
    .replace("²", "2")
    .replace("³", "3")
    .replace(/[.\s]+/gu, "");
  const unit = /^шт|^штук/u.test(rawUnit) ? "pcs"
    : rawUnit === "м2" || rawUnit.startsWith("кв") || rawUnit.startsWith("квадратн") ? "m2"
      : rawUnit === "м3" || rawUnit.startsWith("куб") || rawUnit.startsWith("кубическ") ? "m3"
        : rawUnit === "м" ? "m"
          : rawUnit === "кг" ? "kg"
            : rawUnit === "т" || rawUnit.startsWith("тонн") ? "t"
              : null;
  return { value: match[1].replace(",", "."), unit };
}

function parameterAcceptsQuantity(
  parameter: CanonicalEstimateCatalogItem["parameterSchema"][number],
  quantity: UserQuantity,
): boolean {
  if (parameter.valueType !== "decimal" && parameter.valueType !== "integer") return false;
  if (parameter.visibilityRole != null && parameter.visibilityRole !== "USER_INPUT") return false;
  if (parameter.valueSourceRole != null && !DIRECT_USER_QUANTITY_SOURCE.has(String(parameter.valueSourceRole))) return false;
  const identity = `${parameter.parameterId} ${parameter.semanticParameterKey ?? ""} ${parameter.titleRu}`.toLocaleLowerCase("ru-RU");
  if (DERIVED_QUANTITY_PARAMETER.test(identity)) return false;
  const isCount = /количеств|число|count|quantity|qty/u.test(identity);
  if (quantity.unit === "pcs") return isCount || /шт|сва|тумб/u.test(identity);
  const rawUnit = String(parameter.unitId ?? "")
    .toLocaleLowerCase("ru-RU")
    .replace("²", "2")
    .replace("³", "3")
    .replace(/[.\s]+/gu, "");
  const unit: UserQuantity["unit"] = rawUnit === "m2" || rawUnit === "м2" || rawUnit === "sqm" || rawUnit === "sq_m"
    ? "m2"
    : rawUnit === "m3" || rawUnit === "м3" || rawUnit === "cbm"
      ? "m3"
      : rawUnit === "m" || rawUnit === "м"
        ? "m"
        : rawUnit === "kg" || rawUnit === "кг"
          ? "kg"
          : rawUnit === "t" || rawUnit === "т"
            ? "t"
            : rawUnit === "pcs" || rawUnit === "pc" || rawUnit === "шт"
              ? "pcs"
              : null;
  return quantity.unit != null && unit === quantity.unit;
}

function quantityParameterScore(
  parameter: CanonicalEstimateCatalogItem["parameterSchema"][number],
  quantity: UserQuantity,
): number | null {
  if (!parameterAcceptsQuantity(parameter, quantity)) return null;
  const semanticKey = String(parameter.semanticParameterKey ?? parameter.parameterId).toLocaleLowerCase("en-US");
  const exactSourceByUnit: Record<Exclude<UserQuantity["unit"], null>, RegExp> = {
    m2: /^(?:area_m2|(?:work|surface|floor|wall|roof|parking|paving|site)_area_m2)$/u,
    m3: /^(?:volume_m3|(?:work|excavation|fill|concrete)_volume_m3)$/u,
    m: /^(?:length_m|(?:work|route|pipeline|cable)_length_m)$/u,
    kg: /^(?:weight_kg|mass_kg)$/u,
    t: /^(?:weight_t|mass_t)$/u,
    pcs: /^(?:count|quantity|qty)$/u,
  };
  if (quantity.unit != null && exactSourceByUnit[quantity.unit].test(semanticKey)) return 120;
  if (/(?:^|_)(?:area|volume|length|count|quantity|qty|weight|mass)(?:_|$)/u.test(semanticKey)) return 80;
  return 20;
}

function baselineValue(
  parameter: CanonicalEstimateCatalogItem["parameterSchema"][number],
): CanonicalEstimateParameterInputValue | undefined {
  if (parameter.defaultValue != null) {
    return parameter.defaultValue as CanonicalEstimateParameterInputValue;
  }
  return undefined;
}

function promptOwnedNamedParameters(
  schema: CanonicalEstimateCatalogItem["parameterSchema"],
  prompt: string,
): Record<string, CanonicalEstimateParameterInputValue> {
  const byId = new Map(schema.map((parameter) => [parameter.parameterId, parameter]));
  const values: Record<string, CanonicalEstimateParameterInputValue> = {};
  for (const rule of PROMPT_PARAMETER_RULES) {
    const parameterId = rule.parameterIds.find((candidate) => byId.has(candidate));
    if (!parameterId) continue;
    const parameter = byId.get(parameterId)!;
    if ((parameter.valueType !== "decimal" && parameter.valueType !== "integer")
      || (parameter.visibilityRole != null && parameter.visibilityRole !== "USER_INPUT")
      || (parameter.valueSourceRole != null
        && !DIRECT_USER_QUANTITY_SOURCE.has(String(parameter.valueSourceRole)))) continue;
    const match = rule.pattern.exec(prompt);
    if (!match) continue;
    values[parameterId] = match[1].replace(",", ".");
  }
  return values;
}

function promptNumber(prompt: string, pattern: RegExp): string | undefined {
  const match = pattern.exec(prompt);
  return match?.[1]?.replace(",", ".");
}

function promptBoolean(prompt: string, subject: RegExp): boolean | undefined {
  const negative = new RegExp(`${subject.source}[^.;]{0,40}(?:не\\s+вход|нет|исключ)`, "iu");
  if (negative.test(prompt)) return false;
  const positive = new RegExp(`${subject.source}[^.;]{0,40}(?:вход|да|включ)`, "iu");
  return positive.test(prompt) ? true : undefined;
}

function promptReference(prompt: string, label: RegExp): string | undefined {
  const match = prompt.match(new RegExp(`${label.source}\\s*[:=]\\s*([^;\\n]+)`, "iu"));
  return match?.[1]?.trim() || undefined;
}

/**
 * Parses only dimensions whose semantic target is explicit. Generic
 * "100 m long and 20 m wide" can describe the building and must remain a
 * clarification, never strip geometry.
 */
export function parseR4A10StripFoundationPrompt(
  prompt: string,
): Record<string, CanonicalEstimateParameterInputValue> {
  const values: Record<string, CanonicalEstimateParameterInputValue> = {};
  const numeric: Readonly<Record<string, RegExp>> = {
    total_axis_length_m: /(?:суммарн\p{L}*\s+длин\p{L}*\s+(?:по\s+оси\s+)?лент\p{L}*|длин\p{L}*\s+(?:самой\s+)?лент\p{L}*)\s*(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu,
    strip_width_m: /ширин\p{L}*\s+(?:самой\s+)?лент\p{L}*\s*(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu,
    strip_height_m: /(?:высот\p{L}*|глубин\p{L}*)\s+(?:бетонн\p{L}*\s+)?лент\p{L}*\s*(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu,
    preparation_thickness_m: /толщин\p{L}*\s+(?:бетонн\p{L}*\s+)?подготовк\p{L}*\s*(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu,
    concrete_order_allowance_percent: /запас\p{L}*\s+бетонн\p{L}*\s+смес\p{L}*\s*(\d+(?:[,.]\d+)?)\s*%/iu,
    reinforcement_mass_t: /масс\p{L}*\s+арматур\p{L}*\s*(\d+(?:[,.]\d+)?)\s*(?:т|тонн\p{L}*)/iu,
    binding_wire_mass_kg: /масс\p{L}*\s+(?:вязальн\p{L}*\s+)?проволок\p{L}*\s*(\d+(?:[,.]\d+)?)\s*кг/iu,
    formwork_transport_mass_t: /транспортн\p{L}*\s+масс\p{L}*\s+опалубк\p{L}*\s*(\d+(?:[,.]\d+)?)\s*(?:т|тонн\p{L}*)/iu,
    concrete_delivery_distance_km: /(?:расстоян\p{L}*\s+)?доставк\p{L}*\s+бетонн\p{L}*\s+смес\p{L}*\s*(\d+(?:[,.]\d+)?)\s*км/iu,
    reinforcement_delivery_distance_km: /(?:расстоян\p{L}*\s+)?доставк\p{L}*\s+арматур\p{L}*\s*(\d+(?:[,.]\d+)?)\s*км/iu,
    formwork_delivery_distance_km: /(?:расстоян\p{L}*\s+)?доставк\p{L}*\s+опалубк\p{L}*\s*(\d+(?:[,.]\d+)?)\s*км/iu,
    excavation_volume_m3: /объ[её]м\p{L}*\s+(?:разработк\p{L}*|выемк\p{L}*)\s+грунт\p{L}*\s*(\d+(?:[,.]\d+)?)\s*(?:м3|м³)/iu,
    foundation_bedding_volume_m3: /объ[её]м\p{L}*\s+(?:материал\p{L}*\s+)?подушк\p{L}*\s*(\d+(?:[,.]\d+)?)\s*(?:м3|м³)/iu,
    bedding_delivery_distance_km: /(?:расстоян\p{L}*\s+)?доставк\p{L}*\s+(?:материал\p{L}*\s+)?подушк\p{L}*\s*(\d+(?:[,.]\d+)?)\s*км/iu,
    waterproofing_area_m2: /площад\p{L}*\s+гидроизоляц\p{L}*\s*(\d+(?:[,.]\d+)?)\s*(?:м2|м²)/iu,
    backfill_volume_m3: /объ[её]м\p{L}*\s+обратн\p{L}*\s+засыпк\p{L}*\s*(\d+(?:[,.]\d+)?)\s*(?:м3|м³)/iu,
    excavated_soil_density_t_m3: /плотност\p{L}*\s+(?:вывозим\p{L}*\s+)?грунт\p{L}*\s*(\d+(?:[,.]\d+)?)\s*(?:т\/м3|т\/м³)/iu,
    soil_disposal_distance_km: /расстоян\p{L}*\s+вывоз\p{L}*\s+грунт\p{L}*\s*(\d+(?:[,.]\d+)?)\s*км/iu,
  };
  for (const [parameterId, pattern] of Object.entries(numeric)) {
    const value = promptNumber(prompt, pattern);
    if (value !== undefined) values[parameterId] = value;
  }
  const booleans: Readonly<Record<string, RegExp>> = {
    preparation_included: /бетонн\p{L}*\s+подготовк\p{L}*/iu,
    groundworks_included: /(?:землян\p{L}*\s+работ\p{L}*|разработк\p{L}*\s+грунт\p{L}*)/iu,
    foundation_bedding_included: /подушк\p{L}*\s+основан\p{L}*/iu,
    waterproofing_included: /гидроизоляц\p{L}*/iu,
    backfill_included: /обратн\p{L}*\s+засыпк\p{L}*/iu,
    soil_disposal_included: /вывоз\p{L}*\s+(?:лишн\p{L}*\s+)?грунт\p{L}*/iu,
  };
  for (const [parameterId, subject] of Object.entries(booleans)) {
    const value = promptBoolean(prompt, subject);
    if (value !== undefined) values[parameterId] = value;
  }
  const concreteClass = prompt.match(/класс\p{L}*\s+бетон\p{L}*\s*(B(?:15|20|25|30|35|40))/iu)?.[1];
  if (concreteClass) values.concrete_class = concreteClass.toUpperCase();
  const watertightness = prompt.match(/водонепроницаемост\p{L}*\s*(W(?:2|4|6|8|10|12))/iu)?.[1];
  if (watertightness) values.watertightness = watertightness.toUpperCase();
  const frostResistance = prompt.match(/морозостойкост\p{L}*\s*(F(?:50|75|100|150|200|300))/iu)?.[1];
  if (frostResistance) values.frost_resistance = frostResistance.toUpperCase();
  const mobility = prompt.match(/подвижност\p{L}*\s+(?:смес\p{L}*\s*)?(P(?:2|3|4|5))/iu)?.[1];
  if (mobility) values.mobility = mobility.toUpperCase();
  const reinforcementSchedule = extractReinforcementBarScheduleCanonicalParametersV1(prompt);
  if (reinforcementSchedule) {
    values.reinforcement_product_profile_id = String(reinforcementSchedule.product_profile_id);
    const approvedWeightKg = Number(reinforcementSchedule.approved_reinforcement_schedule_weight_kg);
    if (Number.isFinite(approvedWeightKg) && approvedWeightKg > 0) {
      values.reinforcement_mass_t = String(approvedWeightKg / 1_000);
    }
    for (const [parameterId, value] of Object.entries(reinforcementSchedule)) {
      if (parameterId === "product_profile_id"
        || parameterId === "approved_reinforcement_schedule_weight_kg") continue;
      values[parameterId === "estimator_approval_reference"
        ? "reinforcement_estimator_approval_reference"
        : parameterId] = value;
    }
  }
  if (/(?:NRMCA\s*)?CIP\s*31/iu.test(prompt)) {
    values.product_profile_id = NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID;
    const evidenceLabels: readonly (readonly [string, RegExp])[] = [
      ["plan_volume_calculation_reference", /(?:расч[её]т\s+проектн\p{L}*\s+объ[её]м\p{L}*|plan\s+volume\s+calculation\s+reference)/iu],
      ["mix_design_or_project_specification_reference", /(?:спецификаци\p{L}*\s+бетонн\p{L}*\s+смес\p{L}*|mix\s+design\s+or\s+project\s+specification\s+reference)/iu],
      ["mixture_designation", /(?:обозначени\p{L}*\s+бетонн\p{L}*\s+смес\p{L}*|mixture\s+designation)/iu],
      ["placement_location", /(?:мест\p{L}*\s+укладк\p{L}*\s+бетон\p{L}*|placement\s+location)/iu],
      ["contingency_selection_justification", /(?:обосновани\p{L}*\s+запас\p{L}*|contingency\s+selection\s+justification)/iu],
      ["delivery_schedule_and_truck_capacity", /(?:график\p{L}*\s+поставк\p{L}*\s+и\s+вместимост\p{L}*\s+миксер\p{L}*|delivery\s+schedule\s+and\s+truck\s+capacity)/iu],
      ["producer_order_confirmation", /(?:подтверждени\p{L}*\s+заказ\p{L}*\s+производител\p{L}*|producer\s+order\s+confirmation)/iu],
      ["estimator_approval_reference", /(?:согласовани\p{L}*\s+сметчик\p{L}*|estimator\s+approval\s+reference)/iu],
    ];
    for (const [parameterId, label] of evidenceLabels) {
      const value = promptReference(prompt, label);
      if (value) values[parameterId] = value;
    }
    const placementMethod = promptReference(prompt, /(?:способ\p{L}*\s+укладк\p{L}*|placement\s+method)/iu);
    if (placementMethod) {
      const normalizedPlacement = placementMethod.toLocaleLowerCase("ru-RU");
      if (/pump|насос/iu.test(normalizedPlacement)) values.placement_method = "pump";
      else if (/crane[_\s-]*bucket|кран|бадь/iu.test(normalizedPlacement)) values.placement_method = "crane_bucket";
      else if (/direct[_\s-]*chute|лоток/iu.test(normalizedPlacement)) values.placement_method = "direct_chute";
    }
  }
  if (/материал\p{L}*\s+подушк\p{L}*[^.;]{0,30}щеб(?:е|ё)н/iu.test(prompt)) {
    values.foundation_bedding_type = "crushed_stone";
  } else if (/материал\p{L}*\s+подушк\p{L}*[^.;]{0,30}пес/iu.test(prompt)) {
    values.foundation_bedding_type = "sand";
  }
  if (/систем\p{L}*\s+гидроизоляц\p{L}*[^.;]{0,30}(?:лист|мембран)/iu.test(prompt)) {
    values.waterproofing_system = "sheet_membrane";
  } else if (/систем\p{L}*\s+гидроизоляц\p{L}*[^.;]{0,30}обмаз/iu.test(prompt)) {
    values.waterproofing_system = "bituminous_coating";
  }
  return values;
}
function explicitRicsNrm2FormworkPromptInputs(input: {
  catalog: CanonicalEstimateCatalogItem;
  prompt: string;
}): Record<string, CanonicalEstimateParameterInputValue> | null {
  const extracted = extractRicsNrm2FormworkCanonicalParametersV1(input.prompt);
  const schemaIds = new Set(input.catalog.parameterSchema.map((parameter) => parameter.parameterId));
  if (!extracted || !schemaIds.has("measured_formwork_contact_area_m2")) return null;
  const values: Record<string, CanonicalEstimateParameterInputValue> = {};
  for (const [parameterId, value] of Object.entries(extracted)) {
    if (schemaIds.has(parameterId)) values[parameterId] = value;
  }
  return values;
}

function explicitBiaTn10MasonryPromptInputs(input: {
  catalog: CanonicalEstimateCatalogItem;
  prompt: string;
}): Record<string, CanonicalEstimateParameterInputValue> | null {
  if (!BIA_TN10_MASONRY_CATALOG_IDS.has(input.catalog.catalogId)) return null;
  const extracted = extractBiaTn10MasonryCanonicalParametersV1(input.prompt);
  if (!extracted) return null;
  const schemaIds = new Set(input.catalog.parameterSchema.map((parameter) => parameter.parameterId));
  const values: Record<string, CanonicalEstimateParameterInputValue> = {};
  for (const [parameterId, value] of Object.entries(extracted)) {
    if (schemaIds.has(parameterId)) values[parameterId] = value;
  }
  return values;
}


export function buildCanonicalBaselinePlan(input: {
  catalog: CanonicalEstimateCatalogItem;
  prompt: string;
}): CanonicalBaselinePlan {
  const baselineInputs: Record<string, CanonicalEstimateParameterInputValue> = {};
  for (const parameter of input.catalog.parameterSchema) {
    const value = baselineValue(parameter);
    if (value !== undefined) baselineInputs[parameter.parameterId] = value;
  }
  const submittedInputs: Record<string, CanonicalEstimateParameterInputValue> = {};
  const pumpStationInput = input.catalog.catalogId === R4_A6_PUMP_STATION_CATALOG_ID
    ? parseR4A6PumpStationPrompt(input.prompt)
    : null;
  const stripFoundationInput = input.catalog.catalogId === R4_A10_STRIP_FOUNDATION_CATALOG_ID
    ? parseR4A10StripFoundationPrompt(input.prompt)
    : null;
  const asphaltDrainageInput = input.catalog.catalogId === R4_A10_ASPHALT_DRAINAGE_CATALOG_ID
    ? parseR4A10AsphaltDrainagePrompt(input.prompt)
    : null;
  const ricsNrm2FormworkInput = explicitRicsNrm2FormworkPromptInputs(input);
  const biaTn10MasonryInput = explicitBiaTn10MasonryPromptInputs(input);
  const userQuantity = pumpStationInput == null && stripFoundationInput == null
    && asphaltDrainageInput == null && ricsNrm2FormworkInput == null && biaTn10MasonryInput == null
    ? extractUserQuantity(input.prompt)
    : null;
  let userQuantityParameterId: string | null = null;
  if (userQuantity) {
    const candidates = input.catalog.parameterSchema
      .map((parameter) => ({ parameter, score: quantityParameterScore(parameter, userQuantity) }))
      .filter((candidate): candidate is { parameter: CanonicalEstimateCatalogItem["parameterSchema"][number]; score: number } => candidate.score != null)
      .sort((left, right) => right.score - left.score || left.parameter.ordinal - right.parameter.ordinal);
    const target = candidates[0];
    if (target && (candidates.length === 1 || target.score > candidates[1].score)) {
      submittedInputs[target.parameter.parameterId] = userQuantity.value;
      userQuantityParameterId = target.parameter.parameterId;
    }
  }
  Object.assign(
    submittedInputs,
    pumpStationInput ?? stripFoundationInput ?? asphaltDrainageInput ?? ricsNrm2FormworkInput ?? biaTn10MasonryInput
      ?? promptOwnedNamedParameters(input.catalog.parameterSchema, input.prompt),
  );
  const primaryMeasureParameterId = pumpStationInput != null
    ? R4_A6_PUMP_STATION_PRIMARY_MEASURE_PARAMETER_ID
    : stripFoundationInput != null
      ? "total_axis_length_m"
      : asphaltDrainageInput != null
        ? R4_A10_ASPHALT_DRAINAGE_PRIMARY_MEASURE_PARAMETER_ID
        : ricsNrm2FormworkInput != null
          ? "measured_formwork_contact_area_m2"
          : biaTn10MasonryInput != null
            ? "measured_net_brick_wall_area_m2"
            : userQuantityParameterId
    ?? input.catalog.parameterSchema
      .filter((parameter) => parameter.visibilityRole == null || parameter.visibilityRole === "USER_INPUT")
      .filter((parameter) => parameter.valueType === "decimal" || parameter.valueType === "integer")
      .filter((parameter) => !DERIVED_QUANTITY_PARAMETER.test(
        `${parameter.parameterId} ${parameter.semanticParameterKey ?? ""} ${parameter.titleRu}`,
      ))
      .sort((left, right) => {
        const score = (parameter: typeof left) => /^(?:area_m2|volume_m3|length_m|count|quantity|qty)$/u.test(
          String(parameter.semanticParameterKey ?? parameter.parameterId).toLocaleLowerCase("en-US"),
        ) ? 0 : 1;
        return score(left) - score(right) || left.ordinal - right.ordinal;
      })[0]?.parameterId;
  if (!primaryMeasureParameterId) throw new Error("CANONICAL_PRIMARY_MEASURE_NOT_RESOLVED");
  const validation = validateCanonicalEstimateParameterInputs({
    schema: input.catalog.parameterSchema,
    rawInputs: { ...baselineInputs, ...submittedInputs },
  });
  if (!validation.ok) {
    const missing = validation.issues
      .filter((issue) => issue.code === "REQUIRED" || issue.code === "REQUIRED_WHEN")
      .map((issue) => issue.parameterId);
    throw new Error(`CANONICAL_BASELINE_CONTRACT_MISSING:${[...new Set(missing)].join(",") || validation.issues.map((issue) => issue.code).join(",")}`);
  }
  const assumptions = input.catalog.parameterSchema
    .filter((parameter) => parameter.visibilityRole === "USER_INPUT")
    .filter((parameter) => parameter.valueSourceRole == null || DIRECT_USER_QUANTITY_SOURCE.has(String(parameter.valueSourceRole)))
    .filter((parameter) => !DERIVED_QUANTITY_PARAMETER.test(`${parameter.parameterId} ${parameter.semanticParameterKey ?? ""} ${parameter.titleRu}`))
    .filter((parameter) => parameter.guide?.guideKind !== "DERIVED_VALUE_RULE")
    .filter((parameter) => parameter.parameterId !== userQuantityParameterId)
    .filter((parameter) => validation.parameters[parameter.parameterId] != null)
    .map((parameter) => `${parameter.titleRu}: ${String(validation.parameters[parameter.parameterId])}${parameter.unitId ? ` ${parameter.unitId}` : ""}`);
  return {
    // Persisted baseline values are merged and owned by the backend worker.
    // Sending only prompt-owned values prevents baseline assumptions and
    // derived outputs from being misclassified as user input.
    parameters: submittedInputs,
    primaryMeasureParameterId,
    assumptions: [
      "Исходная смета рассчитана по явно показанным базовым допущениям; их необходимо проверить перед договором.",
      ...assumptions,
    ],
  };
}

export function buildCanonicalBaselineInputs(input: {
  catalog: CanonicalEstimateCatalogItem;
  prompt: string;
}): Record<string, CanonicalEstimateParameterInputValue> {
  return buildCanonicalBaselinePlan(input).parameters;
}

function stableId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export async function compileConsumerCanonicalBaseline(input: {
  catalogId: string;
  prompt: string;
  draftId: string;
}): Promise<ForemanAiEstimateDraftMapping> {
  const catalog = await getCanonicalEstimateCatalogItem(input.catalogId).catch((error: unknown) => {
    if (error instanceof CanonicalEstimateApiError && error.code === "NOT_FOUND") {
      throw new Error(`CANONICAL_BACKEND_DEFINITION_MISSING:${input.catalogId}`);
    }
    throw error;
  });
  const baseline = buildCanonicalBaselinePlan({ catalog, prompt: input.prompt });
  const parameters = baseline.parameters;
  const compiled = await compileCanonicalEstimateAndLoad({
    request: {
      idempotencyKey: `consumer-baseline-${stableId(`${input.draftId}|${catalog.releaseId}|${catalog.catalogId}|${input.prompt}|${JSON.stringify(parameters)}`)}`,
      catalogId: catalog.catalogId,
      sourceRequestText: input.prompt.trim(),
      primaryMeasureParameterId: baseline.primaryMeasureParameterId,
      parameters,
      currencyCode: "KGS",
    },
  });
  const estimate = adaptCanonicalRevisionToStructuredEstimate({
    catalog,
    revision: compiled.revision,
    rows: compiled.rows,
    inputText: input.prompt,
    assumptions: baseline.assumptions,
  });
  const mapping = mapAiEstimateToForemanDraft({
    estimate,
    context: {
      objectName: "Заявка на ремонт",
      levelName: "",
      systemName: "",
      zoneName: "",
      sourceScreen: "foreman_materials",
    },
    estimateRevisionId: compiled.revision.revisionId,
    estimateReleaseId: compiled.revision.releaseId,
  });
  const parity = verifyForemanAiEstimatePayloadParity(mapping);
  if (!parity.ok) throw new Error(`CANONICAL_BASELINE_PARITY_FAILED:${parity.issues.map((issue) => issue.code).join(",")}`);
  return mapping;
}
