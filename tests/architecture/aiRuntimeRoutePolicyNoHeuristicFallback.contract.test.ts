import { readFileSync } from "fs";
import { join } from "path";
import { buildAiRuntimeRoutePolicyRegistryMatrix } from "../../scripts/ai/verifyAiRuntimeRoutePolicyRegistry";

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("AI runtime route policy heuristic fallback boundary", () => {
  it("keeps budget route classification sourced from the explicit route policy registry", () => {
    const budgetPolicy = read("src/features/ai/agent/agentRuntimeBudgetPolicy.ts");
    const registry = read("src/features/ai/agent/agentRuntimeRoutePolicyRegistry.ts");

    expect(budgetPolicy).toContain("getAgentRuntimeRoutePolicyRegistryEntry");
    expect(budgetPolicy).not.toContain("function classifyAgentRuntimeRoute");
    expect(budgetPolicy).not.toContain("function operationRequiresIdempotency");
    expect(budgetPolicy).not.toContain("function operationRequiresAudit");
    expect(budgetPolicy).not.toContain("function operationEvidencePolicy");
    expect(registry).toContain("AGENT_RUNTIME_ROUTE_POLICY_REGISTRY");
    expect(registry).toContain('policy("agent.procurement.submit_for_approval", "approval_ledger"');
    expect(registry).toContain(
      'policy("agent.procurement.live_supplier_chain.submit_for_approval", "approval_ledger"',
    );
  });

  it("fails closed when a mounted BFF route does not have an explicit policy", () => {
    const matrix = buildAiRuntimeRoutePolicyRegistryMatrix();

    expect(matrix).toMatchObject({
      final_status: "GREEN_AI_RUNTIME_ROUTE_POLICY_REGISTRY_READY",
      all_routes_have_explicit_policy: true,
      no_extra_explicit_route_policies: true,
      no_duplicate_explicit_route_policies: true,
      all_budget_policies_use_explicit_registry: true,
      actual_submit_routes_approval_ledger: true,
      tool_routes_optional_or_blocked_reason: true,
      no_db_writes: true,
      no_direct_database_access: true,
      no_provider_calls: true,
      no_raw_rows: true,
      no_raw_provider_payloads: true,
      no_fake_green: true,
    });
  });
});
