import type {
  ProfessionalEstimateRowSourcePolicy,
  ProfessionalEstimateRecipeRow,
  ProfessionalEstimateRowKind,
  ProfessionalEstimateUnit,
  ProfessionalGroupKey,
} from "./professionalEstimateTypes";

type RowSeed = {
  suffix: string;
  row_kind: ProfessionalEstimateRowKind;
  visible_name_ru: string;
  unit: ProfessionalEstimateUnit;
  formula: string;
  waste_percent?: number;
  required?: boolean;
  price_required?: boolean;
  source_policy?: ProfessionalEstimateRowSourcePolicy;
};

const GROUP_RECIPE_SEEDS: Readonly<Record<ProfessionalGroupKey, readonly RowSeed[]>> = {
  demolition: [
    { suffix: "protective_film", row_kind: "material", visible_name_ru: "Protective film", unit: "roll", formula: "quantity * 0.02", waste_percent: 5 },
    { suffix: "waste_bags", row_kind: "material", visible_name_ru: "Construction waste bags", unit: "piece", formula: "quantity * 0.4", waste_percent: 0 },
    { suffix: "demolition_labor", row_kind: "labor", visible_name_ru: "Demolition labor", unit: "hour", formula: "quantity * 0.45", price_required: true },
    { suffix: "hand_tools", row_kind: "equipment", visible_name_ru: "Demolition tool set", unit: "shift", formula: "quantity * 0.02", price_required: true },
  ],
  earthworks: [
    { suffix: "excavated_soil_handling", row_kind: "material", visible_name_ru: "Excavated soil handling", unit: "m3", formula: "quantity * 1", waste_percent: 0 },
    { suffix: "sand_bedding", row_kind: "material", visible_name_ru: "Sand bedding", unit: "m3", formula: "quantity * 0.12", waste_percent: 8 },
    { suffix: "geotextile", row_kind: "material", visible_name_ru: "Geotextile", unit: "m2", formula: "quantity * 1.05", waste_percent: 5 },
    { suffix: "excavator", row_kind: "equipment", visible_name_ru: "Excavator", unit: "shift", formula: "quantity * 0.015", price_required: true },
    { suffix: "earthwork_labor", row_kind: "labor", visible_name_ru: "Earthwork preparation labor", unit: "hour", formula: "quantity * 0.18", price_required: true },
  ],
  foundation_concrete: [
    { suffix: "concrete_b25", row_kind: "material", visible_name_ru: "Concrete B25", unit: "m3", formula: "quantity * 1", waste_percent: 3 },
    { suffix: "rebar_a500c_d12", row_kind: "material", visible_name_ru: "Rebar A500C D12", unit: "kg", formula: "quantity * 95", waste_percent: 4 },
    { suffix: "rebar_a500c_d8", row_kind: "material", visible_name_ru: "Rebar A500C D8", unit: "kg", formula: "quantity * 28", waste_percent: 4 },
    { suffix: "binding_wire", row_kind: "material", visible_name_ru: "Binding wire", unit: "kg", formula: "quantity * 1.5", waste_percent: 2 },
    { suffix: "formwork", row_kind: "material", visible_name_ru: "Formwork", unit: "m2", formula: "quantity * 1.15", waste_percent: 8 },
    { suffix: "sand_preparation", row_kind: "material", visible_name_ru: "Sand preparation", unit: "m3", formula: "quantity * 0.12", waste_percent: 8 },
    { suffix: "crushed_stone_preparation", row_kind: "material", visible_name_ru: "Crushed stone preparation", unit: "m3", formula: "quantity * 0.12", waste_percent: 8 },
    { suffix: "concrete_pump", row_kind: "equipment", visible_name_ru: "Concrete pump", unit: "shift", formula: "quantity * 0.03", price_required: true },
    { suffix: "deep_vibrator", row_kind: "equipment", visible_name_ru: "Deep vibrator", unit: "shift", formula: "quantity * 0.02", price_required: true },
    { suffix: "concreting_labor", row_kind: "labor", visible_name_ru: "Concreting labor", unit: "hour", formula: "quantity * 1.25", price_required: true },
  ],
  reinforcement_formwork: [
    { suffix: "rebar_a500c_d12", row_kind: "material", visible_name_ru: "Rebar A500C D12", unit: "kg", formula: "quantity * 1", waste_percent: 4 },
    { suffix: "binding_wire", row_kind: "material", visible_name_ru: "Binding wire", unit: "kg", formula: "quantity * 0.018", waste_percent: 2 },
    { suffix: "spacers", row_kind: "material", visible_name_ru: "Concrete cover spacers", unit: "piece", formula: "quantity * 0.25", waste_percent: 5 },
    { suffix: "formwork_panels", row_kind: "material", visible_name_ru: "Formwork panels", unit: "m2", formula: "quantity * 0.08", waste_percent: 7 },
    { suffix: "rebar_labor", row_kind: "labor", visible_name_ru: "Rebar fixing labor", unit: "hour", formula: "quantity * 0.035", price_required: true },
    { suffix: "cutting_tools", row_kind: "equipment", visible_name_ru: "Rebar cutting tool", unit: "shift", formula: "quantity * 0.002", price_required: true },
  ],
  masonry: [
    { suffix: "masonry_units", row_kind: "material", visible_name_ru: "Masonry units", unit: "piece", formula: "quantity * 52", waste_percent: 5 },
    { suffix: "masonry_mortar", row_kind: "material", visible_name_ru: "Masonry mortar", unit: "bag", formula: "quantity * 0.32", waste_percent: 5 },
    { suffix: "masonry_mesh", row_kind: "material", visible_name_ru: "Masonry mesh", unit: "linear_m", formula: "quantity * 0.35", waste_percent: 5 },
    { suffix: "masonry_labor", row_kind: "labor", visible_name_ru: "Masonry labor", unit: "hour", formula: "quantity * 1.1", price_required: true },
    { suffix: "mixer", row_kind: "equipment", visible_name_ru: "Mortar mixer", unit: "shift", formula: "quantity * 0.015", price_required: true },
  ],
  waterproofing: [
    { suffix: "bitumen_primer", row_kind: "material", visible_name_ru: "Bitumen primer", unit: "bucket", formula: "quantity * 0.04", waste_percent: 5 },
    { suffix: "bitumen_mastic", row_kind: "material", visible_name_ru: "Bitumen mastic", unit: "bucket", formula: "quantity * 0.06", waste_percent: 6 },
    { suffix: "waterproofing_membrane", row_kind: "material", visible_name_ru: "Waterproofing membrane", unit: "roll", formula: "quantity * 0.11", waste_percent: 10 },
    { suffix: "joint_sealant", row_kind: "material", visible_name_ru: "Joint sealant", unit: "bucket", formula: "quantity * 0.015", waste_percent: 5 },
    { suffix: "gas_burner", row_kind: "equipment", visible_name_ru: "Gas burner equipment", unit: "shift", formula: "quantity * 0.02", price_required: true },
    { suffix: "waterproofing_labor", row_kind: "labor", visible_name_ru: "Waterproofing layer labor", unit: "hour", formula: "quantity * 0.55", price_required: true },
  ],
  roofing: [
    { suffix: "roof_covering", row_kind: "material", visible_name_ru: "Roof covering", unit: "m2", formula: "quantity * 1.08", waste_percent: 8 },
    { suffix: "underlay_membrane", row_kind: "material", visible_name_ru: "Roof underlay membrane", unit: "roll", formula: "quantity * 0.08", waste_percent: 7 },
    { suffix: "fasteners", row_kind: "material", visible_name_ru: "Roof fasteners", unit: "set", formula: "quantity * 0.05", waste_percent: 5 },
    { suffix: "gutter_system", row_kind: "material", visible_name_ru: "Gutter system", unit: "linear_m", formula: "quantity * 0.18", waste_percent: 5 },
    { suffix: "roofing_labor", row_kind: "labor", visible_name_ru: "Roofing installation labor", unit: "hour", formula: "quantity * 0.75", price_required: true },
    { suffix: "roof_lift", row_kind: "equipment", visible_name_ru: "Roof lifting equipment", unit: "shift", formula: "quantity * 0.012", price_required: true },
  ],
  insulation: [
    { suffix: "mineral_wool", row_kind: "material", visible_name_ru: "Mineral wool insulation", unit: "m2", formula: "quantity * 1.05", waste_percent: 5 },
    { suffix: "vapor_barrier", row_kind: "material", visible_name_ru: "Vapor barrier", unit: "roll", formula: "quantity * 0.05", waste_percent: 5 },
    { suffix: "insulation_fasteners", row_kind: "material", visible_name_ru: "Insulation fasteners", unit: "piece", formula: "quantity * 6", waste_percent: 5 },
    { suffix: "insulation_labor", row_kind: "labor", visible_name_ru: "Insulation labor", unit: "hour", formula: "quantity * 0.36", price_required: true },
    { suffix: "cutting_table", row_kind: "equipment", visible_name_ru: "Insulation cutting tool", unit: "shift", formula: "quantity * 0.006", price_required: true },
  ],
  facade: [
    { suffix: "facade_primer", row_kind: "material", visible_name_ru: "Facade primer", unit: "bucket", formula: "quantity * 0.035", waste_percent: 5 },
    { suffix: "facade_finish", row_kind: "material", visible_name_ru: "Facade finish system", unit: "m2", formula: "quantity * 1.04", waste_percent: 6 },
    { suffix: "facade_mesh", row_kind: "material", visible_name_ru: "Facade reinforcing mesh", unit: "m2", formula: "quantity * 1.08", waste_percent: 6 },
    { suffix: "facade_labor", row_kind: "labor", visible_name_ru: "Facade labor", unit: "hour", formula: "quantity * 0.8", price_required: true },
    { suffix: "scaffold", row_kind: "equipment", visible_name_ru: "Scaffold", unit: "shift", formula: "quantity * 0.015", price_required: true },
  ],
  plaster_putty_paint: [
    { suffix: "plaster_mix", row_kind: "material", visible_name_ru: "Plaster mix", unit: "bag", formula: "quantity * 0.85", waste_percent: 6 },
    { suffix: "primer", row_kind: "material", visible_name_ru: "Primer", unit: "bucket", formula: "quantity * 0.025", waste_percent: 5 },
    { suffix: "beacons", row_kind: "material", visible_name_ru: "Plaster beacons", unit: "linear_m", formula: "quantity * 0.45", waste_percent: 5 },
    { suffix: "corner_beads", row_kind: "material", visible_name_ru: "Corner beads", unit: "linear_m", formula: "quantity * 0.12", waste_percent: 5 },
    { suffix: "reinforcing_mesh", row_kind: "material", visible_name_ru: "Reinforcing mesh when required", unit: "m2", formula: "quantity * 0.18", waste_percent: 5, required: false },
    { suffix: "plaster_labor", row_kind: "labor", visible_name_ru: "Plaster application labor", unit: "hour", formula: "quantity * 0.7", price_required: true },
    { suffix: "mixing_tool", row_kind: "equipment", visible_name_ru: "Mixing tool", unit: "shift", formula: "quantity * 0.005", price_required: true },
  ],
  drywall_ceiling: [
    { suffix: "gypsum_board", row_kind: "material", visible_name_ru: "Gypsum board", unit: "m2", formula: "quantity * 1.08", waste_percent: 8 },
    { suffix: "metal_profile", row_kind: "material", visible_name_ru: "Metal profile", unit: "linear_m", formula: "quantity * 2.6", waste_percent: 7 },
    { suffix: "drywall_fasteners", row_kind: "material", visible_name_ru: "Drywall fasteners", unit: "set", formula: "quantity * 0.08", waste_percent: 5 },
    { suffix: "joint_compound", row_kind: "material", visible_name_ru: "Joint compound", unit: "bag", formula: "quantity * 0.12", waste_percent: 5 },
    { suffix: "drywall_labor", row_kind: "labor", visible_name_ru: "Drywall installation labor", unit: "hour", formula: "quantity * 0.85", price_required: true },
    { suffix: "laser_level", row_kind: "equipment", visible_name_ru: "Laser level", unit: "shift", formula: "quantity * 0.004", price_required: true },
  ],
  tile_stone: [
    { suffix: "ceramic_tile", row_kind: "material", visible_name_ru: "Ceramic tile", unit: "m2", formula: "quantity * 1.08", waste_percent: 8 },
    { suffix: "tile_adhesive_c2te", row_kind: "material", visible_name_ru: "C2TE tile adhesive", unit: "bag", formula: "quantity * 0.28", waste_percent: 5 },
    { suffix: "moisture_resistant_grout", row_kind: "material", visible_name_ru: "Moisture resistant grout", unit: "kg", formula: "quantity * 0.45", waste_percent: 5 },
    { suffix: "primer", row_kind: "material", visible_name_ru: "Primer", unit: "bucket", formula: "quantity * 0.02", waste_percent: 5 },
    { suffix: "tile_spacers", row_kind: "material", visible_name_ru: "Tile spacers and leveling clips", unit: "set", formula: "quantity * 0.08", waste_percent: 5 },
    { suffix: "tile_labor", row_kind: "labor", visible_name_ru: "Tile setter labor", unit: "hour", formula: "quantity * 1.05", price_required: true },
    { suffix: "tile_cutter", row_kind: "equipment", visible_name_ru: "Tile cutting equipment", unit: "shift", formula: "quantity * 0.01", price_required: true },
  ],
  flooring: [
    { suffix: "floor_covering", row_kind: "material", visible_name_ru: "Floor covering", unit: "m2", formula: "quantity * 1.06", waste_percent: 6 },
    { suffix: "underlayment", row_kind: "material", visible_name_ru: "Underlayment", unit: "m2", formula: "quantity * 1.03", waste_percent: 3 },
    { suffix: "baseboard", row_kind: "material", visible_name_ru: "Baseboard", unit: "linear_m", formula: "quantity * 0.45", waste_percent: 5 },
    { suffix: "floor_labor", row_kind: "labor", visible_name_ru: "Flooring installation labor", unit: "hour", formula: "quantity * 0.55", price_required: true },
    { suffix: "floor_tool", row_kind: "equipment", visible_name_ru: "Flooring tool set", unit: "shift", formula: "quantity * 0.006", price_required: true },
  ],
  doors_windows: [
    { suffix: "opening_unit", row_kind: "material", visible_name_ru: "Door or window unit", unit: "piece", formula: "quantity * 1", waste_percent: 0 },
    { suffix: "foam", row_kind: "material", visible_name_ru: "Installation foam", unit: "bucket", formula: "quantity * 0.45", waste_percent: 5 },
    { suffix: "fasteners", row_kind: "material", visible_name_ru: "Anchor fasteners", unit: "set", formula: "quantity * 1", waste_percent: 5 },
    { suffix: "opening_labor", row_kind: "labor", visible_name_ru: "Opening installation labor", unit: "hour", formula: "quantity * 2.5", price_required: true },
    { suffix: "mounting_tool", row_kind: "equipment", visible_name_ru: "Mounting tool set", unit: "shift", formula: "quantity * 0.2", price_required: true },
  ],
  electrical_power: [
    { suffix: "vvgng_ls_3x25", row_kind: "material", visible_name_ru: "VVGng LS 3x2.5 cable", unit: "linear_m", formula: "quantity * 8", waste_percent: 8 },
    { suffix: "socket_box", row_kind: "material", visible_name_ru: "Socket box", unit: "piece", formula: "quantity * 1", waste_percent: 5 },
    { suffix: "socket_unit", row_kind: "material", visible_name_ru: "Socket unit", unit: "piece", formula: "quantity * 1", waste_percent: 3 },
    { suffix: "pvc_corrugation", row_kind: "material", visible_name_ru: "PVC corrugation", unit: "linear_m", formula: "quantity * 8", waste_percent: 8 },
    { suffix: "terminals", row_kind: "material", visible_name_ru: "Electrical terminals", unit: "set", formula: "quantity * 0.2", waste_percent: 5 },
    { suffix: "junction_box", row_kind: "material", visible_name_ru: "Junction box", unit: "piece", formula: "quantity * 0.25", waste_percent: 5 },
    { suffix: "electrical_labor", row_kind: "labor", visible_name_ru: "Socket installation labor", unit: "hour", formula: "quantity * 0.9", price_required: true },
    { suffix: "wall_chaser", row_kind: "equipment", visible_name_ru: "Wall chaser", unit: "shift", formula: "quantity * 0.03", price_required: true },
  ],
  low_voltage_security: [
    { suffix: "low_voltage_cable", row_kind: "material", visible_name_ru: "Low voltage cable", unit: "linear_m", formula: "quantity * 12", waste_percent: 8 },
    { suffix: "terminal_module", row_kind: "material", visible_name_ru: "Terminal module", unit: "piece", formula: "quantity * 1", waste_percent: 3 },
    { suffix: "device_mount", row_kind: "material", visible_name_ru: "Device mount", unit: "set", formula: "quantity * 1", waste_percent: 3 },
    { suffix: "commissioning_labor", row_kind: "labor", visible_name_ru: "Low voltage commissioning labor", unit: "hour", formula: "quantity * 1.1", price_required: true },
    { suffix: "tester", row_kind: "equipment", visible_name_ru: "Cable tester", unit: "shift", formula: "quantity * 0.03", price_required: true },
  ],
  plumbing_sewerage: [
    { suffix: "ppr_pipe", row_kind: "material", visible_name_ru: "PPR pipe", unit: "linear_m", formula: "quantity * 6", waste_percent: 8 },
    { suffix: "sewer_pipe", row_kind: "material", visible_name_ru: "Sewer pipe", unit: "linear_m", formula: "quantity * 3", waste_percent: 8 },
    { suffix: "fittings", row_kind: "material", visible_name_ru: "Pipe fittings", unit: "set", formula: "quantity * 1", waste_percent: 5 },
    { suffix: "sealant", row_kind: "material", visible_name_ru: "Plumbing sealant", unit: "bucket", formula: "quantity * 0.05", waste_percent: 5 },
    { suffix: "plumbing_labor", row_kind: "labor", visible_name_ru: "Plumbing installation labor", unit: "hour", formula: "quantity * 4", price_required: true },
    { suffix: "pipe_welder", row_kind: "equipment", visible_name_ru: "Pipe welding tool", unit: "shift", formula: "quantity * 0.15", price_required: true },
  ],
  heating_hvac: [
    { suffix: "heating_pipe", row_kind: "material", visible_name_ru: "Heating pipe", unit: "linear_m", formula: "quantity * 5", waste_percent: 8 },
    { suffix: "radiator_valves", row_kind: "material", visible_name_ru: "Radiator valves", unit: "set", formula: "quantity * 1", waste_percent: 3 },
    { suffix: "thermal_insulation", row_kind: "material", visible_name_ru: "Pipe thermal insulation", unit: "linear_m", formula: "quantity * 5", waste_percent: 5 },
    { suffix: "heating_labor", row_kind: "labor", visible_name_ru: "Heating installation labor", unit: "hour", formula: "quantity * 2.2", price_required: true },
    { suffix: "pressure_tester", row_kind: "equipment", visible_name_ru: "Pressure testing equipment", unit: "shift", formula: "quantity * 0.04", price_required: true },
  ],
  ventilation_ac: [
    { suffix: "ductwork", row_kind: "material", visible_name_ru: "Air duct", unit: "linear_m", formula: "quantity * 1.05", waste_percent: 5 },
    { suffix: "grilles", row_kind: "material", visible_name_ru: "Ventilation grilles", unit: "piece", formula: "quantity * 0.25", waste_percent: 3 },
    { suffix: "duct_fasteners", row_kind: "material", visible_name_ru: "Duct fasteners", unit: "set", formula: "quantity * 0.15", waste_percent: 5 },
    { suffix: "ventilation_labor", row_kind: "labor", visible_name_ru: "Ventilation installation labor", unit: "hour", formula: "quantity * 0.9", price_required: true },
    { suffix: "lift", row_kind: "equipment", visible_name_ru: "Installation lift", unit: "shift", formula: "quantity * 0.02", price_required: true },
  ],
  paving_landscape: [
    { suffix: "concrete_paver", row_kind: "material", visible_name_ru: "Concrete paver", unit: "m2", formula: "quantity * 1.06", waste_percent: 6 },
    { suffix: "sand", row_kind: "material", visible_name_ru: "Sand", unit: "m3", formula: "quantity * 0.12", waste_percent: 8 },
    { suffix: "crushed_stone_20_40", row_kind: "material", visible_name_ru: "Crushed stone fraction 20 40", unit: "m3", formula: "quantity * 0.14", waste_percent: 8 },
    { suffix: "crushed_stone_5_20", row_kind: "material", visible_name_ru: "Crushed stone fraction 5 20", unit: "m3", formula: "quantity * 0.06", waste_percent: 8 },
    { suffix: "geotextile", row_kind: "material", visible_name_ru: "Geotextile", unit: "m2", formula: "quantity * 1.05", waste_percent: 5 },
    { suffix: "cement_sand_bedding", row_kind: "material", visible_name_ru: "Cement sand bedding mix", unit: "m3", formula: "quantity * 0.05", waste_percent: 5 },
    { suffix: "border_stone", row_kind: "material", visible_name_ru: "Border stone", unit: "linear_m", formula: "quantity * 0.28", waste_percent: 5 },
    { suffix: "joint_filler", row_kind: "material", visible_name_ru: "Joint filler", unit: "bag", formula: "quantity * 0.025", waste_percent: 5 },
    { suffix: "vibroplate", row_kind: "equipment", visible_name_ru: "Vibroplate rental", unit: "shift", formula: "quantity * 0.015", price_required: true },
    { suffix: "base_preparation_labor", row_kind: "labor", visible_name_ru: "Base preparation labor", unit: "hour", formula: "quantity * 0.45", price_required: true },
    { suffix: "paver_laying_labor", row_kind: "labor", visible_name_ru: "Paver laying labor", unit: "hour", formula: "quantity * 0.65", price_required: true },
  ],
  special_repair: [
    { suffix: "diagnostic_consumables", row_kind: "material", visible_name_ru: "Diagnostic consumables", unit: "set", formula: "quantity * 1", waste_percent: 0 },
    { suffix: "repair_material_allowance", row_kind: "material", visible_name_ru: "Verified repair material allowance", unit: "set", formula: "quantity * 1", waste_percent: 0 },
    { suffix: "special_repair_labor", row_kind: "labor", visible_name_ru: "Special repair labor", unit: "hour", formula: "quantity * 6", price_required: true },
    { suffix: "inspection_tool", row_kind: "equipment", visible_name_ru: "Inspection equipment", unit: "shift", formula: "quantity * 0.5", price_required: true },
  ],
};

