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
  isLocalDeveloperConsumerReviewEnabled,
  isLocalDeveloperReviewEnabled,
  LOCAL_DEVELOPER_REVIEW_ROLES,
  resolveLocalDeveloperBrokerUrl,
  restoreLocalDeveloperOwnerSession,
  switchLocalDeveloperPrincipal,
  switchLocalDeveloperConsumerPrincipal,
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
    expect(isLocalDeveloperReviewEnabled({
      ...valid,
      port: "8101",
      expectedWebPort: "8101",
    })).toBe(true);
    expect(isLocalDeveloperReviewEnabled({
      ...valid,
      port: "8101",
      expectedWebPort: "443",
    })).toBe(false);
  });

  it("accepts only an explicit HTTP loopback broker origin", () => {
    expect(resolveLocalDeveloperBrokerUrl()).toBe("http://127.0.0.1:54329");
    expect(resolveLocalDeveloperBrokerUrl("http://localhost:54330")).toBe("http://localhost:54330");
    expect(() => resolveLocalDeveloperBrokerUrl("https://localhost:54330")).toThrow(
      "LOCAL_DEVELOPER_AUTH_BROKER_URL_FORBIDDEN",
    );
    expect(() => resolveLocalDeveloperBrokerUrl("http://example.com:54330")).toThrow(
      "LOCAL_DEVELOPER_AUTH_BROKER_URL_FORBIDDEN",
    );
  });

  it("allows only the consumer login on a local-developer native runtime", async () => {
    const native = {
      publicFlag: "1",
      platform: "android",
      clientEnvironment: "local_developer",
    };
    expect(isLocalDeveloperReviewEnabled(native)).toBe(false);
    expect(isLocalDeveloperConsumerReviewEnabled(native)).toBe(true);
    expect(isLocalDeveloperConsumerReviewEnabled({ ...native, publicFlag: "0" })).toBe(false);
    expect(isLocalDeveloperConsumerReviewEnabled({ ...native, clientEnvironment: "production" })).toBe(false);

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        role: "consumer",
        access_token: "native-consumer-access-token",
        refresh_token: "native-consumer-refresh-token",
      }),
    });
    await expect(switchLocalDeveloperConsumerPrincipal(native)).resolves.toBeUndefined();
    expect((global.fetch as jest.Mock).mock.calls[0][1].headers).toEqual({
      "Content-Type": "application/json",
      Origin: "http://localhost:8081",
    });
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
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:8081",
        },
        body: JSON.stringify({ role: "director" }),
      }),
    );
    expect(request[1].body).not.toMatch(/password|email|service/i);
  });

  it("restores the dedicated owner without accepting a role from the browser", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        actor: "owner",
        role: "platform_developer",
        access_token: "owner-access-token",
        refresh_token: "owner-refresh-token",
      }),
    });

    await expect(
      restoreLocalDeveloperOwnerSession({
        publicFlag: "1",
        platform: "web",
        hostname: "localhost",
        port: "8081",
        clientEnvironment: "local_developer",
      }),
    ).resolves.toBeUndefined();

    const request = (global.fetch as jest.Mock).mock.calls[0];
    expect(request[0]).toBe("http://127.0.0.1:54329/owner-session");
    expect(request[1].body).toBe("{}");
    expect(request[1].body).not.toMatch(/role|password|email|service/i);
    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: "owner-access-token",
      refresh_token: "owner-refresh-token",
    });
  });

  it("serializes automatic owner restore before an explicit consumer switch", async () => {
    let releaseOwnerResponse!: () => void;
    const ownerResponseReady = new Promise<void>((resolve) => {
      releaseOwnerResponse = resolve;
    });
    (global.fetch as jest.Mock).mockImplementation(async (input: string) => {
      if (input.endsWith("/owner-session")) {
        await ownerResponseReady;
        return {
          ok: true,
          json: async () => ({
            actor: "owner",
            role: "platform_developer",
            access_token: "owner-access-token",
            refresh_token: "owner-refresh-token",
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          role: "consumer",
          access_token: "consumer-access-token",
          refresh_token: "consumer-refresh-token",
        }),
      };
    });
    const runtime = {
      publicFlag: "1",
      platform: "web",
      hostname: "localhost",
      port: "8081",
      clientEnvironment: "local_developer",
    };

    const ownerRestore = restoreLocalDeveloperOwnerSession(runtime);
    const consumerSwitch = switchLocalDeveloperConsumerPrincipal(runtime);
    await Promise.resolve();
    releaseOwnerResponse();
    await expect(Promise.all([ownerRestore, consumerSwitch])).resolves.toEqual([
      undefined,
      undefined,
    ]);

    expect(mockSetSession.mock.calls).toEqual([
      [{ access_token: "owner-access-token", refresh_token: "owner-refresh-token" }],
      [{ access_token: "consumer-access-token", refresh_token: "consumer-refresh-token" }],
    ]);
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
