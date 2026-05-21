import fs from "fs";
import path from "path";

export const mediaRoot = path.resolve(__dirname, "../../src/lib/media");

export function readMediaSources(): string {
  const files: string[] = [];
  const visit = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(full);
      } else if (/\.ts$/.test(entry.name)) {
        files.push(fs.readFileSync(full, "utf8"));
      }
    }
  };
  visit(mediaRoot);
  return files.join("\n");
}

export function listMediaFiles(): string[] {
  const files: string[] = [];
  const visit = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(full);
      } else if (/\.ts$/.test(entry.name)) {
        files.push(path.relative(path.resolve(__dirname, "../.."), full).replace(/\\/g, "/"));
      }
    }
  };
  visit(mediaRoot);
  return files;
}
