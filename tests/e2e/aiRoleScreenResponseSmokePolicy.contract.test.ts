import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

const flowFiles = [
  "tests/e2e/ai-role-screen-knowledge/director-control-knowledge.yaml",
  "tests/e2e/ai-role-screen-knowledge/foreman-knowledge.yaml",
  "tests/e2e/ai-role-screen-knowledge/buyer-knowledge.yaml",
  "tests/e2e/ai-role-screen-knowledge/accountant-knowledge.yaml",
  "tests/e2e/ai-role-screen-knowledge/contractor-knowledge.yaml",
];

describe("AI role-screen response smoke policy", () => {
  it("keeps release flows blocking on deterministic preview and delegates prompt proof to the runner", () => {
    for (const flowPath of flowFiles) {
      const flow = read(flowPath);
      const sendIndex = flow.indexOf('id: "ai.assistant.send"');
      const postSendPhase = flow.slice(sendIndex);

      expect(flow).toContain('id: "ai.knowledge.preview"');
      expect(flow).toContain('id: "ai.knowledge.approval-boundary"');
      expect(flow).toContain('id: "ai.assistant.input"');
      expect(flow).toContain('id: "ai.assistant.send"');
      expect(postSendPhase).toContain("waitForAnimationToEnd");
      expect(postSendPhase).not.toContain('id: "ai.assistant.response"');
      expect(postSendPhase).not.toContain("scrollUntilVisible:");
      expect(flow).not.toContain("AI APP KNOWLEDGE BLOCK");
      expect(flow).not.toMatch(/@example\.com|password\s*[:=]|service_role|SUPABASE_SERVICE_ROLE_KEY/i);
    }
  });

  it("keeps LLM response smoke non-blocking in the runner", () => {
    const runnerSource = read("scripts/e2e/runAiRoleScreenKnowledgeMaestro.ts");

    expect(runnerSource).toContain("GREEN_AI_ROLE_SCREEN_DETERMINISTIC_RELEASE_GATE");
    expect(runnerSource).toContain("release_gate_status");
    expect(runnerSource).toContain("prompt_pipeline_status");
    expect(runnerSource).toContain("prompt_pipeline_observations");
    expect(runnerSource).toContain("observePromptPipeline");
    expect(runnerSource).toContain("ai.assistant.loading");
    expect(runnerSource).toContain("ai.assistant.response");
    expect(runnerSource).toContain("response_smoke_status");
    expect(runnerSource).toContain("BLOCKED_AI_RESPONSE_SMOKE_TIMEOUT_CANARY");
    expect(runnerSource).toContain("response_smoke_blocking_release: false");
    expect(runnerSource).toContain("response_smoke_exact_llm_text_assertion: false");
    expect(runnerSource).toContain("createResponseSmokeFlowFiles");
    expect(runnerSource).toContain("responseSmokeReportFile");
    expect(runnerSource).not.toContain("buildMaestroEnvArgs");
    expect(runnerSource).not.toContain("listUsers");
    expect(runnerSource).not.toContain("auth.admin");
    expect(runnerSource).not.toContain("signInWithPassword");
  });
});
