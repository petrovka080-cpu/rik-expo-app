import {
  classifyConstructionRisk,
  getConstructionDomainDefinition,
  getConstructionMaterialSystem,
  type WorldConstructionEstimateEngineInput,
  type WorldConstructionInterpretation,
  type WorldConstructionOutcome,
} from "../worldConstructionOntology";
import { detectConstructionIntent } from "./detectConstructionIntent";
import { disambiguateConstructionWork } from "./disambiguateConstructionWork";
import { normalizeConstructionPrompt } from "./normalizeConstructionPrompt";
import { resolveConstructionDomain } from "./resolveConstructionDomain";
import { resolveConstructionMethod } from "./resolveConstructionMethod";
import { resolveConstructionObject } from "./resolveConstructionObject";
import { resolveConstructionOperation } from "./resolveConstructionOperation";
import { resolveConstructionUnitVolume } from "./resolveConstructionUnitVolume";

function workKeyFor(input: {
  domain: string;
  objectScope: string;
  text: string;
}): string | null {
  const text = normalizeConstructionPrompt(input.text);
  if (input.domain === "hydropower") return "micro_hydro_preparation";
  if (input.domain === "roadworks") return "asphalt_paving";
  if (input.domain === "masonry") return "brick_masonry";
  if (input.domain === "drywall" && /стен|wall/.test(text)) return "drywall_wall_cladding";
  if (input.domain === "drywall") return "drywall_partition";
  if (input.domain === "windows") return "window_installation";
  if (input.domain === "flooring" && /ламинат|laminate/.test(text)) return "laminate_laying";
  if (input.domain === "flooring" && /ковролин|carpet/.test(text)) return "carpet_laying";
  if (input.domain === "roofing" && /гидроизоля|waterproof/.test(text)) return "roof_waterproofing";
  if (input.domain === "waterproofing" && input.objectScope === "roof") return "roof_waterproofing";
  if (input.domain === "waterproofing" && input.objectScope === "bathroom") return "waterproofing_bathroom";
  if (input.domain === "waterproofing" && input.objectScope === "foundation") return "foundation_waterproofing";
  if (input.domain === "roofing" && /двускат|gable/.test(text)) return "gable_roof_installation";
  if (input.domain === "solar") return "solar_panel_installation";
  if (input.domain === "ventilation") return "ventilation_installation";
  if (input.domain === "well_drilling") return "well_drilling_professional";
  if (input.domain === "electrical") return "electrical_basic";
  if (input.domain === "insulation") return "facade_insulation";
  if (input.domain === "steel_structures" && /farm storage|storage building|warehouse|steel frame|metal farm|metalworks/.test(text)) return "warehouse_steel_frame";
  if (
    (input.domain === "commercial_fit_out" || input.domain === "renovation") &&
    /electrical|wiring|clinic|school|medical|retail|office|fitout|renovation/.test(text)
  ) return "electrical_basic";
  if (input.domain === "renovation" && /maintenance|repair|emergency|home repairs|small home|home construction work/.test(text)) return "maintenance_repair_professional";
  return null;
}

function titleFor(workKey: string | null, domain: string, objectScope: string): string {
  const titles: Record<string, string> = {
    micro_hydro_preparation: "Профессиональная смета на установку турбины ГЭС",
    asphalt_paving: "Профессиональная смета на асфальтирование",
    brick_masonry: "Профессиональная смета на кирпичную кладку",
    drywall_wall_cladding: "Профессиональная смета на монтаж ГКЛ на стены",
    drywall_partition: "Профессиональная смета на монтаж ГКЛ",
    window_installation: "Профессиональная смета на установку окон",
    laminate_laying: "Профессиональная смета на укладку ламината",
    carpet_laying: "Профессиональная смета на укладку ковролина",
    roof_waterproofing: "Профессиональная смета на гидроизоляцию крыши",
    waterproofing_bathroom: "Профессиональная смета на гидроизоляцию ванной",
    foundation_waterproofing: "Профессиональная смета на гидроизоляцию фундамента",
    gable_roof_installation: "Профессиональная смета на устройство двускатной крыши",
    solar_panel_installation: "Профессиональная смета на монтаж солнечных панелей",
    ventilation_installation: "Профессиональная смета на вентиляцию",
    well_drilling_professional: "Профессиональная смета на бурение скважины",
    electrical_basic: "Профессиональная смета на электромонтаж",
  };
  return workKey ? titles[workKey] ?? `Профессиональная смета: ${workKey}` : `Нужна ручная сметная проверка: ${domain}/${objectScope}`;
}

