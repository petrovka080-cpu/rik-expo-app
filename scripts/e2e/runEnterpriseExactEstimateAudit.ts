import {
  assertEnterpriseGreen,
  enterpriseBackendAcceptanceProof,
  enterprisePdfProof,
  writeEnterpriseExactJson,
} from "./enterpriseExactEstimate.shared";

const backend = enterpriseBackendAcceptanceProof();
const pdf = enterprisePdfProof();
const failures = [
  ...((backend.blockers as unknown[]) ?? []),
  ...((pdf.failures as unknown[]) ?? []),
];
const result = {
  final_status: failures.length === 0
    ? "GREEN_ENTERPRISE_EXACT_ESTIMATE_AUDIT_READY"
    : "RED_ENTERPRISE_EXACT_ESTIMATE_AUDIT",
  backend_status: backend.final_status,
  pdf_status: pdf.final_status,
  failures,
};

writeEnterpriseExactJson("audit_results.json", result);
assertEnterpriseGreen(result, "GREEN_ENTERPRISE_EXACT_ESTIMATE_AUDIT_READY");
