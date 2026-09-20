import { Client } from "pg";

const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const DEFINITION_RELEASE_ID = process.env.R4A13_DEFINITION_RELEASE_ID
  ?? "8fa03215-2a56-5016-afaf-b216511b3a3e";
const CATALOG_ID = process.env.R4A13_CATALOG_ID
  ?? "canonical-work:expanded:foundation_pile_field";

async function main(): Promise<void> {
  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "r4a13-inspect-master-bored-pile-candidate",
  });
  await client.connect();
  try {
    const definition = (await client.query(`
      select definition.id::text,
             definition.catalog_id,
             definition.definition_version,
             definition.content_status,
             definition.content_gate_status,
             manifest.source_batch,
             identity.title_ru,
             definition.passport ->> 'canonicalRuName' as canonical_ru_name,
             definition.passport ->> 'physicalResultRu' as physical_result_ru
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition
        on definition.id = manifest.definition_version_id
      join public.estimate_work_identity identity
        on identity.catalog_id = manifest.catalog_id
      where manifest.release_id = $1
        and manifest.catalog_id = $2
    `, [DEFINITION_RELEASE_ID, CATALOG_ID])).rows[0];
    if (!definition) throw new Error(`definition missing: ${CATALOG_ID}`);

    const parameters = (await client.query(`
      select parameter_id,
             title_ru,
             value_type,
             unit_id,
             required,
             default_value,
             constraints_json
      from public.estimate_parameter_definition
      where definition_version_id = $1
      order by ordinal
    `, [definition.id])).rows;
    const resources = (await client.query(`
      select resource.ordinal,
             resource.row_id,
             resource.title_ru,
             resource.unit_id,
             resource.category,
             resource.row_type,
             resource.formula_id,
             formula.expression_source,
             resource.inclusion_ast
      from public.estimate_resource_spec resource
      join public.estimate_formula_graph formula
        on formula.definition_version_id = resource.definition_version_id
       and formula.formula_id = resource.formula_id
      where resource.definition_version_id = $1
      order by resource.ordinal
    `, [definition.id])).rows;

    process.stdout.write(`${JSON.stringify({
      definitionReleaseId: DEFINITION_RELEASE_ID,
      definition,
      parameters,
      resources,
    }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
