import fs from "node:fs";
import path from "node:path";

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

describe("global estimate no screen-local calculation", () => {
  it("keeps estimate calculation out of screens", () => {
    const screenFiles = walk(path.join(process.cwd(), "src", "screens")).filter((file) => /\.(ts|tsx)$/.test(file));
    const offenders = screenFiles.filter((file) => /calculateGlobalConstructionEstimate|globalEstimate/.test(fs.readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });
});
