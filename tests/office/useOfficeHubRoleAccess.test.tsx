import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import type { OfficePostReturnProbe } from "../../src/lib/navigation/officeReentryBreadcrumbs";
import type { OfficeAccessScreenData } from "../../src/screens/office/officeAccess.types";
import {
  useOfficeHubRoleAccess,
  type OfficeHubRoleAccessState,
} from "../../src/screens/office/useOfficeHubRoleAccess";

let latestAccess: OfficeHubRoleAccessState | null = null;

function RoleAccessProbe({
  data,
  probe = ["all"],
}: {
  data: OfficeAccessScreenData;
  probe?: readonly OfficePostReturnProbe[];
}) {
  latestAccess = useOfficeHubRoleAccess(data, probe);
  return null;
}

const directorData: OfficeAccessScreenData = {
  currentUserId: "user-1",
  profile: {
    id: "profile-1",
    user_id: "user-1",
    full_name: "Director",
    phone: "+996700000000",
    city: "Bishkek",
    usage_market: true,
    usage_build: true,
  },
  profileEmail: "director@example.com",
  profileRole: "director",
  company: {
    id: "company-1",
    owner_user_id: "user-1",
    name: "ACME",
    city: "Bishkek",
    address: "Office",
    industry: "Build",
    phone_main: "+996700000000",
    phone_whatsapp: null,
    email: "office@example.com",
    site: null,
    inn: "123",
    about_short: null,
    about_full: null,
  },
  companyAccessRole: "director",
  developerOverride: null,
  accessSourceSnapshot: {
    userId: "user-1",
    authRole: "director",
    resolvedRole: "director",
    usageMarket: true,
    usageBuild: true,
    ownedCompanyId: "company-1",
    companyMemberships: [{ companyId: "company-1", role: "director" }],
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
};

const foremanData: OfficeAccessScreenData = {
  ...directorData,
  currentUserId: "user-2",
  profileRole: "foreman",
  companyAccessRole: "foreman",
  accessSourceSnapshot: {
    ...directorData.accessSourceSnapshot,
    userId: "user-2",
    authRole: "foreman",
    resolvedRole: "foreman",
    ownedCompanyId: null,
    companyMemberships: [{ companyId: "company-1", role: "foreman" }],
  },
};

const bootstrapData: OfficeAccessScreenData = {
  ...directorData,
  company: null,
  companyAccessRole: null,
  profileRole: null,
  accessSourceSnapshot: {
    userId: "user-3",
    authRole: null,
    resolvedRole: null,
    usageMarket: true,
    usageBuild: false,
    ownedCompanyId: null,
    companyMemberships: [],
    listingsCount: 0,
  },
};

function renderAccess(data: OfficeAccessScreenData) {
  act(() => {
    TestRenderer.create(<RoleAccessProbe data={data} />);
  });
  if (!latestAccess) {
    throw new Error("Office role access probe did not render");
  }
  return latestAccess;
}

describe("useOfficeHubRoleAccess", () => {
  beforeEach(() => {
    latestAccess = null;
  });

  it("keeps director-owned access to every office direction", () => {
    const access = renderAccess(directorData);

    expect(access.canManageCompany).toBe(true);
    expect(access.accessStatus.tone).toBe("success");
    expect(access.officeCards.map((card) => card.key)).toEqual([
      "director",
      "foreman",
      "buyer",
      "accountant",
      "warehouse",
      "contractor",
      "security",
      "engineer",
      "reports",
    ]);
    expect(access.shouldRenderCompanyPostReturnSection("summary")).toBe(true);
    expect(access.shouldRenderCompanyPostReturnSection("directions")).toBe(
      true,
    );
  });

  it("keeps non-owner office roles scoped to their own direction", () => {
    const access = renderAccess(foremanData);

    expect(access.canManageCompany).toBe(false);
    expect(access.accessStatus.tone).toBe("success");
    expect(access.officeCards.map((card) => card.key)).toEqual(["foreman"]);
  });

  it("keeps bootstrap users out of company-only sections", () => {
    const access = renderAccess(bootstrapData);

    expect(access.canManageCompany).toBe(false);
    expect(access.accessStatus.tone).toBe("neutral");
    expect(access.officeCards).toEqual([]);
    expect(access.shouldRenderCompanyPostReturnSection("summary")).toBe(false);
  });
});
