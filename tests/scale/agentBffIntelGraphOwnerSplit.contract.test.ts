import fs from "node:fs";
import path from "node:path";

import { buildAgentBffIntelGraphOwnerSplitMatrix } from "../../scripts/ai/verifyAgentBffIntelGraphOwnerSplit";
import {
  AGENT_APP_GRAPH_BFF_CONTRACT,
  AGENT_BFF_ROUTE_DEFINITIONS,
  AGENT_EXTERNAL_INTEL_BFF_CONTRACT,
  compareAgentIntel,
  getAgentAppGraphScreen,
  previewAgentExternalIntelCitedSearch,
} from "../../src/features/ai/agent/agentBffRouteShell";

const projectRoot = path.resolve(__dirname, "..", "..");
const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;

function read(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("Agent BFF intel graph owner split", () => {
  it("moves app graph and external intel route ownership out of the shell", () => {
    const matrix = buildAgentBffIntelGraphOwnerSplitMatrix();

    expect(matrix.final_status).toBe(
      "GREEN_SCALE_AGENT_BFF_INTEL_GRAPH_OWNER_SPLIT_READY",
    );
    expect(matrix.shell_line_count_before_wave).toBe(2218);
    expect(matrix.shell_line_count_after).toBeLessThanOrEqual(1800);
    expect(matrix.shell_line_count_reduction).toBeGreaterThanOrEqual(450);
    expect(matrix.intel_graph_module_line_count).toBeLessThanOrEqual(650);
    expect(matrix.intel_graph_owner_module_added).toBe(true);
    expect(matrix.shell_reexports_app_graph_contract).toBe(true);
    expect(matrix.shell_reexports_external_intel_contract).toBe(true);
    expect(matrix.shell_reexports_intel_graph_functions).toBe(true);
    expect(matrix.shell_reexports_intel_graph_types).toBe(true);
    expect(matrix.shell_no_inline_app_graph_contract).toBe(true);
    expect(matrix.shell_no_inline_external_intel_contract).toBe(true);
    expect(matrix.shell_no_inline_intel_graph_functions).toBe(true);
    expect(matrix.intel_graph_module_owns_app_graph_contract).toBe(true);
    expect(matrix.intel_graph_module_owns_external_intel_contract).toBe(true);
    expect(matrix.intel_graph_module_owns_functions).toBe(true);
  });

  it("keeps public shell imports and preview-only behavior stable", async () => {
    expect(AGENT_APP_GRAPH_BFF_CONTRACT).toMatchObject({
      contractId: "agent_app_graph_bff_v1",
      readOnly: true,
      roleScoped: true,
      evidenceBacked: true,
      mutationCount: 0,
      directDatabaseAccess: 0,
      modelProviderImports: 0,
      externalLiveFetchEnabled: false,
      executionEnabled: false,
    });
    expect(AGENT_EXTERNAL_INTEL_BFF_CONTRACT).toMatchObject({
      contractId: "agent_external_intel_bff_v1",
      liveEnabled: false,
      provider: "disabled",
      readOnly: true,
      mutationCount: 0,
      directDatabaseAccess: 0,
      modelProviderImports: 0,
      finalActionAllowed: false,
      supplierConfirmationAllowed: false,
      orderCreationAllowed: false,
    });

    expect(getAgentAppGraphScreen({ auth: buyerAuth, screenId: "buyer.main" })).toMatchObject({
      ok: true,
      data: {
        endpoint: "GET /agent/app-graph/screen/:screenId",
        mutationCount: 0,
        providerCalled: false,
        dbAccessedDirectly: false,
      },
    });
    expect(
      compareAgentIntel({
        auth: buyerAuth,
        input: {
          domain: "procurement",
          internalEvidenceRefs: ["internal:request:1"],
          query: "cement supplier options",
          sourcePolicyIds: ["supplier_public_catalog.default"],
        },
      }),
    ).toMatchObject({
      ok: true,
      data: {
        endpoint: "POST /agent/intel/compare",
        mutationCount: 0,
        providerCalled: false,
        dbAccessedDirectly: false,
        result: { providerCalled: false, externalLiveFetchEnabled: false },
      },
    });
    await expect(
      previewAgentExternalIntelCitedSearch({
        auth: buyerAuth,
        input: {
          domain: "procurement",
          query: "cement suppliers",
          internalEvidenceRefs: ["internal_app:request:1"],
          marketplaceChecked: true,
          sourcePolicyIds: ["supplier_public_catalog.default"],
          limit: 5,
        },
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        endpoint: "POST /agent/external-intel/cited-search-preview",
        mutationCount: 0,
        dbAccessedDirectly: false,
        result: {
          previewOnly: true,
          supplierConfirmed: false,
          orderCreated: false,
          mutationCount: 0,
          providerCalled: false,
        },
      },
    });
  });

  it("preserves route registry safety and shell source guard hints", () => {
    const matrix = buildAgentBffIntelGraphOwnerSplitMatrix();
    const shell = read("src/features/ai/agent/agentBffRouteShell.ts");
    const intelGraphModule = read("src/features/ai/agent/agentIntelGraphRoutes.ts");

    expect(matrix.route_count).toBe(76);
    expect(matrix.route_count_preserved).toBe(true);
    expect(matrix.route_operations_unique).toBe(true);
    expect(matrix.route_endpoints_unique).toBe(true);
    expect(matrix.all_routes_auth_required).toBe(true);
    expect(matrix.all_routes_role_filtered).toBe(true);
    expect(matrix.all_routes_read_only).toBe(true);
    expect(matrix.all_routes_no_tool_execution).toBe(true);
    expect(matrix.all_routes_no_provider_calls).toBe(true);
    expect(matrix.all_routes_no_direct_database_access).toBe(true);
    expect(matrix.source_guard_hints_preserved).toBe(true);

    expect(shell).toContain('from "./agentIntelGraphRoutes"');
    expect(shell).not.toContain("export const AGENT_APP_GRAPH_BFF_CONTRACT = Object.freeze(");
    expect(shell).not.toContain("export const AGENT_EXTERNAL_INTEL_BFF_CONTRACT = Object.freeze(");
    expect(shell).not.toContain("export function compareAgentIntel(");
    expect(intelGraphModule).toContain("export const AGENT_APP_GRAPH_BFF_CONTRACT = Object.freeze(");
    expect(intelGraphModule).toContain("export const AGENT_EXTERNAL_INTEL_BFF_CONTRACT = Object.freeze(");
    expect(intelGraphModule).toContain("export function compareAgentIntel(");

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
  });

  it("adds no hooks, UI shims, writes, provider calls, raw logging, or fake green", () => {
    const matrix = buildAgentBffIntelGraphOwnerSplitMatrix();

    expect(matrix.no_hooks_added).toBe(true);
    expect(matrix.no_ui_changes).toBe(true);
    expect(matrix.business_logic_changed).toBe(false);
    expect(matrix.db_writes_used).toBe(false);
    expect(matrix.provider_calls_used).toBe(false);
    expect(matrix.raw_rows_printed).toBe(false);
    expect(matrix.secrets_printed).toBe(false);
    expect(matrix.fake_green_claimed).toBe(false);
  });
});
