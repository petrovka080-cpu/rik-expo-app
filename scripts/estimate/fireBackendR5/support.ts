import { createHash, randomUUID } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

export const BATCH009_PREDECESSOR_COMMIT =
  "2e9a045f3aa43a63396c727a597daaaf8d98c890" as const;
export const BATCH009_PREDECESSOR_TREE =
  "2749340a04eb49268cde60cc3c2d026b9b41a9c3" as const;
export const BATCH009_PREDECESSOR_RELEASE_ID =
  "da29dc2b-1384-5487-b8da-6ee93f4e514e" as const;
export const BATCH009_PREDECESSOR_MANIFEST_SHA256 =
  "c516100ce17cfe1db61e2fc98215b66634a73147fd18966a6233dfa9edcd1a8a" as const;
export const BATCH009_PREDECESSOR_PACKAGE_SHA256 =
  "d84289d80cd0c5b69a2f8291a64983eb032d8416fe7513d966de1227e6e5529a" as const;
export const BATCH009_PREDECESSOR_CORPUS_SHA256 =
  "52e12ca58ddf4e2817c26b8c837d7f911d6cecd3a8b1ac54a04b359b9973ccc8" as const;
export const BATCH009_SPEC_SHA256 =
  "a74a9bd36c96d19dfa0e4ec06fde13acf5b9ae1ebdcdaf11ababc14eb09a3e21" as const;
export const BATCH009_PREDECESSOR_EVIDENCE_MANIFEST_SHA256 =
  "3b1b454f31fa2f8a18ff1c737e446d50e168a214d56c1886368992c3a0ea5e67" as const;
export const BATCH009_FIXED_AT = "2026-08-17T00:00:00.000Z" as const;
export const BATCH009_SPEC_PATH = "C:\\Users\\User\\Downloads\\BATCH009_FIRE_LIFE_SAFETY_R5_BACKEND_NATIVE_NORMATIVE_GAP_EXPANSION_50_CASES_CONTINUOUS_EXACT_GREEN_NO_FULL_JEST.md" as const;

export const projectRoot = resolve(process.cwd());
export const runtimeRoot = resolve(
  process.env.BATCH009_RUNTIME_ROOT ??
    join(projectRoot, ".release-runtime", "batch009-fire-r5"),
);
export const evidenceRoot = join(runtimeRoot, "evidence");

export function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function stable(value: unknown): string {
  if (value === undefined) return "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function semanticSha256(value: unknown): string {
  return sha256(stable(value));
}

export function atomicWrite(path: string, contents: string | Buffer): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`;
  writeFileSync(temporary, contents, { flush: true });
  renameSync(temporary, path);
}

export function writeJson(relativePath: string, value: unknown): string {
  const path = join(evidenceRoot, relativePath);
  atomicWrite(path, `${JSON.stringify(value, null, 2)}\n`);
  return path;
}

export function writeJsonl(relativePath: string, rows: readonly unknown[]): string {
  const path = join(evidenceRoot, relativePath);
  atomicWrite(path, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
  return path;
}

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function git(...args: string[]): string {
  return execFileSync("git", args, {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  }).trimEnd();
}

export function command(
  executable: string,
  args: readonly string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv; timeout?: number } = {},
): { exitCode: number; stdout: string; stderr: string } {
  const result = spawnSync(executable, args, {
    cwd: options.cwd ?? projectRoot,
    env: options.env ?? process.env,
    encoding: "utf8",
    timeout: options.timeout,
    maxBuffer: 256 * 1024 * 1024,
  });
  return {
    exitCode: result.status ?? (result.error ? 1 : 0),
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? result.error?.message ?? "",
  };
}

export function assertExact(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(code);
}

export function ensureEvidenceLayout(): void {
  for (const directory of [
    "00-preflight",
    "01-discovery",
    "02-depth",
    "03-norms",
    "04-prices",
    "05-content",
    "06-oracle",
    "07-package",
    "08-database",
    "09-admission",
    "10-wow",
    "11-security-runtime",
    "12-mutations",
    "13-clients",
    "14-performance",
    "15-activation",
    "16-replay",
    "17-cleanup",
  ]) mkdirSync(join(evidenceRoot, directory), { recursive: true });
}

export function requireFile(path: string, expectedSha256?: string): Buffer {
  if (!existsSync(path)) throw new Error(`REQUIRED_FILE_MISSING:${path}`);
  const bytes = readFileSync(path);
  if (expectedSha256 && sha256(bytes) !== expectedSha256) {
    throw new Error(`REQUIRED_FILE_HASH_RED:${path}`);
  }
  return bytes;
}
