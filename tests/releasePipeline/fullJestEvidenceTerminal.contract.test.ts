import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  DETERMINISTIC_FULL_JEST_SCHEMA_VERSION,
  DETERMINISTIC_FULL_JEST_SUBJECT_INPUT_PATHS,
  DETERMINISTIC_FULL_JEST_GREEN_STATUS,
  buildDeterministicFullJestSubjectInputs,
  deterministicFullJestShardPlanSemanticHash,
  validateDeterministicFullJestTerminal,
  type FullJestEvidenceContext,
} from "../../scripts/release/fullJestEvidence";

function sha256(value: string | Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

type MutableRawJestFixture = {
  success: boolean;
  numFailedTestSuites: number;
  numFailedTests: number;
  numTodoTests: number;
  testResults: {
    status: string;
    assertionResults: { status: string }[];
  }[];
};

function buildFixture() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "deterministic-full-jest-terminal-"));
  for (const relativePath of DETERMINISTIC_FULL_JEST_SUBJECT_INPUT_PATHS) {
    const fullPath = path.join(rootDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, `fixture subject input: ${relativePath}\n`, "utf8");
  }
  const testPaths = ["tests/a.test.ts", "tests/b.test.ts"];
  const contents = ["test('a', () => expect(true).toBe(true));\n", "test('b', () => expect(true).toBe(true));\n"];
  const files = testPaths.map((testPath, index) => {
    const fullPath = path.join(rootDir, testPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, contents[index], "utf8");
    return {
      test_path: testPath,
      source_bytes: Buffer.byteLength(contents[index]),
      declared_tests: 1,
      weight: Buffer.byteLength(contents[index]) + 4096,
      content_sha256: sha256(contents[index]),
    };
  });
  const manifestHash = sha256(testPaths.join("\n"));
  const manifestContentHash = sha256(files.map((entry) => `${entry.test_path}\0${entry.content_sha256}`).join("\n"));
  const context: FullJestEvidenceContext = {
    headSha: "1111111111111111111111111111111111111111",
    headTreeSha: "3333333333333333333333333333333333333333",
    branch: "fixture-branch",
    changedFiles: [...testPaths],
    workspaceFingerprint: "2222222222222222222222222222222222222222222222222222222222222222",
  };
  const runDir = path.join(rootDir, ".release-runtime", "deterministic-full-jest", context.headSha, "fixture-run");
  fs.mkdirSync(runDir, { recursive: true });
  const subjectInputs = buildDeterministicFullJestSubjectInputs(rootDir, context);
  const manifest = {
    schema_version: DETERMINISTIC_FULL_JEST_SCHEMA_VERSION,
    evidence_class: "fixture",
    producer: "scripts/release/runDeterministicShardedFullJest.ts",
    subject_sha: context.headSha,
    branch: context.branch,
    subject_inputs: subjectInputs,
    workspace_fingerprint: context.workspaceFingerprint,
    allowed_workspace_overlay_paths: [...context.changedFiles],
    manifest_hash: manifestHash,
    manifest_content_hash: manifestContentHash,
    test_files_count: files.length,
    files,
  };
  const planShards = files.map((entry, shardId) => ({
    shard_id: shardId,
    weight: entry.weight,
    test_files: [entry.test_path],
  }));
  const shardPlanSemanticHash = deterministicFullJestShardPlanSemanticHash(planShards);
  const plan = {
    schema_version: DETERMINISTIC_FULL_JEST_SCHEMA_VERSION,
    evidence_class: "fixture",
    producer: "scripts/release/runDeterministicShardedFullJest.ts",
    subject_sha: context.headSha,
    branch: context.branch,
    subject_inputs: subjectInputs,
    manifest_hash: manifestHash,
    requested_shards: files.length,
    concurrency: 1,
    microbatch_files: 1,
    microbatch_timeout_ms: 1_200_000,
    shard_plan_semantic_hash: shardPlanSemanticHash,
    validation: { missing: [], duplicates: [], unexpected: [] },
    shards: planShards,
  };
  const manifestPath = path.join(runDir, "manifest.json");
  const planPath = path.join(runDir, "shard-plan.json");
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  fs.writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  const rawPaths: string[] = [];
  const shards = files.map((entry, shardId) => {
    const shardDir = path.join(runDir, `shard-${String(shardId + 1).padStart(2, "0")}`);
    const microbatchDir = path.join(shardDir, "microbatch-001");
    fs.mkdirSync(microbatchDir, { recursive: true });
    const rawPath = path.join(microbatchDir, "jest.json");
    rawPaths.push(rawPath);
    const raw = {
      numFailedTestSuites: 0,
      numFailedTests: 0,
      numPassedTestSuites: 1,
      numPassedTests: 1,
      numPendingTestSuites: 0,
      numPendingTests: 0,
      numRuntimeErrorTestSuites: 0,
      numTodoTests: 0,
      numTotalTestSuites: 1,
      numTotalTests: 1,
      success: true,
      wasInterrupted: false,
      testResults: [{
        name: path.join(rootDir, entry.test_path),
        status: "passed",
        assertionResults: [{
          ancestorTitles: ["fixture"],
          fullName: `fixture ${entry.test_path}`,
          status: "passed",
          title: entry.test_path,
        }],
      }],
    };
    fs.writeFileSync(rawPath, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
    const microbatch = {
      microbatch_id: 0,
      started_at: "2026-09-09T00:00:00.000Z",
      ended_at: "2026-09-09T00:00:01.000Z",
      duration_ms: 1_000,
      exit_code: 0,
      signal: null,
      test_files: [entry.test_path],
      jest_json_path: path.relative(rootDir, rawPath).replace(/\\/g, "/"),
      peak_memory_path: path.relative(rootDir, path.join(microbatchDir, "peak-memory.json")).replace(/\\/g, "/"),
      stdout_path: path.relative(rootDir, path.join(microbatchDir, "stdout.log")).replace(/\\/g, "/"),
      stderr_path: path.relative(rootDir, path.join(microbatchDir, "stderr.log")).replace(/\\/g, "/"),
      peak_rss_bytes: 1,
      peak_heap_used_bytes: 1,
      jest_success: true,
      num_failed_test_suites: 0,
      num_failed_tests: 0,
      num_pending_test_suites: 0,
      num_pending_tests: 0,
      num_total_test_suites: 1,
      num_total_tests: 1,
      observed_test_files: [entry.test_path],
      jest_json_sha256: sha256(fs.readFileSync(rawPath)),
      timed_out: false,
      timeout_ms: 1_200_000,
      terminal_reason: "completed",
      cleanup_attempted: false,
      cleanup_succeeded: false,
      orphan_detected: false,
    };
    fs.writeFileSync(path.join(microbatchDir, "metadata.json"), `${JSON.stringify(microbatch, null, 2)}\n`, "utf8");
    fs.writeFileSync(path.join(microbatchDir, "manifest.json"), `${JSON.stringify({
      schema_version: DETERMINISTIC_FULL_JEST_SCHEMA_VERSION,
      evidence_class: "fixture",
      producer: "scripts/release/runDeterministicShardedFullJest.ts",
      subject_sha: context.headSha,
      manifest_hash: manifestHash,
      shard_id: shardId,
      microbatch_id: 0,
      test_files: [entry.test_path],
    }, null, 2)}\n`, "utf8");
    return {
      shard_id: shardId,
      subject_sha: context.headSha,
      manifest_hash: manifestHash,
      started_at: "2026-09-09T00:00:00.000Z",
      ended_at: "2026-09-09T00:00:01.000Z",
      duration_ms: 1_000,
      exit_code: 0,
      signal: null,
      test_files: [entry.test_path],
      jest_json_path: path.relative(rootDir, path.join(shardDir, "jest.json")).replace(/\\/g, "/"),
      peak_memory_path: path.relative(rootDir, path.join(shardDir, "peak-memory.json")).replace(/\\/g, "/"),
      stdout_path: path.relative(rootDir, path.join(shardDir, "stdout.log")).replace(/\\/g, "/"),
      stderr_path: path.relative(rootDir, path.join(shardDir, "stderr.log")).replace(/\\/g, "/"),
      peak_rss_bytes: 1,
      peak_heap_used_bytes: 1,
      jest_success: true,
      num_failed_test_suites: 0,
      num_failed_tests: 0,
      num_pending_test_suites: 0,
      num_pending_tests: 0,
      num_total_test_suites: 1,
      num_total_tests: 1,
      observed_test_files: [entry.test_path],
      microbatches: [microbatch],
    };
  });
  const terminal = {
    schema_version: DETERMINISTIC_FULL_JEST_SCHEMA_VERSION,
    evidence_class: "fixture",
    producer: "scripts/release/runDeterministicShardedFullJest.ts",
    terminal_complete: true,
    final_status: DETERMINISTIC_FULL_JEST_GREEN_STATUS,
    subject_sha: context.headSha,
    branch: context.branch,
    subject_inputs: subjectInputs,
    started_at: "2026-09-09T00:00:00.000Z",
    ended_at: "2026-09-09T00:00:02.000Z",
    duration_ms: 2_000,
    manifest_hash: manifestHash,
    manifest_content_hash: manifestContentHash,
    manifest_file_sha256: sha256(fs.readFileSync(manifestPath)),
    shard_plan_file_sha256: sha256(fs.readFileSync(planPath)),
    shard_plan_semantic_hash: shardPlanSemanticHash,
    manifest_files: files.length,
    requested_shards: files.length,
    planned_shards: shards.length,
    concurrency: 1,
    microbatch_files: 1,
    microbatch_timeout_ms: 1_200_000,
    microbatches: shards.length,
    workspace_fingerprint_before: context.workspaceFingerprint,
    workspace_fingerprint_after: context.workspaceFingerprint,
    workspace_stable: true,
    allowed_workspace_overlay_paths: [...context.changedFiles],
    missing_files: [],
    duplicate_files: [],
    unexpected_files: [],
    all_shard_exits_zero: true,
    all_jest_success: true,
    no_pending_tests: true,
    no_timeouts_or_orphans: true,
    all_results_same_subject_sha: true,
    num_failed_test_suites: 0,
    num_failed_tests: 0,
    num_pending_test_suites: 0,
    num_pending_tests: 0,
    num_total_test_suites: files.length,
    num_total_tests: files.length,
    shards,
    fake_green_claimed: false,
  };
  const terminalPath = path.join(runDir, "terminal-summary.json");
  const writeTerminal = () => fs.writeFileSync(terminalPath, `${JSON.stringify(terminal, null, 2)}\n`, "utf8");
  const writeMicrobatchMetadata = (shardId: number) => {
    const microbatch = terminal.shards[shardId].microbatches[0];
    fs.writeFileSync(path.join(path.dirname(rawPaths[shardId]), "metadata.json"), `${JSON.stringify(microbatch, null, 2)}\n`, "utf8");
  };
  writeTerminal();
  return {
    rootDir,
    context,
    manifest,
    plan,
    terminal,
    terminalPath,
    rawPaths,
    writeTerminal,
    writeMicrobatchMetadata,
  };
}

