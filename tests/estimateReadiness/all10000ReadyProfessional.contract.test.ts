import { readFileSync } from "node:fs";
import path from "node:path";
import type { Estimate10000ReadinessManifest } from "../../scripts/estimate/buildEstimate10000ReadinessManifest";

describe("estimate templates professional readiness after full P0-P3 backfill", () => {
  it("claims full 10000 readiness only with zero generic fallback", () => {
    const manifest = JSON.parse(readFileSync(
      path.join(process.cwd(), "data/estimate-templates/estimate-10000-readiness-manifest.json"),
      "utf8",
    )) as Estimate10000ReadinessManifest;

    expect(manifest.manifest_total_templates).toBe(10000);
    expect(manifest.ready_professional_count).toBe(10000);
    expect(manifest.not_ready_count).toBe(0);
    expect(manifest.generic_fallback_count).toBe(0);
    expect(manifest.no_template_unclassified).toBe(true);
    expect(manifest.full_10000_real_norm_green_claimed).toBe(true);
    expect(manifest.fake_green_claimed).toBe(false);
    expect(manifest.templates.filter((item) => item.readiness_status === "READY_PROFESSIONAL")).toHaveLength(10000);
    expect(manifest.templates.filter((item) => item.readiness_status === "NOT_READY_GENERIC_FALLBACK")).toHaveLength(0);
  });
});
