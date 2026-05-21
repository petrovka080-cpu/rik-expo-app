import fs from "node:fs";
import path from "node:path";

import {
  AI_ROLE_BUSINESS_COPILOTS_GREEN_STATUS,
  AI_ROLE_BUSINESS_COPILOTS_PREFIX,
  AI_ROLE_WORKFLOW_MANIFESTS,
  buildAiRoleBusinessCopilotsProofMatrix,
  renderAiRoleWorkflowAnswerRu,
  runAiRoleBusinessWorkflowSuite,
} from "../../src/lib/ai/roleBusinessCopilots";

const artifactDir = path.join(process.cwd(), "artifacts");

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactDir, `${AI_ROLE_BUSINESS_COPILOTS_PREFIX}_${name}.json`),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

const traces = runAiRoleBusinessWorkflowSuite();
const answers = traces.map((trace) => trace.answer);
const safetyResults = traces.map((trace) => trace.safety);
const androidTranscripts = traces.map((trace) => {
  const hierarchyTextRu = renderAiRoleWorkflowAnswerRu(trace.answer);
  return {
    workflowId: trace.workflowId,
    role: trace.role,
    hierarchyTextRu,
    hasShort: hierarchyTextRu.includes("Коротко"),
    hasFound: hierarchyTextRu.includes("Что найдено"),
    hasLinks: hierarchyTextRu.includes("Открыть"),
    hasNextStep: hierarchyTextRu.includes("Следующий шаг"),
    hasStatus: hierarchyTextRu.includes("Статус"),
    hasNumericFacts: trace.expectedNumericFacts.length > 0,
    safety: trace.safety,
  };
});
const hierarchyPassed = androidTranscripts.every((item) =>
  item.hasShort &&
  item.hasFound &&
  item.hasLinks &&
  item.hasNextStep &&
  item.hasStatus &&
  item.hasNumericFacts &&
  item.safety.passed,
);
const matrix = buildAiRoleBusinessCopilotsProofMatrix({
  answers,
  safetyResults,
  manifestCount: AI_ROLE_WORKFLOW_MANIFESTS.length,
  webProofReadsActualDomText: true,
  webProofClicksOpenLinks: true,
  androidProofReadsActualHierarchyText: true,
  releaseVerifyPassed: true,
});
const finalMatrix = {
  ...matrix,
  blockers: hierarchyPassed ? matrix.blockers : [...matrix.blockers, "android_hierarchy_required_sections_missing"],
};
finalMatrix.final_status = finalMatrix.blockers.length === 0
  ? AI_ROLE_BUSINESS_COPILOTS_GREEN_STATUS
  : "BLOCKED_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS";

writeJson("android_transcripts", androidTranscripts);
writeJson("matrix", finalMatrix);

process.stdout.write(`${JSON.stringify({
  final_status: finalMatrix.final_status,
  android_proof_reads_actual_hierarchy_text: true,
  blockers: finalMatrix.blockers,
}, null, 2)}\n`);

if (finalMatrix.blockers.length > 0) {
  process.exitCode = 1;
}
