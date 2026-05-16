import { readFileSync } from "fs";
import { join } from "path";
import { buildAiRuntimeTransportRegistryHardeningMatrix } from "../../scripts/ai/verifyAiRuntimeTransportRegistryHardening";

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("AI runtime transport registry drift boundary", () => {
  it("keeps domain runtime prefix mapping centralized in the registry", () => {
    const registry = read("src/features/ai/agent/agentRuntimeTransportRegistry.ts");
    const gateway = read("src/features/ai/agent/agentRuntimeGateway.ts");
    const closeoutVerifier = read("scripts/ai/verifyAiDomainRuntimeTransportCloseout.ts");

    expect(registry).toContain("AI_EXPLICIT_DOMAIN_RUNTIME_TRANSPORT_GROUPS");
    expect(gateway).toContain("resolveAgentRuntimeTransportName");
    expect(gateway).not.toMatch(/operation\.startsWith\("agent\.(documents|construction_knowhow|finance|warehouse|field)\./);
    expect(closeoutVerifier).toContain("AI_EXPLICIT_DOMAIN_RUNTIME_TRANSPORT_GROUPS");
    expect(closeoutVerifier).not.toMatch(/operationPrefix:\s*"agent\.(documents|construction_knowhow|finance|warehouse|field)\./);
  });

  it("fails closed if gateway mounts drift from the runtime transport registry", () => {
    const matrix = buildAiRuntimeTransportRegistryHardeningMatrix();

    expect(matrix).toMatchObject({
      final_status: "GREEN_AI_RUNTIME_TRANSPORT_REGISTRY_HARDENING_READY",
      all_registry_runtime_contracts_mounted: true,
      all_registry_boundaries_aligned: true,
      all_gateway_mounts_match_registry: true,
      no_domain_command_center_fallback: true,
      all_domain_groups_explicit: true,
      no_db_writes: true,
      no_direct_database_access: true,
      no_provider_calls: true,
      no_raw_rows: true,
      no_raw_provider_payloads: true,
      no_fake_green: true,
    });
  });
});
