import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const SPEC_SHA256 = "4bd245a1537da872dbc6ce6681c6571baeb146aa1123b5402e71bbec10050b62";
const REFERENCE_URL = process.env.R56_REFERENCE_CANDIDATE_DATABASE_URL ?? process.env.R55_REFERENCE_CANDIDATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/p0_r53_exact15_candidate";
const FRESH_URL = process.env.R56_FRESH_CANDIDATE_DATABASE_URL ?? process.env.R55_FRESH_CANDIDATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/p0_r55_exact15_fresh_20260817a";
const OUTPUT_PATH = resolve(
  ".release-runtime/p0-one-monolith-r56/evidence/05-baseline/EXACT15_CANDIDATE_REBUILD_PARITY.json",
);
const MIGRATIONS = [
  "supabase/migrations/20260817230000_p0_estimate_truth_remediation_r1.sql",
  "supabase/migrations/20260818010000_p0_one_monolith_r54_approved_template_baseline.sql",
  "supabase/migrations/20260818020000_p0_r54_definition_defect_ledger.sql",
] as const;
const SCHEMA_DUMP = resolve(
  ".release-runtime/p0-one-monolith-r5/evidence/02-phase1a/canonical-backend-api/candidate/BATCH008_SCHEMA_ONLY_BEFORE.dump",
);

