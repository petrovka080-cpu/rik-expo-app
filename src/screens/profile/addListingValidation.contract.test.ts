import {
  buildAddListingValidationErrors,
  firstAddListingValidationError,
  hasAddListingValidationErrors,
  parsePositiveListingPrice,
} from "./addListingValidation";

describe("add listing validation owner", () => {
  it("rejects incomplete and malformed publication input", () => {
    const errors = buildAddListingValidationErrors({
      listingTitle: "",
      listingKind: null,
      marketplaceMediaAssetIds: [],
      listingDescription: "",
      listingCity: "",
      listingPrice: "-1",
      listingPhone: "123",
    });

    expect(hasAddListingValidationErrors(errors)).toBe(true);
    expect(firstAddListingValidationError(errors)).toBeTruthy();
    expect(errors).toEqual(
      expect.objectContaining({
        listingKind: expect.any(String),
        listingTitle: expect.any(String),
        media: expect.any(String),
        listingDescription: expect.any(String),
        listingCity: expect.any(String),
        listingPrice: expect.any(String),
        listingPhone: expect.any(String),
      }),
    );
  });

  it("normalizes positive decimal prices without inventing a fallback", () => {
    expect(parsePositiveListingPrice(" 1 250,50 ")).toBe(1250.5);
    expect(parsePositiveListingPrice("0")).toBeNull();
    expect(parsePositiveListingPrice("not-a-price")).toBeNull();
  });
});
