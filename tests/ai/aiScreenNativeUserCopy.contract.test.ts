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
});
