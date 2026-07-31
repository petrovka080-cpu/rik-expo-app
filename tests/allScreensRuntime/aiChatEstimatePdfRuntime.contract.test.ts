import { getAllScreensReport } from "./allScreensRuntimeTestHarness";
import { buildAiEstimatePdfActions } from "../../src/lib/ai/estimatePdf";
import { buildAiEstimatePdfSourceFixture } from "../aiEstimatePdf/aiEstimatePdfTestHarness";

describe("AI chat estimate PDF runtime contract", () => {
  it("requires backend-backed estimate payload before showing PDF generation", () => {
    const report = getAllScreensReport();
    expect(report.matrix.chat_screen_ready).toBe(true);
    expect(report.matrix.ai_estimate_to_pdf_ready).toBe(true);
    expect(report.backend.frontend_price_tax_calculation_found).toBe(false);

    const runtimeActions = buildAiEstimatePdfActions(buildAiEstimatePdfSourceFixture());
    expect(runtimeActions.some((action) =>
      action.id === "make_estimate_pdf" &&
      action.visibleWhen === "message_has_estimate_payload"
    )).toBe(true);
  });
});
