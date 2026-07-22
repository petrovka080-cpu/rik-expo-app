import { getEngineeringUnitV4 } from "../engineeringUnitRegistryV4";
import { composeWorkSpecificQuestionsV4, type ComposedQuestionV4 } from "../questionComposerV4";
import type { UserFactV4, WorkSpecificParameterV4 } from "../professionalEstimateV4Contract";
import { ASPHALT_WORK_SPECIFIC_PARAMETER_SCHEMA_V4, getAsphaltParameterV4 } from "./asphaltWorkSpecificParameterSchemaV4";
import { ASPHALT_PROFESSIONAL_NAME_RU_V4, asphaltParameterIdV4 } from "./asphaltV4Constants";
import { extractAsphaltUserFactsV4 } from "./extractAsphaltUserFactsV4";

export type AsphaltUnderstoodLineV4 = {
  label_ru: string;
  value_ru: string;
  provenance_ru: string;
};

export type AsphaltClarificationExperienceV4 = {
  heading_ru: "Я понял";
  understood: AsphaltUnderstoodLineV4[];
  critical_required: ComposedQuestionV4[];
  recommended: ComposedQuestionV4[];
  optional_or_assumption: ComposedQuestionV4[];
  deferred_parameter_ids: string[];
  extracted_fact_parameter_ids: string[];
  internal_labels_exposed: false;
};

function factByKey(facts: readonly UserFactV4[], key: string): UserFactV4 | undefined {
  return facts.find((item) => item.parameter_id === asphaltParameterIdV4(key));
}

function factValue(facts: readonly UserFactV4[], key: string): unknown {
  return factByKey(facts, key)?.value;
}

function booleanFact(facts: readonly UserFactV4[], key: string): boolean | null {
  const value = factValue(facts, key);
  return typeof value === "boolean" ? value : null;
}

function textFact(facts: readonly UserFactV4[], key: string): string | null {
  const value = factValue(facts, key);
  return typeof value === "string" ? value : null;
}

export function asphaltParameterApplicabilityV4(facts: readonly UserFactV4[]): Record<string, boolean> {
  const geometry = textFact(facts, "geometry_method");
  const constructionMode = textFact(facts, "construction_mode");
  const milling = booleanFact(facts, "milling_required");
  const sand = booleanFact(facts, "sand_layer_required");
  const geotextile = booleanFact(facts, "geotextile_required");
  const drainage = textFact(facts, "drainage_type");
  const emulsionBasis = textFact(facts, "emulsion_measurement_basis");
  const laboratory = textFact(facts, "laboratory_control");
  const purpose = textFact(facts, "purpose");
  const mapping: Record<string, boolean> = {};
  const set = (key: string, value: boolean) => { mapping[asphaltParameterIdV4(key)] = value; };
  set("area_m2", geometry !== "length_width" && geometry !== "project_document");
  set("length_m", geometry !== "direct_area" && geometry !== "project_document");
  set("width_m", geometry !== "direct_area" && geometry !== "project_document");
  set("exclusions_m2", geometry === "length_width");
  set("project_document", geometry === "project_document" || geometry == null);
  set("existing_pavement_condition", constructionMode !== "new_construction");
  set("milling_required", constructionMode !== "new_construction");
  set("milling_depth_mm", constructionMode === "repair" && milling === true);
  set("disposal_distance_km", milling === true);
  set("milling_productivity_m3_per_machine_hour", milling === true);
  set("sand_thickness_mm", sand === true);
  set("sand_compaction_factor", sand === true);
  set("sand_waste_percent", sand === true);
  set("geotextile_type", geotextile === true);
  set("geotextile_overlap_percent", geotextile === true);
  set("emulsion_rate_l_m2", emulsionBasis === "litre");
  set("emulsion_rate_kg_m2", emulsionBasis === "kilogram");
  set("drainage_length_m", drainage === "surface" || drainage === "closed" || drainage === "project_spec");
  set("traffic_signs_count", purpose === "public_road" || purpose === "access_road");
  set("guardrail_length_m", purpose === "public_road" || purpose === "access_road");
  set("laboratory_test_interval_m2_per_test", Boolean(laboratory && laboratory !== "none" && laboratory !== "unknown"));
  return mapping;
}

function formatFactValue(parameter: WorkSpecificParameterV4, value: unknown): string | null {
  if (typeof value === "number") {
    const unit = getEngineeringUnitV4(parameter.canonical_unit_id);
    return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 }).format(value)}${unit ? ` ${unit.symbol}` : ""}`;
  }
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  if (typeof value === "string") return parameter.choices.find((item) => item.value === value)?.label_ru ?? value;
  if (Array.isArray(value)) {
    const layers = value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)));
    const thicknesses = layers.map((item) => item.thickness_mm).filter((item): item is number => typeof item === "number");
    return thicknesses.length > 0 ? `${layers.length} сл.; толщины ${thicknesses.join(" и ")} мм` : `${layers.length} сл.`;
  }
  return null;
}

function understoodLines(facts: readonly UserFactV4[]): AsphaltUnderstoodLineV4[] {
  const lines: AsphaltUnderstoodLineV4[] = [{ label_ru: "Работа", value_ru: ASPHALT_PROFESSIONAL_NAME_RU_V4.toLocaleLowerCase("ru-RU"), provenance_ru: "Определено из выбранного вида работы" }];
  for (const key of ["area_m2", "length_m", "width_m", "construction_mode", "asphalt_layers", "region_city"]) {
    const item = factByKey(facts, key);
    const parameter = getAsphaltParameterV4(key);
    if (!item || !parameter) continue;
    const value = formatFactValue(parameter, item.value);
    if (!value) continue;
    lines.push({ label_ru: parameter.professional_name_ru, value_ru: value, provenance_ru: item.provenance === "project_document" ? "Из проекта" : "Из текста пользователя" });
  }
  return lines;
}

export function composeAsphaltClarificationExperienceV4(input: {
  raw_text?: string;
  facts?: readonly UserFactV4[];
  maximum_questions?: number;
}): AsphaltClarificationExperienceV4 {
  const extracted = input.raw_text ? extractAsphaltUserFactsV4(input.raw_text).facts : [];
  const facts = [...extracted, ...(input.facts ?? [])].reduce<UserFactV4[]>((result, item) => {
    const index = result.findIndex((existing) => existing.parameter_id === item.parameter_id);
    if (index >= 0) result[index] = item;
    else result.push(item);
    return result;
  }, []);
  const composition = composeWorkSpecificQuestionsV4({
    schema: ASPHALT_WORK_SPECIFIC_PARAMETER_SCHEMA_V4,
    facts,
    maximum_questions: input.maximum_questions,
    parameter_applicability: asphaltParameterApplicabilityV4(facts),
  });
  return {
    heading_ru: "Я понял",
    understood: understoodLines(facts),
    critical_required: composition.questions.filter((item) => item.required_tier === "critical"),
    recommended: composition.questions.filter((item) => item.required_tier === "recommended"),
    optional_or_assumption: composition.questions.filter((item) => item.required_tier === "optional"),
    deferred_parameter_ids: composition.deferred_parameter_ids,
    extracted_fact_parameter_ids: facts.map((item) => item.parameter_id).filter((item): item is string => Boolean(item)).sort(),
    internal_labels_exposed: false,
  };
}
