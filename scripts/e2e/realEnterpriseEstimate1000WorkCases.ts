import {
  SELECTED_WORK_ENTERPRISE_1000_CASES,
  SELECTED_WORK_ENTERPRISE_1000_SCENARIO_COUNTS,
  type SelectedWorkEnterprise1000Case,
} from "./selectedWorkEnterprise1000Cases";

const PLACEHOLDER_PATTERN = /\b(?:fake|placeholder|test work|dummy|lorem|todo)\b/i;

export type RealEnterpriseEstimate1000Audit = {
  cases_total: number;
  cases_unique: boolean;
  duplicate_ids: string[];
  duplicate_inputs: string[];
  placeholder_cases: string[];
  category_counts: Record<string, number>;
  scenario_counts: typeof SELECTED_WORK_ENTERPRISE_1000_SCENARIO_COUNTS;
  required_visible_works_present: boolean;
  failures: string[];
};

export const REAL_ENTERPRISE_ESTIMATE_1000_WORK_CASES: readonly SelectedWorkEnterprise1000Case[] =
  SELECTED_WORK_ENTERPRISE_1000_CASES;

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicated.add(value);
    seen.add(value);
  }
  return [...duplicated].sort();
}

export function auditRealEnterpriseEstimate1000WorkCases(): RealEnterpriseEstimate1000Audit {
  const duplicateIds = duplicates(REAL_ENTERPRISE_ESTIMATE_1000_WORK_CASES.map((item) => item.id));
  const duplicateInputs = duplicates(REAL_ENTERPRISE_ESTIMATE_1000_WORK_CASES.map((item) => item.rawEstimateInput));
  const placeholderCases = REAL_ENTERPRISE_ESTIMATE_1000_WORK_CASES
    .filter((item) => PLACEHOLDER_PATTERN.test([
      item.id,
      item.domainTitleRu,
      item.selectedTitleRu,
      item.smartSearchInput,
      item.rawEstimateInput,
    ].join(" ")))
    .map((item) => item.id);
  const categoryCounts = REAL_ENTERPRISE_ESTIMATE_1000_WORK_CASES.reduce<Record<string, number>>((summary, item) => {
    summary[item.categoryKey] = (summary[item.categoryKey] ?? 0) + 1;
    return summary;
  }, {});
  const requiredVisibleWorkPatterns = [
    /waterproof|гидро|РіРёРґСЂРѕ/i,
    /screed|стяж|СЃС‚СЏР¶/i,
    /tile|плит|РїР»РёС‚/i,
    /plaster|штукат|С€С‚СѓРєР°С‚/i,
    /brick|кирпич|РєРёСЂРїРёС‡/i,
    /concrete|бетон|Р±РµС‚РѕРЅ/i,
    /roof|кров|РєСЂРѕРІ/i,
    /electrical|электр|СЌР»РµРєС‚СЂ/i,
    /plumbing|водопровод|РІРѕРґРѕРїСЂ/i,
  ];
  const allInputText = REAL_ENTERPRISE_ESTIMATE_1000_WORK_CASES
    .flatMap((item) => [item.domainKey, item.domainTitleRu, item.rawEstimateInput, item.smartSearchInput])
    .join("\n");
  const requiredVisibleWorksPresent = requiredVisibleWorkPatterns.every((pattern) => pattern.test(allInputText));
  const failures = [
    ...(REAL_ENTERPRISE_ESTIMATE_1000_WORK_CASES.length === 1000 ? [] : [`CASE_COUNT:${REAL_ENTERPRISE_ESTIMATE_1000_WORK_CASES.length}`]),
    ...duplicateIds.map((id) => `DUPLICATE_ID:${id}`),
    ...duplicateInputs.map((input) => `DUPLICATE_INPUT:${input}`),
    ...placeholderCases.map((id) => `PLACEHOLDER_CASE:${id}`),
    ...(Object.keys(categoryCounts).length >= 20 ? [] : [`CATEGORY_COVERAGE:${Object.keys(categoryCounts).length}`]),
    ...(requiredVisibleWorksPresent ? [] : ["REQUIRED_VISIBLE_WORKS_MISSING"]),
  ];
  return {
    cases_total: REAL_ENTERPRISE_ESTIMATE_1000_WORK_CASES.length,
    cases_unique: duplicateIds.length === 0 && duplicateInputs.length === 0,
    duplicate_ids: duplicateIds,
    duplicate_inputs: duplicateInputs,
    placeholder_cases: placeholderCases,
    category_counts: categoryCounts,
    scenario_counts: SELECTED_WORK_ENTERPRISE_1000_SCENARIO_COUNTS,
    required_visible_works_present: requiredVisibleWorksPresent,
    failures,
  };
}

if (require.main === module) {
  const audit = auditRealEnterpriseEstimate1000WorkCases();
  console.log(JSON.stringify(audit, null, 2));
  if (audit.failures.length > 0) process.exitCode = 1;
}
