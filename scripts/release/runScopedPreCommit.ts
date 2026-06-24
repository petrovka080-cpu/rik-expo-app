import { spawnSync } from "node:child_process";
import fs from "node:fs";

import { classifyStagedCommitScope } from "./classifyStagedCommitScope";

type CommandResult = {
  command: string;
  args: string[];
  exit_code: number | null;
};

function run(command: string, args: string[], options: { allowFailure?: boolean } = {}): CommandResult {
  console.log(`[pre-commit:${command}] ${[command, ...args].join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  const exitCode = result.status;
  if (exitCode !== 0 && !options.allowFailure) {
    process.exit(exitCode ?? 1);
  }
  return { command, args, exit_code: exitCode };
}

function stagedJsonFiles(files: string[]): string[] {
  return files.filter((file) => file.endsWith(".json") && fs.existsSync(file));
}

function validateJsonArtifacts(files: string[]): void {
  for (const file of stagedJsonFiles(files)) {
    JSON.parse(fs.readFileSync(file, "utf8"));
  }
}

function assertNoFakeGreenArtifacts(files: string[]): void {
  for (const file of files.filter((item) => item.startsWith("artifacts/") && fs.existsSync(item))) {
    const text = fs.readFileSync(file, "utf8");
    if (/fake_green_claimed"\s*:\s*true/i.test(text)) {
      throw new Error(`BLOCKED_FAKE_GREEN_ARTIFACT:${file}`);
    }
  }
}

const MAX_FOCUSED_JEST_FILES_PER_RUN = 25;

function chunked<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function focusedJestArgs(stagedFiles: string[]): string[][] {
  const changedTests = stagedFiles.filter((file) => /\.(test|contract)\.tsx?$/.test(file));
  if (changedTests.length > 0) {
    return chunked(changedTests, MAX_FOCUSED_JEST_FILES_PER_RUN)
      .map((chunk) => ["test", "--", "--runInBand", "--passWithNoTests", ...chunk]);
  }
  if (stagedFiles.some((file) => file.startsWith("tests/releasePipeline/") || file.startsWith("scripts/release/"))) {
    return [["test", "--", "--runInBand", "--passWithNoTests", "tests/releasePipeline"]];
  }
  if (stagedFiles.some((file) => file.startsWith("scripts/e2e/androidApi34") || file.includes("AndroidApi34"))) {
    return [["test", "--", "--runInBand", "--passWithNoTests", "tests/releasePipeline"]];
  }
  if (stagedFiles.some((file) => file.startsWith("src/lib/officeRuntime") || file.startsWith("tests/officeAuth"))) {
    return [["test", "--", "--runInBand", "--passWithNoTests", "tests/officeAuth"]];
  }
  return [];
}

function main(): void {
  const classification = classifyStagedCommitScope();
  console.log(JSON.stringify({
    scope: classification.scope,
    staged_files: classification.stagedFiles,
    full_jest_requested: false,
    android_requested: false,
    fake_green_claimed: false,
  }, null, 2));

  if (classification.scope === "EMPTY") return;

  run("git", ["diff", "--cached", "--check"]);

  if (classification.scope === "PROOF_ONLY") {
    validateJsonArtifacts(classification.stagedFiles);
    assertNoFakeGreenArtifacts(classification.stagedFiles);
    const artifactRoots = Array.from(new Set(classification.proofFiles.map((file) => file.split("/").slice(0, 2).join("/"))));
    for (const artifactRoot of artifactRoots) {
      if (artifactRoot) {
        run("npx", ["tsx", "scripts/release/scanCloseoutArtifactsForSecrets.ts", artifactRoot]);
      }
    }
    return;
  }

  if (classification.scope === "MIGRATION") {
    run("npx", ["tsx", "scripts/release/run-bounded-migration-runner.ts", "--dry-run"], { allowFailure: true });
    return;
  }

  if (classification.scope === "SOURCE" || classification.scope === "MIXED") {
    run("npm", ["run", "verify:typecheck"]);
    run("npm", ["run", "lint"]);
    run("npx", ["tsx", "scripts/release/assertNoTestWeakening.ts"]);
    const jestArgGroups = focusedJestArgs(classification.stagedFiles);
    if (jestArgGroups.length > 0) {
      for (const jestArgs of jestArgGroups) {
        run("npm", jestArgs);
      }
    } else {
      console.log("[pre-commit] No focused Jest surface selected; typecheck/lint/test-weakening scan completed.");
    }
    return;
  }

  throw new Error(`BLOCKED_UNKNOWN_PRECOMMIT_SCOPE:${classification.scope}`);
}

main();
