import { listAiScreenWorkflowPacks } from "../../src/features/ai/screenWorkflows/aiScreenWorkflowEngine";

describe("AI screen workflows do not fake data", () => {
  it("marks missing data instead of creating fake suppliers, prices, payments, documents or stock", () => {
    const packs = listAiScreenWorkflowPacks();
    const text = JSON.stringify(packs);

    expect(packs.every((pack) => pack.safety.fakeDataUsed === false)).toBe(true);
    expect(packs.some((pack) => pack.missingData.length > 0)).toBe(true);
    expect(text).not.toMatch(/\bSupplier A\b|\bSupplier B\b|1 200 000|4 850 000|fake supplier|fake price|fake payment|fake document|fake stock/i);
  });
});
