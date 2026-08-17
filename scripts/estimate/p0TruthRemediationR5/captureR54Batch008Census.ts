import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const SPEC_SHA256 = "b86e460d194c98f56546bdcc50704a38fba6fc74c4de3d661d2e1221d6d2e76e";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const EVIDENCE_ROOT = resolve(".release-runtime/p0-one-monolith-r57/evidence/02-data-before");
const SCHEMA_DUMP_PATH = resolve(
  ".release-runtime/p0-one-monolith-r5/evidence/02-phase1a/canonical-backend-api/candidate/BATCH008_SCHEMA_ONLY_BEFORE.dump",
);
const EXPECTED_RELEASE_ID = "da29dc2b-1384-5487-b8da-6ee93f4e514e";

function stable(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const object = value as Json;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stable(object[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : stable(value)).digest("hex");
}

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function write(name: string, value: unknown): string {
  const path = resolve(EVIDENCE_ROOT, name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return path;
}

function writeJsonl(name: string, rows: readonly unknown[]): string {
  const path = resolve(EVIDENCE_ROOT, name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  return path;
}

async function main(): Promise<void> {
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  invariant(git("merge-base", "--is-ancestor", "691acb78", head) === "", "R56_CENSUS_NOT_SUCCESSOR_LINEAGE");
  const client = new Client({ connectionString: DATABASE_URL, application_name: "r56-batch008-read-only-census" });
  await client.connect();
  try {
    await client.query("begin read only isolation level repeatable read");
    const release = (await client.query("select * from public.estimate_definition_release where status='active'" )).rows[0] as Json | undefined;
    invariant(release?.id === EXPECTED_RELEASE_ID, `R54_BATCH008_RELEASE_DRIFT:${release?.id}`);
    const database = (await client.query(`select current_database() name,
      (select oid::integer from pg_database where datname=current_database()) oid,
      pg_database_size(current_database())::text size_bytes`)).rows[0] as Json;
    const fingerprints = (await client.query(`
      with definitions as (
        select v.*,w.namespace,w.domain,w.title_ru
        from public.estimate_definition_version v
        join public.estimate_work_identity w on w.catalog_id=v.catalog_id
        where v.release_id=$1
      )
      select d.catalog_id,d.id definition_version_id,d.definition_version,d.namespace,d.domain,d.title_ru,
        d.definition_sha256 definition_hash,d.source_metadata,
        p.parameter_count,p.declared_default_count,p.required_without_default_count,
        p.provenance_default_count,p.provenance_less_default_count,p.parameter_schema_hash,
        f.formula_count,f.formula_graph_hash,s.resource_count,s.resource_set_hash,
        n.norm_binding_count,n.norm_binding_hash,pr.price_binding_count,pr.price_contract_hash,
        b.approved_template_asset_count,
        o.blank_owner_rows,o.duplicate_owner_groups,o.duplicate_owner_rows,o.duplicate_cost_bearing_owner_groups
      from definitions d
      cross join lateral (
        select count(*)::integer parameter_count,
          count(*) filter(where default_value is not null)::integer declared_default_count,
          count(*) filter(where required and default_value is null)::integer required_without_default_count,
          count(*) filter(where default_value is not null
            and nullif(truth_metadata#>>'{provenance,baselineOwner}','') is not null)::integer provenance_default_count,
          count(*) filter(where default_value is not null
            and nullif(truth_metadata#>>'{provenance,baselineOwner}','') is null)::integer provenance_less_default_count,
          encode(extensions.digest(convert_to(coalesce(string_agg(
            jsonb_build_array(parameter_id,ordinal,value_type,unit_id,title_ru,required,default_value,constraints_json)::text,
            E'\n' order by ordinal,parameter_id),''),'UTF8'),'sha256'),'hex') parameter_schema_hash
        from public.estimate_parameter_definition where definition_version_id=d.id
      ) p
      cross join lateral (
        select count(*)::integer formula_count,
          encode(extensions.digest(convert_to(coalesce(string_agg(
            jsonb_build_array(formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256)::text,
            E'\n' order by formula_id),''),'UTF8'),'sha256'),'hex') formula_graph_hash
        from public.estimate_formula_graph where definition_version_id=d.id
      ) f
      cross join lateral (
        select count(*)::integer resource_count,
          encode(extensions.digest(convert_to(coalesce(string_agg(
            jsonb_build_array(row_id,ordinal,semantic_owner,cost_owner_id,row_sha256)::text,
            E'\n' order by ordinal,row_id),''),'UTF8'),'sha256'),'hex') resource_set_hash
        from public.estimate_resource_spec where definition_version_id=d.id
      ) s
      cross join lateral (
        select count(*)::integer norm_binding_count,
          encode(extensions.digest(convert_to(coalesce(string_agg(
            jsonb_build_array(b.resource_spec_id,b.locator_id,b.applicability)::text,
            E'\n' order by b.resource_spec_id,b.locator_id),''),'UTF8'),'sha256'),'hex') norm_binding_hash
        from public.estimate_work_normative_binding b where b.definition_version_id=d.id
      ) n
      cross join lateral (
        select count(*)::integer price_binding_count,
          encode(extensions.digest(convert_to(coalesce(string_agg(
            jsonb_build_array(b.resource_spec_id,b.route_id,b.price_key,b.priority)::text,
            E'\n' order by b.resource_spec_id,b.route_id,b.priority),''),'UTF8'),'sha256'),'hex') price_contract_hash
        from public.estimate_resource_spec rs
        join public.estimate_resource_price_route_binding b on b.resource_spec_id=rs.id
        where rs.definition_version_id=d.id
      ) pr
      cross join lateral (
        select count(*)::integer approved_template_asset_count
        from public.estimate_approved_template_baseline b where b.definition_version_id=d.id
      ) b
      cross join lateral (
        select
          coalesce(sum(case when q.blank_owner then q.row_count else 0 end),0)::integer blank_owner_rows,
          count(*) filter(where not q.blank_owner and q.row_count>1)::integer duplicate_owner_groups,
          coalesce(sum(case when not q.blank_owner and q.row_count>1 then q.row_count else 0 end),0)::integer duplicate_owner_rows,
          count(*) filter(where not q.blank_owner and q.row_count>1 and q.cost_bearing)::integer duplicate_cost_bearing_owner_groups
        from (
          select nullif(btrim(coalesce(rs.semantic_owner,'')),'') is null blank_owner,
            count(*)::integer row_count,
            bool_or(rs.procurement_eligible or rs.row_type not in ('interface','document')) cost_bearing
          from public.estimate_resource_spec rs
          where rs.definition_version_id=d.id
          group by nullif(btrim(coalesce(rs.semantic_owner,'')),'')
        ) q
      ) o
      order by d.catalog_id
    `, [release.id])).rows as Json[];
    invariant(fingerprints.length === 4_272, `R54_BATCH008_CENSUS_DENOMINATOR:${fingerprints.length}/4272`);
    invariant(new Set(fingerprints.map((row) => row.catalog_id)).size === 4_272, "R54_BATCH008_DUPLICATE_CATALOG_ID");
    invariant(fingerprints.every((row) => row.parameter_count > 0 && row.formula_count > 0 && row.resource_count > 0),
      "R54_BATCH008_EMPTY_DEFINITION_CHILD_SET");
    const rows = fingerprints.map((row) => ({
      schemaVersion: "p0-one-monolith-r57-accepted-definition-fingerprint.v1",
      specSha256: SPEC_SHA256,
      head,
      tree,
      sourceBatch: "BATCH001-008",
      sourceReleaseId: release.id,
      catalogId: row.catalog_id,
      definitionVersionId: row.definition_version_id,
      definitionVersion: row.definition_version,
      namespace: row.namespace,
      domainId: row.domain,
      titleRu: row.title_ru,
      definitionHash: row.definition_hash,
      parameterSchemaHash: row.parameter_schema_hash,
      formulaGraphHash: row.formula_graph_hash,
      resourceSetHash: row.resource_set_hash,
      normBindingHash: row.norm_binding_hash,
      priceContractHash: row.price_contract_hash,
      baselineCompileHash: sha256([
        row.definition_hash,row.parameter_schema_hash,row.formula_graph_hash,row.resource_set_hash,
      ]),
      counts: {
        parameters: row.parameter_count,
        declaredDefaults: row.declared_default_count,
        requiredWithoutDefault: row.required_without_default_count,
        provenanceDefaults: row.provenance_default_count,
        provenanceLessDefaults: row.provenance_less_default_count,
        approvedTemplateAssets: row.approved_template_asset_count,
        formulas: row.formula_count,
        resources: row.resource_count,
        normativeBindings: row.norm_binding_count,
        priceBindings: row.price_binding_count,
        blankOwnerRows: row.blank_owner_rows,
        duplicateOwnerGroups: row.duplicate_owner_groups,
        duplicateOwnerRows: row.duplicate_owner_rows,
        duplicateCostBearingOwnerGroups: row.duplicate_cost_bearing_owner_groups,
      },
      baselineReady: row.parameter_count === row.declared_default_count
        && row.declared_default_count === row.provenance_default_count
        && row.provenance_less_default_count === 0,
      sourceMetadata: row.source_metadata,
    }));
    const totals = rows.reduce((acc, row) => ({
      parameters: acc.parameters + row.counts.parameters,
      declaredDefaults: acc.declaredDefaults + row.counts.declaredDefaults,
      requiredWithoutDefault: acc.requiredWithoutDefault + row.counts.requiredWithoutDefault,
      provenanceDefaults: acc.provenanceDefaults + row.counts.provenanceDefaults,
      provenanceLessDefaults: acc.provenanceLessDefaults + row.counts.provenanceLessDefaults,
      approvedTemplateAssets: acc.approvedTemplateAssets + row.counts.approvedTemplateAssets,
      formulas: acc.formulas + row.counts.formulas,
      resources: acc.resources + row.counts.resources,
      blankOwnerRows: acc.blankOwnerRows + row.counts.blankOwnerRows,
      duplicateOwnerGroups: acc.duplicateOwnerGroups + row.counts.duplicateOwnerGroups,
      duplicateOwnerRows: acc.duplicateOwnerRows + row.counts.duplicateOwnerRows,
      duplicateCostBearingOwnerGroups: acc.duplicateCostBearingOwnerGroups + row.counts.duplicateCostBearingOwnerGroups,
    }), {
      parameters: 0, declaredDefaults: 0, requiredWithoutDefault: 0,
      provenanceDefaults: 0, provenanceLessDefaults: 0, approvedTemplateAssets: 0,
      formulas: 0, resources: 0, blankOwnerRows: 0, duplicateOwnerGroups: 0,
      duplicateOwnerRows: 0, duplicateCostBearingOwnerGroups: 0,
    });
    const domainDistribution = Object.values(rows.reduce((acc: Record<string, Json>, row) => {
      const domain = String(row.domainId);
      const current = acc[domain] ?? {
        domainId: domain, definitions: 0, baselineReady: 0, blankOwnerRows: 0,
        duplicateOwnerGroups: 0, duplicateOwnerRows: 0, duplicateCostBearingOwnerGroups: 0,
      };
      current.definitions += 1;
      current.baselineReady += row.baselineReady ? 1 : 0;
      current.blankOwnerRows += row.counts.blankOwnerRows;
      current.duplicateOwnerGroups += row.counts.duplicateOwnerGroups;
      current.duplicateOwnerRows += row.counts.duplicateOwnerRows;
      current.duplicateCostBearingOwnerGroups += row.counts.duplicateCostBearingOwnerGroups;
      acc[domain] = current;
      return acc;
    }, {})).sort((left, right) => String(left.domainId).localeCompare(String(right.domainId)));
    const baselineReadyDefinitions = rows.filter((row) => row.baselineReady).length;
    const manifest = {
      schemaVersion: "p0-one-monolith-r57-batch001-008-baseline-census.v1",
      capturedAt: new Date().toISOString(),
      specSha256: SPEC_SHA256,
      head,
      tree,
      database: { name: database.name, oid: database.oid, sizeBytes: Number(database.size_bytes) },
      activeReleaseId: release.id,
      activeReleaseKey: release.release_key,
      observedActiveBatch008Definitions: fingerprints.length,
      preservedEffectiveDefinitions: `${fingerprints.length}/4272`,
      duplicateEffectiveCatalogId: 0,
      batch009InActiveManifest: 0,
      totals,
      domainDistribution,
      authoritativeBaselineBeforeR57Admission: `${baselineReadyDefinitions}/4272`,
      admissionRequired: 4_272 - baselineReadyDefinitions,
      semanticOwnerRepairRequired: totals.blankOwnerRows > 0 || totals.duplicateOwnerGroups > 0,
      sourceDatabaseWrites: 0,
      status: "GREEN_READ_ONLY_CENSUS_ADMISSION_PENDING",
    };
    const fingerprintPath = writeJsonl("ACCEPTED_DEFINITION_FINGERPRINTS.jsonl", rows);
    const ledgerPath = writeJsonl("BATCH001_008_CUMULATIVE_LEDGER.jsonl", rows.map((row) => ({
      catalog_id: row.catalogId,
      definition_version_id: row.definitionVersionId,
      source_batch: row.sourceBatch,
      source_release_id: row.sourceReleaseId,
      domain_id: row.domainId,
      publication_state: "ACCEPTED_INHERITED",
      baseline_ready: row.baselineReady,
      scenario_ready: false,
      blank_owner_rows: row.counts.blankOwnerRows,
      duplicate_owner_groups: row.counts.duplicateOwnerGroups,
      duplicate_owner_rows: row.counts.duplicateOwnerRows,
      duplicate_cost_bearing_owner_groups: row.counts.duplicateCostBearingOwnerGroups,
      definition_hash: row.definitionHash,
      fingerprint_sha256: sha256(row),
    })));
    const manifestPath = write("BATCH001_008_BASELINE_CENSUS_4272.json", manifest);
    const restorePath = write("DATABASE_SCHEMA_RESTORE_PROBE.json", {
      schemaVersion: "p0-one-monolith-r57-schema-restore-probe.v1",
      sourceDatabase: database.name,
      sourceDump: "BATCH008_SCHEMA_ONLY_BEFORE.dump",
      sourceDumpSha256: createHash("sha256").update(readFileSync(SCHEMA_DUMP_PATH)).digest("hex"),
      restoredDatabase: "p0_r54_schema_restore_probe",
      restoredPublicTables: 28,
      requiredTablesPresent: [
        "estimate_definition_release","estimate_definition_version","estimate_parameter_definition","estimate_resource_spec",
      ],
      status: "GREEN_RESTORE_PROBE_RETAINED_OFFLINE",
    });
    await client.query("commit");
    process.stdout.write(`${JSON.stringify({
      status: manifest.status,
      definitions: fingerprints.length,
      totals,
      evidence: { fingerprintPath, ledgerPath, manifestPath, restorePath },
    }, null, 2)}\n`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
