import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawn } from "node:child_process";

const workspace = process.cwd();
const historicalRoot = path.resolve(
  workspace,
  ".release-runtime/r568/rc09-r4-production-closeout/r4-a8-developer-estimate-recovery-1/18_m2",
);
const sourceReplayRoot = path.join(historicalRoot, "focused-original-failures-fe59542c");
const weightedReplayRoot = path.join(historicalRoot, "focused-timeout-replay-fe59542c");
const combinedTerminalPath = path.join(sourceReplayRoot, "combined-terminal.json");
const evidenceRoot = path.resolve(
  workspace,
  ".release-runtime/r568/rc09-r4-production-closeout/r4-a10-current-m2-residual",
);
const shardCount = 32;
const concurrency = 2;
const timeoutMs = 1_200_000;
const sourceSubjectSha = "858e1cfbe0408b3c3b528666ac4a34ed552b97eb";
const replaySubjectSha = "fe59542c67737408b726ba92b77024bbb57b81a4";
const expectedEvidenceHashes = {
  "full-jest-858e1cfbe0408b3c3b528666ac4a34ed552b97eb-terminal/manifest.json": "e8e9c4fdc64a4ee9fe73a9c2497ded38a0574e1456ef1af882561a354665ab62",
  "full-jest-858e1cfbe0408b3c3b528666ac4a34ed552b97eb-terminal/terminal-summary.json": "fa008dd9a2ce2b4e46635b64c17a3b916d4026ed72345c5e14e6cfbae0401fea",
  "focused-original-failures-fe59542c/manifest.json": "d596bc5f9390a25e6fb1d26ddf911d81dc1f66dbc09a588dd26fd90f289b1169",
  "focused-original-failures-fe59542c/terminal.json": "996d5f9e39a54f66db7e5f0c8456d9700640473d3855fc596fb0032217aa2d4e",
  "focused-original-failures-fe59542c/combined-terminal.json": "4d13dc3fb1d614a4982486796aa8a22d0a96842300e424f016eed54b6a5e6839",
  "focused-timeout-replay-fe59542c/manifest.json": "b3dd557c1d5078376d43f5c550fdb554af02a66d2e1d40c95de9ddf0e33b1a81",
  "focused-timeout-replay-fe59542c/terminal.json": "60af1c1390bdc2c7adf3c8f315593ddd5c5a32f8c8d5acc779f14f63d9fe4567",
};

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const stable = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
};
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const relative = (value) => path.relative(workspace, value).replace(/\\/gu, "/");
const git = (args) => execFileSync("git", args, {
  cwd: workspace,
  encoding: "utf8",
  maxBuffer: 128 * 1024 * 1024,
}).trim();
const stripAnsi = (value) => String(value ?? "")
  .replace(/\u001b\[[0-9;]*m/gu, "")
  .replace(/\s+/gu, " ")
  .trim();
const normalizeSuitePath = (value) => {
  const normalized = String(value).replace(/\\/gu, "/");
  const normalizedWorkspace = workspace.replace(/\\/gu, "/");
  return normalized.startsWith(`${normalizedWorkspace}/`)
    ? normalized.slice(normalizedWorkspace.length + 1)
    : normalized.replace(/^.*?\/(tests|src|app|scripts)\//u, "$1/");
};

function assertHistoricalEvidence() {
  for (const [name, expected] of Object.entries(expectedEvidenceHashes)) {
    const file = path.join(historicalRoot, name);
    if (!fs.existsSync(file)) throw new Error(`R4_A10_HISTORICAL_EVIDENCE_MISSING:${name}`);
    const actual = sha256(fs.readFileSync(file));
    if (actual !== expected) throw new Error(`R4_A10_HISTORICAL_EVIDENCE_HASH_MISMATCH:${name}:${actual}`);
  }
  const combined = readJson(combinedTerminalPath);
  const original = readJson(path.join(
    historicalRoot,
    "full-jest-858e1cfbe0408b3c3b528666ac4a34ed552b97eb-terminal/terminal-summary.json",
  ));
  if (original.final_status !== "STOP_ESTIMATE_V4_CURRENT_CORE_DETERMINISTIC_SHARDED_FULL_JEST"
    || original.subject_sha !== sourceSubjectSha
    || original.manifest_files !== 5414
    || original.planned_shards !== 32
    || original.microbatches !== 288
    || original.concurrency !== 2
    || original.microbatch_files !== 20
    || original.num_total_test_suites !== 5414
    || original.num_failed_test_suites !== 372
    || original.num_failed_tests !== 534
    || original.num_pending_tests !== 0
    || original.workspace_stable !== true) {
    throw new Error("R4_A10_ORIGINAL_M2_TERMINAL_NOT_EXACT");
  }
  if (combined.sourceSubjectSha !== sourceSubjectSha
    || combined.subjectSha !== replaySubjectSha
    || combined.requestedSuiteCount !== 372
    || combined.observedSuiteCount !== 372
    || combined.passedSuiteCount !== 117
    || combined.failedSuiteCount !== 255
    || combined.totalTests !== 801
    || combined.failedTests !== 361
    || combined.missingObservedCount !== 0
    || combined.unexpectedObservedCount !== 0) {
    throw new Error("R4_A10_HISTORICAL_COMBINED_TERMINAL_NOT_EXACT");
  }
  return combined;
}

function historicalJestResults() {
  const results = new Map();
  for (const file of fs.readdirSync(sourceReplayRoot).filter((name) => /^batch-\d+\.json$/u.test(name)).sort()) {
    for (const suite of readJson(path.join(sourceReplayRoot, file)).testResults ?? []) {
      results.set(normalizeSuitePath(suite.name), { ...suite, receipt: relative(path.join(sourceReplayRoot, file)) });
    }
  }
  for (const file of fs.readdirSync(weightedReplayRoot).filter((name) => /^shard-\d+\.json$/u.test(name)).sort()) {
    for (const suite of readJson(path.join(weightedReplayRoot, file)).testResults ?? []) {
      results.set(normalizeSuitePath(suite.name), { ...suite, receipt: relative(path.join(weightedReplayRoot, file)) });
    }
  }
  return results;
}

function resolveDirectDependency(suitePath, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = path.resolve(path.dirname(path.join(workspace, suitePath)), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.mjs`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
    path.join(base, "index.js"),
  ];
  const resolved = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  return resolved ? relative(resolved) : null;
}

function directDependencies(suitePath) {
  const source = fs.readFileSync(path.join(workspace, suitePath), "utf8");
  const dependencies = new Set();
  const pattern = /(?:from\s+|require\s*\(|import\s*\()\s*["']([^"']+)["']/gu;
  for (const match of source.matchAll(pattern)) {
    const resolved = resolveDirectDependency(suitePath, match[1]);
    if (resolved) dependencies.add(resolved);
  }
  return [...dependencies].sort();
}

function historicalRootOwner(suitePath, suite) {
  const failure = stripAnsi([
    suite.message,
    ...(suite.assertionResults ?? []).flatMap((assertion) => assertion.failureMessages ?? []),
  ].join("\n")).replace(/\\/gu, "/");
  const ownerMatch = failure.match(/(?:at\s+[^ ]+\s+\()?((?:src|app|scripts|supabase)\/[A-Za-z0-9_./-]+\.(?:ts|tsx|js|mjs|sql))(?::\d+)?/u);
  if (ownerMatch) return ownerMatch[1];
  const parts = suitePath.split("/");
  return parts.length >= 2 ? parts.slice(0, 2).join("/") : suitePath;
}

function assertionId(assertion) {
  return String(assertion.fullName || [...(assertion.ancestorTitles ?? []), assertion.title].filter(Boolean).join(" "));
}

function historicalFailure(assertion) {
  const message = stripAnsi((assertion.failureMessages ?? []).join("\n"));
  if (!message) return null;
  return {
    message: message.slice(0, 1_200),
    messageSha256: sha256(message),
  };
}

function makeShards(suites, historical) {
  const weighted = suites.map((suite) => {
    const result = historical.get(suite);
    return {
      suite,
      weightMs: result ? Math.max(1, Number(result.endTime ?? 0) - Number(result.startTime ?? 0)) : 1,
    };
  }).sort((left, right) => right.weightMs - left.weightMs || left.suite.localeCompare(right.suite, "en"));
  const shards = Array.from({ length: shardCount }, (_, index) => ({
    shardId: String(index + 1).padStart(2, "0"),
    historicalWeightMs: 0,
    suites: [],
  }));
  for (const item of weighted) {
    const target = [...shards].sort((left, right) => left.historicalWeightMs - right.historicalWeightMs
      || left.shardId.localeCompare(right.shardId, "en"))[0];
    target.suites.push(item.suite);
    target.historicalWeightMs += item.weightMs;
  }
  for (const shard of shards) shard.suites.sort();
  return shards;
}

function reusableShard(outputRoot, shard, subjectSha, suiteListSha256) {
  const terminalPath = path.join(outputRoot, `shard-${shard.shardId}.terminal.json`);
  const jsonPath = path.join(outputRoot, `shard-${shard.shardId}.json`);
  if (!fs.existsSync(terminalPath) || !fs.existsSync(jsonPath)) return null;
  try {
    const terminal = readJson(terminalPath);
    const jest = readJson(jsonPath);
    if (terminal.subjectSha !== subjectSha
      || terminal.suiteListSha256 !== suiteListSha256
      || terminal.requestedSuiteCount !== shard.suites.length
      || terminal.observedSuiteCount !== shard.suites.length
      || terminal.timedOut === true) return null;
    return { terminal: { ...terminal, reused: true }, jest };
  } catch {
    return null;
  }
}

async function runShard(outputRoot, shard, subjectSha) {
  const suiteListSha256 = sha256(shard.suites.join("\n"));
  const reusable = reusableShard(outputRoot, shard, subjectSha, suiteListSha256);
  if (reusable) {
    process.stdout.write(`[r4-a10-residual] shard=${shard.shardId} status=REUSE_VALID observed=${reusable.terminal.observedSuiteCount}/${shard.suites.length}\n`);
    return reusable;
  }
  const startedAt = new Date();
  process.stdout.write(`[r4-a10-residual] shard=${shard.shardId} suites=${shard.suites.length} historicalMs=${shard.historicalWeightMs} status=STARTED\n`);
  const microbatches = [];
  const testResults = [];
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let pendingTests = 0;
  let todoTests = 0;
  let runtimeErrorSuites = 0;
  for (const [index, suite] of shard.suites.entries()) {
    const microId = String(index + 1).padStart(3, "0");
    const prefix = `shard-${shard.shardId}.micro-${microId}`;
    const jsonPath = path.join(outputRoot, `${prefix}.json`);
    const stdoutPath = path.join(outputRoot, `${prefix}.stdout.log`);
    const stderrPath = path.join(outputRoot, `${prefix}.stderr.log`);
    const stdout = fs.createWriteStream(stdoutPath);
    const stderr = fs.createWriteStream(stderrPath);
    const microStartedAt = new Date();
    const child = spawn(process.execPath, [
      path.join("node_modules", "jest", "bin", "jest.js"),
      "--runInBand",
      "--json",
      "--outputFile",
      jsonPath,
      "--runTestsByPath",
      suite,
    ], {
      cwd: workspace,
      env: {
        ...process.env,
        NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=6144",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    child.stdout.pipe(stdout);
    child.stderr.pipe(stderr);
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    const close = await new Promise((resolve) => child.once("close", (code, signal) => resolve({ code, signal })));
    clearTimeout(timer);
    await Promise.all([
      new Promise((resolve) => stdout.end(resolve)),
      new Promise((resolve) => stderr.end(resolve)),
    ]);
    const jest = fs.existsSync(jsonPath) ? readJson(jsonPath) : null;
    if (jest) {
      testResults.push(...(jest.testResults ?? []));
      totalTests += Number(jest.numTotalTests ?? 0);
      passedTests += Number(jest.numPassedTests ?? 0);
      failedTests += Number(jest.numFailedTests ?? 0);
      pendingTests += Number(jest.numPendingTests ?? 0);
      todoTests += Number(jest.numTodoTests ?? 0);
      runtimeErrorSuites += Number(jest.numRuntimeErrorTestSuites ?? 0);
    }
    const microObserved = new Set((jest?.testResults ?? []).map((item) => normalizeSuitePath(item.name)));
    const micro = {
      microId,
      suite,
      startedAt: microStartedAt.toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: Date.now() - microStartedAt.getTime(),
      exitCode: timedOut ? 124 : close.code ?? 1,
      signal: close.signal,
      timedOut,
      observed: microObserved.has(suite),
      failedSuiteCount: jest?.numFailedTestSuites ?? 1,
      failedTests: jest?.numFailedTests ?? null,
      jsonPath: relative(jsonPath),
      stdoutPath: relative(stdoutPath),
      stderrPath: relative(stderrPath),
    };
    microbatches.push(micro);
    fs.writeFileSync(path.join(outputRoot, `${prefix}.terminal.json`), `${JSON.stringify(micro, null, 2)}\n`);
    process.stdout.write(`[r4-a10-residual] shard=${shard.shardId} micro=${microId}/${shard.suites.length} status=${timedOut ? "TIMEOUT" : micro.exitCode === 0 ? "GREEN" : "RED"} observed=${micro.observed ? 1 : 0}/1 failedTests=${micro.failedTests ?? "unknown"} durationMs=${micro.durationMs}\n`);
  }
  const jsonPath = path.join(outputRoot, `shard-${shard.shardId}.json`);
  const jest = {
    success: microbatches.every((entry) => entry.exitCode === 0),
    numTotalTestSuites: testResults.length,
    numPassedTestSuites: testResults.filter((item) => item.status === "passed").length,
    numFailedTestSuites: testResults.filter((item) => item.status !== "passed").length,
    numTotalTests: totalTests,
    numPassedTests: passedTests,
    numFailedTests: failedTests,
    numPendingTests: pendingTests,
    numTodoTests: todoTests,
    numRuntimeErrorTestSuites: runtimeErrorSuites,
    testResults,
  };
  fs.writeFileSync(jsonPath, `${JSON.stringify(jest, null, 2)}\n`);
  const observed = new Set((jest?.testResults ?? []).map((suite) => normalizeSuitePath(suite.name)));
  const unexpected = [...observed].filter((suite) => !shard.suites.includes(suite)).sort();
  const missing = shard.suites.filter((suite) => !observed.has(suite));
  const timedOut = microbatches.some((entry) => entry.timedOut);
  const signal = microbatches.find((entry) => entry.signal)?.signal ?? null;
  const exitCode = microbatches.every((entry) => entry.exitCode === 0) && missing.length === 0 ? 0 : 1;
  const terminal = {
    schemaVersion: "r4-a10-current-residual-shard.v1",
    subjectSha,
    suiteListSha256,
    shardId: shard.shardId,
    startedAt: startedAt.toISOString(),
    endedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt.getTime(),
    requestedSuiteCount: shard.suites.length,
    observedSuiteCount: observed.size,
    failedSuiteCount: jest?.numFailedTestSuites ?? shard.suites.length,
    totalTests: jest?.numTotalTests ?? 0,
    passedTests: jest?.numPassedTests ?? 0,
    failedTests: jest?.numFailedTests ?? 0,
    pendingTests: jest.numPendingTests,
    todoTests: jest.numTodoTests,
    runtimeErrorSuites: jest.numRuntimeErrorTestSuites,
    exitCode,
    signal,
    timedOut,
    missingObserved: missing,
    unexpectedObserved: unexpected,
    jsonPath: relative(jsonPath),
    processRecyclePerSuite: true,
    processCount: microbatches.length,
    microbatches,
    reused: false,
  };
  fs.writeFileSync(path.join(outputRoot, `shard-${shard.shardId}.terminal.json`), `${JSON.stringify(terminal, null, 2)}\n`);
  process.stdout.write(`[r4-a10-residual] shard=${shard.shardId} status=${timedOut ? "TIMEOUT" : terminal.exitCode === 0 ? "GREEN" : "RED"} observed=${observed.size}/${shard.suites.length} failedSuites=${terminal.failedSuiteCount} failedTests=${terminal.failedTests} durationMs=${terminal.durationMs}\n`);
  return { terminal, jest };
}

const combinedHistorical = assertHistoricalEvidence();
const historical = historicalJestResults();
const suites = [...new Set(combinedHistorical.failedSuites.concat(combinedHistorical.passedSuites))].sort();
if (suites.length !== 372 || historical.size !== 372) throw new Error(`R4_A10_HISTORICAL_DENOMINATOR_MISMATCH:${suites.length}:${historical.size}`);
const currentSubjectSha = git(["rev-parse", "HEAD"]);
const currentTreeSha = git(["rev-parse", "HEAD^{tree}"]);
const changedPaths = new Set(git(["diff", "--name-only", replaySubjectSha, currentSubjectSha]).split(/\r?\n/gu).filter(Boolean).map((name) => name.replace(/\\/gu, "/")));
const missingFiles = suites.filter((suite) => !fs.existsSync(path.join(workspace, suite)));
const runnableSuites = suites.filter((suite) => !missingFiles.includes(suite));
const shards = makeShards(runnableSuites, historical);
const outputRoot = path.join(evidenceRoot, `current-residual-${currentSubjectSha.slice(0, 12)}`);
fs.mkdirSync(outputRoot, { recursive: true });
const manifest = {
  schemaVersion: "r4-a10-current-m2-residual-manifest.v1",
  sourceSubjectSha,
  replaySubjectSha,
  subjectSha: currentSubjectSha,
  subjectTreeSha: currentTreeSha,
  historicalCombinedTerminalSha256: expectedEvidenceHashes["focused-original-failures-fe59542c/combined-terminal.json"],
  suiteCount: suites.length,
  runnableSuiteCount: runnableSuites.length,
  missingFiles,
  suiteListSha256: sha256(suites.join("\n")),
  shardCount,
  concurrency,
  timeoutMs,
  processRecyclePerSuite: true,
  nodeOptions: process.env.NODE_OPTIONS || "--max-old-space-size=6144",
  historicalCounts: {
    passedSuites: combinedHistorical.passedSuiteCount,
    failedSuites: combinedHistorical.failedSuiteCount,
    tests: combinedHistorical.totalTests,
    failedTests: combinedHistorical.failedTests,
  },
  shards,
};
fs.writeFileSync(path.join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

const completed = [];
let nextShard = 0;
async function worker() {
  while (nextShard < shards.length) {
    const index = nextShard;
    nextShard += 1;
    completed[index] = await runShard(outputRoot, shards[index], currentSubjectSha);
  }
}
await Promise.all(Array.from({ length: concurrency }, () => worker()));

const current = new Map();
for (const entry of completed) {
  for (const suite of entry.jest?.testResults ?? []) {
    current.set(normalizeSuitePath(suite.name), {
      ...suite,
      receipt: entry.terminal.jsonPath,
      shardId: entry.terminal.shardId,
    });
  }
}

const suiteLedger = [];
const testLedger = [];
for (const suitePath of suites) {
  const before = historical.get(suitePath);
  const after = current.get(suitePath);
  const dependencies = fs.existsSync(path.join(workspace, suitePath)) ? directDependencies(suitePath) : [];
  const changedDependencies = dependencies.filter((dependency) => changedPaths.has(dependency));
  const historicalAssertions = new Map((before?.assertionResults ?? []).map((assertion) => [assertionId(assertion), assertion]));
  const currentAssertions = new Map((after?.assertionResults ?? []).map((assertion) => [assertionId(assertion), assertion]));
  const removedTestIds = [...historicalAssertions.keys()].filter((id) => !currentAssertions.has(id)).sort();
  const additionalTestIds = [...currentAssertions.keys()].filter((id) => !historicalAssertions.has(id)).sort();
  const incompleteStatuses = new Set(["pending", "todo", "skipped", "disabled"]);
  let status;
  if (!fs.existsSync(path.join(workspace, suitePath))) status = "STALE";
  else if (!after) status = "NOT_REPLAYED";
  else if (after.status !== "passed" || (after.assertionResults ?? []).some((assertion) => assertion.status === "failed")) status = "FAIL_CURRENT";
  else if ((after.assertionResults ?? []).some((assertion) => incompleteStatuses.has(assertion.status))) status = "INCOMPLETE";
  else if (removedTestIds.length > 0) status = "STALE";
  else status = "PASS_CURRENT";
  const priorFailures = (before?.assertionResults ?? []).filter((assertion) => assertion.status === "failed").map((assertion) => ({
    testId: assertionId(assertion),
    error: historicalFailure(assertion),
  }));
  suiteLedger.push({
    suiteId: suitePath,
    status,
    historicalStatus: before?.status ?? "MISSING_HISTORICAL_RESULT",
    historicalReceipt: before?.receipt ?? null,
    historicalFailures: priorFailures,
    rootOwner: after ? historicalRootOwner(suitePath, after) : before ? historicalRootOwner(suitePath, before) : suitePath,
    directDependencies: dependencies,
    changedDirectDependenciesSinceReplay: changedDependencies,
    suiteChangedSinceReplay: changedPaths.has(suitePath),
    replacementCoverage: {
      preservedTestIds: [...historicalAssertions.keys()].filter((id) => currentAssertions.has(id)).sort(),
      removedTestIds,
      additionalTestIds,
    },
    currentReceipt: after?.receipt ?? null,
    currentSuiteStatus: after?.status ?? null,
    currentTests: after?.assertionResults?.length ?? 0,
    currentFailedTests: after?.assertionResults?.filter((assertion) => assertion.status === "failed").length ?? null,
  });
  for (const id of [...new Set([...historicalAssertions.keys(), ...currentAssertions.keys()])].sort()) {
    const oldAssertion = historicalAssertions.get(id);
    const newAssertion = currentAssertions.get(id);
    let testStatus;
    if (!oldAssertion) testStatus = newAssertion?.status === "passed" ? "PASS_CURRENT" : newAssertion?.status === "failed" ? "FAIL_CURRENT" : "INCOMPLETE";
    else if (!newAssertion) testStatus = "STALE";
    else if (newAssertion.status === "passed") testStatus = "PASS_CURRENT";
    else if (newAssertion.status === "failed") testStatus = "FAIL_CURRENT";
    else testStatus = "INCOMPLETE";
    testLedger.push({
      suiteId: suitePath,
      testId: id,
      origin: oldAssertion ? "HISTORICAL" : "CURRENT_ADDITIONAL",
      historicalStatus: oldAssertion?.status ?? null,
      historicalError: oldAssertion ? historicalFailure(oldAssertion) : null,
      currentStatus: newAssertion?.status ?? null,
      currentError: newAssertion ? historicalFailure(newAssertion) : null,
      status: testStatus,
      rootOwner: after ? historicalRootOwner(suitePath, after) : before ? historicalRootOwner(suitePath, before) : suitePath,
      currentReceipt: after?.receipt ?? null,
    });
  }
}

const statusCounts = (rows) => rows.reduce((counts, row) => ({ ...counts, [row.status]: (counts[row.status] ?? 0) + 1 }), {});
const ledger = {
  schemaVersion: "r4-a10-current-m2-residual-ledger.v1",
  sourceSubjectSha,
  replaySubjectSha,
  subjectSha: currentSubjectSha,
  subjectTreeSha: currentTreeSha,
  suiteStatusCounts: statusCounts(suiteLedger),
  testStatusCounts: statusCounts(testLedger),
  suites: suiteLedger,
  tests: testLedger,
};
const ledgerBytes = `${JSON.stringify(ledger, null, 2)}\n`;
fs.writeFileSync(path.join(outputRoot, "residual-ledger.json"), ledgerBytes);

const shardTerminals = completed.map((entry) => entry.terminal);
const suiteStatusCounts = statusCounts(suiteLedger);
const testStatusCounts = statusCounts(testLedger);
const terminal = {
  schemaVersion: "r4-a10-current-m2-residual-terminal.v1",
  sourceSubjectSha,
  replaySubjectSha,
  subjectSha: currentSubjectSha,
  subjectTreeSha: currentTreeSha,
  startedAt: shardTerminals.map((entry) => entry.startedAt).filter(Boolean).sort()[0] ?? null,
  endedAt: new Date().toISOString(),
  requestedSuiteCount: suites.length,
  observedSuiteCount: current.size,
  missingFileCount: missingFiles.length,
  unexpectedObservedCount: [...current.keys()].filter((suite) => !suites.includes(suite)).length,
  suiteStatusCounts,
  testStatusCounts,
  failedCurrentSuites: suiteLedger.filter((row) => row.status === "FAIL_CURRENT").map((row) => row.suiteId),
  staleSuites: suiteLedger.filter((row) => row.status === "STALE").map((row) => row.suiteId),
  notReplayedSuites: suiteLedger.filter((row) => row.status === "NOT_REPLAYED").map((row) => row.suiteId),
  incompleteSuites: suiteLedger.filter((row) => row.status === "INCOMPLETE").map((row) => row.suiteId),
  pendingTests: shardTerminals.reduce((sum, entry) => sum + Number(entry.pendingTests ?? 0), 0),
  todoTests: shardTerminals.reduce((sum, entry) => sum + Number(entry.todoTests ?? 0), 0),
  runtimeErrorSuites: shardTerminals.reduce((sum, entry) => sum + Number(entry.runtimeErrorSuites ?? 0), 0),
  timedOutShards: shardTerminals.filter((entry) => entry.timedOut).map((entry) => entry.shardId),
  totalTests: shardTerminals.reduce((sum, entry) => sum + Number(entry.totalTests ?? 0), 0),
  passedTests: shardTerminals.reduce((sum, entry) => sum + Number(entry.passedTests ?? 0), 0),
  failedTests: shardTerminals.reduce((sum, entry) => sum + Number(entry.failedTests ?? 0), 0),
  shardCount,
  concurrency,
  shardTerminals,
  manifestSha256: sha256(fs.readFileSync(path.join(outputRoot, "manifest.json"))),
  residualLedgerSha256: sha256(ledgerBytes),
  workspaceStatusSha256: sha256(git(["status", "--porcelain=v2"])),
  status: suiteStatusCounts.PASS_CURRENT === suites.length
    && Object.keys(suiteStatusCounts).length === 1
    && testStatusCounts.FAIL_CURRENT == null
    && testStatusCounts.STALE == null
    && testStatusCounts.NOT_REPLAYED == null
    && testStatusCounts.INCOMPLETE == null
    ? "GREEN_CURRENT_M2_RESIDUAL"
    : "RED_CURRENT_M2_RESIDUAL",
};
fs.writeFileSync(path.join(outputRoot, "terminal.json"), `${JSON.stringify(terminal, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  status: terminal.status,
  subjectSha: terminal.subjectSha,
  requestedSuiteCount: terminal.requestedSuiteCount,
  observedSuiteCount: terminal.observedSuiteCount,
  suiteStatusCounts,
  testStatusCounts,
  pendingTests: terminal.pendingTests,
  todoTests: terminal.todoTests,
  runtimeErrorSuites: terminal.runtimeErrorSuites,
  timedOutShards: terminal.timedOutShards,
  outputRoot: relative(outputRoot),
}, null, 2)}\n`);
if (terminal.status !== "GREEN_CURRENT_M2_RESIDUAL") process.exitCode = 1;
