import { getAgentTaskStream } from "../../src/features/ai/agent/agentBffRouteShell";
import {
  AI_TASK_STREAM_RUNTIME_CONTRACT,
  loadAiTaskStreamRuntime,
} from "../../src/features/ai/taskStream/aiTaskStreamRuntime";

const directorAuth = { userId: "director-user", role: "director" } as const;

const runtimeEvidence = {
  warehouse: {
    summary: "Two materials need stock review from safe-read warehouse evidence.",
    evidenceRefs: ["warehouse:stock:item:1"],
    lowStockFlags: ["reserved_pressure:cement"],
  },
  finance: {
    summary: "Debt and overdue buckets are present in redacted finance summary.",
    evidenceRefs: ["finance:summary:totals"],
    riskFlags: ["debt_present", "overdue_debt_present"],
    debtAmount: 1200,
    overdueCount: 1,
  },
  drafts: [
    {
      draftId: "request-1",
      draftKind: "request" as const,
      domain: "procurement" as const,
      summary: "Request draft is ready for approval review.",
      evidenceRefs: ["draft:request:1"],
      sourceScreenId: "buyer.main",
    },
  ],
  approvals: [
    {
      actionId: "approval-1",
      domain: "documents" as const,
      screenId: "reports.modal",
      summary: "Document approval is pending.",
      evidenceRefs: ["approval:document:1"],
    },
  ],
  procurement: {
    summary: "Materials have supplier comparison evidence.",
    materialIds: ["material-1"],
    evidenceRefs: ["procurement:material:1"],
    sourceScreenId: "buyer.main",
  },
};

describe("AI task stream runtime", () => {
  it("exposes the permanent read-only runtime contract", () => {
    expect(AI_TASK_STREAM_RUNTIME_CONTRACT).toMatchObject({
      route: "GET /agent/task-stream",
      roleScoped: true,
      evidenceBacked: true,
      readOnly: true,
      mutationCount: 0,
      directMutationAllowed: false,
      providerCalled: false,
      rawDbRowsExposed: false,
      rawPromptExposed: false,
      fakeCards: false,
      hardcodedAiResponse: false,
      unknownRoleDenyByDefault: true,
    });
  });

  it("returns loaded, empty, and blocked statuses without fake cards", () => {
    const loaded = loadAiTaskStreamRuntime({
      auth: directorAuth,
      screenId: "ai.command.center",
      evidence: runtimeEvidence,
      nowIso: "2026-05-12T10:00:00.000Z",
    });
    expect(loaded.status).toBe("loaded");
    expect(loaded.cards.length).toBeGreaterThan(0);
    expect(loaded.cards.every((card) => card.evidenceRefs.length > 0)).toBe(true);
    expect(loaded.fakeCards).toBe(false);
    expect(loaded.mutationCount).toBe(0);

    const empty = loadAiTaskStreamRuntime({
      auth: directorAuth,
      screenId: "ai.command.center",
      nowIso: "2026-05-12T10:00:00.000Z",
    });
    expect(empty).toMatchObject({
      status: "empty",
      cards: [],
      fakeCards: false,
      hardcodedAiResponse: false,
    });

    const blocked = loadAiTaskStreamRuntime({
      auth: { userId: "unknown-user", role: "unknown" },
      screenId: "ai.command.center",
    });
    expect(blocked).toMatchObject({
      status: "blocked",
      role: "unknown",
      cards: [],
    });
    expect(blocked.blockedReason).toContain("Unknown AI role");
  });

  it("is exposed through GET /agent/task-stream without static source cards", () => {
    const result = getAgentTaskStream({
      auth: directorAuth,
      screenId: "ai.command.center",
      runtimeEvidence,
      page: { limit: 2 },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        endpoint: "GET /agent/task-stream",
        runtimeStatus: "loaded",
        mutationCount: 0,
        readOnly: true,
        providerCalled: false,
        dbAccessedDirectly: false,
        page: { limit: 2, nextCursor: "2" },
      },
    });
    if (!result.ok) throw new Error("expected task stream result");
    expect(result.data.cards).toHaveLength(2);
    expect(result.data.cards.every((card) => card.evidenceRefs.length > 0)).toBe(true);
  });
});
