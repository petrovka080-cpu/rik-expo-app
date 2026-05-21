import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..", "..");
const universalRoleQaDir = path.join(root, "src", "lib", "ai", "universalRoleQa");

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

export function readAiUniversalRoleQaSource(): string {
  return walk(universalRoleQaDir)
    .filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"))
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
}

export function listAiUniversalRoleQaFiles(): string[] {
  return walk(universalRoleQaDir).map((file) => path.relative(root, file).replace(/\\/g, "/"));
}
