import { readFileSync } from "node:fs";
import path from "node:path";

import {
  type Estimate10000ProfessionalInventory,
} from "../../scripts/estimate/buildEstimate10000ProfessionalInventory";
import {
  classifyEstimateTemplateProfessionalReadiness,
} from "../../scripts/estimate/classifyEstimateTemplateProfessionalReadiness";
import {
  type Estimate10000ReadinessManifest,
} from "../../scripts/estimate/buildEstimate10000ReadinessManifest";

let cachedManifest: Estimate10000ReadinessManifest | null = null;
let cachedInventory: Estimate10000ProfessionalInventory | null = null;

export function getTruthAuditManifest(): Estimate10000ReadinessManifest {
  cachedManifest ??= JSON.parse(
    readFileSync(path.join(process.cwd(), "data/estimate-templates/estimate-10000-readiness-manifest.json"), "utf8"),
  ) as Estimate10000ReadinessManifest;
  return cachedManifest;
}

export function getTruthAuditInventory(): Estimate10000ProfessionalInventory {
  if (cachedInventory) return cachedInventory;
  const templates = getTruthAuditManifest().templates.map(classifyEstimateTemplateProfessionalReadiness);
  cachedInventory = {
    schema: "estimate-10000-professional-inventory-v1",
    generated_at: "test",
    manifest_total_templates: templates.length,
    ready_professional_count: templates.filter((template) => template.readiness_status === "READY_PROFESSIONAL").length,
    quantity_only_price_missing_count: templates.filter((template) =>
      template.readiness_status === "READY_QUANTITY_ONLY_PRICE_MISSING"
    ).length,
    not_ready_count: templates.filter((template) => template.readiness_status.startsWith("NOT_READY")).length,
    generic_fallback_count: templates.filter((template) => template.generic_family_default_row_count > 0).length,
    synthetic_family_default_count: templates.filter((template) => template.norm_source_type === "generic_family_default").length,
    templates_only_generic_norms_count: templates.filter((template) => template.source_backed_row_count === 0).length,
    templates_with_real_norm_sources_count: templates.filter((template) =>
      template.norm_source_type === "versioned_professional_norm_pack" &&
      template.source_backed_row_count === template.row_count &&
      template.row_count > 0
    ).length,
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
    blockers: templates
      .filter((template) => template.professional_acceptance_blockers.length > 0)
      .map((template) => `${template.template_id}:${template.professional_acceptance_blockers.join("|")}`),
  };
  return cachedInventory;
}
