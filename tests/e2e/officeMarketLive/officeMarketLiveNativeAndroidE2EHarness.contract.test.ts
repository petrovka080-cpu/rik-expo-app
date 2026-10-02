import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const read = (relativePath: string) =>
  fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("office market live native Android E2E harness contract", () => {
  const runnerSource = read("scripts/e2e/runOfficeMarketLiveNativeAndroidE2E.ts");
  const docsSource = read("docs/office-market-live-e2e.md");
  const packageJson = JSON.parse(read("package.json")) as {
    scripts?: Record<string, string>;
  };

  it("exposes a dedicated installed-app API 34 command", () => {
    expect(packageJson.scripts?.["e2e:office-market-live-native-android"]).toBe(
      "tsx scripts/e2e/runOfficeMarketLiveNativeAndroidE2E.ts",
    );
    expect(runnerSource).toContain('PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp"');
    expect(runnerSource).toContain('api.ok && api.output === "34"');
    expect(runnerSource).toContain("buildDevClientUri(8_081)");
    expect(runnerSource).toContain("GREEN_OFFICE_AI_MARKET_NATIVE_ROLE_GUARD_READ_SMOKE_NO_BUILD_NO_APP_DATA_CLEAR");
    expect(docsSource).toContain("npm run e2e:office-market-live-native-android");
  });

  it("requires the explicit staging fixture pack and linked GREEN Web run", () => {
    expect(runnerSource).toContain('clean(process.env.LIVE_E2E) === "1"');
    expect(runnerSource).toContain("STOP_PRODUCTION_DB_MUTATION_NOT_ALLOWED");
    expect(runnerSource).toContain("STOP_EXPLICIT_GREEN_WEB_SUMMARY_REQUIRED");
    expect(runnerSource).toContain("GREEN_OFFICE_AI_MARKET_LIVE_WEB_E2E_HARNESS_NO_BUILDS");
    expect(runnerSource).toContain("same_company_for_required_roles");
    for (const role of ["FOREMAN", "DIRECTOR", "BUYER", "WAREHOUSE", "CONTRACTOR", "ACCOUNTANT"]) {
      expect(runnerSource).toContain(`key: "${role}"`);
    }
  });

  it("uses native UI sessions, role guards, and linked Market readback", () => {
    expect(runnerSource).toContain('"auth.login.email"');
    expect(runnerSource).toContain('"auth.login.password"');
    expect(runnerSource).toContain('"auth.login.submit"');
    expect(runnerSource).toContain('"warehouse-fio-confirm"');
    expect(runnerSource).toContain('"profile.logout.button"');
    expect(runnerSource).toContain("tapVisibleIdWithBoundedSweep");
    expect(runnerSource).toContain('"office-role-guard-blocked"');
    expect(runnerSource).toContain("DO_NOT_GREEN_ROUTE_ONLY");
    expect(runnerSource).toContain("buyer-group-open-");
    expect(runnerSource).toContain('stableIds: ["warehouse-tab-incoming"]');
    expect(runnerSource).toContain("warehouse-incoming-row-");
    expect(runnerSource).toContain("market_feed_card_");
    expect(runnerSource).toContain("market_product_card");
    expect(runnerSource).toContain("market-my-listings-card_");
    expect(runnerSource).toContain("OFFICE_E2E_NATIVE_RESUME_SUMMARY");
  });

  it("does not clear, rebuild, install, switch roles, or invoke Chrome", () => {
    expect(runnerSource).toContain("clearAppState: false");
    expect(runnerSource).toContain("app_data_cleared: false");
    expect(runnerSource).toContain("apk_built: false");
    expect(runnerSource).toContain("apk_installed: false");
    expect(runnerSource).toContain("chrome_used: false");
    expect(runnerSource).not.toContain("pm clear");
    expect(runnerSource).not.toContain("adb install");
    expect(runnerSource).not.toContain("developer_set_effective_role_v1");
    expect(runnerSource).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(runnerSource).not.toContain("auth.signUp");
  });
});
