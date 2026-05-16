import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("AI real role-screen assistants Maestro runner contract", () => {
  const runner = read("scripts/e2e/runAiRealRoleScreenAssistantsMaestro.ts");

  it("checks Android targetability without claiming direct mutations or provider calls", () => {
    expect(runner).toContain("S_AI_PRODUCT_03_REAL_ROLE_SCREEN_ASSISTANTS");
    expect(runner).toContain("ai.role_screen_assistant_pack");
    expect(runner).toContain("providerCalled: false");
    expect(runner).toContain("dbWritesUsed: false");
    expect(runner).toContain("fakeGreenClaimed: false");
  });
});
