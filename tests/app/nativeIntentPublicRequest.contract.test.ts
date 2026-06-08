import { redirectSystemPath } from "../../app/+native-intent";
import fs from "node:fs";
import path from "node:path";
import { resolvePublicRequestDeepLinkTarget } from "../../src/lib/navigation/coreRoutes";

describe("native intent public request route", () => {
  it("keeps canonical Android request deep links on the public request route", () => {
    const promptQuery = "?prompt=roof";

    expect(
      redirectSystemPath({
        path: `/request${promptQuery}`,
        initial: true,
      }),
    ).toBe(`/(tabs)/request${promptQuery}`);

    expect(
      redirectSystemPath({
        path: `rik:///request${promptQuery}`,
        initial: true,
      }),
    ).toBe(`/(tabs)/request${promptQuery}`);

    expect(
      redirectSystemPath({
        path: `rik://request${promptQuery}`,
        initial: true,
      }),
    ).toBe(`/(tabs)/request${promptQuery}`);

    expect(
      redirectSystemPath({
        path: `rik:///%28tabs%29/request${promptQuery}`,
        initial: true,
      }),
    ).toBe(`/(tabs)/request${promptQuery}`);

    expect(
      redirectSystemPath({
        path: `exp+rik-expo-app://expo-development-client/?url=${encodeURIComponent(
          `http://127.0.0.1:8099/--/request${promptQuery}`,
        )}`,
        initial: true,
      }),
    ).toBe(`/(tabs)/request${promptQuery}`);
  });

  it("does not remap unrelated custom scheme routes to request", () => {
    expect(
      redirectSystemPath({
        path: "rik://market?product=1",
        initial: true,
      }),
    ).toBe("rik://market?product=1");
  });

  it("passes request deep link query params to router-safe params", () => {
    expect(resolvePublicRequestDeepLinkTarget("rik:///request?prompt=roof+120&autoPdf=1")).toMatchObject({
      pathname: "/(tabs)/request",
      href: "/(tabs)/request?prompt=roof+120&autoPdf=1",
      params: {
        prompt: "roof 120",
        autoPdf: "1",
      },
    });
  });

  it("handles runtime native url events in the root layout", () => {
    const rootLayoutSource = fs.readFileSync(
      path.join(process.cwd(), "app/_layout.tsx"),
      "utf8",
    );

    expect(rootLayoutSource).toContain("resolvePublicRequestDeepLinkTarget");
    expect(rootLayoutSource).toContain('Linking.addEventListener("url"');
    expect(rootLayoutSource).toContain("Linking.getInitialURL()");
    expect(rootLayoutSource).toContain("public_request_deep_link_resolved");
  });

  it("lets native startup route public request links before auth bootstrap", () => {
    const indexSource = fs.readFileSync(
      path.join(process.cwd(), "app/index.tsx"),
      "utf8",
    );

    expect(indexSource).toContain("resolveInitialPublicRequestHref");
    expect(indexSource).toContain("resolvePublicRequestDeepLinkTarget");
    expect(indexSource.indexOf("resolveInitialPublicRequestHref()")).toBeLessThan(
      indexSource.indexOf("if (!supabase)"),
    );
    expect(indexSource).toContain("public_request_initial_url");
    expect(indexSource).toContain("public_request_initial_url_read_failed");
    expect(indexSource).toContain("return null");
  });
});
