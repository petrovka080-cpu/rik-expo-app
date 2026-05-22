import {
  __resetAiEstimatePdfHistoryForTests,
  generateAiEstimatePdf,
} from "../../src/lib/ai/estimatePdf";
import { __resetConsumerRepairRequestStoreForTests } from "../../src/lib/consumerRequests";
import { buildAiEstimatePdfSourceFixture } from "./aiEstimatePdfTestHarness";

describe("AI estimate PDF generation contract", () => {
  beforeEach(() => {
    __resetAiEstimatePdfHistoryForTests();
    __resetConsumerRepairRequestStoreForTests();
  });

  it("generates an openable PDF through the existing consumer PDF service", () => {
    const result = generateAiEstimatePdf({ source: buildAiEstimatePdfSourceFixture(), userConfirmed: true });

    expect(result.status).toBe("openable");
    expect(result.access.kind).toBe("signed-url");
    expect(result.access.uri).toContain("data:application/pdf");
  });
});
