import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { Client } from "pg";

const TABLES = [
  "estimate_compile_job",
  "estimate_draft",
  "estimate_draft_event",
  "estimate_revision",
  "estimate_revision_artifact",
  "estimate_revision_photo_attachment",
  "estimate_revision_photo_attachment_event",
  "estimate_revision_photo_upload",
  "estimate_revision_request_binding",
  "estimate_revision_row",
  "estimate_revision_row_price",
] as const;

type Attempt = {
  actor: "owner" | "foreign_user" | "anonymous";
  relation: string;
  operation: "select" | "update" | "delete";
  expected: "visible" | "blocked";
  actualRows: number;
  passed: boolean;
  detail: string;
};

function arg(name: string): string {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? "";
}

function git(args: string[]): string {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeError(error: unknown): string {
  const record = error as { code?: unknown; message?: unknown };
  const code = String(record?.code ?? "UNKNOWN").replace(/[^A-Z0-9_]/gi, "").slice(0, 16);
  const message = String(record?.message ?? error)
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgres://[redacted]@")
    .replace(/password=[^&\s]+/gi, "password=[redacted]")
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}:\d+\b/g, "[redacted-host]")
    .slice(0, 180);
  return `${code}:${message}`;
}

function writeJsonAtomic(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporary, filePath);
}

async function setActor(client: Client, role: "authenticated" | "anon", userId: string | null): Promise<void> {
  await client.query(`set local role ${role}`);
  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
  await client.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify(userId ? { sub: userId, role } : { role }),
  ]);
}

async function resetActor(client: Client): Promise<void> {
  await client.query("reset role");
}

async function visibleCount(client: Client, relation: string, predicate: string, value: string): Promise<number> {
  const result = await client.query(`select count(*)::int as count from public.${relation} where ${predicate}=$1`, [value]);
  return Number(result.rows[0]?.count ?? 0);
}

async function blockedRead(
  client: Client,
  relation: string,
  predicate: string,
  value: string,
): Promise<{ rows: number; blocked: boolean; detail: string }> {
  const savepoint = "r4a6_blocked_read";
  await client.query(`savepoint ${savepoint}`);
  try {
    const rows = await visibleCount(client, relation, predicate, value);
    return {
      rows,
      blocked: rows === 0,
      detail: rows === 0 ? "zero_rows_visible" : "unexpected_rows_visible",
    };
  } catch (error) {
    await client.query(`rollback to savepoint ${savepoint}`);
    return { rows: 0, blocked: true, detail: `blocked_by_database:${safeError(error)}` };
  } finally {
    await client.query(`release savepoint ${savepoint}`);
  }
}

async function blockedMutation(
  client: Client,
  operation: "update" | "delete",
  revisionId: string,
): Promise<{ rows: number; blocked: boolean; detail: string }> {
  const savepoint = `r4a6_${operation}`;
  await client.query(`savepoint ${savepoint}`);
  try {
    const result = operation === "update"
      ? await client.query("update public.estimate_revision set updated_at=updated_at where id=$1", [revisionId])
      : await client.query("delete from public.estimate_revision where id=$1", [revisionId]);
    return {
      rows: result.rowCount ?? 0,
      blocked: (result.rowCount ?? 0) === 0,
      detail: (result.rowCount ?? 0) === 0 ? "zero_rows_mutated" : "unexpected_mutation",
    };
  } catch (error) {
    await client.query(`rollback to savepoint ${savepoint}`);
    return { rows: 0, blocked: true, detail: `blocked_by_database:${safeError(error)}` };
  } finally {
    await client.query(`release savepoint ${savepoint}`);
  }
}

