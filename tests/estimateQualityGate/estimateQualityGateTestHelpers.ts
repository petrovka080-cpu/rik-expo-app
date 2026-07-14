import {
  runEstimateQualityGate,
  type EstimateQualityFailureCode,
  type EstimateQualityGateResult,
} from "../../src/lib/ai/estimateQualityGate";
import { runSmartEstimatorProtocol } from "../../src/lib/ai/smartEstimator";
import {
  buildAdversarialSmartEstimatorResult,
  buildEstimateQualityAdversarialCases,
  type EstimateQualityAdversarialMutation,
} from "../../scripts/e2e/estimateQualityAdversarialCases";

export function goodQualityGate(): EstimateQualityGateResult {
  const smart = runSmartEstimatorProtocol({
    user_input: "ukladka kovrolina 1500 m2 Bishkek",
    selected_work_key: "carpet_laying",
    known_quantity: 1500,
    known_unit: "m2",
    region: "KG_BISHKEK",
  });
  return runEstimateQualityGate({
    source_user_input: "ukladka kovrolina 1500 m2 Bishkek",
    smart_estimator_result: smart,
    expected_region: "KG_BISHKEK",
    expected_currency: "KGS",
    strict_mode: true,
    source: "test",
  });
}

export function blockedGateFor(mutation: EstimateQualityAdversarialMutation): EstimateQualityGateResult {
  const testCase = buildEstimateQualityAdversarialCases().find((item) => item.mutation === mutation);
  if (!testCase) throw new Error(`MISSING_ADVERSARIAL_CASE:${mutation}`);
  const smart = buildAdversarialSmartEstimatorResult(testCase);
  return runEstimateQualityGate({
    source_user_input: testCase.user_input,
    smart_estimator_result: smart,
    expected_region: smart.snapshot?.professional_snapshot.region,
    expected_currency: smart.snapshot?.professional_snapshot.region?.startsWith("KZ_") ? "KZT" : "KGS",
    strict_mode: true,
    source: "test",
  });
}

export function expectBlockedWith(
  result: EstimateQualityGateResult,
  code: EstimateQualityFailureCode,
): void {
  expect(result.status).toBe("QUALITY_BLOCKED");
  expect(result.blocking_failures.some((failure) => failure.code === code)).toBe(true);
  expect(result.fake_green_claimed).toBe(false);
}
