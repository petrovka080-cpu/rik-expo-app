#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

export const WAVE = "S-DB-5";

export const EXPECTED_INDEXES = [
  {
    table: "requests",
    columns: ["submitted_at", "display_no", "id"],
    predicate: null,
    expectedName: "idx_requests_submitted_display_id_sdb2",
  },
  {
    table: "request_items",
    columns: ["request_id", "row_no", "position_order", "id"],
    predicate: null,
    expectedName: "idx_request_items_request_row_position_id_sdb2",
  },
  {
    table: "request_items",
    columns: ["request_id", "status", "id"],
    predicate: null,
    expectedName: "idx_request_items_request_status_sdb2",
  },
  {
    table: "proposals",
    columns: ["submitted_at", "id"],
    predicate: "submitted_at IS NOT NULL AND sent_to_accountant_at IS NULL",
    expectedName: "idx_proposals_director_pending_submitted_sdb2",
  },
  {
    table: "proposals",
    columns: ["request_id", "supplier", "updated_at", "id"],
    predicate: null,
    expectedName: "idx_proposals_request_supplier_updated_sdb2",
  },
  {
    table: "proposal_items",
    columns: ["proposal_id", "id"],
    predicate: null,
    expectedName: "idx_proposal_items_proposal_id_id_sdb2",
  },
  {
    table: "market_listings",
    columns: ["company_id", "status", "created_at", "id"],
    predicate: null,
    expectedName: "idx_market_listings_company_status_created_sdb2",
  },
  {
    table: "market_listings",
    columns: ["user_id", "status", "created_at", "id"],
    predicate: null,
    expectedName: "idx_market_listings_user_status_created_sdb2",
  },
  {
    table: "work_progress_log",
    columns: ["progress_id", "created_at", "id"],
    predicate: null,
    expectedName: "idx_work_progress_log_progress_created_sdb2",
  },
  {
    table: "wh_ledger",
    columns: ["direction", "moved_at", "id"],
    predicate: null,
    expectedName: "idx_wh_ledger_direction_moved_at_sdb2",
  },
];

const PUBLIC_TABLES = [...new Set(EXPECTED_INDEXES.map((index) => index.table))].sort();

