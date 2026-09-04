import {
  buildAndroidDeepLinkLaunchArgs,
  buildAndroidRouteDeepLink,
  escapeAndroidRemoteShellUri,
} from "../../scripts/e2e/androidDeepLinkLaunchContract";

describe("Android deep-link launch contract", () => {
  it("preserves Russian text and shell-sensitive prompt characters separately from autoPrepare", () => {
    const prompt = "Смета: кабель A&B=x, площадь 12 м²";
    const uri = buildAndroidRouteDeepLink({
      route: "/request",
      prompt,
      launchId: "android:official:request-0001",
      automaticParam: "autoPrepare",
    });
    const parsed = new URL(uri);

    expect(parsed.pathname).toBe("/request");
    expect(parsed.searchParams.get("prompt")).toBe(prompt);
    expect(parsed.searchParams.get("launchId")).toBe(
      "android:official:request-0001",
    );
    expect(parsed.searchParams.get("autoPrepare")).toBe("1");
    expect(uri).toContain("&autoPrepare=1");

    const escaped = escapeAndroidRemoteShellUri(uri);
    expect(escaped).toContain("\\&autoPrepare=1");
    expect(escaped).not.toContain("\\=");

    const args = buildAndroidDeepLinkLaunchArgs("emulator-5554", uri, "com.example.app");
    expect(args.at(-2)).toBe(escaped);
    expect(args.at(-1)).toBe("com.example.app");
  });

  it("supports explicit catalog identity without enabling an automatic action", () => {
    const uri = buildAndroidRouteDeepLink({
      route: "/request",
      prompt: "Кровля 200 м²",
      launchId: "android:r4-a6:manual-selection",
      catalogWorkId: "canonical-work:expanded:battens_counterbattens",
    });
    const parsed = new URL(uri);

    expect(parsed.searchParams.get("catalogWorkId")).toBe(
      "canonical-work:expanded:battens_counterbattens",
    );
    expect(parsed.searchParams.has("autoPrepare")).toBe(false);
    expect(parsed.searchParams.has("autoSend")).toBe(false);
  });
});
