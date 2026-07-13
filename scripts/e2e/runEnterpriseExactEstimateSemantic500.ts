import {
  evaluateReal500MaterialPrice,
} from "./userInputExactMaterialPriceEstimate.shared";
import {
  assertEnterpriseGreen,
  writeEnterpriseExactJson,
} from "./enterpriseExactEstimate.shared";

const semantic500 = evaluateReal500MaterialPrice();
const result = {
  ...semantic500,
  final_status: semantic500.failures.length === 0
    ? "GREEN_ENTERPRISE_EXACT_ESTIMATE_SEMANTIC_500_READY"
    : "RED_ENTERPRISE_EXACT_ESTIMATE_SEMANTIC_500",
};

writeEnterpriseExactJson("semantic_500_results.json", result);
assertEnterpriseGreen(result, "GREEN_ENTERPRISE_EXACT_ESTIMATE_SEMANTIC_500_READY");
