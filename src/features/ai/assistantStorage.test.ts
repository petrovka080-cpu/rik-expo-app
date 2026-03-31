import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  clearAssistantMessages,
  loadAssistantMessages,
  loadForemanAssistantSession,
  saveAssistantMessages,
  saveForemanAssistantSession,
} from "./assistantStorage";

type AsyncStorageMock = {
  clear?: () => Promise<void>;
  getItem: (key: string) => Promise<string | null>;
};

const storage = AsyncStorage as unknown as AsyncStorageMock;

describe("assistantStorage", () => {
  beforeEach(async () => {
    await storage.clear?.();
  });

  it("persists assistant messages with bounded retention envelope", async () => {
    await saveAssistantMessages(
      "user-1",
      Array.from({ length: 35 }, (_, index) => ({
        id: `m-${index}`,
        role: index % 2 === 0 ? "assistant" : "user",
        content: `Message ${index}`,
        createdAt: `2026-03-31T00:00:${String(index).padStart(2, "0")}Z`,
      })),
    );

    const loaded = await loadAssistantMessages("user-1");
    const raw = await storage.getItem("gox.ai.chat.v1:user-1");
    const envelope = JSON.parse(String(raw));

    expect(loaded).toHaveLength(30);
    expect(loaded[0]?.id).toBe("m-5");
    expect(envelope.__rikPersisted).toBe(true);
    expect(typeof envelope.expiresAt).toBe("number");

    await clearAssistantMessages("user-1");
    expect(await loadAssistantMessages("user-1")).toEqual([]);
  });

  it("persists trimmed foreman session snapshots", async () => {
    await saveForemanAssistantSession("user-2", {
      draft_request_id: "req-1",
      draft_display_no: "REQ-0001/2026",
      pending_items: Array.from({ length: 20 }, (_, index) => ({
        name: `Item ${index}`,
        qty: index + 1,
        unit: "шт",
        kind: "material",
      })),
    });

    const loaded = await loadForemanAssistantSession("user-2");

    expect(loaded.draft_request_id).toBe("req-1");
    expect(loaded.pending_items).toHaveLength(12);
    expect(loaded.pending_items[0]?.name).toBe("Item 0");
  });
});
