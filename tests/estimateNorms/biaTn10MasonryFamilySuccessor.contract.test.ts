import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("BIA TN 10 masonry family successor", () => {
  const source = readFileSync(
    resolve("scripts/estimate/r4a13/prepareBiaTn10MasonrySuccessor.ts"),
    "utf8",
  );

  test("admits only neutral contextual variants through the existing publisher", () => {
    expect(source).toContain('catalogId: "canonical-work:base:masonry_interior_brick_wall_lay_large_area"');
    expect(source).toContain('catalogId: "canonical-work:base:masonry_interior_brick_wall_lay_small_area"');
    expect(source).toContain('catalogId: "canonical-work:base:masonry_interior_brick_wall_lay_technical_room"');
    expect(source).not.toContain('catalogId: "canonical-work:base:masonry_interior_brick_wall_lay_high_load"');
    expect(source).not.toContain('catalogId: "canonical-work:base:masonry_interior_brick_wall_lay_wet_zone"');
  });

  test("publishes forward-only and keeps project inputs out of normative source attribution", () => {
    expect(source).toContain("DRAFT_FORWARD_ONLY");
    expect(source).toContain("activationAllowed: false");
    expect(source).toContain("productionEligible: false");
    expect(source).toContain("NORMATIVE_PARAMETER_IDS.has(parameter.parameter_id)");
    expect(source).toContain("semantic_parameter_key: `${TARGET.catalogId}:${parameter.parameter_id}`");
  });
});
