import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { Client } from "pg";
import {
  CANONICAL_CATALOG_LITERAL_SEARCH_SQL,
  CANONICAL_CATALOG_RANKING_ALGORITHM,
} from "../../../src/lib/estimate/backendPlatform/catalogLiteralSearchSql";
import {
  parseCanonicalCatalogSearchIntent,
  relaxedCanonicalCatalogSearchTokens,
} from "../../../src/lib/estimate/backendPlatform/catalogSearchIntent";

// Read-only integration controls execute the exact SQL imported by the backend.
// The accepted predecessor supplies the unchanged literal ordering contract.
async function main(): Promise<void> {
const baselineHead = "b2217e5472dd889d4c411276e4f892bb3faf3865";
const baselineSource = execFileSync("git", ["show", `${baselineHead}:scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts`], { encoding: "utf8", windowsHide: true });
const baselineTemplate = baselineSource.match(/const LOCAL_LITERAL_SEARCH_R58 = (`[\s\S]*?`);/)?.[1];
assert(baselineTemplate && !baselineTemplate.includes("${"));
const baselineSql: string = Function(`return ${baselineTemplate}`)();
const release = JSON.parse(fs.readFileSync("data/estimate-benchmarks/r568-local-developer-canonical-release.json", "utf8").replace(/^\uFEFF/, ""));
const root = ".release-runtime/r568/s27-48/pvc-query-relevance/";
const db = new Client({ connectionString: "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2" });
await db.connect();
try {
  await db.query("begin read only");
  const run = async (sql: string, tokens: string[], mode: string, after: string | null = null, limit = 20000, scope = "WORKS") =>
    (await db.query(sql, [release.searchReleaseId, tokens, mode, "", "", "", after, scope, limit])).rows;
  const prompt = "ПВХ 1,2 мм 458 м² по бетонному основанию";
  const tokens = relaxedCanonicalCatalogSearchTokens(parseCanonicalCatalogSearchIntent(prompt, null, []).searchText);
  const before = await run(baselineSql, tokens, "RELAXED");
  const after = await run(CANONICAL_CATALOG_LITERAL_SEARCH_SQL, tokens, "RELAXED");
  const massId = "canonical-work:master:roof_pvc_1_2mm_concrete_ready_insulation_krer12";
  assert(!String(before[0]?.canonical_name_ru).includes("ПВХ"), "PREDECESSOR_DEFECT_REPRODUCED");
  assert(String(after[0]?.canonical_name_ru).includes("ПВХ"), "MEMBRANE_MUST_PRECEDE_PARTIAL_CONCRETE_MATCHES");
  const massRank = after.findIndex(row => row.catalog_id === massId);
  assert(massRank >= 0 && massRank < 3, "EXACT_PVC_PROFILE_MUST_BE_ACCESSIBLE_AT_TOP");
  const partialConcreteRank = after.findIndex(row => String(row.canonical_name_ru).startsWith("Бетонирование основания анкерной группы"));
  assert(partialConcreteRank > massRank, "SUBSTRATE_ONLY_MATCH_MUST_NOT_OVERTAKE_WORK_IDENTITY");
  assert.deepEqual(after.map(row => row.catalog_id).sort(), before.map(row => row.catalog_id).sort(), "NO_CANDIDATES_LOST_OR_ADDED");

  const literalCases: Array<{ mode: string; tokens: string[]; scope?: string }> = [
    ...["пвх", "ламин", "фонар", "valtec", "бетон"].map(term => ({ mode: "PHRASE", tokens: [term] })),
    { mode: "ANY", tokens: ["пвх", "бетон"] },
    { mode: "ALL", tokens: ["пвх", "кров"] },
    { mode: "PHRASE", tokens: ["пвх"], scope: "REFERENCES" },
  ];
  const literalProofs = [];
  for (const control of literalCases) {
    const oldRows = await run(baselineSql, control.tokens, control.mode, null, 20000, control.scope);
    const newRows = await run(CANONICAL_CATALOG_LITERAL_SEARCH_SQL, control.tokens, control.mode, null, 20000, control.scope);
    const identity = (rows: typeof oldRows) => rows.map(row => ({ catalogId: row.catalog_id, sourceId: row.source_catalog_id, tier: row.tier, key: row.stable_order_key, resultHash: row.result_set_sha256 }));
    assert.deepEqual(identity(newRows), identity(oldRows), `LITERAL_ORDER_UNCHANGED:${control.mode}:${control.tokens.join("|")}`);
    literalProofs.push({ ...control, rows: newRows.length, unchanged: true });
  }
  const paged: typeof after = [];
  let cursor: string | null = null;
  for (let page = 0; page < 100; page++) {
    const rows = await run(CANONICAL_CATALOG_LITERAL_SEARCH_SQL, tokens, "RELAXED", cursor, 7);
    if (rows.length === 0) break;
    assert(rows.every(row => row.result_set_sha256 === after[0].result_set_sha256));
    paged.push(...rows);
    cursor = rows.at(-1).stable_order_key;
  }
  assert.deepEqual(paged.map(row => row.catalog_id), after.map(row => row.catalog_id), "PAGINATION_COMPLETE_AND_ORDERED");
  assert.equal(new Set(paged.map(row => row.catalog_id)).size, paged.length, "NO_CANONICAL_DUPLICATES");
  const receipt = { capturedAt: new Date().toISOString(), status: "READ_ONLY_SQL_INTEGRATION_GREEN", baselineHead, rankingAlgorithm: CANONICAL_CATALOG_RANKING_ALGORITHM, searchReleaseId: release.searchReleaseId, prompt, tokens, beforeFirst: before[0].canonical_name_ru, afterFirst: after[0].canonical_name_ru, massRank, partialConcreteRank, candidates: after.length, literalProofs, paginationPageSize: 7, pagedRows: paged.length, dataMutation: false };
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(root + "sql-integration-proof.json", JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt));
  await db.query("rollback");
} finally {
  await db.end();
}
}

main().catch(error => { console.error(error); process.exitCode = 1; });
