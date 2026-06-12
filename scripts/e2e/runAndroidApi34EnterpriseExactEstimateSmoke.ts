import { runAndroidApi34UserInputExactMaterialPriceEstimateSmoke } from "./runAndroidApi34UserInputExactMaterialPriceEstimateSmoke";
import {
  assertEnterpriseGreen,
  writeEnterpriseExactJson,
} from "./enterpriseExactEstimate.shared";

const upstream = runAndroidApi34UserInputExactMaterialPriceEstimateSmoke() as Record<string, unknown>;
const upstreamGreen = upstream.final_status === "GREEN_ANDROID_API34_USER_INPUT_EXACT_MATERIAL_PRICE_ESTIMATE_READY";
const result = {
  ...upstream,
  final_status: upstreamGreen
    ? "GREEN_ANDROID_API34_ENTERPRISE_EXACT_ESTIMATE_READY"
    : "BLOCKED_ANDROID_API34_ENTERPRISE_EXACT_ESTIMATE",
  upstream_status: upstream.final_status,
  android_api34_tested: upstream.android_api34_tested === true,
  actual_api: upstream.actual_api ?? null,
  api36_rejected: true,
  api36_used_as_substitute: false,
  fake_green_claimed: false,
  failures: upstreamGreen ? [] : ["UPSTREAM_ANDROID_EXACT_ESTIMATE_NOT_GREEN", ...((upstream.failures as unknown[]) ?? [])],
};

writeEnterpriseExactJson("android_api34_results.json", result);
assertEnterpriseGreen(result, "GREEN_ANDROID_API34_ENTERPRISE_EXACT_ESTIMATE_READY");
