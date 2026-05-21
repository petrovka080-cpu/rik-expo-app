import fs from "fs";
import path from "path";

const repoRoot = path.resolve(__dirname, "../..");
const layerRoot = path.join(repoRoot, "src/lib/ai/evaluation/goldenBusinessDataset");

export function readAiRoleMixed150LayerFiles(): Array<{ file: string; content: string }> {
  const files: Array<{ file: string; content: string }> = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (/\.ts$/.test(entry.name)) {
        files.push({
          file: path.relative(repoRoot, fullPath).replace(/\\/g, "/"),
          content: fs.readFileSync(fullPath, "utf8"),
        });
      }
    }
  };
  walk(layerRoot);
  return files;
}
