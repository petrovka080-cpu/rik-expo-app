import fs from "fs";
import path from "path";
import { containsForbiddenAiScreenNativeUserCopy } from "../../src/features/ai/screenNative/aiScreenNativeUserCopy";

describe("AI screen-native user UI hides debug context", () => {
  it("keeps raw context panels behind debug flag and sanitizes forbidden copy", () => {
    const ui = fs.readFileSync(path.join(process.cwd(), "src/features/ai/AIAssistantReadyProductPanels.tsx"), "utf8");

    expect(ui).toContain("debugAiContext &&");
    expect(containsForbiddenAiScreenNativeUserCopy("Data-aware context allowedIntents blockedIntents safe guide mode")).toBe(true);
    expect(containsForbiddenAiScreenNativeUserCopy("Готово от AI Риски Недостающие данные")).toBe(false);
  });
});
