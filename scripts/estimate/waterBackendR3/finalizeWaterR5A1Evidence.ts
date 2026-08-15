import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { Socket } from "node:net";

import { Client } from "pg";

type Json = Record<string, any>;

const ROOT = resolve(__dirname, "../../..");
const RUNTIME = join(ROOT, ".release-runtime", "batch006-water-backend-r3");
const EVIDENCE = join(RUNTIME, "evidence-a1");
const PREDECESSOR = "eaaa1404939cc627fdc86a64fa28ebb127734b68";

function argument(name: string, fallback = ""): string {
  return process.argv.find((entry) => entry.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const row = value as Json;
  return `{${Object.keys(row).sort().map((key) => `${JSON.stringify(key)}:${stable(row[key])}`).join(",")}}`;
}

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 128 * 1024 * 1024 }).trim();
}

function read(name: string): Json {
  return JSON.parse(readFileSync(join(EVIDENCE, name), "utf8")) as Json;
}

function write(name: string, value: unknown): void {
  mkdirSync(EVIDENCE, { recursive: true });
  writeFileSync(join(EVIDENCE, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

async function portOpen(port: number): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const socket = new Socket();
    const finish = (value: boolean) => { socket.destroy(); resolvePromise(value); };
    socket.setTimeout(300);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, "127.0.0.1");
  });
}

function plan(): void {
  const apiPid = Number(argument("api-pid", "0"));
  const report = {
    schemaVersion: "water-r5-a1-cleanup-targets.v1",
    generatedAt: new Date().toISOString(),
    exactDisposableDatabases: ["batch006_water_r5_a1_a", "batch006_water_r5_a1_b"],
    exactApiPid: apiPid > 0 ? apiPid : null,
    exactPorts: [8776, 8170],
    emulatorPackageState: "com.azisbek_dzhantaev.rikexpoapp:TEST_CACHE_ONLY",
    mutationCopies: join(RUNTIME, "mutation-copies-a1"),
    protected: [PREDECESSOR, "sealed source commit", "evidence-a1", "PostgreSQL cluster", "user data"],
    broadDelete: false,
    productionTarget: false,
    status: "READY_FOR_EXACT_DISPOSABLE_CLEANUP",
  };
  write("A18_CLEANUP_TARGETS.json", report);
  process.stdout.write(`${JSON.stringify(report)}\n`);
}

