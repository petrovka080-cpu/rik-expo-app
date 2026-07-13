import {
  validateNoBlindQuantityCopy10000,
  GREEN_AI_ESTIMATE_10000_NO_BLIND_QUANTITY_COPY_NO_BUILDS,
} from "../../scripts/estimate/validateNoBlindQuantityCopy10000";

jest.setTimeout(90000);

describe("no blind quantity copy P1/P2", () => {
  it("does not copy user quantity blindly into unrelated rows", () => {
    const result = validateNoBlindQuantityCopy10000();

    expect(result.final_status).toBe(GREEN_AI_ESTIMATE_10000_NO_BLIND_QUANTITY_COPY_NO_BUILDS);
    expect(result.blind_quantity_copy_count).toBe(0);
    expect(result.no_blind_quantity_copy).toBe(true);
  });
});
