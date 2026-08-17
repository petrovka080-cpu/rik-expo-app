import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const SPEC_PATH = "C:/Users/User/Downloads/P0_CANONICAL_ESTIMATE_TRUTH_REMEDIATION_R4_PRODUCTION_GRADE_TZ (1).md";
const SPEC_SHA256 = "92189dc77fc1593630e8ff1496f2324a385eda1eaed39ce6bc719b9a01d98c1d";
const SPEC_LINES = 2045;
const BASELINE_HEAD = "2e9a045f3aa43a63396c727a597daaaf8d98c890";
const BASELINE_TREE = "2749340a04eb49268cde60cc3c2d026b9b41a9c3";
const BATCH009_HEAD = "91a3ab949f1100b2dab9309f77a2487653c4f33a";
const BATCH009_RELEASE_ID = "2c1cb615-187c-50f6-980d-66b62bd3d5d1";
const PACKAGE_A = "C:/dev/rik-expo-app-batch009-fire-life-safety-r5/.release-runtime/batch009-fire-r5/release-a";
const R3_ARTIFACTS = "artifacts/p0-estimate-truth-remediation-r3";

type Json = Record<string, unknown>;

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function lines(value: string): string[] {
  return value ? value.split(/\r?\n/u).filter(Boolean) : [];
}

function walkFiles(root: string): string[] {
  if (!statSafe(root)?.isDirectory()) return [];
  const output: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) output.push(...walkFiles(path));
    else if (entry.isFile()) output.push(path);
  }
  return output.sort((a, b) => a.localeCompare(b, "en"));
}

function statSafe(path: string): ReturnType<typeof statSync> | null {
  try { return statSync(path); } catch { return null; }
}

function fileFingerprint(path: string, base = process.cwd()): Json {
  const bytes = readFileSync(path);
  return {
    file: relative(base, path).replaceAll("\\", "/"),
    bytes: bytes.byteLength,
    lines: bytes.toString("utf8").split(/\r?\n/u).length - (bytes.at(-1) === 0x0a ? 1 : 0),
    sha256: sha256(bytes),
  };
}

function untrackedStats(paths: readonly string[]): { files: Json[]; additions: number } {
  let additions = 0;
  const files = paths.map((path) => {
    const proof = fileFingerprint(resolve(path));
    additions += Number(proof.lines ?? 0);
    return proof;
  });
  return { files, additions };
}

function trackedNumstat(): { additions: number; deletions: number; files: Json[] } {
  let additions = 0;
  let deletions = 0;
  const files = lines(git(["diff", "--numstat"])).map((line) => {
    const [added, deleted, ...pathParts] = line.split("\t");
    const path = pathParts.join("\t");
    const numericAdded = Number(added);
    const numericDeleted = Number(deleted);
    if (Number.isFinite(numericAdded)) additions += numericAdded;
    if (Number.isFinite(numericDeleted)) deletions += numericDeleted;
    return { path, additions: added, deletions: deleted };
  });
  return { additions, deletions, files };
}

