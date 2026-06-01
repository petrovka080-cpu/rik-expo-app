import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const repoRoot = path.resolve(__dirname, "../..");

export function read(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

export function readJson(relativePath: string): Record<string, unknown> {
  const parsed = JSON.parse(read(relativePath));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Expected JSON object at ${relativePath}`);
  }
  return parsed;
}

export function changedFilesFromHead(): string[] {
  const tracked = execFileSync("git", ["diff", "--name-only", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter(Boolean);
  const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter(Boolean);
  return [...tracked, ...untracked].map((file) => file.replace(/\\/g, "/")).sort();
}

export function nestedRecord(value: unknown, key: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Expected record before reading ${key}`);
  }
  const child = value[key as keyof typeof value];
  if (typeof child !== "object" || child === null || Array.isArray(child)) {
    throw new Error(`Expected record at ${key}`);
  }
  return child as Record<string, unknown>;
}
