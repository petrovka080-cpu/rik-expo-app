import fs from "node:fs";
import path from "node:path";

test("production canary does not create a second AI framework", () => {
  const entries = fs.readdirSync(path.join(process.cwd(), "src/lib/ai"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  expect(entries.filter((name) => /second|newAi|parallelAi|canaryAiFramework/i.test(name))).toEqual([]);
});