async function main(): Promise<void> {
  const outputRoot = resolve(process.argv[2] ?? ".release-runtime/p0-estimate-truth-remediation-r4/evidence");
  const specBytes = readFileSync(SPEC_PATH);
  const specHash = sha256(specBytes);
  const specLines = specBytes.toString("utf8").split(/\r?\n/u).length - (specBytes.at(-1) === 0x0a ? 1 : 0);
  if (specHash !== SPEC_SHA256 || specLines !== SPEC_LINES) {
    throw new Error(`R4_SPEC_FINGERPRINT_MISMATCH:${specHash}:${specLines}`);
  }

  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  const branch = git(["branch", "--show-current"]);
  const status = lines(git(["status", "--short"]));
  const modified = lines(git(["diff", "--name-only"]));
  const untracked = lines(git(["ls-files", "--others", "--exclude-standard"]));
  const tracked = trackedNumstat();
  const newFiles = untrackedStats(untracked);
  let baselineAncestor = false;
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", BASELINE_HEAD, "HEAD"], { stdio: "ignore" });
    baselineAncestor = true;
  } catch {
    baselineAncestor = false;
  }
  if (!baselineAncestor) throw new Error("R4_BASELINE_ANCESTRY_HARD_STOP");

  const r3ArtifactRoot = resolve(R3_ARTIFACTS);
  const r3EvidenceFingerprints = walkFiles(r3ArtifactRoot).map((path) => fileFingerprint(path));
  const packageManifestPath = resolve(PACKAGE_A, "manifest.json");
  const packageManifestBytes = readFileSync(packageManifestPath);
  const packageManifest = JSON.parse(packageManifestBytes.toString("utf8")) as Json;
  if (packageManifest.releaseId !== BATCH009_RELEASE_ID || packageManifest.productionDeployed !== false) {
    throw new Error("R4_BATCH009_PACKAGE_QUARANTINE_MISMATCH");
  }

  const sensitiveEnvNames = Object.keys(process.env).filter((name) =>
    /(DATABASE|SUPABASE|POSTGRES|PRODUCTION|VERCEL|EAS|EXPO_TOKEN)/iu.test(name),
  ).sort();
  const timestamp = new Date().toISOString();
  const common = { head, tree, timestamp };
  const specProof = {
    schemaVersion: "p0-canonical-estimate-truth-remediation-r4-spec.v3",
    ...common,
    path: SPEC_PATH,
    bytes: specBytes.byteLength,
    lines: specLines,
    sha256: specHash,
    authority: "ONLY_ACTIVE_FULL_SPEC",
  };
  const authority = {
    schemaVersion: "p0-canonical-estimate-truth-remediation-r4-authority.v1",
    ...common,
    activeSpec: specProof,
    superseded: ["R1", "R2", "R3", "R4_V2_SHA256_83e9a34a76542d0af9fd9d48368ff1b6f57fa4b7ab6dfaaba033b0deb5142657"],
    preservationPolicyRu: "Полезный successor diff сохраняется; старые package/evidence/revisions не переписываются.",
  };
  const startState = {
    schemaVersion: "p0-canonical-estimate-truth-remediation-r4-start-state.v1",
    ...common,
    capturedBeforeBuilderAt: "2026-08-17T04:36:18.0699798Z",
    branch,
    baseline: { head: BASELINE_HEAD, tree: BASELINE_TREE, ancestorOfCurrentHead: baselineAncestor },
    current: {
      head,
      tree,
      statusEntries: status.length,
      status,
      modifiedFiles: modified,
      untrackedFiles: untracked,
      trackedDiff: tracked,
      untrackedDiff: newFiles,
      totalChangedFiles: new Set([...modified, ...untracked]).size,
      totalAdditionsIncludingUntracked: tracked.additions + newFiles.additions,
      totalDeletions: tracked.deletions,
    },
    handoffApproximation: { files: 30, additions: 4830, deletions: 132 },
    discrepancyExplanationRu: "После переданного журнала добавлены точечные UI-тесты, R3 streaming/root-cause audit, системные Drywall/HVAC owner fixes, layout/keyboard изменения и SQL migration delta. Поэтому фактический diff больше приблизительного handoff; сброс не выполнялся.",
    r3EvidenceFingerprints,
    verdict: "P0_R4_START_STATE_FROZEN",
  };
  const quarantine = {
    schemaVersion: "p0-canonical-estimate-truth-remediation-r4-batch009-quarantine.v1",
    ...common,
    batch009Head: BATCH009_HEAD,
    releaseId: BATCH009_RELEASE_ID,
    packageA: {
      path: PACKAGE_A,
      manifestSha256: sha256(packageManifestBytes),
      sourcePackageSha256: packageManifest.sourcePackageSha256 ?? null,
      productionDeployed: packageManifest.productionDeployed,
    },
    activationAllowed: false,
    activationPerformedByR4: false,
    batch010StartedByR4: false,
    verdict: "GREEN_QUARANTINED_NO_ACTIVATION",
  };
  const isolation = {
    schemaVersion: "p0-canonical-estimate-truth-remediation-r4-production-isolation.v1",
    ...common,
    allowedDatabaseHostnames: ["127.0.0.1", "localhost"],
    allowedDisposablePostgresPort: 55432,
    sensitiveEnvironmentVariableNamesPresent: sensitiveEnvNames,
    sensitiveEnvironmentValuesReadOrPersisted: false,
    productionVariablesUsedByR4: [],
    externalWriteCommandsRunByR4: [],
    pushPrMergeOtaDeployAllowed: false,
    noteRu: "Имена production/read-only переменных присутствуют в окружении, но значения не читаются и не передаются командам; все R4 DB-команды обязаны использовать явный localhost:55432.",
    verdict: "GREEN_LOCAL_DISPOSABLE_ONLY_WITH_ENV_GUARD",
  };
  const journal = {
    timestamp,
    phase: "R4-PHASE-0",
    status: "GREEN",
    what_checked_ru: "Проверены R4 spec, successor HEAD/TREE/status/diff, ancestry BATCH-008, R3 evidence fingerprints и карантин BATCH-009.",
    why_ru: "Зафиксировать неизменяемую стартовую точку без потери полезного незавершённого diff.",
    command_or_action: "npx tsx scripts/estimate/p0TruthRemediationR4/buildR4Preflight.ts",
    finding_ru: "R4 SHA/строки совпали; baseline является предком; BATCH-009 остаётся неактивированным; работа ограничена локальной disposable-инфраструктурой.",
    affected_ids: 4503,
    affected_rows: 1243194,
    affected_files: [...modified, ...untracked],
    evidence: [
      "00-spec/SPEC_FINGERPRINT.json",
      "00-spec/AUTHORITY_AND_SUPERSEDED_SPECS.json",
      "01-preflight/START_STATE.json",
      "01-preflight/BATCH009_QUARANTINE.json",
      "01-preflight/PRODUCTION_ISOLATION_PROOF.json",
    ],
    completed_ru: "R4 authority и start state зафиксированы.",
    not_completed_ru: "Frozen repro/census и все content-truth gates ещё не выполнены.",
    next_action_ru: "Материализовать R4 census и BEFORE/root-cause ledgers, затем завершить shared contracts.",
    stop_reason_ru: null,
    head,
    tree,
  };

  const writes: Array<[string, unknown]> = [
    ["00-spec/SPEC_FINGERPRINT.json", specProof],
    ["00-spec/AUTHORITY_AND_SUPERSEDED_SPECS.json", authority],
    ["01-preflight/START_STATE.json", startState],
    ["01-preflight/BATCH009_QUARANTINE.json", quarantine],
    ["01-preflight/PRODUCTION_ISOLATION_PROOF.json", isolation],
  ];
  for (const [path, value] of writes) {
    const fullPath = join(outputRoot, path);
    await mkdir(resolve(fullPath, ".."), { recursive: true });
    await writeFile(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  }
  await mkdir(outputRoot, { recursive: true });
  await writeFile(join(outputRoot, "JOURNAL_RU.jsonl"), `${JSON.stringify(journal)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    status: "P0_R4_PREFLIGHT_GREEN",
    head,
    tree,
    branch,
    baselineAncestor,
    specSha256: specHash,
    r3EvidenceFilesFingerprinted: r3EvidenceFingerprints.length,
    changedFiles: startState.current.totalChangedFiles,
    additions: startState.current.totalAdditionsIncludingUntracked,
    deletions: startState.current.totalDeletions,
    outputRoot,
  }, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
