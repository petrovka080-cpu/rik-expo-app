import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { performance } from "node:perf_hooks";

import { Client, type QueryResult } from "pg";

const DEFAULT_DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/p0_r4_search_unicode_probe_20260817";
const MIGRATION_PATH = "supabase/migrations/20260817230000_p0_estimate_truth_remediation_r1.sql";
const PACKAGE_SHA256 = "c94d02110953517a3202682a2b80899f070f501a0f8bfdc5d501ad8be9c46efb";
const EXPECTED_COUNTS = new Map([
  ["ла", 3523],
  ["ро", 3293],
  ["со", 1107],
  ["др", 600],
]);
const EXPECTED_GLOBAL_COUNTS = new Map([
  ["ла", 3485],
  ["ро", 3216],
  ["со", 1089],
  ["др", 591],
]);
const EXPECTED_EXTERNAL_COUNTS = new Map([
  ["ла", 38],
  ["ро", 77],
  ["со", 18],
  ["др", 9],
]);

type Row = Record<string, unknown>;

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function extractFunction(source: string, signature: string): string {
  const start = source.indexOf(signature);
  if (start < 0) throw new Error(`R4_SEARCH_SQL_FUNCTION_NOT_FOUND:${signature}`);
  const end = source.indexOf("\n$$;", start);
  if (end < 0) throw new Error(`R4_SEARCH_SQL_FUNCTION_END_NOT_FOUND:${signature}`);
  return source.slice(start, end + "\n$$;".length);
}

