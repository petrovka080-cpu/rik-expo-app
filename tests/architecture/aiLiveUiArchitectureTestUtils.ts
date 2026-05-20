import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(__dirname, "../..");

export function readLiveUiSource(): string {
  const dir = path.join(projectRoot, "src/lib/ai/liveUi");
  return fs.readdirSync(dir)
    .filter((file) => file.endsWith(".ts"))
    .map((file) => fs.readFileSync(path.join(dir, file), "utf8"))
    .join("\n");
}

export function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}
