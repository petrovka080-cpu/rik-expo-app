const { withLocalAndroidBundleTransport } = require("./metroAndroidBundleTransport.cjs");
export {};

const localWindows = {
  platform: "win32",
  env: { EXPO_PUBLIC_RELEASE_LABEL: "STAGING_WHOLE_APP_WITH_LOCAL_ESTIMATE" },
};

describe("owned Windows Android Metro bundle transport", () => {
  it("selects RN's plain-JS fallback and preserves the inherited request handler", () => {
    const next = jest.fn();
    const response = {};
    const base = jest.fn();
    const downstream = jest.fn(() => "same-response");
    const inherit = jest.fn(() => downstream);
    const server = {};
    const config = withLocalAndroidBundleTransport({ server: { enhanceMiddleware: inherit } }, localWindows);
    const handler = config.server.enhanceMiddleware(base, server);
    const request = { method: "GET", url: "/index.bundle?platform=android&dev=true", headers: { accept: "multipart/mixed" } };
    expect(handler(request, response, next)).toBe("same-response");
    expect(request.headers.accept).toBe("application/javascript");
    expect(inherit).toHaveBeenCalledWith(base, server);
    expect(downstream).toHaveBeenCalledWith(request, response, next);
  });

  it.each([
    "/index.bundle?platform=web",
    "/index.bundle?platform=ios",
    "/index.bundle.map?platform=android",
    "/?platform=android",
    "/assets/icon.png?platform=android",
    "/index.bundle?platform=android&platform=web",
  ])("preserves multipart negotiation for %s", (url) => {
    const downstream = jest.fn();
    const config = withLocalAndroidBundleTransport({ server: {} }, localWindows);
    const handler = config.server.enhanceMiddleware(downstream, {});
    const request = { method: "GET", url, headers: { accept: "multipart/mixed" } };
    handler(request, {}, jest.fn());
    expect(request.headers.accept).toBe("multipart/mixed");
    expect(downstream).toHaveBeenCalledTimes(1);
  });

  it("keeps a normal JS download and existing Metro failures unchanged", () => {
    const failure = new Error("normal-metro-failure");
    const config = withLocalAndroidBundleTransport({ server: {} }, localWindows);
    const handler = config.server.enhanceMiddleware(() => { throw failure; }, {});
    const request = { method: "GET", url: "/index.bundle?platform=android", headers: { accept: "application/javascript" } };
    expect(() => handler(request, {}, jest.fn())).toThrow(failure);
    expect(request.headers.accept).toBe("application/javascript");
  });

  it.each([
    { platform: "linux", env: localWindows.env },
    { platform: "darwin", env: localWindows.env },
    { platform: "win32", env: {} },
    { platform: "win32", env: { EXPO_PUBLIC_RELEASE_LABEL: "production" } },
  ])("does not alter ordinary or production Metro configurations: %j", (runtime) => {
    const inherit = jest.fn();
    const config = { server: { enhanceMiddleware: inherit } };
    expect(withLocalAndroidBundleTransport(config, runtime)).toBe(config);
    expect(config.server.enhanceMiddleware).toBe(inherit);
  });

  it("also supports the existing isolated local-review profile and Accept parameters", () => {
    const config = withLocalAndroidBundleTransport({ server: {} }, { platform: "win32", env: { LOCAL_DEVELOPER_REVIEW: "1" } });
    const request = { method: "GET", url: "/index.bundle?platform=android", headers: { accept: "application/json, Multipart/Mixed; q=1" } };
    config.server.enhanceMiddleware(jest.fn(), {})(request, {}, jest.fn());
    expect(request.headers.accept).toBe("application/javascript");
  });
});
