import type { DeveloperOverrideContext } from "../../lib/developerOverride";
import {
  loadDeveloperOverrideContext,
  resolveLocalDeveloperOverrideContext,
} from "../../lib/developerOverride";
import {
  loadCurrentAuthUser,
  loadProfileScreenData,
} from "../profile/profile.services";
import { loadOfficeAccessScreenData } from "./officeAccess.services";

jest.mock("../../lib/supabaseClient", () => ({
  supabase: {},
}));

jest.mock("../../lib/developerOverride", () => ({
  loadDeveloperOverrideContext: jest.fn(),
  resolveLocalDeveloperOverrideContext: jest.fn(),
}));

jest.mock("../profile/profile.services", () => ({
  loadCurrentAuthUser: jest.fn(),
  loadProfileScreenData: jest.fn(),
}));

const localDeveloperOverride: DeveloperOverrideContext = {
  actorUserId: "local-developer",
  isEnabled: true,
  isActive: true,
  allowedRoles: ["director", "buyer"],
  activeEffectiveRole: "director",
  canAccessAllOfficeRoutes: true,
  canImpersonateForMutations: false,
  expiresAt: null,
  reason: "local_dev_full_access",
};

describe("loadOfficeAccessScreenData local developer override", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest
      .mocked(resolveLocalDeveloperOverrideContext)
      .mockReturnValue(localDeveloperOverride);
  });

  it("returns an instant office access model without waiting for auth/profile", async () => {
    const result = await loadOfficeAccessScreenData();

    expect(loadCurrentAuthUser).not.toHaveBeenCalled();
    expect(loadProfileScreenData).not.toHaveBeenCalled();
    expect(loadDeveloperOverrideContext).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      currentUserId: "local-developer",
      profileRole: "director",
      company: null,
      companyAccessRole: null,
      developerOverride: localDeveloperOverride,
      accessSourceSnapshot: {
        userId: "local-developer",
        resolvedRole: "director",
        usageMarket: true,
        usageBuild: true,
        ownedCompanyId: null,
        companyMemberships: [],
        listingsCount: 0,
        marketAccessGranted: true,
        requestedActiveContext: "office",
      },
    });
    expect(result.accessSourceSnapshot.developerOverride).toMatchObject({
      isEnabled: true,
      isActive: true,
      activeEffectiveRole: "director",
      canAccessAllOfficeRoutes: true,
    });
    expect(result.members).toEqual([]);
    expect(result.membersPagination).toMatchObject({
      total: 0,
      hasMore: false,
    });
    expect(result.invites).toEqual([]);
  });
});
