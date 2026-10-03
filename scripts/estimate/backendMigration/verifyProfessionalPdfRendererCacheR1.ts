import { strict as assert } from "node:assert";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

// A bounded owned local DB verification. All test mutations, including the
// migration itself, roll back. Applying installs the checked function only.
const migrationPath = "supabase/migrations/20261003073000_professional_pdf_renderer_revision_cache.sql";
const sql = readFileSync(resolve(migrationPath), "utf8");
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const migrationSha256 = hash(sql);
const functionBody = sql.match(/as \$\$([\s\S]*?)\$\$;/u)?.[1];
assert(functionBody, "migration function body missing");
const connection = process.env.ESTIMATE_MIGRATION_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const url = new URL(connection);
assert(["127.0.0.1", "localhost"].includes(url.hostname) && url.port === "55432"
  && url.pathname === "/rik_r4_runtime_b5_v2", "exact owned local database required");
const revisionId = "6a50cdfe-5b5c-4ca7-ba54-854443eebd16";
const output = resolve(".release-runtime/r568/s27-28/professional-pdf-renderer-cache");
mkdirSync(output, { recursive: true });
const client = new Client({ connectionString: connection, application_name: "owned-renderer-cache-verification" });
const checks: string[] = [];
const fingerprint = async () => {
  const revision = (await client.query("select row_to_json(r)::text body from public.estimate_revision r where id=$1", [revisionId])).rows[0];
  const rows = (await client.query("select row_to_json(r)::text body from public.estimate_revision_row r where revision_id=$1 order by ordinal", [revisionId])).rows;
  return hash(JSON.stringify([revision, rows]));
};
const call = async (key: string, renderer: string) => (await client.query(
  "select * from public.estimate_create_professional_pdf_job_v2($1,$2,$3)", [key, revisionId, renderer])).rows[0];
const expectError = async (name: string, code: string, action: () => Promise<unknown>) => {
  await client.query("savepoint owned_negative_case");
  try { await assert.rejects(action, (error: unknown) => (error as { code: string }).code === code, name); checks.push(name); }
  finally { await client.query("rollback to savepoint owned_negative_case"); }
};

