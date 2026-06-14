import {
  buildProfessionalParameterSchema,
  defaultUnitForProfessionalGroup,
} from "./workParameterSchema";
import type {
  ProfessionalGroupKey,
  ProfessionalWorkGroupTemplate,
} from "./professionalEstimateTypes";

export const PROFESSIONAL_GROUP_DISTRIBUTION_1500: Readonly<Record<ProfessionalGroupKey, number>> = Object.freeze({
  demolition: 60,
  earthworks: 80,
  foundation_concrete: 110,
  reinforcement_formwork: 70,
  masonry: 80,
  waterproofing: 70,
  roofing: 80,
  insulation: 60,
  facade: 70,
  plaster_putty_paint: 100,
  drywall_ceiling: 70,
  tile_stone: 80,
  flooring: 90,
  doors_windows: 60,
  electrical_power: 100,
  low_voltage_security: 50,
  plumbing_sewerage: 90,
  heating_hvac: 70,
  ventilation_ac: 40,
  paving_landscape: 50,
  special_repair: 20,
});

export const PROFESSIONAL_GROUP_KEYS = Object.keys(
  PROFESSIONAL_GROUP_DISTRIBUTION_1500,
) as ProfessionalGroupKey[];

const REQUIRED_SNAPSHOT_FIELDS = Object.freeze([
  "snapshot_id",
  "selected_work_key",
  "template_version",
  "material_recipe_version",
  "pricebook_snapshot_id",
  "ui_payload_hash",
  "pdf_payload_hash",
  "request_payload_hash",
  "history_payload_hash",
  "all_hashes_match",
]);

const FORBIDDEN_GENERIC_ROWS = Object.freeze([
  "materials",
  "other",
  "misc",
  "general construction works",
  "quality control",
  "technical supervision",
]);

function visibleGroupName(groupKey: ProfessionalGroupKey): string {
  return groupKey
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function groupTemplate(groupKey: ProfessionalGroupKey): ProfessionalWorkGroupTemplate {
  const defaultUnit = defaultUnitForProfessionalGroup(groupKey);
  return {
    group_key: groupKey,
    category: groupKey,
    visible_name_ru: visibleGroupName(groupKey),
    allowed_row_domains: [groupKey],
    forbidden_row_domains: PROFESSIONAL_GROUP_KEYS.filter((candidate) => candidate !== groupKey),
    default_units: [defaultUnit],
    common_parameter_schema: buildProfessionalParameterSchema(groupKey),
    common_row_kinds: ["material", "labor", "equipment", "delivery", "overhead", "waste"],
    forbidden_generic_rows: [...FORBIDDEN_GENERIC_ROWS],
    required_snapshot_fields: [...REQUIRED_SNAPSHOT_FIELDS],
    required_work_specific_template: true,
  };
}

export const PROFESSIONAL_WORK_GROUP_TEMPLATE_CATALOG: readonly ProfessionalWorkGroupTemplate[] =
  Object.freeze(PROFESSIONAL_GROUP_KEYS.map(groupTemplate));

export const PROFESSIONAL_WORK_GROUP_TEMPLATE_BY_KEY: ReadonlyMap<
  ProfessionalGroupKey,
  ProfessionalWorkGroupTemplate
> = new Map(PROFESSIONAL_WORK_GROUP_TEMPLATE_CATALOG.map((template) => [template.group_key, template]));

export function getProfessionalWorkGroupTemplate(
  groupKey: ProfessionalGroupKey,
): ProfessionalWorkGroupTemplate {
  const template = PROFESSIONAL_WORK_GROUP_TEMPLATE_BY_KEY.get(groupKey);
  if (!template) throw new Error(`UNKNOWN_PROFESSIONAL_GROUP_TEMPLATE:${groupKey}`);
  return template;
}
