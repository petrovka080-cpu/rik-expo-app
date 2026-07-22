import type { UserFactV4 } from "../professionalEstimateV4Contract";
import { asphaltParameterIdV4 } from "./asphaltV4Constants";

export type AsphaltLayerFactV4 = {
  position: number;
  mixture_type: string | null;
  thickness_mm: number | null;
  density_t_m3: number | null;
  waste_percent: number | null;
};

export type AsphaltFactExtractionV4 = {
  facts: UserFactV4[];
  extracted_parameter_keys: string[];
  unbound_fragments: string[];
};

function numberValue(value: string): number | null {
  const parsed = Number(value.replace(/\s+/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function matchNumber(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  return match?.[1] ? numberValue(match[1]) : null;
}

function fact(key: string, value: unknown, unitId: string | null = null): UserFactV4 {
  return {
    fact_id: `asphalt:raw-input:${key}:v4`,
    parameter_id: asphaltParameterIdV4(key),
    value,
    unit_id: unitId,
    provenance: "user_confirmed",
    confirmed: true,
    source_reference: "raw_input",
    confidence: "high",
  };
}

function addFact(target: Map<string, UserFactV4>, key: string, value: unknown, unitId: string | null = null): void {
  if (value === null || value === undefined || value === "") return;
  target.set(key, fact(key, value, unitId));
}

function layerCountFromText(text: string): number | null {
  const numeric = matchNumber(text, /(\d+)\s*(?:сло(?:й|я|ёв|ев)|layers?)/iu);
  if (numeric != null) return numeric;
  const word = text.match(/(один|одна|два|две|три|четыре)\s+сло(?:й|я|ёв|ев)/iu)?.[1]?.toLowerCase();
  return word ? ({ один: 1, одна: 1, два: 2, две: 2, три: 3, четыре: 4 } as Record<string, number>)[word] ?? null : null;
}

function asphaltLayersFromText(text: string, count: number | null): AsphaltLayerFactV4[] {
  if (!count || count < 1 || count > 4) return [];
  const layerMention = text.search(/(?:сло(?:й|я|ёв|ев)|layers?)/iu);
  if (layerMention < 0) return [];
  const tail = text.slice(layerMention);
  const sharedUnitSeries = tail.match(/((?:\d+(?:[,.]\d+)?)(?:\s*(?:и|,|\/|;)\s*\d+(?:[,.]\d+)?)+)\s*(?:мм|mm)/iu)?.[1];
  const thicknesses = (sharedUnitSeries
    ? [...sharedUnitSeries.matchAll(/\d+(?:[,.]\d+)?/g)].map((item) => numberValue(item[0]))
    : [...tail.matchAll(/(\d+(?:[,.]\d+)?)\s*(?:мм|mm)/giu)].map((item) => numberValue(item[1])))
    .filter((value): value is number => value != null)
    .slice(0, count);
  if (thicknesses.length === 0) return [];
  const density = matchNumber(tail, /(\d+(?:[,.]\d+)?)\s*(?:т\s*\/\s*м[³3]|t\s*\/\s*m3)/iu);
  return Array.from({ length: count }, (_, index) => ({
    position: index + 1,
    mixture_type: null,
    thickness_mm: thicknesses[index] ?? null,
    density_t_m3: density,
    waste_percent: null,
  }));
}

function locationFromText(text: string): string | null {
  return text.match(/(Бишкек|Ош|Джалал-Абад|Каракол|Нарын|Талас|Баткен|Токмок)/iu)?.[1] ?? null;
}

export function extractAsphaltUserFactsV4(rawText: string): AsphaltFactExtractionV4 {
  const text = rawText.normalize("NFKC").replace(/\u00a0/g, " ");
  const facts = new Map<string, UserFactV4>();
  const area = matchNumber(text, /(\d[\d\s]*(?:[,.]\d+)?)\s*(?:м[²2]|кв\.?\s*м|m2|sqm)/iu);
  const length = matchNumber(text, /(?:длин(?:а|ой|у)|протяж[её]нност(?:ь|ью)|length)\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*(?:м|m)/iu);
  const width = matchNumber(text, /(?:ширин(?:а|ой|у)|width)\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*(?:м|m)/iu);
  const dimensionPair = text.match(/(\d+(?:[,.]\d+)?)\s*[xх×]\s*(\d+(?:[,.]\d+)?)\s*(?:м|m)/iu);
  const pairLength = dimensionPair?.[1] ? numberValue(dimensionPair[1]) : null;
  const pairWidth = dimensionPair?.[2] ? numberValue(dimensionPair[2]) : null;
  const resolvedLength = length ?? pairLength;
  const resolvedWidth = width ?? pairWidth;
  const projectReferenced = /(?:по\s+проекту|проект(?:ная|ный|ом)?\s+(?:pdf|загружен|приложен|ведомост|спецификац)|загруз(?:ил|ила|ить)\s+проект)/iu.test(text);
  if (area != null) {
    addFact(facts, "geometry_method", "direct_area");
    addFact(facts, "area_m2", area, "m2");
  } else if (resolvedLength != null && resolvedWidth != null) {
    addFact(facts, "geometry_method", "length_width");
    addFact(facts, "length_m", resolvedLength, "m");
    addFact(facts, "width_m", resolvedWidth, "m");
  } else if (projectReferenced) {
    addFact(facts, "geometry_method", "project_document");
  }

  if (/(?:ремонт|реконструкц|восстановлен)/iu.test(text)) addFact(facts, "construction_mode", "repair");
  else if (/нов(?:ое|ого)\s+строительств/iu.test(text)) addFact(facts, "construction_mode", "new_construction");

  if (/без\s+фрезерован/iu.test(text)) addFact(facts, "milling_required", false);
  else if (/фрезерован/iu.test(text)) addFact(facts, "milling_required", true);
  addFact(facts, "milling_depth_mm", matchNumber(text, /(?:глубин[аы]?\s+)?фрезерован\w*\s*(?:на|до|:)?\s*(\d+(?:[,.]\d+)?)\s*(?:мм|mm)/iu), "mm");

  if (/без\s+геотекстил/iu.test(text)) addFact(facts, "geotextile_required", false);
  else if (/геотекстил/iu.test(text)) addFact(facts, "geotextile_required", true);
  if (/без\s+бордюр/iu.test(text)) addFact(facts, "curb_length_m", 0, "m");
  else addFact(facts, "curb_length_m", matchNumber(text, /бордюр\w*\s*(\d+(?:[,.]\d+)?)\s*(?:м|m)/iu), "m");
  if (/без\s+водоотвод/iu.test(text)) addFact(facts, "drainage_type", "none");
  if (/без\s+(?:дорожн(?:ых|ые)\s+)?знак/iu.test(text)) addFact(facts, "traffic_signs_count", 0, "pcs");
  if (/без\s+(?:барьерн(?:ого|ое)\s+)?огражден/iu.test(text)) addFact(facts, "guardrail_length_m", 0, "m");

  addFact(facts, "asphalt_plant_distance_km", matchNumber(text, /(?:АБЗ|асфальтобетонн\w*\s+завод\w*)\D{0,20}(\d+(?:[,.]\d+)?)\s*(?:км|km)/iu), "km");
  addFact(facts, "disposal_distance_km", matchNumber(text, /(?:вывоз|полигон)\D{0,20}(\d+(?:[,.]\d+)?)\s*(?:км|km)/iu), "km");
  addFact(facts, "region_city", locationFromText(text));

  const layerCount = layerCountFromText(text);
  if (layerCount != null) addFact(facts, "asphalt_layer_count", layerCount, "pcs");
  const layers = asphaltLayersFromText(text, layerCount);
  if (layers.length > 0) addFact(facts, "asphalt_layers", layers);

  return {
    facts: [...facts.values()],
    extracted_parameter_keys: [...facts.keys()].sort(),
    unbound_fragments: [],
  };
}
