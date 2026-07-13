import type { AiEstimateCatalogIndexEntry } from "../catalog/AiEstimateCatalogIndex";
import type { AiEstimateSemanticWorkFamily, AiEstimateWorkClassification } from "./AiEstimateWorkClassifier";

type Rule = {
  family: AiEstimateSemanticWorkFamily;
  pattern: RegExp;
  hints: string[];
};

const RULES: Rule[] = [
  { family: "substation", pattern: /substation|transformer|switchgear|ktp|подстанц|трансформатор/i, hints: ["voltage_kv", "power_kw", "equipment_specification"] },
  { family: "power_line", pattern: /\bлэп\b|lep|power.?line|transmission|overhead.?line|кабельн|воздушн.*лини|опор/i, hints: ["voltage_kv", "line_length_m", "pole_step_m"] },
  { family: "bathroom_repair", pattern: /bathroom|сануз|ванн|душ|плитк/i, hints: ["bathrooms_count", "bathroom_floor_area_m2", "water_points", "sewer_points"] },
  { family: "water_supply", pattern: /water.?supply|водоснаб|водопровод|пнд|pipe|pipeline|труб|насос|резервуар/i, hints: ["line_length_m", "diameter_mm", "trench_depth_m"] },
  { family: "sewerage", pattern: /sewer|канализац|ливнев|дренаж|wastewater/i, hints: ["line_length_m", "diameter_mm", "sewer_points"] },
  { family: "road", pattern: /road|asphalt|pavement|дорог|асфальт|тротуар|бордюр|полотно/i, hints: ["length_m", "width_m", "thickness_m"] },
  { family: "bridge", pattern: /bridge|мост|эстакад/i, hints: ["length_m", "width_m", "loads"] },
  { family: "dam", pattern: /dam|дамб|гидро|насып|gabion|берегоукреп/i, hints: ["length_m", "height_m", "width_m"] },
  { family: "facade", pattern: /facade|фасад|вентфасад|cladding|утепл/i, hints: ["facade_area_m2", "height_m", "insulation_thickness_mm"] },
  { family: "roof", pattern: /roof|кровл|крыша|мансард|skylight|окн.*крыш/i, hints: ["roof_area_m2", "roof_windows_count", "material_specification"] },
  { family: "drilling", pattern: /drill|бурен|скважин|отверст|anchor/i, hints: ["count", "diameter_mm", "depth_mm"] },
  { family: "fence", pattern: /fence|забор|огражд|ворот|profile.?sheet/i, hints: ["length_m", "height_m", "pole_step_m"] },
  { family: "boiler", pattern: /boiler|котельн|теплопункт|thermal.?plant/i, hints: ["power_kw", "equipment_specification", "work_package"] },
  { family: "ventilation", pattern: /ventilat|hvac|вентиляц|воздуховод|conditioning/i, hints: ["capacity", "line_length_m", "equipment_specification"] },
  { family: "electrical", pattern: /electric|электр|розет|освещен|cable|wire/i, hints: ["electrical_points", "power_kw", "cable_section"] },
  { family: "heating", pattern: /heating|отоплен|радиатор|теплосет/i, hints: ["power_kw", "line_length_m", "diameter_mm"] },
  { family: "demolition", pattern: /demolit|демонтаж|разбор|снос|remove/i, hints: ["area_m2", "volume_m3", "waste_volume_m3"] },
  { family: "concrete", pattern: /concrete|бетон|арматур|опалуб|foundation|монолит|стяжк/i, hints: ["volume_m3", "area_m2", "thickness_m"] },
  { family: "glazing", pattern: /glazing|остекл|окн|витраж|glass/i, hints: ["glazing_area_m2", "count", "height_m"] },
  { family: "apartment_repair", pattern: /apartment|квартир|капремонт|ремонт|interior|отделк|стен|потол|пол/i, hints: ["area_m2", "ceiling_height_m", "net_wall_area_m2"] },
];

