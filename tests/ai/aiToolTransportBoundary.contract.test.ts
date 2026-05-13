import {
  listAiRuntimeTransportContracts,
  listAiToolTransportContracts,
} from "../../src/features/ai/tools/transport/aiToolTransportTypes";
import { readTaskStreamTransport } from "../../src/features/ai/tools/transport/taskStream.transport";

describe("AI tool transport boundary contracts", () => {
  it("covers tool and runtime routes with bounded DTO contracts", () => {
    expect(listAiToolTransportContracts().map((contract) => contract.toolName)).toEqual([
      "search_catalog",
      "compare_suppliers",
      "get_warehouse_status",
      "get_finance_summary",
      "draft_request",
      "draft_report",
      "draft_act",
      "submit_for_approval",
      "get_action_status",
    ]);
    expect(listAiRuntimeTransportContracts().map((contract) => contract.runtimeName)).toEqual([
      "task_stream",
      "command_center",
      "procurement_copilot",
      "external_intel",
      "screen_runtime",
      "approval_inbox",
      "approved_executor",
    ]);

    for (const contract of [
      ...listAiToolTransportContracts(),
      ...listAiRuntimeTransportContracts(),
    ]) {
      expect(contract).toMatchObject({
        boundedRequest: true,
        dtoOnly: true,
        redactionRequired: true,
        uiImportAllowed: false,
        modelProviderImportAllowed: false,
      });
    }
  });

  it("returns evidence refs or an exact blocked reason from runtime transport", () => {
    const result = readTaskStreamTransport({
      auth: { userId: "buyer:test", role: "buyer" },
      input: {
        screen_id: "ai.command.center",
        limit: 5,
      },
    });

    expect(result).toMatchObject({
      routeScope: "agent.task_stream.read",
      boundedRequest: true,
      dtoOnly: true,
      rawRowsExposed: false,
      rawProviderPayloadExposed: false,
      mutationCount: 0,
    });
    expect(result.evidenceRefs.length > 0 || result.blockedReason !== null || result.status === "empty").toBe(true);
  });
});
