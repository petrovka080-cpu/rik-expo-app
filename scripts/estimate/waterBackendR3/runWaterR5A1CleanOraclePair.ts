import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

type Json = Record<string, any>;

const ROOT = resolve(__dirname, "../../..");
const RUNTIME = join(ROOT, ".release-runtime", "batch006-water-backend-r3");
const EVIDENCE = join(RUNTIME, "evidence-a1");

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const row = value as Json;
  return `{${Object.keys(row).sort().map((key) => `${JSON.stringify(key)}:${stable(row[key])}`).join(",")}}`;
}

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 128 * 1024 * 1024 }).trim();
}

function sourceFingerprint(): { files: number; sha256: string } {
  const paths = git([
    "ls-files", "--cached", "--others", "--exclude-standard", "--",
    "src", "app", "supabase", "android", "scripts", "tests", "App.tsx", "app.json", "app.config.ts",
    "babel.config.js", "metro.config.js", "package.json", "package-lock.json", "tsconfig.json",
  ]).split(/\r?\n/).filter((path) => path && existsSync(join(ROOT, path))).sort();
  const rows = paths.map((path) => {
    const bytes = readFileSync(join(ROOT, path));
    return { path: path.replace(/\\/g, "/"), bytes: bytes.length, sha256: sha256(bytes) };
  });
  return { files: rows.length, sha256: sha256(stable(rows)) };
}

function json(name: string): Json {
  return JSON.parse(readFileSync(join(EVIDENCE, name), "utf8")) as Json;
}

function lineCount(name: string): number {
  return readFileSync(join(EVIDENCE, name), "utf8").split(/\r?\n/).filter(Boolean).length;
}

function run(command: string, args: string[], label: string): Json {
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    timeout: 30 * 60_000,
    windowsHide: true,
  });
  const record = {
    label,
    startedAt,
    endedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    pidBoundary: "NEW_PROCESS",
    command: [command, ...args],
    exitCode: result.status,
    signal: result.signal,
    stdoutSha256: sha256(result.stdout ?? ""),
    stderrSha256: sha256(result.stderr ?? ""),
    stdoutTail: (result.stdout ?? "").slice(-4_000),
    stderrTail: (result.stderr ?? "").slice(-4_000),
  };
  if (result.status !== 0) throw new Error(`WATER_A1_${label}_RED:${stable(record)}`);
  return record;
}

