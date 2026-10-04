import { strict as assert } from "node:assert";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

// Bounded existing-owner local verification. Migration and test jobs roll back.
const migrationPath = "supabase/migrations/20261004094500_versioned_procurement_operation_allocation.sql";
const sql = readFileSync(resolve(migrationPath), "utf8");
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const migrationSha256 = hash(sql);
const functions = [
  "public.estimate_create_versioned_artifact_job_v2(text,uuid,text,text)",
  "public.estimate_create_professional_pdf_job_v2(text,uuid,text)",
];
const bodies = [...sql.matchAll(/as \$\$([\s\S]*?)\$\$;/gu)].map(m => m[1]);
assert.equal(bodies.length, functions.length);
const connection = process.env.ESTIMATE_MIGRATION_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const url = new URL(connection);
assert(["127.0.0.1", "localhost"].includes(url.hostname) && url.port === "55432" && url.pathname === "/rik_r4_runtime_b5_v2", "exact owned local database required");
const revisionId = "99cc60c2-e612-4b88-845f-0db91f89b90e";
const output = resolve(".release-runtime/r568/s27-32/versioned-procurement-operation-allocation");
mkdirSync(output, { recursive: true });
const client = new Client({ connectionString: connection, application_name: "owned-procurement-renderer-verification" });
const checks: string[] = [];
const state = async () => ({
  revision: (await client.query("select row_to_json(r)::text body from public.estimate_revision r where id=$1", [revisionId])).rows,
  rows: (await client.query("select row_to_json(r)::text body from public.estimate_revision_row r where revision_id=$1 order by ordinal", [revisionId])).rows,
  artifacts: (await client.query("select * from public.estimate_revision_artifact where revision_id=$1 order by artifact_kind", [revisionId])).rows,
  jobCount: Number((await client.query("select count(*) n from public.estimate_compile_job")).rows[0].n),
});
const call = async (key: string, kind: string, renderer: string) => (await client.query(
  "select * from public.estimate_create_versioned_artifact_job_v2($1,$2,$3,$4)", [key, revisionId, kind, renderer])).rows[0];
