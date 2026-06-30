import * as fs from "fs";
import * as path from "path";

import { RequestTimeoutError } from "../../lib/requestTimeoutPolicy";
import type { Database } from "../../lib/database.types";
import { getMyRole } from "../../lib/api/profile";
import {
  createMarketListing,
  loadAddListingOwnerData,
  loadCurrentAuthUser,
  normalizeListingCartItemKind,
  resolveMarketListingKindContract,
  saveProfileDetails,
} from "./profile.services";
import type {
  Company,
  ListingCartItem,
  ListingFormState,
  UserProfile,
} from "./profile.types";

const mockGetUser = jest.fn();
const mockGetSession = jest.fn();
const mockUpdateUser = jest.fn();
const mockFrom = jest.fn();
const mockRpc = jest.fn();
const mockGetMyRole = getMyRole as jest.MockedFunction<typeof getMyRole>;

jest.mock("../../lib/api/profile", () => ({
  getMyRole: jest.fn(),
}));

jest.mock("../../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

const VALID_USER_ID = "11111111-1111-4111-8111-111111111111";
const VALID_COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const VALID_MEDIA_ID = "33333333-3333-4333-8333-333333333333";
const VALID_MEDIA_LINK_ID = "55555555-5555-4555-8555-555555555555";
const VALID_LISTING_ID = "44444444-4444-4444-8444-444444444444";

const baseProfile: UserProfile = {
  id: "profile-1",
  user_id: "user-1",
  full_name: "Old Name",
  phone: "+996700000000",
  city: "Bishkek",
  usage_market: true,
  usage_build: false,
  bio: null,
  telegram: null,
  whatsapp: null,
  position: null,
};

const buildProfileForm = () => ({
  profileNameInput: "New Name",
  profilePhoneInput: "+996700111111",
  profileCityInput: "Osh",
  profileBioInput: "Bio",
  profileTelegramInput: "@new",
  profileWhatsappInput: "+996700222222",
  profilePositionInput: "Manager",
});

const buildListingForm = (
  overrides: Partial<ListingFormState> = {},
): ListingFormState => ({
  listingTitle: "Cement",
  listingCity: "Bishkek",
  listingPrice: "1200",
  listingUom: "kg",
  listingDescription: "Bulk cement",
  listingPhone: "+996700333333",
  listingWhatsapp: "+996700444444",
  listingEmail: "seller@example.com",
  listingKind: null,
  listingRikCode: "RIK-1",
  ...overrides,
});

const buildListingCartItem = (
  overrides: Partial<ListingCartItem> = {},
): ListingCartItem => ({
  id: "item-1",
  rik_code: "RIK-1",
  name: "Cement",
  uom: "kg",
  qty: "2",
  price: "600",
  city: "Bishkek",
  kind: "material",
  ...overrides,
});

type MarketListingInsertPayload =
  Database["public"]["Tables"]["market_listings"]["Insert"];

type MarketListingsInsertResult = {
  data: { id: string } | null;
  error: Error | null;
};

const mockUserProfilesUpsert = (result: { data: UserProfile | null; error: Error | null }) => {
  const mockSingle = jest.fn().mockResolvedValue(result);
  const mockSelect = jest.fn(() => ({ single: mockSingle }));
  const mockUpsert = jest.fn(() => ({ select: mockSelect }));

  mockFrom.mockImplementation((table: string) => {
    if (table !== "user_profiles") {
      throw new Error(`unexpected table ${table}`);
    }
    return { upsert: mockUpsert };
  });

  return { mockUpsert, mockSelect, mockSingle };
};

const mockMarketListingsInsert = (result: Partial<MarketListingsInsertResult> = {}) => {
  const resolvedResult: MarketListingsInsertResult = {
    data: result.data ?? (result.error ? null : { id: VALID_LISTING_ID }),
    error: result.error ?? null,
  };
  const mockSingle = jest.fn().mockResolvedValue(resolvedResult);
  const mockSelect = jest.fn(() => ({ single: mockSingle }));
  const mockInsert = jest.fn((_payload: MarketListingInsertPayload) => ({
    select: mockSelect,
  }));

  mockFrom.mockImplementation((table: string) => {
    if (table !== "market_listings") {
      throw new Error(`unexpected table ${table}`);
    }
    return { insert: mockInsert };
  });

  return { mockInsert, mockSelect, mockSingle };
};

const mockProfileScreenDataReads = (params: {
  profile: UserProfile | null;
  company?: Company | null;
  listings?: { id: string }[];
  memberships?: { company_id: string | null; role: string | null }[];
}) => {
  const mockProfileMaybeSingle = jest.fn().mockResolvedValue({
    data: params.profile,
    error: null,
  });
  const mockCompanyMaybeSingle = jest.fn().mockResolvedValue({
    data: params.company ?? null,
    error: null,
  });
  const mockListingsRange = jest.fn().mockResolvedValue({
    data: params.listings ?? [],
    error: null,
  });
  const mockMembershipRange = jest.fn().mockResolvedValue({
    data: params.memberships ?? [],
    error: null,
  });

  const buildMaybeSingleQuery = (mockMaybeSingle: jest.Mock) => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        maybeSingle: mockMaybeSingle,
      })),
    })),
  });

  const buildListingsQuery = () => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          order: jest.fn(() => ({
            range: mockListingsRange,
          })),
        })),
      })),
    })),
  });

  const buildMembershipQuery = () => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          range: mockMembershipRange,
        })),
      })),
    })),
  });

  mockFrom.mockImplementation((table: string) => {
    if (table === "user_profiles") {
      return buildMaybeSingleQuery(mockProfileMaybeSingle);
    }
    if (table === "companies") {
      return buildMaybeSingleQuery(mockCompanyMaybeSingle);
    }
    if (table === "market_listings") {
      return buildListingsQuery();
    }
    if (table === "company_members") {
      return buildMembershipQuery();
    }
    throw new Error(`unexpected table ${table}`);
  });

  return {
    mockProfileMaybeSingle,
    mockCompanyMaybeSingle,
    mockListingsRange,
    mockMembershipRange,
  };
};

