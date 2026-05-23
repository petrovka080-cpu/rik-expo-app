import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("built-in AI no generic fallback for known estimate", () => {
  it("routes request adapter through built-in AI before generic draft", () => {
    const adapter = readRepoFile("src/features/consumerRepair/consumerRepairAiAdapter.ts");
    expect(adapter.indexOf("answerBuiltInAi")).toBeGreaterThan(-1);
    expect(adapter.indexOf("answerBuiltInAi")).toBeLessThan(adapter.indexOf("genericDraft()"));
  });
});
