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
  const assistantProductPanelsSource = read("src/features/ai/AIAssistantReadyProductPanels.tsx");
  const assistantUiSource = [assistantSource, assistantProductPanelsSource].join("\n");
  const assistantFabSource = read("src/features/ai/AssistantFab.tsx");

  it("exposes stable IDs on the existing assistant entry and surface", () => {
    expect(assistantFabSource).toContain('testID="ai.assistant.open"');
    expect(assistantUiSource).toContain('testID="ai.assistant.screen"');
    expect(assistantUiSource).toContain('testID="ai.assistant.messages"');
    expect(assistantUiSource).toContain('testID="ai.assistant.input"');
    expect(assistantUiSource).toContain('testID="ai.assistant.send"');
    expect(assistantUiSource).toContain('"ai.assistant.response"');
    expect(assistantUiSource).toContain('"ai.assistant.response.history"');
    expect(assistantUiSource).toContain('"ai.knowledge.preview"');
    expect(assistantUiSource).toContain('testID="ai.knowledge.role"');
    expect(assistantUiSource).toContain('testID="ai.knowledge.screen"');
    expect(assistantUiSource).toContain('testID="ai.knowledge.domain"');
    expect(assistantUiSource).toContain('testID="ai.knowledge.allowed-intents"');
    expect(assistantUiSource).toContain('testID="ai.knowledge.blocked-intents"');
    expect(assistantUiSource).toContain('testID="ai.knowledge.approval-boundary"');
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
    const stylesSource = read("src/features/ai/AIAssistantScreen.styles.ts");

    expect(assistantUiSource).toContain("knowledgePreview");
    expect(assistantUiSource).not.toContain("{scopedFacts.summary}");
    expect(assistantUiSource).toContain("numberOfLines={1}");
    expect(assistantUiSource).toContain(
      'testID="ai.knowledge.approval-boundary"',
    );
    expect(stylesSource).toContain("maxHeight: 260");
    expect(assistantUiSource).toContain('testID="ai.assistant.input"');
    expect(assistantUiSource).toContain('testID="ai.assistant.send"');
  });

  it("keeps assistant chip rows bounded so response bubbles stay targetable", () => {
    const stylesSource = read("src/features/ai/AIAssistantScreen.styles.ts");

    expect(assistantUiSource).toContain("style={styles.routeScroller}");
    expect(assistantUiSource).toContain("style={styles.quickPromptScroller}");
    expect(stylesSource).toContain("routeScroller");
    expect(stylesSource).toContain("quickPromptScroller");
    expect(stylesSource).toContain("maxHeight: 58");
    expect(stylesSource).toContain("maxHeight: 62");
  });

  it("targets the generated assistant reply instead of the initial greeting", () => {
    expect(assistantSource).toContain("hasPriorUserPrompt");
    expect(assistantSource).toContain("hasAnyUserPrompt");
    expect(assistantSource).toContain("isLatestAssistantReply");
    expect(assistantSource).toContain("shouldCompactAssistantHistory");
    expect(assistantSource).toContain('index === messages.length - 1');
    expect(assistantSource).toContain('testID={responseTestId}');
    expect(assistantSource).toContain(
      "numberOfLines={shouldCompactAssistantHistory ? 2 : undefined}",
    );
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
      expect(flow).not.toContain('id: "ai.assistant.response"');
      expect(flow).not.toContain("scrollUntilVisible:");
      expect(flow).toContain("${MAESTRO_E2E_");
      expect(flow).not.toMatch(/@example\.com|password\s*[:=]|service_role/i);
    }
  });

  it("asserts the visible knowledge preview before handing prompt-pipeline proof to the runner", () => {
    for (const flowPath of flowFiles) {
      const flow = read(flowPath);
      const knowledgeIndex = flow.indexOf('id: "ai.knowledge.preview"');
      const sendIndex = flow.lastIndexOf('id: "ai.assistant.send"');

      expect(knowledgeIndex).toBeGreaterThan(0);
      expect(sendIndex).toBeGreaterThan(knowledgeIndex);
      expect(flow.slice(sendIndex)).toContain("waitForAnimationToEnd");
      expect(flow).not.toContain("AI APP KNOWLEDGE BLOCK");
      expect(flow.slice(sendIndex)).not.toContain('visible: "AI APP KNOWLEDGE BLOCK"');
    }
  });
});
