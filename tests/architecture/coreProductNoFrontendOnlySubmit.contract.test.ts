import { buildCoreProductBackendBoundaryReport } from "../../scripts/e2e/coreProductGoldenPaths.shared";

describe("core product no frontend-only submit architecture", () => {
  it("keeps core submits behind service or RPC boundaries", () => {
    const report = buildCoreProductBackendBoundaryReport();

    expect(report.frontend_only_core_submit_found).toBe(false);
    expect(report.direct_status_write_found).toBe(false);
    expect(report.fake_pdf_status_found).toBe(false);
    expect(report.all_core_actions_have_service_boundary).toBe(true);
  });
});
