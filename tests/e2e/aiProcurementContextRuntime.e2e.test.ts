import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("AI procurement context Maestro runner", () => {
  it("uses bounded real request discovery and never claims fake data or mutation success", () => {
    const runner = read("scripts/e2e/runAiProcurementContextMaestro.ts");
    const resolver = read("scripts/e2e/resolveAiProcurementRuntimeRequest.ts");

    expect(runner).toContain("runAiProcurementContextMaestro");
    expect(runner).toContain("GREEN_AI_PROCUREMENT_CONTEXT_RUNTIME_READY");
    expect(runner).toContain("BLOCKED_PROCUREMENT_TEST_REQUEST_NOT_AVAILABLE");
    expect(runner).toContain("bounded_buyer_summary_rpc");
    expect(resolver).toContain("buyer_summary_inbox_scope_v1");
    expect(resolver).toContain("p_limit: BUYER_SUMMARY_INBOX_LIMIT");
    expect(resolver).toContain("safeSnapshot");
    expect(runner).toContain("ai.procurement.context.screen");
    expect(runner).toContain("ai.procurement.approval-required");
    expect(runner).toContain("mutations_created: 0");
    expect(runner).toContain("fake_request_created: false");
    expect(runner).toContain("fake_suppliers_created: false");
    expect(runner).toContain("fake_marketplace_data_created: false");
    expect(runner).toContain("fake_external_results_created: false");
    expect(runner).not.toContain("listUsers");
    expect(runner).not.toContain("auth.admin");
    expect(resolver).not.toContain(".listUsers(");
    expect(resolver).not.toContain("auth.admin");
    expect(resolver).not.toContain("from(");
    expect(resolver).not.toContain("select(");
    expect(resolver).not.toContain("insert(");
    expect(resolver).not.toContain("update(");
    expect(resolver).not.toContain("delete(");
    expect(resolver).not.toContain("upsert(");
    expect(runner).not.toContain('"--env"');
    expect(runner).not.toContain('"-e"');
  });
});
