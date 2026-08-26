const mockSignOutSafely = jest.fn();
const mockSetSession = jest.fn();

jest.mock("./supabaseClient", () => ({
  signOutSafely: (...args: unknown[]) => mockSignOutSafely(...args),
  supabaseClientAvailability: {
    status: "ready",
    environment: "local_developer",
    projectRef: "127",
    client: { auth: { setSession: (...args: unknown[]) => mockSetSession(...args) } },
  },
}));

import {
  isLocalDeveloperReviewEnabled,
  LOCAL_DEVELOPER_REVIEW_ROLES,
  switchLocalDeveloperPrincipal,
} from "./localDeveloperReview";

describe("localDeveloperReview", () => {
  it("exposes every canonical office role including security", () => {
    expect(LOCAL_DEVELOPER_REVIEW_ROLES).toEqual([
      "foreman",
      "director",
      "buyer",
      "accountant",
      "warehouse",
      "contractor",
      "security",
      "estimator",
      "engineer",
    ]);
  });

  beforeEach(() => {
    mockSignOutSafely.mockReset().mockResolvedValue({
      status: "signed_out",
      providerCalled: true,
    });
    mockSetSession.mockReset().mockResolvedValue({ data: {}, error: null });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        role: "director",
        access_token: "provider-access-token",
        refresh_token: "provider-refresh-token",
      }),
    }) as jest.Mock;
  });

  it("is compile-time flagged, Web-only, origin-sealed and environment-sealed", () => {
    const valid = {
      publicFlag: "1",
      platform: "web",
      hostname: "localhost",
      port: "8081",
      clientEnvironment: "local_developer",
    };
    expect(isLocalDeveloperReviewEnabled(valid)).toBe(true);
    expect(isLocalDeveloperReviewEnabled({ ...valid, publicFlag: "0" })).toBe(false);
    expect(isLocalDeveloperReviewEnabled({ ...valid, platform: "native" })).toBe(false);
    expect(isLocalDeveloperReviewEnabled({ ...valid, hostname: "app.example.com" })).toBe(false);
    expect(isLocalDeveloperReviewEnabled({ ...valid, port: "8190" })).toBe(false);
    expect(isLocalDeveloperReviewEnabled({ ...valid, clientEnvironment: "production" })).toBe(false);
  });

  it("switches through one provider session without shipping role credentials", async () => {
    await expect(
      switchLocalDeveloperPrincipal("director", {
        publicFlag: "1",
        platform: "web",
        hostname: "127.0.0.1",
        port: "8081",
        clientEnvironment: "local_developer",
      }),
    ).resolves.toBeUndefined();

    expect(mockSignOutSafely).toHaveBeenCalledTimes(1);
    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: "provider-access-token",
      refresh_token: "provider-refresh-token",
    });
    const request = (global.fetch as jest.Mock).mock.calls[0];
    expect(request[0]).toBe("http://127.0.0.1:54329/session");
    expect(request[1]).toEqual(
      expect.objectContaining({
        method: "POST",
        credentials: "omit",
        body: JSON.stringify({ role: "director" }),
      }),
    );
    expect(request[1].body).not.toMatch(/password|email|service/i);
  });

  it("does not contact the broker when canonical sign-out fails", async () => {
    mockSignOutSafely.mockResolvedValue({
      status: "failed",
      providerCalled: true,
      message: "provider down",
    });
    await expect(
      switchLocalDeveloperPrincipal("director", {
        publicFlag: "1",
        platform: "web",
        hostname: "localhost",
        port: "8081",
        clientEnvironment: "local_developer",
      }),
    ).rejects.toThrow("LOCAL_DEVELOPER_CURRENT_SESSION_SIGN_OUT_FAILED");
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockSetSession).not.toHaveBeenCalled();
  });
});
