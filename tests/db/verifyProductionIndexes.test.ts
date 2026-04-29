import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync, spawnSync } from "child_process";

const scriptPath = path.join(process.cwd(), "scripts/db/verifyProductionIndexes.mjs");
const migrationPath = path.join(process.cwd(), "supabase/migrations/20260428154000_s_db_2_query_plan_indexes.sql");

type TestEnv = Record<string, string | undefined>;

function cleanEnv(overrides: TestEnv = {}) {
  const env = { ...process.env, ...overrides };
  delete env.PROD_SUPABASE_URL;
  delete env.PROD_SUPABASE_READONLY_KEY;
  delete env.PROD_DATABASE_READONLY_URL;
  delete env.PROD_SUPABASE_SERVICE_ROLE_KEY;
  return { ...env, ...overrides };
}

function runJson(args: string[], env: TestEnv = {}) {
  const stdout = execFileSync(process.execPath, [scriptPath, ...args], {
    cwd: process.cwd(),
    env: cleanEnv(env),
    encoding: "utf8",
  });
  return JSON.parse(stdout);
}

function makeFixture(indexes: unknown[]) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "s-db-5-"));
  const file = path.join(dir, "indexes.json");
  fs.writeFileSync(file, JSON.stringify({ indexes }), "utf8");
  return file;
}

const allFixtureIndexes = [
  {
    tablename: "requests",
    indexname: "prod_requests_submitted_display_id",
    indexdef: "CREATE INDEX prod_requests_submitted_display_id ON public.requests USING btree (submitted_at DESC NULLS LAST, display_no DESC NULLS LAST, id DESC)",
  },
  {
    tablename: "request_items",
    indexname: "prod_request_items_request_row_position_id",
    indexdef: "CREATE INDEX prod_request_items_request_row_position_id ON public.request_items USING btree (request_id, row_no, position_order, id)",
  },
  {
    tablename: "request_items",
    indexname: "prod_request_items_request_status",
    indexdef: "CREATE INDEX prod_request_items_request_status ON public.request_items USING btree (request_id, status, id)",
  },
  {
    tablename: "proposals",
    indexname: "prod_proposals_director_pending_submitted",
    indexdef:
      "CREATE INDEX prod_proposals_director_pending_submitted ON public.proposals USING btree (submitted_at DESC NULLS LAST, id DESC) WHERE submitted_at IS NOT NULL AND sent_to_accountant_at IS NULL",
  },
  {
    tablename: "proposals",
    indexname: "prod_proposals_request_supplier_updated",
    indexdef: "CREATE INDEX prod_proposals_request_supplier_updated ON public.proposals USING btree (request_id, supplier, updated_at DESC NULLS LAST, id DESC)",
  },
  {
    tablename: "proposal_items",
    indexname: "prod_proposal_items_proposal_id_id",
    indexdef: "CREATE INDEX prod_proposal_items_proposal_id_id ON public.proposal_items USING btree (proposal_id, id)",
  },
  {
    tablename: "market_listings",
    indexname: "prod_market_listings_company_status_created",
    indexdef:
      "CREATE INDEX prod_market_listings_company_status_created ON public.market_listings USING btree (company_id, status, created_at DESC NULLS LAST, id DESC)",
  },
  {
    tablename: "market_listings",
    indexname: "prod_market_listings_user_status_created",
    indexdef: "CREATE INDEX prod_market_listings_user_status_created ON public.market_listings USING btree (user_id, status, created_at DESC NULLS LAST, id DESC)",
  },
  {
    tablename: "work_progress_log",
    indexname: "prod_work_progress_log_progress_created",
    indexdef: "CREATE INDEX prod_work_progress_log_progress_created ON public.work_progress_log USING btree (progress_id, created_at DESC, id DESC)",
  },
  {
    tablename: "wh_ledger",
    indexname: "prod_wh_ledger_direction_moved_at",
    indexdef: "CREATE INDEX prod_wh_ledger_direction_moved_at ON public.wh_ledger USING btree (direction, moved_at, id)",
  },
];

