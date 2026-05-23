import {
  GLOBAL_RATE_MATERIALS,
  GLOBAL_RATE_WORKS,
  GLOBAL_ESTIMATE_TEMPLATE_ROWS,
  GLOBAL_ESTIMATE_TEMPLATES,
} from "./globalEstimateSeedData";
import type { GlobalEstimateTemplate, GlobalEstimateTemplateRowDefinition } from "./globalEstimateTypes";
import {
  GLOBAL_ESTIMATE_FORBIDDEN_GENERIC_ROW_NAMES,
  GLOBAL_ESTIMATE_TEMPLATE_RATEBOOK_REQUIRED_WORK_KEYS,
  GLOBAL_ESTIMATE_TEMPLATE_RECONCILIATION_EXPECTED_ROW_CODES,
  isGlobalEstimateTemplateRatebookRequiredWorkKey,
} from "./templates/coreTemplateReconciliation";
import { GLOBAL_WORK_TYPE_DEFINITIONS } from "./globalWorkTypeResolver";

export function getGlobalEstimateTemplate(workKey: string): GlobalEstimateTemplate {
  const template = GLOBAL_ESTIMATE_TEMPLATES.find((item) => item.workKey === workKey);
  if (template) return template;

  if (isGlobalEstimateTemplateRatebookRequiredWorkKey(workKey)) {
    throw new Error(`GLOBAL_ESTIMATE_TEMPLATE_REQUIRED_FOR_KNOWN_WORK:${workKey}`);
  }

  return GLOBAL_ESTIMATE_TEMPLATES.find((item) => item.workKey === "other_construction_work")
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

function normalizeRowName(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function isForbiddenGenericRowName(value: string): boolean {
  const normalized = normalizeRowName(value);
  return GLOBAL_ESTIMATE_FORBIDDEN_GENERIC_ROW_NAMES.some((genericName) => {
    const generic = normalizeRowName(genericName);
    return normalized === generic || normalized.includes(generic);
  });
}

export function verifyGlobalEstimateTemplateRatebookReconciliation(
  workKeys: readonly string[] = GLOBAL_ESTIMATE_TEMPLATE_RATEBOOK_REQUIRED_WORK_KEYS,
): {
  checkedWorkKeys: string[];
  blockers: string[];
  passed: boolean;
} {
  const blockers: string[] = [];
  const rateKeys = new Set([...GLOBAL_RATE_MATERIALS, ...GLOBAL_RATE_WORKS].map((rate) => rate.rateKey));

  for (const workKey of workKeys) {
    const template = GLOBAL_ESTIMATE_TEMPLATES.find((item) => item.workKey === workKey);
    if (!template) {
      blockers.push(`GLOBAL_ESTIMATE_TEMPLATE_MISSING:${workKey}`);
      continue;
    }

    const materialRows = template.sections.filter((section) => section.type === "materials").flatMap((section) => section.rows);
    const laborRows = template.sections.filter((section) => section.type === "labor" || section.type === "equipment").flatMap((section) => section.rows);
    if (materialRows.length === 0) blockers.push(`GLOBAL_ESTIMATE_MATERIAL_TEMPLATE_ROWS_MISSING:${workKey}`);
    if (laborRows.length === 0) blockers.push(`GLOBAL_ESTIMATE_LABOR_TEMPLATE_ROWS_MISSING:${workKey}`);

    for (const row of template.sections.flatMap((section) => section.rows)) {
      if (isForbiddenGenericRowName(row.names.ru) || isForbiddenGenericRowName(row.names.en ?? "")) {
        blockers.push(`GLOBAL_ESTIMATE_GENERIC_TEMPLATE_ROW:${workKey}:${row.code}`);
      }
      if (!rateKeys.has(row.rateKey)) {
        blockers.push(`GLOBAL_ESTIMATE_TEMPLATE_RATE_KEY_MISSING:${workKey}:${row.rateKey}`);
      }
    }

    if (isGlobalEstimateTemplateRatebookRequiredWorkKey(workKey)) {
      const actualCodes = new Set(template.sections.flatMap((section) => section.rows.map((row) => row.code)));
      for (const expectedCode of GLOBAL_ESTIMATE_TEMPLATE_RECONCILIATION_EXPECTED_ROW_CODES[workKey]) {
        if (!actualCodes.has(expectedCode)) {
          blockers.push(`GLOBAL_ESTIMATE_TEMPLATE_EXPECTED_ROW_MISSING:${workKey}:${expectedCode}`);
        }
      }
    }
  }

  return {
    checkedWorkKeys: [...workKeys],
    blockers,
    passed: blockers.length === 0,
  };
}
