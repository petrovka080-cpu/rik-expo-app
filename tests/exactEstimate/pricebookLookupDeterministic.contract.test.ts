import { buildRoofExactEstimate, directKnownRate } from "./exactEstimateTestHelpers";

describe("deterministic pricebook lookup", () => {
  it("returns the same verified price on repeated lookups", () => {
    const left = buildRoofExactEstimate();
    const right = buildRoofExactEstimate();

    expect(left.material_lines.map((line) => [line.material_id, line.price_status, line.price_value, line.line_total]))
      .toEqual(right.material_lines.map((line) => [line.material_id, line.price_status, line.price_value, line.line_total]));
    expect(left.totals).toEqual(right.totals);

    const direct = directKnownRate();
    expect(direct.price_status).toBe("VERIFIED");
    expect(direct.price_value).toBe(545);
    expect(direct.fake_price_claimed).toBe(false);
  });
});