async function main() {
  await client.connect();
  let inTransaction = false;
  try {
    const before = await fingerprint();
    const beforeArtifact = (await client.query("select * from public.estimate_revision_artifact where revision_id=$1 and artifact_kind='professional_pdf'", [revisionId])).rows[0];
    assert(beforeArtifact?.status === "ready", "owned ready native PDF required");
    const jobCount = Number((await client.query("select count(*) n from public.estimate_compile_job")).rows[0].n);
    if (process.argv.includes("--apply-local")) {
      const dry = JSON.parse(readFileSync(resolve(output, "rollback.json"), "utf8"));
      assert(dry.status === "ROLLBACK_GREEN" && dry.migrationSha256 === migrationSha256, "matching completed rollback verification required");
      const existing = (await client.query("select prosrc from pg_proc where oid=to_regprocedure('public.estimate_create_professional_pdf_job_v2(text,uuid,text)')")).rows[0];
      const applied = existing?.prosrc !== functionBody;
      if (applied) await client.query(sql);
      const stored = (await client.query("select prosrc from pg_proc where oid=to_regprocedure('public.estimate_create_professional_pdf_job_v2(text,uuid,text)')")).rows[0];
      assert.equal(stored?.prosrc, functionBody);
      assert.equal(await fingerprint(), before);
      assert.deepEqual((await client.query("select * from public.estimate_revision_artifact where id=$1", [beforeArtifact.id])).rows[0], beforeArtifact);
      assert.equal(Number((await client.query("select count(*) n from public.estimate_compile_job")).rows[0].n), jobCount);
      const receipt = { status: "LOCAL_SCHEMA_READBACK_GREEN", migrationSha256, applied, revisionRowsUnchanged: true,
        artifactsUnchanged: true, jobsCreated: 0, remoteApplied: false, functionBodySha256: hash(stored.prosrc) };
      writeFileSync(resolve(output, "local-apply-readback.json"), JSON.stringify(receipt, null, 2));
      process.stdout.write(JSON.stringify(receipt) + "\n"); return;
    }
    await client.query("begin"); inTransaction = true;
    await client.query(sql.replace(/^begin;\s*$/mu, "").replace(/^commit;\s*$/mu, ""));
    const revision = (await client.query("select owner_user_id,organization_id from public.estimate_revision where id=$1", [revisionId])).rows[0];
    const tuple = JSON.parse(readFileSync(resolve(".release-runtime/r568/runtime/whole-app-developer-current/backend.json"), "utf8").replace(/^\uFEFF/u, "")).compatibility_tuple;
    // Use the already server-issued capability for this authenticated native
    // tenant, not the launcher's base tenant capability. Do not mint one.
    const capability = (await client.query(`select id,environment,source_head,source_tree from public.estimate_candidate_capability_r3
      where tenant_id=$1 and release_id=$2 and search_release_id=$3 and source_head=$4 and source_tree=$5
      and purpose='estimate_candidate_admission_r3' and expires_at>now() and revoked_at is null
      order by expires_at desc limit 1`, [revision.organization_id, tuple.definitionReleaseId, tuple.searchReleaseId, tuple.sourceHead, tuple.sourceTree])).rows[0];
    assert(capability, "owned current unexpired capability required");
    const admission = { capabilityId: capability.id, environment: capability.environment, sourceHead: capability.source_head, sourceTree: capability.source_tree };
    await client.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.estimate_tenant_id_r541',$2,true),set_config('request.estimate_admission_r3',$3,true)",
      [revision.owner_user_id, revision.organization_id, JSON.stringify(admission)]);
    const oldRenderer = beforeArtifact.metadata.generatorVersion ?? beforeArtifact.metadata.renderer;
    const ready = await call(`owned-renderer-ready-${randomUUID()}`, oldRenderer);
    assert.equal(ready.job_id, null); assert.equal(ready.artifact_id, beforeArtifact.id); assert.equal(ready.created, false);
    checks.push("matching ready renderer reuses exact artifact without a job");
    await expectError("missing authentication rejected", "28000", async () => {
      await client.query("select set_config('request.jwt.claim.sub','',true)"); return call("owned-renderer-no-auth", oldRenderer);
    });
    await expectError("wrong revision owner rejected", "42501", async () => {
      await client.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.estimate_tenant_id_r541','',true)", [randomUUID()]);
      return call("owned-renderer-wrong-owner", oldRenderer);
    });
    const renderer = "canonical-professional-pdf.owned-rollback-test";
    const key = `owned-renderer-version-${randomUUID()}`;
    const first = await call(key, renderer);
    assert.equal(first.created, true); assert.equal(first.artifact_id, beforeArtifact.id); assert.equal(first.artifact_status, "queued");
    const queued = (await client.query("select * from public.estimate_revision_artifact where id=$1", [beforeArtifact.id])).rows[0];
    assert.equal(queued.storage_key, beforeArtifact.storage_key); assert.equal(queued.sha256, beforeArtifact.sha256);
    const job = (await client.query("select input_payload from public.estimate_compile_job where id=$1", [first.job_id])).rows[0];
    assert.equal(job.input_payload.rendererVersion, renderer);
    checks.push("changed renderer queues exactly one version-bound job and preserves old bytes pointer");
    const again = await call(`owned-renderer-repeat-${randomUUID()}`, renderer);
    assert.equal(again.job_id, first.job_id); assert.equal(again.created, false);
    assert.equal(Number((await client.query("select count(*) n from public.estimate_compile_job")).rows[0].n), jobCount + 1);
    checks.push("repeated requests share one active job");
    await expectError("different renderer cannot replace active lease", "55000", () => call(`owned-renderer-competing-${randomUUID()}`, `${renderer}-other`));
    const procurementBefore = (await client.query("select * from public.estimate_revision_artifact where revision_id=$1 and artifact_kind='procurement'", [revisionId])).rows[0];
    const procurement = (await client.query("select * from public.estimate_create_artifact_job_v1($1,$2,'procurement')", [`owned-procurement-${randomUUID()}`, revisionId])).rows[0];
    assert.equal(procurement.job_id, null);
    assert.deepEqual((await client.query("select * from public.estimate_revision_artifact where id=$1", [procurement.artifact_id])).rows[0], procurementBefore);
    checks.push("procurement ready cache remains unchanged");
    await client.query("update public.estimate_revision_artifact set status='failed' where id=$1", [beforeArtifact.id]);
    await expectError("renderer identity conflicts on reused idempotency key", "23505", () => call(key, `${renderer}-other`));
    await expectError("invalid candidate capability remains blocked at persistence", "42501", async () => {
      await client.query("select set_config('request.estimate_admission_r3',$1,true)", [JSON.stringify({ ...admission, capabilityId: randomUUID() })]);
      return call(`owned-renderer-wrong-cap-${randomUUID()}`, renderer);
    });
    assert.equal(await fingerprint(), before); checks.push("original revision and every row remain immutable");
    await client.query("rollback"); inTransaction = false;
    assert.equal(await fingerprint(), before);
    assert.deepEqual((await client.query("select * from public.estimate_revision_artifact where id=$1", [beforeArtifact.id])).rows[0], beforeArtifact);
    assert.equal(Number((await client.query("select count(*) n from public.estimate_compile_job")).rows[0].n), jobCount);
    const receipt = { status: "ROLLBACK_GREEN", migrationSha256, checks, checkCount: checks.length,
      jobsPersisted: 0, artifactsChanged: 0, originalRevisionRowsUnchanged: true, remoteApplied: false };
    writeFileSync(resolve(output, "rollback.json"), JSON.stringify(receipt, null, 2));
    process.stdout.write(JSON.stringify(receipt) + "\n");
  } finally { if (inTransaction) await client.query("rollback"); await client.end(); }
}
void main().catch(error => { process.stderr.write(String(error) + "\n"); process.exitCode = 1; });
