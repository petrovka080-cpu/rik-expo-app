import {
  containsForbiddenAiScreenNativeUserCopy,
  sanitizeAiScreenNativeUserCopy,
} from "../../src/features/ai/screenNative/aiScreenNativeUserCopy";

describe("AI screen-native user-facing copy", () => {
  it("removes provider/debug/module unavailable copy from user text", () => {
    const text = sanitizeAiScreenNativeUserCopy("AI-ключи не настроены. safe guide mode. provider unavailable. модуль не подключен.");

    expect(containsForbiddenAiScreenNativeUserCopy(text)).toBe(false);
    expect(text).toContain("режим подсказок и черновиков");
  });
  it("does not expose internal knowledge prompt blocks as normal user copy", () => {
    const raw = "AI APP KNOWLEDGE BLOCK\nrole: director\nscreenId: chat.main\ncontextPolicy: director_full\nREAD_ONLY_FACTS\nFinance: debt 10";
    const text = sanitizeAiScreenNativeUserCopy(raw);

    expect(containsForbiddenAiScreenNativeUserCopy(raw)).toBe(true);
    expect(containsForbiddenAiScreenNativeUserCopy(text)).toBe(false);
    expect(text).not.toContain("AI APP KNOWLEDGE BLOCK");
    expect(text).not.toContain("screenId:");
    expect(text.length).toBeGreaterThan(20);
  });
});
