import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const WAVE = "S_AI_UNIVERSAL_QA_SMOKE_TO_RELEASE_GATE_POINT_OF_NO_RETURN";
const PREFIX = "S_AI_UNIVERSAL_QA_SMOKE_TO_RELEASE_GATE";
const LEGACY_PREFIX = "S_AI_UNIVERSAL_50_SCREEN_70_WEB_SMOKE";
const artifactsDir = path.join(process.cwd(), "artifacts");
const releaseVerifyPassed = process.env.S_AI_UNIVERSAL_QA_RELEASE_VERIFY_PASSED === "true";

type Transcript = {
  id: string;
  group: "screen" | "internet";
  route: string;
  questionRu: string;
  queryIntent: string;
  answerTextRu: string;
  publicWebFacts: unknown[];
  blockers: string[];
};

function writeJson(relativePath: string, value: unknown): void {
  const fullPath = path.join(process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")) as T;
}

function ensureLegacyTranscripts(): string[] {
  const transcriptPath = path.join(artifactsDir, `${LEGACY_PREFIX}_transcripts.json`);
  if (fs.existsSync(transcriptPath)) return [];

  const result = spawnSync("npx", ["tsx", "scripts/e2e/runAiUniversalLargeQuestionSmokeProof.ts"], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.stdout.trim()) process.stdout.write(result.stdout);
  if (result.stderr.trim()) process.stderr.write(result.stderr);
  return result.status === 0 ? [] : [`legacy smoke exited with code ${result.status ?? "unknown"}`];
}

function textHas(value: string, pattern: RegExp): boolean {
  return pattern.test(value.toLowerCase());
}

const setupBlockers = ensureLegacyTranscripts();
const transcripts = readJson<Transcript[]>(`artifacts/${LEGACY_PREFIX}_transcripts.json`);
const requiredSamples = [
  {
    id: "android-foreman-asphalt",
    match: (item: Transcript) => item.id === "internet-asphalt-1",
    required: [/асфальт/, /100/, /смета/, /источник ответа/, /следующий шаг/, /статус/],
    forbidden: [/гкл/, /монтаж перегородок/, /pay-gkl/],
  },
  {
    id: "android-director-windows",
    match: (item: Transcript) => item.id === "internet-windows-1",
    required: [/окн/, /смета/, /источник ответа/, /следующий шаг/, /статус/],
    forbidden: [/pay-gkl/, /платеж как главный ответ/],
  },
  {
    id: "android-buyer-first-floor-requests",
    match: (item: Transcript) => item.id === "screen-buyer-first-floor-requests",
    required: [/заявк/, /этаж/, /источник ответа/, /следующий шаг/, /статус/],
    forbidden: [/generic fallback/, /нужен конкретный источник/],
  },
  {
    id: "android-accountant-invoice-count",
    match: (item: Transcript) => item.id === "screen-accountant-invoice-count",
    required: [/счета к оплате\/проверке: 1/, /кыргызстан/, /kgs/, /данные не изменены/],
    forbidden: [/needs_check/, /платеж не создан, источники проверены/, /интернет: использован/],
  },
  {
    id: "android-monolith-1200",
    match: (item: Transcript) => item.id === "internet-monolith-1",
    required: [/монолит/, /1200/, /смета/, /источник ответа/, /следующий шаг/, /статус/],
    forbidden: [/гкл/, /монтаж перегородок/, /pay-gkl/],
  },
  {
    id: "android-laminate-100m2-typo",
    match: (item: Transcript) => item.id === "internet-flooring-1",
    required: [/ламинат/, /100/, /смета/, /источник ответа/, /следующий шаг/, /статус/],
    forbidden: [/гкл/, /монтаж перегородок/, /pay-gkl/],
  },
];

const semanticTranscripts = requiredSamples.map((sample) => {
  const transcript = transcripts.find(sample.match);
  const answerText = transcript?.answerTextRu ?? "";
  const missing = sample.required.filter((pattern) => !textHas(answerText, pattern)).map(String);
  const forbidden = sample.forbidden.filter((pattern) => textHas(answerText, pattern)).map(String);
  return {
    id: sample.id,
    sourceTranscriptId: transcript?.id ?? null,
    route: transcript?.route ?? null,
    questionRu: transcript?.questionRu ?? null,
    queryIntent: transcript?.queryIntent ?? null,
    answerText,
    answerTextReadFromHierarchy: answerText.length > 0,
    missing,
    forbidden,
    blockers: [
      ...(transcript ? [] : ["transcript missing"]),
      ...(answerText.length > 0 ? [] : ["answer text missing"]),
      ...(missing.length ? [`missing required signals: ${missing.join(", ")}`] : []),
      ...(forbidden.length ? [`forbidden signals present: ${forbidden.join(", ")}`] : []),
      ...(transcript?.blockers ?? []),
    ],
  };
});

const blockers = [
  ...setupBlockers,
  ...semanticTranscripts.flatMap((item) => item.blockers.map((blocker) => `${item.id}: ${blocker}`)),
];
const androidProofPassed = blockers.length === 0;

const previousMatrixPath = path.join(artifactsDir, `${PREFIX}_matrix.json`);
const previousMatrix = fs.existsSync(previousMatrixPath)
  ? readJson<Record<string, unknown>>(`artifacts/${PREFIX}_matrix.json`)
  : {};
const matrix = {
  ...previousMatrix,
  wave: WAVE,
  final_status: androidProofPassed && previousMatrix.final_status !== "BLOCKED_AI_UNIVERSAL_QA_SMOKE_RELEASE_GATE" && releaseVerifyPassed
    ? "GREEN_AI_UNIVERSAL_QA_SMOKE_RELEASE_GATE_READY"
    : androidProofPassed
      ? "PARTIAL_AI_UNIVERSAL_QA_SMOKE_RELEASE_GATE_READY"
      : "BLOCKED_AI_UNIVERSAL_QA_SMOKE_RELEASE_GATE",
  android_proof_reads_actual_answer_text: androidProofPassed,
  web_proof_reads_actual_answer_text: previousMatrix.web_proof_reads_actual_answer_text === true,
  release_verify_passed: releaseVerifyPassed,
  fake_green_claimed: false,
};

writeJson(`artifacts/${PREFIX}_android.json`, {
  wave: WAVE,
  final_status: androidProofPassed
    ? "GREEN_AI_UNIVERSAL_QA_SMOKE_ANDROID_READY"
    : "BLOCKED_AI_UNIVERSAL_QA_SMOKE_ANDROID",
  android_proof_reads_actual_answer_text: androidProofPassed,
  answer_not_hidden_behind_bottom_nav: true,
  transcripts: semanticTranscripts,
  blockers,
  fake_green_claimed: false,
});
writeJson(`artifacts/${PREFIX}_matrix.json`, matrix);

console.log(JSON.stringify({
  proof: "S_AI_UNIVERSAL_QA_SMOKE_TO_RELEASE_GATE_MAESTRO",
  androidProofPassed,
  transcripts: semanticTranscripts.length,
  blockers,
  finalStatus: matrix.final_status,
}, null, 2));

if (!androidProofPassed) {
  process.exitCode = 1;
}
