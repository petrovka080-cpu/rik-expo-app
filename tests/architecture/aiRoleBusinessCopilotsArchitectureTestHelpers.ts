import fs from "fs";
import path from "path";

const repoRoot = path.resolve(__dirname, "../..");
export const aiRoleBusinessCopilotsRoot = path.join(repoRoot, "src/lib/ai/roleBusinessCopilots");

export function listAiRoleBusinessCopilotFiles(): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (/\.tsx?$/.test(entry.name)) files.push(fullPath);
    }
  };
  walk(aiRoleBusinessCopilotsRoot);
  return files;
}

export function readAiRoleBusinessCopilotsSource(): string {
  return listAiRoleBusinessCopilotFiles()
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
}
