import type {
  EstimateQualityFailure,
  EstimateQualityFailureCode,
  EstimateQualityRuleName,
  EstimateQualityRuleResult,
  EstimateQualityWarning,
} from "./estimateQualityTypes";

export function qualityFailure(input: {
  code: EstimateQualityFailureCode;
  details: string;
  selectedWorkKey?: string | null;
  rowKey?: string | null;
  visibleNameRu?: string | null;
  severity?: "BLOCKER" | "WARNING";
}): EstimateQualityFailure {
  return {
    code: input.code,
    severity: input.severity ?? "BLOCKER",
    ...(input.selectedWorkKey ? { selected_work_key: input.selectedWorkKey } : {}),
    ...(input.rowKey ? { row_key: input.rowKey } : {}),
    ...(input.visibleNameRu ? { visible_name_ru: input.visibleNameRu } : {}),
    details_ru: input.details,
  };
}

export function qualityWarning(input: {
  code: EstimateQualityFailureCode;
  details: string;
  selectedWorkKey?: string | null;
  rowKey?: string | null;
  visibleNameRu?: string | null;
}): EstimateQualityWarning {
  return qualityFailure({ ...input, severity: "WARNING" }) as EstimateQualityWarning;
}

export function qualityRuleResult(input: {
  check: EstimateQualityRuleName;
  failures?: EstimateQualityFailure[];
  warnings?: EstimateQualityWarning[];
}): EstimateQualityRuleResult {
  const failures = input.failures ?? [];
  return {
    check: input.check,
    passed: failures.length === 0,
    failures,
    warnings: input.warnings ?? [],
    fake_green_claimed: false,
  };
}

export function countFailuresByCode(
  failures: readonly EstimateQualityFailure[],
  code: EstimateQualityFailureCode,
): number {
  return failures.filter((failure) => failure.code === code).length;
}
