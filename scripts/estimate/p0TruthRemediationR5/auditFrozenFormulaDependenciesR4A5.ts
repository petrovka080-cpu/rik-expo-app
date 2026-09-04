import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { canonicalFixedQuantityStatedBySource } from "../../../src/lib/estimate/backendPlatform/canonicalFormulaSourceBinding";

type Json = Record<string, any>;

const MASTER_PATH = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R5_6_8_RC09_R4_A5_EXACT_VERTICAL_CATEGORY_ROWS_CONFIRM_RUNTIME_DURABILITY_CANONICAL_MONOLITH_GLOBAL_CLOSEOUT_RU.md",
);
const MASTER_SHA256 = "2e668d93b531acab14636f02df9528164ba844404021d5c96ce93533c180e7a1";
const DEFAULT_DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const DEFAULT_RELEASE_ID = "ef7e4516-82e0-5a12-a495-22c3900034cc";
const DEFAULT_OUTPUT = resolve(
  ".release-runtime/r568/rc09-r4-production-closeout/r4-a5-exact-ui-confirm-durability-1/11_FROZEN_FORMULA_DEPENDENCY_AUDIT.json",
);

function argument(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  return process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

async function main(): Promise<void> {
  if (sha256(readFileSync(MASTER_PATH)) !== MASTER_SHA256) {
    throw new Error("R4_A5_MASTER_SHA256_DRIFT");
  }
  const databaseUrl = argument("database-url", process.env.ESTIMATE_MIGRATION_DATABASE_URL ?? DEFAULT_DATABASE_URL);
  const releaseId = argument("release-id", DEFAULT_RELEASE_ID);
  const output = resolve(argument("output", DEFAULT_OUTPUT));
  const client = new Client({ connectionString: databaseUrl, application_name: "r4-a5-frozen-formula-read-only-audit" });
  await client.connect();
  try {
    await client.query("begin read only");
    await client.query("set local statement_timeout='300s'");
    const release = (await client.query(
      "select id,release_key,status,definition_count,source_commit,source_tree from public.estimate_definition_release where id=$1",
      [releaseId],
    )).rows[0] as Json | undefined;
    if (!release) throw new Error("R4_A5_DEFINITION_RELEASE_MISSING");
    const definitions = (await client.query(`
      with definitions as (
        select manifest.catalog_id,manifest.definition_version_id
        from public.estimate_cumulative_manifest_entry manifest
        where manifest.release_id=$1 and manifest.baseline_ready and manifest.scenario_ready
      ), formula_stats as (
        select definition.catalog_id,definition.definition_version_id,
          count(formula.formula_id)::int formula_count,
          count(formula.formula_id) filter(where cardinality(formula.input_parameter_ids)>0)::int dynamic_formula_count
        from definitions definition
        join public.estimate_formula_graph formula on formula.definition_version_id=definition.definition_version_id
        group by definition.catalog_id,definition.definition_version_id
      ), parameter_stats as (
        select definition_version_id,
          count(*) filter(where truth_metadata->>'visibility_role'='USER_INPUT'
            and value_type in ('decimal','integer','number'))::int numeric_user_input_count
        from public.estimate_parameter_definition
        where definition_version_id=any(select definition_version_id from definitions)
        group by definition_version_id
      )
      select formula_stats.*,coalesce(parameter_stats.numeric_user_input_count,0)::int numeric_user_input_count
      from formula_stats left join parameter_stats using(definition_version_id)
      order by formula_stats.catalog_id
    `, [releaseId])).rows as Json[];
    const frozen = definitions.filter((row) => Number(row.formula_count) > 0
      && Number(row.dynamic_formula_count) === 0
      && Number(row.numeric_user_input_count) > 0);
    const entries: Json[] = [];
    for (const definition of frozen) {
      const formulas = (await client.query(`
        select resource.row_id,resource.title_ru,resource.unit_id,resource.formula_id,
          resource.source_metadata->>'originalQuantityFormula' original_source,
          formula.expression_source runtime_source,formula.input_parameter_ids
        from public.estimate_resource_spec resource
        join public.estimate_formula_graph formula
          on formula.definition_version_id=resource.definition_version_id
          and formula.formula_id=resource.formula_id
        where resource.definition_version_id=$1
        order by resource.ordinal
      `, [definition.definition_version_id])).rows as Json[];
      const lostDependencies = formulas.filter((formula) => {
        const originalSource = String(formula.original_source ?? "").trim();
        return originalSource
          && (formula.input_parameter_ids?.length ?? 0) === 0
          && canonicalFixedQuantityStatedBySource(originalSource) == null;
      });
      entries.push({
        catalogId: definition.catalog_id,
        definitionVersionId: definition.definition_version_id,
        formulaCount: definition.formula_count,
        dynamicFormulaCount: definition.dynamic_formula_count,
        numericUserInputCount: definition.numeric_user_input_count,
        lostDependencyCount: lostDependencies.length,
        lostDependencies,
        disposition: "QUARANTINE_UNTIL_IMMUTABLE_FORMULA_SUCCESSOR",
      });
    }
    await client.query("rollback");
    const proof = {
      schemaVersion: "r4-a5-frozen-formula-dependency-audit.v1",
      capturedAt: new Date().toISOString(),
      master: { path: MASTER_PATH, sha256: MASTER_SHA256 },
      release,
      denominator: {
        definitionCount: definitions.length,
        frozenDefinitionCount: entries.length,
        dynamicDefinitionCount: definitions.filter((row) => Number(row.dynamic_formula_count) > 0).length,
        lostDependencyRowCount: entries.reduce((sum, entry) => sum + Number(entry.lostDependencyCount), 0),
      },
      entries,
      invariant: "A computational source formula may never be persisted without its parameter dependencies.",
      runtimeDisposition: entries.length === 0 ? "GREEN" : "RED_QUARANTINE_REQUIRED",
      productionReady: false,
    };
    atomicJson(output, proof);
    process.stdout.write(`${JSON.stringify({ output, denominator: proof.denominator, status: proof.runtimeDisposition })}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
