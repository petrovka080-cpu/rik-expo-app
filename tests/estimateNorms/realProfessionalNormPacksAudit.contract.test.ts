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
    const reviewedPaintPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/paint.json"),
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
    const reviewedDrywallPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/drywall.json"),
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
        rate: { value: number; unit: string };
        waste_percent_default: number;
        applicability: Record<string, unknown>;
        rounding: { package_size: number; mode: string };
      }[];
    };
    const reviewedCleaningPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/cleaning.json"),
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
    const reviewedDeliveryPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/delivery.json"),
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
    const reviewedSeweragePack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/sewerage.json"),
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
        rate: { value: number; unit: string };
        waste_percent_default: number;
        applicability: Record<string, unknown>;
        rounding: { package_size: number; mode: string };
      }[];
    };
    const reviewedWindowsDoorsPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/windows_doors.json"),
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
        rate: { value: number; unit: string };
        waste_percent_default: number;
        applicability: Record<string, unknown>;
        rounding: { package_size: number; mode: string };
      }[];
    };
    const reviewedLowVoltagePack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/low_voltage.json"),
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
    expect(reviewedPaintPack).toMatchObject({
      source_pack_version: "2026.09-ceresit-ct54-ct17-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedPaintPack.review_evidence?.items).toHaveLength(2);
    expect(reviewedPaintPack.review_evidence?.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        norm_id: "paint_ceresit_ct54_silicate_two_coats_l_m2_v1",
        source_url: "https://datasheets.tdx.henkel.com/CERESIT-CT-54-en_GR.pdf",
        verified_facts: expect.arrayContaining([
          "average_assumed_consumption_is_approximately_0_3_l_per_m2_for_two_coats",
          "consumption_depends_on_substrate_smoothness_and_absorption",
          "fixed_average_must_not_be_used_without_two_coats_and_exact_substrate_applicability",
          "additional_waste_allowance_is_not_published",
        ]),
      }),
      expect.objectContaining({
        norm_id: "paint_ceresit_ct17_primer_l_m2_before_paint_v1",
        source_url: "https://datasheets.tdx.henkel.com/CERESIT-CT-17-en_GL.pdf",
        verified_facts: expect.arrayContaining([
          "published_consumption_is_a_range_from_0_1_to_0_5_l_per_m2",
          "primer_before_painting_may_be_diluted_one_to_one_or_used_undiluted_by_substrate",
          "fixed_lower_bound_must_not_be_used_without_selected_consumption_dilution_and_coat_count",
          "additional_waste_allowance_is_not_published",
        ]),
      }),
    ]));
    expect(reviewedPaintPack.norm_items.find((item) =>
      item.norm_id === "paint_ceresit_ct54_silicate_two_coats_l_m2_v1"))
      .toMatchObject({
        parameters: expect.arrayContaining([
          "area_m2",
          "coat_count",
          "substrate_absorption",
          "substrate_smoothness",
          "installation_location",
          "selected_container_size_l",
        ]),
        rate: {
          value: 0.3,
          unit: "average approximate l/m2 for two coats; depends on substrate smoothness and absorption",
        },
        waste_percent_default: 0,
        applicability: expect.objectContaining({
          coat_count: 2,
          rate_depends_on: ["substrate_smoothness", "substrate_absorption"],
          fixed_average_requires_exact_applicability_confirmation: true,
          simple_rate_multiplication_forbidden: true,
          documented_container_sizes_l: [3.5, 15],
        }),
        rounding: {
          package_size: 3.5,
          mode: "approximate_net_litres_before_rounding_to_explicitly_selected_3_5_or_15_l_container",
        },
      });
    expect(reviewedDrywallPack).toMatchObject({
      source_pack_version: "2026.09-knauf-k462-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedDrywallPack.review_evidence?.items).toHaveLength(2);
    expect(reviewedDrywallPack.review_evidence?.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        norm_id: "drywall_knauf_fugenfueller_leicht_jointing_kg_m2_v1",
        source_url: "https://media.knauf.com/a/QkC2x6ziJobApENby855zK",
        supporting_source_urls: [
          "https://knauf.com/de-DE/p/produkt/fugenfueller-leicht-10719_0022",
        ],
        verified_facts: expect.arrayContaining([
          "zero_point_three_kg_per_m2_is_only_the_12_5_mm_hrak_single_layer_ceiling_cell",
          "table_rate_changes_with_board_type_thickness_layer_configuration_and_application",
          "direct_generic_drywall_area_multiplication_is_forbidden_without_an_exact_table_cell",
          "additional_waste_allowance_is_not_published",
        ]),
      }),
      expect.objectContaining({
        norm_id: "drywall_knauf_fugenfueller_perimeter_joint_kg_linear_m_v1",
        source_url: "https://media.knauf.com/a/QkC2x6ziJobApENby855zK",
        verified_facts: expect.arrayContaining([
          "perimeter_connection_jointing_method_is_knauf_trenn_fix",
          "perimeter_consumption_is_approximately_0_15_to_0_25_kg_per_linear_m",
          "exact_project_rate_must_be_selected_within_the_published_range",
          "additional_waste_allowance_is_not_published",
        ]),
      }),
    ]));
    expect(reviewedDrywallPack.norm_items.find((item) =>
      item.norm_id === "drywall_knauf_fugenfueller_leicht_jointing_kg_m2_v1"))
      .toMatchObject({
        parameters: expect.arrayContaining([
          "board_area_m2",
          "board_product_type",
          "board_thickness_mm",
          "board_layer_configuration",
          "construction_application",
          "selected_consumption_kg_m2",
        ]),
        rate: {
          value: 0.3,
          unit: "one exact table cell only: approximate kg/m2 for single-layer 12.5 mm Knauf HRAK board on a ceiling, excluding perimeter joints",
        },
        waste_percent_default: 0,
        applicability: expect.objectContaining({
          perimeter_connection_joints_excluded: true,
          exact_table_cell_required: true,
          simple_rate_multiplication_forbidden: true,
          documented_bag_sizes_kg: [5, 10, 25],
        }),
        rounding: {
          package_size: 5,
          mode: "approximate_net_kg_after_exact_table_cell_selection_before_explicit_5_10_or_25_kg_bag_rounding",
        },
      });
    expect(reviewedCleaningPack).toMatchObject({
      source_pack_version: "2026.09-tennant-t350-productivity-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedCleaningPack.review_evidence?.items).toMatchObject([{
      norm_id: "cleaning_tennant_t350_600mm_conventional_practical_hour_m2_v1",
      source_url: "https://www.tennantco.com/content/dam/tennant/tennantco/products/machines/scrubber%20stand-on/T350/t350-brochure-industrial-en-noam.pdf",
      verified_facts: expect.arrayContaining([
        "exact_machine_variant_is_t350_24_inch_600_mm_dual_disk",
        "conventional_practical_scrubbing_coverage_is_2795_m2_per_hour",
        "reciprocal_equipment_hour_rate_is_derived_not_directly_published",
        "supplier_billing_increment_is_not_published_in_the_brochure",
      ]),
    }]);
    expect(reviewedCleaningPack.norm_items).toMatchObject([{
      norm_id: "cleaning_tennant_t350_600mm_conventional_practical_hour_m2_v1",
      parameters: expect.arrayContaining([
        "cleanable_hard_floor_area_m2",
        "machine_variant",
        "cleaning_path_mm",
        "cleaning_technology_mode",
        "required_pass_count",
        "obstruction_factor",
        "dump_fill_cycle_allowance",
        "battery_runtime_allowance",
      ]),
      rate: {
        value: 0.0003577818,
        unit: "derived equipment hour/m2 per pass; reciprocal of the published 2795 m2/hour conventional practical rate",
      },
      waste_percent_default: 0,
      applicability: expect.objectContaining({
        machine_variant: "24_inch_600_mm_dual_disk",
        cleaning_path_mm: 600,
        cleaning_technology_mode: "conventional",
        manufacturer_practical_productivity_m2_per_hour: 2795,
        different_ec_h2o_practical_productivity_m2_per_hour: 2874,
        reciprocal_rate_is_derived: true,
        project_specific_obstruction_soil_cycle_and_battery_adjustments_required: true,
        supplier_billing_increment_not_published: true,
      }),
      rounding: {
        package_size: 1,
        mode: "net_equipment_hours_before_separate_supplier_billing_rule",
      },
    }]);
    expect(reviewedDeliveryPack).toMatchObject({
      source_pack_version: "2026.09-ford-transit-25-5my-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedDeliveryPack.review_evidence?.items).toMatchObject([{
      norm_id: "delivery_ford_transit_v363_max_payload_trip_per_kg_v1",
      source_url: "https://www.ford.co.uk/content/dam/guxeu/uk/documents/brochures/cars/BRO-transit_van_25.5MY.pdf",
      verified_facts: expect.arrayContaining([
        "ford_transit_25_5my_guide_page_13_lists_500_l4_h3_payload_range_2357_to_2412_kg",
        "ford_product_page_headline_2357_kg_is_an_up_to_family_claim_not_a_universal_variant_payload",
        "ford_recommends_adding_5_percent_of_kerb_mass_as_margin_when_loading_near_maximum",
        "trip_count_is_derived_and_requires_both_selected_payload_and_selected_volume_limits",
      ]),
    }]);
    expect(reviewedDeliveryPack.norm_items).toMatchObject([{
      norm_id: "delivery_ford_transit_v363_max_payload_trip_per_kg_v1",
      parameters: expect.arrayContaining([
        "cargo_weight_kg",
        "cargo_volume_m3",
        "selected_vehicle_model_and_derivative",
        "selected_verified_usable_payload_kg",
        "selected_verified_usable_loadspace_m3",
        "selected_verified_kerb_mass_kg",
        "payload_margin_for_error_kg",
        "axle_load_limits_confirmed",
        "load_securing_and_compatibility_confirmed",
      ]),
      rate: {
        value: 0.0004242681,
        unit: "reference trip/kg reciprocal for the 2357 kg headline payload only; not an automatic production rate",
      },
      waste_percent_default: 0,
      applicability: expect.objectContaining({
        reference_derivative: "Transit Van 500 L4 H3",
        manufacturer_guide_payload_range_kg: [2357, 2412],
        manufacturer_headline_payload_kg: 2357,
        manufacturer_headline_max_loadspace_m3: 15.1,
        selected_vehicle_derivative_payload_and_volume_required: true,
        headline_values_must_not_be_applied_to_an_arbitrary_transit_variant: true,
        reference_rate_not_for_automatic_production_binding: true,
        supplier_billing_rule_not_published: true,
      }),
      rounding: {
        package_size: 1,
        mode: "ceil_after_selected_payload_and_volume_constraints",
      },
    }]);
    expect(reviewedSeweragePack).toMatchObject({
      source_pack_version: "2026.09-wavin-osma-c3766bk-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedSeweragePack.review_evidence?.items).toMatchObject([{
      norm_id: "sewerage_wavin_osma_110mm_3m_pipe_linear_m_route_v1",
      source_url: "https://wavin.com/ie/p/54d3a658-da71-461c-805f-4c98e980ce46/wavin-soil-pipe-socketed-110mm-black-3m",
      supporting_source_urls: expect.arrayContaining([
        "https://mediahub.wavin.com/m/6811dbf1eb045f1/original/Wavin-IE-Above-and-Below-Ground-Trade-Catalogue-May-2023.pdf",
        "https://mediahub.wavin.com/m/1ddf1fabd25f2f2f/original/Wavin-Osma-Soil-and-Waste-PIM-SW206-Aug25.pdf",
      ]),
      verified_facts: expect.arrayContaining([
        "exact_product_is_c3766bk_sap_3080894_ean_5098987303844",
        "catalogue_lists_c3766bk_as_3_m_pipe_to_en_1453_1",
        "manufacturer_manual_requires_system_and_diameter_design_from_connected_appliances",
        "one_pipe_metre_per_route_metre_is_geometric_identity_not_a_published_consumption_norm",
        "manufacturer_sources_do_not_publish_a_general_cutting_waste_percentage",
      ]),
    }]);
    expect(reviewedSeweragePack.norm_items).toMatchObject([{
      norm_id: "sewerage_wavin_osma_110mm_3m_pipe_linear_m_route_v1",
      parameters: expect.arrayContaining([
        "approved_pipe_route_linear_m",
        "system_application",
        "hydraulic_and_appliance_design_reference",
        "selected_nominal_diameter",
        "selected_product_code",
        "selected_commercial_pipe_length_m",
        "fitting_schedule",
        "fitting_socket_and_insertion_layout",
        "reusable_cut_length_plan",
        "project_cutting_allowance_percent",
      ]),
      rate: {
        value: 1,
        unit: "geometric pipe linear m/approved route linear m before designed fittings, socket insertion and cut reuse; not a published consumption rate",
      },
      waste_percent_default: 0,
      applicability: expect.objectContaining({
        catalog_code: "C3766BK",
        standard: "EN 1453-1",
        outer_pipe_diameter_mm: 110,
        piece_length_m: 3,
        alternative_catalogue_lengths_m: [4, 6],
        diameter_and_system_design_required: true,
        rate_is_geometric_identity_not_manufacturer_consumption_norm: true,
        additional_waste_not_published: true,
        automatic_production_binding_for_generic_sewerage_forbidden: true,
      }),
      rounding: {
        package_size: 3,
        mode: "route_takeoff_before_explicit_product_length_cut_and_socket_layout",
      },
    }]);
    expect(reviewedWindowsDoorsPack).toMatchObject({
      source_pack_version: "2026.09-soudal-9900539-tds-2026-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedWindowsDoorsPack.review_evidence?.items).toMatchObject([{
      norm_id: "windows_doors_soudafoam_genius_can_per_joint_m_v1",
      source_url: "https://www.soudal.co.uk/sites/default/files/soudal_api/document/900012953/TDS_Soudal_Soudafoam_Window_%26_Door_Genius_9900539_English_Soudal_UK.pdf",
      supporting_source_urls: [
        "https://www.soudal.co.uk/pro/products/expanding-foam/1k-pu-foams/soudafoam-window-door-genius",
      ],
      verified_facts: expect.arrayContaining([
        "tds_master_code_is_9900539_revision_08_05_2026",
        "exact_genius_product_packaging_is_600_ml_aerosol_net",
        "tds_joint_yield_is_approximately_16_m_for_600_ml_to_en_17333_1",
        "product_page_750_ml_26_m_gun_grade_feature_must_not_replace_exact_genius_tds_value",
        "joint_yield_test_geometry_is_not_stated_in_the_product_tds",
        "manufacturer_does_not_publish_a_general_project_waste_percentage",
      ]),
    }]);
    expect(reviewedWindowsDoorsPack.norm_items).toMatchObject([{
      norm_id: "windows_doors_soudafoam_genius_can_per_joint_m_v1",
      parameters: expect.arrayContaining([
        "qualified_joint_length_linear_m",
        "joint_width_mm",
        "joint_depth_mm",
        "total_joint_volume_l",
        "exact_product_master_code",
        "package_volume_ml",
        "en_17333_1_reference_joint_geometry",
        "onsite_validated_joint_yield_m_per_can",
        "external_uv_and_weather_protection_scope",
      ]),
      rate: {
        value: 0.0625,
        unit: "reference 600 ml can/linear m reciprocal of the current TDS approximate 16 m EN 17333-1 joint yield; not a fixed project rate",
      },
      waste_percent_default: 0,
      applicability: expect.objectContaining({
        master_code: "9900539",
        tds_revision: "08-05-2026",
        reference_package_ml: 600,
        joint_yield_m_en_17333_1_approximate: 16,
        product_page_different_gun_grade_reference_ml: 750,
        product_page_different_gun_grade_reference_yield_m: 26,
        joint_cross_section_and_reference_test_geometry_required: true,
        onsite_yield_validation_required: true,
        additional_waste_not_published: true,
        automatic_production_binding_without_joint_geometry_forbidden: true,
      }),
      rounding: {
        package_size: 1,
        mode: "ceil_after_exact_joint_geometry_and_onsite_yield_validation",
      },
    }]);
    expect(reviewedLowVoltagePack).toMatchObject({
      source_pack_version: "2026.09-legrand-049272-bus-scs-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedLowVoltagePack.review_evidence?.items).toMatchObject([{
      norm_id: "low_voltage_legrand_049272_cable_linear_m_route_v1",
      source_url: "https://www.legrand.com/ecatalogue/en/catalog/products/cable-200m-reel-halogen-free-049272",
      supporting_source_urls: expect.arrayContaining([
        "https://assets.legrand.com/pim/NP-FT-GT/ST-00000381-EN.pdf",
        "https://www.legrand.com/ecatalogue/en/legrand-ecat/generatepdf/70091",
      ]),
      verified_facts: expect.arrayContaining([
        "exact_reference_is_049272_ean_3414971327986",
        "product_is_bus_scs_cable_for_system_power_and_operating_signals_not_a_generic_low_voltage_cable",
        "manufacturer_delivery_length_is_200_m_on_a_reel",
        "current_ecatalogue_and_2018_technical_sheet_differ_on_underground_suitability_so_current_project_approval_is_required",
        "one_cable_metre_per_route_metre_is_geometric_identity_not_a_published_project_allowance",
      ]),
    }]);
    expect(reviewedLowVoltagePack.norm_items).toMatchObject([{
      norm_id: "low_voltage_legrand_049272_cable_linear_m_route_v1",
      parameters: expect.arrayContaining([
        "approved_route_length_linear_m",
        "circuit_count_and_point_to_point_schedule",
        "bus_scs_system_compatibility_confirmed",
        "power_cable_segregation_confirmed",
        "device_and_panel_termination_allowance_m",
        "service_loop_allowance_m",
        "vertical_drop_and_riser_allowance_m",
        "reusable_reel_remnant_plan",
        "installed_circuit_test_and_certification_scope",
      ]),
      rate: {
        value: 1,
        unit: "geometric cable linear m/approved BUS-SCS circuit route linear m before terminations, service loops, drops and reel cut plan; not a published consumption norm",
      },
      waste_percent_default: 0,
      applicability: expect.objectContaining({
        manufacturer_reference: "Legrand 049272",
        system: "BUS-SCS",
        manufacturer_catalogue_context: "nurse_call_system_accessory",
        conductor_cross_section_mm2: 0.56,
        cores: 2,
        manufacturer_delivery_reel_m: 200,
        power_circuit_above_50_v_coinstallation_forbidden: true,
        underground_suitability_requires_current_project_confirmation_due_source_revision_conflict: true,
        rate_is_geometric_identity_not_manufacturer_consumption_norm: true,
        additional_waste_not_published: true,
        automatic_production_binding_for_generic_low_voltage_forbidden: true,
      }),
      rounding: {
        package_size: 200,
        mode: "aggregate_approved_bus_scs_circuits_before_explicit_reel_cut_plan",
      },
    }]);
    expect(reviewedDrywallPack.norm_items.find((item) =>
      item.norm_id === "drywall_knauf_fugenfueller_perimeter_joint_kg_linear_m_v1"))
      .toMatchObject({
        parameters: [
          "perimeter_linear_m",
          "cladding_thickness_mm",
          "perimeter_joint_consumption_kg_linear_m",
          "perimeter_connection_joint_method",
          "system_passport_reference",
          "material_certificate_reference",
        ],
        waste_percent_default: 0,
        applicability: expect.objectContaining({
          perimeter_connection_joint_method: "KNAUF_TRENN_FIX",
          rate_range_kg_linear_m: [0.15, 0.25],
          selected_consumption_required: true,
          runtime_product_profile_selected_bag_size_kg: 25,
          additional_waste_not_published: true,
        }),
        rounding: {
          package_size: 25,
          mode: "net_kg_before_rounding_to_confirmed_25kg_profile_package",
        },
      });
    expect(reviewedPaintPack.norm_items.find((item) =>
      item.norm_id === "paint_ceresit_ct17_primer_l_m2_before_paint_v1"))
      .toMatchObject({
        parameters: expect.arrayContaining([
          "area_m2",
          "substrate_evenness",
          "substrate_absorbency",
          "selected_consumption_l_m2",
          "dilution_ratio",
          "coat_count",
        ]),
        rate: {
          value: 0.1,
          unit: "published lower bound only; project rate must be selected within 0.1-0.5 l/m2",
        },
        waste_percent_default: 0,
        applicability: expect.objectContaining({
          rate_range_l_m2: [0.1, 0.5],
          painting_dilution_options: ["undiluted", "water_1_to_1"],
          selected_consumption_dilution_and_coat_count_required: true,
          simple_rate_multiplication_forbidden: true,
        }),
        rounding: {
          package_size: 1,
          mode: "net_litres_before_rounding_to_explicitly_selected_1_2_5_or_10_l_container",
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
    expect(inventory.filter((item) => item.registered)).toHaveLength(34);
    expect(unregistered).toHaveLength(25);
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
      "drywall_knauf_fugenfueller_leicht_jointing_kg_m2_v1",
      "fire_safety_siemens_sinteso_base_piece_per_detector_point_v1",
      "flooring_ceresit_ct17_primer_flooring_l_m2_v1",
      "low_voltage_legrand_049272_cable_linear_m_route_v1",
      "paint_ceresit_ct17_primer_l_m2_before_paint_v1",
      "paint_ceresit_ct54_silicate_two_coats_l_m2_v1",
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
