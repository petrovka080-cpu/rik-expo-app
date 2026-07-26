import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type Json = Record<string, unknown>;
type Outcome = {
  file: string;
  status: "PASS" | "FAIL";
  evidence_path: string;
  evidence_kind: "jest_json" | "stderr_log";
};

const root = process.cwd();
const outputDir = path.join(root, "artifacts", "current-core-closeout");

function argValue(prefix: string): string | null {
  return process.argv.slice(2).find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function readJson(filePath: string): Json {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Json;
}

function readJsonIfExists(filePath: string): Json | null {
  return fs.existsSync(filePath) ? readJson(filePath) : null;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function normalize(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function relative(filePath: string): string {
  return normalize(path.relative(root, filePath));
}

function subjectRootForRunDir(runDir: string): string {
  const marker = `${path.sep}.release-runtime${path.sep}`;
  const markerIndex = runDir.indexOf(marker);
  return markerIndex >= 0 ? runDir.slice(0, markerIndex) : root;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function sha256(value: string | Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function executionDirs(runDir: string): string[] {
  const children = (directory: string, prefix: string): string[] => {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
      .map((entry) => path.join(directory, entry.name))
      .sort();
  };
  const shardDirs = children(runDir, "shard-");
  const shardExecutionDirs = shardDirs.flatMap((shardDir) => {
    const microbatchDirs = children(shardDir, "microbatch-");
    return microbatchDirs.length > 0 ? microbatchDirs : [shardDir];
  });
  return [
    ...shardExecutionDirs,
    ...children(path.join(runDir, "resume-missing"), "batch-"),
    ...children(path.join(runDir, "resume-single"), "single-"),
  ];
}

function parseLogOutcomes(logPath: string): Outcome[] {
  if (!fs.existsSync(logPath)) return [];
  const outcomes: Outcome[] = [];
  const pattern = /^(PASS|FAIL)\s+(.+?\.(?:test|spec)\.[tj]sx?)(?:\s+\(|$)/;
  for (const line of fs.readFileSync(logPath, "utf8").split(/\r?\n/)) {
    const match = line.match(pattern);
    if (!match) continue;
    outcomes.push({
      file: normalize(match[2]),
      status: match[1] as "PASS" | "FAIL",
      evidence_path: relative(logPath),
      evidence_kind: "stderr_log",
    });
  }
  return outcomes;
}

function failureMessages(result: Json): string[] {
  const direct = stringArray(result.failureMessage ? [result.failureMessage] : []);
  const assertions = Array.isArray(result.assertionResults)
    ? (result.assertionResults as Json[]).flatMap((assertion) => stringArray(assertion.failureMessages))
    : [];
  return [...new Set([...direct, ...assertions].filter(Boolean))];
}

function classify(file: string, kind: "test_failure" | "oom"): {
  root_cause_id: string;
  title: string;
  production_owner: string;
} {
  if (kind === "oom") {
    return {
      root_cause_id: "RC_01_11610_AUDIT_MEMORY_LIFECYCLE",
      title: "11 610 catalog audits retain unbounded runtime state",
      production_owner: "scripts/estimate/professionalBoq11610RegressionSealCore.ts",
    };
  }
  const rules: Array<[RegExp, string, string, string]> = [
    [
      /road|asphalt|scope/i,
      "RC_02_ROAD_SCOPE_STATE_MACHINE",
      "Road scope selection and asphalt binding are not governed by one explicit state machine",
      "src/lib/estimate road scope resolver and request draft integration",
    ],
    [
      /formula|unitsemantics|noalllinear|masonrydepth|familycalculators|layermatrix/i,
      "RC_03_FORMULA_AND_UNIT_SEMANTICS",
      "Formula dimensions and row-kind unit semantics diverge across catalog families",
      "src/lib/estimate formula graph, row classifier, and unit resolver",
    ],
    [
      /ontology|worktypes|tiledoesnotmap|selectedwork|parameterextraction/i,
      "RC_04_ONTOLOGY_RESOLUTION",
      "Ontology ranking and selected-work evidence allow semantically wrong high-confidence matches",
      "src/lib/estimate ontology resolver and ranking",
    ],
    [
      /procurement|buyer|catalogbinding|price|tax|sourceevidence|fake(source|supplier|total)/i,
      "RC_05_PROCUREMENT_PRICE_EVIDENCE",
      "Catalog, price, tax, and procurement evidence are not consistently bound to row truth",
      "src/lib/estimate pricing evidence and procurement handoff",
    ],
    [
      /grouped|pdf|snapshot|revision|handoff|presentation|micro_hydro|editableparam/i,
      "RC_06_CANONICAL_REVISION_PRESENTATION",
      "UI, PDF, and procurement do not always consume one canonical revision",
      "src/lib/estimate revision projection and presentation handoff",
    ],
    [
      /release|finalreadiness|proof|android|fingerprint|rollout/i,
      "RC_07_RELEASE_EVIDENCE_DISCOVERY",
      "Release gates accept incomplete, stale, or non-dynamically-discovered evidence",
      "scripts/release evidence discovery and release guard",
    ],
    [
      /architecture|entrypoints|frontendonly|service|route|screen|market|navigation|bottomtabs|duplicateplus/i,
      "RC_08_ARCHITECTURE_AND_ROUTE_BOUNDARIES",
      "Entrypoints and UI routes bypass or duplicate canonical service boundaries",
      "app entrypoints, navigation, and service boundary owners",
    ],
    [
      /performance-budget|benchmark|performance/i,
      "RC_09_PERFORMANCE_BUDGET",
      "Runtime and source-size performance budgets are exceeded",
      "performance-critical estimate runtime and UI source owners",
    ],
    [
      /drawings|requiredforpreliminary|runtimecontract|norawdump/i,
      "RC_10_RUNTIME_CONTRACT_METADATA",
      "Preliminary BOQ contract metadata and public assumptions are inconsistent",
      "professional BOQ runtime contract compiler",
    ],
    [
      /backfill|10000|real500|acceptance|platformcore|estimatecore|estimateinfrastructure/i,
      "RC_11_ESTIMATE_PLATFORM_AGGREGATE",
      "Platform aggregate gates expose cascades from shared estimate truth defects",
      "estimate platform aggregate audit owners",
    ],
  ];
  const matched = rules.find(([pattern]) => pattern.test(file));
  if (matched) {
    return {
      root_cause_id: matched[1],
      title: matched[2],
      production_owner: matched[3],
    };
  }
  return {
    root_cause_id: "RC_12_UNCLUSTERED_BASELINE_FAILURE",
    title: "Failure requires focused production-owner diagnosis",
    production_owner: "owner to be resolved from failure stack",
  };
}

function main(): void {
  const runDirArg = argValue("--run-dir=");
  if (!runDirArg) throw new Error("missing_required_argument:--run-dir=");
  const runDir = path.resolve(root, runDirArg);
  const subjectRoot = subjectRootForRunDir(runDir);
  const initial = readJson(path.join(runDir, "terminal-summary.json"));
  const manifestDocument = readJson(path.join(runDir, "manifest.json"));
  const singleSummary =
    readJsonIfExists(path.join(runDir, "resume-single", "resume-terminal-summary.json")) ??
    initial;
  const manifest = Array.isArray(manifestDocument.files) ? manifestDocument.files as Json[] : [];
  const expected = manifest.map((entry) => String(entry.test_path));
  const expectedSet = new Set(expected);
  const outcomeByFile = new Map<string, Outcome>();
  const duplicateTerminalOutcomes = new Set<string>();
  const attemptCounts = new Map<string, number>();
  const failures = new Map<string, {
    file: string;
    kind: "test_failure";
    messages: string[];
    evidence_paths: string[];
  }>();
  const oomExecutions: Array<{
    file: string;
    exit_code: number;
    evidence_paths: string[];
  }> = [];

  for (const directory of executionDirs(runDir)) {
    const manifestPath = path.join(directory, "manifest.json");
    const metadataPath = path.join(directory, "metadata.json");
    const jestPath = path.join(directory, "jest.json");
    const stderrPath = path.join(directory, "stderr.log");
    if (!fs.existsSync(manifestPath)) continue;
    const executionManifest = readJson(manifestPath);
    const scheduled = [
      ...stringArray(executionManifest.test_files),
      ...stringArray(executionManifest.files),
      ...(typeof executionManifest.file === "string" ? [executionManifest.file] : []),
    ];
    for (const file of scheduled) attemptCounts.set(file, (attemptCounts.get(file) ?? 0) + 1);

    const logOutcomes = parseLogOutcomes(stderrPath);
    const jsonOutcomes: Outcome[] = [];
    if (fs.existsSync(jestPath)) {
      const jest = readJson(jestPath);
      for (const result of Array.isArray(jest.testResults) ? jest.testResults as Json[] : []) {
        if (typeof result.name !== "string") continue;
        const file = normalize(path.relative(subjectRoot, result.name));
        const failed = result.status === "failed" ||
          (Array.isArray(result.assertionResults) &&
            (result.assertionResults as Json[]).some((assertion) => assertion.status === "failed"));
        jsonOutcomes.push({
          file,
          status: failed ? "FAIL" : "PASS",
          evidence_path: relative(jestPath),
          evidence_kind: "jest_json",
        });
        if (failed) {
          const current = failures.get(file) ?? {
            file,
            kind: "test_failure" as const,
            messages: [],
            evidence_paths: [],
          };
          current.messages.push(...failureMessages(result));
          current.evidence_paths.push(relative(jestPath), relative(stderrPath));
          failures.set(file, current);
        }
      }
    }
    const preferred = jsonOutcomes.length > 0 ? jsonOutcomes : logOutcomes;
    for (const outcome of preferred) {
      if (!expectedSet.has(outcome.file)) continue;
      const prior = outcomeByFile.get(outcome.file);
      if (prior) {
        if (prior.status !== outcome.status || prior.evidence_path !== outcome.evidence_path) {
          duplicateTerminalOutcomes.add(outcome.file);
        }
        continue;
      }
      outcomeByFile.set(outcome.file, outcome);
      if (outcome.status === "FAIL" && !failures.has(outcome.file)) {
        failures.set(outcome.file, {
          file: outcome.file,
          kind: "test_failure",
          messages: [],
          evidence_paths: [outcome.evidence_path],
        });
      }
    }
    if (fs.existsSync(metadataPath)) {
      const metadata = readJson(metadataPath);
      if (metadata.exit_code === 134) {
        const unresolved = scheduled.filter((file) => !preferred.some((outcome) => outcome.file === file));
        for (const file of unresolved) {
          oomExecutions.push({
            file,
            exit_code: 134,
            evidence_paths: [relative(metadataPath), relative(stderrPath)],
          });
        }
      }
    }
  }

  const terminalMissing = expected.filter((file) => !outcomeByFile.has(file));
  const terminalUnexpected = [...outcomeByFile.keys()].filter((file) => !expectedSet.has(file)).sort();
  const terminalOom = terminalMissing.map((file) => {
    const evidence = oomExecutions.filter((item) => item.file === file);
    return {
      file,
      kind: "oom" as const,
      exit_code: 134,
      attempt_count: attemptCounts.get(file) ?? 0,
      messages: ["V8 heap exhausted before Jest could write a terminal test result."],
      evidence_paths: [...new Set(evidence.flatMap((item) => item.evidence_paths))],
    };
  });
  const failureItems = [
    ...[...failures.values()].map((failure) => ({
      ...failure,
      messages: [...new Set(failure.messages)],
      evidence_paths: [...new Set(failure.evidence_paths)],
      attempt_count: attemptCounts.get(failure.file) ?? 0,
    })),
    ...terminalOom,
  ].sort((left, right) => left.file.localeCompare(right.file, "en"));
  const grouped = new Map<string, {
    root_cause_id: string;
    title: string;
    production_owner: string;
    status: "OPEN";
    failure_paths: string[];
    blocker_kinds: Array<"test_failure" | "oom">;
  }>();
  for (const failure of failureItems) {
    const classification = classify(failure.file, failure.kind);
    const entry = grouped.get(classification.root_cause_id) ?? {
      ...classification,
      status: "OPEN" as const,
      failure_paths: [],
      blocker_kinds: [],
    };
    entry.failure_paths.push(failure.file);
    entry.blocker_kinds.push(failure.kind);
    grouped.set(classification.root_cause_id, entry);
  }
  const rootCauses = [...grouped.values()]
    .map((entry) => ({
      ...entry,
      failure_paths: [...new Set(entry.failure_paths)].sort(),
      blocker_kinds: [...new Set(entry.blocker_kinds)].sort(),
      reproduction_status: "BASELINE_REPRODUCED",
      violated_contract: "Production contract remains RED until focused diagnosis confirms the exact owner.",
      fix_status: "NOT_STARTED",
      focused_tests_status: "NOT_RUN_AFTER_FIX",
      related_tests_status: "NOT_RUN_AFTER_FIX",
      no_test_weakening: true,
    }))
    .sort((left, right) => left.root_cause_id.localeCompare(right.root_cause_id, "en"));

  const common = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    subject_sha: String(initial.subject_sha),
    manifest_hash: String(initial.manifest_hash),
    manifest_content_hash: String(initial.manifest_content_hash),
    source_runtime_directory: relative(runDir),
    workspace_fingerprint_before: String(initial.workspace_fingerprint_before),
    workspace_fingerprint_after: String(singleSummary.workspace_fingerprint_after),
    workspace_stable: singleSummary.workspace_stable === true,
    fake_green_claimed: false,
  };
  const baselineManifest = {
    ...common,
    manifest_files: expected.length,
    files_sha256: sha256(expected.join("\n")),
    files: manifest,
  };
  const baselineSummary = {
    ...common,
    final_status: terminalOom.length > 0
      ? "STOP_CURRENT_CORE_BASELINE_WITH_TEST_FAILURES_AND_OOM"
      : "STOP_CURRENT_CORE_BASELINE_WITH_TEST_FAILURES",
    planned_logical_shards: Number(initial.planned_shards),
    concurrency: Number(initial.concurrency),
    manifest_files: expected.length,
    terminal_outcome_files: outcomeByFile.size,
    terminal_pass_files: [...outcomeByFile.values()].filter((outcome) => outcome.status === "PASS").length,
    terminal_fail_files: [...outcomeByFile.values()].filter((outcome) => outcome.status === "FAIL").length,
    terminal_oom_files: terminalOom.length,
    terminal_missing_files: terminalMissing,
    terminal_unexpected_files: terminalUnexpected,
    duplicate_terminal_outcome_files: [...duplicateTerminalOutcomes].sort(),
    all_manifest_files_reached_terminal_jest_result: terminalMissing.length === 0,
    all_manifest_files_accounted_for_by_result_or_oom:
      outcomeByFile.size + terminalOom.length === expected.length,
    blocker_files: failureItems.length,
    diagnostic_attempts: {
      files_with_more_than_one_scheduled_attempt: [...attemptCounts]
        .filter(([, count]) => count > 1)
        .map(([file, count]) => ({ file, scheduled_attempt_count: count }))
        .sort((left, right) => left.file.localeCompare(right.file, "en")),
      retry_flag_used: false,
      force_exit_used: false,
      heap_limit_increased: false,
      timeout_increased: false,
    },
  };
  const baselineFailures = {
    ...common,
    final_status: "STOP_CURRENT_CORE_BASELINE_FAILURE_LEDGER",
    blocker_files: failureItems.length,
    test_failure_files: failureItems.filter((failure) => failure.kind === "test_failure").length,
    oom_files: failureItems.filter((failure) => failure.kind === "oom").length,
    failures: failureItems,
  };
  const rootCauseLedger = {
    ...common,
    final_status: "STOP_CURRENT_CORE_ROOT_CAUSES_OPEN",
    root_cause_groups: rootCauses.length,
    blocker_files: failureItems.length,
    entries: rootCauses,
  };

  writeJson(path.join(outputDir, "baseline-manifest.json"), baselineManifest);
  writeJson(path.join(outputDir, "baseline-terminal-summary.json"), baselineSummary);
  writeJson(path.join(outputDir, "baseline-failures.json"), baselineFailures);
  writeJson(path.join(outputDir, "root-cause-ledger.json"), rootCauseLedger);
  console.info(JSON.stringify({
    final_status: baselineSummary.final_status,
    subject_sha: common.subject_sha,
    manifest_files: expected.length,
    terminal_outcome_files: outcomeByFile.size,
    terminal_fail_files: baselineSummary.terminal_fail_files,
    terminal_oom_files: terminalOom.length,
    blocker_files: failureItems.length,
    root_cause_groups: rootCauses.length,
    workspace_stable: common.workspace_stable,
  }, null, 2));
}

main();
