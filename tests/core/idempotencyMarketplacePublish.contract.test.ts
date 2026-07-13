import type { ListingCartItem, ListingFormState } from "../../src/screens/profile/profile.types";

const mockFrom = jest.fn();
const mockRpc = jest.fn();
const observabilityEvents: unknown[] = [];

jest.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      updateUser: jest.fn(),
      signOut: jest.fn(),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
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
    mockRpc.mockReset();
    mockRpc.mockResolvedValue({ data: null, error: null });
    observabilityEvents.length = 0;
  });

  it("uses a stable service-owned client mutation id and treats duplicate insert as idempotent replay", async () => {
    const insertedPayloads: Array<Record<string, unknown>> = [];
    const duplicateError = Object.assign(new Error("duplicate key"), { code: "23505" });
    const listingId = "22222222-2222-4222-8222-222222222222";
    const single = jest.fn(async () => ({
      data: insertedPayloads.length === 1 ? { id: listingId } : null,
      error: insertedPayloads.length === 1 ? null : duplicateError,
    }));
    const selectAfterInsert = jest.fn(() => ({ single }));
    const insert = jest.fn((payload: Record<string, unknown>) => {
      insertedPayloads.push(payload);
      return { select: selectAfterInsert };
    });
    const maybeSingle = jest.fn(async () => ({ data: { id: listingId }, error: null }));
    const secondEq = jest.fn(() => ({ maybeSingle }));
    const firstEq = jest.fn(() => ({ eq: secondEq }));
    const select = jest.fn(() => ({ eq: firstEq }));
    mockFrom.mockImplementation((table: string) => {
      if (table !== "market_listings") throw new Error(`unexpected table ${table}`);
      return { insert, select };
    });

    const input = {
      userId: "33333333-3333-4333-8333-333333333333",
      companyId: "44444444-4444-4444-8444-444444444444",
      form: buildListingForm(),
      listingCartItems: [buildListingCartItem()],
      marketplaceMediaAssetIds: ["11111111-1111-4111-8111-111111111111"],
      lat: 42,
      lng: 74,
    };

    await expect(createMarketListing(input)).resolves.toMatchObject({ listingId });
    await expect(createMarketListing(input)).resolves.toMatchObject({ listingId });

    expect(insert).toHaveBeenCalledTimes(2);
    expect(insertedPayloads[0].client_mutation_id).toEqual(insertedPayloads[1].client_mutation_id);
    expect(String(insertedPayloads[0].client_mutation_id)).toMatch(/^marketplace\.publish:33333333-3333-4333-8333-333333333333:/);
    expect(JSON.stringify(observabilityEvents)).toContain("marketplace_listing_publish_idempotent_replay");
  });
});