function textFromInput(input: string | AiEstimateCatalogIndexEntry): string {
  if (typeof input === "string") return input;
  return [
    input.templateId,
    input.workFamily,
    input.localizedNameRu,
    ...input.aliasesRu,
    ...input.parameterPassportKeys,
  ].join(" ");
}

function familyFromCatalogEntry(input: string | AiEstimateCatalogIndexEntry): AiEstimateSemanticWorkFamily | null {
  if (typeof input === "string") return null;
  if (input.workFamily === "apartment_repair") return "apartment_repair";
  if (input.workFamily === "plumbing") return "bathroom_repair";
  if (input.workFamily === "road") return "road";
  if (input.workFamily === "water_supply") return "water_supply";
  if (input.workFamily === "sewerage") return "sewerage";
  if (input.workFamily === "power_line") return "power_line";
  if (input.workFamily === "substation") return "substation";
  if (input.workFamily === "facade") return "facade";
  if (input.workFamily === "roof") return "roof";
  if (input.workFamily === "drilling") return "drilling";
  if (input.workFamily === "fence") return "fence";
  if (input.workFamily === "dam") return "dam";
  if (input.workFamily === "ventilation" || input.workFamily === "mep") return "ventilation";
  if (input.workFamily === "electrical") return "electrical";
  if (input.workFamily === "heating") return "heating";
  if (input.workFamily === "demolition") return "demolition";
  if (input.workFamily === "concrete" || input.workFamily === "earthworks") return "concrete";
  if (input.workFamily === "glazing") return "glazing";
  if (input.workFamily === "industrial_equipment") return "boiler";
  return "concrete";
}

function tokenHints(text: string): string[] {
  const hints: string[] = [];
  if (/\b\d+(?:[.,]\d+)?\s*(?:кв|kv|квт|kw)\b/i.test(text) && /\bлэп\b|line|подстанц|power/i.test(text)) {
    hints.push("voltage_kv");
  }
  if (/пнд\s*110|dn\s*110|диаметр|diameter/i.test(text)) hints.push("diameter_mm");
  if (/опор.{0,20}(?:через|шаг)\s*\d+|pole.?step/i.test(text)) hints.push("pole_step_m");
  if (/6\s*(?:окон|window)/i.test(text) && /мансард|roof|крыша/i.test(text)) hints.push("roof_windows_count");
  if (/высот[аы]\s*потол|ceiling height/i.test(text)) hints.push("ceiling_height_m");
  if (/\d+\s*(?:кв\.?\s*м|м2|m2|square meters)/i.test(text) && !/\bлэп\b|power.?line/i.test(text)) hints.push("area_m2");
  if (
    /\b\d+(?:[.,]\d+)?\s*(?:РєР’|кВ|кв|kv|кВт|kw)\b/i.test(text)
    && /\b(?:Р›Р­Рџ|Р»СЌРї|ЛЭП|лэп)\b|line|подстанц|power/i.test(text)
    && !hints.includes("voltage_kv")
  ) {
    hints.push("voltage_kv");
  }
  if (
    /\d+(?:[.,]\d+)?\s*(?:РєР’|кВ|кв|kv|кВт|kw)/i.test(text)
    && /(?:Р›Р­Рџ|Р»СЌРї|ЛЭП|лэп|подстанц|power.?line|line)/i.test(text)
    && !hints.includes("voltage_kv")
  ) {
    hints.push("voltage_kv");
  }
  if (/(?:ПНД|пнд|РџРќР”|РїРЅРґ)\s*110|dn\s*110|диаметр|diameter/i.test(text) && !hints.includes("diameter_mm")) {
    hints.push("diameter_mm");
  }
  if (/(?:опор|РѕРїРѕСЂ).{0,20}(?:через|шаг|С‡РµСЂРµР·|С€Р°Рі)\s*\d+|pole.?step/i.test(text) && !hints.includes("pole_step_m")) {
    hints.push("pole_step_m");
  }
  if (/6\s*(?:окон|РѕРєРѕРЅ|window)/i.test(text) && /мансард|крыша|РјР°РЅСЃР°СЂРґ|РєСЂС‹С€Р°|roof/i.test(text) && !hints.includes("roof_windows_count")) {
    hints.push("roof_windows_count");
  }
  if (/(?:высот[аы]|РІС‹СЃРѕС‚[Р°С‹])\s*(?:потол|РїРѕС‚РѕР»)|ceiling height/i.test(text) && !hints.includes("ceiling_height_m")) {
    hints.push("ceiling_height_m");
  }
  if (/\d+\s*(?:кв\.?\s*(?:м|метр)|м2|m2|square meters)/i.test(text) && !/\b(?:ЛЭП|лэп|Р›Р­Рџ|Р»СЌРї)\b|power.?line/i.test(text) && !hints.includes("area_m2")) {
    hints.push("area_m2");
  }
  return hints;
}

