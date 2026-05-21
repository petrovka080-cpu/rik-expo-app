import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..", "..");
const graphDir = path.join(root, "src", "lib", "ai", "appContextGraph");

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

export function readAiAppContextGraphSource(): string {
  return walk(graphDir)
    .filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"))
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
}

export function listAiAppContextGraphFiles(): string[] {
  return walk(graphDir).map((file) => path.relative(root, file).replace(/\\/g, "/"));
}
