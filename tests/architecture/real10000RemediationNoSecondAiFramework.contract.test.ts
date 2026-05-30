import fs from "node:fs";
import path from "node:path";

test("Real10000 remediation does not add a second AI framework dependency", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  const dependencies = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
  };
  const forbidden = ["langchain", "@langchain/core", "llamaindex", "semantic-kernel"];

  expect(forbidden.filter((name) => dependencies[name])).toEqual([]);
});
