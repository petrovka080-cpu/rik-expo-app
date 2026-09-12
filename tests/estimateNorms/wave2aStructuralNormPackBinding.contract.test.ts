import fs from "node:fs";
import path from "node:path";
import {
  PROFESSIONAL_NORM_PACK_GROUPS,
  PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS,
} from "../../src/lib/ai/estimateTemplate10000";

describe("wave2a structural norm pack registry binding", () => {
  it("keeps every reviewed structural route source-only until applicability is explicit", () => {
    const reviewedStructuralPacks = ["masonry", "concrete", "reinforcement", "formwork", "screed"].map((group) =>
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
      "screed_cement_sand_mix_kg_m2_50mm_v1",
    ];

    expect(reviewedStructuralPacks.every((pack) => pack.review_status === "reviewed")).toBe(true);
    expect(reviewedStructuralPacks.slice(0, 4).flatMap((pack) => pack.norm_items).every((item) =>
      Object.entries(item.applicability).some(([key, value]) =>
        key.startsWith("automatic_production_binding_for_generic_") && value === true
      )
    )).toBe(true);
    expect(reviewedStructuralPacks[4].norm_items[0]?.applicability).toMatchObject({
      product: "Ceresit CN 87",
      production_scalar_valid_only_at_50_mm: true,
      non_50_mm_requires_dynamic_thickness_formula: true,
    });
    expect(PROFESSIONAL_NORM_PACK_GROUPS).toEqual([]);
    expect(registeredNormIds).toEqual(new Set());
    expect(rejectedLegacyIds.filter((normId) => registeredNormIds.has(normId))).toEqual([]);
    expect(reviewedStructuralPacks.flatMap((pack) => pack.norm_items)
      .filter((item) => registeredNormIds.has(item.norm_id))).toEqual([]);
  });
});
