import { buildCoreProductGoldenPathsReport } from "../../scripts/e2e/coreProductGoldenPaths.shared";

describe("b2c request golden path", () => {
  it("requires approval, openable PDF, history, and marketplace validation", () => {
    const report = buildCoreProductGoldenPathsReport();

    expect(report.matrix.b2c_request_flow_passed).toBe(true);
    expect(report.matrix.b2c_approve_creates_pdf).toBe(true);
    expect(report.matrix.b2c_pdf_opens).toBe(true);
    expect(report.matrix.b2c_pdf_history_visible).toBe(true);
    expect(report.matrix.b2c_marketplace_send_validation_passed).toBe(true);
    expect(report.matrix.b2c_office_leak_found).toBe(false);
  });
});
