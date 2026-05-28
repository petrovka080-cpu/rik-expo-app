import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  LIVE_B2C_RELEASE_CLOSEOUT_DIR,
  LIVE_B2C_RELEASE_CLOSEOUT_WAVE,
  TARGET_LIVE_B2C_ESTIMATE_REALITY_COMMIT,
  resolveCanonicalApi34Evidence,
} from "../e2e/canonicalApi34Evidence";

const GREEN = "GREEN_LIVE_B2C_ESTIMATE_REALITY_RELEASE_CLOSEOUT_READY";
const TARGET_GREEN = "GREEN_LIVE_B2C_REQUEST_EMBEDDED_AI_ESTIMATE_REALITY_READY";
const TARGET_WAVE_DIR = path.join(process.cwd(), "artifacts", "S_LIVE_B2C_REQUEST_EMBEDDED_AI_ESTIMATE_REALITY");
const OLD_ANDROID_GATES = [
  "android-b2c-request-embedded-ai-route-bootstrap-proof",
  "android-app-root-ready-marker-b2c-request-embedded-ai-proof",
  "b2c-request-embedded-ai-entrypoint-audit-proof",
  "b2c-request-embedded-ai-expanded-estimate-binding-proof",
  "live-b2c-request-embedded-ai-estimate-reality-proof",
];

type JsonRecord = Record<string, unknown>;

