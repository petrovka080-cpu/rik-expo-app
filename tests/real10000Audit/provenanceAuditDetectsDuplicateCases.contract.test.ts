import { runReal10000ProvenanceAudit } from "../../scripts/audit/real10000EstimateAuditCore";
import { auditCase } from "./real10000AuditTestHelpers";

test("provenance audit rejects duplicate/padded cases", () => {
  const result = runReal10000ProvenanceAudit([
    auditCase({ caseId: "dup_case" }),
    auditCase({ caseId: "dup_case" }),
  ]);

  expect(result.holes.map((hole) => hole.classification)).toContain("DUPLICATE_CASE_IDS");
});
