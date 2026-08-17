import { readFile } from "node:fs/promises";
import { Client } from "pg";

const DATABASE_URL = process.env.R45_FULL_ACCEPTANCE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/p0_r45_acceptance_full_20260817";
const BACKEND_R2_MIGRATION_PATH = "supabase/migrations/20260814190000_estimate_canonical_backend_platform_r2.sql";
const MIGRATION_PATH = "supabase/migrations/20260817230000_p0_estimate_truth_remediation_r1.sql";

async function main(): Promise<void> {
  const parsed = new URL(DATABASE_URL);
  if (!(["127.0.0.1", "localhost"].includes(parsed.hostname)
    && parsed.port === "55432"
    && parsed.pathname === "/p0_r45_acceptance_full_20260817")) {
    throw new Error("R45_FULL_ACCEPTANCE_DATABASE_GUARD_REJECTED");
  }
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query("create schema if not exists extensions");
    const extensions = await client.query<{ extname: string; nspname: string }>(`
      select e.extname,n.nspname
      from pg_extension e
      join pg_namespace n on n.oid=e.extnamespace
      where e.extname in ('pgcrypto','pg_trgm')
    `);
    for (const extension of extensions.rows) {
      if (extension.nspname !== "extensions") {
        await client.query(`alter extension ${extension.extname} set schema extensions`);
      }
    }
    const backendR2Function = await client.query<{ present: string | null }>(
      "select to_regprocedure('public.estimate_fail_compile_job_v2(uuid,text,text,jsonb,boolean,integer)')::text present",
    );
    if (!backendR2Function.rows[0]?.present) {
      await client.query((await readFile(BACKEND_R2_MIGRATION_PATH)).toString("utf8"));
    }
    const searchTable = await client.query<{ present: string | null }>(
      "select to_regclass('public.estimate_search_index_release')::text present",
    );
    if (!searchTable.rows[0]?.present) {
      await client.query((await readFile(MIGRATION_PATH)).toString("utf8"));
    }
    const searchReleaseCount = Number((await client.query(
      "select count(*)::integer count from public.estimate_search_index_release",
    )).rows[0]?.count ?? 0);
    if (searchReleaseCount > 0) {
      await client.query(`
        update public.estimate_search_document d
        set publication_state = 'ADMITTED_BACKEND',
            definition_release_id = v.release_id
        from public.estimate_definition_version v
        join public.estimate_definition_release r on r.id=v.release_id and r.status='active'
        where d.catalog_id=v.catalog_id
      `);
      await client.query(`
        update public.estimate_search_document d
        set publication_state = 'PRELIMINARY_NOT_CANONICAL',
            definition_release_id = null
        where not exists (
          select 1
          from public.estimate_definition_version v
          join public.estimate_definition_release r on r.id=v.release_id and r.status='active'
          where v.catalog_id=d.catalog_id
        )
      `);
      await client.query(`
        update public.estimate_search_index_release
        set metadata = metadata || jsonb_build_object(
          'full_acceptance_contour', true,
          'search_only', false,
          'compile_admission_reconciled_to_active_definition_release', true
        )
        where status='active'
      `);
    }
    const counts = await client.query<{
      identities: number;
      definitions: number;
      parameters: number;
      resources: number;
      revisions: number;
      artifacts: number;
      drafts: number;
      search_releases: number;
      admitted_search_documents: number;
      preliminary_search_documents: number;
    }>(`
      select
        (select count(*)::integer from public.estimate_work_identity) identities,
        (select count(*)::integer from public.estimate_definition_version) definitions,
        (select count(*)::integer from public.estimate_parameter_definition) parameters,
        (select count(*)::integer from public.estimate_resource_spec) resources,
        (select count(*)::integer from public.estimate_revision) revisions,
        (select count(*)::integer from public.estimate_revision_artifact) artifacts,
        (select count(*)::integer from public.estimate_draft) drafts,
        (select count(*)::integer from public.estimate_search_index_release) search_releases,
        (select count(*)::integer from public.estimate_search_document where publication_state='ADMITTED_BACKEND') admitted_search_documents,
        (select count(*)::integer from public.estimate_search_document where publication_state='PRELIMINARY_NOT_CANONICAL') preliminary_search_documents
    `);
    process.stdout.write(`${JSON.stringify({
      status: "R45_FULL_ACCEPTANCE_SCHEMA_READY",
      database: parsed.pathname.slice(1),
      sourceTemplate: "master11610_r1",
      searchOnly: false,
      counts: counts.rows[0],
    }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
