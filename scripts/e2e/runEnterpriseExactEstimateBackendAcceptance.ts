import {
  assertEnterpriseGreen,
  enterpriseBackendAcceptanceProof,
} from "./enterpriseExactEstimate.shared";

const result = enterpriseBackendAcceptanceProof();
assertEnterpriseGreen(result, "GREEN_ENTERPRISE_EXACT_ESTIMATE_BACKEND_ACCEPTANCE_READY");
