import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const SPEC_PATH = resolve(
  "C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (11).md",
);
const SPEC_SHA256 = "21bdd2cf79185cbcf2a6621005f32d6eaf47e653dd88e5b006fcdc6797854138";
const BASE_COMMIT = "691acb78d55c38ef447a4d91c0bc798992e58dbc";
const EXPECTED_BRANCH = "codex/p0-one-monolith-r5";
const TARGET_RELEASE_ID = process.env.R58_TARGET_RELEASE_ID
  ?? "94443669-8f5b-5cc7-b364-2f8e9f9e3506";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const API_ROOT = String(process.env.R58_CANONICAL_API_ROOT
  ?? "http://127.0.0.1:8777/canonical-estimate").replace(/\/+$/u, "");
const AUTHORIZATION = "Bearer local-r58-cumulative-proof";
const MANIFEST_PATH = resolve(
  ".release-runtime/p0-one-monolith-r58/evidence/12-representative/R58_REPRESENTATIVE_50_MANIFEST.json",
);
const BACKEND_LEDGER_PATH = resolve(
  ".release-runtime/p0-one-monolith-r58/evidence/06-backend/"
    + "BATCH001_008_BACKEND_ADMISSION_4272_REPRESENTATIVE50_99f178ca.jsonl",
);
const OUTPUT_ROOT = resolve(
  ".release-runtime/p0-one-monolith-r58/evidence/11-web-android/R58_ANDROID_API34_MATRIX_50_DIAGNOSTIC",
);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function git(args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000,
  }).trim();
}

function jsonl(path: string): Json[] {
  return readFileSync(path, "utf8").split(/\r?\n/u).filter(Boolean)
    .map((line) => JSON.parse(line) as Json);
}

function writeAtomic(path: string, body: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, body, "utf8");
  renameSync(temporary, path);
}

