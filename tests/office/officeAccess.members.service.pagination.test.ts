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
  const builder = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    order: jest.fn(() => builder),
    range: jest.fn().mockResolvedValue(result),
  };

  return builder;
}

function buildProfilesBuilder(result: {
  data: unknown[];
  error: Error | null;
}) {
  const builder = {
    select: jest.fn(() => builder),
    in: jest.fn().mockResolvedValue(result),
  };

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