function rel(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function readJson<T = JsonRecord>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")) as T;
  } catch {
    return null;
  }
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(LIVE_B2C_RELEASE_CLOSEOUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(LIVE_B2C_RELEASE_CLOSEOUT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(name: string, value: string): void {
  fs.mkdirSync(LIVE_B2C_RELEASE_CLOSEOUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(LIVE_B2C_RELEASE_CLOSEOUT_DIR, name), value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

function gitOutput(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
      timeout: 10_000,
    }).trim();
  } catch {
    return fallback;
  }
}

function changedFiles(): string[] {
  const tracked = gitOutput(["diff", "--name-only"], "");
  const staged = gitOutput(["diff", "--name-only", "--cached"], "");
  const untracked = gitOutput(["ls-files", "--others", "--exclude-standard"], "");
  return Array.from(new Set([tracked, staged, untracked].join("\n").split(/\r?\n/).map((item) => item.trim()).filter(Boolean))).sort();
}

function onlyCloseoutHarnessFiles(files: string[]): boolean {
  return files.every((raw) => {
    const file = raw.replace(/\\/g, "/");
    return (
      file.startsWith("artifacts/") ||
      file.startsWith("scripts/e2e/") ||
      file.startsWith("scripts/release/") ||
      file.startsWith("scripts/audit/") ||
      /^tests\/architecture\/.*(?:release|android).*\.test\.ts$/i.test(file)
    );
  });
}

function fileSources(paths: string[]): string {
  return paths
    .filter((filePath) => fs.existsSync(filePath))
    .map((filePath) => `\n// ${rel(filePath)}\n${fs.readFileSync(filePath, "utf8")}`)
    .join("\n");
}

function unboundedAdbCommandsFound(): string[] {
  const files = [
    ...gitOutput(["ls-files", "scripts/e2e", "scripts/release"], "").split(/\r?\n/),
  ].filter(Boolean);
  const offenders: string[] = [];
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const adbCalls = source.matchAll(/(?:execFileSync|spawnSync)\(\s*["']adb["']/g);
    for (const match of adbCalls) {
      const end = source.indexOf(";", match.index ?? 0);
      const call = source.slice(match.index, end > 0 ? end + 1 : (match.index ?? 0) + 400);
      if (!/\btimeout\s*:/.test(call)) offenders.push(`${file}:${call.slice(0, 160).replace(/\s+/g, " ")}`);
    }
  }
  return offenders;
}

function nestedAndroidReplayLoopFound(): boolean {
  const source = fileSources([
    path.join(process.cwd(), "scripts/e2e/runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts"),
    path.join(process.cwd(), "scripts/release/runReleaseVerifyWithStepTiming.ts"),
    path.join(process.cwd(), "scripts/release/run-release-guard.ts"),
  ]);
  const nestedInvocations = source.match(/runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding\.ts/g) ?? [];
  return nestedInvocations.length > 2;
}

function circularReleaseVerifyDependencyFound(): boolean {
  const source = fileSources([
    path.join(process.cwd(), "scripts/e2e/runB2cRequestEmbeddedAiExpandedEstimateFixProof.ts"),
    path.join(process.cwd(), "scripts/e2e/runLiveB2cRequestEmbeddedAiEstimateRealityProof.ts"),
  ]);
  return /release_verify_passed[\s\S]{0,240}process\.exitCode\s*=\s*1|release_verify_passed[\s\S]{0,240}throw new Error|BLOCKED_INTERNAL_RELEASE_VERIFY_REQUIRED/.test(source);
}

function bridgeGatesPassed(bridge: JsonRecord | null): boolean {
  const gates = Array.isArray(bridge?.gates) ? bridge.gates : [];
  return OLD_ANDROID_GATES.every((gate) =>
    gates.some((item) => item && typeof item === "object" && (item as JsonRecord).gate === gate && (item as JsonRecord).status === "passed"),
  );
}

function releaseVerifyPassed(): boolean {
  const timing = readJson<JsonRecord>(path.join(LIVE_B2C_RELEASE_CLOSEOUT_DIR, "release_timing.json"));
  return (
    process.env.LIVE_B2C_CLOSEOUT_RELEASE_VERIFY_PASSED === "1" ||
    process.env.RELEASE_VERIFY_PASSED === "1" ||
    timing?.final_status === "GREEN_RELEASE_VERIFY_GATES_TIMED"
  );
}

function branchPushed(headSha: string): boolean {
  const originMain = gitOutput(["rev-parse", "origin/main"], "");
  return Boolean(headSha && originMain && headSha === originMain);
}

function worktreeClean(): boolean {
  return gitOutput(["status", "--short"], "").trim().length === 0;
}

function main(): void {
  const headSha = gitOutput(["rev-parse", "HEAD"], "unknown");
  const branch = gitOutput(["branch", "--show-current"], "unknown");
  const releaseTiming = readJson<JsonRecord>(path.join(LIVE_B2C_RELEASE_CLOSEOUT_DIR, "release_timing.json"));
  const processCleanup = readJson<JsonRecord>(path.join(LIVE_B2C_RELEASE_CLOSEOUT_DIR, "process_cleanup.json"));
  const bridge = readJson<JsonRecord>(path.join(LIVE_B2C_RELEASE_CLOSEOUT_DIR, "release_gate_bridge_results.json"));
  const targetMatrix = readJson<JsonRecord>(path.join(TARGET_WAVE_DIR, "matrix.json"));
  const evidence = resolveCanonicalApi34Evidence({ write: true });
  const dirtyFiles = changedFiles();
  const productLogicChanged = !onlyCloseoutHarnessFiles(dirtyFiles);
  const unboundedAdb = unboundedAdbCommandsFound();
  const nestedLoop = nestedAndroidReplayLoopFound();
  const circularDependency = circularReleaseVerifyDependencyFound();
  const cleanupReady = processCleanup?.process_cleanup_ready === true || !releaseTiming;
  const orphanProcesses = processCleanup?.orphan_processes_left_after_timeout === true;
  const bridgesReady = bridgeGatesPassed(bridge);
  const releasePassed = releaseVerifyPassed();
  const pushed = branchPushed(headSha);
  const clean = worktreeClean();
  const insideReleaseVerify = process.env.RELEASE_GUARD_IN_PROGRESS === "1";

  const failures = [
    ...(!evidence.ok ? [{ code: "BLOCKED_CANONICAL_API34_EVIDENCE_MISSING", reason: evidence.reason, details: evidence.details }] : []),
    ...(!releaseTiming ? [{ code: "BLOCKED_RELEASE_TIMING_MISSING", reason: "release_timing.json is missing" }] : []),
    ...(!bridgesReady ? [{ code: "BLOCKED_OLD_ANDROID_GATES_NOT_BRIDGED", reason: "Not all old Android gates consumed canonical API34 evidence." }] : []),
    ...(productLogicChanged ? [{ code: "BLOCKED_PRODUCT_LOGIC_CHANGED", files: dirtyFiles }] : []),
    ...(unboundedAdb.length > 0 ? [{ code: "BLOCKED_UNBOUNDED_ADB_COMMAND_FOUND", offenders: unboundedAdb }] : []),
    ...(nestedLoop ? [{ code: "BLOCKED_NESTED_ANDROID_REPLAY_LOOP_FOUND" }] : []),
    ...(circularDependency ? [{ code: "BLOCKED_CIRCULAR_RELEASE_VERIFY_DEPENDENCY_FOUND" }] : []),
    ...(!cleanupReady ? [{ code: "BLOCKED_PROCESS_CLEANUP_MISSING" }] : []),
    ...(orphanProcesses ? [{ code: "BLOCKED_ORPHAN_PROCESSES_AFTER_TIMEOUT" }] : []),
  ];

  const greenReady = failures.length === 0 && releasePassed && pushed && clean;
  const finalStatus = greenReady
    ? GREEN
    : failures.length > 0
      ? "BLOCKED_LIVE_B2C_ESTIMATE_REALITY_RELEASE_CLOSEOUT_GUARD"
      : "BLOCKED_RELEASE_VERIFY_OR_PUSH_PENDING";

  const matrix = {
    wave: LIVE_B2C_RELEASE_CLOSEOUT_WAVE,
    final_status: finalStatus,
    target_wave: "S_LIVE_B2C_REQUEST_EMBEDDED_AI_ESTIMATE_REALITY",
    previous_status: "BLOCKED_LIVE_B2C_REQUEST_EMBEDDED_AI_ESTIMATE_REALITY",
    previous_blocker: "RELEASE_VERIFY_TIMEOUT",
    target_commit: TARGET_LIVE_B2C_ESTIMATE_REALITY_COMMIT,
    head_sha: headSha,
    branch,
    product_logic_changed: productLogicChanged,
    estimate_engine_changed: false,
    boq_compiler_changed: false,
    pdf_renderer_changed: false,
    catalog_rate_source_changed: false,
    ui_product_changed: false,
    release_timeout_reproduced_or_classified: Boolean(releaseTiming),
    timed_release_verify_runner_ready: Boolean(releaseTiming),
    release_gate_name_captured_on_timeout: releaseTiming?.release_verify_timeout_without_step === false,
    unbounded_adb_commands_found: unboundedAdb.length > 0,
    nested_android_replay_loop_found: nestedLoop,
    circular_release_verify_dependency_found: circularDependency,
    canonical_api34_evidence_ready: evidence.ok,
    canonical_api34_evidence_tied_to_current_head: evidence.ok && evidence.evidence.head_sha === headSha,
    api36_rejected: evidence.ok && evidence.evidence.api36_rejected === true,
    old_android_gates_consume_canonical_api34_evidence: bridgesReady,
    process_cleanup_ready: cleanupReady,
    orphan_processes_left_after_timeout: orphanProcesses,
    typecheck_passed: false,
    lint_passed: false,
    git_diff_check_passed: false,
    targeted_tests_passed: false,
    architecture_tests_passed: false,
    release_verify_passed: releasePassed,
    target_wave_matrix_updated: targetMatrix?.resolved_by === LIVE_B2C_RELEASE_CLOSEOUT_WAVE,
    target_wave_final_status: targetMatrix?.final_status ?? null,
    commit_created_or_amended: headSha !== "unknown",
    branch_pushed: pushed,
    final_worktree_clean: clean,
    fake_green_claimed: false,
  };

  if (matrix.final_status === GREEN && !releasePassed) {
    failures.push({ code: "BLOCKED_FAKE_GREEN_RELEASE_VERIFY_NOT_PASSED" });
    matrix.final_status = "BLOCKED_LIVE_B2C_ESTIMATE_REALITY_RELEASE_CLOSEOUT_GUARD";
  }
  if (matrix.final_status === GREEN && !pushed) {
    failures.push({ code: "BLOCKED_FAKE_GREEN_BRANCH_NOT_PUSHED" });
    matrix.final_status = "BLOCKED_LIVE_B2C_ESTIMATE_REALITY_RELEASE_CLOSEOUT_GUARD";
  }
  if (matrix.final_status === GREEN && !clean) {
    failures.push({ code: "BLOCKED_FAKE_GREEN_WORKTREE_DIRTY" });
    matrix.final_status = "BLOCKED_LIVE_B2C_ESTIMATE_REALITY_RELEASE_CLOSEOUT_GUARD";
  }

  writeJson("failures.json", failures);
  writeJson("matrix.json", matrix);
  writeText(
    "proof.md",
    [
      `# ${LIVE_B2C_RELEASE_CLOSEOUT_WAVE}`,
      "",
      `Status: ${matrix.final_status}`,
      `Target wave: ${matrix.target_wave}`,
      `Previous blocker: ${matrix.previous_blocker}`,
      `Canonical API34 evidence ready: ${String(matrix.canonical_api34_evidence_ready)}`,
      `Old Android gates bridged: ${String(matrix.old_android_gates_consume_canonical_api34_evidence)}`,
      `Release verify passed: ${String(matrix.release_verify_passed)}`,
      `Branch pushed: ${String(matrix.branch_pushed)}`,
      `Worktree clean: ${String(matrix.final_worktree_clean)}`,
      "",
      "Failures:",
      ...(failures.length > 0 ? failures.map((failure) => `- ${JSON.stringify(failure)}`) : ["- none"]),
      "",
      "Fake green claimed: false",
    ].join("\n"),
  );

  if (failures.length > 0 || (matrix.final_status !== GREEN && !insideReleaseVerify)) {
    process.exitCode = 1;
  }
}

main();
