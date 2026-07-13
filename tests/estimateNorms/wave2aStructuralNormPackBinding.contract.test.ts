import {
  PROFESSIONAL_NORM_PACK_GROUPS,
  PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS,
} from "../../src/lib/ai/estimateTemplate10000";

describe("wave2a structural norm pack registry binding", () => {
  it("registers masonry, concrete, reinforcement, formwork and screed source-backed packs", () => {
    expect(PROFESSIONAL_NORM_PACK_GROUPS).toEqual(expect.arrayContaining([
      "masonry",
      "concrete",
      "reinforcement",
      "formwork",
      "screed",
    ]));
    expect(PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS.map((item) => item.normId)).toEqual(expect.arrayContaining([
      "masonry_aac_block_600_200_200_piece_m2_wall_v1",
      "concrete_ready_mix_m3_m3_placed_v1",
      "reinforcement_rebar_kg_m3_concrete_element_v1",
      "formwork_contact_area_m2_m3_concrete_element_v1",
      "screed_cement_sand_mix_kg_m2_50mm_v1",
    ]));
  });
});
