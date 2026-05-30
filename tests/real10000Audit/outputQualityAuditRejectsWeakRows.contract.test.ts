import { runReal10000OutputQualitySampleAudit } from "../../scripts/audit/real10000EstimateAuditCore";
import { auditCase, auditRuntimeResult } from "./real10000AuditTestHelpers";

test("output quality audit catches generic rows", () => {
  const result = runReal10000OutputQualitySampleAudit(
    [auditRuntimeResult({ forbiddenRowsFound: ["прочее"] })],
    [auditCase()],
  );

  expect(result.holes.map((hole) => hole.classification)).toContain("OUTPUT_QUALITY_SAMPLE_FAILED");
});
