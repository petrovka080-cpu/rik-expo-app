import { buildWorldEngineEstimate, WORLD_PROMPTS } from "../worldConstruction/worldConstructionTestHelpers";

describe("local estimate source policy", () => {
  it("keeps source evidence on every priced row and exposes tax/location warning", () => {
    const estimate = buildWorldEngineEstimate(WORLD_PROMPTS.roofWaterproofing);
    const rows = estimate.sections.flatMap((section) => section.rows);

    expect(rows.every((row) => row.sourceEvidence.length > 0)).toBe(true);
    expect((estimate.tax.warning ?? "").length).toBeGreaterThan(0);
  });
});
