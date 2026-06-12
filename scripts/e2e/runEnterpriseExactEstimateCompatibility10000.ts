import {
  evaluateReal10000Compatibility,
} from "./userInputExactMaterialPriceEstimate.shared";
import {
  assertEnterpriseGreen,
  writeEnterpriseExactJson,
} from "./enterpriseExactEstimate.shared";

const compatibility10000 = evaluateReal10000Compatibility();
const result = {
  ...compatibility10000,
  final_status: compatibility10000.failures.length === 0
    ? "GREEN_ENTERPRISE_EXACT_ESTIMATE_COMPATIBILITY_10000_READY"
    : "RED_ENTERPRISE_EXACT_ESTIMATE_COMPATIBILITY_10000",
};

writeEnterpriseExactJson("compatibility_10000_results.json", result);
assertEnterpriseGreen(result, "GREEN_ENTERPRISE_EXACT_ESTIMATE_COMPATIBILITY_10000_READY");
