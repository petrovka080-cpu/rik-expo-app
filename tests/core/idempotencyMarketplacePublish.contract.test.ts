import type { ListingCartItem, ListingFormState } from "../../src/screens/profile/profile.types";

const mockFrom = jest.fn();
const observabilityEvents: unknown[] = [];

jest.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      updateUser: jest.fn(),
      signOut: jest.fn(),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

jest.mock("../../src/lib/api/profile", () => ({
  getMyRole: jest.fn(),
}));

jest.mock("../../src/lib/observability/platformObservability", () => ({
  recordPlatformObservability: (event: unknown) => observabilityEvents.push(event),
}));

import { createMarketListing } from "../../src/screens/profile/profile.services";

const buildListingForm = (): ListingFormState => ({
  listingTitle: "Cement",
  listingCity: "Bishkek",
  listingPrice: "1200",
  listingUom: "kg",
  listingDescription: "Bulk cement",
  listingPhone: "+996700333333",
  listingWhatsapp: "+996700444444",
  listingEmail: "seller@example.com",
  listingKind: "material",
  listingRikCode: "RIK-1",
});

const buildListingCartItem = (): ListingCartItem => ({
  id: "item-1",
  rik_code: "RIK-1",
  name: "Cement",
  uom: "kg",
  qty: "2",
  price: "600",
  city: "Bishkek",
  kind: "material",
});

describe("Wave08 marketplace publish idempotency", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    observabilityEvents.length = 0;
  });

  it("uses a stable service-owned client mutation id and treats duplicate insert as idempotent replay", async () => {
    const insertedPayloads: Array<Record<string, unknown>> = [];
    const duplicateError = Object.assign(new Error("duplicate key"), { code: "23505" });
    const insert = jest.fn(async (payload: Record<string, unknown>) => {
      insertedPayloads.push(payload);
      return { error: insertedPayloads.length === 1 ? null : duplicateError };
    });
    mockFrom.mockImplementation((table: string) => {
      if (table !== "market_listings") throw new Error(`unexpected table ${table}`);
      return { insert };
    });

    const input = {
      userId: "user-1",
      companyId: "company-1",
      form: buildListingForm(),
      listingCartItems: [buildListingCartItem()],
      marketplaceMediaAssetIds: ["media-1"],
      lat: 42,
      lng: 74,
    };

    await expect(createMarketListing(input)).resolves.toBeUndefined();
    await expect(createMarketListing(input)).resolves.toBeUndefined();

    expect(insert).toHaveBeenCalledTimes(2);
    expect(insertedPayloads[0].client_mutation_id).toEqual(insertedPayloads[1].client_mutation_id);
    expect(String(insertedPayloads[0].client_mutation_id)).toMatch(/^marketplace\.publish:user-1:/);
    expect(JSON.stringify(observabilityEvents)).toContain("marketplace_listing_publish_idempotent_replay");
  });
});
