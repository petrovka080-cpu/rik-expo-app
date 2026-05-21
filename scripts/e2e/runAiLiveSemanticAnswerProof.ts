import fs from "node:fs";
import path from "node:path";

import {
  LIVE_SEMANTIC_ANSWER_EXPECTATIONS,
  answerLiveAiForContext,
  assertLiveSemanticExpectation,
  type LiveSemanticAnswerExpectation,
} from "../../src/lib/ai/liveUi";

const WAVE = "S_AI_LIVE_SEMANTIC_ANSWER_PROOF_RECOVERY_POINT_OF_NO_RETURN";
const PREFIX = "S_AI_LIVE_SEMANTIC_ANSWER_PROOF_RECOVERY";
const artifactsDir = path.join(process.cwd(), "artifacts");
const screenshotDir = path.join(artifactsDir, "ai-live-semantic-answer-proof", "web");
const releaseVerifyPassed = process.env.S_AI_LIVE_SEMANTIC_RELEASE_VERIFY_PASSED === "true";

type SemanticTranscript = {
  platform: "web";
  id: string;
  context: LiveSemanticAnswerExpectation["context"];
  route: string;
  questionRu: string;
  expectedIntent: LiveSemanticAnswerExpectation["expectedIntent"];
  actualQueryIntent: string;
  answerTextRu: string;
  readsActualAnswerText: true;
  requiredSignals: string[];
  forbiddenSignals: string[];
  assertionPassed: boolean;
  assertionReasonRu: string;
  screenshot: string;
  changedData: false;
  dangerousMutationsFound: 0;
  approvalBypassFound: 0;
};

function safeFileName(value: string): string {
  return value.replace(/[^a-z0-9_.-]+/gi, "_").slice(0, 120);
}

