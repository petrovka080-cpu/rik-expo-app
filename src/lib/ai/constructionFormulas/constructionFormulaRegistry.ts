import type { GlobalUnitInput } from "../globalEstimate";
import {
  CONSTRUCTION_PRIMITIVE_DOMAINS,
  type ConstructionPrimitiveDomainNode,
} from "../constructionPrimitives";
import type { EstimatorReasoningPlan } from "../estimatorKernel/estimatorKernelTypes";
import type { WorldConstructionDomain } from "../worldConstructionOntology";

export type ConstructionFormulaPolicy = {
  domain: WorldConstructionDomain;
  formulaCandidates: string[];
  allowedInputUnits: GlobalUnitInput["normalizedUnit"][];
  outputUnits: GlobalUnitInput["normalizedUnit"][];
};

function outputUnitsFor(domain: ConstructionPrimitiveDomainNode): GlobalUnitInput["normalizedUnit"][] {
  if (domain.domain === "hydropower") return ["set", "pcs", "kg", "linear_m"];
  if (domain.domain === "foundations" || domain.domain === "concrete") return ["m3", "kg", "set"];
  if (domain.domain === "well_drilling") return ["linear_m", "pcs", "set"];
  if (domain.domain === "roofing") return ["sq_m", "linear_m", "pcs", "kg", "set"];
  if (domain.domain === "roadworks" || domain.domain === "landscaping") return ["sq_m", "m3", "linear_m", "ton", "set"];
  if (domain.domain === "steel_structures") return ["kg", "ton", "pcs", "set"];
  return [...new Set<GlobalUnitInput["normalizedUnit"]>([...domain.units, "pcs", "set"])];
}

export const CONSTRUCTION_FORMULA_REGISTRY: readonly ConstructionFormulaPolicy[] =
  CONSTRUCTION_PRIMITIVE_DOMAINS.map((domain) => ({
    domain: domain.domain,
    formulaCandidates: domain.formulaCandidates,
    allowedInputUnits: domain.units,
    outputUnits: outputUnitsFor(domain),
  }));

export const UNIVERSAL_ESTIMATOR_FORMULA_FAMILIES = [
  "rectangular_concrete_element_volume",
  "formwork_area",
  "strip_foundation_volume",
  "slab_volume",
  "floor_covering_area",
  "wall_partition_area",
  "roof_slope_area_approximation",
  "paving_area",
  "waterproofing_area",
  "drainage_channel_length_based_estimate",
  "passenger_elevator_floor_count_preliminary_estimate",
  "well_drilling_depth",
  "solar_power_sizing",
  "hydropower_required_inputs",
  "ventilation_area_based_preliminary_estimate",
  "electrical_area_points_preliminary_estimate",
] as const;

export function getConstructionFormulaPolicy(domain: WorldConstructionDomain): ConstructionFormulaPolicy {
  return CONSTRUCTION_FORMULA_REGISTRY.find((item) => item.domain === domain) ?? CONSTRUCTION_FORMULA_REGISTRY[0];
}

export type UniversalConstructionQuantities = {
  areaM2?: number;
  lengthM?: number;
  widthM?: number;
  heightM?: number;
  depthM?: number;
  count?: number;
  powerKw?: number;
  floorCount?: number;
  massTon?: number;
  rawDimensions: string[];
};

