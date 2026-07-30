import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { CURRENT_CORE_REMEDIATION_EVIDENCE_PATHS } from "./currentCoreRemediationEvidencePrerequisites";
import { startWindowsCurrentCoreMemoryMonitor } from "./currentCoreMemoryMonitor";

const ENTRY_CHECKPOINT = "7cab8073";
const SOURCE_ROOT = path.resolve(
  process.env.CURRENT_CORE_REMEDIATION_SOURCE_ROOT ??
    path.join(
      ".release-runtime/current-core-remediation",
      ENTRY_CHECKPOINT,
    ),
);
const OUTPUT_ROOT = path.resolve(
  process.env.CURRENT_CORE_REMEDIATION_OUTPUT_ROOT ??
    ".release-runtime/current-core-remediation/remediation-153-current",
);
const SOURCE_REPOSITORY_ROOT = execFileSync(
  "git",
  ["-C", SOURCE_ROOT, "rev-parse", "--show-toplevel"],
  {
    encoding: "utf8",
    windowsHide: true,
  },
).trim();
const JEST_PATH = path.resolve("node_modules/jest/bin/jest.js");
const JEST_BATCH_ROOT_PATH = path.resolve(
  "scripts/release/currentCoreJestBatchRoot.mjs",
);
const EXPECTED_FILES = 153;
const REGULAR_BATCH_SIZE = 10;
const HYDRATE_ONLY = process.argv.includes("--hydrate-only");
const EVIDENCE_SOURCE_ROOT_ENV =
  "CURRENT_CORE_REMEDIATION_EVIDENCE_SOURCE_ROOT";
const EVIDENCE_OVERRIDE_ROOTS_ENV =
  "CURRENT_CORE_REMEDIATION_EVIDENCE_OVERRIDE_ROOTS";
const PROTECTED_EVIDENCE_PATHS = new Set([
  "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/android_api34_results.json",
  "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/android_screenshots.json",
  "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/android_ui_dumps.json",
  "scripts/e2e/runAndroidApi34LiveRequestEmbeddedAiProfessionalBoqPdfCatalogSmoke.ts",
  "scripts/e2e/androidDeepLinkLaunchContract.ts",
  "tests/e2e/androidDeepLinkLaunchContract.contract.test.ts",
]);
const HEAVY_SINGLETON_FILES = new Set([
  "tests/architecture/aiEstimate11610PrerequisiteGreenLineage.contract.test.ts",
  "tests/estimateInfrastructure/aiEstimateNormativeCompletenessMatrix.contract.test.ts",
  "tests/estimateBenchmark/benchmarkRunner.contract.test.ts",
  "tests/estimateRuntime/aiEstimateCoreBenchmark.contract.test.ts",
  "tests/estimateAcceptance/blackboxPromptToSnapshot.contract.test.ts",
  "tests/estimateBenchmark/criticalCasesBenchmark.contract.test.ts",
  "tests/builtInAi10000/ai10000CasesManifest.contract.test.ts",
  "tests/builtInAi10000/ai10000AllEstimateCasesUseCalculateGlobalEstimate.contract.test.ts",
  "tests/builtInAi10000/ai10000CategoryCoverage.contract.test.ts",
  "tests/estimateBackfill/backfillProgressDashboard.contract.test.ts",
  "tests/estimateBackfill/catalogBackfillConveyor.contract.test.ts",
  "tests/estimateRuntime/full11610MaterialCompletenessAudit.test.ts",
  "tests/estimateCalculator/productionGradeFamilyCalculators.test.ts",
  "tests/estimateNorms/productionGradeLayerMatrix.test.ts",
  "tests/enterpriseExactEstimate/userInput1000WorkAudit.contract.test.ts",
  "tests/exactEstimate/real1000UserInputAcceptance.contract.test.ts",
  "tests/exactEstimate/real500MaterialPriceSemantic.contract.test.ts",
  "tests/estimateRuntime/productionGradeRuntimeContract.test.ts",
  "tests/foreman/foremanEstimatePerformance.contract.test.ts",
  "tests/estimateRuntime/replayableCoreAudit.test.ts",
  "tests/foreman/foremanEstimateReplay.contract.test.ts",
  "tests/estimateRuntime/workEstimateSemanticAcceptance.test.ts",
  "tests/professionalBoq/apartmentRenovationBoqDepth.contract.test.ts",
  "tests/officeEstimate/pdfBuyerPerformance.contract.test.ts",
  "tests/real500/real500RuntimeAllCasesExpandedEstimate.contract.test.ts",
  "tests/semanticRegression/metamorphicSemanticConsistency.contract.test.ts",
  "tests/requestEstimate/requestEstimateComplexityAdaptiveDeepBoq.contract.test.ts",
  "tests/real10000Audit/remediationRerunAuditP0Zero.contract.test.ts",
  "tests/release/closeoutReadOnly.contract.test.ts",
  "tests/selectedWorkEnterprise1000/selectedWorkEnterprise1000.contract.test.ts",
]);

