import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

export const EVIDENCE_ROOT = path.resolve(process.env.POST_M1_R2_EVIDENCE_ROOT ?? ".release-runtime/master-11610-group-batches-r1/04-post-m1-autonomous-readmission-r2");

export function readJson<T = Record<string, any>>(relative: string): T {
  return JSON.parse(readFileSync(path.join(EVIDENCE_ROOT, relative), "utf8")) as T;
}

export function readText(relative: string): string {
  return readFileSync(path.join(EVIDENCE_ROOT, relative), "utf8");
}

export function dataLines(relative: string): string[] {
  return readText(relative).trim().split(/\r?\n/u).slice(1);
}

export function jsonlLines(relative: string): Record<string, any>[] {
  return readText(relative).trim().split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as Record<string, any>);
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
