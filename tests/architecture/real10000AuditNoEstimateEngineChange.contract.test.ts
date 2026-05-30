import { expectNoReal10000AuditPattern } from "./real10000AuditArchitectureTestHelpers";

test("Real10000 audit wave does not mutate the estimate engine", () => {
  expectNoReal10000AuditPattern(/writeFileSync\([^)]*estimatorKernel|apply_patch.*estimatorKernel/i, "estimate engine mutation");
});