const expectError = async (name: string, code: string, action: () => Promise<unknown>) => {
  await client.query("savepoint owned_negative_case");
  try { await assert.rejects(action, (error: unknown) => (error as { code: string }).code === code, name); checks.push(name); }
  finally { await client.query("rollback to savepoint owned_negative_case"); }
};
async function main() {
  await client.connect(); let inTransaction = false;
  try {
    const before = await state();
    const procurement = before.artifacts.find(a => a.artifact_kind === "procurement");
    const professional = before.artifacts.find(a => a.artifact_kind === "professional_pdf");
    assert(procurement?.status === "ready" && professional?.status === "ready", "actual owned ready procurement and professional PDF required");
    if (process.argv.includes("--apply-local")) {
      const dry = JSON.parse(readFileSync(resolve(output, "rollback.json"), "utf8"));
      assert(dry.status === "ROLLBACK_GREEN" && dry.migrationSha256 === migrationSha256);
      const existing = await Promise.all(functions.map(async f => (await client.query("select prosrc from pg_proc where oid=to_regprocedure($1)", [f])).rows[0]?.prosrc));
      const applied = existing.some((body, i) => body !== bodies[i]);
      if (applied) await client.query(sql);
      for (let i = 0; i < functions.length; i++) assert.equal((await client.query("select prosrc from pg_proc where oid=to_regprocedure($1)", [functions[i]])).rows[0]?.prosrc, bodies[i]);
      assert.deepEqual(await state(), before);
      const receipt = { status: "LOCAL_SCHEMA_READBACK_GREEN", migrationSha256, applied, jobsCreated: 0, revisionRowsAndArtifactsUnchanged: true, remoteApplied: false };
      writeFileSync(resolve(output, "local-apply-readback.json"), JSON.stringify(receipt, null, 2));
      process.stdout.write(JSON.stringify(receipt) + "\n"); return;
    }
    await client.query("begin"); inTransaction = true;
    await client.query(sql.replace(/^begin;\s*$/mu, "").replace(/^commit;\s*$/mu, ""));
    const revision = (await client.query("select owner_user_id,organization_id from public.estimate_revision where id=$1", [revisionId])).rows[0];
    const tuple = JSON.parse(readFileSync(resolve(".release-runtime/r568/runtime/whole-app-developer-current/backend.json"), "utf8").replace(/^\uFEFF/u, "")).compatibility_tuple;
    // Reuse the already authenticated server-issued owner-tenant capability.
    const capability = (await client.query(`select id,environment,source_head,source_tree from public.estimate_candidate_capability_r3
      where tenant_id=$1 and release_id=$2 and search_release_id=$3 and source_head=$4 and source_tree=$5
      and purpose='estimate_candidate_admission_r3' and expires_at>now() and revoked_at is null order by expires_at desc limit 1`,
    [revision.organization_id, tuple.definitionReleaseId, tuple.searchReleaseId, tuple.sourceHead, tuple.sourceTree])).rows[0];
    assert(capability, "current unexpired owner capability required; no capability minted by verifier");
    const admission = { capabilityId: capability.id, environment: capability.environment, sourceHead: capability.source_head, sourceTree: capability.source_tree };
    await client.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.estimate_tenant_id_r541',$2,true),set_config('request.estimate_admission_r3',$3,true)", [revision.owner_user_id, revision.organization_id, JSON.stringify(admission)]);
    const oldRenderer = procurement.metadata.generatorVersion ?? procurement.metadata.renderer;
    const ready = await call(`owned-proc-ready-${randomUUID()}`, "procurement", oldRenderer);
    assert.equal(ready.job_id, null); assert.equal(ready.artifact_id, procurement.id); assert.equal(ready.created, false);
    checks.push("matching ready renderer reuses exact procurement without job");
    const pdfReady = (await client.query("select * from public.estimate_create_professional_pdf_job_v2($1,$2,$3)", [`owned-pdf-ready-${randomUUID()}`, revisionId, professional.metadata.generatorVersion])).rows[0];
    assert.equal(pdfReady.job_id, null); assert.equal(pdfReady.artifact_id, professional.id);
    checks.push("existing professional PDF delegate reuses exact ready artifact");
    await expectError("missing authentication rejected", "28000", async () => { await client.query("select set_config('request.jwt.claim.sub','',true)"); return call("no-auth", "procurement", oldRenderer); });
    await expectError("wrong owner and tenant rejected", "42501", async () => { await client.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.estimate_tenant_id_r541','',true)", [randomUUID()]); return call("wrong-owner", "procurement", oldRenderer); });
    await expectError("raw PDF cannot enter versioned lifecycle", "22023", () => call("raw-pdf", "pdf", oldRenderer));
    await expectError("cross-kind renderer rejected", "22023", () => call("cross-kind", "procurement", professional.metadata.generatorVersion));
    const renderer = "canonical-procurement.owned-rollback-test";
    const key = `owned-proc-version-${randomUUID()}`;
    const first = await call(key, "procurement", renderer);
    assert.equal(first.created, true); assert.equal(first.artifact_id, procurement.id);
    const queued = (await client.query("select * from public.estimate_revision_artifact where id=$1", [procurement.id])).rows[0];
    assert.equal(queued.storage_key, procurement.storage_key); assert.equal(queued.sha256, procurement.sha256);
    assert.equal((await client.query("select input_payload from public.estimate_compile_job where id=$1", [first.job_id])).rows[0].input_payload.rendererVersion, renderer);
    checks.push("new renderer queues one bound job preserving earlier storage pointer and SHA");
    const again = await call(`repeat-${randomUUID()}`, "procurement", renderer);
    assert.equal(again.job_id, first.job_id); assert.equal(again.created, false);
    assert.equal((await state()).jobCount, before.jobCount + 1);
    checks.push("repeated requests reuse one active lease");
    await expectError("different renderer cannot replace active lease", "55000", () => call("competing", "procurement", `${renderer}-other`));
    // Only a rollback fixture status change, through the still-active triggers.
    await client.query("update public.estimate_revision_artifact set status='failed' where id=$1", [procurement.id]);
    await expectError("reused key still rejects changed payload", "23505", () => call(key, "procurement", `${renderer}-other`));
    await expectError("invalid capability remains blocked at persistence", "42501", async () => { await client.query("select set_config('request.estimate_admission_r3',$1,true)", [JSON.stringify({ ...admission, capabilityId: randomUUID() })]); return call(`wrong-cap-${randomUUID()}`, "procurement", renderer); });
    const during = await state(); assert.deepEqual(during.revision, before.revision); assert.deepEqual(during.rows, before.rows);
    assert.deepEqual(during.artifacts.find(a => a.id === professional.id), professional);
    checks.push("original revision rows and professional PDF unchanged");
    await client.query("rollback"); inTransaction = false;
    assert.deepEqual(await state(), before);
    const receipt = { status: "ROLLBACK_GREEN", migrationSha256, checks, checkCount: checks.length, jobsPersisted: 0, artifactsChanged: 0, revisionRowsUnchanged: true, ownerDeveloperContext: true, ordinaryConsumerAcceptance: false, remoteApplied: false };
    writeFileSync(resolve(output, "rollback.json"), JSON.stringify(receipt, null, 2));
    process.stdout.write(JSON.stringify(receipt) + "\n");
  } finally { if (inTransaction) await client.query("rollback"); await client.end(); }
}
void main().catch(error => { process.stderr.write(String(error) + "\n"); process.exitCode = 1; });
