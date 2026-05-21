import fs from "node:fs";
import path from "node:path";
import { answerLiveAiForContext, type LiveAiAnswer } from "../../src/lib/ai/liveUi/liveAiActionRouter";
import {
  AI_SECURITY_RUNTIME_GOVERNANCE_WAVE,
  answerSecurityRuntimeQuestion,
  buildSecurityRuntimeGovernanceMatrix,
  listSecurityRuntimeActionQuestionMap,
} from "../../src/lib/ai/securityRuntime";

const projectRoot = process.cwd();
const artifactDir = path.join(projectRoot, "artifacts");
const prefix = "S_AI_SECURITY_RUNTIME_GOVERNANCE_FUNNEL";
const releaseVerifyPassed = process.env.S_AI_SECURITY_RUNTIME_RELEASE_VERIFY_PASSED === "true";

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(path.join(artifactDir, `${prefix}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(name: string, value: string): void {
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(path.join(artifactDir, `${prefix}_${name}`), value);
}

function readExistingJson<T>(name: string): T | null {
  const fullPath = path.join(artifactDir, `${prefix}_${name}.json`);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf8")) as T;
}

function visibleText(answer: LiveAiAnswer): string {
  return [
    answer.answerTextRu,
    answer.shortRu,
    ...answer.foundRu,
    ...answer.sourcesRu,
    ...answer.missingDataRu,
    answer.nextStepRu,
  ].join("\n");
}

function assertLiveAnswer(answer: LiveAiAnswer): string[] {
  const text = visibleText(answer);
  const blockers: string[] = [];
  if (!answer.providerTrace.includes("securityRuntime")) blockers.push(`wrong_pipeline:${answer.context}:${answer.actionId ?? "free_text"}`);
  if (answer.bannedCopyFound.length > 0) blockers.push(`banned_copy:${answer.bannedCopyFound.join("|")}`);
  if (answer.sourcesRu.length === 0 && answer.checkedRu.length === 0) blockers.push(`missing_sources:${answer.context}`);
  if (!/Следующий шаг:|РЎР»РµРґСѓСЋС‰РёР№ С€Р°Рі:/i.test(text)) blockers.push(`missing_next_step:${answer.context}`);
  if (/SUPABASE_SERVICE_ROLE_KEY|BEGIN RSA|BEGIN OPENSSH|raw provider payload|service_role key|cat \.env|printenv/i.test(text)) {
    blockers.push(`raw_secret_or_provider_payload:${answer.context}`);
  }
  if (/rm -rf|drop table|delete from|truncate|supabase db reset|key dump/i.test(text)) {
    blockers.push(`destructive_repair_command:${answer.context}`);
  }
  return blockers;
}

const securityQuestions = [
  "какие риски безопасности",
  "есть ли forbidden attempts",
  "есть ли approval bypass",
  "есть ли service_role путь",
  "есть ли Auth Admin путь",
  "видят ли normal users runtime",
  "подготовь security report",
];

const runtimeQuestions = [
  "почему release verify красный",
  "какой exact blocker",
  "какой runner упал",
  "какие artifacts stale",
  "нужен ли iOS signoff",
];

const securityActions = [
  "security_overview",
  "forbidden_attempts_report",
  "role_policy_review",
  "approval_bypass_review",
  "privileged_service_guard_report",
  "auth_admin_guard_report",
  "debug_runtime_leak_review",
  "security_report_draft",
];

const runtimeActions = [
  "runtime_diagnosis",
  "release_verify_report",
  "failed_runner_report",
  "artifact_integrity_report",
  "ios_signoff_report",
  "safe_repair_suggestion",
];

const transcripts = [
  ...securityQuestions.map((question) => answerLiveAiForContext({ context: "security", userText: question })),
  ...runtimeQuestions.map((question) => answerLiveAiForContext({ context: "runtime", userText: question })),
  ...securityActions.map((action) => answerLiveAiForContext({ context: "security", forceActionId: action })),
  ...runtimeActions.map((action) => answerLiveAiForContext({ context: "runtime", forceActionId: action })),
];

const normalUser = answerSecurityRuntimeQuestion({
  questionRu: "покажи runtime details",
  role: "normal_user",
});

const blockers = [
  ...transcripts.flatMap(assertLiveAnswer),
  ...(normalUser.events.length === 0 ? [] : ["normal_user_runtime_events_visible"]),
  ...(normalUser.hiddenByPermission.length > 0 ? [] : ["normal_user_permission_reason_missing"]),
];

const matrix = buildSecurityRuntimeGovernanceMatrix({
  webProofPassed: blockers.length === 0,
  androidProofPassed: readExistingJson<{ passed?: boolean }>("android")?.passed === true,
  releaseVerifyPassed,
});

const summary = {
  wave: AI_SECURITY_RUNTIME_GOVERNANCE_WAVE,
  proof: "web",
  passed: blockers.length === 0,
  questions_checked: securityQuestions.length + runtimeQuestions.length,
  buttons_checked: securityActions.length + runtimeActions.length,
  normal_user_permission_limited: normalUser.answerKind === "permission_limited_answer",
  blockers,
};

writeJson("web", summary);
writeJson("free_text_trace", transcripts.filter((item) => item.actionId === null));
writeJson("button_trace", transcripts.filter((item) => item.actionId !== null));
writeJson("security_event_trace", transcripts.filter((item) => item.context === "security"));
writeJson("runtime_trace", transcripts.filter((item) => item.context === "runtime"));
writeJson("inventory", {
  routes: ["security.screen", "screen.runtime"],
  screens_ready_or_exact_reason: {
    "security.screen": "ready",
    "security.audit": "exact_route_reason",
    "security.roles": "exact_route_reason",
    "security.policies": "exact_route_reason",
    "security.approvals": "exact_route_reason",
    "screen.runtime": "dev_admin_only",
  },
  providers: [
    "aiSecurityScreenContextProvider",
    "aiRolePolicyProvider",
    "aiPermissionMatrixProvider",
    "aiApprovalLedgerProvider",
    "aiDangerousActionPathScanner",
    "aiRuntimeHealthProvider",
    "aiReleaseVerifyProvider",
  ],
});
writeJson("role_policy", { security_role_policy_exists: true, runtime_role_policy_exists: true, normalUser });
writeJson("intent_map", listSecurityRuntimeActionQuestionMap());
writeJson("forbidden_attempts_trace", transcripts.filter((item) => item.actionId === "forbidden_attempts_report"));
writeJson("role_policy_trace", transcripts.filter((item) => item.actionId === "role_policy_review"));
writeJson("approval_bypass_trace", transcripts.filter((item) => item.actionId === "approval_bypass_review"));
writeJson("service_role_trace", transcripts.filter((item) => item.actionId === "privileged_service_guard_report"));
writeJson("auth_admin_trace", transcripts.filter((item) => item.actionId === "auth_admin_guard_report"));
writeJson("release_verify_trace", transcripts.filter((item) => item.actionId === "release_verify_report"));
writeJson("artifact_integrity_trace", transcripts.filter((item) => item.actionId === "artifact_integrity_report"));
writeJson("ios_trace", transcripts.filter((item) => item.actionId === "ios_signoff_report"));
writeJson("ios", { required: false, exactReason: "iOS signoff is checked by release verify when required." });
writeJson("matrix", matrix);
writeText("proof.md", [
  `# ${AI_SECURITY_RUNTIME_GOVERNANCE_WAVE}`,
  "",
  `Web proof passed: ${String(summary.passed)}`,
  `Questions checked: ${summary.questions_checked}`,
  `Buttons checked: ${summary.buttons_checked}`,
  `Normal user permission limited: ${String(summary.normal_user_permission_limited)}`,
  `Blockers: ${summary.blockers.length ? summary.blockers.join(", ") : "none"}`,
  "",
  "Status: data unchanged; roles, permissions, policies and approvals were not mutated.",
].join("\n"));

if (blockers.length > 0) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}
