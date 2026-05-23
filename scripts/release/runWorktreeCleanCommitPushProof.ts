import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type ChangeClassification =
  | "current_wave_needed"
  | "previous_wave_needed"
  | "generated_artifact_needed"
  | "irrelevant_must_not_commit"
  | "unknown_blocker";

type ChangeAction =
  | "commit"
  | "leave_uncommitted_block"
  | "delete_generated_noise"
  | "move_to_ci_artifact"
  | "ignore_if_policy_exists";

type ClassifiedChange = {
  path: string;
  status: "modified" | "added" | "deleted" | "untracked";
  classification: ChangeClassification;
  reason: string;
  action: ChangeAction;
};

const ROOT = process.cwd();
const ARTIFACT_DIR = path.join(ROOT, "artifacts");
const WAVE = "S_WORKTREE_CLEAN_COMMIT_PUSH_DISCIPLINE_POINT_OF_NO_RETURN";
const GREEN_STATUS = "GREEN_WORKTREE_CLEAN_COMMIT_PUSH_READY";
const BLOCKED_STATUS = "BLOCKED_WORKTREE_NOT_CLEAN";

const artifactPaths = {
  baselineStatus: "artifacts/S_WORKTREE_CLEAN_COMMIT_PUSH_baseline_status.txt",
  baselineDiffStat: "artifacts/S_WORKTREE_CLEAN_COMMIT_PUSH_baseline_diff_stat.txt",
  untracked: "artifacts/S_WORKTREE_CLEAN_COMMIT_PUSH_untracked_files.txt",
  classification: "artifacts/S_WORKTREE_CLEAN_COMMIT_PUSH_change_classification.json",
  matrix: "artifacts/S_WORKTREE_CLEAN_COMMIT_PUSH_matrix.json",
  proof: "artifacts/S_WORKTREE_CLEAN_COMMIT_PUSH_proof.md",
};

function runGit(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trimEnd();
  } catch {
    return fallback;
  }
}

