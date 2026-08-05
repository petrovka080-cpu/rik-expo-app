import type { AssistantMessage } from "../../src/features/ai/assistant.types";
import { resolveAssistantMessagesAfterHydration } from "../../src/features/ai/AIAssistantScreen.helpers";

const message = (
  id: string,
  role: AssistantMessage["role"],
  content: string,
): AssistantMessage => ({
  id,
  role,
  content,
  createdAt: "2026-07-30T00:00:00.000Z",
});

describe("resolveAssistantMessagesAfterHydration", () => {
  it("preserves a live launch response when background hydration resolves later", () => {
    const current = [
      message("user", "user", "смета на асфальтирование 10000 кв м"),
      message("estimate", "assistant", "Профессиональная смета готова"),
    ];
    const hydrated = [message("greeting", "assistant", "Чем помочь?")];

    expect(
      resolveAssistantMessagesAfterHydration(current, hydrated, true),
    ).toBe(current);
  });

  it("uses hydrated messages before an interactive launch has produced content", () => {
    const hydrated = [message("greeting", "assistant", "Чем помочь?")];

    expect(
      resolveAssistantMessagesAfterHydration([], hydrated, true),
    ).toBe(hydrated);
  });

  it("replaces prior content during an ordinary non-interactive refresh", () => {
    const current = [message("old", "assistant", "Старое сообщение")];
    const hydrated = [message("stored", "assistant", "Сохранённое сообщение")];

    expect(
      resolveAssistantMessagesAfterHydration(current, hydrated, false),
    ).toBe(hydrated);
  });
});
