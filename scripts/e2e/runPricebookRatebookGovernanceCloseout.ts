import {
  assertGreen,
  PRICEBOOK_RATEBOOK_GOVERNANCE_GREEN_STATUS,
  runPricebookRatebookGovernanceCloseout,
} from "./pricebookRatebookGovernance.shared";

const result = runPricebookRatebookGovernanceCloseout();
assertGreen(result, PRICEBOOK_RATEBOOK_GOVERNANCE_GREEN_STATUS);