const COMMON_TAIL_ROWS: readonly RowSeed[] = [
  { suffix: "delivery", row_kind: "delivery", visible_name_ru: "Delivery", unit: "trip", formula: "quantity * 0.01", price_required: true },
  { suffix: "overhead", row_kind: "overhead", visible_name_ru: "Site overhead", unit: "set", formula: "quantity * 0.01", price_required: false },
];

const CARPET_LAYING_ROW_SEEDS: readonly RowSeed[] = [
  { suffix: "carpet_roll", row_kind: "material", visible_name_ru: "Ковролин рулонный с запасом на раскрой", unit: "m2", formula: "quantity * 1.08", waste_percent: 8 },
  { suffix: "carpet_underlay", row_kind: "material", visible_name_ru: "Подложка под ковролин", unit: "m2", formula: "quantity * 1.03", waste_percent: 3 },
  { suffix: "carpet_adhesive", row_kind: "material", visible_name_ru: "Клей для ковролина", unit: "bucket", formula: "quantity * 0.025", waste_percent: 5 },
  { suffix: "double_sided_tape", row_kind: "material", visible_name_ru: "Двусторонняя лента для фиксации ковролина", unit: "roll", formula: "quantity * 0.015", waste_percent: 5 },
  { suffix: "floor_primer", row_kind: "material", visible_name_ru: "Грунтовка основания", unit: "bucket", formula: "quantity * 0.02", waste_percent: 5 },
  { suffix: "baseboard", row_kind: "material", visible_name_ru: "Плинтус напольный", unit: "linear_m", formula: "quantity * 0.45", waste_percent: 5 },
  { suffix: "transition_profiles", row_kind: "material", visible_name_ru: "Порожки / переходные профили", unit: "piece", formula: "quantity * 0.035", waste_percent: 3 },
  { suffix: "joint_tape", row_kind: "material", visible_name_ru: "Стыковочная лента / материалы для стыков ковролина", unit: "roll", formula: "quantity * 0.01", waste_percent: 5 },
  { suffix: "cutting_consumables", row_kind: "material", visible_name_ru: "Расходные материалы для раскроя и монтажа", unit: "set", formula: "quantity * 0.01", waste_percent: 0 },
  { suffix: "survey_measurement", row_kind: "labor", visible_name_ru: "Осмотр и замер основания", unit: "hour", formula: "quantity * 0.035", price_required: true },
  { suffix: "base_preparation", row_kind: "labor", visible_name_ru: "Подготовка основания под ковролин", unit: "hour", formula: "quantity * 0.12", price_required: true },
  { suffix: "dust_cleaning", row_kind: "labor", visible_name_ru: "Очистка и обеспыливание основания", unit: "hour", formula: "quantity * 0.08", price_required: true },
  { suffix: "carpet_cutting", row_kind: "labor", visible_name_ru: "Раскрой ковролина", unit: "hour", formula: "quantity * 0.16", price_required: true },
  { suffix: "carpet_laying", row_kind: "labor", visible_name_ru: "Укладка / приклейка ковролина", unit: "hour", formula: "quantity * 0.32", price_required: true },
  { suffix: "joint_finishing", row_kind: "labor", visible_name_ru: "Обработка стыков ковролина", unit: "hour", formula: "quantity * 0.07", price_required: true },
  { suffix: "baseboard_install", row_kind: "labor", visible_name_ru: "Монтаж плинтусов", unit: "hour", formula: "quantity * 0.08", price_required: true },
  { suffix: "transition_install", row_kind: "labor", visible_name_ru: "Монтаж порожков", unit: "hour", formula: "quantity * 0.025", price_required: true },
  { suffix: "finish_cleaning", row_kind: "labor", visible_name_ru: "Финишная уборка зоны работ", unit: "hour", formula: "quantity * 0.03", price_required: true },
  { suffix: "blade_tool_wear", row_kind: "equipment", visible_name_ru: "Расход инструмента / ножи / сменные лезвия", unit: "set", formula: "quantity * 0.01", price_required: true },
  { suffix: "vacuum_tool", row_kind: "equipment", visible_name_ru: "Строительный пылесос для обеспыливания", unit: "shift", formula: "quantity * 0.006", price_required: true },
  { suffix: "carpet_roll_delivery", row_kind: "delivery", visible_name_ru: "Доставка рулонов ковролина", unit: "trip", formula: "quantity * 0.002", price_required: true },
  { suffix: "material_lifting", row_kind: "delivery", visible_name_ru: "Подъём материала", unit: "set", formula: "quantity * 0.01", price_required: true },
  { suffix: "packaging_waste_removal", row_kind: "delivery", visible_name_ru: "Вынос упаковки и отходов", unit: "set", formula: "quantity * 0.01", price_required: true },
  { suffix: "site_overhead", row_kind: "overhead", visible_name_ru: "Организация зоны работ по укладке ковролина", unit: "set", formula: "quantity * 0.005", price_required: false },
];

