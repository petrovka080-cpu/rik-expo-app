import type { GlobalWorkCategory } from "../globalEstimate/globalEstimateTypes";
import type {
  BuiltInAi10000PostBoqDomain,
  BuiltInAi10000PostBoqIntent,
  BuiltInAi10000PostBoqSourcePolicy,
} from "./builtInAi10000PostBoqCaseTypes";

export const BUILT_IN_AI_10000_POST_BOQ_REQUIRED_DOMAIN_IDS = Object.freeze([
  "earthworks",
  "foundations",
  "concrete",
  "rebar_formwork",
  "masonry",
  "roofing_pitched",
  "roofing_flat",
  "facade",
  "windows_doors",
  "drywall",
  "walls",
  "ceilings",
  "flooring",
  "tile",
  "waterproofing",
  "insulation",
  "plumbing",
  "electrical",
  "lighting",
  "hvac",
  "demolition",
  "waste_cleaning",
  "roadworks",
  "landscape",
  "drainage",
  "fencing",
  "metalworks",
  "carpentry",
  "furniture",
  "smart_home",
  "security",
  "solar_power",
  "battery_storage",
  "microgrid",
  "boiler_chp",
  "hydro_power",
  "substations",
  "power_lines",
  "telecom",
  "elevators",
  "accessibility",
  "greenhouse",
  "gardening",
  "irrigation",
  "pools",
  "sauna_bath",
  "playgrounds",
  "commercial_fitout",
  "office_fitout",
  "restaurant_fitout",
  "clinic_fitout",
  "warehouse",
  "industrial_flooring",
  "fire_safety",
  "hazardous_material_no_diy",
  "mold_water_fire_damage",
  "documentation",
  "design_project",
  "surveys",
  "inspections",
  "procurement",
  "logistics",
  "equipment_rental",
  "maintenance",
  "emergency_repairs",
  "apartment_turnkey",
  "house_turnkey",
  "bathroom_turnkey",
  "kitchen_turnkey",
  "garage",
  "basement",
  "attic",
  "balcony",
  "outdoor_structures",
  "farm_buildings",
  "agricultural_systems",
  "cold_rooms",
  "server_rooms",
  "acoustic_rooms",
  "sports_facilities",
  "schools",
  "hotels",
  "retail",
  "medical",
  "tenant_improvement",
  "public_works",
  "parking",
  "roads_private",
  "utilities",
  "water_supply",
  "sewage",
  "stormwater",
  "heating_networks",
  "gas_estimate_only_no_diy",
  "structural_repair",
  "restoration",
  "temporary_site",
  "event_infrastructure",
  "household_small_tasks",
  "full_project_boq",
] as const);

export const BUILT_IN_AI_10000_POST_BOQ_EXPECTED_ROWS_BY_CATEGORY: Record<GlobalWorkCategory, string[]> = {
  flooring: ["covering material", "base preparation", "installation", "consumables"],
  wall_finishing: ["finish material", "primer", "preparation", "application"],
  ceiling: ["frame", "panels or boards", "fasteners", "installation"],
  drywall: ["profile frame", "gypsum board", "fasteners", "joint finishing"],
  painting: ["paint", "primer", "surface preparation", "application"],
  plastering: ["plaster mix", "primer", "beacons", "application"],
  putty: ["starter putty", "finish putty", "primer", "sanding"],
  tile: ["tile", "adhesive", "grout", "laying"],
  doors_windows: ["unit block", "hardware", "sealing", "installation"],
  electrical: ["cable", "devices", "protection", "testing"],
  plumbing: ["pipes or fixtures", "fittings", "installation", "pressure test"],
  heating_hvac: ["equipment", "pipes or ducts", "installation", "commissioning"],
  roofing: ["roof covering", "membrane", "fasteners", "installation"],
  facade: ["facade material", "primer or subsystem", "installation", "protection"],
  foundation: ["concrete", "rebar", "formwork", "pouring"],
  concrete: ["concrete", "rebar", "formwork", "curing"],
  masonry: ["brick or block", "mortar", "reinforcement", "laying"],
  waterproofing: ["primer", "membrane or mastic", "tape", "application"],
  insulation: ["insulation", "membrane", "fasteners", "installation"],
  demolition: ["protection", "demolition", "loading", "disposal"],
  landscaping: ["base material", "soil or planting", "installation", "cleanup"],
  roadworks: ["base", "geotextile or sand", "compaction", "equipment"],
  metalworks: ["steel", "consumables", "fabrication", "coating"],
  carpentry: ["timber", "fasteners", "protective coating", "installation"],
  documents_design: ["survey", "drawings", "estimate package", "delivery"],
  cleaning: ["cleaning supplies", "labor", "waste handling", "handover"],
  delivery_equipment: ["item list", "quantity", "source", "price status"],
  other: ["materials", "labor", "equipment", "handover"],
};

