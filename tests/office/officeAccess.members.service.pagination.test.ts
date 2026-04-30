const mockFrom = jest.fn();

jest.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { loadOfficeMembersPage } from "../../src/screens/office/officeAccess.services";

const company = {
  id: "company-1",
  owner_user_id: "user-1",
  name: "ACME Build",
  city: "Bishkek",
  address: "Office",
  industry: "Construction",
  phone_main: null,
  phone_whatsapp: null,
  email: null,
  site: null,
  inn: null,
  about_short: null,
  about_full: null,
};

function buildMembersBuilder(result: {
  data: unknown[];
  count: number | null;
  error: Error | null;
}) {
  type MembersBuilder = {
    select: jest.Mock<MembersBuilder, [string, { count: "exact" }]>;
    eq: jest.Mock<MembersBuilder, [string, string]>;
    order: jest.Mock<MembersBuilder, [string, { ascending: boolean }]>;
    range: jest.Mock<Promise<typeof result>, [number, number]>;
  };

  const builder = {} as MembersBuilder;
  builder.select = jest.fn((_columns: string, _options: { count: "exact" }) => builder);
  builder.eq = jest.fn((_column: string, _value: string) => builder);
  builder.order = jest.fn((_column: string, _options: { ascending: boolean }) => builder);
  builder.range = jest.fn((_from: number, _to: number) => Promise.resolve(result));

  return builder;
}

function buildProfilesBuilder(result: {
  data: unknown[];
  error: Error | null;
}) {
  type ProfilesBuilder = {
    select: jest.Mock<ProfilesBuilder, [string]>;
    in: jest.Mock<ProfilesBuilder, [string, readonly string[]]>;
    order: jest.Mock<ProfilesBuilder, [string, { ascending: boolean }]>;
    range: jest.Mock<Promise<typeof result>, [number, number]>;
  };

  const builder = {} as ProfilesBuilder;
  builder.select = jest.fn((_columns: string) => builder);
  builder.in = jest.fn((_column: string, _values: readonly string[]) => builder);
  builder.order = jest.fn((_column: string, _options: { ascending: boolean }) => builder);
  builder.range = jest.fn((_from: number, _to: number) => Promise.resolve(result));

  return builder;
}

describe("officeAccess.services members pagination", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("loads one bounded page with count-aware metadata and stable ordering", async () => {
    const membersBuilder = buildMembersBuilder({
      data: [
        {
          user_id: "user-3",
          role: "foreman",
          created_at: "2026-04-03T00:00:00.000Z",
        },
        {
          user_id: "user-4",
          role: "buyer",
          created_at: "2026-04-04T00:00:00.000Z",
        },
      ],
      count: 5,
      error: null,
    });
    const profilesBuilder = buildProfilesBuilder({
      data: [
        {
          user_id: "user-3",
          full_name: "Nur",
          phone: "+996555000333",
        },
        {
          user_id: "user-4",
          full_name: "Aida",
          phone: "+996555000444",
        },
      ],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "company_members") return membersBuilder;
      if (table === "user_profiles") return profilesBuilder;
      throw new Error(`Unexpected table ${table}`);
    });

    const result = await loadOfficeMembersPage({
      company,
      limit: 2,
      offset: 2,
    });

    expect(membersBuilder.select).toHaveBeenCalledWith(
      "user_id,role,created_at",
      { count: "exact" },
    );
    expect(membersBuilder.eq).toHaveBeenCalledWith("company_id", company.id);
    expect(membersBuilder.order).toHaveBeenNthCalledWith(1, "created_at", {
      ascending: true,
    });
    expect(membersBuilder.order).toHaveBeenNthCalledWith(2, "user_id", {
      ascending: true,
    });
    expect(membersBuilder.range).toHaveBeenCalledWith(2, 3);
    expect(profilesBuilder.in).toHaveBeenCalledWith("user_id", [
      "user-3",
      "user-4",
    ]);
    expect(profilesBuilder.order).toHaveBeenCalledWith("user_id", {
      ascending: true,
    });
    expect(profilesBuilder.range).toHaveBeenCalledWith(0, 1);
    expect(result.members.map((member) => member.userId)).toEqual([
      "user-3",
      "user-4",
    ]);
    expect(result.membersPagination).toEqual({
      limit: 2,
      nextOffset: 4,
      total: 5,
      hasMore: true,
    });
  });

  it("returns a no-more-data contract for empty out-of-range pages", async () => {
    const membersBuilder = buildMembersBuilder({
      data: [],
      count: 3,
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "company_members") return membersBuilder;
      throw new Error(`Unexpected table ${table}`);
    });

    const result = await loadOfficeMembersPage({
      company,
      limit: 2,
      offset: 4,
    });

    expect(result.members).toEqual([]);
    expect(result.membersPagination).toEqual({
      limit: 2,
      nextOffset: 3,
      total: 3,
      hasMore: false,
    });
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});
