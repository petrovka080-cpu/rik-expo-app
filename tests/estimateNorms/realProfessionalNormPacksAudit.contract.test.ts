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

    expect(basisParameters).toHaveLength(33);
    expect(Object.keys(PROFESSIONAL_NORM_PACK_BASIS_QUESTIONS_RU)).toHaveLength(31);
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
