import fs from "node:fs";
import path from "node:path";

function readTsxFiles(dir: string): string {
  if (!fs.existsSync(dir)) return "";
  return fs.readdirSync(dir, { withFileTypes: true }).map((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return readTsxFiles(full);
    return entry.name.endsWith(".tsx") ? fs.readFileSync(full, "utf8") : "";
  }).join("\n");
}

describe("source governance no screen-local price tables", () => {
  it("does not attach source governance policy directly to TSX screens", () => {
    const screenSource = [
      readTsxFiles(path.resolve(process.cwd(), "app")),
      readTsxFiles(path.resolve(process.cwd(), "src/features/consumerRepair")),
    ].join("\n");
    expect(screenSource).not.toMatch(/sourceGovernance|validatePricedRateSourceEvidence|RateSourceEvidence/);
  });
});
