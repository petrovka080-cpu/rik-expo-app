import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const BACKEND_RECEIPT = resolve(
  ".release-runtime/r542/evidence/51_R542_CANONICAL_PROFILE_STRICT_BACKEND_START.json",
);
const OUTPUT = resolve(
  ".release-runtime/r553/evidence/10_R553_LOCAL_CONSUMER_CAPABILITY.json",
);
const TENANT_ID = "55555555-5555-4555-8555-555555555551";
const MASTER_SHA256 = "5a9e373f94441c8e39d6f0feff7a2ba8e7773a95d0807aff6c89f6535bde11ee";

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

async function main(): Promise<void> {
  const backendReceipt = JSON.parse(readFileSync(BACKEND_RECEIPT, "utf8")) as Json;
  const backend = backendReceipt.backend ?? {};
  invariant(backendReceipt.status === "GREEN_STRICT_SESSION_BACKEND_READY", "R553_BACKEND_RECEIPT_RED");
  invariant(backend.auth_mode === "STRICT_SESSION_INTROSPECTION", "R553_BACKEND_AUTH_MODE_RED");
  invariant(backend.capability_tenant_binding === "request-principal", "R553_CAPABILITY_BINDING_RED");

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "r553-local-consumer-capability",
    statement_timeout: 30_000,
  });
  await client.connect();
  let capability: Json;
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtextextended('r553-local-consumer-capability',0))");
    const authorityRows = (await client.query(
      `select environment,release_id::text,search_release_id::text,source_head,source_tree
       from public.estimate_candidate_capability_r3
       where release_id=$1 and search_release_id=$2 and source_head=$3 and source_tree=$4
         and purpose='estimate_candidate_admission_r3' and revoked_at is null and expires_at>now()
       order by created_at desc`,
      [backend.target_release_id, backend.search_release_id, backend.source_head, backend.source_tree],
    )).rows as Json[];
    const environments = [...new Set(authorityRows.map((row) => String(row.environment)))];
    invariant(environments.length === 1, `R553_CAPABILITY_ENVIRONMENT_AUTHORITY_RED:${environments.join(",")}`);
    const environment = environments[0];
    const existing = (await client.query(
      `select * from public.estimate_candidate_capability_r3
       where environment=$1 and tenant_id=$2 and release_id=$3 and search_release_id=$4
         and source_head=$5 and source_tree=$6 and purpose='estimate_candidate_admission_r3'
       order by created_at desc limit 1 for update`,
      [environment, TENANT_ID, backend.target_release_id, backend.search_release_id, backend.source_head, backend.source_tree],
    )).rows[0] as Json | undefined;
    if (existing) {
      capability = (await client.query(
        `update public.estimate_candidate_capability_r3
         set expires_at=now()+interval '24 hours',revoked_at=null,issued_by='provisionLocalDeveloperEstimateCandidateCapabilityR553'
         where id=$1 returning *`,
        [existing.id],
      )).rows[0] as Json;
    } else {
      capability = (await client.query(
        `insert into public.estimate_candidate_capability_r3(
           environment,tenant_id,release_id,search_release_id,expires_at,purpose,
           source_head,source_tree,issued_by
         ) values($1,$2,$3,$4,now()+interval '24 hours','estimate_candidate_admission_r3',$5,$6,
           'provisionLocalDeveloperEstimateCandidateCapabilityR553') returning *`,
        [environment, TENANT_ID, backend.target_release_id, backend.search_release_id, backend.source_head, backend.source_tree],
      )).rows[0] as Json;
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }

  const receiptBase = {
    schema_version: "rik-expo-app-r553.local-consumer-capability.v1",
    generated_utc: new Date().toISOString(),
    master_sha256: MASTER_SHA256,
    status: "GREEN_R553_LOCAL_CONSUMER_TENANT_BOUND_CAPABILITY",
    capability: {
      id: capability.id,
      environment: capability.environment,
      tenant_id: capability.tenant_id,
      release_id: capability.release_id,
      search_release_id: capability.search_release_id,
      source_head: capability.source_head,
      source_tree: capability.source_tree,
      expires_at: capability.expires_at,
      purpose: capability.purpose,
      issued_by: capability.issued_by,
      revoked_at: capability.revoked_at,
    },
    binding: "request-principal",
    universal_bypass: false,
    production_accessed: false,
    deployed: false,
    merged: false,
    released: false,
    ota: false,
  };
  atomicJson(OUTPUT, { ...receiptBase, payload_sha256: sha256(JSON.stringify(receiptBase)) });
  process.stdout.write(`${JSON.stringify({ status: receiptBase.status, capability_id: capability.id, tenant_id: TENANT_ID })}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
