import fs from "node:fs";
import path from "node:path";
import {
  PROFESSIONAL_NORM_PACK_GROUPS,
  PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS,
} from "../../src/lib/ai/estimateTemplate10000";

describe("wave2a structural norm pack registry binding", () => {
  it("keeps reviewed structural routes fail-closed while retaining the exact screed binding", () => {
    const reviewedStructuralPacks = ["masonry", "concrete", "reinforcement", "formwork"].map((group) =>
      JSON.parse(fs.readFileSync(
        path.resolve(process.cwd(), `data/estimate-norms/professional/${group}.json`),
        "utf8",
      )) as {
        review_status: string;
        norm_items: Array<{ norm_id: string; applicability: Record<string, unknown> }>;
      }
    );
    const registeredNormIds = new Set(PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS.map((item) => item.normId));
    const rejectedLegacyIds = [
      "masonry_aac_block_600_200_200_piece_m2_wall_v1",
      "masonry_brick_250_120_65_piece_m2_half_brick_v1",
      "masonry_thin_bed_block_adhesive_kg_m2_200mm_v1",
      "masonry_cement_lime_mortar_m3_m2_brick_v1",
      "masonry_reinforcement_mesh_m2_m2_wall_v1",
      "concrete_ready_mix_m3_m3_placed_v1",
      "reinforcement_rebar_kg_m3_concrete_element_v1",
      "formwork_contact_area_m2_m3_concrete_element_v1",
    ];

    expect(reviewedStructuralPacks.every((pack) => pack.review_status === "reviewed")).toBe(true);
    expect(reviewedStructuralPacks.flatMap((pack) => pack.norm_items).every((item) =>
      Object.entries(item.applicability).some(([key, value]) =>
        key.startsWith("automatic_production_binding_for_generic_") && value === true
      )
    )).toBe(true);
    expect(PROFESSIONAL_NORM_PACK_GROUPS).toContain("screed");
    expect(PROFESSIONAL_NORM_PACK_GROUPS).not.toEqual(expect.arrayContaining([
      "masonry",
      "concrete",
      "reinforcement",
      "formwork",
    ]));
    expect(registeredNormIds.has("screed_cement_sand_mix_kg_m2_50mm_v1")).toBe(true);
    expect(rejectedLegacyIds.filter((normId) => registeredNormIds.has(normId))).toEqual([]);
    expect(reviewedStructuralPacks.flatMap((pack) => pack.norm_items)
      .filter((item) => registeredNormIds.has(item.norm_id))).toEqual([]);
  });
});