describe("deterministic full Jest terminal evidence", () => {
  const validateFixture = (fixture: ReturnType<typeof buildFixture>) =>
    validateDeterministicFullJestTerminal(
      fixture.terminalPath,
      fixture.context,
      fixture.rootDir,
      "contract_fixture",
    );

  it("accepts a complete current terminal with exact manifest membership and hashes", () => {
    const fixture = buildFixture();
    try {
      expect(validateFixture(fixture)).toMatchObject({
        passed: true,
        errors: [],
      });
    } finally {
      fs.rmSync(fixture.rootDir, { recursive: true, force: true });
    }
  });

  it.each([
    ["red status", (fixture: ReturnType<typeof buildFixture>) => {
      (fixture.terminal as { final_status: string }).final_status =
        "STOP_ESTIMATE_V4_CURRENT_CORE_DETERMINISTIC_SHARDED_FULL_JEST";
    }, "DETERMINISTIC_FULL_JEST_NOT_GREEN"],
    ["stale SHA", (fixture: ReturnType<typeof buildFixture>) => {
      fixture.terminal.subject_sha = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    }, "DETERMINISTIC_FULL_JEST_SUBJECT_SHA_STALE"],
    ["stale fingerprint", (fixture: ReturnType<typeof buildFixture>) => {
      fixture.terminal.workspace_fingerprint_after = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    }, "DETERMINISTIC_FULL_JEST_WORKSPACE_FINGERPRINT_STALE_OR_UNSTABLE"],
    ["missing observed test", (fixture: ReturnType<typeof buildFixture>) => {
      fixture.terminal.shards[0].observed_test_files = [];
    }, "DETERMINISTIC_FULL_JEST_OBSERVED_MEMBERSHIP_INVALID"],
    ["duplicate observed test", (fixture: ReturnType<typeof buildFixture>) => {
      fixture.terminal.shards[0].observed_test_files.push("tests/b.test.ts");
    }, "DETERMINISTIC_FULL_JEST_OBSERVED_MEMBERSHIP_INVALID"],
    ["pending test", (fixture: ReturnType<typeof buildFixture>) => {
      fixture.terminal.shards[0].num_pending_tests = 1;
    }, "DETERMINISTIC_FULL_JEST_SHARD_NOT_GREEN:0"],
  ])("rejects %s", (_name, mutate, expectedError) => {
    const fixture = buildFixture();
    try {
      mutate(fixture);
      fixture.writeTerminal();
      const result = validateFixture(fixture);
      expect(result.passed).toBe(false);
      expect(result.errors).toContain(expectedError);
    } finally {
      fs.rmSync(fixture.rootDir, { recursive: true, force: true });
    }
  });

  it("rejects a manifest entry whose file content changed after discovery", () => {
    const fixture = buildFixture();
    try {
      fs.appendFileSync(path.join(fixture.rootDir, "tests/a.test.ts"), "// changed\n", "utf8");
      const result = validateFixture(fixture);
      expect(result.passed).toBe(false);
      expect(result.errors).toContain("DETERMINISTIC_FULL_JEST_MANIFEST_FILE_HASH_MISMATCH:tests/a.test.ts");
    } finally {
      fs.rmSync(fixture.rootDir, { recursive: true, force: true });
    }
  });

  it("never promotes a contract fixture as actual environment evidence", () => {
    const fixture = buildFixture();
    try {
      const result = validateDeterministicFullJestTerminal(
        fixture.terminalPath,
        fixture.context,
        fixture.rootDir,
      );
      expect(result.passed).toBe(false);
      expect(result.errors).toContain("DETERMINISTIC_FULL_JEST_EVIDENCE_CLASS_INVALID");
    } finally {
      fs.rmSync(fixture.rootDir, { recursive: true, force: true });
    }
  });

  it("rejects a missing raw Jest result", () => {
    const fixture = buildFixture();
    try {
      fs.rmSync(fixture.rawPaths[0]);
      const result = validateFixture(fixture);
      expect(result.passed).toBe(false);
      expect(result.errors).toContain("DETERMINISTIC_FULL_JEST_RAW_JEST_MISSING:0:0");
    } finally {
      fs.rmSync(fixture.rootDir, { recursive: true, force: true });
    }
  });

  it.each([
    ["failed assertion under a GREEN summary", (raw: MutableRawJestFixture) => {
      raw.testResults[0].status = "failed";
      raw.testResults[0].assertionResults[0].status = "failed";
      raw.numFailedTestSuites = 1;
      raw.numFailedTests = 1;
      raw.success = false;
    }],
    ["missing assertion", (raw: MutableRawJestFixture) => {
      raw.testResults[0].assertionResults = [];
    }],
    ["todo assertion", (raw: MutableRawJestFixture) => {
      raw.testResults[0].assertionResults[0].status = "todo";
      raw.numTodoTests = 1;
    }],
  ])("recomputes raw results and rejects %s", (_name, mutate) => {
    const fixture = buildFixture();
    try {
      const raw = JSON.parse(fs.readFileSync(fixture.rawPaths[0], "utf8")) as MutableRawJestFixture;
      mutate(raw);
      fs.writeFileSync(fixture.rawPaths[0], `${JSON.stringify(raw, null, 2)}\n`, "utf8");
      const result = validateFixture(fixture);
      expect(result.passed).toBe(false);
      expect(result.errors).toContain("DETERMINISTIC_FULL_JEST_RAW_JEST_NOT_GREEN:0:0");
    } finally {
      fs.rmSync(fixture.rootDir, { recursive: true, force: true });
    }
  });

  it.each([
    ["nonzero child exit", (fixture: ReturnType<typeof buildFixture>) => {
      fixture.terminal.shards[0].microbatches[0].exit_code = 1;
    }],
    ["timeout and orphan", (fixture: ReturnType<typeof buildFixture>) => {
      fixture.terminal.shards[0].microbatches[0].timed_out = true;
      fixture.terminal.shards[0].microbatches[0].orphan_detected = true;
      fixture.terminal.shards[0].microbatches[0].terminal_reason = "timeout";
    }],
  ])("rejects %s even when aggregate fields claim GREEN", (_name, mutate) => {
    const fixture = buildFixture();
    try {
      mutate(fixture);
      fixture.writeMicrobatchMetadata(0);
      fixture.writeTerminal();
      const result = validateFixture(fixture);
      expect(result.passed).toBe(false);
      expect(result.errors).toContain("DETERMINISTIC_FULL_JEST_MICROBATCH_NOT_COMPLETE:0:0");
    } finally {
      fs.rmSync(fixture.rootDir, { recursive: true, force: true });
    }
  });

  it("rejects a duplicate shard-plan assignment after recomputing membership", () => {
    const fixture = buildFixture();
    try {
      fixture.plan.shards[0].test_files.push("tests/b.test.ts");
      fixture.plan.shard_plan_semantic_hash = deterministicFullJestShardPlanSemanticHash(fixture.plan.shards);
      fs.writeFileSync(
        path.join(path.dirname(fixture.terminalPath), "shard-plan.json"),
        `${JSON.stringify(fixture.plan, null, 2)}\n`,
        "utf8",
      );
      fixture.terminal.shard_plan_semantic_hash = fixture.plan.shard_plan_semantic_hash;
      fixture.terminal.shard_plan_file_sha256 = sha256(fs.readFileSync(path.join(path.dirname(fixture.terminalPath), "shard-plan.json")));
      fixture.writeTerminal();
      const result = validateFixture(fixture);
      expect(result.passed).toBe(false);
      expect(result.errors).toContain("DETERMINISTIC_FULL_JEST_SHARD_PLAN_MEMBERSHIP_INVALID");
    } finally {
      fs.rmSync(fixture.rootDir, { recursive: true, force: true });
    }
  });

  it("rejects byte-hash drift even when semantic manifest hashes still match", () => {
    const fixture = buildFixture();
    try {
      fixture.terminal.manifest_file_sha256 = "a".repeat(64);
      fixture.writeTerminal();
      const result = validateFixture(fixture);
      expect(result.passed).toBe(false);
      expect(result.errors).toContain("DETERMINISTIC_FULL_JEST_ARTIFACT_BYTE_HASH_MISMATCH");
    } finally {
      fs.rmSync(fixture.rootDir, { recursive: true, force: true });
    }
  });

  it("rejects a partial terminal", () => {
    const fixture = buildFixture();
    try {
      fixture.terminal.terminal_complete = false;
      fixture.writeTerminal();
      const result = validateFixture(fixture);
      expect(result.passed).toBe(false);
      expect(result.errors).toContain("DETERMINISTIC_FULL_JEST_TERMINAL_PARTIAL_OR_INCOMPLETE");
    } finally {
      fs.rmSync(fixture.rootDir, { recursive: true, force: true });
    }
  });

  it("rejects malformed terminal JSON", () => {
    const fixture = buildFixture();
    try {
      fs.writeFileSync(fixture.terminalPath, "{broken", "utf8");
      const result = validateFixture(fixture);
      expect(result.passed).toBe(false);
      expect(result.errors).toContain("DETERMINISTIC_FULL_JEST_TERMINAL_MALFORMED");
    } finally {
      fs.rmSync(fixture.rootDir, { recursive: true, force: true });
    }
  });
});
