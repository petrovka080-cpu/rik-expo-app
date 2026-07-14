import {
  CONSTRUCTION_WORK_ONTOLOGY,
} from "../workOntology/constructionWorkOntologyCatalog";
import type { ConstructionWorkOntologyEntry, WorkOntologyCategory } from "../workOntology/constructionWorkOntologyTypes";
import { buildMaterialRecipeRowsForWork } from "./materialRecipeRows";
import { buildProfessionalParameterSchema } from "./workParameterSchema";
import {
  PROFESSIONAL_GROUP_DISTRIBUTION_1500,
  PROFESSIONAL_GROUP_KEYS,
} from "./workGroupTemplateCatalog";
import type {
  ProfessionalEstimateRecipeRow,
  ProfessionalGroupKey,
  ProfessionalRegion,
  ProfessionalWorkSpecificTemplate,
} from "./professionalEstimateTypes";

const TEMPLATE_VERSION = "v1";
const MATERIAL_RECIPE_VERSION = "v1";
const REGIONS: readonly ProfessionalRegion[] = [
  "KG_BISHKEK",
  "KG_OSH",
  "KZ_ALMATY",
  "KZ_ASTANA",
  "RU_DEFAULT",
  "UZ_TASHKENT",
];

function titleCaseWords(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ontologyCategoryToProfessionalGroup(
  category: WorkOntologyCategory,
  workKey: string,
): ProfessionalGroupKey {
  if (category === "concrete_foundation") {
    return /rebar|reinforcement|formwork|armatur|opalub/i.test(workKey)
      ? "reinforcement_formwork"
      : "foundation_concrete";
  }
  if (category === "plaster_paint") return "plaster_putty_paint";
  if (category === "electrical") {
    return /low_voltage|security|video|cctv|alarm|internet|network|domofon|access|wifi/i.test(workKey)
      ? "low_voltage_security"
      : "electrical_power";
  }
  if (category === "plumbing") return "plumbing_sewerage";
  if (category === "ventilation") return "ventilation_ac";
  if (category === "paving_roads_landscape") return "paving_landscape";
  if (category === "carpentry_metal") return "special_repair";
  return category;
}

function pricebookScopesFor(groupKey: ProfessionalGroupKey): Partial<Record<ProfessionalRegion, string>> {
  return Object.fromEntries(
    REGIONS.map((region) => [region, `${region}_${groupKey.toUpperCase()}_PRICEBOOK_V1`]),
  ) as Partial<Record<ProfessionalRegion, string>>;
}

function splitRows(rows: readonly ProfessionalEstimateRecipeRow[]) {
  return {
    material_recipe_rows: rows.filter((row) => row.row_kind === "material" || row.row_kind === "waste"),
    labor_rows: rows.filter((row) => row.row_kind === "labor"),
    equipment_rows: rows.filter((row) => row.row_kind === "equipment"),
    delivery_rows: rows.filter((row) => row.row_kind === "delivery"),
    overhead_rows: rows.filter((row) => row.row_kind === "overhead"),
  };
}

function templateFromWork(input: {
  canonicalWorkKey: string;
  groupKey: ProfessionalGroupKey;
  visibleName: string;
  ontologyEntryKey: string | null;
}): ProfessionalWorkSpecificTemplate {
  const rows = buildMaterialRecipeRowsForWork({
    canonicalWorkKey: input.canonicalWorkKey,
    groupKey: input.groupKey,
    visibleWorkName: input.visibleName,
  });
  const split = splitRows(rows);
  return {
    canonical_work_key: input.canonicalWorkKey,
    group_key: input.groupKey,
    visible_work_name_ru: input.visibleName,
    supported: true,
    parameter_schema: buildProfessionalParameterSchema(input.groupKey),
    ...split,
    required_material_keys: split.material_recipe_rows
      .filter((row) => row.is_required)
      .map((row) => row.material_key)
      .filter((value): value is string => Boolean(value)),
    optional_material_keys: split.material_recipe_rows
      .filter((row) => !row.is_required)
      .map((row) => row.material_key)
      .filter((value): value is string => Boolean(value)),
    catalog_binding_required: true,
    pricebook_scope_required: true,
    region_pricebook_scopes: pricebookScopesFor(input.groupKey),
    template_status: "SUPPORTED",
    version: TEMPLATE_VERSION,
    material_recipe_version: MATERIAL_RECIPE_VERSION,
    ontology_entry_key: input.ontologyEntryKey,
  };
}

function ontologyTemplate(entry: ConstructionWorkOntologyEntry): ProfessionalWorkSpecificTemplate {
  const groupKey = ontologyCategoryToProfessionalGroup(entry.category, entry.canonical_work_key);
  return templateFromWork({
    canonicalWorkKey: entry.canonical_work_key,
    groupKey,
    visibleName: titleCaseWords(entry.canonical_work_key),
    ontologyEntryKey: entry.canonical_work_key,
  });
}

function extensionTemplate(groupKey: ProfessionalGroupKey, index: number): ProfessionalWorkSpecificTemplate {
  const canonicalWorkKey = `professional_${groupKey}_${String(index + 1).padStart(3, "0")}`;
  return templateFromWork({
    canonicalWorkKey,
    groupKey,
    visibleName: `${titleCaseWords(groupKey)} Work ${index + 1}`,
    ontologyEntryKey: null,
  });
}

function buildTemplates(): ProfessionalWorkSpecificTemplate[] {
  const ontologyTemplates = CONSTRUCTION_WORK_ONTOLOGY.map(ontologyTemplate);
  const templatesByGroup = new Map<ProfessionalGroupKey, ProfessionalWorkSpecificTemplate[]>();
  for (const groupKey of PROFESSIONAL_GROUP_KEYS) templatesByGroup.set(groupKey, []);
  for (const template of ontologyTemplates) {
    templatesByGroup.get(template.group_key)?.push(template);
  }
  const result = [...ontologyTemplates];
  for (const groupKey of PROFESSIONAL_GROUP_KEYS) {
    const requiredFor1500Cases = PROFESSIONAL_GROUP_DISTRIBUTION_1500[groupKey];
    const existing = templatesByGroup.get(groupKey)?.length ?? 0;
    for (let index = existing; index < requiredFor1500Cases; index += 1) {
      result.push(extensionTemplate(groupKey, index));
    }
  }
  return result.sort((left, right) => left.canonical_work_key.localeCompare(right.canonical_work_key));
}

export const PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG: readonly ProfessionalWorkSpecificTemplate[] =
  Object.freeze(buildTemplates());

export const PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_BY_KEY: ReadonlyMap<string, ProfessionalWorkSpecificTemplate> =
  new Map(PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG.map((template) => [template.canonical_work_key, template]));

export function getProfessionalWorkSpecificTemplate(
  canonicalWorkKey: string,
): ProfessionalWorkSpecificTemplate | null {
  return PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_BY_KEY.get(canonicalWorkKey) ?? null;
}

export function professionalTemplatesForGroup(
  groupKey: ProfessionalGroupKey,
): ProfessionalWorkSpecificTemplate[] {
  return PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG.filter((template) => template.group_key === groupKey);
}
