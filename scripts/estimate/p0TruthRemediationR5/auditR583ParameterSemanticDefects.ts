import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const SPEC_PATH = resolve("C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (11).md");
const SPEC_SHA256 = "21bdd2cf79185cbcf2a6621005f32d6eaf47e653dd88e5b006fcdc6797854138";
const BASE_COMMIT = "18c6b3a90ba6ab9ed044cf9fe982b9a98469da7c";
const EXPECTED_BRANCH = "codex/p0-one-monolith-r5";
const DEFAULT_RELEASE_ID = "94443669-8f5b-5cc7-b364-2f8e9f9e3506";
const DEFAULT_DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const DEFAULT_OUTPUT = resolve(
  ".release-runtime/p0-one-monolith-r58/evidence/13-r583/R583_PARAMETER_SEMANTIC_DEFECT_LEDGER.json",
);

function argument(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  return process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function git(args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function sha256(value: string | Buffer): string {
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

function stableJson(value: unknown): string {
  return JSON.stringify(stable(value));
}

function writeJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, file);
}

function removedProjectParameters(sourceMetadata: unknown): string[] {
  const found = new Set<string>();
  const visit = (value: unknown, parentKey = ""): void => {
    if (Array.isArray(value)) {
      if (/removed.*parameter|parameter.*removed/iu.test(parentKey)) {
        for (const item of value) {
          const id = typeof item === "string" ? item.trim() : "";
          if (id && !/^quantity_|^unit_price_/iu.test(id)) found.add(id);
        }
      }
      for (const item of value) visit(item, parentKey);
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value as Json)) visit(child, key);
  };
  visit(sourceMetadata);
  return [...found].sort();
}

