import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const SPEC_PATH = resolve(
  "C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (10).md",
);
const SPEC_SHA256 = "4cf42813e8a94816867ec62e63909fe0624a12d6955f598599deb0a92338e318";
const BASE_COMMIT = "691acb78d55c38ef447a4d91c0bc798992e58dbc";
const ACTIVE_RELEASE_ID = "da29dc2b-1384-5487-b8da-6ee93f4e514e";
const CANDIDATE_RELEASE_KEY = "p0-r58-cumulative-candidate-4cf42813";
const CONTRACT = "p0-one-monolith-r58-water-backend-candidates-874.v1";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const R57_ROOT = resolve(".release-runtime/p0-one-monolith-r57/evidence/05-baseline");
const MATRIX_PATH = resolve(
  ".release-runtime/p0-one-monolith-r58/evidence/05-baseline/R58_4272_REPAIR_MATRIX.jsonl",
);
const ASSETS_PATH = resolve(R57_ROOT, "ACCEPTED_RUNTIME_TRACE_BASELINE_CANDIDATE_ASSETS.jsonl");
const VALIDATION_SUMMARY_PATH = resolve(R57_ROOT, "ACCEPTED_RUNTIME_TRACE_BASELINE_VALIDATION_SUMMARY.json");
const OUTPUT_ROOT = resolve(".release-runtime/p0-one-monolith-r58/evidence/05-baseline");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const object = value as Json;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stable(object[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(Buffer.isBuffer(value) ? value : stable(value)).digest("hex");
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function deterministicUuid(seed: string): string {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), "hex");
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function git(args: readonly string[]): string {
  return execFileSync("git", [...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

function readJsonl(path: string): Json[] {
  return readFileSync(path, "utf8").split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as Json);
}

function guide(titleRu: unknown, catalogId: string): string {
  const title = String(titleRu ?? "").trim();
  invariant(title.length > 0 && !title.includes("�"), `R58_WATER_874_TITLE_INVALID:${catalogId}`);
  return `Предварительное значение «${title}» принято из проверенного сценария работы. Уточните его по проекту, обмеру или утверждённой технологической документации; уточнение создаст новую точную revision.`;
}

async function insertBaseline(client: Client, asset: Json): Promise<void> {
  await client.query(`insert into public.estimate_approved_template_baseline(
    id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,
    parameter_schema_sha256,input_values,input_classification,uom_by_parameter,formula_consumer_ids,
    resource_consumer_row_ids,normative_source_ids,guide_provenance_ru,proposal_source_refs,
    validation_scenario_refs,acceptance_evidence_sha256,accepted_release_id,accepted_at,
    supersedes_baseline_id,contract_version
  ) values($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,
    $13::jsonb,$14::jsonb,$15::jsonb,$16,$17,now(),$18,$19)`, [
    asset.id, asset.baseline_key, asset.catalog_id, asset.definition_version_id,
    asset.source_definition_version_id, asset.parameter_schema_sha256,
    JSON.stringify(asset.input_values), JSON.stringify(asset.input_classification),
    JSON.stringify(asset.uom_by_parameter), JSON.stringify(asset.formula_consumer_ids),
    JSON.stringify(asset.resource_consumer_row_ids), JSON.stringify(asset.normative_source_ids),
    JSON.stringify(asset.guide_provenance_ru), JSON.stringify(asset.proposal_source_refs),
    JSON.stringify(asset.validation_scenario_refs), asset.acceptance_evidence_sha256,
    asset.accepted_release_id, asset.supersedes_baseline_id, asset.contract_version,
  ]);
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  invariant(process.argv.length === 2 || (process.argv.length === 3 && apply),
    "R58_WATER_874_USAGE_ONLY_OPTIONAL_APPLY");
  invariant(sha256File(SPEC_PATH) === SPEC_SHA256, "R58_WATER_874_SPEC_DRIFT");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === "codex/p0-one-monolith-r5", `R58_WATER_874_BRANCH_DRIFT:${branch}`);
  invariant(git(["status", "--porcelain=v1"]) === "", "R58_WATER_874_REQUIRES_CLEAN_HEAD");
  git(["merge-base", "--is-ancestor", BASE_COMMIT, head]);

  const targets = readJsonl(MATRIX_PATH).filter((row) => row.partition === "COMPILE_RED_937"
    && row.domain === "water_supply_sewerage");
  invariant(targets.length === 874 && new Set(targets.map((row) => row.catalog_id)).size === 874,
    `R58_WATER_874_TARGETS:${targets.length}/874`);
  const targetByCatalog = new Map(targets.map((row) => [String(row.catalog_id), row]));
  const freshValidation = readJson(VALIDATION_SUMMARY_PATH);
  invariant(freshValidation.head === head && freshValidation.green_candidate_assets === 1_479
    && freshValidation.domains?.find((row: Json) => row.domain === "water_supply_sewerage")?.green_assets === 874,
  "R58_WATER_874_FRESH_VALIDATION_DRIFT");
  const sourceAssets = readJsonl(ASSETS_PATH).filter((row) => targetByCatalog.has(String(row.catalog_id)));
  invariant(sourceAssets.length === 874, `R58_WATER_874_ASSETS:${sourceAssets.length}/874`);

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: apply ? "r58-water-874-apply" : "r58-water-874-dry-run",
  });
  await client.connect();
  const ledger: Json[] = [];
  let candidateReleaseId = "";
  let idempotent = false;
  try {
    await client.query("begin");
    await client.query("set local lock_timeout='5s'");
    await client.query("set local statement_timeout='45s'");
    const candidate = (await client.query(
      "select * from public.estimate_definition_release where release_key=$1 for update",
      [CANDIDATE_RELEASE_KEY],
    )).rows[0] as Json | undefined;
    invariant(candidate?.status === "draft" && candidate.sealed_at == null,
      "R58_WATER_874_DRAFT_CANDIDATE_MISSING");
    candidateReleaseId = candidate.id;
    const manifests = (await client.query(`
      select manifest.*,
        encode(extensions.digest(convert_to(coalesce(string_agg(
          jsonb_build_array(parameter.parameter_id,parameter.ordinal,parameter.value_type,parameter.unit_id,
            parameter.title_ru,parameter.required,parameter.default_value,parameter.constraints_json,
            parameter.truth_metadata)::text,E'\n' order by parameter.ordinal,parameter.parameter_id
        ),''),'UTF8'),'sha256'),'hex') parameter_schema_sha256
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_parameter_definition parameter on parameter.definition_version_id=manifest.definition_version_id
      where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])
      group by manifest.release_id,manifest.catalog_id,manifest.definition_version_id,manifest.source_batch,
        manifest.source_release_id,manifest.domain_id,manifest.publication_state,
        manifest.approved_template_baseline_id,manifest.baseline_ready,manifest.scenario_ready,
        manifest.definition_hash,manifest.entry_sha256,manifest.created_at
      order by manifest.catalog_id
    `, [candidateReleaseId, [...targetByCatalog.keys()]])).rows as Json[];
    invariant(manifests.length === 874, `R58_WATER_874_MANIFESTS:${manifests.length}/874`);
    const alreadyReady = manifests.filter((row) => row.baseline_ready && row.scenario_ready
      && row.approved_template_baseline_id != null);
    if (alreadyReady.length > 0) {
      invariant(alreadyReady.length === 874, `R58_WATER_874_PARTIAL_IDEMPOTENCY:${alreadyReady.length}/874`);
      const count = Number((await client.query(
        "select count(*)::int value from public.estimate_approved_template_baseline where accepted_release_id=$1 and catalog_id=any($2::text[])",
        [candidateReleaseId, [...targetByCatalog.keys()]],
      )).rows[0]?.value ?? -1);
      invariant(count === 874, `R58_WATER_874_IDEMPOTENCY_BASELINES:${count}/874`);
      idempotent = true;
      await client.query("rollback");
    } else {
      invariant(manifests.every((row) => !row.baseline_ready && !row.scenario_ready
        && row.approved_template_baseline_id == null && row.domain_id === "water_supply_sewerage"
        && row.publication_state === "ACCEPTED_INHERITED"),
      "R58_WATER_874_MANIFEST_PRECONDITION");
      const manifestByCatalog = new Map(manifests.map((row) => [String(row.catalog_id), row]));
      const titleRows = (await client.query(`
        select definition_version_id,parameter_id,title_ru
        from public.estimate_parameter_definition where definition_version_id=any($1::uuid[])
      `, [sourceAssets.map((asset) => String(asset.definition_version_id))])).rows as Json[];
      const titles = new Map(titleRows.map((row) => [
        `${row.definition_version_id}:${row.parameter_id}`, String(row.title_ru),
      ]));

      for (const source of sourceAssets.sort((a, b) => String(a.catalog_id).localeCompare(String(b.catalog_id)))) {
        const manifest = manifestByCatalog.get(String(source.catalog_id));
        invariant(manifest, `R58_WATER_874_MANIFEST_MISSING:${source.catalog_id}`);
        invariant(manifest.definition_version_id === source.definition_version_id,
          `R58_WATER_874_DEFINITION_DRIFT:${source.catalog_id}`);
        invariant(manifest.parameter_schema_sha256 === source.parameter_schema_sha256,
          `R58_WATER_874_SCHEMA_DRIFT:${source.catalog_id}`);
        const parameterIds = Object.keys(source.input_values).sort();
        invariant(parameterIds.length > 0
          && stable(parameterIds) === stable(Object.keys(source.input_classification).sort())
          && stable(parameterIds) === stable(Object.keys(source.uom_by_parameter).sort())
          && stable(parameterIds) === stable(Object.keys(source.formula_consumer_ids).sort())
          && stable(parameterIds) === stable(Object.keys(source.resource_consumer_row_ids).sort())
          && stable(parameterIds) === stable(Object.keys(source.normative_source_ids).sort()),
        `R58_WATER_874_BASELINE_PAYLOAD_KEYS:${source.catalog_id}`);
        const guides: Json = {};
        for (const parameterId of parameterIds) {
          const title = titles.get(`${source.definition_version_id}:${parameterId}`);
          invariant(title, `R58_WATER_874_TITLE_MISSING:${source.catalog_id}:${parameterId}`);
          guides[parameterId] = guide(title, source.catalog_id);
        }
        const acceptanceEvidenceSha256 = sha256({
          contract: CONTRACT,
          priorAcceptanceEvidenceSha256: source.acceptance_evidence_sha256,
          freshAssetsSha256: freshValidation.assets_sha256,
          freshLedgerSha256: freshValidation.ledger_sha256,
          catalogId: source.catalog_id,
          definitionVersionId: source.definition_version_id,
          parameterSchemaSha256: source.parameter_schema_sha256,
          guideProvenanceSha256: sha256(guides),
          head,
        });
        const id = deterministicUuid(`${CONTRACT}:${candidateReleaseId}:${source.definition_version_id}:${acceptanceEvidenceSha256}`);
        const asset = {
          ...source,
          id,
          baseline_key: `r58-water-backend-candidate:${source.catalog_id}:${id}`,
          guide_provenance_ru: guides,
          proposal_source_refs: [...source.proposal_source_refs, {
            kind: "R58_CURRENT_HEAD_REVALIDATION",
            head,
            assetsSha256: freshValidation.assets_sha256,
            ledgerSha256: freshValidation.ledger_sha256,
          }],
          validation_scenario_refs: [...source.validation_scenario_refs, {
            kind: "R58_READY_FOR_FRESH_BACKEND_COMPILE_RECALCULATE",
            head,
            guideMojibakeRows: 0,
            terminalGreenClaimed: false,
          }],
          acceptance_evidence_sha256: acceptanceEvidenceSha256,
          accepted_release_id: candidateReleaseId,
          accepted_at: null,
        };
        await insertBaseline(client, asset);
        await client.query(`update public.estimate_cumulative_manifest_entry set
          approved_template_baseline_id=$3,baseline_ready=true,scenario_ready=true,
          entry_sha256=$4 where release_id=$1 and catalog_id=$2`, [
          candidateReleaseId, source.catalog_id, id,
          sha256({ contract: CONTRACT, catalogId: source.catalog_id,
            definitionVersionId: source.definition_version_id, baselineId: id }),
        ]);
        ledger.push({
          catalogId: source.catalog_id,
          domain: "water_supply_sewerage",
          definitionVersionId: source.definition_version_id,
          baselineId: id,
          parameters: parameterIds.length,
          compiledRows: source.validation_scenario_refs[0]?.rowCount,
          priorAcceptanceEvidenceSha256: source.acceptance_evidence_sha256,
          acceptanceEvidenceSha256,
          guideProvenanceSha256: sha256(guides),
          guideMojibakeRows: 0,
          freshValidationHead: freshValidation.head,
          terminalGreenClaimed: false,
          status: "READY_FOR_FRESH_BACKEND_COMPILE_RECALCULATE",
        });
      }
      invariant(ledger.length === 874
        && ledger.reduce((sum, row) => sum + Number(row.compiledRows ?? 0), 0) === 121_594,
      `R58_WATER_874_LEDGER_DENOMINATOR:${ledger.length}/874`);
      const counts = (await client.query(`
        select
          count(*) filter(where baseline_ready and scenario_ready and approved_template_baseline_id is not null)::int ready,
          count(*) filter(where domain_id='water_supply_sewerage' and baseline_ready and scenario_ready)::int water_ready,
          count(*) filter(where upper(source_batch) like 'BATCH009%')::int batch009_rows
        from public.estimate_cumulative_manifest_entry where release_id=$1
      `, [candidateReleaseId])).rows[0] as Json;
      invariant(counts.ready === 1_491 && counts.water_ready === 874 && counts.batch009_rows === 0,
        `R58_WATER_874_COUNTS:${stable(counts)}`);
      invariant(Number((await client.query(
        "select count(*)::int value from public.estimate_definition_release where status='active' and id=$1",
        [ACTIVE_RELEASE_ID],
      )).rows[0]?.value ?? 0) === 1, "R58_WATER_874_ACTIVE_RELEASE_CHANGED");
      await client.query(`update public.estimate_definition_release set
        source_commit=$2,source_tree=$3,source_package_sha256=$4,
        metadata=metadata||$5::jsonb where id=$1 and status='draft' and sealed_at is null`, [
        candidateReleaseId, head, tree,
        sha256({ contract: CONTRACT, head, tree, ledgerSha256: sha256(ledger) }),
        JSON.stringify({ r58WaterBackendCandidates874: {
          contract: CONTRACT, specSha256: SPEC_SHA256, readyForBackend: 874,
          terminalGreenClaimed: false, searchCutover: false, runtime8081Switched: false,
        } }),
      ]);
      await client.query(apply ? "commit" : "rollback");
    }
  } catch (error) {
    try { await client.query("rollback"); } catch { /* connection may already be aborted */ }
    throw error;
  } finally {
    await client.end();
  }

  const ledgerText = ledger.map((row) => stable(row)).join("\n") + (ledger.length > 0 ? "\n" : "");
  const ledgerPath = resolve(OUTPUT_ROOT, apply
    ? "R58_WATER_BACKEND_CANDIDATES_874_APPLY.jsonl"
    : "R58_WATER_BACKEND_CANDIDATES_874_DRY_RUN.jsonl");
  const summary = {
    schemaVersion: CONTRACT,
    capturedAt: new Date().toISOString(),
    specSha256: SPEC_SHA256,
    mode: idempotent ? "IDEMPOTENCY_NO_WRITE" : apply ? "APPLY" : "DRY_RUN_ROLLBACK",
    source: { branch, head, tree },
    candidateReleaseId,
    targets: 874,
    baselinesChanged: idempotent ? 0 : ledger.length,
    compiledRowsValidated: idempotent ? 121_594 : ledger.reduce((sum, row) => sum + Number(row.compiledRows ?? 0), 0),
    freshValidation: {
      head: freshValidation.head,
      assetsSha256: freshValidation.assets_sha256,
      ledgerSha256: freshValidation.ledger_sha256,
      waterGreen: 874,
    },
    ledgerPath: idempotent ? null : ledgerPath,
    ledgerSha256: idempotent ? null : sha256(ledgerText),
    readyForBackendGate: true,
    terminalGreenClaimed: false,
    activeReleaseSwitched: false,
    searchCutover: false,
    runtime8081Switched: false,
    batch009Activated: false,
    status: idempotent
      ? "GREEN_R58_WATER_BACKEND_CANDIDATES_874_IDEMPOTENT_0"
      : apply
        ? "GREEN_R58_WATER_BACKEND_CANDIDATES_874_874_APPLIED_NOT_TERMINAL"
        : "GREEN_R58_WATER_BACKEND_CANDIDATES_874_874_DRY_RUN_ROLLED_BACK",
  };
  const summaryPath = resolve(OUTPUT_ROOT, idempotent
    ? "R58_WATER_BACKEND_CANDIDATES_874_IDEMPOTENCY.json"
    : apply
      ? "R58_WATER_BACKEND_CANDIDATES_874_APPLY.json"
      : "R58_WATER_BACKEND_CANDIDATES_874_DRY_RUN.json");
  mkdirSync(dirname(summaryPath), { recursive: true });
  if (!idempotent) writeFileSync(ledgerPath, ledgerText, "utf8");
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    status: summary.status,
    mode: summary.mode,
    targets: summary.targets,
    baselinesChanged: summary.baselinesChanged,
    compiledRowsValidated: summary.compiledRowsValidated,
    candidateReleaseId,
    evidencePath: summaryPath,
  }, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
