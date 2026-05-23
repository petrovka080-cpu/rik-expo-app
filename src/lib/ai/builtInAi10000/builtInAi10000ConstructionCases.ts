import type { GlobalUnitInput, GlobalWorkCategory } from "../globalEstimate/globalEstimateTypes";
import type { BuiltInAi10000Case, BuiltInAi10000Domain } from "./builtInAi10000CaseTypes";

const EXPECTED_ROWS_BY_CATEGORY: Record<GlobalWorkCategory, string[]> = {
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

const DOMAINS: readonly BuiltInAi10000Domain[] = [
  { id: "001", key: "earthworks_site_prep", title: "earthworks and site preparation", category: "roadworks", backendWorkKey: "gravel_road_base", promptAnchor: "roadworks site grading base compaction", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.roadworks },
  { id: "002", key: "foundations_concrete", title: "foundations and concrete", category: "foundation", backendWorkKey: "strip_foundation", promptAnchor: "foundation concrete formwork rebar", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.foundation },
  { id: "003", key: "rebar_formwork", title: "rebar and formwork", category: "concrete", backendWorkKey: "rebar_installation", promptAnchor: "concrete rebar formwork installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.concrete, dangerousWork: true },
  { id: "004", key: "masonry_blocks_stone", title: "brick block and stone masonry", category: "masonry", backendWorkKey: "brick_masonry", promptAnchor: "masonry brick block laying", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.masonry },
  { id: "005", key: "metal_structures", title: "metal structures", category: "metalworks", backendWorkKey: "welded_frame", promptAnchor: "metal steel welding fabrication", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.metalworks, dangerousWork: true },
  { id: "006", key: "pitched_roofs", title: "pitched roofing", category: "roofing", backendWorkKey: "gable_roof_installation", promptAnchor: "roof roofing installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.roofing, dangerousWork: true },
  { id: "007", key: "flat_roofs_waterproofing", title: "flat roofs and roof membrane systems", category: "roofing", backendWorkKey: "flat_roof_membrane", promptAnchor: "flat roof membrane roofing installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.roofing, dangerousWork: true },
  { id: "008", key: "facades_cladding", title: "facades and exterior cladding", category: "facade", backendWorkKey: "facade_insulation", promptAnchor: "facade cladding insulation installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.facade },
  { id: "009", key: "windows_doors_glazing", title: "windows doors and glazing", category: "doors_windows", backendWorkKey: "window_installation", promptAnchor: "window door glazing installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.doors_windows },
  { id: "010", key: "drywall_partitions", title: "drywall and partitions", category: "drywall", backendWorkKey: "drywall_partition", promptAnchor: "drywall partition installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.drywall },
  { id: "011", key: "flooring_finishes", title: "flooring finishes", category: "flooring", backendWorkKey: "laminate_laying", promptAnchor: "laminate flooring installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.flooring },
  { id: "012", key: "tile_wet_zones", title: "tile and wet zones", category: "tile", backendWorkKey: "ceramic_tile_laying", promptAnchor: "tile bathroom laying", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.tile },
  { id: "013", key: "wall_finishing", title: "wall finishing", category: "wall_finishing", backendWorkKey: "wall_painting", promptAnchor: "paint walls wall finishing", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.wall_finishing },
  { id: "014", key: "ceilings_finishing", title: "ceilings and finish cycles", category: "ceiling", backendWorkKey: "ceiling_painting", promptAnchor: "ceiling finish painting", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.ceiling },
  { id: "015", key: "painting_coatings", title: "painting and coatings", category: "painting", backendWorkKey: "wall_painting", promptAnchor: "paint coating application", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.painting },
  { id: "016", key: "plaster_putty", title: "plaster putty and leveling", category: "plastering", backendWorkKey: "wall_plastering", promptAnchor: "plaster wall putty application", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.plastering },
  { id: "017", key: "plumbing_water", title: "water supply plumbing", category: "plumbing", backendWorkKey: "pipe_replacement", promptAnchor: "plumbing pipe installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.plumbing },
  { id: "018", key: "sewer_drainage", title: "sewer and drainage", category: "plumbing", backendWorkKey: "sewer_pipe_installation", promptAnchor: "plumbing sewer drainage pipe installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.plumbing },
  { id: "019", key: "electrical_interior", title: "interior electrical", category: "electrical", backendWorkKey: "electrical_wiring", promptAnchor: "electrical wiring installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.electrical, dangerousWork: true },
  { id: "020", key: "low_voltage_security", title: "low voltage security systems", category: "electrical", backendWorkKey: "low_voltage_network", promptAnchor: "electrical low voltage network installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.electrical, dangerousWork: true },
  { id: "021", key: "heating_systems", title: "heating systems", category: "heating_hvac", backendWorkKey: "heating_radiator_installation", promptAnchor: "hvac heating pipe installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.heating_hvac },
  { id: "022", key: "ventilation_aircon", title: "ventilation and air conditioning", category: "heating_hvac", backendWorkKey: "ventilation_installation", promptAnchor: "hvac ventilation duct installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.heating_hvac },
  { id: "023", key: "fire_safety_systems", title: "fire safety systems", category: "electrical", backendWorkKey: "fire_alarm_installation", promptAnchor: "electrical fire alarm installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.electrical, dangerousWork: true },
  { id: "024", key: "elevators_lifts", title: "elevators lifts and hoists", category: "delivery_equipment", backendWorkKey: "crane_service", promptAnchor: "equipment lift hoist installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.delivery_equipment },
  { id: "025", key: "accessibility", title: "accessible environment", category: "metalworks", backendWorkKey: "metal_railing", promptAnchor: "metal accessibility ramp railing installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.metalworks, dangerousWork: true },
  { id: "026", key: "roads_asphalt", title: "roads and asphalt", category: "roadworks", backendWorkKey: "asphalt_paving", promptAnchor: "asphalt road paving", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.roadworks },
  { id: "027", key: "paving_hardscape", title: "paving and hardscape", category: "landscaping", backendWorkKey: "paving_slabs", promptAnchor: "paving slabs landscaping installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.landscaping },
  { id: "028", key: "landscaping_garden", title: "landscaping and garden works", category: "landscaping", backendWorkKey: "lawn_installation", promptAnchor: "landscaping lawn installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.landscaping },
  { id: "029", key: "irrigation_water", title: "irrigation and outdoor water", category: "plumbing", backendWorkKey: "irrigation_system", promptAnchor: "plumbing irrigation pipe installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.plumbing },
  { id: "030", key: "pools_spas", title: "pools spas and wet recreation", category: "waterproofing", backendWorkKey: "pool_waterproofing", promptAnchor: "waterproofing pool plumbing installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.waterproofing },
  { id: "031", key: "solar_energy", title: "solar power systems", category: "electrical", backendWorkKey: "electrical_wiring", promptAnchor: "electrical solar panel installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.electrical, dangerousWork: true },
  { id: "032", key: "batteries_microgrids", title: "batteries inverters and microgrids", category: "electrical", backendWorkKey: "electrical_wiring", promptAnchor: "electrical battery inverter microgrid installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.electrical, dangerousWork: true },
  { id: "033", key: "thermal_energy_boilers", title: "boilers CHP and thermal energy", category: "heating_hvac", backendWorkKey: "boiler_installation", promptAnchor: "hvac boiler heating installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.heating_hvac, dangerousWork: true },
  { id: "034", key: "hydro_energy", title: "hydro and micro hydro civil systems", category: "concrete", backendWorkKey: "concrete_slab", promptAnchor: "concrete hydro turbine civil works", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.concrete, dangerousWork: true },
  { id: "035", key: "substations_power_lines", title: "substations and power lines", category: "electrical", backendWorkKey: "electrical_wiring", promptAnchor: "electrical substation power line installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.electrical, dangerousWork: true },
  { id: "036", key: "industrial_buildings", title: "industrial buildings", category: "metalworks", backendWorkKey: "warehouse_steel_frame", promptAnchor: "metal industrial steel frame installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.metalworks, dangerousWork: true },
  { id: "037", key: "warehouses_logistics", title: "warehouses and logistics spaces", category: "metalworks", backendWorkKey: "warehouse_steel_frame", promptAnchor: "metal warehouse frame installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.metalworks, dangerousWork: true },
  { id: "038", key: "agriculture_buildings", title: "agricultural buildings", category: "metalworks", backendWorkKey: "warehouse_steel_frame", promptAnchor: "metal agricultural building installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.metalworks, dangerousWork: true },
  { id: "039", key: "greenhouses", title: "greenhouses and farm tunnels", category: "metalworks", backendWorkKey: "greenhouse_frame", promptAnchor: "metal greenhouse installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.metalworks },
  { id: "040", key: "gardening_vegetable", title: "gardening vegetable beds and orchard", category: "landscaping", backendWorkKey: "lawn_installation", promptAnchor: "landscaping garden soil installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.landscaping },
  { id: "041", key: "fences_gates", title: "fences gates and boundaries", category: "metalworks", backendWorkKey: "fence_installation", promptAnchor: "metal fence gate installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.metalworks },
  { id: "042", key: "outdoor_structures", title: "yard structures", category: "carpentry", backendWorkKey: "pergola_wood", promptAnchor: "carpentry pergola yard installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.carpentry },
  { id: "043", key: "playgrounds_sports", title: "playgrounds and sports courts", category: "landscaping", backendWorkKey: "sports_court_surface", promptAnchor: "landscaping sports playground installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.landscaping },
  { id: "044", key: "marine_docks", title: "docks piers and waterfront structures", category: "carpentry", backendWorkKey: "wood_deck", promptAnchor: "carpentry dock deck installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.carpentry },
  { id: "045", key: "bridges_culverts", title: "small bridges and culverts", category: "concrete", backendWorkKey: "retaining_wall_concrete", promptAnchor: "concrete bridge culvert installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.concrete, dangerousWork: true },
  { id: "046", key: "telecom_networks", title: "telecom and network infrastructure", category: "electrical", backendWorkKey: "ethernet_network", promptAnchor: "electrical telecom network installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.electrical, dangerousWork: true },
  { id: "047", key: "data_centers", title: "data centers and server rooms", category: "electrical", backendWorkKey: "server_rack_installation", promptAnchor: "electrical server room installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.electrical, dangerousWork: true },
  { id: "048", key: "smart_home", title: "smart home systems", category: "electrical", backendWorkKey: "smart_home_basic", promptAnchor: "electrical smart home installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.electrical, dangerousWork: true },
  { id: "049", key: "home_appliances", title: "home appliances", category: "electrical", backendWorkKey: "kitchen_appliance_wiring", promptAnchor: "electrical appliance installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.electrical },
  { id: "050", key: "kitchen_bath_fitout", title: "kitchen and bath fitout", category: "plumbing", backendWorkKey: "bathroom_plumbing_turnkey", promptAnchor: "plumbing kitchen bathroom installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.plumbing },
  { id: "051", key: "furniture_cabinets", title: "furniture and cabinets", category: "carpentry", backendWorkKey: "built_in_wardrobe", promptAnchor: "carpentry cabinet furniture installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.carpentry },
  { id: "052", key: "apartment_furnishing", title: "apartment furnishing", category: "carpentry", backendWorkKey: "carpentry_turnkey", promptAnchor: "carpentry furnishing installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.carpentry },
  { id: "053", key: "home_textiles", title: "home textiles and soft finishes", category: "wall_finishing", backendWorkKey: "wall_panel_installation", promptAnchor: "wall finishing textile panel installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.wall_finishing },
  { id: "054", key: "household_services", title: "household services", category: "cleaning", backendWorkKey: "post_renovation_cleaning", promptAnchor: "cleaning household service", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.cleaning },
  { id: "055", key: "cleaning_restoration", title: "cleaning and restoration", category: "cleaning", backendWorkKey: "construction_cleaning_final", promptAnchor: "cleaning restoration service", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.cleaning },
  { id: "056", key: "emergency_repairs", title: "emergency repairs", category: "other", backendWorkKey: "other_construction_work", promptAnchor: "repair emergency construction work", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.other },
  { id: "057", key: "water_damage_mold", title: "water damage and mold cleanup", category: "cleaning", backendWorkKey: "mold_remediation", promptAnchor: "cleaning mold water damage repair", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.cleaning },
  { id: "058", key: "fire_damage", title: "fire damage cleanup", category: "cleaning", backendWorkKey: "fire_damage_cleanup", promptAnchor: "cleaning fire damage repair", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.cleaning },
  { id: "059", key: "pest_control", title: "pest control and sanitary treatment", category: "cleaning", backendWorkKey: "wall_surface_disinfection", promptAnchor: "cleaning sanitary treatment", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.cleaning },
  { id: "060", key: "decor_furnishing", title: "decor and furnishing", category: "carpentry", backendWorkKey: "carpentry_turnkey", promptAnchor: "carpentry decor furnishing installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.carpentry },
  { id: "061", key: "interior_design_docs", title: "interior design documents", category: "documents_design", backendWorkKey: "design_project", promptAnchor: "project design documentation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.documents_design },
  { id: "062", key: "architectural_docs", title: "architectural documents", category: "documents_design", backendWorkKey: "architectural_project", promptAnchor: "project architecture documentation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.documents_design },
  { id: "063", key: "engineering_docs", title: "engineering documents", category: "documents_design", backendWorkKey: "engineering_project", promptAnchor: "project engineering documentation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.documents_design },
  { id: "064", key: "permits_inspections", title: "permits and inspections", category: "documents_design", backendWorkKey: "permit_documents", promptAnchor: "project permit inspection documentation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.documents_design },
  { id: "065", key: "surveying_geology", title: "surveying and geology", category: "documents_design", backendWorkKey: "geodetic_survey", promptAnchor: "project survey geology documentation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.documents_design },
  { id: "066", key: "quantity_estimation", title: "quantity takeoff and BOQ", category: "documents_design", backendWorkKey: "quantity_takeoff", promptAnchor: "project quantity takeoff boq documentation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.documents_design },
  { id: "067", key: "procurement_planning", title: "procurement planning", category: "documents_design", backendWorkKey: "procurement_plan", promptAnchor: "project procurement plan documentation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.documents_design },
  { id: "068", key: "quality_safety_docs", title: "quality and safety documents", category: "documents_design", backendWorkKey: "quality_control_plan", promptAnchor: "project quality safety documentation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.documents_design },
  { id: "069", key: "handover_docs", title: "handover and as-built documents", category: "documents_design", backendWorkKey: "as_built_docs", promptAnchor: "project handover as-built documentation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.documents_design },
  { id: "070", key: "maintenance_docs", title: "maintenance manuals", category: "documents_design", backendWorkKey: "maintenance_manual", promptAnchor: "project maintenance manual documentation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.documents_design },
  { id: "071", key: "logistics_delivery", title: "logistics and delivery", category: "delivery_equipment", backendWorkKey: "delivery_lifting", promptAnchor: "delivery equipment logistics service", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.delivery_equipment },
  { id: "072", key: "cranes_lifting", title: "cranes and lifting", category: "delivery_equipment", backendWorkKey: "crane_service", promptAnchor: "delivery equipment crane lifting service", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.delivery_equipment },
  { id: "073", key: "earthmoving_equipment", title: "earthmoving equipment", category: "delivery_equipment", backendWorkKey: "excavator_service", promptAnchor: "delivery equipment excavator service", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.delivery_equipment },
  { id: "074", key: "temporary_site", title: "temporary site infrastructure", category: "delivery_equipment", backendWorkKey: "temporary_site_office", promptAnchor: "delivery equipment temporary site service", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.delivery_equipment },
  { id: "075", key: "event_infrastructure", title: "temporary event infrastructure", category: "delivery_equipment", backendWorkKey: "tool_rental", promptAnchor: "delivery equipment event temporary service", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.delivery_equipment },
  { id: "076", key: "building_automation", title: "building automation", category: "electrical", backendWorkKey: "smart_home_basic", promptAnchor: "electrical automation installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.electrical, dangerousWork: true },
  { id: "077", key: "security_access", title: "security and access control", category: "electrical", backendWorkKey: "access_control_install", promptAnchor: "electrical security access control installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.electrical, dangerousWork: true },
  { id: "078", key: "lighting_systems", title: "lighting systems", category: "electrical", backendWorkKey: "lighting_installation", promptAnchor: "electrical lighting installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.electrical, dangerousWork: true },
  { id: "079", key: "water_treatment", title: "water treatment", category: "plumbing", backendWorkKey: "water_filter_installation", promptAnchor: "plumbing water treatment installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.plumbing },
  { id: "080", key: "wastewater_treatment", title: "wastewater treatment", category: "plumbing", backendWorkKey: "septic_connection", promptAnchor: "plumbing wastewater treatment installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.plumbing },
  { id: "081", key: "agro_irrigation", title: "agro irrigation", category: "plumbing", backendWorkKey: "irrigation_system", promptAnchor: "plumbing irrigation installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.plumbing },
  { id: "082", key: "farm_storage", title: "farm storage buildings", category: "metalworks", backendWorkKey: "warehouse_steel_frame", promptAnchor: "metal farm storage installation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.metalworks, dangerousWork: true },
  { id: "083", key: "small_home_repairs", title: "small home repairs", category: "other", backendWorkKey: "other_construction_work", promptAnchor: "repair home construction work", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.other },
  { id: "084", key: "rental_turnover", title: "rental turnover repairs", category: "cleaning", backendWorkKey: "post_renovation_cleaning", promptAnchor: "cleaning repair turnover service", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.cleaning },
  { id: "085", key: "seasonal_maintenance", title: "seasonal maintenance", category: "other", backendWorkKey: "other_construction_work", promptAnchor: "repair seasonal maintenance construction work", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.other },
  { id: "086", key: "building_service_maintenance", title: "building service maintenance", category: "heating_hvac", backendWorkKey: "hvac_service", promptAnchor: "hvac service maintenance", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.heating_hvac },
  { id: "087", key: "industrial_maintenance", title: "industrial maintenance", category: "metalworks", backendWorkKey: "welding_repair", promptAnchor: "metal industrial repair service", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.metalworks, dangerousWork: true },
  { id: "088", key: "energy_maintenance", title: "energy equipment maintenance", category: "electrical", backendWorkKey: "electrical_commissioning", promptAnchor: "electrical energy maintenance service", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.electrical, dangerousWork: true },
  { id: "089", key: "road_maintenance", title: "road maintenance", category: "roadworks", backendWorkKey: "asphalt_patch_repair", promptAnchor: "road asphalt repair service", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.roadworks },
  { id: "090", key: "facility_management", title: "facility management works", category: "documents_design", backendWorkKey: "project_management", promptAnchor: "project facility management documentation", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.documents_design },
  { id: "091", key: "product_material_catalogs", title: "material catalog product search", category: "delivery_equipment", backendWorkKey: "procurement_list", promptAnchor: "material supplier product", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.delivery_equipment, intentKind: "product_search" },
  { id: "092", key: "supplier_quotes", title: "supplier quote search", category: "delivery_equipment", backendWorkKey: "supplier_quote_request", promptAnchor: "supplier product material", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.delivery_equipment, intentKind: "product_search" },
  { id: "093", key: "equipment_rental_products", title: "equipment rental product search", category: "delivery_equipment", backendWorkKey: "rental_equipment_search", promptAnchor: "equipment rental product supplier", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.delivery_equipment, intentKind: "product_search" },
  { id: "094", key: "furniture_products", title: "furniture product search", category: "carpentry", backendWorkKey: "carpentry_turnkey", promptAnchor: "furniture product material supplier", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.carpentry, intentKind: "product_search" },
  { id: "095", key: "energy_products", title: "energy equipment product search", category: "electrical", backendWorkKey: "electrical_wiring", promptAnchor: "electrical energy product supplier", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.electrical, intentKind: "product_search" },
  { id: "096", key: "plumbing_products", title: "plumbing product search", category: "plumbing", backendWorkKey: "plumbing_parts_search", promptAnchor: "plumbing product material supplier", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.plumbing, intentKind: "product_search" },
  { id: "097", key: "electrical_products", title: "electrical product search", category: "electrical", backendWorkKey: "electrical_parts_search", promptAnchor: "electrical product material supplier", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.electrical, intentKind: "product_search" },
  { id: "098", key: "hvac_products", title: "HVAC product search", category: "heating_hvac", backendWorkKey: "hvac_equipment_search", promptAnchor: "hvac product equipment supplier", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.heating_hvac, intentKind: "product_search" },
  { id: "099", key: "garden_products", title: "garden product search", category: "landscaping", backendWorkKey: "lawn_installation", promptAnchor: "garden landscaping product supplier", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.landscaping, intentKind: "product_search" },
  { id: "100", key: "event_rental_products", title: "event rental product search", category: "delivery_equipment", backendWorkKey: "rental_equipment_search", promptAnchor: "event rental product supplier", expectedRowsContain: EXPECTED_ROWS_BY_CATEGORY.delivery_equipment, intentKind: "product_search" },
];

const SCOPES = [
  "residential",
  "apartment",
  "private house",
  "commercial",
  "industrial",
  "municipal",
  "utility",
  "emergency",
  "premium",
  "budget",
] as const;

const ACTIONS = [
  "package alpha",
  "package beta",
  "package gamma",
  "package delta",
  "package epsilon",
  "package zeta",
  "package eta",
  "package theta",
  "package iota",
  "package kappa",
] as const;

function padId(value: number): string {
  return String(value).padStart(5, "0");
}

function expectedTitleContains(title: string): string[] {
  return title.toLowerCase().split(/\s+/).filter((token) => token.length > 3).slice(0, 5);
}

function unitForCase(domain: BuiltInAi10000Domain): GlobalUnitInput["normalizedUnit"] {
  if (domain.intentKind === "product_search") return "pcs";
  if (domain.category === "documents_design" || domain.category === "delivery_equipment" || domain.category === "other") return "set";
  if (domain.category === "metalworks") return "kg";
  return "sq_m";
}

function unitLabel(unit: GlobalUnitInput["normalizedUnit"]): string {
  if (unit === "sq_m") return "sqm";
  if (unit === "m3") return "m3";
  if (unit === "kg") return "kg";
  if (unit === "ton") return "ton";
  if (unit === "pcs") return "pcs";
  return "set";
}

function volumeFor(domainIndex: number, actionIndex: number, unit: GlobalUnitInput["normalizedUnit"]): number {
  if (unit === "pcs") return 10 + actionIndex;
  if (unit === "kg") return 250 + domainIndex * 10 + actionIndex;
  if (unit === "set") return 1;
  return 40 + domainIndex + actionIndex * 5;
}

function buildCase(domain: BuiltInAi10000Domain, domainIndex: number, scopeIndex: number, actionIndex: number): BuiltInAi10000Case {
  const id = padId(domainIndex * 100 + scopeIndex * ACTIONS.length + actionIndex + 1);
  const scope = SCOPES[scopeIndex];
  const action = ACTIONS[actionIndex];
  const unit = unitForCase(domain);
  const volume = volumeFor(domainIndex, actionIndex, unit);
  const title = `${scope} ${domain.title} ${action}`;
  const prompt = domain.intentKind === "product_search"
    ? `find product material supplier for ${domain.promptAnchor} ${title} ${volume} ${unitLabel(unit)}`
    : `estimate cost for ${domain.promptAnchor} ${title} ${volume} ${unitLabel(unit)}`;
  return {
    id,
    domainId: domain.id,
    domainKey: domain.key,
    category: domain.category,
    workKey: domain.backendWorkKey,
    titleRu: title,
    promptRu: prompt,
    volume,
    unit,
    expectedTitleContains: expectedTitleContains(title),
    expectedRowsContain: domain.expectedRowsContain,
    forbiddenRowsContain: [],
    dangerousWork: domain.dangerousWork,
    productSearchCompanion: domain.intentKind === "product_search",
  };
}

export const BUILT_IN_AI_10000_DOMAINS = Object.freeze(DOMAINS);

export const BUILT_IN_AI_10000_CONSTRUCTION_CASES: readonly BuiltInAi10000Case[] = Object.freeze(
  DOMAINS.flatMap((domain, domainIndex) =>
    SCOPES.flatMap((_, scopeIndex) =>
      ACTIONS.map((__, actionIndex) => buildCase(domain, domainIndex, scopeIndex, actionIndex)),
    ),
  ),
);

if (BUILT_IN_AI_10000_DOMAINS.length !== 100) {
  throw new Error(`BUILT_IN_AI_10000_DOMAIN_COUNT_INVALID:${BUILT_IN_AI_10000_DOMAINS.length}`);
}

if (BUILT_IN_AI_10000_CONSTRUCTION_CASES.length !== 10000) {
  throw new Error(`BUILT_IN_AI_10000_CASES_COUNT_INVALID:${BUILT_IN_AI_10000_CONSTRUCTION_CASES.length}`);
}

export const BUILT_IN_AI_10000_ESTIMATE_CASES: readonly BuiltInAi10000Case[] =
  BUILT_IN_AI_10000_CONSTRUCTION_CASES.filter((testCase) => !testCase.productSearchCompanion);

export const BUILT_IN_AI_10000_PRODUCT_CASES: readonly BuiltInAi10000Case[] =
  BUILT_IN_AI_10000_CONSTRUCTION_CASES.filter((testCase) => testCase.productSearchCompanion);

export const BUILT_IN_AI_10000_CATEGORY_SUMMARY = Object.freeze(
  BUILT_IN_AI_10000_CONSTRUCTION_CASES.reduce<Record<string, number>>((summary, testCase) => {
    summary[testCase.domainKey] = (summary[testCase.domainKey] ?? 0) + 1;
    return summary;
  }, {}),
);

export const BUILT_IN_AI_10000_GLOBAL_CATEGORY_SUMMARY = Object.freeze(
  BUILT_IN_AI_10000_CONSTRUCTION_CASES.reduce<Record<string, number>>((summary, testCase) => {
    summary[testCase.category] = (summary[testCase.category] ?? 0) + 1;
    return summary;
  }, {}),
);
