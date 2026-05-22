import {
  __resetAiEstimatePdfHistoryForTests,
  generateAiEstimatePdf,
  listAiEstimatePdfHistory,
} from "../../src/lib/ai/estimatePdf";
import { buildAiEstimatePdfSourceFixture } from "./aiEstimatePdfTestHarness";

describe("AI estimate PDF history contract", () => {
  beforeEach(() => __resetAiEstimatePdfHistoryForTests());

  it("records generated AI estimate PDFs in estimate history", () => {
    const result = generateAiEstimatePdf({ source: buildAiEstimatePdfSourceFixture(), userConfirmed: true });

    expect(listAiEstimatePdfHistory().map((item) => item.pdfId)).toContain(result.pdfId);
  });
});