beforeEach(() => {
  mockRpc.mockReset();
  mockRpc.mockResolvedValue({ data: VALID_MEDIA_LINK_ID, error: null });
});

describe("profile membership transport boundary", () => {
  const serviceSource = fs.readFileSync(
    path.join(__dirname, "profile.services.ts"),
    "utf8",
  );
  const authTransportSource = fs.readFileSync(
    path.join(__dirname, "profile.auth.transport.ts"),
    "utf8",
  );
  const transportSource = fs.readFileSync(
    path.join(__dirname, "profile.membership.transport.ts"),
    "utf8",
  );
  const dataTransportSource = fs.readFileSync(
    path.join(__dirname, "profile.data.transport.ts"),
    "utf8",
  );
  const storageTransportSource = fs.readFileSync(
    path.join(__dirname, "profile.storage.transport.ts"),
    "utf8",
  );

  it("keeps the auth/session calls outside profile.services", () => {
    expect(serviceSource).toContain("./profile.auth.transport");
    expect(serviceSource).not.toContain("supabase.auth.");
    expect(authTransportSource).toContain("supabase.auth.getUser");
    expect(authTransportSource).toContain("supabase.auth.getSession");
    expect(authTransportSource).toContain("supabase.auth.updateUser");
    expect(authTransportSource).toContain("supabase.auth.signOut");
  });

  it("keeps profile rows, listings, and catalog reads behind the data transport", () => {
    expect(serviceSource).toContain("./profile.data.transport");
    expect(serviceSource).not.toContain("supabase.");
    expect(serviceSource).not.toContain('.from("user_profiles")');
    expect(serviceSource).not.toContain('.from("companies")');
    expect(serviceSource).not.toContain('.from("market_listings")');
    expect(serviceSource).not.toContain('.from("catalog_items")');
    expect(dataTransportSource).toContain('from("user_profiles")');
    expect(dataTransportSource).toContain('from("companies")');
    expect(dataTransportSource).toContain('from("market_listings")');
    expect(dataTransportSource).toContain('from("catalog_items")');
    expect(dataTransportSource).toContain("PROFILE_USER_SELECT");
  });

  it("keeps the company membership read outside profile.services", () => {
    expect(serviceSource).toContain("./profile.membership.transport");
    expect(serviceSource).not.toContain('.from("company_members")');
  });

  it("keeps the membership transport bounded and read-only", () => {
    expect(transportSource).toContain("loadPagedRowsWithCeiling");
    expect(transportSource).toContain("maxRows: 5000");
    expect(transportSource).toContain('.select("company_id,role")');
    expect(transportSource).not.toContain(".insert(");
    expect(transportSource).not.toContain(".upsert(");
    expect(transportSource).not.toContain(".update(");
    expect(transportSource).not.toContain(".delete(");
  });

  it("keeps avatar storage provider calls inside the profile storage transport", () => {
    const directStorageToken = "supabase" + ".storage";

    expect(serviceSource).toContain("./profile.storage.transport");
    expect(serviceSource).toContain("uploadProfileAvatarObject");
    expect(serviceSource).toContain("getProfileAvatarPublicUrl");
    expect(serviceSource).not.toContain(directStorageToken);
    expect(storageTransportSource).toContain('PROFILE_AVATAR_BUCKET = "avatars"');
    expect(storageTransportSource).toContain(directStorageToken);
    expect(storageTransportSource).toContain(".upload(filePath, body, options)");
    expect(storageTransportSource).toContain(".getPublicUrl(filePath)");
    expect(storageTransportSource).not.toContain('.from("user_profiles")');
    expect(storageTransportSource).not.toContain(".insert(");
    expect(storageTransportSource).not.toContain(".upsert(");
    expect(storageTransportSource).not.toContain(".update(");
    expect(storageTransportSource).not.toContain(".delete(");
  });

  it("keeps marketplace media backend RPCs inside the media upload transport", () => {
    const mediaBackendServiceSource = fs.readFileSync(
      path.join(__dirname, "..", "..", "lib", "media", "services", "mediaBackendUploadService.ts"),
      "utf8",
    );
    const mediaBackendTransportSource = fs.readFileSync(
      path.join(__dirname, "..", "..", "lib", "media", "services", "mediaBackendUpload.transport.ts"),
      "utf8",
    );

    expect(serviceSource).toContain("confirmSupabaseMediaLink");
    expect(serviceSource).not.toContain("media_backend_confirm_link");
    expect(mediaBackendServiceSource).not.toContain("media_backend_create_upload_session");
    expect(mediaBackendServiceSource).not.toContain("media_backend_complete_upload_session");
    expect(mediaBackendServiceSource).not.toContain("media_backend_confirm_link");
    expect(mediaBackendTransportSource).toContain("media_backend_create_upload_session");
    expect(mediaBackendTransportSource).toContain("media_backend_complete_upload_session");
    expect(mediaBackendTransportSource).toContain("media_backend_confirm_link");
  });
});

