import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("AI procurement external intel Maestro runner", () => {
  it("uses explicit credentials, bounded real request discovery, and no fake external data", () => {
    const runner = read("scripts/e2e/runAiProcurementExternalIntelMaestro.ts");
    const resolver = read("scripts/e2e/resolveAiProcurementRuntimeRequest.ts");

    expect(runner).toContain("runAiProcurementExternalIntelMaestro");
    expect(runner).toContain("resolveAiProcurementRuntimeRequest");
    expect(runner).toContain("createExternalIntelGateway");
    expect(runner).toContain("PROCUREMENT_EXTERNAL_SOURCE_POLICY_IDS");
    expect(runner).toContain('id: "ai.procurement.internal-first"');
    expect(runner).toContain('id: "ai.procurement.external.status"');
    expect(runner).toContain('id: "ai.procurement.approval-required"');
    expect(read("app/(tabs)/ai.tsx")).toContain("procurementExternalIntel");
    expect(read("src/features/ai/procurementCopilot/ProcurementCopilotRuntimeSurface.tsx")).toContain(
      'testID="ai.procurement.external.status"',
    );
    expect(runner).toContain("mutations_created: 0");
    expect(runner).toContain("fake_external_results_created: false");
    expect(runner).toContain("fake_suppliers_created: false");
    expect(runner).toContain("roleAuth.separate_role_users_required && !roleAuth.allRolesResolved");
    expect(runner).toContain("role_auth_source: roleAuth.source");
    expect(runner).toContain("credentials_in_cli_args: false");
    expect(runner).toContain("redactE2eSecrets");
    expect(runner).not.toMatch(/auth\.admin|listUsers|service_role|AI_EXTERNAL_INTEL_SEARCH_API_KEY/i);

    expect(resolver).toContain("buyer_summary_inbox_scope_v1");
    expect(resolver).toContain("p_limit: BUYER_SUMMARY_INBOX_LIMIT");
    expect(resolver).toContain("safeSnapshot");
    expect(resolver).not.toMatch(/auth\.admin|\.listUsers\s*\(|service_role|fakeRequestCreated:\s*true/i);
  });
});
