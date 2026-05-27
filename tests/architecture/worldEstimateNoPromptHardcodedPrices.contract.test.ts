import { readRepoFile } from "../worldConstruction/worldConstructionTestHelpers";

describe("world estimate architecture - no prompt hardcoded prices", () => {
  it("does not branch on exact prompts to hardcode prices", () => {
    const engine = readRepoFile("src/lib/ai/worldConstructionEstimateEngine.ts");
    const interpreter = readRepoFile("src/lib/ai/worldConstructionInterpreter/classifyConstructionWorkOutcome.ts");

    expect(`${engine}\n${interpreter}`).not.toMatch(/Хочу уложить|дай смету на|смета на установку турбины[\s\S]{0,120}(unitPrice|price|цена)/i);
  });
});
