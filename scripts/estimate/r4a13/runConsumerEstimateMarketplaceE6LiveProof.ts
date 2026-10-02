import { createHash } from "node:crypto";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Client } from "pg";

const OWNER_ID = "9395fc71-de9c-4d39-b7a7-b966d4a8c362";
const RECIPIENT_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const TENANT_ID = "55555555-5555-4555-8555-555555555551";
const OTHER_TENANT_ID = "aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa";
const REVISION_ID = "c369ab78-0ef8-45f2-8caa-7e735beb53d0";
const RELEASE_ID = "4d454761-0295-5ec4-8519-bf71f0065be5";
const REVISION_SHA = "943cb284de8d79d13dc2ba34dc1d7aeac57fc7e1ff47d05070040364948497af";
const ARTIFACT_ID = "39567e90-8060-4ea6-818d-2c687ad01a0b";
const ARTIFACT_SHA = "670692fde0ae0cc22c3a258665034cdf29d746f8a369129f4df96bc5cef8aabb";
const LOCAL_REQUEST_ID = "e6-live-proof-local-request-v2";
const IDEMPOTENCY_KEY = "e6-live-proof-same-intent-v2";

type PublishReceipt = {
  listing_id: string;
  created: boolean;
  server_status: string;
  revision_id: string;
  release_id: string;
  artifact_id: string;
};

function argument(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function writeJsonAtomic(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, filePath);
}

function safeError(error: unknown): { code: string; message: string } {
  const value = error as { code?: unknown; message?: unknown };
  return {
    code: String(value?.code ?? "UNKNOWN").slice(0, 16),
    message: String(value?.message ?? error)
      .replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgres://[redacted]@")
      .slice(0, 180),
  };
}

async function beginActor(
  client: Client,
  input: { userId: string; appRole: string; tenantId: string },
): Promise<void> {
  await client.query("begin");
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [input.userId]);
  await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({
    sub: input.userId,
    app_metadata: { role: input.appRole, tenant_id: input.tenantId },
  })]);
}

async function publish(client: Client, suffix = ""): Promise<PublishReceipt> {
  const result = await client.query<PublishReceipt>(`
    select * from public.consumer_estimate_marketplace_publish_v1(
      $1,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9,$10
    )
  `, [
    `${LOCAL_REQUEST_ID}${suffix}`,
    REVISION_ID,
    ARTIFACT_ID,
    `${IDEMPOTENCY_KEY}${suffix}`,
    REVISION_SHA,
    ARTIFACT_SHA,
    "Professional request from the confirmed estimate with exact rows and quantities.",
    "Bishkek",
    "64 Maldybaeva Street",
    "+996555123456",
  ]);
  if (result.rows.length !== 1) throw new Error("E6_PUBLISH_RECEIPT_COUNT_INVALID");
  return result.rows[0];
}

async function rejectedAttempt(
  client: Client,
  label: string,
  actor: { userId: string; appRole: string; tenantId: string },
  invoke: () => Promise<unknown>,
): Promise<{ label: string; blocked: boolean; code: string; message: string }> {
  await beginActor(client, actor);
  try {
    await invoke();
    await client.query("rollback");
    return { label, blocked: false, code: "NONE", message: "unexpected success" };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    return { label, blocked: true, ...safeError(error) };
  }
}

async function sourceSnapshot(client: Client): Promise<Record<string, unknown>> {
  const result = await client.query(`
    select
      current_database() as database_name,
      (select count(*)::int from public.estimate_revision) as revision_count,
      (select count(*)::int from public.estimate_revision_row) as row_count,
      (select count(*)::int from public.estimate_revision_artifact) as artifact_count,
      (select count(*)::int from public.estimate_revision_photo_attachment) as photo_count,
      (select count(*)::int from public.estimate_revision_photo_attachment_event) as photo_event_count,
      (select status from public.estimate_revision where id=$1) as target_revision_status,
      (select checksum_sha256 from public.estimate_revision where id=$1) as target_revision_sha,
      (select status from public.estimate_revision_artifact where id=$2) as target_artifact_status,
      (select sha256 from public.estimate_revision_artifact where id=$2) as target_artifact_sha,
      to_regclass('public.market_listings')::text as market_listings_relation
  `, [REVISION_ID, ARTIFACT_ID]);
  return result.rows[0] as Record<string, unknown>;
}