function percentile95(values: readonly number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)];
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main(): Promise<void> {
  const databaseUrl = process.env.R4_SEARCH_PROBE_DATABASE_URL ?? DEFAULT_DATABASE_URL;
  const parsed = new URL(databaseUrl);
  if (!(["127.0.0.1", "localhost"].includes(parsed.hostname) && parsed.port === "55432" && parsed.pathname.startsWith("/p0_r4_"))) {
    throw new Error("R4_SEARCH_PROBE_DATABASE_GUARD_REJECTED");
  }
  const outputRoot = resolve(process.argv[2] ?? ".release-runtime/p0-estimate-truth-remediation-r4/evidence");
  const migrationBytes = await readFile(MIGRATION_PATH);
  const migrationSource = migrationBytes.toString("utf8");
  const normalizeSql = extractFunction(migrationSource, "create or replace function public.estimate_search_normalize_r2");
  const searchSql = extractFunction(migrationSource, "create or replace function public.estimate_search_catalog_r2");
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  const timestamp = new Date().toISOString();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query("begin");
    await client.query("alter table public.estimate_search_document add column if not exists normalized_search_blob text");
    await client.query("update public.estimate_search_document set normalized_search_blob=array_to_string(normalized_search_terms, chr(31)) where normalized_search_blob is null");
    await client.query("alter table public.estimate_search_document alter column normalized_search_blob set not null");
    await client.query("create index if not exists estimate_search_document_blob_trgm_idx on public.estimate_search_document using gin(normalized_search_blob extensions.gin_trgm_ops)");
    await client.query(normalizeSql);
    await client.query("drop function if exists public.estimate_search_catalog_r2(text,jsonb,text,integer)");
    await client.query(searchSql);
    await client.query("commit");

    const releaseResult = await client.query<Row>("select * from public.estimate_search_index_release where status='active'");
    if (releaseResult.rows.length !== 1) throw new Error(`R4_SEARCH_ACTIVE_RELEASE_COUNT:${releaseResult.rows.length}`);
    const release = releaseResult.rows[0];
    const globalCount = Number(release.global_count);
    const externalCount = Number(release.external_count);
    if (globalCount !== 11610 || externalCount !== 660 || globalCount + externalCount !== 12270) {
      throw new Error(`R4_SEARCH_CORPUS_MISMATCH:${globalCount}:${externalCount}`);
    }
    const common = {
      sourceHead: head,
      sourceTree: tree,
      sourcePackageSha256: PACKAGE_SHA256,
      databaseReleaseId: String(release.id),
      timestamp,
      command: "npx tsx scripts/estimate/p0TruthRemediationR4/verifyR4UnicodeSearch.ts",
      toolVersion: `node ${process.version}; PostgreSQL ${String((await client.query("show server_version")).rows[0].server_version)}`,
    };
    const queryResults: Row[] = [];
    const paginationRows: Row[] = [];
    const allDurations: number[] = [];
    for (const [query, expected] of EXPECTED_COUNTS) {
      let cursor: string | null = null;
      let pageNumber = 0;
      let literalTotal = -1;
      let globalLiteralTotal = -1;
      let externalLiteralTotal = -1;
      let resultSetSha256: string | null = null;
      const catalogIds = new Set<string>();
      const pageDurations: number[] = [];
      do {
        const started = performance.now();
        const result: QueryResult<Row> = await client.query<Row>(
          "select * from public.estimate_search_catalog_r2($1,$2::jsonb,$3,$4)",
          [query, JSON.stringify({}), cursor, 100],
        );
        const durationMs = performance.now() - started;
        allDurations.push(durationMs);
        pageDurations.push(durationMs);
        pageNumber += 1;
        if (!result.rows.length) break;
        const currentTotal = Number(result.rows[0].literal_total_count);
        const currentGlobalTotal = Number(result.rows[0].global_literal_total_count);
        const currentExternalTotal = Number(result.rows[0].external_literal_total_count);
        const currentHash = String(result.rows[0].result_set_sha256);
        if (literalTotal < 0) literalTotal = currentTotal;
        if (globalLiteralTotal < 0) globalLiteralTotal = currentGlobalTotal;
        if (externalLiteralTotal < 0) externalLiteralTotal = currentExternalTotal;
        if (resultSetSha256 == null) resultSetSha256 = currentHash;
        if (literalTotal !== currentTotal || globalLiteralTotal !== currentGlobalTotal
          || externalLiteralTotal !== currentExternalTotal || resultSetSha256 !== currentHash) {
          throw new Error(`R4_SEARCH_PAGE_SUMMARY_DRIFT:${query}:${pageNumber}`);
        }
        for (const row of result.rows) {
          const catalogId = String(row.catalog_id);
          if (catalogIds.has(catalogId)) throw new Error(`R4_SEARCH_CURSOR_DUPLICATE:${query}:${catalogId}`);
          catalogIds.add(catalogId);
        }
        cursor = catalogIds.size < literalTotal && result.rows.length === 100
          ? String(result.rows.at(-1)?.order_key ?? "")
          : null;
      } while (cursor);

      const oracle = await client.query<Row>(`
        with active_release as (
          select id from public.estimate_search_index_release where status='active'
        ), normalized as (
          select public.estimate_search_normalize_r2($1) q
        )
        select
          count(*)::integer expected_count,
          count(*) filter (where d.catalog_origin='GLOBAL')::integer global_expected_count,
          count(*) filter (where d.catalog_origin<>'GLOBAL')::integer external_expected_count
        from public.estimate_search_document d
        join active_release r on r.id=d.search_release_id
        cross join normalized n
        where position(n.q in d.normalized_canonical_name)>0
      `, [query]);
      const oracleCount = Number(oracle.rows[0].expected_count);
      const globalOracleCount = Number(oracle.rows[0].global_expected_count);
      const externalOracleCount = Number(oracle.rows[0].external_expected_count);
      const expectedGlobal = EXPECTED_GLOBAL_COUNTS.get(query);
      const expectedExternal = EXPECTED_EXTERNAL_COUNTS.get(query);
      if (literalTotal !== expected || oracleCount !== expected || catalogIds.size !== expected
        || globalLiteralTotal !== expectedGlobal || globalOracleCount !== expectedGlobal
        || externalLiteralTotal !== expectedExternal || externalOracleCount !== expectedExternal) {
        throw new Error(`R4_SEARCH_COUNT_MISMATCH:${query}:${expected}:${literalTotal}:${oracleCount}:${catalogIds.size}:${globalLiteralTotal}:${globalOracleCount}:${externalLiteralTotal}:${externalOracleCount}`);
      }
      const p95Ms = percentile95(pageDurations);
      queryResults.push({
        ...common,
        query,
        normalizedQuery: query,
        expectedLiteralCount: expected,
        backendLiteralTotalCount: literalTotal,
        backendGlobalLiteralTotalCount: globalLiteralTotal,
        backendExternalLiteralTotalCount: externalLiteralTotal,
        independentCanonicalTitleOracleCount: oracleCount,
        independentGlobalTitleOracleCount: globalOracleCount,
        independentExternalTitleOracleCount: externalOracleCount,
        uniqueCatalogIdsAcrossAllPages: catalogIds.size,
        suggestionTotalCount: 0,
        pages: pageNumber,
        resultSetSha256,
        p95Ms,
        verdict: p95Ms <= 250 ? "GREEN_DIRECTED_TWO_SYMBOL_QUERY" : "RED_SEARCH_P95",
      });
      paginationRows.push({
        ...common,
        query,
        expected,
        collected: catalogIds.size,
        duplicateCatalogIds: 0,
        missingCatalogIds: expected - catalogIds.size,
        pages: pageNumber,
        verdict: catalogIds.size === expected ? "GREEN_NO_CURSOR_GAP_OR_DUPLICATE" : "RED_CURSOR_PARITY",
      });
    }
    const overallP95Ms = percentile95(allDurations);
    if (overallP95Ms > 250) throw new Error(`R4_SEARCH_P95_RED:${overallP95Ms}`);
    const corpusManifest = {
      schemaVersion: "p0-canonical-estimate-truth-remediation-r4-search-corpus.v1",
      ...common,
      global: globalCount,
      external: externalCount,
      total: globalCount + externalCount,
      discovered: Number(release.discovered_count),
      snapshotSha256: release.snapshot_sha256,
      migrationSha256: sha256(migrationBytes),
      unicodeNormalizerProbe: {
        query: "ла",
        normalizedHex: Buffer.from(String((await client.query("select public.estimate_search_normalize_r2($1) value", ["ла"])).rows[0].value), "utf8").toString("hex"),
        expectedHex: "d0bbd0b0",
      },
      verdict: "GREEN_CORPUS_12270_UNICODE_NORMALIZER",
    };
    const oracleEvidence = {
      schemaVersion: "p0-canonical-estimate-truth-remediation-r4-two-symbol-oracle.v1",
      ...common,
      scope: "USER_DIRECTED_QUERIES_LA_RO_SO_DR",
      queries: queryResults,
      directedQueriesPassed: queryResults.filter((row) => row.verdict === "GREEN_DIRECTED_TWO_SYMBOL_QUERY").length,
      directedQueriesExpected: EXPECTED_COUNTS.size,
      fullCorpusAllMeaningfulSubstringsCompleted: false,
      verdict: "RED_FULL_CORPUS_ORACLE_PENDING_DIRECTED_CASES_GREEN",
    };
    const paginationEvidence = {
      schemaVersion: "p0-canonical-estimate-truth-remediation-r4-pagination-parity.v1",
      ...common,
      queries: paginationRows,
      cursorGapOrDuplicate: 0,
      verdict: "GREEN_DIRECTED_QUERIES_FULL_PAGINATION",
    };
    const performanceEvidence = {
      schemaVersion: "p0-canonical-estimate-truth-remediation-r4-search-performance.v1",
      ...common,
      samples: allDurations.length,
      p95Ms: overallP95Ms,
      maximumMs: Math.max(...allDurations),
      budgetMs: 250,
      timeoutCount: 0,
      verdict: "GREEN_DIRECTED_QUERY_P95_FULL_CORPUS_PERF_PENDING",
    };
    await writeJson(join(outputRoot, "04-search/SEARCH_CORPUS_12270_MANIFEST.json"), corpusManifest);
    await writeJson(join(outputRoot, "04-search/TWO_SYMBOL_ORACLE.json"), oracleEvidence);
    await writeJson(join(outputRoot, "04-search/PAGINATION_PARITY.json"), paginationEvidence);
    await writeJson(join(outputRoot, "04-search/SEARCH_PERFORMANCE.json"), performanceEvidence);
    const journal = {
      timestamp,
      phase: "R4-PHASE-2-SEARCH",
      status: "RED",
      what_checked_ru: "Исправлена Unicode-нормализация и полностью пройдены все страницы для запросов «ла», «ро», «со», «др» на corpus 12 270.",
      why_ru: "Фактический экран показывал около 15 локальных fallback-карточек вместо всех буквальных совпадений canonical backend.",
      command_or_action: common.command,
      finding_ru: "До исправления кириллица нормализовалась в пустую строку. После исправления: ла=3523, ро=3293, со=1107, др=600; gap/duplicate=0 на directed queries.",
      affected_ids: 12270,
      affected_rows: 12270,
      affected_files: [MIGRATION_PATH, "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx", "src/features/requests/components/WorkTemplateSuggestions.tsx"],
      evidence: ["04-search/SEARCH_CORPUS_12270_MANIFEST.json", "04-search/TWO_SYMBOL_ORACLE.json", "04-search/PAGINATION_PARITY.json", "04-search/SEARCH_PERFORMANCE.json"],
      completed_ru: "Directed user queries и их полная cursor pagination закрыты.",
      not_completed_ru: "Независимый oracle всех значимых подстрок полного corpus ещё не выполнен; общий R4 остаётся RED.",
      next_action_ru: "Запустить focused UI/backend contract gates и затем полный all-substrings oracle.",
      stop_reason_ru: null,
      head,
      tree,
    };
    await appendFile(join(outputRoot, "JOURNAL_RU.jsonl"), `${JSON.stringify(journal)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify({
      status: "P0_R4_DIRECTED_UNICODE_SEARCH_GREEN",
      counts: Object.fromEntries(EXPECTED_COUNTS),
      globalCounts: Object.fromEntries(EXPECTED_GLOBAL_COUNTS),
      externalCounts: Object.fromEntries(EXPECTED_EXTERNAL_COUNTS),
      pages: Object.fromEntries(paginationRows.map((row) => [String(row.query), row.pages])),
      p95Ms: overallP95Ms,
      fullCorpusOracle: "PENDING",
    }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
