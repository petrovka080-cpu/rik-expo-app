import { assertAiEstimatePdfDoesNotLeakOfficeData } from "../../src/lib/ai/estimatePdf";
import { buildAiEstimatePdfSourceFixture } from "./aiEstimatePdfTestHarness";

describe("AI estimate PDF consumer leak contract", () => {
  it("does not include office/company/warehouse data in consumer PDF payload", () => {
    expect(() => assertAiEstimatePdfDoesNotLeakOfficeData(buildAiEstimatePdfSourceFixture())).not.toThrow();
  });
});
