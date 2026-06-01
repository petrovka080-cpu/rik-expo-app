import fs from "node:fs";
import path from "node:path";

test("real 10000 wave does not rewrite answers inside screen useEffect hooks", () => {
  const sources = [
    "scripts/e2e/real10000AcceptanceCore.ts",
    "scripts/e2e/runReal10000DiverseConstructionWorksExpandedEstimateProof.ts",
    "scripts/e2e/runReal10000DiverseConstructionWorksShardProof.ts",
    "scripts/e2e/runReal10000DiverseConstructionWorksShardMerge.ts",
  ]
    .filter((file) => fs.existsSync(path.join(process.cwd(), file)))
    .map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8"))
    .join("\n");

  expect(sources).not.toMatch(/useEffect\s*\(/);
});
