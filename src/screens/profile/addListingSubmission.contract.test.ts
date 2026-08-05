import { submitAddListing } from "./addListingSubmission";

const input = {
  profile: {
    id: "profile-1",
    user_id: "user-1",
    full_name: "Developer",
    phone: null,
    city: "Бишкек",
    usage_market: true,
    usage_build: true,
  },
  company: null,
  activeContext: "market" as const,
  companyId: null,
  listingTitle: "Цемент",
  listingCity: "Бишкек",
  listingPrice: "1250",
  listingUom: "мешок",
  listingDescription: "Описание",
  listingPhone: "+996700000000",
  listingWhatsapp: "",
  listingEmail: "",
  listingKind: "material" as const,
  listingRikCode: "MAT-001",
  listingCartItems: [],
  marketplaceMediaAssetIds: ["media-1"],
  marketplaceMediaAssets: [
    { mediaAssetId: "media-1", mediaKind: "photo" as const },
  ],
  photoPublicUrls: ["https://example.com/photo.jpg"],
  videoPublicUrls: [],
  onPublishStage: jest.fn(),
};

describe("add listing submission owner", () => {
  it("does not call the mutation when coordinates are unavailable", async () => {
    const createListing = jest.fn();
    const result = await submitAddListing(input, {
      requestCoordinates: async () => ({
        ok: false,
        message: "coordinates unavailable",
      }),
      createListing,
      storeInstantListing: jest.fn(),
      upsertInstantListing: jest.fn(),
    });

    expect(result).toEqual({
      ok: false,
      reason: "coordinates",
      message: "coordinates unavailable",
    });
    expect(createListing).not.toHaveBeenCalled();
  });

  it("persists both instant-open projections after the canonical mutation", async () => {
    const storeInstantListing = jest.fn();
    const upsertInstantListing = jest.fn();
    const createListing = jest.fn(async () => ({
      listingId: "listing-1",
      clientMutationId: "mutation-1",
    }));
    const result = await submitAddListing(input, {
      requestCoordinates: async () => ({
        ok: true,
        lat: 42.8746,
        lng: 74.5698,
      }),
      createListing,
      storeInstantListing,
      upsertInstantListing,
    });

    expect(result).toEqual({ ok: true, listingId: "listing-1" });
    expect(createListing).toHaveBeenCalledWith(
      expect.objectContaining({ lat: 42.8746, lng: 74.5698 }),
    );
    expect(storeInstantListing).toHaveBeenCalledTimes(1);
    expect(upsertInstantListing).toHaveBeenCalledWith(
      storeInstantListing.mock.calls[0][0],
    );
  });
});
