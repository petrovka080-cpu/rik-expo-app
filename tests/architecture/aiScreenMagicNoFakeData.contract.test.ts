import { listAiScreenMagicPacks } from "../../src/features/ai/screenMagic/aiScreenMagicEngine";

describe("AI screen magic no fake data", () => {
  it("does not create fake suppliers, prices, payments, documents, stock or construction norms", () => {
    const packs = listAiScreenMagicPacks();
    const text = JSON.stringify(packs);

    expect(packs.every((pack) => pack.safety.fakeDataUsed === false)).toBe(true);
    expect(text).not.toMatch(/\bSupplier A\b|\bSupplier B\b|fake supplier|fake price|fake payment|fake document|fake stock|fake construction norm/i);
  });
});
