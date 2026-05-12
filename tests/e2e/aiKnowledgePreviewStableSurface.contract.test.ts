import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("AI knowledge preview stable surface", () => {
  const assistantSource = read("src/features/ai/AIAssistantScreen.tsx");
  const scopeSource = read("src/features/ai/assistantScopeContext.ts");
  const stylesSource = read("src/features/ai/AIAssistantScreen.styles.ts");

  it("renders deterministic knowledge metadata IDs from resolved screen knowledge", () => {
    expect(scopeSource).toContain("resolveAiScreenKnowledge");
    expect(scopeSource).toContain("knowledgePreview");
    expect(scopeSource).toContain("allowedEntities");
    expect(scopeSource).toContain("allowedIntents");
    expect(scopeSource).toContain("blockedIntents");
    expect(scopeSource).toContain("approvalBoundary");

    expect(assistantSource).toContain('"ai.knowledge.preview"');
    expect(assistantSource).toContain('testID="ai.knowledge.role"');
    expect(assistantSource).toContain('testID="ai.knowledge.screen"');
    expect(assistantSource).toContain('testID="ai.knowledge.domain"');
    expect(assistantSource).toContain('testID="ai.knowledge.allowed-intents"');
    expect(assistantSource).toContain('testID="ai.knowledge.blocked-intents"');
    expect(assistantSource).toContain('testID="ai.knowledge.approval-boundary"');
  });

  it("keeps the preview bounded and avoids rendering the raw system prompt block", () => {
    expect(stylesSource).toContain("maxHeight: 260");
    expect(stylesSource).toContain('overflow: "hidden"');
    expect(assistantSource).toContain("numberOfLines={1}");
    expect(assistantSource).toContain("numberOfLines={2}");
    expect(assistantSource).not.toContain("{scopedFacts.summary}");
    expect(assistantSource).not.toContain("AI APP KNOWLEDGE BLOCK");
  });

  it("keeps real AI execution and composer targetability intact", () => {
    expect(assistantSource).toContain("sendAssistantMessage({");
    expect(assistantSource).toContain("scopedFacts?.summary ?? null");
    expect(assistantSource).toContain('testID="ai.assistant.input"');
    expect(assistantSource).toContain('testID="ai.assistant.send"');
    expect(assistantSource).toContain('"ai.assistant.response"');
    expect(assistantSource).not.toMatch(/fake AI answer|hardcoded AI response/i);
  });
});
