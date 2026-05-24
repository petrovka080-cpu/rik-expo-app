import type { GlobalUnitInput } from "../globalEstimate/globalEstimateTypes";
import type {
  BuiltInAi50000MacroDomain,
  BuiltInAi50000Phase1Case,
  BuiltInAi50000Phase1ExpectedTool,
  BuiltInAi50000Phase1Intent,
} from "./builtInAi50000CaseTypes";
import { BUILT_IN_AI_50000_PHASE1_CASES_PER_MACRO_DOMAIN } from "./builtInAi50000Ontology";

export type BuiltInAi50000AnchorCase = {
  id: string;
  macroDomainId: string;
  workKey: string;
  workFamily?: string;
  category?: string;
  prompt: string;
  volume: number;
  unit: GlobalUnitInput["normalizedUnit"];
  intent?: BuiltInAi50000Phase1Intent;
  expectedTool?: BuiltInAi50000Phase1ExpectedTool;
  productFamily?: string;
  dangerousWork?: boolean;
};

const SCOPES = [
  "residential",
  "apartment",
  "private_house",
  "commercial",
  "industrial",
  "municipal",
  "utility",
  "emergency",
  "premium",
  "budget",
] as const;

const PACKAGES = [
  "alpha",
  "beta",
  "gamma",
  "delta",
  "epsilon",
  "zeta",
  "eta",
  "theta",
  "iota",
  "kappa",
  "lambda",
  "mu",
  "nu",
  "xi",
  "omicron",
  "pi",
  "rho",
  "sigma",
  "tau",
  "upsilon",
] as const;

