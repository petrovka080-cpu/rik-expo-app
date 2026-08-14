import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { Client } from "pg";

const ROOT = resolve(__dirname, "../../..");
const EVIDENCE = join(ROOT, ".release-runtime", "master11610-backend-canonical-r2", "evidence");
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL ?? "";
const R1_RELEASE_ID = "86e62f78-7aee-49ff-a033-bb832339d588";
const R2_RELEASE_ID = "c90141a2-fdd6-4e78-b01c-bad792c8df18";

type Json = Record<string, any>;

function argument(name: string): string {
  const prefix = `--${name}=`;
  return process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? "";
}
function sha256(value: Buffer | string): string { return createHash("sha256").update(value).digest("hex"); }
function git(args: string[]): string { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); }
function json(name: string): Json { return JSON.parse(readFileSync(join(EVIDENCE, name), "utf8")) as Json; }

async function main(): Promise<void> {
  const replay = Number(argument("replay"));
  if ((replay !== 1 && replay !== 2) || !DATABASE_URL) throw new Error("REPLAY_1_OR_2_AND_DATABASE_URL_REQUIRED");
  const database = new URL(DATABASE_URL).pathname.replace(/^\//, "");
  if (!/^master11610_r3_(?:replay_[12]|exact_final)$/.test(database)) throw new Error(`REPLAY_DATABASE_REJECTED:${database}`);
  const client = new Client({ connectionString: DATABASE_URL, application_name: `r3-replay-${replay}-manifest` });
  await client.connect();
  try {
    const releases = (await client.query("select id,status,parent_release_id from public.estimate_definition_release where id=any($1::uuid[]) order by schema_version", [[R1_RELEASE_ID, R2_RELEASE_ID]])).rows;
    const program = (await client.query("select denominator_total,admitted_global_count,queue_remaining,external_reference_count,batch006_started from public.estimate_program_control_state where singleton=true")).rows[0];
    const residue = (await client.query(`
      select
        (select count(*)::integer from public.estimate_revision where release_id=$1) revisions,
        (select count(*)::integer from public.estimate_compile_job where target_release_id=$1) jobs
    `, [R2_RELEASE_ID])).rows[0];
    const admission = json("R2_RELEASE_MASS_ADMISSION_PROOF.json");
    const audit = json("INDEPENDENT_R3_RELEASE_AUDIT.json");
    const activation = json("CANONICAL_R2_ATOMIC_ACTIVATION_PROOF.json");
    const migration = json("R2_UP_DOWN_UP_MIGRATION_REPLAY.json");
    const source = json("FINAL_PRE_ADMISSION_SOURCE_FINGERPRINT_R3.json");
    const coreFiles = [
      "R2_UP_DOWN_UP_MIGRATION_REPLAY.json",
      "CANONICAL_R1_BYTE_PRESERVATION_PROOF.json",
      "SERVER_1168_SUMMARY.json",
      "R2_RELEASE_MASS_ADMISSION_PROOF.json",
      "INDEPENDENT_R3_RELEASE_AUDIT.json",
      "CANONICAL_R1_TO_R2_RELEASE_LINEAGE_PROOF.json",
      "CANONICAL_R2_ATOMIC_ACTIVATION_PROOF.json",
    ];
    const replayDirectory = join(EVIDENCE, `replay-${replay}`);
    mkdirSync(replayDirectory, { recursive: true });
    const artifacts = coreFiles.map((name) => {
      const from = join(EVIDENCE, name);
      const to = join(replayDirectory, name);
      copyFileSync(from, to);
      const bytes = readFileSync(from);
      return { file: name, bytes: statSync(from).size, sha256: sha256(bytes) };
    });
    const green = source.label === "final-pre-admission"
      && migration.status === "GREEN" && admission.status === "GREEN" && audit.status === "GREEN" && activation.status === "GREEN"
      && admission.serverCompile?.green === 1_168 && admission.serverRecalculate?.green === 1_168
      && admission.constraintAwareScenarios?.green === 3_684 && admission.resourceBranchCoverage?.reached === 101_416
      && admission.runtimeResidueAfterCleanup?.total === 0
      && releases.find((row) => row.id === R1_RELEASE_ID)?.status === "retired"
      && releases.find((row) => row.id === R2_RELEASE_ID)?.status === "active"
      && Number(program.denominator_total) === 11_610 && Number(program.admitted_global_count) === 1_160
      && Number(program.queue_remaining) === 10_450 && Number(program.external_reference_count) === 8
      && program.batch006_started === false && Number(residue.revisions) === 0 && Number(residue.jobs) === 0;
    const manifest = {
      schemaVersion: "master11610-backend-r3-replay-manifest.r3", replay, generatedAt: new Date().toISOString(),
      source: { head: git(["rev-parse", "HEAD"]), tree: git(["rev-parse", "HEAD^{tree}"]), aggregateSha256: source.aggregateSha256 },
      database, releases, programControl: program, runtimeResidue: residue,
      gates: {
        migrationReplay: migration.status, massAdmission: admission.status, independentAudit: audit.status,
        activation: activation.status, compile: admission.serverCompile, recalculate: admission.serverRecalculate,
        scenarios: admission.constraintAwareScenarios, resourceBranchCoverage: admission.resourceBranchCoverage,
      },
      artifacts, artifactSetSha256: sha256(artifacts.map((row) => `${row.file}:${row.bytes}:${row.sha256}`).join("\n")),
      status: green ? "GREEN" : "RED",
    };
    writeFileSync(join(EVIDENCE, `REPLAY_${replay}_MANIFEST.json`), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify({ status: manifest.status, replay, database, artifactSetSha256: manifest.artifactSetSha256 }, null, 2)}\n`);
    if (!green) process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
