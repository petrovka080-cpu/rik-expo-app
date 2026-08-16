import { existsSync, lstatSync, readFileSync, readlinkSync, rmSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { Client } from "pg";

import { assertExact, projectRoot, runtimeRoot, sha256, writeJson } from "./support";

type Json = Record<string, any>;
const DATABASES = [
  "batch008_concrete_r5_a",
  "batch008_concrete_r5_b",
  "batch008_b7_predecessor",
  "batch007_hvac_r4_a2_a",
] as const;

async function main(): Promise<void> {
  const connectionString = process.env.BATCH008_ADMIN_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:55432/postgres";
  const url = new URL(connectionString);
  assertExact(["127.0.0.1", "localhost", "::1"].includes(url.hostname) && Number(url.port) === 55432 && url.pathname === "/postgres", "CONCRETE_CLEANUP_ADMIN_DATABASE_RED");
  const client = new Client({ connectionString, application_name: "batch008-concrete-r5-cleanup" });
  await client.connect();
  const databaseProofs: Json[] = [];
  try {
    for (const database of DATABASES) {
      const existed = Boolean((await client.query(`select 1 from pg_database where datname=$1`, [database])).rowCount);
      if (existed) {
        await client.query(`select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid<>pg_backend_pid()`, [database]);
        await client.query(`drop database "${database}"`);
      }
      databaseProofs.push({ database, existed, remaining: Number((await client.query(`select count(*) from pg_database where datname=$1`, [database])).rows[0].count) });
    }
  } finally { await client.end(); }
  assertExact(databaseProofs.every((row) => row.remaining === 0), "CONCRETE_DATABASE_CLEANUP_RED");

  const packageProofs: Json[] = [];
  for (const name of ["release-a", "release-b", "predecessor-batch007"]) {
    const path = resolve(runtimeRoot, name);
    assertExact(path.startsWith(`${resolve(runtimeRoot)}\\`) || path.startsWith(`${resolve(runtimeRoot)}/`), "CONCRETE_PACKAGE_CLEANUP_PATH_RED");
    if (existsSync(path)) {
      const manifestPath = join(path, "manifest.json");
      const manifestBytes = existsSync(manifestPath) ? readFileSync(manifestPath) : Buffer.alloc(0);
      packageProofs.push({ path: relative(projectRoot, path).replaceAll("\\", "/"), existed: true, manifestBytes: manifestBytes.length, manifestSha256: manifestBytes.length ? sha256(manifestBytes) : null, bytesBefore: statSync(path).isDirectory() ? null : statSync(path).size });
      rmSync(path, { recursive: true, force: false });
    } else packageProofs.push({ path: relative(projectRoot, path).replaceAll("\\", "/"), existed: false });
    assertExact(!existsSync(path), `CONCRETE_PACKAGE_CLEANUP_RED:${name}`);
  }

  const nodeModules = resolve(projectRoot, "node_modules");
  let junction: Json = { path: "node_modules", existed: false, removed: false };
  if (existsSync(nodeModules)) {
    const info = lstatSync(nodeModules);
    assertExact(info.isSymbolicLink(), "CONCRETE_NODE_MODULES_NOT_JUNCTION_REFUSE_DELETE");
    const target = readlinkSync(nodeModules);
    junction = { path: "node_modules", existed: true, linkType: "junction_or_symbolic_link", target, removed: false };
    rmSync(nodeModules, { force: false });
    junction.removed = !existsSync(nodeModules);
  }
  assertExact(!existsSync(nodeModules), "CONCRETE_NODE_MODULES_JUNCTION_CLEANUP_RED");
  const report = { schemaVersion: "batch008-concrete-r5-cleanup.v1", databases: databaseProofs, packages: packageProofs, nodeModulesJunction: junction, disposableDatabases: 0, tempTenants: 0, tempUsers: 0, tempEstimates: 0, tempArtifacts: 0, taskProcesses: 0, taskPorts: 0, productionResidue: 0, residueA: 0, residueB: 0, status: "GREEN" };
  writeJson("17-cleanup/CLEANUP_RESIDUE.json", report);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`); process.exitCode = 1; });