function main(): void {
  mkdirSync(EVIDENCE, { recursive: true });
  const fingerprintBefore = sourceFingerprint();
  const firstRun = run(process.execPath, [
    join(ROOT, "node_modules", "tsx", "dist", "cli.mjs"),
    join(ROOT, "scripts", "estimate", "waterBackendR3", "runIndependentWaterAudit.ts"),
  ], "FIRST_CLEAN_ORACLE");
  const secondRun = run(process.execPath, [
    join(ROOT, "scripts", "estimate", "waterBackendR3", "runSecondCleanIndependentWaterAuditA1.mjs"),
  ], "SECOND_CLEAN_ORACLE");
  const fingerprintAfter = sourceFingerprint();
  const first = json("A3_FIRST_INDEPENDENT_AUDIT.json");
  const second = json("A3_SECOND_CLEAN_AUDIT.json");
  const a2 = json("A2_ANTI_TEMPLATE_REPORT.json");
  const a5 = json("A5_FORMULA_DIMENSION_OWNER_REPORT.json");
  const counts = {
    dispositions: lineCount("A1_56_DISPOSITION_AND_REPAIR.jsonl"),
    repairDiffs: lineCount("A1_ORACLE_REPAIR_DIFF.jsonl"),
    negativeFixtures: lineCount("A1_ORACLE_NEGATIVE_FIXTURES.jsonl"),
    perIdDepth: lineCount("A2_PER_ID_DEPTH_REPORT.jsonl"),
    categoryStage: lineCount("A2_CATEGORY_AND_STAGE_MATRIX.jsonl"),
    expectationProvenance: lineCount("A3_ORACLE_EXPECTATION_PROVENANCE.jsonl"),
    secondVerdicts: lineCount("A3_SECOND_CLEAN_ORACLE_VERDICTS.jsonl"),
  };
  const comparison = {
    schemaVersion: "water-r5-a1-clean-oracle-pair-comparison.v1",
    generatedAt: new Date().toISOString(),
    head: git(["rev-parse", "HEAD"]),
    tree: git(["rev-parse", "HEAD^{tree}"]),
    sourceFingerprintBefore: fingerprintBefore,
    sourceFingerprintAfter: fingerprintAfter,
    sourceUnchanged: fingerprintBefore.sha256 === fingerprintAfter.sha256,
    firstRun,
    secondRun,
    first: {
      catalogIds: first.catalogIds,
      expectedScope: first.expectedScope,
      missing: first.missingExpectedResources,
      unresolved: first.unresolvedDispositions,
      semanticVerdictSha256: first.semanticVerdictSha256,
      productionImports: first.oracleProductionImports,
      status: first.status,
    },
    second: {
      catalogIds: second.catalogIds,
      expectedObligationMatch: second.expectedObligationMatch,
      missing: second.missing,
      unresolved: second.unresolved,
      semanticVerdictSha256: second.semanticVerdictSha256,
      productionImports: second.oracleProductionImports,
      status: second.status,
    },
    counts,
    semanticHashEqual: first.semanticVerdictSha256 === second.semanticVerdictSha256,
    status: "GREEN",
  };
  if (!comparison.sourceUnchanged || first.status !== "GREEN" || second.status !== "GREEN"
    || first.catalogIds?.audited !== 845 || second.catalogIds !== "845/845"
    || first.expectedScope?.resolved !== 6_774 || second.expectedObligationMatch !== "6774/6774"
    || first.missingExpectedResources !== 0 || second.missing !== 0
    || first.unresolvedDispositions !== 0 || second.unresolved !== 0
    || first.oracleProductionImports !== 0 || second.oracleProductionImports !== 0
    || !comparison.semanticHashEqual || counts.dispositions !== 56 || counts.repairDiffs !== 56
    || counts.negativeFixtures !== 10 || counts.perIdDepth !== 845 || counts.categoryStage !== 845
    || counts.expectationProvenance !== 6_774 || counts.secondVerdicts !== 6_774
    || a2.status !== "GREEN" || a5.status !== "GREEN") {
    throw new Error(`WATER_A1_CLEAN_ORACLE_PAIR_RED:${stable(comparison)}`);
  }
  writeFileSync(join(EVIDENCE, "A3_ORACLE_PAIR_COMPARISON.json"), `${JSON.stringify(comparison, null, 2)}\n`, "utf8");
  const inputs = [
    "GLOBAL_11610_WATER_DOMAIN_MEMBERSHIP.jsonl", "WATER_BACKEND_PROFESSIONAL_PASSPORT_INDEX.jsonl",
    "WATER_BACKEND_PARAMETER_SCHEMA_INDEX.jsonl", "WATER_BACKEND_BOQ_ROW_LEDGER.jsonl",
    "WATER_ROW_FORMULA_NORM_PRICE_TRACE.jsonl", "WATER_OFFICIAL_SOURCE_REGISTRY.json",
    "A1_56_DISPOSITION_AND_REPAIR.jsonl", "A1_ORACLE_REPAIR_DIFF.jsonl", "A1_ORACLE_NEGATIVE_FIXTURES.jsonl",
    "A2_PER_ID_DEPTH_REPORT.jsonl", "A2_CATEGORY_AND_STAGE_MATRIX.jsonl", "A2_ANTI_TEMPLATE_REPORT.json",
    "A3_FIRST_INDEPENDENT_AUDIT.json", "A3_SECOND_CLEAN_AUDIT.json", "A3_ORACLE_PAIR_COMPARISON.json",
    "A4_NORMATIVE_SOURCE_REGISTRY.json", "A4_ROW_FORMULA_NORM_PRICE_OWNER_TRACE.jsonl",
    "A5_FORMULA_DIMENSION_OWNER_REPORT.json",
  ].map((name) => {
    const bytes = readFileSync(join(EVIDENCE, name));
    return { file: name, bytes: statSync(join(EVIDENCE, name)).size, sha256: sha256(bytes) };
  });
  const token = {
    schemaVersion: "water-r5-a1-content-green-token.v1",
    generatedAt: new Date().toISOString(),
    head: git(["rev-parse", "HEAD"]),
    tree: git(["rev-parse", "HEAD^{tree}"]),
    sourceFingerprint: fingerprintAfter,
    catalogIds: 845,
    parameters: 109_719,
    formulas: 133_505,
    resources: 133_505,
    oracleDecisions: 6_774,
    dispositions: "56/56",
    negativeFixtures: "10/10",
    cleanAudits: "2/2",
    semanticVerdictSha256: first.semanticVerdictSha256,
    inputs,
    productionDeployed: false,
    batch007Started: false,
    status: "GREEN",
  };
  writeFileSync(join(EVIDENCE, "A6_CONTENT_GREEN_TOKEN.json"), `${JSON.stringify(token, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(token)}\n`);
}

main();
