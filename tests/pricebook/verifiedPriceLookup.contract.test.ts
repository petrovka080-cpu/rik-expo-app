import {
  directExactResolution,
  directGovernedResolution,
} from "./pricebookRatebookTestHelpers";

describe("verified price lookup contract", () => {
  it("selects only verified governed prices with source audit and supplier identity", () => {
    const governed = directGovernedResolution();
    const exact = directExactResolution();

    expect(governed.price_status).toBe("VERIFIED");
    expect(governed.governance_status).toBe("VERIFIED_PRICE_SELECTED");
    expect(governed.price_source_audit.selected_rate_id).toBeTruthy();
    expect(governed.price_source_audit.source_reference).toBeTruthy();
    expect(governed.price_source_audit.supplier_id).toBeTruthy();
    expect(governed.fake_price_claimed).toBe(false);
    expect(governed.fake_supplier_claimed).toBe(false);

    expect(exact.price_status).toBe("VERIFIED");
    expect(exact.price_value).toBe(545);
    expect(exact.price_source_audit?.supplier_id).toBeTruthy();
  });
});
