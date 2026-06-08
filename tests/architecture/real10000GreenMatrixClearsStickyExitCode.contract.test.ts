import fs from "node:fs";

test("real 10000 final proof clears sticky process exit code only after an honest green matrix", () => {
  const source = fs.readFileSync("scripts/e2e/runReal10000DiverseConstructionWorksExpandedEstimateProof.ts", "utf8");
  expect(source).toContain('finalStatus === "GREEN_REAL_10000_DIVERSE_CONSTRUCTION_WORKS_EXPANDED_ESTIMATE_READY"');
  expect(source).toContain("failures.length === 0");
  expect(source).toContain("process.exitCode = 0");
  expect(source.indexOf("process.exitCode = 0")).toBeLessThan(source.indexOf("if (failures.length > 0) throw new Error"));
});