function parseArgs(argv) {
  const args = {
    target: null,
    dryRun: false,
    json: false,
    fixture: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--target") {
      args.target = argv[index + 1] ?? null;
      index += 1;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--fixture") {
      args.fixture = argv[index + 1] ?? null;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function envState(env) {
  return {
    PROD_SUPABASE_URL: env.PROD_SUPABASE_URL ? "present_redacted" : "missing",
    PROD_SUPABASE_READONLY_KEY: env.PROD_SUPABASE_READONLY_KEY ? "present_redacted" : "missing",
    PROD_DATABASE_READONLY_URL: env.PROD_DATABASE_READONLY_URL ? "present_redacted" : "missing",
    serviceRoleEnvPresent: Object.keys(env).some((key) => /SERVICE_ROLE/i.test(key) && Boolean(env[key])),
    serviceRoleUsed: false,
  };
}

function baseResult({ env, status, target = "production" }) {
  return {
    wave: WAVE,
    target,
    status,
    env: envState(env),
    productionTouched: false,
    productionWrites: false,
    productionMetadataRead: false,
    productionDataRowsRead: false,
    ddlExecuted: false,
    migrationCreated: false,
    serviceRoleUsed: false,
    secretsPrinted: false,
    expectedIndexes: EXPECTED_INDEXES.map((index) => ({
      table: index.table,
      columns: index.columns,
      predicate: index.predicate,
      expectedName: index.expectedName,
      verified: false,
      status,
      matchedIndexName: null,
    })),
    indexesExpected: EXPECTED_INDEXES.length,
    indexesVerified: 0,
    indexesMissing: 0,
    insufficientAccess: 0,
    metadataQueryTables: ["pg_class", "pg_index", "pg_attribute", "pg_namespace"],
  };
}

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/["'`]/g, "")
    .replace(/\bpublic\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePredicate(value) {
  return normalizeText(value).replace(/[()]/g, "");
}

function indexDefinition(row) {
  return String(row.indexdef ?? row.definition ?? row.sql ?? "");
}

function indexName(row) {
  return String(row.indexname ?? row.indexName ?? row.name ?? "");
}

function tableName(row) {
  return String(row.tablename ?? row.tableName ?? row.table ?? "");
}

export function matchExpectedIndex(expected, row) {
  if (normalizeText(tableName(row)) !== normalizeText(expected.table)) return false;

  const name = normalizeText(indexName(row));
  const definition = normalizeText(indexDefinition(row));
  const expectedName = normalizeText(expected.expectedName);

  if (name === expectedName) return true;

  if (!definition.includes(normalizeText(expected.table))) return false;
  for (const column of expected.columns) {
    if (!definition.includes(normalizeText(column))) return false;
  }

  if (expected.predicate) {
    const predicate = normalizePredicate(expected.predicate);
    const normalizedDefinition = normalizePredicate(definition);
    for (const token of predicate.split(" ").filter(Boolean)) {
      if (!normalizedDefinition.includes(token)) return false;
    }
  }

  return true;
}

export function summarizeIndexes(rows) {
  const expectedIndexes = EXPECTED_INDEXES.map((expected) => {
    const match = rows.find((row) => matchExpectedIndex(expected, row));
    return {
      table: expected.table,
      columns: expected.columns,
      predicate: expected.predicate,
      expectedName: expected.expectedName,
      verified: Boolean(match),
      status: match ? "verified" : "missing",
      matchedIndexName: match ? indexName(match) || expected.expectedName : null,
    };
  });

  const indexesVerified = expectedIndexes.filter((index) => index.verified).length;
  const indexesMissing = expectedIndexes.length - indexesVerified;

  return {
    status: indexesMissing === 0 ? "verified" : "missing",
    expectedIndexes,
    indexesExpected: expectedIndexes.length,
    indexesVerified,
    indexesMissing,
  };
}

function loadFixture(filePath) {
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return Array.isArray(parsed) ? parsed : parsed.indexes ?? [];
}

function buildMetadataQuery() {
  const tableLiterals = PUBLIC_TABLES.map((table) => `'${table.replace(/'/g, "''")}'`).join(",");
  return `
select
  n.nspname as schemaname,
  t.relname as tablename,
  i.relname as indexname,
  pg_get_indexdef(i.oid) as indexdef
from pg_class t
join pg_namespace n on n.oid = t.relnamespace
join pg_index ix on ix.indrelid = t.oid
join pg_class i on i.oid = ix.indexrelid
where n.nspname = 'public'
  and t.relname in (${tableLiterals})
order by t.relname, i.relname;
`.trim();
}

function parsePsqlRows(stdout) {
  return String(stdout || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [schemaname, tablename, indexname, indexdef] = line.split("\t");
      return { schemaname, tablename, indexname, indexdef };
    });
}

function runPsqlMetadataVerification(databaseUrl) {
  const result = spawnSync(
    "psql",
    [
      databaseUrl,
      "--no-psqlrc",
      "--tuples-only",
      "--no-align",
      "--field-separator",
      "\t",
      "--command",
      buildMetadataQuery(),
    ],
    {
      encoding: "utf8",
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  if (result.error || result.status !== 0) {
    return {
      ok: false,
      reason: "read-only DB metadata query could not be executed with local psql",
    };
  }

  return {
    ok: true,
    rows: parsePsqlRows(result.stdout),
  };
}

export function verifyProductionIndexes(options, env = process.env) {
  if (options.target !== "production") {
    return {
      ...baseResult({ env, status: "blocked", target: options.target ?? "missing" }),
      reason: "unknown target; only production is supported",
    };
  }

  if (options.fixture) {
    const rows = loadFixture(options.fixture);
    const summary = summarizeIndexes(rows);
    return {
      ...baseResult({ env, status: summary.status }),
      ...summary,
      fixtureUsed: true,
      productionTouched: false,
      productionMetadataRead: false,
      metadataVerificationExecuted: true,
    };
  }

  const hasSupabaseReadonly = Boolean(env.PROD_SUPABASE_URL && env.PROD_SUPABASE_READONLY_KEY);
  const hasDatabaseReadonly = Boolean(env.PROD_DATABASE_READONLY_URL);
  const envMissing = !hasSupabaseReadonly && !hasDatabaseReadonly;

  if (envMissing) {
    return {
      ...baseResult({ env, status: "env_missing" }),
      reason: "Missing production read-only env: PROD_SUPABASE_URL/PROD_SUPABASE_READONLY_KEY or PROD_DATABASE_READONLY_URL",
      metadataVerificationExecuted: false,
    };
  }

  if (options.dryRun) {
    return {
      ...baseResult({ env, status: "dry_run" }),
      metadataVerificationExecuted: false,
      reason: "Dry-run only; no production metadata connection attempted",
    };
  }

  if (!hasDatabaseReadonly) {
    return {
      ...baseResult({ env, status: "insufficient_readonly_access" }),
      insufficientAccess: EXPECTED_INDEXES.length,
      reason: "Supabase read-only REST credentials cannot safely inspect pg index metadata without an exposed metadata RPC/view",
      metadataVerificationExecuted: true,
    };
  }

  const verification = runPsqlMetadataVerification(env.PROD_DATABASE_READONLY_URL);
  if (!verification.ok) {
    return {
      ...baseResult({ env, status: "insufficient_readonly_access" }),
      insufficientAccess: EXPECTED_INDEXES.length,
      reason: verification.reason,
      metadataVerificationExecuted: true,
      productionTouched: true,
      productionMetadataRead: true,
    };
  }

  const summary = summarizeIndexes(verification.rows);
  return {
    ...baseResult({ env, status: summary.status }),
    ...summary,
    metadataVerificationExecuted: true,
    productionTouched: true,
    productionMetadataRead: true,
  };
}

function printResult(result, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write(`${result.wave} ${result.target}: ${result.status}\n`);
}

export function main(argv = process.argv.slice(2), env = process.env) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    const result = {
      ...baseResult({ env, status: "blocked", target: "unknown" }),
      reason: error instanceof Error ? error.message : "Invalid arguments",
    };
    printResult(result, true);
    return 1;
  }

  const result = verifyProductionIndexes(args, env);
  printResult(result, args.json);
  return result.status === "blocked" ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}
