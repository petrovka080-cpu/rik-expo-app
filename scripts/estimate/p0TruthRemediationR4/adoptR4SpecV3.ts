import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const SPEC_PATH = "C:/Users/User/Downloads/P0_CANONICAL_ESTIMATE_TRUTH_REMEDIATION_R4_PRODUCTION_GRADE_TZ (1).md";
const SPEC_SHA256 = "92189dc77fc1593630e8ff1496f2324a385eda1eaed39ce6bc719b9a01d98c1d";
const SPEC_LINES = 2045;
const PREVIOUS_R4_SHA256 = "83e9a34a76542d0af9fd9d48368ff1b6f57fa4b7ab6dfaaba033b0deb5142657";
const PACKAGE_SHA256 = "c94d02110953517a3202682a2b80899f070f501a0f8bfdc5d501ad8be9c46efb";
const PACKAGE_RELEASE_ID = "2c1cb615-187c-50f6-980d-66b62bd3d5d1";

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
  if (actualSha256 !== SPEC_SHA256 || lines !== SPEC_LINES) {
    throw new Error(`R4_V3_SPEC_FINGERPRINT_MISMATCH:${actualSha256}:${lines}`);
  }
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  const timestamp = new Date().toISOString();
  const common = {
    sourceHead: head,
    sourceTree: tree,
    sourcePackageSha256: PACKAGE_SHA256,
    databaseReleaseId: PACKAGE_RELEASE_ID,
    timestamp,
    command: "npx tsx scripts/estimate/p0TruthRemediationR4/adoptR4SpecV3.ts",
    toolVersion: `node ${process.version}`,
  };
  const specProof = {
    schemaVersion: "p0-canonical-estimate-truth-remediation-r4-spec.v3",
    ...common,
    path: SPEC_PATH,
    bytes: bytes.byteLength,
    lines,
    sha256: actualSha256,
    documentVersion: 3,
    authority: "ONLY_ACTIVE_FULL_SPEC",
    addedTerminalContract: "baseline_estimate_without_user_input=4503/4503",
    verdict: "GREEN_R4_V3_FINGERPRINT",
  };
  const authority = {
    schemaVersion: "p0-canonical-estimate-truth-remediation-r4-authority.v3",
    ...common,
    activeSpec: specProof,
    superseded: [
      "R1",
      "R2",
      "R3",
      { document: "R4 v2", sha256: PREVIOUS_R4_SHA256 },
    ],
    preservedStartState: "01-preflight/START_STATE.json",
    preservationPolicyRu: "Полезный successor diff и ранее зафиксированный START_STATE сохраняются; старые package/evidence/revisions не переписываются.",
    newMandatoryAcceptance: {
      perIdWorkTruthMatrix: "4503/4503",
      baselineEstimateWithoutUserInput: "4503/4503",
      flow: "BASELINE_UNIT_ESTIMATE -> REFINED_ESTIMATE -> EXACT_QUANTITY_ESTIMATE -> EXACT_PRICED_ESTIMATE",
      userFillsMatrix: false,
    },
    verdict: "GREEN_R4_V3_ONLY_ACTIVE_AUTHORITY",
  };
  await writeJson(join(outputRoot, "00-spec/SPEC_FINGERPRINT.json"), specProof);
  await writeJson(join(outputRoot, "00-spec/AUTHORITY_AND_SUPERSEDED_SPECS.json"), authority);
  const journalRows = [
    {
      timestamp,
      phase: "R4-AUTHORITY-V3",
      status: "IN_PROGRESS",
      what_checked_ru: "Проверены SHA-256, размер и полное содержание заменяющего R4 v3.",
      why_ru: "Сделать v3 единственным действующим ТЗ без перезаписи уже зафиксированного START_STATE.",
      command_or_action: common.command,
      finding_ru: "SHA-256 совпал; v3 добавляет обязательные исходные сметы без пользовательского ввода 4 503/4 503 и baseline→refined→exact flow.",
      affected_ids: 4503,
      affected_rows: 0,
      affected_files: [SPEC_PATH, "00-spec/SPEC_FINGERPRINT.json", "00-spec/AUTHORITY_AND_SUPERSEDED_SPECS.json"],
      evidence: ["00-spec/SPEC_FINGERPRINT.json", "00-spec/AUTHORITY_AND_SUPERSEDED_SPECS.json"],
      completed_ru: "R4 v3 принят как единственная authority; R4 v2 помечен superseded.",
      not_completed_ru: "Матрица и исходная смета 4 503/4 503 ещё не построены; общий статус RED.",
      next_action_ru: "Закрыть recoverable RED search P95, затем материализовать census/BEFORE и shared contracts v3.",
      stop_reason_ru: null,
      head,
      tree,
    },
    {
      timestamp,
      phase: "R4-PHASE-2-SEARCH",
      status: "RED",
      what_checked_ru: "Полная cursor pagination запросов ла/ро/со/др после Unicode repair.",
      why_ru: "Проверить не только полноту, но и бюджет P95 <=250 ms.",
      command_or_action: "npx tsx scripts/estimate/p0TruthRemediationR4/verifyR4UnicodeSearch.ts",
      finding_ru: "Функциональная полнота достигнута, но P95=1114.318 ms: повторный обход indexed terms и пересчёт summary на страницах слишком дорогой.",
      affected_ids: 12270,
      affected_rows: 12270,
      affected_files: ["supabase/migrations/20260817230000_p0_estimate_truth_remediation_r1.sql"],
      evidence: [],
      completed_ru: "Root cause performance локализован.",
      not_completed_ru: "Search performance gate RED; общий GREEN невозможен.",
      next_action_ru: "Ограничить literal work matching непрерывной подстрокой canonical title и повторить directed pagination/P95.",
      stop_reason_ru: null,
      head,
      tree,
    },
  ];
  await appendFile(join(outputRoot, "JOURNAL_RU.jsonl"), journalRows.map((row) => JSON.stringify(row)).join("\n") + "\n", "utf8");
  process.stdout.write(`${JSON.stringify({ status: "P0_R4_V3_AUTHORITY_GREEN", sha256: actualSha256, lines, baselineContract: "4503/4503" }, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