export const BUILT_IN_AI_50000_ANCHORS: readonly BuiltInAi50000AnchorCase[] = Object.freeze([
  {
    id: "phase1_anchor_brick_masonry_74sqm",
    macroDomainId: "03_masonry_blocks_stone",
    workKey: "brick_masonry",
    prompt: "estimate cost for brick masonry 74 sq_m",
    volume: 74,
    unit: "sq_m",
  },
  {
    id: "phase1_anchor_gable_roof_installation_100sqm",
    macroDomainId: "04_roofing",
    workKey: "gable_roof_installation",
    prompt: "estimate cost for gable roof installation base 100 sq_m",
    volume: 100,
    unit: "sq_m",
    dangerousWork: true,
  },
  {
    id: "phase1_anchor_asphalt_paving_1000sqm",
    macroDomainId: "14_roadworks_landscape_drainage",
    workKey: "asphalt_paving",
    prompt: "estimate cost for asphalt paving 1000 sq_m",
    volume: 1000,
    unit: "sq_m",
    dangerousWork: true,
  },
  {
    id: "phase1_anchor_carpet_laying_100sqm",
    macroDomainId: "07_interior_floors_tile_walls_ceilings",
    workKey: "carpet_laying",
    prompt: "estimate cost for carpet flooring installation 100 sq_m",
    volume: 100,
    unit: "sq_m",
  },
  {
    id: "phase1_anchor_drywall_wall_cladding_352sqm",
    macroDomainId: "08_drywall_partitions_fitout",
    workKey: "drywall_wall_cladding",
    prompt: "estimate cost for drywall wall cladding gkl 352 sq_m",
    volume: 352,
    unit: "sq_m",
  },
  {
    id: "phase1_anchor_ceramic_tile_floor_laying_174sqm",
    macroDomainId: "07_interior_floors_tile_walls_ceilings",
    workKey: "ceramic_tile_floor_laying",
    prompt: "estimate cost for ceramic tile floor laying 174 sq_m",
    volume: 174,
    unit: "sq_m",
  },
  {
    id: "phase1_anchor_laminate_laying_100sqm",
    macroDomainId: "07_interior_floors_tile_walls_ceilings",
    workKey: "laminate_laying",
    prompt: "estimate cost for laminate laying 100 sq_m",
    volume: 100,
    unit: "sq_m",
  },
  {
    id: "phase1_anchor_concrete_slab_200sqm",
    macroDomainId: "02_foundations_concrete_rebar",
    workKey: "concrete_slab",
    prompt: "estimate cost for concrete slab 200 sq_m",
    volume: 200,
    unit: "sq_m",
    dangerousWork: true,
  },
  {
    id: "phase1_anchor_rebar_installation_height_5m",
    macroDomainId: "02_foundations_concrete_rebar",
    workKey: "rebar_installation",
    prompt: "estimate cost for rebar installation frame height 5 linear_m",
    volume: 5,
    unit: "linear_m",
    dangerousWork: true,
  },
  {
    id: "phase1_anchor_facade_insulation_200sqm",
    macroDomainId: "05_facade_exterior",
    workKey: "facade_insulation",
    prompt: "estimate cost for facade insulation 200 sq_m",
    volume: 200,
    unit: "sq_m",
    dangerousWork: true,
  },
  {
    id: "phase1_anchor_electrical_wiring_80sqm",
    macroDomainId: "10_electrical_low_voltage",
    workKey: "electrical_wiring",
    prompt: "estimate cost for electrical wiring 80 sq_m",
    volume: 80,
    unit: "sq_m",
    dangerousWork: true,
  },
  {
    id: "phase1_anchor_pipe_replacement_40lm",
    macroDomainId: "09_plumbing_water_sewer",
    workKey: "pipe_replacement",
    prompt: "estimate cost for pipe replacement 40 linear_m",
    volume: 40,
    unit: "linear_m",
    dangerousWork: true,
  },
  {
    id: "phase1_anchor_roof_repair_70sqm",
    macroDomainId: "04_roofing",
    workKey: "roof_repair",
    prompt: "estimate cost for roof repair 70 sq_m",
    volume: 70,
    unit: "sq_m",
    dangerousWork: true,
  },
  {
    id: "phase1_anchor_bathroom_waterproofing_30sqm",
    macroDomainId: "12_waterproofing_insulation_fireproofing",
    workKey: "bathroom_waterproofing",
    prompt: "estimate cost for bathroom waterproofing 30 sq_m",
    volume: 30,
    unit: "sq_m",
  },
  {
    id: "phase1_anchor_solar_panel_installation",
    macroDomainId: "17_solar_storage_microgrids",
    workKey: "solar_panel_installation",
    prompt: "estimate cost for solar panel installation 1 set",
    volume: 1,
    unit: "set",
    dangerousWork: true,
  },
  {
    id: "phase1_anchor_battery_storage_installation",
    macroDomainId: "17_solar_storage_microgrids",
    workKey: "battery_storage_installation",
    prompt: "estimate cost for battery storage installation 1 set",
    volume: 1,
    unit: "set",
    dangerousWork: true,
  },
  {
    id: "phase1_anchor_boiler_room_piping",
    macroDomainId: "18_thermal_energy_boiler_chp",
    workKey: "boiler_room_piping",
    prompt: "estimate cost for boiler room piping 1 set",
    volume: 1,
    unit: "set",
    dangerousWork: true,
  },
  {
    id: "phase1_anchor_micro_hydro_intake",
    macroDomainId: "19_hydro_power_water_infrastructure",
    workKey: "micro_hydro_preparation",
    workFamily: "micro_hydro_intake",
    prompt: "estimate cost for micro hydro intake concrete water infrastructure 1 set",
    volume: 1,
    unit: "set",
    dangerousWork: true,
  },
  {
    id: "phase1_anchor_substation_grounding",
    macroDomainId: "20_power_grid_substations_lines",
    workKey: "electrical_wiring",
    workFamily: "substation_grounding",
    prompt: "estimate cost for substation grounding electrical cable protection 1 set",
    volume: 1,
    unit: "set",
    dangerousWork: true,
  },
  {
    id: "phase1_anchor_greenhouse_installation",
    macroDomainId: "22_agriculture_greenhouses_gardens",
    workKey: "greenhouse_installation",
    prompt: "estimate cost for greenhouse installation 60 sq_m",
    volume: 60,
    unit: "sq_m",
  },
  {
    id: "phase1_anchor_furniture_room_furnishing",
    macroDomainId: "16_carpentry_furniture_furnishing",
    workKey: "furniture_assembly",
    workFamily: "furniture_room_furnishing",
    prompt: "estimate cost for furniture room furnishing carpentry 1 set",
    volume: 1,
    unit: "set",
  },
  {
    id: "phase1_anchor_smart_home_basic",
    macroDomainId: "21_telecom_security_smart_home",
    workKey: "smart_home_basic",
    prompt: "estimate cost for electrical smart home basic low voltage automation 1 set",
    volume: 1,
    unit: "set",
    dangerousWork: true,
  },
  {
    id: "phase1_anchor_emergency_roof_leak_repair",
    macroDomainId: "25_procurement_logistics_maintenance_emergency",
    workKey: "roof_repair",
    workFamily: "emergency_roof_leak_repair",
    prompt: "estimate cost for emergency roof leak repair 70 sq_m",
    volume: 70,
    unit: "sq_m",
    dangerousWork: true,
  },
  {
    id: "phase1_anchor_rebar_product_search_d14",
    macroDomainId: "02_foundations_concrete_rebar",
    workKey: "rebar_installation",
    prompt: "find product material supplier for rebar D14 concrete frame 100 pcs",
    volume: 100,
    unit: "pcs",
    intent: "product_search",
    expectedTool: "search_material_products",
    productFamily: "rebar D14",
    dangerousWork: false,
  },
  {
    id: "phase1_anchor_asphalt_supplier_search_10000sqm",
    macroDomainId: "14_roadworks_landscape_drainage",
    workKey: "asphalt_paving",
    prompt: "find product material supplier for asphalt concrete 10000 sq_m",
    volume: 10000,
    unit: "sq_m",
    intent: "product_search",
    expectedTool: "search_material_products",
    productFamily: "asphalt concrete supplier",
    dangerousWork: false,
  },
  {
    id: "phase1_anchor_estimate_to_pdf",
    macroDomainId: "03_masonry_blocks_stone",
    workKey: "brick_masonry",
    workFamily: "estimate_to_pdf",
    prompt: "estimate cost for brick masonry and prepare estimate to pdf 74 sq_m",
    volume: 74,
    unit: "sq_m",
  },
]);

