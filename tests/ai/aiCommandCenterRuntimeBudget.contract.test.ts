import type { AgentTaskStreamCard } from "../../src/features/ai/agent/agentBffRouteShell";
import { buildAiCommandCenterViewModel } from "../../src/features/ai/commandCenter/buildAiCommandCenterViewModel";
import {
  AI_COMMAND_CENTER_MAX_CARDS,
  decideAiCommandCenterRuntimeBudget,
  normalizeAiCommandCenterPage,
} from "../../src/features/ai/commandCenter/aiCommandCenterRuntimeBudget";
import { aiCommandCenterTaskCards } from "./aiCommandCenter.fixture";

function manyCards(count: number): AgentTaskStreamCard[] {
  return Array.from({ length: count }, (_, index) => ({
    ...aiCommandCenterTaskCards[index % aiCommandCenterTaskCards.length],
    id: `budget-card-${index}`,
    evidenceRefs: [`budget:evidence:${index}`],
    scope: { kind: "cross_domain" as const },
  }));
}

describe("AI Command Center runtime budget", () => {
  it("caps page limit and card output at the production budget", () => {
    expect(normalizeAiCommandCenterPage({ limit: 99, cursor: " 12 " })).toEqual({
      limit: AI_COMMAND_CENTER_MAX_CARDS,
      cursor: "12",
    });
    expect(decideAiCommandCenterRuntimeBudget({ limit: 99 })).toMatchObject({
      allowed: true,
      limit: AI_COMMAND_CENTER_MAX_CARDS,
      paginationRequired: true,
    });

    const vm = buildAiCommandCenterViewModel({
      auth: { userId: "director-user", role: "director" },
      sourceCards: manyCards(30),
      page: { limit: 99 },
    });

    expect(vm.maxCards).toBe(20);
    expect(vm.paginationRequired).toBe(true);
    expect(vm.cards.length).toBeLessThanOrEqual(20);
    expect(new Set(vm.cards.map((card) => card.id)).size).toBe(vm.cards.length);
    expect(vm.mutationCount).toBe(0);
    expect(vm.directMutationAllowed).toBe(false);
  });

  it("keeps empty state real when evidence is absent", () => {
    const vm = buildAiCommandCenterViewModel({
      auth: { userId: "director-user", role: "director" },
      sourceCards: [],
    });

    expect(vm.empty).toBe(true);
    expect(vm.cards).toHaveLength(0);
    expect(vm.source).not.toContain("fake");
  });
});
