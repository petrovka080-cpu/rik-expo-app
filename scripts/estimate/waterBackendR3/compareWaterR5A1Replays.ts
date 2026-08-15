import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

type Json = Record<string, any>;

const ROOT = resolve(__dirname, "../../..");
const EVIDENCE = join(ROOT, ".release-runtime", "batch006-water-backend-r3", "evidence-a2");

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const row = value as Json;
  return `{${Object.keys(row).sort().map((key) => `${JSON.stringify(key)}:${stable(row[key])}`).join(",")}}`;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function main(): void {
  const a = JSON.parse(readFileSync(join(EVIDENCE, "A2_13_REPLAY_A", "REPLAY_SUMMARY.json"), "utf8")) as Json;
  const b = JSON.parse(readFileSync(join(EVIDENCE, "A2_13_REPLAY_B", "REPLAY_SUMMARY.json"), "utf8")) as Json;
  const fields = ["releaseId", "sourceHead", "sourceTree", "sourceFingerprintSha256", "manifestSha256", "sourcePackageSha256", "cardinalities", "normalizedDatabaseDigests", "oracleSemanticSha256", "admissionSemanticSha256", "wowSemanticSha256", "proposedQueue"];
  const comparisons = Object.fromEntries(fields.map((field) => [field, { a: a[field], b: b[field], equal: stable(a[field]) === stable(b[field]) }]));
  const predecessorEqual = stable(a.predecessor.before) === stable(a.predecessor.after)
    && stable(b.predecessor.before) === stable(b.predecessor.after)
    && stable(a.predecessor.before) === stable(b.predecessor.before);
  const report = {
    schemaVersion: "water-r6-a2-replay-comparison.v1",
    generatedAt: new Date().toISOString(),
    replay: "2/2",
    databases: [a.database, b.database],
    distinctFreshClones: a.database !== b.database,
    comparisons,
    replayContentHashEqual: comparisons.admissionSemanticSha256.equal && comparisons.normalizedDatabaseDigests.equal,
    replayPackageByteEqual: comparisons.manifestSha256.equal && comparisons.sourcePackageSha256.equal && stable(a.packageFiles) === stable(b.packageFiles),
    replayCardinalitiesEqual: comparisons.cardinalities.equal,
    replayOracleEqual: comparisons.oracleSemanticSha256.equal,
    replayPredecessorDiff: predecessorEqual ? 0 : 1,
    replayProposedQueueDiff: comparisons.proposedQueue.equal ? 0 : 1,
    comparisonSha256: sha256(stable(comparisons)),
    productionDeployed: false,
    batch007Started: false,
    status: "GREEN",
  };
  if (a.status !== "GREEN" || b.status !== "GREEN" || !report.distinctFreshClones
    || Object.values(comparisons).some((row: any) => !row.equal) || !report.replayPackageByteEqual
    || report.replayPredecessorDiff !== 0 || report.replayProposedQueueDiff !== 0) {
    report.status = "RED";
    throw new Error(`WATER_R6_A2_REPLAY_COMPARISON_RED:${stable(report)}`);
  }
  writeFileSync(join(EVIDENCE, "A2_13_REPLAY_COMPARISON.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report)}\n`);
}

main();
