import fs from "node:fs";
import path from "node:path";

import {
  buildEnterpriseProductionSafeAppAuditReport,
  collectAiQualityChecks,
  collectBackendDataChecks,
  collectPdfChecks,
  collectScalePerformanceCostChecks,
  collectUiChecks,
  ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT_DIR,
  type EnterpriseAuditCheck,
  type EnterpriseAuditReport,
} from "../../scripts/audit/enterpriseProductionSafeAppAuditCore";

export function readUtf8(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

export function findCheck(checks: EnterpriseAuditCheck[], key: string): EnterpriseAuditCheck {
  const check = checks.find((item) => item.key === key);
  if (!check) throw new Error(`Missing enterprise audit check: ${key}`);
  return check;
}

export function expectCheckPassed(checks: EnterpriseAuditCheck[], key: string): EnterpriseAuditCheck {
  const check = findCheck(checks, key);
  expect(check.passed).toBe(true);
  return check;
}

export function buildAuditReport(): EnterpriseAuditReport {
  return buildEnterpriseProductionSafeAppAuditReport({
    now: "2026-06-02T00:00:00.000Z",
  });
}

export {
  collectAiQualityChecks,
  collectBackendDataChecks,
  collectPdfChecks,
  collectScalePerformanceCostChecks,
  collectUiChecks,
  ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT_DIR,
};
