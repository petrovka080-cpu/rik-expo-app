import fs from "node:fs";
import path from "node:path";

import { buildAgentBffProcurementOwnerSplitMatrix } from "../../scripts/ai/verifyAgentBffProcurementOwnerSplit";
import {
  AGENT_BFF_ROUTE_DEFINITIONS,
  AGENT_PROCUREMENT_BFF_CONTRACT,
  getAgentProcurementRequestContext,
  previewAgentProcurementCopilotSubmitForApproval,
} from "../../src/features/ai/agent/agentBffRouteShell";

const projectRoot = path.resolve(__dirname, "..", "..");
const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;

function read(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("Agent BFF procurement owner split", () => {
  it("moves procurement route ownership out of the shell", () => {
    const matrix = buildAgentBffProcurementOwnerSplitMatrix();

    expect(matrix.final_status).toBe(
      "GREEN_SCALE_AGENT_BFF_PROCUREMENT_OWNER_SPLIT_READY",
    );
    expect(matrix.shell_line_count_before_wave).toBe(1720);
    expect(matrix.shell_line_count_after).toBeLessThanOrEqual(900);
    expect(matrix.shell_line_count_reduction).toBeGreaterThanOrEqual(850);
    expect(matrix.procurement_module_line_count).toBeLessThanOrEqual(1100);
    expect(matrix.procurement_owner_module_added).toBe(true);
    expect(matrix.shell_reexports_procurement_contract).toBe(true);
    expect(matrix.shell_reexports_procurement_functions).toBe(true);
    expect(matrix.shell_reexports_procurement_types).toBe(true);
    expect(matrix.shell_no_inline_procurement_contract).toBe(true);
    expect(matrix.shell_no_inline_procurement_functions).toBe(true);
    expect(matrix.procurement_module_owns_contract).toBe(true);
    expect(matrix.procurement_module_owns_functions).toBe(true);
  });

  it("keeps public shell imports and preview-only procurement behavior stable", () => {
    expect(AGENT_PROCUREMENT_BFF_CONTRACT).toMatchObject({
      contractId: "agent_procurement_bff_v1",
      readOnly: true,
      roleScoped: true,
      evidenceBacked: true,
      mutationCount: 0,
      directDatabaseAccess: 0,
      modelProviderImports: 0,
      externalLiveFetchEnabled: false,
      finalActionExecutionEnabled: false,
      supplierSelectionFinalized: false,
    });

    expect(
      getAgentProcurementRequestContext({
        auth: buyerAuth,
        requestId: "request-1",
        screenId: "buyer.requests",
        requestSnapshot: {
          requestId: "request-1",
          projectId: "project-1",
          projectTitle: "Tower A",
          location: "Bishkek",
          items: [{ materialLabel: "Cement M400", quantity: 12, unit: "bag" }],
        },
      }),
    ).toMatchObject({
      ok: true,
      data: {
        endpoint: "GET /agent/procurement/request-context/:requestId",
        readOnly: true,
        mutationCount: 0,
        providerCalled: false,
        dbAccessedDirectly: false,
      },
    });

    expect(
      previewAgentProcurementCopilotSubmitForApproval({
        auth: buyerAuth,
        input: {
          draftId: "draft-1",
          requestIdHash: "request_hash",
          screenId: "buyer.procurement",
          summary: "Ready for approval.",
          idempotencyKey: "idem-1",
          evidenceRefs: ["internal_app:request:hash"],
        },
      }),
    ).toMatchObject({
      ok: true,
      data: {
        endpoint: "POST /agent/procurement/copilot/submit-for-approval-preview",
        approvalRequired: true,
        mutationCount: 0,
        providerCalled: false,
        dbAccessedDirectly: false,
        result: {
          status: "blocked",
          blocker: "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_READY",
          persisted: false,
          mutationCount: 0,
          finalExecution: 0,
        },
      },
    });
  });

  it("preserves route registry safety and shell source guard hints", () => {
    const matrix = buildAgentBffProcurementOwnerSplitMatrix();
    const shell = read("src/features/ai/agent/agentBffRouteShell.ts");
    const procurementModule = read("src/features/ai/agent/agentProcurementRoutes.ts");

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

    expect(shell).toContain('from "./agentProcurementRoutes"');
    expect(shell).not.toContain("export const AGENT_PROCUREMENT_BFF_CONTRACT = Object.freeze(");
    expect(shell).not.toContain("export function getAgentProcurementRequestContext(");
    expect(shell).not.toContain("export async function previewAgentProcurementLiveSupplierChain(");
    expect(procurementModule).toContain(
      "export const AGENT_PROCUREMENT_BFF_CONTRACT = Object.freeze(",
    );
    expect(procurementModule).toContain("export function getAgentProcurementRequestContext(");
    expect(procurementModule).toContain(
      "export async function previewAgentProcurementLiveSupplierChain(",
    );

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
    const matrix = buildAgentBffProcurementOwnerSplitMatrix();

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
