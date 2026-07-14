import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const FULL_JEST_CURRENT_EVIDENCE_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_EDITABLE_ESTIMATE_WORKSPACE_USER_PRICE_QUANTITY_SNAPSHOT",
);

export const FULL_JEST_CURRENT_EVIDENCE_PATH = path.join(
  FULL_JEST_CURRENT_EVIDENCE_DIR,
  "full_jest_current_evidence.json",
);

export type FullJestEvidenceContext = {
  headSha: string;
  branch: string;
  changedFiles: string[];
  workspaceFingerprint: string;
};

export function git(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10_000,
    }).trim();
  } catch {
    return fallback;
  }
}

export function readJson(filePath: string): Record<string, unknown> {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function changedFiles(): string[] {
  const tracked = git(["diff", "--name-only"], "");
  const staged = git(["diff", "--name-only", "--cached"], "");
  const untracked = git(["ls-files", "--others", "--exclude-standard"], "");
  return Array.from(
    new Set([tracked, staged, untracked].join("\n").split(/\r?\n/).map((item) => item.trim()).filter(Boolean)),
  ).sort();
}

export function computeWorkspaceFingerprint(files: string[]): string {
  const hash = crypto.createHash("sha256");
  hash.update(git(["rev-parse", "HEAD"], "unknown"));
  for (const file of files) {
    const normalized = file.replace(/\\/g, "/");
    const absolutePath = path.join(process.cwd(), normalized);
    hash.update("\0file:");
    hash.update(normalized);
    hash.update("\0");
    if (!fs.existsSync(absolutePath)) {
      hash.update("deleted");
      continue;
    }
    const stat = fs.statSync(absolutePath);
    if (!stat.isFile()) {
      hash.update("not-file");
      continue;
    }
    hash.update(fs.readFileSync(absolutePath));
  }
  return hash.digest("hex");
}

export function buildFullJestEvidenceContext(): FullJestEvidenceContext {
  const files = changedFiles();
  return {
    headSha: git(["rev-parse", "HEAD"], "unknown"),
    branch: git(["branch", "--show-current"], "unknown"),
    changedFiles: files,
    workspaceFingerprint: computeWorkspaceFingerprint(files),
  };
}

export function isCurrentFullJestEvidence(
  evidence: Record<string, unknown>,
  context: FullJestEvidenceContext,
): boolean {
  return (
    evidence.command === "npm test -- --runInBand" &&
    evidence.passed === true &&
    evidence.fake_green_claimed === false &&
    evidence.head_sha === context.headSha &&
    evidence.branch === context.branch &&
    evidence.workspace_fingerprint === context.workspaceFingerprint &&
    Array.isArray(evidence.changed_files) &&
    JSON.stringify(evidence.changed_files) === JSON.stringify(context.changedFiles)
  );
}
