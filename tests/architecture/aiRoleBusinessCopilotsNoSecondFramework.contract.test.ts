import fs from "fs";
import path from "path";

describe("S_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS: no second framework", () => {
  it("keeps workflow code inside the approved roleBusinessCopilots layer", () => {
    const aiRoot = path.resolve(__dirname, "../../src/lib/ai");
    const forbidden = ["ai2", "newAi", "smartAssistant", "aiMagicV2"];
    expect(forbidden.filter((name) => fs.existsSync(path.join(aiRoot, name)))).toEqual([]);
  });
});
