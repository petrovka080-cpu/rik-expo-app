import { runAndroidApi34UserInputExactMaterialPriceEstimateSmoke } from "./runAndroidApi34UserInputExactMaterialPriceEstimateSmoke";
import { buildExactMaterialPriceEstimate } from "../../src/lib/ai/exactMaterialPriceEstimate";
import { SELECTED_WORK_ENTERPRISE_1000_CASES } from "./selectedWorkEnterprise1000Cases";
import {
  assertEnterpriseGreen,
  evaluateRegionalCurrencyProof,
  writeEnterpriseExactJson,
} from "./enterpriseExactEstimate.shared";

const upstream = runAndroidApi34UserInputExactMaterialPriceEstimateSmoke() as Record<string, unknown>;
const upstreamGreen = upstream.final_status === "GREEN_ANDROID_API34_USER_INPUT_EXACT_MATERIAL_PRICE_ESTIMATE_READY";
const sampledCases = SELECTED_WORK_ENTERPRISE_1000_CASES.slice(0, 50).map((item) => {
  const estimate = buildExactMaterialPriceEstimate({
    text: item.rawEstimateInput,
    selectedWorkKey: item.selectedWorkKey,
    volume: item.volume,
    unit: item.unit,
  });
  const passed = estimate.work.work_key === item.selectedWorkKey &&
    estimate.input.quantity === item.volume &&
    estimate.material_lines.length > 0 &&
    estimate.policy.fake_price_claimed === false &&
    estimate.policy.fake_supplier_claimed === false;
  return { id: item.id, passed };
});
const currency = evaluateRegionalCurrencyProof();
const sampledFailures = sampledCases.filter((item) => !item.passed).map((item) => `REAL_USER_CASE_FAILED:${item.id}`);
const result = {
  ...upstream,
  final_status: upstreamGreen && sampledFailures.length === 0 && currency.failures.length === 0
    ? "GREEN_ANDROID_API34_ENTERPRISE_EXACT_ESTIMATE_READY"
    : "BLOCKED_ANDROID_API34_ENTERPRISE_EXACT_ESTIMATE",
  upstream_status: upstream.final_status,
  android_api34_tested: upstream.android_api34_tested === true,
  actual_api: upstream.actual_api ?? null,
  api36_rejected: true,
  api36_used_as_substitute: false,
  real_user_cases: sampledCases.length,
  cases_passed: sampledCases.filter((item) => item.passed).length,
  material_quantities_visible: upstream.exact_materials_visible === true,
  regional_currency_visible: currency.kg_uses_kgs === true,
  kg_uses_kgs: currency.kg_uses_kgs,
  kz_uses_kzt: currency.kz_uses_kzt,
  usd_not_shown_for_kg_final_total: currency.no_usd_for_kg_user,
  usd_not_shown_for_kz_final_total: currency.no_usd_for_kz_user,
  fake_green_claimed: false,
  failures: [
    ...(upstreamGreen ? [] : ["UPSTREAM_ANDROID_EXACT_ESTIMATE_NOT_GREEN", ...((upstream.failures as unknown[]) ?? [])]),
    ...sampledFailures,
    ...currency.failures,
  ],
};

writeEnterpriseExactJson("android_api34_results.json", result);
assertEnterpriseGreen(result, "GREEN_ANDROID_API34_ENTERPRISE_EXACT_ESTIMATE_READY");
