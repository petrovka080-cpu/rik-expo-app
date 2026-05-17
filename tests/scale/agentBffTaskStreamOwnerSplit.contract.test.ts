import fs from "node:fs";
import path from "node:path";

import { buildAgentBffTaskStreamOwnerSplitMatrix } from "../../scripts/ai/verifyAgentBffTaskStreamOwnerSplit";
import {
  AGENT_BFF_ROUTE_DEFINITIONS,
  AGENT_TASK_STREAM_BFF_CONTRACT,
  getAgentTaskStream,
} from "../../src/features/ai/agent/agentBffRouteShell";

const projectRoot = path.resolve(__dirname, "..", "..");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("Agent BFF task-stream owner split", () => {
  it("moves task-stream route ownership out of the shell without changing the public shell export", () => {
    const matrix = buildAgentBffTaskStreamOwnerSplitMatrix();

    expect(matrix.final_status).toBe(
      "GREEN_SCALE_AGENT_BFF_TASK_STREAM_OWNER_SPLIT_READY",
    );
    expect(matrix.shell_line_count_before_wave).toBe(2442);
    expect(matrix.shell_line_count_after).toBeLessThanOrEqual(2250);
    expect(matrix.shell_line_count_reduction).toBeGreaterThanOrEqual(180);
    expect(matrix.task_stream_owner_module_added).toBe(true);
    expect(matrix.shell_reexports_task_stream_contract).toBe(true);
    expect(matrix.shell_reexports_task_stream_function).toBe(true);
    expect(matrix.shell_reexports_task_stream_types).toBe(true);
    expect(matrix.shell_no_inline_task_stream_contract).toBe(true);
    expect(matrix.shell_no_inline_task_stream_function).toBe(true);
    expect(matrix.task_stream_module_owns_contract).toBe(true);
    expect(matrix.task_stream_module_owns_function).toBe(true);
  });

  it("keeps the task-stream BFF contract and runtime behavior stable", () => {
    expect(AGENT_TASK_STREAM_BFF_CONTRACT).toMatchObject({
      contractId: "agent_task_stream_bff_v1",
      endpoint: "GET /agent/task-stream",
      readOnly: true,
      paginated: true,
      roleScoped: true,
      evidenceBacked: true,
      mutationCount: 0,
      directDatabaseAccess: 0,
      modelProviderImports: 0,
      executionEnabled: false,
    });

    const result = getAgentTaskStream({
      auth: { userId: "director-user", role: "director" },
      sourceCards: [
        {
          id: "task-stream-owner-split-proof",
          type: "recommended_next_action",
          title: "Review closeout evidence",
          summary: "Evidence-backed task remains visible through the shell export",
          domain: "control",
          priority: "normal",
          createdAt: "2026-05-12T09:00:00.000Z",
          evidenceRefs: ["task-stream:owner-split:redacted"],
          scope: { kind: "cross_domain" },
        },
      ],
      page: { limit: 1 },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        endpoint: "GET /agent/task-stream",
        mutationCount: 0,
        readOnly: true,
        providerCalled: false,
        dbAccessedDirectly: false,
        page: { limit: 1, cursor: null, nextCursor: null },
      },
    });
  });

  it("preserves route registry safety while preventing shell ownership regression", () => {
    const matrix = buildAgentBffTaskStreamOwnerSplitMatrix();
    const shell = read("src/features/ai/agent/agentBffRouteShell.ts");
    const taskStreamModule = read("src/features/ai/agent/agentTaskStreamRoutes.ts");

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

    expect(shell).toContain('from "./agentTaskStreamRoutes"');
    expect(shell).not.toContain(
      "export const AGENT_TASK_STREAM_BFF_CONTRACT = Object.freeze(",
    );
    expect(shell).not.toContain("export function getAgentTaskStream(");
    expect(taskStreamModule).toContain(
      "export const AGENT_TASK_STREAM_BFF_CONTRACT = Object.freeze(",
    );
    expect(taskStreamModule).toContain("export function getAgentTaskStream(");

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
    const matrix = buildAgentBffTaskStreamOwnerSplitMatrix();

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
