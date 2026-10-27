import { buildInstantPublishedMarketListing } from "./addListingProjection";

describe("add listing instant projection owner", () => {
  it("preserves catalog, seller, media, and numeric item semantics", () => {
    const listing = buildInstantPublishedMarketListing({
      listingId: "listing-1",
      clientMutationId: "mutation-1",
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
      activeContext: "market",
      listingTitle: " Цемент ",
      listingCity: " Бишкек ",
      listingPrice: "1 250,50",
      listingUom: "мешок",
      listingDescription: "Описание",
      listingPhone: "+996700000000",
      listingWhatsapp: "",
      listingEmail: "",
      listingKind: "material",
      listingRikCode: "MAT-001",
      listingCartItems: [
        {
          id: "row-1",
          rik_code: "MAT-001",
          name: "Цемент",
          uom: "мешок",
          qty: "2,5",
          price: "1250,5",
          city: "Бишкек",
          kind: "material",
        },
      ],
      photoPublicUrls: ["https://example.com/photo.jpg"],
      videoPublicUrls: [],
    });

    expect(listing).toEqual(
      expect.objectContaining({
        id: "listing-1",
        title: "Цемент",
        price: 1250.5,
        sellerUserId: "user-1",
        imageUrl: "https://example.com/photo.jpg",
      }),
    );
    expect(listing.items).toEqual([
      expect.objectContaining({ qty: 2.5, price: 1250.5 }),
    ]);
  });
});
