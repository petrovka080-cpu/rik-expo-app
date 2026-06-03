import {
  assertFocusedAuditPassed,
  runEnterpriseProductionSafeAppAudit,
} from "./enterpriseProductionSafeAppAuditCore";

const report = runEnterpriseProductionSafeAppAudit({
  includeReleaseEvidenceFailures: false,
});

console.log(JSON.stringify(report.architecture_risk_audit, null, 2));
assertFocusedAuditPassed(report, "architecture");
