import fs from "node:fs";
import path from "node:path";

export const repoRoot = path.resolve(__dirname, "..", "..");
export const contractRuntimeRoot = path.join(repoRoot, "src", "lib", "ai", "contractRuntime");

export function listContractRuntimeFiles(): string[] {
  const files: string[] = [];
  function visit(dir: string): void {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        files.push(absolute);
      }
    }
  }
  visit(contractRuntimeRoot);
  return files;
}

export function readContractRuntimeText(): string {
  return listContractRuntimeFiles().map((file) => fs.readFileSync(file, "utf8")).join("\n");
}
