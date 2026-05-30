import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export function changedFiles(): string[] {
  return execFileSync("git", ["diff", "--name-only"], { cwd: process.cwd(), encoding: "utf8" })
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function readSources(files: string[]): string {
  return files
    .filter((file) => fs.existsSync(path.join(process.cwd(), file)))
    .map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8"))
    .join("\n");
}

export function changedRuntimeSources(): string {
  return readSources(changedFiles().filter((file) => /\.(ts|tsx|js|jsx)$/.test(file)));
}
