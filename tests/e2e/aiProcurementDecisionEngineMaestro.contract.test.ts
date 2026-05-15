import fs from "fs";
import path from "path";

describe("AI procurement decision engine Maestro runner", () => {
  it("requires real request discovery, internal evidence, approval route, and runtime targetability", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/runAiProcurementDecisionEngineMaestro.ts"),
      "utf8",
    );

    expect(source).toContain("S_AI_PROCUREMENT_04_INTERNAL_FIRST_DECISION_ENGINE");
    expect(source).toContain("resolveAiProcurementRuntimeRequest");
    expect(source).toContain("verifyAndroidInstalledBuildRuntime");
    expect(source).toContain("runAiProcurementCopilotMaestro");
    expect(source).toContain("runAiProcurementDecisionEngine");
    expect(source).toContain("GREEN_AI_PROCUREMENT_INTERNAL_FIRST_DECISION_ENGINE_READY");
    expect(source).toContain("BLOCKED_AI_PROCUREMENT_INTERNAL_EVIDENCE_MISSING");
    expect(source).toContain("BLOCKED_AI_PROCUREMENT_APPROVAL_ROUTE_MISSING");
    expect(source).toContain("BLOCKED_AI_PROCUREMENT_RUNTIME_TARGETABILITY");
    expect(source).toContain("internal_first:");
    expect(source).toContain("external_fetch: false");
    expect(source).toContain("supplier_confirmed: false");
    expect(source).toContain("order_created: false");
    expect(source).toContain("warehouse_mutated: false");
    expect(source).toContain("payment_created: false");
    expect(source).toContain("fake_suppliers_created: false");
    expect(source).toContain("fake_green_claimed: false");
    expect(source).not.toMatch(/auth\.admin|listUsers|service_role/i);
    expect(source).not.toMatch(/fake supplier card|hardcoded AI response/i);
  });
});