describe("S-DB-5 production index verifier", () => {
  it("returns env_missing without touching production when read-only env is absent", () => {
    const result = runJson(["--target", "production", "--dry-run", "--json"]);

    expect(result.status).toBe("env_missing");
    expect(result.productionTouched).toBe(false);
    expect(result.productionWrites).toBe(false);
    expect(result.secretsPrinted).toBe(false);
    expect(result.indexesVerified).toBe(0);
  });

  it("rejects unknown targets", () => {
    const result = spawnSync(process.execPath, [scriptPath, "--target", "staging", "--json"], {
      cwd: process.cwd(),
      env: cleanEnv(),
      encoding: "utf8",
    });

    expect(result.status).not.toBe(0);
    expect(JSON.parse(result.stdout).status).toBe("blocked");
  });

  it("does not use service-role-like env", () => {
    const result = runJson(["--target", "production", "--dry-run", "--json"], {
      PROD_SUPABASE_SERVICE_ROLE_KEY: "service-role-secret",
    });

    expect(result.env.serviceRoleEnvPresent).toBe(true);
    expect(result.serviceRoleUsed).toBe(false);
    expect(JSON.stringify(result)).not.toContain("service-role-secret");
  });

  it("dry-run does not connect even when read-only env is present", () => {
    const result = runJson(["--target", "production", "--dry-run", "--json"], {
      PROD_DATABASE_READONLY_URL: "postgres://readonly.example.invalid/db",
    });

    expect(result.status).toBe("dry_run");
    expect(result.metadataVerificationExecuted).toBe(false);
    expect(result.productionTouched).toBe(false);
  });

  it("reports failed DB metadata access without leaking connection secrets", () => {
    const secretUrl = "postgres://readonly:sensitive-password@example.invalid/db";
    const result = runJson(["--target", "production", "--json"], {
      PROD_DATABASE_READONLY_URL: secretUrl,
    });
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("insufficient_readonly_access");
    expect(typeof result.psqlFailureClass).toBe("string");
    expect(result.productionMetadataRead).toBe(false);
    expect(result.productionMetadataReadAttempted).toBe(true);
    expect(serialized).not.toContain(secretUrl);
    expect(serialized).not.toContain("sensitive-password");
  });

  it("matches expected indexes by table, columns, and predicate instead of exact names", () => {
    const fixture = makeFixture(allFixtureIndexes);
    const result = runJson(["--target", "production", "--fixture", fixture, "--json"]);

    expect(result.status).toBe("verified");
    expect(result.indexesExpected).toBe(10);
    expect(result.indexesVerified).toBe(10);
    expect(result.indexesMissing).toBe(0);
  });

  it("reports missing indexes precisely", () => {
    const fixture = makeFixture(allFixtureIndexes.slice(0, -1));
    const result = runJson(["--target", "production", "--fixture", fixture, "--json"]);

    expect(result.status).toBe("missing");
    expect(result.indexesMissing).toBe(1);
    expect(result.expectedIndexes.find((item: { table: string }) => item.table === "wh_ledger").status).toBe("missing");
  });

  it("represents the director pending partial predicate", () => {
    const result = runJson(["--target", "production", "--dry-run", "--json"]);
    const partial = result.expectedIndexes.find((item: { expectedName: string }) =>
      item.expectedName.includes("director_pending"),
    );

    expect(partial.predicate).toContain("submitted_at IS NOT NULL");
    expect(partial.predicate).toContain("sent_to_accountant_at IS NULL");
  });

  it("keeps verification script read-only and metadata-only", () => {
    const source = fs.readFileSync(scriptPath, "utf8").toLowerCase();

    expect(source).not.toMatch(/\binsert\s+into\b/);
    expect(source).not.toMatch(/\bupdate\s+public\./);
    expect(source).not.toMatch(/\bdelete\s+from\b/);
    expect(source).not.toMatch(/\bdrop\s+/);
    expect(source).not.toMatch(/\balter\s+/);
    expect(source).not.toMatch(/\bcreate\s+(table|index|function|policy)\b/);
    expect(source).toContain("pg_class");
    expect(source).toContain("pg_index");
  });

  it("stays aligned with the S-DB-2 migration index count", () => {
    const migration = fs.readFileSync(migrationPath, "utf8").toLowerCase();
    const scriptSource = fs.readFileSync(scriptPath, "utf8");

    expect((migration.match(/create index if not exists/g) ?? []).length).toBe(10);
    expect((scriptSource.match(/expectedName: "/g) ?? []).length).toBe(10);
  });
});
