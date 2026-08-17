import { createHash } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export const SCHEMA_VERSION = "p0-estimate-truth-remediation-r2.v1";
export const EXPECTED_B8_HEAD = "2e9a045f3aa43a63396c727a597daaaf8d98c890";
export const EXPECTED_B8_TREE = "2749340a04eb49268cde60cc3c2d026b9b41a9c3";
export const EXPECTED_B9_HEAD = "91a3ab949f1100b2dab9309f77a2487653c4f33a";
export const EXPECTED_B9_TREE = "e24187a0c19b121f071eeb9a782902ab62e46f17";
export const EXPECTED_SPEC_SHA256 = "aa0d5e54c260d3fe53094ac7ece1455ae5739ff742b9d3175aca6df97ad431bf";
export const EXPECTED_SPEC_BYTES = 104_709;
export const EXPECTED_SPEC_LINES = 1_927;

export const ROOT = path.resolve(process.env.P0_R2_ROOT ?? path.join(".release-runtime", "p0-estimate-truth-remediation-r2"));
export const EVIDENCE = path.join(ROOT, "evidence");
export const PACKAGE_A = path.join(ROOT, "package-a");
export const PACKAGE_B = path.join(ROOT, "package-b");
export const SPEC_PATH = path.resolve(process.env.P0_R2_SPEC_PATH
  ?? "C:/Users/User/Downloads/P0_ALL_NON_ASPHALT_ESTIMATE_TRUTH_REMEDIATION_R2_SEARCH_TYPEAHEAD_PARAMETERS_NORMS_MATERIALS_OPERATIONS_HISTORY_EXACT_GREEN_NO_FULL_JEST.md");
export const B8_WORKTREE = path.resolve(process.env.P0_R2_B8_WORKTREE ?? "C:/dev/rik-expo-app-batch008-concrete-r5");
export const B9_WORKTREE = path.resolve(process.env.P0_R2_B9_WORKTREE ?? "C:/dev/rik-expo-app-batch009-fire-life-safety-r5");
export const B8_EVIDENCE = path.join(B8_WORKTREE, ".release-runtime", "batch008-concrete-r5", "evidence");
export const B9_ROOT = path.join(B9_WORKTREE, ".release-runtime", "batch009-fire-r5");
export const B9_EVIDENCE = path.join(B9_ROOT, "evidence");
export const B9_RELEASE_A = path.join(B9_ROOT, "release-a");
export const GLOBAL_LEDGER = path.join(B9_EVIDENCE, "01-discovery", "GLOBAL_LEDGER_11610.jsonl");

export function ensureDir(directory: string): void {
  mkdirSync(directory, { recursive: true });
}

export function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

export function stableJson(value: unknown): string {
  return JSON.stringify(stable(value));
}

export function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function sha256File(file: string): string {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

export function sha256Object(value: unknown): string {
  return sha256Text(stableJson(value));
}

function atomicWrite(file: string, body: string): void {
  ensureDir(path.dirname(file));
  const temporary = `${file}.tmp-${process.pid}`;
  writeFileSync(temporary, body, "utf8");
  renameSync(temporary, file);
}

export function writeJson(file: string, value: unknown): void {
  atomicWrite(file, `${stableJson(value)}\n`);
}

export function writeJsonl(file: string, rows: readonly unknown[]): void {
  atomicWrite(file, rows.length ? `${rows.map(stableJson).join("\n")}\n` : "");
}

export function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

export function readJsonl<T>(file: string): T[] {
  return readFileSync(file, "utf8").split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as T);
}

export function git(args: string[], cwd = process.cwd()): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

export function invariant(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(code);
}

export function fileRecord(file: string, semanticRole: string) {
  return {
    file: path.relative(ROOT, file).replace(/\\/gu, "/"),
    bytes: statSync(file).size,
    sha256: sha256File(file),
    semantic_role: semanticRole,
  };
}

export type JournalStatus = "GREEN" | "RED" | "BLOCKED";

export function journal(entry: {
  gate: string;
  check: string;
  why: string;
  command: string;
  result: string;
  status: JournalStatus;
  affected: Record<string, unknown>;
  rootCause?: string | null;
  repair?: string | null;
  completed: string;
  next: string;
}): void {
  ensureDir(EVIDENCE);
  const journalPath = path.join(EVIDENCE, "JOURNAL_RU.jsonl");
  const sequence = existsSync(journalPath)
    ? readFileSync(journalPath, "utf8").split(/\r?\n/u).filter(Boolean).length + 1
    : 1;
  appendFileSync(journalPath, `${stableJson({
    schema_version: SCHEMA_VERSION,
    timestamp: new Date().toISOString(),
    sequence,
    ...entry,
  })}\n`, "utf8");
}

export function sourceIdentity() {
  return {
    head: git(["rev-parse", "HEAD"]),
    tree: git(["show", "-s", "--format=%T", "HEAD"]),
    branch: git(["branch", "--show-current"]),
    worktree_status: git(["status", "--short"]),
  };
}

export function producer(command: string, semanticRole: string, inputs: string[]) {
  const source = sourceIdentity();
  return {
    schema_version: SCHEMA_VERSION,
    producer_command: command,
    semantic_role: semanticRole,
    source_head: source.head,
    source_tree: source.tree,
    input_hashes: inputs.map((file) => ({
      file: file.replace(/\\/gu, "/"),
      bytes: statSync(file).size,
      sha256: sha256File(file),
    })),
  };
}
