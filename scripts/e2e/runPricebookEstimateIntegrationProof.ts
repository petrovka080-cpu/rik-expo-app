import {
  assertGreen,
  runPricebookEstimateIntegrationProof,
} from "./pricebookRatebookGovernance.shared";

const result = runPricebookEstimateIntegrationProof();
assertGreen(result, "GREEN_PRICEBOOK_ESTIMATE_INTEGRATION_READY");
