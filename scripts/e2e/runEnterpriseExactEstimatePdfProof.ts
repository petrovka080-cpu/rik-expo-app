import {
  assertEnterpriseGreen,
  enterprisePdfProof,
} from "./enterpriseExactEstimate.shared";

const result = enterprisePdfProof();
assertEnterpriseGreen(result, "GREEN_ENTERPRISE_EXACT_ESTIMATE_PDF_READY");
