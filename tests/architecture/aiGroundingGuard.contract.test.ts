import { validateEstimateGrounding } from "../../src/lib/aiPlatform/eval/validateEstimateGrounding";

describe("AI EvalOps grounding guard", () => {
  it("accepts visible missing-input questions and rejects ungrounded final totals", () => {
    const grounded = validateEstimateGrounding(
      "Черновик сметы собран. Нужно уточнить исходные данные для профессиональной сметы.",
      { insufficientInput: true },
    );
    const ungrounded = validateEstimateGrounding(
      "Цена 100000 без источника.",
      { missingPrice: true },
    );

    expect(grounded.ok).toBe(true);
    expect(grounded.insufficient_input_shows_missing_questions).toBe(true);
    expect(ungrounded.ok).toBe(false);
    expect(ungrounded.blockers).toContain("missing_price_faked");
  });
});
