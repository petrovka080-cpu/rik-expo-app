import { GLOBAL_ESTIMATE_TEMPLATE_ROWS, GLOBAL_ESTIMATE_TEMPLATES } from "./globalEstimateSeedData";
import type { GlobalEstimateTemplate, GlobalEstimateTemplateRowDefinition } from "./globalEstimateTypes";
import { GLOBAL_WORK_TYPE_DEFINITIONS } from "./globalWorkTypeResolver";

export function getGlobalEstimateTemplate(workKey: string): GlobalEstimateTemplate {
  return GLOBAL_ESTIMATE_TEMPLATES.find((template) => template.workKey === workKey)
    ?? GLOBAL_ESTIMATE_TEMPLATES.find((template) => template.workKey === "other_construction_work")
    ?? GLOBAL_ESTIMATE_TEMPLATES[0];
}

export function getGlobalEstimateTemplateRows(workKey: string): (GlobalEstimateTemplateRowDefinition & { workKey: string })[] {
  return GLOBAL_ESTIMATE_TEMPLATE_ROWS.filter((row) => row.workKey === workKey && row.required);
}

export function verifyGlobalEstimateTemplateCoverage(): {
  passed: boolean;
  totalWorkTypes: number;
  totalTemplates: number;
  missingWorkKeys: string[];
} {
  const templateKeys = new Set(GLOBAL_ESTIMATE_TEMPLATES.map((template) => template.workKey));
  const missingWorkKeys = GLOBAL_WORK_TYPE_DEFINITIONS
    .map((definition) => definition.workKey)
    .filter((workKey) => !templateKeys.has(workKey));
  return {
    passed: missingWorkKeys.length === 0,
    totalWorkTypes: GLOBAL_WORK_TYPE_DEFINITIONS.length,
    totalTemplates: GLOBAL_ESTIMATE_TEMPLATES.length,
    missingWorkKeys,
  };
}