describe("profile.services loadCurrentAuthUser", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockGetSession.mockReset();
    mockUpdateUser.mockReset();
    mockFrom.mockReset();
  });

  it("falls back to the persisted session when getUser times out", async () => {
    mockGetUser.mockRejectedValue(
      new RequestTimeoutError({
        requestClass: "lightweight_lookup",
        timeoutMs: 8000,
        owner: "supabase_client",
        operation: "user",
        elapsedMs: 8000,
        urlPath: "/auth/v1/user",
      }),
    );
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-1",
            email: "aybek@example.com",
            user_metadata: {},
            app_metadata: {},
          },
        },
      },
      error: null,
    });

    await expect(loadCurrentAuthUser()).resolves.toMatchObject({
      id: "user-1",
      email: "aybek@example.com",
    });
    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  it("rethrows non-timeout auth errors", async () => {
    mockGetUser.mockRejectedValue(new Error("auth failed"));

    await expect(loadCurrentAuthUser()).rejects.toThrow("auth failed");
    expect(mockGetSession).not.toHaveBeenCalled();
  });
});

describe("profile.services add listing owner phone defaults", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockGetSession.mockReset();
    mockUpdateUser.mockReset();
    mockFrom.mockReset();
    mockGetMyRole.mockReset();
  });

  it("uses the registration auth phone when the canonical profile has no phone yet", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "seller@example.com",
          phone: "+996700777888",
          user_metadata: {},
          app_metadata: {},
        },
      },
      error: null,
    });
    mockGetMyRole.mockResolvedValue("supplier");
    mockProfileScreenDataReads({
      profile: {
        ...baseProfile,
        user_id: "user-1",
        phone: null,
      },
    });

    await expect(loadAddListingOwnerData()).resolves.toMatchObject({
      profile: {
        phone: "+996700777888",
      },
    });
  });

  it("keeps the canonical profile phone above the auth metadata fallback", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "seller@example.com",
          phone: null,
          user_metadata: {
            phone_number: "+996700222333",
          },
          app_metadata: {},
        },
      },
      error: null,
    });
    mockGetMyRole.mockResolvedValue("supplier");
    mockProfileScreenDataReads({
      profile: {
        ...baseProfile,
        user_id: "user-1",
        phone: "+996700111222",
      },
    });

    await expect(loadAddListingOwnerData()).resolves.toMatchObject({
      profile: {
        phone: "+996700111222",
      },
    });
  });
});