async function main(): Promise<void> {
  invariant(sha256(readFileSync(SPEC_PATH)) === SPEC_SHA256, "R583_PARAMETER_LEDGER_SPEC_DRIFT");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === EXPECTED_BRANCH, `R583_PARAMETER_LEDGER_BRANCH:${branch}`);
  git(["merge-base", "--is-ancestor", BASE_COMMIT, head]);

  const releaseId = argument("release-id", DEFAULT_RELEASE_ID);
  const databaseUrl = argument("database-url", process.env.MONOLITH_ESTIMATE_DATABASE_URL ?? DEFAULT_DATABASE_URL);
  const output = resolve(argument("output", DEFAULT_OUTPUT));
  const client = new Client({ connectionString: databaseUrl, application_name: "r583-parameter-semantic-read-only-audit" });
  await client.connect();
  try {
    await client.query("begin read only");
    await client.query("set local statement_timeout='300s'");
    const release = (await client.query(
      "select id,release_key,status,definition_count,parameter_count,formula_count,source_commit,source_tree,source_manifest_sha256,metadata,parent_release_id,sealed_at from public.estimate_definition_release where id=$1",
      [releaseId],
    )).rows[0] as Json | undefined;
    invariant(release && ["prepared", "active"].includes(String(release.status)), "R583_PARAMETER_LEDGER_RELEASE_NOT_AVAILABLE");

    const definitions = (await client.query(`
      select m.catalog_id,m.definition_version_id::text,m.source_batch,m.source_release_id::text,m.domain_id,
        m.publication_state,m.baseline_ready,m.scenario_ready,m.approved_template_baseline_id::text,
        m.definition_hash,m.entry_sha256,d.definition_version,d.definition_sha256,d.source_metadata,
        coalesce(w.title_ru,m.catalog_id) title_ru,coalesce(w.domain,m.domain_id) work_group
      from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      left join public.estimate_work_identity w on w.catalog_id=m.catalog_id
      where m.release_id=$1
      order by m.catalog_id
    `, [releaseId])).rows as Json[];
    invariant(definitions.length === Number(release.definition_count),
      `R583_PARAMETER_LEDGER_DENOMINATOR:${definitions.length}/${release.definition_count}`);

    const parameters = (await client.query(`
      select p.definition_version_id::text,
        count(*)::int parameter_count,
        count(*) filter(where p.truth_metadata->>'visibility_role'='USER_INPUT')::int declared_user_input_count,
        coalesce(jsonb_agg(p.parameter_id order by p.ordinal) filter(where
          p.truth_metadata->>'visibility_role'='USER_INPUT'
          and p.parameter_id !~* '^quantity_|^unit_price_'
          and p.parameter_id !~* '(^|_)(compacted_volume|volume_m3|coverage_area|work_quantity|factor|coefficient|calculated|derived|consumption_total|mass_t|material_m3|labor_man_hours|machine_hours|trip_count|service_count|test_count|test_frequency|test_interval|inspection_interval|control_interval|protocol_count|documentation_count|productivity)(_|$)'
          and p.title_ru !~* '^\\s*(Количество|Объём|Объем):'
          and coalesce(p.truth_metadata#>>'{guide,guideKind}','')<>'DERIVED_VALUE_RULE'
          and coalesce(lower(p.unit_id),'') not in ('document','machine_hour','man_hour','person_shift','service','t_km','test','trip')
          and (jsonb_array_length(coalesce(p.truth_metadata->'formula_consumers','[]'::jsonb))>0
            or jsonb_array_length(coalesce(p.truth_metadata->'resource_branch_consumers','[]'::jsonb))>0)
        ),'[]'::jsonb) real_user_parameter_ids,
        coalesce(jsonb_agg(p.parameter_id order by p.ordinal) filter(where
          p.truth_metadata->>'visibility_role'='USER_INPUT' and p.parameter_id ~* '^quantity_'
        ),'[]'::jsonb) erroneous_quantity_input_ids,
        coalesce(jsonb_agg(p.parameter_id order by p.ordinal) filter(where
          p.truth_metadata->>'visibility_role'='USER_INPUT'
          and coalesce(p.truth_metadata->>'value_source_role','') not in
            ('USER_MEASURED','USER_DECLARED','PROJECT_SPECIFIC_INPUT')
          and (
            p.parameter_id ~* '^quantity_|^unit_price_'
            or p.parameter_id ~* '(^|_)(compacted_volume|volume_m3|coverage_area|work_quantity|factor|coefficient|calculated|derived|consumption_total|mass_t|material_m3|labor_man_hours|machine_hours|trip_count|service_count|test_count|test_frequency|test_interval|inspection_interval|control_interval|protocol_count|documentation_count|productivity)(_|$)'
            or p.title_ru ~* '^\s*(Количество|Объём|Объем):'
            or coalesce(p.truth_metadata#>>'{guide,guideKind}','')='DERIVED_VALUE_RULE'
            or coalesce(lower(p.unit_id),'') in
              ('document','machine_hour','man_hour','person_shift','service','t_km','test','trip')
          )
        ),'[]'::jsonb) erroneous_derived_input_ids,
        coalesce(jsonb_agg(distinct p.unit_id) filter(where lower(coalesce(p.unit_id,'')) in
          ('service','trip','test','person_shift','document','item','person','man_hour','machine_hour','t_km')),'[]'::jsonb) raw_parameter_units
      from public.estimate_parameter_definition p
      where p.definition_version_id=any($1::uuid[])
      group by p.definition_version_id
    `, [definitions.map((row) => row.definition_version_id)])).rows as Json[];

    const formulas = (await client.query(`
      select f.definition_version_id::text,count(*)::int formula_count,
        count(*) filter(where f.ast->>'kind'='parameter' and cardinality(f.input_parameter_ids)=1
          and f.ast->>'id'=f.input_parameter_ids[1])::int passthrough_formula_count,
        coalesce(jsonb_agg(f.formula_id order by f.formula_id) filter(where f.ast->>'kind'='parameter'
          and cardinality(f.input_parameter_ids)=1 and f.ast->>'id'=f.input_parameter_ids[1]
          and f.input_parameter_ids[1] ~* '^quantity_'),'[]'::jsonb) quantity_passthrough_formula_ids,
        coalesce(jsonb_agg(jsonb_build_object(
          'formulaId',f.formula_id,'parameterId',f.input_parameter_ids[1]
        ) order by f.formula_id) filter(where f.ast->>'kind'='parameter'
          and cardinality(f.input_parameter_ids)=1 and f.ast->>'id'=f.input_parameter_ids[1]
        ),'[]'::jsonb) passthrough_formula_bindings
      from public.estimate_formula_graph f
      where f.definition_version_id=any($1::uuid[])
      group by f.definition_version_id
    `, [definitions.map((row) => row.definition_version_id)])).rows as Json[];

    const resources = (await client.query(`
      with base as (
        select r.*,lower(regexp_replace(trim(r.title_ru),'\\s+',' ','g')) normalized_title
        from public.estimate_resource_spec r where r.definition_version_id=any($1::uuid[])
      ), duplicates as (
        select definition_version_id,sum(n-1)::int duplicate_count
        from (select definition_version_id,normalized_title,coalesce(unit_id,''),coalesce(formula_id,''),count(*)::int n
          from base group by definition_version_id,normalized_title,coalesce(unit_id,''),coalesce(formula_id,'') having count(*)>1) grouped
        group by definition_version_id
      )
      select b.definition_version_id::text,count(*)::int resource_count,
        count(*) filter(where lower(b.category) in ('material','materials'))::int material_count,
        count(*) filter(where lower(b.category) in ('labor','work','works'))::int labor_count,
        count(*) filter(where lower(b.category) in ('equipment','machine','machinery'))::int machine_count,
        coalesce(jsonb_agg(distinct b.unit_id) filter(where lower(coalesce(b.unit_id,'')) in
          ('service','trip','test','person_shift','document','item','person','man_hour','machine_hour','t_km')),'[]'::jsonb) raw_resource_units,
        coalesce(d.duplicate_count,0)::int duplicate_row_count
      from base b left join duplicates d on d.definition_version_id=b.definition_version_id
      group by b.definition_version_id,d.duplicate_count
    `, [definitions.map((row) => row.definition_version_id)])).rows as Json[];

    const normative = (await client.query(`
      select b.definition_version_id::text,count(distinct s.id)::int normative_source_count,
        coalesce(jsonb_agg(distinct jsonb_build_object('sourceKey',s.source_key,'titleRu',s.title_ru,'authority',s.authority))
          filter(where s.id is not null),'[]'::jsonb) normative_sources
      from public.estimate_work_normative_binding b
      join public.estimate_normative_locator l on l.id=b.locator_id
      join public.estimate_normative_source s on s.id=l.source_id
      where b.definition_version_id=any($1::uuid[])
      group by b.definition_version_id
    `, [definitions.map((row) => row.definition_version_id)])).rows as Json[];

    const byDefinition = <T extends Json>(rows: T[]): Map<string, T> =>
      new Map(rows.map((row) => [String(row.definition_version_id), row]));
    const parameterByDefinition = byDefinition(parameters);
    const formulaByDefinition = byDefinition(formulas);
    const resourceByDefinition = byDefinition(resources);
    const normativeByDefinition = byDefinition(normative);

    const entries = definitions.map((definition) => {
      const id = String(definition.definition_version_id);
      const parameter = parameterByDefinition.get(id) ?? {};
      const formula = formulaByDefinition.get(id) ?? {};
      const resource = resourceByDefinition.get(id) ?? {};
      const norm = normativeByDefinition.get(id) ?? {};
      const removedParameterIds = removedProjectParameters(definition.source_metadata);
      const erroneousQuantityInputIds = parameter.erroneous_quantity_input_ids ?? [];
      const erroneousDerivedInputIds = parameter.erroneous_derived_input_ids ?? [];
      const erroneousDerivedInputSet = new Set(erroneousDerivedInputIds.map(String));
      const quantityPassthroughFormulaIds = formula.quantity_passthrough_formula_ids ?? [];
      const derivedPassthroughFormulaIds = (formula.passthrough_formula_bindings ?? [])
        .filter((binding: Json) => erroneousDerivedInputSet.has(String(binding.parameterId)))
        .map((binding: Json) => String(binding.formulaId));
      const hasQuantitySemanticDefect = erroneousDerivedInputIds.length > 0
        || derivedPassthroughFormulaIds.length > 0;
      // A predecessor repair is allowed to remove parameters which have no formula or
      // resource consumer. Those removals are not missing project inputs. They become
      // evidence of a real defect only when the surviving graph asks the user to enter
      // quantity_* outputs and merely passes them through (the drywall failure mode).
      const missingProjectParameterIds = hasQuantitySemanticDefect ? removedParameterIds : [];
      const intentionallyRemovedUnusedParameterIds = hasQuantitySemanticDefect ? [] : removedParameterIds;
      const professionalContentPresent = Number(formula.formula_count ?? 0) > 0
        && Number(resource.resource_count ?? 0) > 0;
      const authoritativeFoundationPresent = definition.baseline_ready === true
        && definition.scenario_ready === true
        && definition.approved_template_baseline_id != null
        && Number(norm.normative_source_count ?? 0) > 0;
      // An approved scenario baseline proves one accepted snapshot, not a general
      // quantity formula. Never manufacture coefficients from it. A quantity repair is
      // REPAIR_REQUIRED only after an independently cited formula authority is attached
      // to the immutable definition metadata; otherwise the safe disposition is
      // QUARANTINED and the historical definition remains untouched.
      const formulaRepairAuthorityPresent = Boolean(
        definition.source_metadata?.r583AuthoritativeFormulaRepair?.sourceSha256,
      );
      const status = !professionalContentPresent
        ? "QUARANTINED"
        : hasQuantitySemanticDefect
          ? formulaRepairAuthorityPresent ? "REPAIR_REQUIRED" : "QUARANTINED"
          : "PROFESSIONAL_READY";
      return {
        catalogId: definition.catalog_id,
        titleRu: definition.title_ru,
        workGroup: definition.work_group,
        domainId: definition.domain_id,
        sourceBatch: definition.source_batch,
        publicationState: definition.publication_state,
        definitionId: id,
        definitionVersion: definition.definition_version,
        definitionReleaseId: definition.source_release_id,
        targetManifestReleaseId: releaseId,
        realUserParameterIds: parameter.real_user_parameter_ids ?? [],
        declaredUserInputCount: Number(parameter.declared_user_input_count ?? 0),
        erroneousQuantityInputIds,
        erroneousQuantityInputCount: erroneousQuantityInputIds.length,
        erroneousDerivedInputIds,
        erroneousDerivedInputCount: erroneousDerivedInputIds.length,
        missingProjectParameterIds,
        intentionallyRemovedUnusedParameterIds,
        passthroughFormulaCount: Number(formula.passthrough_formula_count ?? 0),
        quantityPassthroughFormulaIds,
        derivedPassthroughFormulaIds,
        rawUnits: [...new Set([
          ...(parameter.raw_parameter_units ?? []),
          ...(resource.raw_resource_units ?? []),
        ])].sort(),
        duplicateRowCount: Number(resource.duplicate_row_count ?? 0),
        content: {
          parameterCount: Number(parameter.parameter_count ?? 0),
          formulaCount: Number(formula.formula_count ?? 0),
          resourceCount: Number(resource.resource_count ?? 0),
          materialCount: Number(resource.material_count ?? 0),
          laborCount: Number(resource.labor_count ?? 0),
          machineCount: Number(resource.machine_count ?? 0),
        },
        normativeSources: norm.normative_sources ?? [],
        baseline: {
          id: definition.approved_template_baseline_id,
          ready: definition.baseline_ready === true,
          scenarioReady: definition.scenario_ready === true,
          authoritativeFoundationPresent,
          formulaRepairAuthorityPresent,
        },
        dispositionReason: !professionalContentPresent
          ? "PROFESSIONAL_CONTENT_MISSING"
          : hasQuantitySemanticDefect && !formulaRepairAuthorityPresent
            ? "DERIVED_OUTPUT_EXPOSED_AS_REQUIRED_USER_INPUT_WITHOUT_FORMULA_AUTHORITY"
            : hasQuantitySemanticDefect
              ? "AUTHORITATIVE_FORMULA_REPAIR_REQUIRED"
              : "PROFESSIONAL_SEMANTICS_VERIFIED",
        status,
      };
    });

    const counts = Object.fromEntries(["PROFESSIONAL_READY", "REPAIR_REQUIRED", "QUARANTINED"]
      .map((status) => [status, entries.filter((entry) => entry.status === status).length]));
    const totalErroneousQuantityInputs = entries.reduce((sum, entry) => sum + entry.erroneousQuantityInputCount, 0);
    const totalErroneousDerivedInputs = entries.reduce((sum, entry) => sum + entry.erroneousDerivedInputCount, 0);
    const totalQuantityPassthroughFormulas = entries.reduce((sum, entry) => sum + entry.quantityPassthroughFormulaIds.length, 0);
    const totalDerivedPassthroughFormulas = entries.reduce((sum, entry) => sum + entry.derivedPassthroughFormulaIds.length, 0);
    const dbFingerprint = sha256(stableJson({
      releaseId,
      releaseSourceManifest: release.source_manifest_sha256,
      entries: definitions.map((row) => [row.catalog_id, row.definition_version_id, row.definition_hash, row.entry_sha256]),
    }));
    const ledger = {
      schemaVersion: "p0-one-monolith-r5.9-parameter-semantic-defect-ledger.v2",
      capturedAt: new Date().toISOString(),
      specSha256: SPEC_SHA256,
      source: { branch, head, tree, parentHead: git(["rev-parse", "HEAD^"]), descendantOf18c6b3a9: true },
      database: { name: new URL(databaseUrl).pathname.replace(/^\//u, ""), writes: 0, transaction: "READ_ONLY", fingerprintSha256: dbFingerprint },
      release,
      policy: {
        editableOwner: "USER_INPUT only",
        derivedQuantityPrefix: "quantity_",
        suspiciousDerivedInputsRequireExplicitMeasuredOwnership: true,
        acceptedMeasuredOwnershipRoles: ["USER_MEASURED", "USER_DECLARED", "PROJECT_SPECIFIC_INPUT"],
        formulaConsumersDoNotProveUserOwnership: true,
        missingAuthorityDisposition: "QUARANTINED",
        historicalDefinitionsMutated: false,
      },
      summary: {
        expected: Number(release.definition_count),
        audited: entries.length,
        ...counts,
        totalErroneousQuantityInputs,
        totalErroneousDerivedInputs,
        totalQuantityPassthroughFormulas,
        totalDerivedPassthroughFormulas,
        entriesWithDuplicateRows: entries.filter((entry) => entry.duplicateRowCount > 0).length,
        entriesWithRawUnits: entries.filter((entry) => entry.rawUnits.length > 0).length,
        batch009Entries: entries.filter((entry) => /^BATCH009/iu.test(String(entry.sourceBatch))).length,
      },
      entries,
      status: counts.REPAIR_REQUIRED === 0 && counts.QUARANTINED === 0
        ? "GREEN_PARAMETER_SEMANTICS"
        : "RED_PARAMETER_SEMANTIC_REPAIR_QUEUE_CREATED",
    };
    writeJson(output, ledger);
    await client.query("rollback");
    process.stdout.write(`${JSON.stringify({
      output,
      ...ledger.summary,
      dbFingerprintSha256: dbFingerprint,
      source: ledger.source,
      status: ledger.status,
    }, null, 2)}\n`);
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
