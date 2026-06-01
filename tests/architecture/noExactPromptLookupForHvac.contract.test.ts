import fs from "node:fs";
import path from "node:path";

const PRODUCTION_ROOTS = [
  "src/lib/ai/estimatorKernel",
  "src/lib/ai/constructionFormulas",
  "src/lib/ai/professionalBoq",
  "src/lib/ai/builtInAi",
  "src/lib/ai/globalEstimate",
] as const;

function walk(root: string): string[] {
  const absoluteRoot = path.join(process.cwd(), root);
  return fs.readdirSync(absoluteRoot, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(absoluteRoot, entry.name);
    const relative = path.relative(process.cwd(), absolute).replace(/\\/g, "/");
    if (entry.isDirectory()) return walk(relative);
    return entry.name.endsWith(".ts") ? [relative] : [];
  });
}

describe("HVAC architecture no exact prompt lookup", () => {
  it("does not key production code on the exact acceptance prompt", () => {
    const exactPrompt = "смета на установку системы кондиционирования на 258 кв метров";
    const offenders = PRODUCTION_ROOTS
      .flatMap(walk)
      .filter((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8").includes(exactPrompt));

    expect(offenders).toEqual([]);
  });
});
