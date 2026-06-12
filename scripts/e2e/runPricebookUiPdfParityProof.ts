import {
  assertGreen,
  runPricebookUiPdfParityProof,
} from "./pricebookRatebookGovernance.shared";

const result = runPricebookUiPdfParityProof();
assertGreen(result, "GREEN_PRICEBOOK_UI_PDF_PARITY_READY");
