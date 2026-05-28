import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("entrypoint fix no genericDraft for known work", () => {
  it("runs BuiltInAi before legacy /request generic draft fallback", () => {
    const adapter = readRepoFile("src/features/consumerRepair/consumerRepairAiAdapter.ts");
    const builtInIndex = adapter.indexOf("answerBuiltInAi({");
    const genericIndex = adapter.indexOf("genericDraft()", builtInIndex);
    const legacyLaminateIndex = adapter.indexOf("lowercaseText.includes(\"\\u043b\\u0430\\u043c\\u0438\\u043d\\u0430\\u0442\")");
    expect(builtInIndex).toBeGreaterThan(-1);
    expect(genericIndex).toBeGreaterThan(builtInIndex);
    expect(legacyLaminateIndex).toBeGreaterThan(builtInIndex);
  });
});
