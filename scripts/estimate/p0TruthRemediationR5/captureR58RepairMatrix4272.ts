import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Json = Record<string, any>;

const SPEC_PATH = resolve(
  "C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (11).md",
);
const SPEC_SHA256 = "21bdd2cf79185cbcf2a6621005f32d6eaf47e653dd88e5b006fcdc6797854138";
const BASE_COMMIT = "691acb78d55c38ef447a4d91c0bc798992e58dbc";
const COVERAGE_LEDGER = resolve(
  ".release-runtime/p0-one-monolith-r57/evidence/05-baseline/BATCH001_008_ACCEPTED_RUNTIME_TRACE_COVERAGE_4272.jsonl",
);
const COVERAGE_SUMMARY = resolve(
  ".release-runtime/p0-one-monolith-r57/evidence/05-baseline/BATCH001_008_ACCEPTED_RUNTIME_TRACE_COVERAGE_4272.json",
);
const VALIDATION_LEDGER = resolve(
  ".release-runtime/p0-one-monolith-r57/evidence/05-baseline/ACCEPTED_RUNTIME_TRACE_BASELINE_VALIDATION_LEDGER.jsonl",
);
const VALIDATION_SUMMARY = resolve(
  ".release-runtime/p0-one-monolith-r57/evidence/05-baseline/ACCEPTED_RUNTIME_TRACE_BASELINE_VALIDATION_SUMMARY.json",
);
const ROOT = resolve(".release-runtime/p0-one-monolith-r58/evidence/05-baseline");
const OUTPUT_LEDGER = resolve(ROOT, "R58_4272_REPAIR_MATRIX.jsonl");
const OUTPUT_SUMMARY = resolve(ROOT, "R58_4272_REPAIR_MATRIX_SUMMARY.json");

type Partition =
  | "FROZEN_GREEN_617"
  | "COMPILE_RED_937"
  | "TRACE_NOT_ADMITTED_1432"
  | "NO_AUTHORITATIVE_TRACE_1286";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(path: string): string {
  return sha256(readFileSync(path));
}

