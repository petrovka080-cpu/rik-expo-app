import fs from "node:fs";

describe("request estimate release no 50k expansion", () => {
  it("does not import or modify the builtInAi50000 expansion path", () => {
    const releaseSource = fs.readFileSync("scripts/release/runRequestEstimateCatalogBoqLiveReleaseGate.ts", "utf8");
    expect(releaseSource).not.toMatch(/builtInAi50000|BUILT_IN_AI_50000|runBuiltInAi50000/);
  });
});
