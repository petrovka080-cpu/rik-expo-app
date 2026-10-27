import type { OfficeAccessScreenData } from "./officeAccess.types";
import {
  clearOfficeHubBootstrapSnapshot,
  getFreshOfficeHubBootstrapSnapshot,
  primeOfficeHubBootstrapSnapshot,
} from "./officeHubBootstrapSnapshot";

const makeData = (currentUserId: string) =>
  ({
    currentUserId,
    profile: {
      id: `profile-${currentUserId}`,
      user_id: currentUserId,
      full_name: `User ${currentUserId}`,
      phone: null,
      city: null,
      usage_market: true,
      usage_build: true,
    },
    profileEmail: `${currentUserId}@example.test`,
    profileRole: "director",
    company: null,
    companyAccessRole: null,
    accessSourceSnapshot: {
      userId: currentUserId,
      authRole: "director",
      resolvedRole: "director",
      usageMarket: true,
      usageBuild: true,
      ownedCompanyId: null,
      companyMemberships: [],
      listingsCount: 0,
    },
    members: [],
    membersPagination: {
      limit: 25,
      nextOffset: 0,
      total: 0,
      hasMore: false,
    },
    invites: [],
  }) as OfficeAccessScreenData;

describe("officeHubBootstrapSnapshot", () => {
  beforeEach(() => {
    clearOfficeHubBootstrapSnapshot();
  });

  it("clears the fresh bootstrap snapshot on session boundary", () => {
    primeOfficeHubBootstrapSnapshot(makeData("user-1"), 1_000);

    expect(getFreshOfficeHubBootstrapSnapshot(2_000)?.data.currentUserId).toBe("user-1");

    clearOfficeHubBootstrapSnapshot();

    expect(getFreshOfficeHubBootstrapSnapshot(2_000)).toBeNull();
  });
});
