import {
  FORMWORK_DOKAFLEX_FLOOR_SLAB_COMPONENT_TARGETS,
  FORMWORK_DOKAFLEX_PARAMETERS,
  FORMWORK_DOKAFLEX_SOURCE_ID,
  FORMWORK_DOKAFLEX_SYSTEM_PROFILE_ID,
} from "../v4/formworkDokaflexConcreteSlabR1";
import {
  RICS_NRM2_FORMWORK_REQUIRED_EXPLICIT_PARAMETER_IDS,
} from "../v4/domainFactory/formworkRicsNrm2PhysicalNormV1";
import { extractRicsNrm2FormworkCanonicalParametersV1 } from "./formworkRicsNrm2ProductionBindingV1";

type Primitive = string | number | boolean;

const COMPONENT_CATALOG_IDS: ReadonlySet<string> = new Set(
  FORMWORK_DOKAFLEX_FLOOR_SLAB_COMPONENT_TARGETS.map((target) => target.catalogId),
);
const RICS_PARAMETER_IDS = new Set<string>([
  "product_profile_id",
  ...RICS_NRM2_FORMWORK_REQUIRED_EXPLICIT_PARAMETER_IDS,
]);
const EXTRA_PARAMETERS = FORMWORK_DOKAFLEX_PARAMETERS.filter(
  (parameter) => !RICS_PARAMETER_IDS.has(parameter.parameter_id),
);

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("ru-RU").replaceAll("ё", "е");
}

function labeledValues(text: string): ReadonlyMap<string, string> {
  const values = new Map<string, string>();
  for (const segment of text.split(/\n+/u)) {
    const separator = segment.indexOf(":");
    if (separator <= 0) continue;
    const label = normalize(segment.slice(0, separator));
    const value = segment.slice(separator + 1).trim();
    if (label && value) values.set(label, value);
  }
  return values;
}

function leadingNumber(value: string): number | null {
  const raw = value.match(/^\s*(\d[\d\s]*(?:[.,]\d+)?)/u)?.[1];
  if (!raw) return null;
  const parsed = Number(raw.replace(/\s+/gu, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function isFormworkDokaflexFloorSlabComponentCatalogR1(catalogId: string): boolean {
  return COMPONENT_CATALOG_IDS.has(catalogId);
}

export function extractFormworkDokaflexCanonicalParametersR1(input: {
  catalogId: string;
  text: string;
}): Readonly<Record<string, Primitive>> | null {
  if (!isFormworkDokaflexFloorSlabComponentCatalogR1(input.catalogId)
    || !/Doka\s*Dokaflex/iu.test(input.text)) return null;
  const measured = extractRicsNrm2FormworkCanonicalParametersV1(input.text);
  if (!measured) return null;
  const fields = labeledValues(input.text);
  const result: Record<string, Primitive> = {
    ...measured,
    formwork_system_profile_id: FORMWORK_DOKAFLEX_SYSTEM_PROFILE_ID,
    manufacturer_document_reference: FORMWORK_DOKAFLEX_SOURCE_ID,
  };
  for (const parameter of EXTRA_PARAMETERS) {
    if (parameter.parameter_id === "formwork_system_profile_id"
      || parameter.parameter_id === "manufacturer_document_reference") continue;
    const raw = fields.get(normalize(parameter.title_ru));
    if (!raw) continue;
    if (parameter.value_type === "integer" || parameter.value_type === "decimal") {
      const parsed = leadingNumber(raw);
      if (parsed !== null) result[parameter.parameter_id] = parsed;
      continue;
    }
    if (parameter.value_type === "enum") {
      const allowed = Array.isArray(parameter.constraints_json?.values)
        ? parameter.constraints_json.values.map(String)
        : [];
      const selected = allowed.find((value) => normalize(value) === normalize(raw));
      if (selected) result[parameter.parameter_id] = selected;
      continue;
    }
    result[parameter.parameter_id] = raw;
  }
  return Object.freeze(result);
}

function requiredPromptValue(
  input: Readonly<Record<string, Primitive>>,
  parameterId: string,
): Primitive {
  const value = input[parameterId];
  if (value == null || value === "") {
    throw new Error(`FORMWORK_DOKAFLEX_PROMPT_VALUE_MISSING:${parameterId}`);
  }
  return value;
}

export function formworkDokaflexPromptDetailsR1(
  input: Readonly<Record<string, Primitive>>,
): readonly string[] {
  const lines = [
    "Опалубка Doka Dokaflex по RICS NRM 2",
    `измеренная площадь контакта: ${requiredPromptValue(input, "measured_formwork_contact_area_m2")} м²`,
    `ссылка на чертёж: ${requiredPromptValue(input, "project_drawing_reference")}`,
    `тип элемента: ${requiredPromptValue(input, "element_type")}`,
    `размеры и количество граней: ${requiredPromptValue(input, "element_dimensions_and_face_count")}`,
    `отделка: ${requiredPromptValue(input, "plain_or_special_finish")}`,
    `класс геометрии: ${requiredPromptValue(input, "vertical_battered_horizontal_or_curved_class")}`,
    `стороны опалубки: ${requiredPromptValue(input, "single_or_double_sided_scope")}`,
    `правило проёмов и пустот: ${requiredPromptValue(input, "openings_voids_and_deduction_rule")}`,
    `тип опалубки: ${requiredPromptValue(input, "permanent_or_removable_formwork")}`,
    `правило измерения проекта: ${requiredPromptValue(input, "project_measurement_rule_reference")}`,
    `согласование сметчика: ${requiredPromptValue(input, "estimator_approval_reference")}`,
  ];
  for (const parameter of EXTRA_PARAMETERS) {
    lines.push(`${parameter.title_ru}: ${requiredPromptValue(input, parameter.parameter_id)}`);
  }
  return Object.freeze(lines);
}
