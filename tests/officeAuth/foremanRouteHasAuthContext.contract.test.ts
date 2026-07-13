import fs from "node:fs";
import path from "node:path";

import {
  buildOfficeRuntimeContext,
  canUseOfficeRoute,
  hasOfficeRuntimePermission,
} from "../../src/lib/officeRuntime/officeRuntimePolicy";

const readRoute = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("foreman office route auth context", () => {
  it("mounts behind the shared foreman office role context", () => {
    const source = readRoute("app/(tabs)/office/foreman.tsx");

    expect(source).toContain("OfficeRoleAuthContextGate");
    expect(source).toContain('requiredRole="foreman"');
    expect(source).toContain('route="/office/foreman"');
    expect(source).not.toMatch(/directorOnlyFakeAuth|foremanOnlyBypass|buyerOnlyFakeAuth/);
  });

  it("builds a foreman runtime context with request draft permission", () => {
    const context = buildOfficeRuntimeContext({
      userId: "foreman-user",
      role: "foreman",
    });

    expect(context.authReady).toBe(true);
    expect(canUseOfficeRoute({ context, requiredRole: "foreman" })).toBe(true);
    expect(hasOfficeRuntimePermission(context, "office:request:submit")).toBe(true);
  });
});
