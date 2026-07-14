import fs from "node:fs";
import path from "node:path";

import {
  buildOfficeRuntimeContext,
  canUseOfficeRoute,
} from "../../src/lib/officeRuntime/officeRuntimePolicy";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("office wrong-role director route blocking contract", () => {
  it("treats foreman or buyer access to director route as a P0 blocker", () => {
    const foreman = buildOfficeRuntimeContext({ userId: "foreman", role: "foreman" });
    const buyer = buildOfficeRuntimeContext({ userId: "buyer", role: "buyer" });
    const director = buildOfficeRuntimeContext({ userId: "director", role: "director" });
    const specSource = read("tests/e2e/officeRoleAuthContextFastRepair.web.spec.ts");

    expect(canUseOfficeRoute({ context: director, requiredRole: "director" })).toBe(true);
    expect(canUseOfficeRoute({ context: foreman, requiredRole: "director" })).toBe(false);
    expect(canUseOfficeRoute({ context: buyer, requiredRole: "director" })).toBe(false);
    expect(canUseOfficeRoute({ context: director, requiredRole: "buyer" })).toBe(false);

    expect(specSource).toContain("foreman_director_route_blocked");
    expect(specSource).toContain("buyer_director_route_blocked");
    expect(specSource).toContain("director_buyer_route_blocked");
    expect(specSource).toContain("anonymous_office_access_blocked");
    expect(specSource).toContain("WRONG_ROLE_DIRECTOR_ROUTE_NOT_BLOCKED");
    expect(specSource).toContain("office-role-guard-blocked");
    expect(specSource).toContain("chromium_chain_passed");
  });
});