type JestAssertion = {
  status?: string;
};

type JestSuiteResult = {
  name: string;
  status: string;
  assertionResults?: JestAssertion[];
};

type JestResult = {
  success: boolean;
  numTotalTestSuites: number;
  numPassedTestSuites: number;
  numFailedTestSuites: number;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  numTodoTests: number;
  testResults: JestSuiteResult[];
};

type BatchMetadata = {
  exitCode: number;
  memoryEvidenceBlocker: string | null;
  memoryEvidenceStatus: "COMPLETE" | "INFRASTRUCTURE_RED";
  memoryPeakBytes: number;
  memoryPeakMiB: number;
  memoryMeasurement: "process_tree_current_working_set_peak";
  sourceFingerprint: string;
};

function repoPath(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function sourceResultRepoPath(filePath: string): string {
  const relativePath = path.relative(
    SOURCE_REPOSITORY_ROOT,
    path.resolve(filePath),
  );
  if (
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(`REMEDIATION_SOURCE_TEST_OUTSIDE_REPOSITORY:${filePath}`);
  }
  return relativePath.replace(/\\/g, "/");
}

function atomicWrite(filePath: string, content: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  writeFileSync(temporaryPath, content, "utf8");
  if (existsSync(filePath)) rmSync(filePath);
  renameSync(temporaryPath, filePath);
}

function resolvedEvidenceSourceRoot(): string {
  const configured = process.env[EVIDENCE_SOURCE_ROOT_ENV];
  if (!configured) {
    throw new Error(
      `REMEDIATION_EVIDENCE_SOURCE_ROOT_REQUIRED:${EVIDENCE_SOURCE_ROOT_ENV}`,
    );
  }
  return path.resolve(configured);
}

type EvidenceSource = {
  role: "primary" | "override";
  root: string;
  repositorySha: string;
};

function resolvedEvidenceSources(): EvidenceSource[] {
  const primaryRoot = resolvedEvidenceSourceRoot();
  const overrideRoots = String(
    process.env[EVIDENCE_OVERRIDE_ROOTS_ENV] ?? "",
  )
    .split(path.delimiter)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => path.resolve(value));
  const roots = [
    { role: "primary" as const, root: primaryRoot },
    ...overrideRoots.map((root) => ({
      role: "override" as const,
      root,
    })),
  ];
  const uniqueRoots = new Set<string>();
  return roots.map((source) => {
    const normalizedRoot = path.normalize(source.root).toLowerCase();
    if (uniqueRoots.has(normalizedRoot)) {
      throw new Error(
        `REMEDIATION_EVIDENCE_SOURCE_DUPLICATE:${source.root}`,
      );
    }
    uniqueRoots.add(normalizedRoot);
    return {
      ...source,
      repositorySha: execFileSync(
        "git",
        ["-C", source.root, "rev-parse", "HEAD"],
        { encoding: "utf8", windowsHide: true },
      ).trim(),
    };
  });
}

