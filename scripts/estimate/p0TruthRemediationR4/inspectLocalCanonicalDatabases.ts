import { Client } from "pg";

const HOST = "127.0.0.1";
const PORT = "55432";
const TARGET_CATALOG_ID = process.env.R45_INSPECT_CATALOG_ID
  ?? "flooring_interior_laminate_install_large_area";

async function main() {
  const root = new Client({ connectionString: `postgresql://postgres@${HOST}:${PORT}/postgres` });
  await root.connect();
  const databases = (await root.query<{ datname: string }>(`
    select datname from pg_database
    where datistemplate=false and (datname like 'master11610%' or datname like 'p0_r4%')
    order by datname
  `)).rows.map((row) => row.datname);
  await root.end();
  const output: Array<Record<string, unknown>> = [];
  for (const database of databases) {
    const client = new Client({ connectionString: `postgresql://postgres@${HOST}:${PORT}/${database}` });
    await client.connect();
    try {
      const present = Boolean((await client.query(
        "select to_regclass('public.estimate_definition_version')::text value",
      )).rows[0]?.value);
      if (!present) {
        output.push({ database, canonicalSchema: false });
        continue;
      }
      const counts = (await client.query(`select
        (select count(*)::integer from public.estimate_work_identity) identities,
        (select count(*)::integer from public.estimate_definition_version) definitions,
        (select count(*)::integer from public.estimate_definition_version d join public.estimate_definition_release r on r.id=d.release_id where r.status='active') active_definitions,
        (select count(*)::integer from public.estimate_resource_spec) resources
      `)).rows[0];
      const exact = (await client.query(`
        select wi.catalog_id,wi.title_ru,dv.release_id,r.status
        from public.estimate_work_identity wi
        left join public.estimate_definition_version dv on dv.catalog_id=wi.catalog_id
        left join public.estimate_definition_release r on r.id=dv.release_id
        where wi.catalog_id=$1 or wi.work_key=$1
        order by r.status='active' desc nulls last
      `, [TARGET_CATALOG_ID])).rows;
      output.push({ database, canonicalSchema: true, ...counts, exact });
    } catch (error) {
      output.push({ database, error: error instanceof Error ? error.message : String(error) });
    } finally {
      await client.end();
    }
  }
  process.stdout.write(`${JSON.stringify({ targetCatalogId: TARGET_CATALOG_ID, databases: output }, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
