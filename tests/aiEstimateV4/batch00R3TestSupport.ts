import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(process.env.BATCH00_R3_EVIDENCE_ROOT ?? ".tmp/batch00-dev");
export const PREDECESSOR_HEAD = "6f59d0278e7c08a8811263c7fabe56e1423d1f1d";

export function readJson<T = Record<string, any>>(relative: string): T {
  return JSON.parse(readFileSync(path.join(ROOT, relative), "utf8")) as T;
}

export function readText(relative: string): string {
  return readFileSync(path.join(ROOT, relative), "utf8");
}

export function readJsonl(relative: string): Record<string, any>[] {
  const text = readText(relative).trim();
  return text ? text.split(/\r?\n/u).map((line) => JSON.parse(line) as Record<string, any>) : [];
}

function stableValue(value: any): any {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  return value;
}

export function stableJson(value: any): string { return `${JSON.stringify(stableValue(value), null, 2)}\n`; }
export function sha256(value: string | Buffer): string { return createHash("sha256").update(value).digest("hex"); }
export function git(...args: string[]): string { return execFileSync("git", args, { encoding: "utf8", windowsHide: true }).trim(); }
export function groupDirs(): string[] {
  return [
    "wg__base__drywall_ceiling_interior_bulkhead_frame",
    "wg__base__drywall_ceiling_interior_bulkhead_align",
    "wg__base__drywall_ceiling_interior_bulkhead_clad",
  ];
}
