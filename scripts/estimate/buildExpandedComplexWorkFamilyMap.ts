import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  EXPANDED_COMPLEX_FAMILY_BLOCKS,
  EXPANDED_COMPLEX_REQUIRED_CALCULATOR_IDS,
  EXPANDED_COMPLEX_TEMPLATES,
  EXPANDED_COMPLEX_WORK_FAMILIES,
} from "../../src/lib/ai/expandedComplexWorks";

export const EXPANDED_COMPLEX_DIR = "data/estimate-catalog/expanded-complex" as const;
export const EXPANDED_COMPLEX_WORK_FAMILIES_PATH =
  "data/estimate-catalog/expanded-complex/work-families.json" as const;
export const EXPANDED_COMPLEX_TEMPLATES_PATH =
  "data/estimate-catalog/expanded-complex/templates.json" as const;
export const EXPANDED_COMPLEX_CALCULATOR_REGISTRY_PATH =
  "data/estimate-catalog/expanded-complex/calculator-registry.json" as const;
export const EXPANDED_COMPLEX_COVERAGE_MAP_PATH =
  "data/estimate-catalog/expanded-complex-coverage-map.json" as const;

type ExpandedComplexWorkFamilyMapEntry = {
  work_family_id: string;
  localized_name_ru: string;
  aliases: string[];
  category_group: string;
  calculator_family_id: string;
  parameter_schema_id: string;
  formula_id: string;
  material_recipe_id: string;
  labor_recipe_id: string;
  equipment_recipe_id: string;
  service_recipe_id: string;
  norm_source_id: string;
  unit_policy_id: string;
  price_policy_id: string;
  estimate_level_policy_id: string;
  missing_design_inputs_policy_id: string;
  ui_renderer_policy_id: string;
  pdf_policy_id: string;
  buyer_handoff_policy_id: string;
  template_count: number;
};

export type ExpandedComplexWorkFamilyMap = {
  schema: "expanded-complex-work-family-map-v1";
  generated_at: string;
  expanded_work_families_created: true;
  expanded_work_families_count: number;
  expanded_templates_created: true;
  expanded_templates_count: number;
  required_calculators_created: true;
  required_calculators_count: number;
  required_calculator_ids: readonly string[];
  family_blocks: {
    block_key: string;
    title_ru: string;
    family_count: number;
  }[];
  families: ExpandedComplexWorkFamilyMapEntry[];
};

function writeJson(relativePath: string, value: unknown): void {
  const filePath = path.join(process.cwd(), relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function policyId(kind: string, workFamilyId: string): string {
  return `expanded_complex:${workFamilyId}:${kind}:v1`;
}

export function buildExpandedComplexWorkFamilyMap(generatedAt = new Date().toISOString()): ExpandedComplexWorkFamilyMap {
  const templateCountByFamily = new Map<string, number>();
  for (const template of EXPANDED_COMPLEX_TEMPLATES) {
    templateCountByFamily.set(template.work_family_id, (templateCountByFamily.get(template.work_family_id) ?? 0) + 1);
  }

  return {
    schema: "expanded-complex-work-family-map-v1",
    generated_at: generatedAt,
    expanded_work_families_created: true,
    expanded_work_families_count: EXPANDED_COMPLEX_WORK_FAMILIES.length,
    expanded_templates_created: true,
    expanded_templates_count: EXPANDED_COMPLEX_TEMPLATES.length,
    required_calculators_created: true,
    required_calculators_count: EXPANDED_COMPLEX_REQUIRED_CALCULATOR_IDS.length,
    required_calculator_ids: EXPANDED_COMPLEX_REQUIRED_CALCULATOR_IDS,
    family_blocks: EXPANDED_COMPLEX_FAMILY_BLOCKS.map((block) => ({
      block_key: block.key,
      title_ru: block.titleRu,
      family_count: block.families.length,
    })),
    families: EXPANDED_COMPLEX_WORK_FAMILIES.map((family) => ({
      work_family_id: family.work_family_id,
      localized_name_ru: family.professionalNameRu,
      aliases: family.aliases,
      category_group: family.categoryGroup,
      calculator_family_id: family.calculatorId,
      parameter_schema_id: policyId("parameter_schema", family.work_family_id),
      formula_id: family.formulaFamily,
      material_recipe_id: policyId("material_recipe", family.work_family_id),
      labor_recipe_id: policyId("labor_recipe", family.work_family_id),
      equipment_recipe_id: policyId("equipment_recipe", family.work_family_id),
      service_recipe_id: policyId("service_recipe", family.work_family_id),
      norm_source_id: family.normSource.sourceId,
      unit_policy_id: policyId("unit_policy", family.work_family_id),
      price_policy_id: policyId("price_policy", family.work_family_id),
      estimate_level_policy_id: policyId("estimate_level_policy", family.work_family_id),
      missing_design_inputs_policy_id: policyId("missing_design_inputs_policy", family.work_family_id),
      ui_renderer_policy_id: family.uiRendererPolicy,
      pdf_policy_id: family.pdfPolicy,
      buyer_handoff_policy_id: family.buyerHandoffPolicy,
      template_count: templateCountByFamily.get(family.work_family_id) ?? 0,
    })),
  };
}

export function writeExpandedComplexWorkFamilyMapFiles(generatedAt = new Date().toISOString()): ExpandedComplexWorkFamilyMap {
  const map = buildExpandedComplexWorkFamilyMap(generatedAt);
  writeJson(EXPANDED_COMPLEX_WORK_FAMILIES_PATH, EXPANDED_COMPLEX_WORK_FAMILIES);
  writeJson(EXPANDED_COMPLEX_TEMPLATES_PATH, EXPANDED_COMPLEX_TEMPLATES);
  writeJson(EXPANDED_COMPLEX_CALCULATOR_REGISTRY_PATH, {
    schema: "expanded-complex-calculator-registry-v1",
    generated_at: generatedAt,
    required_calculator_ids: EXPANDED_COMPLEX_REQUIRED_CALCULATOR_IDS,
    required_calculators_created: true,
    calculators_not_llm_based: true,
    calculators_not_ui_components: true,
    same_input_same_output: true,
  });
  writeJson(EXPANDED_COMPLEX_COVERAGE_MAP_PATH, map);
  return map;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/buildExpandedComplexWorkFamilyMap.ts")) {
  const map = writeExpandedComplexWorkFamilyMapFiles();
  console.log(JSON.stringify({
    coverage_map_path: EXPANDED_COMPLEX_COVERAGE_MAP_PATH,
    work_families_path: EXPANDED_COMPLEX_WORK_FAMILIES_PATH,
    templates_path: EXPANDED_COMPLEX_TEMPLATES_PATH,
    calculator_registry_path: EXPANDED_COMPLEX_CALCULATOR_REGISTRY_PATH,
    expanded_work_families_count: map.expanded_work_families_count,
    expanded_templates_count: map.expanded_templates_count,
    required_calculators_count: map.required_calculators_count,
  }, null, 2));
}
