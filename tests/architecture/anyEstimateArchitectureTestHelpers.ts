import fs from "fs";
import path from "path";

export const repoRoot = path.resolve(__dirname, "../..");

export function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

export function listRepoFiles(relativeRoot: string, predicate: (file: string) => boolean): string[] {
  const root = path.join(repoRoot, relativeRoot);
  const result: string[] = [];
  const visit = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      if (entry.isFile() && predicate(full)) result.push(path.relative(repoRoot, full).replace(/\\/g, "/"));
    }
  };
  visit(root);
  return result;
}
