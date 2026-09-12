import fs from "node:fs";
import path from "node:path";
import { inspectProductionNormConsumerInventory } from "../../scripts/estimate/productionNormConsumerInventory";
import { inspectProductionNormBindingCandidates } from "../../scripts/estimate/productionNormBindingCandidateInventory";
import {
  inferProfessionalNormPackBasisUnit,
  PROFESSIONAL_NORM_PACK_BASIS_PARAMETER_BY_NORM_ID,
} from "../../scripts/estimate/professionalNormPackBasisRegistry";
import {
  NORM_WORK_TAXONOMY_GROUPS,
  PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS,
} from "../../src/lib/ai/estimateTemplate10000";
import { aiEstimateRuDictionaryEntry } from "../../src/lib/estimate/aiEstimateRuParameterDictionary";
import { PROFESSIONAL_NORM_PACK_BASIS_QUESTIONS_RU } from "../../src/lib/estimate/professionalNormPackBasisQuestionsRu";

describe("real professional norm packs audit", () => {
  it("blocks green until sourced professional norm packs replace synthetic defaults", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "scripts/estimate/auditRealProfessionalNormPacks.ts"),
      "utf8",
    );
    const plan = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/work-group-remediation-plan.json"),
        "utf8",
      ),
    ) as { work_groups: Array<{ work_group: string; target_norm_pack_file: string }> };
    const packFiles = fs.readdirSync(path.resolve(process.cwd(), "data/estimate-norms/professional"))
      .filter((file) => file.endsWith(".json") && file !== "work-group-remediation-plan.json");
    const reviewedBaseboardsPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/baseboards.json"),
        "utf8",
      ),
    ) as {
      review_status: string;
      review_evidence?: {
        method?: string;
        reviewed_at?: string;
        items?: { norm_id?: string; source_url?: string; verified_facts?: string[] }[];
      };
      norm_items: { norm_id: string; source: { url: string } }[];
    };
    const reviewedAirConditioningPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/air_conditioning.json"),
        "utf8",
      ),
    ) as {
      review_status: string;
      review_evidence?: {
        method?: string;
        items?: { supporting_source_urls?: string[]; verified_facts?: string[] }[];
      };
    };
    const reviewedHeatingPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/heating.json"),
        "utf8",
      ),
    ) as {
      review_status: string;
      review_evidence?: {
        method?: string;
        items?: { verified_facts?: string[] }[];
      };
    };
    const reviewedVentilationPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/ventilation.json"),
        "utf8",
      ),
    ) as {
      review_status: string;
      review_evidence?: {
        method?: string;
        items?: { supporting_source_urls?: string[]; verified_facts?: string[] }[];
      };
    };
    const reviewedPlumbingPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/plumbing.json"),
        "utf8",
      ),
    ) as {
      review_status: string;
      norm_items: { norm_id: string }[];
      review_evidence?: {
        method?: string;
        items?: { norm_id?: string; verified_facts?: string[] }[];
      };
    };
    const reviewedCarpentryPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/carpentry.json"),
        "utf8",
      ),
    ) as {
      source_pack_version: string;
      review_status: string;
      review_evidence?: {
        method?: string;
        items?: { norm_id?: string; source_url?: string; verified_facts?: string[] }[];
      };
      norm_items: {
        norm_id: string;
        parameters: string[];
        rounding: { package_size: number; mode: string };
        source: { url: string; page: string };
      }[];
    };
    const reviewedRoofingPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/roofing.json"),
        "utf8",
      ),
    ) as {
      source_pack_version: string;
      review_status: string;
      review_evidence?: {
        method?: string;
        items?: {
          norm_id?: string;
          source_url?: string;
          supporting_source_urls?: string[];
          verified_facts?: string[];
        }[];
      };
      norm_items: {
        norm_id: string;
        parameters: string[];
        rounding: { package_size: number; mode: string };
      }[];
    };
    const reviewedFacadePack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/facade.json"),
        "utf8",
      ),
    ) as {
      source_pack_version: string;
      review_status: string;
      review_evidence?: {
        method?: string;
        items?: { norm_id?: string; source_url?: string; verified_facts?: string[] }[];
      };
      norm_items: {
        norm_id: string;
        parameters: string[];
        rounding: { package_size: number; mode: string };
      }[];
    };
    const reviewedInsulationPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/insulation.json"),
        "utf8",
      ),
    ) as {
      source_pack_version: string;
      review_status: string;
      review_evidence?: {
        method?: string;
        items?: {
          norm_id?: string;
          source_url?: string;
          supporting_source_urls?: string[];
          verified_facts?: string[];
        }[];
      };
      norm_items: {
        norm_id: string;
        parameters: string[];
        rounding: { package_size: number; mode: string };
        source: { url: string };
      }[];
    };
    const reviewedMetalworkPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/metalwork.json"),
        "utf8",
      ),
    ) as {
      source_pack_version: string;
      review_status: string;
      review_evidence?: {
        method?: string;
        items?: { norm_id?: string; source_url?: string; verified_facts?: string[] }[];
      };
      norm_items: {
        norm_id: string;
        parameters: string[];
        rounding: { package_size: number; mode: string };
      }[];
    };
    const reviewedCeilingsPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/ceilings.json"),
        "utf8",
      ),
    ) as {
      source_pack_version: string;
      review_status: string;
      review_evidence?: {
        method?: string;
        items?: { norm_id?: string; source_url?: string; verified_facts?: string[] }[];
      };
      norm_items: {
        norm_id: string;
        parameters: string[];
        rounding: { package_size: number; mode: string };
      }[];
    };
    const reviewedWaterproofingPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/waterproofing.json"),
        "utf8",
      ),
    ) as {
      source_pack_version: string;
      review_status: string;
      review_evidence?: {
        method?: string;
        items?: {
          norm_id?: string;
          source_url?: string;
          supporting_source_urls?: string[];
          verified_facts?: string[];
        }[];
      };
      norm_items: {
        norm_id: string;
        parameters: string[];
        waste_percent_default: number;
        applicability: Record<string, unknown>;
        rounding: { package_size: number; mode: string };
      }[];
    };
    const reviewedScreedPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/screed.json"),
        "utf8",
      ),
    ) as {
      source_pack_version: string;
      review_status: string;
      review_evidence?: {
        method?: string;
        items?: {
          norm_id?: string;
          source_url?: string;
          supporting_source_urls?: string[];
          verified_facts?: string[];
        }[];
      };
      norm_items: {
        norm_id: string;
        rate: { value: number; unit: string };
        waste_percent_default: number;
        applicability: Record<string, unknown>;
        rounding: { package_size: number; mode: string };
      }[];
    };
    const reviewedFlooringPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/flooring.json"),
        "utf8",
      ),
    ) as {
      source_pack_version: string;
      review_status: string;
      review_evidence?: {
        method?: string;
        items?: {
          norm_id?: string;
          source_url?: string;
          verified_facts?: string[];
        }[];
      };
      norm_items: {
        norm_id: string;
        parameters: string[];
        rate: { value: number; unit: string };
        waste_percent_default: number;
        applicability: Record<string, unknown>;
        rounding: { package_size: number; mode: string };
      }[];
    };
    const reviewedTilePack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/tile.json"),
        "utf8",
      ),
    ) as {
      source_pack_version: string;
      review_status: string;
      review_evidence?: {
        method?: string;
        items?: {
          norm_id?: string;
          source_url?: string;
          verified_facts?: string[];
        }[];
      };
      norm_items: {
        norm_id: string;
        parameters: string[];
        rate: { value: number; unit: string };
        waste_percent_default: number;
        applicability: Record<string, unknown>;
        rounding: { package_size: number; mode: string };
      }[];
    };
    const reviewedPlasterPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/plaster.json"),
        "utf8",
      ),
    ) as {
      source_pack_version: string;
      review_status: string;
      review_evidence?: {
        method?: string;
        items?: {
          norm_id?: string;
          source_url?: string;
          verified_facts?: string[];
        }[];
      };
      norm_items: {
        norm_id: string;
        parameters: string[];
        rate: { value: number; unit: string };
        waste_percent_default: number;
        applicability: Record<string, unknown>;
        rounding: { package_size: number; mode: string };
      }[];
    };
    const reviewedPuttyPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/putty.json"),
        "utf8",
      ),
    ) as {
      source_pack_version: string;
      review_status: string;
      review_evidence?: {
        method?: string;
        items?: {
          norm_id?: string;
          source_url?: string;
          verified_facts?: string[];
        }[];
      };
      norm_items: {
        norm_id: string;
        parameters: string[];
        rate: { value: number; unit: string };
        waste_percent_default: number;
        applicability: Record<string, unknown>;
        rounding: { package_size: number; mode: string };
      }[];
    };

    expect(source).toContain("GREEN_AI_ESTIMATE_REAL_PROFESSIONAL_NORM_PACKS_FOR_ALL_WORK_TYPES_NO_BUILDS");
    expect(source).toContain("STOP_REAL_NORM_SOURCES_MISSING_FOR_WORK_GROUPS");
    expect(source).toContain("STOP_NORM_REALITY_AUDIT_NOT_FOUND");
    expect(source).toContain("ai-estimate-real-professional-norm-packs");
    expect(source).toContain("STOP_NORM_BASE_STRUCTURAL_BUT_NOT_PROFESSIONAL");
    expect(source).toContain("STOP_HARDCODED_PRODUCTION_NORM_RATE_FOUND");
    expect(source).toContain("synthetic_family_default_count_after");
    expect(source).toContain("templates_with_real_norm_sources_count");
    expect(source).toContain("generated_family_default_not_professional");
    expect(source).toContain("invalid_or_fake_source_url");
    expect(source).toContain("apartment_reference_not_accepted_as_10000_proof");
    expect(source).toContain("apartment_reference_boq_shape_good_but_norm_sources_not_real_packs");
    expect(source).toContain("source_backed_norm_items_count");
    expect(source).toContain("SOURCE_QUALITY_GREEN_STATUS");
    expect(source).toContain("source_registry_covers_professional_norm_sources");
    expect(source).toContain("source_registry_bound_work_groups");
    expect(source).toContain("physical_norm_binding_disposition_complete");
    expect(source).toContain("unregistered_physical_norm_binding_candidates");
    expect(source).toContain("source_registry_unbound_work_groups");
    expect(source).toContain("production_source_registry_binding_present");
    expect(source).toContain("production_norm_registry_binding_present");
    expect(source).toContain("PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS");
    expect(source).toContain("production_norm_registry_bound_work_groups");
    expect(source).toContain("production_norm_registry_unbound_work_groups");
    expect(source).toContain("production_norm_registry_invalid_bindings");
    expect(source).toContain("production_unbound_norm_requirements");
    expect(source).toContain("production_norm_consumer_inventory_complete");
    expect(source).toContain("consumer_work_basis_units");
    expect(source).toContain("consumer_resource_output_units");
    expect(source).toContain("production_norm_registry_dimensional_binding_valid");
    expect(source).toContain("invalid_registered_norm_bindings");
    expect(source).toContain("required_norm_parameter_keys");
    expect(source).toContain("physical_norm_rate_bases");
    expect(source).toContain("physical_norm_work_bases");
    expect(source).toContain("basis_parameter_not_declared");
    expect(source).toContain("work_basis_unit_mismatch");
    expect(source).toContain("physical_norm_basis_registry_complete");
    expect(source).toContain("physical_norm_basis_question_coverage_complete");
    expect(source).toContain("missing_physical_norm_basis_question_keys");
    expect(source).toContain("PACK_NEEDS_REVIEW");
    expect(source).toContain("reviewed_pack_missing_review_evidence");
    expect(source).toContain("review_evidence_source_url_mismatch");
    expect(source).toContain("NO_EXECUTABLE_REGISTRY_BINDING");
    expect(source).toContain("wave1_physical_pack_files_present");
    expect(source).toContain("wave1_production_bindings_present");
    expect(source).toContain("packGroups.has(group) && productionBoundGroups.has(group)");
    expect(source).toContain("allPacksPresent &&");
    expect(source).toContain("allSourceRegistryGroupsPresent &&");
    expect(source).toContain("allProductionNormRegistryGroupsPresent");
    expect(source).toContain("missing_real_norm_pack_work_groups: missingPackGroups");
    expect(source).toContain("missing_real_source_registry_work_groups:");
    expect(source).toContain("missing_real_production_norm_registry_work_groups:");
    expect(source).toContain("src_professional_norm_pack_${group}_");
    expect(source).toContain('!source.source_id.startsWith("src_professional_norm_pack_catalog_")');
    expect(source).toContain("all_professional_norm_packs_reviewed");
    expect(source).toContain("missing_source_page_or_section");
    expect(source).toContain("needs_regional_review");
    expect(source).toContain("AI_ESTIMATE_REAL_PROFESSIONAL_NORM_PACKS_${name}");
    expect(source).not.toMatch(/eas\s+build|expo\s+run:android|gradlew|xcodebuild|git add \./);

    expect(plan.work_groups.length).toBeGreaterThanOrEqual(35);
    expect(plan.work_groups.every((entry) => entry.work_group && entry.target_norm_pack_file)).toBe(true);
    expect(plan.work_groups.map((entry) => entry.work_group)).toEqual(expect.arrayContaining([
      "plaster",
      "putty",
      "paint",
      "flooring",
      "tile",
      "masonry",
      "concrete",
      "electrical",
      "plumbing",
      "documentation",
      "cleaning",
    ]));

    expect(packFiles.length).toBeGreaterThanOrEqual(7);
    expect(packFiles).toEqual(expect.arrayContaining([
      "drywall.json",
      "flooring.json",
      "masonry.json",
      "concrete.json",
      "reinforcement.json",
      "formwork.json",
      "screed.json",
      "paint.json",
      "plaster.json",
      "putty.json",
      "tile.json",
      "waterproofing.json",
    ]));
    expect(reviewedBaseboardsPack.review_status).toBe("reviewed");
    expect(reviewedBaseboardsPack.review_evidence).toMatchObject({
      method: "DIRECT_PRIMARY_SOURCE_REVIEW",
      reviewed_at: "2026-09-12",
    });
    expect(reviewedBaseboardsPack.review_evidence?.items).toHaveLength(
      reviewedBaseboardsPack.norm_items.length,
    );
    expect(reviewedBaseboardsPack.norm_items.every((item) => {
      const evidence = reviewedBaseboardsPack.review_evidence?.items?.find(
        (candidate) => candidate.norm_id === item.norm_id,
      );
      return evidence?.source_url === item.source.url && (evidence.verified_facts?.length ?? 0) >= 3;
    })).toBe(true);
    expect(reviewedAirConditioningPack.review_status).toBe("reviewed");
    expect(reviewedAirConditioningPack.review_evidence).toMatchObject({
      method: "DIRECT_PRIMARY_SOURCE_REVIEW",
    });
    expect(reviewedAirConditioningPack.review_evidence?.items?.[0]).toMatchObject({
      supporting_source_urls: ["https://www.daikin.eu/en_us/products/product.table.html/3mxs-k.html"],
    });
    expect(reviewedAirConditioningPack.review_evidence?.items?.[0]?.verified_facts)
      .toContain("no_package_or_charge_scale_rounding_stated_for_exact_3mxs_k_formula");
    expect(reviewedHeatingPack.review_status).toBe("reviewed");
    expect(reviewedHeatingPack.review_evidence).toMatchObject({
      method: "DIRECT_PRIMARY_SOURCE_REVIEW",
    });
    expect(reviewedHeatingPack.review_evidence?.items?.[0]?.verified_facts)
      .toEqual(expect.arrayContaining([
        "150_mm_spacing_equals_6_7_m_pipe_per_m2",
        "feed_and_tail_lengths_between_manifold_and_room_must_be_added",
        "no_pipe_package_or_whole_metre_rounding_stated_for_the_requirement_formula",
      ]));
    expect(reviewedVentilationPack.review_status).toBe("reviewed");
    expect(reviewedVentilationPack.review_evidence).toMatchObject({
      method: "DIRECT_PRIMARY_SOURCE_REVIEW",
    });
    expect(reviewedVentilationPack.review_evidence?.items?.[0]?.verified_facts)
      .toEqual(expect.arrayContaining([
        "five_exact_diameters_are_200_250_315_400_500_mm",
        "maximum_standard_section_length_is_3000_mm",
        "maximum_standard_length_does_not_define_a_three_metre_procurement_rounding_rule",
      ]));
    expect(reviewedPlumbingPack.review_status).toBe("reviewed");
    expect(reviewedPlumbingPack.review_evidence).toMatchObject({
      method: "DIRECT_PRIMARY_SOURCE_REVIEW",
    });
    expect(reviewedPlumbingPack.review_evidence?.items).toHaveLength(4);
    expect(reviewedPlumbingPack.review_evidence?.items?.map((item) => item.norm_id).sort())
      .toEqual(reviewedPlumbingPack.norm_items.map((item) => item.norm_id).sort());
    expect(reviewedPlumbingPack.review_evidence?.items?.find((item) =>
      item.norm_id === "plumbing_wavin_hep2o_smartsleeve_piece_connection_v1")?.verified_facts)
      .toContain("exact_integer_prepared_pipe_end_count_requires_no_additional_rounding");
    expect(reviewedCarpentryPack).toMatchObject({
      source_pack_version: "2026.09-sikagard-wood-preserver-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedCarpentryPack.review_evidence?.items).toHaveLength(1);
    expect(reviewedCarpentryPack.review_evidence?.items?.[0]).toMatchObject({
      norm_id: "carpentry_sikagard_wood_preserver_l_m2_preventative_v1",
      source_url: "https://gbr.sika.com/dam/dms/gb01/c/sikagard_wood_preserver.pdf",
    });
    expect(reviewedCarpentryPack.review_evidence?.items?.[0]?.verified_facts)
      .toEqual(expect.arrayContaining([
        "july_2026_pds_version_02_01",
        "preventative_treatment_consumption_is_250_ml_per_m2",
        "packaging_is_1_l_and_5_l_tins",
        "net_litre_requirement_is_not_a_selected_procurement_pack_mix",
      ]));
    expect(reviewedCarpentryPack.norm_items[0]).toMatchObject({
      parameters: expect.arrayContaining([
        "minimum_coat_count",
        "selected_package_mix_l",
      ]),
      rounding: {
        package_size: 1,
        mode: "exact_litres_before_selected_1_l_and_5_l_procurement_mix",
      },
      source: {
        url: "https://gbr.sika.com/dam/dms/gb01/c/sikagard_wood_preserver.pdf",
      },
    });
    expect(reviewedRoofingPack).toMatchObject({
      source_pack_version: "2026.09-sika-sarnafil-at18-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedRoofingPack.review_evidence?.items).toHaveLength(1);
    expect(reviewedRoofingPack.review_evidence?.items?.[0]).toMatchObject({
      norm_id: "roofing_sarnafil_at18_field_overlap_m2_m2_v1",
      source_url: "https://gbr.sika.com/en/construction/roofing/flat-roof-productsandsystems/single-ply-roofing/fpo-roof-membranes/sarnafil-at-18.html",
      supporting_source_urls: ["https://gbr.sika.com/dam/dms/gb01/5/sarnafil-at-18.pdf"],
    });
    expect(reviewedRoofingPack.review_evidence?.items?.[0]?.verified_facts)
      .toEqual(expect.arrayContaining([
        "standard_roll_is_2_m_wide_and_15_m_long",
        "field_fastening_and_ballasted_overlap_is_80_mm",
        "spot_fastening_overlap_is_120_mm",
        "factor_1_0416667_is_derived_from_width_and_80_mm_overlap_not_a_published_consumption_rate",
        "gross_field_area_is_not_a_complete_roll_procurement_takeoff",
      ]));
    expect(reviewedRoofingPack.norm_items[0]).toMatchObject({
      parameters: expect.arrayContaining([
        "field_course_count",
        "field_course_lengths_m",
        "end_lap_design",
        "sika_project_specific_fastening_calculation",
      ]),
      rounding: {
        package_size: 30,
        mode: "gross_field_area_only_no_roll_rounding_before_complete_layout",
      },
    });
    expect(reviewedFacadePack).toMatchObject({
      source_pack_version: "2026.09-rockwool-vhf-fixings-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedFacadePack.review_evidence?.items).toHaveLength(1);
    expect(reviewedFacadePack.review_evidence?.items?.[0]).toMatchObject({
      norm_id: "facade_rockwool_fixrock_conventional_fixings_piece_m2_v1",
      source_url: "https://www.rockwool.com/at/rat-und-tat/vertiefendes-wissen/produktwissen/vhf-befestigung/",
    });
    expect(reviewedFacadePack.review_evidence?.items?.[0]?.verified_facts)
      .toEqual(expect.arrayContaining([
        "conventional_fixing_uses_average_five_insulation_holders_per_m2",
        "adhesive_fixing_is_a_separate_variant",
        "one_dowel_variant_uses_one_holder_per_board_and_two_per_edge_board",
        "fractional_holder_result_requires_whole_piece_rounding",
      ]));
    expect(reviewedFacadePack.norm_items[0]).toMatchObject({
      parameters: expect.arrayContaining([
        "conventional_holder_fixing_confirmed",
        "adhesive_variant_excluded",
        "one_dowel_variant_excluded",
      ]),
      rounding: {
        package_size: 1,
        mode: "ceil_to_whole_piece_after_confirmed_conventional_area",
      },
    });
    expect(reviewedInsulationPack).toMatchObject({
      source_pack_version: "2026.09-rockwool-comfortboard80-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedInsulationPack.review_evidence?.items).toHaveLength(1);
    expect(reviewedInsulationPack.review_evidence?.items?.[0]).toMatchObject({
      norm_id: "insulation_rockwool_comfortboard80_r63_38mm_m2_m2_v1",
      source_url: "https://brandportal.rockwool.com/original/gallery/39052/files/original/13225669-1028-49f5-85e4-6dd3f8bb0b9b.pdf",
      supporting_source_urls: expect.arrayContaining([
        "https://www.rockwool.com/north-america/products/comfortboard/",
      ]),
    });
    expect(reviewedInsulationPack.review_evidence?.items?.[0]?.verified_facts)
      .toEqual(expect.arrayContaining([
        "r6_3_board_thickness_is_38_mm",
        "r6_3_small_board_dimensions_are_1219_by_610_mm",
        "r6_3_small_pack_contains_6_boards",
        "r6_3_small_pack_coverage_is_4_45_m2",
        "net_area_rate_is_not_automatic_package_or_cutting_rounding",
      ]));
    expect(reviewedInsulationPack.norm_items[0]).toMatchObject({
      parameters: expect.arrayContaining([
        "selected_board_length_mm",
        "selected_board_width_mm",
        "selected_package_format",
        "opening_and_cut_layout",
      ]),
      rounding: {
        package_size: 4.45,
        mode: "exact_net_area_before_cut_layout_and_package_selection",
      },
      source: {
        url: "https://brandportal.rockwool.com/original/gallery/39052/files/original/13225669-1028-49f5-85e4-6dd3f8bb0b9b.pdf",
      },
    });
    expect(reviewedMetalworkPack).toMatchObject({
      source_pack_version: "2026.09-jotun-hardtop-xp-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedMetalworkPack.review_evidence?.items).toHaveLength(1);
    expect(reviewedMetalworkPack.review_evidence?.items?.[0]).toMatchObject({
      norm_id: "metalwork_jotun_hardtop_xp_l_m2_100um_v1",
      source_url: "https://www.jotun.com/api/v1/datasheets/download/merged?selectedFiles=4378",
    });
    expect(reviewedMetalworkPack.review_evidence?.items?.[0]?.verified_facts)
      .toEqual(expect.arrayContaining([
        "tds_issue_date_is_2026_06_24",
        "100_um_dry_film_thickness_uses_160_um_wet_film_thickness",
        "theoretical_spreading_rate_at_100_um_is_6_3_m2_per_l",
        "product_mixing_ratio_by_volume_is_10_to_1",
        "typical_combined_kit_volumes_are_5_l_and_20_l",
        "theoretical_litres_exclude_application_loss_and_kit_rounding",
      ]));
    expect(reviewedMetalworkPack.norm_items[0]).toMatchObject({
      parameters: expect.arrayContaining([
        "application_loss_factor",
        "selected_kit_size_l",
        "component_mixing_ratio_confirmed",
      ]),
      rounding: {
        package_size: 5,
        mode: "theoretical_litres_before_application_loss_and_selected_5_l_or_20_l_kit_rounding",
      },
    });
    expect(reviewedCeilingsPack).toMatchObject({
      source_pack_version: "2026.09-knauf-d11-d112-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedCeilingsPack.review_evidence?.items).toHaveLength(7);
    expect(reviewedCeilingsPack.review_evidence?.items?.map((item) => item.norm_id).sort())
      .toEqual(reviewedCeilingsPack.norm_items.map((item) => item.norm_id).sort());
    expect(reviewedCeilingsPack.review_evidence?.items?.every((item) =>
      item.source_url === "https://knauf.com/api/download-center/v1/assets/2d411a5d-3b6d-45e3-ab8e-a13b0f0b54bd?download=true" &&
      (item.verified_facts?.length ?? 0) >= 3 &&
      item.verified_facts?.includes("d11_document_version_is_2006_03"),
    )).toBe(true);
    expect(reviewedCeilingsPack.norm_items.find((item) =>
      item.norm_id === "ceilings_knauf_d112_standard_wall_fastener_piece_m2_v1"))
      .toMatchObject({
        parameters: [
          "area_m2",
          "length_m",
          "width_m",
          "system_passport_reference",
          "system_variant",
          "substrate_type",
          "substrate_fastener_reference",
          "substrate_fastener_approved",
          "ceiling_perimeter_anchor_spacing_m",
        ],
        rounding: { mode: "ceil_to_whole_piece_for_exact_10x10_reference_geometry" },
      });
    expect(PROFESSIONAL_NORM_PACK_BASIS_PARAMETER_BY_NORM_ID
      .ceilings_knauf_d112_standard_wall_fastener_piece_m2_v1).toBe("area_m2");
    expect(reviewedCeilingsPack.norm_items.filter((item) => [
      "ceilings_knauf_d112_standard_tn25_screw_piece_m2_v1",
      "ceilings_knauf_d112_standard_substructure_anchor_piece_m2_v1",
    ].includes(item.norm_id)).every((item) =>
      item.rounding.mode === "ceil_to_whole_piece_from_d112_reference_average",
    )).toBe(true);
    expect(reviewedWaterproofingPack).toMatchObject({
      source_pack_version: "2026.09-ceresit-cl51-global-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedWaterproofingPack.review_evidence?.items).toMatchObject([{
      norm_id: "waterproofing_ceresit_cl51_two_coats_kg_m2_v1",
      source_url: "https://datasheets.tdx.henkel.com/CERESIT-CL-51-en_GL.pdf",
      supporting_source_urls: [
        "https://www.ceresit.com/products/tiling/product.html/ceresit-cl-51/SAP_0201SKC013R0.html",
      ],
    }]);
    expect(reviewedWaterproofingPack.review_evidence?.items?.[0]?.verified_facts)
      .toEqual(expect.arrayContaining([
        "minimum_amount_required_for_two_coats_is_1_3_kg_per_m2",
        "swimming_pools_and_permanently_wet_areas_are_excluded",
        "additional_waste_allowance_is_not_published",
      ]));
    expect(reviewedWaterproofingPack.norm_items).toMatchObject([{
      norm_id: "waterproofing_ceresit_cl51_two_coats_kg_m2_v1",
      parameters: expect.arrayContaining([
        "area_m2",
        "installation_location",
        "under_ceramic_covering",
        "permanent_water_contact_excluded",
        "rear_surface_moisture_excluded",
        "chemical_exposure_excluded",
        "selected_bucket_size_kg",
      ]),
      waste_percent_default: 0,
      applicability: {
        application_location: "indoor_walls_and_floors_under_ceramic_coverings",
        swimming_pools_excluded: true,
        permanently_wet_areas_excluded: true,
        joint_and_penetration_accessories_excluded_from_rate: true,
        manufacturer_rate_is_minimum_required_amount: true,
        additional_waste_not_published: true,
        documented_bucket_sizes_kg: [5, 15],
      },
      rounding: {
        package_size: 5,
        mode: "minimum_required_kg_before_selected_5_or_15_kg_bucket_rounding",
      },
    }]);
    expect(reviewedScreedPack).toMatchObject({
      source_pack_version: "2026.09-ceresit-cn87-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedScreedPack.review_evidence?.items).toMatchObject([{
      norm_id: "screed_cement_sand_mix_kg_m2_50mm_v1",
      source_url: "https://datasheets.tdx.henkel.com/CERESIT-CN-87-en_GL.pdf",
      supporting_source_urls: [
        "https://www.ceresit.com/products/flooring/product.html/ceresit-cn-87/SAP_0201TBC014A2.html",
      ],
    }]);
    expect(reviewedScreedPack.review_evidence?.items?.[0]?.verified_facts)
      .toEqual(expect.arrayContaining([
        "approximate_mortar_yield_is_2_0_kg_per_m2_per_mm",
        "derived_50_mm_requirement_is_100_kg_per_m2",
        "additional_waste_allowance_is_not_published",
      ]));
    expect(reviewedScreedPack.norm_items).toMatchObject([{
      norm_id: "screed_cement_sand_mix_kg_m2_50mm_v1",
      rate: {
        value: 100,
        unit: "approximate kg/m2 at exactly 50 mm; derived from 2.0 kg/m2 per mm",
      },
      waste_percent_default: 0,
      applicability: {
        layer_thickness_mm: 50,
        source_rate_kg_m2_per_mm: 2,
        production_scalar_valid_only_at_50_mm: true,
        non_50_mm_requires_dynamic_thickness_formula: true,
        contact_layer_materials_excluded_from_rate: true,
        additional_waste_not_published: true,
        documented_bag_size_kg: 25,
      },
      rounding: {
        package_size: 25,
        mode: "approximate_net_kg_before_25_kg_bag_rounding",
      },
    }]);
    expect(reviewedFlooringPack).toMatchObject({
      source_pack_version: "2026.09-ceresit-cn69-ct17-global-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedFlooringPack.review_evidence?.items).toHaveLength(2);
    expect(reviewedFlooringPack.review_evidence?.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        norm_id: "flooring_ceresit_cn69_self_leveling_scope_2_10mm_v1",
        source_url: "https://datasheets.tdx.henkel.com/CERESIT-CN-69-en_GL.pdf",
        verified_facts: expect.arrayContaining([
          "approximate_consumption_is_1_3_kg_per_m2_per_mm",
          "documented_global_pack_size_is_25_kg",
          "regional_tds_variants_have_different_rates_and_pack_sizes",
        ]),
      }),
      expect.objectContaining({
        norm_id: "flooring_ceresit_ct17_primer_flooring_l_m2_v1",
        source_url: "https://datasheets.tdx.henkel.com/CERESIT-CT-17-en_GL.pdf",
        verified_facts: expect.arrayContaining([
          "published_consumption_is_a_range_from_0_1_to_0_5_l_per_m2",
          "flooring_substrates_must_be_reprimed_if_still_absorbent_after_drying",
          "fixed_lower_bound_must_not_be_used_as_a_project_quantity_without_selected_consumption_and_coat_count",
        ]),
      }),
    ]));
    expect(reviewedFlooringPack.norm_items.find((item) =>
      item.norm_id === "flooring_ceresit_cn69_self_leveling_scope_2_10mm_v1"))
      .toMatchObject({
        parameters: expect.arrayContaining([
          "area_m2",
          "layer_thickness_mm",
          "cn69_substrate_type",
          "cn69_global_25kg_tds_variant_confirmed",
          "selected_bag_size_kg",
        ]),
        rate: {
          value: 1.3,
          unit: "approximate kg/m2 per mm for the global 25 kg C_CN69_TDS_1_0420 variant",
        },
        waste_percent_default: 0,
        applicability: expect.objectContaining({
          layer_min_mm: 2,
          layer_max_mm: 10,
          simple_rate_multiplication_forbidden: true,
          regional_variant_confirmation_required: true,
          documented_bag_size_kg: 25,
        }),
        rounding: {
          package_size: 25,
          mode: "approximate_net_kg_before_confirmed_25_kg_bag_rounding",
        },
      });
    expect(reviewedFlooringPack.norm_items.find((item) =>
      item.norm_id === "flooring_ceresit_ct17_primer_flooring_l_m2_v1"))
      .toMatchObject({
        parameters: expect.arrayContaining([
          "substrate_evenness",
          "substrate_absorbency",
          "selected_consumption_l_m2",
          "coat_count",
        ]),
        rate: {
          value: 0.1,
          unit: "published lower bound only; project rate must be selected within 0.1-0.5 l/m2",
        },
        waste_percent_default: 0,
        applicability: expect.objectContaining({
          rate_range_l_m2: [0.1, 0.5],
          repeat_if_still_absorbent_after_drying: true,
          simple_rate_multiplication_forbidden: true,
          selected_consumption_and_coat_count_required: true,
        }),
      });
    expect(reviewedTilePack).toMatchObject({
      source_pack_version: "2026.09-ceresit-cm11-plus-ct17-global-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedTilePack.review_evidence?.items).toHaveLength(2);
    expect(reviewedTilePack.review_evidence?.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        norm_id: "tile_ceresit_cm11_plus_adhesive_kg_m2_notch_4_12_v1",
        source_url: "https://datasheets.tdx.henkel.com/CERESIT-CM-11-PLUS-en_GL.pdf",
        verified_facts: expect.arrayContaining([
          "approximate_consumption_table_pairs_tile_size_and_notch_from_2_0_to_4_8_kg_per_m2",
          "consumption_can_vary_with_substrate_evenness_notch_depth_and_tile_type",
          "direct_area_only_scalar_multiplication_is_forbidden",
        ]),
      }),
      expect.objectContaining({
        norm_id: "tile_ceresit_ct17_primer_l_m2_absorbent_substrate_v1",
        source_url: "https://datasheets.tdx.henkel.com/CERESIT-CT-17-en_GL.pdf",
        verified_facts: expect.arrayContaining([
          "cement_and_cement_lime_substrates_allow_tile_adhesive_after_15_minutes",
          "other_substrates_require_complete_primer_drying",
          "fixed_lower_bound_must_not_be_used_without_selected_consumption_and_coat_count",
        ]),
      }),
    ]));
    expect(reviewedTilePack.norm_items.find((item) =>
      item.norm_id === "tile_ceresit_cm11_plus_adhesive_kg_m2_notch_4_12_v1"))
      .toMatchObject({
        parameters: expect.arrayContaining([
          "tile_type",
          "tile_size_category",
          "trowel_notch_mm",
          "substrate_even_load_bearing_compact_confirmed",
          "floating_buttering_requirement_confirmed",
          "cm11_global_tds_variant_confirmed",
        ]),
        rate: {
          value: 2,
          unit: "lowest approximate table row only; exact project row is selected by tile-size category and paired trowel notch",
        },
        waste_percent_default: 0,
        applicability: expect.objectContaining({
          tile_max_area_m2: 0.25,
          tile_max_side_cm: 60,
          simple_rate_multiplication_forbidden: true,
          exact_table_pair_required: true,
          rate_table_kg_m2: {
            "up_to_10_cm__4_mm": 2,
            "up_to_15_cm__6_mm": 2.7,
            "up_to_25_cm__8_mm": 3.4,
            "up_to_30_cm__10_mm": 4.2,
            "above_30_to_60_cm__12_mm": 4.8,
          },
        }),
        rounding: {
          package_size: 25,
          mode: "approximate_net_kg_before_explicit_project_package_selection",
        },
      });
    expect(reviewedTilePack.norm_items.find((item) =>
      item.norm_id === "tile_ceresit_ct17_primer_l_m2_absorbent_substrate_v1"))
      .toMatchObject({
        parameters: expect.arrayContaining([
          "substrate_evenness",
          "substrate_absorbency",
          "selected_consumption_l_m2",
          "coat_count",
          "drying_rule_confirmed",
        ]),
        rate: {
          value: 0.1,
          unit: "published lower bound only; project rate must be selected within 0.1-0.5 l/m2",
        },
        waste_percent_default: 0,
        applicability: expect.objectContaining({
          rate_range_l_m2: [0.1, 0.5],
          other_substrates_require_complete_drying: true,
          simple_rate_multiplication_forbidden: true,
          selected_consumption_and_coat_count_required: true,
        }),
      });
    expect(reviewedPlasterPack).toMatchObject({
      source_pack_version: "2026.09-ceresit-ct29-global-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedPlasterPack.review_evidence?.items).toMatchObject([{
      norm_id: "plaster_ceresit_ct29_kg_m2_mm_v1",
      source_url: "https://datasheets.tdx.henkel.com/CERESIT-CT-29-en_GL.pdf",
      verified_facts: expect.arrayContaining([
        "plaster_application_consumption_is_approximately_1_8_kg_per_m2_per_mm",
        "deep_loss_filling_uses_a_separate_approximately_1_8_kg_per_dm3_basis",
        "direct_area_only_scalar_multiplication_is_forbidden_because_layer_thickness_is_required",
        "additional_waste_allowance_is_not_published",
      ]),
    }]);
    expect(reviewedPlasterPack.norm_items).toMatchObject([{
      norm_id: "plaster_ceresit_ct29_kg_m2_mm_v1",
      parameters: expect.arrayContaining([
        "area_m2",
        "layer_thickness_mm",
        "ct29_application_mode",
        "substrate_absorbency_class",
        "substrate_absorbency_preparation_confirmed",
        "ct29_global_tds_variant_confirmed",
        "selected_bag_size_kg",
      ]),
      rate: {
        value: 1.8,
        unit: "approximate kg/m2 per mm for plaster application; not the separate kg/dm3 deep-loss basis",
      },
      waste_percent_default: 0,
      applicability: expect.objectContaining({
        application_mode: "plaster_application_by_area_and_thickness",
        excluded_application_mode: "deep_loss_filling_by_volume",
        deep_loss_fill_rate_kg_dm3: 1.8,
        simple_rate_multiplication_forbidden: true,
        documented_bag_sizes_kg: [5, 25],
      }),
      rounding: {
        package_size: 5,
        mode: "approximate_net_kg_before_rounding_to_explicitly_selected_5_or_25_kg_bag",
      },
    }]);
    expect(reviewedPuttyPack).toMatchObject({
      source_pack_version: "2026.09-ceresit-ct126-ct127-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedPuttyPack.review_evidence?.items).toHaveLength(2);
    expect(reviewedPuttyPack.review_evidence?.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        norm_id: "putty_ceresit_ct126_kg_m2_mm_v1",
        source_url: "https://dm.henkel-dam.com/is/content/henkel/ceresit-ct126",
        verified_facts: expect.arrayContaining([
          "approximate_consumption_is_1_2_kg_per_m2_per_mm",
          "single_layer_thickness_is_2_to_10_mm",
          "direct_area_only_scalar_multiplication_is_forbidden_because_layer_thickness_is_required",
          "additional_waste_allowance_is_not_published",
        ]),
      }),
      expect.objectContaining({
        norm_id: "putty_ceresit_ct127_finish_layer_max_2mm_v1",
        source_url: "https://datasheets.tdx.henkel.com/CERESIT-CT-127-en_GL.pdf",
        verified_facts: expect.arrayContaining([
          "estimated_consumption_is_a_range_from_0_4_to_1_2_kg_per_m2",
          "tds_does_not_publish_a_rate_selection_table_by_layer_thickness",
          "fixed_range_bound_must_not_be_used_without_an_explicit_project_consumption_selection",
          "additional_waste_allowance_is_not_published",
        ]),
      }),
    ]));
    expect(reviewedPuttyPack.norm_items.find((item) =>
      item.norm_id === "putty_ceresit_ct126_kg_m2_mm_v1"))
      .toMatchObject({
        parameters: expect.arrayContaining([
          "area_m2",
          "layer_thickness_mm",
          "substrate_type",
          "substrate_preparation_system",
          "selected_bag_size_kg",
        ]),
        rate: {
          value: 1.2,
          unit: "approximate kg/m2 per mm",
        },
        waste_percent_default: 0,
        applicability: expect.objectContaining({
          layer_min_mm: 2,
          layer_max_mm: 10,
          simple_rate_multiplication_forbidden: true,
          documented_bag_sizes_kg: [5, 20],
        }),
        rounding: {
          package_size: 5,
          mode: "approximate_net_kg_before_rounding_to_explicitly_selected_5_or_20_kg_bag",
        },
      });
    expect(reviewedPuttyPack.norm_items.find((item) =>
      item.norm_id === "putty_ceresit_ct127_finish_layer_max_2mm_v1"))
      .toMatchObject({
        parameters: expect.arrayContaining([
          "area_m2",
          "layer_thickness_mm",
          "substrate_type",
          "substrate_absorbency",
          "selected_consumption_kg_m2",
          "selected_bag_size_kg",
        ]),
        rate: {
          value: 0.4,
          unit: "published estimated lower bound only; project rate must be selected within 0.4-1.2 kg/m2",
        },
        waste_percent_default: 0,
        applicability: expect.objectContaining({
          layer_max_mm: 2,
          rate_range_kg_m2: [0.4, 1.2],
          rate_selection_table_not_published: true,
          selected_consumption_required: true,
          simple_rate_multiplication_forbidden: true,
        }),
        rounding: {
          package_size: 20,
          mode: "net_kg_after_explicit_project_rate_selection_before_20_kg_bag_rounding",
        },
      });
  });

  it("inventories the actual row-aware production consumers instead of category-only proxies", () => {
    const inventory = inspectProductionNormConsumerInventory();
    const byGroup = new Map(inventory.map((entry) => [entry.work_group, entry]));

    expect(inventory).toHaveLength(NORM_WORK_TAXONOMY_GROUPS.length);
    expect(inventory.reduce((sum, entry) => sum + entry.rows_count, 0)).toBe(599000);
    expect(NORM_WORK_TAXONOMY_GROUPS.every((group) => (byGroup.get(group)?.rows_count ?? 0) > 0)).toBe(true);
    expect(inventory.flatMap((entry) => entry.invalid_registered_norm_bindings)).toEqual([]);
    expect(new Set(inventory.flatMap((entry) => entry.registered_norm_ids))).toEqual(
      new Set(PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS.map((item) => item.normId)),
    );
    expect(byGroup.get("delivery")?.templates_count).toBe(10000);
    expect(byGroup.get("documentation")?.templates_count).toBe(10000);
    expect(byGroup.get("equipment_rent")?.templates_count).toBe(10000);
    expect(byGroup.get("low_voltage")?.work_basis_units).toEqual({
      point: 8664,
      linear_m: 228,
    });
    expect(byGroup.get("sewerage")?.work_basis_units).toEqual({
      point: 1368,
      linear_m: 190,
    });
    expect(byGroup.get("ventilation")?.work_basis_units).toEqual({
      linear_m: 152,
      set: 11248,
    });
    expect(byGroup.get("heating")?.work_basis_units).toEqual({
      piece: 14250,
      m2: 190,
    });
  });

  it("provides human-readable Russian questions for every physical norm basis", () => {
    const basisParameters = [...new Set(Object.values(
      PROFESSIONAL_NORM_PACK_BASIS_PARAMETER_BY_NORM_ID,
    ))].sort();

    expect(basisParameters).toHaveLength(32);
    expect(Object.keys(PROFESSIONAL_NORM_PACK_BASIS_QUESTIONS_RU)).toHaveLength(30);
    expect(PROFESSIONAL_NORM_PACK_BASIS_PARAMETER_BY_NORM_ID).toMatchObject({
      ventilation_lindab_vsr_duct_linear_m_route_v1: "route_length_m",
      plumbing_wavin_hep2o_15mm_horizontal_clip_spacing_v1: "route_length_m",
      plumbing_wavin_hep2o_15mm_vertical_clip_spacing_v1: "route_length_m",
      plumbing_wavin_hep2o_22mm_horizontal_clip_spacing_v1: "route_length_m",
    });
    expect(PROFESSIONAL_NORM_PACK_BASIS_QUESTIONS_RU.route_length_m).toMatchObject({
      unit: "linear_m",
      aliasesRu: expect.arrayContaining(["трасса воздуховода", "длина трубопровода"]),
    });
    expect(basisParameters.filter((key) => {
      const entry = aiEstimateRuDictionaryEntry(key);
      const text = entry
        ? `${entry.labelRu} ${entry.promptPhraseRu} ${entry.descriptionRu}`
        : "";
      return !entry ||
        !/[А-Яа-яЁё]/u.test(entry.labelRu) ||
        !/[А-Яа-яЁё]/u.test(entry.promptPhraseRu) ||
        !/[А-Яа-яЁё]/u.test(entry.descriptionRu) ||
        /[ЂЃ‚ѓ„…†‡€‰Љ‹ЊЌЋЏђљњќћџ]/u.test(text);
    })).toEqual([]);
  });

  it("separates unregistered physical norms by dimensional and applicability blockers", () => {
    type PhysicalPack = {
      work_group: string;
      norm_items: Array<{
        norm_id: string;
        parameters: string[];
        unit: string;
      }>;
    };
    const root = path.resolve(process.cwd(), "data/estimate-norms/professional");
    const basisById: Readonly<Record<string, string>> =
      PROFESSIONAL_NORM_PACK_BASIS_PARAMETER_BY_NORM_ID;
    const specs = fs.readdirSync(root)
      .filter((name) => name.endsWith(".json") && !name.includes("remediation-plan"))
      .flatMap((name) => {
        const pack = JSON.parse(fs.readFileSync(path.join(root, name), "utf8")) as PhysicalPack;
        return pack.norm_items.map((item) => {
          const basisParameter = basisById[item.norm_id];
          return {
            norm_id: item.norm_id,
            work_group: pack.work_group,
            basis_parameter: basisParameter,
            work_basis_unit: inferProfessionalNormPackBasisUnit(basisParameter),
            output_unit: item.unit,
            required_parameter_keys: item.parameters,
          };
        });
      });
    const inventory = inspectProductionNormBindingCandidates(specs);
    const unregistered = inventory.filter((item) => !item.registered);
    const withCandidates = unregistered.filter((item) => item.dimensional_candidate_rows_count > 0);

    expect(inventory).toHaveLength(59);
    expect(inventory.filter((item) => item.registered)).toHaveLength(37);
    expect(unregistered).toHaveLength(22);
    expect(inventory.filter((item) => item.binding_route === "CANONICAL_V4_APPLICABILITY")
      .map((item) => item.norm_id)).toEqual([
      "air_conditioning_daikin_3mxs_k_additional_refrigerant_kg_m_v1",
      "baseboards_forbo_232_mounting_adhesive_upper_ml_linear_m_v1",
      "ceilings_knauf_d112_standard_wall_fastener_piece_m2_v1",
      "drywall_knauf_fugenfueller_perimeter_joint_kg_linear_m_v1",
      "electrical_legrand_p31_tray_joint_m6_fasteners_piece_joint_v1",
      "flooring_ceresit_cn69_self_leveling_scope_2_10mm_v1",
      "heating_uponor_ufh_pipe_m_m2_150mm_spacing_v1",
      "plumbing_wavin_hep2o_15mm_horizontal_clip_spacing_v1",
      "plumbing_wavin_hep2o_15mm_vertical_clip_spacing_v1",
      "plumbing_wavin_hep2o_22mm_horizontal_clip_spacing_v1",
      "plumbing_wavin_hep2o_smartsleeve_piece_connection_v1",
      "ventilation_lindab_vsr_duct_linear_m_route_v1",
    ]);
    expect(inventory.find((item) => item.norm_id === "heating_uponor_ufh_pipe_m_m2_150mm_spacing_v1"))
      .toMatchObject({
        registered: true,
        binding_route: "CANONICAL_V4_APPLICABILITY",
        binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
        disposition: "REGISTERED_EXECUTABLE_BINDING",
      });
    expect(withCandidates.map((item) => item.norm_id)).toEqual([
      "fire_safety_siemens_sinteso_base_piece_per_detector_point_v1",
      "flooring_ceresit_ct17_primer_flooring_l_m2_v1",
      "low_voltage_legrand_049272_cable_linear_m_route_v1",
      "sewerage_wavin_osma_110mm_3m_pipe_linear_m_route_v1",
      "tile_ceresit_cm11_plus_adhesive_kg_m2_notch_4_12_v1",
      "tile_ceresit_ct17_primer_l_m2_absorbent_substrate_v1",
    ]);
    expect(withCandidates.every((item) =>
      item.disposition === "DIMENSIONAL_CANDIDATE_REVIEW_REQUIRED" &&
      item.unresolved_applicability_keys.length > 0
    )).toBe(true);
    expect(unregistered.filter((item) => item.dimensional_candidate_rows_count === 0)).toHaveLength(16);
  });
});
