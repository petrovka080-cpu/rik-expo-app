import fs from "node:fs";
import path from "node:path";

const SCREEN_ROOTS = ["app", "src/features", "src/screens"].map((dir) => path.join(process.cwd(), dir));
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);

function listFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const entries = fs.readdirSync(root, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) return listFiles(fullPath);
    return SOURCE_EXTENSIONS.has(path.extname(entry.name)) ? [fullPath] : [];
  });
}

describe("work type resolver screen boundary", () => {
  it("keeps waterproofing disambiguation out of screen-local overrides", () => {
    const offenders = SCREEN_ROOTS.flatMap(listFiles)
      .filter((filePath) => {
        const source = fs.readFileSync(filePath, "utf8");

        return source.includes("resolveWorkTypeDisambiguation") ||
          source.includes("waterproofingWorkTypeResolver") ||
          source.includes("workTypeResolverNegativeRules") ||
          /roof_waterproofing[\s\S]{0,160}bathroom_waterproofing|bathroom_waterproofing[\s\S]{0,160}roof_waterproofing/.test(source);
      })
      .map((filePath) => path.relative(process.cwd(), filePath).replace(/\\/g, "/"));

    expect(offenders).toEqual([]);
  });
});
