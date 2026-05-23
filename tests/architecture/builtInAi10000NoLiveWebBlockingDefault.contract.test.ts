import fs from "node:fs";
import path from "node:path";

describe("built-in AI 10000 architecture: no live web blocking by default", () => {
  it("uses cached backend/source evidence instead of live web calls in the proof path", () => {
    const runner = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/runBuiltInAi10000RealWorldWorkTypesProof.ts"), "utf8");
    const registry = fs.readFileSync(path.join(process.cwd(), "src/lib/ai/builtInAi/builtInAiToolRegistry.ts"), "utf8");

    expect(runner).not.toContain("fetch(");
    expect(runner).not.toContain("axios");
    expect(registry).toContain("GLOBAL_RATE_MATERIALS");
    expect(registry).not.toContain("fetch(");
  });
});
