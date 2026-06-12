import {
  evaluateSelectedWork1000,
} from "./userInputExactMaterialPriceEstimate.shared";
import {
  assertEnterpriseGreen,
  writeEnterpriseExactJson,
} from "./enterpriseExactEstimate.shared";

const selected1000 = evaluateSelectedWork1000();
const result = {
  ...selected1000,
  final_status: selected1000.failures.length === 0
    ? "GREEN_ENTERPRISE_EXACT_ESTIMATE_ACCEPTANCE_1000_READY"
    : "RED_ENTERPRISE_EXACT_ESTIMATE_ACCEPTANCE_1000",
};

writeEnterpriseExactJson("acceptance_1000_results.json", result);
assertEnterpriseGreen(result, "GREEN_ENTERPRISE_EXACT_ESTIMATE_ACCEPTANCE_1000_READY");
