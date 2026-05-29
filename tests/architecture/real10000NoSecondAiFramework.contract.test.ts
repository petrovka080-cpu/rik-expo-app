import fs from "node:fs";

test("real 10000 does not create a second AI framework", () => {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8")) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  expect(Object.keys(deps).filter((name) => /langchain|llamaindex|semantic-kernel/i.test(name))).toEqual([]);
});
