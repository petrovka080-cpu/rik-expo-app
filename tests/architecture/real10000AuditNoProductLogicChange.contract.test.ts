import { expectNoReal10000AuditPattern } from "./real10000AuditArchitectureTestHelpers";

test("Real10000 audit wave does not write product logic", () => {
  expectNoReal10000AuditPattern(/writeFileSync\([^)]*src\/|writeFileSync\([^)]*app\//, "product logic write");
});
