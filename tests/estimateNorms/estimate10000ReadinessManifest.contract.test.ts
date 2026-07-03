import { readFileSync } from "node:fs";
import path from "node:path";
import type { Estimate10000ReadinessManifest } from "../../scripts/estimate/buildEstimate10000ReadinessManifest";

describe("estimate 10000 readiness manifest", () => {
  it("classifies every production template and refuses full 10k green while generic rows remain", () => {
    const manifest = JSON.parse(readFileSync(
      path.join(process.cwd(), "data/estimate-templates/estimate-10000-readiness-manifest.json"),
      "utf8",
    )) as Estimate10000ReadinessManifest;

    expect(manifest.manifest_total_templates).toBe(10000);
    expect(manifest.templates).toHaveLength(10000);
    expect(manifest.manifest_every_template_classified).toBe(true);
    expect(manifest.no_template_unclassified).toBe(true);
    expect(manifest.full_10000_real_norm_green_claimed).toBe(false);
    expect(manifest.fake_green_claimed).toBe(false);
    expect(manifest.generic_fallback_count).toBeGreaterThan(0);
    expect(manifest.not_ready_count).toBeGreaterThan(0);
    expect(manifest.ready_professional_count).toBeLessThan(10000);
  });
});
