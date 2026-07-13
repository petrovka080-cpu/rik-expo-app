import fs from "node:fs";
import path from "node:path";

import {
  buildOfficeRuntimeContext,
  canUseOfficeRoute,
  hasOfficeRuntimePermission,
} from "../../src/lib/officeRuntime/officeRuntimePolicy";

const readRoute = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("director office route auth context", () => {
  it("mounts behind the shared director office role context", () => {
    const source = readRoute("app/(tabs)/office/director.tsx");

    expect(source).toContain("OfficeRoleAuthContextGate");
    expect(source).toContain('requiredRole="director"');
    expect(source).toContain('route="/office/director"');
    expect(source).not.toMatch(/directorOnlyFakeAuth|foremanOnlyBypass|buyerOnlyFakeAuth/);
  });

  it("builds a director runtime context with approval permission", () => {
    const context = buildOfficeRuntimeContext({
      userId: "director-user",
      role: "director",
    });

    expect(context.authReady).toBe(true);
    expect(canUseOfficeRoute({ context, requiredRole: "director" })).toBe(true);
    expect(hasOfficeRuntimePermission(context, "office:request:approve")).toBe(true);
  });
});
