import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "src", "lib", "ai", "externalKnowledge");

export function readExternalKnowledgeSource(): string {
  const files: string[] = [];
  function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts")) files.push(full);
    }
  }
  walk(ROOT);
  return files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
}

export function listExternalKnowledgeFiles(): string[] {
  const result: string[] = [];
  function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts")) result.push(full.replace(/\\/g, "/"));
    }
  }
  walk(ROOT);
  return result;
}