describe("profile.services saveProfileDetails ownership", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockGetSession.mockReset();
    mockUpdateUser.mockReset();
    mockFrom.mockReset();
  });

  it("uses user_profiles as the canonical owner for editable profile fields", async () => {
    const savedProfile: UserProfile = {
      ...baseProfile,
      full_name: "New Name",
      phone: "+996700111111",
      city: "Osh",
      bio: "Bio",
      telegram: "@new",
      whatsapp: "+996700222222",
      position: "Manager",
    };
    const { mockUpsert } = mockUserProfilesUpsert({
      data: savedProfile,
      error: null,
    });

    const result = await saveProfileDetails({
      profile: baseProfile,
      profileAvatarUrl: "https://cdn.example/avatar.png",
      profileAvatarDraft: "https://cdn.example/avatar.png",
      modeMarket: true,
      modeBuild: false,
      form: buildProfileForm(),
    });

    expect(mockUpsert).toHaveBeenCalledWith(
      {
        id: "profile-1",
        user_id: "user-1",
        full_name: "New Name",
        phone: "+996700111111",
        city: "Osh",
        usage_market: true,
        usage_build: false,
        bio: "Bio",
        telegram: "@new",
        whatsapp: "+996700222222",
        position: "Manager",
      },
      { onConflict: "user_id" },
    );
    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(result).toEqual({
      profile: savedProfile,
      profileAvatarUrl: "https://cdn.example/avatar.png",
    });
  });

  it("does not mutate auth metadata when the canonical profile write fails", async () => {
    const writeError = new Error("user_profiles write failed");
    mockUserProfilesUpsert({ data: null, error: writeError });

    await expect(
      saveProfileDetails({
        profile: baseProfile,
        profileAvatarUrl: "https://cdn.example/avatar.png",
        profileAvatarDraft: "https://cdn.example/avatar.png",
        modeMarket: true,
        modeBuild: false,
        form: buildProfileForm(),
      }),
    ).rejects.toThrow("user_profiles write failed");

    expect(mockUpdateUser).not.toHaveBeenCalled();
  });
});

