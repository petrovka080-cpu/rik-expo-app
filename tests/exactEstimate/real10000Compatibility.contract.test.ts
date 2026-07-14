import { buildExactMaterialPriceEstimate } from "../../src/lib/ai/exactMaterialPriceEstimate";
import { REAL_DIVERSE_10000_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";

describe("real 10000 exact material price compatibility", () => {
  jest.setTimeout(420_000);

  it("does not crash and keeps stable ids/statuses for 10000 real prompts", () => {
    const failures: string[] = [];

    for (const item of REAL_DIVERSE_10000_CONSTRUCTION_WORKS) {
      try {
        const left = buildExactMaterialPriceEstimate({ text: item.promptRu });
        const right = buildExactMaterialPriceEstimate({ text: item.promptRu });
        expect(left.estimate_id).toBe(right.estimate_id);
        expect(left.work.work_key).toBeTruthy();
        expect(left.input.quantity).toBeGreaterThan(0);
        expect(left.material_lines.length).toBeGreaterThan(0);
        expect(left.totals.total_status === "COMPLETE" || left.totals.total_status === "PARTIAL_PRICE_MISSING").toBe(true);
        expect(left.policy.fake_price_claimed).toBe(false);
        expect(left.policy.fake_supplier_claimed).toBe(false);
      } catch (error) {
        failures.push(`${item.caseId}:${error instanceof Error ? error.message : String(error)}`);
      }
    }

    expect(failures).toEqual([]);
  });
});
