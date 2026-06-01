import fs from "node:fs";
import path from "node:path";

function readRuntimeSources(relativeRoot: string): string {
  const root = path.join(process.cwd(), relativeRoot);
  const chunks: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "fixtures") continue;
        walk(absolute);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        chunks.push(fs.readFileSync(absolute, "utf8"));
      }
    }
  };
  walk(root);
  return chunks.join("\n");
}

describe("professional quality architecture", () => {
  it("does not depend on exact prompt lookup in runtime estimator sources", () => {
    const source = [
      readRuntimeSources("src/lib/ai/estimatorKernel"),
      readRuntimeSources("src/lib/ai/professionalBoq"),
      fs.readFileSync(path.join(process.cwd(), "src/lib/ai/globalEstimate/globalEstimateSeedData.ts"), "utf8"),
    ].join("\n");

    expect(source).not.toContain("estimate passenger elevator installation 14 floors");
    expect(source).not.toContain("estimate concrete pedestals width 0.4 height 5 meters length 0.5 meters count 10");
    expect(source).not.toMatch(/prompt\s*===/);
  });
});
