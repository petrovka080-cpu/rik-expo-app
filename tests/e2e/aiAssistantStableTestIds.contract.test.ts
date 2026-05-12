import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const read = (relativePath: string) =>
  fs.readFileSync(path.join(ROOT, relativePath), "utf8");

const flowFiles = [
  "tests/e2e/ai-role-screen-knowledge/director-control-knowledge.yaml",
  "tests/e2e/ai-role-screen-knowledge/foreman-knowledge.yaml",
  "tests/e2e/ai-role-screen-knowledge/buyer-knowledge.yaml",
  "tests/e2e/ai-role-screen-knowledge/accountant-knowledge.yaml",
  "tests/e2e/ai-role-screen-knowledge/contractor-knowledge.yaml",
];

describe("AI assistant stable e2e test IDs", () => {
  const assistantSource = read("src/features/ai/AIAssistantScreen.tsx");
  const assistantFabSource = read("src/features/ai/AssistantFab.tsx");

  it("exposes stable IDs on the existing assistant entry and surface", () => {
    expect(assistantFabSource).toContain('testID="ai.assistant.open"');
    expect(assistantSource).toContain('testID="ai.assistant.screen"');
    expect(assistantSource).toContain('testID="ai.assistant.input"');
    expect(assistantSource).toContain('testID="ai.assistant.send"');
    expect(assistantSource).toContain('"ai.assistant.response"');
  });

  it("keeps the real assistant client path and does not add fake AI output", () => {
    expect(assistantSource).toContain("sendAssistantMessage({");
    expect(assistantSource).toContain("tryRunAssistantAction({");
    expect(assistantSource).not.toContain("hardcoded AI response");
    expect(assistantSource).not.toContain("fake AI answer");
    expect(assistantSource).not.toContain("OPENAI");
    expect(assistantSource).not.toContain("openai");
  });

  it("keeps scoped context preview bounded so the composer remains targetable", () => {
    expect(assistantSource).toContain(
      '<Text style={styles.scopeCardText} numberOfLines={3}>',
    );
    expect(assistantSource).toContain(
      '<Text style={styles.scopeCardMeta} numberOfLines={2}>',
    );
    expect(assistantSource).toContain('testID="ai.assistant.input"');
    expect(assistantSource).toContain('testID="ai.assistant.send"');
  });

  it("targets stable auth and assistant IDs from every role-screen flow", () => {
    for (const flowPath of flowFiles) {
      const flow = read(flowPath);
      expect(flow).toContain('id: "auth.login.screen"');
      expect(flow).toContain('id: "auth.login.email"');
      expect(flow).toContain('id: "auth.login.password"');
      expect(flow).toContain('id: "auth.login.submit"');
      expect(flow).toContain('id: "ai.assistant.screen"');
      expect(flow).toContain('id: "ai.assistant.input"');
      expect(flow).toContain('id: "ai.assistant.send"');
      expect(flow).toContain('id: "ai.assistant.response"');
      expect(flow).toContain("${MAESTRO_E2E_");
      expect(flow).not.toMatch(/@example\.com|password\s*[:=]|service_role/i);
    }
  });
});
