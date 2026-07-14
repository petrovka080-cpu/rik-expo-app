import { readFileSync } from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function source(relativePath: string): string {
  return readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

describe("controlled pilot no release and no production DB boundary", () => {
  it("keeps the operational rehearsal out of release, marketplace, RFQ, warehouse and payment surfaces", () => {
    const audit = source("scripts/estimate/auditControlledPilotDryRunOperationalRehearsal.ts");
    const web = source("scripts/e2e/runControlledPilotDryRunWebSmoke.ts");
    const android = source("scripts/e2e/runControlledPilotDryRunAndroidSmoke.ts");

    expect(audit).toContain("production_release_started: false");
    expect(audit).toContain("owner_approved: false");
    expect(audit).toContain("public_beta_started: false");
    expect(audit).toContain("production_db_touched: false");
    expect(audit).toContain("native_build_started: false");
    expect(audit).toContain("eas_started: false");
    expect(audit).toContain("marketplace_touched");
    expect(audit).toContain("rfq_touched");
    expect(audit).toContain("warehouse_touched");
    expect(audit).toContain("payment_touched");
    expect(web).toContain("actual_web_browser_controlled_pilot_dry_run_passed");
    expect(web).toContain("web_dry_run_cases_passed");
    expect(android).toContain("actual_android_emulator_controlled_pilot_dry_run_passed");
    expect(android).toContain("android_dry_run_cases_passed");
    for (const file of [audit, web, android]) {
      expect(file).not.toMatch(/owner_approved\s*:\s*true/i);
      expect(file).not.toMatch(/production_release_started\s*:\s*true/i);
      expect(file).not.toMatch(/public_beta_started\s*:\s*true/i);
    }
  });
});
