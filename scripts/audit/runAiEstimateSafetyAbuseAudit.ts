import { writeAiEstimateEnterpriseFinalReadinessArtifacts } from "./runAiEstimateEnterpriseFinalReadinessGoNoGo";

const report = writeAiEstimateEnterpriseFinalReadinessArtifacts();
if (report.matrix.safety_abuse_audit_passed !== true) throw new Error("UNKNOWN_NEEDS_TRACE");
if (report.matrix.fake_sources_found === true || report.matrix.fake_stock_supplier_availability_found === true) {
  throw new Error("SAFETY_ABUSE_AUDIT_FAILED");
}

