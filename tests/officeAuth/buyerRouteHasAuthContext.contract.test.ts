import fs from "node:fs";
import path from "node:path";

import {
  buildOfficeRuntimeContext,
  canUseOfficeRoute,
  hasOfficeRuntimePermission,
} from "../../src/lib/officeRuntime/officeRuntimePolicy";

const readRoute = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("buyer office route auth context", () => {
  it("mounts behind the shared buyer office role context", () => {
    const source = readRoute("app/(tabs)/office/buyer.tsx");

    expect(source).toContain("OfficeRoleAuthContextGate");
    expect(source).toContain('requiredRole="buyer"');
    expect(source).toContain('route="/office/buyer"');
    expect(source).not.toMatch(/directorOnlyFakeAuth|foremanOnlyBypass|buyerOnlyFakeAuth/);
  });

  it("builds a buyer runtime context with procurement permission", () => {
    const context = buildOfficeRuntimeContext({
      userId: "buyer-user",
      role: "buyer",
    });

    expect(context.authReady).toBe(true);
    expect(canUseOfficeRoute({ context, requiredRole: "buyer" })).toBe(true);
    expect(hasOfficeRuntimePermission(context, "office:procurement:create")).toBe(true);
  });
});
