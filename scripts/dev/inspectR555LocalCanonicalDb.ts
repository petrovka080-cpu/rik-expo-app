import { Client } from "pg";

const DATABASE_URL = process.env.R555_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";

async function main(): Promise<void> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const releases = await client.query(`
      select id::text, release_key, status, definition_count, parameter_count,
             formula_count, resource_row_count, parent_release_id::text, created_at
      from public.estimate_definition_release
      order by created_at desc
      limit 20
    `);
    const capabilityColumns = await client.query(`
      select column_name
      from information_schema.columns
      where table_schema = 'public' and table_name = 'estimate_candidate_capability_r3'
      order by ordinal_position
    `);
    const capabilities = await client.query(`
      select to_jsonb(c) capability, r.release_key, r.status release_status
      from public.estimate_candidate_capability_r3 c
      join public.estimate_definition_release r on r.id = c.release_id
      order by c.created_at desc
      limit 20
    `);
    const targets = await client.query(`
      select v.id::text definition_version_id, v.release_id::text, r.release_key, r.status release_status,
             v.catalog_id, w.title_ru, jsonb_array_length(coalesce(v.passport->'components', '[]'::jsonb)) passport_components,
             (select count(*)::integer from public.estimate_parameter_definition p where p.definition_version_id = v.id) parameter_count,
             (select count(*)::integer from public.estimate_resource_spec s where s.definition_version_id = v.id) resource_count
      from public.estimate_definition_version v
      join public.estimate_definition_release r on r.id = v.release_id
      join public.estimate_work_identity w on w.catalog_id = v.catalog_id
      where v.catalog_id in (
        'concrete_foundation_interior_anchor_group_pour_high_load',
        'concrete_foundation_interior_belt_pour_repair'
      )
      order by r.created_at desc, v.catalog_id
    `);
    const targetManifests = await client.query(`
      select m.release_id::text, r.release_key, m.catalog_id, m.definition_version_id::text,
             m.approved_template_baseline_id::text, b.input_values, b.parameter_schema_sha256,
             m.baseline_ready, m.scenario_ready
      from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_release r on r.id = m.release_id
      left join public.estimate_approved_template_baseline b on b.id = m.approved_template_baseline_id
      where m.catalog_id in (
        'concrete_foundation_interior_anchor_group_pour_high_load',
        'concrete_foundation_interior_belt_pour_repair'
      )
      order by r.created_at desc, m.catalog_id
      limit 20
    `);
    const priceSnapshots = await client.query(`
      select s.id::text, s.snapshot_key, s.captured_at, s.valid_until, s.currency_code,
             r.route_key, r.region_code, r.source_kind,
             (select count(*)::integer from public.estimate_price_snapshot_item i where i.snapshot_id = s.id) item_count
      from public.estimate_price_snapshot s
      join public.estimate_price_route r on r.id = s.route_id
      order by s.captured_at desc
      limit 30
    `);
    process.stdout.write(`${JSON.stringify({
      releases: releases.rows,
      capability_columns: capabilityColumns.rows,
      capabilities: capabilities.rows,
      targets: targets.rows,
      target_manifests: targetManifests.rows,
      price_snapshots: priceSnapshots.rows,
    }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
