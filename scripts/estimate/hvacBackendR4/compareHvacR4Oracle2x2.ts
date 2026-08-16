import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(__dirname, "../../..");
const EVIDENCE = join(ROOT, ".release-runtime", "batch007-hvac-r4", "evidence");
const ORACLE = join(EVIDENCE, "06-oracle");
const EXPECTED_CORPUS = "4ebcced9a7eda71bdc94431743229a4faff79a750a7736bded6c80c207a4f625";
const sha = (value: Buffer | string): string => createHash("sha256").update(value).digest("hex");
const read = (name: string): Record<string, any> => JSON.parse(readFileSync(join(ORACLE, name), "utf8"));

function main(): void {
  const a1 = read("INDEPENDENT_CONTENT_ORACLE_A_RUN_1.json");
  const a2 = read("INDEPENDENT_CONTENT_ORACLE_A_RUN_2.json");
  const b1 = read("INDEPENDENT_CONTENT_ORACLE_B_RUN_1.json");
  const b2 = read("INDEPENDENT_CONTENT_ORACLE_B_RUN_2.json");
  const depth = JSON.parse(readFileSync(join(EVIDENCE, "A2", "A2_15_STRICT_DEPTH_AFTER_SUMMARY.json"), "utf8"));
  const aPer1 = readFileSync(join(EVIDENCE, a1.perIdEvidence.path));
  const aPer2 = readFileSync(join(EVIDENCE, a2.perIdEvidence.path));
  const bPer1 = readFileSync(join(EVIDENCE, b1.perIdEvidence.path));
  const bPer2 = readFileSync(join(EVIDENCE, b2.perIdEvidence.path));
  const sourceFingerprints = [a1.sourceFingerprint?.sha256, a2.sourceFingerprint?.sha256, b1.sourceFingerprint?.sha256, b2.sourceFingerprint?.sha256];
  const sourceFrozenAcrossRuns = sourceFingerprints.every((value) => typeof value === "string" && value.length === 64) && new Set(sourceFingerprints).size === 1;
  const report = {
    schemaVersion: "batch007-hvac-r4-a2-content-oracle-2x2.v1",
    corpusSetSha256: EXPECTED_CORPUS,
    sourceFrozenAcrossRuns,
    sourceFingerprintSha256: sourceFrozenAcrossRuns ? sourceFingerprints[0] : null,
    sourceFingerprints,
    strictFloors: { L3: 250, L4: 500, L5: 1000 },
    strictDepth: { beforeRed: depth.beforeRed, afterRed: depth.afterRed, exceptionCount: 0 },
    oracleA: {
      runs: 2,
      identities: [a1.identities, a2.identities],
      corpusHashes: [a1.inputCorpusSetSha256, a2.inputCorpusSetSha256],
      resultHashes: [a1.oracleResultSha256, a2.oracleResultSha256],
      perIdHashes: [sha(aPer1), sha(aPer2)],
      byteEqual: aPer1.equals(aPer2),
      negativeFixturesDetected: [a1.negativeFixtures, a2.negativeFixtures].every((fixtures) => fixtures.every((fixture: any) => fixture.detected === true)),
      statuses: [a1.status, a2.status],
    },
    oracleB: {
      runs: 2,
      identities: [b1.identities, b2.identities],
      corpusHashes: [b1.corpusSetSha256, b2.corpusSetSha256],
      resultHashes: [b1.resultSha256, b2.resultSha256],
      perIdHashes: [sha(bPer1), sha(bPer2)],
      byteEqual: bPer1.equals(bPer2),
      shallowComplexFailures: [b1.shallowComplexFailures, b2.shallowComplexFailures],
      mutationDetectorsDetected: [b1.mutationDetectors, b2.mutationDetectors].every((fixtures) => fixtures.every((fixture: any) => fixture.detected === true)),
      statuses: [b1.status, b2.status],
    },
    mutationsStatus: "PENDING_SEPARATE_CONTROLLED_MUTATION_SUITE",
    contentGreenA2: false,
    packageAllowed: false,
    status: "RED_UNTIL_CONTROLLED_MUTATIONS_COMPLETE",
  };
  const coreGreen = sourceFrozenAcrossRuns && depth.beforeRed === 20 && depth.afterRed === 0
    && report.oracleA.identities.every((value) => value === 1012)
    && report.oracleB.identities.every((value) => value === 1012)
    && report.oracleA.corpusHashes.every((value) => value === EXPECTED_CORPUS)
    && report.oracleB.corpusHashes.every((value) => value === EXPECTED_CORPUS)
    && new Set(report.oracleA.resultHashes).size === 1 && new Set(report.oracleB.resultHashes).size === 1
    && report.oracleA.byteEqual && report.oracleB.byteEqual
    && report.oracleA.negativeFixturesDetected && report.oracleB.mutationDetectorsDetected
    && report.oracleB.shallowComplexFailures.every((value) => value === 0);
  if (!coreGreen) throw new Error(`HVAC_ORACLE_2X2_RED:${JSON.stringify(report)}`);
  writeFileSync(join(ORACLE, "ORACLE_2X2_EQUALITY.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