function git(args: readonly string[]): string {
  return execFileSync("git", [...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function readJsonl(path: string): Json[] {
  return readFileSync(path, "utf8").split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as Json);
}

function countBy<T extends string>(values: readonly T[]): Record<T, number> {
  return values.reduce((result, value) => {
    result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {} as Record<T, number>);
}

function isFrozenGreenAsphalt(catalogId: string): boolean {
  return catalogId.startsWith(
    "work_catalog_roadworks_paving_roads_landscape_interior_asphalt_",
  ) && !catalogId.includes("_wet_zone_") && !catalogId.includes("_technical_room_");
}

function main(): void {
  invariant(sha256File(SPEC_PATH) === SPEC_SHA256, "R58_REPAIR_MATRIX_SPEC_DRIFT");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === "codex/p0-one-monolith-r5", `R58_REPAIR_MATRIX_BRANCH_DRIFT:${branch}`);
  git(["merge-base", "--is-ancestor", BASE_COMMIT, head]);
  invariant(git(["status", "--porcelain=v1"]) === "", "R58_REPAIR_MATRIX_REQUIRES_CLEAN_HEAD");

  const coverage = readJsonl(COVERAGE_LEDGER);
  const validation = readJsonl(VALIDATION_LEDGER);
  const coverageSummary = JSON.parse(readFileSync(COVERAGE_SUMMARY, "utf8")) as Json;
  const validationSummary = JSON.parse(readFileSync(VALIDATION_SUMMARY, "utf8")) as Json;
  invariant(coverage.length === 4_272, `R58_REPAIR_MATRIX_COVERAGE_DENOMINATOR:${coverage.length}`);
  invariant(validation.length === 1_554, `R58_REPAIR_MATRIX_VALIDATION_DENOMINATOR:${validation.length}`);
  invariant(new Set(coverage.map((row) => row.catalog_id)).size === 4_272, "R58_REPAIR_MATRIX_COVERAGE_DUPLICATE_ID");
  invariant(new Set(validation.map((row) => row.catalog_id)).size === 1_554, "R58_REPAIR_MATRIX_VALIDATION_DUPLICATE_ID");
  invariant(coverageSummary.definitions_with_trace === 2_986, "R58_REPAIR_MATRIX_TRACE_DENOMINATOR_DRIFT");
  invariant(coverageSummary.definitions_ready_for_candidate_compile_validation === 1_554,
    "R58_REPAIR_MATRIX_ADMITTED_DENOMINATOR_DRIFT");

  const validationById = new Map(validation.map((row) => [String(row.catalog_id), row]));
  const matrix = coverage.map((row): Json => {
    const catalogId = String(row.catalog_id);
    const validationRow = validationById.get(catalogId) ?? null;
    const hasTrace = row.provenance_kind === "ACCEPTED_RUNTIME_TRACE";
    const admitted = row.ready_for_candidate_compile_validation === true;
    invariant(Boolean(validationRow) === admitted, `R58_REPAIR_MATRIX_ADMISSION_LEDGER_MISMATCH:${catalogId}`);
    let partition: Partition;
    let frozenReason: string;
    if (admitted && (row.domain === "electrical" || (row.domain === "asphalt" && isFrozenGreenAsphalt(catalogId)))) {
      partition = "FROZEN_GREEN_617";
      frozenReason = row.domain === "electrical"
        ? "R58_FROZEN_ACCEPTED_ELECTRICAL_605"
        : "R58_FROZEN_ACCEPTED_ASPHALT_12_EXCLUDES_WET_ZONE_AND_TECHNICAL_ROOM";
    } else if (admitted) {
      partition = "COMPILE_RED_937";
      frozenReason = "R58_FROZEN_BACKEND_COMPILE_NOT_PROVEN";
    } else if (hasTrace) {
      partition = "TRACE_NOT_ADMITTED_1432";
      frozenReason = "ACCEPTED_TRACE_PRESENT_BUT_CANDIDATE_ADMISSION_BLOCKED";
    } else {
      partition = "NO_AUTHORITATIVE_TRACE_1286";
      frozenReason = "APPROVED_TEMPLATE_BASELINE_RECOVERY_REQUIRED";
    }
    const currentBlockers = validationRow?.blockers ?? row.blockers ?? [];
    const frozenGreenDrift = partition === "FROZEN_GREEN_617" && validationRow?.status !== "GREEN_CANDIDATE_ASSET";
    return {
      catalog_id: catalogId,
      definition_version_id: row.definition_version_id,
      definition_sha256: row.definition_sha256,
      domain: row.domain,
      partition,
      frozen_reason: frozenReason,
      provenance_kind: row.provenance_kind,
      ready_for_candidate_compile_validation: admitted,
      current_validation_status: validationRow?.status ?? null,
      current_validation_blockers: currentBlockers,
      frozen_green_drift: frozenGreenDrift,
      repair_class: frozenGreenDrift
        ? "DUPLICATE_OR_PROFESSIONAL_CONTRACT_DRIFT"
        : partition === "COMPILE_RED_937"
          ? (currentBlockers.length > 0 ? "EXACT_VALIDATION_BLOCKERS" : "FRESH_BACKEND_COMPILE_REQUIRED")
          : partition === "TRACE_NOT_ADMITTED_1432"
            ? "TRACE_SCHEMA_OR_INPUT_ADMISSION"
            : partition === "NO_AUTHORITATIVE_TRACE_1286"
              ? "APPROVED_TEMPLATE_BASELINE_RECOVERY"
              : "FROZEN_GREEN_PRESERVATION",
      source_coverage_ledger_sha256: sha256File(COVERAGE_LEDGER),
      source_validation_ledger_sha256: sha256File(VALIDATION_LEDGER),
    };
  }).sort((left, right) => String(left.catalog_id).localeCompare(String(right.catalog_id)));

  const partitions = countBy(matrix.map((row) => row.partition as Partition));
  invariant(partitions.FROZEN_GREEN_617 === 617, `R58_REPAIR_MATRIX_GREEN:${partitions.FROZEN_GREEN_617}`);
  invariant(partitions.COMPILE_RED_937 === 937, `R58_REPAIR_MATRIX_RED:${partitions.COMPILE_RED_937}`);
  invariant(partitions.TRACE_NOT_ADMITTED_1432 === 1_432,
    `R58_REPAIR_MATRIX_TRACE_NOT_ADMITTED:${partitions.TRACE_NOT_ADMITTED_1432}`);
  invariant(partitions.NO_AUTHORITATIVE_TRACE_1286 === 1_286,
    `R58_REPAIR_MATRIX_NO_TRACE:${partitions.NO_AUTHORITATIVE_TRACE_1286}`);
  invariant(Object.values(partitions).reduce((sum, value) => sum + value, 0) === 4_272,
    "R58_REPAIR_MATRIX_PARTITION_SUM_DRIFT");
  const frozenGreenByDomain = countBy(matrix
    .filter((row) => row.partition === "FROZEN_GREEN_617")
    .map((row) => row.domain as string));
  invariant(frozenGreenByDomain.electrical === 605 && frozenGreenByDomain.asphalt === 12,
    "R58_REPAIR_MATRIX_FROZEN_GREEN_DOMAIN_DRIFT");

  const ledgerBytes = matrix.map((row) => JSON.stringify(row)).join("\n") + "\n";
  mkdirSync(dirname(OUTPUT_LEDGER), { recursive: true });
  writeFileSync(OUTPUT_LEDGER, ledgerBytes, "utf8");
  const summary = {
    schemaVersion: "p0-one-monolith-r58-repair-matrix-4272.v1",
    capturedAt: new Date().toISOString(),
    specSha256: SPEC_SHA256,
    source: { branch, head, tree },
    activeReleaseId: coverageSummary.release_id,
    total: matrix.length,
    uniqueCatalogIds: new Set(matrix.map((row) => row.catalog_id)).size,
    partitions,
    frozenGreenByDomain,
    frozenGreenCurrentDrift: matrix.filter((row) => row.frozen_green_drift).length,
    laterReadOnlyValidationConflict: {
      sourceStatus: validationSummary.status,
      laterGreenCandidateAssets: validationSummary.green_candidate_assets,
      policy: "DOES_NOT_SUPERSEDE_R58_FROZEN_617_937_PARTITION",
      reason: "R58 is the sole authority; later in-memory validation did not execute the required fresh canonical backend gate",
    },
    inputs: [COVERAGE_LEDGER, COVERAGE_SUMMARY, VALIDATION_LEDGER, VALIDATION_SUMMARY].map((path) => ({
      path: path.replace(/\\/gu, "/"),
      bytes: readFileSync(path).byteLength,
      sha256: sha256File(path),
    })),
    ledgerPath: OUTPUT_LEDGER.replace(/\\/gu, "/"),
    ledgerBytes: Buffer.byteLength(ledgerBytes),
    ledgerSha256: sha256(ledgerBytes),
    sourceDatabaseWrites: 0,
    status: "GREEN_R58_IMMUTABLE_4272_PARTITION_RECONCILED_REPAIR_PENDING",
  };
  writeFileSync(OUTPUT_SUMMARY, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
}
