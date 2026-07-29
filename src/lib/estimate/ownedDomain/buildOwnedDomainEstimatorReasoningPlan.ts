import type { DirectConsumerRepairOpenWorldOwner } from "./directConsumerRepairOpenWorldRouting";
import {
  ELECTRICAL_CANONICAL_CALCULATION_VERSION,
  resolveElectricalCanonicalParameters,
  type ElectricalCanonicalParameterValues,
} from "../v4/electrical/electricalCanonicalV1";
import type { EstimatorReasoningPlan } from "../../ai/estimatorKernel/estimatorKernelTypes";

function positiveNumber(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function areaFromPrompt(text: string): number | undefined {
  return positiveNumber(
    text.match(
      /(\d+(?:[,.]\d+)?)\s*(?:кв\.?\s*м|м2|м²|sq(?:uare)?[_\s-]*m|sqm)/iu,
    )?.[1],
  );
}

function pricingPolicy(currency: string): EstimatorReasoningPlan["pricingPolicy"] {
  return {
    localContextStatus: "partial",
    currency,
    sourcePolicy: "configured_reference_or_catalog_gap_warning",
    taxPolicy: "local_tax_warning_required",
    allowIndicativePrices: true,
  };
}

function electricalPlan(
  text: string,
  currency: string,
  overrides?: ElectricalCanonicalParameterValues,
): EstimatorReasoningPlan {
  const resolved = resolveElectricalCanonicalParameters({
    text,
    overrides,
    changedAt: "estimator-plan",
  });
  const areaM2 = typeof resolved.values.area_m2 === "number"
    ? resolved.values.area_m2
    : undefined;
  const routeLengthM = typeof resolved.values.route_length_m === "number"
    ? resolved.values.route_length_m
    : undefined;
  const panelIncluded = resolved.values.panel_included !== false;
  const protectiveDevicesIncluded = resolved.values.protective_devices_included !== false;
  const groundingIncluded = resolved.values.grounding_included !== false;
  const demolitionIncluded = resolved.values.demolition_included === true;
  const outletCount = typeof resolved.values.outlet_count === "number"
    ? resolved.values.outlet_count
    : 0;
  const switchCount = typeof resolved.values.switch_count === "number"
    ? resolved.values.switch_count
    : 0;
  const lightingPointCount = typeof resolved.values.lighting_point_count === "number"
    ? resolved.values.lighting_point_count
    : 0;
  return {
    intent: "estimate",
    workKey: "electrical_area_installation",
    titleRu: "Профессиональная предварительная смета на электромонтаж",
    category: "electrical",
    confidence: "medium",
    templateExactMatch: false,
    parsableWorkDetected: true,
    regulatedWorkDetected: false,
    semanticFrame: {
      domain: "electrical",
      object: "electrical_network",
      operation: "installation",
      method: "area_points_preliminary",
      materialSystem: "electrical_installation",
      regulated: false,
      confidence: 0.86,
    },
    quantities: {
      areaM2,
      lengthM: routeLengthM,
      rawDimensions: [],
    },
    canonicalParameters: resolved.values,
    calculationVersion: ELECTRICAL_CANONICAL_CALCULATION_VERSION,
    formulas: [],
    boqPlan: {
      complexity: "complex",
      sections: ["materials", "labor", "equipment", "delivery"],
      requiredMaterials: [
        ...(routeLengthM != null ? ["кабельные линии", "гофра / кабель-канал"] : []),
        ...(outletCount + switchCount > 0 ? ["подрозетники"] : []),
        ...(outletCount > 0 ? ["розетки"] : []),
        ...(switchCount > 0 ? ["выключатели"] : []),
        ...(lightingPointCount > 0 ? ["точки освещения"] : []),
        ...(panelIncluded ? ["электрический щит"] : []),
        ...(protectiveDevicesIncluded ? ["автоматы и УЗО"] : []),
        ...(groundingIncluded ? ["шина заземления"] : []),
      ],
      requiredLabor: [
        "схема электрики",
        ...(areaM2 != null || routeLengthM != null ? ["разметка трасс"] : []),
        ...(routeLengthM != null ? ["штробление / прокладка кабеля"] : []),
        ...(outletCount + switchCount > 0 ? ["монтаж подрозетников"] : []),
        ...(outletCount > 0 ? ["монтаж розеток"] : []),
        ...(switchCount > 0 ? ["монтаж выключателей"] : []),
        ...(lightingPointCount > 0 ? ["монтаж точек освещения"] : []),
        ...(demolitionIncluded ? ["демонтаж существующей проводки"] : []),
        "проверка цепей",
      ],
      requiredEquipmentOrWarnings: [
        "тестер",
        "измеритель сопротивления изоляции",
        ...(resolved.values.wiring_method === "open" ? [] : ["штроборез"]),
      ],
      requiredLogisticsOrWarnings: [
        "доставка кабеля, розеток и щита",
        ...(demolitionIncluded ? ["вывоз мусора"] : []),
      ],
      exclusions: [
        "проект электрики",
        "вводной кабель и согласования",
        "скрытые дефекты существующей сети",
      ],
      clarifyingQuestions: [
        "Сколько точек, групп и фаз?",
        "Нужны ли слаботочные сети?",
        "Есть ли проект и выделенная мощность?",
      ],
    },
    pricingPolicy: pricingPolicy(currency),
  };
}

function roofWaterproofingPlan(text: string, currency: string): EstimatorReasoningPlan {
  return {
    intent: "estimate",
    workKey: "dynamic_waterproofing_estimate",
    titleRu: "Профессиональная предварительная смета: гидроизоляция кровли",
    category: "waterproofing",
    confidence: "medium",
    templateExactMatch: false,
    parsableWorkDetected: true,
    // Preserve the current universal-plan safety classification for a roof
    // prompt: work at height is handled as a regulated professional scope.
    regulatedWorkDetected: true,
    semanticFrame: {
      domain: "waterproofing",
      object: "waterproofing_surface",
      operation: "waterproofing",
      method: "membrane_or_mastic_waterproofing",
      materialSystem: "roof_waterproofing_system",
      regulated: true,
      confidence: 0.86,
    },
    quantities: {
      areaM2: areaFromPrompt(text),
      rawDimensions: [],
    },
    formulas: [],
    boqPlan: {
      complexity: "complex",
      sections: ["materials", "labor", "equipment", "delivery"],
      requiredMaterials: [
        "праймер",
        "гидроизоляционный материал",
        "герметик примыканий",
        "воронки / проходки",
      ],
      requiredLabor: [
        "очистка кровли",
        "ремонт дефектов основания",
        "герметизация примыканий",
        "проверка герметичности",
      ],
      requiredEquipmentOrWarnings: [
        "газовая горелка warning",
        "ручной инструмент",
      ],
      requiredLogisticsOrWarnings: [
        "доставка гидроизоляции",
        "утилизация отходов",
      ],
      exclusions: [
        "Проектирование, разрешения и скрытые работы уточняются отдельно.",
        "Демонтаж, доставка, подъем и вывоз мусора включаются только при подтверждении условий площадки.",
      ],
      clarifyingQuestions: [
        "Какая кровля: плоская или скатная?",
        "Какой материал выбран: рулонная мембрана, мастика или наплавляемая гидроизоляция?",
        "Есть ли проходки, воронки и примыкания, которые нужно включить в объем?",
      ],
    },
    pricingPolicy: pricingPolicy(currency),
  };
}

/**
 * Builds the same estimator-kernel plan after the request router has already
 * resolved one of its two owned domains. This avoids repeating the universal
 * 11,610-work lexicon scan on Hermes; it is not an exact-prompt lookup.
 */
export function buildOwnedDomainEstimatorReasoningPlan(input: {
  text: string;
  owner: DirectConsumerRepairOpenWorldOwner;
  currency?: string;
  canonicalParameters?: ElectricalCanonicalParameterValues;
}): EstimatorReasoningPlan {
  const currency = input.currency ?? "KGS";
  return input.owner === "electrical"
    ? electricalPlan(input.text, currency, input.canonicalParameters)
    : roofWaterproofingPlan(input.text, currency);
}