async function main(): Promise<void> {
  const sourceUrl = argument("source-db", "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2");
  const proofUrl = argument("proof-db", "postgresql://postgres@127.0.0.1:55432/rik_r4_e6_proof_v1");
  const output = path.resolve(argument(
    "output",
    ".release-runtime/r4a13-6/s19-first-estimate/e6-marketplace-live-v1/acceptance.json",
  ));
  const source = new Client({ connectionString: sourceUrl });
  const proof = new Client({ connectionString: proofUrl });
  await source.connect();
  await proof.connect();
  try {
    const sourceBefore = await sourceSnapshot(source);
    const preexisting = await proof.query<{ count: number }>(`
      select count(*)::int as count
      from public.consumer_estimate_marketplace_handoffs
      where owner_user_id=$1 and idempotency_key=$2
    `, [OWNER_ID, IDEMPOTENCY_KEY]);

    await beginActor(proof, { userId: OWNER_ID, appRole: "consumer", tenantId: TENANT_ID });
    const first = await publish(proof);
    await proof.query("commit");

    await beginActor(proof, { userId: OWNER_ID, appRole: "consumer", tenantId: TENANT_ID });
    const replay = await publish(proof);
    const ownerHandoff = await proof.query<{ count: number }>(`
      select count(*)::int as count from public.consumer_estimate_marketplace_handoffs
      where owner_user_id=$1 and listing_id=$2
    `, [OWNER_ID, first.listing_id]);
    await proof.query("commit");

    await beginActor(proof, { userId: RECIPIENT_ID, appRole: "buyer", tenantId: OTHER_TENANT_ID });
    const recipientListing = await proof.query<{
      id: string;
      status: string;
      user_id: string;
      client_mutation_id: string;
      items_json: Record<string, unknown>[];
    }>(`
      select id,status,user_id,client_mutation_id,items_json
      from public.market_listings where id=$1
    `, [first.listing_id]);
    const recipientPrivateHandoff = await proof.query<{ count: number }>(`
      select count(*)::int as count from public.consumer_estimate_marketplace_handoffs
      where listing_id=$1
    `, [first.listing_id]);
    await proof.query("commit");

    const negativeAttempts = [
      await rejectedAttempt(
        proof,
        "wrong_role",
        { userId: OWNER_ID, appRole: "buyer", tenantId: TENANT_ID },
        () => publish(proof, "-wrong-role"),
      ),
      await rejectedAttempt(
        proof,
        "cross_tenant",
        { userId: OWNER_ID, appRole: "consumer", tenantId: OTHER_TENANT_ID },
        () => publish(proof, "-cross-tenant"),
      ),
      await rejectedAttempt(
        proof,
        "cross_actor",
        { userId: RECIPIENT_ID, appRole: "consumer", tenantId: TENANT_ID },
        () => publish(proof, "-cross-actor"),
      ),
      await rejectedAttempt(
        proof,
        "bad_revision_checksum",
        { userId: OWNER_ID, appRole: "consumer", tenantId: TENANT_ID },
        () => proof.query(`select * from public.consumer_estimate_marketplace_publish_v1(
          $1,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9,$10
        )`, [
          `${LOCAL_REQUEST_ID}-bad-sha`, REVISION_ID, ARTIFACT_ID,
          `${IDEMPOTENCY_KEY}-bad-sha`, "0".repeat(64), ARTIFACT_SHA,
          "Professional request with deliberately wrong revision checksum.",
          "Bishkek", "64 Maldybaeva Street", "+996555123456",
        ]),
      ),
    ];

    const exactRows = recipientListing.rows[0]?.items_json ?? [];
    const exactLineage = exactRows.length > 0 && exactRows.every((row) =>
      row.canonical_revision_id === REVISION_ID &&
      row.canonical_release_id === RELEASE_ID &&
      row.canonical_artifact_id === ARTIFACT_ID &&
      typeof row.name === "string" && row.name.trim().length > 0 &&
      typeof row.qty === "number" && row.qty > 0,
    );
    const finalCounts = await proof.query<{ listing_count: number; handoff_count: number }>(`
      select
        (select count(*)::int from public.market_listings where client_mutation_id=$1) as listing_count,
        (select count(*)::int from public.consumer_estimate_marketplace_handoffs
          where owner_user_id=$2 and idempotency_key=$1) as handoff_count
    `, [IDEMPOTENCY_KEY, OWNER_ID]);
    const sourceAfter = await sourceSnapshot(source);
    const sourceUnchanged = JSON.stringify(sourceBefore) === JSON.stringify(sourceAfter);
    const passed =
      first.listing_id === replay.listing_id &&
      replay.created === false &&
      first.server_status === "active" &&
      first.revision_id === REVISION_ID &&
      first.release_id === RELEASE_ID &&
      first.artifact_id === ARTIFACT_ID &&
      ownerHandoff.rows[0]?.count === 1 &&
      recipientListing.rows.length === 1 &&
      recipientListing.rows[0]?.status === "active" &&
      recipientListing.rows[0]?.user_id === OWNER_ID &&
      recipientListing.rows[0]?.client_mutation_id === IDEMPOTENCY_KEY &&
      recipientPrivateHandoff.rows[0]?.count === 0 &&
      exactRows.length === 36 &&
      exactLineage &&
      finalCounts.rows[0]?.listing_count === 1 &&
      finalCounts.rows[0]?.handoff_count === 1 &&
      negativeAttempts.every((attempt) => attempt.blocked) &&
      sourceUnchanged;
    const receipt = {
      schemaVersion: "r4-a13-6-e6-consumer-estimate-marketplace-live.v1",
      status: passed ? "GREEN_E6_ATOMIC_SERVER_CONFIRMED_MARKETPLACE_HANDOFF" : "STOP_E6_MARKETPLACE_HANDOFF",
      capturedAt: new Date().toISOString(),
      execution: {
        sourceDatabaseReadOnly: true,
        proofDatabase: "rik_r4_e6_proof_v1",
        productionAccessed: false,
        candidateActivated: false,
        deployPerformed: false,
        releasePerformed: false,
        otaPerformed: false,
      },
      idempotency: {
        preexistingCount: preexisting.rows[0]?.count ?? -1,
        firstCreated: first.created,
        replayCreated: replay.created,
        sameListingId: first.listing_id === replay.listing_id,
        listingCount: finalCounts.rows[0]?.listing_count ?? -1,
        handoffCount: finalCounts.rows[0]?.handoff_count ?? -1,
      },
      serverReceipt: first,
      recipientRead: {
        listingVisible: recipientListing.rows.length === 1,
        privateHandoffVisibleCount: recipientPrivateHandoff.rows[0]?.count ?? -1,
        projectedRowCount: exactRows.length,
        exactCanonicalLineage: exactLineage,
        visibleNamesPresent: exactRows.every((row) => typeof row.name === "string" && row.name.trim().length > 0),
        positiveQuantitiesPresent: exactRows.every((row) => typeof row.qty === "number" && row.qty > 0),
      },
      negativeAttempts,
      sourceCandidate: {
        identitySha256: sha256(JSON.stringify(sourceBefore)),
        unchanged: sourceUnchanged,
        before: sourceBefore,
        after: sourceAfter,
      },
      blockers: passed ? [] : ["one_or_more_e6_live_assertions_failed"],
    };
    const withHash = { ...receipt, receiptSha256: sha256(JSON.stringify(receipt)) };
    writeJsonAtomic(output, withHash);
    process.stdout.write(`${JSON.stringify({
      status: receipt.status,
      output,
      listingId: first.listing_id,
      rowCount: exactRows.length,
      negativeAttempts: `${negativeAttempts.filter((attempt) => attempt.blocked).length}/${negativeAttempts.length}`,
      receiptSha256: withHash.receiptSha256,
    }, null, 2)}\n`);
    if (!passed) process.exitCode = 1;
  } finally {
    await proof.query("rollback").catch(() => undefined);
    await proof.end().catch(() => undefined);
    await source.end().catch(() => undefined);
  }
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify(safeError(error))}\n`);
  process.exit(1);
});
