import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const SPEC_PATH = "C:/Users/User/Downloads/P0_CANONICAL_ESTIMATE_TRUTH_REMEDIATION_R4_PRODUCTION_GRADE_TZ (2).md";
const SPEC_SHA256 = "9607aca08db13739fe4fef8e0ef103f478140f131435f9a4e621a22aeb7e4ef7";
const SPEC_BYTES = 133_532;
const SPEC_LINES = 2_430;
const PREVIOUS_R4_V3_SHA256 = "92189dc77fc1593630e8ff1496f2324a385eda1eaed39ce6bc719b9a01d98c1d";
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
  if (actualSha256 !== SPEC_SHA256 || bytes.byteLength !== SPEC_BYTES || lines !== SPEC_LINES) {
    throw new Error(`R4_4_SPEC_FINGERPRINT_MISMATCH:${actualSha256}:${bytes.byteLength}:${lines}`);
  }

  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  const timestamp = new Date().toISOString();
  const command = "npx tsx scripts/estimate/p0TruthRemediationR4/adoptR4SpecR44.ts";
  const common = {
    sourceHead: head,
    sourceTree: tree,
    sourcePackageSha256: PACKAGE_SHA256,
    databaseReleaseId: PACKAGE_RELEASE_ID,
    timestamp,
    command,
    toolVersion: `node ${process.version}`,
  };
  const specProof = {
    schemaVersion: "p0-canonical-estimate-truth-remediation-r4-spec.r4.4",
    ...common,
    path: SPEC_PATH,
    bytes: bytes.byteLength,
    lines,
    sha256: actualSha256,
    documentRevision: "R4.4",
    authority: "ONLY_ACTIVE_FULL_SPEC",
    addedFrozenRepro: "bridge_pile_foundations",
    verdict: "GREEN_R4_4_FINGERPRINT",
  };
  const authority = {
    schemaVersion: "p0-canonical-estimate-truth-remediation-r4-authority.r4.4",
    ...common,
    activeSpec: specProof,
    superseded: [
      "R1",
      "R2",
      "R3",
      { document: "R4 v3", sha256: PREVIOUS_R4_V3_SHA256 },
    ],
    preservedStartState: "01-preflight/START_STATE.json",
    preservationPolicyRu: "Полезный successor diff и ранее зафиксированный START_STATE сохраняются; старые package, evidence и revisions не переписываются.",
    newMandatoryAcceptance: {
      perIdWorkTruthMatrix: "4503/4503",
      workEntityKindAndCompilability: "4503/4503",
      workScopeBinding: "4503/4503",
      objectSpecificInputs: "4503/4503",
      inputProvenanceAndCarryover: "4503/4503",
      perEstimateDuplicateAndScopeLedger: "4503/4503",
      baselineEstimateWithoutUserInput: "4503/4503",
      frozenBridgePileFoundations: "GREEN",
      crossWorkParameterLeak: 0,
      parentOrSiblingScopeRows: 0,
      genericStagePaddingRows: 0,
      workServiceDuplicateExcess: 0,
      rawCatalogIdVisible: 0,
      mojibakeUserFacingOccurrence: 0,
    },
    hardStops: ["Full Jest", "production", "push", "PR", "merge", "OTA", "public release", "BATCH-009 activation", "BATCH-010"],
    verdict: "GREEN_R4_4_ONLY_ACTIVE_AUTHORITY",
  };

  await writeJson(join(outputRoot, "00-spec/SPEC_FINGERPRINT.json"), specProof);
  await writeJson(join(outputRoot, "00-spec/AUTHORITY_AND_SUPERSEDED_SPECS.json"), authority);
  const journalRow = {
    timestamp,
    phase: "R4.4-AUTHORITY",
    status: "IN_PROGRESS",
    what_checked_ru: "Полностью сопоставлена новая редакция R4.4 с ранее прочитанной R4 v3; проверены точный SHA-256, размер и число логических строк.",
    why_ru: "Сделать R4.4 единственным действующим ТЗ, не потеряв полезный successor diff и уже зафиксированное исходное состояние.",
    command_or_action: command,
    finding_ru: "R4.4 добавляет системный frozen repro bridge_pile_foundations: границу группа/работа, запрет межрабочего переноса значений и parent/sibling BOQ, единый completeness contract, object-specific inputs, UTF-8/raw-ID gate и per-estimate duplicate/scope ledger 4503/4503.",
    affected_ids: 4503,
    affected_rows: 1_243_194,
    affected_files: [SPEC_PATH, "00-spec/SPEC_FINGERPRINT.json", "00-spec/AUTHORITY_AND_SUPERSEDED_SPECS.json"],
    evidence: ["00-spec/SPEC_FINGERPRINT.json", "00-spec/AUTHORITY_AND_SUPERSEDED_SPECS.json"],
    completed_ru: "R4.4 принят как единственная authority; R4 v3 помечен superseded.",
    not_completed_ru: "Frozen repro bridge_pile_foundations ещё не воспроизведён из оригинального backend/PDF payload; per-ID gates 4503/4503 не закрыты; общий статус RED.",
    next_action_ru: "Зафиксировать направленный Web search proof, затем материализовать bridge_pile_foundations BEFORE с честным SOURCE_EVIDENCE_MISSING для недоступных оригиналов и выполнить runtime root-cause replay.",
    stop_reason_ru: null,
    head,
    tree,
  };
  await appendFile(join(outputRoot, "JOURNAL_RU.jsonl"), `${JSON.stringify(journalRow)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    status: "P0_R4_4_AUTHORITY_GREEN",
    sha256: actualSha256,
    bytes: bytes.byteLength,
    lines,
    frozenRepro: "bridge_pile_foundations",
    overallR4Status: "RED_REMAINING_GATES",
  }, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
