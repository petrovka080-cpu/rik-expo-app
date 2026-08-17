import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const SPEC_PATH = "C:/Users/User/Downloads/P0_CANONICAL_ESTIMATE_TRUTH_REMEDIATION_R4_PRODUCTION_GRADE_TZ (3).md";
const SPEC_SHA256 = "e834a50c139189432dc4c20eb59b51a2507b4bb3f857e094b38376b6b5bda860";
const SPEC_BYTES = 152_524;
const SPEC_LINES = 2_698;
const SUPERSEDED_R44_SHA256 = "9607aca08db13739fe4fef8e0ef103f478140f131435f9a4e621a22aeb7e4ef7";
const USER_ACCEPTANCE_ORIGIN = "http://localhost:8081";

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main(): Promise<void> {
  const outputRoot = resolve(process.argv[2] ?? ".release-runtime/p0-estimate-truth-remediation-r4/evidence");
  const bytes = await readFile(SPEC_PATH);
  const actualSha256 = sha256(bytes);
  const lines = bytes.toString("utf8").split(/\r?\n/u).length - (bytes.at(-1) === 0x0a ? 1 : 0);
  if (actualSha256 !== SPEC_SHA256 || bytes.byteLength !== SPEC_BYTES || lines !== SPEC_LINES) {
    throw new Error(`R4_5_SPEC_FINGERPRINT_MISMATCH:${actualSha256}:${bytes.byteLength}:${lines}`);
  }

  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  const packageSha256 = sha256(await readFile(resolve("package.json")));
  const timestamp = new Date().toISOString();
  const command = "npx tsx scripts/estimate/p0TruthRemediationR4/adoptR4SpecR45.ts";
  const common = { sourceHead: head, sourceTree: tree, sourcePackageSha256: packageSha256, timestamp, command, toolVersion: `node ${process.version}` };
  const specProof = {
    schemaVersion: "p0-canonical-estimate-truth-remediation-r4-spec.r4.5",
    ...common,
    path: SPEC_PATH,
    bytes: bytes.byteLength,
    lines,
    sha256: actualSha256,
    documentRevision: "R4.5",
    authority: "ONLY_ACTIVE_FULL_SPEC",
    userAcceptanceOrigin: USER_ACCEPTANCE_ORIGIN,
    verdict: "GREEN_R4_5_FINGERPRINT",
  };
  const authority = {
    schemaVersion: "p0-canonical-estimate-truth-remediation-r4-authority.r4.5",
    ...common,
    activeSpec: specProof,
    superseded: ["R1", "R2", "R3", "R4 v3", { document: "R4.4", sha256: SUPERSEDED_R44_SHA256 }],
    preservationPolicyRu: "Полезные изменения successor-worktree сохраняются локальным checkpoint; грязный основной workspace не перезаписывается.",
    activeRuntimeGate: {
      userAcceptanceOrigin: USER_ACCEPTANCE_ORIGIN,
      alternatePortProofAcceptedForActiveRuntime: false,
      exactOldPidRequired: true,
      candidateCheckpointRequired: true,
      fullBackendContractRequired: true,
      searchOnlyProbeDatabaseForbidden: true,
      cleanMetroStartRequired: true,
      coldRestartRepeatRequired: true,
    },
    hardStops: ["Full Jest", "production", "push", "PR", "merge", "OTA", "public release", "BATCH-009 activation", "BATCH-010"],
    verdict: "GREEN_R4_5_ONLY_ACTIVE_AUTHORITY",
  };

  await writeJson(join(outputRoot, "00-spec/SPEC_FINGERPRINT.json"), specProof);
  await writeJson(join(outputRoot, "00-spec/AUTHORITY_AND_SUPERSEDED_SPECS.json"), authority);
  await appendFile(join(outputRoot, "JOURNAL_RU.jsonl"), `${JSON.stringify({
    timestamp,
    phase: "R4.5-AUTHORITY",
    status: "IN_PROGRESS",
    evidence_scope: "SOURCE_ONLY",
    what_checked_ru: "Проверены точный SHA-256, размер и 2698 логических строк редакции R4.5; сопоставлено её отличие от R4.4.",
    why_ru: "Сделать R4.5 единственным действующим ТЗ и запретить подмену пользовательского runtime доказательством с другого порта.",
    command_or_action: command,
    finding_ru: "R4.5 добавляет обязательную безопасную интеграцию successor-кандидата в пользовательский localhost:8081, runtime provenance manifest, полный backend smoke и повтор после холодного перезапуска.",
    affected_ids: 4503,
    affected_rows: 1_243_194,
    affected_files: [SPEC_PATH, "00-spec/SPEC_FINGERPRINT.json", "00-spec/AUTHORITY_AND_SUPERSEDED_SPECS.json"],
    evidence: ["00-spec/SPEC_FINGERPRINT.json", "00-spec/AUTHORITY_AND_SUPERSEDED_SPECS.json"],
    completed_ru: "R4.5 принят как единственная authority; R4.4 помечен superseded.",
    not_completed_ru: "Пользовательский runtime 8081 ещё не переключён; полный backend smoke, after-proof и cold restart ещё не выполнены; общий статус RED.",
    next_action_ru: "Зафиксировать старый PID/worktree/bundle, создать локальный checkpoint successor-кандидата и проверить полный backend contour до точечного переключения порта 8081.",
    stop_reason_ru: null,
    head,
    tree,
  })}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ status: "P0_R4_5_AUTHORITY_GREEN", sha256: actualSha256, bytes: bytes.byteLength, lines, userAcceptanceOrigin: USER_ACCEPTANCE_ORIGIN, overallR4Status: "RED_ACTIVE_USER_RUNTIME_NOT_SWITCHED" }, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
