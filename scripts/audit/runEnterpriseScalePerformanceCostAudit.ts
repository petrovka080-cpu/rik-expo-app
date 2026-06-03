import {
  assertFocusedAuditPassed,
  runEnterpriseProductionSafeAppAudit,
} from "./enterpriseProductionSafeAppAuditCore";

const report = runEnterpriseProductionSafeAppAudit({
  includeReleaseEvidenceFailures: false,
});

console.log(JSON.stringify(report.scale_performance_cost_audit, null, 2));
assertFocusedAuditPassed(report, "scale_performance_cost");
