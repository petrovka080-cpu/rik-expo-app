import {
  GREEN_AI_ESTIMATE_10000_NO_BLIND_QUANTITY_COPY_NO_BUILDS,
  validateNoBlindQuantityCopy10000,
} from "../../scripts/estimate/validateNoBlindQuantityCopy10000";

describe("truth audit no blind quantity copy 10000", () => {
  it("keeps user input from being copied into unrelated material rows", () => {
    const summary = validateNoBlindQuantityCopy10000();

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_10000_NO_BLIND_QUANTITY_COPY_NO_BUILDS);
    expect(summary.no_blind_quantity_copy).toBe(true);
    expect(summary.blind_quantity_copy_count).toBe(0);
  });
});