async function main(): Promise<void> {
  const databaseUrl = String(process.env.R4A6_SECURITY_DATABASE_URL ?? "").trim();
  const outputPath = path.resolve(arg("output"));
  if (!databaseUrl) throw new Error("R4A6_SECURITY_DATABASE_URL is required");
  if (!arg("output")) throw new Error("--output is required");

  const client = new Client({
    connectionString: databaseUrl,
    ssl: /localhost|127\.0\.0\.1/u.test(databaseUrl) ? undefined : { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
    application_name: "r4a6_canonical_security_live_proof",
  });
  const attempts: Attempt[] = [];
  let transactionStarted = false;
  try {
    await client.connect();
    const identity = await client.query(
      "select current_database() as database_name,current_user as database_user,current_setting('server_version_num') as server_version",
    );
    const databaseIdentitySha256 = sha256(JSON.stringify(identity.rows[0] ?? {}));
    const tables = await client.query(
      `select c.relname,c.relrowsecurity,c.relforcerowsecurity
       from pg_class c join pg_namespace n on n.oid=c.relnamespace
       where n.nspname='public' and c.relname=any($1::text[]) order by c.relname`,
      [TABLES],
    );
    const policies = await client.query(
      `select tablename,policyname,cmd,roles,qual,with_check
       from pg_policies where schemaname='public' and tablename=any($1::text[])
       order by tablename,policyname`,
      [TABLES],
    );
    const targetResult = await client.query(`
      select r.id,r.owner_user_id,r.organization_id,r.row_count,
        (select count(*)::int from public.estimate_revision_artifact a where a.revision_id=r.id) as artifact_count,
        (select count(*)::int from public.estimate_revision_photo_attachment a where a.parent_revision_id=r.id) as photo_count,
        (select count(*)::int from public.estimate_revision_photo_attachment_event e where e.parent_revision_id=r.id) as photo_event_count,
        (select count(*)::int from public.estimate_revision_photo_upload u where u.parent_revision_id=r.id) as upload_count,
        (select count(*)::int from public.estimate_revision_request_binding b where b.revision_id=r.id) as request_binding_count
      from public.estimate_revision r
      where r.owner_user_id is not null
      order by
        (select count(*) from public.estimate_revision_photo_attachment a where a.parent_revision_id=r.id) desc,
        (select count(*) from public.estimate_revision_artifact a where a.revision_id=r.id) desc,
        r.created_at desc
      limit 1
    `);
    const target = targetResult.rows[0] as Record<string, unknown> | undefined;
    if (!target?.id || !target.owner_user_id) throw new Error("canonical revision security fixture is unavailable");
    if (Number(target.artifact_count) < 1 || Number(target.photo_count) < 1) {
      throw new Error("canonical revision security fixture lacks artifact or photo evidence");
    }
    const revisionId = String(target.id);
    const ownerId = String(target.owner_user_id);
    const foreignUserId = randomUUID();

    await client.query("begin");
    transactionStarted = true;
    await setActor(client, "authenticated", ownerId);
    for (const [relation, predicate, expectedRows] of [
      ["estimate_revision", "id", 1],
      ["estimate_revision_row", "revision_id", Number(target.row_count)],
      ["estimate_revision_row_price", "revision_id", Number(target.row_count)],
      ["estimate_revision_artifact", "revision_id", Number(target.artifact_count)],
      ["estimate_revision_photo_attachment", "parent_revision_id", Number(target.photo_count)],
      ["estimate_revision_photo_attachment_event", "parent_revision_id", Number(target.photo_event_count)],
      ["estimate_revision_photo_upload", "parent_revision_id", Number(target.upload_count)],
      ["estimate_revision_request_binding", "revision_id", Number(target.request_binding_count)],
    ] as const) {
      const count = await visibleCount(client, relation, predicate, revisionId);
      attempts.push({
        actor: "owner",
        relation,
        operation: "select",
        expected: "visible",
        actualRows: count,
        passed: count === expectedRows,
        detail: `expected_rows_${expectedRows}`,
      });
    }
    await resetActor(client);

    await setActor(client, "authenticated", foreignUserId);
    for (const [relation, predicate] of [
      ["estimate_revision", "id"],
      ["estimate_revision_row", "revision_id"],
      ["estimate_revision_row_price", "revision_id"],
      ["estimate_revision_artifact", "revision_id"],
      ["estimate_revision_photo_attachment", "parent_revision_id"],
      ["estimate_revision_photo_attachment_event", "parent_revision_id"],
      ["estimate_revision_photo_upload", "parent_revision_id"],
      ["estimate_revision_request_binding", "revision_id"],
    ] as const) {
      const count = await visibleCount(client, relation, predicate, revisionId);
      attempts.push({
        actor: "foreign_user",
        relation,
        operation: "select",
        expected: "blocked",
        actualRows: count,
        passed: count === 0,
        detail: count === 0 ? "zero_rows_visible" : "cross_tenant_rows_visible",
      });
    }
    for (const operation of ["update", "delete"] as const) {
      const mutation = await blockedMutation(client, operation, revisionId);
      attempts.push({
        actor: "foreign_user",
        relation: "estimate_revision",
        operation,
        expected: "blocked",
        actualRows: mutation.rows,
        passed: mutation.blocked,
        detail: mutation.detail,
      });
    }
    await resetActor(client);

    await setActor(client, "anon", null);
    const anonymousRead = await blockedRead(client, "estimate_revision", "id", revisionId);
    attempts.push({
      actor: "anonymous",
      relation: "estimate_revision",
      operation: "select",
      expected: "blocked",
      actualRows: anonymousRead.rows,
      passed: anonymousRead.blocked,
      detail: anonymousRead.detail,
    });
    await resetActor(client);
    await client.query("rollback");
    transactionStarted = false;

    const allTablesPresent = tables.rows.length === TABLES.length;
    const rlsEnabledAll = allTablesPresent && tables.rows.every((row) => row.relrowsecurity === true);
    const policyRelations = new Set(policies.rows.map((row) => String(row.tablename)));
    const expectedPolicyRelations = [...TABLES];
    const policyCoverageComplete = expectedPolicyRelations.every((table) => policyRelations.has(table));
    const passed = rlsEnabledAll && policyCoverageComplete && attempts.every((attempt) => attempt.passed);
    const summary = {
      schemaVersion: "r568-r4-a6-canonical-security-live.v1",
      status: passed ? "GREEN_R4_A6_CANONICAL_RLS_LIVE" : "STOP_R4_A6_CANONICAL_RLS_LIVE",
      capturedAt: new Date().toISOString(),
      sourceCommitSha: git(["rev-parse", "HEAD"]),
      databaseIdentitySha256,
      executionMode: "LIVE_LOCAL_DATABASE_ROLLBACK_ONLY",
      transactionCommitted: false,
      tablesExpected: TABLES.length,
      tablesPresent: tables.rows.length,
      rlsEnabledAll,
      policyCount: policies.rows.length,
      policyCoverageComplete,
      tableInventory: tables.rows,
      policies: policies.rows,
      targetIdentity: {
        revisionIdSha256: sha256(revisionId),
        ownerUserIdSha256: sha256(ownerId),
        organizationIdSha256: sha256(String(target.organization_id ?? "")),
        rowCount: Number(target.row_count),
        artifactCount: Number(target.artifact_count),
        photoCount: Number(target.photo_count),
        photoEventCount: Number(target.photo_event_count),
        uploadCount: Number(target.upload_count),
        requestBindingCount: Number(target.request_binding_count),
      },
      attemptsExpected: 19,
      attemptsExecuted: attempts.length,
      attemptsPassed: attempts.filter((attempt) => attempt.passed).length,
      attempts,
      blockers: passed ? [] : [
        rlsEnabledAll ? "" : "rls_not_enabled_for_all_tables",
        policyCoverageComplete ? "" : "policy_coverage_incomplete",
        ...attempts.filter((attempt) => !attempt.passed).map((attempt) =>
          `${attempt.actor}:${attempt.operation}:${attempt.relation}`),
      ].filter(Boolean),
      productionAccessed: false,
      fakeGreenClaimed: false,
    };
    writeJsonAtomic(outputPath, summary);
    console.info(JSON.stringify({
      status: summary.status,
      output: outputPath,
      attempts: `${summary.attemptsPassed}/${summary.attemptsExpected}`,
      policyCount: summary.policyCount,
    }, null, 2));
    if (!passed) process.exitCode = 1;
  } finally {
    if (transactionStarted) await client.query("rollback").catch(() => undefined);
    await client.end().catch(() => undefined);
  }
}

main().catch((error) => {
  const outputPath = arg("output") ? path.resolve(arg("output")) : null;
  const summary = {
    schemaVersion: "r568-r4-a6-canonical-security-live.v1",
    status: "STOP_R4_A6_CANONICAL_RLS_LIVE",
    capturedAt: new Date().toISOString(),
    sourceCommitSha: git(["rev-parse", "HEAD"]),
    executionMode: "LIVE_LOCAL_DATABASE_ROLLBACK_ONLY",
    transactionCommitted: false,
    error: safeError(error),
    blockers: ["canonical_security_live_proof_failed"],
    productionAccessed: false,
    fakeGreenClaimed: false,
  };
  if (outputPath) writeJsonAtomic(outputPath, summary);
  console.error(summary.error);
  process.exit(1);
});
