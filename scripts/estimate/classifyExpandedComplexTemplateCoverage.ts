import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  classifyExpandedComplexProfessionalReadiness,
  EXPANDED_COMPLEX_TEMPLATES,
  getExpandedComplexWorkFamily,
  type ExpandedComplexReadinessStatus,
} from "../../src/lib/ai/expandedComplexWorks";

export const EXPANDED_COMPLEX_TEMPLATE_COVERAGE_PATH =
  "data/estimate-catalog/expanded-complex/template-coverage.json" as const;

export type ExpandedComplexTemplateCoverage = {
  template_id: string;
  work_family_id: string;
  template_level: string;
  readiness_status: ExpandedComplexReadinessStatus;
  blocking_reasons: string[];
  has_parameter_schema: boolean;
  has_formula: boolean;
  has_material_recipe: boolean;
  has_labor_recipe: boolean;
  has_equipment_recipe: boolean;
  has_service_recipe: boolean;
  has_norm_source: boolean;
  has_price_policy: boolean;
  has_ui_renderer_policy: boolean;
  has_pdf_policy: boolean;
  has_buyer_handoff_policy: boolean;
};

export type ExpandedComplexTemplateCoverageManifest = {
  schema: "expanded-complex-template-coverage-v1";
  generated_at: string;
  expanded_templates_count: number;
  all_templates_checked_for_expanded_complex_works: true;
  template_without_family_count: number;
  not_ready_count: number;
  templates: ExpandedComplexTemplateCoverage[];
};

function writeJson(relativePath: string, value: unknown): void {
  const filePath = path.join(process.cwd(), relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function classifyExpandedComplexTemplateCoverage(generatedAt = new Date().toISOString()): ExpandedComplexTemplateCoverageManifest {
  const templates = EXPANDED_COMPLEX_TEMPLATES.map((template): ExpandedComplexTemplateCoverage => {
    const family = getExpandedComplexWorkFamily(template.work_family_id);
    if (!family) {
      return {
        template_id: template.template_id,
        work_family_id: template.work_family_id,
        template_level: template.template_level,
        readiness_status: "NOT_READY_MISSING_FAMILY",
        blocking_reasons: ["missing_work_family"],
        has_parameter_schema: false,
        has_formula: false,
        has_material_recipe: false,
        has_labor_recipe: false,
        has_equipment_recipe: false,
        has_service_recipe: false,
        has_norm_source: false,
        has_price_policy: false,
        has_ui_renderer_policy: false,
        has_pdf_policy: false,
        has_buyer_handoff_policy: false,
      };
    }
    const readiness = classifyExpandedComplexProfessionalReadiness(family);
    const blockingReasons = readiness.startsWith("NOT_READY") ? [readiness] : [];
    return {
      template_id: template.template_id,
      work_family_id: template.work_family_id,
      template_level: template.template_level,
      readiness_status: readiness,
      blocking_reasons: blockingReasons,
      has_parameter_schema: family.parameterSchema.length > 0,
      has_formula: Boolean(family.formulaFamily),
      has_material_recipe: family.materialRecipe.length > 0,
      has_labor_recipe: family.laborRecipe.length > 0,
      has_equipment_recipe: family.equipmentRecipe.length > 0,
      has_service_recipe: family.serviceRecipe.length > 0,
      has_norm_source: Boolean(family.normSource.sourceId),
      has_price_policy: family.pricePolicy.defaultState === "PRICE_MISSING",
      has_ui_renderer_policy: family.uiRendererPolicy === "GROUPED_PREVIEW_REQUIRED",
      has_pdf_policy: family.pdfPolicy === "GROUPED_WITH_ASSUMPTIONS_TRACE_AND_SOURCES",
      has_buyer_handoff_policy: family.buyerHandoffPolicy === "MATERIAL_EQUIPMENT_DELIVERY_ONLY",
    };
  });
  return {
    schema: "expanded-complex-template-coverage-v1",
    generated_at: generatedAt,
    expanded_templates_count: templates.length,
    all_templates_checked_for_expanded_complex_works: true,
    template_without_family_count: templates.filter((template) => template.readiness_status === "NOT_READY_MISSING_FAMILY").length,
    not_ready_count: templates.filter((template) => template.readiness_status.startsWith("NOT_READY")).length,
    templates,
  };
}

export function writeExpandedComplexTemplateCoverage(generatedAt = new Date().toISOString()): ExpandedComplexTemplateCoverageManifest {
  const manifest = classifyExpandedComplexTemplateCoverage(generatedAt);
  writeJson(EXPANDED_COMPLEX_TEMPLATE_COVERAGE_PATH, manifest);
  return manifest;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/classifyExpandedComplexTemplateCoverage.ts")) {
  const manifest = writeExpandedComplexTemplateCoverage();
  console.log(JSON.stringify({
    template_coverage_path: EXPANDED_COMPLEX_TEMPLATE_COVERAGE_PATH,
    expanded_templates_count: manifest.expanded_templates_count,
    not_ready_count: manifest.not_ready_count,
    template_without_family_count: manifest.template_without_family_count,
  }, null, 2));
  process.exitCode = manifest.not_ready_count === 0 ? 0 : 1;
}
