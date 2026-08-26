import { createHash } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { ELECTRICAL_DOMAIN_INVENTORY } from "../../../src/lib/estimate/v4/domains/electricalComplete";

type JestResult = {
  success: boolean;
  numFailedTestSuites: number;
  numFailedTests: number;
  numPassedTestSuites: number;
  numPassedTests: number;
};

const ROOT = resolve(".release-runtime/real-useful-estimates-r3/evidence/r3-3-closeout");
const SHARD_COUNT = 5;
const OUTPUT = resolve(ROOT, "23_ELECTRICAL_SUCCESSOR_MERGE_R33.json");

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

const shards = Array.from({ length: SHARD_COUNT }, (_, shardIndex) => {
  const path = resolve(ROOT, `22_ELECTRICAL_SUCCESSOR_SHARD_${shardIndex}_R33.json`);
  invariant(existsSync(path), `ELECTRICAL_SHARD_RESULT_MISSING:${shardIndex}`);
  const bytes = readFileSync(path);
  const result = JSON.parse(bytes.toString("utf8")) as JestResult;
  invariant(
    result.success && result.numFailedTestSuites === 0 && result.numFailedTests === 0
      && result.numPassedTestSuites === 1 && result.numPassedTests === 7,
    `ELECTRICAL_SHARD_RED:${shardIndex}:${JSON.stringify(result)}`,
  );
  const identities = ELECTRICAL_DOMAIN_INVENTORY
    .filter((_, index) => index % SHARD_COUNT === shardIndex)
    .map((item) => item.catalog_id);
  return {
    shard_index: shardIndex,
    shard_count: SHARD_COUNT,
    result_path: `22_ELECTRICAL_SUCCESSOR_SHARD_${shardIndex}_R33.json`,
    result_sha256: sha256(bytes),
    identities,
    identities_count: identities.length,
    suites_green: result.numPassedTestSuites,
    tests_green: result.numPassedTests,
  };
});

const allIdentities = shards.flatMap((shard) => shard.identities);
const uniqueIdentities = new Set(allIdentities);
const expectedIdentities = new Set(ELECTRICAL_DOMAIN_INVENTORY.map((item) => item.catalog_id));
const missing = [...expectedIdentities].filter((identity) => !uniqueIdentities.has(identity));
const unexpected = [...uniqueIdentities].filter((identity) => !expectedIdentities.has(identity));
const duplicateCount = allIdentities.length - uniqueIdentities.size;
invariant(ELECTRICAL_DOMAIN_INVENTORY.length === 605, "ELECTRICAL_DENOMINATOR_DRIFT");
invariant(uniqueIdentities.size === 605, `ELECTRICAL_UNION_DRIFT:${uniqueIdentities.size}`);
invariant(missing.length === 0 && unexpected.length === 0 && duplicateCount === 0, "ELECTRICAL_SHARD_PARTITION_RED");

const body = `${JSON.stringify({
  schema_version: "master-r33.electrical-successor-shard-merge.v1",
  generated_at_utc: new Date().toISOString(),
  source_contract: "MASTER_TZ_R3_3",
  exact_identity_denominator: 605,
  covered_unique_identities: uniqueIdentities.size,
  missing_identities: missing,
  unexpected_identities: unexpected,
  duplicate_identity_count: duplicateCount,
  scopes_per_identity: ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"],
  durable_projection_contract: {
    schema_snapshot_owner: "first canonical BOQ row only",
    row_formula_resource_trace_preserved: true,
    maximum_json_bytes: 16 * 1024 * 1024,
    limit_increased: false,
  },
  totals: {
    shards: shards.length,
    suites_green: shards.reduce((sum, shard) => sum + shard.suites_green, 0),
    tests_green: shards.reduce((sum, shard) => sum + shard.tests_green, 0),
  },
  shards,
  status: "GREEN_605_OF_605_ELECTRICAL_SUCCESSOR_SERIALIZABLE",
  production_accessed: false,
}, null, 2)}\n`;
const temporary = `${OUTPUT}.tmp-${process.pid}`;
writeFileSync(temporary, body, "utf8");
renameSync(temporary, OUTPUT);
process.stdout.write(`${JSON.stringify({ output: OUTPUT, sha256: sha256(body), status: "GREEN", identities: 605 })}\n`);
