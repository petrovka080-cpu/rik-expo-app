import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("office auth RBAC weakening guard", () => {
  it("keeps the shared guard enabled and avoids route-specific fake auth", () => {
    const runtimeSource = read("src/lib/officeRuntime/officeRuntimeContext.tsx");
    const routeSources = [
      read("app/(tabs)/office/foreman.tsx"),
      read("app/(tabs)/office/director.tsx"),
      read("app/(tabs)/office/buyer.tsx"),
    ].join("\n");

    expect(runtimeSource).toContain("canUseOfficeRoute");
    expect(runtimeSource).toContain("getSessionSafe");
    expect(runtimeSource).toContain("resolveCurrentSessionRole");
    expect(runtimeSource).toContain("loadDeveloperOverrideContext");
    expect(routeSources.match(/requiredRole="/g)?.length).toBe(3);

    const combined = `${runtimeSource}\n${routeSources}`;
    expect(combined).not.toMatch(/routeGuardsDisabled|rbacDisabled|skipRbac|fakeGreen/);
    expect(combined).not.toMatch(/directorOnlyFakeAuth|buyerOnlyFakeAuth|foremanOnlyBypass/);
  });
});
