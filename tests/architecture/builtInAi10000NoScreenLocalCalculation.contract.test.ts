import fs from "node:fs";
import path from "node:path";

describe("built-in AI 10000 architecture: no screen-local calculation", () => {
  it("keeps the 10000 proof in the BuiltIn AI/backend path", () => {
    const runner = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/runBuiltInAi10000RealWorldWorkTypesProof.ts"), "utf8");
    const manifest = fs.readFileSync(path.join(process.cwd(), "src/lib/ai/builtInAi10000/builtInAi10000ConstructionCases.ts"), "utf8");

    expect(runner).toContain("answerBuiltInAi");
    expect(runner).toContain("backend_called");
    expect(manifest).not.toMatch(/React|useEffect|useState|tsx/);
  });
});