function padId(value: number): string {
  return String(value).padStart(5, "0");
}

function unitForDomain(domain: BuiltInAi50000MacroDomain): GlobalUnitInput["normalizedUnit"] {
  if (domain.category === "documents_design" || domain.category === "delivery_equipment") return "set";
  if (domain.category === "metalworks") return "kg";
  if (domain.defaultWorkKey.includes("pipe")) return "linear_m";
  return "sq_m";
}

function volumeFor(domain: BuiltInAi50000MacroDomain, index: number, unit: GlobalUnitInput["normalizedUnit"]): number {
  if (unit === "set") return 1;
  if (unit === "pcs") return 10 + (index % 20);
  if (unit === "kg") return 250 + domain.ordinal * 10 + index;
  if (unit === "linear_m") return 20 + (index % 60);
  if (domain.defaultWorkKey === "asphalt_paving") return 100 + index * 5;
  return 40 + domain.ordinal + (index % 20) * 5;
}

function routeCoverageFor(intent: BuiltInAi50000Phase1Intent, requiresPdfAction: boolean) {
  if (intent === "product_search") return ["product_search"] as const;
  return requiresPdfAction ? (["chat", "ai_foreman", "request", "pdf_viewer"] as const) : (["chat", "ai_foreman", "request"] as const);
}

function buildSyntheticCase(domain: BuiltInAi50000MacroDomain, macroIndex: number, localIndex: number): BuiltInAi50000Phase1Case {
  const sequence = macroIndex * BUILT_IN_AI_50000_PHASE1_CASES_PER_MACRO_DOMAIN + localIndex + 1;
  const productCase = localIndex % 10 === 9;
  const scope = SCOPES[localIndex % SCOPES.length];
  const packageName = PACKAGES[Math.floor(localIndex / SCOPES.length) % PACKAGES.length];
  const unit = productCase ? "pcs" : unitForDomain(domain);
  const volume = productCase ? 10 + localIndex : volumeFor(domain, localIndex, unit);
  const prompt = productCase
    ? `find product material supplier for ${domain.productFamily} ${scope} phase1 ${packageName} ${volume} ${unit}`
    : `estimate cost for ${domain.promptAnchor} ${scope} phase1 ${packageName} ${volume} ${unit}`;
  const expectedTool = productCase ? "search_material_products" : "calculate_global_estimate";
  const intent = productCase ? "product_search" : "estimate";
  return {
    id: `phase1_${padId(sequence)}`,
    shardId: Math.floor(sequence - 1 / 1) < 0 ? 0 : Math.floor((sequence - 1) / 1000),
    macroDomainId: domain.id,
    domainId: `${domain.id}_slice_${String(localIndex + 1).padStart(3, "0")}`,
    category: domain.category,
    workFamily: domain.workFamily,
    workKey: domain.defaultWorkKey,
    promptRu: prompt,
    promptEn: prompt,
    intent,
    expectedTool,
    volume,
    unit,
    templateId: productCase ? undefined : `${domain.defaultWorkKey}_template`,
    requiredRateKeys: productCase ? [domain.productFamily] : [domain.defaultWorkKey, domain.category],
    expectedRowsContain: domain.expectedRowsContain,
    forbiddenRowsContain: ["generic_construction_work_row", "plain_text_dump", "markdown_table"],
    routeCoverage: [...routeCoverageFor(intent, !productCase)],
    requiresPdfAction: !productCase,
    requiresSourceEvidence: true,
    requiresTaxStatusOrWarning: !productCase,
    dangerousWork: !productCase && domain.dangerousWork,
    noDiyInstructionsRequired: !productCase && domain.dangerousWork,
    specialistReviewRequired: !productCase && domain.dangerousWork,
    productSearch: productCase
      ? {
          expectedProductFamily: domain.productFamily,
          fakeStockForbidden: true,
          fakeSupplierForbidden: true,
          fakeAvailabilityForbidden: true,
        }
      : undefined,
    sourcePolicy: productCase ? "fresh_required" : "stale_allowed_with_warning",
  };
}

