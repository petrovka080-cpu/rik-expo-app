import {
  AGENT_TASK_STREAM_BFF_CONTRACT,
  getAgentTaskStream,
  type AgentTaskStreamCard,
} from "../../src/features/ai/agent/agentBffRouteShell";

const taskCards: AgentTaskStreamCard[] = [
  {
    id: "finance-risk-1",
    type: "finance_risk",
    title: "Finance risk",
    summary: "Payment document gap needs review",
    domain: "finance",
    priority: "high",
    createdAt: "2026-05-12T09:00:00.000Z",
    evidenceRefs: ["finance:risk:redacted"],
    scope: { kind: "role_domain", allowedRoles: ["director", "control", "accountant"] },
    recommendedToolName: "get_finance_summary",
  },
  {
    id: "warehouse-low-1",
    type: "warehouse_low_stock",
    title: "Warehouse low stock",
    summary: "Material availability is below the safe threshold",
    domain: "warehouse",
    priority: "normal",
    createdAt: "2026-05-12T08:00:00.000Z",
    evidenceRefs: ["warehouse:stock:redacted"],
    scope: { kind: "role_domain", allowedRoles: ["director", "control", "warehouse"] },
    recommendedToolName: "get_warehouse_status",
  },
  {
    id: "contractor-doc-1",
    type: "missing_document",
    title: "Contractor document",
    summary: "Own act document is missing review evidence",
    domain: "subcontracts",
    priority: "normal",
    createdAt: "2026-05-12T07:00:00.000Z",
    evidenceRefs: ["contractor:document:redacted"],
    scope: { kind: "own_record", ownerUserIdHash: "contractor-user" },
    recommendedToolName: "draft_act",
  },
  {
    id: "no-evidence-1",
    type: "recommended_next_action",
    title: "No evidence card",
    summary: "This card must be filtered out",
    domain: "reports",
    priority: "low",
    createdAt: "2026-05-12T06:00:00.000Z",
    evidenceRefs: [],
    scope: { kind: "cross_domain" },
  },
];

describe("agent task stream BFF contract", () => {
  it("defines a read-only paginated task stream endpoint", () => {
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
      productionTrafficEnabled: false,
    });
    expect(AGENT_TASK_STREAM_BFF_CONTRACT.supportedCardTypes).toEqual([
      "approval_pending",
      "supplier_price_change",
      "warehouse_low_stock",
      "draft_ready",
      "report_ready",
      "finance_risk",
      "missing_document",
      "recommended_next_action",
    ]);
  });

  it("requires auth and rejects malformed cursors", () => {
    expect(getAgentTaskStream({ auth: null })).toMatchObject({
      ok: false,
      error: { code: "AGENT_TASK_STREAM_AUTH_REQUIRED" },
    });
    expect(
      getAgentTaskStream({
        auth: { userId: "director-user", role: "director" },
        page: { cursor: "bad-cursor" },
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "AGENT_TASK_STREAM_INVALID_PAGE" },
    });
  });

  it("paginates visible cards and keeps output evidence-backed", () => {
    const firstPage = getAgentTaskStream({
      auth: { userId: "director-user", role: "director" },
      page: { limit: 2 },
      sourceCards: taskCards,
    });

    expect(firstPage).toMatchObject({
      ok: true,
      data: {
        endpoint: "GET /agent/task-stream",
        paginated: true,
        roleScoped: true,
        evidenceBacked: true,
        mutationCount: 0,
        readOnly: true,
        executed: false,
        providerCalled: false,
        dbAccessedDirectly: false,
        page: { limit: 2, cursor: null, nextCursor: "2" },
      },
    });
    if (!firstPage.ok) throw new Error("expected first task stream page");
    expect(firstPage.data.cards.map((card) => card.id)).toEqual([
      "finance-risk-1",
      "warehouse-low-1",
    ]);
    expect(firstPage.data.cards.every((card) => card.evidenceRefs.length > 0)).toBe(true);
    expect(firstPage.data.cards.map((card) => card.id)).not.toContain("no-evidence-1");

    const secondPage = getAgentTaskStream({
      auth: { userId: "director-user", role: "director" },
      page: { limit: 2, cursor: firstPage.data.page.nextCursor },
      sourceCards: taskCards,
    });
    expect(secondPage).toMatchObject({
      ok: true,
      data: {
        page: { limit: 2, cursor: "2", nextCursor: null },
      },
    });
    if (!secondPage.ok) throw new Error("expected second task stream page");
    expect(secondPage.data.cards.map((card) => card.id)).toEqual(["contractor-doc-1"]);
  });
});
