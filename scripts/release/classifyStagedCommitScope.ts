import { spawnSync } from "node:child_process";

export type StagedCommitScope =
  | "EMPTY"
  | "SOURCE"
  | "PROOF_ONLY"
  | "MIGRATION"
  | "MIXED";

export type StagedCommitScopeClassification = {
  scope: StagedCommitScope;
  stagedFiles: string[];
  sourceFiles: string[];
  proofFiles: string[];
  migrationFiles: string[];
  fake_green_claimed: false;
};

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

function runGit(args: string[]): string {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(" ")} failed`);
  }
  return result.stdout;
}

export function listStagedCommitFiles(): string[] {
  return runGit(["diff", "--cached", "--name-only"])
    .split(/\r?\n/)
    .map((line) => normalizePath(line.trim()))
    .filter(Boolean)
    .sort();
}

function isProofFile(filePath: string): boolean {
  return filePath.startsWith("artifacts/");
}

function isMigrationFile(filePath: string): boolean {
  return /^supabase\/migrations\/.+\.sql$/i.test(filePath) || /^migrations\/.+\.sql$/i.test(filePath);
}

function isSourceFile(filePath: string): boolean {
  return /^(src|app|scripts|tests|android)\//.test(filePath) ||
    /^(package|package-lock)\.json$/.test(filePath) ||
    /^(app|babel|metro)\.config\.(js|ts)$/.test(filePath) ||
    filePath === "app.json" ||
    filePath === ".husky/pre-commit";
}

export function classifyStagedCommitScope(files = listStagedCommitFiles()): StagedCommitScopeClassification {
  const stagedFiles = files.map(normalizePath).filter(Boolean).sort();
  const proofFiles = stagedFiles.filter(isProofFile);
  const migrationFiles = stagedFiles.filter(isMigrationFile);
  const sourceFiles = stagedFiles.filter(isSourceFile);

  let scope: StagedCommitScope = "MIXED";
  if (stagedFiles.length === 0) {
    scope = "EMPTY";
  } else if (proofFiles.length === stagedFiles.length) {
    scope = "PROOF_ONLY";
  } else if (migrationFiles.length > 0 && sourceFiles.length === 0 && proofFiles.length === 0) {
    scope = "MIGRATION";
  } else if (sourceFiles.length > 0 && proofFiles.length === 0) {
    scope = "SOURCE";
  }

  return {
    scope,
    stagedFiles,
    sourceFiles,
    proofFiles,
    migrationFiles,
    fake_green_claimed: false,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/release/classifyStagedCommitScope.ts")) {
  console.log(JSON.stringify(classifyStagedCommitScope(), null, 2));
}
