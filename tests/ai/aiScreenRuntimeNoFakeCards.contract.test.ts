import { allAiScreenRuntimeProducerCardsRequireEvidence } from "../../src/features/ai/screenRuntime/aiScreenRuntimeProducers";
import { resolveAiScreenRuntime } from "../../src/features/ai/screenRuntime/aiScreenRuntimeResolver";

describe("AI screen runtime no fake cards", () => {
  it("does not let producers return cards without evidence", () => {
    expect(allAiScreenRuntimeProducerCardsRequireEvidence()).toBe(true);
  });

  it("marks runtime cards as evidence-backed and not fake", () => {
    const result = resolveAiScreenRuntime({
      auth: { userId: "buyer-user", role: "buyer" },
      request: { screenId: "buyer.main" },
    });

    expect(result.fakeCards).toBe(false);
    expect(result.hardcodedAiResponse).toBe(false);
    expect(result.cards.length).toBeGreaterThan(0);
    expect(result.cards.every((card) => card.evidenceRefs.length > 0)).toBe(true);
    expect(result.evidenceRefs.every((ref) => ref.rawDbRowsExposed === false)).toBe(true);
  });
});