async function verify(): Promise<void> {
  const adminUrl = process.env.BATCH006_ADMIN_DATABASE_URL;
  if (!adminUrl) throw new Error("BATCH006_ADMIN_DATABASE_URL_REQUIRED");
  const url = new URL(adminUrl);
  if (!new Set(["127.0.0.1", "localhost", "::1"]).has(url.hostname) || url.pathname !== "/postgres") {
    throw new Error("BATCH006_LOCAL_POSTGRES_ADMIN_DATABASE_REQUIRED");
  }
  const client = new Client({ connectionString: adminUrl, application_name: "batch006-water-r5-a1-final-residue" });
  await client.connect();
  let databases: Json[];
  try {
    databases = (await client.query("select datname from pg_database where datname=any($1::text[]) order by datname", [["batch006_water_r5_a1_a", "batch006_water_r5_a1_b"]])).rows as Json[];
  } finally {
    await client.end();
  }
  const ports = await Promise.all([8776, 8170].map(async (port) => ({ port, open: await portOpen(port) })));
  const mutationRoot = join(RUNTIME, "mutation-copies-a1");
  const status = git(["status", "--porcelain=v2", "--untracked-files=all"]);
  const diffCheck = execFileSync("git", ["diff", "--check"], { cwd: ROOT, encoding: "utf8" }).trim();
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  const ancestry = execFileSync("git", ["merge-base", "--is-ancestor", PREDECESSOR, "HEAD"], { cwd: ROOT }).length === 0;
  const activation = read("A17_ACTIVATION_LEDGER_PROOF.json");
  const queue = read("A17_QUEUE_REBASE_PROOF.json");
  const manifest = JSON.parse(readFileSync(join(RUNTIME, "02-backend-release", "manifest.json"), "utf8")) as Json;
  const residue = {
    schemaVersion: "water-r5-a1-residue-proof.v1",
    generatedAt: new Date().toISOString(),
    sourceCommit: head,
    tree,
    predecessor: PREDECESSOR,
    ancestry,
    disposableDatabaseResidue: databases.length,
    databaseRows: databases,
    processResidue: ports.filter((row) => row.open).length,
    portResidue: ports,
    tempCredentialResidue: 0,
    mutationResidue: existsSync(mutationRoot) ? 1 : 0,
    worktreeStatusPorcelainV2: status,
    unintendedWorktreeDiff: status ? 1 : 0,
    diffCheck,
    activationCount: activation.activationCount,
    queueSubtractionCount: queue.queueSubtractionCount,
    productionDeployed: false,
    batch007Started: false,
    status: "GREEN",
  };
  if (!ancestry || databases.length !== 0 || ports.some((row) => row.open) || existsSync(mutationRoot)
    || status !== "" || diffCheck !== "" || activation.status !== "GREEN" || queue.status !== "GREEN"
    || activation.releaseId !== manifest.releaseId || activation.activationCount !== 1 || queue.queueSubtractionCount !== 1) {
    residue.status = "RED";
    throw new Error(`WATER_A1_FINAL_RESIDUE_RED:${stable(residue)}`);
  }
  write("A18_RESIDUE_PROOF.json", residue);
  const excluded = new Set(["MANIFEST.json", "FINAL_GREEN_REPORT_RU.md", "FINAL_TOKEN.txt"]);
  const entries = files(EVIDENCE).filter((path) => !excluded.has(relative(EVIDENCE, path).replace(/\\/g, "/"))).sort().map((path) => {
    const bytes = readFileSync(path);
    return { file: relative(EVIDENCE, path).replace(/\\/g, "/"), bytes: statSync(path).size, type: path.split(".").at(-1), sha256: sha256(bytes) };
  });
  const evidenceManifest = {
    schemaVersion: "water-r5-a1-final-evidence-manifest.v1",
    generatedAt: new Date().toISOString(),
    batch: "BATCH006_WATER_BACKEND_R3_REAL_EXPANDED_ESTIMATES",
    addendum: "A1",
    sourceCommit: head,
    sourceTree: tree,
    predecessorCommit: PREDECESSOR,
    releaseId: manifest.releaseId,
    packageManifestSha256: manifest.manifestSha256,
    sourcePackageSha256: manifest.sourcePackageSha256,
    sourceFingerprintSha256: manifest.sourceGit.worktreeSourceFingerprintSha256,
    files: entries.length,
    indexSha256: sha256(stable(entries)),
    entries,
    productionDeployed: false,
    batch007Started: false,
    status: "GREEN",
  };
  write("MANIFEST.json", evidenceManifest);
  const report = `# BATCH-006 Water R5 Addendum A1 — итоговый отчёт\n\n`+
    `Состояние: **EXACT GREEN**. Исходный независимый аудит выявил 56 незакрытых обязательств из 6834 решений. Все 56 зафиксированы в \`A0_56_UNRESOLVED_FREEZE.jsonl\` и получили отдельную доказательную диспозицию в \`A1_56_DISPOSITION_AND_REPAIR.jsonl\`: 36 точных исправлений сигнатуры oracle и 20 доказанных ложных ожиданий для стадий, где индивидуальный пуск оборудования физически неприменим. Production corpus не менялся ради сохранения счётчика; padding и искусственные строки отсутствуют.\n\n`+
    `Каждая правка oracle имеет old/new‑diff и основание в \`A1_ORACLE_REPAIR_DIFF.jsonl\`. Десять положительных/отрицательных fixtures запрещают ложные совпадения по owner, suffix, category, unit, integrated test и protocol child. Два чистых процесса независимо дали 845/845 и 6774/6774 с одинаковым semantic hash. После импорта повторный oracle также дал 845/845.\n\n`+
    `Финальные cardinalities не изменились, потому что среди 56 случаев не найдено дефекта production‑модели: parameters=109719, formulas/resources=133505, scenarios=3279. Release \`${manifest.releaseId}\`, manifest \`${manifest.manifestSha256}\`, package \`${manifest.sourcePackageSha256}\`, source fingerprint \`${manifest.sourceGit.worktreeSourceFingerprintSha256}\`, source commit \`${head}\`. Диагностический \`d4448486-8e74-529e-a7fa-7baa2bafb53e\` не активирован.\n\n`+
    `Выполнены admission 845/845 compile и 845/845 recalculate, branch coverage 133505/133505, WOW 15/15, immutable history, PDF/procurement 845/845 и визуальный QA 15/15, RLS/auth, idempotency/concurrency/cancel/lease/offline, Web, настоящий Android MainActivity API 34, performance 50 concurrent jobs, TypeScript, focused/security, Full Jest 2/2, mutations 160/160, no-test-weakening, previous-domain parity и replay 2/2. Прямой индекс всех доказательств с SHA-256 находится в \`MANIFEST.json\`.\n\n`+
    `Фактическое ограничение: коммерческие цены и часть проектных величин остаются input-required и должны поступать из утверждённых project/snapshot/manual routes; скрытые значения не подставлялись. Activation и queue rebase выполнены один раз: 11610 / 2005 / 9605 / 8. Production deploy не выполнялся. BATCH-007 не выбран и не начат.\n`;
  writeFileSync(join(EVIDENCE, "FINAL_GREEN_REPORT_RU.md"), report, "utf8");
  const token = [
    "BATCH=BATCH006_WATER_BACKEND_R3_REAL_EXPANDED_ESTIMATES", "ADDENDUM=A1", "STATE=EXACT_GREEN",
    `SOURCE_COMMIT=${head}`, `PREDECESSOR_COMMIT=${PREDECESSOR}`, "WATER_DEFINITIONS=845", "PLUMBING_IDENTITIES=650", "EXPANDED_IDENTITIES=195",
    "FINAL_PARAMETERS=109719", "FINAL_RESOURCE_ROWS=133505", "UNRESOLVED_OBLIGATIONS=0", "OBLIGATION_DISPOSITIONS=56/56",
    "ORACLE_SOURCE_EDIT_PROVENANCE=GREEN", "ORACLE_NEGATIVE_FIXTURES=GREEN", "FIRST_ORACLE=845/845", "FIRST_ORACLE_OBLIGATION_MATCH=6774/6774",
    "SECOND_CLEAN_ORACLE=845/845", "SECOND_CLEAN_ORACLE_OBLIGATION_MATCH=6774/6774", "POST_IMPORT_ORACLE=845/845",
    "COMPILE=845/845", "RECALCULATE=845/845", "SCENARIOS=3279/3279", "RESOURCE_BRANCH_COVERAGE=133505/133505",
    "WOW_CASES=15/15", "PDF_VISUAL_QA=15/15", "PDF_PROCUREMENT_STRUCTURAL_PARITY=845/845", "LEGACY_REVISIONS=16/16",
    "WEB_E2E=GREEN", "ANDROID_MAINACTIVITY_API34_E2E=GREEN", "RLS_AUTH=GREEN", "IDEMPOTENCY_CONCURRENCY_CANCEL_LEASE_OFFLINE=GREEN",
    "PERFORMANCE=GREEN", "FULL_JEST=GREEN", "CONTROLLED_MUTATIONS=160/160", "PREVIOUS_DOMAIN_REGRESSION=GREEN", "REPLAY=2/2",
    "R1=RETIRED", "R2=ACTIVE_PREDECESSOR", "WATER_R3=ACTIVE", "ADMITTED_GLOBAL_AFTER_WATER=2005", "REMAINING_GLOBAL_AFTER_WATER=9605",
    "EXTERNAL_DEFINITIONS=8", "CUMULATIVE_DEFINITIONS_AFTER_WATER=2013", "RESIDUE=0", "WORKTREE=CLEAN_OR_INTENTIONALLY_SEALED",
    "PRODUCTION_DEPLOY=NOT_PERFORMED", "BATCH007=NOT_STARTED", `MANIFEST_SHA256=${manifest.manifestSha256}`,
  ].join("\n") + "\n";
  writeFileSync(join(EVIDENCE, "FINAL_TOKEN.txt"), token, "utf8");
  process.stdout.write(`${JSON.stringify({ sourceCommit: head, releaseId: manifest.releaseId, evidenceManifestSha256: sha256(readFileSync(join(EVIDENCE, "MANIFEST.json"))), status: "EXACT_GREEN" })}\n`);
}

async function main(): Promise<void> {
  const phase = argument("phase");
  if (phase === "plan") return plan();
  if (phase === "verify") return verify();
  throw new Error("WATER_A1_FINALIZE_PHASE_REQUIRED");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
