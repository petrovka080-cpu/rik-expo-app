import fs from "node:fs";
import path from "node:path";

function files(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(root, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) return files(relative);
    return /\.(tsx?|jsx?)$/.test(entry.name) ? [relative] : [];
  });
}

test("real 10000 does not add screen-local estimate calculation", () => {
  const findings = files("src/screens").filter((file) => {
    const source = fs.readFileSync(file, "utf8");
    return /compileDynamicProfessionalBoq|buildEstimatorReasoningPlan|calculateGlobalConstructionEstimateSync/.test(source);
  });
  expect(findings).toEqual([]);
});