function assertEvidencePath(relativePath: string): void {
  const normalized = relativePath.replace(/\\/g, "/");
  if (
    normalized !== relativePath ||
    !normalized.startsWith("artifacts/") ||
    normalized.includes("../") ||
    path.isAbsolute(normalized) ||
    PROTECTED_EVIDENCE_PATHS.has(normalized)
  ) {
    throw new Error(`REMEDIATION_EVIDENCE_PATH_FORBIDDEN:${relativePath}`);
  }
}

function hydrateEvidencePrerequisites(): {
  sourceRoot: string;
  sourceRepositorySha: string;
  destinationSubjectSha: string;
  sources: EvidenceSource[];
  files: Array<{
    path: string;
    sha256: string;
    bytes: number;
    sourceRoot: string;
    sourceRepositorySha: string;
    sourceRole: EvidenceSource["role"];
  }>;
} {
  const sources = resolvedEvidenceSources();
  const primarySource = sources[0];
  const sourceRoot = primarySource.root;
  const sourceRepositorySha = primarySource.repositorySha;
  const destinationSubjectSha = execFileSync(
    "git",
    ["rev-parse", "HEAD"],
    { cwd: process.cwd(), encoding: "utf8", windowsHide: true },
  ).trim();
  const files = CURRENT_CORE_REMEDIATION_EVIDENCE_PATHS.map((relativePath) => {
    assertEvidencePath(relativePath);
    const selectedSource = [...sources]
      .reverse()
      .find((source) => existsSync(path.join(source.root, relativePath)));
    if (!selectedSource) {
      throw new Error(
        `REMEDIATION_EVIDENCE_SOURCE_MISSING:${relativePath}:checked=${sources
          .map((source) => source.root)
          .join(",")}`,
      );
    }
    const sourcePath = path.join(selectedSource.root, relativePath);
    const content = readFileSync(sourcePath);
    const destinationPath = path.resolve(relativePath);
    mkdirSync(path.dirname(destinationPath), { recursive: true });
    if (path.resolve(sourcePath) !== destinationPath) {
      copyFileSync(sourcePath, destinationPath);
    }
    const destinationContent = readFileSync(destinationPath);
    const sourceSha256 = createHash("sha256").update(content).digest("hex");
    const destinationSha256 = createHash("sha256")
      .update(destinationContent)
      .digest("hex");
    if (
      sourceSha256 !== destinationSha256 ||
      content.byteLength !== destinationContent.byteLength
    ) {
      throw new Error(
        `REMEDIATION_EVIDENCE_SUPERSESSION_HASH_MISMATCH:${relativePath}`,
      );
    }
    return {
      path: relativePath,
      sha256: sourceSha256,
      bytes: content.byteLength,
      sourceRoot: selectedSource.root,
      sourceRepositorySha: selectedSource.repositorySha,
      sourceRole: selectedSource.role,
    };
  });
  atomicWrite(
    path.join(OUTPUT_ROOT, "evidence-prerequisites.json"),
    `${JSON.stringify({
      sourceRoot,
      sourceRepositorySha,
      sources,
      destinationSubjectSha,
      supersessionMode:
        sources.length > 1
          ? "diagnostic_multi_source_supersession"
          : sourceRepositorySha === destinationSubjectSha
          ? "same_sha_verified_copy"
          : "diagnostic_cross_sha_supersession",
      canonicalFinalEvidence: false,
      files,
      protectedPathsExcluded: [...PROTECTED_EVIDENCE_PATHS],
    }, null, 2)}\n`,
  );
  return {
    sourceRoot,
    sourceRepositorySha,
    destinationSubjectSha,
    sources,
    files,
  };
}

function nullDelimitedGitPaths(args: readonly string[]): string[] {
  const output = execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "buffer",
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
  return output
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .map((file) => file.replace(/\\/g, "/"));
}

