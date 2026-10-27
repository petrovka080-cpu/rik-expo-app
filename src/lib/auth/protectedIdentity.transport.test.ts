const mockGetSessionSafe = jest.fn();
const mockGetUser = jest.fn();
const mockRefreshSession = jest.fn();
const mockCallEnsureMyProfileRpc = jest.fn();
const mockCallGetMyRoleRpc = jest.fn();
const mockLoadDeveloperOverrideContext = jest.fn();

jest.mock("../api/profile.transport", () => ({
  callEnsureMyProfileRpc: (...args: unknown[]) => mockCallEnsureMyProfileRpc(...args),
  callGetMyRoleRpc: (...args: unknown[]) => mockCallGetMyRoleRpc(...args),
}));

jest.mock("../developerOverride", () => ({
  loadDeveloperOverrideContext: (...args: unknown[]) => mockLoadDeveloperOverrideContext(...args),
  isServerAuthorizedPlatformDeveloper: jest.fn(() => false),
}));

jest.mock("../supabaseClient", () => ({
  getSessionSafe: (...args: unknown[]) => mockGetSessionSafe(...args),
  supabaseClientAvailability: { status: "available" },
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      refreshSession: (...args: unknown[]) => mockRefreshSession(...args),
    },
    from: jest.fn(() => {
      throw new Error("legacy membership fallback must not be used");
    }),
  },
}));

import { loadProtectedIdentity } from "./protectedIdentity.transport";

const userId = "1e3f1f5d-d3e9-40c8-9e38-3a399be0b34b";
const assignedClaims = {
  tenant_id: "55555555-5555-4555-8555-555555555551",
  membership_id: "3f449262-6c12-5d07-9097-a7b5e4cb8f0a",
  role: "platform_developer",
};

const user = (appMetadata: Record<string, unknown>) => ({
  id: userId,
  email: "reviewer@example.test",
  app_metadata: appMetadata,
  user_metadata: {},
});

describe("protected identity claim refresh", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCallEnsureMyProfileRpc.mockResolvedValue({ data: null, error: null });
    mockCallGetMyRoleRpc.mockResolvedValue({ data: "platform_developer", error: null });
  });

  it("refreshes a stale open session after the provider assigns membership claims", async () => {
    mockGetSessionSafe.mockResolvedValue({
      session: { user: user({ provider: "email" }), expires_at: 4_000_000_000 },
      degraded: false,
    });
    mockGetUser.mockResolvedValue({ data: { user: user(assignedClaims) }, error: null });
    mockRefreshSession.mockResolvedValue({
      data: { session: { user: user(assignedClaims) } },
      error: null,
    });

    await expect(loadProtectedIdentity()).resolves.toMatchObject({
      status: "ready",
      identity: {
        userId,
        organizationId: assignedClaims.tenant_id,
        membershipId: assignedClaims.membership_id,
        role: "platform_developer",
      },
    });
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(mockCallEnsureMyProfileRpc).toHaveBeenCalledTimes(1);
  });

  it("does not refresh when the open session already carries current claims", async () => {
    mockGetSessionSafe.mockResolvedValue({
      session: { user: user(assignedClaims), expires_at: 4_000_000_000 },
      degraded: false,
    });
    mockGetUser.mockResolvedValue({ data: { user: user(assignedClaims) }, error: null });

    await expect(loadProtectedIdentity()).resolves.toMatchObject({ status: "ready" });
    expect(mockRefreshSession).not.toHaveBeenCalled();
  });
});
