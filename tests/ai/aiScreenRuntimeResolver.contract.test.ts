import { resolveAiScreenRuntime } from "../../src/features/ai/screenRuntime/aiScreenRuntimeResolver";

const directorAuth = { userId: "director-user", role: "director" } as const;
const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;

describe("AI screen runtime resolver", () => {
  it("validates screenId and returns blocked for unknown screens", () => {
    const result = resolveAiScreenRuntime({
      auth: directorAuth,
      request: { screenId: "missing.screen" },
    });

    expect(result).toMatchObject({
      status: "blocked",
      mutationCount: 0,
      directMutationAllowed: false,
      rawDbRowsExposed: false,
      rawPromptExposed: false,
    });
  });

  it("returns not_mounted for future screens without fake cards", () => {
    const result = resolveAiScreenRuntime({
      auth: directorAuth,
      request: { screenId: "documents.surface" },
    });

    expect(result.status).toBe("not_mounted");
    expect(result.cards).toEqual([]);
    expect(result.fakeCards).toBe(false);
    expect(result.evidenceRefs.length).toBeGreaterThan(0);
  });

  it("loads a mounted screen with role-scoped evidence-backed cards and bounded limit", () => {
    const result = resolveAiScreenRuntime({
      auth: buyerAuth,
      request: { screenId: "buyer.main", limit: 100 },
    });

    expect(result).toMatchObject({
      status: "loaded",
      screenId: "buyer.main",
      role: "buyer",
      domain: "procurement",
      roleScoped: true,
      evidenceBacked: true,
      readOnly: true,
      mutationCount: 0,
      directMutationAllowed: false,
      silentSubmitAllowed: false,
      providerCalled: false,
      dbAccessedDirectly: false,
    });
    expect(result.cards.length).toBeLessThanOrEqual(20);
    expect(result.cards.every((card) => card.evidenceRefs.length > 0)).toBe(true);
  });
});
