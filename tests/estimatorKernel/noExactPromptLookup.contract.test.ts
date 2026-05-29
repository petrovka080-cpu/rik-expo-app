import fs from "node:fs";
import path from "node:path";

function readProductionSources(root: string): string[] {
  const absolute = path.join(process.cwd(), root);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const next = path.join(root, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) return readProductionSources(next);
    return entry.name.endsWith(".ts") && !next.includes("/fixtures/") ? [fs.readFileSync(path.join(process.cwd(), next), "utf8")] : [];
  });
}

describe("universal estimator no exact prompt lookup", () => {
  it("does not key production code off full benchmark prompt strings", () => {
    const source = [
      ...readProductionSources("src/lib/ai/estimatorKernel"),
      ...readProductionSources("src/lib/ai/professionalBoq"),
      ...readProductionSources("src/lib/ai/builtInAi"),
    ].join("\n");
    expect(source).not.toMatch(/смета на установку лифта пассажирского на 14 этажей/);
    expect(source).not.toMatch(/смета на дренажные каналы 120 метров/);
    expect(source).not.toMatch(/смета на заливку тумб/);
    expect(source).not.toMatch(/prompt\s*={2,3}\s*["'`]/);
  });
});