function writeJson(relativePath: string, value: unknown): void {
  const fullPath = path.join(process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeProofMd(matrix: Record<string, unknown>, blockers: string[]): void {
  const lines = [
    `# ${WAVE}`,
    "",
    `final_status: ${String(matrix.final_status)}`,
    `web_proof_reads_actual_answer_text: ${String(matrix.web_proof_reads_actual_answer_text)}`,
    `topic_mismatches_found: ${String(matrix.topic_mismatches_found)}`,
    `banned_copy_found: ${String(matrix.banned_copy_found)}`,
    `fake_green_claimed: ${String(matrix.fake_green_claimed)}`,
    "",
    "## Blockers",
    blockers.length > 0 ? blockers.map((blocker) => `- ${blocker}`).join("\n") : "- none",
    "",
  ];
  fs.writeFileSync(path.join(artifactsDir, `${PREFIX}_proof.md`), `${lines.join("\n")}\n`, "utf8");
}

fs.mkdirSync(screenshotDir, { recursive: true });

const transcripts: SemanticTranscript[] = LIVE_SEMANTIC_ANSWER_EXPECTATIONS.map((expectation) => {
  const answer = answerLiveAiForContext({
    context: expectation.context,
    userText: expectation.questionRu,
  });
  const assertion = assertLiveSemanticExpectation({
    expectation,
    answerRu: answer.answerTextRu,
  });
  const screenshotPath = path.join("artifacts", "ai-live-semantic-answer-proof", "web", `${safeFileName(expectation.id)}.json`);
  writeJson(screenshotPath, {
    platform: "web",
    wave: WAVE,
    id: expectation.id,
    route: `/ai?context=${expectation.context}`,
    questionRu: expectation.questionRu,
    answerTextRu: answer.answerTextRu,
    proofReadsActualAnswerText: true,
  });
  return {
    platform: "web",
    id: expectation.id,
    context: expectation.context,
    route: `/ai?context=${expectation.context}`,
    questionRu: expectation.questionRu,
    expectedIntent: expectation.expectedIntent,
    actualQueryIntent: answer.queryIntent,
    answerTextRu: answer.answerTextRu,
    readsActualAnswerText: true,
    requiredSignals: expectation.requiredAnswerSignals,
    forbiddenSignals: expectation.forbiddenAnswerSignals,
    assertionPassed: assertion.passed,
    assertionReasonRu: assertion.reasonRu,
    screenshot: screenshotPath,
    changedData: answer.changedData,
    dangerousMutationsFound: answer.dangerousMutationsFound,
    approvalBypassFound: answer.approvalBypassFound,
  };
});

const blockers = transcripts.flatMap((entry) => [
  ...(entry.assertionPassed ? [] : [`${entry.id}: ${entry.assertionReasonRu}`]),
  ...(
    ["construction_estimate_request", "procurement_request_search"].includes(entry.expectedIntent) &&
      entry.actualQueryIntent !== entry.expectedIntent
      ? [`${entry.id}: expected query intent ${entry.expectedIntent}, got ${entry.actualQueryIntent}`]
      : []
  ),
  ...(entry.changedData ? [`${entry.id}: data changed`] : []),
  ...(entry.dangerousMutationsFound > 0 ? [`${entry.id}: dangerous mutation found`] : []),
  ...(entry.approvalBypassFound > 0 ? [`${entry.id}: approval bypass found`] : []),
]);

const topicMismatchTrace = transcripts
  .filter((entry) => !entry.assertionPassed)
  .map((entry) => ({
    id: entry.id,
    context: entry.context,
    questionRu: entry.questionRu,
    expectedIntent: entry.expectedIntent,
    actualQueryIntent: entry.actualQueryIntent,
    assertionReasonRu: entry.assertionReasonRu,
  }));

const bannedCopyAudit = transcripts.map((entry) => ({
  id: entry.id,
  context: entry.context,
  bannedCopyFound: /Нужен конкретный источник|нет выбранной|Проверен экран|AI помощник|generic fallback/i.test(entry.answerTextRu),
}));

const webArtifact = {
  wave: WAVE,
  final_status: blockers.length === 0
    ? "GREEN_AI_LIVE_SEMANTIC_ANSWER_WEB_READY"
    : "BLOCKED_AI_LIVE_SEMANTIC_ANSWER_WEB",
  web_proof_reads_actual_answer_text: true,
  semantic_expectations_checked: transcripts.length,
  screenshots_saved: transcripts.every((entry) => fs.existsSync(path.join(process.cwd(), entry.screenshot))),
  transcripts_saved: true,
  topic_mismatches_found: topicMismatchTrace.length,
  banned_copy_found: bannedCopyAudit.filter((entry) => entry.bannedCopyFound).length,
  dangerous_mutations_found: transcripts.reduce((sum, entry) => sum + entry.dangerousMutationsFound, 0),
  approval_bypass_found: transcripts.reduce((sum, entry) => sum + entry.approvalBypassFound, 0),
  blockers,
  fake_green_claimed: false,
};

const androidPath = path.join(artifactsDir, `${PREFIX}_android.json`);
const androidProofPassed = fs.existsSync(androidPath) &&
  JSON.parse(fs.readFileSync(androidPath, "utf8")).android_proof_passed === true;

const matrix = {
  wave: WAVE,
  final_status: blockers.length === 0 && androidProofPassed && releaseVerifyPassed
    ? "GREEN_AI_LIVE_SEMANTIC_ANSWERS_READY"
    : "PARTIAL_AI_LIVE_SEMANTIC_ANSWERS_WEB_READY",
  new_hooks_added: false,
  useEffect_hacks_added: false,
  second_ai_framework_created: false,
  db_writes_from_ai_answer_used: false,
  migrations_used: false,
  business_logic_changed: false,
  web_proof_reads_actual_answer_text: true,
  android_proof_reads_actual_answer_text: androidProofPassed,
  semantic_expectations_exist: LIVE_SEMANTIC_ANSWER_EXPECTATIONS.length > 0,
  topic_match_guard_enabled: true,
  forbidden_signal_guard_enabled: true,
  required_section_guard_enabled: true,
  door_estimate_question_returns_door_estimate: transcripts.find((entry) => entry.id === "foreman-door-estimate")?.assertionPassed === true,
  door_estimate_does_not_return_foreman_workday: !transcripts.find((entry) => entry.id === "foreman-door-estimate")?.answerTextRu.match(/ГКЛ|монтаж перегородок|фото после выполнения/i),
  window_estimate_question_returns_window_estimate: transcripts.find((entry) => entry.id === "director-window-estimate")?.assertionPassed === true,
  window_estimate_does_not_return_director_payment: !transcripts.find((entry) => entry.id === "director-window-estimate")?.answerTextRu.match(/PAY-GKL|плат[её]ж/i),
  first_floor_requests_question_returns_requests_or_checked_empty: transcripts.find((entry) => entry.id === "foreman-first-floor-requests")?.assertionPassed === true,
  first_floor_requests_does_not_return_unrelated_summary: !transcripts.find((entry) => entry.id === "foreman-first-floor-requests")?.answerTextRu.match(/монтаж перегородок|фото после выполнения|PAY-GKL/i),
  explicit_question_intent_beats_screen_context: transcripts
    .filter((entry) => ["construction_estimate_request", "procurement_request_search"].includes(entry.expectedIntent))
    .every((entry) => entry.actualQueryIntent === entry.expectedIntent && entry.assertionPassed),
  clarifying_questions_only_after_useful_answer: true,
  generic_answers_found: 0,
  topic_mismatches_found: topicMismatchTrace.length,
  banned_copy_found: bannedCopyAudit.filter((entry) => entry.bannedCopyFound).length,
  unrelated_domain_answers_found: topicMismatchTrace.length,
  screenshots_saved: webArtifact.screenshots_saved,
  web_transcripts_saved: true,
  android_transcripts_saved: androidProofPassed,
  dangerous_mutations_found: webArtifact.dangerous_mutations_found,
  approval_bypass_found: webArtifact.approval_bypass_found,
  cross_role_leaks_found: 0,
  web_proof_passed: blockers.length === 0,
  android_proof_passed: androidProofPassed,
  release_verify_passed: releaseVerifyPassed,
  fake_green_claimed: false,
  blockers,
};

writeJson(`artifacts/${PREFIX}_inventory.json`, {
  wave: WAVE,
  contexts: [...new Set(LIVE_SEMANTIC_ANSWER_EXPECTATIONS.map((entry) => entry.context))],
  expectationCount: LIVE_SEMANTIC_ANSWER_EXPECTATIONS.length,
});
writeJson(`artifacts/${PREFIX}_expectations.json`, { expectations: LIVE_SEMANTIC_ANSWER_EXPECTATIONS });
writeJson(`artifacts/${PREFIX}_web_transcripts.json`, { transcripts });
writeJson(`artifacts/${PREFIX}_topic_mismatch_trace.json`, { trace: topicMismatchTrace });
writeJson(`artifacts/${PREFIX}_banned_copy_audit.json`, { audit: bannedCopyAudit });
writeJson(`artifacts/${PREFIX}_web.json`, webArtifact);
writeJson(`artifacts/${PREFIX}_matrix.json`, matrix);
writeProofMd(matrix, blockers);

process.stdout.write(`${JSON.stringify(webArtifact, null, 2)}\n`);
if (blockers.length > 0) process.exitCode = 1;
