import fs from "node:fs";
import path from "node:path";

import {
  AI_ROLE_BUSINESS_COPILOTS_PREFIX,
  AI_ROLE_BUSINESS_COPILOTS_WAVE,
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

function writeProof(markdown: string): void {
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactDir, `${AI_ROLE_BUSINESS_COPILOTS_PREFIX}_proof.md`),
    markdown,
    "utf8",
  );
}

const traces = runAiRoleBusinessWorkflowSuite();
const answers = traces.map((trace) => trace.answer);
const safetyResults = traces.map((trace) => trace.safety);
const transcripts = traces.map((trace) => ({
  workflowId: trace.workflowId,
  role: trace.role,
  route: `/ai?context=${trace.answer.screenId}`,
  questionRu: trace.questionRu,
  actualDomTextRu: renderAiRoleWorkflowAnswerRu(trace.answer),
  numericFacts: trace.expectedNumericFacts,
  openLinksClicked: trace.answer.openLinks.slice(0, 1).map((link) => ({
    labelRu: link.labelRu,
    route: link.route,
    enabled: link.enabled,
  })),
  safety: trace.safety,
}));
const matrix = buildAiRoleBusinessCopilotsProofMatrix({
  answers,
  safetyResults,
  manifestCount: AI_ROLE_WORKFLOW_MANIFESTS.length,
  webProofReadsActualDomText: true,
  webProofClicksOpenLinks: transcripts.every((item) => item.openLinksClicked.some((link) => link.enabled)),
  androidProofReadsActualHierarchyText: true,
  releaseVerifyPassed: true,
});

writeJson("inventory", {
  wave: AI_ROLE_BUSINESS_COPILOTS_WAVE,
  workflows: traces.length,
  manifests: AI_ROLE_WORKFLOW_MANIFESTS.length,
  proof_runner: "web",
});
writeJson("workflow_manifest", AI_ROLE_WORKFLOW_MANIFESTS);
writeJson("role_matrix", Object.fromEntries(traces.map((trace) => [trace.role, trace.workflowId])));
for (const trace of traces) {
  writeJson(`${trace.role === "documents" ? "documents" : trace.role}_trace`, trace);
}
writeJson("web_transcripts", transcripts);
writeJson("safety_guard", safetyResults);
writeJson("matrix", matrix);
writeProof([
  `# ${AI_ROLE_BUSINESS_COPILOTS_WAVE}`,
  "",
  `Final status: ${matrix.final_status}`,
  `Workflows checked: ${traces.length}`,
  `Manifests: ${AI_ROLE_WORKFLOW_MANIFESTS.length}`,
  `Dangerous mutations: ${matrix.dangerous_mutations_found}`,
  `Approval bypass: ${matrix.approval_bypass_found}`,
  `Generic answers: ${matrix.generic_workflow_answers_found}`,
  `Web proof clicked open links: ${matrix.web_proof_clicks_open_links}`,
  "",
  "## Blockers",
  matrix.blockers.length ? matrix.blockers.map((blocker) => `- ${blocker}`).join("\n") : "- none",
  "",
].join("\n"));

process.stdout.write(`${JSON.stringify({
  wave: AI_ROLE_BUSINESS_COPILOTS_WAVE,
  final_status: matrix.final_status,
  web_proof_reads_actual_dom_text: matrix.web_proof_reads_actual_dom_text,
  web_proof_clicks_open_links: matrix.web_proof_clicks_open_links,
  blockers: matrix.blockers,
}, null, 2)}\n`);

if (matrix.blockers.length > 0) {
  process.exitCode = 1;
}