async function api(path: string, init: RequestInit = {}): Promise<Json> {
  const response = await fetch(`${API_ROOT}/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: AUTHORIZATION,
      ...(init.body == null ? {} : { "Content-Type": "application/json" }),
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.json().catch(() => null) as Json | null;
  if (!response.ok) {
    throw new Error(`R58_ANDROID_PARENT_HTTP_${response.status}:${path}:${JSON.stringify(body).slice(0, 2_000)}`);
  }
  return body ?? {};
}

async function mapConcurrent<T, U>(rows: readonly T[], concurrency: number,
  operation: (row: T, index: number) => Promise<U>): Promise<U[]> {
  const results = new Array<U>(rows.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, rows.length) }, async () => {
    while (cursor < rows.length) {
      const index = cursor++;
      results[index] = await operation(rows[index]!, index);
    }
  }));
  return results;
}

async function waitForJobs(client: Client, jobIds: readonly string[]): Promise<Map<string, Json>> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 300_000) {
    const rows = (await client.query(`
      select id::text,status,result_revision_id::text,error_code,error_detail
      from public.estimate_compile_job where id=any($1::uuid[])
    `, [jobIds])).rows as Json[];
    if (rows.length === jobIds.length
      && rows.every((row) => ["succeeded", "failed", "cancelled"].includes(String(row.status)))) {
      return new Map(rows.map((row) => [String(row.id), row]));
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error(`R58_ANDROID_PARENT_JOB_TIMEOUT:${jobIds.length}`);
}

async function main(): Promise<void> {
  invariant(sha256(readFileSync(SPEC_PATH)) === SPEC_SHA256, "R58_ANDROID_PARENT_SPEC_DRIFT");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === EXPECTED_BRANCH, `R58_ANDROID_PARENT_BRANCH_DRIFT:${branch}`);
  invariant(git(["status", "--porcelain=v1"]) === "", "R58_ANDROID_PARENT_DIRTY_WORKTREE");
  git(["merge-base", "--is-ancestor", BASE_COMMIT, head]);

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Json;
  const backend = jsonl(BACKEND_LEDGER_PATH);
  const catalogIds = (manifest.catalogIds ?? []).map(String) as string[];
  invariant(catalogIds.length === 50 && new Set(catalogIds).size === 50,
    `R58_ANDROID_PARENT_MANIFEST:${catalogIds.length}/${new Set(catalogIds).size}`);
  invariant(backend.length === 50 && backend.every((row) => row.status === "GREEN" && row.recalculate?.mutation),
    "R58_ANDROID_PARENT_BACKEND_INPUT_RED");
  const backendByCatalog = new Map(backend.map((row) => [String(row.catalogId), row]));
  invariant(catalogIds.every((catalogId) => backendByCatalog.has(catalogId)),
    "R58_ANDROID_PARENT_BACKEND_SET_DRIFT");

  const runtime = await api("runtime-manifest");
  invariant(runtime.sourceHead === head && runtime.sourceTree === tree
    && runtime.specSha256 === SPEC_SHA256 && runtime.workingDirectory === process.cwd(),
  `R58_ANDROID_PARENT_RUNTIME_DRIFT:${runtime.sourceHead}:${runtime.workingDirectory}`);

  const client = new Client({ connectionString: DATABASE_URL, application_name: "r58-android-parent50" });
  await client.connect();
  try {
    const residueBefore = Number((await client.query(`
      select (select count(*) from public.estimate_compile_job where target_release_id=$1)
        +(select count(*) from public.estimate_revision where release_id=$1) value
    `, [TARGET_RELEASE_ID])).rows[0]?.value ?? 0);
    invariant(residueBefore === 0, `R58_ANDROID_PARENT_RESIDUE_BEFORE:${residueBefore}`);
    const baselines = (await client.query(`
      select manifest.catalog_id,baseline.input_values
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_approved_template_baseline baseline
        on baseline.id=manifest.approved_template_baseline_id
      where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])
    `, [TARGET_RELEASE_ID, catalogIds])).rows as Json[];
    invariant(baselines.length === 50, `R58_ANDROID_PARENT_BASELINES:${baselines.length}/50`);
    const baselineByCatalog = new Map(baselines.map((row) => [String(row.catalog_id), row.input_values as Json]));

    const cases = await mapConcurrent(catalogIds, 6, async (catalogId, index) => {
      const backendRow = backendByCatalog.get(catalogId)!;
      const mutation = backendRow.recalculate.mutation as Json;
      const catalogResponse = await api(`catalog/${encodeURIComponent(catalogId)}`);
      const catalog = catalogResponse.item ?? catalogResponse;
      const parameter = (catalog.parameterSchema as Json[]).find((row) => row.parameterId === mutation.parameterId);
      invariant(parameter, `R58_ANDROID_PARENT_PARAMETER_MISSING:${catalogId}:${mutation.parameterId}`);
      invariant(Number.isSafeInteger(Number(parameter.ordinal)) && Number(parameter.ordinal) >= 0,
        `R58_ANDROID_PARENT_PARAMETER_ORDINAL:${catalogId}:${parameter.ordinal}`);
      invariant(String(parameter.titleRu ?? "").trim() && String(parameter.unitId ?? "").trim()
        && String(parameter.guide?.guideShortRu ?? "").trim(),
      `R58_ANDROID_PARENT_PARAMETER_PRESENTATION:${catalogId}:${parameter.parameterId}`);
      const parameters = baselineByCatalog.get(catalogId);
      invariant(parameters, `R58_ANDROID_PARENT_BASELINE_MISSING:${catalogId}`);
      const created = await api("jobs/compile", {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: `r58-android-parent-${sha256(`${head}:${catalogId}`).slice(0, 48)}`,
          catalogId,
          parentRevisionId: null,
          parameters,
          currencyCode: "KGS",
          priceSnapshotIds: [],
        }),
      });
      process.stdout.write(`[${new Date().toISOString()}] R58 Android parent ${index + 1}/50 ${catalogId}\n`);
      return {
        catalogId,
        mutation,
        parameter,
        parameterCount: Number((catalog.parameterSchema as Json[]).length),
        jobId: String(created.jobId),
      };
    });
    const jobs = await waitForJobs(client, cases.map((row) => row.jobId));
    const revisionIds = cases.map((row) => String(jobs.get(row.jobId)?.result_revision_id ?? "")).filter(Boolean);
    const revisions = revisionIds.length === 0 ? [] : (await client.query(`
      select id::text,release_id::text,catalog_id,status,row_count,checksum_sha256,compiler_owner
      from public.estimate_revision where id=any($1::uuid[])
    `, [revisionIds])).rows as Json[];
    const revisionById = new Map(revisions.map((row) => [String(row.id), row]));
    const outputRows = cases.map((row, index) => {
      const job = jobs.get(row.jobId);
      const revisionId = String(job?.result_revision_id ?? "");
      const revision = revisionById.get(revisionId);
      const failures: string[] = [];
      if (job?.status !== "succeeded") failures.push(`COMPILE_${job?.status ?? "missing"}:${job?.error_code ?? ""}`);
      if (!revision || revision.release_id !== TARGET_RELEASE_ID || revision.catalog_id !== row.catalogId
        || revision.status !== "ready" || Number(revision.row_count) <= 0 || revision.compiler_owner !== "backend") {
        failures.push("PARENT_REVISION_INVARIANT_RED");
      }
      return {
        ordinal: index + 1,
        catalog_id: row.catalogId,
        child_revision_id: revisionId,
        search_kind: index === 0 ? "fuzzy" : index === 3 ? "group" : "literal",
        search_query: index === 0 ? "lamenat" : index === 3 ? "asphalt" : row.catalogId,
        parameter_id: row.mutation.parameterId,
        parameter_ordinal: Number(row.parameter.ordinal),
        parameter_title_ru: row.parameter.titleRu,
        parameter_unit_id: row.parameter.unitId,
        guide_short_ru: row.parameter.guide.guideShortRu,
        parameter_count: row.parameterCount,
        baseline_value: row.mutation.baselineValue,
        changed_value: row.mutation.changedValue,
        compile_job_id: row.jobId,
        row_count: Number(revision?.row_count ?? 0),
        checksum_sha256: revision?.checksum_sha256 ?? null,
        failures,
        status: failures.length === 0 ? "GREEN" : "RED",
      };
    });
    const outputPath = resolve(OUTPUT_ROOT, "R58_ANDROID_PARENT_50_CASES.jsonl");
    writeAtomic(outputPath, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);
    const summary = {
      schemaVersion: "p0-one-monolith-r58-android-parent-50.v1",
      capturedAt: new Date().toISOString(), specSha256: SPEC_SHA256,
      source: { branch, head, tree, descendantOf691acb78: true },
      runtime, releaseId: TARGET_RELEASE_ID, expected: 50, executed: outputRows.length,
      green: outputRows.filter((row) => row.status === "GREEN").length,
      red: outputRows.filter((row) => row.status !== "GREEN").length,
      searchModes: {
        literal: outputRows.filter((row) => row.search_kind === "literal").length,
        fuzzy: outputRows.filter((row) => row.search_kind === "fuzzy").length,
        group: outputRows.filter((row) => row.search_kind === "group").length,
      },
      outputPath,
      status: outputRows.length === 50 && outputRows.every((row) => row.status === "GREEN") ? "GREEN" : "RED",
    };
    writeAtomic(resolve(OUTPUT_ROOT, "R58_ANDROID_PARENT_50_SUMMARY.json"), `${JSON.stringify(summary, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    if (summary.status !== "GREEN") process.exitCode = 1;
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
