import { Pool } from "pg";

const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const fragments = process.argv.slice(2).map((value) => value.trim().toLocaleLowerCase("ru")).filter(Boolean);
if (fragments.length === 0) fragments.push("асфа", "асфальт", "водо", "элект");

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL, max: 1 });
  try {
    const releases = await pool.query(`
      select id::text,status,created_at,activated_at,
        (select count(*)::int from public.estimate_search_document d where d.search_release_id=r.id) document_count
      from public.estimate_search_index_release r
      order by created_at desc
    `);
    const targetSearchReleaseId = String(releases.rows[0]?.id ?? "");
    const domainDistribution = targetSearchReleaseId
      ? await pool.query(
          `select domain_id,count(*)::int documents,
            count(*) filter(where adjudication_class='EFFECTIVE_WORK' and selectable)::int selectable,
            (array_agg(canonical_name_ru order by canonical_name_ru))[1:5] sample_titles
          from public.estimate_search_document where search_release_id=$1
          group by domain_id order by domain_id`,
          [targetSearchReleaseId],
        )
      : { rows: [] };
    const definitionReleases = await pool.query(`
      select r.id::text,r.release_key,r.status,r.definition_count,r.parent_release_id::text,
        (select count(*)::int from public.estimate_definition_version v where v.release_id=r.id) direct_definitions,
        (select count(*)::int from public.estimate_cumulative_manifest_entry m where m.release_id=r.id) manifest_definitions
      from public.estimate_definition_release r order by r.created_at desc limit 20
    `);
    const manifestDomains = await pool.query(`
      select release_id::text,domain_id,count(*)::int definitions,
        count(*) filter(where baseline_ready and scenario_ready)::int ready
      from public.estimate_cumulative_manifest_entry
      group by release_id,domain_id order by release_id,domain_id
    `);
    const asphaltIdentities = await pool.query(`
      select catalog_id,title_ru,namespace,denominator_eligible
      from public.estimate_work_identity where domain='asphalt'
      order by catalog_id
    `);
    const candidateCapabilities = await pool.query(`
      select id::text,environment,tenant_id::text,release_id::text,
        search_release_id::text,expires_at,purpose,source_head,source_tree,
        revoked_at
      from public.estimate_candidate_capability_r3
      order by created_at desc
      limit 50
    `);
    const matches = [];
    for (const fragment of fragments) {
      const identities = await pool.query(
        `select catalog_id,title_ru,domain,denominator_eligible
        from public.estimate_work_identity
        where position($1 in lower(coalesce(title_ru,'')))>0
        order by title_ru,catalog_id limit 20`,
        [fragment],
      );
      const result = await pool.query(
        `select r.id::text release_id,r.status,count(d.catalog_id)::int matched,
          count(*) filter(where d.adjudication_class='EFFECTIVE_WORK' and d.selectable)::int selectable,
          array_agg(d.canonical_name_ru order by d.canonical_name_ru) filter(where d.canonical_name_ru is not null) titles
        from public.estimate_search_index_release r
        left join public.estimate_search_document d on d.search_release_id=r.id
          and position($1 in d.normalized_search_blob)>0
        group by r.id,r.status,r.created_at
        order by r.created_at desc`,
        [fragment],
      );
      matches.push({
        fragment,
        identity_count_sampled: identities.rowCount,
        identity_sample: identities.rows,
        releases: result.rows.map((row) => ({
          release_id: row.release_id,
          status: row.status,
          matched: Number(row.matched),
          selectable: Number(row.selectable),
          sample_titles: (row.titles ?? []).slice(0, 5),
        })),
      });
    }
    process.stdout.write(`${JSON.stringify({ status: "READ_ONLY_SEARCH_INVENTORY", releases: releases.rows, domain_distribution: domainDistribution.rows, definition_releases: definitionReleases.rows, manifest_domains: manifestDomains.rows, asphalt_identities: asphaltIdentities.rows, candidate_capabilities: candidateCapabilities.rows, matches })}\n`);
  } finally {
    await pool.end();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
