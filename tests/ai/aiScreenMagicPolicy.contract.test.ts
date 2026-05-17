import { listAiScreenMagicPacks } from "../../src/features/ai/screenMagic/aiScreenMagicEngine";
import { validateAiScreenMagicPacks } from "../../src/features/ai/screenMagic/aiScreenMagicPolicy";

describe("AI screen magic policy", () => {
  it("keeps every pack safe, screen-specific, approval-routed and provider-free", () => {
    const result = validateAiScreenMagicPacks(listAiScreenMagicPacks());

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });
});
