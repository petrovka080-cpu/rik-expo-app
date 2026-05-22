import fs from "node:fs";
import path from "node:path";

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

describe("global estimate data ops no screen-local calculation", () => {
  it("does not mount data ops calculation or import logic in React screens", () => {
    const offenders = walk(path.join(process.cwd(), "src", "screens"))
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) => /DataOps|ImportPreview|buildGlobalEstimateDataOps|approveGlobalEstimateDataOps/.test(fs.readFileSync(file, "utf8")));

    expect(offenders).toEqual([]);
  });
});
