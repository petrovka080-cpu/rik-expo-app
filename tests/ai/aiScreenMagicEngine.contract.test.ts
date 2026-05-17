import {
  describeAiScreenMagicPack,
  getAiScreenMagicPack,
  listAiScreenMagicPacks,
} from "../../src/features/ai/screenMagic/aiScreenMagicEngine";

describe("AI screen magic engine", () => {
  it("builds production-safe screen magic packs from audited workflow packs", () => {
    const packs = listAiScreenMagicPacks();

    expect(packs).toHaveLength(28);
    expect(packs.every((pack) => pack.aiPreparedWork.length >= 4)).toBe(true);
    expect(packs.every((pack) => pack.buttons.length >= 4)).toBe(true);
    expect(packs.every((pack) => pack.safety.providerRequired === false)).toBe(true);
    expect(packs.every((pack) => pack.safety.dbWriteUsed === false)).toBe(true);
  });

  it("describes the current screen without exposing raw provider or debug payloads", () => {
    const pack = getAiScreenMagicPack({ role: "foreman", context: "foreman", screenId: "foreman.main" });
    const text = describeAiScreenMagicPack(pack);

    expect(text).toContain("SCREEN_MAGIC foreman.main");
    expect(text).toContain("approval");
    expect(text).not.toMatch(/raw prompt|raw provider|provider unavailable|module unavailable/i);
  });
});