function familyFromTextAliases(text: string): AiEstimateSemanticWorkFamily | null {
  if (/(?:Р›Р­Рџ|Р»СЌРї|ЛЭП|лэп|power.?line|overhead.?line|transmission)/i.test(text)) return "power_line";
  if (/(?:подстанц|РїРѕРґСЃС‚Р°РЅС†|transformer|substation|switchgear|ktp)/i.test(text)) return "substation";
  if (/(?:водоснаб|водопровод|пнд|РІРѕРґРѕСЃРЅР°Р±|РїРЅРґ|water.?supply|pipe|pipeline)/i.test(text)) return "water_supply";
  if (/(?:канализац|ливнев|дренаж|РєР°РЅР°Р»РёР·Р°С†|sewer|wastewater)/i.test(text)) return "sewerage";
  if (/(?:дорог|асфальт|тротуар|road|asphalt|pavement)/i.test(text)) return "road";
  if (/(?:сануз|ванн|душ|плитк|bathroom)/i.test(text)) return "bathroom_repair";
  if (/(?:фасад|вентфасад|утепл|facade|cladding)/i.test(text)) return "facade";
  if (/(?:кровл|крыша|мансард|roof|skylight)/i.test(text)) return "roof";
  if (/(?:бурен|скважин|отверст|drill|anchor)/i.test(text)) return "drilling";
  if (/(?:забор|огражд|fence|profile.?sheet)/i.test(text)) return "fence";
  if (/(?:дамб|гидро|берегоукреп|dam|gabion)/i.test(text)) return "dam";
  if (/(?:мост|bridge|эстакад)/i.test(text)) return "bridge";
  if (/(?:котельн|boiler|thermal.?plant)/i.test(text)) return "boiler";
  if (/(?:вентиляц|воздуховод|ventilat|hvac|conditioning)/i.test(text)) return "ventilation";
  if (/(?:электр|розет|освещен|кабель|electric|cable|wire)/i.test(text)) return "electrical";
  if (/(?:отоплен|радиатор|теплосет|heating)/i.test(text)) return "heating";
  if (/(?:демонтаж|разбор|снос|demolit|remove)/i.test(text)) return "demolition";
  if (/(?:бетон|арматур|фундамент|concrete|foundation)/i.test(text)) return "concrete";
  if (/(?:остекл|витраж|glazing|glass)/i.test(text)) return "glazing";
  if (/(?:квартира|капремонт|ремонт|отделк|interior|apartment)/i.test(text)) return "apartment_repair";
  return null;
}

export function classifyAiEstimateWork(input: string | AiEstimateCatalogIndexEntry): AiEstimateWorkClassification {
  const text = textFromInput(input);
  const matched = RULES.filter((rule) => rule.pattern.test(text));
  const primary = matched[0];
  const catalogFamily = familyFromCatalogEntry(input);
  const textFamily = familyFromTextAliases(text);
  const family = primary?.family ?? catalogFamily ?? textFamily ?? "other";
  const hints = [...new Set([...(primary?.hints ?? []), ...matched.flatMap((rule) => rule.hints), ...tokenHints(text)])];
  return {
    family,
    confidence: primary ? Math.min(0.99, 0.72 + matched.length * 0.07) : catalogFamily ? 0.68 : textFamily ? 0.66 : 0.35,
    matchedRules: matched.map((rule) => rule.family),
    parameterHints: hints,
  };
}
