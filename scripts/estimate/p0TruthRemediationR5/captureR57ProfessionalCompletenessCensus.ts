import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Client } from "pg";

import {
  buildAiEstimateParameterSchema,
  clearAiEstimateParameterSchemaCache,
} from "../../../src/lib/estimate/aiEstimateParameterSchema";
import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
  listProfessionalWorkPassportTemplateIds,
} from "../../../src/lib/estimate/buildProfessionalWorkPassport";

type Json = Record<string, any>;

const SPEC_SHA256 = "b86e460d194c98f56546bdcc50704a38fba6fc74c4de3d661d2e1221d6d2e76e";
const EXPECTED_GLOBAL_TOTAL = 11_610;
const EXPECTED_BATCH008_TOTAL = 4_272;
const EXPECTED_RELEASE_ID = "da29dc2b-1384-5487-b8da-6ee93f4e514e";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const MODE = process.env.R57_CENSUS_SCOPE ?? "aggregate";
const ROOT = path.resolve(".release-runtime/p0-one-monolith-r57/evidence/02-data-before/professional-completeness");
const SOURCE_LEDGER = path.join(ROOT, "GLOBAL_PROFESSIONAL_COMPLETENESS_SOURCE_11610.jsonl");
const SOURCE_SUMMARY = path.join(ROOT, "GLOBAL_PROFESSIONAL_COMPLETENESS_SOURCE_11610.json");
const DATABASE_LEDGER = path.join(ROOT, "BATCH001_008_PROFESSIONAL_COMPLETENESS_4272.jsonl");
const DATABASE_SUMMARY = path.join(ROOT, "BATCH001_008_PROFESSIONAL_COMPLETENESS_4272.json");

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function stable(value: unknown): string {
  if (value == null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const object = value as Json;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stable(object[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : stable(value)).digest("hex");
}

function writeJson(target: string, value: unknown): void {
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeJsonl(target: string, rows: readonly unknown[]): void {
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function readJson(target: string): Json {
  return JSON.parse(readFileSync(target, "utf8")) as Json;
}

function readJsonl(target: string): Json[] {
  return readFileSync(target, "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as Json);
}

function currentBinding() {
  const head = git("rev-parse", "HEAD");
  execFileSync("git", ["merge-base", "--is-ancestor", "691acb78", head]);
  return {
    head,
    tree: git("rev-parse", "HEAD^{tree}"),
    dirtyDiffSha256: sha256(git("diff", "--binary")),
  };
}

function isPrimaryQuantityKey(key: string): boolean {
  return /^(?:q|area_m2|volume_m3|length_m|width_m|height_m|count|quantity|mass_kg|mass_t|power_kw|capacity|route_length_m|measured_.+)$/i.test(key);
}

function isGenericPrimaryQuantityKey(key: string): boolean {
  return /^(?:q|quantity|value|count|length_m|width_m|height_m)$/i.test(key);
}

function sourceCensus(): void {
  const binding = currentBinding();
  const templateIds = listProfessionalWorkPassportTemplateIds();
  if (templateIds.length !== EXPECTED_GLOBAL_TOTAL || new Set(templateIds).size !== EXPECTED_GLOBAL_TOTAL) {
    throw new Error(`R57_GLOBAL_SOURCE_DENOMINATOR:${templateIds.length}/${EXPECTED_GLOBAL_TOTAL}`);
  }
  const startedAt = Date.now();
  const rows = templateIds.map((templateId, index) => {
    const passport = buildProfessionalWorkPassport(templateId);
    if (!passport) throw new Error(`R57_SOURCE_PASSPORT_MISSING:${templateId}`);
    const schema = buildAiEstimateParameterSchema(templateId, { professionalPassport: passport });
    const fields = schema?.fields ?? [];
    const visibleFields = fields.filter((field) => !/^source_prompt$|^inline_work_prompt$/.test(field.key));
    const duplicateParameterKeys = fields.length - new Set(fields.map((field) => field.key)).size;
    const parametersWithoutConsumers = visibleFields.filter((field) =>
      field.affectsRowIds.length === 0 && field.formulaRefs.length === 0
    ).map((field) => field.key);
    const primaryQuantityKeys = visibleFields.filter((field) =>
      isPrimaryQuantityKey(field.key) && (field.affectsRowIds.length > 0 || field.formulaRefs.length > 0)
    ).map((field) => field.key);
    const recipeRows = passport.boqRecipe.allRows;
    const rowTypes = [...new Set(recipeRows.map((row) => row.rowType))].sort();
    const rowsWithoutNormSource = recipeRows.filter((row) => !row.normSourceId || !row.normVersion).length;
    const rowsWithoutFormula = recipeRows.filter((row) => !row.formulaId || !row.quantityFormula).length;
    const universalSuggestionFields = fields.filter((field) => field.source === "professional_suggestion").length;
    const compactHints = 0;
    const explicitTechnologyGraph = false;
    const explicitInclusionGraph = false;
    let roleVerdicts = 0;
    const blockers = [
      schema ? "" : "parameter_schema_missing",
      fields.length > 0 ? "" : "parameter_schema_empty",
      duplicateParameterKeys > 0 ? `duplicate_parameter_keys:${duplicateParameterKeys}` : "",
      parametersWithoutConsumers.length > 0 ? `parameters_without_consumers:${parametersWithoutConsumers.length}` : "",
      primaryQuantityKeys.length > 0 ? "" : "work_specific_primary_quantity_missing",
      primaryQuantityKeys.length > 0 && primaryQuantityKeys.every(isGenericPrimaryQuantityKey)
        ? "primary_quantity_is_generic_only"
        : "",
      compactHints === visibleFields.length && visibleFields.length > 0 ? "" : `compact_hint_contract_missing:${visibleFields.length}`,
      explicitTechnologyGraph ? "" : "explicit_technology_graph_missing",
      explicitInclusionGraph ? "" : "explicit_inclusion_graph_missing",
      `five_role_verdicts_missing:${roleVerdicts}/5`,
      recipeRows.length > 0 ? "" : "boq_empty",
      rowsWithoutNormSource > 0 ? `rows_without_norm_source:${rowsWithoutNormSource}` : "",
      rowsWithoutFormula > 0 ? `rows_without_formula:${rowsWithoutFormula}` : "",
      universalSuggestionFields > 0 ? `universal_suggestion_fields:${universalSuggestionFields}` : "",
    ].filter(Boolean);
    const result = {
      catalog_id: passport.templateKind === "base_10000" ? passport.workKey : passport.templateId,
      source_catalog_id: passport.templateKind === "base_10000" ? passport.workKey : `expanded-template:${passport.templateId}`,
      template_id: passport.templateId,
      template_kind: passport.templateKind,
      work_key: passport.workKey,
      family_id: passport.familyId,
      category: passport.category,
      parameter_schema_id: schema?.templateId ?? null,
      parameter_count: fields.length,
      visible_parameter_count: visibleFields.length,
      required_parameter_count: fields.filter((field) => field.required).length,
      formula_dependency_parameter_count: fields.filter((field) => field.source === "formula_dependency").length,
      universal_suggestion_parameter_count: universalSuggestionFields,
      duplicate_parameter_keys: duplicateParameterKeys,
      parameters_without_consumers: parametersWithoutConsumers,
      primary_quantity_keys: primaryQuantityKeys,
      work_specific_primary_quantity_ready:
        primaryQuantityKeys.length > 0 && !primaryQuantityKeys.every(isGenericPrimaryQuantityKey),
      compact_hint_count: compactHints,
      compact_hint_contract_ready: compactHints === visibleFields.length && visibleFields.length > 0,
      boq_row_count: recipeRows.length,
      boq_row_types: rowTypes,
      rows_without_norm_source: rowsWithoutNormSource,
      rows_without_formula: rowsWithoutFormula,
      explicit_technology_graph: explicitTechnologyGraph,
      explicit_inclusion_graph: explicitInclusionGraph,
      five_role_verdict_count: roleVerdicts,
      structural_boq_fingerprint: sha256(recipeRows.map((row) => [
        row.rowType,row.canonicalUnit,row.quantityFormula,row.normSourceId,row.includedInEstimate,row.includedInProcurement,
      ])),
      parameter_contract_fingerprint: sha256(fields.map((field) => [
        field.key,field.unit,field.required,field.inputKind,field.affectsRowIds,field.formulaRefs,
      ])),
      blockers,
    };
    if (index > 0 && index % 100 === 0) {
      clearProfessionalWorkPassportBuildCaches();
      clearAiEstimateParameterSchemaCache();
    }
    return result;
  });
  clearProfessionalWorkPassportBuildCaches();
  clearAiEstimateParameterSchemaCache();
  const complete = rows.filter((row) => row.blockers.length === 0).length;
  const summary = {
    schema_version: "p0-one-monolith-r57-global-professional-completeness-source-census.v1",
    spec_sha256: SPEC_SHA256,
    ...binding,
    captured_at: new Date().toISOString(),
    elapsed_ms: Date.now() - startedAt,
    catalog_total: rows.length,
    professional_complete: complete,
    works_with_parameter_schema: rows.filter((row) => "parameter_count" in row && Number(row.parameter_count) > 0).length,
    works_with_work_specific_primary_quantity: rows.filter((row) => row.work_specific_primary_quantity_ready === true).length,
    works_with_compact_hint_contract: rows.filter((row) => row.compact_hint_contract_ready === true).length,
    works_with_explicit_technology_graph: rows.filter((row) => row.explicit_technology_graph === true).length,
    works_with_explicit_inclusion_graph: rows.filter((row) => row.explicit_inclusion_graph === true).length,
    works_with_five_role_verdicts: rows.filter((row) => row.five_role_verdict_count === 5).length,
    total_boq_rows: rows.reduce((sum, row) => sum + Number(row.boq_row_count ?? 0), 0),
    ledger_sha256: sha256(rows),
    status: complete === EXPECTED_GLOBAL_TOTAL
      ? "GREEN_R57_GLOBAL_SOURCE_PROFESSIONAL_COMPLETENESS"
      : "RED_R57_GLOBAL_SOURCE_PROFESSIONAL_COMPLETENESS_REPAIR_REQUIRED",
  };
  writeJsonl(SOURCE_LEDGER, rows);
  writeJson(SOURCE_SUMMARY, summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

async function databaseCensus(): Promise<void> {
  const binding = currentBinding();
  const client = new Client({ connectionString: DATABASE_URL, application_name: "r57-professional-completeness-read-only" });
  await client.connect();
  try {
    await client.query("begin read only isolation level repeatable read");
    const release = (await client.query("select * from estimate_definition_release where status='active'")).rows[0] as Json | undefined;
    if (release?.id !== EXPECTED_RELEASE_ID) throw new Error(`R57_ACTIVE_RELEASE_DRIFT:${release?.id}`);
    const rows = (await client.query(`
      with d as (
        select * from estimate_definition_version where release_id=$1
      ), p as (
        select definition_version_id,count(*)::integer parameter_count,
          count(*) filter(where required)::integer required_count,
          count(*) filter(where default_value is not null)::integer default_count,
          count(*) filter(where truth_metadata ? 'compactHintRu' or truth_metadata ? 'guideKind')::integer guided_count
        from estimate_parameter_definition where definition_version_id in (select id from d) group by definition_version_id
      ), f as (
        select definition_version_id,count(*)::integer formula_count,
          count(*) filter(where coalesce(array_length(input_parameter_ids,1),0)>0)::integer formulas_with_inputs
        from estimate_formula_graph where definition_version_id in (select id from d) group by definition_version_id
      ), r as (
        select definition_version_id,count(*)::integer resource_count,
          count(*) filter(where inclusion_ast is not null and inclusion_ast<>'{}'::jsonb)::integer inclusion_graph_rows,
          count(*) filter(where resource_graph is not null and resource_graph<>'{}'::jsonb)::integer resource_graph_rows,
          count(*) filter(where nullif(btrim(coalesce(semantic_owner,'')),'') is null)::integer blank_owner_rows
        from estimate_resource_spec where definition_version_id in (select id from d) group by definition_version_id
      ), b as (
        select definition_version_id,count(*)::integer baseline_count
        from estimate_approved_template_baseline where definition_version_id in (select id from d) group by definition_version_id
      ), n as (
        select definition_version_id,count(*)::integer norm_binding_count
        from estimate_work_normative_binding where definition_version_id in (select id from d) group by definition_version_id
      )
      select d.id definition_version_id,d.catalog_id,d.definition_version,d.passport,d.applicability,d.definition_sha256,d.source_metadata,
        coalesce(p.parameter_count,0) parameter_count,coalesce(p.required_count,0) required_count,
        coalesce(p.default_count,0) default_count,coalesce(p.guided_count,0) guided_count,
        coalesce(f.formula_count,0) formula_count,coalesce(f.formulas_with_inputs,0) formulas_with_inputs,
        coalesce(r.resource_count,0) resource_count,coalesce(r.inclusion_graph_rows,0) inclusion_graph_rows,
        coalesce(r.resource_graph_rows,0) resource_graph_rows,coalesce(r.blank_owner_rows,0) blank_owner_rows,
        coalesce(b.baseline_count,0) baseline_count,coalesce(n.norm_binding_count,0) norm_binding_count
      from d left join p on p.definition_version_id=d.id left join f on f.definition_version_id=d.id
      left join r on r.definition_version_id=d.id left join b on b.definition_version_id=d.id
      left join n on n.definition_version_id=d.id order by d.catalog_id
    `, [release.id])).rows as Json[];
    if (rows.length !== EXPECTED_BATCH008_TOTAL || new Set(rows.map((row) => row.catalog_id)).size !== EXPECTED_BATCH008_TOTAL) {
      throw new Error(`R57_BATCH008_DENOMINATOR:${rows.length}/${EXPECTED_BATCH008_TOTAL}`);
    }
    const ledger = rows.map((row) => {
      const blockers = [
        row.parameter_count > 0 ? "" : "parameter_schema_empty",
        row.formula_count > 0 ? "" : "formula_graph_empty",
        row.resource_count > 0 ? "" : "resource_graph_empty",
        row.inclusion_graph_rows === row.resource_count ? "" : `inclusion_graph_incomplete:${row.inclusion_graph_rows}/${row.resource_count}`,
        row.resource_graph_rows === row.resource_count ? "" : `resource_graph_incomplete:${row.resource_graph_rows}/${row.resource_count}`,
        row.norm_binding_count > 0 ? "" : "norm_binding_missing",
        row.baseline_count > 0 ? "" : "authoritative_baseline_missing",
        row.guided_count === row.parameter_count ? "" : `compact_hint_contract_missing:${row.guided_count}/${row.parameter_count}`,
        row.blank_owner_rows > 0 ? `blank_semantic_owner:${row.blank_owner_rows}` : "",
        "five_role_verdicts_missing:0/5",
      ].filter(Boolean);
      return {
        catalog_id: row.catalog_id,
        definition_version_id: row.definition_version_id,
        definition_version: row.definition_version,
        passport_id: row.passport?.passportId ?? null,
        calculation_strategy_id: row.passport?.calculationStrategyId ?? null,
        operation_class: row.applicability?.operationClass ?? null,
        parameter_count: row.parameter_count,
        required_parameter_count: row.required_count,
        declared_default_count: row.default_count,
        compact_hint_count: row.guided_count,
        formula_count: row.formula_count,
        formulas_with_inputs: row.formulas_with_inputs,
        resource_count: row.resource_count,
        inclusion_graph_rows: row.inclusion_graph_rows,
        resource_graph_rows: row.resource_graph_rows,
        norm_binding_count: row.norm_binding_count,
        authoritative_baseline_count: row.baseline_count,
        blank_semantic_owner_rows: row.blank_owner_rows,
        five_role_verdict_count: 0,
        definition_sha256: row.definition_sha256,
        blockers,
      };
    });
    const complete = ledger.filter((row) => row.blockers.length === 0).length;
    const summary = {
      schema_version: "p0-one-monolith-r57-batch001-008-professional-completeness-census.v1",
      spec_sha256: SPEC_SHA256,
      ...binding,
      captured_at: new Date().toISOString(),
      database: "batch009_fire_r5_a",
      active_release_id: release.id,
      catalog_total: ledger.length,
      professional_complete: complete,
      authoritative_baseline_ready: ledger.filter((row) => row.authoritative_baseline_count > 0).length,
      compact_hint_contract_ready: ledger.filter((row) => row.compact_hint_count === row.parameter_count).length,
      inclusion_graph_complete: ledger.filter((row) => row.inclusion_graph_rows === row.resource_count).length,
      resource_graph_complete: ledger.filter((row) => row.resource_graph_rows === row.resource_count).length,
      norm_binding_present: ledger.filter((row) => row.norm_binding_count > 0).length,
      blank_semantic_owner_rows: ledger.reduce((sum, row) => sum + row.blank_semantic_owner_rows, 0),
      source_database_writes: 0,
      ledger_sha256: sha256(ledger),
      status: complete === EXPECTED_BATCH008_TOTAL
        ? "GREEN_R57_BATCH001_008_PROFESSIONAL_COMPLETENESS"
        : "RED_R57_BATCH001_008_PROFESSIONAL_COMPLETENESS_REPAIR_REQUIRED",
    };
    writeJsonl(DATABASE_LEDGER, ledger);
    writeJson(DATABASE_SUMMARY, summary);
    await client.query("commit");
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

function aggregate(): void {
  const source = readJson(SOURCE_SUMMARY);
  const database = readJson(DATABASE_SUMMARY);
  const sourceRows = readJsonl(SOURCE_LEDGER);
  const structural = new Map<string, string[]>();
  const parameters = new Map<string, string[]>();
  for (const row of sourceRows) {
    const add = (map: Map<string, string[]>, key: string) => map.set(key, [...(map.get(key) ?? []), String(row.catalog_id)]);
    add(structural, String(row.structural_boq_fingerprint));
    add(parameters, String(row.parameter_contract_fingerprint));
  }
  const cloned = (map: Map<string, string[]>) => [...map.values()].filter((ids) => ids.length > 1);
  const summary = {
    schema_version: "p0-one-monolith-r57-professional-completeness-census.v1",
    spec_sha256: SPEC_SHA256,
    captured_at: new Date().toISOString(),
    global_catalog: source.catalog_total,
    batch001_008_catalog: database.catalog_total,
    global_professional_complete: `${source.professional_complete}/${EXPECTED_GLOBAL_TOTAL}`,
    batch001_008_professional_complete: `${database.professional_complete}/${EXPECTED_BATCH008_TOTAL}`,
    global_work_specific_primary_quantity: `${source.works_with_work_specific_primary_quantity}/${EXPECTED_GLOBAL_TOTAL}`,
    global_compact_hint_contract: `${source.works_with_compact_hint_contract}/${EXPECTED_GLOBAL_TOTAL}`,
    global_explicit_technology_graph: `${source.works_with_explicit_technology_graph}/${EXPECTED_GLOBAL_TOTAL}`,
    global_explicit_inclusion_graph: `${source.works_with_explicit_inclusion_graph}/${EXPECTED_GLOBAL_TOTAL}`,
    global_five_role_verdicts: `${source.works_with_five_role_verdicts}/${EXPECTED_GLOBAL_TOTAL}`,
    structural_clone_groups_observed: cloned(structural).length,
    parameter_contract_clone_groups_observed: cloned(parameters).length,
    batch001_008_authoritative_baseline: `${database.authoritative_baseline_ready}/${EXPECTED_BATCH008_TOTAL}`,
    batch001_008_compact_hint_contract: `${database.compact_hint_contract_ready}/${EXPECTED_BATCH008_TOTAL}`,
    batch001_008_inclusion_graph_complete: `${database.inclusion_graph_complete}/${EXPECTED_BATCH008_TOTAL}`,
    batch001_008_resource_graph_complete: `${database.resource_graph_complete}/${EXPECTED_BATCH008_TOTAL}`,
    batch001_008_norm_binding_present: `${database.norm_binding_present}/${EXPECTED_BATCH008_TOTAL}`,
    source_database_writes: 0,
    status: "RED_R57_PROFESSIONAL_COMPLETENESS_REPAIR_QUEUE_REQUIRED",
  };
  writeJson(path.join(ROOT, "PROFESSIONAL_COMPLETENESS_CENSUS_4272_11610.json"), summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

if (MODE === "source") sourceCensus();
else if (MODE === "database") void databaseCensus();
else aggregate();
