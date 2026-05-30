import { expectNoReal10000AuditPattern } from "./real10000AuditArchitectureTestHelpers";

test("Real10000 audit wave does not mutate the BOQ compiler", () => {
  expectNoReal10000AuditPattern(/writeFileSync\([^)]*(professionalBoq|boqCompiler|primitiveBoq)/i, "BOQ compiler mutation");
});