type DomainInput = Omit<BuiltInAi10000PostBoqDomain, "macroGroupId" | "expectedRowsContain"> & {
  expectedRowsContain?: string[];
};

function d(input: DomainInput, index: number): BuiltInAi10000PostBoqDomain {
  return {
    ...input,
    macroGroupId: `macro_${String(Math.floor(index / 4) + 1).padStart(2, "0")}`,
    expectedRowsContain: input.expectedRowsContain ?? BUILT_IN_AI_10000_POST_BOQ_EXPECTED_ROWS_BY_CATEGORY[input.category],
    sourcePolicy: input.sourcePolicy ?? "fresh_required",
  };
}

function product(input: Omit<DomainInput, "intent" | "sourcePolicy">): DomainInput {
  return {
    ...input,
    intent: "product_search",
    sourcePolicy: "fresh_required",
  };
}

function review(input: DomainInput): DomainInput {
  return {
    ...input,
    sourcePolicy: "manual_review_allowed",
  };
}

const DOMAINS: readonly DomainInput[] = [
  { domainId: "earthworks", title: "earthworks and site preparation", category: "roadworks", workFamily: "earthworks_site_base", workKey: "gravel_road_base", promptAnchor: "earthworks site grading road base compaction", productFamily: "geotextile and road base materials" },
  { domainId: "foundations", title: "foundations", category: "foundation", workFamily: "foundation_concrete_rebar", workKey: "strip_foundation", promptAnchor: "strip foundation concrete formwork rebar", productFamily: "concrete and rebar" },
  { domainId: "concrete", title: "concrete works", category: "concrete", workFamily: "concrete_slabs_frames", workKey: "concrete_slab", promptAnchor: "concrete slab formwork rebar pouring curing", dangerousWork: true, productFamily: "ready mix concrete" },
  { domainId: "rebar_formwork", title: "rebar and formwork", category: "concrete", workFamily: "rebar_formwork", workKey: "rebar_installation", promptAnchor: "rebar installation concrete formwork tying", dangerousWork: true, productFamily: "rebar and formwork materials" },
  { domainId: "masonry", title: "masonry", category: "masonry", workFamily: "masonry_blocks_stone", workKey: "brick_masonry", promptAnchor: "brick masonry block mortar laying", productFamily: "brick and masonry mixes" },
  { domainId: "roofing_pitched", title: "pitched roofing", category: "roofing", workFamily: "pitched_roofing", workKey: "gable_roof_installation", promptAnchor: "gable roof installation pitched roofing membrane covering", dangerousWork: true, productFamily: "pitched roofing materials" },
  { domainId: "roofing_flat", title: "flat roofing", category: "roofing", workFamily: "flat_roofing", workKey: "flat_roof_membrane", promptAnchor: "flat roof membrane roofing installation", dangerousWork: true, productFamily: "flat roof membranes" },
  { domainId: "facade", title: "facade", category: "facade", workFamily: "facade_exterior_systems", workKey: "facade_insulation", promptAnchor: "facade insulation cladding exterior installation", dangerousWork: true, productFamily: "facade insulation" },
  { domainId: "windows_doors", title: "windows and doors", category: "doors_windows", workFamily: "openings_glazing", workKey: "window_installation", promptAnchor: "window door glazing installation sealing hardware", productFamily: "windows doors and hardware" },
  { domainId: "drywall", title: "drywall", category: "drywall", workFamily: "drywall_partitions_fitout", workKey: "drywall_wall_cladding", promptAnchor: "drywall wall cladding gkl profile gypsum board", productFamily: "drywall profiles and boards" },
  { domainId: "walls", title: "walls", category: "wall_finishing", workFamily: "interior_wall_finishes", workKey: "wall_painting", promptAnchor: "wall finishing paint primer preparation", productFamily: "wall finish materials" },
  { domainId: "ceilings", title: "ceilings", category: "ceiling", workFamily: "interior_ceilings", workKey: "ceiling_painting", promptAnchor: "ceiling finish painting panels frame", productFamily: "ceiling finish materials" },
  { domainId: "flooring", title: "flooring", category: "flooring", workFamily: "interior_floor_finishes", workKey: "laminate_laying", promptAnchor: "laminate flooring installation underlayment baseboard", productFamily: "flooring materials" },
  { domainId: "tile", title: "tile", category: "tile", workFamily: "tile_wet_zones", workKey: "ceramic_tile_floor_laying", promptAnchor: "ceramic tile floor laying adhesive grout primer", productFamily: "tile and adhesive" },
  { domainId: "waterproofing", title: "waterproofing", category: "waterproofing", workFamily: "waterproofing_membranes", workKey: "bathroom_waterproofing", promptAnchor: "bathroom waterproofing membrane mastic primer", productFamily: "waterproofing membranes" },
  { domainId: "insulation", title: "insulation", category: "insulation", workFamily: "thermal_acoustic_insulation", workKey: "facade_insulation", promptAnchor: "insulation membrane fasteners installation", productFamily: "insulation materials" },
  { domainId: "plumbing", title: "plumbing", category: "plumbing", workFamily: "plumbing_water_supply", workKey: "pipe_replacement", promptAnchor: "plumbing pipe replacement water pressure test", dangerousWork: true, productFamily: "pipes and fittings" },
  { domainId: "electrical", title: "electrical", category: "electrical", workFamily: "electrical_low_voltage", workKey: "electrical_wiring", promptAnchor: "electrical wiring cable protection testing", dangerousWork: true, productFamily: "electrical cable and protection" },
  { domainId: "lighting", title: "lighting", category: "electrical", workFamily: "lighting_systems", workKey: "lighting_installation", promptAnchor: "lighting installation electrical cable devices testing", dangerousWork: true, productFamily: "lighting devices and cable" },
  { domainId: "hvac", title: "hvac", category: "heating_hvac", workFamily: "hvac_heating_ventilation", workKey: "ventilation_installation", promptAnchor: "hvac ventilation ducts equipment commissioning", dangerousWork: true, productFamily: "hvac equipment" },
  { domainId: "demolition", title: "demolition", category: "demolition", workFamily: "demolition_waste", workKey: "demolition_walls", promptAnchor: "demolition protection loading disposal", dangerousWork: true, productFamily: "demolition consumables" },
  { domainId: "waste_cleaning", title: "waste cleaning", category: "documents_design", workFamily: "waste_cleaning", workKey: "design_project", promptAnchor: "construction cleaning waste loading disposal handover", productFamily: "cleaning supplies" },
  { domainId: "roadworks", title: "roadworks", category: "roadworks", workFamily: "roadworks_asphalt", workKey: "asphalt_paving", promptAnchor: "asphalt paving road base compaction", dangerousWork: true, productFamily: "asphalt and road base" },
  { domainId: "landscape", title: "landscape", category: "landscaping", workFamily: "landscape_hardscape", workKey: "lawn_installation", promptAnchor: "landscaping lawn soil planting cleanup", productFamily: "landscape materials" },
  { domainId: "drainage", title: "drainage", category: "plumbing", workFamily: "drainage_stormwater", workKey: "sewer_pipe_installation", promptAnchor: "drainage sewer pipe installation pressure test", dangerousWork: true, productFamily: "drainage pipes" },
  { domainId: "fencing", title: "fencing", category: "metalworks", workFamily: "fences_gates", workKey: "fence_installation", promptAnchor: "metal fence gate installation coating", productFamily: "fence steel and hardware" },
  { domainId: "metalworks", title: "metalworks", category: "metalworks", workFamily: "metalworks_steel_welding", workKey: "welded_frame", promptAnchor: "metal steel welding fabrication coating", dangerousWork: true, productFamily: "steel profiles and consumables" },
  { domainId: "carpentry", title: "carpentry", category: "carpentry", workFamily: "carpentry_timber", workKey: "pergola_wood", promptAnchor: "carpentry timber fasteners protective coating", productFamily: "timber and fasteners" },
  product({ domainId: "furniture", title: "furniture", category: "carpentry", workFamily: "furniture_cabinets", workKey: "furniture_assembly", promptAnchor: "furniture cabinet carpentry product material", productFamily: "furniture and cabinet hardware" }),
  product({ domainId: "smart_home", title: "smart home", category: "electrical", workFamily: "telecom_security_smart_home", workKey: "smart_home_basic", promptAnchor: "smart home low voltage automation product material", dangerousWork: true, productFamily: "smart home devices" }),
  product({ domainId: "security", title: "security", category: "electrical", workFamily: "security_access", workKey: "access_control_install", promptAnchor: "security access control low voltage product material", dangerousWork: true, productFamily: "security devices" }),
  product({ domainId: "solar_power", title: "solar power", category: "electrical", workFamily: "solar_storage_microgrids", workKey: "solar_panel_installation", promptAnchor: "solar panel inverter product material", dangerousWork: true, productFamily: "solar panels and inverters" }),
  product({ domainId: "battery_storage", title: "battery storage", category: "electrical", workFamily: "solar_storage_microgrids", workKey: "battery_storage_installation", promptAnchor: "battery storage inverter product material", dangerousWork: true, productFamily: "battery storage equipment" }),
  { domainId: "microgrid", title: "microgrid", category: "electrical", workFamily: "solar_storage_microgrids", workKey: "electrical_wiring", promptAnchor: "microgrid electrical cable protection commissioning", dangerousWork: true, productFamily: "microgrid electrical materials" },
  { domainId: "boiler_chp", title: "boiler chp", category: "heating_hvac", workFamily: "thermal_energy_boiler_chp", workKey: "boiler_room_piping", promptAnchor: "boiler room chp heating piping commissioning", dangerousWork: true, productFamily: "boiler room materials" },
  { domainId: "hydro_power", title: "hydro power", category: "concrete", workFamily: "hydro_power_water_infrastructure", workKey: "micro_hydro_preparation", promptAnchor: "micro hydro concrete water intake infrastructure", dangerousWork: true, productFamily: "hydro civil materials" },
  { domainId: "substations", title: "substations", category: "electrical", workFamily: "power_grid_substations_lines", workKey: "electrical_wiring", promptAnchor: "substation grounding electrical cable protection", dangerousWork: true, productFamily: "substation grounding materials" },
  { domainId: "power_lines", title: "power lines", category: "electrical", workFamily: "power_grid_substations_lines", workKey: "electrical_wiring", promptAnchor: "power line electrical cable protection testing", dangerousWork: true, productFamily: "power line materials" },
  { domainId: "telecom", title: "telecom", category: "electrical", workFamily: "telecom_low_voltage", workKey: "electrical_basic", promptAnchor: "electrical telecom network low voltage cable testing", dangerousWork: true, productFamily: "telecom cables and devices" },
  { domainId: "elevators", title: "elevators", category: "delivery_equipment", workFamily: "elevators_lifts", workKey: "crane_service", promptAnchor: "elevator lift equipment hoist service", dangerousWork: true, productFamily: "lifting equipment" },
  { domainId: "accessibility", title: "accessibility", category: "metalworks", workFamily: "accessibility_ramps", workKey: "metal_railing", promptAnchor: "accessibility ramp railing metal installation", dangerousWork: true, productFamily: "accessibility hardware" },
  { domainId: "greenhouse", title: "greenhouse", category: "metalworks", workFamily: "agriculture_greenhouse", workKey: "greenhouse_installation", promptAnchor: "greenhouse metal frame installation film panels", productFamily: "greenhouse frame materials" },
  product({ domainId: "gardening", title: "gardening", category: "landscaping", workFamily: "gardening_soil_planting", workKey: "lawn_installation", promptAnchor: "garden soil planting product material", productFamily: "garden soil and planting materials" }),
  { domainId: "irrigation", title: "irrigation", category: "plumbing", workFamily: "agro_irrigation", workKey: "garden_irrigation", promptAnchor: "irrigation pipe pump plumbing installation", productFamily: "irrigation pipes and pumps" },
  { domainId: "pools", title: "pools", category: "waterproofing", workFamily: "pools_wet_recreation", workKey: "pool_waterproofing", promptAnchor: "pool waterproofing plumbing membrane installation", dangerousWork: true, productFamily: "pool waterproofing materials" },
  { domainId: "sauna_bath", title: "sauna bath", category: "carpentry", workFamily: "sauna_bath_fitout", workKey: "sauna_fitout", promptAnchor: "sauna bath carpentry insulation fitout", dangerousWork: true, productFamily: "sauna timber and insulation" },
  { domainId: "playgrounds", title: "playgrounds", category: "landscaping", workFamily: "playgrounds_sports", workKey: "sports_court_surface", promptAnchor: "playground sports surface landscaping installation", productFamily: "playground surfacing materials" },
  { domainId: "commercial_fitout", title: "commercial fitout", category: "electrical", workFamily: "commercial_fitout", workKey: "electrical_basic", promptAnchor: "commercial fitout drywall partitions flooring electrical", productFamily: "commercial fitout materials" },
  { domainId: "office_fitout", title: "office fitout", category: "ceiling", workFamily: "office_fitout", workKey: "ceiling_painting", promptAnchor: "office fitout drywall partition ceiling flooring", productFamily: "office fitout materials" },
  { domainId: "restaurant_fitout", title: "restaurant fitout", category: "heating_hvac", workFamily: "restaurant_fitout", workKey: "ventilation_installation", promptAnchor: "restaurant fitout tile plumbing ventilation", dangerousWork: true, productFamily: "restaurant fitout materials" },
  { domainId: "clinic_fitout", title: "clinic fitout", category: "electrical", workFamily: "clinic_fitout", workKey: "electrical_basic", promptAnchor: "clinic fitout wall finishing flooring electrical", dangerousWork: true, productFamily: "clinic finish materials" },
  { domainId: "warehouse", title: "warehouse", category: "metalworks", workFamily: "warehouse_industrial", workKey: "warehouse_steel_frame", promptAnchor: "warehouse metal steel frame industrial floor", dangerousWork: true, productFamily: "warehouse steel materials" },
  { domainId: "industrial_flooring", title: "industrial flooring", category: "concrete", workFamily: "industrial_flooring", workKey: "concrete_slab", promptAnchor: "industrial flooring self leveling concrete coating", dangerousWork: true, productFamily: "industrial flooring materials" },
  { domainId: "fire_safety", title: "fire safety", category: "electrical", workFamily: "fire_safety_systems", workKey: "fire_alarm_installation", promptAnchor: "fire alarm electrical cable devices testing", dangerousWork: true, productFamily: "fire safety devices" },
  review({ domainId: "hazardous_material_no_diy", title: "hazardous material no diy", category: "demolition", workFamily: "hazardous_material", workKey: "hazardous_material_assessment", promptAnchor: "hazardous material assessment demolition containment specialist review", dangerousWork: true, productFamily: "hazardous material containment" }),
  review({ domainId: "mold_water_fire_damage", title: "mold water fire damage", category: "cleaning", workFamily: "damage_restoration", workKey: "mold_remediation", promptAnchor: "mold water fire damage cleaning restoration", dangerousWork: true, productFamily: "restoration supplies" }),
  review({ domainId: "documentation", title: "documentation", category: "documents_design", workFamily: "documentation", workKey: "as_built_docs", promptAnchor: "project documentation drawings estimate package", productFamily: "documentation service" }),
  review({ domainId: "design_project", title: "design project", category: "documents_design", workFamily: "design_project", workKey: "design_project", promptAnchor: "design project drawings estimate package", productFamily: "design service" }),
  review({ domainId: "surveys", title: "surveys", category: "documents_design", workFamily: "surveys", workKey: "geodetic_survey", promptAnchor: "survey geodetic documentation estimate package", productFamily: "survey service" }),
  review({ domainId: "inspections", title: "inspections", category: "documents_design", workFamily: "inspections", workKey: "inspection_report", promptAnchor: "inspection report documentation estimate package", productFamily: "inspection service" }),
  product({ domainId: "procurement", title: "procurement", category: "delivery_equipment", workFamily: "procurement", workKey: "procurement_plan", promptAnchor: "procurement material supplier product list", productFamily: "procurement materials" }),
  { domainId: "logistics", title: "logistics", category: "delivery_equipment", workFamily: "logistics_delivery", workKey: "delivery_lifting", promptAnchor: "delivery lifting logistics equipment service", productFamily: "delivery equipment" },
  product({ domainId: "equipment_rental", title: "equipment rental", category: "delivery_equipment", workFamily: "equipment_rental", workKey: "tool_rental", promptAnchor: "equipment rental product tool supplier", productFamily: "rental equipment" }),
  { domainId: "maintenance", title: "maintenance", category: "other", workFamily: "maintenance_repairs", workKey: "other_construction_work", promptAnchor: "building maintenance repair construction work", productFamily: "maintenance materials" },
  { domainId: "emergency_repairs", title: "emergency repairs", category: "other", workFamily: "emergency_repairs", workKey: "roof_repair", promptAnchor: "emergency roof leak repair construction work", dangerousWork: true, productFamily: "emergency repair materials" },
  { domainId: "apartment_turnkey", title: "apartment turnkey", category: "painting", workFamily: "turnkey_residential", workKey: "wall_painting", promptAnchor: "apartment turnkey flooring drywall painting plumbing", productFamily: "apartment turnkey materials" },
  { domainId: "house_turnkey", title: "house turnkey", category: "electrical", workFamily: "turnkey_house", workKey: "electrical_basic", promptAnchor: "house turnkey foundation masonry roof plumbing electrical", dangerousWork: true, productFamily: "house turnkey materials" },
  { domainId: "bathroom_turnkey", title: "bathroom turnkey", category: "tile", workFamily: "bathroom_turnkey", workKey: "bathroom_tile_full", promptAnchor: "bathroom turnkey tile waterproofing plumbing", dangerousWork: true, productFamily: "bathroom materials" },
  { domainId: "kitchen_turnkey", title: "kitchen turnkey", category: "electrical", workFamily: "kitchen_turnkey", workKey: "electrical_basic", promptAnchor: "kitchen turnkey plumbing tile furniture electrical", dangerousWork: true, productFamily: "kitchen materials" },
  { domainId: "garage", title: "garage", category: "masonry", workFamily: "garage_building", workKey: "brick_masonry", promptAnchor: "garage concrete slab masonry roof door", dangerousWork: true, productFamily: "garage materials" },
  { domainId: "basement", title: "basement", category: "waterproofing", workFamily: "basement", workKey: "foundation_waterproofing", promptAnchor: "basement waterproofing concrete drainage", dangerousWork: true, productFamily: "basement waterproofing materials" },
  { domainId: "attic", title: "attic", category: "heating_hvac", workFamily: "attic_conversion", workKey: "ventilation_installation", promptAnchor: "attic insulation drywall flooring ventilation", dangerousWork: true, productFamily: "attic insulation materials" },
  { domainId: "balcony", title: "balcony", category: "metalworks", workFamily: "balcony_repair", workKey: "metal_railing", promptAnchor: "balcony waterproofing tile railing repair", dangerousWork: true, productFamily: "balcony repair materials" },
  { domainId: "outdoor_structures", title: "outdoor structures", category: "carpentry", workFamily: "outdoor_structures", workKey: "pergola_wood", promptAnchor: "outdoor pergola deck timber carpentry", productFamily: "outdoor timber materials" },
  { domainId: "farm_buildings", title: "farm buildings", category: "concrete", workFamily: "farm_buildings", workKey: "concrete_slab", promptAnchor: "farm building metal frame concrete slab", dangerousWork: true, productFamily: "farm building steel" },
  { domainId: "agricultural_systems", title: "agricultural systems", category: "metalworks", workFamily: "agricultural_systems", workKey: "welded_frame", promptAnchor: "agricultural irrigation greenhouse plumbing system", productFamily: "agricultural system materials" },
  { domainId: "cold_rooms", title: "cold rooms", category: "delivery_equipment", workFamily: "cold_rooms", workKey: "crane_service", promptAnchor: "cold room insulation panels doors equipment", dangerousWork: true, productFamily: "cold room panels" },
  { domainId: "server_rooms", title: "server rooms", category: "electrical", workFamily: "server_rooms", workKey: "server_rack_installation", promptAnchor: "server room electrical cooling rack installation", dangerousWork: true, productFamily: "server room equipment" },
  { domainId: "acoustic_rooms", title: "acoustic rooms", category: "wall_finishing", workFamily: "acoustic_rooms", workKey: "wall_panel_installation", promptAnchor: "acoustic room drywall insulation wall finishing", productFamily: "acoustic room materials" },
  { domainId: "sports_facilities", title: "sports facilities", category: "landscaping", workFamily: "sports_facilities", workKey: "sports_court_surface", promptAnchor: "sports court surface landscaping installation", productFamily: "sports surfacing materials" },
  { domainId: "schools", title: "schools", category: "electrical", workFamily: "schools", workKey: "electrical_basic", promptAnchor: "school renovation wall finishing flooring electrical", dangerousWork: true, productFamily: "school renovation materials" },
  { domainId: "hotels", title: "hotels", category: "flooring", workFamily: "hotels", workKey: "carpet_laying", promptAnchor: "hotel renovation carpet flooring wall finishing", productFamily: "hotel finish materials" },
  { domainId: "retail", title: "retail", category: "electrical", workFamily: "retail", workKey: "electrical_basic", promptAnchor: "retail fitout drywall flooring electrical", productFamily: "retail fitout materials" },
  { domainId: "medical", title: "medical", category: "electrical", workFamily: "medical", workKey: "electrical_basic", promptAnchor: "medical clinic renovation wall finishing flooring electrical", dangerousWork: true, productFamily: "medical finish materials" },
  { domainId: "tenant_improvement", title: "tenant improvement", category: "wall_finishing", workFamily: "tenant_improvement", workKey: "tenant_improvement", promptAnchor: "tenant improvement drywall ceiling flooring electrical", productFamily: "tenant improvement materials" },
  { domainId: "public_works", title: "public works", category: "roadworks", workFamily: "public_works", workKey: "asphalt_paving", promptAnchor: "public works road asphalt drainage landscaping", dangerousWork: true, productFamily: "public works materials" },
  { domainId: "parking", title: "parking", category: "roadworks", workFamily: "parking", workKey: "asphalt_paving", promptAnchor: "parking asphalt paving base compaction", dangerousWork: true, productFamily: "parking materials" },
  { domainId: "roads_private", title: "private roads", category: "roadworks", workFamily: "private_roads", workKey: "asphalt_paving", promptAnchor: "private road asphalt paving gravel base", dangerousWork: true, productFamily: "private road materials" },
  { domainId: "utilities", title: "utilities", category: "electrical", workFamily: "utilities", workKey: "electrical_basic", promptAnchor: "utilities trench pipe electrical conduit installation", dangerousWork: true, productFamily: "utility materials" },
  { domainId: "water_supply", title: "water supply", category: "plumbing", workFamily: "water_supply", workKey: "pipe_replacement", promptAnchor: "water supply pipe plumbing installation pressure test", dangerousWork: true, productFamily: "water supply pipes" },
  { domainId: "sewage", title: "sewage", category: "plumbing", workFamily: "sewage", workKey: "sewer_pipe_installation", promptAnchor: "sewage sewer pipe plumbing installation", dangerousWork: true, productFamily: "sewer pipes" },
  { domainId: "stormwater", title: "stormwater", category: "plumbing", workFamily: "stormwater", workKey: "sewer_pipe_installation", promptAnchor: "stormwater drainage pipe catch basin installation", dangerousWork: true, productFamily: "stormwater materials" },
  { domainId: "heating_networks", title: "heating networks", category: "heating_hvac", workFamily: "heating_networks", workKey: "boiler_room_piping", promptAnchor: "heating network pipe trench insulation commissioning", dangerousWork: true, productFamily: "heating network pipes" },
  review({ domainId: "gas_estimate_only_no_diy", title: "gas estimate only no diy", category: "heating_hvac", workFamily: "gas_estimate_only", workKey: "boiler_room_piping", promptAnchor: "gas boiler heating estimate specialist review no diy", dangerousWork: true, productFamily: "gas certified service" }),
  review({ domainId: "structural_repair", title: "structural repair", category: "concrete", workFamily: "structural_repair", workKey: "retaining_wall_concrete", promptAnchor: "structural repair concrete rebar specialist review", dangerousWork: true, productFamily: "structural repair materials" }),
  review({ domainId: "restoration", title: "restoration", category: "documents_design", workFamily: "restoration", workKey: "design_project", promptAnchor: "restoration cleaning repair damage handover", dangerousWork: true, productFamily: "restoration materials" }),
  { domainId: "temporary_site", title: "temporary site", category: "delivery_equipment", workFamily: "temporary_site", workKey: "temporary_site_office", promptAnchor: "temporary site office fencing utility setup", productFamily: "temporary site equipment" },
  { domainId: "event_infrastructure", title: "event infrastructure", category: "delivery_equipment", workFamily: "event_infrastructure", workKey: "tool_rental", promptAnchor: "event temporary infrastructure equipment rental", productFamily: "event rental equipment" },
  { domainId: "household_small_tasks", title: "household small tasks", category: "cleaning", workFamily: "household_small_tasks", workKey: "construction_cleaning", promptAnchor: "household small repair construction work", productFamily: "household repair materials" },
  review({ domainId: "full_project_boq", title: "full project boq", category: "documents_design", workFamily: "full_project_boq", workKey: "quantity_takeoff", promptAnchor: "full project boq quantity takeoff documentation", productFamily: "full project boq service" }),
];

