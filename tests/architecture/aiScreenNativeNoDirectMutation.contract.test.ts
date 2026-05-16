import { getAiScreenNativeAssistantPack } from "../../src/features/ai/screenNative/aiScreenNativeAssistantEngine";
import { listAiScreenNativeAssistantRegistry } from "../../src/features/ai/screenNative/aiScreenNativeAssistantRegistry";
import { validateAiScreenNativeAssistantPack } from "../../src/features/ai/screenNative/aiScreenNativeAssistantPolicy";

describe("AI screen-native assistants do not expose direct mutations", () => {
  it("keeps every registered pack draft/read/approval-only", () => {
    for (const entry of listAiScreenNativeAssistantRegistry()) {
      const pack = getAiScreenNativeAssistantPack({
        role: entry.roleScope.includes("security") ? "security" : "unknown",
        context: entry.contexts[0] ?? "unknown",
        screenId: entry.screenId,
      });

      expect(pack.directMutationAllowed).toBe(false);
      expect(pack.dbWriteUsed).toBe(false);
      expect(pack.providerRequired).toBe(false);
      expect(pack.readyOptions.every((option) => option.canExecuteDirectly === false)).toBe(true);
      expect(pack.nextActions.every((action) => action.canExecuteDirectly === false)).toBe(true);
      expect(validateAiScreenNativeAssistantPack(pack).ok).toBe(true);
    }
  });
});
