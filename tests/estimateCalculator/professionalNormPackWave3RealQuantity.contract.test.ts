import fs from "node:fs";
import path from "node:path";

import {
  compileProductionExpandedEstimate10000,
  PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS,
} from "../../src/lib/ai/estimateTemplate10000";

const RETIRED_STATIC_SOURCE_IDS = [
  "src_professional_norm_pack_carpentry_sikagard_wood_preserver_l_m2_preventative_v1",
  "src_professional_norm_pack_roofing_sarnafil_at18_field_overlap_m2_m2_v1",
  "src_professional_norm_pack_facade_rockwool_fixrock_conventional_fixings_piece_m2_v1",
  "src_professional_norm_pack_insulation_rockwool_comfortboard80_r63_38mm_m2_m2_v1",
  "src_professional_norm_pack_metalwork_jotun_hardtop_xp_l_m2_100um_v1",
  "src_professional_norm_pack_ceilings_knauf_d112_standard_board_m2_m2_v1",
  "src_professional_norm_pack_ceilings_knauf_d112_standard_ud_runner_linear_m_m2_v1",
  "src_professional_norm_pack_ceilings_knauf_d112_standard_uniflott_kg_m2_v1",
  "src_professional_norm_pack_ceilings_knauf_d112_standard_joint_tape_linear_m_m2_v1",
  "src_professional_norm_pack_ceilings_knauf_d112_standard_tn25_screw_piece_m2_v1",
  "src_professional_norm_pack_ceilings_knauf_d112_standard_substructure_anchor_piece_m2_v1",
  "src_professional_norm_pack_baseboards_gerflor_design_skirting_linear_m_perimeter_v1",
  "src_professional_norm_pack_waterproofing_ceresit_cl51_two_coats_kg_m2_v1",
  "src_professional_norm_pack_screed_cement_sand_mix_kg_m2_50mm_v1",
] as const;

const SOURCE_ONLY_FACTS = [
  ["carpentry_sikagard_wood_preserver_l_m2_preventative_v1", 0.25, "l", 1, "2026.09-sikagard-wood-preserver-primary-review-r2"],
  ["roofing_sarnafil_at18_field_overlap_m2_m2_v1", 1.0416667, "m2", 30, "2026.09-sika-sarnafil-at18-primary-review-r2"],
  ["facade_rockwool_fixrock_conventional_fixings_piece_m2_v1", 5, "piece", 1, "2026.09-rockwool-vhf-fixings-primary-review-r2"],
  ["insulation_rockwool_comfortboard80_r63_38mm_m2_m2_v1", 1, "m2", 4.45, "2026.09-rockwool-comfortboard80-primary-review-r2"],
  ["metalwork_jotun_hardtop_xp_l_m2_100um_v1", 0.15873016, "l", 5, "2026.09-jotun-hardtop-xp-primary-review-r2"],
  ["ceilings_knauf_d112_standard_board_m2_m2_v1", 1, "m2", 1, "2026.09-knauf-d11-d112-primary-review-r2"],
  ["ceilings_knauf_d112_standard_ud_runner_linear_m_m2_v1", 0.4, "linear_m", 3, "2026.09-knauf-d11-d112-primary-review-r2"],
  ["ceilings_knauf_d112_standard_uniflott_kg_m2_v1", 0.3, "kg", 5, "2026.09-knauf-d11-d112-primary-review-r2"],
  ["ceilings_knauf_d112_standard_joint_tape_linear_m_m2_v1", 0.45, "linear_m", 1, "2026.09-knauf-d11-d112-primary-review-r2"],
  ["ceilings_knauf_d112_standard_tn25_screw_piece_m2_v1", 17, "piece", 1, "2026.09-knauf-d11-d112-primary-review-r2"],
  ["ceilings_knauf_d112_standard_substructure_anchor_piece_m2_v1", 1.2, "piece", 1, "2026.09-knauf-d11-d112-primary-review-r2"],
  ["baseboards_gerflor_design_skirting_linear_m_perimeter_v1", 1, "linear_m", 2, "2026.09-gerflor-forbo-source-review-r2"],
  ["waterproofing_ceresit_cl51_two_coats_kg_m2_v1", 1.3, "kg", 5, "2026.09-ceresit-cl51-global-primary-review-r2"],
  ["screed_cement_sand_mix_kg_m2_50mm_v1", 100, "kg", 25, "2026.09-ceresit-cn87-primary-review-r2"],
] as const;

function compile(workKey: string, quantity = 100) {
  return compileProductionExpandedEstimate10000({ workKey, quantity, countryCode: "KG" });
}

function expectSourceOnly(workKey: string, rowCode: string, sourceId: string, quantity = 100) {
  const compiled = compile(workKey, quantity);
  const row = compiled.rows.find((candidate) => candidate.rowCode === rowCode);
  expect(row).toBeDefined();
  expect(row?.normSourceId).not.toBe(sourceId);
  expect(row?.normSourceId).toMatch(/^src_professional_norm_pack_catalog_/u);
  expect(row?.calculationTrace).toContain("normSource=");
  return row!;
}

