import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { buildEstimate10000ReadinessManifest } from "./buildEstimate10000ReadinessManifest";
import {
  classifyEstimateTemplateProfessionalReadiness,
  type Estimate10000ProfessionalTemplateReadiness,
} from "./classifyEstimateTemplateProfessionalReadiness";

export const ESTIMATE_10000_PROFESSIONAL_INVENTORY_PATH =
  "data/estimate-catalog/estimate-10000-professional-inventory.json" as const;
export const ESTIMATE_10000_WORK_FAMILY_MAP_PATH =
  "data/estimate-catalog/estimate-10000-work-family-map.json" as const;
export const ESTIMATE_10000_BLOCKERS_PATH =
  "data/estimate-catalog/estimate-10000-blockers.json" as const;

type WorkFamilyMapEntry = {
  work_family_id: string;
  template_count: number;
  ready_professional_count: number;
  not_ready_count: number;
  generic_fallback_count: number;
  source_backed_row_count: number;
  row_count: number;
};

export type Estimate10000ProfessionalInventory = {
  schema: "estimate-10000-professional-inventory-v1";
  generated_at: string;
  manifest_total_templates: number;
  ready_professional_count: number;
  quantity_only_price_missing_count: number;
  not_ready_count: number;
  generic_fallback_count: number;
  synthetic_family_default_count: number;
  templates_only_generic_norms_count: number;
  templates_with_real_norm_sources_count: number;
  every_template_has_work_family: boolean;
  every_template_has_calculator: boolean;
  every_template_has_parameter_schema: boolean;
  every_template_has_formula: boolean;
  every_template_has_material_recipe: boolean;
  every_template_has_labor_recipe: boolean;
  every_template_has_norm_source: boolean;
  every_template_has_unit_policy: boolean;
  every_template_has_ui_renderer_policy: boolean;
  every_template_has_pdf_policy: boolean;
  every_template_has_buyer_handoff_policy: boolean;
  product_green_revoked: true;
  full_10000_green_claimed: false;
  fake_green_claimed: false;
  templates: Estimate10000ProfessionalTemplateReadiness[];
  blockers: string[];
};

function countReady(templates: Estimate10000ProfessionalTemplateReadiness[]): number {
  return templates.filter((template) => template.readiness_status === "READY_PROFESSIONAL").length;
}

function countStatus(templates: Estimate10000ProfessionalTemplateReadiness[], status: string): number {
  return templates.filter((template) => template.readiness_status === status).length;
}

function countRealNormSources(templates: Estimate10000ProfessionalTemplateReadiness[]): number {
  return templates.filter((template) =>
    template.norm_source_type === "versioned_professional_norm_pack" &&
    template.source_backed_row_count === template.row_count &&
    template.row_count > 0
  ).length;
}

export function buildEstimate10000WorkFamilyMap(
  templates: Estimate10000ProfessionalTemplateReadiness[],
): Record<string, WorkFamilyMapEntry> {
  return templates.reduce<Record<string, WorkFamilyMapEntry>>((accumulator, template) => {
    const key = template.work_family_id || "missing_work_family";
    const current = accumulator[key] ?? {
      work_family_id: key,
      template_count: 0,
      ready_professional_count: 0,
      not_ready_count: 0,
      generic_fallback_count: 0,
      source_backed_row_count: 0,
      row_count: 0,
    };
    current.template_count += 1;
    current.ready_professional_count += template.readiness_status === "READY_PROFESSIONAL" ? 1 : 0;
    current.not_ready_count += template.readiness_status.startsWith("NOT_READY") ? 1 : 0;
    current.generic_fallback_count += template.generic_family_default_row_count > 0 ? 1 : 0;
    current.source_backed_row_count += template.source_backed_row_count;
    current.row_count += template.row_count;
    accumulator[key] = current;
    return accumulator;
  }, {});
}

