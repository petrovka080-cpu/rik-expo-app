import fs from "node:fs";
import path from "node:path";

describe("global local Android API34 smoke", () => {
  const source = fs.readFileSync(
    path.resolve(process.cwd(), "scripts/e2e/runAndroidApi34GlobalLocalEstimateSmoke.ts"),
    "utf8",
  );

  it("uses the canonical API34 device guard and writes real Android evidence artifacts", () => {
    expect(source).toContain("ensureAndroidApi34DeviceReady");
    expect(source).toContain("API34_DEVICE_READY");
    expect(source).toContain("api36_rejected");
    expect(source).toContain("ROUTE_PROOF_APP_ROOT_READY");
    expect(source).toContain("ROUTE_PROOF_REQUEST_ROUTE_READY");
    expect(source).toContain("ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY");
    expect(source).toContain('writeJson("android_screenshots.json"');
    expect(source).toContain('writeJson("android_ui_dumps.json"');
    expect(source).toContain("fileIsReal");
  });

  it("checks local context, tax/source visibility, PDF action, and generic row failures", () => {
    expect(source).toContain("local_context_visible");
    expect(source).toContain("source_confidence_visible");
    expect(source).toContain("tax_or_warning_visible");
    expect(source).toContain("pdf_action_visible");
    expect(source).toContain("generic_known_work_rows_found");
    expect(source).toContain("BLOCKED_ANDROID_API34_GLOBAL_LOCAL_ESTIMATE_SMOKE_FAILED");
  });
});
