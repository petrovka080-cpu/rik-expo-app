import fs from "fs";
import path from "path";
import { listAiScreenNativeAssistantRegistry } from "../../src/features/ai/screenNative/aiScreenNativeAssistantRegistry";

describe("AI screen-native assistants are not generic chat-only", () => {
  it("registers real value packs and mounts them before chat", () => {
    const ui = fs.readFileSync(path.join(process.cwd(), "src/features/ai/AIAssistantReadyProductPanels.tsx"), "utf8");
    const registry = listAiScreenNativeAssistantRegistry();

    expect(registry.length).toBeGreaterThanOrEqual(28);
    expect(registry.every((entry) => entry.defaultNextActions.length > 0)).toBe(true);
    expect(ui).toContain("ai.screen_native_value_pack");
    expect(ui.indexOf("ai.screen_native_value_pack")).toBeLessThan(ui.indexOf("ai.role_screen_assistant_pack"));
  });
});