export function normalizeDimensionText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ru-RU")
    .replace(/,/g, ".")
    .replace(/[×х*]/g, " x ")
    .replace(/[(){}\[\];:!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function firstNumber(text: string, pattern: RegExp): number | undefined {
  const match = text.match(pattern);
  return toNumber(match?.[1]);
}

export function parseUniversalConstructionQuantities(text: string): UniversalConstructionQuantities {
  const normalized = normalizeDimensionText(text);
  const rawDimensions: string[] = [];
  const triple = normalized.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
  if (triple) rawDimensions.push(triple[0]);

  const labeledWidth = firstNumber(normalized, /(?:ширина|width)\s*(\d+(?:\.\d+)?)/);
  const labeledHeight = firstNumber(normalized, /(?:высота|height)\s*(\d+(?:\.\d+)?)/);
  const labeledLength = firstNumber(normalized, /(?:длина|length)\s*(\d+(?:\.\d+)?)/);
  const labeledDepth = firstNumber(normalized, /(?:глубина|depth)\s*(\d+(?:\.\d+)?)/);
  const dimensions = triple
    ? [toNumber(triple[1]), toNumber(triple[2]), toNumber(triple[3])].filter((value): value is number => value !== undefined)
    : [];

  const areaM2 = firstNumber(normalized, /(\d+(?:\.\d+)?)\s*(?:кв\.?\s*м|м2|м²|sqm|sq\s*m|sq_m)/);
  const powerKw = firstNumber(normalized, /(\d+(?:\.\d+)?)\s*(?:квт|кw|kw|kilowatt)/);
  const floorCount = firstNumber(normalized, /(\d+(?:\.\d+)?)\s*(?:этаж|этажей|останов|stops?|floors?)/);
  const count = firstNumber(normalized, /(\d+(?:\.\d+)?)\s*(?:шт|штук|pcs|pieces?|ед\.?|set|компл\.?)/)
    ?? firstNumber(normalized, /(?:count|количество|надо)\s*(\d+(?:\.\d+)?)/);
  const massTon = firstNumber(normalized, /(\d+(?:\.\d+)?)\s*(?:тонн|тонна|т\b|ton)/);
  const explicitLength = firstNumber(normalized, /(\d+(?:\.\d+)?)\s*(?:пог\.?\s*м|метров|метра|м\b|meters?|metres?|linear_m|linear\s*m)/);

  return {
    areaM2,
    lengthM: labeledLength ?? dimensions[1] ?? explicitLength,
    widthM: labeledWidth ?? dimensions[0],
    heightM: labeledHeight ?? dimensions[2],
    depthM: labeledDepth,
    count,
    powerKw,
    floorCount,
    massTon,
    rawDimensions,
  };
}

export function resolveQuantityInputsFromPrompt(text: string): UniversalConstructionQuantities {
  return parseUniversalConstructionQuantities(text);
}

export function validateQuantityInputs(quantities: UniversalConstructionQuantities): { passed: boolean; failures: string[] } {
  const failures: string[] = [];
  for (const [key, value] of Object.entries(quantities)) {
    if (key === "rawDimensions" || value === undefined) continue;
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) failures.push(`invalid_quantity:${key}`);
  }
  if (
    quantities.widthM !== undefined &&
    quantities.heightM !== undefined &&
    quantities.lengthM !== undefined &&
    quantities.count === undefined
  ) {
    failures.push("dimensioned_element_count_missing");
  }
  return { passed: failures.length === 0, failures };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function resolveFormulaForEstimatorPlan(plan: EstimatorReasoningPlan): EstimatorReasoningPlan["formulas"] {
  const q = plan.quantities;
  if (plan.semanticFrame.object === "concrete_pedestal") {
    const width = q.widthM;
    const length = q.lengthM;
    const height = q.heightM;
    const count = q.count;
    if (width && length && height && count) {
      const volumeEach = round2(width * length * height);
      const volumeTotal = round2(volumeEach * count);
      const concreteWithWaste = round2(volumeTotal * 1.05);
      const formworkTotal = round2(2 * (width + length) * height * count);
      return [{
        formulaId: "rectangular_concrete_element_volume",
        inputs: { widthM: width, lengthM: length, heightM: height, count },
        outputs: { volumeEachM3: volumeEach, volumeTotalM3: volumeTotal, concreteWithWasteM3: concreteWithWaste, formworkTotalM2: formworkTotal },
        assumptions: ["Прямоугольная бетонная тумба считается по габаритам ширина x длина x высота."],
        missingInputs: [],
      }];
    }
    return [{
      formulaId: "rectangular_concrete_element_volume",
      inputs: {},
      outputs: {},
      assumptions: ["Нужны ширина, длина, высота и количество тумб."],
      missingInputs: ["widthM", "lengthM", "heightM", "count"],
    }];
  }
  if (plan.semanticFrame.object === "drainage_channel") {
    const length = q.lengthM ?? 1;
    return [{
      formulaId: "drainage_channel_length_based_estimate",
      inputs: { lengthM: length },
      outputs: { channelLengthM: length, beddingVolumeM3: round2(length * 0.08), concreteBaseM3: round2(length * 0.06) },
      assumptions: ["Предварительный расчет дренажного канала идет по длине трассы."],
      missingInputs: q.lengthM ? [] : ["lengthM"],
    }];
  }
  if (plan.semanticFrame.object === "passenger_elevator") {
    const floorCount = q.floorCount ?? 1;
    return [{
      formulaId: "passenger_elevator_floor_count_preliminary_estimate",
      inputs: { floorCount },
      outputs: { stops: floorCount, shaftDoors: floorCount, callStations: floorCount },
      assumptions: ["Количество остановок предварительно принято равным количеству этажей."],
      missingInputs: q.floorCount ? [] : ["floorCount"],
    }];
  }
  if (plan.semanticFrame.object === "hydropower_turbine") {
    const powerKw = q.powerKw ?? 1;
    return [{
      formulaId: "hydropower_required_inputs",
      inputs: { powerKw },
      outputs: { installedPowerKw: powerKw, equipmentSet: 1 },
      assumptions: ["Без напора H и расхода Q мощность используется только для предварительной структуры BOQ."],
      missingInputs: ["headM", "flowM3s"],
    }];
  }
  if (plan.semanticFrame.object === "electrical_network") {
    const area = q.areaM2 ?? 1;
    return [{
      formulaId: "electrical_area_points_preliminary_estimate",
      inputs: { areaM2: area },
      outputs: { areaM2: area, pointsApprox: Math.max(8, Math.ceil(area / 6)), cableLengthM: round2(area * 2.2) },
      assumptions: ["Количество точек и длина кабеля являются предварительными до проекта электрики."],
      missingInputs: q.areaM2 ? [] : ["areaM2"],
    }];
  }
  if (plan.semanticFrame.object === "ventilation_network") {
    const area = q.areaM2 ?? 1;
    return [{
      formulaId: "ventilation_area_based_preliminary_estimate",
      inputs: { areaM2: area },
      outputs: { areaM2: area, ductLengthM: round2(Math.sqrt(area) * 5), airTerminals: Math.max(2, Math.ceil(area / 25)) },
      assumptions: ["Расход воздуха и трассы уточняются проектом ОВиК."],
      missingInputs: q.areaM2 ? [] : ["areaM2"],
    }];
  }
  const area = q.areaM2 ?? q.lengthM ?? q.count ?? q.powerKw ?? 1;
  return [{
    formulaId: "generic_parsable_work_quantity",
    inputs: { primaryQuantity: area },
    outputs: { primaryQuantity: area },
    assumptions: ["Использован первичный измеримый объем из запроса."],
    missingInputs: [],
  }];
}

export function validateFormulaResult(plan: EstimatorReasoningPlan): { passed: boolean; failures: string[] } {
  const failures: string[] = [];
  if (plan.formulas.length === 0) failures.push("formula_result_missing");
  for (const formula of plan.formulas) {
    if (!formula.formulaId.trim()) failures.push("formula_id_missing");
    if (Object.keys(formula.outputs).length === 0 && formula.missingInputs.length === 0) failures.push(`formula_outputs_missing:${formula.formulaId}`);
    for (const [key, value] of Object.entries(formula.outputs)) {
      if (!Number.isFinite(value) || value <= 0) failures.push(`formula_output_invalid:${formula.formulaId}:${key}`);
    }
  }
  return { passed: failures.length === 0, failures };
}
