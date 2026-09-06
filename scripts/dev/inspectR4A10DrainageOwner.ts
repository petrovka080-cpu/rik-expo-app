import { Client } from "pg";

const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const DEFINITION_RELEASE_ID = "d12a3ad5-10e1-5381-af18-7f2a56f899f7";
const SEARCH_RELEASE_ID = "5ff23280-4915-58a0-b9df-1214b45c6490";
const EXACT_FRAGMENT_ID = "canonical-work:base:paving_roads_landscape_interior_asphalt_drain_large_area";

async function main(): Promise<void> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    if (process.argv.includes("--summary")) {
      const release = await client.query(`select id::text,status,definition_count,parameter_count,formula_count,
          resource_row_count,(select count(*)::int from public.estimate_cumulative_manifest_entry manifest
            where manifest.release_id=estimate_definition_release.id) manifest_count
        from public.estimate_definition_release where id=$1`, [DEFINITION_RELEASE_ID]);
      const target = await client.query(`select manifest.definition_version_id::text,
          (select count(*)::int from public.estimate_parameter_definition parameter where parameter.definition_version_id=manifest.definition_version_id) parameters,
          (select count(*)::int from public.estimate_formula_graph formula where formula.definition_version_id=manifest.definition_version_id) formulas,
          (select count(*)::int from public.estimate_resource_spec resource where resource.definition_version_id=manifest.definition_version_id) resources,
          manifest.approved_template_baseline_id::text
        from public.estimate_cumulative_manifest_entry manifest where manifest.release_id=$1 and manifest.catalog_id=$2`,
      [DEFINITION_RELEASE_ID, EXACT_FRAGMENT_ID]);
      process.stdout.write(`${JSON.stringify({ release: release.rows[0], target: target.rows[0] }, null, 2)}\n`);
      return;
    }
    const search = await client.query(`
      select catalog_id, canonical_name_ru, primary_uom, selectable, adjudication_class,
             canonical_target_catalog_id, replacement_catalog_id, required_inputs_count,
             clarification_fields, included_boundaries, excluded_boundaries
      from public.estimate_search_document
      where search_release_id = $1
        and (catalog_id = $2 or normalized_search_blob like '%водоотвод%'
          or normalized_search_blob like '%ливнев%' or normalized_search_blob like '%дренаж%')
      order by (catalog_id = $2) desc, selectable desc, catalog_id
      limit 100
    `, [SEARCH_RELEASE_ID, EXACT_FRAGMENT_ID]);
    const definitions = await client.query(`
      select manifest.catalog_id, manifest.definition_version_id::text,
             definition.definition_version, definition.content_status, definition.content_gate_status,
             identity.title_ru, definition.passport->>'canonicalRuName' canonical_ru_name,
             definition.passport->>'physicalResultRu' physical_result_ru,
             (select count(*)::int from public.estimate_parameter_definition parameter
               where parameter.definition_version_id = manifest.definition_version_id) parameter_count,
             (select count(*)::int from public.estimate_formula_graph formula
               where formula.definition_version_id = manifest.definition_version_id) formula_count,
             (select count(*)::int from public.estimate_resource_spec resource
               where resource.definition_version_id = manifest.definition_version_id) resource_count,
             baseline.input_values baseline_inputs
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition on definition.id = manifest.definition_version_id
      join public.estimate_work_identity identity on identity.catalog_id = manifest.catalog_id
      left join public.estimate_approved_template_baseline baseline
        on baseline.id = manifest.approved_template_baseline_id
      where manifest.release_id = $1
        and (manifest.catalog_id = $2
          or lower(identity.title_ru) like '%водоотвод%'
          or lower(identity.title_ru) like '%ливнев%'
          or lower(identity.title_ru) like '%дренаж%'
          or lower(coalesce(definition.passport->>'canonicalRuName', '')) like '%водоотвод%'
          or lower(coalesce(definition.passport->>'canonicalRuName', '')) like '%ливнев%'
          or lower(coalesce(definition.passport->>'canonicalRuName', '')) like '%дренаж%')
      order by (manifest.catalog_id = $2) desc, manifest.catalog_id
      limit 100
    `, [DEFINITION_RELEASE_ID, EXACT_FRAGMENT_ID]);
    const exact = definitions.rows.find((row) => row.catalog_id === EXACT_FRAGMENT_ID);
    const exactDetails = exact
      ? {
          parameters: (await client.query(`select parameter_id, title_ru, value_type, unit_id, required,
              default_value, constraints_json, truth_metadata
            from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal`,
          [exact.definition_version_id])).rows,
          formulaSummary: (await client.query(`select count(*)::int count,
              array_agg(distinct output_unit_id order by output_unit_id) output_units
            from public.estimate_formula_graph where definition_version_id=$1`,
          [exact.definition_version_id])).rows[0],
          resourceSummary: (await client.query(`select category, count(*)::int count,
              count(*) filter(where procurement_eligible)::int procurement,
              array_agg(title_ru order by ordinal) filter(where ordinal < 12) first_titles
            from public.estimate_resource_spec where definition_version_id=$1 group by category order by category`,
          [exact.definition_version_id])).rows,
          forbiddenRows: (await client.query(`select row_id, category, title_ru from public.estimate_resource_spec
            where definition_version_id=$1 and (lower(title_ru) similar to '%(налог|сметн|администр|исполнительн|чек-лист|комплектност|контрол)%')
            order by ordinal`, [exact.definition_version_id])).rows,
        }
      : null;
    process.stdout.write(`${JSON.stringify({
      exactSearch: search.rows.find((row) => row.catalog_id === EXACT_FRAGMENT_ID),
      candidateSearch: search.rows.filter((row) => row.catalog_id !== EXACT_FRAGMENT_ID).map((row) => ({
        catalog_id: row.catalog_id,
        canonical_name_ru: row.canonical_name_ru,
        primary_uom: row.primary_uom,
        canonical_target_catalog_id: row.canonical_target_catalog_id,
      })),
      definitions: definitions.rows,
      exactDetails,
    }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
