import fs from "node:fs";

describe("universal estimator no second AI framework", () => {
  it("does not add a parallel AI framework package", () => {
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8")) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    expect(Object.keys(deps).filter((name) => /langchain|llamaindex|semantic-kernel/i.test(name))).toEqual([]);
  });
});
