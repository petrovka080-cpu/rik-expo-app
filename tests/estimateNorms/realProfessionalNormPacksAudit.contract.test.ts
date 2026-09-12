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
  PROFESSIONAL_NORM_PACK_GROUPS,
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
    const reviewedLandscapingPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/landscaping.json"),
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
    const reviewedFireSafetyPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/fire_safety.json"),
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
    const reviewedEquipmentRentPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/equipment_rent.json"),
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
    const reviewedEarthworksPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/earthworks.json"),
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
    const reviewedDemolitionPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/demolition.json"),
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
    const reviewedDocumentationPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/documentation.json"),
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
    const reviewedServicesPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/services.json"),
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
        unit: string;
        rate: { value: number; unit: string };
        waste_percent_default: number;
        applicability: Record<string, unknown>;
        rounding: { package_unit: string; package_size: number; mode: string };
      }[];
    };
    const reviewedRoadworksPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/roadworks.json"),
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
    const reviewedWasteRemovalPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/waste_removal.json"),
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
        source: { url: string };
      }[];
    };
    const reviewedConcretePack = JSON.parse(fs.readFileSync(
      path.resolve(process.cwd(), "data/estimate-norms/professional/concrete.json"),
      "utf8",
    ));
    const reviewedFormworkPack = JSON.parse(fs.readFileSync(
      path.resolve(process.cwd(), "data/estimate-norms/professional/formwork.json"),
      "utf8",
    ));
    const reviewedReinforcementPack = JSON.parse(fs.readFileSync(
      path.resolve(process.cwd(), "data/estimate-norms/professional/reinforcement.json"),
      "utf8",
    ));
    const reviewedMasonryPack = JSON.parse(fs.readFileSync(
      path.resolve(process.cwd(), "data/estimate-norms/professional/masonry.json"),
      "utf8",
    ));
    const reviewedElectricalPack = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "data/estimate-norms/professional/electrical.json"),
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
    expect(reviewedLandscapingPack).toMatchObject({
      source_pack_version: "2026.09-rain-bird-xfd-d39717e-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedLandscapingPack.review_evidence?.items).toMatchObject([{
      norm_id: "landscaping_rain_bird_xfd_dripline_m_route_m_v1",
      source_url: "https://www.rainbird.com/sites/default/files/media/documents/2022-04/d39717e-xfd-dripline-tech-spec-042122.pdf",
      supporting_source_urls: [
        "https://www.rainbird.com/sites/default/files/media/documents/2022-01/d40024c-xf-series-dripline-design-installation-and-maintenance-guide-011022.pdf",
      ],
      verified_facts: expect.arrayContaining([
        "technical_specification_identifier_is_d39717e_04_22",
        "published_emitter_spacings_are_30_5_and_45_7_cm",
        "published_emitter_flows_are_2_3_and_3_5_l_per_hour_in_d39717e",
        "maximum_lateral_length_requires_exact_pressure_emitter_spacing_and_flow_table_cell",
        "design_guide_requires_120_mesh_filtration",
        "manufacturer_sources_do_not_publish_a_general_project_cutting_waste_percentage",
      ]),
    }]);
    expect(reviewedLandscapingPack.norm_items).toMatchObject([{
      norm_id: "landscaping_rain_bird_xfd_dripline_m_route_m_v1",
      parameters: expect.arrayContaining([
        "approved_dripline_route_linear_m",
        "irrigated_planting_area_and_layout",
        "exact_xfd_model",
        "emitter_spacing_cm",
        "emitter_flow_l_h",
        "zone_inlet_pressure_bar",
        "maximum_lateral_length_table_check",
        "zone_total_flow_l_h",
        "filtration_mesh",
        "selected_coil_length_m",
        "reusable_coil_remainder_plan",
      ]),
      rate: {
        value: 1,
        unit: "geometric dripline linear m/hydraulically approved route linear m before fittings, headers, flush points and coil cut plan; not a published design allowance",
      },
      waste_percent_default: 0,
      applicability: expect.objectContaining({
        technical_specification: "D39717E 04/22",
        outer_diameter_mm: 16,
        emitter_spacing_cm: [30.5, 45.7],
        emitter_flow_l_h: [2.3, 3.5],
        pressure_range_bar: [0.58, 4.14],
        required_filtration_mesh: 120,
        available_coil_lengths_m: [30.5, 76.2, 152.4],
        exact_maximum_lateral_table_cell_required: true,
        rate_is_geometric_identity_not_manufacturer_consumption_norm: true,
        additional_waste_not_published: true,
        automatic_production_binding_for_generic_landscaping_forbidden: true,
      }),
      rounding: {
        package_size: 1,
        mode: "net_approved_route_m_before_explicit_30_5_76_2_or_152_4_m_coil_cut_plan",
      },
    }]);
    expect(reviewedFireSafetyPack).toMatchObject({
      source_pack_version: "2026.09-siemens-fdb221-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedFireSafetyPack.review_evidence?.items).toMatchObject([{
      norm_id: "fire_safety_siemens_sinteso_base_piece_per_detector_point_v1",
      source_url: "https://hit.sbt.siemens.com/RWD/AssetsByProduct.aspx?RC=GB&asset_type=Data+Sheet+for+Product&lang=en&prodId=A5Q00001664",
      supporting_source_urls: expect.arrayContaining([
        "https://mall.industry.siemens.com/mall/NO/NO/Catalog/Product/?mlfb=A5Q00001664",
        "https://sid.siemens.com/v/u/A6V15698430",
      ]),
      verified_facts: expect.arrayContaining([
        "exact_order_number_is_a5q00001664_and_product_number_is_fdb221",
        "fdb221_is_an_addressable_detector_base_not_a_detector",
        "product_packaging_quantity_is_one_piece",
        "one_base_per_point_is_valid_only_for_an_approved_compatible_detector_point",
        "detector_spacing_and_point_count_are_not_published_by_this_product_datasheet",
      ]),
    }]);
    expect(reviewedFireSafetyPack.norm_items).toMatchObject([{
      norm_id: "fire_safety_siemens_sinteso_base_piece_per_detector_point_v1",
      parameters: expect.arrayContaining([
        "designed_detector_point_count",
        "approved_fire_alarm_design_and_code_basis",
        "selected_detector_product_number",
        "selected_base_reference",
        "detector_base_compatibility_document_revision",
        "installation_environment",
        "humid_or_wet_base_attachment_scope",
        "project_spare_quantity",
        "commissioning_and_acceptance_scope",
      ]),
      rate: {
        value: 1,
        unit: "FDB221 addressable detector base/approved compatible detector point",
      },
      waste_percent_default: 0,
      applicability: expect.objectContaining({
        order_number: "A5Q00001664",
        product_number: "FDB221",
        product_type: "addressable_detector_base",
        maximum_surface_supply_cable_diameter_mm: 6,
        connection_cable_capacity_mm2: [0.2, 1.5],
        exact_detector_compatibility_confirmation_required: true,
        automatic_area_based_detector_count_forbidden: true,
        project_spares_must_be_explicit: true,
        additional_waste_not_published: true,
        automatic_production_binding_for_generic_fire_safety_forbidden: true,
      }),
      rounding: {
        package_size: 1,
        mode: "exact_approved_compatible_point_count_plus_explicit_project_spares",
      },
    }]);
    expect(reviewedEquipmentRentPack).toMatchObject({
      source_pack_version: "2026.09-united-rentals-ca-2026-09-02-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedEquipmentRentPack.review_evidence?.items).toMatchObject([{
      norm_id: "equipment_rent_united_rentals_one_shift_hours_day_v1",
      source_url: "https://www.unitedrentals.com/legal/rental-service-terms-ca-eng",
      verified_facts: expect.arrayContaining([
        "canada_rental_service_terms_last_update_is_2026_09_02",
        "normal_one_shift_usage_is_8_hours_per_day_40_per_week_and_160_per_four_week_period",
        "rental_charges_accrue_during_saturdays_sundays_and_holidays",
        "delivery_pickup_refueling_taxes_transport_environmental_and_miscellaneous_charges_are_separate",
        "eight_hours_is_a_normal_usage_allowance_not_a_complete_rental_price_formula",
      ]),
    }]);
    expect(reviewedEquipmentRentPack.norm_items).toMatchObject([{
      norm_id: "equipment_rent_united_rentals_one_shift_hours_day_v1",
      parameters: expect.arrayContaining([
        "shift_count",
        "required_equipment_operating_hours",
        "equipment_productivity_calculation_reference",
        "selected_equipment_and_power_status",
        "supplier_and_jurisdiction",
        "supplier_terms_revision_confirmed",
        "rental_out_datetime",
        "scheduled_in_or_confirmed_off_rent_datetime",
        "calendar_rental_period",
        "double_or_triple_shift_usage",
        "delivery_and_pickup_scope",
        "fuel_and_refueling_scope",
      ]),
      rate: {
        value: 8,
        unit: "normal-use equipment operating hours/one supplier-defined shift day; calendar billing period and price are separate",
      },
      waste_percent_default: 0,
      applicability: expect.objectContaining({
        supplier: "United Rentals of Canada Inc.",
        jurisdiction: "Canada",
        terms_last_update: "2026-09-02",
        one_shift_hours_per_day: 8,
        one_shift_hours_per_week: 40,
        one_shift_hours_per_four_week_period: 160,
        double_shift_rate_multiplier_for_power_equipment: 1.5,
        triple_shift_rate_multiplier_for_power_equipment: 2,
        weekends_and_holidays_accrue_rental_charges: true,
        equipment_productivity_must_be_calculated_separately: true,
        eight_hour_allowance_is_not_complete_billing_formula: true,
        automatic_production_binding_for_generic_equipment_rent_forbidden: true,
      }),
      rounding: {
        package_size: 8,
        mode: "supplier_agreement_calendar_period_and_shift_usage_schedule_required",
      },
    }]);
    expect(reviewedEarthworksPack).toMatchObject({
      source_pack_version: "2026.09-fhwa-fp24-section208-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedEarthworksPack.review_evidence?.items).toMatchObject([{
      norm_id: "earthworks_fhwa_fp24_structural_backfill_lifts_per_m_v1",
      source_url: "https://highways.fhwa.dot.gov/federal-lands/specs/fp-24.pdf",
      supporting_source_urls: expect.arrayContaining([
        "https://highways.dot.gov/federal-lands/specs/fp-24",
        "https://highways.dot.gov/federal-lands/specs/cfl-los/fp-24-library",
      ]),
      verified_facts: expect.arrayContaining([
        "section_208_09_limits_structural_backfill_to_6_inch_compacted_horizontal_lifts",
        "section_208_10_requires_at_least_95_percent_of_aashto_t99_method_c_maximum_density",
        "table_208_1_requires_two_in_place_density_tests_per_structural_backfill_lift",
        "rocky_material_not_testable_by_t99_t310_uses_a_separate_visible_consolidation_rule",
        "reciprocal_6_5616798_lifts_per_m_is_a_derived_minimum_count_at_maximum_lift_thickness",
      ]),
    }]);
    expect(reviewedEarthworksPack.norm_items).toMatchObject([{
      norm_id: "earthworks_fhwa_fp24_structural_backfill_lifts_per_m_v1",
      parameters: expect.arrayContaining([
        "compacted_backfill_depth_m",
        "fhwa_fp24_project_applicability_confirmed",
        "project_supplemental_specification_revision",
        "material_source_and_section_704_01_qualification",
        "selected_compacted_lift_thickness_m",
        "aashto_t99_method_c_maximum_dry_density",
        "aashto_t310_or_approved_in_place_test_method",
        "density_test_count_per_lift",
        "rocky_material_exception_procedure",
        "regional_code_and_geotechnical_specification",
      ]),
      rate: {
        value: 6.5616798,
        unit: "derived minimum lifts/m compacted structural-backfill depth at the 0.1524 m maximum; thinner selected lifts increase count",
      },
      waste_percent_default: 0,
      applicability: expect.objectContaining({
        specification: "FHWA FP-24",
        section: "208 Structural Excavation and Backfill",
        maximum_compacted_lift_in: 6,
        maximum_compacted_lift_m: 0.1524,
        minimum_density_percent_of_aashto_t99_method_c: 95,
        structural_backfill_density_tests_per_lift: 2,
        minimum_concrete_design_strength_before_backfill_percent: 80,
        selected_lift_thickness_must_not_exceed_0_1524: true,
        not_applicable_to_generic_earthworks_or_embankment_without_section_208_scope: true,
        automatic_production_binding_for_generic_earthworks_forbidden: true,
      }),
      rounding: {
        package_size: 1,
        mode: "ceil_selected_lift_count_after_section_208_and_project_specification_confirmation",
      },
    }]);
    expect(reviewedDemolitionPack).toMatchObject({
      source_pack_version: "2026.09-krer46-official-scope-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedDemolitionPack.review_evidence?.items).toMatchObject([{
      norm_id: "demolition_krer46_selected_table_same_unit_routing_v1",
      source_url: "https://minstroy.gov.kg/ru/kyzmat/459/show",
      supporting_source_urls: expect.arrayContaining([
        "https://minstroy.gov.kg/ru/state_program/download-pdf/no46rabotyprirekonstrukciizdanijisooruzenij_compressed-2196908579b9588d7.46696526.pdf",
        "https://minstroy.gov.kg/ru/kyzmat/12",
      ]),
      verified_facts: expect.arrayContaining([
        "official_ministry_page_identifies_collection_46_as_works_during_reconstruction_of_buildings_and_structures",
        "published_scope_includes_strengthening_replacement_dismantling_and_erection_of_individual_structural_elements",
        "official_landing_page_does_not_publish_a_single_generic_demolition_rate",
        "exact_collection_table_work_composition_and_measurement_unit_are_required_before_resource_application",
        "value_one_is_only_a_same_unit_routing_identity_not_a_cost_or_resource_norm",
      ]),
    }]);
    expect(reviewedDemolitionPack.norm_items).toMatchObject([{
      norm_id: "demolition_krer46_selected_table_same_unit_routing_v1",
      parameters: expect.arrayContaining([
        "measured_project_quantity",
        "demolished_element_type_and_material",
        "reconstruction_expansion_or_technical_re_equipment_scope",
        "selected_norm_collection",
        "selected_collection_edition_and_amendments",
        "selected_krer46_table_code",
        "selected_table_work_composition",
        "project_quantity_unit",
        "selected_table_measurement_unit",
        "quantity_normalization_calculation",
        "applicable_methodical_instruction_coefficients",
        "selected_table_resource_rows",
      ]),
      rate: {
        value: 1,
        unit: "same-unit routing identity after project quantity is normalized to the exact selected KRER table unit; not a resource or cost rate",
      },
      waste_percent_default: 0,
      applicability: expect.objectContaining({
        jurisdiction: "Kyrgyz Republic",
        collection: "КРЕР №46 Работы при реконструкции зданий и сооружений",
        exact_table_code_work_composition_and_measurement_unit_required: true,
        resource_and_cost_rates_blocked_until_exact_table_selected: true,
        current_application_instructions_and_amendments_required: true,
        repair_collection_applicability_requires_estimator_review: true,
        rate_is_routing_identity_not_published_norm: true,
        automatic_production_binding_for_generic_demolition_forbidden: true,
      }),
      rounding: {
        package_size: 1,
        mode: "no_rounding_until_exact_table_measurement_and_precision_rule_selected",
      },
    }]);
    expect(reviewedDocumentationPack).toMatchObject({
      source_pack_version: "2026.09-kg-design-price-official-routing-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedDocumentationPack.review_evidence?.items).toMatchObject([{
      norm_id: "documentation_kg_selected_design_price_unit_routing_v1",
      source_url: "https://minstroy.gov.kg/ru/kyzmat/354/show",
      supporting_source_urls: expect.arrayContaining([
        "https://minstroy.gov.kg/ru/state_program/download-pdf/razdel9proektnyeraboty9_compressed-27468fb53dae260e8.84202859.pdf",
        "https://minstroy.gov.kg/index.php/kg/state_program/download-pdf/prikazot28aprela2022godano52npa_compressed-25868e3850a3ecfb9.81892156.pdf",
        "https://minstroy.gov.kg/ru/kyzmat/12",
      ]),
      verified_facts: expect.arrayContaining([
        "official_ministry_page_identifies_the_general_guidance_for_estimating_design_work_in_the_kyrgyz_republic",
        "section_9_tables_select_objects_by_named_characteristic_capacity_range_and_table_measurement_unit",
        "section_9_application_instructions_distinguish_working_documentation_project_and_working_project_stages",
        "a_2022_official_amendment_order_exists_so_current_edition_and_amendments_must_be_confirmed",
        "value_one_is_only_a_same_unit_routing_identity_not_a_published_price_or_effort_norm",
      ]),
    }]);
    expect(reviewedDocumentationPack.norm_items).toMatchObject([{
      norm_id: "documentation_kg_selected_design_price_unit_routing_v1",
      parameters: expect.arrayContaining([
        "project_object_type",
        "design_stage",
        "selected_price_collection_section",
        "selected_collection_edition_and_amendments",
        "selected_price_table_and_row",
        "project_capacity_measure",
        "project_capacity_unit",
        "selected_table_capacity_range",
        "selected_table_measurement_unit",
        "quantity_normalization_calculation",
        "applicable_design_stage_coefficient",
        "deliverable_composition",
        "current_price_level_conversion_and_indices",
      ]),
      rate: {
        value: 1,
        unit: "same-unit routing identity after project capacity is normalized to the exact selected collection table measure; not a published price or effort norm",
      },
      waste_percent_default: 0,
      applicability: expect.objectContaining({
        jurisdiction: "Kyrgyz Republic",
        exact_sector_section_and_table_required: true,
        exact_table_row_capacity_range_and_measurement_unit_required: true,
        design_stage_and_deliverable_composition_required: true,
        current_collection_edition_amendments_and_price_conversion_required: true,
        generic_percent_of_construction_cost_forbidden: true,
        price_and_effort_blocked_until_exact_collection_measure_selected: true,
        rate_is_routing_identity_not_published_norm: true,
        automatic_production_binding_for_generic_documentation_forbidden: true,
      }),
      rounding: {
        package_size: 1,
        mode: "no_rounding_until_exact_collection_table_measure_and_precision_rule_selected",
      },
    }]);
    expect(reviewedServicesPack).toMatchObject({
      source_pack_version: "2026.09-kg-author-supervision-cost-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedServicesPack.review_evidence?.items).toMatchObject([{
      norm_id: "services_kg_author_supervision_cost_fraction_v1",
      source_url: "https://minstroy.gov.kg/index.php/kg/state_program/download-pdf/prikazot28aprela2022godano52npa_compressed-25868e3850a3ecfb9.81892156.pdf",
      supporting_source_urls: expect.arrayContaining([
        "https://minstroy.gov.kg/kg/document/31/show",
        "https://minstroy.gov.kg/ru/kyzmat/354/show",
      ]),
      verified_facts: expect.arrayContaining([
        "amended_appendix_5_sets_author_supervision_cost_at_0_4_percent",
        "the_0_4_percent_basis_is_construction_estimated_cost_in_chapters_1_through_9_of_the_consolidated_estimate",
        "travel_to_and_from_the_construction_site_for_design_organization_staff_is_excluded",
        "the_order_does_not_define_a_normative_number_of_visits",
      ]),
    }]);
    expect(reviewedServicesPack.norm_items).toMatchObject([{
      norm_id: "services_kg_author_supervision_cost_fraction_v1",
      parameters: expect.arrayContaining([
        "construction_estimated_cost_chapters_1_9_currency",
        "author_supervision_required_for_object",
        "applicable_consolidated_estimate_chapters",
        "current_legal_applicability_and_amendments",
        "travel_to_and_from_site_required",
        "travel_cost_separate_calculation",
      ]),
      unit: "currency",
      rate: {
        value: 0.004,
        unit: "currency/currency; 0.4% of construction estimated cost in chapters 1-9 of the consolidated estimate",
      },
      waste_percent_default: 0,
      applicability: expect.objectContaining({
        jurisdiction: "Kyrgyz Republic",
        author_supervision_cost_percent: 0.4,
        construction_estimated_cost_basis_chapters: "1-9",
        exact_chapters_1_9_construction_estimated_cost_required: true,
        travel_to_and_from_site_is_not_included_in_author_supervision_cost: true,
        normative_visit_count_not_defined_by_source: true,
        automatic_visit_count_or_visit_cost_derivation_forbidden: true,
        automatic_production_binding_for_generic_services_forbidden: true,
      }),
      rounding: {
        package_unit: "currency",
        package_size: 0.01,
        mode: "apply_0_004_to_confirmed_chapters_1_9_cost_then_round_only_to_document_currency_precision",
      },
    }]);
    expect(reviewedServicesPack.norm_items.some((item) =>
      item.norm_id === "services_kg_author_supervision_confirmed_visit_unit_v1")).toBe(false);
    expect(reviewedRoadworksPack).toMatchObject({
      source_pack_version: "2026.09-krer27-table-27-06-020-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedRoadworksPack.review_evidence?.items).toMatchObject([{
      norm_id: "roadworks_krer27_06_020_norm_unit_per_m2_v1",
      source_url: "https://minstroy.gov.kg/ru/state_program/download-pdf/no27avtomobilnyedorogi_compressed-43769083f584ff787.06841542.pdf",
      supporting_source_urls: expect.arrayContaining([
        "https://minstroy.gov.kg/ru/kyzmat/443/show",
        "https://minstroy.gov.kg/index.php/kg/state_program/download-pdf/prikazot28aprela2022godano52npa_compressed-25868e3850a3ecfb9.81892156.pdf",
        "https://minstroy.gov.kg/index.php/ru/state_program/download-pdf/prikazot28marta2016godano2npa-16968e388e7a70b73.52487445.pdf",
      ]),
      verified_facts: expect.arrayContaining([
        "official_ministry_page_identifies_collection_27_as_automobile_roads",
        "official_pdf_table_27_06_020_is_for_4_cm_hot_asphalt_concrete_pavement",
        "official_pdf_table_measurement_basis_is_1000_m2_of_pavement",
        "table_27_06_020_publishes_multiple_mix_and_density_variants_with_different_resource_rows",
        "value_0_001_is_only_the_derived_m2_to_1000_m2_table_unit_conversion_not_a_resource_or_cost_norm",
      ]),
    }]);
    expect(reviewedRoadworksPack.norm_items).toMatchObject([{
      norm_id: "roadworks_krer27_06_020_norm_unit_per_m2_v1",
      parameters: expect.arrayContaining([
        "pavement_area_m2",
        "pavement_area_measurement_basis_m2",
        "mixture_kind",
        "mixture_type_and_density_class",
        "layer_thickness_mm",
        "selected_krer27_table_code",
        "selected_table_variant",
        "selected_table_variant_work_composition",
        "selected_table_resource_rows",
        "selected_collection_edition_and_amendments",
        "pavement_design_and_compaction_specification",
      ]),
      rate: {
        value: 0.001,
        unit: "table norm unit/m2; table measurement basis is 1000 m2 of pavement",
      },
      waste_percent_default: 0,
      applicability: expect.objectContaining({
        jurisdiction: "Kyrgyz Republic",
        table: "27-06-020",
        published_layer_thickness_mm: 40,
        table_measurement_basis_m2: 1000,
        calculation: "pavement_area_m2 / 1000",
        exact_table_variant_and_resource_column_selection_required: true,
        current_collection_edition_and_amendments_required: true,
        rate_is_derived_same_unit_conversion_not_published_resource_norm: true,
        resource_and_cost_rates_blocked_until_exact_variant_selected: true,
        automatic_production_binding_for_generic_roadworks_forbidden: true,
      }),
      rounding: {
        package_size: 1,
        mode: "no_rounding_of_fractional_1000_m2_table_units_before_exact_variant_resource_calculation",
      },
    }]);
    expect(reviewedWasteRemovalPack).toMatchObject({
      source_pack_version: "2026.09-us-epa-cd-volume-weight-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedWasteRemovalPack.review_evidence?.items).toHaveLength(2);
    expect(reviewedWasteRemovalPack.review_evidence?.items).toMatchObject([
      {
        norm_id: "waste_removal_us_epa_cd_concrete_kg_m3_v1",
        source_url: "https://www.epa.gov/sites/default/files/2016-04/documents/volume_to_weight_conversion_factors_memorandum_04192016_508fnl.pdf",
        supporting_source_urls: ["https://www.epa.gov/smm/volume-weight-conversion-factors-solid-waste"],
        verified_facts: expect.arrayContaining([
          "epa_states_that_primary_data_collection_was_not_performed",
          "page_6_lists_860_lb_per_cubic_yard_for_all_four_large_small_with_without_rebar_concrete_rows",
          "860_lb_per_cubic_yard_converts_to_510_2177223_kg_per_m3",
          "coefficient_is_not_a_kyrgyz_local_weighbridge_disposal_fee_container_or_trip_norm",
        ]),
      },
      {
        norm_id: "waste_removal_us_epa_cd_composite_kg_m3_v1",
        source_url: "https://www.epa.gov/sites/default/files/2016-04/documents/volume_to_weight_conversion_factors_memorandum_04192016_508fnl.pdf",
        supporting_source_urls: ["https://www.epa.gov/smm/volume-weight-conversion-factors-solid-waste"],
        verified_facts: expect.arrayContaining([
          "page_6_lists_417_lb_per_cubic_yard_for_remainder_composite_construction_and_demolition",
          "417_lb_per_cubic_yard_converts_to_247_3962677_kg_per_m3",
          "page_6_separately_lists_construction_and_demolition_bulk_at_484_lb_per_cubic_yard",
          "417_and_484_rows_must_not_be_substituted_without_exact_waste_class_confirmation",
        ]),
      },
    ]);
    expect(reviewedWasteRemovalPack.norm_items).toMatchObject([
      {
        norm_id: "waste_removal_us_epa_cd_concrete_kg_m3_v1",
        parameters: expect.arrayContaining([
          "measured_epa_compatible_concrete_debris_volume_m3",
          "volume_measurement_method_and_state",
          "waste_material_class_confirmed",
          "concrete_piece_size_class",
          "rebar_condition",
          "local_weighbridge_mass_kg_if_available",
          "local_hauler_container_payload_and_disposal_rules",
        ]),
        rate: {
          value: 510.2177223,
          unit: "derived kg/m3 planning conversion from EPA estimated 860 lb/cubic yard; not local measured density",
        },
        waste_percent_default: 0,
        applicability: expect.objectContaining({
          epa_value_lb_per_cubic_yard: 860,
          epa_value_is_estimated_weight: true,
          epa_primary_data_collection_performed: false,
          exact_material_row_and_compatible_volume_measurement_required: true,
          local_weighbridge_mass_overrides_conversion: true,
          haul_trip_count_container_count_and_disposal_fee_derivation_forbidden: true,
          automatic_production_binding_for_generic_waste_removal_forbidden: true,
        }),
        rounding: {
          package_size: 1,
          mode: "no_rounding_before_full_unit_conversion_then_follow_documented_mass_display_precision",
        },
        source: {
          url: "https://www.epa.gov/sites/default/files/2016-04/documents/volume_to_weight_conversion_factors_memorandum_04192016_508fnl.pdf",
        },
      },
      {
        norm_id: "waste_removal_us_epa_cd_composite_kg_m3_v1",
        parameters: expect.arrayContaining([
          "measured_epa_compatible_composite_cd_volume_m3",
          "volume_measurement_method_and_state",
          "waste_material_class_confirmed",
          "composite_or_bulk_cd_row_selected",
          "container_compaction_state",
          "local_weighbridge_mass_kg_if_available",
        ]),
        rate: {
          value: 247.3962677,
          unit: "derived kg/m3 planning conversion from EPA estimated 417 lb/cubic yard composite C&D row; not local measured density",
        },
        waste_percent_default: 0,
        applicability: expect.objectContaining({
          epa_value_lb_per_cubic_yard: 417,
          separate_epa_bulk_cd_value_lb_per_cubic_yard: 484,
          bulk_cd_484_lb_per_cubic_yard_must_not_be_substituted: true,
          exact_material_row_and_compatible_volume_measurement_required: true,
          local_weighbridge_mass_overrides_conversion: true,
          haul_trip_count_container_count_and_disposal_fee_derivation_forbidden: true,
          automatic_production_binding_for_generic_waste_removal_forbidden: true,
        }),
      },
    ]);
    expect(reviewedConcretePack).toMatchObject({
      source_pack_version: "2026.09-nrmca-cip31-order-quantity-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedConcretePack.norm_items).toMatchObject([{
      norm_id: "concrete_nrmca_cip31_selected_contingency_m3_m3_v1",
      parameters: expect.arrayContaining([
        "plan_dimension_concrete_volume_m3",
        "mix_design_or_project_specification_reference",
        "selected_contingency_percent",
        "contingency_selection_justification",
        "producer_order_confirmation",
      ]),
      rate: {
        value: 1.04,
        unit: "published lower bound only; selected order factor must be between 1.04 and 1.10 m3 per m3 estimated from plan dimensions",
      },
      waste_percent_default: 0,
      applicability: expect.objectContaining({
        published_contingency_percent_range: [4, 10],
        selected_contingency_percent_required: true,
        previous_2_percent_allowance_rejected: true,
        simple_lower_bound_rate_multiplication_forbidden: true,
        automatic_production_binding_for_generic_concrete_forbidden: true,
      }),
    }]);
    expect(reviewedConcretePack.norm_items.some((item: { norm_id: string }) =>
      item.norm_id === "concrete_ready_mix_m3_m3_placed_v1")).toBe(false);
    expect(reviewedFormworkPack).toMatchObject({
      source_pack_version: "2026.09-rics-nrm2-formwork-measurement-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedFormworkPack.norm_items).toMatchObject([{
      norm_id: "formwork_rics_nrm2_measured_contact_area_same_unit_routing_v1",
      rate: { value: 1 },
      waste_percent_default: 0,
      applicability: expect.objectContaining({
        previous_2_4_m2_per_m3_seed_rejected: true,
        previous_50_m2_package_assumption_rejected: true,
        rate_is_routing_identity_not_material_consumption_norm: true,
        automatic_production_binding_for_generic_formwork_forbidden: true,
      }),
    }]);
    expect(reviewedFormworkPack.norm_items.some((item: { norm_id: string }) =>
      item.norm_id === "formwork_contact_area_m2_m3_concrete_element_v1")).toBe(false);
    expect(reviewedReinforcementPack).toMatchObject({
      source_pack_version: "2026.09-rics-fhwa-rebar-schedule-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedReinforcementPack.norm_items).toMatchObject([{
      norm_id: "reinforcement_project_bar_schedule_weight_same_unit_routing_v1",
      rate: { value: 1 },
      waste_percent_default: 0,
      applicability: expect.objectContaining({
        approved_bar_schedule_or_explicit_bar_takeoff_required: true,
        previous_95_kg_per_m3_seed_rejected: true,
        diameter_squared_over_162_as_automatic_source_forbidden: true,
        automatic_production_binding_for_generic_reinforcement_forbidden: true,
      }),
    }]);
    expect(reviewedReinforcementPack.norm_items.some((item: { norm_id: string }) =>
      item.norm_id === "reinforcement_rebar_kg_m3_concrete_element_v1")).toBe(false);
    expect(reviewedMasonryPack).toMatchObject({
      source_pack_version: "2026.09-bia-tn10-selected-table-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedMasonryPack.norm_items).toHaveLength(1);
    expect(reviewedMasonryPack.norm_items).toMatchObject([{
      norm_id: "masonry_bia_tn10_selected_brick_mortar_table_routing_v1",
      rate: { value: 1 },
      waste_percent_default: 0,
      applicability: expect.objectContaining({
        material_scope: "fired clay brick only",
        exact_brick_size_joint_width_wall_configuration_and_bond_required: true,
        aac_concrete_silicate_or_other_non_clay_products_excluded: true,
        previous_fixed_8_33_piece_51_piece_5_kg_0_055_m3_and_1_05_m2_rates_rejected: true,
        automatic_production_binding_for_generic_masonry_forbidden: true,
      }),
    }]);
    expect(reviewedMasonryPack.norm_items.some((item: { norm_id: string }) => [
      "masonry_aac_block_600_200_200_piece_m2_wall_v1",
      "masonry_brick_250_120_65_piece_m2_half_brick_v1",
      "masonry_thin_bed_block_adhesive_kg_m2_200mm_v1",
      "masonry_cement_lime_mortar_m3_m2_brick_v1",
      "masonry_reinforcement_mesh_m2_m2_wall_v1",
    ].includes(item.norm_id))).toBe(false);
    expect(reviewedElectricalPack).toMatchObject({
      source_pack_version: "2026.09-legrand-p31-primary-review-r2",
      review_status: "reviewed",
      review_evidence: { method: "DIRECT_PRIMARY_SOURCE_REVIEW" },
    });
    expect(reviewedElectricalPack.norm_items).toHaveLength(1);
    expect(reviewedElectricalPack.norm_items.some((item) =>
      item.norm_id === "electrical_legrand_049272_cable_linear_m_route_v1")).toBe(false);
    expect(reviewedElectricalPack.review_evidence?.items).toMatchObject([{
      norm_id: "electrical_legrand_p31_tray_joint_m6_fasteners_piece_joint_v1",
      source_url: "https://assets.legrand.com/pim/NP-FT-GT/FT0955-02.pdf",
      verified_facts: expect.arrayContaining([
        "technical_sheet_identifier_is_ft0955_02_last_updated_2021_06_14",
        "page_11_shows_ep_coupler_lg_341213_or_er_coupler_lg_482219",
        "page_11_shows_eight_m6_side_fasteners_for_the_75_to_300_mm_joint",
        "published_m6_tightening_torque_is_11_nm",
        "the_400_to_600_mm_diagram_additionally_shows_four_m6_bottom_plate_fasteners",
      ]),
    }]);
    expect(reviewedElectricalPack.norm_items).toMatchObject([{
      norm_id: "electrical_legrand_p31_tray_joint_m6_fasteners_piece_joint_v1",
      parameters: expect.arrayContaining([
        "tray_joint_count",
        "tray_width_mm",
        "coupler_reference",
        "manufacturer_system_profile_id",
        "installation_manual_reference",
        "tightening_torque_nm",
        "product_specification_id",
        "containment_type",
        "containment_width_mm",
      ]),
      rate: {
        value: 8,
        unit: "M6 fasteners/tray joint for 75-300 mm tray",
      },
      waste_percent_default: 0,
      applicability: expect.objectContaining({
        system: "Legrand P31 symmetrical cable tray",
        technical_sheet_identifier: "FT0955-02",
        technical_sheet_last_update: "2021-06-14",
        tray_width_mm_min: 75,
        tray_width_mm_max: 300,
        m6_fasteners_per_75_300_mm_joint: 8,
        tightening_torque_nm: 11,
        width_400_600_mm_additional_bottom_plate_m6_fasteners: 4,
        width_400_600_mm_excluded_from_this_norm: true,
        explicit_manufacturer_profile_and_installation_reference_required: true,
        generic_cable_tray_or_electrical_binding_forbidden: true,
      }),
      rounding: {
        package_size: 1,
        mode: "ceil",
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

    expect(inventory).toHaveLength(NORM_WORK_TAXONOMY_GROUPS.length - 2);
    expect(inventory.reduce((sum, entry) => sum + entry.rows_count, 0)).toBe(599000);
    expect(PROFESSIONAL_NORM_PACK_GROUPS.every((group) => (byGroup.get(group)?.rows_count ?? 0) > 0)).toBe(true);
    expect(NORM_WORK_TAXONOMY_GROUPS.filter((group) => !byGroup.has(group)).sort()).toEqual([
      "formwork",
      "reinforcement",
    ]);
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

    expect(basisParameters).toHaveLength(35);
    expect(Object.keys(PROFESSIONAL_NORM_PACK_BASIS_QUESTIONS_RU)).toHaveLength(34);
    expect(PROFESSIONAL_NORM_PACK_BASIS_PARAMETER_BY_NORM_ID).toMatchObject({
      concrete_nrmca_cip31_selected_contingency_m3_m3_v1: "plan_dimension_concrete_volume_m3",
      formwork_rics_nrm2_measured_contact_area_same_unit_routing_v1: "measured_formwork_contact_area_m2",
      masonry_bia_tn10_selected_brick_mortar_table_routing_v1: "measured_net_brick_wall_area_m2",
      reinforcement_project_bar_schedule_weight_same_unit_routing_v1: "approved_reinforcement_schedule_weight_kg",
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

    expect(inventory).toHaveLength(54);
    expect(inventory.filter((item) => item.registered)).toHaveLength(32);
    expect(unregistered).toHaveLength(22);
    expect(inventory.filter((item) => item.binding_route === "CANONICAL_V4_APPLICABILITY")
      .map((item) => item.norm_id)).toEqual([
      "air_conditioning_daikin_3mxs_k_additional_refrigerant_kg_m_v1",
      "baseboards_forbo_232_mounting_adhesive_upper_ml_linear_m_v1",
      "baseboards_gerflor_design_skirting_linear_m_perimeter_v1",
      "ceilings_knauf_d112_standard_board_m2_m2_v1",
      "ceilings_knauf_d112_standard_joint_tape_linear_m_m2_v1",
      "ceilings_knauf_d112_standard_substructure_anchor_piece_m2_v1",
      "ceilings_knauf_d112_standard_tn25_screw_piece_m2_v1",
      "ceilings_knauf_d112_standard_ud_runner_linear_m_m2_v1",
      "ceilings_knauf_d112_standard_uniflott_kg_m2_v1",
      "ceilings_knauf_d112_standard_wall_fastener_piece_m2_v1",
      "concrete_nrmca_cip31_selected_contingency_m3_m3_v1",
      "drywall_knauf_fugenfueller_leicht_jointing_kg_m2_v1",
      "drywall_knauf_fugenfueller_perimeter_joint_kg_linear_m_v1",
      "electrical_legrand_p31_tray_joint_m6_fasteners_piece_joint_v1",
      "flooring_ceresit_cn69_self_leveling_scope_2_10mm_v1",
      "flooring_ceresit_ct17_primer_flooring_l_m2_v1",
      "heating_uponor_ufh_pipe_m_m2_150mm_spacing_v1",
      "paint_ceresit_ct17_primer_l_m2_before_paint_v1",
      "paint_ceresit_ct54_silicate_two_coats_l_m2_v1",
      "plaster_ceresit_ct29_kg_m2_mm_v1",
      "plumbing_wavin_hep2o_15mm_horizontal_clip_spacing_v1",
      "plumbing_wavin_hep2o_15mm_vertical_clip_spacing_v1",
      "plumbing_wavin_hep2o_22mm_horizontal_clip_spacing_v1",
      "plumbing_wavin_hep2o_smartsleeve_piece_connection_v1",
      "putty_ceresit_ct126_kg_m2_mm_v1",
      "putty_ceresit_ct127_finish_layer_max_2mm_v1",
      "roadworks_krer27_06_020_norm_unit_per_m2_v1",
      "screed_cement_sand_mix_kg_m2_50mm_v1",
      "tile_ceresit_cm11_plus_adhesive_kg_m2_notch_4_12_v1",
      "tile_ceresit_ct17_primer_l_m2_absorbent_substrate_v1",
      "ventilation_lindab_vsr_duct_linear_m_route_v1",
      "waterproofing_ceresit_cl51_two_coats_kg_m2_v1",
    ]);
    expect(inventory.find((item) => item.norm_id === "heating_uponor_ufh_pipe_m_m2_150mm_spacing_v1"))
      .toMatchObject({
        registered: true,
        binding_route: "CANONICAL_V4_APPLICABILITY",
        binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
        disposition: "REGISTERED_EXECUTABLE_BINDING",
      });
    expect(withCandidates.map((item) => item.norm_id)).toEqual([
      "carpentry_sikagard_wood_preserver_l_m2_preventative_v1",
      "fire_safety_siemens_sinteso_base_piece_per_detector_point_v1",
      "insulation_rockwool_comfortboard80_r63_38mm_m2_m2_v1",
      "low_voltage_legrand_049272_cable_linear_m_route_v1",
      "metalwork_jotun_hardtop_xp_l_m2_100um_v1",
      "roofing_sarnafil_at18_field_overlap_m2_m2_v1",
      "sewerage_wavin_osma_110mm_3m_pipe_linear_m_route_v1",
    ]);
    expect(withCandidates.every((item) =>
      item.disposition === "DIMENSIONAL_CANDIDATE_REVIEW_REQUIRED" &&
      item.unresolved_applicability_keys.length > 0
    )).toBe(true);
    expect(unregistered.filter((item) => item.dimensional_candidate_rows_count === 0)).toHaveLength(15);
  });
});