function materialSystemKeyFor(workKey: string | null, domain: string, objectScope: string): string {
  if (workKey === "micro_hydro_preparation") return "hydro_turbine_system";
  if (workKey === "roof_waterproofing") return "roof_waterproofing";
  if (workKey === "waterproofing_bathroom") return "wet_area_waterproofing";
  if (workKey === "foundation_waterproofing") return "foundation_waterproofing";
  if (workKey === "laminate_laying" || workKey === "carpet_laying") return "laminate_flooring";
  if (workKey === "brick_masonry") return "brick_masonry";
  if (workKey?.startsWith("drywall")) return "drywall_system";
  if (workKey === "asphalt_paving") return "road_base";
  if (workKey === "window_installation") return "window_installation";
  if (workKey === "ventilation_installation") return "ventilation_system";
  if (workKey === "solar_panel_installation") return "solar_pv_system";
  if (workKey === "well_drilling_professional") return "well_drilling_system";
  if (domain === "waterproofing" && objectScope === "roof") return "roof_waterproofing";
  return "general_building";
}

export function classifyConstructionWorkOutcome(
  input: WorldConstructionEstimateEngineInput,
): WorldConstructionInterpretation {
  const normalizedText = normalizeConstructionPrompt(input.text);
  const intent = detectConstructionIntent(input.text);
  const domain = resolveConstructionDomain(input.text);
  const object = resolveConstructionObject({ text: input.text, domain: domain.domain });
  const operation = resolveConstructionOperation({ text: input.text, domain: domain.domain });
  const disambiguation = disambiguateConstructionWork({
    text: input.text,
    domain: domain.domain,
    objectScope: object.objectScope,
    operation,
  });
  const method = resolveConstructionMethod({
    text: input.text,
    domain: domain.domain,
    objectScope: object.objectScope,
    operation,
  });
  const unitVolume = resolveConstructionUnitVolume({
    text: input.text,
    objectScope: object.objectScope,
    operation,
  });
  const workKey = workKeyFor({ domain: domain.domain, objectScope: object.objectScope, text: input.text });
  const domainDefinition = getConstructionDomainDefinition(domain.domain);
  const risk = classifyConstructionRisk({ domain: domain.domain, objectScope: object.objectScope, text: input.text });
  const materialSystem = getConstructionMaterialSystem(materialSystemKeyFor(workKey, domain.domain, object.objectScope));
  const unknown = !intent.isConstruction || domain.domain === "unknown";
  const outcome: WorldConstructionOutcome =
    disambiguation.ambiguous || object.ambiguous ? "AMBIGUOUS_NEEDS_DISAMBIGUATION" :
      unknown ? "TEMPLATE_GAP_SAFE_TRIAGE" :
        risk.riskClass === "regulated" ? "DANGEROUS_REGULATED_SAFE_ESTIMATE" :
          "EXPANDED_LOCAL_PROFESSIONAL_ESTIMATE";

  const classification =
    outcome === "EXPANDED_LOCAL_PROFESSIONAL_ESTIMATE" ? "EXPANDED_LOCAL_PROFESSIONAL_ESTIMATE_OK" :
      outcome === "AMBIGUOUS_NEEDS_DISAMBIGUATION" ? "AMBIGUOUS_NEEDS_DISAMBIGUATION" :
        outcome === "DANGEROUS_REGULATED_SAFE_ESTIMATE" ? "DANGEROUS_REGULATED_SAFE_ESTIMATE" :
          "UNKNOWN_TEMPLATE_GAP_SAFE_TRIAGE";

  return {
    primitive: {
      originalText: input.text,
      normalizedText,
      intentDetected: intent.isEstimate,
      outcome,
      domain: domain.domain,
      secondaryDomains: domain.secondaryDomains,
      objectScope: object.objectScope,
      operation,
      method,
      materialSystem,
      unit: unitVolume.unit,
      volume: input.volume ?? unitVolume.volume,
      workKey,
      workFamily: domain.domain,
      titleRu: titleFor(workKey, domain.domain, object.objectScope),
      complexity: risk.complexity,
      riskClass: risk.riskClass,
      confidence: intent.confidence,
      assumptions: [
        "Смета предварительная и основана на описании пользователя.",
        "Цены требуют локального подтверждения по городу, поставщику и дате закупки.",
        ...domainDefinition.exclusions.slice(0, 2),
      ],
      exclusions: domainDefinition.exclusions,
      costIncreaseFactors: [
        "Сложный доступ, высота, подъем материалов или ограниченная площадка.",
        "Скрытые дефекты основания и необходимость усиления.",
        "Срочность работ, ночные смены или сезонность.",
      ],
      clarifyingQuestions: domainDefinition.clarifyingQuestions,
      disambiguationOptions: disambiguation.options.length > 0 ? disambiguation.options : object.options,
      localWarnings: [
        "Регион не указан или подтвержден не полностью. Уточните город/страну для локальной сметы.",
      ],
    },
    classification,
    shouldCallGlobalEstimate:
      outcome === "EXPANDED_LOCAL_PROFESSIONAL_ESTIMATE" || outcome === "DANGEROUS_REGULATED_SAFE_ESTIMATE",
    shouldAskClarifyingQuestion: outcome === "AMBIGUOUS_NEEDS_DISAMBIGUATION",
    shouldReturnTemplateGap: outcome === "TEMPLATE_GAP_SAFE_TRIAGE",
  };
}
