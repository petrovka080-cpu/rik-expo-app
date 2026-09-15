import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("BIA TN 10 masonry family successor", () => {
  const source = readFileSync(
    resolve("scripts/estimate/r4a13/prepareBiaTn10MasonrySuccessor.ts"),
    "utf8",
  );
  const consumerSource = readFileSync(
    resolve("src/features/consumerRepair/consumerCanonicalBaselineCompile.ts"),
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
    expect(source).toContain("src_professional_norm_pack_masonry_brick_250_120_65_piece_m2_half_brick_v1");
    expect(source).toContain("src_professional_norm_pack_masonry_cement_lime_mortar_m3_m2_brick_v1");
  });

  test("routes neutral contexts through the shared consumer allowlist", () => {
    expect(source).toContain("MASONRY_BRICK_WALL_BIA_TN10_NEUTRAL_CATALOG_IDS");
    expect(consumerSource).toContain("MASONRY_BRICK_WALL_BIA_TN10_NEUTRAL_CATALOG_IDS");
    expect(consumerSource).not.toContain(
      'input.catalog.catalogId !== "canonical-work:base:masonry_interior_brick_wall_lay_standard"',
    );
  });

  test("keeps the shared masonry group label neutral across contextual variants", () => {
    expect(source).toContain('MASONRY_BRICK_WALL_GROUP_NAME_RU = "кладка кирпичных стен"');
    expect(source).toContain("group_name_ru=$3,breadcrumb=array[$3]::text[]");
    expect(source).toContain("searchTarget.group_name_ru === MASONRY_BRICK_WALL_GROUP_NAME_RU");
  });
});
