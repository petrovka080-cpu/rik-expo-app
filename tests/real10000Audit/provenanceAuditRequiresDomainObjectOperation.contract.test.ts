import { runReal10000ProvenanceAudit } from "../../scripts/audit/real10000EstimateAuditCore";
import { auditCase } from "./real10000AuditTestHelpers";

test("provenance audit requires domain/object/operation on all cases", () => {
  const result = runReal10000ProvenanceAudit([
    auditCase({ domain: "", expectedObject: "", expectedOperation: "" }),
  ]);

  expect(result.holes.map((hole) => hole.classification)).toContain("MISSING_DOMAIN_OBJECT_OPERATION_OR_REQUIRED_FIELDS");
});
