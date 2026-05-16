import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("AI knowledge preview stable surface", () => {
  const assistantSource = read("src/features/ai/AIAssistantScreen.tsx");
  const assistantProductPanelsSource = read("src/features/ai/AIAssistantReadyProductPanels.tsx");
  const assistantUiSource = [assistantSource, assistantProductPanelsSource].join("\n");
  const scopeSource = read("src/features/ai/assistantScopeContext.ts");
  const stylesSource = read("src/features/ai/AIAssistantScreen.styles.ts");

  it("renders deterministic knowledge metadata IDs from resolved screen knowledge", () => {
    expect(scopeSource).toContain("resolveAiScreenKnowledge");
    expect(scopeSource).toContain("knowledgePreview");
    expect(scopeSource).toContain("allowedEntities");
    expect(scopeSource).toContain("allowedIntents");
    expect(scopeSource).toContain("blockedIntents");
    expect(scopeSource).toContain("approvalBoundary");

    expect(assistantUiSource).toContain('"ai.knowledge.preview"');
    expect(assistantUiSource).toContain('testID="ai.knowledge.role"');
    expect(assistantUiSource).toContain('testID="ai.knowledge.screen"');
    expect(assistantUiSource).toContain('testID="ai.knowledge.domain"');
    expect(assistantUiSource).toContain('testID="ai.knowledge.allowed-intents"');
    expect(assistantUiSource).toContain('testID="ai.knowledge.blocked-intents"');
    expect(assistantUiSource).toContain('testID="ai.knowledge.approval-boundary"');
  });

  it("keeps the preview bounded and avoids rendering the raw system prompt block", () => {
    expect(stylesSource).toContain("maxHeight: 260");
    expect(stylesSource).toContain('overflow: "hidden"');
    expect(assistantUiSource).toContain("numberOfLines={1}");
    expect(assistantUiSource).toContain("numberOfLines={2}");
    expect(assistantUiSource).not.toContain("{scopedFacts.summary}");
    expect(assistantUiSource).not.toContain("AI APP KNOWLEDGE BLOCK");
  });

  it("keeps real AI execution and composer targetability intact", () => {
    expect(assistantSource).toContain("sendAssistantMessage({");
    expect(assistantSource).toContain("scopedFacts?.summary ?? null");
    expect(assistantUiSource).toContain('testID="ai.assistant.input"');
    expect(assistantUiSource).toContain('testID="ai.assistant.send"');
    expect(assistantUiSource).toContain('"ai.assistant.response"');
    expect(assistantUiSource).not.toMatch(/fake AI answer|hardcoded AI response/i);
  });
});
