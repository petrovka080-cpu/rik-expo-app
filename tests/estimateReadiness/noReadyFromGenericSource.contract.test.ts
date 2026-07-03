import { buildEstimate10000ReadinessManifest } from "../../scripts/estimate/buildEstimate10000ReadinessManifest";

jest.setTimeout(90000);

describe("readiness does not come from generic sources", () => {
  it("requires every ready template to have source-backed rows and leaves P3 not ready", () => {
    const manifest = buildEstimate10000ReadinessManifest();
    const ready = manifest.templates.filter((item) => item.readiness_status === "READY_PROFESSIONAL");
    const generic = manifest.templates.filter((item) => item.generic_family_default_row_count > 0);

    expect(ready).toHaveLength(8998);
    expect(ready.every((item) => item.source_backed_row_count === item.row_count)).toBe(true);
    expect(ready.every((item) => item.generic_family_default_row_count === 0)).toBe(true);
    expect(generic).toHaveLength(1002);
    expect(generic.every((item) => item.readiness_status === "NOT_READY_GENERIC_FALLBACK")).toBe(true);
    expect(manifest.full_10000_real_norm_green_claimed).toBe(false);
  });
});
