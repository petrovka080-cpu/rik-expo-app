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
    expect(inventory.filter((item) => item.registered)).toHaveLength(43);
    expect(unregistered).toHaveLength(16);
    expect(inventory.filter((item) => item.binding_route === "CANONICAL_V4_APPLICABILITY")
      .map((item) => item.norm_id)).toEqual([
      "air_conditioning_daikin_3mxs_k_additional_refrigerant_kg_m_v1",
      "baseboards_forbo_232_mounting_adhesive_upper_ml_linear_m_v1",
      "ceilings_knauf_d112_standard_wall_fastener_piece_m2_v1",
      "drywall_knauf_fugenfueller_perimeter_joint_kg_linear_m_v1",
      "electrical_legrand_p31_tray_joint_m6_fasteners_piece_joint_v1",
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
      "low_voltage_legrand_049272_cable_linear_m_route_v1",
      "sewerage_wavin_osma_110mm_3m_pipe_linear_m_route_v1",
    ]);
    expect(withCandidates.every((item) =>
      item.disposition === "DIMENSIONAL_CANDIDATE_REVIEW_REQUIRED" &&
      item.unresolved_applicability_keys.length > 0
    )).toBe(true);
    expect(unregistered.filter((item) => item.dimensional_candidate_rows_count === 0)).toHaveLength(13);
  });
});
