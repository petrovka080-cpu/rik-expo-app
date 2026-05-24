import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");

export function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

export function listProjectFiles(relativeDir: string): string[] {
  const root = path.join(ROOT, relativeDir);
  const out: string[] = [];
  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (["node_modules", ".git", "artifacts"].includes(entry.name)) continue;
        walk(absolute);
      } else {
        out.push(path.relative(ROOT, absolute).replace(/\\/g, "/"));
      }
    }
  }
  walk(root);
  return out;
}
