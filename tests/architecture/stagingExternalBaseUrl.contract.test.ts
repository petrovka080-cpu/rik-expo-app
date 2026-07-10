import { assertExternalStagingBaseUrl, buildExternalStagingBaseUrlSummary } from "../../scripts/e2e/assertExternalStagingBaseUrl";
import { resolveStagingBaseUrl } from "../../scripts/e2e/resolveStagingBaseUrl";

describe("staging external base url", () => {
  it("detects the external Render staging URL from render.yaml", () => {
    const resolution = resolveStagingBaseUrl();

    expect(resolution.staging_url_detected).toBe(true);
    expect(resolution.staging_url_is_external).toBe(true);
    expect(resolution.staging_url_is_not_localhost).toBe(true);
    expect(resolution.provider).toBe("render");
  });

  it("rejects localhost as staging proof", () => {
    expect(() => assertExternalStagingBaseUrl("http://localhost:8080")).toThrow(
      /STOP_STAGING_EXTERNAL_BASE_URL_FAILED_NO_GREEN/,
    );
  });

  it("records base url contract fields", () => {
    const summary = buildExternalStagingBaseUrlSummary({
      explicit: "https://rik-expo-app-staging.onrender.com",
    });

    expect(summary.all_staging_smokes_support_external_base_url).toBe(true);
    expect(summary.localhost_fallback_disabled_when_staging_url_provided).toBe(true);
    expect(summary.smoke_summary_records_base_url).toBe(true);
    expect(summary.base_url_localhost_rejected_for_staging).toBe(true);
  });
});
