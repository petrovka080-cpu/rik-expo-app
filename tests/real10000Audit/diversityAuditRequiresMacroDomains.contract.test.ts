import { runReal10000DiversityAudit } from "../../scripts/audit/real10000EstimateAuditCore";
import { auditCase } from "./real10000AuditTestHelpers";

test("diversity audit requires at least 9 macro-domains", () => {
  const result = runReal10000DiversityAudit([auditCase()]);

  expect(result.holes.map((hole) => hole.classification)).toContain("MACRO_DOMAIN_COVERAGE_LOW");
});