export function buildEstimate10000ProfessionalInventory(): Estimate10000ProfessionalInventory {
  const manifest = buildEstimate10000ReadinessManifest();
  const templates = manifest.templates.map(classifyEstimateTemplateProfessionalReadiness);
  const blockers = [
    templates.length !== 10000 ? `manifest_total_templates:${templates.length}` : "",
    countReady(templates) !== 10000 ? `ready_professional_count:${countReady(templates)}` : "",
    countStatus(templates, "NOT_READY_GENERIC_FALLBACK") > 0
      ? `generic_fallback_count:${countStatus(templates, "NOT_READY_GENERIC_FALLBACK")}`
      : "",
    ...templates
      .filter((template) => template.professional_acceptance_blockers.length > 0)
      .slice(0, 100)
      .map((template) => `${template.template_id}:${template.professional_acceptance_blockers.join("|")}`),
  ].filter(Boolean);

  return {
    schema: "estimate-10000-professional-inventory-v1",
    generated_at: new Date().toISOString(),
    manifest_total_templates: templates.length,
    ready_professional_count: countReady(templates),
    quantity_only_price_missing_count: countStatus(templates, "READY_QUANTITY_ONLY_PRICE_MISSING"),
    not_ready_count: templates.filter((template) => template.readiness_status.startsWith("NOT_READY")).length,
    generic_fallback_count: templates.filter((template) => template.generic_family_default_row_count > 0).length,
    synthetic_family_default_count: templates.filter((template) => template.norm_source_type === "generic_family_default").length,
    templates_only_generic_norms_count: templates.filter((template) => template.source_backed_row_count === 0).length,
    templates_with_real_norm_sources_count: countRealNormSources(templates),
    every_template_has_work_family: templates.every((template) => Boolean(template.work_family_id)),
    every_template_has_calculator: templates.every((template) => Boolean(template.calculator_family_id)),
    every_template_has_parameter_schema: templates.every((template) => Boolean(template.parameter_schema_id)),
    every_template_has_formula: templates.every((template) => template.formula_status === "PRESENT"),
    every_template_has_material_recipe: templates.every((template) => template.material_recipe_status === "PRESENT"),
    every_template_has_labor_recipe: templates.every((template) => template.labor_recipe_status === "PRESENT"),
    every_template_has_norm_source: templates.every((template) => template.norm_source_type === "versioned_professional_norm_pack"),
    every_template_has_unit_policy: templates.every((template) => template.unit_policy_status === "PRESENT"),
    every_template_has_ui_renderer_policy: templates.every((template) => Boolean(template.ui_renderer_policy_id)),
    every_template_has_pdf_policy: templates.every((template) => Boolean(template.pdf_policy_id)),
    every_template_has_buyer_handoff_policy: templates.every((template) => Boolean(template.buyer_handoff_policy_id)),
    product_green_revoked: true,
    full_10000_green_claimed: false,
    fake_green_claimed: false,
    templates,
    blockers,
  };
}

export function writeEstimate10000ProfessionalInventoryFiles(): {
  inventory: Estimate10000ProfessionalInventory;
  workFamilyMap: Record<string, WorkFamilyMapEntry>;
  blockers: string[];
  paths: {
    inventory_path: string;
    work_family_map_path: string;
    blockers_path: string;
  };
} {
  const inventory = buildEstimate10000ProfessionalInventory();
  const workFamilyMap = buildEstimate10000WorkFamilyMap(inventory.templates);
  const blockers = inventory.templates
    .filter((template) => template.readiness_status !== "READY_PROFESSIONAL")
    .map((template) => ({
      template_id: template.template_id,
      work_key: template.work_key,
      readiness_status: template.readiness_status,
      blocking_reasons: template.blocking_reasons,
    }));

  const writeJson = (relativePath: string, value: unknown) => {
    const filePath = path.join(process.cwd(), relativePath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  };
  writeJson(ESTIMATE_10000_PROFESSIONAL_INVENTORY_PATH, inventory);
  writeJson(ESTIMATE_10000_WORK_FAMILY_MAP_PATH, workFamilyMap);
  writeJson(ESTIMATE_10000_BLOCKERS_PATH, blockers);

  return {
    inventory,
    workFamilyMap,
    blockers: inventory.blockers,
    paths: {
      inventory_path: ESTIMATE_10000_PROFESSIONAL_INVENTORY_PATH,
      work_family_map_path: ESTIMATE_10000_WORK_FAMILY_MAP_PATH,
      blockers_path: ESTIMATE_10000_BLOCKERS_PATH,
    },
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/buildEstimate10000ProfessionalInventory.ts")) {
  const result = writeEstimate10000ProfessionalInventoryFiles();
  console.log(JSON.stringify({
    ...result.paths,
    manifest_total_templates: result.inventory.manifest_total_templates,
    ready_professional_count: result.inventory.ready_professional_count,
    not_ready_count: result.inventory.not_ready_count,
    generic_fallback_count: result.inventory.generic_fallback_count,
    synthetic_family_default_count: result.inventory.synthetic_family_default_count,
    templates_with_real_norm_sources_count: result.inventory.templates_with_real_norm_sources_count,
    blocker_count: result.blockers.length,
    fake_green_claimed: result.inventory.fake_green_claimed,
  }, null, 2));
  process.exitCode = result.inventory.blockers.length === 0 ? 0 : 1;
}
