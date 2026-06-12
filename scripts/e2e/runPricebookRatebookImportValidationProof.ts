import {
  assertGreen,
  runPricebookRatebookImportValidationProof,
} from "./pricebookRatebookGovernance.shared";

const result = runPricebookRatebookImportValidationProof();
assertGreen(result, "GREEN_PRICEBOOK_RATEBOOK_IMPORT_VALIDATION_READY");
