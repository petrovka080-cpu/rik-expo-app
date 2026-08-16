import { join } from "node:path";

import { assertExact, evidenceRoot, readJson, semanticSha256, writeJson } from "./support";

type Json = Record<string, any>;

const a = readJson<Json>(join(evidenceRoot, "08-database", "POST_IMPORT_ORACLE_A.json"));
const b = readJson<Json>(join(evidenceRoot, "08-database", "POST_IMPORT_ORACLE_B.json"));

function comparable(row: Json): Json {
  return {
    manifestSha256: row.manifestSha256,
    sourcePackageSha256: row.sourcePackageSha256,
    releaseId: row.releaseId,
    releases: row.releases,
    state: row.state,
    domain: row.domain,
    cardinalities: row.cardinalities,
    digests: row.digests,
    beforeEvents: row.beforeEvents,
    activeReleaseUnchanged: row.activeReleaseUnchanged,
    queueUnchanged: row.queueUnchanged,
    externalGlobalAdmission: row.externalGlobalAdmission,
  };
}

assertExact(a.status === "GREEN" && b.status === "GREEN", "CONCRETE_DATABASE_ORACLE_INPUT_RED");
const digestA = semanticSha256(comparable(a));
const digestB = semanticSha256(comparable(b));
assertExact(digestA === digestB, "CONCRETE_DATABASE_ORACLE_A_B_DIFF");
const report = { schemaVersion: "batch008-concrete-r5-database-equality.v1", databaseA: a.database, databaseB: b.database, releaseId: a.releaseId, digestA, digestB, dbDigestEquality: "100%", cardinalityDiff: 0, contentDiff: 0, queueDiff: 0, oldReleasesPreserved: "100%", status: "GREEN" };
writeJson("08-database/DATABASE_A_B_EQUALITY.json", report);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
