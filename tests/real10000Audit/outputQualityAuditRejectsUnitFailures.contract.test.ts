import { runReal10000OutputQualitySampleAudit } from "../../scripts/audit/real10000EstimateAuditCore";
import { auditCase, auditRuntimeResult } from "./real10000AuditTestHelpers";

test("output quality audit catches unit semantic failures", () => {
  const result = runReal10000OutputQualitySampleAudit(
    [auditRuntimeResult({ unitSemanticsPassed: false })],
    [auditCase()],
  );

  expect(JSON.stringify(result.holes)).toContain("unit semantics failed");
});
