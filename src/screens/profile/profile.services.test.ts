import { RequestTimeoutError } from "../../lib/requestTimeoutPolicy";
import { loadCurrentAuthUser, saveProfileDetails } from "./profile.services";
import type { UserProfile } from "./profile.types";

const mockGetUser = jest.fn();
const mockGetSession = jest.fn();
const mockUpdateUser = jest.fn();
const mockFrom = jest.fn();

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
  },
}));

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