export const BUILT_IN_AI_10000_POST_BOQ_DOMAINS: readonly BuiltInAi10000PostBoqDomain[] = Object.freeze(
  DOMAINS.map((input, index) => d(input, index)),
);

export const BUILT_IN_AI_10000_POST_BOQ_MACRO_GROUP_IDS = Object.freeze(
  Array.from(new Set(BUILT_IN_AI_10000_POST_BOQ_DOMAINS.map((domain) => domain.macroGroupId))),
);

export const BUILT_IN_AI_10000_POST_BOQ_PRODUCT_DOMAIN_IDS = Object.freeze(
  BUILT_IN_AI_10000_POST_BOQ_DOMAINS
    .filter((domain) => domain.intent === "product_search")
    .map((domain) => domain.domainId),
);

export function isBuiltInAi10000PostBoqProductDomain(domain: BuiltInAi10000PostBoqDomain): boolean {
  return domain.intent === "product_search";
}

export function sourcePolicyForBuiltInAi10000PostBoqDomain(
  domain: BuiltInAi10000PostBoqDomain,
): BuiltInAi10000PostBoqSourcePolicy {
  return domain.sourcePolicy ?? "fresh_required";
}

export function intentForBuiltInAi10000PostBoqDomain(
  domain: BuiltInAi10000PostBoqDomain,
): BuiltInAi10000PostBoqIntent {
  return domain.intent ?? "estimate";
}

if (BUILT_IN_AI_10000_POST_BOQ_REQUIRED_DOMAIN_IDS.length !== 100) {
  throw new Error(`BUILT_IN_AI_10000_POST_BOQ_REQUIRED_DOMAIN_COUNT_INVALID:${BUILT_IN_AI_10000_POST_BOQ_REQUIRED_DOMAIN_IDS.length}`);
}

if (BUILT_IN_AI_10000_POST_BOQ_DOMAINS.length !== 100) {
  throw new Error(`BUILT_IN_AI_10000_POST_BOQ_DOMAIN_COUNT_INVALID:${BUILT_IN_AI_10000_POST_BOQ_DOMAINS.length}`);
}

for (const expected of BUILT_IN_AI_10000_POST_BOQ_REQUIRED_DOMAIN_IDS) {
  if (!BUILT_IN_AI_10000_POST_BOQ_DOMAINS.some((domain) => domain.domainId === expected)) {
    throw new Error(`BUILT_IN_AI_10000_POST_BOQ_DOMAIN_MISSING:${expected}`);
  }
}
