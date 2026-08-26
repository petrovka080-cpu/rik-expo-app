import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const MASTER_SHA256 = "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007";
const TARGET_RECEIPT = resolve(".release-runtime/r555/evidence/20G_R555_FULL_CUMULATIVE_ASPHALT_RECONCILIATION_APPLY.json");
const OUTPUT = resolve(".release-runtime/r555/evidence/21A_R555_FULL_CUMULATIVE_CONSUMER_CAPABILITY.json");
const TENANT_ID = "55555555-5555-4555-8555-555555555551";
const ENVIRONMENT = "r555-full-real-auth";
const CONTRACT = "rik-expo-app-r555.full-cumulative-consumer-capability.v1";

function sha256(value: string | Buffer): string { return createHash("sha256").update(value).digest("hex"); }
function uuid(seed: string): string {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), "hex"); bytes[6] = (bytes[6]! & 0x0f) | 0x50; bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex"); return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function invariant(value: unknown, code: string): asserts value { if (!value) throw new Error(`R555_FULL_CAPABILITY:${code}`); }
function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true }); const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8"); renameSync(temporary, path);
}

async function main(): Promise<void> {
  const target = JSON.parse(readFileSync(TARGET_RECEIPT, "utf8")) as Json;
  invariant(target.status === "GREEN_R555_FULL_CUMULATIVE_ASPHALT_RECONCILIATION_PREPARED_NOT_ACTIVE", "TARGET_NOT_GREEN");
  const releaseId = String(target.candidate_release_id);
  const searchReleaseId = String(target.candidate_search_release_id);
  const sourceTree = String(target.source_tree);
  const sourceHead = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const capabilityId = uuid(`${CONTRACT}:${TENANT_ID}:${releaseId}:${searchReleaseId}:${sourceHead}:${sourceTree}`);
  const client = new Client({ connectionString: DATABASE_URL, application_name: "r555-full-consumer-capability", statement_timeout: 30_000 });
  let capability: Json;
  await client.connect();
  try {
    await client.query("begin");
    invariant((await client.query("select pg_try_advisory_xact_lock(hashtext($1)) locked", [CONTRACT])).rows[0]?.locked === true, "WRITER_LOCK_BUSY");
    const release = (await client.query("select status from public.estimate_definition_release where id=$1", [releaseId])).rows[0];
    const search = (await client.query("select status from public.estimate_search_index_release where id=$1", [searchReleaseId])).rows[0];
    invariant(release?.status === "prepared" && search?.status === "draft", "TARGET_STATUS_RED");
    invariant(Number((await client.query("select count(*)::int count from public.estimate_candidate_capability_r3 where release_id=$1 or search_release_id=$2", [releaseId, searchReleaseId])).rows[0].count) === 0, "PREEXISTING_TARGET_CAPABILITY");
    capability = (await client.query(`insert into public.estimate_candidate_capability_r3(id,environment,tenant_id,release_id,search_release_id,expires_at,purpose,source_head,source_tree,issued_by)
      values($1,$2,$3,$4,$5,now()+interval '24 hours','estimate_candidate_admission_r3',$6,$7,'provisionR555FullCumulativeConsumerCapability') returning *`, [capabilityId, ENVIRONMENT, TENANT_ID, releaseId, searchReleaseId, sourceHead, sourceTree])).rows[0] as Json;
    await client.query("commit");
  } catch (error) { await client.query("rollback").catch(() => undefined); throw error; }
  finally { await client.end(); }
  const receipt = {
    schema_version: CONTRACT, generated_utc: new Date().toISOString(), status: "GREEN_R555_FULL_CUMULATIVE_CONSUMER_CAPABILITY",
    master_sha256: MASTER_SHA256, candidate_release_id: releaseId, candidate_search_release_id: searchReleaseId,
    source_head: sourceHead, source_tree: sourceTree, capability_id: capability.id, consumer_tenant_id: TENANT_ID,
    capability: { id: capability.id, environment: capability.environment, tenant_id: capability.tenant_id, release_id: capability.release_id, search_release_id: capability.search_release_id, source_head: capability.source_head, source_tree: capability.source_tree, expires_at: capability.expires_at, purpose: capability.purpose, issued_by: capability.issued_by, revoked_at: capability.revoked_at },
    binding: "request-principal", universal_bypass: false, production_accessed: false, deployed: false, merged: false, released: false, ota: false,
  };
  atomicJson(OUTPUT, { ...receipt, payload_sha256: sha256(JSON.stringify(receipt)) });
  process.stdout.write(`${JSON.stringify({ status: receipt.status, capability_id: capability.id, tenant_id: TENANT_ID, release_id: releaseId, search_release_id: searchReleaseId })}\n`);
}

void main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`); process.exitCode = 1; });
