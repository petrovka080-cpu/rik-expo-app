import { expectNoReal10000AuditPattern } from "./real10000AuditArchitectureTestHelpers";

test("Real10000 audit wave does not mutate UI code", () => {
  expectNoReal10000AuditPattern(/writeFileSync\([^)]*(app\/|screens\/|features\/.*Screen)/i, "UI mutation");
});
