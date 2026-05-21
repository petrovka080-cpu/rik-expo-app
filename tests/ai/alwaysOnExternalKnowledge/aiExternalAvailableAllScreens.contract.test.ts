import { AI_ALWAYS_ON_EXTERNAL_KNOWLEDGE_POLICY } from "../../../src/lib/ai/alwaysOnExternalKnowledge";
import { canUseAiExternalKnowledgeOnScreen } from "../../../src/lib/ai/externalKnowledge";

describe("AI external knowledge available all screens", () => {
  it("allows public knowledge intents regardless of screen", () => {
    expect(AI_ALWAYS_ON_EXTERNAL_KNOWLEDGE_POLICY.externalKnowledgeAvailableAllScreens).toBe(true);
    expect(canUseAiExternalKnowledgeOnScreen("construction_estimate")).toBe(true);
    expect(canUseAiExternalKnowledgeOnScreen("accounting_entry_help")).toBe(true);
    expect(canUseAiExternalKnowledgeOnScreen("marketplace_supplier_search")).toBe(true);
  });
});
