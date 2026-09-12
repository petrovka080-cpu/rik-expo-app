import { readFileSync } from "node:fs";
import path from "node:path";

import { STOP_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_FAILED } from "../../scripts/estimate/validateCatalogSourceRegistry";
import type { CatalogSourceRegistry } from "../../scripts/estimate/validateCatalogSourceRegistry";

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(process.cwd(), relativePath), "utf8")) as T;
}

describe("catalog source registry artifact", () => {
  it("registers every reviewed physical source while keeping unresolved P0 cases stopped", () => {
    const registry = readJson<CatalogSourceRegistry>("data/estimate-catalog/source-registry.json");

    expect(registry.final_status).toBe(STOP_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_FAILED);
    expect(registry.physical_norm_pack_source_count).toBe(54);
    expect(registry.row_source_count).toBeGreaterThan(0);
    expect(registry.p0_source_count).toBeGreaterThan(0);
    expect(registry.p0_source_coverage).toHaveLength(14);
    expect(registry.p0_source_coverage.every((item) => item.row_count > 0)).toBe(true);
    expect(registry.p0_source_coverage.filter((item) => item.blocking_reasons.length === 0)
      .map((item) => item.case_id)).toEqual([
      "diamond_concrete_drilling",
      "profile_sheet_fence",
      "mansard_roof",
    ]);
    expect(registry.sources.some((item) => item.is_generated_family_default)).toBe(false);
    expect(registry.sources.filter((item) => item.is_source_backed_professional_norm_pack).every((item) =>
      item.source_url_or_document_ref !== "unknown" &&
      Boolean(item.evidence_kind)
    )).toBe(true);
    const physicalSources = registry.sources.filter((item) =>
      item.evidence_kind === "physical_norm_pack_review" || item.evidence_kind === "registry_norm_pack"
    );
    expect(physicalSources.filter((item) => item.evidence_kind === "physical_norm_pack_review")).toHaveLength(40);
    expect(physicalSources.map((item) => item.source_id)).toEqual(expect.arrayContaining([
      "src_professional_norm_pack_concrete_nrmca_cip31_selected_contingency_m3_m3_v1",
      "src_professional_norm_pack_formwork_rics_nrm2_measured_contact_area_same_unit_routing_v1",
      "src_professional_norm_pack_reinforcement_project_bar_schedule_weight_same_unit_routing_v1",
      "src_professional_norm_pack_masonry_bia_tn10_selected_brick_mortar_table_routing_v1",
    ]));
    expect(registry.sources.some((item) => [
      "src_professional_norm_pack_concrete_ready_mix_m3_m3_placed_v1",
      "src_professional_norm_pack_formwork_contact_area_m2_m3_concrete_element_v1",
      "src_professional_norm_pack_reinforcement_rebar_kg_m3_concrete_element_v1",
      "src_professional_norm_pack_masonry_aac_block_600_200_200_piece_m2_wall_v1",
    ].includes(item.source_id))).toBe(false);
    expect(registry.blockers).toEqual(expect.arrayContaining([
      "masonry_400:expected_source_token_missing:masonry_bia_tn10",
      "concrete_volume:expected_source_token_missing:concrete_nrmca_cip31",
      "reinforcement_kg:expected_source_token_missing:reinforcement_project_bar_schedule",
      "reinforcement_100:expected_source_token_missing:reinforcement_project_bar_schedule",
      "formwork_contact_area:expected_source_token_missing:formwork_rics_nrm2",
    ]));
    expect(registry.full_10000_real_norm_green_claimed).toBe(false);
    expect(registry.fake_green_claimed).toBe(false);
  });
});
