import { buildAiWorkdayTasks } from "../../src/features/ai/workday/aiWorkdayTaskEngine";
import { aiCommandCenterTaskCards } from "./aiCommandCenter.fixture";

const directorAuth = { userId: "director-user", role: "director" } as const;
const accountantAuth = { userId: "accountant-user", role: "accountant" } as const;

describe("AI proactive workday task engine contract", () => {
  it("builds role-scoped evidence-backed task cards from task stream signals", () => {
    const result = buildAiWorkdayTasks({
      auth: directorAuth,
      sourceCards: aiCommandCenterTaskCards,
      screenId: "ai.command_center",
    });

    expect(result).toMatchObject({
      status: "loaded",
      screenId: "ai.command_center",
      roleScoped: true,
      developerControlFullAccess: true,
      roleIsolationE2eClaimed: false,
      evidenceRequired: true,
      allCardsHaveEvidence: true,
      allCardsHaveRiskPolicy: true,
      allCardsHaveKnownTool: true,
      highRiskRequiresApproval: true,
      forbiddenActionsBlocked: true,
      internalFirst: true,
      readOnly: true,
      mutationCount: 0,
      dbWrites: 0,
      directSupabaseFromUi: false,
      mobileExternalFetch: false,
      externalLiveFetch: false,
      finalExecution: 0,
      providerCalled: false,
      rawRowsReturned: false,
      rawPromptReturned: false,
      fakeCards: false,
      hardcodedAiAnswer: false,
    });
    expect(result.cards.length).toBeGreaterThan(0);
    expect(result.cards.every((card) => card.evidenceRefs.length > 0)).toBe(true);
    expect(result.cards.map((card) => card.sourceCardId)).not.toContain("no-evidence-1");
    expect(result.cards.some((card) => card.suggestedToolId === "submit_for_approval")).toBe(true);
  });

  it("returns an honest empty state when staging has no eligible evidence", () => {
    const result = buildAiWorkdayTasks({
      auth: accountantAuth,
      sourceCards: [],
      screenId: "ai.command_center",
    });

    expect(result).toMatchObject({
      status: "empty",
      emptyState: {
        honest: true,
        fakeCards: false,
        mutationCount: 0,
      },
      fakeCards: false,
      mutationCount: 0,
      dbWrites: 0,
      externalLiveFetch: false,
    });
    expect(result.emptyState?.reason).toContain("No eligible evidence-backed workday tasks");
  });
});
