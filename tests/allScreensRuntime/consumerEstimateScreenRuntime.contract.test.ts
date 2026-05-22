import { getAllScreensReport } from "./allScreensRuntimeTestHarness";

describe("consumer estimate screen runtime contract", () => {
  it("keeps Смета / Ремонт дома with estimate rows, PDF action, and history boundary", () => {
    const report = getAllScreensReport();
    expect(report.matrix.consumer_smeta_screen_ready).toBe(true);
    expect(report.matrix.consumer_estimate_to_pdf_ready).toBe(true);
    expect(report.matrix.pdf_history_ready).toBe(true);
  });
});
