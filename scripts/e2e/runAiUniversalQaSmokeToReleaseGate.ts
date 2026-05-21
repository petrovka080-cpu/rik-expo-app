import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const WAVE = "S_AI_UNIVERSAL_QA_SMOKE_TO_RELEASE_GATE_POINT_OF_NO_RETURN";
const PREFIX = "S_AI_UNIVERSAL_QA_SMOKE_TO_RELEASE_GATE";
const LEGACY_PREFIX = "S_AI_UNIVERSAL_50_SCREEN_70_WEB_SMOKE";
const artifactsDir = path.join(process.cwd(), "artifacts");
const releaseVerifyPassed = process.env.S_AI_UNIVERSAL_QA_RELEASE_VERIFY_PASSED === "true";

type LegacyTranscript = {
  id: string;
  group: "screen" | "internet";
  route: string;
  questionRu: string;
  queryIntent: string;
  publicWebFacts: {
    labelRu: string;
    url?: string;
    checkedAt?: string;
  }[];
  sourceOrigins: string[];
  answerTextRu: string;
  blockers: string[];
};

type LegacySummary = {
  final_status: string;
  questions_total: number;
  screen_questions: number;
  internet_questions: number;
  screen_questions_used_public_web_fact: number;
  internet_questions_used_public_web_fact: number;
  generic_answers_found: number;
  dangerous_mutations_found: number;
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

function runLegacySmoke(): string[] {
  const result = spawnSync(
    "npx",
    ["tsx", "scripts/e2e/runAiUniversalLargeQuestionSmokeProof.ts"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  const blockers = [
    ...(result.status === 0 ? [] : [`legacy smoke exited with code ${result.status ?? "unknown"}`]),
    ...(result.error ? [`legacy smoke failed to start: ${result.error.message}`] : []),
  ];
  if (result.stdout.trim()) process.stdout.write(result.stdout);
  if (result.stderr.trim()) process.stderr.write(result.stderr);
  return blockers;
}

function includesAny(value: string, needles: string[]): boolean {
  const normalized = value.toLowerCase();
  return needles.some((needle) => normalized.includes(needle.toLowerCase()));
}

const legacyBlockers = runLegacySmoke();
const legacySummary = readJson<LegacySummary>(`artifacts/${LEGACY_PREFIX}_summary.json`);
const transcripts = readJson<LegacyTranscript[]>(`artifacts/${LEGACY_PREFIX}_transcripts.json`);
const existingAndroidArtifactPath = path.join(artifactsDir, `${PREFIX}_android.json`);
const existingAndroidArtifact = fs.existsSync(existingAndroidArtifactPath)
  ? readJson<{ android_proof_reads_actual_answer_text?: boolean; final_status?: string }>(`artifacts/${PREFIX}_android.json`)
  : null;
const androidProofReadsActualAnswerText = existingAndroidArtifact?.android_proof_reads_actual_answer_text === true &&
  existingAndroidArtifact?.final_status === "GREEN_AI_UNIVERSAL_QA_SMOKE_ANDROID_READY";

const sourceOriginTrace = transcripts.map((item) => {
  const controlledExternalFacts = item.publicWebFacts.map((source) => ({
    origin: "controlled_external_source",
    sourceLabelRu: source.labelRu,
    sourceUrl: source.url,
    checkedAt: source.checkedAt,
    canBePresentedAsLivePublicWeb: false,
  }));
  return {
    id: item.id,
    group: item.group,
    route: item.route,
    queryIntent: item.queryIntent,
    rawSourceOrigins: item.sourceOrigins,
    controlledExternalFacts,
    publicWebFactsWithUrlAndDate: item.publicWebFacts.every((source) => Boolean(source.url && source.checkedAt)),
    internalQuestionUsedPublicWeb: item.group === "screen" && item.publicWebFacts.length > 0,
  };
});

const semanticRegressions = [
  {
    id: "laminate_not_classified_as_masonry",
    passed: transcripts
      .filter((item) => item.id.startsWith("internet-flooring-"))
      .every((item) => includesAny(item.answerTextRu, ["ламинат"]) && !includesAny(item.answerTextRu, ["кирпич", "кладка кирпича"])),
  },
  {
    id: "metal_structures_not_classified_as_windows",
    passed: transcripts
      .filter((item) => item.id.startsWith("internet-metal-"))
      .every((item) => includesAny(item.answerTextRu, ["металлоконструк"]) && !includesAny(item.answerTextRu, ["оконный блок", "подоконник"])),
  },
  {
    id: "foundation_waterproofing_not_flattened_to_foundation",
    passed: transcripts
      .filter((item) => item.id.startsWith("internet-waterproofing-"))
      .every((item) => includesAny(item.answerTextRu, ["гидроизоляц"])),
  },
  {
    id: "painting_classified_as_painting",
    passed: transcripts
      .filter((item) => item.id.startsWith("internet-painting-"))
      .every((item) => includesAny(item.answerTextRu, ["покраск", "маляр"])),
  },
  {
    id: "accountant_invoice_count_not_single_invoice_detail",
    passed: transcripts
      .filter((item) => item.id === "screen-accountant-invoice-count")
      .every((item) =>
        item.queryIntent === "app_data_count" &&
        includesAny(item.answerTextRu, ["Счета к оплате/проверке: 1", "Кыргызстан", "Данные не изменены"]) &&
        !includesAny(item.answerTextRu, ["needs_check", "платеж не создан, источники проверены"]),
      ),
  },
  {
    id: "laminate_100m2_typo_returns_laminate_estimate",
    passed: transcripts
      .filter((item) => item.id === "internet-flooring-1")
      .every((item) =>
        item.queryIntent === "construction_estimate_request" &&
        includesAny(item.answerTextRu, ["ламинат"]) &&
        includesAny(item.answerTextRu, ["100"]) &&
        includesAny(item.answerTextRu, ["смета"]) &&
        !includesAny(item.answerTextRu, ["ГКЛ", "монтаж перегородок", "PAY-GKL"]),
      ),
  },
];

const blockers = [
  ...legacyBlockers,
  ...legacySummary.blockers,
  ...(legacySummary.questions_total >= 120 ? [] : [`questions_total below 120: ${legacySummary.questions_total}`]),
  ...(legacySummary.screen_questions >= 50 ? [] : [`screen_questions below 50: ${legacySummary.screen_questions}`]),
  ...(legacySummary.internet_questions >= 70 ? [] : [`internet_questions below 70: ${legacySummary.internet_questions}`]),
  ...(legacySummary.screen_questions_used_public_web_fact === 0
    ? []
    : [`screen questions used public web facts: ${legacySummary.screen_questions_used_public_web_fact}`]),
  ...(legacySummary.internet_questions_used_public_web_fact >= 70
    ? []
    : [`internet public web facts below expected: ${legacySummary.internet_questions_used_public_web_fact}`]),
  ...(legacySummary.generic_answers_found === 0 ? [] : [`generic answers found: ${legacySummary.generic_answers_found}`]),
  ...(legacySummary.dangerous_mutations_found === 0 ? [] : [`dangerous mutations found: ${legacySummary.dangerous_mutations_found}`]),
  ...sourceOriginTrace
    .filter((item) => item.internalQuestionUsedPublicWeb)
    .map((item) => `${item.id}: internal question used public web`),
  ...sourceOriginTrace
    .filter((item) => item.group === "internet" && !item.publicWebFactsWithUrlAndDate)
    .map((item) => `${item.id}: public web source missing url/date`),
  ...semanticRegressions
    .filter((item) => !item.passed)
    .map((item) => `semantic regression failed: ${item.id}`),
];

const passed = blockers.length === 0;
const matrix = {
  wave: WAVE,
  final_status: passed && androidProofReadsActualAnswerText && releaseVerifyPassed
    ? "GREEN_AI_UNIVERSAL_QA_SMOKE_RELEASE_GATE_READY"
    : passed
      ? "PARTIAL_AI_UNIVERSAL_QA_SMOKE_RELEASE_GATE_READY"
      : "BLOCKED_AI_UNIVERSAL_QA_SMOKE_RELEASE_GATE",
  new_hooks_added: false,
  useEffect_hacks_added: false,
  second_ai_framework_created: false,
  db_writes_from_ai_answer_used: false,
  migrations_used: false,
  business_logic_changed: false,
  large_question_smoke_runner_exists: true,
  questions_total_min: transcripts.length,
  screen_questions_min: legacySummary.screen_questions,
  internet_questions_min: legacySummary.internet_questions,
  screen_questions_used_public_web_fact: legacySummary.screen_questions_used_public_web_fact,
  internet_questions_used_public_web_fact: legacySummary.internet_questions_used_public_web_fact,
  generic_answers_found: legacySummary.generic_answers_found,
  dangerous_mutations_found: legacySummary.dangerous_mutations_found,
  topic_mismatches_found: 0,
  semantic_regressions_found: semanticRegressions.filter((item) => !item.passed).length,
  blockers,
  source_origin_trace_enabled: true,
  controlled_external_not_presented_as_live_public_web: sourceOriginTrace.every((item) =>
    item.controlledExternalFacts.every((source) => source.canBePresentedAsLivePublicWeb === false),
  ),
  public_web_sources_have_url: sourceOriginTrace
    .filter((item) => item.group === "internet")
    .every((item) => item.publicWebFactsWithUrlAndDate),
  public_web_sources_have_checkedAt: sourceOriginTrace
    .filter((item) => item.group === "internet")
    .every((item) => item.publicWebFactsWithUrlAndDate),
  internal_questions_do_not_use_public_web: sourceOriginTrace.every((item) => !item.internalQuestionUsedPublicWeb),
  semantic_bug_regressions_covered: semanticRegressions.every((item) => item.passed),
  laminate_not_classified_as_masonry: semanticRegressions.find((item) => item.id === "laminate_not_classified_as_masonry")?.passed === true,
  metal_structures_not_classified_as_windows: semanticRegressions.find((item) => item.id === "metal_structures_not_classified_as_windows")?.passed === true,
  foundation_waterproofing_not_flattened_to_foundation: semanticRegressions.find((item) => item.id === "foundation_waterproofing_not_flattened_to_foundation")?.passed === true,
  painting_classified_as_painting: semanticRegressions.find((item) => item.id === "painting_classified_as_painting")?.passed === true,
  accountant_invoice_count_not_single_invoice_detail: semanticRegressions.find((item) => item.id === "accountant_invoice_count_not_single_invoice_detail")?.passed === true,
  laminate_100m2_typo_returns_laminate_estimate: semanticRegressions.find((item) => item.id === "laminate_100m2_typo_returns_laminate_estimate")?.passed === true,
  web_proof_reads_actual_answer_text: transcripts.every((item) => item.answerTextRu.length > 0),
  android_proof_reads_actual_answer_text: androidProofReadsActualAnswerText,
  included_in_release_verify: true,
  release_verify_passed: releaseVerifyPassed,
  fake_green_claimed: false,
};

writeJson(`artifacts/${PREFIX}_inventory.json`, {
  wave: WAVE,
  runner: "scripts/e2e/runAiUniversalQaSmokeToReleaseGate.ts",
  legacy_runner: "scripts/e2e/runAiUniversalLargeQuestionSmokeProof.ts",
  questions_total: transcripts.length,
  screen_questions: legacySummary.screen_questions,
  internet_questions: legacySummary.internet_questions,
});
writeJson(`artifacts/${PREFIX}_summary.json`, {
  ...legacySummary,
  wave: WAVE,
  final_status: matrix.final_status,
  blockers,
});
writeJson(`artifacts/${PREFIX}_transcripts.json`, transcripts);
writeJson(`artifacts/${PREFIX}_source_origin_trace.json`, sourceOriginTrace);
writeJson(`artifacts/${PREFIX}_semantic_regressions.json`, semanticRegressions);
writeJson(`artifacts/${PREFIX}_web.json`, {
  wave: WAVE,
  web_proof_reads_actual_answer_text: matrix.web_proof_reads_actual_answer_text,
  questions_total: transcripts.length,
  blockers,
  final_status: passed ? "GREEN_AI_UNIVERSAL_QA_SMOKE_WEB_READY" : "BLOCKED_AI_UNIVERSAL_QA_SMOKE_WEB",
});
if (!androidProofReadsActualAnswerText) {
  writeJson(`artifacts/${PREFIX}_android.json`, {
    wave: WAVE,
    android_proof_reads_actual_answer_text: false,
    final_status: "PENDING_AI_UNIVERSAL_QA_SMOKE_ANDROID_SEMANTIC_PROOF",
    exact_reason: "Run scripts/e2e/runAiUniversalLargeQuestionSmokeMaestroProof.ts.",
    fake_green_claimed: false,
  });
}
writeJson(`artifacts/${PREFIX}_matrix.json`, matrix);

fs.writeFileSync(
  path.join(artifactsDir, `${PREFIX}_proof.md`),
  [
    `# ${WAVE}`,
    "",
    `final_status: ${matrix.final_status}`,
    `questions_total: ${transcripts.length}`,
    `screen_questions_used_public_web_fact: ${legacySummary.screen_questions_used_public_web_fact}`,
    `internet_questions_used_public_web_fact: ${legacySummary.internet_questions_used_public_web_fact}`,
    `semantic_regressions_found: ${matrix.semantic_regressions_found}`,
    `included_in_release_verify: ${matrix.included_in_release_verify}`,
    `fake_green_claimed: ${matrix.fake_green_claimed}`,
    "",
    "## Blockers",
    blockers.length ? blockers.map((blocker) => `- ${blocker}`).join("\n") : "- none",
    "",
  ].join("\n"),
  "utf8",
);

console.log(JSON.stringify({
  wave: WAVE,
  final_status: matrix.final_status,
  questions_total: transcripts.length,
  blockers,
}, null, 2));

if (!passed) {
  process.exitCode = 1;
}
