import fs from "node:fs";
import path from "node:path";

import { buildAgentBffShellDecompositionMatrix } from "../../scripts/ai/verifyAgentBffShellDecomposition";
import { AGENT_BFF_ROUTE_DEFINITIONS } from "../../src/features/ai/agent/agentBffRouteShell";

const projectRoot = path.resolve(__dirname, "..", "..");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("Agent BFF shell decomposition", () => {
  it("moves the static route registry out of the shell without changing mounted routes", () => {
    const matrix = buildAgentBffShellDecompositionMatrix();

    expect(matrix.final_status).toBe("GREEN_SCALE_AGENT_BFF_DECOMPOSITION_READY");
    expect(matrix.shell_line_count_before).toBe(3221);
    expect(matrix.shell_line_count_after).toBeLessThan(2500);
    expect(matrix.shell_line_count_reduction).toBeGreaterThanOrEqual(700);
    expect(matrix.registry_line_count_after).toBeLessThanOrEqual(500);
    expect(matrix.route_count).toBe(76);
    expect(matrix.route_count_preserved).toBe(true);
    expect(matrix.route_registry_moved_to_policy_module).toBe(true);
    expect(matrix.shell_reexports_route_definitions).toBe(true);
    expect(matrix.shell_no_inline_route_definition_table).toBe(true);
    expect(matrix.policy_registry_compact).toBe(true);
  });

  it("keeps source guardrails addressable while preserving runtime exports", () => {
    const shell = read("src/features/ai/agent/agentBffRouteShell.ts");
    const registry = read("src/features/ai/agent/agentRuntimeRoutePolicyRegistry.ts");

    expect(shell).toContain(
      'export { AGENT_BFF_ROUTE_DEFINITIONS } from "./agentRuntimeRoutePolicyRegistry";',
    );
    expect(shell).not.toContain("export const AGENT_BFF_ROUTE_DEFINITIONS = Object.freeze([");
    expect(registry).toContain("export const AGENT_BFF_ROUTE_DEFINITIONS = Object.freeze([");
    expect(registry).toContain("function readOnlyAgentBffRoute(");

    for (const route of AGENT_BFF_ROUTE_DEFINITIONS) {
      expect(shell).toContain(route.endpoint);
      expect(shell).toContain(route.operation);
    }
  });

  it("keeps every Agent BFF route auth-required and preview-only", () => {
    for (const route of AGENT_BFF_ROUTE_DEFINITIONS) {
      expect(route).toMatchObject({
        authRequired: true,
        roleFiltered: true,
        mutates: false,
        executesTool: false,
        callsModelProvider: false,
        callsDatabaseDirectly: false,
        exposesForbiddenTools: false,
      });
    }

    expect(new Set(AGENT_BFF_ROUTE_DEFINITIONS.map((route) => route.operation)).size).toBe(
      AGENT_BFF_ROUTE_DEFINITIONS.length,
    );
    expect(new Set(AGENT_BFF_ROUTE_DEFINITIONS.map((route) => route.endpoint)).size).toBe(
      AGENT_BFF_ROUTE_DEFINITIONS.length,
    );
  });

  it("does not add hooks, source-file growth, writes, provider calls, or console output", () => {
    const matrix = buildAgentBffShellDecompositionMatrix();

    expect(matrix.new_route_definition_source_file_added).toBe(false);
    expect(matrix.new_hooks_added).toBe(false);
    expect(matrix.business_logic_changed).toBe(false);
    expect(matrix.db_writes_used).toBe(false);
    expect(matrix.provider_calls_used).toBe(false);
    expect(matrix.raw_rows_printed).toBe(false);
    expect(matrix.secrets_printed).toBe(false);
    expect(matrix.fake_green_claimed).toBe(false);
  });
});
