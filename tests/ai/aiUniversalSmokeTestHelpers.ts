import fs from "node:fs";
import path from "node:path";

export const projectRoot = path.resolve(__dirname, "..", "..");

export function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}