describe("profile.services createMarketListing transport boundary", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockGetSession.mockReset();
    mockUpdateUser.mockReset();
    mockFrom.mockReset();
  });

  it("blocks publish when the listing category is missing", async () => {
    const { mockInsert } = mockMarketListingsInsert({ error: null });

    await expect(
      createMarketListing({
        userId: VALID_USER_ID,
        companyId: VALID_COMPANY_ID,
        form: buildListingForm({ listingKind: null, listingRikCode: "" }),
        listingCartItems: [],
        marketplaceMediaAssetIds: [VALID_MEDIA_ID],
        lat: 42,
        lng: 74,
      }),
    ).rejects.toThrow();

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("blocks publish without marketplace media evidence", async () => {
    const { mockInsert } = mockMarketListingsInsert({ error: null });

    await expect(
      createMarketListing({
        userId: VALID_USER_ID,
        companyId: VALID_COMPANY_ID,
        form: buildListingForm({ listingKind: "material" }),
        listingCartItems: [buildListingCartItem({ kind: "material" })],
        marketplaceMediaAssetIds: [],
        lat: 42,
        lng: 74,
      }),
    ).rejects.toThrow();

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("blocks publish when marketplace media is only a local placeholder id", async () => {
    const { mockInsert } = mockMarketListingsInsert({ error: null });

    await expect(
      createMarketListing({
        userId: VALID_USER_ID,
        companyId: VALID_COMPANY_ID,
        form: buildListingForm({ listingKind: "material" }),
        listingCartItems: [buildListingCartItem({ kind: "material" })],
        marketplaceMediaAssetIds: ["media-1"],
        lat: 42,
        lng: 74,
      }),
    ).rejects.toThrow("Фото товара должно быть загружено");

    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("keeps the explicit listing kind on the success path even when cart items still carry older kinds", async () => {
    const { mockInsert } = mockMarketListingsInsert({ error: null });

    await expect(
      createMarketListing({
        userId: VALID_USER_ID,
        companyId: VALID_COMPANY_ID,
        form: buildListingForm({ listingKind: "rent" }),
        listingCartItems: [buildListingCartItem({ kind: "material" })],
        marketplaceMediaAssetIds: [VALID_MEDIA_ID],
        lat: 42,
        lng: 74,
      }),
    ).resolves.toMatchObject({ listingId: VALID_LISTING_ID });

    const payload = mockInsert.mock.calls[0][0];
    expect(payload.kind).toBe("rent");
    expect(payload.items_json).toEqual([
      {
        rik_code: "RIK-1",
        name: "Cement",
        uom: "kg",
        qty: 2,
        price: 600,
        city: "Bishkek",
        kind: "material",
      },
    ]);
    expect(mockRpc).toHaveBeenCalledWith("media_backend_confirm_link", {
      p_media_asset_id: VALID_MEDIA_ID,
      p_org_id: VALID_COMPANY_ID,
      p_project_id: null,
      p_target_type: "marketplace_product",
      p_target_id: VALID_LISTING_ID,
      p_purpose: "product_photo",
      p_actor_user_id: VALID_USER_ID,
    });
  });

  it("confirms marketplace video media as product_video", async () => {
    mockMarketListingsInsert({ error: null });

    await expect(
      createMarketListing({
        userId: VALID_USER_ID,
        companyId: VALID_COMPANY_ID,
        form: buildListingForm({ listingKind: "material" }),
        listingCartItems: [buildListingCartItem({ kind: "material" })],
        marketplaceMediaAssetIds: [VALID_MEDIA_ID],
        marketplaceMediaAssets: [{
          mediaAssetId: VALID_MEDIA_ID,
          mediaKind: "video",
        }],
        lat: 42,
        lng: 74,
      }),
    ).resolves.toMatchObject({ listingId: VALID_LISTING_ID });

    expect(mockRpc).toHaveBeenCalledWith("media_backend_confirm_link", {
      p_media_asset_id: VALID_MEDIA_ID,
      p_org_id: VALID_COMPANY_ID,
      p_project_id: null,
      p_target_type: "marketplace_product",
      p_target_id: VALID_LISTING_ID,
      p_purpose: "product_video",
      p_actor_user_id: VALID_USER_ID,
    });
  });

  it("writes mixed when cart kinds diverge and the explicit kind is missing", async () => {
    const { mockInsert } = mockMarketListingsInsert({ error: null });

    await expect(
      createMarketListing({
        userId: VALID_USER_ID,
        companyId: VALID_COMPANY_ID,
        form: buildListingForm({ listingKind: null, listingRikCode: "" }),
        listingCartItems: [
          buildListingCartItem({ id: "item-1", kind: "material" }),
          buildListingCartItem({
            id: "item-2",
            kind: "service",
            name: "Delivery",
            qty: "1",
            price: "1200",
          }),
        ],
        marketplaceMediaAssetIds: [VALID_MEDIA_ID],
        lat: 42,
        lng: 74,
      }),
    ).resolves.toMatchObject({ listingId: VALID_LISTING_ID });

    const payload = mockInsert.mock.calls[0][0];
    expect(payload.kind).toBe("mixed");
    expect(payload.rik_code).toBeNull();
  });
});

describe("profile.services listing kind contract", () => {
  it("returns ready when the explicit kind is valid", () => {
    expect(resolveMarketListingKindContract("rent", [])).toEqual({
      status: "ready",
      kind: "rent",
    });
  });

  it("returns ready with mixed when cart kinds diverge and the explicit kind is missing", () => {
    expect(
      resolveMarketListingKindContract(null, [
        { kind: "material" },
        { kind: "service" },
      ]),
    ).toEqual({
      status: "ready",
      kind: "mixed",
    });
  });

  it("returns missing for null and empty payloads", () => {
    expect(resolveMarketListingKindContract(null, [])).toEqual({
      status: "missing",
    });
  });

  it("returns missing for undefined and partial payloads without a valid kind", () => {
    expect(
      resolveMarketListingKindContract(undefined, [{}, { kind: null }, undefined]),
    ).toEqual({
      status: "missing",
    });
  });

  it("returns invalid for malformed explicit kinds", () => {
    expect(resolveMarketListingKindContract("broken-kind", [])).toEqual({
      status: "invalid",
      reason: "explicit_kind",
    });
  });

  it("normalizes malformed cart item kinds to null", () => {
    expect(normalizeListingCartItemKind("broken-kind")).toBeNull();
    expect(normalizeListingCartItemKind("material")).toBe("material");
  });
});