describe("professional norm-pack source-only applicability", () => {
  it("retains the exact reviewed source facts after removing automatic product selection", () => {
    type PhysicalPack = {
      source_pack_version: string;
      norm_items: {
        norm_id: string;
        unit: string;
        rate: { value: number };
        rounding: { package_size: number };
        parameters: string[];
        applicability: Record<string, unknown>;
        source: { url: string };
      }[];
    };
    const root = path.resolve(process.cwd(), "data/estimate-norms/professional");
    const physical = new Map<string, { packVersion: string; item: PhysicalPack["norm_items"][number] }>();
    for (const name of fs.readdirSync(root).filter((candidate) =>
      candidate.endsWith(".json") && !candidate.includes("remediation-plan"))) {
      const pack = JSON.parse(fs.readFileSync(path.join(root, name), "utf8")) as PhysicalPack;
      for (const item of pack.norm_items) {
        physical.set(item.norm_id, { packVersion: pack.source_pack_version, item });
      }
    }

    for (const [normId, rate, unit, packageSize, packVersion] of SOURCE_ONLY_FACTS) {
      const physicalFact = physical.get(normId);
      expect(physicalFact).toMatchObject({
        packVersion,
        item: {
          norm_id: normId,
          unit,
          rate: { value: rate },
          rounding: { package_size: packageSize },
          source: { url: expect.stringMatching(/^https:\/\//u) },
        },
      });
      expect(physicalFact?.item.parameters.length).toBeGreaterThan(0);
      expect(Object.keys(physicalFact?.item.applicability ?? {})).not.toHaveLength(0);
    }
  });

  it("keeps CN 87 and CL 51 source-only without explicit product and assembly parameters", () => {
    const screedSource = RETIRED_STATIC_SOURCE_IDS[13];
    expectSourceOnly(
      "screed_cement_sand_50mm",
      "screed_cement_sand_50mm_flooring_interior_subfloor_lay_standard_materials_01",
      screedSource,
    );
    expect(compile("apartment_capital_renovation").rows.some((row) =>
      row.normSourceId === screedSource)).toBe(false);

    const waterproofingSource = RETIRED_STATIC_SOURCE_IDS[12];
    expectSourceOnly(
      "waterproofing_interior_bathroom_apply_standard",
      "waterproofing_interior_bathroom_apply_standard_materials_03",
      waterproofingSource,
    );
    expect(compile("apartment_capital_renovation").rows.some((row) =>
      row.normSourceId === waterproofingSource)).toBe(false);
  });

  it("does not infer Knauf D112 from a generic drywall-ceiling work key", () => {
    const workKey = "drywall_ceiling_interior_drywall_ceiling_install_standard";
    for (const quantity of [100, 0.1]) {
      const compiled = compile(workKey, quantity);
      expect(compiled.rows).toHaveLength(59);
      expect(compiled.rows.some((row) =>
        row.normSourceId.startsWith("src_professional_norm_pack_ceilings_knauf_d112_standard_")))
        .toBe(false);
    }
  });

  it("does not infer Sarnafil or Fixrock from generic roof and facade work keys", () => {
    expectSourceOnly(
      "roofing_interior_flat_roof_install_standard",
      "roofing_interior_flat_roof_install_standard_materials_01",
      RETIRED_STATIC_SOURCE_IDS[1],
    );
    expectSourceOnly(
      "facade_interior_vent_facade_install_standard",
      "facade_interior_vent_facade_install_standard_components_07",
      RETIRED_STATIC_SOURCE_IDS[2],
    );
    expect(compile("roofing_interior_metal_roof_install_standard").rows.some((row) =>
      row.normSourceId.includes("sarnafil"))).toBe(false);
  });

  it("does not infer Comfortboard, Jotun or Sikagard from generic material scopes", () => {
    expectSourceOnly(
      "insulation_interior_facade_install_standard",
      "insulation_interior_facade_install_standard_materials_01",
      RETIRED_STATIC_SOURCE_IDS[3],
    );
    expectSourceOnly(
      "carpentry_metal_interior_metal_frame_paint_standard",
      "carpentry_metal_interior_metal_frame_paint_standard_materials_03",
      RETIRED_STATIC_SOURCE_IDS[4],
    );
    expectSourceOnly(
      "carpentry_metal_interior_wood_frame_finish_standard",
      "carpentry_metal_interior_wood_frame_finish_standard_materials_03",
      RETIRED_STATIC_SOURCE_IDS[0],
    );
  });

  it("keeps every product-specific static source out of the 10k registry", () => {
    expect(PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS).toEqual([]);
    const rows = [
      "apartment_capital_renovation",
      "screed_cement_sand_50mm",
      "waterproofing_interior_bathroom_apply_standard",
      "drywall_ceiling_interior_drywall_ceiling_install_standard",
      "roofing_interior_flat_roof_install_standard",
      "facade_interior_vent_facade_install_standard",
      "insulation_interior_facade_install_standard",
      "carpentry_metal_interior_metal_frame_paint_standard",
      "carpentry_metal_interior_wood_frame_finish_standard",
    ].flatMap((workKey) => compile(workKey).rows);
    for (const sourceId of RETIRED_STATIC_SOURCE_IDS) {
      expect(rows.some((row) => row.normSourceId === sourceId)).toBe(false);
    }
  });
});
