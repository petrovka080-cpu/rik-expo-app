import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("office provisioning production safety contract", () => {
  it("requires an explicit non-production target before service-role writes", () => {
    const source = read("scripts/e2e/provisionOfficeRoleActors.ts");
    const targetCheckIndex = source.indexOf("assertNonProductionTarget(env)");
    const adminClientIndex = source.indexOf("createAdminClient(env)");

    expect(source).toContain("E2E_OFFICE_PROVISIONING_TARGET");
    expect(source).toContain("OFFICE_E2E_PROVISIONING_TARGET");
    expect(source).toContain("E2E_OFFICE_PROVISIONING_ALLOW_NON_PROD");
    expect(source).toContain("BLOCKED_OFFICE_PROVISIONING_LOCAL_TARGET_NOT_DECLARED");
    expect(source).toContain("BLOCKED_OFFICE_PROVISIONING_NON_PROD_ALLOW_FLAG_MISSING");
    expect(source).toContain("BLOCKED_OFFICE_PROVISIONING_PRODUCTION_TARGET_REJECTED");
    expect(source).toContain("BLOCKED_OFFICE_PROVISIONING_LOCAL_TARGET_NOT_LOCALHOST");
    expect(source).toContain("production_db_write_attempted: false");

    expect(targetCheckIndex).toBeGreaterThanOrEqual(0);
    expect(adminClientIndex).toBeGreaterThanOrEqual(0);
    expect(targetCheckIndex).toBeLessThan(adminClientIndex);
    expect(source).not.toMatch(/production["']?\s*\|\s*["']?staging/i);
  });
});
