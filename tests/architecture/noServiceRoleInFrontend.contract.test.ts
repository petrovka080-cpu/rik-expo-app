import { scanServiceRoleFrontendLeaks } from "../../scripts/audit/rlsDynamicCrossTenant.shared";

describe("architecture: no service role in frontend", () => {
  it("keeps SUPABASE_SERVICE_ROLE_KEY out of app and client src surfaces", () => {
    const report = scanServiceRoleFrontendLeaks();

    expect(report.service_role_frontend_leak_found).toBe(false);
    expect(report.findings).toEqual([]);
  });
});
