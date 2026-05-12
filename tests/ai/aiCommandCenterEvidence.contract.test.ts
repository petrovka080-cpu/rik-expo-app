import type { AgentTaskStreamCard } from "../../src/features/ai/agent/agentBffRouteShell";
import {
  buildAiCommandCenterCardView,
  buildAiCommandCenterViewModel,
  hasUnsafeAiCommandCenterPayload,
  resolveAiCommandCenterActionBoundary,
} from "../../src/features/ai/commandCenter/buildAiCommandCenterViewModel";
import { aiCommandCenterTaskCards } from "./aiCommandCenter.fixture";

const noEvidenceDraftCard: AgentTaskStreamCard = {
  id: "no-evidence-draft",
  type: "report_ready",
  title: "No evidence draft",
  summary: "Should be replaced",
  domain: "reports",
  priority: "normal",
  createdAt: "2026-05-12T00:00:00.000Z",
  evidenceRefs: [],
  scope: { kind: "role_domain", allowedRoles: ["foreman"] },
  recommendedToolName: "draft_report",
};

const noEvidenceApprovalCard: AgentTaskStreamCard = {
  ...noEvidenceDraftCard,
  id: "no-evidence-approval",
  recommendedToolName: "submit_for_approval",
};

describe("AI Command Center evidence contract", () => {
  it("requires evidence for every business card emitted by the task stream view model", () => {
    const vm = buildAiCommandCenterViewModel({
      auth: { userId: "director-user", role: "director" },
      sourceCards: aiCommandCenterTaskCards,
    });

    expect(vm.cards.every((card) => card.evidenceRefs.length >= 1)).toBe(true);
    expect(vm.cards.map((card) => card.id)).not.toContain("no-evidence-1");
  });

  it("shows insufficient data and disables draft when evidence is missing", () => {
    const card = buildAiCommandCenterCardView({
      card: noEvidenceDraftCard,
      role: "foreman",
    });

    expect(card.summary).toBe("\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u0434\u0430\u043d\u043d\u044b\u0445");
    expect(card.insufficientEvidence).toBe(true);
    expect(card.allowedActions).not.toContain("create_draft");
    expect(resolveAiCommandCenterActionBoundary({ card, action: "create_draft" })).toMatchObject({
      enabled: false,
      mutationCount: 0,
      executed: false,
      finalMutation: false,
    });
  });

  it("disables submit_for_approval when evidence is missing", () => {
    const card = buildAiCommandCenterCardView({
      card: noEvidenceApprovalCard,
      role: "foreman",
    });

    expect(card.allowedActions).not.toContain("submit_for_approval");
    expect(resolveAiCommandCenterActionBoundary({ card, action: "submit_for_approval" })).toMatchObject({
      enabled: false,
      toolName: "submit_for_approval",
      mutationCount: 0,
      executed: false,
      finalMutation: false,
    });
  });

  it("does not expose raw prompt, provider payloads, or raw DB rows in card payloads", () => {
    const vm = buildAiCommandCenterViewModel({
      auth: { userId: "director-user", role: "director" },
      sourceCards: aiCommandCenterTaskCards,
    });

    expect(hasUnsafeAiCommandCenterPayload(vm)).toBe(false);
    expect(hasUnsafeAiCommandCenterPayload({ rawPrompt: "leak" })).toBe(true);
    expect(hasUnsafeAiCommandCenterPayload({ raw_db_rows: [] })).toBe(true);
    expect(hasUnsafeAiCommandCenterPayload({ providerPayload: {} })).toBe(true);
  });
});
