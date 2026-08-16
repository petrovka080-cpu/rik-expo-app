import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { assertExact, BATCH008_PREDECESSOR_COMMIT, BATCH008_PREDECESSOR_TREE, evidenceRoot, git, projectRoot, readJson, semanticSha256, sha256, writeJson, writeJsonl } from "./support";

type Json = Record<string, any>;

if (process.argv.includes("--capture-dirty")) {
  const rows = git("status", "--porcelain=v1", "--untracked-files=all").split(/\r?\n/u).filter(Boolean).map((line) => {
    const status = line.slice(0, 2);
    const path = line.slice(3).trim().replace(/^"|"$/gu, "").replaceAll("\\", "/");
    const absolute = join(projectRoot, path);
    const bytes = existsSync(absolute) ? readFileSync(absolute) : Buffer.alloc(0);
    return { status, path, exists: existsSync(absolute), bytes: bytes.length, sha256: bytes.length ? sha256(bytes) : null, scope: /^(scripts\/estimate\/concreteBackendR5\/|supabase\/migrations\/20260816180000_batch008_concrete_r5\.sql$|tests\/estimateBackend\/concreteR5\.contract\.test\.ts$|scripts\/estimate\/(invokeM1AsphaltWindowsOcrR1\.ps1|renderM1AsphaltOfficialPdfPagesR1\.mjs)$)/u.test(path) ? "BATCH008" : "OUT_OF_SCOPE" };
  });
  assertExact(rows.length > 0 && rows.every((row) => row.scope === "BATCH008"), `CONCRETE_DIRTY_MANIFEST_SCOPE_RED:${JSON.stringify(rows.filter((row) => row.scope !== "BATCH008"))}`);
  writeJsonl("00-preflight/PRE_FREEZE_PATH_MANIFEST.jsonl", rows);
  writeJson("00-preflight/PRE_FREEZE_PATH_SUMMARY.json", { schemaVersion: "batch008-concrete-r5-pre-freeze-paths.v1", paths: rows.length, modified: rows.filter((row) => row.status.includes("M")).length, untracked: rows.filter((row) => row.status === "??").length, manifestSha256: semanticSha256(rows), outOfScope: 0, status: "GREEN" });
  process.stdout.write(`${JSON.stringify({ paths: rows.length, modified: rows.filter((row) => row.status.includes("M")).length, untracked: rows.filter((row) => row.status === "??").length, status: "GREEN" }, null, 2)}\n`);
} else {
  assertExact(git("status", "--porcelain") === "", "CONCRETE_SOURCE_FREEZE_WORKTREE_DIRTY");
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  assertExact(git("merge-base", "--is-ancestor", BATCH008_PREDECESSOR_COMMIT, head) === "", "CONCRETE_SOURCE_FREEZE_ANCESTRY_RED");
  assertExact(git("rev-parse", `${BATCH008_PREDECESSOR_COMMIT}^{tree}`) === BATCH008_PREDECESSOR_TREE, "CONCRETE_SOURCE_FREEZE_PREDECESSOR_TREE_RED");
  const paths = git("ls-files").split(/\r?\n/u).filter((path) => path && existsSync(join(projectRoot, path))).sort();
  const entries = paths.map((path) => { const bytes = readFileSync(join(projectRoot, path)); return { path: path.replaceAll("\\", "/"), bytes: bytes.length, sha256: sha256(bytes) }; });
  const content = readJson<Json>(join(evidenceRoot, "05-content", "CONTENT_SUMMARY.json"));
  const oracleA = readJson<Json>(join(evidenceRoot, "06-oracle", "CONTENT_ORACLE_A.json"));
  const oracleB = readJson<Json>(join(evidenceRoot, "06-oracle", "CONTENT_ORACLE_B.json"));
  const mutations = readJson<Json>(join(evidenceRoot, "12-mutations", "MUTATION_SUMMARY.json"));
  const focused = readJson<Json>(join(evidenceRoot, "00-preflight", "IMPACTED_TEST_MATRIX.json"));
  assertExact(content.corpusSha256 === "52e12ca58ddf4e2817c26b8c837d7f911d6cecd3a8b1ac54a04b359b9973ccc8" && oracleA.status === "GREEN_ORACLE_A" && oracleB.status === "GREEN_ORACLE_B" && mutations.killed === 1_767 && focused.status === "GREEN", "CONCRETE_SOURCE_FREEZE_GATE_RED");
  const report = { schemaVersion: "batch008-concrete-r5-source-freeze.v1", head, tree, predecessorCommit: BATCH008_PREDECESSOR_COMMIT, predecessorTree: BATCH008_PREDECESSOR_TREE, predecessorAncestor: true, trackedFiles: entries.length, sourceFingerprintSha256: semanticSha256(entries), corpusSha256: content.corpusSha256, oracleA: oracleA.oracleDigest, oracleB: oracleB.oracleDigest, mutations: "1767/1767", impactedTests: `${focused.passed}/${focused.selected}`, fullJest: "DEFERRED_BY_OPERATOR_NOT_RUN", postFreezeSourceChangesAllowed: false, status: "GREEN" };
  writeJson("00-preflight/SOURCE_FREEZE.json", report);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
