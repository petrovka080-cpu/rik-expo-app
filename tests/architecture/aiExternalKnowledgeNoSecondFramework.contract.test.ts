import fs from "node:fs";
import path from "node:path";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE architecture: no second framework", () => {
  it("keeps external knowledge in the approved layer", () => {
    const forbidden = ["ai2", "newAi", "smartAssistant", "aiMagicV2"].filter((dir) =>
      fs.existsSync(path.join(process.cwd(), "src", "lib", dir)),
    );
    expect(forbidden).toEqual([]);
  });
});