function buildAnchorCase(domain: BuiltInAi50000MacroDomain, anchor: BuiltInAi50000AnchorCase, macroIndex: number, localIndex: number): BuiltInAi50000Phase1Case {
  const sequence = macroIndex * BUILT_IN_AI_50000_PHASE1_CASES_PER_MACRO_DOMAIN + localIndex + 1;
  const intent = anchor.intent ?? "estimate";
  const expectedTool = anchor.expectedTool ?? "calculate_global_estimate";
  const productCase = intent === "product_search";
  return {
    id: anchor.id,
    shardId: Math.floor((sequence - 1) / 1000),
    macroDomainId: domain.id,
    domainId: `${domain.id}_anchor_${String(localIndex + 1).padStart(3, "0")}`,
    category: anchor.category ?? domain.category,
    workFamily: anchor.workFamily ?? domain.workFamily,
    workKey: anchor.workKey,
    promptRu: anchor.prompt,
    promptEn: anchor.prompt,
    intent,
    expectedTool,
    volume: anchor.volume,
    unit: anchor.unit,
    templateId: productCase ? undefined : `${anchor.workKey}_template`,
    requiredRateKeys: productCase ? [anchor.productFamily ?? domain.productFamily] : [anchor.workKey, anchor.category ?? domain.category],
    expectedRowsContain: domain.expectedRowsContain,
    forbiddenRowsContain: ["generic_construction_work_row", "plain_text_dump", "markdown_table"],
    routeCoverage: [...routeCoverageFor(intent, !productCase)],
    requiresPdfAction: !productCase,
    requiresSourceEvidence: true,
    requiresTaxStatusOrWarning: !productCase,
    dangerousWork: !productCase && (anchor.dangerousWork ?? domain.dangerousWork),
    noDiyInstructionsRequired: !productCase && (anchor.dangerousWork ?? domain.dangerousWork),
    specialistReviewRequired: !productCase && (anchor.dangerousWork ?? domain.dangerousWork),
    productSearch: productCase
      ? {
          expectedProductFamily: anchor.productFamily ?? domain.productFamily,
          fakeStockForbidden: true,
          fakeSupplierForbidden: true,
          fakeAvailabilityForbidden: true,
        }
      : undefined,
    sourcePolicy: productCase ? "fresh_required" : "stale_allowed_with_warning",
  };
}

export function buildBuiltInAi50000Phase1Cases(
  domains: readonly BuiltInAi50000MacroDomain[],
): readonly BuiltInAi50000Phase1Case[] {
  return Object.freeze(domains.flatMap((domain, macroIndex) => {
  const anchors = BUILT_IN_AI_50000_ANCHORS.filter((anchor) => anchor.macroDomainId === domain.id);
    const cases: BuiltInAi50000Phase1Case[] = [];
    for (let localIndex = 0; localIndex < BUILT_IN_AI_50000_PHASE1_CASES_PER_MACRO_DOMAIN; localIndex += 1) {
      const anchor = anchors[localIndex];
      cases.push(anchor
        ? buildAnchorCase(domain, anchor, macroIndex, localIndex)
        : buildSyntheticCase(domain, macroIndex, localIndex));
    }
    return cases;
  }));
}
