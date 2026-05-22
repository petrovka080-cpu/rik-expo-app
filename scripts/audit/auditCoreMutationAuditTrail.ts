import {
  buildBackendServiceBoundaryAuditTrailReport,
  buildBackendServiceBoundaryCoreActionsReport,
} from "./backendServiceBoundary.shared";

const coreActions = buildBackendServiceBoundaryCoreActionsReport();
const report = buildBackendServiceBoundaryAuditTrailReport(coreActions);
console.log(JSON.stringify(report, null, 2));

if (!report.core_mutations_have_audit_events) {
  process.exitCode = 1;
}
