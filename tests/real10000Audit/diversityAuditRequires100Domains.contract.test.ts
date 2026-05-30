import { runReal10000DiversityAudit } from "../../scripts/audit/real10000EstimateAuditCore";
import { auditCase } from "./real10000AuditTestHelpers";

test("diversity audit requires at least 100 domains", () => {
  const result = runReal10000DiversityAudit([auditCase({ domain: "only_one_domain" })]);

  expect(result.holes.map((hole) => hole.classification)).toContain("DOMAIN_COVERAGE_LOW");
});
