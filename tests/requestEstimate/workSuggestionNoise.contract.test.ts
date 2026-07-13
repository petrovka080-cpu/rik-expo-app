import {
  searchConsumerRepairWorkSuggestions,
  shouldShowConsumerRepairWorkSuggestions,
} from "../../src/features/consumerRepair/requestEstimateScreenActions";

describe("request estimate work suggestion visibility", () => {
  it("keeps smart suggestions out of full estimate prompts", () => {
    const prompt = "водоснабжение села 5 км труба ПЭ100 d110 траншея колодцы";

    expect(shouldShowConsumerRepairWorkSuggestions(prompt)).toBe(false);
    expect(searchConsumerRepairWorkSuggestions(prompt, null)).toHaveLength(0);
  });

  it("keeps suggestions available for short catalog-style searches", () => {
    const prompt = "гидроизоляция кровли";

    expect(shouldShowConsumerRepairWorkSuggestions(prompt)).toBe(true);
    expect(searchConsumerRepairWorkSuggestions(prompt, null).length).toBeGreaterThan(0);
  });
});
