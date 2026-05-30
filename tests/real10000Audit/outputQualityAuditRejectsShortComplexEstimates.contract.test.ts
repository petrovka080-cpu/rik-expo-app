import { runReal10000OutputQualitySampleAudit } from "../../scripts/audit/real10000EstimateAuditCore";
import { auditCase, auditRuntimeResult } from "./real10000AuditTestHelpers";

test("output quality audit catches undersized complex estimates", () => {
  const result = runReal10000OutputQualitySampleAudit(
    [auditRuntimeResult({ rowCount: 10, complexity: "complex" })],
    [auditCase({ complexity: "complex" })],
  );

  expect(JSON.stringify(result.holes)).toContain("rowCount 10 < 30");
});
