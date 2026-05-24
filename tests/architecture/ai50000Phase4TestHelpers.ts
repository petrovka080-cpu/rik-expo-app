import fs from "node:fs";
import path from "node:path";

function listFiles(root: string): string[] {
  const absoluteRoot = path.resolve(process.cwd(), root);
  if (!fs.existsSync(absoluteRoot)) return [];
  return fs.readdirSync(absoluteRoot, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(absoluteRoot, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".expo", "dist", "build"].includes(entry.name)) return [];
      return listFiles(path.relative(process.cwd(), fullPath));
    }
    return /\.(ts|tsx|js|jsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

export function sourceText(): string {
  return [...listFiles("app"), ...listFiles("src")]
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
}

export function readJsonIfExists(relativePath: string): Record<string, unknown> | null {
  const filePath = path.resolve(process.cwd(), relativePath);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
}
