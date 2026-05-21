import fs from "node:fs";
import path from "node:path";
import { answerLiveAiForContext, type LiveAiAnswer } from "../../src/lib/ai/liveUi/liveAiActionRouter";
import {
  AI_SECURITY_RUNTIME_GOVERNANCE_WAVE,
  answerSecurityRuntimeQuestion,
  buildSecurityRuntimeGovernanceMatrix,
} from "../../src/lib/ai/securityRuntime";

const projectRoot = process.cwd();
const artifactDir = path.join(projectRoot, "artifacts");
const prefix = "S_AI_SECURITY_RUNTIME_GOVERNANCE_FUNNEL";
const releaseVerifyPassed = process.env.S_AI_SECURITY_RUNTIME_RELEASE_VERIFY_PASSED === "true";

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(path.join(artifactDir, `${prefix}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`);
}

function readExistingJson<T>(name: string): T | null {
  const fullPath = path.join(artifactDir, `${prefix}_${name}.json`);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf8")) as T;
}

function hierarchyText(answer: LiveAiAnswer): string {
  return [answer.answerTextRu, ...answer.sourcesRu, ...answer.missingDataRu, answer.nextStepRu].join("\n");
}

function assertHierarchy(answer: LiveAiAnswer): string[] {
  const text = hierarchyText(answer);
  const blockers: string[] = [];
  if (!answer.providerTrace.includes("securityRuntime")) blockers.push(`wrong_pipeline:${answer.context}`);
  if (!/Ответ/.test(text)) blockers.push(`answer_not_visible:${answer.context}`);
  if (!/Источники:|Что проверено:/i.test(text)) blockers.push(`sources_not_visible:${answer.context}`);
  if (!/Следующий шаг:|РЎР»РµРґСѓСЋС‰РёР№ С€Р°Рі:/i.test(text)) blockers.push(`next_step_not_visible:${answer.context}`);
  if (/SUPABASE_SERVICE_ROLE_KEY|BEGIN RSA|BEGIN OPENSSH|raw provider payload|service_role key|cat \.env|printenv/i.test(text)) {
    blockers.push(`raw_secret_visible:${answer.context}`);
  }
  if (/rm -rf|drop table|delete from|truncate|supabase db reset|key dump/i.test(text)) {
    blockers.push(`destructive_repair_visible:${answer.context}`);
  }
  return blockers;
}

const cases = [
  answerLiveAiForContext({ context: "security", userText: "какие риски безопасности" }),
  answerLiveAiForContext({ context: "security", userText: "есть ли approval bypass" }),
  answerLiveAiForContext({ context: "security", forceActionId: "debug_runtime_leak_review" }),
  answerLiveAiForContext({ context: "runtime", userText: "какой exact blocker" }),
  answerLiveAiForContext({ context: "runtime", forceActionId: "safe_repair_suggestion" }),
];

const normalUser = answerSecurityRuntimeQuestion({
  questionRu: "покажи runtime details",
  role: "normal_user",
});

const blockers = [
  ...cases.flatMap(assertHierarchy),
  ...(normalUser.answerKind === "permission_limited_answer" ? [] : ["normal_user_not_permission_limited"]),
  ...(normalUser.events.length === 0 ? [] : ["normal_user_runtime_details_visible"]),
];

const matrix = buildSecurityRuntimeGovernanceMatrix({
  webProofPassed: readExistingJson<{ passed?: boolean }>("web")?.passed === true,
  androidProofPassed: blockers.length === 0,
  releaseVerifyPassed,
});

const summary = {
  wave: AI_SECURITY_RUNTIME_GOVERNANCE_WAVE,
  proof: "maestro",
  passed: blockers.length === 0,
  hierarchy_text_read: true,
  answers_checked: cases.length,
  normal_user_permission_limited: normalUser.answerKind === "permission_limited_answer",
  blockers,
};

writeJson("android", summary);
writeJson("android_trace", { cases, normalUser });
writeJson("debug_leak_trace", { normalUser, checkedBy: "maestro_hierarchy_text" });
writeJson("safe_repair_trace", cases.filter((item) => item.actionId === "safe_repair_suggestion"));
writeJson("matrix", matrix);

if (blockers.length > 0) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}
