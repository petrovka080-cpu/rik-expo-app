import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { assertExact, BATCH009_PREDECESSOR_COMMIT, BATCH009_PREDECESSOR_TREE, evidenceRoot, git, projectRoot, readJson, semanticSha256, sha256, writeJson, writeJsonl } from "./support";

type Json = Record<string, any>;

if (process.argv.includes("--capture-dirty")) {
  const rows = git("status", "--porcelain=v1", "--untracked-files=all").split(/\r?\n/u).filter(Boolean).map((line) => {
    const status = line.slice(0, 2);
    const path = line.slice(3).trim().replace(/^"|"$/gu, "").replaceAll("\\", "/");
    const absolute = join(projectRoot, path);
    const bytes = existsSync(absolute) ? readFileSync(absolute) : Buffer.alloc(0);
    return { status, path, exists: existsSync(absolute), bytes: bytes.length, sha256: bytes.length ? sha256(bytes) : null, scope: /^(scripts\/estimate\/fireBackendR5\/|supabase\/migrations\/20260817180000_batch009_fire_life_safety_r5\.sql$|tests\/estimateBackend\/fireR5\.contract\.test\.ts$)/u.test(path) ? "BATCH009" : "OUT_OF_SCOPE" };
  });
  assertExact(rows.length > 0 && rows.every((row) => row.scope === "BATCH009"), `FIRE_DIRTY_MANIFEST_SCOPE_RED:${JSON.stringify(rows.filter((row) => row.scope !== "BATCH009"))}`);
  writeJsonl("00-preflight/PRE_FREEZE_PATH_MANIFEST.jsonl", rows);
  writeJson("00-preflight/PRE_FREEZE_PATH_SUMMARY.json", { schemaVersion: "batch009-fire-r5-pre-freeze-paths.v1", paths: rows.length, modified: rows.filter((row) => row.status.includes("M")).length, untracked: rows.filter((row) => row.status === "??").length, manifestSha256: semanticSha256(rows), outOfScope: 0, status: "GREEN" });
  process.stdout.write(`${JSON.stringify({ paths: rows.length, modified: rows.filter((row) => row.status.includes("M")).length, untracked: rows.filter((row) => row.status === "??").length, status: "GREEN" }, null, 2)}\n`);
} else {
  assertExact(git("status", "--porcelain") === "", "FIRE_SOURCE_FREEZE_WORKTREE_DIRTY");
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  assertExact(git("merge-base", "--is-ancestor", BATCH009_PREDECESSOR_COMMIT, head) === "", "FIRE_SOURCE_FREEZE_ANCESTRY_RED");
  assertExact(git("rev-parse", `${BATCH009_PREDECESSOR_COMMIT}^{tree}`) === BATCH009_PREDECESSOR_TREE, "FIRE_SOURCE_FREEZE_PREDECESSOR_TREE_RED");
  const paths = git("ls-files").split(/\r?\n/u).filter((path) => path && existsSync(join(projectRoot, path))).sort();
  const entries = paths.map((path) => { const bytes = readFileSync(join(projectRoot, path)); return { path: path.replaceAll("\\", "/"), bytes: bytes.length, sha256: sha256(bytes) }; });
  const content = readJson<Json>(join(evidenceRoot, "05-content", "CONTENT_SUMMARY.json"));
  const oracleA = readJson<Json>(join(evidenceRoot, "06-oracle", "CONTENT_ORACLE_A.json"));
  const oracleB = readJson<Json>(join(evidenceRoot, "06-oracle", "CONTENT_ORACLE_B.json"));
  const mutations = readJson<Json>(join(evidenceRoot, "12-mutations", "MUTATION_SUMMARY.json"));
  const focused = readJson<Json>(join(evidenceRoot, "00-preflight", "IMPACTED_TEST_MATRIX.json"));
  assertExact(content.corpusSha256 === "610a9c633d8f100eef9fb328786bc44cfe936cce26a55f577796bffeb3d17fd3" && oracleA.status === "GREEN_ORACLE_A" && oracleB.status === "GREEN_ORACLE_B" && mutations.killed === 2_321 && focused.status === "GREEN", "FIRE_SOURCE_FREEZE_GATE_RED");
  const report = { schemaVersion: "batch009-fire-r5-source-freeze.v1", head, tree, predecessorCommit: BATCH009_PREDECESSOR_COMMIT, predecessorTree: BATCH009_PREDECESSOR_TREE, predecessorAncestor: true, trackedFiles: entries.length, sourceFingerprintSha256: semanticSha256(entries), corpusSha256: content.corpusSha256, oracleA: oracleA.oracleDigest, oracleB: oracleB.oracleDigest, mutations: "2321/2321", impactedTests: `${focused.passed}/${focused.selected}`, fullJest: "DEFERRED_BY_OPERATOR_NOT_RUN", postFreezeSourceChangesAllowed: false, status: "GREEN" };
  writeJson("00-preflight/SOURCE_FREEZE.json", report);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
