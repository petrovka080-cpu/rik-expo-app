import { buildExactMaterialPriceEstimate } from "../../src/lib/ai/exactMaterialPriceEstimate";
import { expectExactEstimateCoreInvariants, selectedWorkAcceptanceCases } from "./exactEstimateTestHelpers";

describe("real 1000 user-input selected-work exact price acceptance", () => {
  jest.setTimeout(180_000);

  it("parses 1000 selected work cases without losing selected work or quantity", () => {
    const failures: string[] = [];

    for (const item of selectedWorkAcceptanceCases()) {
      const result = buildExactMaterialPriceEstimate({
        text: item.rawEstimateInput,
        selectedWorkKey: item.selectedWorkKey,
        volume: item.volume,
        unit: item.unit,
      });
      try {
        expect(result.work.work_key).toBe(item.selectedWorkKey);
        expect(result.input.quantity).toBe(item.volume);
        expect(result.input.unit).toBe(item.unit);
        expect(result.pdf_model.sections[0]?.rows.length).toBeGreaterThan(0);
        expectExactEstimateCoreInvariants(result);
      } catch (error) {
        failures.push(`${item.id}:${error instanceof Error ? error.message : String(error)}`);
      }
    }

    expect(failures).toEqual([]);
  });
});
