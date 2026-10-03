import { ROAD_CROSSING_SLEEVES_CIVIL_METHODS_R1 as methods } from "./roadCrossingSleevesCivilGeometryR1";
export const ROAD_CROSSING_SLEEVES_SELECTED_JACKING_CATALOG_ID_R1 = "canonical-work:expanded:road_crossing_sleeves";
export const ROAD_CROSSING_SLEEVES_PRIMARY_MEASURE_PARAMETER_ID_R1 = "rcs_crossing_length_m";
/** Only measured facts explicitly named in the selected crossing prompt.
 * No planned section length, SDR/inside diameter, stock, rates or approval is
 * inferred. DN without an explicitly measured mm diameter is not an OD fact. */
export function parseRoadCrossingSleevesSelectedJackingPromptR1(prompt: string): Readonly<Record<string, string>> {
  const text = prompt.normalize("NFKC");
  const result: Record<string, string> = {};
  const assign = (parameterId: string, expression: RegExp) => {
    const match = expression.exec(text);
    if (match && parameterId.startsWith("rcs_casing_")) {
      const scope = [...text.slice(0, match.index).matchAll(/футляр\p{L}*|рабоч\p{L}*\s+труб\p{L}*/giu)].at(-1)?.[0];
      if (!/футляр/iu.test(match[0]) && !/футляр/iu.test(scope ?? "")) return;
    }
    const value = match?.[1];
    if (value != null) result[parameterId] = value.replace(",", ".");
  };
  const negatedOpenCut = /(?:^|[^\p{L}])(?:без|не|нет)\s+(?:\p{L}+\s+){0,3}открыт\p{L}*\s+(?:способ\p{L}*|метод\p{L}*|транше\p{L}*)/iu.test(text);
  const explicitOpenCut = !negatedOpenCut && /открыт\p{L}*\s+(?:способ\p{L}*|метод\p{L}*|транше\p{L}*)/iu.test(text);
  const negatedJacking = /(?:^|[^\p{L}])(?:без|не|нет)\s+(?:\p{L}+\s+){0,3}продавлив\p{L}*/iu.test(text);
  if (explicitOpenCut) result.rcs_civil_installation_method = methods.openCut;
  else if (!negatedJacking && /продавлив\p{L}*/iu.test(text)) result.rcs_civil_installation_method = methods.pipeJacking;
  assign("rcs_crossing_length_m", /(?:длин\p{L}*\s+футляр\p{L}*|футляр\p{L}*\s+длин\p{L}*)\s*[:=]?\s*(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}²³])/iu);
  assign("rcs_casing_outside_diameter_mm", /наружн\p{L}*\s+диаметр\p{L}*\s*(?:футляр\p{L}*\s*)?[:=]?\s*(\d+(?:[,.]\d+)?)\s*мм(?![\p{L}\p{N}])/iu);
  assign("rcs_casing_inside_diameter_mm", /внутренн\p{L}*\s+(?:диаметр\p{L}*\s*)?(?:футляр\p{L}*\s*)?[:=]?\s*(\d+(?:[,.]\d+)?)\s*мм(?![\p{L}\p{N}])/iu);
  assign("rcs_carrier_outside_diameter_mm", /рабоч\p{L}*\s+труб\p{L}*\s*(?:(?:наружн\p{L}*\s+)?диаметр\p{L}*\s*)?[:=]?\s*(\d+(?:[,.]\d+)?)\s*мм(?![\p{L}\p{N}])/iu);
  return result;
}
