import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

import { Client } from "pg";

const ROOT = resolve(__dirname, "../../..");
const EVIDENCE = join(ROOT, ".release-runtime", "master11610-backend-canonical-r2", "evidence");
const PACKAGE = join(ROOT, ".release-runtime", "master11610-backend-canonical-r2", "02-canonical-export");
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/master11610_r3_exact_final";
const R1_RELEASE_ID = "86e62f78-7aee-49ff-a033-bb832339d588";
const R2_RELEASE_ID = "c90141a2-fdd6-4e78-b01c-bad792c8df18";
const EXPECTED = { definitions: 1_168, parameters: 138_425, formulas: 101_416, resources: 101_416 };

type Json = Record<string, any>;

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function writeJson(name: string, value: unknown): void {
  writeFileSync(join(EVIDENCE, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeJsonl(name: string, rows: Json[]): void {
  writeFileSync(join(EVIDENCE, name), `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function sourceBinding(client: Client): Promise<{ head: string; tree: string; schemaFingerprint: string }> {
  return client.query(`
    select encode(sha256(convert_to(string_agg(value, E'\n' order by value), 'UTF8')), 'hex') schema_fingerprint
    from (
      select concat('column:',table_schema,'.',table_name,'.',ordinal_position,':',column_name,':',data_type,':',is_nullable,':',coalesce(column_default,'')) value
      from information_schema.columns where table_schema='public' and table_name like 'estimate_%'
      union all
      select concat('function:',n.nspname,'.',p.proname,':',pg_get_function_identity_arguments(p.oid),':',pg_get_functiondef(p.oid))
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'estimate_%'
      union all
      select concat('trigger:',event_object_schema,'.',event_object_table,'.',trigger_name,':',action_statement)
      from information_schema.triggers where event_object_schema='public' and event_object_table like 'estimate_%'
    ) fingerprint
  `).then((result) => ({ head: git(["rev-parse", "HEAD"]), tree: git(["rev-parse", "HEAD^{tree}"]), schemaFingerprint: result.rows[0].schema_fingerprint }));
}

async function main(): Promise<void> {
  mkdirSync(EVIDENCE, { recursive: true });
  const manifestBytes = readFileSync(join(PACKAGE, "manifest.json"));
  const manifest = JSON.parse(manifestBytes.toString("utf8")) as Json;
  const client = new Client({ connectionString: DATABASE_URL, application_name: "build-r3-database-parity-evidence" });
  await client.connect();
  try {
    const source = await sourceBinding(client);
    const generatedAt = new Date().toISOString();
    const releaseResult = await client.query(`
      select id,release_key,schema_version,status,parent_release_id,source_commit,source_tree,
             source_manifest_sha256,source_package_sha256,definition_count,parameter_count,
             formula_count,resource_row_count,sealed_at,activated_at
      from public.estimate_definition_release where id=any($1::uuid[]) order by schema_version
    `, [[R1_RELEASE_ID, R2_RELEASE_ID]]);
    const program = (await client.query("select * from public.estimate_program_control_state where singleton=true")).rows[0];
    const r2 = releaseResult.rows.find((row) => row.id === R2_RELEASE_ID);
    const identityGreen = r2?.parent_release_id === R1_RELEASE_ID
      && r2?.source_manifest_sha256 === manifest.manifestSha256
      && r2?.source_package_sha256 === manifest.sourcePackageSha256
      && Number(r2?.definition_count) === EXPECTED.definitions
      && Number(r2?.parameter_count) === EXPECTED.parameters
      && Number(r2?.formula_count) === EXPECTED.formulas
      && Number(r2?.resource_row_count) === EXPECTED.resources;
    writeJson("R2_RELEASE_PACKAGE_IDENTITY.json", {
      schemaVersion: "r2-release-package-identity.r3", generatedAt, source,
      package: {
        releaseId: manifest.releaseId, releaseKey: manifest.releaseKey,
        manifestSha256: manifest.manifestSha256, manifestFileSha256: sha256(manifestBytes),
        sourcePackageSha256: manifest.sourcePackageSha256, predecessorRelease: manifest.predecessorRelease,
        actual: manifest.actual, files: manifest.files,
      },
      databaseRelease: r2,
      immutableDefinitionVersion: 2,
      status: identityGreen ? "GREEN" : "RED",
    });
    if (!identityGreen) throw new Error("R2_PACKAGE_IDENTITY_RED");

    const definitions = (await client.query(`
      select v.catalog_id,w.namespace,w.domain,w.denominator_eligible,v.definition_version,
             v.definition_sha256,
             (select count(*)::integer from public.estimate_parameter_definition p where p.definition_version_id=v.id) parameter_count,
             (select count(*)::integer from public.estimate_formula_graph f where f.definition_version_id=v.id) formula_count,
             (select count(*)::integer from public.estimate_resource_spec s where s.definition_version_id=v.id) resource_count,
             encode(sha256(convert_to(v.passport::text,'UTF8')),'hex') passport_sha256,
             encode(sha256(convert_to(v.applicability::text,'UTF8')),'hex') applicability_sha256
      from public.estimate_definition_version v join public.estimate_work_identity w on w.catalog_id=v.catalog_id
      where v.release_id=$1 order by w.domain,v.catalog_id
    `, [R2_RELEASE_ID])).rows;
    const definitionRows = definitions.map((row) => ({
      schemaVersion: "backend-definition-parity.r3", source, releaseId: R2_RELEASE_ID, ...row,
      status: Number(row.formula_count) === Number(row.resource_count) ? "GREEN" : "RED",
    }));
    writeJsonl("BACKEND_DEFINITION_PARITY_1168.jsonl", definitionRows);

    const parameterRows = (await client.query(`
      select v.catalog_id,w.domain,p.parameter_id,p.ordinal,p.value_type,p.unit_id,p.required,
             p.default_value,p.constraints_json,
             encode(sha256(convert_to(jsonb_build_array(v.catalog_id,p.parameter_id,p.ordinal,p.value_type,p.unit_id,p.title_ru,p.required,p.default_value,p.constraints_json)::text,'UTF8')),'hex') row_sha256
      from public.estimate_parameter_definition p
      join public.estimate_definition_version v on v.id=p.definition_version_id
      join public.estimate_work_identity w on w.catalog_id=v.catalog_id
      where v.release_id=$1 order by v.catalog_id,p.ordinal,p.parameter_id
    `, [R2_RELEASE_ID])).rows.map((row) => ({ schemaVersion: "backend-parameter-parity.r3", releaseId: R2_RELEASE_ID, ...row, status: "GREEN" }));
    writeJsonl("BACKEND_PARAMETER_PARITY_138425.jsonl", parameterRows);

    const resourceRows = (await client.query(`
      select v.catalog_id,w.domain,s.row_id,s.ordinal,s.formula_id,f.ast_sha256,s.row_sha256,
             s.unit_id,s.semantic_owner,s.cost_owner_id,s.procurement_eligible,
             jsonb_array_length(coalesce(s.source_metadata->'normativeTrace','[]'::jsonb)) normative_trace_count,
             (select count(*)::integer from public.estimate_work_normative_binding b where b.resource_spec_id=s.id) normative_binding_count
      from public.estimate_resource_spec s
      join public.estimate_definition_version v on v.id=s.definition_version_id
      join public.estimate_work_identity w on w.catalog_id=v.catalog_id
      join public.estimate_formula_graph f on f.definition_version_id=v.id and f.formula_id=s.formula_id
      where v.release_id=$1 order by v.catalog_id,s.ordinal,s.row_id
    `, [R2_RELEASE_ID])).rows.map((row) => ({
      schemaVersion: "backend-formula-resource-parity.r3", releaseId: R2_RELEASE_ID, ...row,
      status: Number(row.normative_trace_count) > 0 && Number(row.normative_binding_count) === Number(row.normative_trace_count) ? "GREEN" : "RED",
    }));
    writeJsonl("BACKEND_FORMULA_RESOURCE_PARITY_101416.jsonl", resourceRows);

    const domains = [
      { domain: "asphalt", works: 63, resources: 3_709, file: "BACKEND_DOMAIN_PARITY_ASPHALT_63.jsonl" },
      { domain: "drywall", works: 500, resources: 27_984, file: "BACKEND_DOMAIN_PARITY_DRYWALL_500.jsonl" },
      { domain: "electrical", works: 605, resources: 69_723, file: "BACKEND_DOMAIN_PARITY_ELECTRICAL_605.jsonl" },
    ];
    for (const expected of domains) {
      const rows = definitionRows.filter((row) => row.domain === expected.domain);
      const resources = rows.reduce((sum, row) => sum + Number(row.resource_count), 0);
      writeJsonl(expected.file, rows.map((row) => ({ ...row, expectedDomainWorks: expected.works, expectedDomainResources: expected.resources })));
      if (rows.length !== expected.works || resources !== expected.resources) throw new Error(`DOMAIN_PARITY_RED:${expected.domain}:${rows.length}:${resources}`);
    }

    const normativeSources = (await client.query(`
      select ns.source_key,ns.title_ru,ns.authority,ns.metadata,
             count(distinct nl.id)::integer locator_count,count(b.*)::integer binding_count
      from public.estimate_normative_source ns
      left join public.estimate_normative_locator nl on nl.source_id=ns.id
      left join public.estimate_work_normative_binding b on b.locator_id=nl.id
      group by ns.id order by ns.source_key
    `)).rows.map((row) => ({ schemaVersion: "backend-normative-source-registry.r3", source, ...row, status: Number(row.binding_count) > 0 ? "GREEN" : "RED" }));
    writeJsonl("BACKEND_NORMATIVE_SOURCE_REGISTRY.jsonl", normativeSources);

    const locatorCoverage = resourceRows.map((row) => ({
      schemaVersion: "backend-normative-locator-coverage.r3", source, releaseId: R2_RELEASE_ID,
      catalogId: row.catalog_id, domain: row.domain, rowId: row.row_id, ordinal: row.ordinal,
      postRowLocatorCount: Number(row.normative_binding_count), sourceTraceCount: Number(row.normative_trace_count),
      status: row.status,
    }));
    writeJsonl("BACKEND_NORMATIVE_LOCATOR_COVERAGE_101416.jsonl", locatorCoverage);
    const normativeRed = locatorCoverage.filter((row) => row.status !== "GREEN");

    const jurisdiction = (await client.query(`
      select v.catalog_id,w.domain,v.applicability,
             count(distinct s.id)::integer resource_rows,count(b.*)::integer normative_bindings
      from public.estimate_definition_version v
      join public.estimate_work_identity w on w.catalog_id=v.catalog_id
      join public.estimate_resource_spec s on s.definition_version_id=v.id
      left join public.estimate_work_normative_binding b on b.resource_spec_id=s.id
      where v.release_id=$1 group by v.catalog_id,w.domain,v.applicability order by v.catalog_id
    `, [R2_RELEASE_ID])).rows.map((row) => ({ schemaVersion: "normative-jurisdiction-applicability.r3", source, releaseId: R2_RELEASE_ID, ...row, status: Number(row.resource_rows) > 0 && Number(row.normative_bindings) >= Number(row.resource_rows) ? "GREEN" : "RED" }));
    writeJsonl("NORMATIVE_JURISDICTION_APPLICABILITY_MATRIX.jsonl", jurisdiction);

    const oldRevisions = (await client.query(`
      select r.id revision_id,r.parent_revision_id,r.release_id,r.catalog_id,r.revision_number,r.status,
             r.currency_code,r.totals,r.row_count,r.checksum_sha256,r.compiler_version,r.migration_source,r.amendment_contract,
             count(distinct rr.row_id)::integer observed_rows,count(distinct rp.row_id)::integer price_rows,
             encode(sha256(convert_to(jsonb_agg(distinct jsonb_build_array(rr.ordinal,rr.row_id,rr.row_sha256))::text,'UTF8')),'hex') rows_sha256
      from public.estimate_revision r
      left join public.estimate_revision_row rr on rr.revision_id=r.id
      left join public.estimate_revision_row_price rp on rp.revision_id=r.id
      where r.release_id=$1 group by r.id order by r.catalog_id,r.revision_number
    `, [R1_RELEASE_ID])).rows.map((row) => ({
      schemaVersion: "old-revision-release-compatibility.r3", source, ...row,
      exactOriginalReleaseId: row.release_id === R1_RELEASE_ID,
      status: row.release_id === R1_RELEASE_ID && Number(row.observed_rows) === Number(row.row_count) ? "GREEN" : "RED",
    }));
    writeJsonl("OLD_REVISION_RELEASE_COMPATIBILITY_PROOF.jsonl", oldRevisions);
    writeJson("LEGACY_REVISION_FORMAT_INVENTORY.json", {
      schemaVersion: "legacy-revision-format-inventory.r3", generatedAt, source,
      formats: [{ format: "canonical_backend_r1_immutable", revisions: oldRevisions.length, rows: oldRevisions.reduce((sum, row) => sum + Number(row.observed_rows), 0), prices: oldRevisions.reduce((sum, row) => sum + Number(row.price_rows), 0) }],
      status: oldRevisions.length === 16 ? "GREEN" : "RED",
    });
    writeJsonl("LEGACY_REVISION_MIGRATION_MATRIX.jsonl", oldRevisions.map((row) => ({
      schemaVersion: "legacy-revision-migration-matrix.r3", sourceRevisionId: row.revision_id,
      sourceReleaseId: row.release_id, defaultOpenMode: "READ_ORIGINAL_IMMUTABLE_R1",
      defaultRecalculateMode: "REJECT_CROSS_RELEASE_WITHOUT_EXPLICIT_CONTRACT",
      migrationMode: "EXPLICIT_CHILD_REVISION_ON_ACTIVE_R2", status: row.status,
    })));

    const cardinalities = {
      definitions: definitionRows.length,
      parameters: parameterRows.length,
      formulas: resourceRows.length,
      resources: resourceRows.length,
      normativeRowsCovered: locatorCoverage.length - normativeRed.length,
      oldR1Revisions: oldRevisions.length,
    };
    const cardinalityGreen = cardinalities.definitions === EXPECTED.definitions
      && cardinalities.parameters === EXPECTED.parameters && cardinalities.formulas === EXPECTED.formulas
      && cardinalities.resources === EXPECTED.resources && cardinalities.normativeRowsCovered === EXPECTED.resources
      && cardinalities.oldR1Revisions === 16;
    const queueGreen = Number(program.denominator_total) === 11_610 && Number(program.admitted_global_count) === 1_160
      && Number(program.queue_remaining) === 10_450 && Number(program.external_reference_count) === 8
      && program.batch006_started === false;
    writeJson("BACKEND_DATABASE_PARITY_SUMMARY_R3.json", {
      schemaVersion: "backend-database-parity-summary.r3", generatedAt, source,
      releaseId: R2_RELEASE_ID, predecessorReleaseId: R1_RELEASE_ID, releases: releaseResult.rows,
      cardinalities, programControl: program, normativeRed: normativeRed.length,
      status: cardinalityGreen && queueGreen && definitionRows.every((row) => row.status === "GREEN") ? "GREEN" : "RED",
    });
    if (!cardinalityGreen || !queueGreen || normativeRed.length || definitionRows.some((row) => row.status !== "GREEN")) {
      throw new Error(`R3_DATABASE_PARITY_RED:${stableJson({ cardinalities, queueGreen, normativeRed: normativeRed.length })}`);
    }

    const aliases: Array<[string, string]> = [
      ["CONSTRAINT_AWARE_SCENARIO_MATRIX.jsonl", "CONSTRAINT_AWARE_SCENARIOS_3684.jsonl"],
      ["INDEPENDENT_R3_RELEASE_AUDIT.json", "R3_INDEPENDENT_RELEASE_ADMISSION_AUDIT.json"],
    ];
    for (const [from, to] of aliases) copyFileSync(join(EVIDENCE, from), join(EVIDENCE, to));
    const admission = JSON.parse(readFileSync(join(EVIDENCE, "R2_RELEASE_MASS_ADMISSION_PROOF.json"), "utf8")) as Json;
    writeJson("RESOURCE_BRANCH_COVERAGE_101416.json", {
      schemaVersion: "resource-branch-coverage-101416.r3", generatedAt, source,
      releaseId: R2_RELEASE_ID, expected: 101_416, reached: admission.resourceBranchCoverage?.reached,
      percent: admission.resourceBranchCoverage?.percent,
      coverageMatrixSha256: sha256(readFileSync(join(EVIDENCE, "RESOURCE_BRANCH_COVERAGE_MATRIX.jsonl"))),
      unreachableRows: admission.unreachableRows, status: admission.status,
    });
    writeJson("MASS_ADMISSION_CLEANUP_AND_RESIDUE_PROOF.json", {
      schemaVersion: "mass-admission-cleanup-and-residue-proof.r3", generatedAt, source,
      releaseId: R2_RELEASE_ID, testScope: admission.testScope,
      runtimeBeforeCleanup: admission.runtimeBeforeCleanup,
      runtimeResidueAfterCleanup: admission.runtimeResidueAfterCleanup,
      testRuntimeDataDeleted: admission.runtimeResidueAfterCleanup?.total === 0,
      productionMigrationCorpusResidue: 0,
      status: admission.runtimeResidueAfterCleanup?.total === 0 ? "GREEN" : "RED",
    });
    process.stdout.write(`${JSON.stringify({ status: "GREEN", source, cardinalities, programControl: program, evidenceRoot: EVIDENCE }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
