import { getAllScreensReport } from "../allScreensRuntime/allScreensRuntimeTestHarness";

describe("all screens backend boundary required contract", () => {
  it("locks screen acceptance to backend-owned truth, not local status hacks", () => {
    expect(getAllScreensReport().backend).toMatchObject({
      estimate_backend_owned: true,
      pdf_existing_pipeline_used: true,
      marketplace_backend_validated: true,
      consumer_service_owned: true,
      role_backend_boundaries_present: true,
      passed: true,
    });
  });
});
