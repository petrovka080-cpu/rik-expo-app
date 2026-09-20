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
  headTreeSha: string;
  branch: string;
  changedFiles: string[];
  workspaceFingerprint: string;
};

export const DETERMINISTIC_FULL_JEST_SCHEMA_VERSION =
  "deterministic-full-jest/v2" as const;
export const DETERMINISTIC_FULL_JEST_GREEN_STATUS =
  "GREEN_ESTIMATE_V4_CURRENT_CORE_DETERMINISTIC_SHARDED_FULL_JEST" as const;

export const DETERMINISTIC_FULL_JEST_SUBJECT_INPUT_PATHS = [
  "package.json",
  "package-lock.json",
  "jest.config.js",
  "jest.setup.js",
  "babel.config.js",
  "scripts/release/runDeterministicShardedFullJest.ts",
  "scripts/release/jestPeakMemoryReporter.cjs",
] as const;

export type DeterministicFullJestValidationMode = "actual_environment" | "contract_fixture";

export type DeterministicFullJestTerminalValidation = {
  passed: boolean;
  terminalPath: string | null;
  manifestPath: string | null;
  errors: string[];
  terminal: Record<string, unknown>;
  manifest: Record<string, unknown>;
};

export function git(args: string[], fallback = "", rootDir = process.cwd()): string {
  try {
    return execFileSync("git", args, {
      cwd: rootDir,
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

export function changedFiles(rootDir = process.cwd()): string[] {
  const tracked = git(["diff", "--name-only"], "", rootDir);
  const staged = git(["diff", "--name-only", "--cached"], "", rootDir);
  const untracked = git(["ls-files", "--others", "--exclude-standard"], "", rootDir);
  return Array.from(
    new Set([tracked, staged, untracked].join("\n").split(/\r?\n/).map((item) => item.trim()).filter(Boolean)),
  ).sort();
}

export function computeWorkspaceFingerprint(files: string[], rootDir = process.cwd()): string {
  const hash = crypto.createHash("sha256");
  hash.update(git(["rev-parse", "HEAD"], "unknown", rootDir));
  for (const file of files) {
    const normalized = file.replace(/\\/g, "/");
    const absolutePath = path.join(rootDir, normalized);
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

export function buildFullJestEvidenceContext(rootDir = process.cwd()): FullJestEvidenceContext {
  const files = changedFiles(rootDir);
  return {
    headSha: git(["rev-parse", "HEAD"], "unknown", rootDir),
    headTreeSha: git(["rev-parse", "HEAD^{tree}"], "unknown", rootDir),
    branch: git(["branch", "--show-current"], "unknown", rootDir),
    changedFiles: files,
    workspaceFingerprint: computeWorkspaceFingerprint(files, rootDir),
  };
}

export function buildDeterministicFullJestSubjectInputs(
  rootDir: string,
  context: FullJestEvidenceContext,
) {
  return {
    head_sha: context.headSha,
    head_tree_sha: context.headTreeSha,
    branch: context.branch,
    workspace_fingerprint: context.workspaceFingerprint,
    node_version: process.version,
    input_files: DETERMINISTIC_FULL_JEST_SUBJECT_INPUT_PATHS.map((relativePath) => {
      const absolutePath = path.join(rootDir, relativePath);
      return {
        path: relativePath,
        content_sha256: fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()
          ? sha256(fs.readFileSync(absolutePath))
          : null,
      };
    }),
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

function stringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value as string[]
    : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sha256(value: string | Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizedFiles(files: readonly string[]): string[] {
  return files.map((file) => file.replace(/\\/g, "/")).sort((left, right) => left.localeCompare(right, "en"));
}

export function deterministicFullJestShardPlanSemanticHash(shards: unknown): string {
  return sha256(JSON.stringify(shards));
}

type JsonArtifact = {
  exists: boolean;
  valid: boolean;
  bytes: Buffer;
  value: Record<string, unknown>;
};

function readJsonArtifact(filePath: string): JsonArtifact {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return { exists: false, valid: false, bytes: Buffer.alloc(0), value: {} };
  }
  const bytes = fs.readFileSync(filePath);
  try {
    const parsed = JSON.parse(bytes.toString("utf8")) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { exists: true, valid: false, bytes, value: {} };
    }
    return { exists: true, valid: true, bytes, value: parsed as Record<string, unknown> };
  } catch {
    return { exists: true, valid: false, bytes, value: {} };
  }
}

function recordArray(value: unknown): Record<string, unknown>[] | null {
  return Array.isArray(value) && value.every((item) =>
    typeof item === "object" && item !== null && !Array.isArray(item))
    ? value as Record<string, unknown>[]
    : null;
}

function exactStringArrays(left: unknown, right: readonly string[]): boolean {
  const values = stringArray(left);
  return values !== null && JSON.stringify(values.map((value) => value.replace(/\\/g, "/"))) === JSON.stringify(right);
}

function validCompletedInterval(record: Record<string, unknown>): boolean {
  if (typeof record.started_at !== "string" || typeof record.ended_at !== "string") return false;
  const started = Date.parse(record.started_at);
  const ended = Date.parse(record.ended_at);
  const duration = finiteNumber(record.duration_ms);
  return Number.isFinite(started) && Number.isFinite(ended) && ended >= started &&
    duration !== null && duration >= 0 && Math.abs((ended - started) - duration) < 2_000;
}

function resolveRunArtifactPath(input: {
  rootDir: string;
  runDir: string;
  value: unknown;
  errors: string[];
  code: string;
}): string | null {
  if (typeof input.value !== "string" || !input.value.trim()) {
    input.errors.push(`${input.code}_PATH_INVALID`);
    return null;
  }
  const absolute = path.resolve(input.rootDir, input.value);
  const relativeToRoot = path.relative(path.resolve(input.rootDir), absolute);
  const relativeToRun = path.relative(path.resolve(input.runDir), absolute);
  if (
    relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot) ||
    relativeToRun.startsWith("..") || path.isAbsolute(relativeToRun)
  ) {
    input.errors.push(`${input.code}_PATH_OUTSIDE_RUN`);
    return null;
  }
  return absolute;
}

const JEST_COUNTER_FIELDS = [
  ["num_failed_test_suites", "numFailedTestSuites"],
  ["num_failed_tests", "numFailedTests"],
  ["num_pending_test_suites", "numPendingTestSuites"],
  ["num_pending_tests", "numPendingTests"],
  ["num_total_test_suites", "numTotalTestSuites"],
  ["num_total_tests", "numTotalTests"],
] as const;

function sumNumbers(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}

export function validateDeterministicFullJestTerminal(
  terminalPath: string | null,
  context: FullJestEvidenceContext,
  rootDir = process.cwd(),
  mode: DeterministicFullJestValidationMode = "actual_environment",
): DeterministicFullJestTerminalValidation {
  const errors: string[] = [];
  if (!terminalPath || !fs.existsSync(terminalPath)) {
    return {
      passed: false,
      terminalPath,
      manifestPath: terminalPath ? path.join(path.dirname(terminalPath), "manifest.json") : null,
      errors: ["DETERMINISTIC_FULL_JEST_TERMINAL_MISSING"],
      terminal: {},
      manifest: {},
    };
  }
  const runDir = path.dirname(terminalPath);
  const manifestPath = path.join(path.dirname(terminalPath), "manifest.json");
  const planPath = path.join(path.dirname(terminalPath), "shard-plan.json");
  const terminalArtifact = readJsonArtifact(terminalPath);
  const manifestArtifact = readJsonArtifact(manifestPath);
  const planArtifact = readJsonArtifact(planPath);
  const terminal = terminalArtifact.value;
  const manifest = manifestArtifact.value;
  const plan = planArtifact.value;
  if (!terminalArtifact.valid) errors.push("DETERMINISTIC_FULL_JEST_TERMINAL_MALFORMED");
  if (!manifestArtifact.exists) errors.push("DETERMINISTIC_FULL_JEST_MANIFEST_MISSING_OR_EMPTY");
  else if (!manifestArtifact.valid) errors.push("DETERMINISTIC_FULL_JEST_MANIFEST_MALFORMED");
  if (!planArtifact.exists) errors.push("DETERMINISTIC_FULL_JEST_SHARD_PLAN_MISSING");
  else if (!planArtifact.valid) errors.push("DETERMINISTIC_FULL_JEST_SHARD_PLAN_MALFORMED");
  const manifestFiles = Array.isArray(manifest.files)
    ? manifest.files.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null && !Array.isArray(item))
    : [];
  const manifestTestPaths = manifestFiles
    .map((item) => typeof item.test_path === "string" ? item.test_path.replace(/\\/g, "/") : "")
    .filter(Boolean);
  const manifestHash = sha256(manifestTestPaths.join("\n"));
  const manifestContentHash = sha256(manifestFiles.map((item) =>
    `${typeof item.test_path === "string" ? item.test_path.replace(/\\/g, "/") : ""}\0${typeof item.content_sha256 === "string" ? item.content_sha256 : ""}`,
  ).join("\n"));

  if (
    terminal.schema_version !== DETERMINISTIC_FULL_JEST_SCHEMA_VERSION ||
    manifest.schema_version !== DETERMINISTIC_FULL_JEST_SCHEMA_VERSION ||
    plan.schema_version !== DETERMINISTIC_FULL_JEST_SCHEMA_VERSION
  ) errors.push("DETERMINISTIC_FULL_JEST_SCHEMA_UNSUPPORTED");
  if (terminal.terminal_complete !== true || !validCompletedInterval(terminal)) {
    errors.push("DETERMINISTIC_FULL_JEST_TERMINAL_PARTIAL_OR_INCOMPLETE");
  }
  const expectedEvidenceClass = mode === "contract_fixture" ? "fixture" : "actual_environment";
  if (
    terminal.evidence_class !== expectedEvidenceClass ||
    manifest.evidence_class !== expectedEvidenceClass ||
    plan.evidence_class !== expectedEvidenceClass
  ) errors.push("DETERMINISTIC_FULL_JEST_EVIDENCE_CLASS_INVALID");
  if (
    terminal.producer !== "scripts/release/runDeterministicShardedFullJest.ts" ||
    manifest.producer !== "scripts/release/runDeterministicShardedFullJest.ts" ||
    plan.producer !== "scripts/release/runDeterministicShardedFullJest.ts"
  ) errors.push("DETERMINISTIC_FULL_JEST_PRODUCER_INVALID");
  if (terminal.final_status !== DETERMINISTIC_FULL_JEST_GREEN_STATUS) errors.push("DETERMINISTIC_FULL_JEST_NOT_GREEN");
  if (terminal.fake_green_claimed !== false) errors.push("DETERMINISTIC_FULL_JEST_FAKE_GREEN_FIELD_INVALID");
  if (terminal.subject_sha !== context.headSha || manifest.subject_sha !== context.headSha || plan.subject_sha !== context.headSha) {
    errors.push("DETERMINISTIC_FULL_JEST_SUBJECT_SHA_STALE");
  }
  if (terminal.branch !== context.branch || manifest.branch !== context.branch || plan.branch !== context.branch) {
    errors.push("DETERMINISTIC_FULL_JEST_BRANCH_STALE");
  }
  const expectedSubjectInputs = buildDeterministicFullJestSubjectInputs(rootDir, context);
  if (expectedSubjectInputs.input_files.some((entry) => entry.content_sha256 === null)) {
    errors.push("DETERMINISTIC_FULL_JEST_REQUIRED_SUBJECT_INPUT_MISSING");
  }
  if (
    JSON.stringify(manifest.subject_inputs) !== JSON.stringify(expectedSubjectInputs) ||
    JSON.stringify(plan.subject_inputs) !== JSON.stringify(expectedSubjectInputs) ||
    JSON.stringify(terminal.subject_inputs) !== JSON.stringify(expectedSubjectInputs)
  ) errors.push("DETERMINISTIC_FULL_JEST_SUBJECT_INPUTS_STALE");
  if (
    terminal.workspace_fingerprint_before !== context.workspaceFingerprint ||
    terminal.workspace_fingerprint_after !== context.workspaceFingerprint ||
    manifest.workspace_fingerprint !== context.workspaceFingerprint ||
    terminal.workspace_stable !== true
  ) {
    errors.push("DETERMINISTIC_FULL_JEST_WORKSPACE_FINGERPRINT_STALE_OR_UNSTABLE");
  }
  const expectedOverlay = normalizedFiles(context.changedFiles);
  const terminalOverlay = stringArray(terminal.allowed_workspace_overlay_paths);
  const manifestOverlay = stringArray(manifest.allowed_workspace_overlay_paths);
  if (
    !terminalOverlay || !manifestOverlay ||
    JSON.stringify(normalizedFiles(terminalOverlay)) !== JSON.stringify(expectedOverlay) ||
    JSON.stringify(normalizedFiles(manifestOverlay)) !== JSON.stringify(expectedOverlay)
  ) {
    errors.push("DETERMINISTIC_FULL_JEST_WORKSPACE_OVERLAY_MISMATCH");
  }
  if (manifestFiles.length === 0) {
    errors.push("DETERMINISTIC_FULL_JEST_MANIFEST_MISSING_OR_EMPTY");
  }
  if (
    manifest.manifest_hash !== manifestHash || terminal.manifest_hash !== manifestHash ||
    manifest.manifest_content_hash !== manifestContentHash || terminal.manifest_content_hash !== manifestContentHash
  ) {
    errors.push("DETERMINISTIC_FULL_JEST_MANIFEST_HASH_MISMATCH");
  }
  if (
    terminal.manifest_file_sha256 !== sha256(manifestArtifact.bytes) ||
    terminal.shard_plan_file_sha256 !== sha256(planArtifact.bytes)
  ) errors.push("DETERMINISTIC_FULL_JEST_ARTIFACT_BYTE_HASH_MISMATCH");
  const planShards = recordArray(plan.shards) ?? [];
  const planSemanticHash = deterministicFullJestShardPlanSemanticHash(planShards);
  if (
    plan.shard_plan_semantic_hash !== planSemanticHash ||
    terminal.shard_plan_semantic_hash !== planSemanticHash
  ) errors.push("DETERMINISTIC_FULL_JEST_SHARD_PLAN_SEMANTIC_HASH_MISMATCH");
  const uniqueManifestPaths = new Set(manifestTestPaths);
  if (
    manifestTestPaths.length !== manifestFiles.length ||
    uniqueManifestPaths.size !== manifestTestPaths.length ||
    finiteNumber(manifest.test_files_count) !== manifestTestPaths.length ||
    finiteNumber(terminal.manifest_files) !== manifestTestPaths.length
  ) {
    errors.push("DETERMINISTIC_FULL_JEST_MANIFEST_MEMBERSHIP_INVALID");
  }
  if (JSON.stringify(manifestTestPaths) !== JSON.stringify(normalizedFiles(manifestTestPaths))) {
    errors.push("DETERMINISTIC_FULL_JEST_MANIFEST_ORDER_INVALID");
  }
  for (const entry of manifestFiles) {
    const testPath = typeof entry.test_path === "string" ? entry.test_path.replace(/\\/g, "/") : "";
    const absolutePath = path.resolve(rootDir, testPath);
    const relative = path.relative(path.resolve(rootDir), absolutePath);
    if (!testPath || relative.startsWith("..") || path.isAbsolute(relative) || !fs.existsSync(absolutePath)) {
      errors.push(`DETERMINISTIC_FULL_JEST_MANIFEST_FILE_MISSING:${testPath || "invalid"}`);
      continue;
    }
    if (entry.content_sha256 !== sha256(fs.readFileSync(absolutePath))) {
      errors.push(`DETERMINISTIC_FULL_JEST_MANIFEST_FILE_HASH_MISMATCH:${testPath}`);
    }
  }

  const shards = recordArray(terminal.shards) ?? [];
  const plannedShards = finiteNumber(terminal.planned_shards);
  if (
    !plannedShards || shards.length !== plannedShards || planShards.length !== plannedShards ||
    plan.requested_shards !== terminal.requested_shards ||
    plan.concurrency !== terminal.concurrency || plan.microbatch_files !== terminal.microbatch_files ||
    plan.microbatch_timeout_ms !== terminal.microbatch_timeout_ms
  ) errors.push("DETERMINISTIC_FULL_JEST_SHARD_COUNT_INVALID");
  const planValidation = typeof plan.validation === "object" && plan.validation !== null
    ? plan.validation as Record<string, unknown>
    : {};
  const planOccurrences = new Map<string, number>();
  const planShardIds = new Set<number>();
  let planStructureInvalid = false;
  for (const planShard of planShards) {
    const planShardId = finiteNumber(planShard.shard_id);
    const files = stringArray(planShard.test_files);
    if (planShardId === null || !Number.isInteger(planShardId) || planShardIds.has(planShardId) || files === null) {
      planStructureInvalid = true;
      continue;
    }
    planShardIds.add(planShardId);
    for (const file of files) {
      const normalized = file.replace(/\\/g, "/");
      planOccurrences.set(normalized, (planOccurrences.get(normalized) ?? 0) + 1);
    }
  }
  const recomputedPlanMissing = manifestTestPaths.filter((file) => !planOccurrences.has(file));
  const recomputedPlanDuplicates = [...planOccurrences].filter(([, count]) => count !== 1);
  const recomputedPlanUnexpected = [...planOccurrences.keys()].filter((file) => !uniqueManifestPaths.has(file));
  if (
    planStructureInvalid || recomputedPlanMissing.length > 0 ||
    recomputedPlanDuplicates.length > 0 || recomputedPlanUnexpected.length > 0 ||
    !exactStringArrays(planValidation.missing, []) ||
    !exactStringArrays(planValidation.duplicates, []) ||
    !exactStringArrays(planValidation.unexpected, [])
  ) errors.push("DETERMINISTIC_FULL_JEST_SHARD_PLAN_MEMBERSHIP_INVALID");
  const observedFiles: string[] = [];
  const shardIds = new Set<number>();
  const rawCounters = new Map<(typeof JEST_COUNTER_FIELDS)[number][0], number[]>();
  for (const [snake] of JEST_COUNTER_FIELDS) rawCounters.set(snake, []);
  let rawMicrobatchCount = 0;
  for (const shard of shards) {
    const shardId = finiteNumber(shard.shard_id);
    if (shardId === null || !Number.isInteger(shardId) || shardIds.has(shardId)) {
      errors.push("DETERMINISTIC_FULL_JEST_SHARD_ID_INVALID_OR_DUPLICATE");
    } else {
      shardIds.add(shardId);
    }
    if (shard.subject_sha !== context.headSha || shard.manifest_hash !== manifestHash || !validCompletedInterval(shard)) {
      errors.push(`DETERMINISTIC_FULL_JEST_SHARD_IDENTITY_MISMATCH:${shardId ?? "invalid"}`);
    }
    if (
      shard.exit_code !== 0 || shard.signal !== null || shard.jest_success !== true ||
      shard.num_failed_test_suites !== 0 || shard.num_failed_tests !== 0 ||
      shard.num_pending_test_suites !== 0 || shard.num_pending_tests !== 0
    ) {
      errors.push(`DETERMINISTIC_FULL_JEST_SHARD_NOT_GREEN:${shardId ?? "invalid"}`);
    }
    const observed = stringArray(shard.observed_test_files);
    if (!observed) errors.push(`DETERMINISTIC_FULL_JEST_SHARD_OBSERVED_FILES_INVALID:${shardId ?? "invalid"}`);
    else observedFiles.push(...observed.map((file) => file.replace(/\\/g, "/")));

    const planShard = shardId === null
      ? null
      : planShards.find((candidate) => candidate.shard_id === shardId) ?? null;
    const plannedFiles = planShard ? stringArray(planShard.test_files) : null;
    const shardFiles = stringArray(shard.test_files);
    if (!plannedFiles || !shardFiles || JSON.stringify(plannedFiles) !== JSON.stringify(shardFiles)) {
      errors.push(`DETERMINISTIC_FULL_JEST_SHARD_PLAN_RESULT_MISMATCH:${shardId ?? "invalid"}`);
    }
    const microbatches = recordArray(shard.microbatches) ?? [];
    const microbatchSize = finiteNumber(plan.microbatch_files);
    const expectedMicrobatchCount = plannedFiles && microbatchSize && Number.isInteger(microbatchSize)
      ? Math.ceil(plannedFiles.length / microbatchSize)
      : -1;
    if (microbatches.length === 0 || microbatches.length !== expectedMicrobatchCount) {
      errors.push(`DETERMINISTIC_FULL_JEST_MICROBATCH_COUNT_INVALID:${shardId ?? "invalid"}`);
    }
    const shardRawCounters = new Map<(typeof JEST_COUNTER_FIELDS)[number][0], number[]>();
    for (const [snake] of JEST_COUNTER_FIELDS) shardRawCounters.set(snake, []);
    for (let microbatchIndex = 0; microbatchIndex < microbatches.length; microbatchIndex += 1) {
      rawMicrobatchCount += 1;
      const microbatch = microbatches[microbatchIndex];
      const microbatchId = finiteNumber(microbatch.microbatch_id);
      const expectedFiles = plannedFiles && microbatchSize
        ? plannedFiles.slice(microbatchIndex * microbatchSize, (microbatchIndex + 1) * microbatchSize)
        : [];
      if (
        microbatchId !== microbatchIndex || !exactStringArrays(microbatch.test_files, expectedFiles) ||
        microbatch.exit_code !== 0 || microbatch.signal !== null ||
        microbatch.timed_out !== false || microbatch.orphan_detected !== false ||
        microbatch.terminal_reason !== "completed" ||
        (finiteNumber(microbatch.timeout_ms) ?? 0) <= 0 || !validCompletedInterval(microbatch)
      ) errors.push(`DETERMINISTIC_FULL_JEST_MICROBATCH_NOT_COMPLETE:${shardId ?? "invalid"}:${microbatchIndex}`);
      const rawPath = resolveRunArtifactPath({
        rootDir,
        runDir,
        value: microbatch.jest_json_path,
        errors,
        code: `DETERMINISTIC_FULL_JEST_RAW_JEST:${shardId ?? "invalid"}:${microbatchIndex}`,
      });
      if (!rawPath) continue;
      const rawArtifact = readJsonArtifact(rawPath);
      if (!rawArtifact.exists) {
        errors.push(`DETERMINISTIC_FULL_JEST_RAW_JEST_MISSING:${shardId ?? "invalid"}:${microbatchIndex}`);
        continue;
      }
      if (!rawArtifact.valid) {
        errors.push(`DETERMINISTIC_FULL_JEST_RAW_JEST_MALFORMED:${shardId ?? "invalid"}:${microbatchIndex}`);
        continue;
      }
      if (microbatch.jest_json_sha256 !== sha256(rawArtifact.bytes)) {
        errors.push(`DETERMINISTIC_FULL_JEST_RAW_JEST_HASH_MISMATCH:${shardId ?? "invalid"}:${microbatchIndex}`);
      }
      const raw = rawArtifact.value;
      const rawResults = recordArray(raw.testResults);
      const assertions = rawResults?.flatMap((result) => recordArray(result.assertionResults) ?? []) ?? [];
      const rawTotalSuites = finiteNumber(raw.numTotalTestSuites);
      const rawTotalTests = finiteNumber(raw.numTotalTests);
      if (
        raw.success !== true || raw.wasInterrupted !== false || rawResults === null ||
        raw.numFailedTestSuites !== 0 || raw.numFailedTests !== 0 ||
        raw.numPendingTestSuites !== 0 || raw.numPendingTests !== 0 ||
        raw.numRuntimeErrorTestSuites !== 0 || raw.numTodoTests !== 0 ||
        rawTotalSuites !== rawResults?.length || rawTotalTests !== assertions.length ||
        rawResults.some((result) => result.status !== "passed") ||
        assertions.some((assertion) => assertion.status !== "passed")
      ) errors.push(`DETERMINISTIC_FULL_JEST_RAW_JEST_NOT_GREEN:${shardId ?? "invalid"}:${microbatchIndex}`);
      const rawObserved = (rawResults ?? [])
        .map((result) => typeof result.name === "string" ? path.relative(rootDir, path.resolve(result.name)).replace(/\\/g, "/") : "")
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, "en"));
      if (!exactStringArrays(microbatch.observed_test_files, rawObserved) || JSON.stringify(rawObserved) !== JSON.stringify(expectedFiles)) {
        errors.push(`DETERMINISTIC_FULL_JEST_RAW_JEST_MEMBERSHIP_INVALID:${shardId ?? "invalid"}:${microbatchIndex}`);
      }
      for (const [snake, camel] of JEST_COUNTER_FIELDS) {
        const rawValue = finiteNumber(raw[camel]);
        if (rawValue === null || microbatch[snake] !== rawValue) {
          errors.push(`DETERMINISTIC_FULL_JEST_RAW_JEST_COUNTER_MISMATCH:${shardId ?? "invalid"}:${microbatchIndex}:${snake}`);
        } else {
          rawCounters.get(snake)?.push(rawValue);
          shardRawCounters.get(snake)?.push(rawValue);
        }
      }
      const metadataArtifact = readJsonArtifact(path.join(path.dirname(rawPath), "metadata.json"));
      if (!metadataArtifact.valid || JSON.stringify(metadataArtifact.value) !== JSON.stringify(microbatch)) {
        errors.push(`DETERMINISTIC_FULL_JEST_MICROBATCH_METADATA_MISMATCH:${shardId ?? "invalid"}:${microbatchIndex}`);
      }
      const microbatchManifest = readJsonArtifact(path.join(path.dirname(rawPath), "manifest.json"));
      if (
        !microbatchManifest.valid || microbatchManifest.value.schema_version !== DETERMINISTIC_FULL_JEST_SCHEMA_VERSION ||
        microbatchManifest.value.subject_sha !== context.headSha ||
        microbatchManifest.value.manifest_hash !== manifestHash ||
        microbatchManifest.value.shard_id !== shardId || microbatchManifest.value.microbatch_id !== microbatchIndex ||
        !exactStringArrays(microbatchManifest.value.test_files, expectedFiles)
      ) errors.push(`DETERMINISTIC_FULL_JEST_MICROBATCH_MANIFEST_MISMATCH:${shardId ?? "invalid"}:${microbatchIndex}`);
    }
    for (const [snake] of JEST_COUNTER_FIELDS) {
      const values = shardRawCounters.get(snake) ?? [];
      if (values.length !== microbatches.length || shard[snake] !== sumNumbers(values)) {
        errors.push(`DETERMINISTIC_FULL_JEST_SHARD_COUNTER_MISMATCH:${shardId ?? "invalid"}:${snake}`);
      }
    }
  }
  const observedOccurrences = new Map<string, number>();
  for (const file of observedFiles) observedOccurrences.set(file, (observedOccurrences.get(file) ?? 0) + 1);
  const observedMissing = manifestTestPaths.filter((file) => !observedOccurrences.has(file));
  const observedDuplicates = [...observedOccurrences].filter(([, count]) => count !== 1).map(([file]) => file);
  const observedUnexpected = [...observedOccurrences.keys()].filter((file) => !uniqueManifestPaths.has(file));
  if (observedMissing.length || observedDuplicates.length || observedUnexpected.length) {
    errors.push("DETERMINISTIC_FULL_JEST_OBSERVED_MEMBERSHIP_INVALID");
  }
  for (const [key, expected] of [
    ["missing_files", []],
    ["duplicate_files", []],
    ["unexpected_files", []],
  ] as const) {
    if (JSON.stringify(terminal[key]) !== JSON.stringify(expected)) errors.push(`DETERMINISTIC_FULL_JEST_${key.toUpperCase()}_NONEMPTY`);
  }
  if (terminal.microbatches !== rawMicrobatchCount) errors.push("DETERMINISTIC_FULL_JEST_MICROBATCH_TOTAL_MISMATCH");
  for (const [snake] of JEST_COUNTER_FIELDS) {
    const values = rawCounters.get(snake) ?? [];
    if (values.length !== rawMicrobatchCount || terminal[snake] !== sumNumbers(values)) {
      errors.push(`DETERMINISTIC_FULL_JEST_TERMINAL_COUNTER_MISMATCH:${snake}`);
    }
  }
  if (
    terminal.all_shard_exits_zero !== true || terminal.all_jest_success !== true ||
    terminal.no_pending_tests !== true || terminal.no_timeouts_or_orphans !== true ||
    terminal.all_results_same_subject_sha !== true ||
    terminal.num_failed_test_suites !== 0 || terminal.num_failed_tests !== 0 ||
    terminal.num_pending_test_suites !== 0 || terminal.num_pending_tests !== 0 ||
    (finiteNumber(terminal.num_total_test_suites) ?? 0) <= 0 ||
    (finiteNumber(terminal.num_total_tests) ?? 0) <= 0
  ) {
    errors.push("DETERMINISTIC_FULL_JEST_TERMINAL_TOTALS_NOT_GREEN");
  }

  const uniqueErrors = Array.from(new Set(errors));
  return {
    passed: uniqueErrors.length === 0,
    terminalPath,
    manifestPath,
    errors: uniqueErrors,
    terminal,
    manifest,
  };
}

export function findLatestDeterministicFullJestTerminal(
  context: FullJestEvidenceContext,
  rootDir = process.cwd(),
): string | null {
  const subjectDir = path.join(rootDir, ".release-runtime", "deterministic-full-jest", context.headSha);
  if (!fs.existsSync(subjectDir)) return null;
  const candidates = fs.readdirSync(subjectDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(subjectDir, entry.name, "terminal-summary.json"))
    .filter((candidate) => fs.existsSync(candidate))
    .sort((left, right) => right.localeCompare(left, "en"));
  return candidates[0] ?? null;
}
