import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(".");
const retiredProductOwner = "src/lib/ai/estimateContinuousDetection/continuousAiEstimateDetector.ts";
const evidenceOwner = "scripts/estimate/detectors/continuousAiEstimateDetector.ts";

function productionFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return productionFiles(path);
    return /\.(?:ts|tsx|js|jsx|mjs|cjs)$/u.test(entry.name) ? [path] : [];
  });
}

describe("continuous estimate detector evidence boundary", () => {
  it("keeps anti-fake assertions outside the product graph after canonical backend cutover", () => {
    expect(existsSync(resolve(root, retiredProductOwner))).toBe(false);
    expect(existsSync(resolve(root, evidenceOwner))).toBe(true);

    const evidenceSource = readFileSync(resolve(root, evidenceOwner), "utf8");
    expect(evidenceSource).toContain("export function detectEstimateFakeRows");
    expect(evidenceSource).toContain("export function buildContinuousAiEstimateHeadlessSummary");

    const forbiddenReferences = [
      ...productionFiles(resolve(root, "app")),
      ...productionFiles(resolve(root, "src")),
      ...productionFiles(resolve(root, "supabase", "functions")),
    ].flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return source.includes("estimateContinuousDetection") || source.includes("scripts/estimate/detectors")
        ? [relative(root, path).replace(/\\/gu, "/")]
        : [];
    });

    expect(forbiddenReferences).toEqual([]);
  });
});
