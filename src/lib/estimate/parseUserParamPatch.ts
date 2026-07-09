import { extractWorkParamsFromInlinePrompt } from "../ai/extractWorkParamsFromInlinePrompt";
import type { EstimateDraftRevision } from "./estimateDraftRevisionContract";
import { aiEstimateRuPromptPhraseForParameter } from "./aiEstimateRuParameterDictionary";
import type { UserParamPatch, UserParamPatchOperation } from "./validateUserParamPatch";

export type ParseUserParamPatchInput = {
  revision: EstimateDraftRevision;
  operation: UserParamPatchOperation;
  paramKey: string;
  rawValue: string;
};

function parseNumberLike(value: string): number | null {
  const normalized = value.replace(",", ".").replace(/[^\d.-]/g, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function phraseForParam(key: string, rawValue: string): string {
  if (key === "q") return `объем работ ${rawValue}`;
  if (key === "area_m2") return `площадь ${rawValue}`;
  if (key === "length_m") return `длина ${rawValue}`;
  if (key === "line_length_m") return `длина линии ${rawValue}`;
  if (key === "width_m") return `ширина ${rawValue}`;
  if (key === "height_m") return `высота ${rawValue}`;
  if (key === "ceiling_height_m") return `высота потолка ${rawValue}`;
  if (key === "thickness_m") return `толщина ${rawValue}`;
  if (key === "depth_mm") return `глубина ${rawValue}`;
  if (key === "trench_width_m") return `ширина траншеи ${rawValue}`;
  if (key === "trench_depth_m") return `глубина траншеи ${rawValue}`;
  if (key === "insulation_thickness_mm" || key === "insulation_mm") return `толщина утеплителя ${rawValue}`;
  if (key === "diameter_mm") return `диаметр ${rawValue}`;
  if (key === "volume_m3") return `объем ${rawValue}`;
  if (key === "count") return `количество ${rawValue}`;
  if (key === "bathrooms_count") return `${rawValue} санузла`;
  if (key === "doors_count") return `${rawValue} двери`;
  if (key === "electrical_points") return `${rawValue} электроточек`;
  if (key === "water_points") return `${rawValue} водоточек`;
  if (key === "sewer_points") return `${rawValue} точек канализации`;
  if (key === "roof_windows_count") return `${rawValue} мансардных окон`;
  if (key === "voltage_kv") return `${rawValue} кВ`;
  if (key === "power_mw") return `${rawValue} МВт`;
  if (key === "power_kw") return `${rawValue} кВт`;
  if (key === "cable_section") return rawValue;
  return `${aiEstimateRuPromptPhraseForParameter(key)} ${rawValue}`;
}

export function parseUserParamPatch(input: ParseUserParamPatchInput): UserParamPatch {
  const rawValue = input.rawValue.trim();
  if (input.operation === "remove_param") {
    return {
      revisionId: input.revision.revisionId,
      selectedTemplateId: input.revision.selectedTemplateId,
      operation: input.operation,
      paramKey: input.paramKey,
      rawValue,
      parsedValue: "",
    };
  }

  const extracted = extractWorkParamsFromInlinePrompt(phraseForParam(input.paramKey, rawValue));
  const exact = extracted[input.paramKey];
  const fallback = Object.values(extracted)[0];
  const parsedNumber = parseNumberLike(rawValue);
  const parsedValue = exact?.value ?? fallback?.value ?? (parsedNumber ?? rawValue);
  return {
    revisionId: input.revision.revisionId,
    selectedTemplateId: input.revision.selectedTemplateId,
    operation: input.operation,
    paramKey: input.paramKey,
    rawValue,
    parsedValue,
    inputUnit: exact?.unit ?? fallback?.unit,
    canonicalUnit: exact?.canonicalUnit ?? fallback?.canonicalUnit ?? input.revision.params[input.paramKey]?.canonicalUnit,
  };
}