function currentSourceFingerprint(
  evidence: ReturnType<typeof hydrateEvidencePrerequisites>,
): string {
  const hash = createHash("sha256");
  const head = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: process.cwd(),
    encoding: "utf8",
    windowsHide: true,
  }).trim();
  hash.update(`head\0${head}\0`);
  hash.update(
    `subject\0${process.env.CURRENT_CORE_SUBJECT_HEAD ?? "WORKTREE"}\0`,
  );
  hash.update(`evidence-subject\0${evidence.destinationSubjectSha}\0`);
  for (const file of evidence.files) {
    hash.update(
      `evidence\0${file.path}\0${file.sourceRepositorySha}\0${file.sourceRole}\0${file.sha256}\0${String(file.bytes)}\0`,
    );
  }

  const dirtyPaths = new Set([
    ...nullDelimitedGitPaths([
      "ls-files",
      "-m",
      "-d",
      "-o",
      "--exclude-standard",
      "-z",
    ]),
    ...nullDelimitedGitPaths([
      "diff",
      "--cached",
      "--name-only",
      "-z",
    ]),
  ]);
  for (const file of [...dirtyPaths].sort()) {
    const absolutePath = path.resolve(file);
    hash.update(`worktree\0${file}\0`);
    if (existsSync(absolutePath)) hash.update(readFileSync(absolutePath));
    else hash.update("<deleted>");
    hash.update("\0");
  }
  for (let index = 1; index <= 8; index += 1) {
    const sourcePath = path.join(
      SOURCE_ROOT,
      `batch-${String(index).padStart(2, "0")}.json`,
    );
    hash.update(`manifest-source\0${repoPath(sourcePath)}\0`);
    hash.update(readFileSync(sourcePath));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

function assertEvidenceSourceUnchanged(
  evidence: ReturnType<typeof hydrateEvidencePrerequisites>,
  checkpoint: string,
): void {
  for (const file of evidence.files) {
    const content = readFileSync(path.join(file.sourceRoot, file.path));
    const actualSha256 = createHash("sha256").update(content).digest("hex");
    if (
      actualSha256 !== file.sha256 ||
      content.byteLength !== file.bytes
    ) {
      throw new Error(
        `REMEDIATION_EVIDENCE_SOURCE_DRIFT:${checkpoint}:${file.path}`,
      );
    }
  }
}

function assertSourceFingerprint(
  expectedFingerprint: string,
  checkpoint: string,
  evidence: ReturnType<typeof hydrateEvidencePrerequisites>,
): void {
  const actualFingerprint = currentSourceFingerprint(evidence);
  if (actualFingerprint !== expectedFingerprint) {
    throw new Error(
      `REMEDIATION_SOURCE_FINGERPRINT_DRIFT:${checkpoint}:${expectedFingerprint}:${actualFingerprint}`,
    );
  }
}

function readSourceFiles(): string[] {
  const files: string[] = [];
  for (let index = 1; index <= 8; index += 1) {
    const sourcePath = path.join(
      SOURCE_ROOT,
      `batch-${String(index).padStart(2, "0")}.json`,
    );
    const source = JSON.parse(readFileSync(sourcePath, "utf8")) as JestResult;
    for (const result of source.testResults) {
      files.push(sourceResultRepoPath(result.name));
    }
  }
  const uniqueFiles = [...new Set(files)];
  if (files.length !== EXPECTED_FILES || uniqueFiles.length !== EXPECTED_FILES) {
    throw new Error(
      `REMEDIATION_MANIFEST_INVALID:${files.length}:${uniqueFiles.length}/${EXPECTED_FILES}`,
    );
  }
  return uniqueFiles;
}

function buildExecutionPlan(files: readonly string[]): string[][] {
  const plan: string[][] = [];
  let regular: string[] = [];
  const flushRegular = () => {
    if (regular.length === 0) return;
    plan.push(regular);
    regular = [];
  };
  for (const file of files) {
    if (HEAVY_SINGLETON_FILES.has(file)) {
      flushRegular();
      plan.push([file]);
      continue;
    }
    regular.push(file);
    if (regular.length === REGULAR_BATCH_SIZE) flushRegular();
  }
  flushRegular();
  const plannedFiles = plan.flat();
  if (
    plannedFiles.length !== files.length ||
    JSON.stringify(plannedFiles) !== JSON.stringify(files)
  ) {
    throw new Error("REMEDIATION_EXECUTION_PLAN_DRIFT");
  }
  return plan;
}

function readCompletedBatch(
  resultPath: string,
  metadataPath: string,
  expectedFiles: readonly string[],
  sourceFingerprint: string,
): { result: JestResult; metadata: BatchMetadata } | null {
  if (!existsSync(resultPath) || !existsSync(metadataPath)) return null;
  const result = JSON.parse(readFileSync(resultPath, "utf8")) as JestResult;
  const metadata = JSON.parse(
    readFileSync(metadataPath, "utf8"),
  ) as BatchMetadata;
  const actualFiles = result.testResults
    .map((item) => repoPath(item.name))
    .sort();
  const expected = [...expectedFiles].sort();
  if (
    result.success &&
    metadata.exitCode === 0 &&
    metadata.memoryEvidenceStatus === "COMPLETE" &&
    metadata.memoryEvidenceBlocker === null &&
    metadata.memoryPeakBytes > 0 &&
    metadata.memoryMeasurement === "process_tree_current_working_set_peak" &&
    metadata.sourceFingerprint === sourceFingerprint &&
    JSON.stringify(actualFiles) === JSON.stringify(expected)
  ) {
    return { result, metadata };
  }
  return null;
}

function runJestBatch(
  files: readonly string[],
  temporaryResultPath: string,
  memoryPath: string,
): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
  memoryEvidenceBlocker: string | null;
  memoryEvidenceStatus: "COMPLETE" | "INFRASTRUCTURE_RED";
  memoryPeakBytes: number;
}> {
  return new Promise((resolve, reject) => {
    const monitorReadyPath = `${memoryPath}.ready.json`;
    if (existsSync(memoryPath)) rmSync(memoryPath);
    if (existsSync(`${memoryPath}.tmp`)) rmSync(`${memoryPath}.tmp`);
    if (existsSync(monitorReadyPath)) rmSync(monitorReadyPath);
    if (existsSync(`${monitorReadyPath}.tmp`)) {
      rmSync(`${monitorReadyPath}.tmp`);
    }
    const child = spawn(
      process.execPath,
      [
        JEST_BATCH_ROOT_PATH,
        monitorReadyPath,
        JEST_PATH,
        ...files,
        "--runInBand",
        "--json",
        "--outputFile",
        temporaryResultPath,
      ],
      {
        cwd: process.cwd(),
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    if (!child.pid) {
      reject(new Error("REMEDIATION_JEST_ROOT_PID_MISSING"));
      return;
    }
    const monitor = startWindowsCurrentCoreMemoryMonitor({
      cwd: process.cwd(),
      evidencePath: memoryPath,
      expectedCommandFragments: [
        JEST_BATCH_ROOT_PATH,
        JEST_PATH,
        temporaryResultPath,
      ],
      readyPath: monitorReadyPath,
      rootPid: child.pid,
      runnerPid: process.pid,
    });
    const monitorClosed = new Promise<number | null>((monitorResolve) => {
      monitor.once("close", (code) => monitorResolve(code));
      monitor.once("error", () => monitorResolve(null));
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.once("error", reject);
    child.once("close", (code) => {
      void (async () => {
        const monitorExitCode = await monitorClosed;
        let memoryEvidence: {
          blocker?: string | null;
          memory_peak_bytes?: number;
          status?: "COMPLETE" | "INFRASTRUCTURE_RED";
          writer_complete?: boolean;
        } | null = null;
        if (existsSync(memoryPath)) {
          try {
            memoryEvidence = JSON.parse(
              readFileSync(memoryPath, "utf8"),
            ) as typeof memoryEvidence;
          } catch {
            memoryEvidence = {
              blocker: "MEMORY_EVIDENCE_INVALID_JSON",
              status: "INFRASTRUCTURE_RED",
              writer_complete: false,
            };
          }
        }
        const memoryEvidenceStatus =
          monitorExitCode === 0 &&
          memoryEvidence?.writer_complete === true &&
          memoryEvidence.status === "COMPLETE"
            ? "COMPLETE"
            : "INFRASTRUCTURE_RED";
        const memoryPeakBytes =
          memoryEvidenceStatus === "COMPLETE"
            ? Number(memoryEvidence?.memory_peak_bytes ?? 0)
            : 0;
        resolve({
          exitCode: code ?? 1,
          stdout,
          stderr,
          memoryEvidenceBlocker:
            memoryEvidenceStatus === "COMPLETE"
              ? null
              : String(
                  memoryEvidence?.blocker ??
                    (monitorExitCode === 0
                      ? "MEMORY_EVIDENCE_MISSING_OR_INCOMPLETE"
                      : `MEMORY_MONITOR_EXIT_${String(monitorExitCode)}`),
                ),
          memoryEvidenceStatus,
          memoryPeakBytes,
        });
      })();
    });
  });
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const evidence = hydrateEvidencePrerequisites();
  assertEvidenceSourceUnchanged(evidence, "initial");
  const manifest = readSourceFiles();
  const executionPlan = buildExecutionPlan(manifest);
  const sourceFingerprint = currentSourceFingerprint(evidence);
  atomicWrite(
    path.join(OUTPUT_ROOT, "manifest.json"),
    `${JSON.stringify({
      schema: "current-core-remediation-153-manifest-v3",
      entryCheckpoint: ENTRY_CHECKPOINT,
      currentHead: process.env.CURRENT_CORE_SUBJECT_HEAD ?? "WORKTREE",
      sourceFingerprint,
      filesCount: manifest.length,
      evidenceFilesCount: evidence.files.length,
      evidenceBytes: evidence.files.reduce(
        (sum, file) => sum + file.bytes,
        0,
      ),
      protectedEvidencePathsExcluded: [...PROTECTED_EVIDENCE_PATHS],
      regularBatchSize: REGULAR_BATCH_SIZE,
      heavySingletonFiles: [...HEAVY_SINGLETON_FILES],
      batchesCount: executionPlan.length,
      retries: 0,
      files: manifest,
      executionPlan,
    }, null, 2)}\n`,
  );
  if (HYDRATE_ONLY) {
    process.stdout.write(
      `${JSON.stringify({
        finalStatus:
          "PREPARED_CURRENT_CORE_REMEDIATION_EVIDENCE_NO_TESTS_RUN",
        evidenceFiles: evidence.files.length,
        sourceFingerprint,
        fakeGreenClaimed: false,
      })}\n`,
    );
    return;
  }

  const batchSummaries: Array<Record<string, unknown>> = [];
  const executedFiles: string[] = [];
  for (const [planIndex, files] of executionPlan.entries()) {
    const batchNumber = planIndex + 1;
    const batchId = `batch-${String(batchNumber).padStart(2, "0")}`;
    const resultPath = path.join(OUTPUT_ROOT, `${batchId}.json`);
    const metadataPath = path.join(OUTPUT_ROOT, `${batchId}.meta.json`);
    const stdoutPath = path.join(OUTPUT_ROOT, `${batchId}.stdout.log`);
    const stderrPath = path.join(OUTPUT_ROOT, `${batchId}.stderr.log`);
    const memoryPath = path.join(OUTPUT_ROOT, `${batchId}.memory.json`);
    assertSourceFingerprint(
      sourceFingerprint,
      `${batchId}:before`,
      evidence,
    );
    const completed = readCompletedBatch(
      resultPath,
      metadataPath,
      files,
      sourceFingerprint,
    );
    const startedAt = new Date().toISOString();
    let result: JestResult;
    let exitCode = 0;
    let memoryEvidenceBlocker: string | null = null;
    let memoryEvidenceStatus: "COMPLETE" | "INFRASTRUCTURE_RED" =
      "INFRASTRUCTURE_RED";
    let memoryPeakBytes = 0;
    let resumed = false;

    if (completed) {
      result = completed.result;
      exitCode = completed.metadata.exitCode;
      memoryEvidenceBlocker = completed.metadata.memoryEvidenceBlocker;
      memoryEvidenceStatus = completed.metadata.memoryEvidenceStatus;
      memoryPeakBytes = completed.metadata.memoryPeakBytes;
      resumed = true;
    } else {
      const temporaryResultPath = `${resultPath}.tmp`;
      if (existsSync(temporaryResultPath)) rmSync(temporaryResultPath);
      const invocation = await runJestBatch(
        files,
        temporaryResultPath,
        memoryPath,
      );
      assertSourceFingerprint(
        sourceFingerprint,
        `${batchId}:after`,
        evidence,
      );
      exitCode = invocation.exitCode;
      memoryEvidenceBlocker = invocation.memoryEvidenceBlocker;
      memoryEvidenceStatus = invocation.memoryEvidenceStatus;
      memoryPeakBytes = invocation.memoryPeakBytes;
      atomicWrite(stdoutPath, invocation.stdout);
      atomicWrite(stderrPath, invocation.stderr);
      if (!existsSync(temporaryResultPath)) {
        throw new Error(
          `REMEDIATION_BATCH_RESULT_MISSING:${batchId}:${exitCode}`,
        );
      }
      if (existsSync(resultPath)) rmSync(resultPath);
      renameSync(temporaryResultPath, resultPath);
      result = JSON.parse(readFileSync(resultPath, "utf8")) as JestResult;
      atomicWrite(
        metadataPath,
        `${JSON.stringify({
          schema: "current-core-remediation-153-batch-metadata-v2",
          batchId,
          exitCode,
          sourceFingerprint,
          memoryEvidenceBlocker,
          memoryEvidenceStatus,
          memoryPeakBytes,
          memoryPeakMiB: Number(
            (memoryPeakBytes / (1024 * 1024)).toFixed(2),
          ),
          memoryMeasurement: "process_tree_current_working_set_peak",
          retries: 0,
          resultPath: repoPath(resultPath),
          stdoutPath: repoPath(stdoutPath),
          stderrPath: repoPath(stderrPath),
        }, null, 2)}\n`,
      );
    }

    const actualFiles = result.testResults
      .map((item) => repoPath(item.name))
      .sort();
    if (JSON.stringify(actualFiles) !== JSON.stringify([...files].sort())) {
      throw new Error(`REMEDIATION_BATCH_MANIFEST_DRIFT:${batchId}`);
    }
    executedFiles.push(...actualFiles);
    const stderr = existsSync(stderrPath)
      ? readFileSync(stderrPath, "utf8")
      : "";
    const oomDetected =
      /heap out of memory|allocation failed|javascript heap/i.test(stderr);
    const memoryEvidenceMissing =
      memoryEvidenceStatus !== "COMPLETE" || memoryPeakBytes <= 0;
    const batchSummary = {
      batchId,
      startedAt,
      completedAt: new Date().toISOString(),
      resumed,
      exitCode,
      files: files.length,
      suitesPassed: result.numPassedTestSuites,
      suitesFailed: result.numFailedTestSuites,
      testsPassed: result.numPassedTests,
      testsFailed: result.numFailedTests,
      testsPending: result.numPendingTests,
      testsTodo: result.numTodoTests,
      memoryEvidenceBlocker,
      memoryEvidenceStatus,
      memoryPeakBytes,
      memoryPeakMiB: Number((memoryPeakBytes / (1024 * 1024)).toFixed(2)),
      memoryMeasurement: "process_tree_current_working_set_peak",
      sourceFingerprint,
      memoryEvidenceMissing,
      oomDetected,
      success: result.success,
      resultPath: repoPath(resultPath),
      metadataPath: repoPath(metadataPath),
      stdoutPath: repoPath(stdoutPath),
      stderrPath: repoPath(stderrPath),
    };
    batchSummaries.push(batchSummary);
    atomicWrite(
      path.join(OUTPUT_ROOT, "progress.json"),
      `${JSON.stringify({
        schema: "current-core-remediation-153-progress-v2",
        sourceFingerprint,
        completedBatches: batchSummaries.length,
        totalBatches: executionPlan.length,
        batchSummaries,
      }, null, 2)}\n`,
    );
    process.stdout.write(`${JSON.stringify(batchSummary)}\n`);
  }

  assertEvidenceSourceUnchanged(evidence, "final");
  const filesRun = batchSummaries.reduce(
    (sum, item) => sum + Number(item.files),
    0,
  );
  const suitesFailed = batchSummaries.reduce(
    (sum, item) => sum + Number(item.suitesFailed),
    0,
  );
  const testsFailed = batchSummaries.reduce(
    (sum, item) => sum + Number(item.testsFailed),
    0,
  );
  const testsPending = batchSummaries.reduce(
    (sum, item) => sum + Number(item.testsPending),
    0,
  );
  const testsTodo = batchSummaries.reduce(
    (sum, item) => sum + Number(item.testsTodo),
    0,
  );
  const executionCounts = new Map<string, number>();
  for (const file of executedFiles) {
    executionCounts.set(file, (executionCounts.get(file) ?? 0) + 1);
  }
  const missingFiles = manifest.filter(
    (file) => !executionCounts.has(file),
  );
  const duplicateFiles = [...executionCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([file, count]) => ({ file, count }));
  const unexpectedFiles = [...executionCounts.keys()].filter(
    (file) => !manifest.includes(file),
  );
  const oomCount = batchSummaries.filter(
    (item) => item.oomDetected === true,
  ).length;
  const memoryEvidenceMissingCount = batchSummaries.filter(
    (item) => item.memoryEvidenceMissing === true,
  ).length;
  const summary = {
    schema: "current-core-remediation-153-summary-v3",
    entryCheckpoint: ENTRY_CHECKPOINT,
    currentHead: process.env.CURRENT_CORE_SUBJECT_HEAD ?? "WORKTREE",
    sourceFingerprint,
    atomicResults: true,
    retries: 0,
    filesExpected: EXPECTED_FILES,
    filesRun,
    batches: batchSummaries.length,
    suitesFailed,
    testsFailed,
    testsPending,
    testsTodo,
    missingFiles: missingFiles.length,
    missingFilePaths: missingFiles,
    duplicateFiles: duplicateFiles.length,
    duplicateFilePaths: duplicateFiles,
    unexpectedFiles: unexpectedFiles.length,
    unexpectedFilePaths: unexpectedFiles,
    oomCount,
    memoryEvidenceMissingCount,
    lostReporterOutputs: 0,
    batchSummaries,
    finalStatus:
      filesRun === EXPECTED_FILES &&
      suitesFailed === 0 &&
      testsFailed === 0 &&
      testsPending === 0 &&
      testsTodo === 0 &&
      missingFiles.length === 0 &&
      duplicateFiles.length === 0 &&
      unexpectedFiles.length === 0 &&
      oomCount === 0 &&
      memoryEvidenceMissingCount === 0
        ? "GREEN_CURRENT_CORE_REMEDIATION_153"
        : "STOP_CURRENT_CORE_REMEDIATION_153_RED",
  };
  atomicWrite(
    path.join(OUTPUT_ROOT, "summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  process.stdout.write(`${JSON.stringify(summary)}\n`);
  if (summary.finalStatus !== "GREEN_CURRENT_CORE_REMEDIATION_153") {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  const failure = {
    schema: "current-core-remediation-153-summary-v3",
    entryCheckpoint: ENTRY_CHECKPOINT,
    currentHead: process.env.CURRENT_CORE_SUBJECT_HEAD ?? "WORKTREE",
    atomicResults: false,
    retries: 0,
    filesExpected: EXPECTED_FILES,
    finalStatus: "STOP_CURRENT_CORE_REMEDIATION_153_RUNNER_FAILED",
    runnerError: error instanceof Error ? error.message : String(error),
    fakeGreenClaimed: false,
  };
  atomicWrite(
    path.join(OUTPUT_ROOT, "summary.json"),
    `${JSON.stringify(failure, null, 2)}\n`,
  );
  process.stderr.write(`${JSON.stringify(failure)}\n`);
  process.exitCode = 1;
});
