import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Client } from "pg";

type Json = Record<string, any>;

const CONTRACT = "real-professional-estimates-r3.anchor-group-incident.v1";
const MASTER_SPEC_PATH = resolve("C:/Users/User/Downloads/MASTER_TZ_REAL_PROFESSIONAL_ESTIMATES_R3_RU.md");
const MASTER_SPEC_SHA256 = "af1ecdcba601536fb5e5bc8d81814eed34f302677ec1270dc3e172069989b29b";
const REVISION_ID = "21879f3c-78fe-45ef-8596-446c2cf61260";
const CATALOG_ID = "concrete_foundation_interior_anchor_group_pour_high_load";
const DEFECT_RELEASE_ID = "4c5affaf-5f63-5d04-b036-875c684f8c45";
const REMEDIATION_RELEASE_ID = "06e19aee-e921-5b66-8fc3-c441ab918d29";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const OUTPUT_PATH = resolve(
  ".release-runtime/real-professional-estimates-r3/evidence/00-baseline/ANCHOR_GROUP_21879F3C_INCIDENT.json",
);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256Buffer(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
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

async function main(): Promise<void> {
  invariant(sha256Buffer(readFileSync(MASTER_SPEC_PATH)) === MASTER_SPEC_SHA256, "R3_MASTER_SPEC_SHA256_DRIFT");
  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "batch001-008-r3-anchor-incident-readonly",
  });
  await client.connect();
  try {
    await client.query("begin transaction read only");
    const revision = (await client.query(`
      select revision.id::text,revision.parent_revision_id::text,revision.release_id::text,
        revision.catalog_id,revision.revision_number,revision.status,revision.row_count,
        revision.definition_version_id::text,revision.created_at,revision.canonical_work_title_ru,
        revision.display_title_ru,revision.primary_measure_parameter_id,
        revision.primary_measure_value,revision.primary_measure_unit_id,
        (select count(*)::integer from jsonb_object_keys(revision.input_parameters)) input_parameter_count,
        (select count(*)::integer from jsonb_object_keys(coalesce(revision.user_input_snapshot,'{}'::jsonb))) user_input_parameter_count,
        release.status release_status
      from public.estimate_revision revision
      join public.estimate_definition_release release on release.id=revision.release_id
      where revision.id=$1
    `, [REVISION_ID])).rows[0] as Json | undefined;
    invariant(revision, "R3_ANCHOR_INCIDENT_REVISION_MISSING");

    const decomposition = (await client.query(`select
      count(*)::integer total_rows,
      count(*) filter(where category='MATERIAL')::integer materials,
      count(*) filter(where category<>'MATERIAL')::integer displayed_as_works,
      count(*) filter(where row_id like '%:s13_%')::integer component_matrix_rows,
      count(*) filter(where row_id like '%:s13_%' and category='MATERIAL')::integer component_materials,
      count(*) filter(where row_id like '%:s13_%' and category<>'MATERIAL')::integer component_generic_actions,
      count(*) filter(where row_id like '%:s14_%')::integer qa_generic_actions,
      count(*) filter(where row_id not like '%:s13_%' and row_id not like '%:s14_%')::integer structure_matrix_rows,
      count(*) filter(where row_id not like '%:s13_%' and row_id not like '%:s14_%' and category='MATERIAL')::integer structure_materials,
      count(*) filter(where row_id not like '%:s13_%' and row_id not like '%:s14_%' and category<>'MATERIAL')::integer structure_generic_actions
      from public.estimate_revision_row where revision_id=$1`, [REVISION_ID])).rows[0] as Json;
    const categoryUnitCounts = (await client.query(`select category,unit_id,count(*)::integer row_count
      from public.estimate_revision_row where revision_id=$1
      group by category,unit_id order by category,unit_id`, [REVISION_ID])).rows as Json[];
    const sectionCounts = (await client.query(`select section,category,count(*)::integer row_count
      from public.estimate_revision_row where revision_id=$1
      group by section,category order by section,category`, [REVISION_ID])).rows as Json[];
    const manifest = (await client.query(`select manifest.release_id::text,release.status release_status,
      manifest.definition_version_id::text,manifest.publication_state,
      manifest.baseline_ready,manifest.scenario_ready
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_release release on release.id=manifest.release_id
      where manifest.catalog_id=$1 and manifest.release_id=any($2::uuid[])
      order by manifest.release_id`, [CATALOG_ID, [DEFECT_RELEASE_ID, REMEDIATION_RELEASE_ID]])).rows as Json[];
    await client.query("rollback");

    invariant(revision.release_id === DEFECT_RELEASE_ID && revision.release_status === "prepared",
      "R3_ANCHOR_INCIDENT_RELEASE_DRIFT");
    invariant(Number(revision.row_count) === 350 && Number(revision.user_input_parameter_count) === 0,
      "R3_ANCHOR_INCIDENT_REVISION_SHAPE_DRIFT");
    invariant(Number(decomposition.materials) === 33 && Number(decomposition.displayed_as_works) === 317,
      "R3_ANCHOR_INCIDENT_33_317_DRIFT");
    invariant(Number(decomposition.component_materials) === 18
      && Number(decomposition.component_generic_actions) === 72
      && Number(decomposition.qa_generic_actions) === 185
      && Number(decomposition.structure_materials) === 15
      && Number(decomposition.structure_generic_actions) === 60,
    "R3_ANCHOR_INCIDENT_CARTESIAN_DECOMPOSITION_DRIFT");
    invariant(manifest.some((row) => row.release_id === REMEDIATION_RELEASE_ID
      && row.baseline_ready === false && row.scenario_ready === false),
    "R3_ANCHOR_INCIDENT_REMEDIATION_QUARANTINE_DRIFT");

    const evidence = {
      schemaVersion: CONTRACT,
      generatedAt: new Date().toISOString(),
      databasePolicy: "READ_ONLY_TRANSACTION",
      masterSpec: { path: MASTER_SPEC_PATH.replaceAll("\\", "/"), sha256: MASTER_SPEC_SHA256, lineCount: 2_476 },
      incident: {
        logicalStatus: "LEGACY_CONTENT_QUARANTINED",
        reason: "CARTESIAN_GENERIC_RESOURCE_EXPANSION",
        revision,
        decomposition,
        mathematicalProof: {
          materials: "18 component terms + 15 unrelated structure terms = 33",
          works: "18 component terms * 4 + 37 QA/test terms * 5 + 15 unrelated structure terms * 4 = 317",
          total: "33 + 317 = 350",
        },
        categoryUnitCounts,
        sectionCounts,
        immutable: true,
        legacyReadOnly: true,
        newCompileAllowed: false,
        recalculateAllowed: false,
        confirmAllowed: false,
        newPdfAllowed: false,
        newProcurementAllowed: false,
      },
      admissionHistory: manifest,
      requiredRegression: { web: true, androidApi34: true, exactRequestRequired: true },
    };
    writeJsonAtomic(OUTPUT_PATH, { ...evidence, payloadSha256: sha256(evidence) });
    process.stdout.write(`${JSON.stringify({
      status: "GREEN_R3_WAVE0_ANCHOR_INCIDENT_CAPTURED",
      outputPath: OUTPUT_PATH,
      decomposition,
    })}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
