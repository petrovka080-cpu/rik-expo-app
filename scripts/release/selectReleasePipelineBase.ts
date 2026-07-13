import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { releasePipelineRuntimeDir } from "./computeReleaseFingerprints";
import {
  currentHead,
  readJsonObject,
  runGit,
  writeJsonFile,
  type JsonObject,
} from "./releasePipelineRuntime";

type CandidateEvidence = {
  artifact_path: string;
  source_code_head: string;
  success: true;
  numFailedTestSuites: 0;
  numFailedTests: 0;
  commit_exists: boolean;
  ancestor_of_current_head: boolean;
};

function walkJsonFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const files: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(current)) stack.push(path.join(current, entry));
      continue;
    }
    if (stat.isFile() && current.endsWith(".json") && stat.size <= 5_000_000) {
      files.push(current);
    }
  }
  return files.sort();
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isFullJestGreenEvidence(json: JsonObject): boolean {
  return (
    json.success === true &&
    json.numFailedTestSuites === 0 &&
    json.numFailedTests === 0 &&
    readString(json.source_code_head).length > 0
  );
}

function commitExists(sha: string): boolean {
  return spawnSync("git", ["cat-file", "-e", `${sha}^{commit}`], {
    cwd: process.cwd(),
    stdio: "ignore",
  }).status === 0;
}

function isAncestor(sha: string): boolean {
  return spawnSync("git", ["merge-base", "--is-ancestor", sha, "HEAD"], {
    cwd: process.cwd(),
    stdio: "ignore",
  }).status === 0;
}

function findLatestEvidence(): CandidateEvidence | null {
  const artifactsRoot = path.join(process.cwd(), "artifacts");
  const matches: CandidateEvidence[] = [];
  for (const filePath of walkJsonFiles(artifactsRoot)) {
    let json: JsonObject;
    try {
      json = readJsonObject(filePath);
    } catch {
      continue;
    }
    if (!isFullJestGreenEvidence(json)) continue;
    const sourceCodeHead = readString(json.source_code_head);
    const exists = commitExists(sourceCodeHead);
    const ancestor = exists && isAncestor(sourceCodeHead);
    matches.push({
      artifact_path: path.relative(process.cwd(), filePath).replace(/\\/g, "/"),
      source_code_head: sourceCodeHead,
      success: true,
      numFailedTestSuites: 0,
      numFailedTests: 0,
      commit_exists: exists,
      ancestor_of_current_head: ancestor,
    });
  }
  return matches.filter((match) => match.commit_exists && match.ancestor_of_current_head).at(-1) ?? null;
}

function main(): void {
  const selected = findLatestEvidence();
  const report = {
    final_status: selected
      ? "GREEN_RELEASE_PIPELINE_BASE_SELECTION_READY"
      : "BLOCKED_NO_PROVEN_FULL_JEST_GREEN_BASE",
    current_head: currentHead(),
    selected,
    fake_green_claimed: false,
  };
  writeJsonFile(releasePipelineRuntimeDir("recovery", "base_selection.json"), report);
  console.log(JSON.stringify(report, null, 2));
  if (!selected) process.exit(1);
}

main();
