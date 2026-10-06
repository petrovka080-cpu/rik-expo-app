// RN's Windows Android dev downloader can fail on large chunked multipart
// responses. Its existing plain-JS fallback downloads the same Metro bundle.
function withLocalAndroidBundleTransport(config, runtime = process) {
  const localReview = runtime.env.LOCAL_DEVELOPER_REVIEW === "1"
    || runtime.env.EXPO_PUBLIC_RELEASE_LABEL === "STAGING_WHOLE_APP_WITH_LOCAL_ESTIMATE";
  if (runtime.platform !== "win32" || !localReview) return config;

  const inherited = config.server.enhanceMiddleware;
  config.server.enhanceMiddleware = (middleware, server) => {
    const downstream = inherited ? inherited.call(config.server, middleware, server) : middleware;
    return (request, response, next) => {
      let androidBundle = false;
      try {
        const url = new URL(request.url, "http://localhost");
        androidBundle = request.method === "GET" && request.url.startsWith("/")
          && url.pathname.endsWith(".bundle")
          && url.searchParams.getAll("platform").length === 1
          && url.searchParams.get("platform") === "android";
      } catch {
        // Let Metro report invalid request URLs through its normal handler.
      }
      const accept = request.headers.accept;
      const wantsMultipart = typeof accept === "string" && accept.split(",")
        .some((part) => part.split(";")[0].trim().toLowerCase() === "multipart/mixed");
      if (androidBundle && wantsMultipart) request.headers.accept = "application/javascript";
      return downstream(request, response, next);
    };
  };
  return config;
}

module.exports = { withLocalAndroidBundleTransport };
