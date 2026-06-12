import {
  assertGreen,
  runPricebookRatebookGovernanceAcceptanceProof,
} from "./pricebookRatebookGovernance.shared";

const result = runPricebookRatebookGovernanceAcceptanceProof();
assertGreen(result, "GREEN_PRICEBOOK_RATEBOOK_GOVERNANCE_ACCEPTANCE_READY");
