import { readAi50000Phase1Audit, readAi50000Phase1Matrix } from "./ai50000Phase1TestHelpers";

describe("AI 50000 Phase 1 architecture: no fake stock or availability", () => {
  it("keeps product stock and availability unknown unless source-backed", () => {
    const audit = readAi50000Phase1Audit();
    expect(audit.fake_stock_found).toBe(false);
    expect(audit.fake_supplier_found).toBe(false);
    expect(audit.fake_availability_found).toBe(false);
    expect(readAi50000Phase1Matrix().product_cases_routed_to_product_search).toBe(true);
  });
});
