import type {
  EstimateQualityChecks,
  EstimateQualityGateInput,
  EstimateQualityGateResult,
  EstimateQualityGateStatus,
  EstimateQualityWarning,
} from "./estimateQualityTypes";
import { ESTIMATE_QUALITY_RULE_REGISTRY } from "./estimateQualityRuleRegistry";

function emptyChecks(): EstimateQualityChecks {
  return {
    work_resolution_passed: false,
    quantity_sanity_passed: false,
    template_completeness_passed: false,
    row_domain_isolation_passed: false,
    material_compatibility_passed: false,
    price_integrity_passed: false,
    regional_currency_passed: false,
    snapshot_integrity_passed: false,
    professional_completeness_passed: false,
    pdf_request_history_parity_passed: false,
  };
}

function statusFor(input: EstimateQualityGateInput, blockers: number, warnings: number): EstimateQualityGateStatus {
  if (blockers > 0) return "QUALITY_BLOCKED";
  if (input.smart_estimator_result.status === "NEEDS_CLARIFICATION") return "NEEDS_CLARIFICATION";
  if (input.smart_estimator_result.status === "PARTIAL_PRICE_MISSING" ||
    (input.smart_estimator_result.price_audit?.missing_price_rows ?? 0) > 0) {
    return "PARTIAL_PRICE_MISSING";
  }
  return warnings > 0 ? "QUALITY_PASSED_WITH_WARNINGS" : "QUALITY_PASSED";
}

export function runEstimateQualityGate(input: EstimateQualityGateInput): EstimateQualityGateResult {
  const context = {
    input,
    result: input.smart_estimator_result,
    snapshot: input.smart_estimator_result.snapshot?.professional_snapshot ?? null,
  };
  const checks = emptyChecks();
  const blockingFailures = [];
  const warnings: EstimateQualityWarning[] = [];

  for (const rule of ESTIMATE_QUALITY_RULE_REGISTRY) {
    const result = rule.run(context);
    checks[result.check] = result.passed;
    blockingFailures.push(...result.failures.filter((failure) => failure.severity === "BLOCKER"));
    warnings.push(...(result.warnings ?? []), ...result.failures.filter((failure) => failure.severity === "WARNING") as EstimateQualityWarning[]);
  }

  const qualityScore = Math.max(0, 100 - blockingFailures.length * 10 - warnings.length * 2);
  return {
    status: statusFor(input, blockingFailures.length, warnings.length),
    quality_score: qualityScore,
    blocking_failures: blockingFailures,
    warnings,
    checks,
    fake_green_claimed: false,
  };
}

export function estimateQualityGateAllowsUserOutput(result: EstimateQualityGateResult): boolean {
  return result.status === "QUALITY_PASSED" ||
    result.status === "QUALITY_PASSED_WITH_WARNINGS" ||
    result.status === "PARTIAL_PRICE_MISSING";
}

export function smartEstimateIsUserReadyAfterQualityGate(input: EstimateQualityGateInput): boolean {
  return estimateQualityGateAllowsUserOutput(runEstimateQualityGate(input));
}
