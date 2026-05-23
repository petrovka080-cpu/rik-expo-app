import fs from "node:fs";
import path from "node:path";

describe("built-in AI 1000 architecture: no screen-local calculation", () => {
  it("proves estimates through the shared backend estimate tool path", () => {
    const runner = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/runBuiltInAi1000ConstructionWorkTypesProof.ts"), "utf8");

    expect(runner).toContain("answerBuiltInAi");
    expect(runner).toContain("selected_tool");
    expect(runner).toContain("calculate_global_estimate");
    expect(runner).not.toContain("AIAssistantScreen");
    expect(runner).not.toContain("app/(tabs)/request/index");
  });
});
