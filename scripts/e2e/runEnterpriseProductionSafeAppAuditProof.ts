import {
  BLOCKED_ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT,
  GREEN_ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT_READY,
  runEnterpriseProductionSafeAppAudit,
} from "../audit/enterpriseProductionSafeAppAuditCore";

const report = runEnterpriseProductionSafeAppAudit();

console.log(report.final_status);
console.log(`artifact=${"artifacts/S_ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT/failures.json"}`);

if (report.final_status !== GREEN_ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT_READY) {
  const primaryBlocker = report.blockers[0] ?? BLOCKED_ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT;
  throw new Error(`${BLOCKED_ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT}:${primaryBlocker}`);
}
