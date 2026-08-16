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

export const BATCH008_PREDECESSOR_COMMIT =
  "de59385b7be731db595996fae7577ad6df358393" as const;
export const BATCH008_PREDECESSOR_TREE =
  "5a3bc979891000e79d8ffcbb7d42a36e57c7ffe0" as const;
export const BATCH008_PREDECESSOR_RELEASE_ID =
  "ed35b18b-8fc6-5c7f-b1c8-aeeb07b6ef33" as const;
export const BATCH008_PREDECESSOR_MANIFEST_SHA256 =
  "7697879885c84adcfb7caf0643fa813fade430bcc808d94ad9c943d803e508d6" as const;
export const BATCH008_PREDECESSOR_PACKAGE_SHA256 =
  "61ee23f4e50f28ce6c91782def9eebbb063e2748501e3d2747e8e27687d8b8ed" as const;
export const BATCH008_PREDECESSOR_CORPUS_SHA256 =
  "4ebcced9a7eda71bdc94431743229a4faff79a750a7736bded6c80c207a4f625" as const;
export const BATCH008_SPEC_SHA256 =
  "ee4b0a74000e51eda1a5fb50a999a85c44e0d44494d034b04c7fecca7a5eea23" as const;
export const BATCH008_FIXED_AT = "2026-08-16T16:00:00.000Z" as const;

export const projectRoot = resolve(process.cwd());
export const runtimeRoot = resolve(
  process.env.BATCH008_RUNTIME_ROOT ??
    join(projectRoot, ".release-runtime", "batch008-concrete-r5"),
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
