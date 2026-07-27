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
      automaticParam: "autoPrepare",
    });
    const parsed = new URL(uri);

    expect(parsed.pathname).toBe("/request");
    expect(parsed.searchParams.get("prompt")).toBe(prompt);
    expect(parsed.searchParams.get("autoPrepare")).toBe("1");
    expect(uri).toContain("&autoPrepare=1");

    const escaped = escapeAndroidRemoteShellUri(uri);
    expect(escaped).toContain("\\&autoPrepare=1");
    expect(escaped).not.toContain("\\=");

    const args = buildAndroidDeepLinkLaunchArgs("emulator-5554", uri, "com.example.app");
    expect(args.at(-2)).toBe(escaped);
    expect(args.at(-1)).toBe("com.example.app");
  });
});
