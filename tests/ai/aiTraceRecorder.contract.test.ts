import {
  createAiTraceRecorder,
  recordAiTraceEvent,
} from "../../src/features/ai/observability/aiTraceRecorder";
import { exportAiTraceEvents } from "../../src/features/ai/observability/aiTraceExportPolicy";

describe("AI trace recorder", () => {
  it("records redacted trace events for the AI execution chain", () => {
    const emitted: unknown[] = [];
    const recorder = createAiTraceRecorder({ emit: (event) => emitted.push(event) });

    recorder.record({
      eventName: "ai.tool.plan.created",
      role: "buyer",
      domain: "procurement",
      screenId: "buyer.procurement",
      toolName: "draft_request",
      outcome: "allowed",
      evidenceRefs: ["evidence:plan:1"],
      attributes: { planSize: 2 },
      createdAt: "2026-05-13T12:00:00.000Z",
    });
    recorder.record({
      eventName: "ai.tool.transport.called",
      role: "buyer",
      domain: "procurement",
      toolName: "draft_request",
      outcome: "read_only",
      evidenceRefs: ["evidence:transport:1"],
      attributes: { transport: "draftRequest.transport" },
      createdAt: "2026-05-13T12:00:01.000Z",
    });

    expect(recorder.list()).toHaveLength(2);
    expect(emitted).toHaveLength(2);
    expect(recorder.list()[0]).toMatchObject({
      eventName: "ai.tool.plan.created",
      redacted: true,
      rawPromptExposed: false,
      rawProviderPayloadExposed: false,
      rawDbRowsExposed: false,
      credentialsExposed: false,
    });

    const exported = exportAiTraceEvents(recorder.flush(), "2026-05-13T12:00:02.000Z");
    expect(exported).toMatchObject({
      eventCount: 2,
      redacted: true,
      rawPromptExposed: false,
      rawProviderPayloadExposed: false,
      rawDbRowsExposed: false,
      credentialsExposed: false,
    });
    expect(recorder.list()).toHaveLength(0);
  });

  it("records approval and execution outcomes with evidence refs or blocked reason", () => {
    const submitted = recordAiTraceEvent({
      eventName: "ai.approval.submitted",
      role: "buyer",
      domain: "procurement",
      actionIdHash: "action:hash",
      outcome: "allowed",
      evidenceRefs: ["evidence:approval:1"],
    });
    const blocked = recordAiTraceEvent({
      eventName: "ai.action.blocked",
      role: "director",
      domain: "procurement",
      actionIdHash: "action:hash",
      outcome: "blocked",
      blockedReason: "BLOCKED_LEDGER_RPC_NOT_MOUNTED",
    });

    expect(submitted.evidenceRefs).toEqual(["evidence:approval:1"]);
    expect(blocked.blockedReason).toBe("BLOCKED_LEDGER_RPC_NOT_MOUNTED");
  });
});
