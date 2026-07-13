import { buildExactMaterialPriceEstimate } from "../../src/lib/ai/exactMaterialPriceEstimate";
import { REAL_DIVERSE_500_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse500ConstructionWorks";
import { expectExactEstimateCoreInvariants } from "./exactEstimateTestHelpers";

describe("real 500 material price semantic acceptance", () => {
  jest.setTimeout(180_000);

  it("builds exact material price payloads with explicit price statuses for 500 real prompts", () => {
    const failures: string[] = [];

    for (const item of REAL_DIVERSE_500_CONSTRUCTION_WORKS) {
      try {
        const result = buildExactMaterialPriceEstimate({ text: item.promptRu });
        expect(result.estimate_id).toBeTruthy();
        expect(result.totals.total_status === "COMPLETE" || result.totals.total_status === "PARTIAL_PRICE_MISSING").toBe(true);
        expectExactEstimateCoreInvariants(result);
      } catch (error) {
        failures.push(`${item.caseId}:${error instanceof Error ? error.message : String(error)}`);
      }
    }

    expect(failures).toEqual([]);
  });
});
