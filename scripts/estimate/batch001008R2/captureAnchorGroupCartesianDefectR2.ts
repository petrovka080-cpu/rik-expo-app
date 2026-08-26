import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Client } from "pg";

type Json = Record<string, any>;

const CONTRACT = "real-professional-estimates-r2.anchor-group-cartesian-defect.v1";
const MASTER_SPEC_PATH = resolve("C:/Users/User/Downloads/MASTER_TZ_REAL_PROFESSIONAL_ESTIMATES_R1_RU (1).md");
const MASTER_SPEC_SHA256 = "b9373689e495a8d7e0883818371022eb792800baf10d19340f50c1aace08d986";
const P0_ADDENDUM_PATH = resolve("C:/Users/User/.codex/attachments/b3bfbf27-8810-4a6d-b051-b0fe921049c8/pasted-text.txt");
const P0_ADDENDUM_SHA256 = "f611ee25cda915f89bb1d6d750f6fc60828e0be2d38aa129814075303af5c8a9";
const REVISION_ID = "21879f3c-78fe-45ef-8596-446c2cf61260";
const CATALOG_ID = "concrete_foundation_interior_anchor_group_pour_high_load";
const DEFECT_RELEASE_ID = "4c5affaf-5f63-5d04-b036-875c684f8c45";
const REMEDIATION_RELEASE_ID = "06e19aee-e921-5b66-8fc3-c441ab918d29";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const ROOT = resolve(".release-runtime/real-professional-estimates-r2");
const AUTHORITATIVE_AUDIT_PATH = resolve(ROOT, "evidence/02-static-audit/batch001_008_content_audit.jsonl");
const OUTPUT_PATH = resolve(ROOT, "evidence/02-static-audit/ANCHOR_GROUP_CARTESIAN_DEFECT.json");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256Buffer(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(path: string): string {
  return sha256Buffer(readFileSync(path));
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function sha256(value: unknown): string {
  return sha256Buffer(Buffer.from(JSON.stringify(stable(value)), "utf8"));
}

function writeJsonAtomic(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function readAuthoritativeAuditRow(): Json {
  const row = readFileSync(AUTHORITATIVE_AUDIT_PATH, "utf8")
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Json)
    .find((candidate) => candidate.catalogId === CATALOG_ID);
  invariant(row, "ANCHOR_GROUP_NOT_FOUND_IN_R2_AUDIT");
  return row;
}

async function main(): Promise<void> {
  invariant(sha256File(MASTER_SPEC_PATH) === MASTER_SPEC_SHA256, "R2_MASTER_SPEC_SHA256_DRIFT");
  invariant(sha256File(P0_ADDENDUM_PATH) === P0_ADDENDUM_SHA256, "P0_ADDENDUM_SHA256_DRIFT");
  const audit = readAuthoritativeAuditRow();

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "anchor-group-cartesian-defect-r2-readonly",
  });
  await client.connect();
  try {
    await client.query("begin transaction read only");
    const revision = (await client.query(`
      select r.id::text,r.parent_revision_id::text,r.release_id::text,r.catalog_id,r.revision_number,
        r.status,(select count(*)::integer from jsonb_object_keys(r.input_parameters)) input_parameter_count,
        (select count(*)::integer from jsonb_object_keys(coalesce(r.user_input_snapshot,'{}'::jsonb))) user_input_parameter_count,
        (select count(*)::integer from jsonb_object_keys(coalesce(r.accepted_baseline_snapshot,'{}'::jsonb))) accepted_baseline_parameter_count,
        (select count(*)::integer from jsonb_object_keys(coalesce(r.assumption_snapshot,'{}'::jsonb))) assumption_parameter_count,
        encode(extensions.digest(convert_to(r.input_parameters::text,'UTF8'),'sha256'),'hex') input_parameters_sha256,
        r.row_count,r.definition_version_id::text,r.created_at,
        r.canonical_work_title_ru,r.display_title_ru,r.primary_measure_parameter_id,
        r.primary_measure_value,r.primary_measure_unit_id,release.status release_status
      from public.estimate_revision r
      join public.estimate_definition_release release on release.id=r.release_id
      where r.id=$1
    `, [REVISION_ID])).rows[0] as Json | undefined;
    invariant(revision, "DEFECT_REVISION_NOT_FOUND");

    const rowGroups = (await client.query(`
      select category,unit_id,count(*)::integer row_count,
        count(*) filter(where included_in_estimate)::integer included_in_estimate_count,
        count(*) filter(where included_in_procurement)::integer included_in_procurement_count
      from public.estimate_revision_row where revision_id=$1
      group by category,unit_id order by category,unit_id
    `, [REVISION_ID])).rows as Json[];
    const samples = (await client.query(`
      select ordinal,row_id,section,category,title_ru,unit_id,quantity::text,
        procurement_eligible,included_in_estimate,included_in_procurement
      from public.estimate_revision_row where revision_id=$1
      order by ordinal limit 40
    `, [REVISION_ID])).rows as Json[];
    const manifest = (await client.query(`
      select m.release_id::text,m.catalog_id,m.definition_version_id::text,m.source_batch,
        m.publication_state,m.baseline_ready,m.scenario_ready,r.status release_status
      from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_release r on r.id=m.release_id
      where m.catalog_id=$1 and m.release_id=any($2::uuid[])
      order by m.release_id
    `, [CATALOG_ID, [DEFECT_RELEASE_ID, REMEDIATION_RELEASE_ID]])).rows as Json[];
    const searchDocuments = (await client.query(`
      select d.search_release_id::text,r.status search_release_status,d.catalog_id,
        d.definition_release_id::text,d.definition_version_id::text,d.publication_state,
        d.adjudication_class,d.selectable
      from public.estimate_search_document d
      join public.estimate_search_index_release r on r.id=d.search_release_id
      where d.catalog_id=$1 order by r.created_at,d.search_release_id
    `, [CATALOG_ID])).rows as Json[];
    await client.query("rollback");

    invariant(revision.catalog_id === CATALOG_ID, "DEFECT_REVISION_CATALOG_DRIFT");
    invariant(revision.release_id === DEFECT_RELEASE_ID, "DEFECT_REVISION_RELEASE_DRIFT");
    invariant(revision.release_status === "prepared", "DEFECT_RELEASE_NOT_PREPARED");
    invariant(Number(revision.row_count) === 350, "DEFECT_REVISION_ROW_COUNT_DRIFT");
    invariant(audit.classification === "QUARANTINE", "DEFECT_AUDIT_CLASSIFICATION_DRIFT");
    invariant(Number(audit.existingValidRows) === 18, "DEFECT_AUDIT_VALID_ROW_COUNT_DRIFT");
    invariant(Number(audit.noiseRows) === 332, "DEFECT_AUDIT_NOISE_ROW_COUNT_DRIFT");
    invariant(manifest.some((row) => row.release_id === DEFECT_RELEASE_ID
      && row.baseline_ready === true && row.scenario_ready === true), "DEFECT_RELEASE_WAS_NOT_ADMITTED");
    invariant(manifest.some((row) => row.release_id === REMEDIATION_RELEASE_ID
      && row.baseline_ready === false && row.scenario_ready === false), "REMEDIATION_QUARANTINE_DRIFT");

    const proof = {
      schemaVersion: CONTRACT,
      generatedAt: new Date().toISOString(),
      writePolicy: "READ_ONLY_DATABASE_TRANSACTION; EVIDENCE_FILE_ONLY",
      contracts: {
        masterSpec: { path: MASTER_SPEC_PATH, sha256: MASTER_SPEC_SHA256 },
        p0Addendum: { path: P0_ADDENDUM_PATH, sha256: P0_ADDENDUM_SHA256 },
      },
      defect: {
        disposition: "QUARANTINED_LEGACY_REPRODUCTION",
        selectable: false,
        confirmAllowed: false,
        procurementAllowed: false,
        publishAllowed: false,
        reasonCode: "CARTESIAN_RESOURCE_DICTIONARY_NOT_A_PROFESSIONAL_ESTIMATE",
        revision,
        rowGroups,
        rowSamples: samples,
        authoritativeAudit: {
          classification: audit.classification,
          finalStatus: audit.finalStatus,
          existingValidRows: audit.existingValidRows,
          noiseRows: audit.noiseRows,
          contentDefects: audit.contentDefects,
          parameterDefects: audit.parameterDefects,
          missingCapabilities: audit.missingCapabilities,
        },
      },
      runtimeAdmissionRootCause: {
        defectReleaseId: DEFECT_RELEASE_ID,
        manifests: manifest,
        searchDocuments,
        finding: "A prepared release and a falsely ready cumulative manifest were usable by the local user runtime.",
      },
      remediationInvariant: {
        releaseId: REMEDIATION_RELEASE_ID,
        catalogId: CATALOG_ID,
        baselineReady: false,
        scenarioReady: false,
        immutableLegacyRevisionPreserved: true,
      },
    };
    writeJsonAtomic(OUTPUT_PATH, { ...proof, payloadSha256: sha256(proof) });
    process.stdout.write(`${JSON.stringify({
      status: "DEFECT_CAPTURED",
      outputPath: OUTPUT_PATH,
      revisionId: REVISION_ID,
      rowCount: Number(revision.row_count),
      validRows: Number(audit.existingValidRows),
      noiseRows: Number(audit.noiseRows),
    })}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
