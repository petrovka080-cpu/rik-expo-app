import fs from "node:fs";
import path from "node:path";

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return entry.isFile() && /\.(?:ts|js|mjs|cjs)$/.test(entry.name) ? [fullPath] : [];
  });
}

describe("release verify Android commands", () => {
  it("does not call adb through execFileSync/spawnSync without a timeout", () => {
    const offenders = walk(path.join(process.cwd(), "scripts"))
      .filter((file) => /[\\/]scripts[\\/](?:e2e|release)[\\/]/.test(file))
      .flatMap((file) => {
        const source = fs.readFileSync(file, "utf8");
        return [...source.matchAll(/(?:execFileSync|spawnSync)\(\s*["']adb["']/g)]
          .map((match) => {
            const end = source.indexOf(";", match.index ?? 0);
            return source.slice(match.index, end > 0 ? end + 1 : (match.index ?? 0) + 400);
          })
          .filter((call) => !/\btimeout\s*:/.test(call))
          .map((call) => `${path.relative(process.cwd(), file)}: ${call.replace(/\s+/g, " ").slice(0, 180)}`);
      });

    expect(offenders).toEqual([]);
  });
});
