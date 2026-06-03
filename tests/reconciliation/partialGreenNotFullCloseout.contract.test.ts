import { arrayField, readReconciliationArtifact } from "./reconciliationTestHelpers";

describe("current-state reconciliation - partial greens", () => {
  it("classifies partial product greens without promoting them to full closeout", () => {
    const matrix = readReconciliationArtifact("matrix.json");
    const greenClaims = readReconciliationArtifact("green_claims.json");
    const partialClaims = arrayField(greenClaims.partial_green_claims);

    expect(matrix.partial_greens_classified).toBe(true);
    expect(matrix.product_full_closeout_green_claimed).toBe(false);
    expect(greenClaims).toMatchObject({
      partial_green_claims_classified: true,
      product_full_closeout_green_claimed: false,
      ledger_green_claim_scope: "RECONCILIATION_LEDGER_ONLY",
      fake_green_claimed: false,
    });
    expect(partialClaims.some((claim) => claim.name === "visible_500_runtime")).toBe(true);
    expect(partialClaims.every((claim) => claim.usable_as_product_full_closeout === false)).toBe(true);
  });
});
