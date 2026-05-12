import {
  getAgentTaskStream,
  type AgentTaskStreamCard,
} from "../../src/features/ai/agent/agentBffRouteShell";

const scopedCards: AgentTaskStreamCard[] = [
  {
    id: "approval-pending-1",
    type: "approval_pending",
    title: "Approval pending",
    summary: "Request waits for approval",
    domain: "control",
    priority: "high",
    createdAt: "2026-05-12T10:00:00.000Z",
    evidenceRefs: ["approval:pending:redacted"],
    scope: { kind: "cross_domain" },
    recommendedToolName: "get_action_status",
  },
  {
    id: "supplier-price-1",
    type: "supplier_price_change",
    title: "Supplier price changed",
    summary: "Supplier comparison should be refreshed",
    domain: "procurement",
    priority: "normal",
    createdAt: "2026-05-12T09:00:00.000Z",
    evidenceRefs: ["supplier:price:redacted"],
    scope: { kind: "role_domain", allowedRoles: ["director", "control", "buyer"] },
    recommendedToolName: "compare_suppliers",
  },
  {
    id: "draft-ready-1",
    type: "draft_ready",
    title: "Draft request ready",
    summary: "Request draft can be submitted for approval",
    domain: "procurement",
    priority: "normal",
    createdAt: "2026-05-12T08:00:00.000Z",
    evidenceRefs: ["draft:request:redacted"],
    scope: { kind: "role_domain", allowedRoles: ["director", "control", "buyer", "foreman"] },
    recommendedToolName: "submit_for_approval",
  },
  {
    id: "warehouse-low-1",
    type: "warehouse_low_stock",
    title: "Warehouse low stock",
    summary: "Material is below threshold",
    domain: "warehouse",
    priority: "high",
    createdAt: "2026-05-12T07:00:00.000Z",
    evidenceRefs: ["warehouse:low:redacted"],
    scope: { kind: "role_domain", allowedRoles: ["director", "control", "warehouse"] },
    recommendedToolName: "get_warehouse_status",
  },
  {
    id: "report-ready-1",
    type: "report_ready",
    title: "Report draft ready",
    summary: "Project report draft needs review",
    domain: "reports",
    priority: "normal",
    createdAt: "2026-05-12T06:00:00.000Z",
    evidenceRefs: ["report:ready:redacted"],
    scope: { kind: "role_domain", allowedRoles: ["director", "control", "foreman"] },
    recommendedToolName: "draft_report",
  },
  {
    id: "finance-risk-1",
    type: "finance_risk",
    title: "Finance risk",
    summary: "Debt bucket requires review",
    domain: "finance",
    priority: "critical",
    createdAt: "2026-05-12T05:00:00.000Z",
    evidenceRefs: ["finance:risk:redacted"],
    scope: { kind: "role_domain", allowedRoles: ["director", "control", "accountant"] },
    recommendedToolName: "get_finance_summary",
  },
  {
    id: "contractor-own-doc-1",
    type: "missing_document",
    title: "Own contractor document",
    summary: "Own document is missing",
    domain: "subcontracts",
    priority: "normal",
    createdAt: "2026-05-12T04:00:00.000Z",
    evidenceRefs: ["contractor:own:redacted"],
    scope: { kind: "own_record", ownerUserIdHash: "contractor-user" },
    recommendedToolName: "draft_act",
  },
  {
    id: "contractor-other-doc-1",
    type: "missing_document",
    title: "Other contractor document",
    summary: "Other contractor document must not leak",
    domain: "subcontracts",
    priority: "normal",
    createdAt: "2026-05-12T03:00:00.000Z",
    evidenceRefs: ["contractor:other:redacted"],
    scope: { kind: "own_record", ownerUserIdHash: "other-contractor-user" },
    recommendedToolName: "draft_act",
  },
  {
    id: "next-action-1",
    type: "recommended_next_action",
    title: "Recommended next action",
    summary: "Cross-domain operating review",
    domain: "control",
    priority: "low",
    createdAt: "2026-05-12T02:00:00.000Z",
    evidenceRefs: ["next:action:redacted"],
    scope: { kind: "cross_domain" },
  },
];

function visibleIds(role: Parameters<typeof getAgentTaskStream>[0]["auth"]): string[] {
  const result = getAgentTaskStream({ auth: role, sourceCards: scopedCards, page: { limit: 50 } });
  if (!result.ok) return [];
  return result.data.cards.map((card) => card.id);
}

describe("agent task stream role scope", () => {
  it("lets director and control see cross-domain evidence cards", () => {
    expect(visibleIds({ userId: "director-user", role: "director" })).toEqual([
      "approval-pending-1",
      "supplier-price-1",
      "draft-ready-1",
      "warehouse-low-1",
      "report-ready-1",
      "finance-risk-1",
      "contractor-own-doc-1",
      "contractor-other-doc-1",
      "next-action-1",
    ]);
    expect(visibleIds({ userId: "control-user", role: "control" })).toHaveLength(9);
  });

  it("keeps contractor scope to own records only", () => {
    expect(visibleIds({ userId: "contractor-user", role: "contractor" })).toEqual([
      "contractor-own-doc-1",
    ]);
    expect(visibleIds({ userId: "other-contractor-user", role: "contractor" })).toEqual([
      "contractor-other-doc-1",
    ]);
  });

  it("keeps functional roles inside their allowed domains", () => {
    expect(visibleIds({ userId: "buyer-user", role: "buyer" })).toEqual([
      "supplier-price-1",
      "draft-ready-1",
    ]);
    expect(visibleIds({ userId: "accountant-user", role: "accountant" })).toEqual([
      "finance-risk-1",
    ]);
    expect(visibleIds({ userId: "warehouse-user", role: "warehouse" })).toEqual([
      "warehouse-low-1",
    ]);
    expect(visibleIds({ userId: "foreman-user", role: "foreman" })).toEqual([
      "draft-ready-1",
      "report-ready-1",
    ]);
  });

  it("denies unknown role and cross-domain cards for non-control roles", () => {
    expect(visibleIds({ userId: "unknown-user", role: "unknown" })).toEqual([]);
    expect(visibleIds({ userId: "buyer-user", role: "buyer" })).not.toContain("approval-pending-1");
    expect(visibleIds({ userId: "buyer-user", role: "buyer" })).not.toContain("finance-risk-1");
  });
});