function stable(value: unknown): string {
  if (value === undefined) return '"__undefined__"';
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const object = value as Json;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stable(object[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : stable(value)).digest("hex");
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sanitizedPassport(value: Json): Json {
  const passport = structuredClone(value ?? {});
  delete passport.parameterSchemaId;
  delete passport.approvedTemplateBaselineId;
  return passport;
}

function parameterTruthProjection(value: Json): Json {
  return {
    semanticParameterKey: value?.semantic_parameter_key,
    visibilityRole: value?.visibility_role,
    descriptionRu: value?.description_ru,
    requiredWhen: value?.required_when,
    visibleWhen: value?.visible_when,
    allowedRangeOrOptions: value?.allowed_range_or_options,
    defaultPolicy: value?.default_policy,
    baselineReasonRu: value?.baseline_reason_ru,
    valueSourceRole: value?.value_source_role,
    guide: value?.guide,
    sharedInputBindingPolicy: value?.shared_input_binding_policy,
    derivedFrom: value?.derived_from,
    normativeLinks: value?.normative_links,
    formulaConsumers: value?.formula_consumers,
    resourceBranchConsumers: value?.resource_branch_consumers,
    validationRules: value?.validation_rules,
    conflictsWith: value?.conflicts_with,
    baselineOwner: value?.provenance?.baselineOwner,
    sourceCatalogId: value?.provenance?.sourceCatalogId,
    sourceParameterSchemaId: value?.provenance?.sourceParameterSchemaId,
    sourceParameterSchemaVersion: value?.provenance?.sourceParameterSchemaVersion,
    acceptedTraceBindings: value?.provenance?.acceptedTraceBindings,
  };
}

function resourceMetadataProjection(value: Json): Json {
  const metadata = structuredClone(value ?? {});
  if (metadata.r54SemanticOwnerRepair) delete metadata.r54SemanticOwnerRepair.specSha256;
  return metadata;
}

function baselineComputationalProjection(row: Json): Json {
  const proposalSourceRefs = (row.proposal_source_refs ?? []).filter(
    (value: unknown) => !String(value).startsWith("defect-ledger:"),
  );
  const validationScenarioRefs = (row.validation_scenario_refs ?? []).filter(
    (value: unknown) => String(value) !== "R54_SEMANTIC_OWNER_UNIQUENESS_REPAIR",
  );
  return {
    catalogId: row.catalog_id,
    parameterSchemaSha256: row.parameter_schema_sha256,
    inputValues: row.input_values,
    inputClassification: row.input_classification,
    uomByParameter: row.uom_by_parameter,
    formulaConsumerIds: row.formula_consumer_ids,
    resourceConsumerRowIds: row.resource_consumer_row_ids,
    normativeSourceIds: row.normative_source_ids,
    guideProvenanceRu: row.guide_provenance_ru,
    proposalSourceRefs,
    validationScenarioRefs,
    contractVersion: row.contract_version,
  };
}

function baselineLineageProjection(row: Json): Json {
  return {
    catalogId: row.catalog_id,
    baselineKey: row.baseline_key,
    acceptedReleaseId: row.accepted_release_id,
    sourceDefinitionVersionId: row.source_definition_version_id,
    acceptanceEvidenceSha256: row.acceptance_evidence_sha256,
    defectLedgerRefs: (row.proposal_source_refs ?? []).filter(
      (value: unknown) => String(value).startsWith("defect-ledger:"),
    ),
    ownerRepairValidationRefs: (row.validation_scenario_refs ?? []).filter(
      (value: unknown) => String(value) === "R54_SEMANTIC_OWNER_UNIQUENESS_REPAIR",
    ),
  };
}

async function capture(url: string, expectedStatus: "active" | "prepared"): Promise<Json> {
  const client = new Client({ connectionString: url, application_name: "r56-exact15-rebuild-parity" });
  await client.connect();
  try {
    await client.query("begin isolation level repeatable read read only");
    const database = (await client.query(`select current_database() name,
      (select oid::integer from pg_database where datname=current_database()) oid,
      pg_database_size(current_database())::text bytes`)).rows[0] as Json;
    const activeRows = (await client.query(
      "select * from public.estimate_definition_release where status=$1",
      [expectedStatus],
    )).rows as Json[];
    invariant(activeRows.length === 1, `R56_REBUILD_RELEASE_STATUS_DENOMINATOR:${database.name}:${expectedStatus}:${activeRows.length}`);
    const active = activeRows[0] as Json | undefined;
    invariant(active && Number(active.definition_count) === 15, `R56_REBUILD_ACTIVE_RELEASE_INVALID:${database.name}`);
    const definitions = (await client.query(
      "select * from public.estimate_definition_version where release_id=$1 order by catalog_id",
      [active.id],
    )).rows as Json[];
    invariant(definitions.length === 15, `R56_REBUILD_DEFINITION_DENOMINATOR:${database.name}:${definitions.length}/15`);
    const rows: Json[] = [];
    for (const definition of definitions) {
      const parameters = (await client.query(
        "select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal,parameter_id",
        [definition.id],
      )).rows as Json[];
      const formulas = (await client.query(
        "select * from public.estimate_formula_graph where definition_version_id=$1 order by formula_id",
        [definition.id],
      )).rows as Json[];
      const resources = (await client.query(
        "select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal,row_id",
        [definition.id],
      )).rows as Json[];
      const baselines = (await client.query(
        "select * from public.estimate_approved_template_baseline where definition_version_id=$1 order by baseline_key",
        [definition.id],
      )).rows as Json[];
      const semantic = {
        catalogId: definition.catalog_id,
        definition: {
          passport: sanitizedPassport(definition.passport),
          applicability: definition.applicability,
        },
        parameters: parameters.map((row) => ({
          parameterId: row.parameter_id,
          ordinal: row.ordinal,
          valueType: row.value_type,
          unitId: row.unit_id,
          titleRu: row.title_ru,
          required: row.required,
          defaultValue: row.default_value,
          constraints: row.constraints_json,
          truth: parameterTruthProjection(row.truth_metadata),
        })),
        formulas: formulas.map((row) => ({
          formulaId: row.formula_id,
          outputUnitId: row.output_unit_id,
          expressionSource: row.expression_source,
          ast: row.ast,
          inputParameterIds: row.input_parameter_ids,
          astSha256: row.ast_sha256,
        })),
        resources: resources.map((row) => ({
          rowId: row.row_id,
          ordinal: row.ordinal,
          section: row.section,
          category: row.category,
          titleRu: row.title_ru,
          rowType: row.row_type,
          unitId: row.unit_id,
          formulaId: row.formula_id,
          inclusionAst: row.inclusion_ast,
          resourceGraph: row.resource_graph,
          semanticOwner: row.semantic_owner,
          costOwnerId: row.cost_owner_id,
          procurementEligible: row.procurement_eligible,
          sourceMetadata: resourceMetadataProjection(row.source_metadata),
          rowSha256: row.row_sha256,
        })),
        baselines: baselines.map(baselineComputationalProjection),
      };
      rows.push({
        catalogId: definition.catalog_id,
        counts: {
          parameters: parameters.length,
          formulas: formulas.length,
          resources: resources.length,
          baselines: baselines.length,
        },
        fingerprints: {
          definition: sha256(semantic.definition),
          parameters: sha256(semantic.parameters),
          formulas: sha256(semantic.formulas),
          resources: sha256(semantic.resources),
          baselines: sha256(semantic.baselines),
          complete: sha256(semantic),
        },
        baselineLineage: baselines.map(baselineLineageProjection),
      });
    }
    const defects = (await client.query(`
      select catalog_id,affected_resources,before_sha256,after_sha256,defect_class
      from public.estimate_definition_defect_record
      order by catalog_id
    `)).rows as Json[];
    const ownerState = (await client.query(`
      with invalid as (
        select s.definition_version_id,s.semantic_owner,count(*)
        from public.estimate_resource_spec s
        join public.estimate_definition_version v on v.id=s.definition_version_id and v.release_id=$1
        group by s.definition_version_id,s.semantic_owner
        having s.semantic_owner is null or btrim(s.semantic_owner)='' or count(*)>1
      ) select count(*)::int invalid_groups from invalid
    `, [active.id])).rows[0] as Json;
    await client.query("commit");
    return {
      database,
      activeRelease: {
        id: active.id,
        releaseKey: active.release_key,
        parentReleaseId: active.parent_release_id,
        definitions: active.definition_count,
        parameters: active.parameter_count,
        formulas: active.formula_count,
        resources: active.resource_row_count,
        status: active.status,
      },
      rows,
      aggregateFingerprint: sha256(rows.map((row) => [row.catalogId, row.counts, row.fingerprints])),
      defects: {
        count: defects.length,
        affectedRows: defects.reduce((sum, row) => sum + row.affected_resources.length, 0),
        semanticFingerprint: sha256(defects.map((row) => ({
          catalogId: row.catalog_id,
          defectClass: row.defect_class,
          affectedResources: row.affected_resources,
        }))),
      },
      invalidOwnerGroups: Number(ownerState.invalid_groups),
    };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  execFileSync("git", ["merge-base", "--is-ancestor", "691acb78", "HEAD"], { stdio: "ignore" });
  const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const tree = execFileSync("git", ["rev-parse", "HEAD^{tree}"], { encoding: "utf8" }).trim();
  const reference = await capture(REFERENCE_URL, "active");
  const fresh = await capture(FRESH_URL, "prepared");
  const referenceByCatalog = new Map<string, Json>(
    (reference.rows as Json[]).map((row: Json) => [String(row.catalogId), row]),
  );
  const comparisons: Json[] = (fresh.rows as Json[]).map((freshRow: Json): Json => {
    const referenceRow = referenceByCatalog.get(String(freshRow.catalogId));
    invariant(referenceRow, `R56_REBUILD_REFERENCE_CATALOG_MISSING:${freshRow.catalogId}`);
    const parity = Object.fromEntries(Object.keys(freshRow.fingerprints).map((key) => [
      key,
      freshRow.fingerprints[key] === referenceRow.fingerprints[key],
    ]));
    return {
      catalogId: freshRow.catalogId,
      referenceCounts: referenceRow.counts,
      freshCounts: freshRow.counts,
      referenceFingerprints: referenceRow.fingerprints,
      freshFingerprints: freshRow.fingerprints,
      parity,
      status: Object.values(parity).every(Boolean) && stable(referenceRow.counts) === stable(freshRow.counts)
        ? "GREEN"
        : "RED",
    };
  });
  const red = comparisons.filter((row: Json) => row.status !== "GREEN");
  invariant(reference.rows.length === 15 && fresh.rows.length === 15, "R56_REBUILD_DENOMINATOR_NOT_15");
  invariant(reference.defects.count === 14 && reference.defects.affectedRows === 776,
    `R56_REBUILD_REFERENCE_DEFECT_DENOMINATOR:${reference.defects.count}:${reference.defects.affectedRows}`);
  invariant(fresh.defects.count === 14 && fresh.defects.affectedRows === 776,
    `R56_REBUILD_FRESH_DEFECT_DENOMINATOR:${fresh.defects.count}:${fresh.defects.affectedRows}`);
  invariant(reference.invalidOwnerGroups === 0 && fresh.invalidOwnerGroups === 0,
    `R56_REBUILD_INVALID_OWNER_GROUPS:${reference.invalidOwnerGroups}:${fresh.invalidOwnerGroups}`);
  invariant(reference.defects.semanticFingerprint === fresh.defects.semanticFingerprint,
    `R56_REBUILD_DEFECT_SEMANTIC_FINGERPRINT_MISMATCH:${reference.defects.semanticFingerprint}:${fresh.defects.semanticFingerprint}`);
  const evidence = {
    schemaVersion: "p0-one-monolith-r56-exact15-candidate-rebuild-parity.v1",
    capturedAt: new Date().toISOString(),
    specSha256: SPEC_SHA256,
    head,
    tree,
    emptyDatabaseRebuild: true,
    sourceSchemaDump: {
      path: SCHEMA_DUMP,
      sha256: sha256File(SCHEMA_DUMP),
    },
    migrations: MIGRATIONS.map((path) => ({ path, sha256: sha256File(resolve(path)) })),
    reference,
    fresh,
    comparisons,
    redCatalogIds: red.map((row: Json) => row.catalogId),
    verdict: red.length === 0 ? "GREEN_REPRODUCIBLE_15_OF_15" : "RED_REBUILD_PARITY",
  };
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    verdict: evidence.verdict,
    referenceDatabase: reference.database.name,
    freshDatabase: fresh.database.name,
    compared: comparisons.length,
    redCatalogIds: evidence.redCatalogIds,
    outputPath: OUTPUT_PATH,
  }, null, 2)}\n`);
  if (red.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
