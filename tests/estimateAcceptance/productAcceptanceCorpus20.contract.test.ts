import fs from "node:fs";
import path from "node:path";

import { CAPITAL_RENOVATION_98_PROMPT } from "../estimateCalculator/capitalRenovationTestHelpers";

const CORPUS_PATH = path.resolve(__dirname, "..", "..", "data/estimate-acceptance/product-acceptance-critical-cases.json");

describe("product acceptance corpus 20", () => {
  it("keeps at least twenty high-risk product-flow cases including capital renovation 98", () => {
    const corpus = JSON.parse(fs.readFileSync(CORPUS_PATH, "utf8")) as {
      mandatory_count: number;
      critical_cases: Array<{ case_id: string; prompt: string; expected_flow: string }>;
    };
    const ids = new Set(corpus.critical_cases.map((item) => item.case_id));

    expect(corpus.mandatory_count).toBeGreaterThanOrEqual(20);
    expect(corpus.critical_cases).toHaveLength(20);
    expect(corpus.critical_cases.some((item) => item.prompt === CAPITAL_RENOVATION_98_PROMPT)).toBe(true);
    expect(ids).toEqual(new Set([
      "capital_renovation_apartment_98",
      "apartment_repair_54",
      "gas_block_masonry_400",
      "screed_100_50mm",
      "diamond_drilling_d110_12",
      "profile_sheet_fence_50m",
      "mansard_roof_200",
      "slab_rebar_100",
      "plaster_300_20mm",
      "tile_45",
      "paint_200_two_coats",
      "gkl_partition_80",
      "electric_points_78",
      "plumbing_two_bathrooms",
      "facade_insulation_150",
      "metal_tile_roof_200",
      "concrete_slab_100_120mm",
      "foundation_formwork_20",
      "earthworks_trench_30",
      "interior_doors_6",
    ]));
  });
});
