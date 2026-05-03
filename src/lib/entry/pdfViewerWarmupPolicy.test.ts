import { shouldWarmPdfViewerAfterStartup } from "./pdfViewerWarmupPolicy";

describe("pdfViewerWarmupPolicy", () => {
  it("does not warm the heavy PDF viewer during public auth startup", () => {
    expect(
      shouldWarmPdfViewerAfterStartup({
        platformOs: "android",
        pathname: "/auth/login",
        sessionLoaded: true,
        authSessionStatus: "unauthenticated",
      }),
    ).toBe(false);

    expect(
      shouldWarmPdfViewerAfterStartup({
        platformOs: "android",
        pathname: "/auth/register",
        sessionLoaded: true,
        authSessionStatus: "unauthenticated",
      }),
    ).toBe(false);
  });

  it("waits until a native authenticated app route before warming", () => {
    expect(
      shouldWarmPdfViewerAfterStartup({
        platformOs: "android",
        pathname: "/",
        sessionLoaded: false,
        authSessionStatus: "unknown",
      }),
    ).toBe(false);

    expect(
      shouldWarmPdfViewerAfterStartup({
        platformOs: "web",
        pathname: "/(tabs)/profile",
        sessionLoaded: true,
        authSessionStatus: "authenticated",
      }),
    ).toBe(false);

    expect(
      shouldWarmPdfViewerAfterStartup({
        platformOs: "android",
        pathname: "/(tabs)/profile",
        sessionLoaded: true,
        authSessionStatus: "authenticated",
      }),
    ).toBe(true);
  });

  it("does not warm while already on the viewer route", () => {
    expect(
      shouldWarmPdfViewerAfterStartup({
        platformOs: "android",
        pathname: "/pdf-viewer",
        sessionLoaded: true,
        authSessionStatus: "authenticated",
      }),
    ).toBe(false);
  });
});
