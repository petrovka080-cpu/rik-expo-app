import fs from "fs";
import path from "path";

describe("AI procurement internal-first Maestro runner", () => {
  it("requires real request discovery, Android installed runtime proof, and exact safe blockers", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/runAiProcurementInternalFirstMaestro.ts"),
      "utf8",
    );

    expect(source).toContain("S_AI_PROCUREMENT_03_INTERNAL_FIRST_SUPPLIER_INTELLIGENCE");
    expect(source).toContain("resolveAiProcurementRuntimeRequest");
    expect(source).toContain("verifyAndroidInstalledBuildRuntime");
    expect(source).toContain("runAiProcurementCopilotMaestro");
    expect(source).toContain("GREEN_AI_PROCUREMENT_INTERNAL_FIRST_INTELLIGENCE_READY");
    expect(source).toContain("BLOCKED_REAL_PROCUREMENT_REQUEST_NOT_AVAILABLE");
    expect(source).toContain("internal_first:");
    expect(source).toContain("external_fetch: false");
    expect(source).toContain("supplier_confirmed: false");
    expect(source).toContain("order_created: false");
    expect(source).toContain("warehouse_mutated: false");
    expect(source).toContain("payment_created: false");
    expect(source).toContain("fake_suppliers_created: false");
    expect(source).toContain("secrets_printed: false");
    expect(source).not.toMatch(/auth\.admin|listUsers|service_role/i);
  });
});