function rowFromSeed(workKey: string, groupKey: ProfessionalGroupKey, seed: RowSeed): ProfessionalEstimateRecipeRow {
  const rowKey = `${workKey}_${seed.suffix}`;
  const materialKey = seed.row_kind === "material" || seed.row_kind === "waste" ? rowKey : null;
  return {
    row_key: rowKey,
    row_kind: seed.row_kind,
    row_domain: groupKey,
    visible_name_ru: seed.visible_name_ru,
    material_key: materialKey,
    catalog_item_id: null,
    unit: seed.unit,
    quantity_formula: seed.formula,
    waste_percent: seed.waste_percent ?? 0,
    is_required: seed.required ?? true,
    price_required: seed.price_required ?? true,
    price_source_policy: seed.price_required === false ? "missing_allowed" : "regional_pricebook",
    allowed_work_keys: [workKey],
    forbidden_work_keys: [],
    source_policy: seed.source_policy ?? "work_specific_template",
    paid_control_row: false,
    forbidden_as_paid_control_row: false,
  };
}

export function buildMaterialRecipeRowsForWork(input: {
  canonicalWorkKey: string;
  groupKey: ProfessionalGroupKey;
  visibleWorkName: string;
}): ProfessionalEstimateRecipeRow[] {
  if (input.canonicalWorkKey === "carpet_laying") {
    return CARPET_LAYING_ROW_SEEDS.map((seed) => rowFromSeed(input.canonicalWorkKey, input.groupKey, seed));
  }
  const specificRow: RowSeed = {
    suffix: "specific_material_system",
    row_kind: "material",
    visible_name_ru: `${input.visibleWorkName} specific material system`,
    unit: "set",
    formula: "quantity * 1",
    waste_percent: 3,
  };
  return [
    ...GROUP_RECIPE_SEEDS[input.groupKey].map((seed) => rowFromSeed(input.canonicalWorkKey, input.groupKey, seed)),
    rowFromSeed(input.canonicalWorkKey, input.groupKey, specificRow),
    ...COMMON_TAIL_ROWS.map((seed) => rowFromSeed(input.canonicalWorkKey, input.groupKey, seed)),
  ];
}

export function forbiddenGenericMaterialLabels(): readonly string[] {
  return ["materials", "other", "misc", "general construction works", "quality control", "technical supervision"];
}
