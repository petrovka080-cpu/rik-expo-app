import fs from "node:fs";
import path from "node:path";

import {
  buildBoundedMigrationPlan,
  createPostgresBoundedMigrationExecutorAdapter,
  formatBoundedMigrationPlanForLog,
  formatBoundedMigrationExecutorResultForLog,
  runBoundedMigrationExecutor,
  type BoundedMigrationLocalMigration,
  type BoundedMigrationMode,
  type BoundedMigrationRemoteMigration,
  type BoundedMigrationSqlClient,
} from "./boundedMigrationRunner.shared";

interface ParsedArgs {
  mode: BoundedMigrationMode;
  allowlist: string[];
  includeAll: boolean;
  destructiveApproval: boolean;
  remoteHistoryFile?: string;
  migrationsDir: string;
  json: boolean;
  execute: boolean;
  databaseUrlEnv?: string;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const localMigrations = readLocalMigrations(args.migrationsDir);
  const remoteMigrations = args.remoteHistoryFile
    ? readRemoteHistory(args.remoteHistoryFile)
    : [];
  if (args.execute) {
    const output = await runExecuteMode(args, localMigrations, remoteMigrations);
    if (args.json) {
      process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    } else {
      process.stdout.write(`${formatHumanPlan(output)}\n`);
    }
    process.exitCode = output.status === "PASS" ? 0 : 1;
    return;
  }

  const plan = buildBoundedMigrationPlan({
    allowlist: args.allowlist,
    localMigrations,
    remoteMigrations,
    mode: args.mode,
    includeAll: args.includeAll,
    destructiveApproval: args.destructiveApproval,
  });
  const output = formatBoundedMigrationPlanForLog(plan);

  if (args.json) {
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } else {
    process.stdout.write(`${formatHumanPlan(output)}\n`);
  }

  process.exitCode = plan.status === "PASS" ? 0 : 1;
}

function parseArgs(argv: string[]): ParsedArgs {
  const modeArg = argv[0] === "apply" ? "apply" : "plan";
  const rest = argv[0] === "apply" || argv[0] === "plan" ? argv.slice(1) : argv;
  const allowlist: string[] = [];
  let includeAll = false;
  let destructiveApproval = false;
  let remoteHistoryFile: string | undefined;
  let migrationsDir = path.join(process.cwd(), "supabase", "migrations");
  let json = false;
  let execute = false;
  let databaseUrlEnv: string | undefined;

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--allow") {
      const value = rest[index + 1];
      if (value) {
        allowlist.push(value);
        index += 1;
      }
    } else if (arg === "--include-all") {
      includeAll = true;
    } else if (arg === "--destructive-approved") {
      destructiveApproval = true;
    } else if (arg === "--remote-history-file") {
      const value = rest[index + 1];
      if (value) {
        remoteHistoryFile = value;
        index += 1;
      }
    } else if (arg === "--migrations-dir") {
      const value = rest[index + 1];
      if (value) {
        migrationsDir = value;
        index += 1;
      }
    } else if (arg === "--json") {
      json = true;
    } else if (arg === "--execute") {
      execute = true;
    } else if (arg === "--database-url-env") {
      const value = rest[index + 1];
      if (value) {
        databaseUrlEnv = value;
        index += 1;
      }
    }
  }

  return {
    mode: modeArg,
    allowlist,
    includeAll,
    destructiveApproval,
    remoteHistoryFile,
    migrationsDir,
    json,
    execute,
    databaseUrlEnv,
  };
}

function readLocalMigrations(migrationsDir: string): BoundedMigrationLocalMigration[] {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .map((file) => {
      const fullPath = path.join(migrationsDir, file);
      return {
        file,
        sqlSource: fs.readFileSync(fullPath, "utf8"),
      };
    });
}

function readRemoteHistory(file: string): BoundedMigrationRemoteMigration[] {
  const parsed = JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")) as unknown;
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const record = item as Record<string, unknown>;
    const version = typeof record.version === "string" ? record.version : undefined;
    const name = typeof record.name === "string" ? record.name : undefined;
    return version ? [{ version, name }] : [];
  });
}

function formatHumanPlan(output: Record<string, unknown>): string {
  const status = String(output.status ?? "UNKNOWN");
  const mode = String(output.mode ?? "plan");
  const selectedCount = String(output.selected_migration_count ?? 0);
  const pendingCount = String(output.pending_migrations_count ?? 0);
  return [
    `status=${status}`,
    `mode=${mode}`,
    `selected_migration_count=${selectedCount}`,
    `pending_migrations_count=${pendingCount}`,
    `include_all_used=${String(output.include_all_used ?? false)}`,
    `dry_run_only=${String(output.dry_run_only ?? false)}`,
    `would_write_db=${String(output.would_write_db ?? false)}`,
  ].join("\n");
}

async function runExecuteMode(
  args: ParsedArgs,
  localMigrations: BoundedMigrationLocalMigration[],
  remoteMigrations: BoundedMigrationRemoteMigration[],
): Promise<Record<string, unknown>> {
  if (args.mode !== "apply") {
    return {
      status: "BLOCKED",
      executor_mode: "execute",
      failure_stage: "plan",
      blockers: [
        {
          code: "EXECUTE_REQUIRES_APPLY_MODE",
          message: "Executor writes are only available from apply mode.",
          migrations: [],
        },
      ],
    };
  }

  if (!args.databaseUrlEnv) {
    return {
      status: "BLOCKED",
      executor_mode: "execute",
      failure_stage: "adapter_missing",
      blockers: [
        {
          code: "DATABASE_URL_ENV_MISSING",
          message: "A database URL environment variable name is required for execute mode.",
          migrations: [],
        },
      ],
    };
  }

  const databaseUrl = process.env[args.databaseUrlEnv];
  if (!databaseUrl) {
    return {
      status: "BLOCKED",
      executor_mode: "execute",
      failure_stage: "adapter_missing",
      blockers: [
        {
          code: "DATABASE_URL_VALUE_MISSING",
          message: "The requested database URL environment variable is not present.",
          migrations: [],
        },
      ],
    };
  }

  const pgModule = await import("pg");
  const client = new pgModule.Client({
    connectionString: databaseUrl,
  }) as BoundedMigrationSqlClient & {
    connect(): Promise<unknown>;
    end(): Promise<unknown>;
  };
  await client.connect();
  try {
    const result = await runBoundedMigrationExecutor({
      executorMode: "execute",
      allowlist: args.allowlist,
      localMigrations,
      remoteMigrations,
      includeAll: args.includeAll,
      destructiveApproval: args.destructiveApproval,
      adapter: createPostgresBoundedMigrationExecutorAdapter(client),
    });
    return formatBoundedMigrationExecutorResultForLog(result);
  } finally {
    await client.end();
  }
}

main().catch(() => {
  process.stderr.write("bounded migration runner failed before producing a sanitized result\n");
  process.exitCode = 1;
});
