import {
  hasForbiddenAiRoleScreenAssistantCopy,
  sanitizeAiRoleScreenAssistantCopy,
} from "../../src/features/ai/realAssistants/aiRoleScreenAssistantUserCopy";

describe("AI role-screen assistant user copy", () => {
  it("keeps provider/debug/module-unavailable copy out of user-facing text", () => {
    const copy = sanitizeAiRoleScreenAssistantCopy("AI-ключи не настроены. safe guide mode. module unavailable.");
    expect(hasForbiddenAiRoleScreenAssistantCopy(copy)).toBe(false);
    expect(copy).toContain("Работаю по данным экрана");
  });
});
