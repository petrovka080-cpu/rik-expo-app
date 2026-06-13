import { spawnSync } from "node:child_process";

import {
  assertNoHintFailures,
  buildNoHintMatrixSnapshot,
  currentHeadAtWriteTime,
  gitOutput,
  readNoHintJson,
  runReleaseVerifyForNoHint,
  sourceCodeHead,
  writeNoHintJson,
} from "./noHintRealUserWorkCorpus";
import { GREEN_NO_HINT_WORK_ONTOLOGY } from "../../src/lib/ai/workOntology/noHintSemanticAuditTypes";

type PlatformCheck = {
  name: string;
  command: string;
  args: string[];
  exit_code: number | null;
  passed: boolean;
  stdout_tail: string[];
  stderr_tail: string[];
};

function runPlatformCheck(name: string, command: string, args: string[], timeoutMs: number): PlatformCheck {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: timeoutMs,
    shell: process.platform === "win32",
  });
  return {
    name,
    command,
    args,
    exit_code: result.status,
    passed: result.status === 0,
    stdout_tail: (result.stdout ?? "").split(/\r?\n/).slice(-80),
    stderr_tail: (result.stderr ?? "").split(/\r?\n/).slice(-80),
  };
}

export function runNoHintWorkOntologyPlatformCloseout() {
  const typecheck = runPlatformCheck("typecheck", "npm", ["run", "verify:typecheck"], 5 * 60_000);
  const lint = runPlatformCheck("lint", "npm", ["run", "lint"], 5 * 60_000);
  const focusedTests = runPlatformCheck(
    "focused_tests",
    "npm",
    ["test", "--", "--runInBand", "tests/workOntologyNoHint"],
    8 * 60_000,
  );
  const release = runReleaseVerifyForNoHint();
  const semantic = readNoHintJson<{ final_status?: string; summary?: Record<string, unknown> }>("no_hint_semantic_results.json");
  const confusion = readNoHintJson<{ final_status?: string; summary?: Record<string, unknown> }>("no_hint_confusion_results.json");
  const ranking = readNoHintJson<{ final_status?: string }>("candidate_ranking_results.json");
  const head = currentHeadAtWriteTime();
  const originHead = gitOutput(["rev-parse", "@{u}"], "unknown");
  const worktreeCleanBeforeCloseout = gitOutput(["status", "--short"], "").trim().length === 0;
  const failures: unknown[] = [];

  if (semantic?.final_status !== GREEN_NO_HINT_WORK_ONTOLOGY) failures.push(`SEMANTIC_${semantic?.final_status ?? "MISSING"}`);
  if (confusion?.final_status !== GREEN_NO_HINT_WORK_ONTOLOGY) failures.push(`CONFUSION_${confusion?.final_status ?? "MISSING"}`);
  if (ranking?.final_status !== GREEN_NO_HINT_WORK_ONTOLOGY) failures.push(`RANKING_${ranking?.final_status ?? "MISSING"}`);
  if (!typecheck.passed) failures.push("TYPECHECK_FAILED");
  if (!lint.passed) failures.push("LINT_FAILED");
  if (!focusedTests.passed) failures.push("FOCUSED_TESTS_FAILED");
  if (release.final_status !== GREEN_NO_HINT_WORK_ONTOLOGY) failures.push(`RELEASE_${String(release.final_status)}`);
  if (head !== originHead) failures.push(`BRANCH_NOT_PUSHED:${head}:${originHead}`);
  if (!worktreeCleanBeforeCloseout) failures.push("WORKTREE_NOT_CLEAN_BEFORE_CLOSEOUT");

  const closeout = {
    final_status: failures.length === 0 ? GREEN_NO_HINT_WORK_ONTOLOGY : "BLOCKED_WORK_ONTOLOGY_NO_HINT_PLATFORM_CLOSEOUT",
    source_code_head: sourceCodeHead(),
    artifact_commit_before_closeout: head,
    origin_head: originHead,
    branch: gitOutput(["branch", "--show-current"], "unknown"),
    branch_pushed: head === originHead,
    typecheck_passed: typecheck.passed,
    lint_passed: lint.passed,
    focused_tests_passed: focusedTests.passed,
    release_verify_passed: release.final_status === GREEN_NO_HINT_WORK_ONTOLOGY,
    post_push_release_verify_passed: release.final_status === GREEN_NO_HINT_WORK_ONTOLOGY && head === originHead,
    local_head_equals_origin_head: head === originHead,
    final_worktree_clean: worktreeCleanBeforeCloseout,
    no_ios_runtime_claimed: true,
    ios_build_started: false,
    eas_build_started: false,
    testflight_started: false,
    platform_checks: [typecheck, lint, focusedTests],
    failures,
    fake_green_claimed: false,
  };
  writeNoHintJson("CLOSEOUT_PROOF.json", closeout);
  writeNoHintJson("matrix.json", buildNoHintMatrixSnapshot({
    ...closeout,
    release_verify_status: release.final_status,
    closeout_status: closeout.final_status,
  }));

  console.log(JSON.stringify(closeout, null, 2));
  assertNoHintFailures(failures, "NO_HINT_PLATFORM_CLOSEOUT_FAILED");
  return closeout;
}

if (require.main === module) {
  runNoHintWorkOntologyPlatformCloseout();
}