function writeText(relativePath: string, value: string): void {
  const absolutePath = path.join(ROOT, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

function writeJson(relativePath: string, value: unknown): void {
  writeText(relativePath, JSON.stringify(value, null, 2));
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

function lines(value: string): string[] {
  return value.split(/\r?\n/).map((line) => line.trimEnd()).filter(Boolean);
}

function statusFromCode(code: string): ClassifiedChange["status"] {
  if (code === "??") return "untracked";
  if (code.includes("D")) return "deleted";
  if (code.includes("A")) return "added";
  return "modified";
}

function parseStatusPorcelain(output: string): ClassifiedChange[] {
  return lines(output).map((line) => {
    const code = line.slice(0, 2);
    const rawPath = line.slice(3).trim();
    const filePath = rawPath.includes(" -> ") ? rawPath.split(" -> ").at(-1) ?? rawPath : rawPath;
    return classifyChange(normalizePath(filePath), statusFromCode(code));
  });
}

function isCurrentWavePath(filePath: string): boolean {
  return (
    filePath === "scripts/release/runWorktreeCleanCommitPushProof.ts" ||
    filePath === "tests/release/worktreeCleanBeforeGreen.contract.test.ts" ||
    filePath === "tests/release/noUnknownDirtyFiles.contract.test.ts" ||
    filePath === "tests/release/commitShaRequiredForGreen.contract.test.ts" ||
    filePath === "tests/release/pushedBranchRequiredForGreen.contract.test.ts" ||
    filePath === "tests/release/noUntrackedProofArtifactsAfterGreen.contract.test.ts" ||
    filePath === "tests/architecture/noGreenWithDirtyWorktree.contract.test.ts" ||
    filePath.startsWith("artifacts/S_WORKTREE_CLEAN_COMMIT_PUSH_")
  );
}

function isPreviousWaveArtifact(filePath: string): boolean {
  return (
    filePath.startsWith("artifacts/S_50K_") ||
    filePath.startsWith("artifacts/S_AI_ESTIMATE_CORE_COMPLETION_") ||
    filePath.startsWith("artifacts/S_ARCH_")
  );
}

function isPreviousWavePath(filePath: string): boolean {
  return (
    filePath.startsWith("scripts/audit/greenClaimArtifactReconciliation") ||
    filePath === "scripts/audit/runGreenClaimArtifactReconciliation.ts" ||
    filePath.startsWith("scripts/e2e/anyEstimate") ||
    filePath.startsWith("scripts/e2e/builtInAiProofShared") ||
    filePath.startsWith("scripts/e2e/runAny") ||
    filePath.startsWith("scripts/e2e/runAsphalt10000") ||
    filePath.startsWith("scripts/e2e/runBuiltInAi") ||
    filePath.startsWith("src/lib/ai/builtInAi10000/") ||
    filePath.startsWith("src/lib/ai/globalEstimate/externalSources/") ||
    filePath.startsWith("src/lib/ai/sourceIntelligence/") ||
    filePath.startsWith("src/lib/ai/enterpriseGuardrails/") ||
    filePath.startsWith("src/lib/ai/universalRoleQa/") ||
    filePath === "src/lib/ai/estimatePdf/estimatePdfModelMapper.ts" ||
    filePath === "supabase/migrations/20260523130000_any_estimate_external_source_backed_professional_boq.sql" ||
    filePath.startsWith("tests/ai/aiEnterpriseArchitecturePolicy") ||
    filePath.startsWith("tests/architecture/aiAlwaysOnExternal") ||
    filePath.startsWith("tests/architecture/anyEstimate") ||
    filePath.startsWith("tests/architecture/builtInAi") ||
    filePath.startsWith("tests/architecture/dataOpsOperatorUiCannotBeClaimedByShell") ||
    filePath.startsWith("tests/architecture/noGreenClaimWithoutReplayEvidence") ||
    filePath.startsWith("tests/architecture/noSilentHistoricalMatrixMutation") ||
    filePath.startsWith("tests/audit/") ||
    filePath.startsWith("tests/builtInAi") ||
    filePath.startsWith("tests/estimateIntent/") ||
    filePath.startsWith("tests/globalEstimateAnyWork/") ||
    filePath.startsWith("tests/globalEstimateExternalSources/") ||
    filePath === "tests/release/releaseGuard.shared.test.ts"
  );
}

function isIgnoredNoisePath(filePath: string): boolean {
  return (
    filePath.startsWith("node_modules/") ||
    filePath.startsWith("android/app/build/") ||
    filePath.startsWith("android/.gradle/") ||
    filePath.startsWith(".expo/") ||
    filePath.endsWith(".apk") ||
    filePath.endsWith(".aab")
  );
}

function classifyChange(filePath: string, status: ClassifiedChange["status"]): ClassifiedChange {
  if (isCurrentWavePath(filePath)) {
    return {
      path: filePath,
      status,
      classification: "current_wave_needed",
      reason: "Required worktree/commit/push discipline runner, contracts, or proof artifact for the current wave.",
      action: "commit",
    };
  }
  if (isPreviousWaveArtifact(filePath)) {
    return {
      path: filePath,
      status,
      classification: "generated_artifact_needed",
      reason: "Generated evidence artifact from earlier AI/estimate/architecture waves; commit it to remove hidden state.",
      action: "commit",
    };
  }
  if (isPreviousWavePath(filePath)) {
    return {
      path: filePath,
      status,
      classification: "previous_wave_needed",
      reason: "Pending source/test/proof change from earlier AI estimate, source-backed estimate, or green-claim discipline waves.",
      action: "commit",
    };
  }
  if (isIgnoredNoisePath(filePath)) {
    return {
      path: filePath,
      status,
      classification: "irrelevant_must_not_commit",
      reason: "Generated local build/cache output; must not be committed.",
      action: "ignore_if_policy_exists",
    };
  }
  return {
    path: filePath,
    status,
    classification: "unknown_blocker",
    reason: "Dirty file is not covered by current or previous wave ownership rules.",
    action: "leave_uncommitted_block",
  };
}

function addPlannedCurrentWaveArtifacts(changes: ClassifiedChange[]): ClassifiedChange[] {
  const byPath = new Map(changes.map((change) => [change.path, change]));
  for (const filePath of Object.values(artifactPaths)) {
    if (!byPath.has(filePath)) {
      byPath.set(filePath, classifyChange(filePath, fs.existsSync(path.join(ROOT, filePath)) ? "modified" : "untracked"));
    }
  }
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}

function remoteContainsCommit(commitSha: string, remoteBranch: string): boolean {
  const result = runGit(["merge-base", "--is-ancestor", commitSha, remoteBranch], "__FAILED__");
  return result !== "__FAILED__";
}

function main(): void {
  const statusShort = runGit(["status", "--short"]);
  const statusSb = runGit(["status", "-sb"]);
  const branch = runGit(["branch", "--show-current"]);
  const abbrevRef = runGit(["rev-parse", "--abbrev-ref", "HEAD"]);
  const head = runGit(["rev-parse", "HEAD"]);
  const remotes = runGit(["remote", "-v"]);
  const log = runGit(["log", "--oneline", "-5"]);
  const diffStat = runGit(["diff", "--stat"]);
  const diffNameStatus = runGit(["diff", "--name-status"]);
  const untracked = runGit(["ls-files", "--others", "--exclude-standard"]);
  const remoteBranch = branch ? `origin/${branch}` : "";

  writeText(
    artifactPaths.baselineStatus,
    [
      `git status --short\n${statusShort}`,
      `git status -sb\n${statusSb}`,
      `git branch --show-current\n${branch}`,
      `git rev-parse --abbrev-ref HEAD\n${abbrevRef}`,
      `git rev-parse HEAD\n${head}`,
      `git remote -v\n${remotes}`,
      `git log --oneline -5\n${log}`,
    ].join("\n\n"),
  );
  writeText(artifactPaths.baselineDiffStat, diffStat || "(no tracked diff)");
  writeText(artifactPaths.untracked, untracked || "(no untracked files)");

  const finalStatusShortBeforeMatrix = runGit(["status", "--short"]);
  const classification = addPlannedCurrentWaveArtifacts(parseStatusPorcelain(finalStatusShortBeforeMatrix));
  writeJson(artifactPaths.classification, classification);

  const unknownDirtyFiles = classification.filter((entry) => entry.classification === "unknown_blocker");
  const irrelevantFilesToCommit = classification.filter((entry) => entry.classification === "irrelevant_must_not_commit" && entry.action === "commit");
  const finalWorktreeClean = statusShort.trim().length === 0;
  const latestSubject = runGit(["log", "-1", "--pretty=%s"]);
  const commitCreated = latestSubject === "chore: establish clean worktree commit push discipline";
  const remoteContains = Boolean(remoteBranch) && remoteContainsCommit(head, remoteBranch);
  const releaseVerifyPassed = process.argv.includes("--release-verify-passed") || process.env.S_WORKTREE_RELEASE_VERIFY_PASSED === "true";
  const typecheckPassed = process.env.S_WORKTREE_TYPECHECK_PASSED === "true";
  const lintPassed = process.env.S_WORKTREE_LINT_PASSED === "true";
  const gitDiffCheckPassed = process.env.S_WORKTREE_GIT_DIFF_CHECK_PASSED === "true";
  const targetedTestsPassed = process.env.S_WORKTREE_TARGETED_TESTS_PASSED === "true";

  const matrix = {
    wave: WAVE,
    final_status:
      finalWorktreeClean &&
      unknownDirtyFiles.length === 0 &&
      irrelevantFilesToCommit.length === 0 &&
      commitCreated &&
      remoteContains &&
      typecheckPassed &&
      lintPassed &&
      gitDiffCheckPassed &&
      targetedTestsPassed &&
      releaseVerifyPassed
        ? GREEN_STATUS
        : BLOCKED_STATUS,
    baseline_status_recorded: true,
    all_dirty_files_classified: unknownDirtyFiles.length === 0,
    unknown_dirty_files_found: unknownDirtyFiles.length > 0,
    irrelevant_files_committed: irrelevantFilesToCommit.length > 0,
    typecheck_passed: typecheckPassed,
    lint_passed: lintPassed,
    git_diff_check_passed: gitDiffCheckPassed,
    targeted_tests_passed: targetedTestsPassed,
    release_verify_passed: releaseVerifyPassed,
    commit_created: commitCreated,
    commit_sha: commitCreated ? head : null,
    branch_pushed: remoteContains,
    remote_branch: remoteBranch || null,
    remote_contains_commit: remoteContains,
    final_worktree_clean: finalWorktreeClean,
    dirty_files_count: lines(statusShort).length,
    blocked_files: classification.filter((entry) => entry.classification === "unknown_blocker" || entry.action === "leave_uncommitted_block"),
    fake_green_claimed: false,
  };

  writeJson(artifactPaths.matrix, matrix);
  writeText(
    artifactPaths.proof,
    [
      `# ${WAVE}`,
      "",
      `Status: ${matrix.final_status}`,
      `Baseline recorded: ${matrix.baseline_status_recorded}`,
      `All dirty files classified: ${matrix.all_dirty_files_classified}`,
      `Unknown dirty files found: ${matrix.unknown_dirty_files_found}`,
      `Commit created: ${matrix.commit_created}`,
      `Commit SHA: ${matrix.commit_sha ?? "not-created"}`,
      `Branch pushed: ${matrix.branch_pushed}`,
      `Remote branch: ${matrix.remote_branch ?? "missing"}`,
      `Final worktree clean: ${matrix.final_worktree_clean}`,
      `Release verify passed: ${matrix.release_verify_passed}`,
      `Fake green claimed: ${matrix.fake_green_claimed}`,
    ].join("\n"),
  );

  if (matrix.final_status !== GREEN_STATUS && !process.argv.includes("--allow-blocked")) {
    process.exitCode = 1;
  }
  console.log(matrix.final_status);
}

main();
