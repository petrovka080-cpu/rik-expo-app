import { createHash, randomUUID } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

export const BATCH007_PREDECESSOR_COMMIT =
  "af5699888657698842f122030e84a59217e07a9e" as const;
export const BATCH007_PREDECESSOR_TREE =
  "5d1f8baee6be777423335923dced0dd456e67898" as const;
export const BATCH007_WATER_RELEASE_ID =
  "a43dda16-3726-5c88-bf45-22059789035e" as const;
export const BATCH007_WATER_PACKAGE_SHA256 =
  "4a01bd600be8b6eb50a32efa1940ee224981de71acb7579e4b9012d4e5e4020c" as const;
export const BATCH007_WATER_MANIFEST_SHA256 =
  "34af4e79bab5767685c48f287dff5bf49556e2f254f09b2304130e0b969035a1" as const;
export const BATCH007_SPEC_SHA256 =
  "a889101c75ebdb079ec8a1162a0f87b8dd3a1abe478551c472e29295a3203efe" as const;

export const BATCH007_DOMAIN_ID = "hvac_heat_supply" as const;
export const BATCH007_SCHEMA_VERSION = "hvac-r4.v1" as const;
export const BATCH007_FIXED_AT = "2026-08-16T04:40:00.000Z" as const;

export const projectRoot = resolve(process.cwd());
export const runtimeRoot = resolve(
  process.env.BATCH007_RUNTIME_ROOT ??
    join(projectRoot, ".release-runtime", "batch007-hvac-r4"),
);
export const evidenceRoot = join(runtimeRoot, "evidence");

export function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
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
  ]) {
    mkdirSync(join(evidenceRoot, directory), { recursive: true });
  }
}

export function quarantinePartialEvidence(): string[] {
  if (!existsSync(evidenceRoot)) return [];
  const quarantined: string[] = [];
  for (const directory of ["00-preflight", "01-discovery", "02-depth", "03-norms", "04-prices", "05-content", "06-oracle", "07-package", "08-database", "09-admission", "10-wow", "11-security-runtime", "12-mutations", "13-clients", "14-performance", "15-activation", "16-replay", "17-cleanup"]) {
    const partial = join(evidenceRoot, directory, ".partial");
    if (existsSync(partial)) {
      const target = `${partial}.quarantined-${Date.now()}`;
      renameSync(partial, target);
      quarantined.push(target);
    }
  }
  return quarantined;
}

export function replaceDirectory(path: string): void {
  if (existsSync(path)) rmSync(path, { recursive: true, force: false });
  mkdirSync(path, { recursive: true });
}
