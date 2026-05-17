import { hydrateAiScreenMagicContext } from "../../src/features/ai/screenMagic/aiScreenMagicHydrator";

describe("AI screen magic hydrator", () => {
  it("keeps missing facts explicit instead of inventing business data", () => {
    const hydrated = hydrateAiScreenMagicContext({
      role: "buyer",
      context: "buyer",
      screenId: "buyer.main",
    });

    expect(hydrated.screenId).toBe("buyer.main");
    expect(hydrated.hasRealHydratedEvidence).toBe(false);
    expect(hydrated.missingDataLabels.join(" ")).toContain("cannot invent");
  });

  it("treats scoped facts as hydrated evidence", () => {
    const hydrated = hydrateAiScreenMagicContext({
      role: "accountant",
      context: "accountant",
      screenId: "accountant.main",
      scopedFactsSummary: "real screen finance facts are present",
    });

    expect(hydrated.hasRealHydratedEvidence).toBe(true);
    expect(hydrated.missingDataLabels).toEqual([]);
  });
});
